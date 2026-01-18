import React, { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import { InvitationStatus, User, Role } from '../types';
import { PERMISSION_GROUPS, Permission } from '../permissions';
import Checkbox from './ui/Checkbox';
import Icon from './ui/Icon';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onInviteSent: (link: string, channel: 'EMAIL' | 'WHATSAPP') => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, currentUser, onInviteSent }) => {
    const { t } = useLocalization();
    const { roles, addInvitation, addRole } = useData();
    
    const [formData, setFormData] = useState({
        recipient: '',
        channel: 'EMAIL' as 'EMAIL' | 'WHATSAPP',
        roleId: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [inviteMode, setInviteMode] = useState<'role' | 'custom'>('role');
    const [customPermissions, setCustomPermissions] = useState<Set<Permission>>(new Set());
    const [openPermissionGroups, setOpenPermissionGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setFormData({
                recipient: '',
                channel: 'EMAIL',
                roleId: roles.find(r => r.isDefault)?.id || roles[0]?.id || ''
            });
            setCustomPermissions(new Set());
            setInviteMode('role');
            setErrors({});
        }
    }, [isOpen, roles]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.recipient.trim()) {
            newErrors.recipient = t('validationRequired');
        } else if (formData.channel === 'EMAIL' && !/\S+@\S+\.\S+/.test(formData.recipient)) {
            newErrors.recipient = t('validationEmail');
        } else if (formData.channel === 'WHATSAPP' && !/^\+?\d{7,15}$/.test(formData.recipient)) {
            newErrors.recipient = t('validationPhone');
        }
        if (inviteMode === 'role' && !formData.roleId) {
            newErrors.roleId = t('validationRequired');
        }
        if (inviteMode === 'custom' && customPermissions.size === 0) {
            newErrors.customPermissions = t('validationSelectAtLeastOne');
        }
        return newErrors;
    }, [formData, t, inviteMode, customPermissions]);

    useEffect(() => {
        setErrors(validate());
    }, [formData, inviteMode, customPermissions, validate]);

    const handleInvite = () => {
        if (Object.keys(errors).length > 0 || !currentUser) return;

        let roleIdToUse = formData.roleId;

        if (inviteMode === 'custom') {
            const newRoleName = t('customRoleFor').replace('{recipient}', formData.recipient);
            const createdRole = addRole({
                name: newRoleName,
                permissions: Array.from(customPermissions),
            });
            if (createdRole) {
                roleIdToUse = createdRole.id;
            } else {
                // Role creation failed or returned existing, potentially handle error or fallback
                // For now, if addRole returns undefined (e.g. duplicate), we might not want to proceed or check existence first.
                // Assuming update to DataContext makes addRole return role or undefined.
                return;
            }
        }

        const invitation = addInvitation({
            recipient: formData.recipient,
            channel: formData.channel,
            roleId: roleIdToUse,
            invitedBy: currentUser.id,
            status: InvitationStatus.PENDING,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

        const baseUrl = `${window.location.origin}${window.location.pathname}#/signup`;
        const invitationLink = `${baseUrl}?token=${invitation.token}`;
        
        onInviteSent(invitationLink, formData.channel);
        onClose();
    };

    const toggleGroup = (groupName: string) => {
        setOpenPermissionGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('inviteUser')}
            widthClass="max-w-3xl"
            footer={<>
                <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleInvite} disabled={isFormInvalid}>{t('sendInvitation')}</Button>
            </>}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('inviteMode')}</label>
                    <div className="flex gap-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Button variant={inviteMode === 'role' ? 'primary' : 'ghost'} onClick={() => setInviteMode('role')} className="flex-1">{t('selectRoleMode')}</Button>
                        <Button variant={inviteMode === 'custom' ? 'primary' : 'ghost'} onClick={() => setInviteMode('custom')} className="flex-1">{t('customPermissionsMode')}</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label={t('channel')} value={formData.channel} onChange={e => setFormData(p => ({...p, channel: e.target.value as any, recipient: ''}))}>
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                    </Select>
                    <Input
                        label={formData.channel === 'EMAIL' ? t('email') : t('phoneNumber')}
                        type={formData.channel === 'EMAIL' ? 'email' : 'tel'}
                        value={formData.recipient}
                        onChange={e => setFormData(p => ({ ...p, recipient: e.target.value }))}
                        error={errors.recipient}
                        placeholder={formData.channel === 'WHATSAPP' ? '+261...' : 'name@example.com'}
                        required
                    />
                </div>
                
                {inviteMode === 'role' && (
                    <Select
                        label={t('role')}
                        value={formData.roleId}
                        onChange={e => setFormData(p => ({ ...p, roleId: e.target.value }))}
                        error={errors.roleId}
                        required
                    >
                        <option value="">{t('selectRole')}</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                )}

                {inviteMode === 'custom' && (
                    <div className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded-lg dark:border-gray-600">
                        {PERMISSION_GROUPS.map(group => (
                            <div key={group.name}>
                                <div onClick={() => toggleGroup(group.name)} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded cursor-pointer">
                                    <h4 className="font-semibold text-sm">{group.name}</h4>
                                    <Icon name="ChevronDown" className={`w-5 h-5 transition-transform ${openPermissionGroups.has(group.name) ? 'rotate-180' : ''}`} />
                                </div>
                                {openPermissionGroups.has(group.name) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                        {group.permissions.map(perm => (
                                            <label key={perm.id} className="flex items-center p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                                                <Checkbox
                                                    checked={customPermissions.has(perm.id)}
                                                    onChange={e => {
                                                        setCustomPermissions(prev => {
                                                            const next = new Set(prev);
                                                            if (e.target.checked) next.add(perm.id);
                                                            else next.delete(perm.id);
                                                            return next;
                                                        });
                                                    }}
                                                />
                                                <span className="ml-2 text-sm">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                         {errors.customPermissions && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customPermissions}</p>}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default InviteUserModal;