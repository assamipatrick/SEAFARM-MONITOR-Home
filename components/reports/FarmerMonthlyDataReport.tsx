
import React, { useMemo, FC } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import PrintPage from '../printable/PrintPage';
import { COUNTRIES } from '../../constants';

const ReportHeader: React.FC<{ year: number; siteName?: string }> = ({ year, siteName }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();

    const countryName = useMemo(() => {
        return COUNTRIES.find(c => c.code === settings.localization.country)?.name || settings.localization.country;
    }, [settings.localization.country]);

    return (
        <header className="mb-4">
            <div className="grid grid-cols-4 items-center">
                <div className="col-span-1">
                    <img src={settings.company.logoUrl} alt={`${settings.company.name} logo`} className="h-10 w-auto object-contain" />
                </div>
                <div className="col-span-2 text-center">
                    <h1 className="font-bold text-sm uppercase mb-0.5">{settings.company.name}</h1>
                    <div className="text-[8px] leading-none space-y-0 text-gray-700">
                        <p>{t('capital')}: {formatCurrency(settings.company.capital, settings.localization)}</p>
                        <p>{t('address')}: {settings.company.address}</p>
                        <p>{t('nif')}: {settings.company.nif} / {t('stat')}: {settings.company.stat} / {t('rc')}: {settings.company.rc}</p>
                        <p>{t('phone')}: {settings.company.phone} / {t('email')}: {settings.company.email}</p>
                        <p>{t('country')}: {countryName}</p>
                    </div>
                </div>
                <div className="col-span-1 text-right">
                    <p className="font-bold text-xs">{year}</p>
                </div>
            </div>
            <div className="border-b-2 border-black mt-1 mb-2"></div>
            <h2 className="text-center text-base font-bold uppercase underline mb-1">{t('farmerMonthlyReport')}</h2>
            {siteName && <h3 className="text-center text-sm font-bold text-blue-800 uppercase">{siteName}</h3>}
        </header>
    );
};

