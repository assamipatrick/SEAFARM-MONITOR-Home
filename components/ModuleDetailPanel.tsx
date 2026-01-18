

import React, { useState } from 'react';
import Icon from './ui/Icon';
import StatusBadge from './ui/StatusBadge';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import type { CombinedModuleData } from '../types';
import Button from './ui/Button';
import ModuleHistoryModal from './ModuleHistoryModal';
import { useSettings } from '../contexts/SettingsContext';
import { formatCoordinate } from '../utils/converters';

interface ModuleDetailPanelProps {
  data: CombinedModuleData | null;
  onClose: () => void;
}

const DetailItem: React.FC<{ icon: string; label: string; value: React.ReactNode; fullWidth?: boolean }> = ({ icon, label, value, fullWidth }) => (
    <div className={`flex flex-col p-3 rounded-lg bg-gray-100/50 dark:bg-gray-900/50 ${fullWidth ? 'col-span-2' : ''}`}>
        <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
            <Icon name={icon} className="w-4 h-4 mr-2" />
            <span>{label}</span>
        </div>
        <div className="mt-1 text-md font-semibold text-gray-900 dark:text-gray-100 truncate">
            {value || 'N/A'}
        </div>
    </div>
);

const ModuleDetailPanel: React.FC<ModuleDetailPanelProps> = ({ data, onClose }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const isVisible = !!data;

    const { module, site, zone, farmer, cycle, seaweedType } = data || {};
    
    const format = settings.localization.coordinateFormat;
    
    return (
        <>
            <div
                className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-l border-gray-200 dark:border-gray-700/50 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="module-detail-panel-title"
            >
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('moduleDetails')}</p>
                        <h2 id="module-detail-panel-title" className="text-xl font-bold font-mono">{module?.code}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => setIsHistoryModalOpen(true)}>
                            <Icon name="FileText" className="w-4 h-4 mr-1" />
                            {t('history')}
                        </Button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t('close')}>
                            <Icon name="X" className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* Content */}
                {isVisible && (
                    <main className="flex-grow overflow-y-auto p-6 space-y-6">
                        {/* General Info */}
                        <section>
                            <h3 className="text-lg font-semibold mb-3">{t('generalInformation')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem icon="MapPin" label={t('site')} value={site?.name} />
                                <DetailItem icon="Grid" label={t('zoneName')} value={zone?.name} />
                                <DetailItem icon="User" label={t('farmer')} value={farmer ? `${farmer.firstName} ${farmer.lastName}` : t('status_FREE')} />
                                 <div className={`flex flex-col p-3 rounded-lg bg-gray-100/50 dark:bg-gray-900/50`}>
                                    <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                        <Icon name="Activity" className="w-4 h-4 mr-2" />
                                        <span>{t('status')}</span>
                                    </div>
                                    <div className="mt-1">
                                        <StatusBadge status={farmer ? 'ASSIGNED' : 'FREE'} />
                                    </div>
                                </div>
                                <DetailItem icon="MapPin" label={t('latitude')} value={formatCoordinate(module.latitude || '', format, true)} />
                                <DetailItem icon="MapPin" label={t('longitude')} value={formatCoordinate(module.longitude || '', format, false)} />
                            </div>
                        </section>
                        
                        {/* Configuration */}
                        <section>
                            <h3 className="text-lg font-semibold mb-3">{t('configuration')}</h3>
                             <div className="grid grid-cols-2 gap-3">
                                <DetailItem icon="Layers" label={t('lines')} value={module.lines} />
                                <DetailItem icon="Package" label={t('galvanizedPoles')} value={module.poles.galvanized} />
                                <DetailItem icon="Package" label={t('woodPoles')} value={module.poles.wood} />
                                <DetailItem icon="Package" label={t('plasticPoles')} value={module.poles.plastic} />
                            </div>
                        </section>
                        
                        {/* Current Cycle */}
                        {cycle && (
                             <section>
                                <h3 className="text-lg font-semibold mb-3">{t('cultivationCycle')}</h3>
                                 <div className="grid grid-cols-2 gap-3">
                                    <DetailItem icon="Beaker" label={t('seaweedType')} value={seaweedType?.name} />
                                    <DetailItem icon="Calendar" label={t('plantingDate')} value={cycle.plantingDate} />
                                    <DetailItem icon="Archive" label={t('initialWeight')} value={`${cycle.initialWeight} kg`} />
                                </div>
                            </section>
                        )}
                    </main>
                )}
            </div>
            
            {isVisible && module && (
                <ModuleHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    history={module.statusHistory}
                    moduleCode={module.code}
                />
            )}
        </>
    );
};

export default ModuleDetailPanel;
