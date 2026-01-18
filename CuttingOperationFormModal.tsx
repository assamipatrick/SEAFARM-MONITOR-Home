
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';
import type { CuttingOperation, Site, ServiceProvider, Module, Farmer, SeaweedType } from '../types';

interface CuttingOperationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: CuttingOperation | null;
}

const CuttingOperationFormModal: React.FC<CuttingOperationFormModalProps> = ({ isOpen, onClose, operation }) => {
    const { t } = useLocalization();
    const { sites, serviceProviders, modules, farmers, addCuttingOperation, updateCuttingOperation, seaweedTypes } = useData();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        siteId: sites[0]?.id || '',
        serviceProviderId: serviceProviders[0]?.id || '',
        moduleCuts: [] as { moduleId: string, linesCut: number }[],
        unitPrice: '',
        notes: '',
        isPaid: false,
        paymentDate: '',
        seaweedTypeId: seaweedTypes[0]?.id || ''
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, `${f.firstName} ${f.lastName}`])), [farmers]);

    const availableModules = useMemo(() => {
        return modules
            .filter(m => m.siteId === formData.siteId)
            .map(m => ({
                ...m,
                farmerName: m.farmerId ? farmerMap.get(m.farmerId) : undefined
            }));
    }, [formData.siteId, modules, farmerMap]);

    const calculatedTotals = useMemo(() => {
        const totalLinesCut = formData.moduleCuts.reduce((sum, mc) => sum + mc.linesCut, 0);
        const unitPrice = parseFloat(formData.unitPrice);
        const totalAmount = !isNaN(unitPrice) ? totalLinesCut * unitPrice : 0;
        return { totalLinesCut, totalAmount };
    }, [formData.moduleCuts, formData.unitPrice]);

    const beneficiaryFarmers = useMemo(() => {
        if (operation?.beneficiaryFarmerId) {
            const farmerName = farmerMap.get(operation.beneficiaryFarmerId);
            return farmerName ? [farmerName] : [];
        }

        const farmerIds = formData.moduleCuts
            .map(mc => modules.find(m => m.id === mc.moduleId)?.farmerId)
            .filter((id): id is string => !!id);
        const uniqueFarmerIds = [...new Set(farmerIds)];
        return uniqueFarmerIds.map(id => farmerMap.get(id)).filter(Boolean) as string[];
    }, [formData.moduleCuts, modules, farmerMap, operation]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.serviceProviderId) newErrors.serviceProviderId = t('validationRequired');
        if (formData.moduleCuts.length === 0) newErrors.moduleCuts = t('validationSelectAtLeastOne');
        // FIX: Replaced a hardcoded error message with a translation key for i18n consistency.
        if (formData.moduleCuts.some(mc => mc.linesCut <= 0)) newErrors.moduleCuts = t('validationLinesCutPositive');
        if (!formData.unitPrice || isNaN(parseFloat(formData.unitPrice)) || parseFloat(formData.unitPrice) <= 0) {
            newErrors.unitPrice = t('validationPositiveNumber');
        }
        if (formData.isPaid && !formData.paymentDate) {
            newErrors.paymentDate = t('validationRequired');
        }
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        return newErrors;
    }, [formData, t]);

    useEffect(() => {
        if (operation) {
            setFormData({
                date: operation.date,
                siteId: operation.siteId,
                serviceProviderId: operation.serviceProviderId,
                moduleCuts: operation.moduleCuts.map(mc => ({ moduleId: mc.moduleId, linesCut: mc.linesCut })),
                unitPrice: String(operation.unitPrice),
                notes: operation.notes || '',
                isPaid: operation.isPaid,
                paymentDate: operation.paymentDate || '',
                seaweedTypeId: operation.seaweedTypeId,
            });
        }
    }, [operation, isOpen]);

    useEffect(() => {
        setErrors(validate());
    }, [formData, validate]);

    const handleChange = (field: keyof Omit<typeof formData, 'isPaid' | 'moduleCuts'>, value: string) => {
        setFormData(p => ({ ...p, [field]: value }));
    };

    const handleSiteChange = (siteId: string) => {
        setFormData(p => ({ ...p, siteId, moduleCuts: [] }));
    }

    const handleModuleCutChange = (moduleId: string, linesCutStr: string) => {
        const linesCut = parseInt(linesCutStr, 10);
        const module = availableModules.find(m => m.id === moduleId);
        if (!module) return;

        const maxLines = module.lines;
        const finalLinesCut = isNaN(linesCut) ? 0 : Math.max(0, Math.min(linesCut, maxLines));

        setFormData(prev => {
            const existing = prev.moduleCuts.find(mc => mc.moduleId === moduleId);
            if (existing) {
                return {
                    ...prev,
                    moduleCuts: prev.moduleCuts.map(mc => mc.moduleId === moduleId ? { ...mc, linesCut: finalLinesCut } : mc)
                };
            }
            return prev;
        });
    };

    const handleModuleSelect = (moduleId: string, isSelected: boolean) => {
        setFormData(prev => {
            if (isSelected) {
                const module = availableModules.find(m => m.id === moduleId);
                if (module && !prev.moduleCuts.some(mc => mc.moduleId === moduleId)) {
                    return { ...prev, moduleCuts: [...prev.moduleCuts, { moduleId, linesCut: module.lines }] };
                }
            } else {
                return { ...prev, moduleCuts: prev.moduleCuts.filter(mc => mc.moduleId !== moduleId) };
            }
            return prev;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        const operationData: Omit<CuttingOperation, 'id'> = {
            date: formData.date,
            siteId: formData.siteId,
            serviceProviderId: formData.serviceProviderId,
            seaweedTypeId: formData.seaweedTypeId,
            moduleCuts: formData.moduleCuts.filter(mc => mc.linesCut > 0),
            unitPrice: parseFloat(formData.unitPrice),
            totalAmount: calculatedTotals.totalAmount,
            isPaid: formData.isPaid,
            paymentDate: formData.isPaid ? formData.paymentDate : undefined,
            notes: formData.notes || undefined,
            beneficiaryFarmerId: operation?.beneficiaryFarmerId, // Preserve existing beneficiary
        };
        
        if (operation) {
            updateCuttingOperation({ ...operation, ...operationData });
        } else {
            addCuttingOperation(operationData);
        }
        onClose();
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={operation ? t('editCuttingOperation') : t('addOperation')} widthClass="max-w-7xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} required />
                    <Select label={t('site')} value={formData.siteId} onChange={e => handleSiteChange(e.target.value)} error={errors.siteId} required>
                        <option value="">{t('selectSite')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                     <Select label={t('serviceProvider')} value={formData.serviceProviderId} onChange={e => handleChange('serviceProviderId', e.target.value)} error={errors.serviceProviderId} required>
                        <option value="">{t('selectProvider')}</option>
                        {serviceProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                </div>
                
                 <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => handleChange('seaweedTypeId', e.target.value)} error={errors.seaweedTypeId} required>
                    <option value="">{t('selectType')}</option>
                    {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </Select>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modules')}</label>
                    <div className="max-h-48 overflow-y-auto border dark:border-gray-600 rounded-md p-2 grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-2">
                        {availableModules.map(m => {
                            const isSelected = formData.moduleCuts.some(mc => mc.moduleId === m.id);
                            const linesCut = formData.moduleCuts.find(mc => mc.moduleId === m.id)?.linesCut ?? 0;
                            return (
                                <div key={m.id} title={`${m.code}${m.farmerName ? ` (${m.farmerName})` : ''}`} className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <Checkbox checked={isSelected} onChange={(e) => handleModuleSelect(m.id, e.target.checked)} />
                                    <span className="ml-2 text-sm truncate flex-1">{m.code}{m.farmerName && <span className="text-gray-500 dark:text-gray-400"> ({m.farmerName})</span>}</span>
                                    {isSelected && (
                                        <Input
                                            type="number"
                                            value={linesCut}
                                            onChange={(e) => handleModuleCutChange(m.id, e.target.value)}
                                            min="0"
                                            max={m.lines}
                                            className="w-24 text-sm !py-1"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {errors.moduleCuts && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.moduleCuts}</p>}
                </div>

                {formData.moduleCuts.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('beneficiaryFarmers')}</label>
                        <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md text-sm">
                            {beneficiaryFarmers.length > 0 ? (
                                beneficiaryFarmers.join(', ')
                            ) : (
                                <span className="text-gray-500 italic">{t('noFarmersAssignedToModules')}</span>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label={t('unitPricePerLine')} type="number" step="any" value={formData.unitPrice} onChange={e => handleChange('unitPrice', e.target.value)} error={errors.unitPrice} required />
                    <Input label={t('totalLinesCut')} value={calculatedTotals.totalLinesCut} disabled />
                    <Input label={t('totalAmount')} value={calculatedTotals.totalAmount.toFixed(2)} disabled />
                </div>
                
                <Input label={t('notes')} value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
                
                <div className="flex items-center gap-4">
                    <label className="flex items-center">
                        <Checkbox checked={formData.isPaid} onChange={e => setFormData(p => ({ ...p, isPaid: e.target.checked, paymentDate: e.target.checked ? p.paymentDate : '' }))} />
                        <span className="ml-2">{t('isPaid')}</span>
                    </label>
                    {formData.isPaid && (
                        <Input containerClassName="flex-1" label={t('paymentDate')} type="date" value={formData.paymentDate} onChange={e => handleChange('paymentDate', e.target.value)} error={errors.paymentDate} required />
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CuttingOperationFormModal;
