
import React, { useMemo } from 'react';
import Modal from './ui/Modal';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import type { CultivationCycle, Module } from '../types';
import StatusBadge from './ui/StatusBadge';
import Card from './ui/Card';

interface TraceabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    scannedData: { type: 'module' | 'batch', id: string } | null;
}

const TraceabilityModal: React.FC<TraceabilityModalProps> = ({ isOpen, onClose, scannedData }) => {
    const { t, language } = useLocalization();
    const { modules, cultivationCycles, sites, farmers, seaweedTypes } = useData();

    const report = useMemo(() => {
        if (!scannedData) return null;

        let module: Module | undefined;
        let cycle: CultivationCycle | undefined;

        if (scannedData.type === 'module') {
            module = modules.find(m => m.id === scannedData.id);
            if (module) {
                cycle = cultivationCycles
                    .filter(c => c.moduleId === module!.id)
                    .sort((a, b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime())[0];
            }
        } else if (scannedData.type === 'batch') {
            cycle = cultivationCycles.find(c => c.id === scannedData.id);
            if (cycle) {
                module = modules.find(m => m.id === cycle!.moduleId);
            }
        }

        if (!module) return null;

        const site = sites.find(s => s.id === module!.siteId);
        const zone = site?.zones.find(z => z.id === module!.zoneId);
        const farmer = module.farmerId ? farmers.find(f => f.id === module!.farmerId) : undefined;
        const seaweedType = cycle ? seaweedTypes.find(st => st.id === cycle!.seaweedTypeId) : undefined;

        return {
            module,
            cycle,
            site,
            zone,
            farmer,
            seaweedType
        };
    }, [scannedData, modules, cultivationCycles, sites, farmers, seaweedTypes]);

    if (!report) return null;

    // Display Logic for IDs
    const displayTitle = scannedData?.type === 'module' 
        ? report.module.code 
        : (report.cycle ? `${report.seaweedType?.name || t('batch')} - ${new Date(report.cycle.plantingDate).toLocaleDateString()}` : t('unknown_batch'));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('traceabilityReport')}
            widthClass="max-w-3xl"
            footer={<button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">{t('close')}</button>}
        >
            <div className="space-y-6">
                {/* Identity Header */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 uppercase">
                            {displayTitle}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">
                            {scannedData?.type === 'module' ? t('moduleTraceability') : t('batchTraceability')}
                        </p>
                    </div>
                </div>

                {/* Origin Section */}
                <Card title={t('originInformation')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase">{t('site')}</label>
                            <p className="font-semibold">{report.site?.name}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">{t('zone')}</label>
                            <p className="font-semibold">{report.zone?.name}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">{t('module')}</label>
                            <p className="font-semibold font-mono">{report.module.code}</p>
                        </div>
                         <div>
                            <label className="text-xs text-gray-500 uppercase">{t('farmer')}</label>
                            <p className="font-semibold">{report.farmer ? `${report.farmer.firstName} ${report.farmer.lastName}` : t('unassigned')}</p>
                        </div>
                    </div>
                </Card>

                {/* Cycle / Batch Details */}
                {report.cycle ? (
                     <Card title={t('batchHistory')}>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="text-xs text-gray-500 uppercase">{t('seaweedType')}</label>
                                <p className="font-semibold">{report.seaweedType?.name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">{t('status')}</label>
                                <div className="mt-1"><StatusBadge status={report.cycle.status} /></div>
                            </div>
                             <div>
                                <label className="text-xs text-gray-500 uppercase">{t('initialWeight')}</label>
                                <p className="font-semibold">{report.cycle.initialWeight} kg</p>
                            </div>
                         </div>
                         
                         <div className="mt-4 relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6 pl-6 pb-2">
                            <div className="relative">
                                <div className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full border-2 border-blue-500 bg-white dark:bg-gray-900"></div>
                                <p className="text-sm text-gray-500">{t('plantingDate')}</p>
                                <p className="font-semibold">{new Date(report.cycle.plantingDate).toLocaleDateString(language, { dateStyle: 'medium' })}</p>
                            </div>
                            
                            {report.cycle.harvestDate && (
                                <div className="relative">
                                    <div className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full border-2 border-green-500 bg-white dark:bg-gray-900"></div>
                                    <p className="text-sm text-gray-500">{t('harvestDate')}</p>
                                    <p className="font-semibold">
                                        {new Date(report.cycle.harvestDate).toLocaleDateString(language, { dateStyle: 'medium' })}
                                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            {report.cycle.harvestedWeight} kg
                                        </span>
                                    </p>
                                </div>
                            )}

                            {report.cycle.dryingStartDate && (
                                <div className="relative">
                                    <div className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full border-2 border-yellow-500 bg-white dark:bg-gray-900"></div>
                                    <p className="text-sm text-gray-500">{t('dryingProcess')}</p>
                                    <p className="font-semibold">
                                        {new Date(report.cycle.dryingStartDate).toLocaleDateString(language, { dateStyle: 'medium' })}
                                        {report.cycle.dryingCompletionDate && ` - ${new Date(report.cycle.dryingCompletionDate).toLocaleDateString(language, { dateStyle: 'medium' })}`}
                                    </p>
                                </div>
                            )}

                            {report.cycle.baggedDate && (
                                <div className="relative">
                                     <div className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full border-2 border-purple-500 bg-white dark:bg-gray-900"></div>
                                    <p className="text-sm text-gray-500">{t('baggedDate')}</p>
                                    <p className="font-semibold">
                                        {new Date(report.cycle.baggedDate).toLocaleDateString(language, { dateStyle: 'medium' })}
                                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            {report.cycle.baggedWeightKg} kg / {report.cycle.baggedBagsCount} {t('bales')}
                                        </span>
                                    </p>
                                </div>
                            )}
                         </div>
                     </Card>
                ) : (
                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                         {t('noActiveCycleFoundForModule')}
                     </div>
                )}
            </div>
        </Modal>
    );
};

export default TraceabilityModal;
