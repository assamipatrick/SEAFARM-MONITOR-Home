
import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { formatNumber } from '../../utils/formatters';
import type { FarmerDelivery } from '../../types';
import FarmerDeliveryFormModal from './FarmerDeliveryFormModal';

type SortableKeys = keyof FarmerDelivery | 'siteName' | 'farmerName' | 'seaweedTypeName';

const FarmerDeliveries: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { farmerDeliveries, sites, farmers, seaweedTypes, deleteFarmerDelivery } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, `${f.firstName} ${f.lastName}`])), [farmers]);
    const seaweedTypeMap = useMemo(() => new Map(seaweedTypes.map(st => [st.id, st.name])), [seaweedTypes]);

    const sortedDeliveries = useMemo(() => {
        let sortableItems = [...farmerDeliveries];
        sortableItems.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'siteName') valA = siteMap.get(a.siteId) || '';
            else if (sortConfig.key === 'farmerName') valA = farmerMap.get(a.farmerId) || '';
            else if (sortConfig.key === 'seaweedTypeName') valA = seaweedTypeMap.get(a.seaweedTypeId) || '';
            else valA = a[sortConfig.key as keyof FarmerDelivery];

            if (sortConfig.key === 'siteName') valB = siteMap.get(b.siteId) || '';
            else if (sortConfig.key === 'farmerName') valB = farmerMap.get(b.farmerId) || '';
            else if (sortConfig.key === 'seaweedTypeName') valB = seaweedTypeMap.get(b.seaweedTypeId) || '';
            else valB = b[sortConfig.key as keyof FarmerDelivery];
            
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [farmerDeliveries, sortConfig, siteMap, farmerMap, seaweedTypeMap]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}><button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className?.includes('text-right') ? 'justify-end' : ''}`}>{label}{getSortIcon(sortKey)}</button></th>
    );

    const handleDeleteClick = (deliveryId: string) => {
        setDeliveryToDelete(deliveryId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (deliveryToDelete) {
            deleteFarmerDelivery(deliveryToDelete);
        }
        setIsConfirmOpen(false);
        setDeliveryToDelete(null);
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('farmerDeliveriesTitle')}</h1>
                <Button onClick={() => setIsFormModalOpen(true)}><Icon name="PlusCircle" className="w-5 h-5"/>{t('recordDelivery')}</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <SortableHeader sortKey="slipNo" label={t('slipNo')} />
                                <SortableHeader sortKey="date" label={t('date')} />
                                <SortableHeader sortKey="siteName" label={t('site')} />
                                <SortableHeader sortKey="farmerName" label={t('farmerLabel')} />
                                <SortableHeader sortKey="seaweedTypeName" label={t('seaweedType')} />
                                <SortableHeader sortKey="totalWeightKg" label={t('totalWeightKgDelivery')} className="text-right" />
                                <SortableHeader sortKey="totalBags" label={t('totalBags')} className="text-right" />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDeliveries.map(delivery => (
                                <tr key={delivery.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3 font-mono">{delivery.slipNo}</td>
                                    <td className="p-3">{delivery.date}</td>
                                    <td className="p-3">{siteMap.get(delivery.siteId) || t('unknown')}</td>
                                    <td className="p-3">{farmerMap.get(delivery.farmerId) || t('unknown')}</td>
                                    <td className="p-3">{seaweedTypeMap.get(delivery.seaweedTypeId) || t('unknown')}</td>
                                    <td className="p-3 text-right">{formatNumber(delivery.totalWeightKg, settings.localization)}</td>
                                    <td className="p-3 text-right">{delivery.totalBags}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="danger" onClick={() => handleDeleteClick(delivery.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedDeliveries.length === 0 && (
                                <tr><td colSpan={8} className="p-6 text-center text-gray-500">{t('noDeliveriesRecorded')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isFormModalOpen && <FarmerDeliveryFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteDelivery')} />}
        </div>
    );
};

export default FarmerDeliveries;
