import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import type { SiteTransfer } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { formatNumber } from '../utils/formatters';

const BagWeightInputs: React.FC<{
    weights: number[];
    onChange: (weights: number[]) => void;
}> = ({ weights, onChange }) => {
    const { t } = useLocalization();
    
    const inputsToRender = useMemo(() => {
        const newInputs = [...weights.map(String)];
        const setsOfTen = Math.max(1, Math.ceil((newInputs.length + 1) / 10));
        while (newInputs.length < setsOfTen * 10) {
            newInputs.push('');
        }
        return newInputs;
    }, [weights]);

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputsToRender];
        newInputs[index] = value;
        
        const numericWeights = newInputs
            .map(w => parseFloat(w))
            .filter(w => !isNaN(w) && w > 0);
        onChange(numericWeights);
    };

    return (
        <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bagWeights')} (Kg)</label>
            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                {inputsToRender.map((weight, index) => (
                    <Input
                        key={index}
                        type="number"
                        step="0.01"
                        placeholder={`${t('sac')} ${index + 1}`}
                        value={weight}
                        onChange={e => handleInputChange(index, e.target.value)}
                        className="text-center text-xs"
                    />
                ))}
            </div>
            <p className="text-xs text-gray-500 text-right">{t('totalBags')}: {weights.length}</p>
        </div>
    );
};

