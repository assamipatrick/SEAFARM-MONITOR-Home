
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import ConfirmationModal from './ui/ConfirmationModal';
import type { CultivationCycle, Module, SeaweedType, Farmer, PredictionResult } from '../types';
import { ModuleStatus } from '../types';
import CultivationCycleHistoryModal from './CultivationCycleHistoryModal';
import { CYCLE_DURATION_DAYS, NEARING_HARVEST_DAYS } from '../constants';
import StatusBadge from './ui/StatusBadge';
import { generateHarvestPrediction } from '../services/geminiService';
import Tooltip from './ui/Tooltip';
import { formatNumber } from '../utils/formatters';
import PlantingFormModal from './PlantingFormModal';
import { calculateSGR } from '../utils/converters';
import { exportDataToExcel } from '../utils/excelExporter';

type AlertStatus = 'normal' | 'nearing' | 'overdue';

interface FullCycleInfo {
    cycle: CultivationCycle;
    module?: Module;
    seaweedType?: SeaweedType;
    farmer?: Farmer;
    alertStatus: AlertStatus;
    growthRate?: number;
    age: number;
}

const AlertIndicator: React.FC<{ status: AlertStatus }> = ({ status }) => {
    const { t } = useLocalization();

    if (status === 'normal') return null;

    const iconColor = status === 'nearing' ? 'text-yellow-500' : 'text-red-600';
    const tooltipText = status === 'nearing' ? t('nearingHarvest') : t('overdueHarvest');

    return (
        <div className="relative group flex justify-center">
            <Icon name="AlertTriangle" className={`w-5 h-5 ${iconColor}`} />
            <span className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {tooltipText}
            </span>
        </div>
    );
};

interface CultivationCycleListProps {
    initialFilters?: {
        siteId?: string;
        seaweedTypeId?: string;
    };
    pageTitle?: string;
}

