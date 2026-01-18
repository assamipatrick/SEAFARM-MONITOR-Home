
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

const UserProfile: React.FC = () => {
    const { t } = useLocalization();
    const { currentUser, updateProfile } = useAuth();
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                firstName: currentUser.firstName || '',
                lastName: currentUser.lastName || '',
                email: currentUser.email || '',
                phone: currentUser.phone || ''
            });
        }
    }, [currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setMessage({ type: 'error', text: t('validationRequired') });
            return;
        }

        try {
            updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone
            });
            setMessage({ type: 'success', text: t('profileUpdatedSuccess') });
            setIsEditing(false);
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('userProfileTitle')}</h1>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="secondary">
                        <Icon name="Edit2" className="w-4 h-4" />
                        {t('editProfile')}
                    </Button>
                )}
            </div>

            <Card>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                        {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{currentUser?.firstName} {currentUser?.lastName}</h2>
                        {/* FIX: Formatted role display to be more readable and prevent crash on undefined. */}
                        <p className="text-gray-500 dark:text-gray-400 text-sm uppercase">{(currentUser?.roleId || '').replace(/_/g, ' ')}</p>
                    </div>
                </div>

                {message && (
                    <div className={`p-3 mb-4 rounded-md text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label={t('firstName')} 
                            name="firstName"
                            value={formData.firstName} 
                            onChange={handleChange} 
                            disabled={!isEditing}
                            required
                        />
                        <Input 
                            label={t('lastName')} 
                            name="lastName"
                            value={formData.lastName} 
                            onChange={handleChange} 
                            disabled={!isEditing}
                            required
                        />
                    </div>
                    
                    <Input 
                        label={t('email')} 
                        name="email"
                        type="email"
                        value={formData.email} 
                        onChange={handleChange} 
                        disabled={!isEditing}
                        required
                    />

                    <Input 
                        label={t('phoneNumber')} 
                        name="phone"
                        type="tel"
                        value={formData.phone} 
                        onChange={handleChange} 
                        disabled={!isEditing}
                        placeholder="+123456789"
                    />

                    {isEditing && (
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={() => { setIsEditing(false); setMessage(null); }}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit">
                                {t('saveChanges')}
                            </Button>
                        </div>
                    )}
                </form>
            </Card>
        </div>
    );
};

export default UserProfile;
