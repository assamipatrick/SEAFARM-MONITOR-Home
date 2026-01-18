
import React, { useState } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import NormalTransfer from './NormalTransfer';
import StockStatus from './StockStatus';
import StockMovementFormModal from './StockMovementFormModal';
import MovementHistory from './MovementHistory';

const StockManagement: React.FC = () => {
    const { t } = useLocalization();
    const [activeView, setActiveView] = useState<'status' | 'transfer' | 'history'>('status');
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('onSiteStorageTitle')}</h1>
                <Button onClick={() => setIsMovementModalOpen(true)}>
                    <Icon name="PlusCircle" className="w-5 h-5" />
                    {t('recordMovement')}
                </Button>
            </div>
            
            <Card>
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button 
                        onClick={() => setActiveView('status')} 
                        className={`py-2 px-4 text-sm font-medium ${activeView === 'status' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        {t('stockStatus')}
                    </button>
                    <button 
                        onClick={() => setActiveView('transfer')} 
                        className={`py-2 px-4 text-sm font-medium ${activeView === 'transfer' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        {t('normalTransfer')}
                    </button>
                    <button 
                        onClick={() => setActiveView('history')} 
                        className={`py-2 px-4 text-sm font-medium ${activeView === 'history' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        {t('movementHistory')}
                    </button>
                </div>

                {activeView === 'status' && <StockStatus />}
                {activeView === 'transfer' && <NormalTransfer />}
                {activeView === 'history' && <MovementHistory />}
            </Card>

             <StockMovementFormModal 
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
            />
        </div>
    );
};

export default StockManagement;
