
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import type { CreditType, FarmerCredit, Farmer, Repayment } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import FarmerProfileModal from '../components/FarmerProfileModal';
import CreditTypeEditModal from '../components/CreditTypeEditModal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Checkbox from '../components/ui/Checkbox';

const FarmerCredits: React.FC = () => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState('status');

    const tabs = [
        { id: 'status', label: t('creditStatus') },
        { id: 'record', label: t('recordCredit') },
        { id: 'repayment', label: t('recordRepayment') },
        { id: 'settings', label: t('creditTypeSettings') },
    ];

    return (
        <div className="pb-20">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('farmerCreditsTitle')}</h1>
            
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'status' && <CreditStatus />}
                {activeTab === 'record' && <RecordCreditForm />}
                {activeTab === 'repayment' && <RecordRepaymentForm />}
                {activeTab === 'settings' && <CreditTypeSettings />}
            </div>
        </div>
    );
};

type FarmerCreditSummary = {
    farmer: Farmer;
    farmerName: string;
    totalContracted: number;
    totalRepayments: number;
    balance: number;
    lastRepaymentDate: string | null;
};

const CreditStatus: React.FC = () => {
    const { t, language } = useLocalization();
    const { farmers, farmerCredits, deleteFarmer, repayments, addMultipleFarmerCredits, addMultipleRepayments, creditTypes } = useData();
    const { settings } = useSettings();
    const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof FarmerCreditSummary; direction: 'ascending' | 'descending' }>({ key: 'farmerName', direction: 'ascending' });
    const [expandedFarmerId, setExpandedFarmerId] = useState<string | null>(null);
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    // Note: Bulk actions could be implemented here as modals, for brevity we focus on the main view.

    const creditTypeMap = useMemo(() => new Map(creditTypes.map(ct => [ct.id, ct.name])), [creditTypes]);

    const farmerCreditSummaries = useMemo((): FarmerCreditSummary[] => {
        let sortableItems = farmers.map(farmer => {
            const credits = farmerCredits.filter(c => c.farmerId === farmer.id);
            const farmerRepayments = repayments.filter(r => r.farmerId === farmer.id);

            const totalContracted = credits.reduce((sum, c) => sum + c.totalAmount, 0);
            const totalRepayments = farmerRepayments.reduce((sum, r) => sum + r.amount, 0);

            const balance = totalContracted - totalRepayments;

            let lastRepaymentDate: string | null = null;
            if (farmerRepayments.length > 0) {
                 lastRepaymentDate = [...farmerRepayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date;
            }

            return {
                farmer,
                farmerName: `${farmer.firstName} ${farmer.lastName}`,
                totalContracted,
                totalRepayments,
                balance,
                lastRepaymentDate,
            };
        });

        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA === null) return 1;
                if (valB === null) return -1;
                
                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [farmers, farmerCredits, repayments, sortConfig]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numSelected = selectedFarmerIds.length;
            const numVisible = farmerCreditSummaries.length;
            selectAllCheckboxRef.current.checked = numSelected === numVisible && numVisible > 0;
            selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numVisible;
        }
    }, [selectedFarmerIds, farmerCreditSummaries]);

    const requestSort = (key: keyof FarmerCreditSummary) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: keyof FarmerCreditSummary) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };
    
    const SortableHeader: React.FC<{ sortKey: keyof FarmerCreditSummary; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className?.includes('text-right') ? 'justify-end' : ''}`}>{label}{getSortIcon(sortKey)}</button>
        </th>
    );

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFarmerIds(farmerCreditSummaries.map(f => f.farmer.id));
        } else {
            setSelectedFarmerIds([]);
        }
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        if (e.target.checked) {
            setSelectedFarmerIds(prev => [...prev, id]);
        } else {
            setSelectedFarmerIds(prev => prev.filter(fid => fid !== id));
        }
    };

    const toggleRow = (id: string) => {
        setExpandedFarmerId(expandedFarmerId === id ? null : id);
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t('creditStatus')}</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="p-3 w-4"><Checkbox ref={selectAllCheckboxRef} onChange={handleSelectAll} aria-label={t('selectAllFarmers')} /></th>
                            <th className="p-3 w-8"></th>
                            <SortableHeader sortKey="farmerName" label={t('farmer')} />
                            <SortableHeader sortKey="totalContracted" label={t('contractedCredits')} className="text-right" />
                            <SortableHeader sortKey="totalRepayments" label={t('repayments')} className="text-right" />
                            <SortableHeader sortKey="balance" label={t('remainingBalance')} className="text-right" />
                            <SortableHeader sortKey="lastRepaymentDate" label={t('lastRepaymentDate')} />
                        </tr>
                    </thead>
                    <tbody>
                        {farmerCreditSummaries.map((item) => (
                            <React.Fragment key={item.farmer.id}>
                                <tr className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3"><Checkbox checked={selectedFarmerIds.includes(item.farmer.id)} onChange={(e) => handleSelectOne(e, item.farmer.id)} aria-label={t('selectFarmerNamed').replace('{name}', item.farmerName)} /></td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => toggleRow(item.farmer.id)} className="text-gray-500 hover:text-gray-700">
                                            <Icon name={expandedFarmerId === item.farmer.id ? "ChevronDown" : "ChevronRight"} className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="p-3 font-medium">{item.farmerName}</td>
                                    <td className="p-3 text-right">{formatCurrency(item.totalContracted, settings.localization)}</td>
                                    <td className="p-3 text-right">{formatCurrency(item.totalRepayments, settings.localization)}</td>
                                    <td className={`p-3 text-right font-bold ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(item.balance, settings.localization)}
                                    </td>
                                    <td className="p-3">{item.lastRepaymentDate || '-'}</td>
                                </tr>
                                {expandedFarmerId === item.farmer.id && (
                                    <tr className="bg-gray-50 dark:bg-gray-900/30">
                                        <td colSpan={7} className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-2">{t('creditsTaken')}</h4>
                                                    <ul className="space-y-2 text-sm">
                                                        {farmerCredits.filter(c => c.farmerId === item.farmer.id).length > 0 ? (
                                                             farmerCredits.filter(c => c.farmerId === item.farmer.id).map(credit => (
                                                                <li key={credit.id} className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                                                                    <span>{credit.date} - {creditTypeMap.get(credit.creditTypeId) || credit.creditTypeId}</span>
                                                                    <span>{formatCurrency(credit.totalAmount, settings.localization)}</span>
                                                                </li>
                                                            ))
                                                        ) : <p className="text-gray-500 italic">{t('noCredits')}</p>}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-2">{t('repaymentsMade')}</h4>
                                                    <ul className="space-y-2 text-sm">
                                                        {repayments.filter(r => r.farmerId === item.farmer.id).length > 0 ? (
                                                            repayments.filter(r => r.farmerId === item.farmer.id).map(repayment => (
                                                                <li key={repayment.id} className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                                                                    <span>{repayment.date} - {t(`repaymentMethod_${repayment.method}` as any)}</span>
                                                                    <span>{formatCurrency(repayment.amount, settings.localization)}</span>
                                                                </li>
                                                            ))
                                                        ) : <p className="text-gray-500 italic">{t('noRepayments')}</p>}
                                                    </ul>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};


const RecordCreditForm: React.FC = () => {
    const { t } = useLocalization();
    const { sites, farmers, creditTypes, addFarmerCredit, getFarmersBySite } = useData();
    const { settings } = useSettings();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        siteId: '',
        farmerId: '',
        creditTypeId: '',
        quantity: '',
        unitPrice: '',
        totalAmount: '',
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const filteredFarmers = useMemo(() => {
        if (!formData.siteId) return [];
        return getFarmersBySite(formData.siteId);
    }, [formData.siteId, getFarmersBySite]);

    const selectedCreditType = useMemo(() => creditTypes.find(ct => ct.id === formData.creditTypeId), [creditTypes, formData.creditTypeId]);

    useEffect(() => {
        if (selectedCreditType) {
             if (!selectedCreditType.hasQuantity && !selectedCreditType.hasUnitPrice) {
                // Direct amount
                // Keep values open
             } else {
                 const qty = parseFloat(formData.quantity);
                 const price = parseFloat(formData.unitPrice);
                 if (!isNaN(qty) && !isNaN(price)) {
                     setFormData(prev => ({ ...prev, totalAmount: (qty * price).toFixed(2) }));
                 }
             }
        }
    }, [formData.quantity, formData.unitPrice, selectedCreditType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.farmerId) newErrors.farmerId = t('validationRequired');
        if (!formData.creditTypeId) newErrors.creditTypeId = t('validationRequired');
        
        if (selectedCreditType?.hasQuantity && (!formData.quantity || parseFloat(formData.quantity) <= 0)) {
            newErrors.quantity = t('validationPositiveNumber');
        }
        if (selectedCreditType?.hasUnitPrice && (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0)) {
             newErrors.unitPrice = t('validationPositiveNumber');
        }
        if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
            newErrors.totalAmount = t('validationPositiveNumber');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        addFarmerCredit({
            date: formData.date,
            siteId: formData.siteId,
            farmerId: formData.farmerId,
            creditTypeId: formData.creditTypeId,
            quantity: selectedCreditType?.hasQuantity ? parseFloat(formData.quantity) : undefined,
            unitPrice: selectedCreditType?.hasUnitPrice ? parseFloat(formData.unitPrice) : undefined,
            totalAmount: parseFloat(formData.totalAmount),
            notes: formData.notes
        });
        
        alert('Credit recorded successfully');
        setFormData(prev => ({ ...prev, quantity: '', unitPrice: '', totalAmount: '', notes: '' }));
    };

    return (
        <Card title={t('recordCredit')}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} error={errors.date} required />
                    <Select label={t('site')} value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value, farmerId: ''})} error={errors.siteId} required>
                        <option value="">{t('selectSite')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('farmer')} value={formData.farmerId} onChange={e => setFormData({...formData, farmerId: e.target.value})} disabled={!formData.siteId} error={errors.farmerId} required>
                        <option value="">{t('selectFarmer')}</option>
                        {filteredFarmers.map(f => <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>)}
                    </Select>
                    
                    <Select label={t('creditType')} value={formData.creditTypeId} onChange={e => setFormData({...formData, creditTypeId: e.target.value})} error={errors.creditTypeId} required>
                        <option value="">{t('selectType')}</option>
                        {creditTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                    </Select>

                    {selectedCreditType?.hasQuantity && (
                        <Input label={`${t('quantity')} (${selectedCreditType.unit})`} type="number" step="any" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} error={errors.quantity} required />
                    )}
                    {selectedCreditType?.hasUnitPrice && (
                         <Input label={t('unitPrice')} type="number" step="any" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} error={errors.unitPrice} required />
                    )}
                    
                    <Input 
                        label={t('totalAmount')} 
                        type="number" 
                        step="any" 
                        value={formData.totalAmount} 
                        onChange={e => setFormData({...formData, totalAmount: e.target.value})} 
                        error={errors.totalAmount} 
                        required 
                        disabled={!!(selectedCreditType?.hasQuantity && selectedCreditType?.hasUnitPrice)}
                    />
                    
                    <Input label={t('notes')} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} containerClassName="md:col-span-2 lg:col-span-3"/>
                </div>
                <div className="flex justify-end">
                    <Button type="submit">{t('save')}</Button>
                </div>
             </form>
        </Card>
    );
}