const FarmerMonthlyDataReport: FC<{ year: number }> = ({ year }) => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { cultivationCycles, modules, sites, seaweedTypes, farmers } = useData();

    // Yearly Matrix Data Logic - Grouped by Site and Seaweed Type
    const groupedYearlyStats = useMemo(() => {
        // Structure: SiteID -> SeaweedTypeID -> FarmerID -> Stats
        const structure: Record<string, Record<string, Record<string, { 
            name: string, 
            months: { planted: number, harvested: number, production: number }[] 
        }>>> = {};

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        cultivationCycles.forEach(cycle => {
            const module = modules.find(m => m.id === cycle.moduleId);
            if (!module || !module.farmerId || !module.siteId) return;

            const siteId = module.siteId;
            const typeId = cycle.seaweedTypeId;
            const farmerId = module.farmerId;
            const farmer = farmers.find(f => f.id === farmerId);
            if (!farmer) return;

            // Initialize structure path
            if (!structure[siteId]) structure[siteId] = {};
            if (!structure[siteId][typeId]) structure[siteId][typeId] = {};
            if (!structure[siteId][typeId][farmerId]) {
                structure[siteId][typeId][farmerId] = {
                    name: `${farmer.lastName} ${farmer.firstName}`,
                    months: Array.from({ length: 12 }, () => ({ planted: 0, harvested: 0, production: 0 }))
                };
            }

            const plantingDate = new Date(cycle.plantingDate);
            if (plantingDate >= startOfYear && plantingDate <= endOfYear) {
                const mIndex = plantingDate.getMonth();
                structure[siteId][typeId][farmerId].months[mIndex].planted += (cycle.linesPlanted || module.lines || 0);
            }

            if (cycle.harvestDate) {
                const harvestDate = new Date(cycle.harvestDate);
                if (harvestDate >= startOfYear && harvestDate <= endOfYear) {
                    const mIndex = harvestDate.getMonth();
                    structure[siteId][typeId][farmerId].months[mIndex].harvested += (cycle.linesHarvested || 0);
                    const netWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                    structure[siteId][typeId][farmerId].months[mIndex].production += netWeight;
                }
            }
        });

        // Convert to array for rendering
        const result = Object.keys(structure).map(siteId => {
            const siteName = sites.find(s => s.id === siteId)?.name || 'Unknown Site';
            const types = Object.keys(structure[siteId]).map(typeId => {
                const typeName = seaweedTypes.find(st => st.id === typeId)?.name || 'Unknown Type';
                const farmersData = Object.values(structure[siteId][typeId]).sort((a, b) => a.name.localeCompare(b.name));
                
                // Calculate totals for this specific table
                const matrixTotals = Array.from({ length: 12 }, () => ({ planted: 0, harvested: 0, production: 0 }));
                farmersData.forEach(stat => {
                    stat.months.forEach((m, i) => {
                        matrixTotals[i].planted += m.planted;
                        matrixTotals[i].harvested += m.harvested;
                        matrixTotals[i].production += m.production;
                    });
                });

                return {
                    id: typeId,
                    name: typeName,
                    farmers: farmersData,
                    totals: matrixTotals
                };
            }).sort((a, b) => a.name.localeCompare(b.name));

            return {
                id: siteId,
                name: siteName,
                types: types
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        return result;
    }, [farmers, cultivationCycles, modules, year, sites, seaweedTypes]);

    const monthHeaders = useMemo(() => {
        const m = [];
        for(let i=0; i<12; i++) {
            m.push(new Date(year, i, 1).toLocaleDateString(language, { month: 'short', year: '2-digit' }));
        }
        return m;
    }, [year, language]);

    // Render logic for empty data (to show at least the header and an empty structure)
    if (groupedYearlyStats.length === 0) {
        return (
            <PrintPage landscape>
                <ReportHeader year={year} />
                <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-500">{t('noDataForReport')}</p>
                    {/* Render an empty table structure to visualize the layout */}
                    <div className="mt-4 overflow-x-auto opacity-50">
                        <table className="w-full border-collapse border border-black text-[7px] text-black font-sans table-fixed">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 font-bold bg-gray-100 text-left" style={{width: '180px'}}>{t('farmer')}</th>
                                    {monthHeaders.map((m, i) => (
                                        <th key={i} className="border border-black p-1 font-bold bg-gray-100 text-center" colSpan={2}>{m}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-4 text-center" colSpan={25}>-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </PrintPage>
        );
    }

    return (
        <>
        {groupedYearlyStats.map((siteData) => (
            <PrintPage key={siteData.id} landscape>
                <ReportHeader year={year} siteName={siteData.name} />
                
                {siteData.types.map(typeData => (
                    <div key={typeData.id} className="mb-8 break-inside-avoid">
                        <h4 className="font-bold text-xs mb-2 pl-2 border-l-4 border-green-500 bg-gray-50 p-1">
                            {t('seaweedType')}: {typeData.name}
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-[7px] text-black font-sans table-fixed">
                                <thead>
                                    <tr>
                                        <th className="border border-black p-1 font-bold bg-gray-100 text-left" style={{width: '180px'}}>{t('farmer')}</th>
                                        {monthHeaders.map((m, i) => (
                                            <th key={i} className="border border-black p-1 font-bold bg-gray-100 text-center" colSpan={2}>{m}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {typeData.farmers.map(stat => (
                                        <tr key={stat.name}>
                                            <td className="border border-black p-1 font-bold">{stat.name}</td>
                                            {stat.months.map((m, i) => (
                                                <React.Fragment key={i}>
                                                    <td className="border border-black p-0.5 text-center align-middle" style={{width: '30px'}}>
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="text-blue-600 font-semibold">{m.planted || '-'}</span>
                                                            <span className="border-t border-gray-300 my-0.5"></span>
                                                            <span className="text-red-600 font-semibold">{m.harvested || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="border border-black p-0.5 text-center align-middle font-bold bg-gray-50/50" style={{width: '30px'}}>
                                                        {m.production ? formatNumber(m.production, {...settings.localization, currencySymbol: '', nonMonetaryDecimals: 0}) : '-'}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100">
                                        <td className="border border-black p-1 font-bold">{t('total')}</td>
                                        {typeData.totals.map((monthlyTotal, i) => (
                                            <React.Fragment key={i}>
                                                <td className="border border-black p-0.5 text-center align-middle">
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-blue-600 font-bold">{monthlyTotal.planted}</span>
                                                        <span className="border-t border-gray-400 my-0.5"></span>
                                                        <span className="text-red-600 font-bold">{monthlyTotal.harvested}</span>
                                                    </div>
                                                </td>
                                                <td className="border border-black p-0.5 text-center align-middle font-bold">
                                                    {formatNumber(monthlyTotal.production, {...settings.localization, currencySymbol: '', nonMonetaryDecimals: 0})}
                                                </td>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                ))}

                <div className="mt-auto pt-4 flex gap-4 text-[8px] border-t border-gray-300">
                    <div className="flex items-center gap-1">
                        <span className="text-blue-600 font-bold">{t('legendColorBlue')}</span> {t('legendPlantedLines')}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-red-600 font-bold">{t('legendColorRed')}</span> {t('legendHarvestedLines')}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-bold">{t('legendColorBlack')}</span> {t('legendProductionKg')}
                    </div>
                </div>
            </PrintPage>
        ))}
        </>
    );
};

export default FarmerMonthlyDataReport;
