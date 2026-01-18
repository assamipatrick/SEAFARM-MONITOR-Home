import React, { useMemo } from 'react';
import Modal from './ui/Modal';
import StatusBadge from './ui/StatusBadge';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import type { CultivationCycle, Module, HistoryStatus } from '../types';

interface CultivationCycleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycle: CultivationCycle;
  module: Module;
}

const CultivationCycleHistoryModal: React.FC<CultivationCycleHistoryModalProps> = ({ isOpen, onClose, cycle, module }) => {
    const { t, language } = useLocalization();
    const { cuttingOperations, serviceProviders } = useData();

    const providerMap = useMemo(() => new Map(serviceProviders.map(p => [p.id, p.name])), [serviceProviders]);

    const history = useMemo(() => {
        const events: { status: HistoryStatus; date: string, notes?: string }[] = [];
        if (!cycle) return [];

        if (cycle.cuttingOperationId) {
            const cuttingOp = cuttingOperations.find(op => op.id === cycle.cuttingOperationId);
            if (cuttingOp) {
                const providerName = providerMap.get(cuttingOp.serviceProviderId);
                const notes = providerName ? `Provider: ${providerName}` : `Operation ID: ${cuttingOp.id}`;
                events.push({ status: 'CUTTING', date: cuttingOp.date, notes });
            }
        }

        if (cycle.plantingDate) {
            events.push({ status: 'PLANTED', date: cycle.plantingDate });
            if (!cycle.harvestDate) {
                const growingDate = new Date(cycle.plantingDate);
                growingDate.setDate(growingDate.getDate() + 1);
                events.push({ status: 'GROWING', date: growingDate.toISOString().split('T')[0] });
            }
        }
        if (cycle.harvestDate) events.push({ status: 'HARVESTED', date: cycle.harvestDate });
        if (cycle.dryingStartDate) events.push({ status: 'DRYING', date: cycle.dryingStartDate });
        if (cycle.baggingStartDate) events.push({ status: 'BAGGING', date: cycle.baggingStartDate });
        if (cycle.stockDate) events.push({ status: 'IN_STOCK', date: cycle.stockDate });
        if (cycle.exportDate) events.push({ status: 'EXPORTED', date: cycle.exportDate });

        return events
            .filter(event => event.date)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [cycle, cuttingOperations, providerMap]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${t('cultivationCycleHistoryTitle')}: ${module.code}`}
            widthClass="max-w-2xl"
        >
            <div className="max-h-[60vh] overflow-y-auto pr-4">
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-4">                  
                    {history.map((item, index) => (
                        <li key={index} className="mb-8 ml-8">            
                            <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800/70 dark:bg-blue-900">
                                <svg className="w-2.5 h-2.5 text-blue-800 dark:text-blue-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4Z"/>
                                    <path d="M0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                                </svg>
                            </span>
                            <div className="flex items-center mb-1">
                                <StatusBadge status={item.status} />
                                <time className="block ml-4 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                                    {new Date(item.date).toLocaleString(language, { dateStyle: 'long', timeStyle: 'short' })}
                                </time>
                            </div>
                             {item.notes && <p className="text-base font-normal text-gray-600 dark:text-gray-300 mt-2">{t('notes')}: {item.notes}</p>}
                        </li>
                    ))}
                     {history.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400">{t('noCycleHistoryEvents')}</p>
                    )}
                </ol>
            </div>
        </Modal>
    );
};

export default CultivationCycleHistoryModal;
