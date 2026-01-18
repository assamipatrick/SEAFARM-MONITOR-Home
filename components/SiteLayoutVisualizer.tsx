
import React, { useMemo, useRef, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import type { Site, Module } from '../types';
import Card from './ui/Card';
import { convertGeoPointsToXY, dmsToDd } from '../utils/converters';

declare const L: any; // Using Leaflet from a global script tag in index.html


interface SiteLayoutVisualizerProps {
  site: Site;
  modules: Module[];
}

const zoneColors = ['#e11d48', '#2563eb', '#16a34a', '#f97316', '#9333ea', '#ca8a04'];

const SiteLayoutVisualizer: React.FC<SiteLayoutVisualizerProps> = ({ site, modules }) => {
  const { t } = useLocalization();
  const { farmers } = useData();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const zonePolygonsRef = useRef<any>(null); // To hold the feature group for zones
  const moduleLayerRef = useRef<any>(null); // To hold the feature group for modules

  const farmerMap = useMemo(() =>
    new Map(farmers.map(f => [f.id, `${f.firstName} ${f.lastName}`])),
    [farmers]
  );
  
  // Effect to initialize the map and layer group
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView([-18.76, 46.86], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
        zonePolygonsRef.current = L.featureGroup().addTo(mapRef.current); // Create and add layer group once
        moduleLayerRef.current = L.featureGroup().addTo(mapRef.current); // Create module layer
    }

    // Cleanup function to destroy map on unmount
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            zonePolygonsRef.current = null;
            moduleLayerRef.current = null;
        }
    };
  }, []);

  // Effect to update zone polygons and modules when data changes
  useEffect(() => {
    const map = mapRef.current;
    // Check references to ensure map is initialized
    if (!map || !zonePolygonsRef.current || !moduleLayerRef.current) return;

    const zonePolygons = zonePolygonsRef.current;
    const moduleLayer = moduleLayerRef.current;

    zonePolygons.clearLayers(); // Clear previous zone polygons
    moduleLayer.clearLayers(); // Clear previous modules

    // --- DRAW ZONES ---
    if (site.zones && site.zones.length > 0) {
        site.zones.forEach((zone, index) => {
            const coordsXY = convertGeoPointsToXY(zone.geoPoints);
            if (coordsXY.length >= 3) {
                // Sort points by angle around their centroid to ensure they form a simple, non-self-intersecting polygon.
                const centroid = coordsXY.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });
                centroid.x /= coordsXY.length;
                centroid.y /= coordsXY.length;

                coordsXY.sort((a, b) => {
                    const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
                    const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
                    return angleA - angleB;
                });

                const latLngs = coordsXY.map(c => [c.y, c.x] as [number, number]);
                const color = zoneColors[index % zoneColors.length];
                const polygon = L.polygon(latLngs, { 
                    color: color, 
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.1, // Very light fill to see modules
                });
                polygon.bindPopup(`<b>${zone.name}</b>`);
                zonePolygons.addLayer(polygon);
            }
        });
    }
    
    // --- DRAW MODULES (Square Points) ---
    modules.forEach(module => {
        if (module.siteId !== site.id) return;

        if (module.latitude && module.longitude) {
            try {
                const lat = dmsToDd(module.latitude);
                const lon = dmsToDd(module.longitude);
                const isAssigned = !!module.farmerId;
                // Green for assigned, Gray for free
                const color = isAssigned ? '#22c55e' : '#9ca3af'; 

                const squareIcon = L.divIcon({
                    className: '',
                    html: `<div style="background-color: ${color}; width: 8px; height: 8px; border: 1px solid white; box-shadow: 0 0 2px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [8, 8],
                    iconAnchor: [4, 4]
                });

                const marker = L.marker([lat, lon], { icon: squareIcon });
                marker.bindPopup(`<b>${module.code}</b><br>${isAssigned ? t('status_ASSIGNED') : t('status_FREE')}`);
                moduleLayer.addLayer(marker);
            } catch (e) {
                // Ignore invalid coordinates
            }
        }
    });

    // Fit bounds logic
    const group = L.featureGroup([zonePolygons, moduleLayer]);
    // Safety check: ensure bounds are valid before fitting to prevent "reading 'lat' of undefined" errors
    const bounds = group.getBounds();
    if (group.getLayers().length > 0 && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
    } else {
         // If no zones or modules, try to zoom to the site's single point location if it exists
         try {
            if(site.location) {
                const [latStr, lonStr] = site.location.split(',');
                if (latStr && lonStr) {
                     const lat = dmsToDd(latStr.trim());
                     const lon = dmsToDd(lonStr.trim());
                     if (!isNaN(lat) && !isNaN(lon)) {
                        map.setView([lat, lon], 13);
                     }
                }
            }
         } catch(e) { 
             // console.error(`Could not parse site location for zooming: ${site.location}`, e);
         }
    }

  }, [site.zones, site.location, modules, site.id, t]); // Re-run when zones, location or modules change

  return (
    <Card className="bg-white/30 dark:bg-gray-800/30">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('siteLayout')}: {site.name}</h3>
      
      <div ref={mapContainerRef} style={{ height: '400px' }} className="rounded-lg mb-4 border border-gray-200 dark:border-gray-700 shadow-inner z-0" />
      
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-900/50">
        {site.zones.length > 0 ? site.zones.map((zone, index) => {
          const zoneModules = modules.filter(m => m.zoneId === zone.id);
          const color = zoneColors[index % zoneColors.length];
          return (
            <div key={zone.id} className="flex-1 min-w-[250px] p-3 border-l-4 rounded-lg" style={{ borderColor: color }}>
              <h4 className="font-bold mb-3 text-gray-700 dark:text-gray-300">{zone.name} ({zoneModules.length})</h4>
              <div className="flex flex-wrap gap-2">
                {zoneModules.map(module => {
                  const isAssigned = !!module.farmerId;
                  const farmerName = isAssigned ? farmerMap.get(module.farmerId!) : null;
                  
                  const titleText = [
                    `${t('code')}: ${module.code}`,
                    `${t('status')}: ${isAssigned ? t('status_ASSIGNED') : t('status_FREE')}`,
                    isAssigned && farmerName ? `${t('farmer')}: ${farmerName}` : null
                  ].filter(Boolean).join('\n');
                  
                  return (
                    <div 
                      key={module.id} 
                      title={titleText}
                      className={`h-8 w-8 flex items-center justify-center text-[10px] font-mono border border-white/20 shadow-sm
                        ${isAssigned 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-400 text-white'}
                        transition-transform hover:scale-110 cursor-help`}
                    >
                      {module.code.split('-').pop()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }) : (
            <p className="text-gray-500 dark:text-gray-400 w-full text-center py-4">{t('noZonesDefined')}</p>
        )}
      </div>

      <div className="mt-4">
        <h4 className="font-semibold mb-2">{t('legend')}</h4>
        <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 border border-white shadow-sm"></div>
                <span>{t('assignedModule')}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 border border-white shadow-sm"></div>
                <span>{t('freeModule')}</span>
            </div>
        </div>
      </div>
    </Card>
  );
};

export default SiteLayoutVisualizer;
