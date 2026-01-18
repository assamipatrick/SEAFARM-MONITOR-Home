import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import Icon from '../../components/ui/Icon';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import type { SeaweedType } from '../../types';
import StockHistoryModal from './StockHistoryModal';
import { exportDataToExcel } from '../../utils/excelExporter';

// Define the structure for our summary data
interface StockSummaryItem {
    siteId: string;
    siteName: string; 
    seaweedTypeId: string;
    seaweedTypeName: string;
    kg: number;
    bags: number;
    value: number;
}

type SortableKeys = keyof StockSummaryItem;

const StockStatus: React.FC = () => {
    const { t } = useLocalization();
    const { stockMovements, sites, seaweedTypes } = useData();
    const { settings } = useSettings();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'siteName', direction: 'ascending' });
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockSummaryItem | null>(null);
    
    // Filters State
    const [filters, setFilters] = useState({
        siteId: 'all',
        seaweedTypeId: 'all',
        date: '' // Acts as "As of Date"
    });

    const stockData = useMemo(() => {
        const stockMap = new Map<string, { kg: number; bags: number }>();

        stockMovements.forEach(movement => {
            if (filters.date && movement.date > filters.date) return;
            if (filters.siteId !== 'all' && movement.siteId !== filters.siteId) return;
            if (filters.seaweedTypeId !== 'all' && movement.seaweedTypeId !== filters.seaweedTypeId) return;

            const key = `${movement.siteId}|${movement.seaweedTypeId}`;
            const current = stockMap.get(key) || { kg: 0, bags: 0 };
            current.kg += (movement.inKg || 0) - (movement.outKg || 0);
            current.bags += (movement.inBags || 0) - (movement.outBags || 0);
            stockMap.set(key, current);
        });

        const siteMap = new Map(sites.map(s => [s.id, s.name]));
        const seaweedTypeMap = new Map<string, SeaweedType>(seaweedTypes.map(st => [st.id, st]));

        const summary: StockSummaryItem[] = [];
        stockMap.forEach((stock, key) => {
            if (stock.kg > 0.01 || stock.bags > 0) {
                const [siteId, seaweedTypeId] = key.split('|');
                
                const siteName = siteMap.get(siteId) || t('unknown');
                
                const seaweedTypeInfo = seaweedTypeMap.get(seaweedTypeId);
                const seaweedTypeName = seaweedTypeInfo?.name || t('unknown');
                const value = stock.kg * (seaweedTypeInfo?.dryPrice || 0);

                summary.push({
                    siteId,
                    siteName,
                    seaweedTypeId,
                    seaweedTypeName,
                    kg: stock.kg,
                    bags: stock.bags,
                    value,
                });
            }
        });
        return summary;
    }, [stockMovements, sites, seaweedTypes, t, filters]);

    const sortedStockData = useMemo(() => {
        return [...stockData].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            
            if (typeof valA === 'string' && typeof valB === 'string') {
                 return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            // @ts-ignore
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            // @ts-ignore
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [stockData, sortConfig]);

    const totals = useMemo(() => ({
        totalKg: stockData.reduce((sum, item) => sum + item.kg, 0),
        totalValue: stockData.reduce((sum, item) => sum + item.value, 0),
        distinctItems: stockData.length,
    }), [stockData]);

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

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ siteId: 'all', seaweedTypeId: 'all', date: '' });
    };

    const handleExport = () => {
        const dataToExport = sortedStockData.map(item => ({
            site: item.siteName,
            seaweedType: item.seaweedTypeName,
            kg: item.kg,
            bags: item.bags,
            value: item.value
        }));

        const columns = [
            { header: t('site'), key: 'site', width: 25 },
            { header: t('seaweedType'), key: 'seaweedType', width: 20 },
            { header: `${t('stockKg')}`, key: 'kg', width: 15 },
            { header: t('stockBags'), key: 'bags', width: 15 },
            { header: t('value'), key: 'value', width: 20 },
        ];

        const dateStr = filters.date || new Date().toISOString().split('T')[0];
        exportDataToExcel(dataToExport, columns, `OnSite_Stock_${dateStr}`, 'Stock Status');
    };

    return (
        <div>
            <Card className="mb-6" title={t('filtersTitle')}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)}>
                        <option value="all">{t('allSites')}</option>
                        {sites.filter(s => s.id !== 'pressing-warehouse').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('seaweedType')} value={filters.seaweedTypeId} onChange={e => handleFilterChange('seaweedTypeId', e.target.value)}>
                        <option value="all">{t('allSeaweedTypes')}</option>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                    <Input 
                        label={t('stockHistory') + ' (' + t('date') + ')'} 
                        type="date" 
                        value={filters.date} 
                        onChange={e => handleFilterChange('date', e.target.value)}
                        placeholder="Current"
                    />
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={clearFilters} className="h-[42px] flex-1">
                            {t('clearFilters')}
                        </Button>
                        <Button onClick={handleExport} variant="secondary" className="h-[42px] flex-1">
                            <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2" />
                            {t('exportExcel')}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card><div className="flex items-center"><Icon name="Package" className="w-10 h-10 text-blue-500 mr-4"/><div><p className="text-gray-500">{t('totalStockKgHeader')}</p><p className="text-3xl font-bold">{formatNumber(totals.totalKg, settings.localization)}</p></div></div></Card>
                <Card><div className="flex items-center"><Icon name="DollarSign" className="w-10 h-10 text-green-500 mr-4"/><div><p className="text-gray-500">{t('totalStockValue')}</p><p className="text-3xl font-bold">{formatCurrency(totals.totalValue, settings.localization)}</p></div></div></Card>
                <Card><div className="flex items-center"><Icon name="Archive" className="w-10 h-10 text-purple-500 mr-4"/><div><p className="text-gray-500">{t('distinctStockItems')}</p><p className="text-3xl font-bold">{totals.distinctItems}</p></div></div></Card>
            </div>

            <h3 className="text-lg font-semibold mb-2">{t('stockSummaryBySiteAndType')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
                {t('clickForHistory')}
            </p>

            <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800">
                         <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                            <SortableHeader sortKey="siteName" label={t('site')} />
                            <SortableHeader sortKey="seaweedTypeName" label={t('seaweedType')} />
                            <SortableHeader sortKey="kg" label={t('stockKg')} className="text-right" />
                            <SortableHeader sortKey="bags" label={t('stockBags')} className="text-right" />
                            <SortableHeader sortKey="value" label={t('value')} className="text-right" />
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStockData.map(item => (
                            <tr 
                                key={`${item.siteId}-${item.seaweedTypeId}`} 
                                className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedHistoryItem(item)}
                            >
                                <td className="p-3 font-semibold">{item.siteName}</td>
                                <td className="p-3">{item.seaweedTypeName}</td>
                                <td className="p-3 text-right">{formatNumber(item.kg, settings.localization)}</td>
                                <td className="p-3 text-right">{formatNumber(item.bags, {...settings.localization, nonMonetaryDecimals: 0})}</td>
                                <td className="p-3 text-right font-semibold">{formatCurrency(item.value, settings.localization)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedStockData.length === 0 && <p className="text-center p-8 text-gray-500">{t('noStockData')}</p>}
            </div>

            {selectedHistoryItem && (
                <StockHistoryModal 
                    isOpen={!!selectedHistoryItem}
                    onClose={() => setSelectedHistoryItem(null)}
                    siteId={selectedHistoryItem.siteId}
                    siteName={selectedHistoryItem.siteName}
                    seaweedTypeId={selectedHistoryItem.seaweedTypeId}
                    seaweedTypeName={selectedHistoryItem.seaweedTypeName}
                />
            )}
        </div>
    );
};

export default StockStatus;