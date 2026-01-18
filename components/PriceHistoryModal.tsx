
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import Icon from './ui/Icon';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import type { SeaweedType, SeaweedPriceHistory } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  seaweedType: SeaweedType;
}

const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({ isOpen, onClose, seaweedType }) => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { updateSeaweedPrices } = useData();

    const [newPrice, setNewPrice] = useState({
        wetPrice: '',
        dryPrice: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const sortedHistory = useMemo(() => {
        return [...seaweedType.priceHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [seaweedType.priceHistory]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (isNaN(parseFloat(newPrice.wetPrice)) || parseFloat(newPrice.wetPrice) <= 0) {
            newErrors.wetPrice = t('validationPositiveNumber');
        }
        if (isNaN(parseFloat(newPrice.dryPrice)) || parseFloat(newPrice.dryPrice) <= 0) {
            newErrors.dryPrice = t('validationPositiveNumber');
        }
        if (!newPrice.date) {
            newErrors.date = t('validationRequired');
        } else if (new Date(newPrice.date) > new Date()) {
            newErrors.date = t('validationFutureDate');
        }
        return newErrors;
    }, [newPrice, t]);

    useEffect(() => {
        if (isOpen) {
            setNewPrice({
                wetPrice: String(seaweedType.wetPrice),
                dryPrice: String(seaweedType.dryPrice),
                date: new Date().toISOString().split('T')[0]
            });
            setErrors({});
        }
    }, [isOpen, seaweedType]);
    
    useEffect(() => {
        setErrors(validate());
    }, [newPrice, validate]);

    const handleInputChange = (field: keyof typeof newPrice, value: string) => {
        setNewPrice(prev => ({ ...prev, [field]: value }));
    };

    const handleAddPrice = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const priceData: SeaweedPriceHistory = {
            date: newPrice.date,
            wetPrice: parseFloat(newPrice.wetPrice),
            dryPrice: parseFloat(newPrice.dryPrice),
        };

        updateSeaweedPrices(seaweedType.id, priceData);
        // Do not close modal, just reset the form to add another
        setNewPrice({
            wetPrice: String(priceData.wetPrice),
            dryPrice: String(priceData.dryPrice),
            date: new Date().toISOString().split('T')[0]
        });
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${t('priceHistory')}: ${seaweedType.name}`}
            widthClass="max-w-3xl"
        >
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('addNewPrice')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                        <Input 
                            label={t('wetPrice')} 
                            type="number"
                            step="any"
                            value={newPrice.wetPrice}
                            onChange={e => handleInputChange('wetPrice', e.target.value)}
                            error={errors.wetPrice}
                        />
                        <Input 
                            label={t('dryPrice')} 
                            type="number"
                            step="any"
                            value={newPrice.dryPrice}
                            onChange={e => handleInputChange('dryPrice', e.target.value)}
                            error={errors.dryPrice}
                        />
                        <Input 
                            label={t('effectiveDate')} 
                            type="date"
                            value={newPrice.date}
                            onChange={e => handleInputChange('date', e.target.value)}
                            error={errors.date}
                        />
                         <Button onClick={handleAddPrice} disabled={isFormInvalid} className="h-10">
                            <Icon name="PlusCircle" className="w-5 h-5" />
                            {t('add')}
                        </Button>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('history')}</h3>
                    <div className="max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg">
                        <table className="w-full text-left">
                             <thead>
                                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                                    <th className="p-2">{t('effectiveDate')}</th>
                                    <th className="p-2 text-right">{t('wetPrice')}</th>
                                    <th className="p-2 text-right">{t('dryPrice')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedHistory.map((entry, index) => (
                                    <tr key={index} className="border-b dark:border-gray-700/50">
                                        <td className="p-2">{new Date(entry.date).toLocaleDateString(language)}</td>
                                        <td className="p-2 text-right">{formatCurrency(entry.wetPrice, settings.localization)}</td>
                                        <td className="p-2 text-right">{formatCurrency(entry.dryPrice, settings.localization)}</td>
                                    </tr>
                                ))}
                                {sortedHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-gray-500">{t('noPriceHistory')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PriceHistoryModal;