
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import type { CreditType } from '../types';

interface CreditTypeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditType: CreditType;
  onSave: (creditType: CreditType) => void;
}

const CreditTypeEditModal: React.FC<CreditTypeEditModalProps> = ({ isOpen, onClose, creditType, onSave }) => {
  const { t } = useLocalization();
  const [formData, setFormData] = useState<CreditType>(creditType);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((data: CreditType) => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = t('validationRequired');
    if (data.hasQuantity && !data.unit?.trim()) newErrors.unit = t('validationRequired');
    return newErrors;
  }, [t]);

  useEffect(() => {
    setFormData(creditType);
  }, [creditType, isOpen]);

  useEffect(() => {
    setErrors(validate(formData));
  }, [formData, validate]);

  const handleChange = (field: keyof Omit<CreditType, 'id'>, value: string | boolean) => {
    if (field === 'hasQuantity' && value === false) {
        setFormData(prev => ({...prev, hasQuantity: false, unit: ''}));
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length === 0) {
      onSave(formData);
    }
  };
  
  const isFormInvalid = Object.keys(errors).length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('editCreditType')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('creditType')}
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          error={errors.name}
        />
        {formData.hasQuantity && (
          <Input
            label={t('unit')}
            value={formData.unit || ''}
            onChange={e => handleChange('unit', e.target.value)}
            error={errors.unit}
          />
        )}
        <div className="flex flex-col gap-2 pt-2">
            <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="mr-2 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" checked={formData.hasQuantity} onChange={e => handleChange('hasQuantity', e.target.checked)}/>
                {t('withQuantity')}
            </label>
            <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="mr-2 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" checked={formData.hasUnitPrice} onChange={e => handleChange('hasUnitPrice', e.target.checked)}/>
                {t('withUnitPrice')}
            </label>
            <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="mr-2 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" checked={formData.isDirectAmount} onChange={e => handleChange('isDirectAmount', e.target.checked)}/>
                {t('directAmount')}
            </label>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreditTypeEditModal;
