
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { CultivationCycle, Module, SeaweedType, StockMovement } from '../types';
import { ModuleStatus, StockMovementType } from '../types';
import Checkbox from '../components/ui/Checkbox';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useSettings } from '../contexts/SettingsContext';
import { formatNumber } from '../utils/formatters';
import PrintableQRLabel from '../components/PrintableQRLabel';

interface BaggingInfo {
    cycle: CultivationCycle;
    module?: Module;
    seaweedType?: SeaweedType;
    dryingDuration: number;
}

const BaleWeightInputs: React.FC<{
    weights: number[];
    onChange: (weights: number[]) => void;
}> = ({ weights, onChange }) => {
    const { t } = useLocalization();
    const [inputs, setInputs] = useState<string[]>([]);
    
    useEffect(() => {
        const newInputs = [...weights.map(String)];
        const setsOfTen = Math.max(1, Math.ceil((newInputs.length + 1) / 10));
        const requiredLength = setsOfTen * 10;
        while (newInputs.length < requiredLength) {
            newInputs.push('');
        }
        setInputs(newInputs);
    }, [weights]);

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputs];
        newInputs[index] = value;
        
        if (index === newInputs.length - 1 && value.trim() !== '') {
            for (let i = 0; i < 10; i++) newInputs.push('');
        }
        
        setInputs(newInputs);
        
        const numericWeights = newInputs
            .map(w => parseFloat(w))
            .filter(w => !isNaN(w) && w > 0);
        onChange(numericWeights);
    };

    return (
        <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bagWeights')}</label>
            <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                {inputs.map((weight, index) => (
                    <Input
                        key={index}
                        type="number"
                        step="any"
                        placeholder={`${t('bag')} ${index + 1}`}
                        value={weight}
                        onChange={e => handleInputChange(index, e.target.value)}
                    />
                ))}
            </div>
        </div>
    );
};


