import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Card from './ui/Card';
import type { ExportDocument, ExportContainer, PressingSlip } from '../types';
import { ExportDocType, ContainerType, PressedStockMovementType } from '../types';
import { COUNTRIES, INCOTERMS, PAYMENT_TERMS } from '../constants';

interface ExportDocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: ExportDocument | null;
}

const ExportDocumentFormModal: React.FC<ExportDocumentFormModalProps> = ({ isOpen, onClose, doc }) => {
    const { t } = useLocalization();
    const { seaweedTypes, pressingSlips, addExportDocument, updateExportDocument, pressedStockMovements } = useData();

    const getInitialFormData = useCallback(() => ({
        docType: ExportDocType.COMMERCIAL_INVOICE,
        invoiceNo: '',
        date: new Date().toISOString().split('T')[0],
        seaweedTypeId: seaweedTypes[0]?.id || '',
        nature: '',
        poNo: '',
        domiciliationNo: '',
        destinationCountry: '',
        city: '',
        notifyParty: '',
        debtor: '',
        vessel: '',
        seaWaybill: '',
        voyageNo: '',
        currency: 'EUR' as 'EUR' | 'USD',
        localExchangeRate: '',
        pressingSlipIds: [] as string[],
        containers: [] as ExportContainer[],
        customsNomenclature: '12, 122, 100, 000',
        countryOfOrigin: COUNTRIES.find(c => c.code === 'MG')?.code || COUNTRIES[0]?.code || '',
        incoterms: INCOTERMS[0] || '',
        paymentTerms: PAYMENT_TERMS[0] || '',
        swiftBank: '',
        rexReference: '',
    }), [seaweedTypes]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [errors, setErrors] = useState<Record<string, any>>({});

    useEffect(() => {
        if (doc) {
            setFormData({
                ...getInitialFormData(),
                ...doc,
                localExchangeRate: String(doc.localExchangeRate),
                containers: doc.containers,
                rexReference: doc.rexReference || '',
            });
        } else {
            setFormData(getInitialFormData());
        }
    }, [doc, isOpen, getInitialFormData]);
    
    const availableSlips = useMemo(() => {
        return pressingSlips.filter(p => 
            p.seaweedTypeId === formData.seaweedTypeId &&
            (!p.exportDocId || p.exportDocId === doc?.id)
        );
    }, [pressingSlips, formData.seaweedTypeId, doc]);

    const selectedSlips = useMemo(() => {
        return pressingSlips.filter(p => formData.pressingSlipIds.includes(p.id));
    }, [pressingSlips, formData.pressingSlipIds]);

    const slipTotals = useMemo(() => {
        const totalWeightKg = selectedSlips.reduce((sum, slip) => sum + slip.producedWeightKg, 0);
        const totalBales = selectedSlips.reduce((sum, slip) => sum + slip.producedBalesCount, 0);
        return { totalWeightKg, totalBales };
    }, [selectedSlips]);

    const containerTotals = useMemo(() => {
        const totalWeightKg = formData.containers.reduce((sum, c) => sum + Number(c.seaweedWeightKg || 0), 0);
        const totalBales = formData.containers.reduce((sum, c) => sum + Number(c.packagesCount || 0), 0);
        return { totalWeightKg, totalBales };
    }, [formData.containers]);

     const validate = useCallback(() => {
        const newErrors: Record<string, any> = {};
        if (!formData.invoiceNo) newErrors.invoiceNo = t('validationRequired');
        if (!formData.date) newErrors.date = t('validationRequired');
        if (!formData.seaweedTypeId) newErrors.seaweedTypeId = t('validationRequired');
        if (!formData.nature) newErrors.nature = t('validationRequired');
        if (!formData.destinationCountry) newErrors.destinationCountry = t('validationRequired');
        if (!formData.localExchangeRate || isNaN(parseFloat(formData.localExchangeRate)) || parseFloat(formData.localExchangeRate) <= 0) {
            newErrors.localExchangeRate = t('validationPositiveNumber');
        }
        if (formData.pressingSlipIds.length === 0) newErrors.pressingSlipIds = t('validationRequired');
        if (formData.containers.length === 0) newErrors.containers = t('validationRequired');
        
        if (!formData.customsNomenclature) newErrors.customsNomenclature = t('validationRequired');
        if (!formData.countryOfOrigin) newErrors.countryOfOrigin = t('validationRequired');
        if (!formData.incoterms) newErrors.incoterms = t('validationRequired');
        if (!formData.paymentTerms) newErrors.paymentTerms = t('validationRequired');
        if (!formData.swiftBank) newErrors.swiftBank = t('validationRequired');


        // Container totals validation
        if (Math.abs(containerTotals.totalWeightKg - slipTotals.totalWeightKg) > 0.01) {
            newErrors.containers = t('validationContainerWeights');
        }
        if (containerTotals.totalBales !== slipTotals.totalBales) {
            // Only add this error if the other one isn't present to avoid clutter
            if (!newErrors.containers) newErrors.containers = t('validationContainerBales');
        }
        
        const containerErrors = formData.containers.map(c => {
            const err: Record<string, string> = {};
            if(!c.containerNo) err.containerNo = t('validationRequired');
            if(!c.sealNo) err.sealNo = t('validationRequired');
            return err;
        });
        if(containerErrors.some(e => Object.keys(e).length > 0)) newErrors.containerErrors = containerErrors;

        return newErrors;
    }, [formData, t, containerTotals, slipTotals]);
    
    useEffect(() => { setErrors(validate()) }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        const newFormData = { ...formData, [field]: value };
        if (field === 'seaweedTypeId') {
            newFormData.pressingSlipIds = [];
        }
        setFormData(newFormData);
    };

    const handleSlipToggle = (slipId: string) => {
        const newIds = formData.pressingSlipIds.includes(slipId)
            ? formData.pressingSlipIds.filter(id => id !== slipId)
            : [...formData.pressingSlipIds, slipId];
        setFormData(p => ({ ...p, pressingSlipIds: newIds }));
    };

    const handleContainerChange = (index: number, field: keyof Omit<ExportContainer, 'id'>, value: any) => {
        const newContainers = [...formData.containers];
        const container = { ...newContainers[index], [field]: value };
        
        const tare = Number(container.tareKg) || 0;
        const seaweed = Number(container.seaweedWeightKg) || 0;
        const packageWeight = Number(container.packageWeightKg) || 0;
        container.grossWeightKg = tare + seaweed + packageWeight;

        const price = Number(container.unitPrice) || 0;
        container.value = seaweed * price;

        newContainers[index] = container;
        setFormData(p => ({ ...p, containers: newContainers }));
    };

    const addContainer = () => {
        const newContainer: ExportContainer = {
            id: `new-container-${Date.now()}`,
            containerNo: '', sealNo: '', containerType: ContainerType.GP40, volumeM3: 0, tareKg: 0,
            packageWeightKg: 0,
            seaweedWeightKg: 0, packagesCount: 0, grossWeightKg: 0, unitPrice: 0, value: 0
        };
        setFormData(p => ({ ...p, containers: [...p.containers, newContainer] }));
    };

    const removeContainer = (index: number) => {
        setFormData(p => ({ ...p, containers: p.containers.filter((_, i) => i !== index) }));
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
            localExchangeRate: parseFloat(formData.localExchangeRate),
            containers: formData.containers.map(c => ({
                ...c,
                volumeM3: Number(c.volumeM3) || 0,
                tareKg: Number(c.tareKg) || 0,
                packageWeightKg: Number(c.packageWeightKg) || 0,
                seaweedWeightKg: Number(c.seaweedWeightKg) || 0,
                packagesCount: Number(c.packagesCount) || 0,
                grossWeightKg: Number(c.grossWeightKg) || 0,
                unitPrice: Number(c.unitPrice) || 0,
                value: Number(c.value) || 0,
            }))
        };
        
        const firstSlip = pressingSlips.find(p => p.id === dataToSave.pressingSlipIds[0]);
        
        if (!firstSlip) {
            alert(t('alert_noValidSlips'));
            return;
        }

        let sourceSiteId = firstSlip.sourceSiteId;

        if (!sourceSiteId) {
            // Fallback: Infer from latest bulk delivery of that seaweed type to the warehouse
            const latestBulkIn = pressedStockMovements
                .filter(m => m.type === PressedStockMovementType.BULK_IN_FROM_SITE && m.seaweedTypeId === firstSlip.seaweedTypeId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            sourceSiteId = latestBulkIn?.siteId;
        }

        if (!sourceSiteId) {
            console.error("Critical Error: Could not determine the origin site for the selected pressing slips.", firstSlip);
            alert(t('alert_cannotDetermineSourceSite'));
            return;
        }

        if (doc) {
            updateExportDocument({ ...doc, ...dataToSave });
        } else {
            addExportDocument(dataToSave, sourceSiteId);
        }
        onClose();
    };

    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal 
          isOpen={isOpen} 
          onClose={onClose} 
          title={doc ? t('editExportDocument') : t('createExportDocument')} 
          widthClass="max-w-7xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-130px)]">
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <Card title={t('documentDetails')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Select label={t('docType')} value={formData.docType} onChange={e => handleChange('docType', e.target.value)}>
                                {Object.values(ExportDocType).map(dt => <option key={dt} value={dt}>{t(dt as any)}</option>)}
                            </Select>
                            <Input label={t('invoiceNo')} value={formData.invoiceNo} onChange={e => handleChange('invoiceNo', e.target.value)} error={errors.invoiceNo} />
                            <Input label={t('date')} type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} error={errors.date} />
                            <Select label={t('seaweedType')} value={formData.seaweedTypeId} onChange={e => handleChange('seaweedTypeId', e.target.value)} error={errors.seaweedTypeId}>
                                {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                            </Select>
                            <Input containerClassName="lg:col-span-2" label={t('natureLabel')} value={formData.nature} onChange={e => handleChange('nature', e.target.value)} error={errors.nature} />
                            <Input label={t('poNo')} value={formData.poNo} onChange={e => handleChange('poNo', e.target.value)} />
                            <Input label={t('domiciliationNo')} value={formData.domiciliationNo} onChange={e => handleChange('domiciliationNo', e.target.value)} />
                            <Input label={t('rexReference')} value={formData.rexReference} onChange={e => handleChange('rexReference', e.target.value)} />
                            <Input label={t('destinationCountry')} value={formData.destinationCountry} onChange={e => handleChange('destinationCountry', e.target.value)} error={errors.destinationCountry} />
                            <Input label={t('city')} value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                            <Input label={t('notifyParty')} value={formData.notifyParty} onChange={e => handleChange('notifyParty', e.target.value)} />
                            <Input label={t('debtor')} value={formData.debtor} onChange={e => handleChange('debtor', e.target.value)} />
                            <Input label={t('vessel')} value={formData.vessel} onChange={e => handleChange('vessel', e.target.value)} />
                            <Input label={t('seaWaybill')} value={formData.seaWaybill} onChange={e => handleChange('seaWaybill', e.target.value)} />
                            <Input label={t('voyageNo')} value={formData.voyageNo} onChange={e => handleChange('voyageNo', e.target.value)} />
                            <Select label={t('currency')} value={formData.currency} onChange={e => handleChange('currency', e.target.value)}>
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                            </Select>
                            <Input label={t('localExchangeRate')} type="number" step="any" value={formData.localExchangeRate} onChange={e => handleChange('localExchangeRate', e.target.value)} error={errors.localExchangeRate} />
                            <Input label={t('customsNomenclature')} value={formData.customsNomenclature} onChange={e => handleChange('customsNomenclature', e.target.value)} error={errors.customsNomenclature} containerClassName="lg:col-span-2" />
                            <Select label={t('countryOfOrigin')} value={formData.countryOfOrigin} onChange={e => handleChange('countryOfOrigin', e.target.value)} error={errors.countryOfOrigin} containerClassName="lg:col-span-2">
                                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </Select>
                            <Select label={t('incoterms')} value={formData.incoterms} onChange={e => handleChange('incoterms', e.target.value)} error={errors.incoterms} containerClassName="lg:col-span-2">
                                {INCOTERMS.map(term => <option key={term} value={term}>{t(term)}</option>)}
                            </Select>
                            <Select label={t('paymentTerms')} value={formData.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)} error={errors.paymentTerms} containerClassName="lg:col-span-2">
                                {PAYMENT_TERMS.map(term => <option key={term} value={term}>{t(term)}</option>)}
                            </Select>
                            <Input label={t('swiftBank')} value={formData.swiftBank} onChange={e => handleChange('swiftBank', e.target.value)} error={errors.swiftBank} containerClassName="lg:col-span-4" />
                        </div>
                    </Card>

                    <Card title={t('selectPressingSlips')}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold mb-2">{t('availableSlips')}</h4>
                                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {availableSlips.filter(s => !formData.pressingSlipIds.includes(s.id)).map(slip => (
                                        <div key={slip.id} onClick={() => handleSlipToggle(slip.id)} className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer flex justify-between">
                                            <span>{slip.slipNo} ({slip.producedBalesCount} {t('bales')})</span>
                                            <Icon name="PlusCircle" className="w-5 h-5 text-green-500" />
                                        </div>
                                    ))}
                                    {availableSlips.length === 0 && <p className="text-sm text-gray-500 p-2">{t('noSlipsAvailable')}</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">{t('selectedSlips')}</h4>
                                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {selectedSlips.map(slip => (
                                        <div key={slip.id} onClick={() => handleSlipToggle(slip.id)} className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/30 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer flex justify-between">
                                            <span>{slip.slipNo} ({slip.producedBalesCount} {t('bales')})</span>
                                            <Icon name="X" className="w-5 h-5 text-red-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {errors.pressingSlipIds && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.pressingSlipIds}</p>}
                        <div className="grid grid-cols-2 gap-4 mt-2 font-semibold">
                            <div>{t('totalSelectedWeight')}: {slipTotals.totalWeightKg.toFixed(2)} kg</div>
                            <div>{t('totalSelectedBales')}: {slipTotals.totalBales}</div>
                        </div>
                    </Card>

                    <Card title={t('containerManagement')}>
                        <div className="space-y-4">
                            {formData.containers.map((container, index) => (
                                <div key={container.id || index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg relative">
                                    <Button type="button" variant="danger" onClick={() => removeContainer(index)} className="absolute top-2 right-2 p-1 !rounded-full h-8 w-8"><Icon name="Trash2" className="w-4 h-4" /></Button>
                                    <h5 className="font-semibold mb-3 text-lg">{t('container')} #{index + 1}</h5>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                                            <div className="space-y-4">
                                                <h6 className="font-semibold text-center text-gray-600 dark:text-gray-400">{t('identification')}</h6>
                                                <Input label={t('containerNo')} value={container.containerNo} onChange={e => handleContainerChange(index, 'containerNo', e.target.value)} error={errors.containerErrors?.[index]?.containerNo}/>
                                                <Input label={t('sealNo')} value={container.sealNo} onChange={e => handleContainerChange(index, 'sealNo', e.target.value)} error={errors.containerErrors?.[index]?.sealNo}/>
                                                <Select label={t('containerType')} value={container.containerType} onChange={e => handleContainerChange(index, 'containerType', e.target.value)}>
                                                    {Object.values(ContainerType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                                </Select>
                                                <Input label={t('volumeM3')} type="number" value={container.volumeM3} onChange={e => handleContainerChange(index, 'volumeM3', e.target.value)} />
                                            </div>
                                            <div className="space-y-4">
                                                <h6 className="font-semibold text-center text-gray-600 dark:text-gray-400">{t('weights')}</h6>
                                                <Input label={t('tareKg')} type="number" value={container.tareKg} onChange={e => handleContainerChange(index, 'tareKg', e.target.value)} />
                                                <Input label={t('packageWeightKg')} type="number" value={container.packageWeightKg || ''} onChange={e => handleContainerChange(index, 'packageWeightKg', e.target.value)} />
                                                <Input label={t('seaweedWeightKg')} type="number" value={container.seaweedWeightKg} onChange={e => handleContainerChange(index, 'seaweedWeightKg', e.target.value)} />
                                                <Input label={t('grossWeightKg')} type="number" value={container.grossWeightKg} disabled />
                                            </div>
                                            <div className="space-y-4">
                                                <h6 className="font-semibold text-center text-gray-600 dark:text-gray-400">{t('contentsAndValue')}</h6>
                                                <Input label={t('packagesCount')} type="number" value={container.packagesCount} onChange={e => handleContainerChange(index, 'packagesCount', e.target.value)} />
                                                <Input label={t('unitPrice')} type="number" step="any" value={container.unitPrice} onChange={e => handleContainerChange(index, 'unitPrice', e.target.value)} />
                                                <Input label={t('value')} type="number" value={container.value} disabled />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors.containers && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.containers}</p>}
                        <div className="grid grid-cols-2 gap-4 mt-2 font-semibold">
                            <div>{t('totalContainerWeight')}: {containerTotals.totalWeightKg.toFixed(2)} kg</div>
                            <div>{t('totalContainerBales')}: {containerTotals.totalBales}</div>
                        </div>
                        <Button type="button" variant="secondary" onClick={addContainer} className="mt-4"><Icon name="PlusCircle" className="w-5 h-5"/>{t('addContainer')}</Button>
                    </Card>
                </div>
                <footer className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </footer>
            </form>
        </Modal>
    );
};

export default ExportDocumentFormModal;