
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import CascadeDeleteConfirmationModal from '../components/CascadeDeleteConfirmationModal';
import CuttingOperationFormModal from '../components/CuttingOperationFormModal';
import PlantingFormModal from '../components/PlantingFormModal';
import DebugPanel from '../components/DebugPanel';
import { formatCurrency } from '../utils/formatters';
import type { CuttingOperation } from '../types';

type SortableKeys = keyof CuttingOperation | 'siteName' | 'providerName';

const CuttingOperations: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { cuttingOperations, sites, serviceProviders, modules, farmers, deleteCuttingOperation, getCyclesByCuttingOperationId } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingOperation, setEditingOperation] = useState<CuttingOperation | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [operationToDelete, setOperationToDelete] = useState<CuttingOperation | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });


    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);
    const providerMap = useMemo(() => new Map(serviceProviders.map(p => [p.id, p.name])), [serviceProviders]);
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, `${f.firstName} ${f.lastName}`])), [farmers]);
    const moduleInfoMap = useMemo(() => {
        const map = new Map<string, { code: string; farmerName?: string }>();
        modules.forEach(m => {
            const farmerName = m.farmerId ? farmerMap.get(m.farmerId) : undefined;
            map.set(m.id, { code: m.code, farmerName });
        });
        return map;
    }, [modules, farmerMap]);

    const sortedOperations = useMemo(() => {
        let sortableItems = [...cuttingOperations];
        sortableItems.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'siteName') {
                valA = siteMap.get(a.siteId) || '';
                valB = siteMap.get(b.siteId) || '';
            } else if (sortConfig.key === 'providerName') {
                valA = providerMap.get(a.serviceProviderId) || '';
                valB = providerMap.get(b.serviceProviderId) || '';
            }
             else {
                valA = a[sortConfig.key as keyof CuttingOperation];
                valB = b[sortConfig.key as keyof CuttingOperation];
            }

            if (valA < valB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [cuttingOperations, sortConfig, siteMap, providerMap]);


    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) {
            return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        }
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors w-full ${className?.includes('text-right') ? 'justify-end' : ''} ${className?.includes('text-center') ? 'justify-center' : ''}`}>
                {label}
                {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const handleOpenEditModal = (operation: CuttingOperation) => {
        setEditingOperation(operation);
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingOperation(null);
        setIsEditModalOpen(false);
        setIsAddModalOpen(false);
    };

    const handleDeleteClick = (operation: CuttingOperation) => {
        setOperationToDelete(operation);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (operationToDelete) {
            deleteCuttingOperation(operationToDelete.id);
        }
        setIsConfirmOpen(false);
        setOperationToDelete(null);
    };
    
    const relatedCycles = useMemo(() => {
        return operationToDelete ? getCyclesByCuttingOperationId(operationToDelete.id) : [];
    }, [operationToDelete, getCyclesByCuttingOperationId]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">{t('cuttingOperationsTitle')}</h1>
                <Button onClick={() => setIsAddModalOpen(true)}><Icon name="PlusCircle" className="w-5 h-5"/>{t('newPlanting')}</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <SortableHeader sortKey="date" label={t('date')} />
                                <SortableHeader sortKey="siteName" label={t('site')} />
                                <SortableHeader sortKey="providerName" label={t('serviceProvider')} />
                                <th className="p-3">{t('beneficiaryFarmers')}</th>
                                <th className="p-3">{t('modules')}</th>
                                <SortableHeader sortKey="totalAmount" label={t('totalAmount')} className="text-right" />
                                <SortableHeader sortKey="isPaid" label={t('status')} className="text-center" />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOperations.map(op => {
                                const beneficiaryFarmers = (() => {
                                    if (op.beneficiaryFarmerId) {
                                        const farmerName = farmerMap.get(op.beneficiaryFarmerId);
                                        return farmerName ? [farmerName] : [];
                                    }
                                    // Fallback for old data or other types of cutting operations.
                                    const moduleIds = op.moduleCuts.map(mc => mc.moduleId);
                                    const farmerIds = moduleIds
                                        .map(moduleId => modules.find(m => m.id === moduleId)?.farmerId)
                                        .filter((id): id is string => !!id);
                                    return [...new Set(farmerIds)]
                                        .map(id => farmerMap.get(id))
                                        .filter((name): name is string => !!name);
                                })();
                                
                                const allModuleDisplayTexts = op.moduleCuts.map(mc => {
                                    const moduleInfo = moduleInfoMap.get(mc.moduleId);
                                    // Format: ModuleCode or shortened ID if not found
                                    return moduleInfo 
                                        ? `${moduleInfo.code} (${mc.linesCut} l.)` 
                                        : <span className="font-mono text-[10px] text-gray-500">{t('unknown')} (ID: {mc.moduleId.substring(0, 6)})</span>;
                                });

                                return (
                                    <tr key={op.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="p-3">{op.date}</td>
                                        <td className="p-3" title={op.siteId}>{siteMap.get(op.siteId) || t('unknown')}</td>
                                        <td className="p-3" title={op.serviceProviderId}>{providerMap.get(op.serviceProviderId) || t('unknown')}</td>
                                        <td className="p-3">
                                            {beneficiaryFarmers.length > 0 ? (
                                                <div className="relative group">
                                                    <span className="truncate">{beneficiaryFarmers[0]}</span>
                                                    {beneficiaryFarmers.length > 1 && (
                                                        <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                                            +{beneficiaryFarmers.length - 1}
                                                        </span>
                                                    )}
                                                     <div className="absolute bottom-full mb-2 w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 p-2 text-sm text-white bg-gray-900 dark:bg-black rounded-lg shadow-lg">
                                                        {beneficiaryFarmers.join(', ')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic">{t('noBeneficiary')}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {allModuleDisplayTexts.slice(0, 3).map((displayText, idx) => (
                                                    <span key={idx} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full whitespace-nowrap flex items-center">{displayText}</span>
                                                ))}
                                                {allModuleDisplayTexts.length > 3 && (
                                                     <div className="relative group">
                                                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full cursor-pointer">...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">{formatCurrency(op.totalAmount, settings.localization)}</td>
                                        <td className="p-3 text-center">
                                            {op.isPaid ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{t('paid')}</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('unpaid')}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" onClick={() => handleOpenEditModal(op)}><Icon name="Settings" className="w-4 h-4" />{t('edit')}</Button>
                                                <Button variant="danger" onClick={() => handleDeleteClick(op)}><Icon name="Trash2" className="w-4 h-4" />{t('delete')}</Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isAddModalOpen && <PlantingFormModal isOpen={isAddModalOpen} onClose={handleCloseModal} />}
            {isEditModalOpen && <CuttingOperationFormModal isOpen={isEditModalOpen} onClose={handleCloseModal} operation={editingOperation} />}
            
            <CascadeDeleteConfirmationModal 
                isOpen={isConfirmOpen} 
                onClose={() => setIsConfirmOpen(false)} 
                onConfirm={handleConfirmDelete} 
                operation={operationToDelete}
                relatedCycles={relatedCycles}
            />
            
            <DebugPanel />
        </div>
    );
};

export default CuttingOperations;
