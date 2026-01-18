
import React, { useMemo, FC } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import PrintPage from '../printable/PrintPage';
import { COUNTRIES } from '../../constants';
import { generateFarmerPerformanceNarrative } from '../../services/geminiService';
import AINarrative from './AINarrative';
import { calculateSGR } from '../../utils/converters';

interface IndividualFarmerReportProps {
    month: number;
    year: number;
    farmerId: string;
}

const IndividualFarmerReport: FC<IndividualFarmerReportProps> = ({ month, year, farmerId }) => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { farmers, sites, cultivationCycles, modules, incidents } = useData();
    
    const period = new Date(year, month).toLocaleDateString(language, { month: 'long', year: 'numeric' });
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    
    const countryName = useMemo(() => {
        return COUNTRIES.find(c => c.code === settings.localization.country)?.name || settings.localization.country;
    }, [settings.localization.country]);

    const farmer = useMemo(() => farmers.find(f => f.id === farmerId), [farmers, farmerId]);
    const site = useMemo(() => sites.find(s => s.id === farmer?.siteId), [sites, farmer]);

    const farmerModules = useMemo(() => modules.filter(m => m.farmerId === farmerId), [modules, farmerId]);
    
    const stats = useMemo(() => {
        const cycles = cultivationCycles.filter(c => {
            const module = modules.find(m => m.id === c.moduleId);
            return module?.farmerId === farmerId && 
                   ((new Date(c.plantingDate) <= endDate && new Date(c.plantingDate) >= startDate) || 
                    (c.harvestDate && new Date(c.harvestDate) <= endDate && new Date(c.harvestDate) >= startDate));
        });

        const harvested = cycles.filter(c => c.harvestDate && new Date(c.harvestDate) >= startDate && new Date(c.harvestDate) <= endDate);
        const planted = cycles.filter(c => new Date(c.plantingDate) >= startDate && new Date(c.plantingDate) <= endDate);

        const totalHarvestedWeight = harvested.reduce((sum, c) => sum + (c.harvestedWeight || 0), 0);
        const activeCyclesCount = cycles.filter(c => c.status === 'PLANTED' || c.status === 'GROWING').length;
        
        // Incidents
        const farmerIncidents = incidents.filter(inc => 
            new Date(inc.date) >= startDate && 
            new Date(inc.date) <= endDate &&
            inc.affectedModuleIds.some(mid => farmerModules.some(fm => fm.id === mid))
        );

        return {
            plantedLines: planted.reduce((sum, c) => sum + (c.linesPlanted || 0), 0),
            harvestedLines: harvested.reduce((sum, c) => sum + (c.linesHarvested || 0), 0),
            harvestedWeight: totalHarvestedWeight,
            activeCycles: activeCyclesCount,
            incidentsCount: farmerIncidents.length,
            incidents: farmerIncidents,
            harvestedCycles: harvested // Pass for efficiency calc
        };
    }, [cultivationCycles, modules, farmerId, startDate, endDate, incidents, farmerModules]);

    const efficiency = useMemo(() => {
        // Calculate Average Specific Growth Rate (SGR) for harvested cycles
        const rates: number[] = [];
        stats.harvestedCycles.forEach(cycle => {
            if (cycle.harvestDate && cycle.plantingDate && cycle.harvestedWeight && cycle.initialWeight) {
                const duration = (new Date(cycle.harvestDate).getTime() - new Date(cycle.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
                const sgr = calculateSGR(cycle.initialWeight, cycle.harvestedWeight, duration);
                if (sgr !== null) {
                    rates.push(sgr);
                }
            }
        });

        const avgGrowthRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

        return { avgGrowthRate };
    }, [stats.harvestedCycles]);

    if (!farmer) return <div>{t('noDataForReport')}</div>;

    return (
        <PrintPage>
            <header className="mb-6 border-b pb-4">
                <h1 className="text-xl font-bold text-center uppercase mb-2">{t('individualFarmerReport')}</h1>
                <div className="flex justify-between text-sm">
                     <div>
                        <p><span className="font-bold">{t('farmer')}:</span> {farmer.firstName} {farmer.lastName}</p>
                        <p><span className="font-bold">{t('code')}:</span> {farmer.code}</p>
                        <p><span className="font-bold">{t('site')}:</span> {site?.name}</p>
                     </div>
                     <div className="text-right">
                        <p><span className="font-bold">{t('period')}:</span> {period}</p>
                        <p>{settings.company.name}</p>
                     </div>
                </div>
            </header>

            <section className="mb-6">
                <h3 className="font-bold text-lg mb-3 border-b border-gray-200 pb-1">{t('productionSummary')}</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                     <div className="bg-gray-100 p-3 rounded">
                         <p className="text-xs text-gray-500 uppercase">{t('totalPlantedLines')}</p>
                         <p className="text-xl font-bold">{stats.plantedLines}</p>
                     </div>
                     <div className="bg-gray-100 p-3 rounded">
                         <p className="text-xs text-gray-500 uppercase">{t('totalHarvestedLines')}</p>
                         <p className="text-xl font-bold">{stats.harvestedLines}</p>
                     </div>
                     <div className="bg-gray-100 p-3 rounded">
                         <p className="text-xs text-gray-500 uppercase">{t('totalHarvestedWeight')}</p>
                         <p className="text-xl font-bold">{formatNumber(stats.harvestedWeight, settings.localization)} kg</p>
                     </div>
                     <div className="bg-gray-100 p-3 rounded">
                         <p className="text-xs text-gray-500 uppercase">{t('growthRate')}</p>
                         <p className="text-xl font-bold">{efficiency.avgGrowthRate.toFixed(2)}%</p>
                     </div>
                </div>
            </section>
            
             <section className="mb-6">
                <h3 className="font-bold text-lg mb-3 border-b border-gray-200 pb-1">{t('incidentsReported')}</h3>
                {stats.incidents.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-2">{t('date')}</th>
                                <th className="p-2">{t('type')}</th>
                                <th className="p-2">{t('severity')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.incidents.map(inc => (
                                <tr key={inc.id} className="border-b border-gray-100">
                                    <td className="p-2">{inc.date}</td>
                                    <td className="p-2">{inc.type}</td>
                                    <td className="p-2">{inc.severity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-sm text-gray-500 italic">{t('noIncidentsForFarmer')}</p>
                )}
            </section>

            <section>
                 <AINarrative 
                    title={t('narrativeFarmerPerformance')} 
                    generator={() => generateFarmerPerformanceNarrative({
                        farmerName: `${farmer.firstName} ${farmer.lastName}`,
                        siteName: site?.name || '',
                        period,
                        production: stats,
                        efficiency: efficiency,
                        incidentsCount: stats.incidentsCount
                    }, language as 'en' | 'fr')} 
                />
            </section>
        </PrintPage>
    );
};

export default IndividualFarmerReport;
