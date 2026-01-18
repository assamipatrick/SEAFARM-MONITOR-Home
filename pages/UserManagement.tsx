import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import InviteUserModal from '../components/InviteUserModal';
import { InvitationStatus } from '../types';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Authorization from '../components/auth/Authorization';
import { PERMISSIONS } from '../permissions';

const UserManagement: React.FC = () => {
    const { t, language } = useLocalization();
    const { users, roles, invitations, deleteInvitation } = useData();
    const { currentUser } = useAuth();
    
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('users');
    const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);
    const [linkToShow, setLinkToShow] = useState<{link: string, channel: 'EMAIL' | 'WHATSAPP'} | null>(null);

    const roleMap = useMemo(() => new Map(roles.map(r => [r.id, r.name])), [roles]);

    const handleRevoke = (id: string) => {
        deleteInvitation(id);
        setInvitationToRevoke(null);
    };
    
    const handleResend = (invitation: any) => {
        const baseUrl = `${window.location.origin}${window.location.pathname}#/signup`;
        const invitationLink = `${baseUrl}?token=${invitation.token}`;
        if (invitation.channel === 'WHATSAPP') {
            const message = t('resendWhatsAppMessage').replace('{link}', invitationLink);
            const whatsappUrl = `https://wa.me/${invitation.recipient.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
            setLinkToShow({ link: whatsappUrl, channel: 'WHATSAPP' });
        } else {
            setLinkToShow({ link: invitationLink, channel: 'EMAIL' });
        }
    };
    
    const pendingInvitations = invitations.filter(inv => inv.status === InvitationStatus.PENDING && new Date(inv.expiresAt) > new Date());
    const userMap = useMemo(() => new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [users]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('userManagement')}</h1>
                <Authorization permission={PERMISSIONS.USERS_INVITE}>
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                        <Icon name="PlusCircle" className="w-5 h-5"/>
                        {t('inviteUser')}
                    </Button>
                </Authorization>
            </div>

            <Card>
                 <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t('currentUsers')}</button>
                        <button onClick={() => setActiveTab('invitations')} className={`${activeTab === 'invitations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t('pendingInvitations')} ({pendingInvitations.length})</button>
                    </nav>
                </div>
                
                {activeTab === 'users' && (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b dark:border-gray-700">
                                    <th className="p-3">{t('name')}</th>
                                    <th className="p-3">{t('email')}</th>
                                    <th className="p-3">{t('role')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b dark:border-gray-700/50">
                                        <td className="p-3">{user.firstName} {user.lastName}</td>
                                        <td className="p-3">{user.email}</td>
                                        <td className="p-3">{roleMap.get(user.roleId) || user.roleId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'invitations' && (
                     <div className="overflow-x-auto mt-4">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b dark:border-gray-700">
                                    <th className="p-3">{t('recipient')}</th>
                                    <th className="p-3">{t('channel')}</th>
                                    <th className="p-3">{t('role')}</th>
                                    <th className="p-3">{t('expiresAt')}</th>
                                    <th className="p-3">{t('invitedBy')}</th>
                                    <th className="p-3 text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingInvitations.map(inv => (
                                    <tr key={inv.id} className="border-b dark:border-gray-700/50">
                                        <td className="p-3">{inv.recipient}</td>
                                        <td className="p-3">{inv.channel}</td>
                                        <td className="p-3">{roleMap.get(inv.roleId) || inv.roleId}</td>
                                        <td className="p-3">{new Date(inv.expiresAt).toLocaleDateString(language)}</td>
                                        <td className="p-3">{userMap.get(inv.invitedBy) || 'N/A'}</td>
                                        <td className="p-3 text-right">
                                            <Authorization permission={PERMISSIONS.USERS_INVITE}>
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="secondary" onClick={() => handleResend(inv)}>{t('resend')}</Button>
                                                    <Button variant="danger" onClick={() => setInvitationToRevoke(inv.id)}>{t('revoke')}</Button>
                                                </div>
                                            </Authorization>
                                        </td>
                                    </tr>
                                ))}
                                {pendingInvitations.length === 0 && (
                                    <tr><td colSpan={6} className="text-center p-8 text-gray-500">{t('noPendingInvitations')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            
            <InviteUserModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                currentUser={currentUser}
                onInviteSent={(link, channel) => setLinkToShow({link, channel})}
            />
            
            {invitationToRevoke && (
                <ConfirmationModal
                    isOpen={!!invitationToRevoke}
                    onClose={() => setInvitationToRevoke(null)}
                    onConfirm={() => handleRevoke(invitationToRevoke)}
                    title={t('revokeInvitation')}
                    message={t('confirmRevokeInvitation')}
                    confirmText={t('revoke')}
                />
            )}

            {linkToShow && (
                <Modal isOpen={!!linkToShow} onClose={() => setLinkToShow(null)} title={t('invitationSent')}>
                    <p>{linkToShow.channel === 'EMAIL' ? t('invitationLinkMessage') : t('invitationWhatsAppMessage')}</p>
                    {linkToShow.channel === 'EMAIL' ? (
                        <Input value={linkToShow.link} readOnly className="mt-2" />
                    ) : (
                        <a href={linkToShow.link} target="_blank" rel="noopener noreferrer">
                            <Button className="mt-2 w-full">{t('openWhatsApp')}</Button>
                        </a>
                    )}
                </Modal>
            )}

        </div>
    );
};

export default UserManagement;