import React from 'react';
import PrintPage from './PrintPage';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { formatNumber } from '../../utils/formatters';
import type { ExportDocument } from '../../types';
import { COUNTRIES } from '../../constants';

interface PrintableCertOfOriginProps {
    doc: ExportDocument;
}

const PrintableCertOfOrigin: React.FC<PrintableCertOfOriginProps> = ({ doc }) => {
    const { settings } = useSettings();
    const { t } = useLocalization();

    const totalBales = doc.containers.reduce((sum, c) => sum + c.packagesCount, 0);
    const totalNetWeight = doc.containers.reduce((sum, c) => sum + c.seaweedWeightKg, 0);
    const totalGrossWeight = doc.containers.reduce((sum, c) => sum + c.grossWeightKg, 0);

    const countryOfOriginName = COUNTRIES.find(c => c.code === doc.countryOfOrigin)?.name || doc.countryOfOrigin;
    const destinationCountryName = COUNTRIES.find(c => c.name.toLowerCase() === doc.destinationCountry.toLowerCase())?.name || doc.destinationCountry;


    return (
        <PrintPage>
            <div className="border-2 border-black p-4">
                <header className="text-center mb-6">
                    <h1 className="text-2xl font-bold uppercase">{t('CERTIFICATE_OF_ORIGIN')}</h1>
                </header>

                <table className="w-full border-collapse text-xs text-black">
                    <tbody>
                        <tr>
                            <td className="p-2 border border-black w-1/2">
                                <p className="font-bold">1. {t('exporter')}</p>
                                <p className="pl-4">{settings.company.name}</p>
                                <p className="pl-4">{settings.company.address}</p>
                            </td>
                            <td className="p-2 border border-black w-1/2" rowSpan={2}>
                                <p className="font-bold text-center">{t('CERTIFICATE_OF_ORIGIN').toUpperCase()}</p>
                                <p className="text-center">{t('refNo')} {doc.docNo}</p>
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-black w-1/2">
                                <p className="font-bold">2. {t('consignee')}</p>
                                <p className="pl-4 font-semibold">{doc.notifyParty}</p>
                                {doc.notifyPartyAddress ? (
                                    <p className="pl-4 whitespace-pre-wrap">{doc.notifyPartyAddress}</p>
                                ) : (
                                    <p className="pl-4">{doc.city}, {destinationCountryName}</p>
                                )}
                                {(doc.notifyPartyPhone || doc.notifyPartyEmail) && (
                                    <p className="pl-4 mt-1 text-xs">
                                        {doc.notifyPartyPhone && <span>Tel: {doc.notifyPartyPhone} </span>}
                                        {doc.notifyPartyEmail && <span>Email: {doc.notifyPartyEmail}</span>}
                                    </p>
                                )}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="p-2 border border-black">
                                <p className="font-bold">3. {t('transportDetails')}</p>
                                <p className="pl-4">{t('vessel')}: {doc.vessel} / {t('voyageNo')}: {doc.voyageNo}</p>
                                <p className="pl-4">{t('seaWaybill')}: {doc.seaWaybill}</p>
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-black font-bold align-top">4. {t('marksAndNumbers')}</td>
                            <td className="p-2 border border-black font-bold align-top">5. {t('packagesAndDescription')}</td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-black align-top h-24">
                                {doc.containers.map(c => <p key={c.id}>{c.containerNo}</p>)}
                            </td>
                            <td className="p-2 border border-black align-top h-24">
                                <p>{totalBales} {t('bales')}</p>
                                <p>{doc.nature}</p>
                                <p>HS Code: {doc.customsNomenclature}</p>
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-black font-bold align-top">6. {t('originCriterion')}</td>
                            <td className="p-2 border border-black font-bold align-top">7. {t('quantity')}</td>
                        </tr>
                         <tr>
                            <td className="p-2 border border-black align-top h-16">{t('originCriterionA')}</td>
                            <td className="p-2 border border-black align-top h-16">
                                <p>{t('netWeightLabel')}: {formatNumber(totalNetWeight, settings.localization)} KGS</p>
                                <p>{t('grossWeightLabel')}: {formatNumber(totalGrossWeight, settings.localization)} KGS</p>
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-black font-bold align-top">8. {t('invoiceNumberAndDate')}</td>
                            <td className="p-2 border border-black font-bold align-top">9. {t('remarks')}</td>
                        </tr>
                         <tr>
                            <td className="p-2 border border-black align-top h-12">{doc.invoiceNo} / {doc.date}</td>
                            <td className="p-2 border border-black align-top h-12"></td>
                        </tr>
                        <tr>
                            <td className="p-2 border border-black align-top h-32">
                                <p className="font-bold">10. {t('declarationByExporter')}</p>
                                <p className="mt-1">{t('exporterDeclarationText')}</p>
                                <p className="font-bold text-center mt-2">{countryOfOriginName}</p>
                                <div className="mt-8 text-right">
                                    <p className="border-t border-black pt-1 inline-block">{t('placeDateSignature')}</p>
                                </div>
                            </td>
                            <td className="p-2 border border-black align-top h-32">
                                 <p className="font-bold">11. {t('certification')}</p>
                                 <p className="mt-1">{t('certificationText')}</p>
                                  <div className="mt-16 text-right">
                                    <p className="border-t border-black pt-1 inline-block">{t('placeDateSignature')}</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </PrintPage>
    );
};

export default PrintableCertOfOrigin;