interface SiteTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SiteTransferFormModal: React.FC<SiteTransferFormModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { sites, seaweedTypes, employees, addSiteTransfer, stockMovements } = useData();

    const initialFormData = useMemo(() => ({
        date: new Date().toISOString().split('T')[0],
        sourceSiteId: '',
        destinationSiteId: '',
        seaweedTypeId: '',
        managerId: '',
        transporter: '',
        transport: 'Truck' as 'Boat' | 'Truck',
        representative: '',
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const [bagWeights, setBagWeights] = useState<number[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...initialFormData,
                sourceSiteId: sites.find(s => s.id !== 'pressing-warehouse')?.id || '',
                seaweedTypeId: seaweedTypes[0]?.id || ''
            });
            setBagWeights([]);
            setErrors({});
        }
    }, [isOpen, sites, seaweedTypes, initialFormData]);

    const calculatedTotals = useMemo(() => ({
        totalWeightKg: bagWeights.reduce((sum, w) => sum + w, 0),
        totalBags: bagWeights.length,
    }), [bagWeights]);

    // Calculate Available Stock at Source
    const availableStock = useMemo(() => {
        if (!formData.sourceSiteId || !formData.seaweedTypeId) {
            return { kg: 0, bags: 0 };
        }
        const movements = stockMovements.filter(m => m.siteId === formData.sourceSiteId && m.seaweedTypeId === formData.seaweedTypeId);
        const totalInKg = movements.reduce((sum, m) => sum + (m.inKg || 0), 0);
        const totalOutKg = movements.reduce((sum, m) => sum + (m.outKg || 0), 0);
        const totalInBags = movements.reduce((sum, m) => sum + (m.inBags || 0), 0);
        const totalOutBags = movements.reduce((sum, m) => sum + (m.outBags || 0), 0);
        return {
            kg: totalInKg - totalOutKg,
            bags: totalInBags - totalOutBags,
        };
    }, [formData.sourceSiteId, formData.seaweedTypeId, stockMovements]);

    const remainingStock = useMemo(() => ({
        kg: availableStock.kg - calculatedTotals.totalWeightKg,
        bags: availableStock.bags - calculatedTotals.totalBags,
    }), [availableStock, calculatedTotals]);

    const destinationOptions = useMemo(() => {
        const pressingWarehouseOption = { id: 'pressing-warehouse', name: t('pressedWarehouseTitle') };
        const filteredSites = sites.filter(s => s.id !== formData.sourceSiteId && s.id !== 'pressing-warehouse');
        return [...filteredSites, pressingWarehouseOption];
    }, [sites, formData.sourceSiteId, t]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.sourceSiteId) newErrors.sourceSiteId = t('validationRequired');
        if (!formData.destinationSiteId) newErrors.destinationSiteId = t('validationRequired');
        if (formData.sourceSiteId === formData.destinationSiteId) newErrors.destinationSiteId = t('validationSameSite');
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        if (!formData.transporter) newErrors.transporter = t('validationRequired');
        
        if (calculatedTotals.totalBags === 0) newErrors.bagWeights = t('validationAtLeastOneRequired');
        
        // Stock Validation
        if (remainingStock.kg < 0) {
             newErrors.bagWeights = t('validationStockUnavailableWeight').replace('{availableStock}', formatNumber(availableStock.kg, settings.localization));
        } else if (remainingStock.bags < 0) {
             newErrors.bagWeights = t('validationStockUnavailableBags').replace('{availableStock}', String(availableStock.bags));
        }

        return newErrors;
    }, [formData, calculatedTotals, remainingStock, availableStock, t, settings.localization]);

    useEffect(() => {
        setErrors(validate());
    }, [formData, calculatedTotals, validate]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        const newFormData = { ...formData, [field]: value };
        // Reset destination if it becomes invalid (same as source)
        if (field === 'sourceSiteId' && value === newFormData.destinationSiteId) {
            newFormData.destinationSiteId = '';
        }
        setFormData(newFormData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const transferData: Omit<SiteTransfer, 'id' | 'status' | 'history'> = {
            ...formData,
            managerId: formData.managerId || undefined,
            representative: formData.representative || undefined,
            weightKg: calculatedTotals.totalWeightKg,
            bags: calculatedTotals.totalBags,
            bagWeights,
        };

        addSiteTransfer(transferData);
        onClose();
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('createShippingSlip')}
            widthClass="max-w-4xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Information Logic Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 border-b pb-1">{t('originInformation')}</h3>
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} required />
                    
                    <Select label={t('sourceSite')} value={formData.sourceSiteId} onChange={e => handleChange('sourceSiteId', e.target.value)} error={errors.sourceSiteId} required>
                         {sites.filter(s => s.id !== 'pressing-warehouse').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    
                    <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => handleChange('seaweedTypeId', e.target.value)} error={errors.seaweedTypeId} required>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                    
                    {/* Stock Display */}
                    <div className={`p-4 rounded-lg border ${remainingStock.kg < 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                         <div className="flex justify-between items-center mb-1">
                             <span className="text-sm text-gray-600 dark:text-gray-300">{t('currentStock')}:</span>
                             <span className="font-bold text-gray-900 dark:text-gray-100">{formatNumber(availableStock.kg, settings.localization)} Kg</span>
                         </div>
                         <div className="flex justify-between items-center">
                             <span className="text-sm text-gray-600 dark:text-gray-300">{t('stockBags')}:</span>
                             <span className="font-bold text-gray-900 dark:text-gray-100">{availableStock.bags}</span>
                         </div>
                    </div>
                </div>

                {/* Destination & Transport Section */}
                <div className="space-y-4">
                     <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 border-b pb-1">{t('destination') + ' & Transport'}</h3>
                     
                     <Select label={t('destinationSite')} value={formData.destinationSiteId} onChange={e => handleChange('destinationSiteId', e.target.value)} error={errors.destinationSiteId} required>
                        <option value="">{t('selectSite')}</option>
                        {destinationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
                         <Select label={t('transport')} value={formData.transport} onChange={e => handleChange('transport', e.target.value as any)}>
                            <option value="Truck">{t('transport_Truck')}</option>
                            <option value="Boat">{t('transport_Boat')}</option>
                        </Select>
                        <Input label={t('transporter')} value={formData.transporter} onChange={e => handleChange('transporter', e.target.value)} error={errors.transporter} required />
                    </div>

                    <Input label={t('representative')} value={formData.representative} onChange={e => handleChange('representative', e.target.value)} placeholder="Nom du capitaine / chauffeur" />
                    
                    <Select label={t('manager')} value={formData.managerId} onChange={e => handleChange('managerId', e.target.value)}>
                        <option value="">{t('noManager')}</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </Select>
                </div>

                {/* Bag Weights Input (Full Width) */}
                <div className="md:col-span-2 border-t pt-4">
                    <BagWeightInputs weights={bagWeights} onChange={setBagWeights} />
                    {errors.bagWeights && <p className="mt-2 text-sm text-red-600 font-medium">{errors.bagWeights}</p>}
                </div>
                
                {/* Totals Summary */}
                <div className="md:col-span-2 flex justify-end gap-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-right">
                         <p className="text-xs text-gray-500 uppercase">{t('shippedBags')}</p>
                         <p className="text-xl font-bold">{calculatedTotals.totalBags}</p>
                    </div>
                    <div className="text-right border-l pl-6 border-gray-300 dark:border-gray-600">
                         <p className="text-xs text-gray-500 uppercase">{t('shippedWeightKg')}</p>
                         <p className="text-xl font-bold text-blue-600">{formatNumber(calculatedTotals.totalWeightKg, settings.localization)} Kg</p>
                    </div>
                </div>

            </form>
        </Modal>
    );
};

export default SiteTransferFormModal;