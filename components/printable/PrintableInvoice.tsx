import React from 'react';
import PrintPage from './PrintPage';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { numberToWords } from '../../utils/numberToWords';
import type { ExportDocument } from '../../types';

interface PrintableInvoiceProps {
    doc: ExportDocument;
}

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ doc }) => {
    const { settings } = useSettings();
    const { t, language } = useLocalization();
    const { seaweedTypes } = useData();

    const seaweedType = seaweedTypes.find(st => st.id === doc.seaweedTypeId);

    const totalBales = doc.containers.reduce((sum, c) => sum + c.packagesCount, 0);
    const totalNetWeight = doc.containers.reduce((sum, c) => sum + c.seaweedWeightKg, 0);
    const totalValue = doc.containers.reduce((sum, c) => sum + c.value, 0);
    
    // Determine currency symbol based on doc currency code
    const currencySymbol = doc.currency === 'EUR' ? '€' : (doc.currency === 'USD' ? '$' : doc.currency);

    const totalInWords = numberToWords(totalValue, language as 'en' | 'fr', { currency: doc.currency, monetaryDecimals: 2 });

    const formattedDate = new Date(doc.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB');

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
                    <h2 className="text-3xl font-bold uppercase">{t('COMMERCIAL_INVOICE')} N° {doc.invoiceNo}</h2>
                    <div className="mt-4 space-y-1">
                        {doc.rexReference && <p>{t('rexReference')}: {doc.rexReference}</p>}
                        <p>{t('domiciliationNo')} N° {doc.domiciliationNo}</p>
                        <p>{t('dateLabel')} {formattedDate}</p>
                    </div>
                </div>
            </header>

            <section className="mb-8">
                <table className="w-full text-sm">
                    <tbody>
                        <tr>
                            <td className="w-1/2 align-top pr-4">
                                <p className="font-bold uppercase text-gray-500 mb-1">{t('debtor')}</p>
                                <div className="border p-2 min-h-[100px]">
                                    <p className="font-bold text-base">{doc.debtor}</p>
                                    {doc.debtorAddress && <p className="whitespace-pre-wrap">{doc.debtorAddress}</p>}
                                    {(doc.debtorPhone || doc.debtorEmail) && (
                                        <p className="mt-2 text-xs text-gray-600">
                                            {doc.debtorPhone && <span>Tel: {doc.debtorPhone} </span>}
                                            {doc.debtorEmail && <span>Email: {doc.debtorEmail}</span>}
                                        </p>
                                    )}
                                </div>
                            </td>
                            <td className="w-1/2 align-top pl-4">
                                <p className="font-bold uppercase text-gray-500 mb-1">{t('notifyParty')}</p>
                                <div className="border p-2 min-h-[100px]">
                                    <p className="font-bold text-base">{doc.notifyParty}</p>
                                    {doc.notifyPartyAddress ? (
                                        <p className="whitespace-pre-wrap">{doc.notifyPartyAddress}</p>
                                    ) : (
                                        <p>{doc.city}, {doc.destinationCountry}</p>
                                    )}
                                    {(doc.notifyPartyPhone || doc.notifyPartyEmail) && (
                                        <p className="mt-2 text-xs text-gray-600">
                                            {doc.notifyPartyPhone && <span>Tel: {doc.notifyPartyPhone} </span>}
                                            {doc.notifyPartyEmail && <span>Email: {doc.notifyPartyEmail}</span>}
                                        </p>
                                    )}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                 <p className="text-sm mt-4"><span className="font-bold">{t('orderRef')}:</span> {doc.poNo}</p>
            </section>

            <section>
                <table className="w-full border-collapse border border-black text-sm text-black">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1">{t('description')}</th>
                            <th className="border border-black p-1">{t('packages')}</th>
                            <th className="border border-black p-1">{t('netWeight')} (Kg)</th>
                            <th className="border border-black p-1">{t('unitPrice')} ({doc.currency})</th>
                            <th className="border border-black p-1">{t('amount')} ({doc.currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 h-32 align-top">
                                <p>{doc.nature}</p>
                                <p>Incoterm: {doc.incoterms}</p>
                                <p>HS Code: {doc.customsNomenclature}</p>
                                <p>Country of Origin: {doc.countryOfOrigin}</p>
                            </td>
                            <td className="border border-black p-1 align-top text-center">{totalBales}</td>
                            <td className="border border-black p-1 align-top text-right">{formatNumber(totalNetWeight, settings.localization)}</td>
                            <td className="border border-black p-1 align-top text-right">{formatCurrency(doc.containers[0]?.unitPrice || 0, { ...settings.localization, currencySymbol: '' })}</td>
                            <td className="border border-black p-1 align-top text-right">{formatCurrency(totalValue, { ...settings.localization, currencySymbol: '' })}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="font-bold">
                            <td colSpan={3} className="border border-black p-1">{t('totalExclTax')}</td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(totalValue, { ...settings.localization, currencySymbol })}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            <section className="mt-4 text-sm">
                <p><span className="font-bold">{t('amountInWords')}:</span> {totalInWords}</p>
            </section>

            <section className="mt-8 text-xs space-y-1">
                <p><span className="font-bold">{t('paymentTerms')}:</span> {doc.paymentTerms}</p>
                <p><span className="font-bold">{t('bankDetails')}:</span></p>
                <p className="pl-4">{settings.company.name}</p>
                <p className="pl-4">SWIFT: {doc.swiftBank}</p>
            </section>
            
            <footer className="mt-16 text-right">
                <div className="inline-block text-center">
                    <p className="mb-12">{t('theManager')}</p>
                    <hr className="border-black"/>
                </div>
            </footer>
        </PrintPage>
    );
};

export default PrintableInvoice;