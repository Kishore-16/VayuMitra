import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { CanvasWindLayer } from "./WindCanvasLayer";
import type { CPCBStation, StubbleFire, PlumeTrajectory, HourlyForecastPoint, CartoConfig, AnomalyFocus } from "../types";
import { fetchCartoConfig } from "../services/api";
import {
  Layers,
  Flame,
  Wind,
  MapPin,
  Eye,
  EyeOff,
  Compass,
  Maximize2,
  Minimize2,
  Globe,
  Radio,
  Sparkles,
  Map as MapIcon,
  Activity
} from "lucide-react";

interface GISMapProps {
  stations: CPCBStation[];
  fires: StubbleFire[];
  trajectories: PlumeTrajectory[];
  currentPoint: HourlyForecastPoint | null;
  onSelectStation: (station: CPCBStation) => void;
  windGrid?: any;
  anomalyFocus?: AnomalyFocus | null;
  onAnomalyFocusCleared?: () => void;
}

export const GISMap: React.FC<GISMapProps> = ({
  stations,
  fires,
  trajectories,
  currentPoint,
  onSelectStation,
  windGrid,
  anomalyFocus,
  onAnomalyFocusCleared
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const stationLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const fireLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const windVectorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerGroupRef = useRef<L.GeoJSON | null>(null);
  const windCanvasLayerRef = useRef<CanvasWindLayer | null>(null);
  const anomalyMarkerRef = useRef<L.Marker | null>(null);


  // CARTO Config State
  const [cartoConfig, setCartoConfig] = useState<CartoConfig | null>(null);
  const [selectedBasemap, setSelectedBasemap] = useState<string>("dark_matter");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layer visibility toggles
  const [showStations, setShowStations] = useState(true);
  const [showFires, setShowFires] = useState(true);
  const [showPlumes, setShowPlumes] = useState(true);
  const [showWindVectors, setShowWindVectors] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAirshed, setShowAirshed] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(true);

  // AQI color scale
  const getAQIColorHex = (aqi: number) => {
    if (aqi <= 50) return "#10b981"; // Good (Green)
    if (aqi <= 100) return "#84cc16"; // Satisfactory (Light green)
    if (aqi <= 200) return "#eab308"; // Moderate (Yellow)
    if (aqi <= 300) return "#f97316"; // Poor (Orange)
    if (aqi <= 400) return "#ef4444"; // Very Poor (Red)
    if (aqi <= 450) return "#a855f7"; // Severe (Purple)
    return "#881337"; // Severe+ (Maroon)
  };

  // Fetch Carto config on mount
  useEffect(() => {
    fetchCartoConfig()
      .then((cfg) => {
        setCartoConfig(cfg);
        if (cfg.default_basemap) setSelectedBasemap(cfg.default_basemap);
      })
      .catch((err) => console.warn("Using fallback CARTO tile settings:", err));
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [29.6, 76.8], // Centered between Punjab agriculture & Delhi-NCR
      zoom: 7.5,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: false
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Initial Dark Basemap (Esri Dark Gray Canvas)
    const baseTile = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ | CPCB & NASA FIRMS',
        maxZoom: 16
      }
    ).addTo(map);

    tileLayerRef.current = baseTile;

    // Layer groups
    heatmapLayerGroupRef.current = L.layerGroup().addTo(map);
    windVectorLayerGroupRef.current = L.layerGroup().addTo(map);
    trajectoryLayerGroupRef.current = L.layerGroup().addTo(map);
    fireLayerGroupRef.current = L.layerGroup().addTo(map);
    stationLayerGroupRef.current = L.layerGroup().addTo(map);

    windCanvasLayerRef.current = new CanvasWindLayer().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Carto Basemap Style
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Remove existing tile layer & labels
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    if (selectedBasemap === "satellite_hybrid") {
      // Esri Satellite
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: 'Imagery &copy; Esri',
          maxZoom: 19
        }
      ).addTo(map);

      labelsLayerRef.current = L.tileLayer(
        "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
          zIndex: 400,
          opacity: 0.7
        }
      ).addTo(map);
    } else if (selectedBasemap === "positron") {
      // Esri Light Gray Canvas
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 16
        }
      ).addTo(map);
    } else if (selectedBasemap === "voyager") {
      // OpenStreetMap Default
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(map);
    } else if (selectedBasemap === "mappls") {
      // Fallback OSM HOT if MapmyIndia REST is blocked
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(map);
    } else {
      // Esri Dark Gray Canvas (Default)
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 16
        }
      ).addTo(map);
    }
  }, [selectedBasemap]);

  // Fly-to and pin anomaly location when focus changes
  useEffect(() => {
    if (!mapInstanceRef.current || !anomalyFocus) return;
    const map = mapInstanceRef.current;

    // Remove old anomaly marker
    if (anomalyMarkerRef.current) {
      map.removeLayer(anomalyMarkerRef.current);
      anomalyMarkerRef.current = null;
    }

    // FlyTo with high zoom — locked to coordinate regardless of user zoom
    map.flyTo([anomalyFocus.lat, anomalyFocus.lon], 14, { duration: 1.5 });

    // Drop a pulsing anomaly pin that stays fixed
    const pulseIcon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative; display:flex; align-items:center; justify-content:center; transform:translate(-50%,-50%);">
          <div style="
            position:absolute;
            width:48px; height:48px;
            border-radius:50%;
            background:rgba(239,68,68,0.3);
            animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;
          "></div>
          <div style="
            position:absolute;
            width:28px; height:28px;
            border-radius:50%;
            background:rgba(239,68,68,0.5);
            animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;
            animation-delay:0.3s;
          "></div>
          <div style="
            width:16px; height:16px;
            border-radius:50%;
            background:#ef4444;
            border:3px solid #fff;
            box-shadow:0 0 16px #ef4444;
            z-index:10;
          "></div>
        </div>
        <div style="
          margin-top:8px;
          transform:translateX(-50%);
          white-space:nowrap;
          background:#0f172a;
          border:1px solid #ef4444;
          border-radius:8px;
          padding:3px 8px;
          font-size:11px;
          font-weight:700;
          color:#fca5a5;
          box-shadow:0 0 12px rgba(239,68,68,0.4);
        ">⚠️ ${anomalyFocus.severity}: ${anomalyFocus.name}</div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker([anomalyFocus.lat, anomalyFocus.lon], { icon: pulseIcon, zIndexOffset: 9999 });
    marker.addTo(map);
    marker.bindPopup(`
      <div style="font-size:13px; padding:4px;">
        <strong style="color:#ef4444;">⚠️ Industrial Anomaly</strong><br/>
        <b>${anomalyFocus.name}</b><br/>
        Severity: <b style="color:${anomalyFocus.severity === 'CRITICAL' ? '#ef4444' : '#f97316'}">${anomalyFocus.severity}</b><br/>
        <span style="font-size:10px; color:#94a3b8;">${anomalyFocus.lat.toFixed(4)}, ${anomalyFocus.lon.toFixed(4)}</span>
      </div>
    `).openPopup();

    anomalyMarkerRef.current = marker;
  }, [anomalyFocus]);

  // Airshed Boundary Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (boundaryLayerGroupRef.current) {
      map.removeLayer(boundaryLayerGroupRef.current);
      boundaryLayerGroupRef.current = null;
    }

    if (showAirshed && cartoConfig?.airshed_geojson) {
      const geoLayer = L.geoJSON(cartoConfig.airshed_geojson, {
        style: (feature) => {
          if (feature?.properties?.type === "inflow_corridor") {
            return {
              color: "#f59e0b",
              weight: 1.5,
              opacity: 0.6,
              fillColor: "#fbbf24",
              fillOpacity: 0.06,
              dashArray: "4, 6"
            };
          }
          return {
            color: "#38bdf8",
            weight: 2,
            opacity: 0.8,
            fillColor: "#0ea5e9",
            fillOpacity: 0.08,
            dashArray: "5, 5"
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            layer.bindTooltip(
              `<div style="font-size: 11px; padding: 2px;">
                <strong style="color: #38bdf8;">${feature.properties.name}</strong><br/>
                <span style="color: #94a3b8;">${feature.properties.regulatory_body || feature.properties.dominant_wind || ""}</span>
              </div>`,
              { sticky: true }
            );
          }
        }
      }).addTo(map);

      boundaryLayerGroupRef.current = geoLayer;
    }
  }, [showAirshed, cartoConfig]);

  // Update Data Layers (Stations, Stubble Fires, Trajectories, Wind, Heatmap)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const hourOffset = currentPoint?.hour_offset || 0;

    // 1. Spatial PM2.5 Dispersion Heatmap / Contours
    if (heatmapLayerGroupRef.current) {
      heatmapLayerGroupRef.current.clearLayers();
      if (showHeatmap && stations.length > 0) {
        // Render radial gradient dispersion halos around key monitoring centroids
        stations.forEach((s) => {
          const stForecast = s.forecast_72h && s.forecast_72h[hourOffset];
          const aqi = stForecast ? stForecast.aqi : s.current_aqi;
          const pm25 = stForecast ? stForecast.pm25 : s.current_pm25;
          const color = getAQIColorHex(aqi);
          const radiusMeters = Math.min(18000, Math.max(7000, pm25 * 55));

          const halo = L.circle([s.lat, s.lon], {
            radius: radiusMeters,
            stroke: false,
            fillColor: color,
            fillOpacity: aqi > 350 ? 0.22 : 0.14
          });

          heatmapLayerGroupRef.current?.addLayer(halo);
        });
      }
    }

    // 2. Wind Flow Vectors across the Airshed (Windy.com style particles)
    if (windCanvasLayerRef.current) {
      if (showWindVectors && windGrid && windGrid.snapshots) {
        // Get the specific snapshot for the current hour offset
        const snapshot = windGrid.snapshots.find((s: any) => s.hour_offset === hourOffset) || windGrid.snapshots[0];
        windCanvasLayerRef.current.setData({
          grid: snapshot.grid,
          grid_meta: windGrid.grid_meta
        });
        
        // Show layer if it was hidden
        if (!mapInstanceRef.current?.hasLayer(windCanvasLayerRef.current)) {
           windCanvasLayerRef.current.addTo(mapInstanceRef.current!);
        }
      } else {
        // Clear data or remove layer if hidden
        windCanvasLayerRef.current.setData(null);
        if (mapInstanceRef.current?.hasLayer(windCanvasLayerRef.current)) {
           mapInstanceRef.current.removeLayer(windCanvasLayerRef.current);
        }
      }
    }

    // 3. CPCB Stations Layer
    if (stationLayerGroupRef.current) {
      stationLayerGroupRef.current.clearLayers();
      if (showStations) {
        stations.forEach((s) => {
          const stForecast = s.forecast_72h && s.forecast_72h[hourOffset];
          const aqi = stForecast ? stForecast.aqi : s.current_aqi;
          const cat = stForecast ? stForecast.aqi_category : s.aqi_category;
          const pm25 = stForecast ? stForecast.pm25 : s.current_pm25;
          const color = getAQIColorHex(aqi);
          const isSevere = aqi > 400;

          const customIcon = L.divIcon({
            className: "custom-station-pin",
            html: `
              <div style="
                background: ${color}; 
                color: #ffffff; 
                font-weight: 800; 
                font-size: 11px; 
                padding: 3px 7px; 
                border-radius: 9999px; 
                border: 2px solid #0f172a; 
                box-shadow: 0 0 ${isSevere ? "16px #ef4444" : "10px " + color + "88"};
                display: flex;
                align-items: center;
                gap: 3px;
                transform: translate(-50%, -50%);
                white-space: nowrap;
                cursor: pointer;
                transition: transform 0.2s;
              ">
                ${isSevere ? '<span style="font-size: 9px; animation: pulse 1s infinite;">⚠️</span>' : ""}
                <span>${aqi}</span>
              </div>
            `,
            iconSize: [34, 22],
            iconAnchor: [17, 11]
          });

          const marker = L.marker([s.lat, s.lon], { icon: customIcon });

          marker.on("click", () => {
            onSelectStation(s);
          });

          marker.bindTooltip(
            `
            <div style="font-family: inherit; font-size: 12px; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                <span style="font-size: 14px;">📡</span>
                <strong style="color: #38bdf8;">${s.name}</strong>
              </div>
              <div>AQI: <b style="color: ${color}">${aqi} (${cat})</b></div>
              <div>PM2.5: <b>${pm25} µg/m³</b> | PM10: <b>${s.current_pm10}</b></div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${s.city}, ${s.state} • ${s.type}</div>
              <div style="color: #0ea5e9; font-size: 10px; margin-top: 4px; font-weight: 600;">👉 Click for 72h chemical sounding profile</div>
            </div>
          `,
            { direction: "top", offset: [0, -10] }
          );

          stationLayerGroupRef.current?.addLayer(marker);
        });
      }
    }

    // 4. Stubble Burning Fire Layer (NASA FIRMS VIIRS)
    if (fireLayerGroupRef.current) {
      fireLayerGroupRef.current.clearLayers();
      if (showFires) {
        fires.forEach((f) => {
          const radius = Math.min(24, Math.max(9, Math.sqrt(f.mean_frp_mw) * 1.9));

          const fireIcon = L.divIcon({
            className: "firms-fire-marker",
            html: `
              <div style="
                position: relative;
                width: ${radius * 2}px;
                height: ${radius * 2}px;
                background: radial-gradient(circle, rgba(239, 68, 68, 0.95) 0%, rgba(249, 115, 22, 0.7) 50%, rgba(239, 68, 68, 0) 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 ${radius}px rgba(239, 68, 68, 0.8);
              ">
                <div style="
                  width: 7px;
                  height: 7px;
                  background: #fef08a;
                  border-radius: 50%;
                  box-shadow: 0 0 8px #f59e0b;
                "></div>
              </div>
            `,
            iconSize: [radius * 2, radius * 2],
            iconAnchor: [radius, radius]
          });

          const marker = L.marker([f.lat, f.lon], { icon: fireIcon });

          marker.bindTooltip(
            `
            <div style="font-size: 12px; padding: 4px;">
              <strong style="color: #f97316;">🔥 Stubble Fire Cluster</strong><br/>
              <span>District: <b>${f.district}, ${f.state}</b></span><br/>
              <span>Active Fires: <b>${f.active_fires}</b></span><br/>
              <span>Mean FRP: <b>${f.mean_frp_mw} MW</b></span><br/>
              <span>Plume Injection Ht: <b>${f.plume_injection_height_m} m</b></span><br/>
              <span>Emission Rate: <b>${f.estimated_emission_rate_kg_s} kg/s</b></span><br/>
              <span style="font-size: 10px; color: #94a3b8;">Source: NASA VIIRS (FIRMS)</span>
            </div>
          `,
            { direction: "top" }
          );

          fireLayerGroupRef.current?.addLayer(marker);
        });
      }
    }

    // 5. Smoke Dispersion Plume Trajectories
    if (trajectoryLayerGroupRef.current) {
      trajectoryLayerGroupRef.current.clearLayers();
      if (showPlumes) {
        trajectories.forEach((t) => {
          const latlngs = t.trajectory_points.map(
            (pt) => [pt.lat, pt.lon] as [number, number]
          );

          // Lagrangian dispersion polyline
          const polyline = L.polyline(latlngs, {
            color: "#f59e0b",
            weight: 3.5,
            opacity: 0.8,
            dashArray: "6, 8",
            lineCap: "round"
          });

          polyline.bindTooltip(
            `
            <div style="font-size: 12px; padding: 4px;">
              <strong style="color: #fbbf24;">🌪️ Lagrangian Stubble Plume Path</strong><br/>
              <span>Origin: <b>${t.district}, ${t.state}</b></span><br/>
              <span>Source FRP: <b>${t.frp_mw} MW</b></span><br/>
              <span>Delhi Arrival (ETA): <b style="color: #f59e0b;">+${t.delhi_eta_hours} hrs</b></span><br/>
              <span>Predicted Delhi PM2.5 Impact: <b style="color: #ef4444;">+${t.delhi_impact_pm25_ug_m3} µg/m³</b></span>
            </div>
          `,
            { sticky: true }
          );

          trajectoryLayerGroupRef.current?.addLayer(polyline);

          // Current plume head position along trajectory synced with scrubber hour
          const activeIndex = Math.min(hourOffset, t.trajectory_points.length - 1);
          const currentPos = t.trajectory_points[activeIndex];

          if (currentPos) {
            const headMarker = L.circleMarker([currentPos.lat, currentPos.lon], {
              radius: 6,
              fillColor: "#f59e0b",
              fillOpacity: 0.95,
              color: "#ffffff",
              weight: 2
            });

            headMarker.bindTooltip(`
              <div style="font-size: 11px;">
                <strong>Plume Front @ Hour +${hourOffset}</strong><br/>
                <span>Altitude: ${currentPos.altitude_m} m</span><br/>
                <span>PM2.5: ${currentPos.pm25_concentration} µg/m³</span>
              </div>
            `);

            trajectoryLayerGroupRef.current?.addLayer(headMarker);
          }
        });
      }
    }
  }, [
    stations,
    fires,
    trajectories,
    currentPoint,
    showStations,
    showFires,
    showPlumes,
    showWindVectors,
    showHeatmap,
    onSelectStation
  ]);

  // Jump camera to preset spatial regions
  const jumpToRegion = (key: string) => {
    if (!mapInstanceRef.current) return;
    const presets = cartoConfig?.presets;
    if (presets && presets[key]) {
      const p = presets[key];
      mapInstanceRef.current.flyTo(p.center, p.zoom, { duration: 1.2 });
    } else {
      if (key === "delhi_ncr") mapInstanceRef.current.flyTo([28.6139, 77.209], 10, { duration: 1.2 });
      if (key === "stubble_belt") mapInstanceRef.current.flyTo([30.45, 75.85], 8, { duration: 1.2 });
      if (key === "regional_basin") mapInstanceRef.current.flyTo([29.6, 76.8], 7, { duration: 1.2 });
    }
  };

  return (
    <div
      className={`relative w-full ${
        isFullscreen ? "fixed inset-0 z-50 h-screen rounded-none" : "h-[560px] lg:h-[640px] rounded-2xl"
      } overflow-hidden glass-panel border border-slate-800 shadow-2xl transition-all duration-300`}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Header Overlay: CARTO Status & Presets */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* CARTO Connection Badge & Title */}
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-black tracking-wide text-white">CARTO GIS ENGINE</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{cartoConfig?.carto_connected ? "Carto API Connected" : "CARTO Tiles Active"}</span>
          </div>
          {cartoConfig?.carto_api_key_masked && (
            <span className="hidden sm:inline text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
              {cartoConfig.carto_api_key_masked}
            </span>
          )}
        </div>

        {/* Region Quick Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> Focus:
          </span>
          <button
            onClick={() => jumpToRegion("delhi_ncr")}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/30 transition"
          >
            Delhi-NCR
          </button>
          <button
            onClick={() => jumpToRegion("stubble_belt")}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-orange-500/20 text-slate-200 hover:text-orange-300 border border-slate-700 hover:border-orange-500/30 transition"
          >
            🔥 Punjab Fires
          </button>
          <button
            onClick={() => jumpToRegion("regional_basin")}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-indigo-500/20 text-slate-200 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/30 transition"
          >
            🌐 Regional Basin
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating GIS Layer Controls Drawer (Left side) */}
      <div className="absolute top-16 left-3 z-10 flex flex-col gap-2 p-3 rounded-2xl bg-slate-900/95 border border-slate-700/90 backdrop-blur-xl shadow-2xl text-xs font-semibold w-64 max-h-[calc(100%-80px)] overflow-y-auto">
        <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">CARTO Layers & Styles</span>
          </div>
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="text-[10px] text-cyan-400 hover:underline"
          >
            {showLayerPanel ? "Hide" : "Show"}
          </button>
        </div>

        {showLayerPanel && (
          <div className="space-y-3 pt-1">
            {/* Basemap Switcher */}
            <div>
              <div className="text-[11px] text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" /> Basemap Style
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSelectedBasemap("dark_matter")}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                    selectedBasemap === "dark_matter"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                      : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  🌙 Dark Matter
                </button>
                <button
                  onClick={() => setSelectedBasemap("positron")}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                    selectedBasemap === "positron"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                      : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  ☀️ Positron Light
                </button>
                <button
                  onClick={() => setSelectedBasemap("voyager")}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                    selectedBasemap === "voyager"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                      : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  🗺️ Voyager
                </button>
                <button
                  onClick={() => setSelectedBasemap("satellite_hybrid")}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                    selectedBasemap === "satellite_hybrid"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                      : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  🛰️ Satellite
                </button>
                <button
                  onClick={() => setSelectedBasemap("mappls")}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
                    selectedBasemap === "mappls"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                      : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  🇮🇳 MapmyIndia
                </button>
              </div>
            </div>

            {/* Overlays */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <MapIcon className="w-3 h-3 text-cyan-400" /> Operational Overlays
              </div>

              {/* Stations */}
              <button
                onClick={() => setShowStations(!showStations)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition ${
                  showStations
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CPCB Stations ({stations.length})</span>
                </div>
                {showStations ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </button>

              {/* Fires */}
              <button
                onClick={() => setShowFires(!showFires)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition ${
                  showFires
                    ? "bg-red-500/15 text-red-300 border border-red-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>NASA Fires ({fires.length})</span>
                </div>
                {showFires ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </button>

              {/* Trajectories */}
              <button
                onClick={() => setShowPlumes(!showPlumes)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition ${
                  showPlumes
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-amber-400" />
                  <span>Smoke Plume Vectors</span>
                </div>
                {showPlumes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </button>

              {/* Wind Vector Field */}
              <button
                onClick={() => setShowWindVectors(!showWindVectors)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition ${
                  showWindVectors
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Wind Flow Field</span>
                </div>
                {showWindVectors ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </button>

              {/* AQI Dispersion Halo */}
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition ${
                  showHeatmap
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Spatial AQI Halos</span>
                </div>
                {showHeatmap ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </button>

              {/* Statutory Airshed Boundary */}
              <button
                onClick={() => setShowAirshed(!showAirshed)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition ${
                  showAirshed
                    ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>CAQM Airshed Boundary</span>
                </div>
                {showAirshed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-10 hidden md:flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-[11px] font-medium">
        <span className="text-slate-400 font-bold mr-1">AQI Scale:</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          <span>0-50</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]" />
          <span>51-100</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
          <span>101-200</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
          <span>201-300</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          <span>301-400</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
          <span>401-450</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#881337]" />
          <span>&gt;450</span>
        </div>
      </div>
    </div>
  );
};

export default GISMap;
