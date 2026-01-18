
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import StatusBadge from '../components/ui/StatusBadge';
import type { Incident, Module, IncidentType, IncidentSeverity } from '../types';
import { IncidentStatus } from '../types';
import { analyzeIncidentDescription, analyzeImageForPest } from '../services/geminiService';

type SortableKeys = keyof Incident | 'siteName' | 'reportedByName';

const IncidentManagement: React.FC = () => {
    const { t, language } = useLocalization();
    const { incidents, sites, employees, deleteIncident, incidentTypes, incidentSeverities } = useData();
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [incidentToDelete, setIncidentToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [filters, setFilters] = useState({
        siteId: 'all',
        type: 'all',
        severity: 'all',
        status: 'all',
    });

    const siteMap = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);
    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);
    const typeMap = useMemo(() => new Map(incidentTypes.map(it => [it.id, it.name])), [incidentTypes]);
    const severityMap = useMemo(() => new Map(incidentSeverities.map(is => [is.id, is.name])), [incidentSeverities]);

    const summaryStats = useMemo(() => {
        const open = incidents.filter(i => i.status === IncidentStatus.OPEN).length;
        const inProgress = incidents.filter(i => i.status === IncidentStatus.IN_PROGRESS).length;
        const critical = incidents.filter(i => i.severity === 'CRITICAL' && (i.status === IncidentStatus.OPEN || i.status === IncidentStatus.IN_PROGRESS)).length;
        return { open, inProgress, critical };
    }, [incidents]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ siteId: 'all', type: 'all', severity: 'all', status: 'all' });
    };

    const filteredAndSortedIncidents = useMemo(() => {
        let filtered = [...incidents].filter(inc => {
            const siteMatch = filters.siteId === 'all' || inc.siteId === filters.siteId;
            const typeMatch = filters.type === 'all' || inc.type === filters.type;
            const severityMatch = filters.severity === 'all' || inc.severity === filters.severity;
            const statusMatch = filters.status === 'all' || inc.status === filters.status;
            return siteMatch && typeMatch && severityMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'siteName') valA = siteMap.get(a.siteId) || '';
            else if (sortConfig.key === 'reportedByName') valA = employeeMap.get(a.reportedById) || '';
            else valA = a[sortConfig.key as keyof Incident];

            if (sortConfig.key === 'siteName') valB = siteMap.get(b.siteId) || '';
            else if (sortConfig.key === 'reportedByName') valB = employeeMap.get(b.reportedById) || '';
            else valB = b[sortConfig.key as keyof Incident];
            
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [incidents, filters, sortConfig, siteMap, employeeMap]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => (
        <th className={`p-3 ${className}`}><button onClick={() => requestSort(sortKey)} className={`group flex items-center gap-2 w-full ${className?.includes('text-right') ? 'justify-end' : ''}`}>{label}{getSortIcon(sortKey)}</button></th>
    );

    const handleOpenModal = (incident: Incident | null = null) => {
        setEditingIncident(incident);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (incidentId: string) => {
        setIncidentToDelete(incidentId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (incidentToDelete) {
            deleteIncident(incidentToDelete);
        }
        setIsConfirmOpen(false);
        setIncidentToDelete(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">{t('incidentManagementTitle')}</h1>
                <Button onClick={() => handleOpenModal()}><Icon name="PlusCircle" className="w-5 h-5"/>{t('reportIncident')}</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card><div className="flex items-center"><Icon name="Bell" className="w-8 h-8 text-blue-500 mr-4"/><div><p className="text-gray-500">{t('openIncidents')}</p><p className="text-2xl font-bold">{summaryStats.open}</p></div></div></Card>
                <Card><div className="flex items-center"><Icon name="Activity" className="w-8 h-8 text-purple-500 mr-4"/><div><p className="text-gray-500">{t('inProgressIncidents')}</p><p className="text-2xl font-bold">{summaryStats.inProgress}</p></div></div></Card>
                <Card><div className="flex items-center"><Icon name="AlertTriangle" className="w-8 h-8 text-red-500 mr-4"/><div><p className="text-gray-500">{t('criticalIncidents')}</p><p className="text-2xl font-bold">{summaryStats.critical}</p></div></div></Card>
            </div>

            <Card>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end mb-4">
                    <Select label={t('site')} value={filters.siteId} onChange={e => handleFilterChange('siteId', e.target.value)}>
                        <option value="all">{t('all')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('incidentType')} value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
                        <option value="all">{t('all')}</option>
                        {incidentTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </Select>
                    <Select label={t('severity')} value={filters.severity} onChange={e => handleFilterChange('severity', e.target.value)}>
                        <option value="all">{t('all')}</option>
                         {incidentSeverities.map(is => <option key={is.id} value={is.id}>{is.name}</option>)}
                    </Select>
                    <Select label={t('status')} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                        <option value="all">{t('all')}</option>
                        {Object.values(IncidentStatus).map(s => <option key={s} value={s}>{t(`status_${s}` as any)}</option>)}
                    </Select>
                    <Button variant="secondary" onClick={clearFilters} className="h-[42px] w-full">{t('clearFilters')}</Button>
                </div>
            </Card>

             <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <SortableHeader sortKey="date" label={t('date')} />
                                <SortableHeader sortKey="siteName" label={t('site')} />
                                <SortableHeader sortKey="type" label={t('incidentType')} />
                                <SortableHeader sortKey="severity" label={t('severity')} />
                                <SortableHeader sortKey="reportedByName" label={t('reportedBy')} />
                                <SortableHeader sortKey="status" label={t('status')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedIncidents.map(incident => (
                                <tr key={incident.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3">{incident.date}</td>
                                    <td className="p-3">{siteMap.get(incident.siteId) || t('unknown')}</td>
                                    <td className="p-3">{typeMap.get(incident.type) || incident.type}</td>
                                    <td className="p-3"><StatusBadge status={incident.severity} /></td>
                                    <td className="p-3">{employeeMap.get(incident.reportedById) || t('unknown')}</td>
                                    <td className="p-3"><StatusBadge status={incident.status} /></td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => handleOpenModal(incident)}><Icon name="Edit2" className="w-4 h-4" /></Button>
                                            <Button variant="danger" onClick={() => handleDeleteClick(incident.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {filteredAndSortedIncidents.length === 0 && (
                                <tr><td colSpan={7} className="p-6 text-center text-gray-500">{t('noIncidents')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isFormModalOpen && (
                <IncidentFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    incident={editingIncident}
                />
            )}

            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteIncident')}
                />
            )}
        </div>
    );
};

interface IncidentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    incident: Incident | null;
}

const IncidentFormModal: React.FC<IncidentFormModalProps> = ({ isOpen, onClose, incident }) => {
    const { t, language } = useLocalization();
    const { sites, employees, incidentTypes, incidentSeverities, modules, addIncident, updateIncident } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        siteId: sites[0]?.id || '',
        type: incidentTypes.find(it => !it.isDefault && it.id !== 'OTHER')?.id || 'PEST_DISEASE',
        severity: 'LOW',
        affectedModuleIds: [] as string[],
        reportedById: employees[0]?.id || '',
        description: '',
        status: IncidentStatus.OPEN,
        resolutionNotes: '',
        resolvedDate: '',
    });
    
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (incident) {
            setFormData({
                date: incident.date,
                siteId: incident.siteId,
                type: incident.type,
                severity: incident.severity,
                affectedModuleIds: incident.affectedModuleIds,
                reportedById: incident.reportedById,
                description: incident.description,
                status: incident.status,
                resolutionNotes: incident.resolutionNotes || '',
                resolvedDate: incident.resolvedDate || '',
            });
        } else {
            setFormData(prev => ({
                 ...prev,
                 siteId: sites[0]?.id || '',
                 reportedById: employees[0]?.id || '',
                 type: incidentTypes[0]?.id || 'PEST_DISEASE'
            }));
        }
        setImagePreview(null);
        setAiSuggestions(null);
        setErrors({});
    }, [incident, isOpen, sites, employees, incidentTypes]);

    const availableModules = useMemo(() => modules.filter(m => m.siteId === formData.siteId), [modules, formData.siteId]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.siteId) newErrors.siteId = t('validationRequired');
        if (!formData.type) newErrors.type = t('validationRequired');
        if (!formData.reportedById) newErrors.reportedById = t('validationRequired');
        if (!formData.description.trim()) newErrors.description = t('validationRequired');
        
        if (formData.status === IncidentStatus.RESOLVED || formData.status === IncidentStatus.CLOSED) {
            if (!formData.resolvedDate) newErrors.resolvedDate = t('validationRequired');
            if (!formData.resolutionNotes.trim()) newErrors.resolutionNotes = t('validationRequired');
        }

        return newErrors;
    }, [formData, t]);
    
    useEffect(() => { setErrors(validate()) }, [formData, validate]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleModuleToggle = (moduleId: string) => {
        setFormData(prev => {
            const newIds = prev.affectedModuleIds.includes(moduleId)
                ? prev.affectedModuleIds.filter(id => id !== moduleId)
                : [...prev.affectedModuleIds, moduleId];
            return { ...prev, affectedModuleIds: newIds };
        });
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                handleAnalyzeImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyzeText = async () => {
        if (!formData.description) return;
        setIsAnalyzing(true);
        try {
            const suggestions = await analyzeIncidentDescription(
                formData.description,
                availableModules.map(m => m.code),
                incidentTypes,
                incidentSeverities,
                language as 'en' | 'fr'
            );
            setAiSuggestions(suggestions);
            
            // Apply suggestions
            if (suggestions.suggestedType) setFormData(prev => ({ ...prev, type: suggestions.suggestedType }));
            if (suggestions.suggestedSeverity) setFormData(prev => ({ ...prev, severity: suggestions.suggestedSeverity }));
             if (suggestions.suggestedModuleCodes && suggestions.suggestedModuleCodes.length > 0) {
                const ids = availableModules.filter(m => suggestions.suggestedModuleCodes.includes(m.code)).map(m => m.id);
                setFormData(prev => ({ ...prev, affectedModuleIds: [...new Set([...prev.affectedModuleIds, ...ids])] }));
            }

        } catch (e) {
            console.error("AI Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleAnalyzeImage = async (base64Image: string) => {
        setIsAnalyzing(true);
        try {
             const result = await analyzeImageForPest(base64Image, language as 'en'|'fr');
             if (result) {
                 setAiSuggestions({
                     ...aiSuggestions,
                     imageAnalysis: result
                 });
                 // Auto-fill based on image analysis if possible
                 if (result.type === 'PEST_DISEASE') {
                     const pestType = incidentTypes.find(it => it.id === 'PEST_DISEASE');
                     if (pestType) setFormData(prev => ({ ...prev, type: pestType.id }));
                 }
                 if (result.severity) {
                     // Map AI severity string to our IDs if matches
                     const sev = incidentSeverities.find(s => s.id === result.severity.toUpperCase());
                     if (sev) setFormData(prev => ({ ...prev, severity: sev.id }));
                 }
                 if (result.description) {
                     setFormData(prev => ({ ...prev, description: (prev.description ? prev.description + '\n\n' : '') + `[AI Analysis]: ${result.description}` }));
                 }
             }
        } catch (e) {
             console.error("Image Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        const dataToSave = {
             ...formData,
             resolutionNotes: formData.resolutionNotes || undefined,
             resolvedDate: formData.resolvedDate || undefined,
        };

        if (incident) {
            updateIncident({ ...incident, ...dataToSave });
        } else {
            addIncident(dataToSave);
        }
        onClose();
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={incident ? t('editIncident') : t('reportIncident')} widthClass="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('date')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} required />
                    <Select label={t('site')} value={formData.siteId} onChange={e => handleChange('siteId', e.target.value)} error={errors.siteId} required>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('incidentType')} value={formData.type} onChange={e => handleChange('type', e.target.value)} error={errors.type} required>
                        {incidentTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </Select>
                    <Select label={t('severity')} value={formData.severity} onChange={e => handleChange('severity', e.target.value)} required>
                        {incidentSeverities.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label={t('reportedBy')} value={formData.reportedById} onChange={e => handleChange('reportedById', e.target.value)} error={errors.reportedById} required>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </Select>
                    <Select label={t('status')} value={formData.status} onChange={e => handleChange('status', e.target.value as IncidentStatus)} required>
                        {Object.values(IncidentStatus).map(s => <option key={s} value={s}>{t(`status_${s}` as any)}</option>)}
                    </Select>
                </div>

                <div className="border p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <label className="block text-sm font-medium mb-2">{t('description')}</label>
                    <div className="flex gap-2 mb-2">
                        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="text-xs">
                            <Icon name="Image" className="w-4 h-4 mr-1" /> {t('uploadPhoto')}
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        <Button type="button" variant="ghost" onClick={handleAnalyzeText} disabled={isAnalyzing || !formData.description} className="text-xs">
                            <Icon name="Bot" className="w-4 h-4 mr-1" /> {t('analyzeWithAI')}
                        </Button>
                    </div>
                    
                    {imagePreview && (
                        <div className="mb-2">
                            <img src={imagePreview} alt="Preview" className="h-32 w-auto object-cover rounded border" />
                        </div>
                    )}

                    <textarea 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                    />
                     {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
                    
                    {isAnalyzing && <p className="text-xs text-blue-600 mt-1 animate-pulse">{t('analyzingSatellite')}...</p>}

                    {aiSuggestions && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                            <h4 className="font-bold flex items-center gap-1 text-blue-800 dark:text-blue-200"><Icon name="Bot" className="w-4 h-4"/> {t('aiSuggestions')}</h4>
                            {aiSuggestions.imageAnalysis && (
                                <div className="mt-1">
                                    <p className="font-semibold">{t('suggestedType')}: {aiSuggestions.imageAnalysis.type}</p>
                                    <p>{aiSuggestions.imageAnalysis.description}</p>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400"><strong>{t('suggestedTreatment')}:</strong> {aiSuggestions.imageAnalysis.treatments}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                     <label className="block text-sm font-medium mb-2">{t('affectedModules')}</label>
                     <div className="max-h-32 overflow-y-auto border rounded p-2 grid grid-cols-3 gap-2">
                         {availableModules.map(m => (
                             <label key={m.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                 <Checkbox checked={formData.affectedModuleIds.includes(m.id)} onChange={() => handleModuleToggle(m.id)} />
                                 <span>{m.code}</span>
                             </label>
                         ))}
                         {availableModules.length === 0 && <p className="text-gray-500 text-sm col-span-3 text-center">Select a site to view modules</p>}
                     </div>
                </div>

                {(formData.status === IncidentStatus.RESOLVED || formData.status === IncidentStatus.CLOSED) && (
                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold mb-3">{t('status_RESOLVED')}</h4>
                        <div className="grid grid-cols-1 gap-4">
                             <Input label={t('resolvedDate')} type="date" value={formData.resolvedDate} onChange={e => handleChange('resolvedDate', e.target.value)} error={errors.resolvedDate} required />
                             <textarea 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                rows={3}
                                value={formData.resolutionNotes}
                                onChange={e => handleChange('resolutionNotes', e.target.value)}
                                placeholder={t('resolutionNotes')}
                            />
                            {errors.resolutionNotes && <p className="text-xs text-red-600">{errors.resolutionNotes}</p>}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default IncidentManagement;
