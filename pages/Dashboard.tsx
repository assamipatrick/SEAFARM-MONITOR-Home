
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { ModuleStatus, IncidentStatus } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import { dmsToDd, calculateSGR } from '../utils/converters';
import Button from '../components/ui/Button';

declare const L: any; // Using Leaflet from a global script tag in index.html
declare const Chart: any;
declare const Recharts: any;


// Chart Components
const ProductionTrendChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const { cultivationCycles } = useData();
    const { settings } = useSettings();
    const { t, language } = useLocalization();

    const chartData = useMemo(() => {
        const labels: string[] = [];
        const data: number[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(d.toLocaleDateString(language, { month: 'short', year: '2-digit'}));
            data.push(0);
        }

        cultivationCycles.forEach(cycle => {
            if (cycle.harvestDate && cycle.harvestedWeight) {
                const harvestDate = new Date(cycle.harvestDate);
                const diffMonths = (now.getFullYear() - harvestDate.getFullYear()) * 12 + (now.getMonth() - harvestDate.getMonth());
                if (diffMonths >= 0 && diffMonths < 6) {
                    const netWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                    data[5 - diffMonths] += netWeight;
                }
            }
        });
        
        return { labels, data };
    }, [cultivationCycles, language]);

    useEffect(() => {
        if (!chartRef.current) return;
        const isDarkMode = settings.theme.className.includes('dark');
        const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx && (window as any).Chart) {
             chartInstance.current = new (window as any).Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: t('netHarvestedWeightKg'), // Updated label
                        data: chartData.data,
                        fill: true,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        tension: 0.3,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                        x: { ticks: { color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }
    }, [chartData, settings.theme, t]);

    return <div className="w-full h-64"><canvas ref={chartRef}></canvas></div>;
};

const AverageSGRChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const { cultivationCycles, seaweedTypes } = useData();
    const { settings } = useSettings();
    const { t } = useLocalization();

    const chartData = useMemo(() => {
        const data: Record<string, { sgrSum: number, count: number }> = {};
        
        cultivationCycles.forEach(c => {
            if (c.harvestDate && c.harvestedWeight && c.initialWeight && c.plantingDate) {
                const duration = (new Date(c.harvestDate).getTime() - new Date(c.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
                // SGR uses GROSS weight (c.harvestedWeight)
                const sgr = calculateSGR(c.initialWeight, c.harvestedWeight, duration);
                
                if (sgr !== null) {
                    if (!data[c.seaweedTypeId]) {
                        data[c.seaweedTypeId] = { sgrSum: 0, count: 0 };
                    }
                    data[c.seaweedTypeId].sgrSum += sgr;
                    data[c.seaweedTypeId].count++;
                }
            }
        });

        const typeMap = new Map(seaweedTypes.map(st => [st.id, st.name]));
        return Object.entries(data).map(([typeId, { sgrSum, count }]) => ({
            label: typeMap.get(typeId) || t('unknown'),
            avgSGR: sgrSum / count,
        }));
    }, [cultivationCycles, seaweedTypes, t]);

    useEffect(() => {
        if (!chartRef.current) return;
        const isDarkMode = settings.theme.className.includes('dark');
        const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx && (window as any).Chart) {
             chartInstance.current = new (window as any).Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.map(d => d.label),
                    datasets: [{
                        label: t('growthRate') + ' (%)',
                        data: chartData.map(d => d.avgSGR),
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            title: { display: true, text: '% / day', color: textColor },
                            ticks: { color: textColor }, 
                            grid: { color: gridColor } 
                        },
                        x: { ticks: { color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }
    }, [chartData, settings.theme, t]);

    return <div className="w-full h-64"><canvas ref={chartRef}></canvas></div>;
};


const SitePerformanceMap: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const { sites, modules, cultivationCycles } = useData();
    const { t } = useLocalization();

    const siteProduction = useMemo(() => {
        const productionMap = new Map<string, number>();
        cultivationCycles.forEach(cycle => {
            if (cycle.harvestedWeight) {
                const module = modules.find(m => m.id === cycle.moduleId);
                if (module) {
                    const netWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                    productionMap.set(module.siteId, (productionMap.get(module.siteId) || 0) + netWeight);
                }
            }
        });
        return productionMap;
    }, [cultivationCycles, modules]);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: [-18.76, 46.86],
                zoom: 6,
                zoomControl: false,
            });
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(mapRef.current);
        }

        const map = mapRef.current;
        if (!map) return;

        // Invalidate size to ensure map renders correctly within the new dimensions
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        // Clear old markers
        map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        const maxProduction = Math.max(...(Array.from(siteProduction.values()) as number[]), 1);

        sites.forEach(site => {
            if (site.location) {
                try {
                    const [latStr, lonStr] = site.location.split(',');
                    const lat = dmsToDd(latStr.trim());
                    const lon = dmsToDd(lonStr.trim());
                    const production = siteProduction.get(site.id) || 0;
                    const radius = 5 + (production / maxProduction) * 20;

                    L.circleMarker([lat, lon], {
                        radius,
                        fillColor: '#2563eb',
                        color: '#1d4ed8',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.6
                    }).addTo(map)
                    .bindPopup(`<b>${site.name}</b><br>${t('netProduction')}: ${production.toFixed(0)} kg`);
                } catch (e) {
                    console.error("Failed to parse site location", site.location);
                }
            }
        });

    }, [sites, siteProduction, t]);

    return <div ref={mapContainerRef} className="w-full h-full min-h-[600px] rounded-lg z-0" />;
};

