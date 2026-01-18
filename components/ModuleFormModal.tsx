
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import type { Site, Zone, Module } from '../types';
import { ModuleStatus } from '../types';
import Icon from './ui/Icon';
import { dmsToDd } from '../utils/converters';
import CoordinateInput from './ui/CoordinateInput';

interface ModuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: { module: Module } | null;
    onSave: (moduleData: Module | Omit<Module, 'id'>) => void;
}
  
const ModuleFormModal: React.FC<ModuleFormModalProps> = ({ isOpen, onClose, data, onSave }) => {
    const { t } = useLocalization();
    const { sites, modules, cultivationCycles } = useData();
    const [moduleCode, setModuleCode] = useState('');
    const [formData, setFormData] = useState({
        siteId: '',
        zoneId: '',
        lines: 100,
        poles: { galvanized: 4, wood: 21, plastic: 0 },
        latitude: '',
        longitude: '',
    });
    const [filteredZones, setFilteredZones] = useState<Zone[]>([]);
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [activeCycleWarning, setActiveCycleWarning] = useState<string | null>(null);

    useEffect(() => {
        if (data) {
             setFormData({
                siteId: data.module.siteId,
                zoneId: data.module.zoneId,
                lines: data.module.lines,
                poles: data.module.poles,
                latitude: data.module.latitude || '',
                longitude: data.module.longitude || '',
            });
            setModuleCode(data.module.code);
        } else {
             setFormData({
                siteId: sites[0]?.id || '',
                zoneId: '',
                lines: 100,
                poles: { galvanized: 4, wood: 21, plastic: 0 },
                latitude: '',
                longitude: '',
            });
            setModuleCode('');
        }
        setActiveCycleWarning(null);
    }, [data, isOpen, sites]);

    useEffect(() => {
        if (data && (data.module.siteId !== formData.siteId || data.module.zoneId !== formData.zoneId)) {
            const activeCycle = cultivationCycles.find(c =>
                c.moduleId === data.module.id &&
                (c.status === ModuleStatus.PLANTED || c.status === ModuleStatus.GROWING)
            );
            if (activeCycle) {
                setActiveCycleWarning(t('moduleMoveActiveCycleWarning'));
            } else {
                setActiveCycleWarning(null);
            }
        } else {
            setActiveCycleWarning(null);
        }
    }, [data, formData.siteId, formData.zoneId, cultivationCycles, t]);

    const validate = useCallback(() => {
        const newErrors: Record<string, any> = { poles: {} };
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.zoneId) newErrors.zoneId = t('validationRequired');
        if (isNaN(formData.lines) || formData.lines <= 0) newErrors.lines = t('validationPositiveNumber');
        
        if (formData.latitude.trim()) {
            try {
                dmsToDd(formData.latitude);
            } catch (e) {
                newErrors.latitude = t('invalidDMSFormat');
            }
        }
        if (formData.longitude.trim()) {
            try {
                dmsToDd(formData.longitude);
            } catch (e) {
                newErrors.longitude = t('invalidDMSFormat');
            }
        }

        let hasPoleErrors = false;
        for (const key of ['galvanized', 'wood', 'plastic'] as const) {
            if (isNaN(formData.poles[key]) || formData.poles[key] < 0) {
                newErrors.poles[key] = t('validationNonNegative');
                hasPoleErrors = true;
            }
        }
        if (!hasPoleErrors) delete newErrors.poles;

        return newErrors;
    }, [formData, t]);

    useEffect(() => {
        const selectedSite = sites.find(s => s.id === formData.siteId);
        setFilteredZones(selectedSite?.zones || []);
    }, [formData.siteId, sites]);
    
    useEffect(() => {
        // This effect auto-generates a unique module code when creating a module
        // or when an existing module is moved to a new site or zone.
        if (formData.siteId && formData.zoneId) {
            const site = sites.find(s => s.id === formData.siteId);
            const zone = site?.zones.find(z => z.id === formData.zoneId);
            
            if (site && zone) {
                const siteCode = site.code || 'SITE';
                const zoneCode = zone.name.replace(/zone/i, '').trim().replace(/[^A-Z0-9]/ig, '').toUpperCase() || 'Z';
                let moduleNumberStr: string;

                const isEditing = !!data;
                const locationChanged = isEditing && (data.module.siteId !== formData.siteId || data.module.zoneId !== formData.zoneId);

                // Regenerate the number if it's a new module or if its location has changed.
                if (!isEditing || locationChanged) {
                    const modulesInTargetZone = modules.filter(m => m.zoneId === formData.zoneId);
                    
                    // Robustly parse the numeric suffix from existing module codes in the target zone.
                    const existingNumbers = modulesInTargetZone
                        .map(m => {
                            const parts = m.code.split('-');
                            const lastPart = parts[parts.length - 1];
                            // Only parse if the last part is a pure number string.
                            // This prevents errors from codes like 'SITE-A-V2'.
                            if (lastPart && /^\d+$/.test(lastPart)) {
                                return parseInt(lastPart, 10);
                            }
                            return NaN;
                        })
                        .filter(n => !isNaN(n));
                    
                    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
                    const nextModuleNumber = maxNumber + 1;
                    moduleNumberStr = String(nextModuleNumber).padStart(2, '0');
                } else {
                    // If editing but not moving, preserve the existing module number.
                    const parts = data.module.code.split('-');
                    moduleNumberStr = parts[parts.length - 1] || '01';
                }

                const newCode = `${siteCode}-${zoneCode}-${moduleNumberStr}`;
                setModuleCode(newCode);
            }
        } else if (!data) {
            // Clear code if no site/zone when adding a new module
            setModuleCode('');
        }
    }, [data, formData.siteId, formData.zoneId, sites, modules]);

    useEffect(() => { setErrors(validate()) }, [formData, validate]);

    const handleChange = (field: keyof Omit<typeof formData, 'poles'>, value: any) => {
        setFormData(p => ({...p, [field]: value}));
    };

    const handlePoleChange = (poleType: keyof typeof formData.poles, value: number) => {
        setFormData(p => ({ ...p, poles: { ...p.poles, [poleType]: value }}));
    };

    const handleSiteChange = (newSiteId: string) => {
        const selectedSite = sites.find(s => s.id === newSiteId);
        const zones = selectedSite?.zones || [];
    
        setFormData(prev => ({
            ...prev,
            siteId: newSiteId,
            zoneId: zones[0]?.id || '',
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if(Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        if (data) {
            // Updating - preserve existing module properties (id, farmerId, statusHistory)
            const updatedModule: Module = {
                ...data.module,
                code: moduleCode,
                siteId: formData.siteId,
                zoneId: formData.zoneId,
                lines: Number(formData.lines),
                poles: {
                    galvanized: Number(formData.poles.galvanized),
                    wood: Number(formData.poles.wood),
                    plastic: Number(formData.poles.plastic),
                },
                latitude: formData.latitude.trim() || undefined,
                longitude: formData.longitude.trim() || undefined,
            };
            onSave(updatedModule);
        } else {
            // Creating - just pass the form data, addModule in context handles the rest
            const newModuleData = {
                code: moduleCode,
                siteId: formData.siteId,
                zoneId: formData.zoneId,
                lines: Number(formData.lines),
                poles: {
                    galvanized: Number(formData.poles.galvanized),
                    wood: Number(formData.poles.wood),
                    plastic: Number(formData.poles.plastic),
                },
                latitude: formData.latitude.trim() || undefined,
                longitude: formData.longitude.trim() || undefined,
            };
            onSave(newModuleData as any);
        }
    };

    const isFormInvalid = Object.keys(errors).length > 0;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={data ? t('editModule') : t('addModule')} widthClass="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label={t('moduleCode')} value={moduleCode} disabled />
                    <Select label={t('site')} value={formData.siteId} onChange={e => handleSiteChange(e.target.value)} error={errors.siteId}>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('zoneName')} value={formData.zoneId} onChange={e => handleChange('zoneId', e.target.value)} error={errors.zoneId} disabled={!formData.siteId}>
                         <option value="">{t('selectZone')}</option>
                        {filteredZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CoordinateInput
                        label={`${t('latitudeDMS')} (${t('optional')})`}
                        value={formData.latitude}
                        onChange={value => handleChange('latitude', value)}
                        axis="lat"
                        error={errors.latitude}
                    />
                    <CoordinateInput
                        label={`${t('longitudeDMS')} (${t('optional')})`}
                        value={formData.longitude}
                        onChange={value => handleChange('longitude', value)}
                        axis="lon"
                        error={errors.longitude}
                    />
                </div>

                {activeCycleWarning && (
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm flex items-center gap-2">
                        <Icon name="AlertTriangle" className="w-5 h-5 flex-shrink-0" />
                        {activeCycleWarning}
                    </div>
                )}
                
                <div className="border-t dark:border-gray-700 pt-4">
                    <h3 className="text-lg font-semibold mb-2">{t('configuration')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input label={t('lines')} type="number" value={formData.lines} onChange={e => handleChange('lines', Number(e.target.value))} error={errors.lines} required />
                        <Input label={t('galvanizedPoles')} type="number" value={formData.poles.galvanized} onChange={e => handlePoleChange('galvanized', Number(e.target.value))} error={errors.poles?.galvanized} required />
                        <Input label={t('woodPoles')} type="number" value={formData.poles.wood} onChange={e => handlePoleChange('wood', Number(e.target.value))} error={errors.poles?.wood} required />
                        <Input label={t('plasticPoles')} type="number" value={formData.poles.plastic} onChange={e => handlePoleChange('plastic', Number(e.target.value))} error={errors.poles?.plastic} required />
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </form>
        </Modal>
    )
}

export default ModuleFormModal;
