import React, { useState, useMemo, useCallback, useEffect, FC } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import type { PressedStockMovement, PressingSlip, ExportDocument } from '../../types';
import { PressedStockMovementType } from '../../types';
import PressingSlipFormModal from '../../components/PressingSlipFormModal';
import PressedAdjustmentModal from '../../components/PressedAdjustmentModal';
import Modal from '../../components/ui/Modal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Tooltip from '../../components/ui/Tooltip';
import { exportDataToExcel, exportMultipleSheetsToExcel } from '../../utils/excelExporter';

const SummaryView: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { pressedStockMovements, seaweedTypes } = useData();

    const { bulkStock, pressedStock, totals } = useMemo(() => {
        const bulk = new Map<string, { kg: number; bags: number }>();
        const pressed = new Map<string, { bales: number; kg: number }>();

        pressedStockMovements.forEach(m => {
            const key = m.seaweedTypeId;
            
            let currentBulk = bulk.get(key) || { kg: 0, bags: 0 };
            let currentPressed = pressed.get(key) || { bales: 0, kg: 0 };

            switch (m.type) {
                // Bulk Inputs
                case PressedStockMovementType.BULK_IN_FROM_SITE:
                case PressedStockMovementType.FARMER_DELIVERY:
                    currentBulk.kg += m.inKg || 0;
                    currentBulk.bags += m.inBales || 0; 
                    break;
                // Bulk Outputs
                case PressedStockMovementType.PRESSING_CONSUMPTION:
                    currentBulk.kg -= m.outKg || 0;
                    currentBulk.bags -= m.outBales || 0;
                    break;
                
                // Pressed Inputs
                case PressedStockMovementType.PRESSING_IN:
                case PressedStockMovementType.INITIAL_STOCK:
                case PressedStockMovementType.ADJUSTMENT_IN:
                    currentPressed.bales += m.inBales || 0;
                    currentPressed.kg += m.inKg || 0;
                    break;
                // Pressed Outputs
                case PressedStockMovementType.EXPORT_OUT:
                case PressedStockMovementType.RETURN_TO_SITE:
                case PressedStockMovementType.ADJUSTMENT_OUT:
                    currentPressed.bales -= m.outBales || 0;
                    currentPressed.kg -= m.outKg || 0;
                    break;
            }
            bulk.set(key, currentBulk);
            pressed.set(key, currentPressed);
        });

        const formatMap = (map: Map<string, any>, isPressed: boolean) => {
            return Array.from(map.entries()).map(([seaweedTypeId, data]) => {
                const seaweedType = seaweedTypes.find(st => st.id === seaweedTypeId);
                const value = data.kg * (seaweedType?.dryPrice || 0);
                return {
                    seaweedTypeId,
                    name: seaweedType?.name || t('unknown'),
                    siteName: t('pressedWarehouseTitle'),
                    ...data,
                    value,
                };
            }).filter(item => item.kg > 0.01 || (isPressed ? item.bales > 0 : item.bags > 0));
        };

        const bulkStockSummary = formatMap(bulk, false);
        const pressedStockSummary = formatMap(pressed, true);
        
        const bulkValue = bulkStockSummary.reduce((sum, item) => sum + item.value, 0);
        const pressedValue = pressedStockSummary.reduce((sum, item) => sum + item.value, 0);

        const calculatedTotals = {
            pressedBales: pressedStockSummary.reduce((sum, item) => sum + item.bales, 0),
            pressedKg: pressedStockSummary.reduce((sum, item) => sum + item.kg, 0),
            pressedValue,
            totalValue: bulkValue + pressedValue,
        };

        return { bulkStock: bulkStockSummary, pressedStock: pressedStockSummary, totals: calculatedTotals };

    }, [pressedStockMovements, seaweedTypes, t]);
    
    const handleExport = () => {
        const bulkData = bulkStock.map(item => ({
            name: item.name,
            kg: item.kg,
            bags: item.bags,
            value: item.value
        }));
        const pressedData = pressedStock.map(item => ({
            name: item.name,
            kg: item.kg,
            bales: item.bales,
            value: item.value
        }));
    
        const sheets = [
            {
                sheetName: t('bulkSeaweed'),
                columns: [
                    { header: t('seaweedType'), key: 'name', width: 25 },
                    { header: t('warehouse_weightKg'), key: 'kg', width: 15 },
                    { header: t('bags'), key: 'bags', width: 15 },
                    { header: t('value'), key: 'value', width: 20 },
                ],
                data: bulkData
            },
            {
                sheetName: t('pressedSeaweed'),
                columns: [
                    { header: t('seaweedType'), key: 'name', width: 25 },
                    { header: t('warehouse_weightKg'), key: 'kg', width: 15 },
                    { header: t('bales'), key: 'bales', width: 15 },
                    { header: t('value'), key: 'value', width: 20 },
                ],
                data: pressedData
            }
        ];
    
        exportMultipleSheetsToExcel(sheets, `Pressed_Warehouse_Summary`);
    };

    return (
        <div>
             <div className="flex justify-end mb-4">
                <Button onClick={handleExport} variant="secondary">
                    <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2"/>
                    {t('exportExcel')}
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card><div className="flex items-center"><Icon name="Archive" className="w-10 h-10 text-blue-500 mr-4"/><div><p className="text-gray-500">{t('warehouse_totalBalesInStock')}</p><p className="text-3xl font-bold">{totals.pressedBales}</p></div></div></Card>
                <Card><div className="flex items-center"><Icon name="Package" className="w-10 h-10 text-green-500 mr-4"/><div><p className="text-gray-500">{t('totalStockKg')} ({t('pressedSeaweed')})</p><p className="text-3xl font-bold">{formatNumber(totals.pressedKg, settings.localization)}</p></div></div></Card>
                <Card><div className="flex items-center"><Icon name="DollarSign" className="w-10 h-10 text-yellow-500 mr-4"/><div><p className="text-gray-500">{t('totalStockValue')}</p><p className="text-3xl font-bold">{formatCurrency(totals.totalValue, settings.localization)}</p></div></div></Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                <div className="flex flex-col h-full">
                    <div className="flex items-center mb-3">
                         <div className="w-2 h-6 bg-red-500 rounded-sm mr-2"></div>
                         <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('bulkSeaweed')}</h3>
                    </div>
                    
                    <Card className="flex-grow border-t-4 border-t-red-500">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b dark:border-gray-700 text-xs uppercase text-gray-500">
                                        <th className="p-2 pl-0">{t('seaweedType')}</th>
                                        <th className="p-2 text-right">{t('kg')}</th>
                                        <th className="p-2 text-right">{t('bags')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {bulkStock.map(item => (
                                        <tr key={item.seaweedTypeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="p-3 pl-0 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                                            <td className="p-3 text-right">{formatNumber(item.kg, settings.localization)}</td>
                                            <td className="p-3 text-right text-gray-500">{item.bags}</td>
                                        </tr>
                                    ))}
                                    {bulkStock.length === 0 && (
                                        <tr><td colSpan={3} className="p-6 text-center text-sm text-gray-400 italic">{t('noStockData')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                 <div className="flex flex-col h-full">
                    <div className="flex items-center mb-3">
                         <div className="w-2 h-6 bg-green-500 rounded-sm mr-2"></div>
                         <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('pressedSeaweed')}</h3>
                    </div>

                    <Card className="flex-grow border-t-4 border-t-green-500">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b dark:border-gray-700 text-xs uppercase text-gray-500">
                                        <th className="p-2 pl-0">{t('seaweedType')}</th>
                                        <th className="p-2 text-right">{t('kg')}</th>
                                        <th className="p-2 text-right">{t('bales')}</th>
                                        <th className="p-2 text-right">{t('value')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {pressedStock.map(item => (
                                        <tr key={item.seaweedTypeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="p-3 pl-0 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                                            <td className="p-3 text-right">{formatNumber(item.kg, settings.localization)}</td>
                                            <td className="p-3 text-right text-gray-500">{item.bales}</td>
                                            <td className="p-3 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(item.value, settings.localization)}</td>
                                        </tr>
                                    ))}
                                    {pressedStock.length === 0 && (
                                        <tr><td colSpan={4} className="p-6 text-center text-sm text-gray-400 italic">{t('noStockData')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const PressingSlipsView: React.FC<{
    onEdit: (slip: PressingSlip) => void;
    onDelete: (slip: PressingSlip) => void;
}> = ({ onEdit, onDelete }) => {
    const { t } = useLocalization();
    const { pressingSlips, seaweedTypes, exportDocuments } = useData();
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const exportDocMap = useMemo(() => new Map(exportDocuments.map(doc => [doc.id, doc])), [exportDocuments]);
    const seaweedTypeMap = useMemo(() => new Map(seaweedTypes.map(st => [st.id, st.name])), [seaweedTypes]);

    const sortedSlips = useMemo(() => {
        return [...pressingSlips].sort((a, b) => {
            const valA = a[sortConfig.key as keyof PressingSlip];
            const valB = b[sortConfig.key as keyof PressingSlip];
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [pressingSlips, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };
    
    const handleExport = () => {
        const dataToExport = sortedSlips.map(slip => ({
            slipNo: slip.slipNo,
            date: slip.date,
            seaweedType: seaweedTypeMap.get(slip.seaweedTypeId) || t('unknown'),
            consumedWeightKg: slip.consumedWeightKg,
            producedWeightKg: slip.producedWeightKg,
            producedBalesCount: slip.producedBalesCount,
            linkedExport: slip.exportDocId ? (exportDocMap.get(slip.exportDocId)?.docNo || 'Linked') : 'No'
        }));
    
        const columns = [
            { header: t('slipNo'), key: 'slipNo', width: 20 },
            { header: t('date'), key: 'date', width: 15 },
            { header: t('seaweedType'), key: 'seaweedType', width: 20 },
            { header: t('bulkWeightConsumed'), key: 'consumedWeightKg', width: 20 },
            { header: t('pressedWeightObtained'), key: 'producedWeightKg', width: 20 },
            { header: t('bales'), key: 'producedBalesCount', width: 15 },
            { header: t('linkedExport'), key: 'linkedExport', width: 20 },
        ];
        
        exportDataToExcel(dataToExport, columns, `PressingSlips_${new Date().toISOString().split('T')[0]}`, 'Pressing Slips');
    };

    return (
        <div className="overflow-x-auto">
             <div className="flex justify-end mb-2">
                <Button onClick={handleExport} variant="secondary">
                    <Icon name="FileSpreadsheet" className="w-4 h-4 mr-2" /> {t('exportExcel')}
                </Button>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-800">
                        <th className="p-3"><button onClick={() => requestSort('slipNo')} className="group flex items-center gap-2">{t('slipNo')} {getSortIcon('slipNo')}</button></th>
                        <th className="p-3"><button onClick={() => requestSort('date')} className="group flex items-center gap-2">{t('date')} {getSortIcon('date')}</button></th>
                        <th className="p-3">{t('seaweedType')}</th>
                        <th className="p-3 text-right text-red-600">{t('bulkWeightConsumed')}</th>
                        <th className="p-3 text-right text-green-600">{t('pressedWeightObtained')}</th>
                        <th className="p-3 text-right">{t('bales')}</th>
                        <th className="p-3">{t('linkedExport')}</th>
                        <th className="p-3 text-right">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedSlips.map(slip => {
                        const linkedExport = slip.exportDocId ? exportDocMap.get(slip.exportDocId) : null;
                        const isLinked = !!linkedExport;
                        return (
                            <tr key={slip.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                <td className="p-3 font-mono">{slip.slipNo}</td>
                                <td className="p-3">{slip.date}</td>
                                <td className="p-3 font-semibold">{seaweedTypeMap.get(slip.seaweedTypeId) || t('unknown')}</td>
                                <td className="p-3 text-right text-red-600 font-medium">-{slip.consumedWeightKg} kg</td>
                                <td className="p-3 text-right text-green-600 font-bold">+{slip.producedWeightKg} kg</td>
                                <td className="p-3 text-right font-semibold">{slip.producedBalesCount}</td>
                                <td className="p-3">{linkedExport ? <span className="font-semibold text-blue-600 dark:text-blue-400">{linkedExport.docNo}</span> : '-'}</td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" onClick={() => onEdit(slip)} disabled={isLinked}><Icon name="Settings" className="w-4 h-4" /></Button>
                                        <Tooltip content={isLinked ? t('cannotDeleteLinkedSlip') : t('delete')}>
                                            <Button variant="danger" onClick={() => onDelete(slip)} disabled={isLinked}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                        </Tooltip>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const WarehouseMovementHistory: React.FC = () => {
    const { t } = useLocalization();
    const { pressedStockMovements, seaweedTypes } = useData();
    const { settings } = useSettings();
    const [filters, setFilters] = useState({ seaweedTypeId: 'all', startDate: '', endDate: '' });

    const { filteredBulkHistory, filteredPressedHistory } = useMemo(() => {
        const movementsForType = filters.seaweedTypeId === 'all'
            ? [...pressedStockMovements]
            : pressedStockMovements.filter(m => m.seaweedTypeId === filters.seaweedTypeId);

        movementsForType.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));

        let bulkKg = 0, bulkBags = 0, pressedKg = 0, pressedBales = 0;
        const historyWithBalance = movementsForType.map(m => {
            const isBulk = [
                PressedStockMovementType.BULK_IN_FROM_SITE,
                PressedStockMovementType.FARMER_DELIVERY,
                PressedStockMovementType.PRESSING_CONSUMPTION,
            ].includes(m.type);

            if (isBulk) {
                bulkKg += (m.inKg || 0) - (m.outKg || 0);
                bulkBags += (m.inBales || 0) - (m.outBales || 0); // Here inBales = bags
                return { ...m, isBulk, balanceKg: bulkKg, balanceUnits: bulkBags };
            } else {
                pressedKg += (m.inKg || 0) - (m.outKg || 0);
                pressedBales += (m.inBales || 0) - (m.outBales || 0); // Here inBales = bales
                return { ...m, isBulk, balanceKg: pressedKg, balanceUnits: pressedBales };
            }
        });

        const dateFilteredHistory = historyWithBalance.filter(m => {
            if (filters.startDate && m.date < filters.startDate) return false;
            if (filters.endDate && m.date > filters.endDate) return false;
            return true;
        });

        return {
            filteredBulkHistory: dateFilteredHistory.filter(m => m.isBulk).reverse(),
            filteredPressedHistory: dateFilteredHistory.filter(m => !m.isBulk).reverse()
        };
    }, [pressedStockMovements, filters.seaweedTypeId, filters.startDate, filters.endDate]);
    
    const handleExport = () => {
        const bulkData = filteredBulkHistory.map(m => ({
            date: m.date,
            designation: `${t(`pressedStockMovement_${m.type}` as any)}: ${m.designation}`,
            inKg: m.inKg,
            inBags: m.inBales,
            outKg: m.outKg,
            outBags: m.outBales,
            balanceKg: m.balanceKg,
            balanceBags: m.balanceUnits,
        })).reverse(); // Reverse back to chronological for export
    
        const pressedData = filteredPressedHistory.map(m => ({
            date: m.date,
            designation: `${t(`pressedStockMovement_${m.type}` as any)}: ${m.designation}`,
            inKg: m.inKg,
            inBales: m.inBales,
            outKg: m.outKg,
            outBales: m.outBales,
            balanceKg: m.balanceKg,
            balanceBales: m.balanceUnits,
        })).reverse(); // Reverse back to chronological for export
    
        const sheets = [
            {
                sheetName: t('bulkSeaweed'),
                columns: [
                    { header: t('date'), key: 'date', width: 15 },
                    { header: t('designation'), key: 'designation', width: 40 },
                    { header: 'IN (Kg)', key: 'inKg', width: 15 },
                    { header: 'IN (Bags)', key: 'inBags', width: 15 },
                    { header: 'OUT (Kg)', key: 'outKg', width: 15 },
                    { header: 'OUT (Bags)', key: 'outBags', width: 15 },
                    { header: 'Balance (Kg)', key: 'balanceKg', width: 15 },
                    { header: 'Balance (Bags)', key: 'balanceBags', width: 15 },
                ],
                data: bulkData,
            },
            {
                sheetName: t('pressedSeaweed'),
                columns: [
                    { header: t('date'), key: 'date', width: 15 },
                    { header: t('designation'), key: 'designation', width: 40 },
                    { header: 'IN (Kg)', key: 'inKg', width: 15 },
                    { header: 'IN (Bales)', key: 'inBales', width: 15 },
                    { header: 'OUT (Kg)', key: 'outKg', width: 15 },
                    { header: 'OUT (Bales)', key: 'outBales', width: 15 },
                    { header: 'Balance (Kg)', key: 'balanceKg', width: 15 },
                    { header: 'Balance (Bales)', key: 'balanceBales', width: 15 },
                ],
                data: pressedData,
            }
        ];
    
        exportMultipleSheetsToExcel(sheets, `Warehouse_Movement_History_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                <Select label={t('seaweedType')} value={filters.seaweedTypeId} onChange={e => setFilters(p => ({...p, seaweedTypeId: e.target.value}))}>
                    <option value="all">{t('allSeaweedTypes')}</option>
                    {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </Select>
                <Input label={t('startDate')} type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} />
                <Input label={t('endDate')} type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} />
                 <Button onClick={handleExport} variant="secondary" className="h-[42px]">
                    <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2" />
                    {t('exportExcel')}
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card title={`${t('bulkSeaweed')} (${t('forPressing')})`}>
                    <div className="overflow-x-auto max-h-[60vh]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-sm">
                                <tr className="border-b border-gray-300 dark:border-gray-600">
                                    <th rowSpan={2} className="p-2 border-r dark:border-gray-600">{t('date')}</th>
                                    <th rowSpan={2} className="p-2 border-r dark:border-gray-600" style={{minWidth: '200px'}}>{t('designation')}</th>
                                    <th colSpan={2} className="p-1 text-center border-b dark:border-gray-600">IN</th>
                                    <th colSpan={2} className="p-1 text-center border-b dark:border-gray-600">OUT</th>
                                    <th colSpan={2} className="p-1 text-center border-b dark:border-gray-600">{t('balance')}</th>
                                </tr>
                                <tr className="border-b border-gray-300 dark:border-gray-600">
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('kg')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('bags')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('kg')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('bags')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('kg')}</th>
                                    <th className="p-2 text-center">{t('bags')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBulkHistory.map(m => (
                                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="p-2 whitespace-nowrap border-r dark:border-gray-700">{m.date}</td>
                                        <td className="p-2 border-r dark:border-gray-700">{t(`pressedStockMovement_${m.type}` as any)}: {m.designation}</td>
                                        <td className="p-2 text-right border-r dark:border-gray-700 text-green-600">{m.inKg ? `+${formatNumber(m.inKg, settings.localization)}` : ''}</td>
                                        <td className="p-2 text-center border-r dark:border-gray-700 text-green-600">{m.inBales ? `+${m.inBales}` : ''}</td>
                                        <td className="p-2 text-right border-r dark:border-gray-700 text-red-600">{m.outKg ? `-${formatNumber(m.outKg, settings.localization)}` : ''}</td>
                                        <td className="p-2 text-center border-r dark:border-gray-700 text-red-600">{m.outBales ? `-${m.outBales}` : ''}</td>
                                        <td className="p-2 text-right border-r dark:border-gray-700 font-bold">{formatNumber(m.balanceKg, settings.localization)}</td>
                                        <td className="p-2 text-center font-bold">{m.balanceUnits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card title={`${t('pressedSeaweed')} (${t('bales')})`}>
                    <div className="overflow-x-auto max-h-[60vh]">
                         <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-sm">
                                <tr className="border-b border-gray-300 dark:border-gray-600">
                                    <th rowSpan={2} className="p-2 border-r dark:border-gray-600">{t('date')}</th>
                                    <th rowSpan={2} className="p-2 border-r dark:border-gray-600" style={{minWidth: '200px'}}>{t('designation')}</th>
                                    <th colSpan={2} className="p-1 text-center border-b dark:border-gray-600">IN</th>
                                    <th colSpan={2} className="p-1 text-center border-b dark:border-gray-600">OUT</th>
                                    <th colSpan={2} className="p-1 text-center border-b dark:border-gray-600">{t('balance')}</th>
                                </tr>
                                <tr className="border-b border-gray-300 dark:border-gray-600">
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('kg')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('baleSingular')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('kg')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('baleSingular')}</th>
                                    <th className="p-2 text-center border-r dark:border-gray-600">{t('kg')}</th>
                                    <th className="p-2 text-center">{t('baleSingular')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPressedHistory.map(m => (
                                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="p-2 whitespace-nowrap border-r dark:border-gray-700">{m.date}</td>
                                        <td className="p-2 border-r dark:border-gray-700">{t(`pressedStockMovement_${m.type}` as any)}: {m.designation}</td>
                                        <td className="p-2 text-right border-r dark:border-gray-700 text-green-600">{m.inKg ? `+${formatNumber(m.inKg, settings.localization)}` : ''}</td>
                                        <td className="p-2 text-center border-r dark:border-gray-700 text-green-600">{m.inBales || ''}</td>
                                        <td className="p-2 text-right border-r dark:border-gray-700 text-red-600">{m.outKg ? `-${formatNumber(m.outKg, settings.localization)}` : ''}</td>
                                        <td className="p-2 text-center border-r dark:border-gray-700 text-red-600">{m.outBales ? `-${m.outBales}` : ''}</td>
                                        <td className="p-2 text-right border-r dark:border-gray-700 font-bold">{formatNumber(m.balanceKg, settings.localization)}</td>
                                        <td className="p-2 text-center font-bold">{m.balanceUnits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};


const PressedWarehouse: React.FC = () => {
  const { t } = useLocalization();
  const { deletePressingSlip } = useData();
  const [activeView, setActiveView] = useState<'summary' | 'slips' | 'history'>('summary');
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<PressingSlip | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [slipToDelete, setSlipToDelete] = useState<PressingSlip | null>(null);

  const handleOpenSlipModal = (slip: PressingSlip | null) => {
      setEditingSlip(slip);
      setIsSlipModalOpen(true);
  };
  
  const handleDeleteClick = (slip: PressingSlip) => {
      setSlipToDelete(slip);
      setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (slipToDelete && !slipToDelete.exportDocId) {
        deletePressingSlip(slipToDelete.id);
    }
    setIsConfirmOpen(false);
    setSlipToDelete(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('pressedWarehouseTitle')}</h1>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsAdjustmentModalOpen(true)}>
                <Icon name="SlidersHorizontal" className="w-5 h-5"/>{t('recordStockAdjustment')}
            </Button>
            <Button onClick={() => handleOpenSlipModal(null)}>
                <Icon name="PlusCircle" className="w-5 h-5"/>{t('recordPressingSlip')}
            </Button>
        </div>
      </div>

      <Card>
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button onClick={() => setActiveView('summary')} className={`py-2 px-4 text-sm font-medium ${activeView === 'summary' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{t('summaryView')}</button>
                <button onClick={() => setActiveView('slips')} className={`py-2 px-4 text-sm font-medium ${activeView === 'slips' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{t('pressingSlips')}</button>
                <button onClick={() => setActiveView('history')} className={`py-2 px-4 text-sm font-medium ${activeView === 'history' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{t('movementHistory')}</button>
            </nav>
        </div>

        {activeView === 'summary' && <SummaryView />}
        {activeView === 'slips' && <PressingSlipsView onEdit={slip => handleOpenSlipModal(slip)} onDelete={handleDeleteClick} />}
        {activeView === 'history' && <WarehouseMovementHistory />}
      </Card>
      
      <PressingSlipFormModal isOpen={isSlipModalOpen} onClose={() => setIsSlipModalOpen(false)} slip={editingSlip} />
      <PressedAdjustmentModal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} />

       {isConfirmOpen && (
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('confirmDeleteTitle')}
                message={slipToDelete?.exportDocId ? t('confirmDeletePressingSlipLinked') : t('confirmDeletePressingSlip')}
                confirmDisabled={!!slipToDelete?.exportDocId}
            />
        )}

    </div>
  );
};

export default PressedWarehouse;