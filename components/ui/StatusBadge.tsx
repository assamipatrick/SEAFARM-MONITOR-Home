
import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { HistoryStatus } from '../../types';
import { SiteTransferStatus } from '../../types';

interface StatusBadgeProps {
    status?: HistoryStatus | SiteTransferStatus | string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const { t } = useLocalization();

    if (!status) return null;

    const statusInfo: Record<string, { textKey: string; color: string }> = {
        // Module/History Statuses
        'FREE': { textKey: 'status_FREE', color: 'gray' },
        'ASSIGNED': { textKey: 'status_ASSIGNED', color: 'green' },
        'CREATED': { textKey: 'status_CREATED', color: 'indigo' },
        'CUTTING': { textKey: 'status_CUTTING', color: 'orange' },
        'PLANTED': { textKey: 'status_PLANTED', color: 'blue' },
        'GROWING': { textKey: 'status_GROWING', color: 'cyan' },
        'HARVESTED': { textKey: 'status_HARVESTED', color: 'yellow' },
        'DRYING': { textKey: 'status_DRYING', color: 'orange' },
        'BAGGING': { textKey: 'status_BAGGING', color: 'purple' },
        'IN_STOCK': { textKey: 'status_IN_STOCK', color: 'pink' },
        'EXPORTED': { textKey: 'status_EXPORTED', color: 'red' },
        'MAINTENANCE': { textKey: 'status_MAINTENANCE', color: 'gray' },
        'STORED': { textKey: 'status_STORED', color: 'gray' },
        
        // Site Transfer Statuses
        [SiteTransferStatus.AWAITING_OUTBOUND]: { textKey: 'status_AWAITING_OUTBOUND', color: 'yellow' },
        [SiteTransferStatus.IN_TRANSIT]: { textKey: 'status_IN_TRANSIT', color: 'blue' },
        [SiteTransferStatus.COMPLETED]: { textKey: 'status_COMPLETED', color: 'green' },
        [SiteTransferStatus.CANCELLED]: { textKey: 'status_CANCELLED', color: 'red' },
        
        // Incident Severity
        'LOW': { textKey: 'severity_LOW', color: 'cyan' },
        'MEDIUM': { textKey: 'severity_MEDIUM', color: 'yellow' },
        'HIGH': { textKey: 'severity_HIGH', color: 'orange' },
        'CRITICAL': { textKey: 'severity_CRITICAL', color: 'red' },

        // Incident Status
        'OPEN': { textKey: 'status_OPEN', color: 'blue' },
        'IN_PROGRESS': { textKey: 'status_IN_PROGRESS', color: 'purple' },
        'RESOLVED': { textKey: 'status_RESOLVED', color: 'green' },
        'CLOSED': { textKey: 'status_CLOSED', color: 'gray' },

        // Employee Type
        'PERMANENT': { textKey: 'employeeType_PERMANENT', color: 'blue' },
        'CASUAL': { textKey: 'employeeType_CASUAL', color: 'green' },
    };

    const { textKey, color } = statusInfo[status] || { textKey: status, color: 'gray' };
    
    const text = t(textKey as any) || status;

    const colorClasses: { [key: string]: string } = {
        green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
        indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses[color]}`}>{text}</span>
};

export default StatusBadge;