const BaggingPage: React.FC = () => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { cultivationCycles, modules, seaweedTypes, sites, updateCultivationCycle, updateMultipleCultivationCycles, addMultipleStockMovements } = useData();
    
    const [filters, setFilters] = useState({ siteId: 'all', seaweedTypeId: 'all' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'module.code', direction: 'ascending' });

    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [selectedCycleInfo, setSelectedCycleInfo] = useState<BaggingInfo | null>(null);
    const [completionDetails, setCompletionDetails] = useState({ baggedDate: '' });
    const [baleWeights, setBaleWeights] = useState<number[]>([]);
    const [selectedCycles, setSelectedCycles] = useState<string[]>([]);
    const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<Record<string,string>>({});
    const [qrDataToPrint, setQrDataToPrint] = useState<{data: any, title: string, subtitle: string} | null>(null);

    const calculatedTotals = useMemo(() => ({
        totalWeightKg: baleWeights.reduce((sum, w) => sum + w, 0),
        totalBags: baleWeights.length,
    }), [baleWeights]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [key]: value}));
    };

    const clearFilters = useCallback(() => {
        setFilters({ siteId: 'all', seaweedTypeId: 'all' });
    }, []);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        const today = new Date();
        today.setHours(23, 59, 59, 999);
    
        if (!completionDetails.baggedDate) {
            newErrors.baggedDate = t('validationRequired');
        } else {
            if (new Date(completionDetails.baggedDate) > today) {
                newErrors.baggedDate = t('validationFutureDate');
            }
        }

        if (calculatedTotals.totalBags === 0) {
            newErrors.bagWeights = t('validationAtLeastOneRequired');
        }
        return newErrors;
    }, [completionDetails, calculatedTotals, t]);

    useEffect(() => {
        if (isCompletionModalOpen) {
            setErrors(validate());
        }
    }, [isCompletionModalOpen, validate, completionDetails, calculatedTotals]);

    const baggingInfoList = useMemo((): BaggingInfo[] => {
        let data = cultivationCycles
            .filter(c => c.status === ModuleStatus.BAGGING)
            .map(cycle => {
                const module = modules.find(m => m.id === cycle.moduleId);
                
                let dryingDuration = 0;
                if (cycle.dryingStartDate && cycle.dryingCompletionDate) {
                    const startDate = new Date(cycle.dryingStartDate);
                    const endDate = new Date(cycle.dryingCompletionDate);
                    dryingDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                }
                
                return {
                    cycle,
                    module,
                    seaweedType: seaweedTypes.find(st => st.id === cycle.seaweedTypeId),
                    dryingDuration,
                };
            });

        if (filters.siteId !== 'all') {
            data = data.filter(item => item.module?.siteId === filters.siteId);
        }
        if (filters.seaweedTypeId !== 'all') {
            data = data.filter(item => item.cycle.seaweedTypeId === filters.seaweedTypeId);
        }

        data.sort((a, b) => {
            const getVal = (item: BaggingInfo, key: string) => {
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
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return data;
    }, [cultivationCycles, modules, seaweedTypes, filters, sortConfig]);

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
    
    const SortableHeader: React.FC<{ sortKey: string; label: string; className?: string }> = ({ sortKey, label, className = '' }) => (
        <th className={`p-3 ${className}`}>
            
            <button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className.includes('text-right') ? 'justify-end' : ''}`}>
                {label} {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const handleCompleteBaggingClick = useCallback((info: BaggingInfo) => {
        setSelectedCycleInfo(info);
        setCompletionDetails({ baggedDate: info.cycle.baggingStartDate || new Date().toISOString().split('T')[0] });
        setBaleWeights([]);
        setIsCompletionModalOpen(true);
    }, []);

    const handleConfirmCompletion = () => {
        const validationErrors = validate();
        if(Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        if (selectedCycleInfo) {
            const updatedCycle: CultivationCycle = {
                ...selectedCycleInfo.cycle,
                status: ModuleStatus.BAGGED,
                baggedDate: completionDetails.baggedDate,
                baggedBagsCount: calculatedTotals.totalBags,
                baggedWeightKg: calculatedTotals.totalWeightKg,
                bagWeights: baleWeights
            };
            updateCultivationCycle(updatedCycle);
            setIsCompletionModalOpen(false);
            setSelectedCycleInfo(null);
        }
    };
    
    const handleConfirmBatch = () => {
        const today = new Date().toISOString().split('T')[0];
        const cyclesToUpdate = cultivationCycles.filter(c => selectedCycles.includes(c.id)).map(cycle => ({
            ...cycle,
            status: ModuleStatus.BAGGED,
            baggedDate: today,
            // Assuming default weights for batch processing. This is a simplification.
            baggedBagsCount: Math.ceil((cycle.actualDryWeightKg || 0) / 25), 
            baggedWeightKg: cycle.actualDryWeightKg,
        }));

        const movementsToAdd: Omit<StockMovement, 'id'>[] = cyclesToUpdate.map(cycle => {
            const module = modules.find(m => m.id === cycle.moduleId);
            return {
                date: today,
                siteId: module?.siteId || '',
                seaweedTypeId: cycle.seaweedTypeId,
                type: StockMovementType.BAGGING_TRANSFER,
                designation: `From Batch Bagging (Module ${module?.code})`,
                inKg: cycle.baggedWeightKg,
                inBags: cycle.baggedBagsCount,
                relatedId: cycle.id
            }
        });

        updateMultipleCultivationCycles(cyclesToUpdate);
        addMultipleStockMovements(movementsToAdd);

        alert(t('batchBaggingCompleteSuccess'));
        setSelectedCycles([]);
        setIsBatchConfirmOpen(false);
    };

    const handlePrintQR = (info: BaggingInfo) => {
         setQrDataToPrint({
            data: { t: 'b', id: info.cycle.id },
            title: `BATCH: ${info.module?.code}`,
            subtitle: `${info.seaweedType?.name} - ${new Date(info.cycle.plantingDate).toLocaleDateString()}`
        });
    }

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numSelected = selectedCycles.length;
            const numVisible = baggingInfoList.length;
            selectAllCheckboxRef.current.checked = numSelected === numVisible && numVisible > 0;
            selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numVisible;
        }
    }, [selectedCycles, baggingInfoList]);

    const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCycles(baggingInfoList.map(info => info.cycle.id));
        } else {
            setSelectedCycles([]);
        }
    }, [baggingInfoList]);

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, cycleId: string) => {
        if (e.target.checked) {
            setSelectedCycles(prev => [...prev, cycleId]);
        } else {
            setSelectedCycles(prev => prev.filter(id => id !== cycleId));
        }
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('baggingManagementTitle')}</h1>
            <Card className="mb-6" title={t('filtersTitle')}>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)}>
                        <option value="all">{t('allSites')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('seaweedType')} value={filters.seaweedTypeId} onChange={e => handleFilterChange('seaweedTypeId', e.target.value)}>
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
                                <th className="p-3 w-4"><Checkbox ref={selectAllCheckboxRef} onChange={handleSelectAll} /></th>
                                <SortableHeader sortKey="module.code" label={t('module')} />
                                <SortableHeader sortKey="seaweedType.name" label={t('seaweedType')} />
                                <SortableHeader sortKey="cycle.dryingCompletionDate" label={t('dryingCompletionDate')} />
                                <SortableHeader sortKey="cycle.baggingStartDate" label={t('baggingStartDate')} />
                                <SortableHeader sortKey="cycle.actualDryWeightKg" label={t('dryWeightToBag')} className="text-right"/>
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                             {baggingInfoList.map((info) => (
                                <tr key={info.cycle.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3"><Checkbox checked={selectedCycles.includes(info.cycle.id)} onChange={e => handleSelectOne(e, info.cycle.id)} aria-label={t('selectBatch').replace('{code}', info.module?.code || '')}/></td>
                                    <td className="p-3 font-mono font-semibold">{info.module?.code || t('unknown')}</td>
                                    <td className="p-3">{info.seaweedType?.name || t('unknown')}</td>
                                    <td className="p-3">{info.cycle.dryingCompletionDate}</td>
                                    <td className="p-3">{info.cycle.baggingStartDate}</td>
                                    <td className="p-3 text-right">{formatNumber(info.cycle.actualDryWeightKg || 0, settings.localization)}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => handlePrintQR(info)} title={t('print')}>
                                                <Icon name="QrCode" className="w-4 h-4" />
                                            </Button>
                                            <Button variant="primary" onClick={() => handleCompleteBaggingClick(info)}>
                                                <Icon name="Archive" className="w-4 h-4" />{t('completeBagging')}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {baggingInfoList.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center p-6 text-gray-500 dark:text-gray-400">
                                        {t('noBatchesBagging')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {selectedCycles.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 z-20 md:ml-16">
                    <span className="font-semibold">{t('itemsSelected').replace('{count}', String(selectedCycles.length))}</span>
                    <Button onClick={() => setIsBatchConfirmOpen(true)}>
                        <Icon name="Archive" className="w-4 h-4" />
                        {t('completeSelectedBatches').replace('{count}', String(selectedCycles.length))}
                    </Button>
                </div>
            )}
            
            {isCompletionModalOpen && selectedCycleInfo && (() => {
                const totalDryWeight = selectedCycleInfo.cycle.actualDryWeightKg || 0;
                const remainingWeight = totalDryWeight - calculatedTotals.totalWeightKg;

                return (
                 <Modal
                    isOpen={isCompletionModalOpen}
                    onClose={() => setIsCompletionModalOpen(false)}
                    title={`${t('completeBaggingFor')} ${selectedCycleInfo.module?.code}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setIsCompletionModalOpen(false)}>{t('cancel')}</Button>
                            <Button variant="primary" onClick={handleConfirmCompletion} disabled={isFormInvalid}>{t('confirmAndMoveToStock')}</Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <Input
                            label={t('baggedDate')}
                            type="date"
                            value={completionDetails.baggedDate}
                            onChange={e => setCompletionDetails(p => ({...p, baggedDate: e.target.value}))}
                            error={errors.baggedDate}
                            required
                        />
                        <Input
                            label={t('weightToBag')}
                            type="text"
                            value={`${formatNumber(remainingWeight, settings.localization)} / ${formatNumber(totalDryWeight, settings.localization)} kg`}
                            disabled
                            containerClassName={`transition-colors rounded-md ${remainingWeight < 0 ? 'bg-red-100 dark:bg-red-900/50' : ''}`}
                        />
                        <BaleWeightInputs weights={baleWeights} onChange={setBaleWeights} />
                        {errors.bagWeights && <p className="text-xs text-red-600 dark:text-red-400">{errors.bagWeights}</p>}
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-semibold text-lg">
                            {t('totalBaggedWeightKg')}: {calculatedTotals.totalWeightKg.toFixed(2)} kg ({calculatedTotals.totalBags} {t('bags')})
                        </div>
                    </div>
                </Modal>
            )})()}

            {isBatchConfirmOpen && (
                <ConfirmationModal
                    isOpen={isBatchConfirmOpen}
                    onClose={() => setIsBatchConfirmOpen(false)}
                    onConfirm={handleConfirmBatch}
                    title={t('confirmBatchBaggingTitle')}
                    message={t('confirmBatchBaggingMessage').replace('{count}', String(selectedCycles.length)).replace('{date}', new Date().toLocaleDateString(language))}
                    confirmText={t('confirm')}
                />
            )}

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

export default BaggingPage;
