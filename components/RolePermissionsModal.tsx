import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useLocalization } from '../contexts/LocalizationContext';
import type { Role } from '../types';
import { PERMISSION_GROUPS, Permission } from '../permissions';
import Checkbox from './ui/Checkbox';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  onSave: (role: Role) => void;
}

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ isOpen, onClose, role, onSave }) => {
  const { t } = useLocalization();
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedPermissions(new Set(role.permissions as Permission[]));
    }
  }, [isOpen, role]);

  const handleToggle = (permissionId: Permission, checked: boolean) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave({ ...role, permissions: Array.from(selectedPermissions) });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('managePermissionsFor')} "${role.name}"`}
      widthClass="max-w-4xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave}>{t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.name} className="p-4 border rounded-lg dark:border-gray-700">
            <h3 className="font-semibold mb-3">{group.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.permissions.map(perm => (
                <label key={perm.id} className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer">
                  <Checkbox
                    checked={selectedPermissions.has(perm.id)}
                    onChange={e => handleToggle(perm.id, e.target.checked)}
                  />
                  <span className="ml-2 text-sm">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default RolePermissionsModal;
