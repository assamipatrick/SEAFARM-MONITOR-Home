import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import type { Role } from '../types';
import Authorization from '../components/auth/Authorization';
import { PERMISSIONS } from '../permissions';
import RolePermissionsModal from '../components/RolePermissionsModal';

const RoleManagement: React.FC = () => {
    const { t } = useLocalization();
    const { roles, addRole, updateRole, deleteRole } = useData();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

    const handleDeleteClick = (role: Role) => {
        if (role.isDefault) return;
        setRoleToDelete(role);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (roleToDelete) {
            deleteRole(roleToDelete.id);
        }
        setIsConfirmOpen(false);
        setRoleToDelete(null);
    };
    
    const handleAddRole = () => {
        if (newRoleName.trim()) {
            addRole({
                name: newRoleName.trim(),
                permissions: [],
            });
            setNewRoleName('');
        }
    };
    
    const handleEditClick = (role: Role) => {
        setEditingRole(role);
        setIsEditModalOpen(true);
    };
    
    const handlePermissionsClick = (role: Role) => {
        setEditingRole(role);
        setIsPermissionsModalOpen(true);
    };

    const handleSave = (updatedRole: Role) => {
        updateRole(updatedRole);
        setIsEditModalOpen(false);
        setIsPermissionsModalOpen(false);
        setEditingRole(null);
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('roleManagementTitle')}</h1>
            <Card>
                <div className="space-y-4 mb-6">
                    {roles.map(role => (
                        <div key={role.id} className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex justify-between items-center">
                            <div>
                                <span className="font-semibold">{role.name}</span>
                                {role.isDefault && <span className="ml-2 text-xs text-gray-500">({t('default')})</span>}
                            </div>
                            <Authorization permission={PERMISSIONS.ROLES_MANAGE}>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" onClick={() => handlePermissionsClick(role)}>
                                        <Icon name="UserCog" className="w-4 h-4"/>
                                        {t('managePermissions')}
                                    </Button>
                                    <Button variant="ghost" onClick={() => handleEditClick(role)}>
                                        <Icon name="Edit2" className="w-4 h-4"/>
                                        {t('edit')}
                                    </Button>
                                    {role.isDefault ? (
                                        <Icon name="Lock" className="w-5 h-5 text-gray-400" title={t('cannotDeleteDefault')} />
                                    ) : (
                                        <Button variant="danger" className="p-2" onClick={() => handleDeleteClick(role)}>
                                            <Icon name="Trash2" className="w-4 h-4"/>
                                        </Button>
                                    )}
                                </div>
                            </Authorization>
                        </div>
                    ))}
                </div>

                <Authorization permission={PERMISSIONS.ROLES_MANAGE}>
                    <div className="mt-6 pt-6 border-t dark:border-gray-700">
                        <h4 className="font-semibold mb-4">{t('addRole')}</h4>
                        <div className="flex items-end gap-4">
                            <Input
                                containerClassName="flex-grow"
                                label={t('roleName')}
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                            />
                            <Button onClick={handleAddRole} disabled={!newRoleName.trim()}>
                                <Icon name="PlusCircle" className="w-5 h-5" />
                                {t('add')}
                            </Button>
                        </div>
                    </div>
                </Authorization>
            </Card>

            {isEditModalOpen && editingRole && (
                <EditRoleModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    role={editingRole}
                    onSave={handleSave}
                />
            )}
            
            {isPermissionsModalOpen && editingRole && (
                <RolePermissionsModal
                    isOpen={isPermissionsModalOpen}
                    onClose={() => setIsPermissionsModalOpen(false)}
                    role={editingRole}
                    onSave={handleSave}
                />
            )}

            {isConfirmOpen && roleToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteRole')}
                />
            )}
        </div>
    );
};

interface EditRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: Role;
    onSave: (role: Role) => void;
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({ isOpen, onClose, role, onSave }) => {
    const { t } = useLocalization();
    const [name, setName] = useState(role.name);

    useEffect(() => {
        if (isOpen) {
            setName(role.name);
        }
    }, [isOpen, role]);

    const handleSaveClick = () => {
        if (name.trim()) {
            onSave({ ...role, name: name.trim() });
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={t('editRole')}
            footer={<>
                <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleSaveClick} disabled={!name.trim()}>{t('save')}</Button>
            </>}
        >
            <Input
                label={t('roleName')}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
            />
        </Modal>
    );
};


export default RoleManagement;