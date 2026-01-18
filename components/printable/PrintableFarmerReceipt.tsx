
import React, { useMemo } from 'react';
import PrintPage from './PrintPage';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import type { MonthlyPayment, Farmer } from '../../types';
import { COUNTRIES } from '../../constants';

export interface ReceiptData {
    payment: MonthlyPayment;
    farmer: Farmer;
    siteName: string;
    grossDetails: {
        description: string;
        weight?: number;
        unitPrice?: number;
        amount: number;
    }[];
    deductions: {
        description: string;
        amount: number;
    }[];
    totalGross: number;
    totalDeductions: number;
    netPaid: number;
}

interface PrintableFarmerReceiptProps {
    data: ReceiptData;
}

const PrintableFarmerReceipt: React.FC<PrintableFarmerReceiptProps> = ({ data }) => {
    const { settings } = useSettings();
    const { t, language } = useLocalization();

    const countryName = useMemo(() => {
        return COUNTRIES.find(c => c.code === settings.localization.country)?.name || settings.localization.country;
    }, [settings.localization.country]);

    const formattedDate = new Date(data.payment.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB');
    
    // Format receipt ID to be cleaner (PAY-XXX) derived from hash or timestamp, avoiding raw ID.
    // Assuming payment.id is like "pay-timestamp" or uuid. We extract a functional suffix.
    const receiptNo = data.payment.id.includes('pay-') 
        ? `PAY-${data.payment.id.split('-').pop()?.substring(0, 6).toUpperCase()}`
        : `PAY-${data.payment.id.substring(0, 8).toUpperCase()}`;

    return (
        <PrintPage>
            <div className="max-w-xl mx-auto border border-gray-400 p-6 bg-white">
                <header className="flex justify-between items-start mb-6 border-b pb-4">
                    <div>
                        <img src={settings.company.logoUrl} alt="Logo" className="h-12 mb-2 object-contain" />
                        <h1 className="font-bold text-sm uppercase">{settings.company.name}</h1>
                        <p className="text-[10px] text-gray-600">{settings.company.address}</p>
                        <p className="text-[10px] text-gray-600">{t('phone')}: {settings.company.phone}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold uppercase">{t('payslip')}</h2>
                        <p className="text-xs text-gray-500">{t('receiptNo')}: {receiptNo}</p>
                        <p className="text-xs text-gray-500">{t('dateLabel')}: {formattedDate}</p>
                    </div>
                </header>

                <section className="mb-6 bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-xs text-gray-500 uppercase">{t('farmer')}</span>
                            <span className="font-bold">{data.farmer.firstName} {data.farmer.lastName}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 uppercase">{t('code')}</span>
                            <span className="font-mono">{data.farmer.code}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 uppercase">{t('site')}</span>
                            <span>{data.siteName}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 uppercase">{t('period')}</span>
                            <span>{data.payment.period}</span>
                        </div>
                    </div>
                </section>

                <section className="mb-6">
                    <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2 pb-1">{t('paymentDetails')}</h3>
                    <table className="w-full text-xs mb-4">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-1">{t('description')}</th>
                                <th className="text-right py-1">{t('weightKg')}</th>
                                <th className="text-right py-1">{t('unitPrice')}</th>
                                <th className="text-right py-1">{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.grossDetails.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                    <td className="py-1">{item.description}</td>
                                    <td className="text-right py-1">{item.weight ? formatNumber(item.weight, settings.localization) : '-'}</td>
                                    <td className="text-right py-1">{item.unitPrice ? formatCurrency(item.unitPrice, settings.localization) : '-'}</td>
                                    <td className="text-right py-1">{formatCurrency(item.amount, settings.localization)}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                                <td colSpan={3} className="py-2 text-right">{t('grossAmount')}</td>
                                <td className="py-2 text-right">{formatCurrency(data.totalGross, settings.localization)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {data.deductions.length > 0 && (
                        <>
                            <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2 pb-1 text-red-600">{t('deductions')}</h3>
                            <table className="w-full text-xs mb-4">
                                <tbody>
                                    {data.deductions.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-100 text-red-600">
                                            <td className="py-1">{item.description}</td>
                                            <td className="text-right py-1">-{formatCurrency(item.amount, settings.localization)}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-bold bg-red-50 text-red-700">
                                        <td className="py-2 text-right">{t('totalDeductions')}</td>
                                        <td className="py-2 text-right">-{formatCurrency(data.totalDeductions, settings.localization)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    )}
                </section>

                <section className="mb-8 bg-blue-50 p-4 rounded border border-blue-200 flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-900 uppercase">{t('netPaid')}</span>
                    <span className="text-2xl font-bold text-blue-900">{formatCurrency(data.netPaid, settings.localization)}</span>
                </section>

                <section className="mb-8 text-xs text-gray-600">
                    <p><span className="font-bold">{t('paymentMethod')}:</span> {t(`paymentMethod_${data.payment.method}` as any)}</p>
                    {data.payment.method === 'mobile_money' && (
                        <>
                            <p><span className="font-bold">{t('mobileMoneyRef')}:</span> {data.payment.transactionId || 'N/A'}</p>
                            <p><span className="font-bold">{t('phone')}:</span> {data.payment.phoneNumber}</p>
                        </>
                    )}
                    {data.payment.notes && <p><span className="font-bold">{t('notes')}:</span> {data.payment.notes}</p>}
                </section>

                <footer className="flex justify-between text-xs mt-12 pt-4 border-t border-gray-300">
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-8">{t('paidBy')}</p>
                        <p>{settings.company.name}</p>
                    </div>
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-8">{t('receivedBy')}</p>
                        <p>{data.farmer.firstName} {data.farmer.lastName}</p>
                    </div>
                </footer>
            </div>
        </PrintPage>
    );
};

export default PrintableFarmerReceipt;
