
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useSettings } from '../../contexts/SettingsContext';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { formatNumber } from '../../utils/formatters';
import { PressedStockMovementType } from '../../types';

declare const Chart: any;

const COLORS = [
    'rgba(59, 130, 246, 1)', // Blue
    'rgba(16, 185, 129, 1)', // Green
    'rgba(245, 158, 11, 1)', // Amber
    'rgba(239, 68, 68, 1)', // Red
    'rgba(139, 92, 246, 1)', // Purple
    'rgba(236, 72, 153, 1)', // Pink
];

const BACKGROUND_COLORS = [
    'rgba(59, 130, 246, 0.1)',
    'rgba(16, 185, 129, 0.1)',
    'rgba(245, 158, 11, 0.1)',
    'rgba(239, 68, 68, 0.1)',
    'rgba(139, 92, 246, 0.1)',
    'rgba(236, 72, 153, 0.1)',
];

const StockEvolutionChart: React.FC = () => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { seaweedTypes, pressedStockMovements } = useData();
    
    const [stockType, setStockType] = useState<'pressed' | 'bulk'>('pressed');
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        // 1. Determine Time Range (Last 6 Months)
        const months: Date[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d);
        }

        // 2. Initialize Data Structures
        const seriesData: Record<string, number[]> = {};
        seaweedTypes.forEach(st => {
            seriesData[st.id] = new Array(months.length).fill(0);
        });

        // 3. Calculate Running Balances for each month end
        months.forEach((monthDate, index) => {
            const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
            
            seaweedTypes.forEach(st => {
                // Filter movements
                const movements = pressedStockMovements.filter(m => 
                    m.seaweedTypeId === st.id && 
                    new Date(m.date) <= endOfMonth
                );

                let balance = 0;

                movements.forEach(m => {
                    const kgIn = m.inKg || 0;
                    const kgOut = m.outKg || 0;

                    if (stockType === 'bulk') {
                        // Bulk Logic
                        if ([PressedStockMovementType.BULK_IN_FROM_SITE, PressedStockMovementType.FARMER_DELIVERY].includes(m.type)) {
                            balance += kgIn;
                        } else if (m.type === PressedStockMovementType.PRESSING_CONSUMPTION) {
                            balance -= kgOut;
                        }
                    } else {
                        // Pressed Logic
                        if ([PressedStockMovementType.PRESSING_IN, PressedStockMovementType.INITIAL_STOCK, PressedStockMovementType.ADJUSTMENT_IN].includes(m.type)) {
                            balance += kgIn;
                        } else if ([PressedStockMovementType.EXPORT_OUT, PressedStockMovementType.RETURN_TO_SITE, PressedStockMovementType.ADJUSTMENT_OUT].includes(m.type)) {
                            balance -= kgOut;
                        }
                    }
                });

                seriesData[st.id][index] = Math.max(0, balance);
            });
        });

        // 4. Format for Chart.js
        const labels = months.map(d => d.toLocaleDateString(language, { month: 'short', year: '2-digit' }));
        
        const datasets = seaweedTypes.map((st, i) => ({
            label: st.name,
            data: seriesData[st.id],
            backgroundColor: BACKGROUND_COLORS[i % BACKGROUND_COLORS.length],
            borderColor: COLORS[i % COLORS.length],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true
        })).filter(ds => ds.data.some(val => val > 0)); // Only show types with data

        return { labels, datasets };

    }, [pressedStockMovements, seaweedTypes, language, stockType]);

    // Render Chart
    useEffect(() => {
        if (!chartRef.current || !chartData) return;

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
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { color: textColor }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context: any) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += formatNumber(context.parsed.y, settings.localization) + ' Kg';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Stock (Kg)', color: textColor },
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    },
                }
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [chartData, settings.theme, settings.localization]);

    return (
        <Card className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {t('stockHistory')}
                </h3>
                <div className="w-48">
                    <Select 
                        value={stockType} 
                        onChange={e => setStockType(e.target.value as 'pressed' | 'bulk')}
                        containerClassName="mb-0"
                    >
                        <option value="pressed">{t('pressedSeaweed')}</option>
                        <option value="bulk">{t('bulkSeaweed')}</option>
                    </Select>
                </div>
            </div>
            
            <div className="h-72 w-full relative">
                 <canvas ref={chartRef} />
            </div>
        </Card>
    );
};

export default StockEvolutionChart;
