import React, { useEffect, useRef, useState } from "react";
import { mappls } from "mappls-web-maps";
import type { CPCBStation, StubbleFire, PlumeTrajectory, HourlyForecastPoint } from "../types";

interface MapplsViewProps {
  stations: CPCBStation[];
  fires: StubbleFire[];
  trajectories: PlumeTrajectory[];
  currentPoint: HourlyForecastPoint | null;
}

const mapplsClassObject = new mappls();

export const MapplsView: React.FC<MapplsViewProps> = ({
  stations,
  fires,
  // trajectories, // Will implement trajectories logic later if needed
  currentPoint
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Mappls configuration
    const mapKey = import.meta.env.VITE_MAPPLS_API || "klgopusarkvgyigirzbwrenfbnlzxuryrvby";
    const loadObject = { 
      map: true,
      version: '3.0'
    };

    try {
      mapplsClassObject.initialize(mapKey, loadObject, () => {
        if (!mapContainerRef.current) return;
        
        const newMap = mapplsClassObject.Map({
          id: mapContainerRef.current.id,
          properties: {
            center: [28.633, 77.2194],
            zoom: 6,
            zoomControl: true,
            location: true,
            search: false
          },
        });

        newMap.on("load", () => {
          setIsMapLoaded(true);
        });

        mapInstanceRef.current = newMap;
      });
    } catch (e) {
      console.error("Failed to initialize Mappls:", e);
    }

    return () => {
      // Cleanup Mappls map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Data Layers (Markers, etc.) once map is loaded
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    // In MapmyIndia SDK, we can use standard Mapbox GL methods since v3.0 is a wrapper around Mapbox GL JS.
    // For safety and compatibility with their wrapper, we use GeoJSON sources for dots.

    // 1. CPCB Stations
    const stationGeoJSON = {
      type: "FeatureCollection",
      features: stations.map(s => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [s.lon, s.lat] // Mapbox uses [lon, lat]
        },
        properties: {
          title: s.name,
          aqi: s.current_aqi,
          pm25: s.current_pm25,
          color: getAQIColorHex(s.current_aqi)
        }
      }))
    };

    if (map.getSource('cpcb-stations')) {
      map.getSource('cpcb-stations').setData(stationGeoJSON);
    } else {
      map.addSource('cpcb-stations', { type: 'geojson', data: stationGeoJSON });
      map.addLayer({
        id: 'cpcb-stations-layer',
        type: 'circle',
        source: 'cpcb-stations',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // 2. NASA Fires
    const fireGeoJSON = {
      type: "FeatureCollection",
      features: fires.map(f => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.lon, f.lat]
        },
        properties: {
          frp: f.mean_frp_mw
        }
      }))
    };

    if (map.getSource('nasa-fires')) {
      map.getSource('nasa-fires').setData(fireGeoJSON);
    } else {
      map.addSource('nasa-fires', { type: 'geojson', data: fireGeoJSON });
      map.addLayer({
        id: 'nasa-fires-layer',
        type: 'circle',
        source: 'nasa-fires',
        paint: {
          'circle-radius': 5,
          'circle-color': '#ef4444',
          'circle-opacity': 0.8,
          'circle-blur': 0.3
        }
      });
    }

  }, [isMapLoaded, stations, fires, currentPoint]);

  return (
    <div className="relative w-full h-[700px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl glass-panel">
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-cyan-400 font-medium tracking-wide">Initializing MapmyIndia SDK...</div>
          </div>
        </div>
      )}
      <div
        id="mappls-map-container"
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

// Helper
function getAQIColorHex(aqi: number) {
  if (aqi <= 50) return "#10b981"; // emerald
  if (aqi <= 100) return "#84cc16"; // lime
  if (aqi <= 200) return "#eab308"; // yellow
  if (aqi <= 300) return "#f97316"; // orange
  if (aqi <= 400) return "#ef4444"; // red
  if (aqi <= 450) return "#a855f7"; // purple
  return "#991b1b"; // dark red
}
