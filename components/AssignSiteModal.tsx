
import React, { useState } from 'react';
import Modal from './ui/Modal';
import Select from './ui/Select';
import Button from './ui/Button';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import type { Site } from '../types';

interface AssignSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (siteId: string) => void;
  sites: Site[];
  selectedCount: number;
}

const AssignSiteModal: React.FC<AssignSiteModalProps> = ({ isOpen, onClose, onAssign, sites, selectedCount }) => {
  const { t } = useLocalization();
  const [targetSiteId, setTargetSiteId] = useState<string>(sites[0]?.id || '');

  const handleAssign = () => {
    if (targetSiteId) {
      onAssign(targetSiteId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('assignSiteTitle')}
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleAssign} disabled={!targetSiteId}>{t('assign')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>
          {t('itemsSelected').replace('{count}', String(selectedCount))}
        </p>
        <Select
          label={t('site')}
          value={targetSiteId}
          onChange={(e) => setTargetSiteId(e.target.value)}
        >
          {sites.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

export default AssignSiteModal;