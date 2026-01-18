
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import type { CultivationCycle, Module, SeaweedType, Farmer, PredictionResult } from '../types';
import { ModuleStatus } from '../types';
import CultivationCycleHistoryModal from '../components/CultivationCycleHistoryModal';
import { CYCLE_DURATION_DAYS, NEARING_HARVEST_DAYS } from '../constants';
import StatusBadge from '../components/ui/StatusBadge';
import { generateHarvestPrediction } from '../services/geminiService';
import Tooltip from '../components/ui/Tooltip';
import { formatNumber } from '../utils/formatters';
import PlantingFormModal from '../components/PlantingFormModal';
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
    }, [cultivationCycles, periodicTests, language, t, modules, seaweedTypes]);

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
                                <th className="p-3 w-16 text-center