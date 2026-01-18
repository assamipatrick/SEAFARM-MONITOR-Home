import React from 'react';
import Modal from './ui/Modal';
import StatusBadge from './ui/StatusBadge';
import { useLocalization } from '../contexts/LocalizationContext';
import type { ModuleStatusHistory } from '../types';

interface ModuleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ModuleStatusHistory[];
  moduleCode: string;
}

const ModuleHistoryModal: React.FC<ModuleHistoryModalProps> = ({ isOpen, onClose, history, moduleCode }) => {
    const { t, language } = useLocalization();

    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${t('moduleStatusHistoryTitle')}: ${moduleCode}`}
            widthClass="max-w-2xl"
        >
            <div className="max-h-[60vh] overflow-y-auto pr-4">
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-4">                  
                    {sortedHistory.map((item, index) => (
                        <li key={index} className="mb-8 ml-8">            
                            <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800/70 dark:bg-blue-900">
                                <svg className="w-2.5 h-2.5 text-blue-800 dark:text-blue-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4Z"/>
                                    <path d="M0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z"/>
                                </svg>
                            </span>
                            <div className="flex items-center mb-1">
                                <StatusBadge status={item.status} />
                                <time className="block ml-4 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                                    {new Date(item.date).toLocaleString(language, { dateStyle: 'long', timeStyle: 'short' })}
                                </time>
                            </div>
                            {item.notes && <p className="text-base font-normal text-gray-600 dark:text-gray-300 mt-2">{t('notes')}: {item.notes}</p>}
                        </li>
                    ))}
                </ol>
            </div>
        </Modal>
    );
};

export default ModuleHistoryModal;
