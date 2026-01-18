import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

const ResetPassword: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { resetPassword } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    
    useEffect(() => {
        const resetToken = searchParams.get('token');
        if (!resetToken) {
            setError(t('invalidOrExpiredToken'));
        }
        setToken(resetToken);
    }, [searchParams, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }

        if (!token) {
            setError(t('invalidOrExpiredToken'));
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        const wasSuccessful = await resetPassword(token, password);

        if (wasSuccessful) {
            setSuccess(t('passwordResetSuccess'));
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } else {
            setError(t('invalidOrExpiredToken'));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md">
                 <div className="flex justify-center mb-6">
                    <img src={settings.company.logoUrl} alt="Company Logo" className="h-12" />
                </div>
                <Card title={t('resetPasswordTitle')}>
                    {success ? (
                        <div className="p-3 text-center bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md text-sm">
                            {success}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">
                                    {error}
                                </div>
                            )}
                            <Input
                                label={t('newPassword')}
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                autoFocus
                                disabled={!token || loading}
                            />
                            <Input
                                label={t('confirmNewPassword')}
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                disabled={!token || loading}
                            />
                            <Button type="submit" className="w-full" disabled={loading || !token || !password || !confirmPassword}>
                                {loading ? <Icon name="Activity" className="animate-spin" /> : t('resetPassword')}
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ResetPassword;
