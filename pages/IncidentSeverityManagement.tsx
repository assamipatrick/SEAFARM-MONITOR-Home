
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import type { IncidentSeverity } from '../types';

const IncidentSeverityManagement: React.FC = () => {
    const { t } = useLocalization();
    const { incidentSeverities, addIncidentSeverity, updateIncidentSeverity, deleteIncidentSeverity } = useData();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [severityToDelete, setSeverityToDelete] = useState<IncidentSeverity | null>(null);
    const [newSeverityName, setNewSeverityName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSeverity, setEditingSeverity] = useState<IncidentSeverity | null>(null);

    const handleDeleteClick = (severity: IncidentSeverity) => {
        if (severity.isDefault) return;
        setSeverityToDelete(severity);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (severityToDelete) {
            deleteIncidentSeverity(severityToDelete.id);
        }
        setIsConfirmOpen(false);
        setSeverityToDelete(null);
    };
    
    const handleAddSeverity = () => {
        if (newSeverityName.trim()) {
            addIncidentSeverity({
                name: newSeverityName.trim()
            });
            setNewSeverityName('');
        }
    };
    
    const handleEditClick = (severity: IncidentSeverity) => {
        setEditingSeverity(severity);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (updatedSeverity: IncidentSeverity) => {
        updateIncidentSeverity(updatedSeverity);
        setIsEditModalOpen(false);
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('incidentSeverityManagementTitle')}</h1>
            <Card>
                <div className="space-y-4 mb-6">
                    {incidentSeverities.map(severity => (
                        <div key={severity.id} className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex justify-between items-center">
                            <div>
                                <span className="font-semibold">{severity.name}</span>
                                {severity.isDefault && <span className="ml-2 text-xs text-gray-500">({t('default')})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" onClick={() => handleEditClick(severity)}>
                                    <Icon name="Edit2" className="w-4 h-4"/>
                                    {t('edit')}
                                </Button>
                                {severity.isDefault ? (
                                    <Icon name="Lock" className="w-5 h-5 text-gray-400" title={t('cannotDeleteDefault')} />
                                ) : (
                                    <Button variant="danger" className="p-2" onClick={() => handleDeleteClick(severity)}>
                                        <Icon name="Trash2" className="w-4 h-4"/>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                 <div className="mt-6 pt-6 border-t dark:border-gray-700">
                    <h4 className="font-semibold mb-4">{t('addIncidentSeverity')}</h4>
                    <div className="flex items-end gap-4">
                        <Input
                            containerClassName="flex-grow"
                            label={t('severityName')}
                            value={newSeverityName}
                            onChange={e => setNewSeverityName(e.target.value)}
                        />
                        <Button onClick={handleAddSeverity} disabled={!newSeverityName.trim()}>
                            <Icon name="PlusCircle" className="w-5 h-5" />
                            {t('add')}
                        </Button>
                    </div>
                </div>
            </Card>
            
            {isEditModalOpen && editingSeverity && (
                <EditIncidentSeverityModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    severity={editingSeverity}
                    onSave={handleSaveEdit}
                />
            )}

            {isConfirmOpen && severityToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteIncidentSeverity')}
                />
            )}
        </div>
    );
};

interface EditIncidentSeverityModalProps {
    isOpen: boolean;
    onClose: () => void;
    severity: IncidentSeverity;
    onSave: (severity: IncidentSeverity) => void;
}

const EditIncidentSeverityModal: React.FC<EditIncidentSeverityModalProps> = ({ isOpen, onClose, severity, onSave }) => {
    const { t } = useLocalization();
    const [name, setName] = useState(severity.name);

    useEffect(() => {
        if (isOpen) {
            setName(severity.name);
        }
    }, [isOpen, severity]);

    const handleSave = () => {
        if (name.trim()) {
            onSave({ ...severity, name: name.trim() });
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={t('editIncidentSeverity')}
            footer={<>
                <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleSave} disabled={!name.trim()}>{t('save')}</Button>
            </>}
        >
            <Input
                label={t('severityName')}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
            />
        </Modal>
    );
};

export default IncidentSeverityManagement;