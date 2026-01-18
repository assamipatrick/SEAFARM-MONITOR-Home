
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

const ForgotPassword: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { sendPasswordResetLink } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [messageSent, setMessageSent] = useState(false);
    const [demoLink, setDemoLink] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const link = await sendPasswordResetLink(email);
        setDemoLink(link);
        setLoading(false);
        setMessageSent(true);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <img src={settings.company.logoUrl} alt="Company Logo" className="h-12" />
                </div>
                <Card title={t('forgotPasswordTitle')}>
                    {messageSent ? (
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">{t('resetLinkSentTitle')}</h3>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('resetLinkSentInstructions')}</p>
                            
                            {demoLink && (
                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="Bot" className="w-4 h-4 text-blue-600" />
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Demo Email Simulator</p>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        In a production environment, the following link would be sent to <strong>{email}</strong>. For this demo, click the link below to proceed:
                                    </p>
                                    <Link 
                                        to={demoLink.substring(demoLink.indexOf('#') + 1)} 
                                        className="text-sm font-medium text-blue-600 hover:text-blue-500 underline break-all"
                                    >
                                        {demoLink}
                                    </Link>
                                </div>
                            )}

                            <Link to="/login">
                                <Button className="w-full mt-6">{t('backToLogin')}</Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('forgotPasswordInstructions')}</p>
                            <Input
                                label={t('email')}
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                            />
                            <Button type="submit" className="w-full" disabled={loading || !email}>
                                {loading ? <Icon name="Activity" className="animate-spin" /> : t('sendResetLink')}
                            </Button>
                             <p className="mt-6 text-center text-sm">
                                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">{t('backToLogin')}</Link>
                            </p>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ForgotPassword;
