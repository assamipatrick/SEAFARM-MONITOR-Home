import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { ModuleStatus } from '../../types';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Checkbox from '../../components/ui/Checkbox';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const TransferToStockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string) => void;
    selectedCount: number;
    defaultDate: string;
}> = ({ isOpen, onClose, onConfirm, selectedCount, defaultDate }) => {
    const { t } = useLocalization();
    const [transferDate, setTransferDate] = useState(defaultDate);

    useEffect(() => {
        if (isOpen) setTransferDate(defaultDate);
    }, [isOpen, defaultDate]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('confirmTransfer')}
            widthClass="max-w-md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={() => onConfirm(transferDate)} disabled={!transferDate}>{t('confirm')}</Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('confirmNormalTransferMessage').replace('{count}', String(selectedCount))}
                </p>
                <Input
                    label={t('stockTransferDate')}
                    type="date"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    required
                />
            </div>
        </Modal>
    );
};

const NormalTransfer: React.FC = () => {
    const { t } = useLocalization();
    const { cultivationCycles, modules, transferBaggedToStock } = useData();
    const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const pendingTransfers = useMemo(() => {
        return cultivationCycles
            .filter(c => c.status === ModuleStatus.BAGGED)
            .map(cycle => {
                const module = modules.find(m => m.id === cycle.moduleId);
                return { cycle, module };
            });
    }, [cultivationCycles, modules]);

    const defaultTransferDate = useMemo(() => {
        const selected = cultivationCycles.filter(c => selectedCycleIds.includes(c.id));
        if (selected.length === 0) return new Date().toISOString().split('T')[0];
        
        // Find the latest bagged date among selected cycles
        const latestBaggedDate = selected.reduce((latest, c) => {
            if (!c.baggedDate) return latest;
            return c.baggedDate > latest ? c.baggedDate : latest;
        }, '0000-00-00');

        return latestBaggedDate === '0000-00-00' ? new Date().toISOString().split('T')[0] : latestBaggedDate;
    }, [selectedCycleIds, cultivationCycles]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCycleIds(pendingTransfers.map(p => p.cycle.id));
        } else {
            setSelectedCycleIds([]);
        }
    };
    
    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, cycleId: string) => {
        if (e.target.checked) {
            setSelectedCycleIds(prev => [...prev, cycleId]);
        } else {
            setSelectedCycleIds(prev => prev.filter(id => id !== cycleId));
        }
    };

    const handleTransfer = () => {
        if(selectedCycleIds.length > 0) {
            setIsConfirmOpen(true);
        }
    };
    
    const handleConfirmTransfer = (date: string) => {
        transferBaggedToStock(selectedCycleIds, date);
        setSelectedCycleIds([]);
        setIsConfirmOpen(false);
    };

    return (
        <div>
            <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('pendingTransfers')}</h3>
                <Button onClick={handleTransfer} disabled={selectedCycleIds.length === 0}>
                    <Icon name="ArrowRightLeft" className="w-4 h-4" />
                    {t('transferToWarehouse')}
                </Button>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800">
                         <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                            <th className="p-2 w-4"><Checkbox onChange={handleSelectAll} checked={selectedCycleIds.length === pendingTransfers.length && pendingTransfers.length > 0} /></th>
                            <th className="p-2 font-semibold">{t('moduleCode')}</th>
                            <th className="p-2 font-semibold">{t('baggedDate')}</th>
                            <th className="p-2 font-semibold text-right">{t('baggedWeightKg')}</th>
                            <th className="p-2 font-semibold text-right">{t('bags')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingTransfers.map(({ cycle, module }) => (
                            <tr key={cycle.id} className="border-b dark:border-gray-700/50">
                                <td className="p-2"><Checkbox checked={selectedCycleIds.includes(cycle.id)} onChange={e => handleSelectOne(e, cycle.id)} /></td>
                                <td className="p-2 font-mono">{module?.code}</td>
                                <td className="p-2">{cycle.baggedDate}</td>
                                <td className="p-2 text-right">{cycle.baggedWeightKg}</td>
                                <td className="p-2 text-right">{cycle.baggedBagsCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pendingTransfers.length === 0 && <p className="text-center p-8 text-gray-500">{t('noPendingTransfers')}</p>}
            </div>
             
             <TransferToStockModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmTransfer}
                selectedCount={selectedCycleIds.length}
                defaultDate={defaultTransferDate}
             />
        </div>
    );
};

export default NormalTransfer;
