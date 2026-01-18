
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import type { PressingSlip } from '../types';
import { PressedStockMovementType } from '../types';
import { formatNumber } from '../utils/formatters';

interface PressingSlipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: PressingSlip | null;
}

const PressingSlipFormModal: React.FC<PressingSlipFormModalProps> = ({ isOpen, onClose, slip }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { seaweedTypes, addPressingSlip, updatePressingSlip, pressedStockMovements } = useData();

    const getInitialFormData = useCallback(() => ({
        date: new Date().toISOString().split('T')[0],
        seaweedTypeId: seaweedTypes[0]?.id || '',
        sourceSiteId: 'pressing-warehouse', // Always hardcoded to internal warehouse
        consumedWeightKg: '',
        consumedBags: '',
        producedWeightKg: '',
        producedBalesCount: '',
    }), [seaweedTypes]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (slip) {
                setFormData({
                    date: slip.date,
                    seaweedTypeId: slip.seaweedTypeId,
                    sourceSiteId: 'pressing-warehouse',
                    consumedWeightKg: String(slip.consumedWeightKg),
                    consumedBags: String(slip.consumedBags),
                    producedWeightKg: String(slip.producedWeightKg),
                    producedBalesCount: String(slip.producedBalesCount),
                });
            } else {
                setFormData(getInitialFormData());
            }
            setErrors({});
        }
    }, [isOpen, slip, getInitialFormData]);
    
    // Logic: Calculate available BULK stock specifically in the Pressing Warehouse
    // Bulk Stock = (Bulk Inflows) - (Bulk Outflows/Consumption)
    const availableBulkStock = useMemo(() => {
        if (!formData.seaweedTypeId) return { kg: 0, bags: 0 };
        
        // Filter movements relevant to this warehouse and type
        const movements = pressedStockMovements.filter(m => 
            m.seaweedTypeId === formData.seaweedTypeId && 
            m.siteId === 'pressing-warehouse'
        );

        let kg = 0;
        let bags = 0;

        movements.forEach(m => {
            // IN: Bulk coming from sites (transfers) or direct farmer deliveries
            if ([PressedStockMovementType.BULK_IN_FROM_SITE, PressedStockMovementType.FARMER_DELIVERY].includes(m.type)) {
                // For bulk movements, we use inKg and inBales (where inBales represents bags)
                kg += m.inKg || 0;
                bags += m.inBales || 0; 
            }
            // OUT: Bulk consumed by pressing
            else if ([PressedStockMovementType.PRESSING_CONSUMPTION].includes(m.type)) {
                 kg -= m.outKg || 0;
                 bags -= m.outBales || 0;
            }
        });

        // If editing, add back the values from the *current* slip so we don't block saving same values
        if (slip && slip.seaweedTypeId === formData.seaweedTypeId) {
            kg += slip.consumedWeightKg;
            bags += slip.consumedBags;
        }

        return { kg: Math.max(0, kg), bags: Math.max(0, bags) };
    }, [pressedStockMovements, formData.seaweedTypeId, slip]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        
        const weightCons = parseFloat(formData.consumedWeightKg);
        if (!formData.consumedWeightKg || isNaN(weightCons) || weightCons <= 0) {
            newErrors.consumedWeightKg = t('validationPositiveNumber');
        } else if (weightCons > availableBulkStock.kg) {
            newErrors.consumedWeightKg = t('validationStockUnavailableBulk').replace('{availableStock}', formatNumber(availableBulkStock.kg, settings.localization));
        }

        const bagsCons = parseInt(formData.consumedBags, 10);
        if (!formData.consumedBags || isNaN(bagsCons) || bagsCons < 0) {
            newErrors.consumedBags = t('validationNonNegative');
        } else if (bagsCons > availableBulkStock.bags) {
            newErrors.consumedBags = t('validationStockUnavailableBags').replace('{availableStock}', String(availableBulkStock.bags));
        }

        if (!formData.producedWeightKg || isNaN(parseFloat(formData.producedWeightKg)) || parseFloat(formData.producedWeightKg) <= 0) {
            newErrors.producedWeightKg = t('validationPositiveNumber');
        }
        if (!formData.producedBalesCount || isNaN(parseInt(formData.producedBalesCount, 10)) || parseInt(formData.producedBalesCount, 10) <= 0) {
            newErrors.producedBalesCount = t('validationPositiveNumber');
        }

        return newErrors;
    }, [formData, t, availableBulkStock, settings.localization]);

    useEffect(() => {
        setErrors(validate());
    }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        const slipData = {
            date: formData.date,
            seaweedTypeId: formData.seaweedTypeId,
            sourceSiteId: 'pressing-warehouse',
            consumedWeightKg: parseFloat(formData.consumedWeightKg),
            consumedBags: parseInt(formData.consumedBags, 10) || 0,
            producedWeightKg: parseFloat(formData.producedWeightKg),
            producedBalesCount: parseInt(formData.producedBalesCount, 10),
        };

        if (slip) {
            updatePressingSlip({ ...slip, ...slipData });
        } else {
            addPressingSlip(slipData);
        }
        onClose();
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={slip ? t('editPressingSlip') : t('newPressingSlip')}
            widthClass="max-w-4xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Header Row */}
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} required />
                    <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => handleChange('seaweedTypeId', e.target.value)} error={errors.seaweedTypeId} required>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>

                    {/* Full Width Info */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('originInformation')}</label>
                        <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-bold">
                            {t('pressedWarehouseTitle')}
                        </div>
                    </div>

                    <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-800 dark:text-blue-200">{t('availableBulkStock')}:</span>
                            <span className="font-bold text-lg text-blue-900 dark:text-blue-100">
                                {formatNumber(availableBulkStock.kg, settings.localization)} kg ({availableBulkStock.bags} {t('bags')})
                            </span>
                        </div>
                    </div>

                    {/* Left Column: Bulk Input */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-red-700 dark:text-red-200 border-b border-red-300 pb-1 mb-2">{t('bulkInputSection')}</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <Input label={`${t('bulkWeightConsumed')} (Kg)`} type="number" step="any" value={formData.consumedWeightKg} onChange={e => handleChange('consumedWeightKg', e.target.value)} error={errors.consumedWeightKg} required />
                            <Input label={t('sac')} type="number" value={formData.consumedBags} onChange={e => handleChange('consumedBags', e.target.value)} error={errors.consumedBags} required />
                        </div>
                    </div>

                    {/* Right Column: Pressed Output */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700 space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-green-700 dark:text-green-200 border-b border-green-300 pb-1 mb-2">{t('pressedOutputSection')}</h4>
                        <div className="grid grid-cols-1 gap-4">
                             <Input label={`${t('pressedWeightObtained')} (Kg)`} type="number" step="any" value={formData.producedWeightKg} onChange={e => handleChange('producedWeightKg', e.target.value)} error={errors.producedWeightKg} required />
                             <Input label={t('baleSingular')} type="number" value={formData.producedBalesCount} onChange={e => handleChange('producedBalesCount', e.target.value)} error={errors.producedBalesCount} required />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default PressingSlipFormModal;
