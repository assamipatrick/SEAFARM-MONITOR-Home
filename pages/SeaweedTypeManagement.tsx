import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PriceHistoryModal from '../components/PriceHistoryModal';
import type { SeaweedType } from '../types';
import { formatCurrency } from '../utils/formatters';

const SeaweedTypeManagement: React.FC = () => {
    const { t } = useLocalization();
    const { seaweedTypes, addSeaweedType, updateSeaweedType, deleteSeaweedType } = useData();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<SeaweedType | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedTypeForHistory, setSelectedTypeForHistory] = useState<SeaweedType | null>(null);

    const handleOpenModal = (seaweedType: SeaweedType | null = null) => {
        setEditingType(seaweedType);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingType(null);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (typeId: string) => {
        setTypeToDelete(typeId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (typeToDelete) {
            deleteSeaweedType(typeToDelete);
        }
        setIsConfirmOpen(false);
        setTypeToDelete(null);
    };
    
    const handleSave = (typeData: Omit<SeaweedType, 'id' | 'priceHistory'>) => {
        if (editingType) {
            updateSeaweedType({ ...editingType, ...typeData });
        } else {
            addSeaweedType(typeData);
        }
        handleCloseModal();
    };

    const handleOpenHistoryModal = (seaweedType: SeaweedType) => {
        setSelectedTypeForHistory(seaweedType);
        setIsHistoryModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('seaweedTypeManagementTitle')}</h1>
                <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('addSeaweedType')}</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seaweedTypes.map(st => (
                    <Card key={st.id}>
                        <h2 className="text-xl font-bold">{st.name}</h2>
                        <p className="italic text-gray-500 dark:text-gray-400">{st.scientificName}</p>
                        <p className="mt-2 text-sm">{st.description}</p>
                        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
                            <p><strong>{t('wetPrice')}:</strong> {formatCurrency(st.wetPrice, settings.localization)}</p>
                            <p><strong>{t('dryPrice')}:</strong> {formatCurrency(st.dryPrice, settings.localization)}</p>
                        </div>
                        <div className="mt-4 flex gap-2 flex-wrap">
                            <Button variant="secondary" onClick={() => navigate(`/seaweed-types/${st.id}/cultivation`)}><Icon name="GitBranch" className="w-4 h-4"/>{t('cycles')}</Button>
                            <Button variant="ghost" onClick={() => handleOpenHistoryModal(st)}><Icon name="FileText" className="w-4 h-4"/>{t('priceHistory')}</Button>
                            <Button variant="secondary" onClick={() => handleOpenModal(st)}>{t('edit')}</Button>
                            <Button variant="danger" onClick={() => handleDeleteClick(st.id)}>{t('delete')}</Button>
                        </div>
                    </Card>
                ))}
            </div>

            {isModalOpen && <SeaweedTypeForm isOpen={isModalOpen} onClose={handleCloseModal} seaweedType={editingType} onSave={handleSave} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeleteTitle')} message={t('confirmDeleteSeaweedType')} />}
            {isHistoryModalOpen && selectedTypeForHistory && <PriceHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} seaweedType={selectedTypeForHistory} />}
        </div>
    );
};


interface SeaweedTypeFormProps {
    isOpen: boolean;
    onClose: () => void;
    seaweedType: SeaweedType | null;
    onSave: (data: Omit<SeaweedType, 'id' | 'priceHistory'>) => void;
}
  
const SeaweedTypeForm: React.FC<SeaweedTypeFormProps> = ({ isOpen, onClose, seaweedType, onSave }) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState({ name: '', scientificName: '', description: '', wetPrice: 0, dryPrice: 0 });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (seaweedType) {
            setFormData(seaweedType);
        } else {
            setFormData({ name: '', scientificName: '', description: '', wetPrice: 0, dryPrice: 0 });
        }
    }, [seaweedType, isOpen]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = t('validationRequired');
        if (isNaN(formData.wetPrice) || formData.wetPrice <= 0) newErrors.wetPrice = t('validationPositiveNumber');
        if (isNaN(formData.dryPrice) || formData.dryPrice <= 0) newErrors.dryPrice = t('validationPositiveNumber');
        return newErrors;
    }, [formData, t]);
    
    useEffect(() => {
        setErrors(validate());
    }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(p => ({ ...p, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys(errors).length > 0) return;
        onSave({ ...formData, wetPrice: Number(formData.wetPrice), dryPrice: Number(formData.dryPrice) });
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={seaweedType ? t('editSeaweedType') : t('addSeaweedType')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label={t('name')} value={formData.name} onChange={e => handleChange('name', e.target.value)} error={errors.name} required />
                <Input label={t('scientificName')} value={formData.scientificName} onChange={e => handleChange('scientificName', e.target.value)} />
                <Input label={t('description')} value={formData.description} onChange={e => handleChange('description', e.target.value)} />
                <Input label={t('wetPrice')} type="number" value={formData.wetPrice} onChange={e => handleChange('wetPrice', parseFloat(e.target.value))} error={errors.wetPrice} required />
                <Input label={t('dryPrice')} type="number" value={formData.dryPrice} onChange={e => handleChange('dryPrice', parseFloat(e.target.value))} error={errors.dryPrice} required />
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default SeaweedTypeManagement;