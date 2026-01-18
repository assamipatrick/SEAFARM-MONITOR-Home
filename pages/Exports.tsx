
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { formatCurrency } from '../utils/formatters';
import type { ExportDocument } from '../types';
import ExportDocumentFormModal from '../components/ExportDocumentFormModal';
import ExportPrintModal from '../components/ExportPrintModal';

type SortableKeys = keyof ExportDocument | 'seaweedTypeName' | 'totalValue';
type DocType = 'invoice' | 'packing-list' | 'cert-of-origin' | 'all';

const Exports: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { exportDocuments, seaweedTypes, deleteExportDocument } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingDocument, setEditingDocument] = useState<ExportDocument | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [docToPrint, setDocToPrint] = useState<ExportDocument | null>(null);
    const [docTypeToShow, setDocTypeToShow] = useState<DocType>('all');
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const seaweedTypeMap = useMemo(() => new Map(seaweedTypes.map(st => [st.id, st.name])), [seaweedTypes]);

    const sortedDocuments = useMemo(() => {
        let sortableItems = exportDocuments.map(doc => ({
            ...doc,
            totalValue: doc.containers.reduce((sum, c) => sum + c.value, 0)
        }));
        
        sortableItems.sort((a, b) => {
            let valA, valB;
            switch(sortConfig.key) {
                case 'seaweedTypeName':
                    valA = seaweedTypeMap.get(a.seaweedTypeId) || '';
                    valB = seaweedTypeMap.get(b.seaweedTypeId) || '';
                    break;
                case 'totalValue':
                    valA = a.totalValue;
                    valB = b.totalValue;
                    break;
                default:
                    valA = a[sortConfig.key as keyof ExportDocument];
                    valB = b[sortConfig.key as keyof ExportDocument];
            }
            
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [exportDocuments, sortConfig, seaweedTypeMap]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}><button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className?.includes('text-right') ? 'justify-end' : ''}`}>{label}{getSortIcon(sortKey)}</button></th>
    );

    const handleOpenModal = (doc: ExportDocument | null = null) => {
        setEditingDocument(doc);
        setIsFormModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingDocument(null);
        setIsFormModalOpen(false);
    };

    const handleDeleteClick = (docId: string) => {
        setDocToDelete(docId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (docToDelete) {
            deleteExportDocument(docToDelete);
        }
        setIsConfirmOpen(false);
        setDocToDelete(null);
    };

    const handlePrintClick = (doc: ExportDocument, type: DocType) => {
        setDocToPrint(doc);
        setDocTypeToShow(type);
        setIsPrintModalOpen(true);
        setOpenDropdownId(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">{t('exports')}</h1>
                <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('createExportDocument')}</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <SortableHeader sortKey="docNo" label={t('docNo')} />
                                <SortableHeader sortKey="date" label={t('date')} />
                                <SortableHeader sortKey="invoiceNo" label={t('invoiceNo')} />
                                <SortableHeader sortKey="seaweedTypeName" label={t('seaweedType')} />
                                <SortableHeader sortKey="destinationCountry" label={t('destination')} />
                                <th className="p-3 text-center">{t('containers')}</th>
                                <SortableHeader sortKey="totalValue" label={t('totalValue')} className="text-right" />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDocuments.map(doc => {
                                const currencySymbol = doc.currency === 'EUR' ? '€' : (doc.currency === 'USD' ? '$' : doc.currency);
                                
                                return (
                                    <tr key={doc.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                        <td className="p-3 font-mono">{doc.docNo}</td>
                                        <td className="p-3">{doc.date}</td>
                                        <td className="p-3">{doc.invoiceNo}</td>
                                        <td className="p-3">{seaweedTypeMap.get(doc.seaweedTypeId) || doc.seaweedTypeId}</td>
                                        <td className="p-3">{doc.destinationCountry}</td>
                                        <td className="p-3 text-center">{doc.containers.length}</td>
                                        <td className="p-3 text-right">{formatCurrency(doc.totalValue, { ...settings.localization, currencySymbol })}</td>
                                        <td className="p-3 text-right">
                                            <div className="relative flex justify-end gap-1" ref={openDropdownId === doc.id ? dropdownRef : null}>
                                                <Button variant="ghost" onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}>
                                                    {t('documents')}
                                                    <Icon name="ChevronDown" className="w-4 h-4" />
                                                </Button>
                                                {openDropdownId === doc.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-10 p-1">
                                                        <button onClick={() => handlePrintClick(doc, 'invoice')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                                                            <Icon name="FileText" className="w-4 h-4" /> {t('printInvoice')}
                                                        </button>
                                                        <button onClick={() => handlePrintClick(doc, 'packing-list')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                                                            <Icon name="Package" className="w-4 h-4" /> {t('printPackingList')}
                                                        </button>
                                                        <button onClick={() => handlePrintClick(doc, 'cert-of-origin')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                                                            <Icon name="Globe" className="w-4 h-4" /> {t('printCertOfOrigin')}
                                                        </button>
                                                        <div className="my-1 border-t dark:border-gray-600"></div>
                                                        <button onClick={() => handlePrintClick(doc, 'all')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                                                            <Icon name="Printer" className="w-4 h-4" /> {t('printAllDocuments')}
                                                        </button>
                                                    </div>
                                                )}
                                                <Button variant="ghost" onClick={() => handleOpenModal(doc)}><Icon name="Settings" className="w-4 h-4" /></Button>
                                                <Button variant="danger" onClick={() => handleDeleteClick(doc.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {sortedDocuments.length === 0 && (
                                <tr><td colSpan={8} className="p-6 text-center text-gray-500">{t('noDataForReport')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isFormModalOpen && <ExportDocumentFormModal isOpen={isFormModalOpen} onClose={handleCloseModal} doc={editingDocument} />}
            {isPrintModalOpen && docToPrint && <ExportPrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} doc={docToPrint} docTypeToShow={docTypeToShow} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteExport')} />}
        </div>
    );
};

export default Exports;
