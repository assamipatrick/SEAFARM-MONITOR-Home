
import React, { useMemo, useRef, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber } from '../../utils/formatters';

declare const Chart: any;

interface StockHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    siteId: string;
    siteName: string;
    seaweedTypeId: string;
    seaweedTypeName: string;
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ 
    isOpen, onClose, siteId, siteName, seaweedTypeId, seaweedTypeName 
}) => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { stockMovements } = useData();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    // Filter, Sort, and Calculate Running Balance
    const historyData = useMemo(() => {
        const relevantMovements = stockMovements
            .filter(m => m.siteId === siteId && m.seaweedTypeId === seaweedTypeId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentBalanceKg = 0;
        let currentBalanceBags = 0;

        return relevantMovements.map(m => {
            const netKg = (m.inKg || 0) - (m.outKg || 0);
            const netBags = (m.inBags || 0) - (m.outBags || 0);
            
            currentBalanceKg += netKg;
            currentBalanceBags += netBags;

            return {
                ...m,
                balanceKg: currentBalanceKg,
                balanceBags: currentBalanceBags
            };
        });
    }, [stockMovements, siteId, seaweedTypeId]);

    // Chart Logic
    useEffect(() => {
        if (!isOpen || !chartRef.current || historyData.length === 0) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const isDarkMode = settings.theme.className.includes('dark');
        const textColor = isDarkMode ? '#9ca3af' : '#4b5563';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        if ((window as any).Chart) {
            chartInstance.current = new (window as any).Chart(ctx, {
                type: 'line',
                data: {
                    labels: historyData.map(d => new Date(d.date).toLocaleDateString(language)),
                    datasets: [{
                        label: `${t('stockKg')} - ${seaweedTypeName}`,
                        data: historyData.map(d => d.balanceKg),
                        borderColor: 'rgba(59, 130, 246, 1)', // Blue
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: true,
                        pointRadius: 3,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: { color: textColor }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor, maxRotation: 45, minRotation: 0 },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor },
                            grid: { color: gridColor },
                            title: { display: true, text: 'Kg', color: textColor }
                        }
                    }
                }
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [isOpen, historyData, seaweedTypeName, t, language, settings.theme]);

    // Reverse for table display (Newest first)
    const reversedData = [...historyData].reverse();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${t('stockHistory')}: ${seaweedTypeName} @ ${siteName}`}
            widthClass="max-w-4xl"
            footer={<Button onClick={onClose}>{t('close')}</Button>}
        >
            <div className="space-y-6">
                {/* Chart Section */}
                <div className="h-64 w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    {historyData.length > 0 ? (
                        <canvas ref={chartRef} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            {t('noDataForReport')}
                        </div>
                    )}
                </div>

                {/* Table Section */}
                <div className="overflow-x-auto max-h-[40vh] border rounded-lg border-gray-200 dark:border-gray-700">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-gray-800 shadow-sm z-10">
                            <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                                <th className="p-3 whitespace-nowrap">{t('date')}</th>
                                <th className="p-3">{t('movementType')}</th>
                                <th className="p-3">{t('designation')}</th>
                                <th className="p-3 text-right text-green-600">{t('in')} (Kg)</th>
                                <th className="p-3 text-right text-red-600">{t('out')} (Kg)</th>
                                <th className="p-3 text-right font-bold text-blue-600">{t('balance')} (Kg)</th>
                                <th className="p-3 text-right text-gray-500">{t('bags')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reversedData.map((m) => (
                                <tr key={m.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="p-3 whitespace-nowrap font-mono text-xs">{m.date}</td>
                                    <td className="p-3 text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                                        {t(`stockMovement_${m.type}` as any)}
                                    </td>
                                    <td className="p-3 text-xs truncate max-w-[200px]" title={m.designation}>
                                        {m.designation}
                                    </td>
                                    <td className="p-3 text-right text-green-600 font-medium">
                                        {m.inKg ? `+${formatNumber(m.inKg, settings.localization)}` : '-'}
                                    </td>
                                    <td className="p-3 text-right text-red-600 font-medium">
                                        {m.outKg ? `-${formatNumber(m.outKg, settings.localization)}` : '-'}
                                    </td>
                                    <td className="p-3 text-right font-bold text-blue-600">
                                        {formatNumber(m.balanceKg, settings.localization)}
                                    </td>
                                    <td className="p-3 text-right text-gray-500 text-xs">
                                        {m.balanceBags}
                                    </td>
                                </tr>
                            ))}
                            {reversedData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-gray-500">
                                        {t('noDataForReport')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};

export default StockHistoryModal;
