
import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/ui/StatusBadge';
import SiteTransferFormModal from '../../components/SiteTransferFormModal';
import SiteTransferStatusModal from '../../components/SiteTransferStatusModal';
import SiteTransferHistoryLog from '../../components/SiteTransferHistoryLog';
import type { SiteTransfer } from '../../types';
import { SiteTransferStatus } from '../../types';

type SortableKeys = keyof SiteTransfer | 'sourceSiteName' | 'destinationSiteName' | 'seaweedTypeName';

const SiteTransfers: React.FC = () => {
    const { t } = useLocalization();
    const { siteTransfers, sites, seaweedTypes, updateSiteTransfer } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [transferToUpdate, setTransferToUpdate] = useState<SiteTransfer | null>(null);
    const [statusAction, setStatusAction] = useState<SiteTransferStatus.COMPLETED | SiteTransferStatus.CANCELLED | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const siteMap = useMemo(() => {
        const map = new Map(sites.map(s => [s.id, s.name]));
        map.set('pressing-warehouse', t('pressedWarehouseTitle'));
        return map;
    }, [sites, t]);

    const seaweedTypeMap = useMemo(() => new Map(seaweedTypes.map(st => [st.id, st.name])), [seaweedTypes]);

    const sortedTransfers = useMemo(() => {
        let sortableItems = [...siteTransfers];
        sortableItems.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'sourceSiteName') valA = siteMap.get(a.sourceSiteId) || '';
            else if (sortConfig.key === 'destinationSiteName') valA = siteMap.get(a.destinationSiteId) || '';
            else if (sortConfig.key === 'seaweedTypeName') valA = seaweedTypeMap.get(a.seaweedTypeId) || '';
            else valA = a[sortConfig.key as keyof SiteTransfer];
            
            if (sortConfig.key === 'sourceSiteName') valB = siteMap.get(b.sourceSiteId) || '';
            else if (sortConfig.key === 'destinationSiteName') valB = siteMap.get(b.destinationSiteId) || '';
            else if (sortConfig.key === 'seaweedTypeName') valB = seaweedTypeMap.get(b.seaweedTypeId) || '';
            else valB = b[sortConfig.key as keyof SiteTransfer];

            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [siteTransfers, sortConfig, siteMap, seaweedTypeMap]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`} onClick={() => requestSort(sortKey)}>
            <div className={`flex items-center gap-2 ${className?.includes('text-right') ? 'justify-end' : ''}`}>
                {label}
                {sortConfig.key === sortKey && (
                    <Icon name={sortConfig.direction === 'ascending' ? 'ArrowUp' : 'ArrowDown'} className="w-3 h-3" />
                )}
            </div>
        </th>
    );

    const handleUpdateStatus = (transfer: SiteTransfer, newStatus: SiteTransferStatus) => {
        setTransferToUpdate(transfer);
        if (newStatus === SiteTransferStatus.IN_TRANSIT || newStatus === SiteTransferStatus.PENDING_RECEPTION) {
            updateSiteTransfer({ ...transfer, status: newStatus });
        } else {
            // Completed or Cancelled require more info
            setStatusAction(newStatus as SiteTransferStatus.COMPLETED | SiteTransferStatus.CANCELLED);
            setIsStatusModalOpen(true);
        }
    };
    
    const handleConfirmStatusUpdate = (updatedTransfer: SiteTransfer) => {
        updateSiteTransfer(updatedTransfer);
        setIsStatusModalOpen(false);
        setTransferToUpdate(null);
        setStatusAction(null);
    };

    const renderActions = (transfer: SiteTransfer) => {
        const iconClass = "w-4 h-4 mr-1";
        switch (transfer.status) {
            case SiteTransferStatus.AWAITING_OUTBOUND:
                return (
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => handleUpdateStatus(transfer, SiteTransferStatus.IN_TRANSIT)}>
                            <Icon name="Truck" className={iconClass} /> {t('status_IN_TRANSIT')}
                        </Button>
                        <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleUpdateStatus(transfer, SiteTransferStatus.CANCELLED)}>
                            <Icon name="X" className={iconClass} /> {t('cancel')}
                        </Button>
                    </div>
                );
            case SiteTransferStatus.IN_TRANSIT:
                return (
                    <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => handleUpdateStatus(transfer, SiteTransferStatus.PENDING_RECEPTION)}>
                         <Icon name="MapPin" className={iconClass} /> {t('status_PENDING_RECEPTION')}
                    </Button>
                );
            case SiteTransferStatus.PENDING_RECEPTION:
                 return (
                    <div className="flex gap-2 justify-end">
                        <Button variant="primary" className="!px-2 !py-1 text-xs" onClick={() => handleUpdateStatus(transfer, SiteTransferStatus.COMPLETED)}>
                            <Icon name="Check" className={iconClass} /> {t('confirm')}
                        </Button>
                        <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleUpdateStatus(transfer, SiteTransferStatus.CANCELLED)}>
                            <Icon name="X" className={iconClass} /> {t('cancel')}
                        </Button>
                    </div>
                );
            default:
                return <span className="text-xs text-gray-500 italic">{t('noActions')}</span>;
        }
    };

    // Helper to extract a readable ID for the slip
    const formatTransferId = (id: string) => {
        if (id.startsWith('st-')) {
            const suffix = id.split('-')[1].slice(-6);
            return `SLIP-${suffix}`;
        }
        return id;
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('siteTransfersTitle')}</h1>
                <Button onClick={() => setIsFormModalOpen(true)}>
                    <Icon name="PlusCircle" className="w-5 h-5 mr-2"/>
                    {t('createShippingSlip')}
                </Button>
            </div>

            <Card>
                 <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                            <tr>
                                <th className="p-3 w-10"></th>
                                <SortableHeader sortKey="id" label={t('slipNo')} />
                                <SortableHeader sortKey="date" label={t('date')} />
                                <SortableHeader sortKey="sourceSiteName" label={t('sourceSite')} />
                                <SortableHeader sortKey="destinationSiteName" label={t('destinationSite')} />
                                <SortableHeader sortKey="seaweedTypeName" label={t('seaweedType')} />
                                <SortableHeader sortKey="weightKg" label={t('shippedWeightKg')} className="text-right" />
                                <SortableHeader sortKey="status" label={t('status')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransfers.map(transfer => {
                                const isExpanded = expandedRowId === transfer.id;
                                return (
                                <React.Fragment key={transfer.id}>
                                    <tr className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                        <td className="p-3 text-center">
                                            <button onClick={() => setExpandedRowId(isExpanded ? null : transfer.id)} className="text-gray-500 hover:text-blue-600 focus:outline-none">
                                                <Icon name="ChevronRight" className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                                            {formatTransferId(transfer.id)}
                                        </td>
                                        <td className="p-3">{transfer.date}</td>
                                        <td className="p-3">{siteMap.get(transfer.sourceSiteId) || t('unknown')}</td>
                                        <td className="p-3">{siteMap.get(transfer.destinationSiteId) || t('unknown')}</td>
                                        <td className="p-3">{seaweedTypeMap.get(transfer.seaweedTypeId) || t('unknown')}</td>
                                        <td className="p-3 text-right font-medium">{transfer.weightKg.toFixed(2)}</td>
                                        <td className="p-3"><StatusBadge status={transfer.status} /></td>
                                        <td className="p-3 text-right">
                                            {renderActions(transfer)}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-100/50 dark:bg-gray-900/30">
                                            <td colSpan={9} className="p-0 border-b dark:border-gray-700/50">
                                                <div className="p-4 pl-12 grid grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">{t('transportDetails')}</h4>
                                                        <div className="text-sm space-y-1">
                                                            <p><span className="text-gray-500">{t('transporter')}:</span> {transfer.transporter}</p>
                                                            <p><span className="text-gray-500">{t('transport')}:</span> {transfer.transport || '-'}</p>
                                                            <p><span className="text-gray-500">{t('representative')}:</span> {transfer.representative || '-'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <SiteTransferHistoryLog history={transfer.history} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )})}
                            {sortedTransfers.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">{t('noDataForReport')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modals */}
            {isFormModalOpen && (
                <SiteTransferFormModal 
                    isOpen={isFormModalOpen} 
                    onClose={() => setIsFormModalOpen(false)} 
                />
            )}
            
            {isStatusModalOpen && transferToUpdate && statusAction && (
                <SiteTransferStatusModal
                    isOpen={isStatusModalOpen}
                    onClose={() => setIsStatusModalOpen(false)}
                    transfer={transferToUpdate}
                    action={statusAction}
                    onConfirm={handleConfirmStatusUpdate}
                />
            )}
        </div>
    );
};

export default SiteTransfers;
