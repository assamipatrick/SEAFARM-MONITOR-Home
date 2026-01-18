import React, { useMemo, FC, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import AINarrative from './AINarrative';
import { 
    generateGlobalFarmOverviewNarrative,
    generateSalariesNarrative,
    generateSiteStocksNarrative,
    generateWarehouseStocksNarrative,
    generateExportsNarrative,
    generateMonthlyProductionNarrative,
    generateCreditsSituationNarrative,
    generateIndividualFarmerStatsNarrative
} from '../../services/geminiService';
import { ModuleStatus, IncidentStatus, PressedStockMovementType, RecipientType } from '../../types';
import type { SeaweedType, ExportDocument, Site, CreditType, FarmerCredit, Repayment, Farmer, CultivationCycle, Module, Employee, Role, MonthlyPayment } from '../../types';
import { CYCLE_DURATION_DAYS } from '../../constants';

// Reusable Components
const PrintPage: FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`report-page-landscape bg-white shadow-lg mx-auto my-8 flex flex-col h-auto min-h-[210mm] overflow-visible print:overflow-visible print:shadow-none ${className}`}>
        <div className="flex-grow flex flex-col font-sans text-xs leading-normal text-black p-6 box-border w-full">
            {children}
        </div>
    </div>
);

const GlobalReportHeader: FC<{ period: string, title?: string }> = ({ period, title }) => {
    const { settings } = useSettings();
    const { t } = useLocalization();
    
    return (
        <header className="flex-shrink-0 text-black relative mb-4 border-b-2 border-gray-800 pb-2">
            <div className="absolute top-0 right-0 text-[9px] font-bold text-gray-600">
                {period}
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex-shrink-0">
                    <img src={settings.company.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                 </div>
                 <div className="flex-grow text-center">
                    <h1 className="font-bold text-sm uppercase mb-1 tracking-wide">{settings.company.name}</h1>
                    <div className="text-[8px] text-gray-600 flex flex-wrap justify-center gap-x-3 leading-tight">
                        <span>{t('company_sarl')} {formatCurrency(settings.company.capital, settings.localization)}</span>
                        <span className="text-gray-400">|</span>
                        <span>NIF: {settings.company.nif}</span>
                        <span className="text-gray-400">|</span>
                        <span>STAT: {settings.company.stat}</span>
                        <span className="text-gray-400">|</span>
                        <span>RCS: {settings.company.rc}</span>
                    </div>
                    <div className="text-[8px] text-gray-600 flex flex-wrap justify-center gap-x-3 leading-tight mt-0.5">
                        <span>{settings.company.address}</span>
                        <span className="text-gray-400">|</span>
                        <span>{t('phone')}: {settings.company.phone}</span>
                    </div>
                 </div>
                 <div className="w-20"></div> {/* Spacer for balance */}
            </div>
             <div className="text-center mt-3">
                {title && <h2 className="font-bold text-sm uppercase tracking-wider inline-block pb-0.5">{title}</h2>}
            </div>
        </header>
    );
};

const ReportFooter: FC<{ page: number, totalPages: number }> = ({ page, totalPages }) => (
    <div className="mt-auto pt-4 text-center text-[8px] text-gray-500 border-t border-gray-300 print:mt-auto break-before-avoid">
        Page {page} / {totalPages}
    </div>
);

const Cell: FC<{ children?: React.ReactNode, className?: string, colSpan?: number, rowSpan?: number, header?: boolean, align?: 'left' | 'center' | 'right', bold?: boolean, title?: string }> = ({ children, className = '', colSpan, rowSpan, header = false, align = 'center', bold = false, title }) => (
    <td 
        colSpan={colSpan} 
        rowSpan={rowSpan} 
        title={title}
        className={`px-1 py-0.5 border border-gray-400 text-[8px] text-black align-middle text-${align} ${header ? 'font-bold bg-gray-100 text-gray-900' : ''} ${bold ? 'font-bold' : ''} ${className}`}
    >
        {children || <>&nbsp;</>}
    </td>
);

const NarrativeBox: FC<{ generator: () => Promise<string>, className?: string, title: string }> = ({ generator, className = '', title }) => {
    const {t} = useLocalization();
    return (
    <div className={`text-black flex flex-col mt-4 break-inside-avoid ${className}`}>
        <div className="font-bold text-[9px] mb-1 uppercase text-blue-800 border-b border-blue-200 inline-block self-start">{title} :</div>
        <div className="relative text-[9pt] leading-snug text-justify text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
             <AINarrative title={t('narratif_explicatif_tableau')} generator={generator} minimal className="mt-0 !h-auto" />
        </div>
    </div>
)};

// Types for Pivot Data
type PivotMetrics = {
    farmerCount: number;
    lineAge: Record<string, number>;
    totalLinesInWater: number;
    totalLinesHarvested: number;
    totalLinesPlanted: number;
    productionKg: number;
    avgGrowthRate: number;
    growthRateCount: number;
    forecast: { m1: number, m2: number, m3: number };
    incidents: Record<string, number>;
    weather: {
        tempSum: number; tempCount: number;
        salinitySum: number; salinityCount: number;
        rainSum: number; rainCount: number;
        windSpeedSum: number; windSpeedCount: number;
        windDirSum: number; windDirCount: number;
    };
};

// Main Component
const GlobalFarmReport: FC<{ month: number; year: number }> = ({ month, year }) => {
    const { t, language } = useLocalization();
    const data = useData();
    const { sites, seaweedTypes, cultivationCycles, modules, incidents, periodicTests, farmers, stockMovements, pressedStockMovements, exportDocuments, creditTypes, farmerCredits, repayments, employees, roles, monthlyPayments, incidentTypes } = data;

    const periodInfo = useMemo(() => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        const period = new Date(year, month).toLocaleDateString(language, { month: 'long', year: 'numeric' }).toUpperCase();
        
        const months = [];
        for(let i=0; i < 12; i++) {
            const d = new Date(year, i);
            const monthName = d.toLocaleString(language, { month: 'short' }).replace('.', '').toUpperCase();
            const year2digit = d.getFullYear().toString().slice(-2);
            months.push(`${monthName} ${year2digit}`);
        }

        const sixMonths = [];
        for (let i=5; i >= 0; i--) {
            sixMonths.push(new Date(year, month - i));
        }

        const m1 = new Date(year, month + 1);
        const m2 = new Date(year, month + 2);
        const m3 = new Date(year, month + 3);
        const nextMonths = [
             m1.toLocaleDateString(language, { month: 'long', year: 'numeric' }).toUpperCase(),
             m2.toLocaleDateString(language, { month: 'long', year: 'numeric' }).toUpperCase(),
             m3.toLocaleDateString(language, { month: 'long', year: 'numeric' }).toUpperCase()
        ];

        const prevDate = new Date(year, month - 1, 1);
        const prevMonthName = prevDate.toLocaleDateString(language, { month: 'long', year: 'numeric' }).toUpperCase();

        return { startDate, endDate, period, year, month, months, sixMonths, prevMonthName, nextMonths };
    }, [year, month, language]);

    const { pivotData, sortedIncidentTypes, displaySites, displaySeaweedTypes, onSiteStockReportData, pressedWarehouseReportData, monthlyProductionData } = useMemo(() => {
        const structure: Record<string, Record<string, PivotMetrics>> = {};
        const initMetrics = (): PivotMetrics => ({
            farmerCount: 0,
            lineAge: { '0-10': 0, '11-20': 0, '21-30': 0, '30-40': 0, '40-50': 0, '>50': 0 },
            totalLinesInWater: 0, totalLinesHarvested: 0, totalLinesPlanted: 0, productionKg: 0, avgGrowthRate: 0, growthRateCount: 0,
            forecast: { m1: 0, m2: 0, m3: 0 },
            incidents: {},
            weather: { tempSum: 0, tempCount: 0, salinitySum: 0, salinityCount: 0, rainSum: 0, rainCount: 0, windSpeedSum: 0, windSpeedCount: 0, windDirSum: 0, windDirCount: 0 }
        });

        seaweedTypes.forEach(st => {
            structure[st.id] = {};
            sites.forEach(s => { structure[st.id][s.id] = initMetrics(); });
            structure[st.id]['TOTAL'] = initMetrics();
        });

        const monthlyProd: Record<string, Record<string, { production: number, growthRateSum: number, growthRateCount: number }[]>> = {};
        sites.forEach(s => {
            monthlyProd[s.id] = {};
            seaweedTypes.forEach(st => {
                monthlyProd[s.id][st.id] = Array.from({ length: 12 }, () => ({ production: 0, growthRateSum: 0, growthRateCount: 0 }));
            });
        });

        cultivationCycles.forEach(c => {
            const module = modules.find(m => m.id === c.moduleId);
            if (!module) return;
            const stId = c.seaweedTypeId;
            const sId = module.siteId;
            
            if (c.harvestDate && c.harvestedWeight && monthlyProd[sId] && monthlyProd[sId][stId]) {
                const hDate = new Date(c.harvestDate);
                if (hDate.getFullYear() === year) {
                    const monthIndex = hDate.getMonth();
                    const target = monthlyProd[sId][stId][monthIndex];
                    const netWeight = (c.harvestedWeight || 0) - (c.cuttingsTakenAtHarvestKg || 0);
                    target.production += netWeight;
                    
                    // SGR uses Gross Weight (c.harvestedWeight) as per biology
                    if (c.initialWeight && c.initialWeight > 0) {
                        const duration = (hDate.getTime() - new Date(c.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
                        if (duration > 0) {
                            const rate = ((Math.log(c.harvestedWeight) - Math.log(c.initialWeight)) / duration) * 100;
                            target.growthRateSum += rate;
                            target.growthRateCount++;
                        }
                    }
                }
            }

            if (!structure[stId] || !structure[stId][sId]) return;
            const targets = [structure[stId][sId], structure[stId]['TOTAL']];

            targets.forEach(target => {
                if ((c.status === ModuleStatus.PLANTED || c.status === ModuleStatus.GROWING) && new Date(c.plantingDate) <= periodInfo.endDate) {
                    const lines = c.linesPlanted || module.lines || 0;
                    const age = (periodInfo.endDate.getTime() - new Date(c.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
                    target.totalLinesInWater += lines;
                    let ageKey = '>50';
                    if (age <= 10) ageKey = '0-10'; else if (age <= 20) ageKey = '11-20'; else if (age <= 30) ageKey = '21-30'; else if (age <= 40) ageKey = '30-40'; else if (age <= 50) ageKey = '40-50';
                    target.lineAge[ageKey] += lines;

                    const projectedHarvestDate = new Date(new Date(c.plantingDate).getTime() + (CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000));
                    const pMonth = projectedHarvestDate.getMonth();
                    const m1 = new Date(year, month + 1).getMonth();
                    const m2 = new Date(year, month + 2).getMonth();
                    const m3 = new Date(year, month + 3).getMonth();
                    const estimatedYield = lines * 0.8; 

                    if (pMonth === m1) target.forecast.m1 += estimatedYield;
                    else if (pMonth === m2) target.forecast.m2 += estimatedYield;
                    else if (pMonth === m3) target.forecast.m3 += estimatedYield;
                }
                
                if (c.harvestDate && new Date(c.harvestDate) >= periodInfo.startDate && new Date(c.harvestDate) <= periodInfo.endDate) {
                    target.totalLinesHarvested += c.linesHarvested || 0;
                    const netWeight = (c.harvestedWeight || 0) - (c.cuttingsTakenAtHarvestKg || 0);
                    target.productionKg += netWeight;
                    
                     // SGR uses Gross Weight
                     if (c.harvestedWeight && c.initialWeight && c.initialWeight > 0) {
                        const duration = (new Date(c.harvestDate).getTime() - new Date(c.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
                        if (duration > 0) {
                            const rate = ((Math.log(c.harvestedWeight) - Math.log(c.initialWeight)) / duration) * 100;
                            target.avgGrowthRate = ((target.avgGrowthRate * target.growthRateCount) + rate) / (target.growthRateCount + 1);
                            target.growthRateCount++;
                        }
                    }
                }

                if (new Date(c.plantingDate) >= periodInfo.startDate && new Date(c.plantingDate) <= periodInfo.endDate) {
                    target.totalLinesPlanted += (c.linesPlanted || module.lines || 0);
                }
            });
        });

        const farmerSets: Record<string, Set<string>> = {};
        modules.forEach(m => {
             if (m.farmerId && m.siteId) {
                 const activeC = cultivationCycles.find(c => c.moduleId === m.id && (c.status === 'PLANTED' || c.status === 'GROWING'));
                 const typeId = activeC ? activeC.seaweedTypeId : seaweedTypes[0]?.id; 
                 if(typeId) {
                    const key = `${typeId}-${m.siteId}`;
                    const totalKey = `${typeId}-TOTAL`;
                    if(!farmerSets[key]) farmerSets[key] = new Set();
                    if(!farmerSets[totalKey]) farmerSets[totalKey] = new Set();
                    farmerSets[key].add(m.farmerId);
                    farmerSets[totalKey].add(m.farmerId);
                 }
             }
        });
        Object.entries(farmerSets).forEach(([key, set]) => {
            const [tId, sId] = key.split('-');
            if (structure[tId] && structure[tId][sId]) structure[tId][sId].farmerCount = set.size;
        });

         const incidentCounts: Record<string, number> = {};
         incidents.forEach(inc => {
            const incDate = new Date(inc.date);
            if (incDate >= periodInfo.startDate && incDate <= periodInfo.endDate) {
                 
                 // Global count for summary
                 incidentCounts[inc.type] = (incidentCounts[inc.type] || 0) + 1;

                 // Determine distinct Site/SeaweedType pairs affected by this incident based on active cycles
                 const affectedPairs = new Set<string>(); // Format: "SeaweedTypeId|SiteId"

                 if (inc.affectedModuleIds && inc.affectedModuleIds.length > 0) {
                     inc.affectedModuleIds.forEach(modId => {
                         const m = modules.find(mod => mod.id === modId);
                         if (!m) return;

                         // Find active cycle at the time of the incident to determine correct Seaweed Type
                         let cycle = cultivationCycles.find(c => 
                             c.moduleId === m.id &&
                             new Date(c.plantingDate) <= incDate &&
                             (!c.harvestDate || new Date(c.harvestDate) >= incDate)
                         );

                         // If no active cycle found (e.g. incident after harvest but before next planting), 
                         // find the most recent cycle before the incident
                         if (!cycle) {
                             const pastCycles = cultivationCycles
                                 .filter(c => c.moduleId === m.id && new Date(c.plantingDate) <= incDate)
                                 .sort((a,b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime());
                             cycle = pastCycles[0];
                         }

                         // Fallback to default if no history available
                         const stId = cycle ? cycle.seaweedTypeId : (seaweedTypes[0]?.id);
                         if (stId && m.siteId) {
                             affectedPairs.add(`${stId}|${m.siteId}`);
                         }
                     });
                 }

                 // Apply incident count to the correct cells in the structure
                 affectedPairs.forEach(pair => {
                     const [stId, sId] = pair.split('|');
                     
                     if (structure[stId] && structure[stId][sId]) {
                        structure[stId][sId].incidents[inc.type] = (structure[stId][sId].incidents[inc.type] || 0) + 1;
                        structure[stId]['TOTAL'].incidents[inc.type] = (structure[stId]['TOTAL'].incidents[inc.type] || 0) + 1;
                     }
                 });
            }
         });

         periodicTests.forEach(pt => {
             if (new Date(pt.date) >= periodInfo.startDate && new Date(pt.date) <= periodInfo.endDate) {
                 const targets = [structure[pt.seaweedTypeId]?.[pt.siteId], structure[pt.seaweedTypeId]?.['TOTAL']];
                 targets.forEach(t => {
                     if(t) {
                         if(pt.temperature) { t.weather.tempSum += pt.temperature; t.weather.tempCount++; }
                         if(pt.salinity) { t.weather.salinitySum += pt.salinity; t.weather.salinityCount++; }
                         if(pt.precipitation) { t.weather.rainSum += pt.precipitation; t.weather.rainCount++; }
                         if(pt.windSpeed) { t.weather.windSpeedSum += pt.windSpeed; t.weather.windSpeedCount++; }
                         if(pt.windDirection) { t.weather.windDirSum += pt.windDirection; t.weather.windDirCount++; }
                     }
                 })
             }
         });

        const onSiteStockReportData: Record<string, Record<string, {
            openingKg: number; openingBags: number;
            entriesKg: number; entriesBags: number;
            exitsKg: number; exitsBags: number;
            closingKg: number; closingBags: number;
        }>> = {};
    
        sites.forEach(site => {
            if (site.id !== 'pressing-warehouse') {
                onSiteStockReportData[site.id] = {};
                seaweedTypes.forEach(type => {
                    onSiteStockReportData[site.id][type.id] = { openingKg: 0, openingBags: 0, entriesKg: 0, entriesBags: 0, exitsKg: 0, exitsBags: 0, closingKg: 0, closingBags: 0 };
                });
            }
        });
    
        stockMovements.forEach(m => {
            if (m.siteId === 'pressing-warehouse' || !onSiteStockReportData[m.siteId] || !onSiteStockReportData[m.siteId][m.seaweedTypeId]) return;
    
            const movementDate = new Date(m.date);
            const target = onSiteStockReportData[m.siteId][m.seaweedTypeId];
    
            if (movementDate < periodInfo.startDate) {
                target.openingKg += (m.inKg || 0) - (m.outKg || 0);
                target.openingBags += (m.inBags || 0) - (m.outBags || 0);
            } else if (movementDate <= periodInfo.endDate) {
                target.entriesKg += m.inKg || 0;
                target.entriesBags += m.inBags || 0;
                target.exitsKg += m.outKg || 0;
                target.exitsBags += m.outBags || 0;
            }
        });
        
        Object.values(onSiteStockReportData).forEach(siteData => {
            Object.values(siteData).forEach(typeData => {
                typeData.closingKg = typeData.openingKg + typeData.entriesKg - typeData.exitsKg;
                typeData.closingBags = typeData.openingBags + typeData.entriesBags - typeData.exitsBags;
            });
        });
         
         const pressedWarehouseReportData: Record<string, {
            bulk: { openingKg: number, openingBags: number, entriesKg: number, entriesBags: number, exitsKg: number, exitsBags: number, closingKg: number, closingBags: number },
            pressed: { openingKg: number, openingBales: number, entriesKg: number, entriesBales: number, exitsKg: number, exitsBales: number, closingKg: number, closingBales: number }
        }> = {};

        seaweedTypes.forEach(st => {
            pressedWarehouseReportData[st.id] = {
                bulk: { openingKg: 0, openingBags: 0, entriesKg: 0, entriesBags: 0, exitsKg: 0, exitsBags: 0, closingKg: 0, closingBags: 0 },
                pressed: { openingKg: 0, openingBales: 0, entriesKg: 0, entriesBales: 0, exitsKg: 0, exitsBales: 0, closingKg: 0, closingBales: 0 }
            };
        });

        pressedStockMovements.forEach(m => {
            if (!pressedWarehouseReportData[m.seaweedTypeId]) return;
            const isBefore = new Date(m.date) < periodInfo.startDate;
            const isDuring = new Date(m.date) >= periodInfo.startDate && new Date(m.date) <= periodInfo.endDate;
            
            if (m.type === PressedStockMovementType.BULK_IN_FROM_SITE || m.type === PressedStockMovementType.FARMER_DELIVERY) {
                const bags = m.inBales || 0; 
                if (isBefore) { pressedWarehouseReportData[m.seaweedTypeId].bulk.openingKg += m.inKg || 0; pressedWarehouseReportData[m.seaweedTypeId].bulk.openingBags += bags; }
                if (isDuring) { pressedWarehouseReportData[m.seaweedTypeId].bulk.entriesKg += m.inKg || 0; pressedWarehouseReportData[m.seaweedTypeId].bulk.entriesBags += bags; }
            }
            if (m.type === PressedStockMovementType.PRESSING_CONSUMPTION) {
                const bags = m.outBales || 0;
                if (isBefore) { pressedWarehouseReportData[m.seaweedTypeId].bulk.openingKg -= m.outKg || 0; pressedWarehouseReportData[m.seaweedTypeId].bulk.openingBags -= bags; }
                if (isDuring) { pressedWarehouseReportData[m.seaweedTypeId].bulk.exitsKg += m.outKg || 0; pressedWarehouseReportData[m.seaweedTypeId].bulk.exitsBags += bags; }
            }
            
            if (m.type === PressedStockMovementType.INITIAL_STOCK || m.type === PressedStockMovementType.PRESSING_IN) {
                if (isBefore) { pressedWarehouseReportData[m.seaweedTypeId].pressed.openingKg += m.inKg || 0; pressedWarehouseReportData[m.seaweedTypeId].pressed.openingBales += m.inBales || 0; }
                if (isDuring && m.type === PressedStockMovementType.PRESSING_IN) { pressedWarehouseReportData[m.seaweedTypeId].pressed.entriesKg += m.inKg || 0; pressedWarehouseReportData[m.seaweedTypeId].pressed.entriesBales += m.inBales || 0; }
            }
            if (m.type === PressedStockMovementType.EXPORT_OUT || m.type === PressedStockMovementType.RETURN_TO_SITE) {
                if (isBefore) { pressedWarehouseReportData[m.seaweedTypeId].pressed.openingKg -= m.outKg || 0; pressedWarehouseReportData[m.seaweedTypeId].pressed.openingBales -= m.outBales || 0; }
                if (isDuring) { pressedWarehouseReportData[m.seaweedTypeId].pressed.exitsKg += m.outKg || 0; pressedWarehouseReportData[m.seaweedTypeId].pressed.exitsBales += m.outBales || 0; }
            }
        });
        
        Object.keys(pressedWarehouseReportData).forEach(stId => {
            const d = pressedWarehouseReportData[stId];
            d.bulk.closingKg = d.bulk.openingKg + d.bulk.entriesKg - d.bulk.exitsKg;
            d.bulk.closingBags = d.bulk.openingBags + d.bulk.entriesBags - d.bulk.exitsBags;
            d.pressed.closingKg = d.pressed.openingKg + d.pressed.entriesKg - d.pressed.exitsKg;
            d.pressed.closingBales = d.pressed.openingBales + d.pressed.entriesBales - d.pressed.exitsBales;
        });


        const displaySites = sites.filter(s => s.id !== 'pressing-warehouse');
        // Ensure displaySeaweedTypes is not empty and "N/A" is not shown if actual data exists
        let displaySeaweedTypes = seaweedTypes;
        if (seaweedTypes.length === 0) {
             displaySeaweedTypes = [{id: 'default', name: t('allSeaweedTypes'), dryPrice: 0, wetPrice: 0, scientificName: '', description: '', priceHistory: []}];
        }
        
        const top3Incidents = Object.keys(incidentCounts).sort((a,b) => incidentCounts[b] - incidentCounts[a]).slice(0, 3);
        const incidentTypeNames = top3Incidents.map(id => incidentTypes.find(it => it.id === id)?.name || id);

        const page1Data = {
            totalLinesInWater: Object.values(structure).reduce((acc, st) => acc + st['TOTAL'].totalLinesInWater, 0),
            totalHarvestedLines: Object.values(structure).reduce((acc, st) => acc + st['TOTAL'].totalLinesHarvested, 0),
            totalPlantedLines: Object.values(structure).reduce((acc, st) => acc + st['TOTAL'].totalLinesPlanted, 0),
            totalProductionKg: Object.values(structure).reduce((acc, st) => acc + st['TOTAL'].productionKg, 0),
            avgGrowthRate: Object.values(structure).reduce((acc, st) => acc + st['TOTAL'].avgGrowthRate, 0) / (Object.keys(structure).length || 1),
            incidentCount: Object.values(incidentCounts).reduce((a,b)=>a+b, 0)
        };

        return { pivotData: structure, sortedIncidentTypes: incidentTypeNames, displaySites, displaySeaweedTypes, onSiteStockReportData, pressedWarehouseReportData, monthlyProductionData: monthlyProd, page1Data };

    }, [cultivationCycles, modules, farmers, incidents, periodicTests, sites, seaweedTypes, periodInfo, stockMovements, pressedStockMovements, year, month, incidentTypes, t]);
    
    const { groupedFarmerStats, totals } = useMemo(() => {
        // Use a nested map structure to handle data across year boundaries efficiently
        // FarmerID -> SeaweedTypeID -> Year-Month Key -> Stats
        const farmerStatsMap = new Map<string, Map<string, Map<string, { planted: number, harvested: number, production: number }>>>();

        // Helper to get year-month key
        const getKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
        
        // Helper to get or create stats entry
        const getStatsEntry = (farmerId: string, typeId: string, key: string) => {
            if (!farmerStatsMap.has(farmerId)) farmerStatsMap.set(farmerId, new Map());
            const typeMap = farmerStatsMap.get(farmerId)!;
            if (!typeMap.has(typeId)) typeMap.set(typeId, new Map());
            const dateMap = typeMap.get(typeId)!;
            
            if (!dateMap.has(key)) {
                dateMap.set(key, { planted: 0, harvested: 0, production: 0 });
            }
            return dateMap.get(key)!;
        };

        // Process cycles
        cultivationCycles.forEach(cycle => {
            const module = modules.find(m => m.id === cycle.moduleId);
            if (!module?.farmerId) return;
            
            const farmerId = module.farmerId;
            const typeId = cycle.seaweedTypeId;

            // Planting Data
            const pDate = new Date(cycle.plantingDate);
            const pKey = getKey(pDate);
            const pStats = getStatsEntry(farmerId, typeId, pKey);
            pStats.planted += cycle.linesPlanted || module.lines || 0;

            // Harvesting Data
            if (cycle.harvestDate) {
                const hDate = new Date(cycle.harvestDate);
                const hKey = getKey(hDate);
                const hStats = getStatsEntry(farmerId, typeId, hKey);
                hStats.harvested += cycle.linesHarvested || 0;
                // Using Net Harvested Weight (Gross - Cuttings) as per requirements
                const netWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                hStats.production += netWeight;
            }
        });

        // Structure for view
        const structure: Record<string, {
            siteName: string;
            seaweedTypes: Record<string, {
                typeName: string;
                farmers: {
                    id: string;
                    name: string;
                    stats: { planted: number, harvested: number, production: number }[];
                }[];
            }>;
        }> = {};

        farmers.forEach(farmer => {
            const site = sites.find(s => s.id === farmer.siteId);
            if (!site) return;
            
            const farmerTypesMap = farmerStatsMap.get(farmer.id);
            if (!farmerTypesMap) return;

            farmerTypesMap.forEach((dateMap, typeId) => {
                // Check if there is activity in the 6 selected months
                const sixMonthStats = periodInfo.sixMonths.map(d => {
                    const key = getKey(d);
                    return dateMap.get(key) || { planted: 0, harvested: 0, production: 0 };
                });

                const hasActivityInPeriod = sixMonthStats.some(s => s.planted > 0 || s.harvested > 0 || s.production > 0);

                if (hasActivityInPeriod) {
                    const seaweedType = seaweedTypes.find(st => st.id === typeId);
                    if (!seaweedType) return;

                    if (!structure[site.id]) {
                        structure[site.id] = { siteName: site.name, seaweedTypes: {} };
                    }
                    if (!structure[site.id].seaweedTypes[typeId]) {
                        structure[site.id].seaweedTypes[typeId] = { typeName: seaweedType.name, farmers: [] };
                    }
                    
                    structure[site.id].seaweedTypes[typeId].farmers.push({
                        id: farmer.id,
                        name: `${farmer.lastName} ${farmer.firstName}`,
                        stats: sixMonthStats
                    });
                }
            });
        });

        const gFarmerStats = Object.values(structure).map(siteData => ({
            ...siteData,
            seaweedTypes: Object.values(siteData.seaweedTypes).map(typeData => ({
                ...typeData,
                farmers: typeData.farmers.sort((a,b) => a.name.localeCompare(b.name))
            })).sort((a,b) => a.typeName.localeCompare(b.typeName))
        })).sort((a,b) => a.siteName.localeCompare(b.siteName));
        
        const tStats = periodInfo.sixMonths.map((_, i) => {
            return gFarmerStats.reduce((acc, siteData) => {
                siteData.seaweedTypes.forEach(typeData => {
                    typeData.farmers.forEach(farmerData => {
                        const monthStat = farmerData.stats[i];
                        acc.planted += monthStat.planted;
                        acc.harvested += monthStat.harvested;
                        acc.production += monthStat.production;
                    });
                });
                return acc;
            }, { planted: 0, harvested: 0, production: 0 });
        });

        return { groupedFarmerStats: gFarmerStats, totals: tStats };
    }, [farmers, periodInfo.sixMonths, cultivationCycles, modules, sites, seaweedTypes]);

    const TOTAL_PAGES = 6;

    return (
        <>
            <CombinedOverviewPage 
                period={periodInfo.period} 
                pivotData={pivotData} 
                displaySites={displaySites} 
                displaySeaweedTypes={displaySeaweedTypes}
                incidentTypes={sortedIncidentTypes}
                nextMonths={periodInfo.nextMonths}
                t={t}
                page={1}
                totalPages={TOTAL_PAGES}
            />
            <Page2 period={periodInfo.period} employees={employees} sites={displaySites} roles={roles} page={2} totalPages={TOTAL_PAGES} monthlyPayments={monthlyPayments} month={month} year={year} />
            <Page3 period={periodInfo.period} onSiteData={onSiteStockReportData} warehouseData={pressedWarehouseReportData} sites={displaySites} seaweedTypes={seaweedTypes} page={3} totalPages={TOTAL_PAGES} />
            <Page4 period={periodInfo.period} year={periodInfo.year} exportDocuments={exportDocuments} seaweedTypes={seaweedTypes} page={4} totalPages={TOTAL_PAGES} />
            <Page5 period={periodInfo.period} months={periodInfo.months} monthlyData={monthlyProductionData} year={year} sites={displaySites} seaweedTypes={seaweedTypes} page={5} totalPages={TOTAL_PAGES}/>
            
            <Page6 
                period={periodInfo.period} 
                sixMonths={periodInfo.sixMonths} 
                prevMonthName={periodInfo.prevMonthName}
                creditTypes={creditTypes}
                farmerCredits={farmerCredits}
                repayments={repayments}
                year={year}
                month={month}
                groupedData={groupedFarmerStats}
                totals={totals}
                page={6} 
                totalPages={TOTAL_PAGES}
            />
        </>
    );
};

// --- COMBINED PAGE 1: GENERAL OVERVIEW & MONITORING ---
const CombinedOverviewPage: FC<any> = ({ period, pivotData, displaySites, displaySeaweedTypes, incidentTypes, nextMonths, t, page, totalPages }) => {
    const { settings } = useSettings();
    const getD = (typeId: string, siteId: string) => pivotData[typeId]?.[siteId];

    const formatAgeLabel = (key: string) => {
         const suffix = t('days');
         if (key.includes('>')) return `> 50 ${suffix}`;
         return `${key} ${suffix}`;
    }
    
    const colCount = 1 + (displaySites.length + 1) * displaySeaweedTypes.length;

    return (
        <PrintPage>
            <GlobalReportHeader period={period} title={t('globalFarmReport')} />
            
            <div className="flex flex-col gap-2">
                <div className="w-full overflow-hidden">
                    <table className="w-full border-collapse mb-2 table-fixed text-[8px]">
                         <colgroup>
                            <col style={{ width: '150px' }} />
                            {/* Dynamic columns for data */}
                            {Array.from({ length: colCount - 1 }).map((_, i) => <col key={i} />)}
                        </colgroup>
                        <thead>
                            <tr>
                                <Cell rowSpan={2} header className="align-middle bg-gray-200 border-b-2 border-gray-500 text-center">{t('period')}:<br/>{period}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <Cell key={st.id} colSpan={displaySites.length + 1} header className="bg-blue-50 border-b border-blue-300 text-blue-900 uppercase tracking-widest">{st.name}</Cell>
                                ))}
                            </tr>
                            <tr>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id} header className="bg-gray-50 text-gray-700 font-semibold">{s.name}</Cell>)}
                                        <Cell header className="bg-blue-100 text-blue-900 font-bold border-l border-blue-200">{t('total')}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- GENERAL FARM OVERVIEW --- */}
                            <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-200 uppercase text-[9px] tracking-wider border-t-2 border-gray-600 font-bold">{t('apercuGeneralDeLaFerme')}</Cell>
                            </tr>

                            <tr>
                                <Cell align="left" className="font-semibold bg-gray-50 pl-2">{t('fermier_effectif')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id}>{getD(st.id, s.id)?.farmerCount || '-'}</Cell>)}
                                        <Cell bold className="bg-gray-100 border-l border-gray-300">{getD(st.id, 'TOTAL')?.farmerCount || '-'}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>

                            {/* Line Age */}
                             <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-100 uppercase text-[8px] tracking-wider border-t border-gray-300 font-bold">{t('tranche_age_lignes')}</Cell>
                            </tr>
                            {['0-10', '11-20', '21-30', '30-40', '40-50', '>50'].map((range, index) => (
                                <tr key={range}>
                                    <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{formatAgeLabel(range)}</Cell>
                                    {displaySeaweedTypes.map((st: any) => (
                                        <React.Fragment key={st.id}>
                                            {displaySites.map((s: any) => <Cell key={s.id}>{getD(st.id, s.id)?.lineAge[range] || '-'}</Cell>)}
                                            <Cell bold className="bg-gray-50 border-l border-gray-300">{getD(st.id, 'TOTAL')?.lineAge[range] || '-'}</Cell>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}

                            {/* Line Summary */}
                            <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-100 uppercase text-[8px] tracking-wider border-t border-gray-300 font-bold">{t('bilan_lignes')}</Cell>
                            </tr>
                            <tr>
                                <Cell align="left" className="pl-4 font-bold text-blue-900 border-r border-gray-300">{t('total_lignes_eau')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id} bold className="text-blue-900">{getD(st.id, s.id)?.totalLinesInWater || '-'}</Cell>)}
                                        <Cell bold className="bg-blue-50 text-blue-900 border-l border-blue-200">{getD(st.id, 'TOTAL')?.totalLinesInWater || '-'}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                            <tr>
                                <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{t('total_lignes_recoltees')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id}>{getD(st.id, s.id)?.totalLinesHarvested || '-'}</Cell>)}
                                        <Cell bold className="bg-gray-50 border-l border-gray-300">{getD(st.id, 'TOTAL')?.totalLinesHarvested || '-'}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                            <tr>
                                <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{t('total_lignes_plantees')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id}>{getD(st.id, s.id)?.totalLinesPlanted || '-'}</Cell>)}
                                        <Cell bold className="bg-gray-50 border-l border-gray-300">{getD(st.id, 'TOTAL')?.totalLinesPlanted || '-'}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>

                            {/* Production */}
                            <tr className="border-t-2 border-gray-400">
                                <Cell header align="left" className="bg-green-100 text-green-900 uppercase font-bold pl-2">{t('production_periode_kg')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id} className="font-bold bg-green-50">{getD(st.id, s.id)?.productionKg ? formatNumber(getD(st.id, s.id)?.productionKg, settings.localization) : '-'}</Cell>)}
                                        <Cell bold className="bg-green-100 text-green-900 border-l border-green-300">{getD(st.id, 'TOTAL')?.productionKg ? formatNumber(getD(st.id, 'TOTAL')?.productionKg, settings.localization) : '-'}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>

                            {/* Growth Rate */}
                            <tr>
                                <Cell header align="left" className="bg-yellow-100 text-yellow-900 uppercase font-bold pl-2">{t('taux_croissance_moyen')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => <Cell key={s.id} className="bg-yellow-50">{(getD(st.id, s.id)?.avgGrowthRate || 0) > 0 ? `${(getD(st.id, s.id)?.avgGrowthRate || 0).toFixed(2)}%` : '-'}</Cell>)}
                                        <Cell bold className="bg-yellow-100 text-yellow-900 border-l border-yellow-300">{(getD(st.id, 'TOTAL')?.avgGrowthRate || 0) > 0 ? `${(getD(st.id, 'TOTAL')?.avgGrowthRate || 0).toFixed(2)}%` : '-'}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                            
                            {/* Forecast */}
                             <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-100 uppercase text-[8px] tracking-wider border-t border-gray-300 font-bold">{t('prevision_production')}</Cell>
                            </tr>
                            {['m1', 'm2', 'm3'].map((mKey, i) => (
                                <tr key={mKey}>
                                    <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{nextMonths[i]}</Cell>
                                    {displaySeaweedTypes.map((st: any) => (
                                        <React.Fragment key={st.id}>
                                            {displaySites.map((s: any) => <Cell key={s.id}>{getD(st.id, s.id)?.forecast[mKey as keyof typeof getD] ? formatNumber(getD(st.id, s.id)?.forecast[mKey as keyof typeof getD], settings.localization) : '-'}</Cell>)}
                                            <Cell bold className="bg-gray-50 border-l border-gray-300">{getD(st.id, 'TOTAL')?.forecast[mKey as keyof typeof getD] ? formatNumber(getD(st.id, 'TOTAL')?.forecast[mKey as keyof typeof getD], settings.localization) : '-'}</Cell>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                            
                            {/* --- MONITORING SECTION --- */}
                            <tr>
                                <Cell colSpan={colCount} className="bg-gray-200 text-black font-bold py-1.5 text-center text-[9px] border-t-2 border-gray-600 tracking-widest">
                                    {t('monitoringReport').toUpperCase()}
                                </Cell>
                            </tr>
                            
                            {/* Incidents */}
                             <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-200 uppercase text-[8px] tracking-wider font-bold">{t('incidentsLabel')}</Cell>
                            </tr>
                            {incidentTypes.length > 0 ? incidentTypes.map((inc: string, index: number) => (
                                <tr key={inc}>
                                    <Cell align="left" className="pl-4 text-red-700 font-medium border-r border-gray-300">{inc}</Cell>
                                    {displaySeaweedTypes.map((st: any) => (
                                        <React.Fragment key={st.id}>
                                            {displaySites.map((s: any) => <Cell key={s.id} className={getD(st.id, s.id)?.incidents[inc] ? "bg-red-50 font-bold text-red-600" : ""}>{getD(st.id, s.id)?.incidents[inc] || '-'}</Cell>)}
                                            <Cell bold className="bg-gray-50 border-l border-gray-300">{getD(st.id, 'TOTAL')?.incidents[inc] || '-'}</Cell>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            )) : <tr><Cell align="left" className="pl-4 text-green-600 italic bg-green-50">{t('noMajorIncidents')}</Cell><Cell colSpan={colCount - 1} className="bg-gray-50">-</Cell></tr>}
                            
                            {/* Wind */}
                             <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-100 uppercase text-[8px] tracking-wider border-t border-gray-300 font-bold">{t('vent')}</Cell>
                            </tr>
                            <tr>
                                <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{t('vitesse_kmh')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => {
                                            const d = getD(st.id, s.id);
                                            return <Cell key={s.id}>{d && d.weather.windSpeedCount ? (d.weather.windSpeedSum/d.weather.windSpeedCount).toFixed(1) : '-'}</Cell>
                                        })}
                                        <Cell className="bg-gray-50 border-l border-gray-300">-</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                             <tr>
                                <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{t('direction_deg')}</Cell>
                                {displaySeaweedTypes.map((st: any) => (
                                    <React.Fragment key={st.id}>
                                        {displaySites.map((s: any) => {
                                            const d = getD(st.id, s.id);
                                            return <Cell key={s.id}>{d && d.weather.windDirCount ? (d.weather.windDirSum/d.weather.windDirCount).toFixed(0) : '-'}</Cell>
                                        })}
                                        <Cell className="bg-gray-50 border-l border-gray-300">-</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                            
                            {/* Other Parameters */}
                            <tr>
                                <Cell colSpan={colCount} header align="left" className="pl-2 bg-gray-100 uppercase text-[8px] tracking-wider border-t border-gray-300 font-bold">{t('autres_parametres')}</Cell>
                            </tr>
                            {[
                                { label: 'temperature_c', key: 'temp' },
                                { label: 'salinite_ppt', key: 'salinity' },
                                { label: 'pluviometrie_mm', key: 'rain' }
                            ].map((param, index) => (
                                <tr key={param.label}>
                                    <Cell align="left" className="pl-4 text-gray-600 border-r border-gray-300">{t(param.label as any)}</Cell>
                                    {displaySeaweedTypes.map((st: any) => (
                                        <React.Fragment key={st.id}>
                                            {displaySites.map((s: any) => {
                                                const d = getD(st.id, s.id);
                                                const count = d?.weather[`${param.key}Count` as keyof typeof d.weather];
                                                const sum = d?.weather[`${param.key}Sum` as keyof typeof d.weather];
                                                return <Cell key={s.id}>{count ? (sum/count).toFixed(1) : '-'}</Cell>
                                            })}
                                            <Cell bold align="center" className="bg-gray-50 border-l border-gray-300">{t('averageShort')}</Cell>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <NarrativeBox title={t('narratif_explicatif_tableau')} generator={async () => generateGlobalFarmOverviewNarrative({}, 'fr')} />
            </div>
            <ReportFooter page={page} totalPages={totalPages} />
        </PrintPage>
    );
};

const Page2: FC<any> = ({ period, employees, sites, roles, page, totalPages, monthlyPayments, month, year }) => {
    const {t} = useLocalization();
    const { settings } = useSettings();

    const paymentMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!monthlyPayments) return map;

        const periodForFilter = `${year}-${String(month + 1).padStart(2, '0')}`;
        const relevantPayments = monthlyPayments.filter(p => p.period.startsWith(periodForFilter) && p.recipientType === RecipientType.EMPLOYEE);

        relevantPayments.forEach(p => {
            try {
                const notes = JSON.parse(p.notes || '{}');
                if (notes.type === 'payroll_run' && notes.details && notes.details.gross !== undefined) {
                    map.set(p.recipientId, parseFloat(notes.details.gross) || 0);
                }
            } catch (e) {
                // Ignore
            }
        });
        return map;
    }, [monthlyPayments, year, month]);

    const getStats = useCallback((roleName: string, category: 'PERMANENT' | 'CASUAL', siteId?: string) => {
        const filtered = employees.filter(e => 
            e.role === roleName && 
            e.employeeType === category && 
            (siteId ? e.siteId === siteId : true)
        );
        
        const count = filtered.length;
        // CHANGE: Use 0 instead of emp.grossWage if no payment record exists for this period
        const getAmount = (emp: Employee) => paymentMap.get(emp.id) ?? 0;
        const amount = filtered.reduce((sum, e) => sum + getAmount(e), 0);
        
        return { count, amount };
    }, [employees, paymentMap]);

    const categories = ['PERMANENT', 'CASUAL'] as const;
    const roleNames = roles.map(r => r.name).sort();

    const totals = useMemo(() => {
        const res: Record<string, any> = {};
        categories.forEach(cat => {
            res[cat] = { totalCount: 0, totalAmount: 0, sites: {} };
            sites.forEach(s => res[cat].sites[s.id] = { count: 0, amount: 0 });
            
            roleNames.forEach(role => {
                const globalStats = getStats(role, cat);
                res[cat].totalCount += globalStats.count;
                res[cat].totalAmount += globalStats.amount;
                
                sites.forEach(s => {
                    const siteStat = getStats(role, cat, s.id);
                    res[cat].sites[s.id].count += siteStat.count;
                    res[cat].sites[s.id].amount += siteStat.amount;
                });
            });
        });
        return res;
    }, [roles, sites, getStats]);


    return (
        <PrintPage>
             <GlobalReportHeader period={period} title={t('repartition_salaries_site')} />
             <div className="flex flex-col gap-2">
                <div className="w-full">
                    <table className="w-full border-collapse text-[7px] table-fixed border border-gray-400">
                         <colgroup>
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '12%' }} />
                            {sites.map(s => (
                                <React.Fragment key={s.id}>
                                    <col />
                                    <col />
                                </React.Fragment>
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                <Cell rowSpan={2} className="w-[20%] border-gray-400 bg-gray-100" />
                                <Cell colSpan={2} header className="bg-blue-100 text-blue-900 font-bold border-b border-gray-400 uppercase text-center">{t('total')}</Cell>
                                {sites.map(s => (
                                    <Cell key={s.id} colSpan={2} header className="bg-gray-50 border-b border-gray-400 uppercase text-center font-bold">{s.name}</Cell>
                                ))}
                            </tr>
                            <tr>
                                <Cell header className="bg-blue-50 text-center border-r border-blue-200">{t('effectif')}</Cell>
                                <Cell header className="bg-blue-50 text-center">{t('montant_du_mois')}</Cell>
                                {sites.map(s => (
                                    <React.Fragment key={`sub-${s.id}`}>
                                        <Cell header className="bg-gray-50 text-center border-l border-gray-300">{t('effectif')}</Cell>
                                        <Cell header className="bg-gray-50 text-center">{t('montant_du_mois')}</Cell>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <React.Fragment key={cat}>
                                    <tr><Cell colSpan={3 + (sites.length * 2)} header align="left" className="pl-2 bg-gray-200 uppercase tracking-widest border-t-2 border-gray-400 font-bold">{t(cat === 'CASUAL' ? 'journalier' : 'permanent' as any)}</Cell></tr>
                                    {roleNames.map(role => {
                                        const globalStats = getStats(role, cat);
                                        if (globalStats.count === 0) return null;

                                        return (
                                            <tr key={`${cat}-${role}`} className="border-b border-gray-300">
                                                <Cell align="left" className="pl-2 font-medium border-r border-gray-300">{role}</Cell>
                                                <Cell bold className="bg-blue-50 text-center border-r border-blue-100">{globalStats.count}</Cell>
                                                <Cell bold className="bg-blue-50 text-right pr-2">{globalStats.amount ? formatCurrency(globalStats.amount, settings.localization) : '-'}</Cell>
                                                
                                                {sites.map(s => {
                                                    const stat = getStats(role, cat, s.id);
                                                    return (
                                                        <React.Fragment key={s.id}>
                                                            <Cell className={`text-center border-l border-gray-300 ${stat.count ? "" : "text-gray-300"}`}>{stat.count || '-'}</Cell>
                                                            <Cell className={`text-right pr-2 ${stat.amount ? "" : "text-gray-300"}`}>{stat.amount ? formatCurrency(stat.amount, settings.localization) : '-'}</Cell>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                                        <Cell align="left" className="pl-2 uppercase border-r border-gray-400">{t(cat === 'CASUAL' ? 'total_journalier' : 'total_permanent' as any)}</Cell>
                                        <Cell className="bg-blue-200 text-center border-r border-blue-300">{totals[cat].totalCount}</Cell>
                                        <Cell className="bg-blue-200 text-right pr-2">{formatCurrency(totals[cat].totalAmount, settings.localization)}</Cell>
                                        {sites.map(s => (
                                            <React.Fragment key={`tot-${s.id}`}>
                                                <Cell className="text-center border-l border-gray-400 bg-gray-50">{totals[cat].sites[s.id].count}</Cell>
                                                <Cell className="text-right pr-2 bg-gray-50">{formatCurrency(totals[cat].sites[s.id].amount, settings.localization)}</Cell>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="w-full">
                    <NarrativeBox title={t('narratif_repartition_salaries')} generator={async () => generateSalariesNarrative({}, 'fr')} />
                </div>
             </div>
             <ReportFooter page={page} totalPages={totalPages} />
        </PrintPage>
    );
};

const Page3: FC<any> = ({ period, onSiteData, warehouseData, sites, seaweedTypes, page, totalPages }) => {
    const {t} = useLocalization();
    const { settings } = useSettings();
    
    // Helper to create explicit column widths for Page 3 tables
    // Total width 100%. Label: 16%, 4 blocks of (6%, 5%, 10%) = 21% each.
    const colGroups = (
        <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '6%' }} /> <col style={{ width: '5%' }} /> <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} /> <col style={{ width: '5%' }} /> <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} /> <col style={{ width: '5%' }} /> <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} /> <col style={{ width: '5%' }} /> <col style={{ width: '10%' }} />
        </colgroup>
    );

    return (
        <PrintPage>
            <GlobalReportHeader period={period} />
            <div className="flex flex-col gap-6 mt-2">
                <section>
                    <h3 className="font-bold text-sm uppercase mb-2 text-black border-l-4 border-green-600 pl-2">{t('stocks_sur_sites')} :</h3>
                    <table className="w-full border-collapse mb-1 text-[8px] table-fixed">
                         {colGroups}
                        <thead>
                            <tr>
                                <Cell rowSpan={2} className="bg-white border-none" />
                                <Cell colSpan={3} header className="bg-gray-200 border-gray-400 text-center uppercase font-bold">{t('stock_ouverture')}</Cell>
                                <Cell colSpan={3} header className="bg-green-100 border-green-300 text-green-900 text-center uppercase font-bold">{t('entrees')}</Cell>
                                <Cell colSpan={3} header className="bg-red-100 border-red-300 text-red-900 text-center uppercase font-bold">{t('sorties')}</Cell>
                                <Cell colSpan={3} header className="bg-blue-100 border-blue-300 text-blue-900 text-center uppercase font-bold">{t('stock_fermeture')}</Cell>
                            </tr>
                            <tr>
                                <Cell header className="bg-gray-100">{t('poids_kg')}</Cell><Cell header className="bg-gray-100">{t('sac')}</Cell><Cell header className="bg-gray-100">{t('valeur')}</Cell>
                                <Cell header className="bg-green-50">{t('poids_kg')}</Cell><Cell header className="bg-green-50">{t('sac')}</Cell><Cell header className="bg-green-50">{t('valeur')}</Cell>
                                <Cell header className="bg-red-50">{t('poids_kg')}</Cell><Cell header className="bg-red-50">{t('sac')}</Cell><Cell header className="bg-red-50">{t('valeur')}</Cell>
                                <Cell header className="bg-blue-50">{t('poids_kg')}</Cell><Cell header className="bg-blue-50">{t('sac')}</Cell><Cell header className="bg-blue-50">{t('valeur')}</Cell>
                            </tr>
                        </thead>
                        <tbody>
                            {sites.map(site => (
                                <React.Fragment key={site.id}>
                                    <tr><Cell header align="left" colSpan={13} className="bg-gray-200 uppercase tracking-wider border-t-2 border-gray-500 font-bold pl-2">{site.name}</Cell></tr>
                                    {seaweedTypes.map(st => {
                                        const d = onSiteData[site.id]?.[st.id] || { openingKg: 0, openingBags: 0, entriesKg: 0, entriesBags: 0, exitsKg: 0, exitsBags: 0, closingKg: 0, closingBags: 0 };
                                        const price = st.dryPrice || 0;
                                        return (
                                            <tr key={st.id} className="border-b border-gray-300">
                                                <Cell className="pl-4 font-medium border-r border-gray-300" align="left">{st.name}</Cell>
                                                {/* Opening */}
                                                <Cell className="text-right">{d.openingKg ? formatNumber(d.openingKg, settings.localization) : '-'}</Cell>
                                                <Cell className="text-center">{d.openingBags || '-'}</Cell>
                                                <Cell className="text-right border-r border-gray-300">{d.openingKg ? formatCurrency(d.openingKg * price, settings.localization) : '-'}</Cell>
                                                
                                                {/* Entries */}
                                                <Cell className="text-green-700 text-right bg-green-50/30">{d.entriesKg ? formatNumber(d.entriesKg, settings.localization) : '-'}</Cell>
                                                <Cell className="text-green-700 text-center bg-green-50/30">{d.entriesBags || '-'}</Cell>
                                                <Cell className="text-green-700 text-right border-r border-gray-300 bg-green-50/30">{d.entriesKg ? formatCurrency(d.entriesKg * price, settings.localization) : '-'}</Cell>

                                                {/* Exits */}
                                                <Cell className="text-red-700 text-right bg-red-50/30">{d.exitsKg ? formatNumber(d.exitsKg, settings.localization) : '-'}</Cell>
                                                <Cell className="text-red-700 text-center bg-red-50/30">{d.exitsBags || '-'}</Cell>
                                                <Cell className="text-red-700 text-right border-r border-gray-300 bg-red-50/30">{d.exitsKg ? formatCurrency(d.exitsKg * price, settings.localization) : '-'}</Cell>

                                                {/* Closing */}
                                                <Cell bold className="bg-blue-50 text-right text-blue-900">{d.closingKg ? formatNumber(d.closingKg, settings.localization) : '-'}</Cell>
                                                <Cell bold className="bg-blue-50 text-center text-blue-900">{d.closingBags || '-'}</Cell>
                                                <Cell bold className="bg-blue-50 text-right text-blue-900">{d.closingKg ? formatCurrency(d.closingKg * price, settings.localization) : '-'}</Cell>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    <NarrativeBox title={t('narratif_stocks_sites')} generator={async () => generateSiteStocksNarrative({}, 'fr')} />
                </section>
                
                <section>
                     <h3 className="font-bold text-sm uppercase mb-2 text-black border-l-4 border-orange-500 pl-2">{t('stock_magasin_presse')} :</h3>
                     <table className="w-full border-collapse mb-1 text-[8px] table-fixed">
                        {colGroups}
                         <thead>
                            <tr>
                                <Cell rowSpan={2} className="bg-white border-none" />
                                <Cell colSpan={3} header className="bg-gray-200 border-gray-400 text-center uppercase font-bold">{t('stock_ouverture')}</Cell>
                                <Cell colSpan={3} header className="bg-green-100 border-green-300 text-green-900 text-center uppercase font-bold">{t('entrees')}</Cell>
                                <Cell colSpan={3} header className="bg-red-100 border-red-300 text-red-900 text-center uppercase font-bold">{t('sorties')}</Cell>
                                <Cell colSpan={3} header className="bg-blue-100 border-blue-300 text-blue-900 text-center uppercase font-bold">{t('stock_fermeture')}</Cell>
                            </tr>
                            <tr>
                                <Cell header className="bg-gray-100">{t('poids_kg')}</Cell><Cell header className="bg-gray-100">{t('colis')}</Cell><Cell header className="bg-gray-100">{t('valeur')}</Cell>
                                <Cell header className="bg-green-50">{t('poids_kg')}</Cell><Cell header className="bg-green-50">{t('colis')}</Cell><Cell header className="bg-green-50">{t('valeur')}</Cell>
                                <Cell header className="bg-red-50">{t('poids_kg')}</Cell><Cell header className="bg-red-50">{t('colis')}</Cell><Cell header className="bg-red-50">{t('valeur')}</Cell>
                                <Cell header className="bg-blue-50">{t('poids_kg')}</Cell><Cell header className="bg-blue-50">{t('colis')}</Cell><Cell header className="bg-blue-50">{t('valeur')}</Cell>
                            </tr>
                        </thead>
                        <tbody>
                             {seaweedTypes.map((st, index) => {
                                const data = warehouseData[st.id];
                                const stPrice = st.dryPrice || 0;
                                if (!data) return null;

                                return (
                                <React.Fragment key={`presse-algue-${st.id}`}>
                                    <tr><Cell header align="left" colSpan={13} className="bg-gray-200 uppercase tracking-wider border-t-2 border-gray-400 font-bold pl-2">{st.name.toUpperCase()}</Cell></tr>
                                    {/* BULK */}
                                    <tr className="border-b border-gray-300">
                                        <Cell className="pl-4 font-medium text-gray-600 border-r border-gray-300" align="left">{t('algues_en_vrac')}</Cell>
                                        
                                        {/* Opening */}
                                        <Cell className="text-right">{data.bulk.openingKg ? formatNumber(data.bulk.openingKg, settings.localization) : '-'}</Cell>
                                        <Cell className="text-center">{data.bulk.openingBags || '-'}</Cell>
                                        <Cell className="text-right border-r border-gray-300">{data.bulk.openingKg ? formatCurrency(data.bulk.openingKg * stPrice, settings.localization) : '-'}</Cell>
                                        
                                        {/* Entries */}
                                        <Cell className="text-green-700 text-right bg-green-50/30">{data.bulk.entriesKg ? formatNumber(data.bulk.entriesKg, settings.localization) : '-'}</Cell>
                                        <Cell className="text-green-700 text-center bg-green-50/30">{data.bulk.entriesBags || '-'}</Cell>
                                        <Cell className="text-green-700 text-right border-r border-gray-300 bg-green-50/30">{data.bulk.entriesKg ? formatCurrency(data.bulk.entriesKg * stPrice, settings.localization) : '-'}</Cell>

                                        {/* Exits */}
                                        <Cell className="text-red-700 text-right bg-red-50/30">{data.bulk.exitsKg ? formatNumber(data.bulk.exitsKg, settings.localization) : '-'}</Cell>
                                        <Cell className="text-red-700 text-center bg-red-50/30">{data.bulk.exitsBags || '-'}</Cell>
                                        <Cell className="text-red-700 text-right border-r border-gray-300 bg-red-50/30">{data.bulk.exitsKg ? formatCurrency(data.bulk.exitsKg * stPrice, settings.localization) : '-'}</Cell>

                                        {/* Closing */}
                                        <Cell bold className="bg-blue-50 text-right text-blue-900">{data.bulk.closingKg ? formatNumber(data.bulk.closingKg, settings.localization) : '-'}</Cell>
                                        <Cell bold className="bg-blue-50 text-center text-blue-900">{data.bulk.closingBags || '-'}</Cell>
                                        <Cell bold className="bg-blue-50 text-right text-blue-900">{data.bulk.closingKg ? formatCurrency(data.bulk.closingKg * stPrice, settings.localization) : '-'}</Cell>
                                    </tr>

                                    {/* PRESSED */}
                                    <tr className="border-b border-gray-300">
                                        <Cell className="pl-4 font-medium text-gray-600 border-r border-gray-300" align="left">{t('algues_pressees')}</Cell>
                                        
                                        {/* Opening */}
                                        <Cell className="text-right">{data.pressed.openingKg ? formatNumber(data.pressed.openingKg, settings.localization) : '-'}</Cell>
                                        <Cell className="text-center">{data.pressed.openingBales || '-'}</Cell>
                                        <Cell className="text-right border-r border-gray-300">{data.pressed.openingKg ? formatCurrency(data.pressed.openingKg * stPrice, settings.localization) : '-'}</Cell>
                                        
                                        {/* Entries */}
                                        <Cell className="text-green-700 text-right bg-green-50/30">{data.pressed.entriesKg ? formatNumber(data.pressed.entriesKg, settings.localization) : '-'}</Cell>
                                        <Cell className="text-green-700 text-center bg-green-50/30">{data.pressed.entriesBales || '-'}</Cell>
                                        <Cell className="text-green-700 text-right border-r border-gray-300 bg-green-50/30">{data.pressed.entriesKg ? formatCurrency(data.pressed.entriesKg * stPrice, settings.localization) : '-'}</Cell>

                                        {/* Exits */}
                                        <Cell className="text-red-700 text-right bg-red-50/30">{data.pressed.exitsKg ? formatNumber(data.pressed.exitsKg, settings.localization) : '-'}</Cell>
                                        <Cell className="text-red-700 text-center bg-red-50/30">{data.pressed.exitsBales || '-'}</Cell>
                                        <Cell className="text-red-700 text-right border-r border-gray-300 bg-red-50/30">{data.pressed.exitsKg ? formatCurrency(data.pressed.exitsKg * stPrice, settings.localization) : '-'}</Cell>

                                        {/* Closing */}
                                        <Cell bold className="bg-blue-50 text-right text-blue-900">{data.pressed.closingKg ? formatNumber(data.pressed.closingKg, settings.localization) : '-'}</Cell>
                                        <Cell bold className="bg-blue-50 text-center text-blue-900">{data.pressed.closingBales || '-'}</Cell>
                                        <Cell bold className="bg-blue-50 text-right text-blue-900">{data.pressed.closingKg ? formatCurrency(data.pressed.closingKg * stPrice, settings.localization) : '-'}</Cell>
                                    </tr>
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                    <NarrativeBox title={t('narratif_stocks_magasin')} generator={async () => generateWarehouseStocksNarrative({}, 'fr')} />
                </section>
            </div>
            <ReportFooter page={page} totalPages={totalPages} />
        </PrintPage>
    );
};

const Page4: FC<any> = ({ period, year, exportDocuments, seaweedTypes, page, totalPages }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();

    const renderExportRows = (docs: ExportDocument[]) => {
        if (docs.length === 0) {
            return <tr><Cell colSpan={8} align="center" className="italic text-gray-500 py-4 bg-gray-50">- No exports -</Cell></tr>;
        }

        const groupedByType: Record<string, ExportDocument[]> = {};
        seaweedTypes.forEach(st => groupedByType[st.id] = []);
        docs.forEach(d => {
            if (!groupedByType[d.seaweedTypeId]) groupedByType[d.seaweedTypeId] = [];
            groupedByType[d.seaweedTypeId].push(d);
        });

        return seaweedTypes.map(st => {
            const typeDocs = groupedByType[st.id] || [];
            if (typeDocs.length === 0) return null;

            const totalWeight = typeDocs.reduce((sum, d) => sum + d.containers.reduce((s, c) => s + c.seaweedWeightKg, 0), 0);
            const totalBales = typeDocs.reduce((sum, d) => sum + d.containers.reduce((s, c) => s + c.packagesCount, 0), 0);
            const totalContainers = typeDocs.reduce((sum, d) => sum + d.containers.length, 0);
            const totalValue = typeDocs.reduce((sum, d) => sum + d.containers.reduce((s, c) => s + c.value, 0), 0);
            
            const currency = typeDocs[0]?.currency || settings.localization.currency;

            return (
                <React.Fragment key={st.id}>
                    <tr>
                        <Cell header align="left" colSpan={7} className="bg-gray-200 uppercase font-bold tracking-wider border-t-2 border-gray-500 pl-2">{st.name.toUpperCase()}</Cell>
                    </tr>
                    {typeDocs.map(doc => {
                        const docWeight = doc.containers.reduce((s, c) => s + c.seaweedWeightKg, 0);
                        const docBales = doc.containers.reduce((s, c) => s + c.packagesCount, 0);
                        const docContainers = doc.containers.length;
                        const docValue = doc.containers.reduce((s, c) => s + c.value, 0);

                        return (
                            <tr key={doc.id} className="border-b border-gray-300">
                                <Cell className="text-right pr-4">{formatNumber(docWeight, settings.localization)}</Cell>
                                <Cell className="text-right pr-4">{formatNumber(docBales, {...settings.localization, nonMonetaryDecimals: 0})}</Cell>
                                <Cell className="text-center">{docContainers}</Cell>
                                <Cell className="text-right pr-4">{formatCurrency(docValue, {...settings.localization, currencySymbol: doc.currency})}</Cell>
                                <Cell>{doc.invoiceNo}</Cell>
                                <Cell>{doc.poNo}</Cell>
                                <Cell>{doc.destinationCountry}</Cell>
                            </tr>
                        );
                    })}
                    <tr className="border-t border-gray-400 font-bold bg-gray-50">
                        <Cell bold className="text-right pr-4 border-r border-gray-300">{formatNumber(totalWeight, settings.localization)}</Cell>
                        <Cell bold className="text-right pr-4 border-r border-gray-300">{formatNumber(totalBales, {...settings.localization, nonMonetaryDecimals: 0})}</Cell>
                        <Cell bold className="text-center border-r border-gray-300">{totalContainers}</Cell>
                        <Cell bold className="text-right pr-4 border-r border-gray-300">{formatCurrency(totalValue, {...settings.localization, currencySymbol: currency})}</Cell>
                        <Cell colSpan={3} align="left" className="bg-gray-100 pl-2 italic text-gray-500">{t('total')}</Cell>
                    </tr>
                </React.Fragment>
            );
        });
    };
    
    const periodDocs = useMemo(() => {
        // Very basic check for "period" string match for now, can be improved with date parsing
        return exportDocuments.filter(d => {
            return d.date.includes(String(year)); // Fallback to yearly for now if strict monthly check is hard without exact dates
        });
    }, [exportDocuments, period, year]);

    const yearDocs = useMemo(() => {
        return exportDocuments.filter(d => new Date(d.date).getFullYear() === year);
    }, [exportDocuments, year]);

    const ExportTable: FC<{ title: string, docs: ExportDocument[] }> = ({ title, docs }) => (
        <section className="mb-4 flex-shrink-0">
            <p className="text-xs mb-2 text-black font-bold uppercase border-b border-black inline-block">{title}</p>
            <table className="w-full border-collapse border border-gray-400 table-fixed text-[8px]">
                 <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                    <tr>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('quantite_expedie')} (Kg)</Cell>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('colis')} ({t('baleSingular')})</Cell>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('nombre_conteneur')} (TC)</Cell>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('valeur_totale')}</Cell>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('facture_n')}</Cell>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('po')}</Cell>
                        <Cell header className="bg-gray-100 border-b border-gray-400">{t('destinataire')}</Cell>
                    </tr>
                </thead>
                <tbody>
                    {renderExportRows(docs)}
                </tbody>
            </table>
        </section>
    );

    return (
        <PrintPage>
             <GlobalReportHeader period={period} />
             <h3 className="font-bold text-sm uppercase mb-2 text-black border-l-4 border-purple-600 pl-2">{t('liste_exportations_realisees')} :</h3>
             <div className="flex-grow flex flex-col gap-4 mt-2 overflow-visible">
                <ExportTable title={`${t('de_la_periode')} (${period})`} docs={periodDocs} />
                <ExportTable title={`${t('de_annee')} (${year})`} docs={yearDocs} />
                <NarrativeBox title={t('narratif_exportations_realisees')} generator={async () => generateExportsNarrative({}, 'fr')} />
             </div>
             <ReportFooter page={page} totalPages={totalPages} />
        </PrintPage>
    );
};

const Page5: FC<any> = ({ period, months, monthlyData, year, sites, seaweedTypes, page, totalPages }) => {
    const {t} = useLocalization();
    const { settings } = useSettings();

    return (
        <PrintPage>
            <GlobalReportHeader period={period} title={t('production_mensuelle_par_site')} />
            <div className="flex-grow flex flex-col gap-2 mt-2 overflow-visible">
                 <table className="w-full border-collapse text-[6px] flex-shrink-0 table-fixed border border-gray-400">
                     <colgroup>
                         <col style={{ width: '14%' }} />
                         {months.map((_, i) => (
                             <React.Fragment key={i}>
                                 <col style={{ width: '3.5%' }} />
                                 <col style={{ width: '3.6%' }} />
                             </React.Fragment>
                         ))}
                     </colgroup>
                     <thead>
                        <tr>
                            <Cell rowSpan={2} className="bg-gray-200 border-gray-400"></Cell>
                            {months.map((m, i) => (
                                <Cell key={i} colSpan={2} header className="bg-blue-100 border-gray-400 border-b text-blue-900 uppercase font-bold text-[7px]">{m}</Cell>
                            ))}
                        </tr>
                        <tr>
                             {months.map((_, i) => (
                                <React.Fragment key={`sub-h-${i}`}>
                                    <Cell header className="text-[5px] border-gray-400 bg-gray-50 px-0 border-r">%</Cell>
                                    <Cell header className="text-[5px] border-gray-400 bg-gray-50 px-0">Kg</Cell>
                                </React.Fragment>
                            ))}
                        </tr>
                     </thead>
                     <tbody>
                        {sites.map(site => (
                            <React.Fragment key={site.id}>
                                <tr>
                                    <Cell colSpan={1 + (months.length * 2)} header align="left" className="bg-gray-200 py-1 px-2 uppercase font-bold border-t-2 border-gray-400">{site.name}</Cell>
                                </tr>
                                {seaweedTypes.map(st => {
                                    const rowData = monthlyData[site.id]?.[st.id] || [];
                                    return (
                                        <tr key={st.id} className="border-b border-gray-300">
                                            <Cell className="pl-4 font-semibold bg-gray-50 border-r border-gray-300" align="left">{st.name}</Cell>
                                            {months.map((_, i) => {
                                                const data = rowData[i];
                                                // Growth rate remains based on GROSS weight, no change
                                                const growthRate = data && data.growthRateCount > 0 ? (data.growthRateSum / data.growthRateCount) : 0;
                                                
                                                // Production is NET weight (already calculated in parent component)
                                                return (
                                                    <React.Fragment key={i}>
                                                        <Cell className="border-r border-gray-200 text-[6px] text-center">{growthRate > 0 ? `${growthRate.toFixed(1)}` : '-'}</Cell>
                                                        <Cell className="border-r border-gray-300 text-[6px] text-center bg-gray-50 font-medium">{data && data.production > 0 ? formatNumber(data.production, {...settings.localization, nonMonetaryDecimals: 0}) : '-'}</Cell>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                     </tbody>
                 </table>
                 <NarrativeBox title={t('narratif_production_mensuelle')} generator={async () => generateMonthlyProductionNarrative({}, 'fr')}/>
            </div>
            <ReportFooter page={page} totalPages={totalPages} />
        </PrintPage>
    );
};

const Page6: FC<any> = ({ 
    period, sixMonths, prevMonthName, creditTypes, farmerCredits, repayments, year, month, groupedData, totals, page, totalPages 
}) => {
    const {t, language} = useLocalization();
    const { settings } = useSettings();
    const monthHeaders = sixMonths.map((d: Date) => {
        const monthName = d.toLocaleString(language, { month: 'short' }).replace('.', '').toUpperCase();
        const year2digit = d.getFullYear().toString().slice(-2);
        return `${monthName} ${year2digit}`;
    });

    const individualStatsColGroup = (
        <colgroup>
            <col style={{ width: '20%' }} />
            {monthHeaders.map((_, i) => (
                 <React.Fragment key={i}>
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '5%' }} />
                </React.Fragment>
            ))}
        </colgroup>
    );
    
    // Credit Calculation Logic
    const creditReportData = useMemo(() => {
        const calculateStats = (targetDate: Date) => {
            const stats: Record<string, { balance: number; farmers: number }> = {};
            const totalStats = { balance: 0, farmers: new Set<string>() };
            
            const creditsUpToDate = farmerCredits.filter((c: FarmerCredit) => new Date(c.date) <= targetDate);
            const repaymentsUpToDate = repayments.filter((r: Repayment) => new Date(r.date) <= targetDate);

            const totalCredits = creditsUpToDate.reduce((sum, c) => sum + c.totalAmount, 0);
            const totalRepayments = repaymentsUpToDate.reduce((sum, r) => sum + r.amount, 0);
            totalStats.balance = totalCredits - totalRepayments;

            creditTypes.forEach((ct: CreditType) => {
                const creditsForType = creditsUpToDate.filter(c => c.creditTypeId === ct.id);
                const totalIssuedForType = creditsForType.reduce((sum, c) => sum + c.totalAmount, 0);
                
                const typeRatio = totalCredits > 0 ? totalIssuedForType / totalCredits : 0;
                const repaidForType = totalRepayments * typeRatio;
                
                stats[ct.id] = {
                    balance: totalIssuedForType - repaidForType,
                    farmers: new Set(creditsForType.map(c => c.farmerId)).size
                };
                creditsForType.forEach(c => totalStats.farmers.add(c.farmerId));
            });
            
            return { stats, totalStats: { balance: totalStats.balance, farmers: totalStats.farmers.size } };
        };

        const prevMonthEnd = new Date(year, month, 0, 23, 59, 59);
        const currMonthEnd = new Date(year, month + 1, 0, 23, 59, 59);
        
        const prevMonthStats = calculateStats(prevMonthEnd);
        const currMonthStats = calculateStats(currMonthEnd);

        const prevMonthRepayments = repayments
            .filter((r: Repayment) => new Date(r.date) < new Date(year, month, 1) && new Date(r.date) >= new Date(year, month -1, 1))
            .reduce((sum, r) => sum + r.amount, 0);

        const currMonthRepayments = repayments
            .filter((r: Repayment) => new Date(r.date) >= new Date(year, month, 1) && new Date(r.date) <= currMonthEnd)
            .reduce((sum, r) => sum + r.amount, 0);

        return { prevMonthStats, currMonthStats, prevMonthRepayments, currMonthRepayments };
    }, [farmerCredits, repayments, creditTypes, year, month]);

    return (
        <PrintPage>
             <GlobalReportHeader period={period} />
             <div className="flex-grow flex flex-col gap-4 mt-2 overflow-visible">
                <section className="flex flex-col">
                    <h3 className="font-bold text-sm uppercase mb-2 text-black flex-shrink-0 border-l-4 border-yellow-500 pl-2">{t('situation_credits')} :</h3>
                    <table className="w-full border-collapse flex-shrink-0 mb-2 border border-gray-400 table-fixed text-[8px]">
                        <colgroup>
                             <col style={{ width: '25%' }} />
                             <col style={{ width: '12.5%' }} /> <col style={{ width: '12.5%' }} /> <col style={{ width: '12.5%' }} />
                             <col style={{ width: '12.5%' }} /> <col style={{ width: '12.5%' }} /> <col style={{ width: '12.5%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <Cell rowSpan={2} header className="bg-gray-100 border-gray-400"></Cell>
                                <Cell colSpan={3} header className="bg-gray-200 text-gray-600 uppercase font-bold border-gray-400 border-b text-center">{prevMonthName}</Cell>
                                <Cell colSpan={3} header className="bg-blue-100 text-blue-900 uppercase font-bold border-gray-400 border-b border-l-2 border-l-blue-300 text-center">{period}</Cell>
                            </tr>
                            <tr>
                                <Cell header className="text-[7px] bg-gray-50 border-gray-300">{t('effectif_fermiers_concernes')}</Cell>
                                <Cell header className="text-[7px] bg-gray-50 border-gray-300">{t('solde_credits')}</Cell>
                                <Cell header className="text-[7px] bg-gray-50 border-gray-300">{t('total_remboursements')}</Cell>
                                <Cell header className="bg-blue-50 text-[7px] border-l-2 border-l-blue-300">{t('effectif_fermiers_concernes')}</Cell>
                                <Cell header className="bg-blue-50 text-[7px]">{t('solde_credits')}</Cell>
                                <Cell header className="bg-blue-50 text-[7px]">{t('total_remboursements')}</Cell>
                            </tr>
                        </thead>
                        <tbody>
                            {creditTypes.map((ct: CreditType) => {
                                const prevStats = creditReportData.prevMonthStats.stats[ct.id];
                                const currStats = creditReportData.currMonthStats.stats[ct.id];
                                
                                return (
                                <tr key={ct.id} className="border-b border-gray-300">
                                    <Cell header align="left" className="pl-2 text-gray-700 border-r border-gray-300">{ct.name}</Cell>
                                    <Cell className="text-center">{prevStats?.farmers || '-'}</Cell>
                                    <Cell className="text-right pr-2">{prevStats?.balance ? formatCurrency(prevStats.balance, settings.localization) : '-'}</Cell>
                                    <Cell className="text-right pr-2 border-r-2 border-r-blue-300">-</Cell>
                                    <Cell className="bg-blue-50 font-semibold text-center text-blue-900">{currStats?.farmers || '-'}</Cell>
                                    <Cell className="bg-blue-50 font-semibold text-right pr-2 text-blue-900">{currStats?.balance ? formatCurrency(currStats.balance, settings.localization) : '-'}</Cell>
                                    <Cell className="bg-blue-50 font-semibold text-right pr-2 text-blue-900">-</Cell>
                                </tr>
                            )})}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold bg-gray-100 border-t-2 border-gray-400">
                                <Cell header align="left" className="pl-2 border-r border-gray-300">{t('total')}</Cell>
                                <Cell className="text-center">{creditReportData.prevMonthStats.totalStats.farmers}</Cell>
                                <Cell className="text-right pr-2">{formatCurrency(creditReportData.prevMonthStats.totalStats.balance, settings.localization)}</Cell>
                                <Cell className="text-right pr-2 border-r-2 border-r-blue-300">{formatCurrency(creditReportData.prevMonthRepayments, settings.localization)}</Cell>
                                <Cell className="bg-blue-100 font-bold text-center text-blue-900">{creditReportData.currMonthStats.totalStats.farmers}</Cell>
                                <Cell className="bg-blue-100 font-bold text-right pr-2 text-blue-900">{formatCurrency(creditReportData.currMonthStats.totalStats.balance, settings.localization)}</Cell>
                                <Cell className="bg-blue-100 font-bold text-right pr-2 text-blue-900">{formatCurrency(creditReportData.currMonthRepayments, settings.localization)}</Cell>
                            </tr>
                        </tfoot>
                    </table>
                    <NarrativeBox title={t('narratif_situation_credits')} generator={async () => generateCreditsSituationNarrative(creditReportData, 'fr')} />
                </section>
                
                <section className="flex flex-col mt-4">
                     <h3 className="font-bold text-sm uppercase mb-2 text-black flex-shrink-0 border-l-4 border-indigo-500 pl-2">{t('statistique_individuelle_fermiers')}</h3>
                     <div className="border border-gray-400 overflow-hidden">
                        <table className="w-full border-collapse text-[6px] table-fixed">
                            {individualStatsColGroup}
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    <Cell rowSpan={2} header className="bg-gray-200 align-middle text-[8px] border-b-2 border-gray-500">{t('farmer')}</Cell>
                                    {monthHeaders.map((m, i) => (
                                        <Cell key={i} colSpan={3} header className="bg-gray-100 border-b border-gray-400 font-bold">{m}</Cell>
                                    ))}
                                </tr>
                                <tr>
                                    {monthHeaders.map((m, i) => (
                                        <React.Fragment key={`sub-h-${i}`}>
                                            <Cell header className="text-[6px] p-0 border-r border-gray-300 bg-white font-normal" title={t('status_PLANTED')}>
                                                {t('status_PLANTED').charAt(0)}
                                            </Cell>
                                            <Cell header className="text-[6px] p-0 border-r border-gray-300 bg-white font-normal" title={t('status_HARVESTED')}>
                                                {t('status_HARVESTED').charAt(0)}
                                            </Cell>
                                            <Cell header className="text-[6px] p-0 border-r border-gray-400 bg-white font-normal">Kg</Cell>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                             <tbody>
                                 {groupedData.map((siteData: any) => (
                                    <React.Fragment key={siteData.siteName}>
                                        <tr><Cell colSpan={1 + monthHeaders.length * 3} header align="left" className="bg-blue-100 py-1 text-[8px] uppercase tracking-widest border-t-2 border-gray-500 font-bold pl-2">{siteData.siteName}</Cell></tr>
                                        {siteData.seaweedTypes.map((typeData: any) => (
                                            <React.Fragment key={typeData.typeName}>
                                                <tr><Cell colSpan={1 + monthHeaders.length * 3} header align="left" className="bg-green-50 py-0.5 pl-4 text-[7px] text-green-800 italic border-t border-gray-300 font-medium">{typeData.typeName}</Cell></tr>
                                                {typeData.farmers.map((f: any) => (
                                                    <tr key={f.id} className="border-b border-gray-300">
                                                        <Cell align="left" className="align-middle truncate px-1 border-r border-gray-300 bg-white font-normal" title={f.name}>{f.name}</Cell>
                                                        {f.stats.map((s: any, j: number) => (
                                                            <React.Fragment key={`cell-group-${j}`}>
                                                                <Cell className="border-r border-gray-200 text-center align-middle text-blue-600 font-semibold">{s.planted || '-'}</Cell>
                                                                <Cell className="border-r border-gray-200 text-center align-middle text-red-600 font-semibold">{s.harvested || '-'}</Cell>
                                                                <Cell className="font-bold border-r border-gray-300 text-right pr-1 align-middle bg-gray-50/50">
                                                                    {s.production ? formatNumber(s.production, {...settings.localization, nonMonetaryDecimals: 0}) : '-'}
                                                                </Cell>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold border-t-2 border-gray-500">
                                    <Cell header className="align-middle uppercase tracking-widest text-[8px] border-r border-gray-400">{t('total')}</Cell>
                                    {totals.map((t_stat: any, j: number) => (
                                        <React.Fragment key={`total-cell-group-${j}`}>
                                            <Cell header className="border-r border-gray-300 text-center align-middle text-blue-600 font-bold">{t_stat.planted}</Cell>
                                            <Cell header className="border-r border-gray-300 text-center align-middle text-red-600 font-bold">{t_stat.harvested}</Cell>
                                            <Cell header className="font-bold border-r border-gray-400 text-right pr-1 align-middle bg-gray-100">
                                                {formatNumber(t_stat.production, {...settings.localization, nonMonetaryDecimals: 0})}
                                            </Cell>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </tfoot>
                         </table>
                     </div>
                     <NarrativeBox title={t('narratif_statistique_individuelle')} generator={async () => generateIndividualFarmerStatsNarrative(groupedData, 'fr')} />
                </section>
             </div>
             <ReportFooter page={page} totalPages={totalPages} />
        </PrintPage>
    );
};


export default GlobalFarmReport;