export const CultivationCycleList: React.FC<CultivationCycleListProps> = ({ initialFilters, pageTitle }) => {
    const { t, language } = useLocalization();
    const { cultivationCycles, modules, seaweedTypes, farmers, sites, periodicTests, updateCultivationCycle, deleteCultivationCycle, incidentTypes } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCycle, setEditingCycle] = useState<CultivationCycle | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'module.code', direction: 'ascending' });
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedCycleInfo, setSelectedCycleInfo] = useState<FullCycleInfo | null>(null);
    const [isHarvestConfirmOpen, setIsHarvestConfirmOpen] = useState(false);
    const [cycleToHarvest, setCycleToHarvest] = useState<FullCycleInfo | null>(null);
    const [harvestDetails, setHarvestDetails] = useState({ date: '', notes: '', linesHarvested: '', harvestedWeight: '', cuttingsWeight: '' });
    const [customHarvestNote, setCustomHarvestNote] = useState('');
    const [filters, setFilters] = useState({ 
        siteId: initialFilters?.siteId || 'all', 
        seaweedTypeId: initialFilters?.seaweedTypeId || 'all' 
    });
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightedId = searchParams.get('highlight');
    const rowRefs = useRef<Map<string, HTMLTableRowElement | null>>(new Map());
    const [predictions, setPredictions] = useState<Record<string, { result?: PredictionResult | null; isLoading: boolean; error?: string | null }>>({});
    const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

    const { settings } = useSettings();

    useEffect(() => {
        if (highlightedId) {
            setExpandedCycleId(highlightedId);
            const ref = rowRefs.current.get(highlightedId);
            if (ref) {
                ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ref.classList.add('highlight-row');
                setTimeout(() => {
                    ref.classList.remove('highlight-row');
                }, 2000);
            }
            // Clear param after use
            setSearchParams({}, { replace: true });
        }
    }, [highlightedId, setSearchParams]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [key]: value}));
    };

    const clearFilters = useCallback(() => {
        setFilters({ 
            siteId: initialFilters?.siteId || 'all',
            seaweedTypeId: initialFilters?.seaweedTypeId || 'all'
        });
    }, [initialFilters]);

    const fullCycleInfo = useMemo((): FullCycleInfo[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let data = cultivationCycles.map(cycle => {
            let alertStatus: AlertStatus = 'normal';

            const plantingDate = new Date(cycle.plantingDate);
            plantingDate.setHours(0, 0, 0, 0);

            const endDate = cycle.harvestDate ? new Date(cycle.harvestDate) : today;
            endDate.setHours(0, 0, 0, 0);

            const age = Math.ceil((endDate.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

            if (cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING) {
                const daysSincePlanting = (today.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSincePlanting > CYCLE_DURATION_DAYS) {
                    alertStatus = 'overdue';
                } else if (daysSincePlanting > CYCLE_DURATION_DAYS - NEARING_HARVEST_DAYS) {
                    alertStatus = 'nearing';
                }
            }
            
            let growthRate: number | undefined = undefined;
            if (cycle.harvestDate && cycle.plantingDate && cycle.harvestedWeight && cycle.initialWeight && cycle.harvestedWeight > 0 && cycle.initialWeight > 0) {
                const harvestDate = new Date(cycle.harvestDate);
            
                const durationInMs = harvestDate.getTime() - new Date(cycle.plantingDate).getTime();
                const durationInDays = durationInMs / (1000 * 60 * 60 * 24);
                
                const sgr = calculateSGR(cycle.initialWeight, cycle.harvestedWeight, durationInDays);
                if (sgr !== null) {
                    growthRate = sgr;
                }
            }

            const module = modules.find(m => m.id === cycle.moduleId);
            const farmer = module ? farmers.find(f => f.id === module.farmerId) : undefined;

            return {
                cycle,
                module,
                seaweedType: seaweedTypes.find(st => st.id === cycle.seaweedTypeId),
                farmer,
                alertStatus,
                growthRate,
                age,
            };
        });

        if (filters.siteId !== 'all') {
            data = data.filter(item => item.module?.siteId === filters.siteId);
        }
        if (filters.seaweedTypeId !== 'all') {
            data = data.filter(item => item.cycle.seaweedTypeId === filters.seaweedTypeId);
        }

        data.sort((a, b) => {
            const getVal = (item: FullCycleInfo, key: string) => {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    return item[key as keyof FullCycleInfo];
                }
                if (Object.prototype.hasOwnProperty.call(item.cycle, key)) {
                    return item.cycle[key as keyof CultivationCycle];
                }
                const keys = key.split('.');
                let val: any = item;
                for (const k of keys) {
                    if (val === undefined || val === null) return undefined;
                    val = val[k];
                }
                return val;
            };
            
            const valA = getVal(a, sortConfig.key);
            const valB = getVal(b, sortConfig.key);
            
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return data;
    }, [cultivationCycles, modules, seaweedTypes, farmers, sortConfig, filters]);
    
    const handlePredict = useCallback(async (info: FullCycleInfo) => {
        const cycleId = info.cycle.id;
        setPredictions(prev => ({ ...prev, [cycleId]: { isLoading: true, error: null, result: null } }));

        const historicalCycles = cultivationCycles.filter(c => 
            c.seaweedTypeId === info.cycle.seaweedTypeId &&
            c.id !== cycleId &&
            c.harvestDate
        );

        const weatherData = periodicTests.filter(t => 
            t.siteId === info.module?.siteId
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (!info.module || !info.seaweedType) {
            setPredictions(prev => ({ ...prev, [cycleId]: { result: null, isLoading: false, error: t('predictionError') } }));
            return;
        }

        try {
            const result = await generateHarvestPrediction(
                info.cycle,
                info.module,
                info.seaweedType,
                historicalCycles,
                weatherData,
                language as 'en' | 'fr'
            );

            if (result) {
                setPredictions(prev => ({ ...prev, [cycleId]: { result, isLoading: false, error: null } }));
            } else {
                setPredictions(prev => ({ ...prev, [cycleId]: { result: null, isLoading: false, error: t('predictionError') } }));
            }
        } catch (error) {
            console.error("Prediction failed unexpectedly:", error);
            setPredictions(prev => ({ ...prev, [cycleId]: { result: null, isLoading: false, error: t('predictionError') } }));
        }
    }, [cultivationCycles, periodicTests, language, t]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };
    
    const handleOpenEditModal = (cycle: CultivationCycle | null = null) => {
        setEditingCycle(cycle);
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCycle(null);
        setIsEditModalOpen(false);
        setIsAddModalOpen(false);
    };

    const handleDeleteClick = (cycleId: string) => {
        setCycleToDelete(cycleId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (cycleToDelete) {
            deleteCultivationCycle(cycleToDelete);
        }
        setIsConfirmOpen(false);
        setCycleToDelete(null);
    };
    
    const handleHistoryClick = (info: FullCycleInfo) => {
        setSelectedCycleInfo(info);
        setIsHistoryModalOpen(true);
    };

    const handleSave = (cycleData: CultivationCycle) => {
        updateCultivationCycle(cycleData);
        handleCloseModal();
    };
    
    const handleExportExcel = async () => {
        const dataToExport = fullCycleInfo.map(info => ({
            moduleCode: info.module?.code || t('unknown'),
            farmerName: info.farmer ? `${info.farmer.firstName} ${info.farmer.lastName}` : t('unknown'),
            seaweedType: info.seaweedType?.name || t('unknown'),
            plantingDate: info.cycle.plantingDate,
            initialWeight: info.cycle.initialWeight || 0,
            linesPlanted: info.cycle.linesPlanted || info.module?.lines || 0,
            age: info.age,
            status: t(`status_${info.cycle.status}` as any),
            harvestDate: info.cycle.harvestDate || '-',
            harvestedWeight: info.cycle.harvestedWeight || 0,
            cuttingsWeight: info.cycle.cuttingsTakenAtHarvestKg || 0,
            netWeight: (info.cycle.harvestedWeight || 0) - (info.cycle.cuttingsTakenAtHarvestKg || 0),
            linesHarvested: info.cycle.linesHarvested || 0,
            growthRate: info.growthRate ? `${info.growthRate.toFixed(2)}%` : '-',
            notes: info.cycle.processingNotes || ''
        }));

        const columns = [
            { header: t('moduleCode'), key: 'moduleCode', width: 15 },
            { header: t('farmer'), key: 'farmerName', width: 20 },
            { header: t('seaweedType'), key: 'seaweedType', width: 15 },
            { header: t('plantingDate'), key: 'plantingDate', width: 15 },
            { header: `${t('initialWeight')} (Kg)`, key: 'initialWeight', width: 15 },
            { header: t('linesPlanted'), key: 'linesPlanted', width: 15 },
            { header: t('ageInDays'), key: 'age', width: 10 },
            { header: t('status'), key: 'status', width: 15 },
            { header: t('harvestDate'), key: 'harvestDate', width: 15 },
            { header: `${t('harvestedWeight')} (Kg)`, key: 'harvestedWeight', width: 15 },
            { header: `${t('cuttingsWeightKg')} (Kg)`, key: 'cuttingsWeight', width: 15 },
            { header: `${t('wetProduction')} (Kg)`, key: 'netWeight', width: 15 },
            { header: t('linesHarvested'), key: 'linesHarvested', width: 15 },
            { header: t('growthRate'), key: 'growthRate', width: 15 },
            { header: t('notes'), key: 'notes', width: 30 },
        ];

        await exportDataToExcel(dataToExport, columns, `CultivationCycles_${new Date().toISOString().split('T')[0]}`, 'Cultivation Cycles');
    };

    const handleHarvestClick = (cycleInfo: FullCycleInfo) => {
        setCycleToHarvest(cycleInfo);
        
        let defaultDate = new Date().toISOString().split('T')[0];
        if (cycleInfo.cycle.plantingDate) {
             const pDate = new Date(cycleInfo.cycle.plantingDate);
             const targetDate = new Date(pDate);
             targetDate.setDate(pDate.getDate() + CYCLE_DURATION_DAYS);
             defaultDate = targetDate.toISOString().split('T')[0];
        }

        setHarvestDetails({
            date: defaultDate,
            notes: 'Harvest for maturity',
            linesHarvested: String(cycleInfo.cycle.linesPlanted || cycleInfo.module?.lines || ''),
            harvestedWeight: '',
            cuttingsWeight: '',
        });
        setCustomHarvestNote('');
        setIsHarvestConfirmOpen(true);
    };

    const handleConfirmHarvest = () => {
        const isOther = harvestDetails.notes === 'Other';
        const harvestedWeightNum = parseFloat(harvestDetails.harvestedWeight);
        const cuttingsWeightNum = parseFloat(harvestDetails.cuttingsWeight);

        if (cycleToHarvest && harvestDetails.date && 
            (!isOther || customHarvestNote.trim()) && 
            harvestDetails.linesHarvested && 
            !isNaN(harvestedWeightNum) && harvestedWeightNum > 0 &&
            harvestDetails.cuttingsWeight !== '' && !isNaN(cuttingsWeightNum) && cuttingsWeightNum >= 0
        ) {
            const finalNote = isOther ? customHarvestNote : harvestDetails.notes;
            updateCultivationCycle({
                ...cycleToHarvest.cycle,
                status: ModuleStatus.HARVESTED,
                harvestDate: harvestDetails.date,
                processingNotes: finalNote,
                linesHarvested: Number(harvestDetails.linesHarvested),
                harvestedWeight: harvestedWeightNum,
                cuttingsTakenAtHarvestKg: cuttingsWeightNum,
            });
            setIsHarvestConfirmOpen(false);
            setCycleToHarvest(null);
        }
    };

    const SortableHeader: React.FC<{ sortKey: string; label: string; className?: string }> = ({ sortKey, label, className = '' }) => (
        <th className={`p-3 ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full whitespace-nowrap ${className.includes('text-right') ? 'justify-end' : ''}`}>
                {label} {getSortIcon(sortKey)}
            </button>
        </th>
    );
    
    const harvestedWeightNum = parseFloat(harvestDetails.harvestedWeight) || 0;
    const cuttingsWeightNum = parseFloat(harvestDetails.cuttingsWeight) || 0;
    const netWeight = harvestedWeightNum - cuttingsWeightNum;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{pageTitle || t('cultivationCycleManagementTitle')}</h1>
                <div className="flex gap-2">
                     <Button variant="secondary" onClick={handleExportExcel}>
                        <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2"/>{t('exportExcel')}
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)}><Icon name="PlusCircle" className="w-5 h-5"/>{t('addCycle')}</Button>
                </div>
            </div>

            <Card className="mb-6" title={t('filtersTitle')}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)} disabled={!!initialFilters?.siteId}>
                        <option value="all">{t('allSites')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('seaweedType')} value={filters.seaweedTypeId} onChange={e => handleFilterChange('seaweedTypeId', e.target.value)} disabled={!!initialFilters?.seaweedTypeId}>
                        <option value="all">{t('allSeaweedTypes')}</option>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                    <Button variant="secondary" onClick={clearFilters} className="h-[42px] w-full">{t('clearFilters')}</Button>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="p-3 w-12"></th>
                                <th className="p-3 w-16 text-center">{t('alerts')}</th>
                                <SortableHeader sortKey="module.code" label={t('module')} />
                                <SortableHeader sortKey="farmer.firstName" label={t('farmer')} />
                                <SortableHeader sortKey="seaweedType.name" label={t('seaweedType')} />
                                <SortableHeader sortKey="plantingDate" label={t('plantingDate')} />
                                <SortableHeader sortKey="age" label={t('ageInDays')} className="text-right" />
                                <SortableHeader sortKey="harvestDate" label={t('harvestDate')} />
                                <SortableHeader sortKey="status" label={t('status')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullCycleInfo.map((fullInfo) => {
                                const { cycle, module, seaweedType, farmer, alertStatus, age } = fullInfo;
                                const isExpanded = expandedCycleId === cycle.id;
                                return (
                                <React.Fragment key={cycle.id}>
                                <tr
                                  ref={el => {
                                      if (el) {
                                          rowRefs.current.set(cycle.id, el);
                                      } else {
                                          rowRefs.current.delete(cycle.id);
                                      }
                                  }}
                                  className={`border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 ${cycle.id === highlightedId ? 'highlight-row' : ''}`}
                                >
                                    <td className="p-3 text-center">
                                        <Button
                                            variant="ghost"
                                            className="p-1 !rounded-full"
                                            onClick={() => setExpandedCycleId(isExpanded ? null : cycle.id)}
                                            aria-expanded={isExpanded}
                                            aria-controls={`details-${cycle.id}`}
                                        >
                                            <Icon name="ChevronRight" className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        </Button>
                                    </td>
                                    <td className="p-3 text-center">
                                        <AlertIndicator status={alertStatus} />
                                    </td>
                                    <td className="p-3 font-mono font-semibold whitespace-nowrap">{module?.code || t('unknown')}</td>
                                    <td className="p-3 whitespace-nowrap">{farmer ? `${farmer.firstName} ${farmer.lastName}` : t('unknown')}</td>
                                    <td className="p-3 whitespace-nowrap">{seaweedType?.name || t('unknown')}</td>
                                    <td className="p-3 whitespace-nowrap">{cycle.plantingDate}</td>
                                    <td className="p-3 text-right font-semibold">
                                        {age >= 50 ? (
                                            <Tooltip content={t('exactAge').replace('{days}', String(age))}>
                                                <span className="cursor-help border-b border-dotted">+50</span>
                                            </Tooltip>
                                        ) : (
                                            age
                                        )}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">{cycle.harvestDate || '-'}</td>
                                    <td className="p-3">
                                        <StatusBadge status={cycle.status} />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            { (cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING) && (
                                                <Button variant="primary" onClick={() => handleHarvestClick(fullInfo)}>
                                                    <Icon name="Scissors" className="w-4 h-4" />{t('harvest')}
                                                </Button>
                                            )}
                                            <Button variant="ghost" onClick={() => handleHistoryClick(fullInfo)}>
                                                <Icon name="FileText" className="w-4 h-4" />{t('history')}
                                            </Button>
                                            <Button variant="ghost" onClick={() => handleOpenEditModal(cycle)}><Icon name="Settings" className="w-4 h-4" /></Button>
                                            <Button variant="danger" onClick={() => handleDeleteClick(cycle.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr id={`details-${cycle.id}`}>
                                        <td colSpan={10} className="p-0">
                                            <ExpandedCycleDetails info={fullInfo} prediction={predictions[cycle.id] || { isLoading: false, error: null, result: null }} onPredict={() => handlePredict(fullInfo)} />
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {isAddModalOpen && <PlantingFormModal isOpen={isAddModalOpen} onClose={handleCloseModal} />}
            {isEditModalOpen && <EditCultivationCycleFormModal isOpen={isEditModalOpen} onClose={handleCloseModal} onSave={handleSave} cycle={editingCycle} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteCycle')} />}
            {isHistoryModalOpen && selectedCycleInfo && selectedCycleInfo.module && <CultivationCycleHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} cycle={selectedCycleInfo.cycle} module={selectedCycleInfo.module} />}
            
            {isHarvestConfirmOpen && cycleToHarvest && (
                <ConfirmationModal
                    isOpen={isHarvestConfirmOpen}
                    onClose={() => setIsHarvestConfirmOpen(false)}
                    onConfirm={handleConfirmHarvest}
                    title={`${t('confirmHarvestTitle')}: ${cycleToHarvest.module?.code}`}
                    message={
                        <div className="space-y-4 text-left">
                            <p>{t('confirmHarvestMessage')}</p>
                            <Input label={t('harvestDate')} type="date" value={harvestDetails.date} onChange={e => setHarvestDetails(p => ({...p, date: e.target.value}))} />
                            <Input label={t('harvestedWeightKg')} type="number" value={harvestDetails.harvestedWeight} onChange={e => setHarvestDetails(p => ({...p, harvestedWeight: e.target.value}))} />
                            <Input label={t('cuttingsWeightKg')} type="number" value={harvestDetails.cuttingsWeight} onChange={e => setHarvestDetails(p => ({...p, cuttingsWeight: e.target.value}))} />
                            <Input label={t('wetProduction')} type="text" value={`${netWeight.toFixed(2)} kg`} disabled />
                            <Input label={t('linesHarvested')} type="number" value={harvestDetails.linesHarvested} onChange={e => setHarvestDetails(p => ({...p, linesHarvested: e.target.value}))} />
                            <Select label={t('harvestReason')} value={harvestDetails.notes} onChange={e => setHarvestDetails(p => ({...p, notes: e.target.value}))}>
                                <option value="Harvest for maturity">{t('harvestReason_maturity')}</option>
                                {incidentTypes.map(reason => <option key={reason.id} value={reason.name}>{reason.name}</option>)}
                                <option value="Other">{t('other')}</option>
                            </Select>
                            {harvestDetails.notes === 'Other' && (
                                <Input 
                                    label={t('other')}
                                    value={customHarvestNote}
                                    onChange={e => setCustomHarvestNote(e.target.value)}
                                    error={!customHarvestNote.trim() ? t('validationReasonRequired') : ''}
                                    placeholder={t('otherReasonPlaceholder')}
                                />
                            )}
                        </div>
                    }
                    confirmText={t('harvest')}
                    confirmDisabled={!harvestDetails.date || !harvestDetails.harvestedWeight || !harvestDetails.linesHarvested || !harvestDetails.cuttingsWeight || (harvestDetails.notes === 'Other' && !customHarvestNote.trim())}
                />
            )}
        </div>
    );
};

const ExpandedCycleDetails: React.FC<{
    info: FullCycleInfo,
    prediction: { result?: PredictionResult | null; isLoading: boolean; error?: string | null },
    onPredict: () => void,
}> = ({ info, prediction, onPredict }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { cycle, growthRate } = info;
    const isOngoing = cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING;

    const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('performance')}</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <DetailItem label={t('initialWeight')} value={`${cycle.initialWeight} kg`} />
                        <DetailItem label={t('linesPlanted')} value={cycle.linesPlanted || '-'} />
                        <DetailItem label={t('harvestedWeight')} value={cycle.harvestedWeight ? `${cycle.harvestedWeight} kg` : '-'} />
                        <DetailItem label={t('linesHarvested')} value={cycle.linesHarvested || '-'} />
                        {growthRate !== undefined && (
                            <DetailItem label={`${t('growthRate')} (SGR)`} value={`${formatNumber(growthRate, { ...settings.localization, nonMonetaryDecimals: 2 })}% / day`} />
                        )}
                    </div>
                </div>
                {cycle.processingNotes && (
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('notes')}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-800 rounded">{cycle.processingNotes}</p>
                    </div>
                )}
            </div>
            <div className="md:col-span-1">
                {isOngoing && (
                    <Card>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('aiPrediction')}</h4>
                        {prediction.isLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Icon name="Activity" className="animate-spin w-6 h-6 text-gray-500" />
                            </div>
                        ) : prediction.error ? (
                            <div className="text-center">
                                <p className="text-sm text-red-500 mb-2">{prediction.error}</p>
                                <Button onClick={onPredict} className="!px-2 !py-1 text-sm">
                                    <Icon name="AlertTriangle" className="w-4 h-4 mr-1"/>
                                    {t('retry')}
                                </Button>
                            </div>
                        ) : prediction.result ? (
                             <div className="space-y-2">
                                <DetailItem label={t('predictedHarvest')} value={`${prediction.result.predictedHarvestDateStart} → ${prediction.result.predictedHarvestDateEnd}`} />
                                <DetailItem label={t('predictedYieldKg')} value={`${formatNumber(prediction.result.predictedYieldKgMin, { ...settings.localization, nonMonetaryDecimals: 0 })} - ${formatNumber(prediction.result.predictedYieldKgMax, { ...settings.localization, nonMonetaryDecimals: 0 })} kg`} />
                                <DetailItem label={t('confidence')} value={
                                    <Tooltip content={<div className="max-w-xs">{prediction.result.reasoning}</div>}>
                                        <span className="font-semibold cursor-help border-b border-dotted">
                                            {(prediction.result.confidenceScore * 100).toFixed(0)}%
                                        </span>
                                    </Tooltip>
                                } />
                            </div>
                        ) : (
                             <Button onClick={onPredict} className="w-full">
                                <Icon name="Bot" className="w-5 h-5"/>
                                {t('predict')}
                            </Button>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

const EditCultivationCycleFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (cycleData: CultivationCycle) => void;
    cycle: CultivationCycle | null;
}> = ({ isOpen, onClose, onSave, cycle }) => {
    const { t } = useLocalization();
    const { modules, seaweedTypes } = useData();
    const [formData, setFormData] = useState({ moduleId: '', seaweedTypeId: '', plantingDate: '', initialWeight: '', status: ModuleStatus.PLANTED });

    useEffect(() => {
        if (cycle) {
            setFormData({
                moduleId: cycle.moduleId,
                seaweedTypeId: cycle.seaweedTypeId,
                plantingDate: cycle.plantingDate,
                initialWeight: String(cycle.initialWeight),
                status: cycle.status,
            });
        }
    }, [cycle]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(p => ({ ...p, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (cycle) {
            onSave({
                ...cycle,
                ...formData,
                initialWeight: parseFloat(formData.initialWeight)
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editCycle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label={t('module')} value={formData.moduleId} onChange={e => handleChange('moduleId', e.target.value)} required disabled>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}
                </Select>
                <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => handleChange('seaweedTypeId', e.target.value)} required>
                    {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </Select>
                <Input label={t('plantingDate')} type="date" value={formData.plantingDate} onChange={e => handleChange('plantingDate', e.target.value)} required />
                <Input label={t('initialWeight')} type="number" value={formData.initialWeight} onChange={e => handleChange('initialWeight', e.target.value)} required />
                <Select label={t('status')} value={formData.status} onChange={e => handleChange('status', e.target.value as ModuleStatus)} required>
                    {/* FIX: Corrected a typo where the translation function `t` was being called as a string method `t()`. */}
                    {Object.values(ModuleStatus).map(s => <option key={s} value={s}>{t(`status_${s}` as any)}</option>)}
                </Select>
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit">{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};
