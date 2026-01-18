
import React, { useRef, useEffect, useMemo } from 'react';
import { useLocalization } from '../../../contexts/LocalizationContext';

declare const Chart: any;

interface LineAgeChartProps {
    data: { [key: string]: number }; // e.g., { '0-10': 150, '11-20': 200, ... }
}

const LineAgeChart: React.FC<LineAgeChartProps> = ({ data }) => {
    const { t } = useLocalization();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        const labels = Object.keys(data).map(key => t(`${key.replace('>', 'gt')}days` as any));
        const values = Object.values(data);

        return {
            labels,
            datasets: [{
                label: t('linesCount'),
                data: values,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
            }]
        };
    }, [data, t]);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            if (ctx && (window as any).Chart) {
                chartInstance.current = new (window as any).Chart(ctx, {
                    type: 'bar',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            title: { display: false }
                        },
                        layout: {
                            padding: { bottom: 5 }
                        },
                        scales: { 
                            y: { 
                                beginAtZero: true, 
                                ticks: { font: { size: 9 } } 
                            },
                            x: {
                                ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 0 }
                            }
                        }
                    }
                });
            }
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartData, t]);

    return (
        <div className="absolute inset-0">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};

export default LineAgeChart;
