import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import type { ServiceProvider } from '../types';

type SortableKeys = keyof ServiceProvider;

const ServiceProviders: React.FC = () => {
    const { t } = useLocalization();
    const { serviceProviders, addServiceProvider, updateServiceProvider, deleteServiceProvider } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const sortedProviders = useMemo(() => {
        let sortableItems = [...serviceProviders];
        sortableItems.sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [serviceProviders, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}><button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className?.includes('text-right') ? 'justify-end' : ''}`}>{label}{getSortIcon(sortKey)}</button></th>
    );

    const handleOpenModal = (provider: ServiceProvider | null = null) => {
        setEditingProvider(provider);
        setIsFormModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingProvider(null);
        setIsFormModalOpen(false);
    };

    const handleDeleteClick = (providerId: string) => {
        setProviderToDelete(providerId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (providerToDelete) {
            deleteServiceProvider(providerToDelete);
        }
        setIsConfirmOpen(false);
        setProviderToDelete(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('serviceProvidersTitle')}</h1>
                <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('addProvider')}</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <SortableHeader sortKey="name" label={t('name')} />
                                <SortableHeader sortKey="serviceType" label={t('serviceType')} />
                                <SortableHeader sortKey="contactPerson" label={t('contactPerson')} />
                                <SortableHeader sortKey="phone" label={t('phone')} />
                                <SortableHeader sortKey="email" label={t('email')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProviders.map(provider => (
                                <tr key={provider.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3 font-semibold">{provider.name}</td>
                                    <td className="p-3">{provider.serviceType}</td>
                                    <td className="p-3">{provider.contactPerson || '-'}</td>
                                    <td className="p-3">{provider.phone}</td>
                                    <td className="p-3">{provider.email || '-'}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => handleOpenModal(provider)}><Icon name="Settings" className="w-4 h-4" />{t('edit')}</Button>
                                            <Button variant="danger" onClick={() => handleDeleteClick(provider.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedProviders.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-gray-500">{t('noProviders')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isFormModalOpen && (
                <ServiceProviderFormModal 
                    isOpen={isFormModalOpen} 
                    onClose={handleCloseModal} 
                    provider={editingProvider}
                    onSave={(data) => {
                        if (editingProvider) {
                            updateServiceProvider({ ...editingProvider, ...data });
                        } else {
                            addServiceProvider(data);
                        }
                        handleCloseModal();
                    }}
                />
            )}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteProvider')} />}
        </div>
    );
};

interface ServiceProviderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: ServiceProvider | null;
    onSave: (data: Omit<ServiceProvider, 'id'>) => void;
}

const ServiceProviderFormModal: React.FC<ServiceProviderFormModalProps> = ({ isOpen, onClose, provider, onSave }) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState({
        name: '', serviceType: '', contactPerson: '', phone: '', email: '', address: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (provider) {
            setFormData({
                name: provider.name,
                serviceType: provider.serviceType,
                contactPerson: provider.contactPerson || '',
                phone: provider.phone,
                email: provider.email || '',
                address: provider.address || '',
            });
        } else {
            setFormData({ name: '', serviceType: '', contactPerson: '', phone: '', email: '', address: '' });
        }
    }, [provider, isOpen]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = t('validationRequired');
        if (!formData.serviceType.trim()) newErrors.serviceType = t('validationRequired');
        if (!formData.phone.trim()) newErrors.phone = t('validationRequired');
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('validationEmail');
        return newErrors;
    }, [formData, t]);
    
    useEffect(() => { setErrors(validate()) }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(p => ({ ...p, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        onSave({
            ...formData,
            contactPerson: formData.contactPerson || undefined,
            email: formData.email || undefined,
            address: formData.address || undefined,
        });
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={provider ? t('editProvider') : t('addProvider')}
            widthClass="max-w-3xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t('name')} value={formData.name} onChange={e => handleChange('name', e.target.value)} error={errors.name} required autoFocus />
                <Input label={t('serviceType')} value={formData.serviceType} onChange={e => handleChange('serviceType', e.target.value)} error={errors.serviceType} required />
                <Input label={`${t('contactPerson')} (${t('optional')})`} value={formData.contactPerson} onChange={e => handleChange('contactPerson', e.target.value)} />
                <Input label={t('phone')} value={formData.phone} onChange={e => handleChange('phone', e.target.value)} error={errors.phone} required />
                <Input label={`${t('email')} (${t('optional')})`} type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                <Input containerClassName="md:col-span-2" label={`${t('address')} (${t('optional')})`} value={formData.address} onChange={e => handleChange('address', e.target.value)} />
            </form>
        </Modal>
    );
};

export default ServiceProviders;