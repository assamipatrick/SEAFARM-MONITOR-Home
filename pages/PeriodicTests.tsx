
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useSettings } from '../contexts/SettingsContext';
import { formatNumber } from '../utils/formatters';
import type { PeriodicTest, TestPeriod, Zone } from '../types';
import Tooltip from '../components/ui/Tooltip';
import { dmsToDd } from '../utils/converters';
import { exportDataToExcel } from '../utils/excelExporter';

type SortableKeys = keyof PeriodicTest | 'siteName' | 'seaweedTypeName' | 'zoneName' | 'conductorName';

const PERIODS: TestPeriod[] = ['PLANTING', 'PERIOD_1', 'PERIOD_2', 'PERIOD_3', 'PERIOD_4', 'PERIOD_5'];

const PeriodicTestFormModal: React.FC<{ isOpen: boolean; onClose: () => void; test: PeriodicTest | null; }> = ({ isOpen, onClose, test }) => {
    const { t } = useLocalization();
    const { sites, seaweedTypes, employees, addPeriodicTest, updatePeriodicTest, periodicTests } = useData();
    
    // Removed 'growthRate' from Omit so we can store the calculated value
    const [formData, setFormData] = useState<Omit<PeriodicTest, 'id'>>({
        identity: '', date: new Date().toISOString().split('T')[0], siteId: '', seaweedTypeId: '', zoneId: '',
        period: 'PLANTING', weightKg: 0, growthRate: null, temperature: null, salinity: null, precipitation: null,
        windSpeed: null, windDirection: null, waveHeight: null, weatherDataSource: 'manual', conductorId: ''
    });
    const [availableZones, setAvailableZones] = useState<Zone[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [weatherStatus, setWeatherStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.identity.trim()) newErrors.identity = t('validationRequired');
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        if (!formData.zoneId) newErrors.zoneId = t('validationRequired');
        if (!formData.conductorId) newErrors.conductorId = t('validationRequired');
        if (isNaN(formData.weightKg) || formData.weightKg < 0) newErrors.weightKg = t('validationNonNegative');
        return newErrors;
    }, [formData, t]);
    
    useEffect(() => {
        if (test) {
            setFormData(test);
        } else {
             setFormData({
                identity: '', date: new Date().toISOString().split('T')[0], siteId: sites[0]?.id || '', 
                seaweedTypeId: seaweedTypes[0]?.id || '', zoneId: sites[0]?.zones[0]?.id || '',
                period: 'PLANTING', weightKg: 0, growthRate: null, temperature: null, salinity: null, precipitation: null,
                windSpeed: null, windDirection: null, waveHeight: null, weatherDataSource: 'manual', conductorId: employees[0]?.id || ''
            });
        }
        setErrors({});
        setIsFetchingWeather(false);
        setWeatherStatus(null);
    }, [test, isOpen, sites, seaweedTypes, employees]);

    // Automatic Growth Rate Calculation
    useEffect(() => {
        // Skip if it's planting (no growth yet) or missing critical data
        if (formData.period === 'PLANTING' || !formData.identity || !formData.date || formData.weightKg <= 0) {
            if (formData.growthRate !== null) {
                setFormData(prev => ({ ...prev, growthRate: null }));
            }
            return;
        }

        const currentIndex = PERIODS.indexOf(formData.period);
        if (currentIndex <= 0) return; // Should not happen if check above passes

        const previousPeriod = PERIODS[currentIndex - 1];
        
        // Find the test from the previous period for the same identity
        const previousTest = periodicTests.find(pt => 
            pt.identity.toLowerCase() === formData.identity.toLowerCase() &&
            pt.period === previousPeriod &&
            pt.siteId === formData.siteId // Ensure same site to avoid ambiguity
        );

        if (previousTest && previousTest.weightKg > 0 && previousTest.date) {
            const t1 = new Date(previousTest.date).getTime();
            const t2 = new Date(formData.date).getTime();
            const durationDays = (t2 - t1) / (1000 * 60 * 60 * 24);

            if (durationDays > 0) {
                const w1 = previousTest.weightKg;
                const w2 = formData.weightKg;
                // SGR Formula: (ln(W2) - ln(W1)) / (t2 - t1) * 100
                const rate = ((Math.log(w2) - Math.log(w1)) / durationDays) * 100;
                const formattedRate = parseFloat(rate.toFixed(2));
                
                if (formData.growthRate !== formattedRate) {
                    setFormData(prev => ({ ...prev, growthRate: formattedRate }));
                }
            } else {
                if (formData.growthRate !== null) setFormData(prev => ({ ...prev, growthRate: null }));
            }
        } else {
             if (formData.growthRate !== null) setFormData(prev => ({ ...prev, growthRate: null }));
        }

    }, [formData.period, formData.identity, formData.weightKg, formData.date, formData.siteId, periodicTests, formData.growthRate]);


    useEffect(() => {
        setErrors(validate());
    }, [formData, validate]);

    useEffect(() => {
        const site = sites.find(s => s.id === formData.siteId);
        setAvailableZones(site?.zones || []);
        if (site && !site.zones.some(z => z.id === formData.zoneId)) {
            setFormData(p => ({ ...p, zoneId: site.zones[0]?.id || '' }));
        }
    }, [formData.siteId, sites]);
    
    const handleFetchWeather = async () => {
        setIsFetchingWeather(true);
        setWeatherStatus(null);
        const site = sites.find(s => s.id === formData.siteId);
        if (!site || !site.location || !formData.date) {
            setWeatherStatus({ type: 'error', message: t('weatherFetchMissingInfo') });
            setIsFetchingWeather(false);
            return;
        }

        try {
            const [latStr, lonStr] = site.location.split(',');
            const lat = dmsToDd(latStr.trim());
            const lon = dmsToDd(lonStr.trim());
            const date = formData.date;

            const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&start_date=${date}&end_date=${date}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;
            
            const response = await fetch(weatherUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch weather data from API.');
            }
            const data = await response.json();

            if (data.daily) {
                const daily = data.daily;
                const newFormData = { ...formData };
                
                if (daily.temperature_2m_mean?.[0] !== null && daily.temperature_2m_mean?.[0] !== undefined) newFormData.temperature = daily.temperature_2m_mean[0];
                if (daily.precipitation_sum?.[0] !== null && daily.precipitation_sum?.[0] !== undefined) newFormData.precipitation = daily.precipitation_sum[0];
                if (daily.wind_speed_10m_max?.[0] !== null && daily.wind_speed_10m_max?.[0] !== undefined) newFormData.windSpeed = daily.wind_speed_10m_max[0];
                if (daily.wind_direction_10m_dominant?.[0] !== null && daily.wind_direction_10m_dominant?.[0] !== undefined) newFormData.windDirection = daily.wind_direction_10m_dominant[0];
                
                // These are not available from this source
                newFormData.waveHeight = null;
                newFormData.salinity = null;

                setFormData(newFormData);
                setWeatherStatus({ type: 'success', message: t('weatherFetchSuccess') });
            } else {
                throw new Error('No daily data in weather API response.');
            }
        } catch (error) {
            console.error("Error fetching weather data:", error);
            setWeatherStatus({ type: 'error', message: t('weatherFetchError') });
        } finally {
            setIsFetchingWeather(false);
        }
    };


    const handleSave = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        // Save formData which now includes the calculated growthRate
        if (test) {
            updatePeriodicTest({ ...test, ...formData });
        } else {
            addPeriodicTest(formData);
        }
        onClose();
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={test ? t('editTest') : t('addTest')} widthClass="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card title={t('sheetInfo')} className="lg:col-span-1">
                    <div className="space-y-4">
                        <Input label={t('identity')} value={formData.identity} onChange={e => setFormData(p => ({...p, identity: e.target.value}))} error={errors.identity} required />
                        <Input label={t('date')} type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} error={errors.date} required />
                        <Select label={t('site')} value={formData.siteId} onChange={e => setFormData(p => ({...p, siteId: e.target.value}))} error={errors.siteId} required>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => setFormData(p => ({...p, seaweedTypeId: e.target.value}))} error={errors.seaweedTypeId} required>
                            {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </Select>
                        <Select label={t('zoneName')} value={formData.zoneId} onChange={e => setFormData(p => ({...p, zoneId: e.target.value}))} disabled={!formData.siteId} error={errors.zoneId} required>
                            {availableZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </Select>
                        <Select label={t('period')} value={formData.period} onChange={e => setFormData(p => ({...p, period: e.target.value as TestPeriod}))} required>
                            {PERIODS.map(p => <option key={p} value={p}>{t(`period_${p}`)}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                            <Input label={t('weightKg')} type="number" value={formData.weightKg} onChange={e => setFormData(p => ({...p, weightKg: parseFloat(e.target.value) || 0}))} error={errors.weightKg} required />
                            <Input label={`${t('growthRate')} (%)`} type="number" value={formData.growthRate !== null ? formData.growthRate : ''} disabled placeholder="Auto" />
                        </div>
                        <Select label={t('conductor')} value={formData.conductorId} onChange={e => setFormData(p => ({...p, conductorId: e.target.value}))} error={errors.conductorId} required>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                        </Select>
                    </div>
                </Card>
                <Card title={t('weatherData')} className="lg:col-span-2">
                    <div className="space-y-4">
                        {weatherStatus && (
                            <p className={`text-xs ${weatherStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {weatherStatus.message}
                            </p>
                        )}
                         <div className="flex items-center space-x-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="weatherDataSource"
                                    value="manual"
                                    checked={formData.weatherDataSource === 'manual'}
                                    onChange={() => setFormData(p => ({ ...p, weatherDataSource: 'manual' }))}
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('manualEntry')}</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="weatherDataSource"
                                    value="auto"
                                    checked={formData.weatherDataSource === 'auto'}
                                    onChange={() => setFormData(p => ({ ...p, weatherDataSource: 'auto' }))}
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('autoFill')}</span>
                            </label>
                        </div>
                        
                        {formData.weatherDataSource === 'auto' && (
                             <Button type="button" variant="secondary" className="w-full" onClick={handleFetchWeather} disabled={isFetchingWeather || !formData.siteId || !formData.date}>
                                <Icon name={isFetchingWeather ? 'Activity' : 'Download'} className={`w-5 h-5 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                                {isFetchingWeather ? t('fetchingWeather') : t('fetchWeather')}
                            </Button>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Input label={`${t('temperature')} (°C)`} type="number" step="any" value={formData.temperature ?? ''} onChange={e => setFormData(p => ({ ...p, temperature: e.target.value === '' ? null : parseFloat(e.target.value) }))} disabled={formData.weatherDataSource === 'auto'}/>
                            <Input label={`${t('salinity')} (‰)`} type="number" step="any" value={formData.salinity ?? ''} onChange={e => setFormData(p => ({ ...p, salinity: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
                            <Input label={`${t('precipitation')} (mm)`} type="number" step="any" value={formData.precipitation ?? ''} onChange={e => setFormData(p => ({ ...p, precipitation: e.target.value === '' ? null : parseFloat(e.target.value) }))} disabled={formData.weatherDataSource === 'auto'} />
                            <Input label={`${t('windSpeed')} (km/h)`} type="number" step="any" value={formData.windSpeed ?? ''} onChange={e => setFormData(p => ({ ...p, windSpeed: e.target.value === '' ? null : parseFloat(e.target.value) }))} disabled={formData.weatherDataSource === 'auto'} />
                            <Input label={`${t('windDirection')} (°)`} type="number" step="any" value={formData.windDirection ?? ''} onChange={e => setFormData(p => ({ ...p, windDirection: e.target.value === '' ? null : parseFloat(e.target.value) }))} disabled={formData.weatherDataSource === 'auto'} />
                            <Input label={`${t('waveHeight')} (m)`} type="number" step="any" value={formData.waveHeight ?? ''} onChange={e => setFormData(p => ({ ...p, waveHeight: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
                        </div>
                    </div>
                </Card>
            </div>
             <div className="flex justify-end gap-3 pt-4 mt-4 border-t dark:border-gray-700">
                <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleSave} disabled={isFormInvalid}>{t('save')}</Button>
            </div>
        </Modal>
    );
};

const PeriodicTests: React.FC = () => {
    const { t } = useLocalization();
    const { periodicTests, sites, seaweedTypes, employees, deletePeriodicTest } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<PeriodicTest | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const { settings } = useSettings();

    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);
    const seaweedTypeMap = useMemo(() => new Map(seaweedTypes.map(st => [st.id, st.name])), [seaweedTypes]);
    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);
    const zoneMap = useMemo(() => {
        const map = new Map<string, string>();
        sites.forEach(s => s.zones.forEach(z => map.set(z.id, z.name)));
        return map;
    }, [sites]);

    const sortedTests = useMemo(() => {
        let sortableItems = [...periodicTests];
        sortableItems.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'siteName') valA = siteMap.get(a.siteId) || '';
            else if (sortConfig.key === 'seaweedTypeName') valA = seaweedTypeMap.get(a.seaweedTypeId) || '';
            else if (sortConfig.key === 'zoneName') valA = zoneMap.get(a.zoneId) || '';
            else if (sortConfig.key === 'conductorName') valA = employeeMap.get(a.conductorId) || '';
            else valA = a[sortConfig.key as keyof PeriodicTest];

            if (sortConfig.key === 'siteName') valB = siteMap.get(b.siteId) || '';
            else if (sortConfig.key === 'seaweedTypeName') valB = seaweedTypeMap.get(b.seaweedTypeId) || '';
            else if (sortConfig.key === 'zoneName') valB = zoneMap.get(b.zoneId) || '';
            else if (sortConfig.key === 'conductorName') valB = employeeMap.get(b.conductorId) || '';
            else valB = b[sortConfig.key as keyof PeriodicTest];
            
            if (valA === null) return 1;
            if (valB === null) return -1;
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [periodicTests, sortConfig, siteMap, seaweedTypeMap, zoneMap, employeeMap]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}><button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className?.includes('text-right') ? 'justify-end' : ''}`}>{label}{getSortIcon(sortKey)}</button></th>
    );

    const handleOpenModal = (test: PeriodicTest | null = null) => {
        setEditingTest(test);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (testId: string) => {
        setTestToDelete(testId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (testToDelete) {
            deletePeriodicTest(testToDelete);
        }
        setIsConfirmOpen(false);
        setTestToDelete(null);
    };

    const handleExportExcel = async () => {
        const dataToExport = sortedTests.map(test => ({
            identity: test.identity,
            date: test.date,
            site: siteMap.get(test.siteId) || t('unknown'),
            seaweedType: seaweedTypeMap.get(test.seaweedTypeId) || t('unknown'),
            zone: zoneMap.get(test.zoneId) || t('unknown'),
            period: t(`period_${test.period}` as any),
            weightKg: test.weightKg,
            growthRate: test.growthRate,
            temperature: test.temperature,
            salinity: test.salinity,
            precipitation: test.precipitation,
            windSpeed: test.windSpeed,
            windDirection: test.windDirection,
            waveHeight: test.waveHeight,
            conductor: employeeMap.get(test.conductorId) || t('unknown'),
            source: test.weatherDataSource === 'auto' ? t('autoFill') : t('manualEntry')
        }));

        const columns = [
            { header: t('identity'), key: 'identity', width: 15 },
            { header: t('date'), key: 'date', width: 15 },
            { header: t('site'), key: 'site', width: 20 },
            { header: t('seaweedType'), key: 'seaweedType', width: 20 },
            { header: t('zoning'), key: 'zone', width: 15 },
            { header: t('period'), key: 'period', width: 15 },
            { header: `${t('weightKg')} (Kg)`, key: 'weightKg', width: 15 },
            { header: `${t('growthRate')} (%)`, key: 'growthRate', width: 15 },
            { header: `${t('temperature')} (°C)`, key: 'temperature', width: 15 },
            { header: `${t('salinity')} (‰)`, key: 'salinity', width: 15 },
            { header: `${t('precipitation')} (mm)`, key: 'precipitation', width: 15 },
            { header: `${t('windSpeed')} (km/h)`, key: 'windSpeed', width: 15 },
            { header: `${t('windDirection')} (°)`, key: 'windDirection', width: 15 },
            { header: `${t('waveHeight')} (m)`, key: 'waveHeight', width: 15 },
            { header: t('conductor'), key: 'conductor', width: 20 },
            { header: 'Source', key: 'source', width: 15 },
        ];

        await exportDataToExcel(dataToExport, columns, `PeriodicTests_${new Date().toISOString().split('T')[0]}`, 'Periodic Tests');
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('periodicTestsTitle')}</h1>
                <div className="flex gap-2">
                    <Button onClick={handleExportExcel} variant="secondary">
                        <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2"/>
                        {t('exportExcel')}
                    </Button>
                    <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('addTest')}</Button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <SortableHeader sortKey="identity" label={t('identity')} />
                                <SortableHeader sortKey="date" label={t('date')} />
                                <SortableHeader sortKey="siteName" label={t('site')} />
                                <SortableHeader sortKey="seaweedTypeName" label={t('seaweedType')} />
                                <SortableHeader sortKey="zoneName" label={t('zoning')} />
                                <SortableHeader sortKey="period" label={t('period')} />
                                <SortableHeader sortKey="weightKg" label={`${t('weightKg')} (Kg)`} className="text-right" />
                                <SortableHeader sortKey="growthRate" label={`${t('growthRate')} (%)`} className="text-right" />
                                <SortableHeader sortKey="temperature" label={`${t('temperature')} (°C)`} className="text-right" />
                                <SortableHeader sortKey="salinity" label={`${t('salinity')} (‰)`} className="text-right" />
                                <SortableHeader sortKey="precipitation" label={`${t('precipitation')} (mm)`} className="text-right" />
                                <SortableHeader sortKey="windSpeed" label={`${t('windSpeed')} (km/h)`} className="text-right" />
                                <SortableHeader sortKey="windDirection" label={`${t('windDirection')} (°)`} className="text-right" />
                                <SortableHeader sortKey="waveHeight" label={`${t('waveHeight')} (m)`} className="text-right" />
                                <SortableHeader sortKey="conductorName" label={t('conductor')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTests.map(test => (
                                <tr key={test.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 align-middle">
                                    <td className="p-3 font-mono">{test.identity}</td>
                                    <td className="p-3">{test.date}</td>
                                    <td className="p-3">{siteMap.get(test.siteId) || t('unknown')}</td>
                                    <td className="p-3">{seaweedTypeMap.get(test.seaweedTypeId) || t('unknown')}</td>
                                    <td className="p-3">{zoneMap.get(test.zoneId) || t('unknown')}</td>
                                    <td className="p-3">{t(`period_${test.period}` as any)}</td>
                                    <td className="p-3 text-right">{formatNumber(test.weightKg, settings.localization)}</td>
                                    <td className="p-3 text-right font-semibold">{test.growthRate !== null ? `${formatNumber(test.growthRate, settings.localization)}` : '-'}</td>
                                    <td className="p-3 text-right">{test.temperature !== null ? formatNumber(test.temperature, settings.localization) : '-'}</td>
                                    <td className="p-3 text-right">{test.salinity !== null ? formatNumber(test.salinity, settings.localization) : '-'}</td>
                                    <td className="p-3 text-right">{test.precipitation !== null ? formatNumber(test.precipitation, settings.localization) : '-'}</td>
                                    <td className="p-3 text-right">{test.windSpeed !== null ? formatNumber(test.windSpeed, settings.localization) : '-'}</td>
                                    <td className="p-3 text-right">{test.windDirection !== null ? formatNumber(test.windDirection, settings.localization) : '-'}</td>
                                    <td className="p-3 text-right">{test.waveHeight !== null ? formatNumber(test.waveHeight, settings.localization) : '-'}</td>
                                    <td className="p-3">{employeeMap.get(test.conductorId) || t('unknown')}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" className="p-2" onClick={() => handleOpenModal(test)}><Icon name="Settings" className="w-4 h-4" /></Button>
                                            <Button variant="danger" className="p-2" onClick={() => handleDeleteClick(test.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isFormModalOpen && <PeriodicTestFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} test={editingTest} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteTest')} />}
        </div>
    );
};

export default PeriodicTests;
