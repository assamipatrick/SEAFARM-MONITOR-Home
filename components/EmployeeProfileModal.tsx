

import React from 'react';
import Modal from './ui/Modal';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../utils/formatters';
import type { Employee } from '../types';
import StatusBadge from './ui/StatusBadge';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({ isOpen, onClose, employee }) => {
    const { t } = useLocalization();
    const { sites } = useData();
    const { settings } = useSettings();
    
    const site = sites.find(s => s.id === employee.siteId);

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
            title={`${t('employeeProfile')}: ${employee.firstName} ${employee.lastName}`}
            widthClass="max-w-3xl"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label={t('firstName')} value={employee.firstName} />
                <DetailItem label={t('lastName')} value={employee.lastName} />
                <DetailItem label={t('code')} value={employee.code} />
                <DetailItem label={t('employeeType')} value={<StatusBadge status={employee.employeeType} />} />
                <DetailItem label={t('role')} value={employee.role} />
                <DetailItem label={t('category')} value={employee.category} />
                <DetailItem label={t('team')} value={employee.team} />
                <DetailItem label={t('grossWage')} value={formatCurrency(employee.grossWage, settings.localization)} />
                <DetailItem label={t('site')} value={site?.name} />
                <DetailItem label={t('email')} value={employee.email} />
                <DetailItem label={t('phone')} value={employee.phone} />
                <DetailItem label={t('hireDate')} value={employee.hireDate} />
            </div>
        </Modal>
    );
};

export default EmployeeProfileModal;