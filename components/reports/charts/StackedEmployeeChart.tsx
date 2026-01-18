
import React, { useRef, useEffect, useMemo } from 'react';
import { useLocalization } from '../../../contexts/LocalizationContext';

declare const Chart: any;

interface StackedEmployeeChartProps {
    data: { name: string; PERMANENT: number; CASUAL: number }[];
}

const StackedEmployeeChart: React.FC<StackedEmployeeChartProps> = ({ data }) => {
    const { t } = useLocalization();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        return {
            labels: data.map(d => d.name),
            datasets: [
                {
                    label: t('permanent'),
                    data: data.map(d => d.PERMANENT),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                },
                {
                    label: t('casual'),
                    data: data.map(d => d.CASUAL),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                }
            ]
        };
    }, [data, t]);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            if (ctx && (window as any).Chart) {
                chartInstance.current = new (window as any).Chart(ctx, {
                    type: 'bar',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { position: 'top', labels: { boxWidth: 8, font: { size: 9 } } } 
                        },
                        scales: { 
                            x: { stacked: true, ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 0 } }, 
                            y: { stacked: true, beginAtZero: true, ticks: { font: { size: 9 }, stepSize: 1 } } 
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

export default StackedEmployeeChart;
