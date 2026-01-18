
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Site, Zone } from '../types';
import CoordinateInput from '../components/ui/CoordinateInput';
import SiteLayoutVisualizer from '../components/SiteLayoutVisualizer';
import { useSettings } from '../contexts/SettingsContext';
import { dmsToDd } from '../utils/converters';

const SiteManagement: React.FC = () => {
    const { t } = useLocalization();
    const { sites, deleteSite, addSite, updateSite, employees, modules } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState<string | null>(null);

    const handleOpenModal = (site: Site | null = null) => {
        setEditingSite(site);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (siteId: string) => {
        setSiteToDelete(siteId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (siteToDelete) deleteSite(siteToDelete);
        setIsConfirmOpen(false);
        setSiteToDelete(null);
    };
    
    const handleSave = (siteData: Omit<Site, 'id'> | Site) => {
        if ('id' in siteData) {
            updateSite(siteData);
        } else {
            addSite(siteData);
        }
        setIsModalOpen(false);
    }

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('siteManagementTitle')}</h1>
                <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('addSite')}</Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {sites.map(site => {
                    const manager = employees.find(e => e.id === site.managerId);
                    return (
                        <Card key={site.id}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        {site.name}
                                        <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{site.code}</span>
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {t('manager')}: {manager ? `${manager.firstName} ${manager.lastName}` : t('noManager')}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('coordinates')}: {site.location || '-'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={() => handleOpenModal(site)}><Icon name="Edit2" className="w-4 h-4"/></Button>
                                    <Button variant="danger" onClick={() => handleDeleteClick(site.id)}><Icon name="Trash2" className="w-4 h-4"/></Button>
                                </div>
                            </div>
                            
                            <SiteLayoutVisualizer site={site} modules={modules} />

                            <div className="mt-4 border-t dark:border-gray-700 pt-4">
                                <h4 className="font-semibold mb-2">{t('zones')}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {site.zones.length > 0 ? site.zones.map(z => (
                                        <span key={z.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-sm border border-blue-200 dark:border-blue-800">
                                            {z.name}
                                        </span>
                                    )) : <span className="text-gray-500 text-sm italic">{t('noZonesDefined')}</span>}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {isModalOpen && (
                <SiteFormModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    site={editingSite} 
                    onSave={handleSave} 
                />
            )}
            
            {isConfirmOpen && (
                <ConfirmationModal 
                    isOpen={isConfirmOpen} 
                    onClose={() => setIsConfirmOpen(false)} 
                    onConfirm={handleConfirmDelete} 
                    title={t('confirmDeleteTitle')} 
                    message={t('confirmDeleteSite')} 
                />
            )}
        </div>
    );
};

const SiteFormModal: React.FC<{ isOpen: boolean, onClose: () => void, site: Site | null, onSave: (data: any) => void }> = ({ isOpen, onClose, site, onSave }) => {
    const { t } = useLocalization();
    const { employees, sites } = useData();
    const { settings } = useSettings();
    
    const [formData, setFormData] = useState<Omit<Site, 'id'>>({
        name: '', code: '', location: '', managerId: '', zones: []
    });
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [errors, setErrors] = useState<Record<string, any>>({});
    
    // Zone editing state
    const [zones, setZones] = useState<Zone[]>([]);

    const validate = useCallback(() => {
        const newErrors: Record<string, any> = {};
        if (!formData.name.trim()) newErrors.name = t('validationRequired');
        if (!formData.code.trim()) newErrors.code = t('validationRequired');

        const format = settings.localization.coordinateFormat;

        if (latitude.trim()) {
            try {
                if (format === 'DD') {
                    const lat = parseFloat(latitude);
                    if (isNaN(lat) || lat < -90 || lat > 90) {
                        throw new Error(t('validationDDLatitudeRange'));
                    }
                } else { // DMS
                    dmsToDd(latitude); // This will throw on its own
                }
            } catch (e: any) {
                newErrors.latitude = e.message;
            }
        }
        if (longitude.trim()) {
            try {
                if (format === 'DD') {
                    const lon = parseFloat(longitude);
                    if (isNaN(lon) || lon < -180 || lon > 180) {
                        throw new Error(t('validationDDLongitudeRange'));
                    }
                } else { // DMS
                    dmsToDd(longitude); // This will throw on its own
                }
            } catch (e: any) {
                newErrors.longitude = e.message;
            }
        }

        return newErrors;
    }, [formData.name, formData.code, latitude, longitude, t, settings.localization.coordinateFormat]);

    useEffect(() => {
        setErrors(validate());
    }, [validate]);

    useEffect(() => {
        if (site) {
            setFormData({
                name: site.name,
                code: site.code,
                location: site.location,
                managerId: site.managerId || '',
                zones: site.zones
            });
            setZones(site.zones);
            if (site.location) {
                const parts = site.location.split(',');
                if (parts.length === 2) {
                    setLatitude(parts[0].trim());
                    setLongitude(parts[1].trim());
                }
            }
        } else {
            setFormData({ name: '', code: '', location: '', managerId: '', zones: [] });
            setZones([]);
            setLatitude('');
            setLongitude('');
        }
    }, [site, isOpen]);

    const generateUniqueCode = (name: string): string => {
        // Remove non-alphabetic characters and convert to uppercase
        const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
        
        // If name is less than 3 chars, pad with 'X'
        if (cleanName.length < 3) {
            const padded = cleanName.padEnd(3, 'X');
            if (!sites.some(s => s.code === padded)) return padded;
            // If padded version exists, fallback to empty (user manual entry)
            return '';
        }

        const existingCodes = new Set(sites.map(s => s.code));

        // Generate all ordered 3-letter combinations
        // e.g. PARIS -> PAR, PAI, PAS, PRI, PRS, PIS, ARI, ARS...
        for (let i = 0; i < cleanName.length - 2; i++) {
            for (let j = i + 1; j < cleanName.length - 1; j++) {
                for (let k = j + 1; k < cleanName.length; k++) {
                    const code = cleanName[i] + cleanName[j] + cleanName[k];
                    if (!existingCodes.has(code)) {
                        return code;
                    }
                }
            }
        }

        // If all 3-letter combinations from the name are taken, fallback to manual entry
        return ''; 
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        let newCode = formData.code;

        // Automatically generate code if it's a new site (not editing)
        if (!site) {
            if (newName.trim().length > 0) {
                const generated = generateUniqueCode(newName);
                // Only update if a valid code was generated, otherwise keep previous or empty
                if (generated) newCode = generated;
            } else {
                newCode = '';
            }
        }
        
        setFormData(prev => ({ ...prev, name: newName, code: newCode }));
    };

    const handleAddZone = () => {
        const newZone: Zone = {
            id: `zone-${Date.now()}`,
            name: `Zone ${zones.length + 1}`,
            geoPoints: []
        };
        setZones([...zones, newZone]);
    };

    const handleZoneChange = (index: number, field: keyof Zone, value: any) => {
        setZones(prevZones => {
            const newZones = [...prevZones];
            newZones[index] = { ...newZones[index], [field]: value };
            return newZones;
        });
    };
    
    const handleDeleteZone = (index: number) => {
        setZones(zones.filter((_, i) => i !== index));
    };

    // GeoPoints Management for a specific zone
    const handleAddGeoPoint = (zoneIndex: number) => {
        setZones(prevZones => {
            const newZones = [...prevZones];
            const targetZone = { ...newZones[zoneIndex] };
            targetZone.geoPoints = [...targetZone.geoPoints, ''];
            newZones[zoneIndex] = targetZone;
            return newZones;
        });
    };

    const handleGeoPointChange = (zoneIndex: number, pointIndex: number, value: string) => {
        setZones(prevZones => {
            const newZones = [...prevZones];
            const targetZone = { ...newZones[zoneIndex] };
            const newGeoPoints = [...targetZone.geoPoints];
            newGeoPoints[pointIndex] = value;
            targetZone.geoPoints = newGeoPoints;
            newZones[zoneIndex] = targetZone;
            return newZones;
        });
    };
    
    const handleRemoveGeoPoint = (zoneIndex: number, pointIndex: number) => {
        setZones(prevZones => {
            const newZones = [...prevZones];
            const targetZone = { ...newZones[zoneIndex] };
            targetZone.geoPoints = targetZone.geoPoints.filter((_, i) => i !== pointIndex);
            newZones[zoneIndex] = targetZone;
            return newZones;
        });
    };

    const handleSubmit = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const location = (latitude && longitude) ? `${latitude}, ${longitude}` : '';
        const dataToSave = {
            ...formData,
            location,
            zones
        };
        if (site) {
            onSave({ ...site, ...dataToSave });
        } else {
            onSave(dataToSave);
        }
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={site ? t('editSite') : t('addSite')} widthClass="max-w-4xl">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label={t('siteName')} 
                        value={formData.name} 
                        onChange={handleNameChange} 
                        required
                        error={errors.name} 
                    />
                    <Input 
                        label={t('siteCode')} 
                        value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                        required
                        error={errors.code}
                    />
                    <Select label={t('manager')} value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})}>
                        <option value="">{t('noManager')}</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CoordinateInput label={t('latitude')} value={latitude} onChange={setLatitude} axis="lat" error={errors.latitude} />
                        <CoordinateInput label={t('longitude')} value={longitude} onChange={setLongitude} axis="lon" error={errors.longitude} />
                </div>

                <div className="border-t pt-4 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">{t('zones')}</h3>
                        <Button variant="secondary" onClick={handleAddZone} className="text-xs"><Icon name="PlusCircle" className="w-4 h-4 mr-1"/>{t('addZone')}</Button>
                    </div>
                    
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {zones.map((zone, index) => (
                            <div key={zone.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 relative">
                                <Button variant="danger" className="absolute top-2 right-2 p-1" onClick={() => handleDeleteZone(index)}><Icon name="X" className="w-4 h-4"/></Button>
                                <div className="mb-3 pr-8">
                                        <Input label={t('zoneName')} value={zone.name} onChange={e => handleZoneChange(index, 'name', e.target.value)} />
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('geoPoints')}</label>
                                            <Button variant="ghost" className="text-xs py-0 h-6" onClick={() => handleAddGeoPoint(index)}><Icon name="PlusCircle" className="w-3 h-3 mr-1"/>{t('addPoint')}</Button>
                                    </div>
                                    
                                    <div className="space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                        {zone.geoPoints.length > 0 && (
                                            <div className="grid grid-cols-[30px_1fr_1fr_40px] gap-2 text-xs text-gray-500 font-semibold mb-1">
                                                <div className="flex items-center justify-center">#</div>
                                                <div>{t('latitude')}</div>
                                                <div>{t('longitude')}</div>
                                                <div></div>
                                            </div>
                                        )}

                                        {zone.geoPoints.map((pointStr, pointIndex) => {
                                            const parts = pointStr.split(',').map(s => s.trim());
                                            const latStr = parts[0] || '';
                                            const lonStr = parts[1] || '';

                                            return (
                                                <div key={pointIndex} className="grid grid-cols-[30px_1fr_1fr_40px] gap-2 items-center">
                                                    <span className="text-xs text-gray-500 text-center">{pointIndex + 1}</span>
                                                    <CoordinateInput 
                                                        label="" 
                                                        value={latStr} 
                                                        onChange={(val) => {
                                                            handleGeoPointChange(index, pointIndex, `${val}, ${lonStr}`);
                                                        }} 
                                                        axis="lat"
                                                    />
                                                    <CoordinateInput 
                                                        label="" 
                                                        value={lonStr} 
                                                        onChange={(val) => {
                                                            handleGeoPointChange(index, pointIndex, `${latStr}, ${val}`);
                                                        }} 
                                                        axis="lon"
                                                    />
                                                    <Button variant="ghost" className="p-1 text-red-500 hover:text-red-700" onClick={() => handleRemoveGeoPoint(index, pointIndex)}>
                                                        <Icon name="Trash2" className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                        {zone.geoPoints.length === 0 && <p className="text-xs text-gray-400 italic">{t('noPoints') || 'No points'}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SiteManagement;
