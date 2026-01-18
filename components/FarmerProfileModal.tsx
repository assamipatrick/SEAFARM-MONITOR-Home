
import React from 'react';
import Modal from './ui/Modal';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import type { Farmer } from '../types';

interface FarmerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: Farmer;
}

const FarmerProfileModal: React.FC<FarmerProfileModalProps> = ({ isOpen, onClose, farmer }) => {
    const { t } = useLocalization();
    const { sites } = useData();
    
    const site = sites.find(s => s.id === farmer.siteId);

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div className="bg-gray-100/50 dark:bg-gray-900/50 p-3 rounded-md">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-md text-gray-900 dark:text-gray-100">{value || 'N/A'}</p>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${t('farmer')}: ${farmer.firstName} ${farmer.lastName} (${farmer.code})`}
            widthClass="max-w-3xl"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label={t('firstName')} value={farmer.firstName} />
                <DetailItem label={t('lastName')} value={farmer.lastName} />
                <DetailItem label={t('code')} value={farmer.code} />
                <DetailItem label={t('gender')} value={t(`gender_${farmer.gender}` as any)} />
                <DetailItem label={t('dob')} value={farmer.dob} />
                <DetailItem label={t('birthPlace')} value={farmer.birthPlace} />
                <DetailItem label={t('idNumber')} value={farmer.idNumber} />
                <DetailItem label={t('address')} value={farmer.address} />
                <DetailItem label={t('site')} value={site?.name} />
                <DetailItem label={t('maritalStatus')} value={t(`maritalStatus_${farmer.maritalStatus}` as any)} />
                <DetailItem label={t('nationality')} value={farmer.nationality} />
                <DetailItem label={t('parentsInfo')} value={farmer.parentsInfo} />
            </div>
        </Modal>
    );
};

export default FarmerProfileModal;
