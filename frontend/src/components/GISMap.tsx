import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { CPCBStation, StubbleFire, PlumeTrajectory, HourlyForecastPoint } from "../types";
import { Layers, Flame, Wind, MapPin, Eye, EyeOff } from "lucide-react";

interface GISMapProps {
  stations: CPCBStation[];
  fires: StubbleFire[];
  trajectories: PlumeTrajectory[];
  currentPoint: HourlyForecastPoint | null;
  onSelectStation: (station: CPCBStation) => void;
}

export const GISMap: React.FC<GISMapProps> = ({
  stations,
  fires,
  trajectories,
  currentPoint,
  onSelectStation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stationLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const fireLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [showStations, setShowStations] = useState(true);
  const [showFires, setShowFires] = useState(true);
  const [showPlumes, setShowPlumes] = useState(true);

  const getAQIColorHex = (aqi: number) => {
    if (aqi <= 50) return "#10b981";
    if (aqi <= 100) return "#84cc16";
    if (aqi <= 200) return "#eab308";
    if (aqi <= 300) return "#f97316";
    if (aqi <= 400) return "#ef4444";
    if (aqi <= 450) return "#9333ea";
    return "#7f1d1d";
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [29.6, 76.6], // Centered between Punjab and Delhi NCR
      zoom: 7.5,
      minZoom: 6,
      maxZoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Free High-Contrast Dark Tiles from CartoDB
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CartoDB</a> | CPCB & Open-Meteo Data',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(map);

    stationLayerGroupRef.current = L.layerGroup().addTo(map);
    fireLayerGroupRef.current = L.layerGroup().addTo(map);
    trajectoryLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Layers when data or timeline changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // 1. Stations Layer
    if (stationLayerGroupRef.current) {
      stationLayerGroupRef.current.clearLayers();
      if (showStations) {
        stations.forEach((s) => {
          // If 72h forecast exists for station, grab the current hour offset value
          const hourOffset = currentPoint?.hour_offset || 0;
          const stForecast = s.forecast_72h && s.forecast_72h[hourOffset];
          const aqi = stForecast ? stForecast.aqi : s.current_aqi;
          const cat = stForecast ? stForecast.aqi_category : s.aqi_category;
          const pm25 = stForecast ? stForecast.pm25 : s.current_pm25;
          const color = getAQIColorHex(aqi);

          const customIcon = L.divIcon({
            className: "custom-pin",
            html: `
              <div style="
                background: ${color}; 
                color: #ffffff; 
                font-weight: 800; 
                font-size: 11px; 
                padding: 3px 6px; 
                border-radius: 9999px; 
                border: 2px solid #0f172a; 
                box-shadow: 0 0 12px ${color}88;
                display: flex;
                align-items: center;
                gap: 3px;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span>${aqi}</span>
              </div>
            `,
            iconSize: [30, 20],
            iconAnchor: [15, 10]
          });

          const marker = L.marker([s.lat, s.lon], { icon: customIcon });
          
          marker.on("click", () => {
            onSelectStation(s);
          });

          marker.bindTooltip(`
            <div style="font-family: inherit; font-size: 12px; padding: 4px;">
              <strong style="color: #38bdf8;">${s.name}</strong><br/>
              <span>AQI: <b style="color: ${color}">${aqi} (${cat})</b></span><br/>
              <span>PM2.5: <b>${pm25} µg/m³</b></span><br/>
              <span style="font-size: 10px; color: #94a3b8;">${s.type}</span>
            </div>
          `, { direction: "top", offset: [0, -10] });

          stationLayerGroupRef.current?.addLayer(marker);
        });
      }
    }

    // 2. Stubble Burning Fire Layer
    if (fireLayerGroupRef.current) {
      fireLayerGroupRef.current.clearLayers();
      if (showFires) {
        fires.forEach((f) => {
          const radius = Math.min(22, Math.max(8, Math.sqrt(f.mean_frp_mw) * 1.8));
          
          const fireIcon = L.divIcon({
            className: "fire-marker",
            html: `
              <div style="
                position: relative;
                width: ${radius * 2}px;
                height: ${radius * 2}px;
                background: radial-gradient(circle, rgba(239, 68, 68, 0.9) 0%, rgba(249, 115, 22, 0.6) 60%, rgba(239, 68, 68, 0) 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: translate(-50%, -50%);
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  background: #fef08a;
                  border-radius: 50%;
                  box-shadow: 0 0 10px #f59e0b;
                "></div>
              </div>
            `,
            iconSize: [radius * 2, radius * 2],
            iconAnchor: [radius, radius]
          });

          const marker = L.marker([f.lat, f.lon], { icon: fireIcon });

          marker.bindTooltip(`
            <div style="font-size: 12px; padding: 4px;">
              <strong style="color: #f97316;">🔥 ${f.district}, ${f.state}</strong><br/>
              <span>Active Fires: <b>${f.active_fires}</b></span><br/>
              <span>Mean FRP: <b>${f.mean_frp_mw} MW</b></span><br/>
              <span>Plume Injection Ht: <b>${f.plume_injection_height_m} m</b></span><br/>
              <span style="font-size: 10px; color: #94a3b8;">${f.crop_type}</span>
            </div>
          `, { direction: "top" });

          fireLayerGroupRef.current?.addLayer(marker);
        });
      }
    }

    // 3. Smoke Trajectories & Wind Flow
    if (trajectoryLayerGroupRef.current) {
      trajectoryLayerGroupRef.current.clearLayers();
      if (showPlumes) {
        trajectories.forEach((t) => {
          const latlngs = t.trajectory_points.map((pt) => [pt.lat, pt.lon] as [number, number]);
          
          // Polyline path
          const polyline = L.polyline(latlngs, {
            color: "#f59e0b",
            weight: 3.5,
            opacity: 0.75,
            dashArray: "6, 8",
            lineCap: "round"
          });

          polyline.bindTooltip(`
            <div style="font-size: 12px; padding: 4px;">
              <strong>Stubble Smoke Trajectory</strong><br/>
              <span>Origin: <b>${t.district}</b></span><br/>
              <span>Delhi Arrival (ETA): <b>${t.delhi_eta_hours} hrs</b></span><br/>
              <span>Delhi PM2.5 Influx: <b>+${t.delhi_impact_pm25_ug_m3} µg/m³</b></span>
            </div>
          `, { sticky: true });

          trajectoryLayerGroupRef.current?.addLayer(polyline);

          // Current plume head position along trajectory based on current hour offset
          const hourOffset = currentPoint?.hour_offset || 0;
          const activeIndex = Math.min(hourOffset, t.trajectory_points.length - 1);
          const currentPos = t.trajectory_points[activeIndex];

          if (currentPos) {
            const headMarker = L.circleMarker([currentPos.lat, currentPos.lon], {
              radius: 6,
              fillColor: "#fbbf24",
              fillOpacity: 0.9,
              color: "#ffffff",
              weight: 2
            });
            trajectoryLayerGroupRef.current?.addLayer(headMarker);
          }
        });
      }
    }
  }, [stations, fires, trajectories, currentPoint, showStations, showFires, showPlumes, onSelectStation]);

  return (
    <div className="relative w-full h-[540px] lg:h-[620px] rounded-2xl overflow-hidden glass-panel border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Layer Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-slate-300 px-1 border-b border-slate-800 pb-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>GIS Display Layers</span>
        </div>

        <button
          onClick={() => setShowStations(!showStations)}
          className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg transition ${
            showStations ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>CPCB Stations ({stations.length})</span>
          </div>
          {showStations ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
        </button>

        <button
          onClick={() => setShowFires(!showFires)}
          className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg transition ${
            showFires ? "bg-red-500/20 text-red-300 border border-red-500/30" : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Stubble Fires ({fires.length})</span>
          </div>
          {showFires ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
        </button>

        <button
          onClick={() => setShowPlumes(!showPlumes)}
          className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg transition ${
            showPlumes ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span>Smoke Trajectories</span>
          </div>
          {showPlumes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-[11px] font-medium">
        <span className="text-slate-400 font-semibold mr-1">AQI Scale:</span>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />Good (0-50)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]" />Sat (51-100)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />Mod (101-200)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />Poor (201-300)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />V.Poor (301-400)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#9333ea]" />Severe (401-450)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#7f1d1d]" />Severe+ (&gt;450)</div>
      </div>
    </div>
  );
};
