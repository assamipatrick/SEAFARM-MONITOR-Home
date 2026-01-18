
import React, { useMemo, FC, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import { 
    generateProductionAnalysis, 
    generateCreditAnalysis, 
    generateInventoryAnalysis, 
    generateEmployeeDistributionNarrative,
    generateFarmOverviewNarrative 
} from '../../services/geminiService';
import AINarrative from './AINarrative';
import PrintPage from '../printable/PrintPage';
import { COUNTRIES } from '../../constants';
import MonthlyProductionChart from './charts/MonthlyProductionChart';
import StackedEmployeeChart from './charts/StackedEmployeeChart';
import { ModuleStatus } from '../../types';

interface CustomReportProps {
    month: number;
    year: number;
    sections: string[];
}

const CustomReport: FC<CustomReportProps> = ({ month, year, sections }) => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { 
        cultivationCycles, modules, sites, seaweedTypes, farmerCredits, repayments, farmers, creditTypes,
        stockMovements, employees, incidents, incidentTypes
    } = useData();
    
    const period = new Date(year, month).toLocaleDateString(language, { month: 'long', year: 'numeric' });
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const countryName = useMemo(() => {
        return COUNTRIES.find(c => c.code === settings.localization.country)?.name || settings.localization.country;
    }, [settings.localization.country]);

    // --- Data Preparation ---

    // Production Data
    const productionData = useMemo(() => {
        if (!sections.includes('production')) return [];
        return cultivationCycles
            .filter(c => c.harvestDate && new Date(c.harvestDate) >= startDate && new Date(c.harvestDate) <= endDate)
            .map(cycle => {
                const module = modules.find(m => m.id === cycle.moduleId);
                const duration = cycle.harvestDate ? (new Date(cycle.harvestDate).getTime() - new Date(cycle.plantingDate).getTime()) / (1000 * 3600 * 24) : 0;
                const netWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                return {
                    cycle: { ...cycle, harvestedWeight: netWeight }, // Override harvestedWeight with Net for display
                    module,
                    site: sites.find(s => s.id === module?.siteId),
                    seaweedType: seaweedTypes.find(st => st.id === cycle.seaweedTypeId),
                    duration: Math.round(duration)
                }
            })
            .sort((a,b) => new Date(a.cycle.harvestDate!).getTime() - new Date(b.cycle.harvestDate!).getTime());
    }, [sections, cultivationCycles, modules, sites, seaweedTypes, startDate, endDate]);

    // Financial (Credit) Data
    const creditData = useMemo(() => {
        if (!sections.includes('finance')) return { reportData: [], summaryStats: { totalCredits: 0, totalAmount: 0, topFarmers: [] } };
        
        const farmerMap = new Map(farmers.map(f => [f.id, `${f.firstName} ${f.lastName}`]));
        const creditTypeMap = new Map(creditTypes.map(ct => [ct.id, ct.name]));

        const data = farmerCredits
            .filter(c => c.date && new Date(c.date) >= startDate && new Date(c.date) <= endDate)
            .map(credit => ({
                ...credit,
                farmerName: farmerMap.get(credit.farmerId) || t('unknown'),
                creditTypeName: creditTypeMap.get(credit.creditTypeId) || t('unknown'),
            }));

        const farmerTotals = new Map<string, number>();
        data.forEach(credit => {
            farmerTotals.set(credit.farmerName, (farmerTotals.get(credit.farmerName) || 0) + credit.totalAmount);
        });

        const topFarmers = Array.from(farmerTotals.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, total]) => ({ name, total }));

        return {
            reportData: data,
            summaryStats: {
                totalCredits: data.length,
                totalAmount: data.reduce((sum, c) => sum + c.totalAmount, 0),
                topFarmers
            }
        };
    }, [sections, farmerCredits, farmers, creditTypes, startDate, endDate, t]);

    // Inventory Data
    const inventoryData = useMemo(() => {
        if (!sections.includes('inventory')) return { reportData: [], summaryStats: { totalKg: 0, totalBags: 0, totalValue: 0 } };

        const stockMap = new Map<string, { kg: number; bags: number }>();
        stockMovements.forEach(movement => {
             // Filter out future movements? Ideally we show current snapshot or snapshot at end of month
             // Here assuming current snapshot for simplicity or filtering by date if needed.
             // Let's filter by endDate to be consistent with report period
             if (new Date(movement.date) <= endDate) {
                const key = `${movement.siteId}|${movement.seaweedTypeId}`;
                const current = stockMap.get(key) || { kg: 0, bags: 0 };
                current.kg += (movement.inKg || 0) - (movement.outKg || 0);
                current.bags += (movement.inBags || 0) - (movement.outBags || 0);
                stockMap.set(key, current);
             }
        });

        const siteMap = new Map(sites.map(s => [s.id, s.name]));
        const seaweedTypeMap = new Map(seaweedTypes.map(st => [st.id, { name: st.name, dryPrice: st.dryPrice }]));

        const data = Array.from(stockMap.entries())
            .map(([key, stock]) => {
                const [siteId, seaweedTypeId] = key.split('|');
                const siteName = siteMap.get(siteId) || t('unknown');
                const seaweedTypeInfo = seaweedTypeMap.get(seaweedTypeId);
                const seaweedTypeName = seaweedTypeInfo?.name || t('unknown');
                const value = stock.kg * (seaweedTypeInfo?.dryPrice || 0);
                return {
                    siteName,
                    seaweedTypeName,
                    currentStockKg: Math.max(0, stock.kg),
                    currentStockBags: Math.max(0, stock.bags),
                    value
                }
            })
            .filter(item => item.currentStockKg > 0.01 || item.currentStockBags > 0);

        return {
            reportData: data,
            summaryStats: {
                totalKg: data.reduce((sum, i) => sum + i.currentStockKg, 0),
                totalBags: data.reduce((sum, i) => sum + i.currentStockBags, 0),
                totalValue: data.reduce((sum, i) => sum + i.value, 0),
            }
        };
    }, [sections, stockMovements, sites, seaweedTypes, endDate, t]);

    // Analysis Generators
    const productionAnalysis = useCallback(async () => {
        if (productionData.length === 0) return t('noDataForReport');
        return await generateProductionAnalysis(productionData, language as 'en' | 'fr');
    }, [productionData, language, t]);

    const creditAnalysis = useCallback(async () => {
        if (creditData.reportData.length === 0) return t('noDataForReport');
        return await generateCreditAnalysis(creditData.reportData, creditData.summaryStats, language as 'en' | 'fr');
    }, [creditData, language, t]);

    const inventoryAnalysis = useCallback(async () => {
        if (inventoryData.reportData.length === 0) return t('noDataForReport');
        return await generateInventoryAnalysis(inventoryData.reportData, inventoryData.summaryStats, language as 'en' | 'fr');
    }, [inventoryData, language, t]);

    return (
        <PrintPage>
            <header className="mb-8 border-b-2 border-gray-800 dark:border-gray-200 pb-4">
                 <div className="grid grid-cols-4 items-center">
                    <div className="col-span-1">
                        <img src={settings.company.logoUrl} alt={`${settings.company.name} logo`} className="h-14 w-auto object-contain" />
                    </div>
                    <div className="col-span-2 text-center">
                        <h1 className="font-bold text-xl uppercase mb-1 text-gray-900 dark:text-gray-100">{settings.company.name}</h1>
                        <div className="text-[9px] leading-tight space-y-0 text-gray-600 dark:text-gray-400">
                            <p>{t('address')}: {settings.company.address}</p>
                            <p>{t('nif')}: {settings.company.nif} / {t('stat')}: {settings.company.stat}</p>
                            <p>{t('country')}: {countryName}</p>
                        </div>
                    </div>
                    <div className="col-span-1 text-right">
                         <h2 className="text-xl font-bold uppercase text-gray-900 dark:text-gray-100">{t('customReportTitle')}</h2>
                        <p className="font-bold text-sm mt-1 text-blue-600 dark:text-blue-400">{period}</p>
                    </div>
                </div>
            </header>

            {sections.includes('production') && (
                <section className="mb-10 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-b-2 border-blue-500 mb-4 pb-1 text-blue-800 dark:text-blue-300 flex items-center">
                        <span className="bg-blue-500 w-2 h-6 mr-2 rounded-sm inline-block"></span>
                        {t('section_production')}
                    </h3>
                    <div className="overflow-x-auto mb-4 border rounded-lg border-gray-200 dark:border-gray-700">
                        <table className="w-full text-left text-xs">
                             <thead>
                                <tr className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                                    <th className="p-3 font-bold text-blue-900 dark:text-blue-100">{t('site')}</th>
                                    <th className="p-3 font-bold text-blue-900 dark:text-blue-100">{t('module')}</th>
                                    <th className="p-3 font-bold text-blue-900 dark:text-blue-100">{t('seaweedType')}</th>
                                    <th className="p-3 font-bold text-blue-900 dark:text-blue-100 text-right">{t('harvestedWeight')} (Net Kg)</th>
                                    <th className="p-3 font-bold text-blue-900 dark:text-blue-100 text-right">{t('duration')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productionData.length > 0 ? productionData.map((item, idx) => (
                                    <tr key={item.cycle.id} className={`border-b border-gray-200 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <td className="p-2 text-gray-800 dark:text-gray-200">{item.site?.name}</td>
                                        <td className="p-2 font-mono text-gray-600 dark:text-gray-400">{item.module?.code}</td>
                                        <td className="p-2 text-gray-800 dark:text-gray-200">{item.seaweedType?.name}</td>
                                        <td className="p-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatNumber(item.cycle.harvestedWeight || 0, settings.localization)}</td>
                                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">{item.duration} {t('days')}</td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="p-4 text-center italic text-gray-500 dark:text-gray-400">{t('noDataForReport')}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {productionData.length > 0 && <AINarrative title={t('aiAnalysis')} generator={productionAnalysis} minimal />}
                </section>
            )}

            {sections.includes('finance') && (
                <section className="mb-10 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-b-2 border-green-500 mb-4 pb-1 text-green-800 dark:text-green-300 flex items-center">
                        <span className="bg-green-500 w-2 h-6 mr-2 rounded-sm inline-block"></span>
                        {t('section_finance')}
                    </h3>
                    <div className="grid grid-cols-2 gap-6 mb-6 text-center">
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shadow-sm">
                            <p className="text-xs uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">{t('totalCreditsIssued')}</p>
                            <p className="font-bold text-2xl text-green-900 dark:text-green-100">{creditData.summaryStats.totalCredits}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shadow-sm">
                            <p className="text-xs uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">{t('totalCreditAmount')}</p>
                            <p className="font-bold text-2xl text-green-900 dark:text-green-100">{formatCurrency(creditData.summaryStats.totalAmount, settings.localization)}</p>
                        </div>
                    </div>
                    {creditData.reportData.length > 0 && <AINarrative title={t('aiAnalysis')} generator={creditAnalysis} minimal />}
                </section>
            )}

            {sections.includes('inventory') && (
                 <section className="mb-10 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-b-2 border-yellow-500 mb-4 pb-1 text-yellow-800 dark:text-yellow-300 flex items-center">
                        <span className="bg-yellow-500 w-2 h-6 mr-2 rounded-sm inline-block"></span>
                        {t('section_inventory')}
                    </h3>
                     <div className="overflow-x-auto mb-4 border rounded-lg border-gray-200 dark:border-gray-700">
                        <table className="w-full text-left text-xs">
                             <thead>
                                <tr className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800">
                                    <th className="p-3 font-bold text-yellow-900 dark:text-yellow-100">{t('site')}</th>
                                    <th className="p-3 font-bold text-yellow-900 dark:text-yellow-100">{t('seaweedType')}</th>
                                    <th className="p-3 font-bold text-yellow-900 dark:text-yellow-100 text-right">{t('stockKg')}</th>
                                    <th className="p-3 font-bold text-yellow-900 dark:text-yellow-100 text-right">{t('stockBales')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryData.reportData.length > 0 ? inventoryData.reportData.map((item, idx) => (
                                    <tr key={`${item.siteName}-${item.seaweedTypeName}`} className={`border-b border-gray-200 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <td className="p-2 text-gray-800 dark:text-gray-200">{item.siteName}</td>
                                        <td className="p-2 text-gray-800 dark:text-gray-200">{item.seaweedTypeName}</td>
                                        <td className="p-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatNumber(item.currentStockKg, settings.localization)}</td>
                                        <td className="p-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatNumber(item.currentStockBags, {...settings.localization, nonMonetaryDecimals: 0})}</td>
                                    </tr>
                                )) : <tr><td colSpan={4} className="p-4 text-center italic text-gray-500 dark:text-gray-400">{t('noDataForReport')}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {inventoryData.reportData.length > 0 && <AINarrative title={t('aiAnalysis')} generator={inventoryAnalysis} minimal />}
                </section>
            )}
            
             {sections.includes('incidents') && (
                <section className="mb-10 break-inside-avoid">
                     <h3 className="text-lg font-bold uppercase border-b-2 border-red-500 mb-4 pb-1 text-red-800 dark:text-red-300 flex items-center">
                        <span className="bg-red-500 w-2 h-6 mr-2 rounded-sm inline-block"></span>
                        {t('section_incidents')}
                     </h3>
                     <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                        <p className="text-sm italic text-gray-500 dark:text-gray-400">{t('noMajorIncidents')}</p>
                     </div>
                </section>
             )}

        </PrintPage>
    );
};

export default CustomReport;