const FarmerSegmentationChart: React.FC = () => {
    const { farmers, cultivationCycles, modules } = useData();
    const { t } = useLocalization();

    const farmerData = useMemo(() => {
        const dataByFarmer: Record<string, { yield: number, cycles: number }> = {};
        cultivationCycles.forEach(cycle => {
            if (cycle.harvestedWeight) {
                const module = modules.find(m => m.id === cycle.moduleId);
                if (module?.farmerId) {
                    if (!dataByFarmer[module.farmerId]) {
                        dataByFarmer[module.farmerId] = { yield: 0, cycles: 0 };
                    }
                    const netWeight = (cycle.harvestedWeight || 0) - (cycle.cuttingsTakenAtHarvestKg || 0);
                    dataByFarmer[module.farmerId].yield += netWeight;
                    dataByFarmer[module.farmerId].cycles++;
                }
            }
        });

        return Object.entries(dataByFarmer).map(([farmerId, data]) => {
            const farmer = farmers.find(f => f.id === farmerId);
            return {
                name: farmer ? `${farmer.firstName} ${farmer.lastName}` : t('unknown'),
                yield: data.yield,
                cycles: data.cycles,
            };
        });
    }, [farmers, cultivationCycles, modules, t]);

    if (farmerData.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">{t('noDataForReport')}</div>;
    }

    const Recharts = (window as any).Recharts;
    if (!Recharts) {
        return <div className="flex items-center justify-center h-full text-gray-500">Loading chart library...</div>;
    }
    const { ResponsiveContainer, BubbleChart, XAxis, YAxis, ZAxis, Tooltip: RechartsTooltip, CartesianGrid, Legend, Bubble } = Recharts;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-xs z-50">
                    <p className="font-bold text-gray-900 dark:text-white mb-1">{data.name}</p>
                    <p className="text-gray-600 dark:text-gray-300">
                        {t('totalYield')}: <span className="font-semibold">{data.yield.toFixed(1)} kg</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                        {t('numberOfCyclesAxis')}: <span className="font-semibold">{data.cycles}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BubbleChart data={farmerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="yield" name={t('totalYieldKgAxis')} type="number" />
                    <YAxis dataKey="cycles" name={t('numberOfCyclesAxis')} type="number" />
                    <ZAxis dataKey="yield" range={[10, 100]} name={t('totalYield')} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Bubble name={`${t('totalYield')} (${t('netWeight')})`} dataKey="yield" fill="#8884d8" />
                </BubbleChart>
            </ResponsiveContainer>
        </div>
    );
};

const SeaweedYieldChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const { cultivationCycles, seaweedTypes } = useData();
    const { settings } = useSettings();
    const { t } = useLocalization();

    const chartData = useMemo(() => {
        const data: Record<string, { yield: number, count: number }> = {};
        cultivationCycles.forEach(c => {
            if (c.harvestedWeight) {
                if (!data[c.seaweedTypeId]) {
                    data[c.seaweedTypeId] = { yield: 0, count: 0 };
                }
                const netWeight = (c.harvestedWeight || 0) - (c.cuttingsTakenAtHarvestKg || 0);
                data[c.seaweedTypeId].yield += netWeight;
                data[c.seaweedTypeId].count++;
            }
        });
        const typeMap = new Map(seaweedTypes.map(st => [st.id, st.name]));
        return Object.entries(data).map(([typeId, { yield: totalYield, count }]) => ({
            label: typeMap.get(typeId) || t('unknown'),
            avgYield: totalYield / count,
        }));
    }, [cultivationCycles, seaweedTypes, t]);

     useEffect(() => {
        if (!chartRef.current) return;
        const isDarkMode = settings.theme.className.includes('dark');
        const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx && (window as any).Chart) {
             chartInstance.current = new (window as any).Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.map(d => d.label),
                    datasets: [{
                        label: t('averageYieldKg'),
                        data: chartData.map(d => d.avgYield),
                        backgroundColor: 'rgba(139, 92, 246, 0.6)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderWidth: 1,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { color: textColor }, grid: { color: gridColor } },
                        x: { ticks: { color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }
    }, [chartData, settings.theme, t]);

    return <div className="w-full h-64"><canvas ref={chartRef}></canvas></div>;
};

const RecentIncidentsList: React.FC = () => {
    const { t } = useLocalization();
    const { incidents, incidentTypes } = useData();
    const navigate = useNavigate();

    const recentIncidents = useMemo(() => 
        [...incidents].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [incidents]);
  
    const incidentTypeMap = useMemo(() => new Map(incidentTypes.map(it => [it.id, it.name])), [incidentTypes]);

    return (
        <div className="space-y-3 h-full overflow-y-auto">
            {recentIncidents.map(incident => (
                <div key={incident.id} className="flex items-start gap-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer" onClick={() => navigate('/monitoring/incidents')}>
                    <Icon name="AlertTriangle" className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                    <div className="flex-grow">
                        <p className="font-semibold text-sm">{incidentTypeMap.get(incident.type) || incident.type}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{incident.date}</p>
                    </div>
                    <StatusBadge status={incident.status} />
                </div>
            ))}
            {recentIncidents.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">{t('noIncidents')}</p>
                </div>
            )}
        </div>
    );
};

const WeatherWidget: React.FC = () => {
    const { t } = useLocalization();
    // Simulation of live weather data for Field View
    return (
        <div className="flex justify-between items-center h-full px-4">
            <div className="flex items-center">
                <Icon name="Sun" className="w-12 h-12 text-yellow-400 mr-4" />
                <div>
                    <p className="text-2xl font-bold">28°C</p>
                    <p className="text-sm text-gray-500">Sunny</p>
                </div>
            </div>
             <div className="text-right">
                <p className="text-sm text-gray-500">Wind: 12 km/h NE</p>
                <p className="text-sm text-gray-500">Humidity: 65%</p>
            </div>
        </div>
    )
}


const Dashboard: React.FC = () => {
  const { t } = useLocalization();
  const [viewMode, setViewMode] = useState<'director' | 'field'>('director');
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{t('analyticalDashboard')}</h1>
          <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-lg flex">
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'director' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setViewMode('director')}
              >
                  Director
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'field' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setViewMode('field')}
              >
                  Field
              </button>
          </div>
      </div>
      
      {viewMode === 'director' ? (
          <div className="flex-grow grid grid-cols-12 gap-6 animate-fade-in">
            <Card className="col-span-12 md:col-span-6 lg:col-span-4" title={t('productionTrend')}>
                <ProductionTrendChart />
            </Card>
            
            <Card className="col-span-12 md:col-span-6 lg:col-span-4" title={t('growthRate')}>
                <AverageSGRChart />
            </Card>
            
             <Card className="col-span-12 md:col-span-6 lg:col-span-4" title={t('yieldBySeaweedType')}>
                <SeaweedYieldChart />
            </Card>

            <Card className="col-span-12 md:col-span-6 lg:col-span-6 row-span-2" title={t('sitePerformance')}>
                <SitePerformanceMap />
            </Card>
             <Card className="col-span-12 md:col-span-6 lg:col-span-6" title={t('farmerSegmentation')}>
                <FarmerSegmentationChart />
            </Card>
          </div>
      ) : (
          <div className="flex-grow grid grid-cols-12 gap-6 animate-fade-in">
             <Card className="col-span-12 lg:col-span-8 row-span-2 p-0 overflow-hidden" title={t('farmMapTitle')}>
                 {/* Reusing SitePerformanceMap but logically it could be a more interactive one */}
                 <SitePerformanceMap />
             </Card>
             
             <Card className="col-span-12 lg:col-span-4 h-48" title="Current Weather">
                 <WeatherWidget />
             </Card>

             <Card className="col-span-12 lg:col-span-4 flex-grow flex flex-col" title={t('recentIncidents')}>
                <RecentIncidentsList />
             </Card>
             
             <Card className="col-span-12" title="Quick Actions">
                 <div className="flex gap-4">
                    <Button className="flex-1 py-8 flex-col gap-2">
                        <Icon name="PlusCircle" className="w-8 h-8" />
                        Report Incident
                    </Button>
                    <Button className="flex-1 py-8 flex-col gap-2" variant="secondary">
                         <Icon name="Scissors" className="w-8 h-8" />
                         Log Harvest
                    </Button>
                 </div>
             </Card>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
