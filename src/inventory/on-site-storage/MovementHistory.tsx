
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import { formatNumber } from '../../utils/formatters';
import { exportDataToExcel } from '../../utils/excelExporter';

const MovementHistory: React.FC = () => {
    const { t } = useLocalization();
    const { stockMovements, sites, seaweedTypes } = useData();
    const { settings } = useSettings();
    const [filters, setFilters] = useState({ 
        siteId: sites.find(s => s.id !== 'pressing-warehouse')?.id || '', 
        seaweedTypeId: seaweedTypes[0]?.id || '',
        startDate: '',
        endDate: ''
    });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

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

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const filteredAndCalculatedHistory = useMemo(() => {
        if (!filters.siteId || !filters.seaweedTypeId) {
            return [];
        }

        // 1. Filter by Site and Type
        // 2. Sort strictly chronologically to calculate running balance
        const chronologicalMovements = stockMovements
            .filter(m => m.siteId === filters.siteId && m.seaweedTypeId === filters.seaweedTypeId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
        
        // 3. Calculate running balance
        let balanceKg = 0;
        let balanceBags = 0;
        const historyWithBalance = chronologicalMovements.map(m => {
            balanceKg += (m.inKg || 0) - (m.outKg || 0);
            balanceBags += (m.inBags || 0) - (m.outBags || 0);
            return { ...m, balanceKg, balanceBags };
        });
        
        // 4. Filter by Date Range
        const dateFilteredHistory = historyWithBalance.filter(m => {
            if (filters.startDate && m.date < filters.startDate) return false;
            if (filters.endDate && m.date > filters.endDate) return false;
            return true;
        });

        // 5. Apply User Sort for Display
        dateFilteredHistory.sort((a, b) => {
            const valA = a[sortConfig.key as keyof typeof a] ?? '';
            const valB = b[sortConfig.key as keyof typeof b] ?? '';

            let comparison = 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            }

            if (comparison !== 0) {
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            }
            
            // Secondary sort by date to maintain consistency
            if (sortConfig.key !== 'date') {
                 return new Date(b.date).getTime() - new Date(a.date).getTime();
            }

            return 0;
        });

        return dateFilteredHistory;
    }, [stockMovements, filters.siteId, filters.seaweedTypeId, filters.startDate, filters.endDate, sortConfig]);
    
    const handleExport = () => {
        const dataToExport = filteredAndCalculatedHistory.map(m => ({
            date: m.date,
            type: t(`stockMovement_${m.type}` as any),
            designation: m.designation,
            inKg: m.inKg || 0,
            inBags: m.inBags || 0,
            outKg: m.outKg || 0,
            outBags: m.outBags || 0,
            balanceKg: m.balanceKg,
            balanceBags: m.balanceBags
        }));

        const columns = [
            { header: t('date'), key: 'date', width: 15 },
            { header: t('movementType'), key: 'type', width: 25 },
            { header: t('designation'), key: 'designation', width: 40 },
            { header: `${t('in')} (${t('kg')})`, key: 'inKg', width: 15 },
            { header: `${t('in')} (${t('bags')})`, key: 'inBags', width: 15 },
            { header: `${t('out')} (${t('kg')})`, key: 'outKg', width: 15 },
            { header: `${t('out')} (${t('bags')})`, key: 'outBags', width: 15 },
            { header: `${t('balance')} (${t('kg')})`, key: 'balanceKg', width: 15 },
            { header: `${t('balance')} (${t('bags')})`, key: 'balanceBags', width: 15 },
        ];
        
        const siteName = sites.find(s => s.id === filters.siteId)?.name || filters.siteId;
        const seaweedName = seaweedTypes.find(s => s.id === filters.seaweedTypeId)?.name || filters.seaweedTypeId;

        exportDataToExcel(dataToExport, columns, `Stock_Movement_${siteName}_${seaweedName}_${new Date().toISOString().split('T')[0]}`, 'Stock Movements');
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
                <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)}>
                    {sites.filter(s => s.id !== 'pressing-warehouse').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select label={t('seaweedType')} value={filters.seaweedTypeId} onChange={e => handleFilterChange('seaweedTypeId', e.target.value)}>
                    {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </Select>
                <Input label={t('startDate')} type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                <Input label={t('endDate')} type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                <Button onClick={handleExport} variant="secondary" className="h-[42px]" disabled={filteredAndCalculatedHistory.length === 0}>
                    <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2" />
                    {t('exportExcel')}
                </Button>
            </div>
            
            <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800">
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                            <th rowSpan={2} className="p-3 align-bottom"><button onClick={() => requestSort('date')} className="group flex items-center gap-2 w-full">{t('date')} {getSortIcon('date')}</button></th>
                            <th rowSpan={2} className="p-3 align-bottom"><button onClick={() => requestSort('type')} className="group flex items-center gap-2 w-full">{t('movementType')} {getSortIcon('type')}</button></th>
                            <th rowSpan={2} className="p-3 align-bottom"><button onClick={() => requestSort('designation')} className="group flex items-center gap-2 w-full">{t('designation')} {getSortIcon('designation')}</button></th>
                            <th colSpan={2} className="p-3 text-center border-b border-gray-300 dark:border-gray-600">{t('in')}</th>
                            <th colSpan={2} className="p-3 text-center border-b border-gray-300 dark:border-gray-600">{t('out')}</th>
                            <th colSpan={2} className="p-3 text-center border-b border-gray-300 dark:border-gray-600">{t('balance')}</th>
                        </tr>
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                            <th className="p-3 text-center"><button onClick={() => requestSort('inKg')} className="group flex items-center justify-center gap-2 w-full">{t('kg')} {getSortIcon('inKg')}</button></th>
                            <th className="p-3 text-center"><button onClick={() => requestSort('inBags')} className="group flex items-center justify-center gap-2 w-full">{t('bags')} {getSortIcon('inBags')}</button></th>
                            <th className="p-3 text-center"><button onClick={() => requestSort('outKg')} className="group flex items-center justify-center gap-2 w-full">{t('kg')} {getSortIcon('outKg')}</button></th>
                            <th className="p-3 text-center"><button onClick={() => requestSort('outBags')} className="group flex items-center justify-center gap-2 w-full">{t('bags')} {getSortIcon('outBags')}</button></th>
                            <th className="p-3 text-center"><button onClick={() => requestSort('balanceKg')} className="group flex items-center justify-center gap-2 w-full">{t('kg')} {getSortIcon('balanceKg')}</button></th>
                            <th className="p-3 text-center"><button onClick={() => requestSort('balanceBags')} className="group flex items-center justify-center gap-2 w-full">{t('bags')} {getSortIcon('balanceBags')}</button></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndCalculatedHistory.map(m => (
                            <tr key={m.id} className="border-b dark:border-gray-700/50 align-middle">
                                <td className="p-3 whitespace-nowrap">{m.date}</td>
                                <td className="p-3 whitespace-nowrap">{t(`stockMovement_${m.type}` as any)}</td>
                                <td className="p-3">{m.designation}</td>
                                <td className="p-3 text-right text-green-600 dark:text-green-400">{m.inKg ? `+${formatNumber(m.inKg, settings.localization)}` : ''}</td>
                                <td className="p-3 text-right text-green-600 dark:text-green-400">{m.inBags ? `+${m.inBags}`: ''}</td>
                                <td className="p-3 text-right text-red-600 dark:text-red-400">{m.outKg ? `-${formatNumber(m.outKg, settings.localization)}` : ''}</td>
                                <td className="p-3 text-right text-red-600 dark:text-red-400">{m.outBags ? `-${m.outBags}`: ''}</td>
                                <td className="p-3 text-right font-bold">{formatNumber(m.balanceKg, settings.localization)}</td>
                                <td className="p-3 text-right font-bold">{m.balanceBags}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAndCalculatedHistory.length === 0 && (
                    <p className="text-center p-8 text-gray-500">{t('noDataForReport')}</p>
                )}
            </div>
        </div>
    );
};

export default MovementHistory;
