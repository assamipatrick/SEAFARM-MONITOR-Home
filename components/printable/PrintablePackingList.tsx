

import React from 'react';
import PrintPage from './PrintPage';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import { formatNumber } from '../../utils/formatters';
import type { ExportDocument } from '../../types';
import { COUNTRIES } from '../../constants';

interface PrintablePackingListProps {
    doc: ExportDocument;
}

const PrintablePackingList: React.FC<PrintablePackingListProps> = ({ doc }) => {
    const { settings } = useSettings();
    const { t, language } = useLocalization();
    const { seaweedTypes } = useData();

    const seaweedType = seaweedTypes.find(st => st.id === doc.seaweedTypeId);
    
    const totalBales = doc.containers.reduce((sum, c) => sum + c.packagesCount, 0);
    const totalNetWeight = doc.containers.reduce((sum, c) => sum + c.seaweedWeightKg, 0);
    const totalGrossWeight = doc.containers.reduce((sum, c) => sum + c.grossWeightKg, 0);

    const formattedDate = new Date(doc.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB');
    const destinationCountryName = COUNTRIES.find(c => c.name.toLowerCase() === doc.destinationCountry.toLowerCase())?.name || doc.destinationCountry;


    return (
        <PrintPage>
            <header className="flex justify-between items-start mb-8">
                <div>
                    <img src={settings.company.logoUrl} alt="Company Logo" className="h-20 mb-2" />
                    <h1 className="font-bold text-lg">{settings.company.name}</h1>
                    <p className="text-xs">{settings.company.address}</p>
                    <p className="text-xs">NIF: {settings.company.nif} / STAT: {settings.company.stat} / RC: {settings.company.rc}</p>
                    <p className="text-xs">Tel: {settings.company.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase">{t('packingAndWeightList')}</h2>
                    <p className="mt-2">{t('invoiceNoLabel')}: {doc.invoiceNo}</p>
                    <p className="mt-1">{t('dateLabel')}: {formattedDate}</p>
                </div>
            </header>

            <section className="text-sm mb-8 space-y-4">
                <div className="grid grid-cols-5">
                    <strong className="col-span-1">{t('senderLabel')}:</strong>
                    <span className="col-span-4">{settings.company.name} / PC {doc.debtor}</span>
                </div>
                <div className="grid grid-cols-5">
                    <strong className="col-span-1">{t('recipientLabel')}:</strong>
                    <div className="col-span-4">
                        <p>{doc.notifyParty}</p>
                        <p>{doc.city}, {destinationCountryName}</p>
                    </div>
                </div>
                 <div className="grid grid-cols-5">
                    <strong className="col-span-1">{t('natureLabel')}:</strong>
                    <span className="col-span-4">{doc.nature}</span>
                </div>
                 <div className="grid grid-cols-5">
                    <strong className="col-span-1">{t('packageCountLabel')}:</strong>
                    <span className="col-span-4">{totalBales} {t('bales')}</span>
                </div>
                <div className="grid grid-cols-5">
                    <strong className="col-span-1">{t('grossWeightLabel')}:</strong>
                    <span className="col-span-4">{formatNumber(totalGrossWeight, settings.localization)} Kg</span>
                </div>
                <div className="grid grid-cols-5">
                    <strong className="col-span-1">{t('netWeightLabel')}:</strong>
                    <span className="col-span-4">{formatNumber(totalNetWeight, settings.localization)} Kg</span>
                </div>
            </section>

            <table className="w-full border-collapse border border-black text-sm mb-8 text-black">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1">{t('containerNo')}</th>
                        <th className="border border-black p-1">{t('sealNo')}</th>
                        <th className="border border-black p-1">{t('tareKg')}</th>
                        <th className="border border-black p-1">{t('packageWeightKg')}</th>
                        <th className="border border-black p-1">{t('seaweedType')}</th>
                        <th className="border border-black p-1">{t('netWeightLabel')}</th>
                        <th className="border border-black p-1">{t('packages')}</th>
                        <th className="border border-black p-1">{t('grossWeightLabel')}</th>
                    </tr>
                </thead>
                <tbody>
                    {doc.containers.map((container) => (
                        <tr key={container.id}>
                            <td className="border border-black p-1">{container.containerNo}</td>
                            <td className="border border-black p-1">{container.sealNo}</td>
                            <td className="border border-black p-1 text-right">{formatNumber(container.tareKg, settings.localization)} Kg</td>
                            <td className="border border-black p-1 text-right">{formatNumber(container.packageWeightKg || 0, settings.localization)} Kg</td>
                            <td className="border border-black p-1">{seaweedType?.name}</td>
                            <td className="border border-black p-1 text-right">{formatNumber(container.seaweedWeightKg, settings.localization)} Kg</td>
                            <td className="border border-black p-1 text-right">{container.packagesCount} {t('bales')}</td>
                            <td className="border border-black p-1 text-right">{formatNumber(container.grossWeightKg, settings.localization)} Kg</td>
                        </tr>
                    ))}
                    <tr className="font-bold bg-gray-100">
                        <td colSpan={5} className="border border-black p-1"></td>
                        <td className="border border-black p-1 text-right">{formatNumber(totalNetWeight, settings.localization)} Kg</td>
                        <td className="border border-black p-1 text-right">{totalBales} {t('bales')}</td>
                        <td className="border border-black p-1 text-right">{formatNumber(totalGrossWeight, settings.localization)} Kg</td>
                    </tr>
                </tbody>
            </table>

            <p className="text-sm mb-16">{t('customsWeighingStatement')}</p>
            
            <p className="text-sm mb-8 text-center">{t('signedAtLocation').replace('{location}', 'Antsiranana').replace('{date}', formattedDate)}</p>

            <footer className="mt-16 text-right">
                <div className="inline-block text-center">
                    <p className="mb-16">{t('theManager')}</p>
                    <hr className="border-black"/>
                    <p className="text-sm">{t('perProcurationem')} {settings.company.name}</p>
                </div>
            </footer>
        </PrintPage>
    );
};

export default PrintablePackingList;