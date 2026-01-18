
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { StockMovementType } from '../../types';

interface StockMovementFormModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
}

const StockMovementFormModal: React.FC<StockMovementFormModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const { sites, seaweedTypes, addStockMovement } = useData();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        siteId: '',
        seaweedTypeId: '',
        direction: 'in' as 'in' | 'out',
        kg: '',
        bags: '',
        designation: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    useEffect(() => {
        if(isOpen) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                siteId: sites.find(s => s.id !== 'pressing-warehouse')?.id || '',
                seaweedTypeId: seaweedTypes[0]?.id || '',
                direction: 'in',
                kg: '',
                bags: '',
                designation: '',
            });
            setErrors({});
        }
    }, [isOpen, sites, seaweedTypes]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.designation.trim()) {
            newErrors.designation = t('validationRequired');
        }
        const kgNum = parseFloat(formData.kg);
        const bagsNum = parseInt(formData.bags, 10);
        if ((!formData.kg && !formData.bags) || (isNaN(kgNum) && isNaN(bagsNum))) {
            const errorMsg = t('validationAtLeastOneRequired');
            newErrors.kg = errorMsg;
            newErrors.bags = errorMsg;
        }
        if (formData.kg && (isNaN(kgNum) || kgNum <= 0)) {
            newErrors.kg = t('validationPositiveNumber');
        }
        if (formData.bags && (isNaN(bagsNum) || bagsNum <= 0)) {
            newErrors.bags = t('validationPositiveNumber');
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

        addStockMovement({
            date: formData.date,
            siteId: formData.siteId,
            seaweedTypeId: formData.seaweedTypeId,
            type: formData.direction === 'in' ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT,
            designation: formData.designation,
            inKg: formData.direction === 'in' ? parseFloat(formData.kg) || undefined : undefined,
            outKg: formData.direction === 'out' ? parseFloat(formData.kg) || undefined : undefined,
            inBags: formData.direction === 'in' ? parseInt(formData.bags) || undefined : undefined,
            outBags: formData.direction === 'out' ? parseInt(formData.bags) || undefined : undefined,
        });
        onClose();
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('recordStockAdjustment')}
            footer={<><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button></>}
        >
            <div className="grid grid-cols-2 gap-4">
                <Input label={t('date')} type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} />
                <Select label={t('site')} value={formData.siteId} onChange={e => setFormData(p => ({...p, siteId: e.target.value}))}>
                     {sites.filter(s => s.id !== 'pressing-warehouse').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                 <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => setFormData(p => ({...p, seaweedTypeId: e.target.value}))}>
                    {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </Select>
                <Select label={t('direction')} value={formData.direction} onChange={e => setFormData(p => ({...p, direction: e.target.value as 'in' | 'out'}))}>
                    <option value="in">{t('in')}</option>
                    <option value="out">{t('out')}</option>
                </Select>
                <Input label={t('kg')} type="number" step="any" value={formData.kg} onChange={e => setFormData(p => ({...p, kg: e.target.value}))} error={errors.kg}/>
                <Input label={t('bags')} type="number" value={formData.bags} onChange={e => setFormData(p => ({...p, bags: e.target.value}))} error={errors.bags}/>
                <Input containerClassName="col-span-2" label={t('reasonForAdjustment')} value={formData.designation} onChange={e => setFormData(p => ({...p, designation: e.target.value}))} required error={errors.designation}/>
            </div>
        </Modal>
    );
};

export default StockMovementFormModal;
