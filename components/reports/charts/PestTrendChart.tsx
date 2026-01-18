
import React, { useRef, useEffect, useMemo } from 'react';

declare const Chart: any;

interface PestTrendChartProps {
    data: any[];
    pestKeys: string[];
}

const PEST_COLORS: Record<string, string> = {
    EFA: 'rgba(255, 99, 132, 0.7)',
    HYDROCLATHRUS: 'rgba(54, 162, 235, 0.7)',
    CHAETOMORPHA: 'rgba(255, 206, 86, 0.7)',
    ENTEROMORPHA: 'rgba(75, 192, 192, 0.7)',
    ICE_ICE: 'rgba(153, 102, 255, 0.7)',
    FISH_GRAZING: 'rgba(255, 159, 64, 0.7)',
    TURTLE_GRAZING: 'rgba(199, 199, 199, 0.7)',
    SEDIMENT: 'rgba(83, 102, 83, 0.7)',
};

const PestTrendChart: React.FC<PestTrendChartProps> = ({ data, pestKeys }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    
    const chartData = useMemo(() => {
        // Sort data by date
        const sortedData = [...data].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return {
            labels: sortedData.map(d => d.label),
            datasets: pestKeys.map(key => ({
                label: key,
                data: sortedData.map(d => d[key]),
                backgroundColor: PEST_COLORS[key] || 'rgba(0, 0, 0, 0.5)',
                borderColor: PEST_COLORS[key]?.replace('0.7', '1') || 'rgba(0, 0, 0, 1)',
                fill: false,
                tension: 0.1,
                pointRadius: 2, // Smaller points
            })),
        }
    }, [data, pestKeys]);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            if (ctx && (window as any).Chart) {
                chartInstance.current = new (window as any).Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { 
                                position: 'top', 
                                labels: { 
                                    boxWidth: 6, 
                                    font: { size: 8 },
                                    padding: 6
                                } 
                            } 
                        },
                        scales: {
                            x: { ticks: { font: { size: 8 } } },
                            y: { beginAtZero: true, max: 4, title: { display: true, text: 'Level (0-4)', font: { size: 8 } }, ticks: { stepSize: 1, font: { size: 8 } } },
                        },
                        layout: {
                            padding: 0
                        }
                    },
                });
            }
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartData]);

    return (
        <div className="absolute inset-0">
            <canvas ref={chartRef} />
        </div>
    );
};

export default PestTrendChart;
