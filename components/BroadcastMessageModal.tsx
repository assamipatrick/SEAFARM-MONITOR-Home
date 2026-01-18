
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { Farmer, MessageLog } from '../types';
import Icon from './ui/Icon';

interface BroadcastMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedFarmerIds?: string[];
}

const BroadcastMessageModal: React.FC<BroadcastMessageModalProps> = ({ isOpen, onClose, preselectedFarmerIds = [] }) => {
    const { t, language } = useLocalization();
    const { sites, farmers, addMessageLog, messageLogs } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

    // Form State
    const [scope, setScope] = useState<'ALL' | 'SITE' | 'SELECTED'>(preselectedFarmerIds.length > 0 ? 'SELECTED' : 'ALL');
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [channel, setChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
             if (preselectedFarmerIds.length > 0) {
                 setScope('SELECTED');
             } else {
                 setScope('ALL');
             }
             setMessage('');
             setIsSending(false);
             setActiveTab('compose');
        }
    }, [isOpen, preselectedFarmerIds]);

    const targetFarmers = useMemo(() => {
        switch (scope) {
            case 'ALL':
                return farmers;
            case 'SITE':
                return farmers.filter(f => f.siteId === selectedSiteId);
            case 'SELECTED':
                return farmers.filter(f => preselectedFarmerIds.includes(f.id));
            default:
                return [];
        }
    }, [scope, selectedSiteId, farmers, preselectedFarmerIds]);

    const handleSend = async () => {
        if (!message.trim()) return;
        setIsSending(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const log: Omit<MessageLog, 'id'> = {
            date: new Date().toISOString(),
            senderId: currentUser?.id || 'unknown',
            recipientCount: targetFarmers.length,
            filterType: scope,
            filterValue: scope === 'SITE' ? selectedSiteId : undefined,
            channel,
            content: message,
            status: 'SENT' // Assuming success for mock
        };

        addMessageLog(log);
        setIsSending(false);
        alert(t('messageSentSuccess'));
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('broadcastTitle')}
            widthClass="max-w-4xl"
            footer={
                activeTab === 'compose' ? (
                    <>
                        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                        <Button onClick={handleSend} disabled={isSending || targetFarmers.length === 0 || !message.trim()}>
                            <Icon name="Send" className={`w-4 h-4 mr-2 ${isSending ? 'animate-spin' : ''}`} />
                            {isSending ? t('sending') : t('sendMessage')}
                        </Button>
                    </>
                ) : (
                    <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
                )
            }
        >
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'compose'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {t('composeMessage')}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'history'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {t('messageHistory')}
                    </button>
                </nav>
            </div>

            {activeTab === 'compose' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Select label={t('recipientScope')} value={scope} onChange={e => setScope(e.target.value as any)}>
                                <option value="ALL">{t('scope_ALL')}</option>
                                <option value="SITE">{t('scope_SITE')}</option>
                                <option value="SELECTED" disabled={preselectedFarmerIds.length === 0}>{t('scope_SELECTED')} ({preselectedFarmerIds.length})</option>
                            </Select>
                            
                            {scope === 'SITE' && (
                                <Select label={t('site')} value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}>
                                    <option value="">{t('selectSite')}</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Select>
                            )}

                            <Select label={t('channel')} value={channel} onChange={e => setChannel(e.target.value as any)}>
                                <option value="SMS">{t('channel_SMS')}</option>
                                <option value="WHATSAPP">{t('channel_WHATSAPP')}</option>
                            </Select>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                                    {t('recipient')} Count: <span className="font-bold text-lg">{targetFarmers.length}</span>
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-300">
                                    Farmers with valid phone numbers will receive this message.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col h-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('messageContent')}</label>
                            <textarea
                                className="w-full flex-grow p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="Type your message here..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                maxLength={channel === 'SMS' ? 160 : 1000}
                                rows={6}
                            />
                            <div className="text-right text-xs text-gray-500 mt-1">
                                {t('charCount').replace('{count}', String(message.length))} / {channel === 'SMS' ? 160 : 1000}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-3">{t('date')}</th>
                                <th className="p-3">{t('channel')}</th>
                                <th className="p-3">{t('recipient')}</th>
                                <th className="p-3">{t('messageContent')}</th>
                                <th className="p-3">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {messageLogs.length > 0 ? messageLogs.slice().reverse().map(log => (
                                <tr key={log.id} className="border-b dark:border-gray-700/50">
                                    <td className="p-3 whitespace-nowrap">{new Date(log.date).toLocaleString()}</td>
                                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${log.channel === 'WHATSAPP' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{log.channel}</span></td>
                                    <td className="p-3">{log.recipientCount} Farmers ({log.filterType})</td>
                                    <td className="p-3 truncate max-w-xs" title={log.content}>{log.content}</td>
                                    <td className="p-3"><span className="text-green-600 font-semibold">{log.status}</span></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="p-6 text-center text-gray-500">{t('noHistory')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
};

export default BroadcastMessageModal;
