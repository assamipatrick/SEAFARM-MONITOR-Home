


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Farmer, Site } from '../types';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import FarmerProfileModal from '../components/FarmerProfileModal';
import Checkbox from '../components/ui/Checkbox';
import AssignSiteModal from '../components/AssignSiteModal';
import BroadcastMessageModal from '../components/BroadcastMessageModal';

const FarmerManagement: React.FC = () => {
    const { farmers, sites, addFarmer, updateFarmer, deleteFarmer, deleteMultipleFarmers, updateFarmersSite } = useData();
    const { t } = useLocalization();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [farmerToDelete, setFarmerToDelete] = useState<string | null>(null);
    const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'siteName'; direction: 'ascending' | 'descending' }>({ key: 'code', direction: 'ascending' });
    const [selectedFarmers, setSelectedFarmers] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [isAssignSiteModalOpen, setIsAssignSiteModalOpen] = useState(false);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

    const siteMap = useMemo(() => new Map(sites.map(site => [site.id, site.name])), [sites]);
    
    const sortedFarmers = useMemo(() => {
        let sortableItems = [...farmers];
        sortableItems.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'siteName') {
                valA = siteMap.get(a.siteId) || '';
                valB = siteMap.get(b.siteId) || '';
            } else {
                valA = a[sortConfig.key as keyof Farmer];
                valB = b[sortConfig.key as keyof Farmer];
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
    }, [farmers, sortConfig, siteMap]);

    const requestSort = (key: keyof Farmer | 'siteName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: keyof Farmer | 'siteName') => {
        if (sortConfig.key !== key) {
            return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        }
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: keyof Farmer | 'siteName'; label: string; }> = ({ sortKey, label }) => (
        <th className="p-3">
            <button onClick={() => requestSort(sortKey)} className="group flex items-center gap-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                {label}
                {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const handleOpenModal = (farmer: Farmer | null = null) => {
        setEditingFarmer(farmer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingFarmer(null);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (farmerId: string) => {
        setFarmerToDelete(farmerId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (farmerToDelete) {
            deleteFarmer(farmerToDelete);
        }
        setIsConfirmOpen(false);
        setFarmerToDelete(null);
    };

    const handleViewProfile = (farmer: Farmer) => {
        setSelectedFarmer(farmer);
    };
    
    const handleCloseProfileModal = () => {
        setSelectedFarmer(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFarmers(sortedFarmers.map(f => f.id));
        } else {
            setSelectedFarmers([]);
        }
    };
    
    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, farmerId: string) => {
        if (e.target.checked) {
            setSelectedFarmers(prev => [...prev, farmerId]);
        } else {
            setSelectedFarmers(prev => prev.filter(id => id !== farmerId));
        }
    };

    const handleBulkDeleteClick = () => {
        setIsBulkConfirmOpen(true);
    };

    const handleConfirmBulkDelete = () => {
        deleteMultipleFarmers(selectedFarmers);
        setSelectedFarmers([]);
        setIsBulkConfirmOpen(false);
    };

    const handleAssignSite = (siteId: string) => {
        updateFarmersSite(selectedFarmers, siteId);
        setSelectedFarmers([]);
        setIsAssignSiteModalOpen(false);
    };

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">{t('farmerManagementTitle')}</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => { setSelectedFarmers([]); setIsBroadcastModalOpen(true); }}>
                        <Icon name="Bell" className="w-5 h-5 mr-2"/>
                        {t('broadcastMessage')}
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Icon name="PlusCircle" className="w-5 h-5 mr-2"/>
                        {t('addFarmer')}
                    </Button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="p-3 w-4">
                                    <Checkbox
                                        checked={sortedFarmers.length > 0 && selectedFarmers.length === sortedFarmers.length}
                                        onChange={handleSelectAll}
                                        aria-label={t('selectAllFarmers')}
                                    />
                                </th>
                                <SortableHeader sortKey="code" label={t('code')} />
                                <SortableHeader sortKey="firstName" label={t('firstName')} />
                                <SortableHeader sortKey="lastName" label={t('lastName')} />
                                <SortableHeader sortKey="siteName" label={t('site')} />
                                <SortableHeader sortKey="gender" label={t('gender')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedFarmers.map(farmer => (
                                <tr key={farmer.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3">
                                        <Checkbox
                                            checked={selectedFarmers.includes(farmer.id)}
                                            onChange={(e) => handleSelectOne(e, farmer.id)}
                                            aria-label={t('selectFarmerNamed').replace('{name}', `${farmer.firstName} ${farmer.lastName}`)}
                                        />
                                    </td>
                                    <td className="p-3 font-mono">{farmer.code}</td>
                                    <td className="p-3 font-semibold">
                                        <button onClick={() => handleViewProfile(farmer)} className="text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer text-left">
                                            {farmer.firstName}
                                        </button>
                                    </td>
                                    <td className="p-3 font-semibold">
                                        <button onClick={() => handleViewProfile(farmer)} className="text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer text-left">
                                            {farmer.lastName}
                                        </button>
                                    </td>
                                    <td className="p-3">{siteMap.get(farmer.siteId) || t('unknown')}</td>
                                    <td className="p-3">{t(`gender_${farmer.gender}` as any)}</td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => handleOpenModal(farmer)}><Icon name="Settings" className="w-4 h-4" />{t('edit')}</Button>
                                            <Button variant="danger" onClick={() => handleDeleteClick(farmer.id)}><Icon name="Trash2" className="w-4 h-4" />{t('delete')}</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {selectedFarmers.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 z-20 ml-16">
                    <span className="font-semibold">{t('itemsSelected').replace('{count}', String(selectedFarmers.length))}</span>
                    <Button onClick={() => setIsAssignSiteModalOpen(true)}>
                        <Icon name="MapPin" className="w-4 h-4 mr-2" />
                        {t('assignSite')}
                    </Button>
                    <Button onClick={() => setIsBroadcastModalOpen(true)} variant="secondary">
                        <Icon name="Bell" className="w-4 h-4 mr-2" />
                        {t('broadcastMessage')}
                    </Button>
                    <Button variant="danger" onClick={handleBulkDeleteClick}>
                        <Icon name="Trash2" className="w-4 h-4 mr-2" />
                        {t('deleteSelected')}
                    </Button>
                </div>
            )}

            {isModalOpen && (
                <FarmerForm
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    farmer={editingFarmer}
                    onSave={(farmerData) => {
                        if (editingFarmer) {
                            updateFarmer({ ...editingFarmer, ...farmerData });
                        } else {
                            addFarmer(farmerData as Omit<Farmer, 'id'>);
                        }
                        handleCloseModal();
                    }}
                />
            )}

            {isBroadcastModalOpen && (
                <BroadcastMessageModal 
                    isOpen={isBroadcastModalOpen} 
                    onClose={() => setIsBroadcastModalOpen(false)} 
                    preselectedFarmerIds={selectedFarmers}
                />
            )}

            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteFarmer')}
                />
            )}

            {isBulkConfirmOpen && (
                 <ConfirmationModal
                    isOpen={isBulkConfirmOpen}
                    onClose={() => setIsBulkConfirmOpen(false)}
                    onConfirm={handleConfirmBulkDelete}
                    title={t('confirmBulkDeleteTitle')}
                    message={t('confirmBulkDeleteFarmers').replace('{count}', String(selectedFarmers.length))}
                />
            )}

            {isAssignSiteModalOpen && (
                <AssignSiteModal
                    isOpen={isAssignSiteModalOpen}
                    onClose={() => setIsAssignSiteModalOpen(false)}
                    onAssign={handleAssignSite}
                    sites={sites}
                    selectedCount={selectedFarmers.length}
                />
            )}

            {selectedFarmer && <FarmerProfileModal isOpen={!!selectedFarmer} onClose={handleCloseProfileModal} farmer={selectedFarmer} />}
        </div>
    );
};

interface FarmerFormProps {
    isOpen: boolean;
    onClose: () => void;
    farmer: Farmer | null;
    onSave: (farmer: Omit<Farmer, 'id'> | Farmer) => void;
}

const FarmerForm: React.FC<FarmerFormProps> = ({ isOpen, onClose, farmer, onSave }) => {
    const { t } = useLocalization();
    const { sites } = useData();
    const [formData, setFormData] = useState<Omit<Farmer, 'id' | 'code'>>({
        firstName: '', lastName: '', gender: 'Male', dob: '', birthPlace: '',
        idNumber: '', address: '', siteId: '', maritalStatus: 'Single',
        nationality: '', parentsInfo: '', phone: ''
    });
    const [farmerCode, setFarmerCode] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const initialFormData = useMemo(() => ({
        firstName: '', lastName: '', gender: 'Male' as 'Male' | 'Female' | 'Other', dob: '', birthPlace: '',
        idNumber: '', address: '', siteId: sites[0]?.id || '', maritalStatus: 'Single' as 'Single' | 'Married' | 'Divorced' | 'Widowed',
        nationality: '', parentsInfo: '', phone: ''
    }), [sites]);

    const validate = useCallback((data: Omit<Farmer, 'id' | 'code'>) => {
        const newErrors: Record<string, string> = {};
        if (!data.firstName.trim()) newErrors.firstName = t('validationRequired');
        if (!data.lastName.trim()) newErrors.lastName = t('validationRequired');
        if (!data.siteId) newErrors.siteId = t('validationRequired');
        return newErrors;
    }, [t]);

    useEffect(() => {
        if (farmer) {
            const { code, id, ...rest } = farmer;
            setFormData(rest);
            setFarmerCode(code);
        } else {
            setFormData(initialFormData);
            setFarmerCode('');
        }
    }, [farmer, initialFormData, isOpen]);
    
    useEffect(() => {
        if (!farmer && formData.firstName && formData.lastName) {
            const code = (formData.firstName.substring(0, 1) + formData.lastName.substring(0, 2)).toUpperCase();
            setFarmerCode(code);
        }
    }, [formData.firstName, formData.lastName, farmer]);

    useEffect(() => {
        setErrors(validate(formData));
    }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate(formData);
        if (Object.keys(validationErrors).length === 0) {
            onSave({ ...formData, code: farmerCode });
        } else {
            setErrors(validationErrors);
        }
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={farmer ? t('editFarmer') : t('addFarmer')} widthClass="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label={t('firstName')} value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} error={errors.firstName} required />
                    <Input label={t('lastName')} value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} error={errors.lastName} required />
                    <Input label={t('code')} value={farmerCode} disabled />
                    <Select label={t('gender')} value={formData.gender} onChange={e => handleChange('gender', e.target.value as 'Male' | 'Female' | 'Other')}>
                        <option value="Male">{t('gender_Male')}</option>
                        <option value="Female">{t('gender_Female')}</option>
                        <option value="Other">{t('gender_Other')}</option>
                    </Select>
                    <Select label={t('maritalStatus')} value={formData.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value as 'Single' | 'Married' | 'Divorced' | 'Widowed')}>
                        <option value="Single">{t('maritalStatus_Single')}</option>
                        <option value="Married">{t('maritalStatus_Married')}</option>
                        <option value="Divorced">{t('maritalStatus_Divorced')}</option>
                        <option value="Widowed">{t('maritalStatus_Widowed')}</option>
                    </Select>
                     <Select label={t('site')} value={formData.siteId} onChange={e => handleChange('siteId', e.target.value)} error={errors.siteId} required>
                        <option value="">{t('selectSite')}</option>
                        {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                    </Select>
                    <Input label={t('phoneNumber')} type="tel" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="+261..." />
                    <Input label={t('dob')} value={formData.dob} onChange={e => handleChange('dob', e.target.value)} placeholder="e.g. 1990-05-15 or Circa 1981" />
                    <Input label={t('birthPlace')} value={formData.birthPlace} onChange={e => handleChange('birthPlace', e.target.value)} />
                    <Input label={t('nationality')} value={formData.nationality} onChange={e => handleChange('nationality', e.target.value)} />
                    <Input containerClassName="md:col-span-3" label={t('idNumber')} value={formData.idNumber} onChange={e => handleChange('idNumber', e.target.value)} />
                    <Input containerClassName="md:col-span-3" label={t('address')} value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                    <Input containerClassName="md:col-span-3" label={t('parentsInfo')} value={formData.parentsInfo} onChange={e => handleChange('parentsInfo', e.target.value)} />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default FarmerManagement;
