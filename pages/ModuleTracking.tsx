
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import ModuleFormModal from '../components/ModuleFormModal';
import StatusBadge from '../components/ui/StatusBadge';
import type { Site, Zone, Module, CombinedModuleData, ModuleStatusHistory, HistoryStatus } from '../types';
import { ModuleStatus } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { formatNumber } from '../utils/formatters';
import ModuleHistoryModal from '../components/ModuleHistoryModal';
import Checkbox from '../components/ui/Checkbox';
import ModuleDetailPanel from '../components/ModuleDetailPanel';
import AssignFarmerModal from '../components/AssignFarmerModal';
import { UNASSIGNED_ALERT_THRESHOLD_DAYS } from '../constants';
import Tooltip from '../components/ui/Tooltip';
import PrintableQRLabel from '../components/PrintableQRLabel';

const AlertIndicator: React.FC<{ alert?: { message: string } }> = ({ alert }) => {
    if (!alert) return null;

    return (
        <div className="relative group flex justify-center">
            <Icon name="AlertTriangle" className="w-5 h-5 text-yellow-500" />
            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="relative px-3 py-2 text-sm text-white bg-gray-900 dark:bg-black rounded-lg shadow-lg">
                    {alert.message}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-black"></div>
                </div>
            </div>
        </div>
    );
};


