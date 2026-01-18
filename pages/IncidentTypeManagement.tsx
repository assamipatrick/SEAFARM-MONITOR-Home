
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import type { IncidentType } from '../types';

const IncidentTypeManagement: React.FC = () => {
    const { t } = useLocalization();
    const { incidentTypes, addIncidentType, updateIncidentType, deleteIncidentType } = useData();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<IncidentType | null>(null);
    const [newTypeName, setNewTypeName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<IncidentType | null>(null);

    const handleDeleteClick = (type: IncidentType) => {
        if (type.isDefault) return;
        setTypeToDelete(type);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (typeToDelete) {
            deleteIncidentType(typeToDelete.id);
        }
        setIsConfirmOpen(false);
        setTypeToDelete(null);
    };
    
    const handleAddType = () => {
        if (newTypeName.trim()) {
            addIncidentType({
                name: newTypeName.trim()
            });
            setNewTypeName('');
        }
    };
    
    const handleEditClick = (type: IncidentType) => {
        setEditingType(type);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (updatedType: IncidentType) => {
        updateIncidentType(updatedType);
        setIsEditModalOpen(false);
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('incidentTypeManagementTitle')}</h1>
            <Card>
                <div className="space-y-4 mb-6">
                    {incidentTypes.map(type => (
                        <div key={type.id} className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex justify-between items-center">
                            <div>
                                <span className="font-semibold">{type.name}</span>
                                {type.isDefault && <span className="ml-2 text-xs text-gray-500">({t('default')})</span>}
                            </div>
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" onClick={() => handleEditClick(type)}>
                                    <Icon name="Edit2" className="w-4 h-4"/>
                                    {t('edit')}
                                </Button>
                                {type.isDefault ? (
                                    <Icon name="Lock" className="w-5 h-5 text-gray-400" title={t('cannotDeleteDefault')} />
                                ) : (
                                    <Button variant="danger" className="p-2" onClick={() => handleDeleteClick(type)}>
                                        <Icon name="Trash2" className="w-4 h-4"/>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                 <div className="mt-6 pt-6 border-t dark:border-gray-700">
                    <h4 className="font-semibold mb-4">{t('addIncidentType')}</h4>
                    <div className="flex items-end gap-4">
                        <Input
                            containerClassName="flex-grow"
                            label={t('typeName')}
                            value={newTypeName}
                            onChange={e => setNewTypeName(e.target.value)}
                        />
                        <Button onClick={handleAddType} disabled={!newTypeName.trim()}>
                            <Icon name="PlusCircle" className="w-5 h-5" />
                            {t('add')}
                        </Button>
                    </div>
                </div>
            </Card>

            {isEditModalOpen && editingType && (
                <EditIncidentTypeModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    type={editingType}
                    onSave={handleSaveEdit}
                />
            )}

            {isConfirmOpen && typeToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteIncidentType')}
                />
            )}
        </div>
    );
};

interface EditIncidentTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: IncidentType;
    onSave: (type: IncidentType) => void;
}

const EditIncidentTypeModal: React.FC<EditIncidentTypeModalProps> = ({ isOpen, onClose, type, onSave }) => {
    const { t } = useLocalization();
    const [name, setName] = useState(type.name);

    useEffect(() => {
        if (isOpen) {
            setName(type.name);
        }
    }, [isOpen, type]);

    const handleSave = () => {
        if (name.trim()) {
            onSave({ ...type, name: name.trim() });
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={t('editIncidentType')}
            footer={<>
                <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleSave} disabled={!name.trim()}>{t('save')}</Button>
            </>}
        >
            <Input
                label={t('typeName')}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
            />
        </Modal>
    );
};


export default IncidentTypeManagement;