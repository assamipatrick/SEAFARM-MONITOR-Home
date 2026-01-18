
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { CultivationCycle, Module, SeaweedType, Farmer } from '../types';
import { ModuleStatus } from '../types';
import { generateDryingSuggestion } from '../services/geminiService';
import { formatNumber } from '../utils/formatters';
import { calculateSGR } from '../utils/converters';

interface HarvestInfo {
    cycle: CultivationCycle;
    module?: Module;
    seaweedType?: SeaweedType;
    farmer?: Farmer;
    netHarvestedWeight: number;
}

const HarvestProcessing: React.FC = () => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { cultivationCycles, modules, seaweedTypes, farmers, sites, updateCultivationCycle } = useData();
    
    const [filters, setFilters] = useState({ siteId: 'all', seaweedTypeId: 'all' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'module.code', direction: 'ascending' });
    
    const [isDryingModalOpen, setIsDryingModalOpen] = useState(false);
    const [selectedCycleInfo, setSelectedCycleInfo] = useState<HarvestInfo | null>(null);
    const [dryingStartDate, setDryingStartDate] = useState('');
    const [dryingSuggestion, setDryingSuggestion] = useState('');
    const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
    const [dryingStartDateError, setDryingStartDateError] = useState('');

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [key]: value}));
    };

    const clearFilters = useCallback(() => {
        setFilters({ siteId: 'all', seaweedTypeId: 'all' });
    }, []);

    const growthRate = useMemo(() => {
        if (!selectedCycleInfo || !selectedCycleInfo.cycle) return null;
        
        const { cycle } = selectedCycleInfo;
        
        if (cycle.harvestDate && cycle.plantingDate && cycle.harvestedWeight && cycle.initialWeight && cycle.harvestedWeight > 0 && cycle.initialWeight > 0) {
            const durationInMs = new Date(cycle.harvestDate).getTime() - new Date(cycle.plantingDate).getTime();
            const durationInDays = durationInMs / (1000 * 60 * 60 * 24);
            
            return calculateSGR(cycle.initialWeight, cycle.harvestedWeight, durationInDays);
        }
        return null;
    }, [selectedCycleInfo]);

    const harvestInfoList = useMemo((): HarvestInfo[] => {
        let data = cultivationCycles
            .filter(c => c.status === ModuleStatus.HARVESTED)
            .map(cycle => {
                const module = modules.find(m => m.id === cycle.moduleId);
                const farmer = module ? farmers.find(f => f.id === module.farmerId) : undefined;
                const netHarvestedWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                return {
                    cycle,
                    module,
                    seaweedType: seaweedTypes.find(st => st.id === cycle.seaweedTypeId),
                    farmer,
                    netHarvestedWeight,
                };
            });

        if (filters.siteId !== 'all') {
            data = data.filter(item => item.module?.siteId === filters.siteId);
        }
        if (filters.seaweedTypeId !== 'all') {
            data = data.filter(item => item.cycle.seaweedTypeId === filters.seaweedTypeId);
        }

        data.sort((a, b) => {
            const getVal = (item: HarvestInfo, key: string) => {
                if (key === 'netHarvestedWeight') return item.netHarvestedWeight;
                const keys = key.split('.');
                let val: any = item;
                for (const k of keys) {
                    if (val === undefined || val === null) return undefined;
                    val = val[k];
                }
                return val;
            };
            
            const valA = getVal(a, sortConfig.key);
            const valB = getVal(b, sortConfig.key);
            
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return data;
    }, [cultivationCycles, modules, seaweedTypes, farmers, filters, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };
    
    const SortableHeader: React.FC<{ sortKey: string; label: string; className?: string }> = ({ sortKey, label, className = '' }) => (
        <th className={`p-3 ${className}`}>
            
            <button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className.includes('text-right') ? 'justify-end' : ''}`}>
                {label} {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const handleStartDryingClick = useCallback(async (info: HarvestInfo) => {
        setSelectedCycleInfo(info);
        setDryingStartDate(info.cycle.harvestDate || new Date().toISOString().split('T')[0]);
        setIsDryingModalOpen(true);
        
        setIsSuggestionLoading(true);
        setDryingSuggestion('');
        const suggestion = await generateDryingSuggestion({
            seaweedType: info.seaweedType?.name || t('unknown'),
            totalWeight: info.netHarvestedWeight || 0, // Use Net Weight for drying suggestion
            notes: info.cycle.processingNotes || ''
        }, language);
        setDryingSuggestion(suggestion);
        setIsSuggestionLoading(false);
    }, [language, t]);

    useEffect(() => {
        if (isDryingModalOpen && selectedCycleInfo?.cycle.harvestDate && dryingStartDate) {
            if (new Date(dryingStartDate) < new Date(selectedCycleInfo.cycle.harvestDate)) {
                setDryingStartDateError(t('validationDryingStartDate'));
            } else {
                setDryingStartDateError('');
            }
        } else {
            setDryingStartDateError('');
        }
    }, [isDryingModalOpen, dryingStartDate, selectedCycleInfo, t]);

    const handleConfirmStartDrying = () => {
        if (selectedCycleInfo && dryingStartDate && !dryingStartDateError) {
            updateCultivationCycle({
                ...selectedCycleInfo.cycle,
                status: ModuleStatus.DRYING,
                dryingStartDate: dryingStartDate,
            });
            setIsDryingModalOpen(false);
            setSelectedCycleInfo(null);
        }
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('harvestProcessingTitle')}</h1>

            <Card className="mb-6" title={t('filtersTitle')}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)}>
                        <option value="all">{t('allSites')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('seaweedType')} value={filters.seaweedTypeId} onChange={e => handleFilterChange('seaweedTypeId', e.target.value)}>
                        <option value="all">{t('allSeaweedTypes')}</option>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                    <Button variant="secondary" onClick={clearFilters} className="h-[42px] w-full">{t('clearFilters')}</Button>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <SortableHeader sortKey="module.code" label={t('module')} />
                                <SortableHeader sortKey="farmer.firstName" label={t('farmer')} />
                                <SortableHeader sortKey="seaweedType.name" label={t('seaweedType')} />
                                <SortableHeader sortKey="cycle.harvestDate" label={t('harvestDate')} />
                                <SortableHeader sortKey="netHarvestedWeight" label={t('netHarvestedWeightKg')} className="text-right"/>
                                <SortableHeader sortKey="cycle.linesHarvested" label={t('linesHarvested')} className="text-right"/>
                                <th className="p-3">{t('harvestReason')}</th>
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {harvestInfoList.map((info) => (
                                <tr key={info.cycle.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3 font-mono font-semibold">{info.module?.code || t('unknown')}</td>
                                    <td className="p-3">{info.farmer ? `${info.farmer.firstName} ${info.farmer.lastName}` : t('unknown')}</td>
                                    <td className="p-3">{info.seaweedType?.name || t('unknown')}</td>
                                    <td className="p-3">{info.cycle.harvestDate}</td>
                                    <td className="p-3 text-right">{formatNumber(info.netHarvestedWeight, settings.localization)}</td>
                                    <td className="p-3 text-right">{info.cycle.linesHarvested}</td>
                                    <td className="p-3">{info.cycle.processingNotes}</td>
                                    <td className="p-3 text-right">
                                        <Button variant="primary" onClick={() => handleStartDryingClick(info)}>
                                            <Icon name="Wind" className="w-4 h-4" />{t('startDrying')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {harvestInfoList.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center p-6 text-gray-500 dark:text-gray-400">
                                        {t('noHarvestedBatches')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {isDryingModalOpen && selectedCycleInfo && (
                <Modal
                    isOpen={isDryingModalOpen}
                    onClose={() => setIsDryingModalOpen(false)}
                    title={`${t('startDryingFor')} ${selectedCycleInfo.module?.code}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setIsDryingModalOpen(false)}>{t('cancel')}</Button>
                            <Button variant="primary" onClick={handleConfirmStartDrying} disabled={!dryingStartDate || !!dryingStartDateError}>{t('confirm')}</Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        {growthRate !== null && (
                            <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('growthRate')}</p>
                                <p className="text-xl font-bold">{formatNumber(growthRate, settings.localization)}{t('growthRateUnit')}</p>
                            </div>
                        )}
                        <Input
                            label={t('dryingStartDate')}
                            type="date"
                            value={dryingStartDate}
                            onChange={e => setDryingStartDate(e.target.value)}
                            required
                            error={dryingStartDateError}
                        />
                        <Card title={t('geminiSuggestion')}>
                            {isSuggestionLoading ? (
                                <p>{t('loading')}</p>
                            ) : (
                                <p className="whitespace-pre-wrap font-serif">{dryingSuggestion || t('noSuggestion')}</p>
                            )}
                        </Card>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HarvestProcessing;
