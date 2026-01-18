
import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import type { SiteTransferHistoryEntry } from '../types';
import StatusBadge from './ui/StatusBadge';

interface SiteTransferHistoryLogProps {
  history: SiteTransferHistoryEntry[];
}

const SiteTransferHistoryLog: React.FC<SiteTransferHistoryLogProps> = ({ history }) => {
    const { t, language } = useLocalization();

    if (!history || history.length === 0) {
        return <p className="p-4 text-gray-500">{t('noHistory')}</p>;
    }

    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <h4 className="text-sm font-bold uppercase text-gray-500 mb-3">{t('siteTransferHistoryTitle')}</h4>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2">                  
                {sortedHistory.map((item, index) => (
                    <li key={index} className="mb-6 ml-6">            
                        <span className="absolute flex items-center justify-center w-3 h-3 bg-blue-100 rounded-full -left-1.5 ring-4 ring-white dark:ring-gray-800 dark:bg-blue-900"></span>
                        <div className="flex items-center mb-1">
                            <StatusBadge status={item.status} />
                            <time className="block ml-4 text-xs font-normal leading-none text-gray-400 dark:text-gray-500">
                                {new Date(item.date).toLocaleString(language, { dateStyle: 'long', timeStyle: 'short' })}
                            </time>
                        </div>
                        {item.notes && <p className="text-sm font-normal text-gray-600 dark:text-gray-300 mt-1">{item.notes}</p>}
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default SiteTransferHistoryLog;
