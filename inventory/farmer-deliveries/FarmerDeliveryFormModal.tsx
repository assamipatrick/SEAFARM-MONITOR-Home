
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber } from '../../utils/formatters';
import type { Farmer } from '../../types';

const BagWeightInputs: React.FC<{
    weights: number[];
    onChange: (weights: number[]) => void;
}> = ({ weights, onChange }) => {
    const { t } = useLocalization();
    const [inputs, setInputs] = useState<string[]>([]);
    
    useEffect(() => {
        // Initialize inputs with existing weights plus empty slots to fill rows
        const newInputs = [...weights.map(String)];
        const setsOfTen = Math.max(1, Math.ceil((newInputs.length + 1) / 10));
        const requiredLength = setsOfTen * 10;
        while (newInputs.length < requiredLength) {
            newInputs.push('');
        }
        setInputs(newInputs);
    // FIX: Optimized the useEffect hook to only run when the number of weights changes, preventing unnecessary re-renders on every keystroke.
    }, [weights.length]);

    const handleInputChange = (index: number, value: string) => {
        const newInputs = [...inputs];
        newInputs[index] = value;
        
        // Automatically add a new row if typing in the last slot
        if (index === newInputs.length - 1 && value.trim() !== '') {
            for (let i = 0; i < 10; i++) newInputs.push('');
        }
        
        setInputs(newInputs);
        
        // Filter valid numbers for parent state
        const numericWeights = newInputs
            .map(w => parseFloat(w))
            .filter(w => !isNaN(w) && w > 0);
        onChange(numericWeights);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bagWeights')}</label>
            <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                {inputs.map((weight, index) => (
                    <Input
                        key={index}
                        type="number"
                        step="any"
                        placeholder={`${t('sac')} ${index + 1}`}
                        value={weight}
                        onChange={e => handleInputChange(index, e.target.value)}
                        className="text-center"
                    />
                ))}
            </div>
        </div>
    );
};


interface FarmerDeliveryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FarmerDeliveryFormModal: React.FC<FarmerDeliveryFormModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const { sites, farmers, seaweedTypes, addFarmerDelivery, getFarmersBySite, stockMovements } = useData();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        siteId: '',
        farmerId: '',
        seaweedTypeId: '',
        destination: 'PRESSING_WAREHOUSE_BULK' as 'SITE_STORAGE' | 'PRESSING_WAREHOUSE_BULK',
    });
    const [bagWeights, setBagWeights] = useState<number[]>([]);
    const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    useEffect(() => {
        if(isOpen) {
            const defaultSiteId = sites.find(s => s.id !== 'pressing-warehouse')?.id || '';
            setFormData({
                date: new Date().toISOString().split('T')[0],
                siteId: defaultSiteId,
                farmerId: '',
                seaweedTypeId: seaweedTypes[0]?.id || '',
                destination: 'PRESSING_WAREHOUSE_BULK',
            });
            setBagWeights([]);
            setFilteredFarmers(getFarmersBySite(defaultSiteId));
            setErrors({});
        }
    }, [isOpen, sites, seaweedTypes, getFarmersBySite]);
    
    const calculated = useMemo(() => ({
        totalWeightKg: bagWeights.reduce((sum, w) => sum + w, 0),
        totalBags: bagWeights.length,
    }), [bagWeights]);

    const currentStock = useMemo(() => {
        if (!formData.siteId || !formData.seaweedTypeId) {
            return { kg: 0, bags: 0 };
        }
        const movements = stockMovements.filter(m => m.siteId === formData.siteId && m.seaweedTypeId === formData.seaweedTypeId);
        const totalInKg = movements.reduce((sum, m) => sum + (m.inKg || 0), 0);
        const totalOutKg = movements.reduce((sum, m) => sum + (m.outKg || 0), 0);
        const totalInBags = movements.reduce((sum, m) => sum + (m.inBags || 0), 0);
        const totalOutBags = movements.reduce((sum, m) => sum + (m.outBags || 0), 0);
        return {
            kg: totalInKg - totalOutKg,
            bags: totalInBags - totalOutBags,
        };
    }, [formData.siteId, formData.seaweedTypeId, stockMovements]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.farmerId) newErrors.farmerId = t('validationRequired');
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        if (calculated.totalWeightKg <= 0) {
            newErrors.bagWeights = t('validationAtLeastOneRequired');
        }
        return newErrors;
    }, [formData, calculated, t]);

    useEffect(() => {
        setErrors(validate());
    }, [formData, calculated, validate]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(p => ({ ...p, [field]: value }));
    };

    const handleSiteChange = (siteId: string) => {
        setFormData(p => ({ ...p, siteId, farmerId: '' }));
        setFilteredFarmers(getFarmersBySite(siteId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        addFarmerDelivery({
            ...formData,
            totalWeightKg: calculated.totalWeightKg,
            totalBags: calculated.totalBags,
            bagWeights,
        });
        
        onClose();
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('newDelivery')}
            widthClass="max-w-4xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isFormInvalid}>{t('receivedAtWarehouse')}</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} required />
                     <Select label={t('site')} value={formData.siteId} onChange={e => handleSiteChange(e.target.value)} error={errors.siteId} required>
                        <option value="">{t('selectSite')}</option>
                        {sites.filter(s => s.id !== 'pressing-warehouse').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('farmerLabel')} value={formData.farmerId} onChange={e => handleChange('farmerId', e.target.value)} error={errors.farmerId} disabled={!formData.siteId} required>
                        <option value="">{t('selectFarmer')}</option>
                        {filteredFarmers.map(f => <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>)}
                    </Select>
                    <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => handleChange('seaweedTypeId', e.target.value)} error={errors.seaweedTypeId} required>
                        <option value="">{t('selectType')}</option>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                    
                    <Select containerClassName="md:col-span-2" label={t('destination')} value={formData.destination} onChange={e => handleChange('destination', e.target.value)}>
                        <option value="PRESSING_WAREHOUSE_BULK">{t('pressedWarehouseTitle')}</option>
                        <option value="SITE_STORAGE">{t('onSiteStorageTitle')}</option>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('currentStock')} ({t('kg')})</label>
                        <p className="text-xl font-bold">
                            {formatNumber(currentStock.kg, settings.localization)}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('stockBags')}</label>
                        <p className="text-xl font-bold">
                            {formatNumber(currentStock.bags, {...settings.localization, nonMonetaryDecimals: 0 })}
                        </p>
                    </div>
                </div>
                
                <BagWeightInputs weights={bagWeights} onChange={setBagWeights} />
                {errors.bagWeights && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.bagWeights}</p>}

                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center text-lg font-semibold">
                        <span>{t('totalWeightKgDelivery')}:</span>
                        <span className="text-blue-600 dark:text-blue-400">{calculated.totalWeightKg.toFixed(2)} kg <span className="text-sm text-gray-500 dark:text-gray-400">({calculated.totalBags} {t('bags')})</span></span>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default FarmerDeliveryFormModal;
