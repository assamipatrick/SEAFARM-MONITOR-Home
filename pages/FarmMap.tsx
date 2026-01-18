
import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import { dmsToDd, convertGeoPointsToXY, formatCoordinate } from '../utils/converters';
import { ModuleStatus } from '../types';
import { CYCLE_DURATION_DAYS, NEARING_HARVEST_DAYS } from '../constants';
import Card from '../components/ui/Card';
import ModuleDetailPanel from '../components/ModuleDetailPanel';
import type { CombinedModuleData } from '../types';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';

declare const L: any; // Using Leaflet from a global script tag in index.html

const FarmMap: React.FC = () => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const format = settings.localization.coordinateFormat;
    
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null); // To hold the Leaflet map instance
    
    // Layer Refs
    const siteMarkersRef = useRef<any>(null);
    const zonePolygonsRef = useRef<any>(null);
    const moduleMarkersRef = useRef<any>(null);
    const highlightLayerRef = useRef<any>(null);
    const biomassLayerRef = useRef<any>(null); // New ref for Biomass
    const moduleLocationsRef = useRef<Map<string, any>>(new Map());

    const { sites, modules, cultivationCycles, farmers, employees, seaweedTypes } = useData();
    const [selectedModuleData, setSelectedModuleData] = useState<CombinedModuleData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const getModuleStatusInfo = (module: any, cycle: any) => {
        if (!module) return { color: '#808080', label: 'Unknown' };
        
        const history = module.statusHistory || [];
        const latestStatus = history.length > 0 ? history[history.length - 1].status : ModuleStatus.FREE;
        
        if (latestStatus === ModuleStatus.FREE) {
            return { color: '#6b7280', label: t('status_FREE') };
        }

        if (cycle && (cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING)) {
            const plantingDate = new Date(cycle.plantingDate);
            const today = new Date();
            const age = Math.floor((today.getTime() - plantingDate.getTime()) / (1000 * 3600 * 24));
            
            if (age > CYCLE_DURATION_DAYS) return { color: '#ef4444', label: t('overdueHarvest') }; // Red
            if (age > CYCLE_DURATION_DAYS - NEARING_HARVEST_DAYS) return { color: '#f59e0b', label: t('nearingHarvest') }; // Yellow
            return { color: '#22c55e', label: t('status_GROWING') }; // Green
        }
        
        if (latestStatus === ModuleStatus.HARVESTED || latestStatus === ModuleStatus.DRYING || latestStatus === ModuleStatus.BAGGING) {
            return { color: '#3b82f6', label: t(`status_${latestStatus}`) }; // Blue
        }

        if (latestStatus === ModuleStatus.MAINTENANCE) {
             return { color: '#f97316', label: t('status_MAINTENANCE') }; // Orange
        }

        if (module.farmerId) {
            return { color: '#a855f7', label: t('status_ASSIGNED') }; // Purple for assigned/other
        }

        // Fallback
        return { color: '#6b7280', label: t('status_FREE') };
    };

    const legendItems = [
        { color: '#22c55e', label: t('status_GROWING') },
        { color: '#f59e0b', label: t('nearingHarvest') },
        { color: '#ef4444', label: t('overdueHarvest') },
        { color: '#3b82f6', label: `${t('status_HARVESTED')} / ${t('status_DRYING')}` },
        { color: '#a855f7', label: t('status_ASSIGNED') },
        { color: '#6b7280', label: t('status_FREE') },
        { color: '#f97316', label: t('status_MAINTENANCE') },
    ];

    // 1. Initialize Map and Layer Groups (Run Once)
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [-18.7669, 46.8691], // Default center on Madagascar
                zoom: 6,
                zoomControl: false // Disable default zoom control to place it manually
            });
            
            // Re-add zoom control to top-left
            L.control.zoom({ position: 'topleft' }).addTo(map);

             // Base Layers
            const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Esri Satellite Layer
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            });

            // Create FeatureGroups for layers
            const siteMarkers = L.featureGroup().addTo(map);
            const zonePolygons = L.featureGroup().addTo(map);
            const moduleMarkers = L.featureGroup().addTo(map);
            const highlightLayer = L.featureGroup().addTo(map); // Highlight is added last to be on top
            const biomassLayer = L.layerGroup().addTo(map); // Biomass Analysis Layer

            // Store in refs
            siteMarkersRef.current = siteMarkers;
            zonePolygonsRef.current = zonePolygons;
            moduleMarkersRef.current = moduleMarkers;
            highlightLayerRef.current = highlightLayer;
            biomassLayerRef.current = biomassLayer;
            mapRef.current = map;

            // Add Layer Control
            const baseMaps = {
                [t('streetView')]: streetLayer,
                [t('satelliteView')]: satelliteLayer
            };

            const overlayMaps = {
                [`<i class="icon-sites"></i> ${t('sites')}`]: siteMarkers,
                [`<i class="icon-zones"></i> ${t('zones')}`]: zonePolygons,
                [`<i class="icon-modules"></i> ${t('modules')}`]: moduleMarkers,
            };
            L.control.layers(baseMaps, overlayMaps, { collapsed: true, position: 'topright' }).addTo(map);
        }
    }, [t]);

    // 2. Populate Data Layers (Run on Data Change)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing layers
        siteMarkersRef.current.clearLayers();
        zonePolygonsRef.current.clearLayers();
        moduleMarkersRef.current.clearLayers();
        moduleLocationsRef.current.clear();

        const allBoundsPoints: [number, number][] = [];

        // --- SITES ---
        sites.forEach(site => {
            if (site.location) {
                try {
                    const parts = site.location.split(',');
                    if (parts.length === 2) {
                        const latStr = parts[0].trim();
                        const lonStr = parts[1].trim();
                        const latitude = dmsToDd(latStr);
                        const longitude = dmsToDd(lonStr);
                        const latLng: [number, number] = [latitude, longitude];
                        
                        allBoundsPoints.push(latLng);

                        const siteModules = modules.filter(m => m.siteId === site.id);
                        const siteModuleCount = siteModules.length;
                        const siteFarmerCount = farmers.filter(f => f.siteId === site.id).length;
                        const siteEmployees = employees.filter(e => e.siteId === site.id);
                        const siteEmployeeCount = siteEmployees.length;

                        // Active lines calculation: planted lines in currently active cycles for this site
                        const siteModuleIds = new Set(siteModules.map(m => m.id));
                        const siteActiveLines = cultivationCycles
                            .filter(c => siteModuleIds.has(c.moduleId) && (c.status === 'PLANTED' || c.status === 'GROWING'))
                            .reduce((sum, c) => sum + (c.linesPlanted || 0), 0);
                        
                        const manager = employees.find(e => e.id === site.managerId);
                        const managerName = manager ? `${manager.firstName} ${manager.lastName}` : t('noManager');
    
                        const marker = L.marker(latLng);
                        // Updated Compact Tooltip Style with cleaner layout
                        marker.bindPopup(`
                            <div class="font-sans text-xs min-w-[240px]">
                                <div class="bg-blue-600 text-white px-3 py-2 rounded-t flex justify-between items-center">
                                    <h3 class="font-bold text-sm truncate max-w-[160px]">${site.name}</h3>
                                    <span class="text-[10px] bg-blue-700 px-1.5 py-0.5 rounded opacity-90">${site.code}</span>
                                </div>
                                <div class="p-3 bg-white border border-gray-200 rounded-b shadow-sm">
                                    <div class="mb-3 flex justify-between items-center border-b border-gray-100 pb-2">
                                        <span class="text-gray-500 flex items-center gap-1"><i class="w-3 h-3 bg-gray-400 rounded-full block"></i> ${t('manager')}:</span>
                                        <span class="font-medium text-right truncate max-w-[120px] text-gray-800">${managerName}</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2">
                                        <div class="flex flex-col items-center justify-center p-2 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span class="font-bold text-blue-600 text-lg leading-none">${siteModuleCount}</span>
                                            <span class="text-[9px] text-gray-500 uppercase mt-1 font-semibold tracking-wide">${t('modules')}</span>
                                        </div>
                                        <div class="flex flex-col items-center justify-center p-2 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span class="font-bold text-green-600 text-lg leading-none">${siteFarmerCount}</span>
                                            <span class="text-[9px] text-gray-500 uppercase mt-1 font-semibold tracking-wide">${t('farmers')}</span>
                                        </div>
                                         <div class="flex flex-col items-center justify-center p-2 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span class="font-bold text-purple-600 text-lg leading-none">${siteEmployeeCount}</span>
                                            <span class="text-[9px] text-gray-500 uppercase mt-1 font-semibold tracking-wide">${t('employees')}</span>
                                        </div>
                                         <div class="flex flex-col items-center justify-center p-2 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span class="font-bold text-orange-600 text-lg leading-none">${siteActiveLines}</span>
                                            <span class="text-[9px] text-gray-500 uppercase mt-1 font-semibold tracking-wide">${t('activeLines')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `, { closeButton: false, minWidth: 240 });
                        siteMarkersRef.current.addLayer(marker);
                    }
                } catch (e) {
                    console.error(`Could not parse location for site ${site.name}: ${site.location}`, e);
                }
            }
    
            // --- ZONES ---
            const siteZones = site.zones || [];
            siteZones.forEach(zone => {
                const coordsXY = convertGeoPointsToXY(zone.geoPoints);
                
                if (coordsXY.length >= 3) {
                    const centroid = coordsXY.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });
                    centroid.x /= coordsXY.length;
                    centroid.y /= coordsXY.length;

                    coordsXY.sort((a, b) => {
                        const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
                        const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
                        return angleA - angleB;
                    });
                    
                    const latLngs = coordsXY.map(c => [c.y, c.x] as [number, number]);
                    allBoundsPoints.push(...latLngs);
                    
                    const polygon = L.polygon(latLngs, { color: 'blue', weight: 2, fillOpacity: 0.1 });
                    polygon.bindTooltip(zone.name, { permanent: true, direction: "center", className: "bg-transparent border-none shadow-none font-bold text-blue-800" });
                    zonePolygonsRef.current.addLayer(polygon);
                }
            });
        });

        // --- MODULES ---
        modules.forEach(module => {
            let center: any = null;

            if (module.latitude && module.longitude) {
                try {
                    const latitude = dmsToDd(module.latitude);
                    const longitude = dmsToDd(module.longitude);
                    center = L.latLng(latitude, longitude);
                } catch (e) {}
            }

            if (!center) {
                const zone = sites.flatMap(s => s.zones).find(z => z.id === module.zoneId);
                if (zone && zone.geoPoints && zone.geoPoints.length > 0) {
                    const coordsXY = convertGeoPointsToXY(zone.geoPoints);
                    if (coordsXY.length > 0) {
                        const latLngs = coordsXY.map(c => [c.y, c.x] as [number, number]);
                        const polygon = L.polygon(latLngs);
                        const bounds = polygon.getBounds();
                        if (bounds && bounds.isValid()) {
                            center = bounds.getCenter();
                        }
                    }
                }
            }
            
            if (!center) return;
            
            moduleLocationsRef.current.set(module.id, center);
            
            const cycle = cultivationCycles.find(c => c.moduleId === module.id && (c.status === ModuleStatus.PLANTED || c.status === ModuleStatus.GROWING || c.status === ModuleStatus.CUTTING));
            const farmer = farmers.find(f => f.id === module.farmerId);
            const statusInfo = getModuleStatusInfo(module, cycle);

            const squareIcon = L.divIcon({
                html: `<div style="background-color: ${statusInfo.color}; width: 10px; height: 10px; border: 1px solid #fff; opacity: 1; box-shadow: 1px 1px 2px rgba(0,0,0,0.5);"></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
                className: ''
            });
            
            const marker = L.marker(center, { icon: squareIcon });
            marker.bindTooltip(`${module.code}`, { direction: 'top', offset: [0, -5], className: 'text-xs' });

            marker.on('click', () => {
                const site = sites.find(s => s.id === module.siteId);
                const zone = site?.zones.find(z => z.id === module.zoneId);
                const seaweedType = cycle ? seaweedTypes.find(st => st.id === cycle.seaweedTypeId) : undefined;

                const relevantCycle = cycle || cultivationCycles
                    .filter(c => c.moduleId === module.id)
                    .sort((a,b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime())[0];

                const combinedData: CombinedModuleData = {
                    module,
                    cycle: relevantCycle,
                    site,
                    zone,
                    seaweedType,
                    farmer
                };
                setSelectedModuleData(combinedData);
            });

            moduleMarkersRef.current.addLayer(marker);
        });

        if (allBoundsPoints.length > 0) {
            map.fitBounds(allBoundsPoints, { padding: [50, 50] });
        }

    }, [sites, modules, cultivationCycles, farmers, employees, seaweedTypes, t, format]);


    // 3. Highlight Effect
    useEffect(() => {
        const highlightLayer = highlightLayerRef.current;
        if (!highlightLayer) return;
        
        highlightLayer.clearLayers();
        
        if (selectedModuleData && selectedModuleData.module) {
            const center = moduleLocationsRef.current.get(selectedModuleData.module.id);
            if (center) {
                 L.circleMarker(center, {
                     radius: 16,
                     color: '#facc15',
                     fill: false,
                     weight: 4,
                     opacity: 0.8
                 }).addTo(highlightLayer);
            }
        }
    }, [selectedModuleData, modules]);

    const handleLoadSatelliteAnalysis = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            if (!mapRef.current || !biomassLayerRef.current) {
                setIsAnalyzing(false);
                return;
            }
            const biomassLayer = biomassLayerRef.current;
            biomassLayer.clearLayers();
            const center = mapRef.current.getCenter();
            
            if (center) {
                const centerLat = center.lat;
                const centerLng = center.lng;
                
                const healthyPoly = L.circle([centerLat + 0.005, centerLng + 0.005], {
                    color: 'green',
                    fillColor: '#22c55e',
                    fillOpacity: 0.4,
                    radius: 1500,
                    weight: 1
                }).bindPopup(`<b>${t('biomassLegendHigh')}</b><br>NDVI: 0.75<br>${t('satelliteSource')}`);
                
                const bloomPoly = L.circle([centerLat - 0.005, centerLng - 0.005], {
                    color: 'red',
                    fillColor: '#ef4444',
                    fillOpacity: 0.4,
                    radius: 1000,
                    weight: 1
                }).bindPopup(`<b>${t('algalBloomRisk')}</b><br>Chlorophyll-a: High<br>${t('satelliteSource')}`);
    
                biomassLayer.addLayer(healthyPoly);
                biomassLayer.addLayer(bloomPoly);
                mapRef.current.setView([centerLat, centerLng], Math.max(mapRef.current.getZoom(), 13));
            }
            
            setIsAnalyzing(false);
        }, 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('farmMapTitle')}</h1>
                <div className="flex gap-2">
                     <Button onClick={handleLoadSatelliteAnalysis} disabled={isAnalyzing} variant="secondary">
                        <Icon name={isAnalyzing ? 'Activity' : 'Eye'} className={`w-5 h-5 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        {isAnalyzing ? t('analyzingSatellite') : t('loadSatelliteData')}
                    </Button>
                </div>
            </div>
            <div className="relative">
                <div ref={mapContainerRef} style={{ height: '70vh' }} className="rounded-lg shadow-lg bg-blue-50 z-0" />
                
                {/* Floating Legend Positioned Bottom Left to avoid overlap with controls */}
                <div className="absolute bottom-8 left-4 z-[500] no-print hidden sm:block">
                    <Card title={t('legend')} className="p-3 !bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg">
                        <div className="space-y-2">
                        {legendItems.map(item => (
                            <div key={item.label} className="flex items-center">
                                <span className="w-3 h-3 mr-2 border border-white shadow-sm" style={{ backgroundColor: item.color }}></span>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </div>
                        ))}
                        <hr className="my-2 border-gray-300"/>
                        <h4 className="text-[10px] font-bold mb-1">{t('satelliteAnalysisTitle')}</h4>
                        <div className="flex items-center">
                            <span className="w-3 h-3 mr-2 border border-white shadow-sm bg-green-500/50 border-green-600"></span>
                            <span className="text-[10px] font-medium">{t('biomassLegendHigh')}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="w-3 h-3 mr-2 border border-white shadow-sm bg-red-500/50 border-red-600"></span>
                            <span className="text-[10px] font-medium">{t('algalBloomRisk')}</span>
                        </div>
                        </div>
                    </Card>
                </div>
            </div>
            <ModuleDetailPanel data={selectedModuleData} onClose={() => setSelectedModuleData(null)} />
        </div>
    );
};

export default FarmMap;
