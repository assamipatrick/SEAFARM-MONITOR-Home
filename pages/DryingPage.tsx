
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { CultivationCycle, Module, SeaweedType } from '../types';
import { ModuleStatus } from '../types';
import { formatNumber } from '../utils/formatters';
import { useSettings } from '../contexts/SettingsContext';

interface DryingInfo {
    cycle: CultivationCycle;
    module?: Module;
    seaweedType?: SeaweedType;
    dryingDuration: number;
    netHarvestedWeight: number;
}

const DryingPage: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { cultivationCycles, modules, seaweedTypes, sites, updateCultivationCycle } = useData();
    
    const [filters, setFilters] = useState({ siteId: 'all', seaweedTypeId: 'all' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'module.code', direction: 'ascending' });

    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [selectedCycleInfo, setSelectedCycleInfo] = useState<DryingInfo | null>(null);
    const [completionDetails, setCompletionDetails] = useState({ dryingCompletionDate: '', baggingStartDate: '', actualDryWeight: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [key]: value}));
    };

    const clearFilters = useCallback(() => {
        setFilters({ siteId: 'all', seaweedTypeId: 'all' });
    }, []);

    const dryingInfoList = useMemo((): DryingInfo[] => {
        let data = cultivationCycles
            .filter(c => c.status === ModuleStatus.DRYING)
            .map(cycle => {
                const module = modules.find(m => m.id === cycle.moduleId);
                
                let dryingDuration = 0;
                if (cycle.dryingStartDate) {
                    const startDate = new Date(cycle.dryingStartDate);
                    const endDate = new Date();
                    dryingDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                }

                // Calculate Net Harvested Weight (Gross - Cuttings)
                const netHarvestedWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);

                return {
                    cycle,
                    module,
                    seaweedType: seaweedTypes.find(st => st.id === cycle.seaweedTypeId),
                    dryingDuration,
                    netHarvestedWeight
                };
            });

        if (filters.siteId !== 'all') {
            data = data.filter(item => item.module?.siteId === filters.siteId);
        }
        if (filters.seaweedTypeId !== 'all') {
            data = data.filter(item => item.cycle.seaweedTypeId === filters.seaweedTypeId);
        }

        data.sort((a, b) => {
            const getVal = (item: DryingInfo, key: string) => {
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

    const handleCompleteDryingClick = useCallback((info: DryingInfo) => {
        setSelectedCycleInfo(info);
        
        let defaultCompletionDt = new Date(); // fallback to today
        if (info.cycle.dryingStartDate) {
            const startDate = new Date(info.cycle.dryingStartDate);
            startDate.setDate(startDate.getDate() + 5);
            defaultCompletionDt = startDate;
        }

        const completionDateString = defaultCompletionDt.toISOString().split('T')[0];

        setCompletionDetails({
            dryingCompletionDate: completionDateString,
            baggingStartDate: completionDateString,
            actualDryWeight: '',
        });
        setIsCompletionModalOpen(true);
    }, []);

    const validate = useCallback(() => {
        if (!selectedCycleInfo) return {};
    
        const newErrors: Record<string, string> = {};
        const today = new Date();
        today.setHours(23, 59, 59, 999);
    
        if (!completionDetails.dryingCompletionDate) {
            newErrors.dryingCompletionDate = t('validationRequired');
        } else {
            if (new Date(completionDetails.dryingCompletionDate) > today) {
                newErrors.dryingCompletionDate = t('validationFutureDate');
            }
            if (selectedCycleInfo.cycle.dryingStartDate && completionDetails.dryingCompletionDate < selectedCycleInfo.cycle.dryingStartDate) {
                newErrors.dryingCompletionDate = t('validationDryingCompletionDate');
            }
        }
    
        if (!completionDetails.baggingStartDate) {
            newErrors.baggingStartDate = t('validationRequired');
        } else {
            if (new Date(completionDetails.baggingStartDate) > today) {
                newErrors.baggingStartDate = t('validationFutureDate');
            }
            if (completionDetails.dryingCompletionDate && completionDetails.baggingStartDate < completionDetails.dryingCompletionDate) {
                newErrors.baggingStartDate = t('validationBaggingStartDate');
            }
        }

        if (!completionDetails.actualDryWeight || isNaN(parseFloat(completionDetails.actualDryWeight)) || parseFloat(completionDetails.actualDryWeight) <= 0) {
            newErrors.actualDryWeight = t('validationPositiveNumber');
        }
    
        return newErrors;
    }, [completionDetails, selectedCycleInfo, t]);

    useEffect(() => {
        if (isCompletionModalOpen) {
            setErrors(validate());
        }
    }, [completionDetails, isCompletionModalOpen, validate]);

    const handleConfirmCompletion = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        if (selectedCycleInfo && completionDetails.dryingCompletionDate && completionDetails.baggingStartDate) {
            updateCultivationCycle({
                ...selectedCycleInfo.cycle,
                status: ModuleStatus.BAGGING,
                dryingCompletionDate: completionDetails.dryingCompletionDate,
                baggingStartDate: completionDetails.baggingStartDate,
                actualDryWeightKg: parseFloat(completionDetails.actualDryWeight)
            });
            setIsCompletionModalOpen(false);
            setSelectedCycleInfo(null);
        }
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('dryingManagementTitle')}</h1>

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
                                <SortableHeader sortKey="module.code" label={t('module')} />
                                <SortableHeader sortKey="seaweedType.name" label={t('seaweedType')} />
                                <SortableHeader sortKey="cycle.harvestDate" label={t('harvestDate')} />
                                <SortableHeader sortKey="cycle.dryingStartDate" label={t('dryingStartDate')} />
                                <SortableHeader sortKey="dryingDuration" label={t('dryingDuration')} className="text-right"/>
                                <SortableHeader sortKey="netHarvestedWeight" label={t('netHarvestedWeightKg')} className="text-right"/>
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                             {dryingInfoList.map((info) => (
                                <tr key={info.cycle.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3 font-mono font-semibold">{info.module?.code || t('unknown')}</td>
                                    <td className="p-3">{info.seaweedType?.name || t('unknown')}</td>
                                    <td className="p-3">{info.cycle.harvestDate}</td>
                                    <td className="p-3">{info.cycle.dryingStartDate}</td>
                                    <td className="p-3 text-right">{info.dryingDuration}</td>
                                    <td className="p-3 text-right">{formatNumber(info.netHarvestedWeight, settings.localization)}</td>
                                    <td className="p-3 text-right">
                                        <Button variant="primary" onClick={() => handleCompleteDryingClick(info)}>
                                            <Icon name="Archive" className="w-4 h-4" />{t('completeDrying')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {dryingInfoList.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center p-6 text-gray-500 dark:text-gray-400">
                                        {t('noBatchesDrying')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isCompletionModalOpen && selectedCycleInfo && (
                 <Modal
                    isOpen={isCompletionModalOpen}
                    onClose={() => setIsCompletionModalOpen(false)}
                    title={`${t('completeDryingFor')} ${selectedCycleInfo.module?.code}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setIsCompletionModalOpen(false)}>{t('cancel')}</Button>
                            <Button variant="primary" onClick={handleConfirmCompletion} disabled={Object.keys(errors).length > 0}>{t('confirm')}</Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <Input
                            label={t('dryingStartDate')}
                            type="date"
                            value={selectedCycleInfo.cycle.dryingStartDate || ''}
                            disabled
                            className="bg-gray-100 dark:bg-gray-800"
                        />
                        <Input
                            label={t('dryingCompletionDate')}
                            type="date"
                            value={completionDetails.dryingCompletionDate}
                            onChange={e => setCompletionDetails(p => ({...p, dryingCompletionDate: e.target.value, baggingStartDate: e.target.value}))}
                            error={errors.dryingCompletionDate}
                            required
                        />
                        <Input
                            label={t('baggingStartDate')}
                            type="date"
                            value={completionDetails.baggingStartDate}
                            onChange={e => setCompletionDetails(p => ({...p, baggingStartDate: e.target.value}))}
                            error={errors.baggingStartDate}
                            required
                        />
                        <Input
                            label={t('actualDryWeight')}
                            type="number"
                            step="any"
                            value={completionDetails.actualDryWeight}
                            onChange={e => setCompletionDetails(p => ({...p, actualDryWeight: e.target.value}))}
                            error={errors.actualDryWeight}
                            required
                            autoFocus
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DryingPage;