const RecordRepaymentForm: React.FC = () => {
    const { t } = useLocalization();
    const { sites, farmers, addRepayment, getFarmersBySite } = useData();
    const { settings } = useSettings();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        siteId: '',
        farmerId: '',
        amount: '',
        method: 'cash' as 'cash' | 'harvest_deduction',
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const filteredFarmers = useMemo(() => {
        if (!formData.siteId) return [];
        return getFarmersBySite(formData.siteId);
    }, [formData.siteId, getFarmersBySite]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.farmerId) newErrors.farmerId = t('validationRequired');
        if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('validationPositiveNumber');

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        addRepayment({
            date: formData.date,
            farmerId: formData.farmerId,
            amount: parseFloat(formData.amount),
            method: formData.method,
            notes: formData.notes
        });

        alert(t('repaymentRecorded'));
        setFormData(prev => ({ ...prev, amount: '', notes: '' }));
    };

    return (
        <Card title={t('recordRepayment')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} error={errors.date} required />
                    <Select label={t('site')} value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value, farmerId: ''})} error={errors.siteId} required>
                        <option value="">{t('selectSite')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('farmer')} value={formData.farmerId} onChange={e => setFormData({...formData, farmerId: e.target.value})} disabled={!formData.siteId} error={errors.farmerId} required>
                        <option value="">{t('selectFarmer')}</option>
                        {filteredFarmers.map(f => <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>)}
                    </Select>
                    <Input label={t('repaymentAmount')} type="number" step="any" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} error={errors.amount} required />
                    <Select label={t('repaymentMethod')} value={formData.method} onChange={e => setFormData({...formData, method: e.target.value as any})}>
                        <option value="cash">{t('repaymentMethod_cash')}</option>
                        <option value="harvest_deduction">{t('repaymentMethod_harvest_deduction')}</option>
                    </Select>
                    <Input label={t('notes')} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div className="flex justify-end">
                    <Button type="submit">{t('save')}</Button>
                </div>
            </form>
        </Card>
    );
};

