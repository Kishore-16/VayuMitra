import React from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { AlertCircle, ArrowUpRight, Wind, Layers, ShieldAlert, Cpu, Download } from 'lucide-react';

const customMarkerIcon = (color) => L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

export default function CommandCenter({ forecastData, zonesData, onZoneSelect, selectedZone }) {
  if (!forecastData) return null;

  const { series, peakForecast, explanationText, plumeAnalysis, initialObservations } = forecastData;
  const currentAQI = series[0]?.aqi || 318;
  const currentPM25 = series[0]?.pm25 || 184.2;
  const currentISI = series[0]?.isi || 0.68;
  const currentPBL = series[0]?.pblHeightM || 180;

  const chartData = series.map((s) => ({
    time: `+${s.hourOffset}h`,
    AQI: s.aqi,
    PM25: s.pm25,
    ISI: Math.round(s.isi * 100),
    PBL: s.pblHeightM
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Operational Header Banner */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-white/5 shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] bg-aqi-severe/25 text-aqi-very-poor uppercase font-bold tracking-wider border border-aqi-severe/40">
              Operational Alert: GRAP Stage III/IV Severe
            </span>
            <span className="text-text-tertiary">|</span>
            <span className="text-xs text-secondary font-mono">
              National Capital Region Coupled Air Quality Command
            </span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            NCR Tropospheric Situational Command Console
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-high border border-white/5 text-xs">
            <Cpu className="w-4 h-4 text-secondary" />
            <div>
              <span className="text-text-tertiary block text-[10px] leading-none">Model Engine</span>
              <span className="text-tertiary font-bold leading-none mt-0.5 block">Surrogate Coupled v1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-high border border-white/5 text-xs">
            <ShieldAlert className="w-4 h-4 text-aqi-very-poor" />
            <div>
              <span className="text-text-tertiary block text-[10px] leading-none">Telemetry Feed</span>
              <span className="text-text-primary font-bold leading-none mt-0.5 block">40 CPCB + 12 IMD Live</span>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-surface font-semibold text-xs transition-all shadow-md">
            <Download className="w-3.5 h-3.5" />
            <span>MoES Brief PDF</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Key Telemetry Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Composite AQI */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase text-text-tertiary font-bold tracking-wider block">
                Composite City AQI
              </span>
              <span className="text-xs text-text-secondary">NCR 24-Station Rolling Mean</span>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-aqi-very-poor/20 text-aqi-very-poor">
              {series[0]?.aqiCategory}
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold font-mono text-aqi-very-poor tracking-tight">
                {currentAQI}
              </span>
              <span className="text-xs text-text-tertiary">AQI</span>
            </div>
            <div className="flex flex-col items-end text-xs text-aqi-very-poor font-bold">
              <span className="flex items-center"><ArrowUpRight className="w-4 h-4" /> +42 pts</span>
              <span className="text-[10px] text-text-tertiary font-normal">vs 24h prior</span>
            </div>
          </div>
          <div className="w-full text-xs text-text-tertiary pt-2 border-t border-white/5 flex justify-between font-mono">
            <span>Peak Forecast:</span>
            <span className="text-aqi-severe font-bold">{peakForecast.aqi} AQI at +{peakForecast.hourOffset}h</span>
          </div>
        </div>

        {/* PM2.5 Concentration */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase text-text-tertiary font-bold tracking-wider block">
                Fine Particulate PM2.5
              </span>
              <span className="text-xs text-text-secondary">Standard: 60 µg/m³</span>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-aqi-severe/25 text-aqi-severe">
              3.07× Exceedance
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold font-mono text-text-primary tracking-tight">
                {currentPM25}
              </span>
              <span className="text-xs text-text-tertiary">µg/m³</span>
            </div>
            <span className="text-xs font-bold text-aqi-severe">High Risk</span>
          </div>
          <div className="w-full text-xs text-text-tertiary pt-2 border-t border-white/5 flex justify-between font-mono">
            <span>PM10 Equivalent:</span>
            <span className="text-text-primary font-bold">{(currentPM25 * 1.62).toFixed(1)} µg/m³</span>
          </div>
        </div>

        {/* Inversion Strength Index */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase text-text-tertiary font-bold tracking-wider block">
                Inversion Strength (ISI)
              </span>
              <span className="text-xs text-text-secondary">Lapse Rate Gradient</span>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-aqi-severe/20 text-aqi-very-poor">
              {series[0]?.inversionCategory || 'High'}
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold font-mono text-secondary tracking-tight">
                {currentISI}
              </span>
              <span className="text-xs text-text-tertiary">ISI (0-1)</span>
            </div>
            <div className="flex flex-col items-end text-xs text-secondary">
              <span className="font-mono font-bold">PBL: {currentPBL}m</span>
              <span className="text-[10px] text-text-tertiary">Compressed</span>
            </div>
          </div>
          <div className="w-full text-xs text-text-tertiary pt-2 border-t border-white/5 flex justify-between font-mono">
            <span>Mixing Height:</span>
            <span className="text-secondary font-bold">Low Vertical Dispersion</span>
          </div>
        </div>

        {/* Stubble Plume Ingress */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase text-text-tertiary font-bold tracking-wider block">
                Stubble Plume Ingress
              </span>
              <span className="text-xs text-text-secondary">Punjab/Haryana FRP Flux</span>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-tertiary/20 text-tertiary">
              {plumeAnalysis.alertLevel}
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold font-mono text-tertiary tracking-tight">
                +{plumeAnalysis.estimatedPM25Contrib}
              </span>
              <span className="text-xs text-text-tertiary">µg/m³</span>
            </div>
            <div className="text-right text-xs text-tertiary font-bold">
              <span>ETA {plumeAnalysis.etaHours}h</span>
            </div>
          </div>
          <div className="w-full text-xs text-text-tertiary pt-2 border-t border-white/5 flex justify-between font-mono">
            <span>Active Fires FRP:</span>
            <span className="text-tertiary font-bold">{plumeAnalysis.totalFRP} MW</span>
          </div>
        </div>
      </div>

      {/* Row 2: 72-Hour Coupled Forecast Chart & Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts 72h Coupled Forecast */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">
                72-Hour Coupled Weather-Chemistry Trajectory
              </h2>
              <p className="text-xs text-text-tertiary">
                Two-way coupled integration: Wind + Inversion Trapping + Aerosol Solar Forcing
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-primary-container/30 text-secondary text-xs font-mono font-semibold">
              3h Time-Step
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aqiColorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E13B3B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#E13B3B" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232a39" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 500]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151b2a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="AQI" stroke="#E13B3B" strokeWidth={3} fillOpacity={1} fill="url(#aqiColorGrad)" name="Air Quality Index (AQI)" />
                <Line type="monotone" dataKey="PM25" stroke="#5de6ff" strokeWidth={2} name="PM2.5 (µg/m³)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-white/5 text-xs text-text-tertiary">
            <div className="flex items-center gap-4 font-mono">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-aqi-very-poor rounded"></span> AQI Curve</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-secondary rounded"></span> PM2.5 Concentration</span>
            </div>
            <span className="text-secondary font-mono">Peak: {peakForecast.aqi} AQI at +{peakForecast.hourOffset}h ({peakForecast.grapStage})</span>
          </div>
        </div>

        {/* Explainability Engine Panel */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-secondary" />
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">Cause ➔ Effect Engine</h2>
              <p className="text-xs text-text-tertiary">Natural Language Diagnostics</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-white/5 text-xs leading-relaxed text-text-secondary space-y-3 my-auto">
            <div className="flex items-center gap-2 text-secondary font-mono font-semibold">
              <AlertCircle className="w-4 h-4" /> Forecast Diagnosis (+{peakForecast.hourOffset}h)
            </div>
            <p className="text-text-primary font-medium italic">
              "{explanationText}"
            </p>
          </div>

          <div className="p-3 rounded-xl bg-aqi-severe/15 border border-aqi-severe/30 mt-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-aqi-very-poor font-mono tracking-wider">
              GRAP Action Advisor
            </span>
            <p className="text-xs font-semibold text-text-primary">
              {forecastData.grapAction}
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Delhi NCR Interactive Leaflet Map */}
      <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              NCR Spatial AQI & Inversion Zone Map
            </h2>
            <p className="text-xs text-text-tertiary">
              Continuous 8-zone telemetry monitoring with real-time AQI choropleth markers
            </p>
          </div>
          <span className="text-xs text-secondary font-mono">
            Click any zone pin to switch active telemetry focus
          </span>
        </div>

        <div className="w-full h-80 rounded-xl overflow-hidden border border-white/10 relative">
          <MapContainer center={[28.6139, 77.2090]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {zonesData && zonesData.map((z) => (
              <React.Fragment key={z.id}>
                <Circle
                  center={[z.lat, z.lon]}
                  radius={4500}
                  pathOptions={{ color: z.aqiColor, fillColor: z.aqiColor, fillOpacity: 0.25, weight: 1 }}
                />
                <Marker
                  position={[z.lat, z.lon]}
                  icon={customMarkerIcon(z.aqiColor)}
                  eventHandlers={{
                    click: () => onZoneSelect && onZoneSelect(z.id)
                  }}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <p className="font-bold text-white">{z.name}</p>
                      <p className="text-text-secondary mt-0.5">AQI: <span className="font-mono font-bold" style={{ color: z.aqiColor }}>{z.currentAQI} ({z.aqiCategory})</span></p>
                      <p className="text-text-tertiary text-[10px]">PM2.5: {z.currentPM25} µg/m³</p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
