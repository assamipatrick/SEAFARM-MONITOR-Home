import React, { useState, useMemo, useEffect } from 'react';
import Modal from './ui/Modal';
import Select from './ui/Select';
import Button from './ui/Button';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Farmer } from '../types';

interface AssignFarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (farmerId: string) => void;
  farmers: Farmer[];
  selectedCount: number;
  isMultiSiteSelection: boolean;
}

const AssignFarmerModal: React.FC<AssignFarmerModalProps> = ({ isOpen, onClose, onAssign, farmers, selectedCount, isMultiSiteSelection }) => {
  const { t } = useLocalization();
  
  const sortedFarmers = useMemo(() =>
    [...farmers].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
  [farmers]);

  const [targetFarmerId, setTargetFarmerId] = useState<string>('');
  
  useEffect(() => {
    if (sortedFarmers.length > 0) {
      setTargetFarmerId(sortedFarmers[0].id);
    } else {
      setTargetFarmerId('');
    }
  }, [sortedFarmers]);

  const handleAssign = () => {
    if (targetFarmerId) {
      onAssign(targetFarmerId);
    }
  };

  const canAssign = !isMultiSiteSelection && farmers.length > 0 && !!targetFarmerId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('assignFarmerTitle')}
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleAssign} disabled={!canAssign}>{t('assign')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>
          {t('itemsSelected').replace('{count}', String(selectedCount))}
        </p>

        {isMultiSiteSelection ? (
            <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">
                {t('multiSiteSelectionWarning')}
            </div>
        ) : farmers.length > 0 ? (
            <Select
              label={t('farmer')}
              value={targetFarmerId}
              onChange={(e) => setTargetFarmerId(e.target.value)}
            >
              {sortedFarmers.map(f => (
                <option key={f.id} value={f.id}>
                  {f.firstName} {f.lastName} ({f.code})
                </option>
              ))}
            </Select>
        ) : (
             <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-md text-sm">
                {t('noFarmersForSiteWarning')}
            </div>
        )}
      </div>
    </Modal>
  );
};

export default AssignFarmerModal;