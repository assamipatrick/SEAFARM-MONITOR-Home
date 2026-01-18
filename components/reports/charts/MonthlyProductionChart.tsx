
import React, { useRef, useEffect, useMemo } from 'react';
import { useLocalization } from '../../../contexts/LocalizationContext';

declare const Chart: any;

interface MonthlyProductionChartProps {
    data: { period: string; productionBySite: Record<string, number> }[];
    sites: { id: string; name: string }[];
}

const siteColors = ['rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(249, 115, 22, 0.7)', 'rgba(168, 85, 247, 0.7)'];

const MonthlyProductionChart: React.FC<MonthlyProductionChartProps> = ({ data, sites }) => {
    const { t } = useLocalization();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        return {
            labels: data.map(d => d.period),
            datasets: sites.map((site, index) => ({
                label: site.name,
                data: data.map(d => d.productionBySite[site.id] || 0),
                backgroundColor: siteColors[index % siteColors.length],
            }))
        };
    }, [data, sites]);

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
                            y: { 
                                beginAtZero: true, 
                                title: { display: true, text: 'kg', font: { size: 9 } },
                                ticks: { font: { size: 9 } }
                            },
                            x: { ticks: { font: { size: 9 } } }
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

export default MonthlyProductionChart;
