import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useLocalization } from '../contexts/LocalizationContext';
import type { SiteTransfer } from '../types';
import { SiteTransferStatus } from '../types';

interface SiteTransferStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: SiteTransfer;
  action: SiteTransferStatus.COMPLETED | SiteTransferStatus.CANCELLED;
  onConfirm: (updatedTransfer: SiteTransfer) => void;
}

const SiteTransferStatusModal: React.FC<SiteTransferStatusModalProps> = ({ isOpen, onClose, transfer, action, onConfirm }) => {
  const { t } = useLocalization();
  const isCompleting = action === SiteTransferStatus.COMPLETED;

  const [formData, setFormData] = useState({
    completionDate: new Date().toISOString().split('T')[0],
    receivedWeightKg: '',
    receivedBags: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        completionDate: new Date().toISOString().split('T')[0],
        receivedWeightKg: String(transfer.weightKg), // Default to shipped weight
        receivedBags: String(transfer.bags),       // Default to shipped bags
        notes: '',
      });
      setErrors({});
    }
  }, [isOpen, transfer]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.completionDate) newErrors.completionDate = t('validationRequired');
    
    if (isCompleting) {
      if (!formData.receivedWeightKg || isNaN(parseFloat(formData.receivedWeightKg)) || parseFloat(formData.receivedWeightKg) < 0) {
        newErrors.receivedWeightKg = t('validationNonNegative');
      }
      if (!formData.receivedBags || isNaN(parseInt(formData.receivedBags, 10)) || parseInt(formData.receivedBags, 10) < 0) {
        newErrors.receivedBags = t('validationNonNegative');
      }
    } else { // Cancelling
      if (!formData.notes.trim()) newErrors.notes = t('validationRequired');
    }

    return newErrors;
  }, [formData, isCompleting, t]);

  useEffect(() => {
    setErrors(validate());
  }, [formData, validate]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
    };

    const updatedTransfer: SiteTransfer = {
      ...transfer,
      status: action,
      completionDate: formData.completionDate,
      notes: formData.notes,
      receivedWeightKg: isCompleting ? parseFloat(formData.receivedWeightKg) : undefined,
      receivedBags: isCompleting ? parseInt(formData.receivedBags, 10) : undefined,
    };
    onConfirm(updatedTransfer);
  };

  const title = isCompleting ? t('confirmCompleteTransferTitle') : t('confirmCancelTransferTitle');
  
  // Calculate loss/gain for display
  const weightDiff = isCompleting ? parseFloat(formData.receivedWeightKg || '0') - transfer.weightKg : 0;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={Object.keys(errors).length > 0}>{t('confirm')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input 
          label={isCompleting ? t('completionDate') : t('cancellationDate')}
          type="date"
          value={formData.completionDate}
          onChange={e => handleChange('completionDate', e.target.value)}
          error={errors.completionDate}
          required
        />
        
        {isCompleting ? (
          <>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm mb-4">
                <p><strong>{t('shippedWeightKg')}:</strong> {transfer.weightKg} Kg</p>
                <p><strong>{t('shippedBags')}:</strong> {transfer.bags}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                  label={t('receivedWeightKg')}
                  type="number"
                  step="0.01"
                  value={formData.receivedWeightKg}
                  onChange={e => handleChange('receivedWeightKg', e.target.value)}
                  error={errors.receivedWeightKg}
                  required
                />
                <Input 
                  label={t('receivedBags')}
                  type="number"
                  value={formData.receivedBags}
                  onChange={e => handleChange('receivedBags', e.target.value)}
                  error={errors.receivedBags}
                  required
                />
            </div>
            
            {weightDiff !== 0 && (
                <p className={`text-xs font-bold text-right ${weightDiff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    Difference: {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(2)} Kg
                </p>
            )}

             <Input 
              label={`${t('notes')} (${t('optional')})`}
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="e.g. Broken bags, moisture loss..."
            />
          </>
        ) : (
          <Input
            label={t('cancellationReason')}
            value={formData.notes}
            onChange={e => handleChange('notes', e.target.value)}
            error={errors.notes}
            required
            autoFocus
          />
        )}
      </div>
    </Modal>
  );
};

export default SiteTransferStatusModal;