const CreditTypeSettings: React.FC = () => {
    const { t } = useLocalization();
    const { creditTypes, addCreditType, updateCreditType, deleteCreditType } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<CreditType | null>(null);
    const [newTypeName, setNewTypeName] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

    const handleAdd = () => {
        if(newTypeName.trim()) {
            addCreditType({ name: newTypeName.trim(), hasQuantity: false, hasUnitPrice: false, isDirectAmount: true });
            setNewTypeName('');
        }
    };

    const handleDelete = (id: string) => {
        setTypeToDelete(id);
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if(typeToDelete) deleteCreditType(typeToDelete);
        setIsConfirmOpen(false);
        setTypeToDelete(null);
    };

    const openEdit = (ct: CreditType) => {
        setEditingType(ct);
        setIsEditModalOpen(true);
    };

    return (
        <Card title={t('creditTypes')}>
            <div className="flex gap-4 mb-6">
                <Input placeholder={t('addNewCreditType')} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} containerClassName="flex-grow" />
                <Button onClick={handleAdd} disabled={!newTypeName.trim()}><Icon name="PlusCircle" className="w-5 h-5" />{t('add')}</Button>
            </div>
            <div className="space-y-2">
                {creditTypes.map(ct => (
                    <div key={ct.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
                        <div>
                            <span className="font-semibold">{ct.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                                {ct.isDirectAmount ? t('directAmount') : `${t('withQuantity')} (${ct.unit})`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => openEdit(ct)}><Icon name="Edit2" className="w-4 h-4" /></Button>
                            <Button variant="danger" onClick={() => handleDelete(ct.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                        </div>
                    </div>
                ))}
            </div>
            {isEditModalOpen && editingType && (
                <CreditTypeEditModal 
                    isOpen={isEditModalOpen} 
                    onClose={() => setIsEditModalOpen(false)} 
                    creditType={editingType}
                    onSave={(updated) => { updateCreditType(updated); setIsEditModalOpen(false); }}
                />
            )}
            {isConfirmOpen && (
                <ConfirmationModal 
                    isOpen={isConfirmOpen} 
                    onClose={() => setIsConfirmOpen(false)} 
                    onConfirm={confirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteCreditType')}
                />
            )}
        </Card>
    );
};

export default FarmerCredits;