export const ModuleTracking: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { modules, cultivationCycles, sites, seaweedTypes, deleteModule, addModule, updateModule, farmers, deleteMultipleModules, updateModulesFarmer } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<CombinedModuleData | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
    
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedModuleHistory, setSelectedModuleHistory] = useState<ModuleStatusHistory[] | null>(null);
    const [selectedModuleCode, setSelectedModuleCode] = useState('');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [selectedModuleData, setSelectedModuleData] = useState<CombinedModuleData | null>(null);
    const [isAssignFarmerModalOpen, setIsAssignFarmerModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightedId = searchParams.get('highlight');
    const [viewMode, setViewMode] = useState<'board' | 'table'>('table'); // Default to table for now
    
    // QR Print State
    const [qrDataToPrint, setQrDataToPrint] = useState<{data: any, title: string, subtitle: string} | null>(null);

    const [filters, setFilters] = useState({
        code: '',
        siteId: 'all',
        zoneId: 'all',
        farmerId: 'all',
        status: 'all', // all, free, assigned, with_alerts
    });
    const [availableZones, setAvailableZones] = useState<Zone[]>([]);

    useEffect(() => {
        if (filters.siteId === 'all') {
            setAvailableZones([]);
        } else {
            const selectedSite = sites.find(s => s.id === filters.siteId);
            setAvailableZones(selectedSite?.zones || []);
        }
    }, [filters.siteId, sites]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        if (key === 'siteId') {
            setFilters(prev => ({ ...prev, siteId: value, zoneId: 'all' }));
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };
    
    const clearFilters = useCallback(() => {
        setFilters({ code: '', siteId: 'all', zoneId: 'all', farmerId: 'all', status: 'all' });
        setSelectedModules([]);
    }, []);

    const combinedData = useMemo((): CombinedModuleData[] => {
        return modules.map(module => {
            const cycle = [...cultivationCycles]
                .filter(c => c.moduleId === module.id)
                .sort((a,b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime())[0];
            
            const site = sites.find(s => s.id === module.siteId);
            const zone = site?.zones.find(z => z.id === module.zoneId);
            const seaweedType = cycle ? seaweedTypes.find(st => st.id === cycle.seaweedTypeId) : undefined;
            const farmer = module.farmerId ? farmers.find(f => f.id === module.farmerId) : undefined;
            
            let alert: CombinedModuleData['alert'] | undefined = undefined;
            if (!module.farmerId) {
                const completedCycles = cultivationCycles
                    .filter(c => c.moduleId === module.id && c.harvestDate)
                    .sort((a, b) => new Date(b.harvestDate!).getTime() - new Date(a.harvestDate!).getTime());

                if (completedCycles.length > 0) {
                    const lastHarvestDate = new Date(completedCycles[0].harvestDate!);
                    const today = new Date();
                    const daysSinceHarvest = Math.floor((today.getTime() - lastHarvestDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysSinceHarvest > UNASSIGNED_ALERT_THRESHOLD_DAYS) {
                        alert = {
                            type: 'unassigned_long',
                            message: t('notification_unassigned').replace('{code}', module.code).replace('{days}', String(daysSinceHarvest)),
                        };
                    }
                }
            }

            return { module, cycle, site, zone, seaweedType, farmer, alert };
        }).filter(item => { // Apply filters here
            const { module } = item;
            if (!module) return false;

            const codeMatch = filters.code ? module.code.toLowerCase().includes(filters.code.toLowerCase()) : true;
            const siteMatch = filters.siteId !== 'all' ? module.siteId === filters.siteId : true;
            const zoneMatch = filters.zoneId !== 'all' ? module.zoneId === filters.zoneId : true;
            const farmerMatch = filters.farmerId !== 'all' ? module.farmerId === filters.farmerId : true;
            
            const statusMatch = (() => {
                switch (filters.status) {
                    case 'free': return !module.farmerId;
                    case 'assigned': return !!module.farmerId;
                    case 'with_alerts': return !!item.alert;
                    case 'all': default: return true;
                }
            })();

            return codeMatch && siteMatch && zoneMatch && farmerMatch && statusMatch;
        });
    }, [modules, cultivationCycles, sites, seaweedTypes, farmers, t, filters]);

    const assignmentContext = useMemo(() => {
        if (selectedModules.length === 0) {
            return { farmers: [], isMultiSite: false };
        }

        const selectedModuleObjects = modules.filter(m => selectedModules.includes(m.id));
        const siteIds = new Set(selectedModuleObjects.map(m => m.siteId));

        if (siteIds.size === 1) {
            const [singleSiteId] = siteIds;
            return {
                farmers: farmers.filter(f => f.siteId === singleSiteId),
                isMultiSite: false
            };
        }

        return { farmers: [], isMultiSite: siteIds.size > 1 };
    }, [selectedModules, modules, farmers]);

    useEffect(() => {
        if (highlightedId) {
            const itemToHighlight = combinedData.find(d => d.module.id === highlightedId);
            if (itemToHighlight) {
                setSelectedModuleData(itemToHighlight);
                // Clear the highlight param from URL after use to prevent re-triggering
                setSearchParams({}, { replace: true });
            }
        }
    }, [highlightedId, combinedData, setSearchParams]);

    useEffect(() => {
        const visibleIds = new Set(combinedData.map(d => d.module.id));
        setSelectedModules(prev => prev.filter(id => visibleIds.has(id)));
    }, [combinedData]);

    const totalModules = useMemo(() => modules.length, [modules]);
    const modulesInCultivation = useMemo(() => 
        cultivationCycles.filter(c => c.status === ModuleStatus.PLANTED || c.status === ModuleStatus.GROWING).length,
        [cultivationCycles]
    );
    const readyForHarvestCount = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const CYCLE_DURATION_DAYS = 45;
        return cultivationCycles.filter(cycle => {
            if (cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING) {
                const plantingDate = new Date(cycle.plantingDate);
                plantingDate.setHours(0, 0, 0, 0);
                const daysSincePlanting = (today.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysSincePlanting > CYCLE_DURATION_DAYS;
            }
            return false;
        }).length;
    }, [cultivationCycles]);
    const totalLines = useMemo(() => modules.reduce((sum, module) => sum + module.lines, 0), [modules]);

    const sortedFarmers = useMemo(() => 
        [...farmers].sort((a, b) => 
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        ), 
    [farmers]);
    
    const handleRowClick = (data: CombinedModuleData) => {
        setSelectedModuleData(prev => (prev?.module.id === data.module.id ? null : data));
    };

    const handleOpenModal = (data: CombinedModuleData | null = null) => {
        setEditingData(data);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingData(null);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (moduleId: string) => {
        setModuleToDelete(moduleId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (moduleToDelete) {
            deleteModule(moduleToDelete);
        }
        setIsConfirmOpen(false);
        setModuleToDelete(null);
    };
    
    const handleBulkDeleteClick = () => {
        setIsBulkConfirmOpen(true);
    };

    const handleConfirmBulkDelete = () => {
        deleteMultipleModules(selectedModules);
        setSelectedModules([]);
        setIsBulkConfirmOpen(false);
    };

    const handleAssignFarmer = (farmerId: string) => {
        updateModulesFarmer(selectedModules, farmerId);
        setSelectedModules([]);
        setIsAssignFarmerModalOpen(false);
    };

    const handleSave = (moduleData: Module | Omit<Module, 'id' | 'statusHistory'>) => {
        if ('id' in moduleData) {
            updateModule(moduleData);
        } else {
            addModule(moduleData as Omit<Module, 'id' | 'farmerId' | 'statusHistory'>);
        }
        handleCloseModal();
    };
    
    const handleHistoryClick = (history: ModuleStatusHistory[], code: string) => {
        setSelectedModuleHistory(history);
        setSelectedModuleCode(code);
        setIsHistoryModalOpen(true);
    };

    const handlePrintQR = (module: Module) => {
        setQrDataToPrint({
            data: { t: 'm', id: module.id },
            title: module.code,
            subtitle: sites.find(s => s.id === module.siteId)?.name || ''
        });
    };
    
    // ... Summary Cards, Filters UI ...

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">{t('moduleManagementTitle')}</h1>
                <div className="flex items-center gap-4">
                     <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('addModule')}</Button>
                </div>
            </div>
            
            {/* Summary cards & Filters ... (omitted for brevity, assume existing structure) */}
             <Card className="mb-6">
                <h2 className="text-lg font-semibold mb-2">{t('filtersTitle')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    <Input label={t('moduleCode')} value={filters.code} onChange={e => handleFilterChange('code', e.target.value)} />
                    <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)}>
                        <option value="all">{t('allSites')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('zoneName')} value={filters.zoneId} onChange={e => handleFilterChange('zoneId', e.target.value)} disabled={filters.siteId === 'all'}>
                        <option value="all">{t('allZones')}</option>
                        {availableZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </Select>
                    <Select label={t('farmer')} value={filters.farmerId} onChange={e => handleFilterChange('farmerId', e.target.value)}>
                        <option value="all">{t('allFarmers')}</option>
                        {sortedFarmers.map(f => <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>)}
                    </Select>
                    <Select label={t('status')} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                        <option value="all">{t('allStatuses')}</option>
                        <option value="free">{t('status_FREE')}</option>
                        <option value="assigned">{t('status_ASSIGNED')}</option>
                        <option value="with_alerts">{t('alerts')}</option>
                    </Select>
                    <Button variant="secondary" onClick={clearFilters} className="h-[42px] w-full">{t('clearFilters')}</Button>
                </div>
             </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="p-3 w-16">{t('status')}</th>
                                <th className="p-3">{t('moduleCode')}</th>
                                <th className="p-3">{t('site')}</th>
                                <th className="p-3">{t('zoneName')}</th>
                                <th className="p-3">{t('farmer')}</th>
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedData.map(data => (
                                <tr key={data.module.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3"><StatusBadge status={data.module.farmerId ? 'ASSIGNED' : 'FREE'} /></td>
                                    <td className="p-3 font-mono font-bold">{data.module.code}</td>
                                    <td className="p-3">{data.site?.name}</td>
                                    <td className="p-3">{data.zone?.name}</td>
                                    <td className="p-3">{data.farmer ? `${data.farmer.firstName} ${data.farmer.lastName}` : '-'}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" onClick={() => handlePrintQR(data.module)} title={t('print')}>
                                                <Icon name="QrCode" className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" onClick={() => handleOpenModal(data)}><Icon name="Settings" className="w-4 h-4"/></Button>
                                            <Button variant="ghost" onClick={() => handleHistoryClick(data.module.statusHistory, data.module.code)}><Icon name="FileText" className="w-4 h-4"/></Button>
                                            <Button variant="danger" onClick={() => handleDeleteClick(data.module.id)}><Icon name="Trash2" className="w-4 h-4"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modals */}
            {isModalOpen && <ModuleFormModal isOpen={isModalOpen} onClose={handleCloseModal} data={editingData} onSave={handleSave} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteModule')} />}
            {isHistoryModalOpen && selectedModuleHistory && <ModuleHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={selectedModuleHistory} moduleCode={selectedModuleCode} />}
            
            {qrDataToPrint && (
                <PrintableQRLabel 
                    qrData={qrDataToPrint.data} 
                    title={qrDataToPrint.title} 
                    subtitle={qrDataToPrint.subtitle}
                    detail="SCAN FOR TRACEABILITY"
                    onClose={() => setQrDataToPrint(null)} 
                />
            )}
        </div>
    );
};
