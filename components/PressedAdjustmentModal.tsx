import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { PressedStockMovementType } from '../types';

interface PressedAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PressedAdjustmentModal: React.FC<PressedAdjustmentModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const { seaweedTypes, addPressedStockAdjustment } = useData();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        seaweedTypeId: '',
        direction: 'in' as 'in' | 'out',
        kg: '',
        bales: '',
        designation: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if(isOpen) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                seaweedTypeId: seaweedTypes[0]?.id || '',
                direction: 'in',
                kg: '',
                bales: '',
                designation: '',
            });
            setErrors({});
        }
    }, [isOpen, seaweedTypes]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        if (!formData.designation.trim()) {
            newErrors.designation = t('validationRequired');
        }
        const kgNum = parseFloat(formData.kg);
        const balesNum = parseInt(formData.bales, 10);
        if ((!formData.kg && !formData.bales) || (isNaN(kgNum) && isNaN(balesNum))) {
            const errorMsg = t('validationAtLeastOneRequired');
            newErrors.kg = errorMsg;
            newErrors.bales = errorMsg;
        }
        if (formData.kg && (isNaN(kgNum) || kgNum <= 0)) {
            newErrors.kg = t('validationPositiveNumber');
        }
        if (formData.bales && (isNaN(balesNum) || balesNum <= 0)) {
            newErrors.bales = t('validationPositiveNumber');
        }

        return newErrors;
    }, [formData, t]);

    useEffect(() => {
        setErrors(validate());
    }, [formData, validate]);

    const handleSubmit = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        addPressedStockAdjustment({
            date: formData.date,
            siteId: 'pressing-warehouse', // Adjustments are internal to the warehouse
            seaweedTypeId: formData.seaweedTypeId,
            type: formData.direction === 'in' ? PressedStockMovementType.ADJUSTMENT_IN : PressedStockMovementType.ADJUSTMENT_OUT,
            designation: formData.designation,
            inKg: formData.direction === 'in' ? parseFloat(formData.kg) || undefined : undefined,
            outKg: formData.direction === 'out' ? parseFloat(formData.kg) || undefined : undefined,
            inBales: formData.direction === 'in' ? parseInt(formData.bales) || undefined : undefined,
            outBales: formData.direction === 'out' ? parseInt(formData.bales) || undefined : undefined,
        });
        onClose();
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${t('recordStockAdjustment')} (${t('pressedSeaweed')})`}
            footer={<><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button></>}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} />
                    <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => setFormData(p => ({...p, seaweedTypeId: e.target.value}))}>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                </div>
                <Select label={t('direction')} value={formData.direction} onChange={e => setFormData(p => ({...p, direction: e.target.value as 'in' | 'out'}))}>
                    <option value="in">{t('in')}</option>
                    <option value="out">{t('out')}</option>
                </Select>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Input label={t('kg')} type="number" step="any" value={formData.kg} onChange={e => setFormData(p => ({...p, kg: e.target.value}))} error={errors.kg}/>
                     <Input label={t('baleSingular')} type="number" value={formData.bales} onChange={e => setFormData(p => ({...p, bales: e.target.value}))} error={errors.bales}/>
                </div>
                <Input label={t('reasonForAdjustment')} value={formData.designation} onChange={e => setFormData(p => ({...p, designation: e.target.value}))} required error={errors.designation} placeholder="e.g. Initial Stock, Correction, Found Stock..."/>
            </div>
        </Modal>
    );
};

export default PressedAdjustmentModal;