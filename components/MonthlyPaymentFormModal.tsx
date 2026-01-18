
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import type { MonthlyPayment, Farmer, Employee, ServiceProvider } from '../types';
import { RecipientType } from '../types';

interface MonthlyPaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: MonthlyPayment | null;
}

const MonthlyPaymentFormModal: React.FC<MonthlyPaymentFormModalProps> = ({ isOpen, onClose, payment }) => {
    const { t } = useLocalization();
    const { farmers, employees, serviceProviders, addMonthlyPayment, updateMonthlyPayment } = useData();

    const getInitialFormData = useCallback(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return {
            date: today.toISOString().split('T')[0],
            period: `${year}-${month}`,
            recipientType: RecipientType.FARMER,
            recipientId: '',
            amount: '',
            method: 'cash' as 'cash' | 'bank_transfer' | 'mobile_money',
            notes: '',
            paymentStatus: 'PENDING' as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
            mobileProvider: '',
            phoneNumber: '',
        };
    }, []);

    const [formData, setFormData] = useState(getInitialFormData());
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (payment) {
                setFormData({
                    ...payment,
                    amount: String(payment.amount),
                    notes: payment.notes || '',
                    mobileProvider: payment.mobileProvider || '',
                    phoneNumber: payment.phoneNumber || '',
                    paymentStatus: payment.paymentStatus || 'PENDING',
                });
            } else {
                setFormData(getInitialFormData());
            }
            setErrors({});
        }
    }, [isOpen, payment, getInitialFormData]);

    const recipientOptions = useMemo(() => {
        switch (formData.recipientType) {
            case RecipientType.FARMER:
                return farmers.map(f => ({ value: f.id, label: `${f.firstName} ${f.lastName}` }));
            case RecipientType.EMPLOYEE:
                return employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }));
            case RecipientType.SERVICE_PROVIDER:
                return serviceProviders.map(p => ({ value: p.id, label: p.name }));
            default:
                return [];
        }
    }, [formData.recipientType, farmers, employees, serviceProviders]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.period) newErrors.period = t('validationRequired');
        if (!formData.recipientType) newErrors.recipientType = t('validationRequired');
        if (!formData.recipientId) newErrors.recipientId = t('validationRequired');
        if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
            newErrors.amount = t('validationPositiveNumber');
        }
        if (formData.method === 'mobile_money') {
             if (!formData.mobileProvider) newErrors.mobileProvider = t('validationRequired');
             if (!formData.phoneNumber) newErrors.phoneNumber = t('validationRequired');
        }
        return newErrors;
    }, [formData, t]);
    
    useEffect(() => {
        setErrors(validate());
    }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        const newFormData = { ...formData, [field]: value };
        if (field === 'recipientType') {
            newFormData.recipientId = ''; // Reset recipient when type changes
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

        const dataToSave = {
            ...formData,
            amount: parseFloat(formData.amount),
            notes: formData.notes?.trim() || undefined,
            // Explicitly include mobile money details if method matches
            mobileProvider: formData.method === 'mobile_money' ? formData.mobileProvider : undefined,
            phoneNumber: formData.method === 'mobile_money' ? formData.phoneNumber : undefined,
        };

        if (payment) {
            updateMonthlyPayment({ ...payment, ...dataToSave });
        } else {
            addMonthlyPayment(dataToSave);
        }
        onClose();
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={payment ? t('editPayment') : t('newPayment')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('paymentDate')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} required />
                    <Input label={t('period')} type="month" value={formData.period} onChange={e => handleChange('period', e.target.value)} error={errors.period} required />
                    <Select label={t('recipientType')} value={formData.recipientType} onChange={e => handleChange('recipientType', e.target.value as RecipientType)} error={errors.recipientType} required>
                        <option value="">{t('selectRecipientType')}</option>
                        {Object.values(RecipientType).map(type => (
                            <option key={type} value={type}>{t(`recipientType_${type}`)}</option>
                        ))}
                    </Select>
                    <Select label={t('recipient')} value={formData.recipientId} onChange={e => handleChange('recipientId', e.target.value)} error={errors.recipientId} disabled={!formData.recipientType} required>
                        <option value="">{t('selectRecipient')}</option>
                        {recipientOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                    <Input label={t('amount')} type="number" step="any" value={formData.amount} onChange={e => handleChange('amount', e.target.value)} error={errors.amount} required />
                    <Select label={t('paymentMethod')} value={formData.method} onChange={e => handleChange('method', e.target.value as any)}>
                        <option value="cash">{t('paymentMethod_cash')}</option>
                        <option value="bank_transfer">{t('paymentMethod_bank_transfer')}</option>
                        <option value="mobile_money">{t('paymentMethod_mobile_money')}</option>
                    </Select>
                </div>

                {formData.method === 'mobile_money' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Select label="Mobile Money Provider" value={formData.mobileProvider} onChange={e => handleChange('mobileProvider', e.target.value)} error={errors.mobileProvider} required>
                            <option value="">Select Provider</option>
                            <option value="Orange Money">Orange Money</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Airtel Money">Airtel Money</option>
                            <option value="Telma MVola">Telma MVola</option>
                        </Select>
                        <Input label="Phone Number" type="tel" value={formData.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)} error={errors.phoneNumber} required placeholder="+261..." />
                    </div>
                )}
                
                {payment && payment.paymentStatus && (
                     <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        <strong>{t('paymentStatus')}: </strong> {t(`status_${payment.paymentStatus}` as any)}
                        {payment.transactionId && <span className="block text-xs text-gray-500 mt-1">{t('transactionId')}: {payment.transactionId}</span>}
                    </div>
                )}

                <Input label={`${t('notes')} (${t('optional')})`} value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
            </form>
        </Modal>
    );
};

export default MonthlyPaymentFormModal;
