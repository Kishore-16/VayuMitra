import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Flame, Wind, Clock, Navigation, AlertTriangle } from 'lucide-react';

const fireMarkerIcon = L.divIcon({
  className: 'custom-fire-marker',
  html: `<div style="background-color: #FF5722; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px #FF5722; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">🔥</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const delhiMarkerIcon = L.divIcon({
  className: 'custom-delhi-marker',
  html: `<div style="background-color: #00CBE6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px #00CBE6;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export default function PlumeTracker({ plumeData }) {
  const [selectedHour, setSelectedHour] = useState(24);

  if (!plumeData) return null;

  const { activeFiresCount, totalFRP, etaHours, estimatedPM25Contrib, windDirectionLabel, plumeTimeline } = plumeData;
  const currentStep = plumeTimeline.find(p => p.hour === selectedHour) || plumeTimeline[3];

  // Advection line from Sangrur (30.24, 75.84) to Delhi (28.6139, 77.2090)
  const trajectoryCoords = [
    [30.24, 75.84],
    [29.40, 76.50],
    [28.6139, 77.2090]
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] bg-tertiary/20 text-tertiary font-mono font-semibold uppercase">
              NASA VIIRS NRT + Lagrangian Dispersion
            </span>
            <span className="text-text-tertiary">|</span>
            <span className="text-xs text-secondary font-mono">SIH Mandatory Scope Item D</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Stubble-Burning Plume Dispersion Tracker
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            Advection trajectory & PM2.5 plume arrival flux modeling over Delhi NCR
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 text-center">
            <span className="text-text-tertiary text-[10px] block">Active Fires</span>
            <span className="text-lg font-bold text-text-primary">{activeFiresCount} Hotspots</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 text-center">
            <span className="text-text-tertiary text-[10px] block">Total FRP</span>
            <span className="text-lg font-bold text-tertiary">{totalFRP} MW</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 text-center">
            <span className="text-text-tertiary text-[10px] block">Delhi Arrival ETA</span>
            <span className="text-lg font-bold text-aqi-very-poor">{etaHours} Hours</span>
          </div>
        </div>
      </div>

      {/* Trajectory Time Slider Bar */}
      <div className="p-4 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-primary flex items-center gap-1.5 font-mono">
            <Clock className="w-4 h-4 text-secondary" /> Plume Advection Time Slider
          </span>
          <span className="text-secondary font-mono font-bold">
            Simulated Horizon: {currentStep.timeLabel} ({currentStep.progressPct}% Journey Traveled)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {plumeTimeline.map((step) => (
            <button
              key={step.hour}
              onClick={() => setSelectedHour(step.hour)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedHour === step.hour
                  ? 'bg-primary-container text-white shadow-lg ring-1 ring-secondary'
                  : 'bg-surface-container-high text-text-tertiary hover:bg-surface-container-highest hover:text-text-primary'
              }`}
            >
              {step.timeLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Map & Advection Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Plume Advection Map */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-white/10 h-[450px] relative">
          <MapContainer center={[29.50, 76.20]} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Trajectory Advection Line */}
            <Polyline
              positions={trajectoryCoords}
              pathOptions={{ color: '#FF5722', weight: 3, dashArray: '6, 8', opacity: 0.8 }}
            />

            {/* Simulated Centroid Plume Circle */}
            <Circle
              center={[currentStep.centroid.lat, currentStep.centroid.lon]}
              radius={currentStep.spreadRadiusKm * 1000}
              pathOptions={{ color: '#FF5722', fillColor: '#FF5722', fillOpacity: 0.35, weight: 2 }}
            />

            {/* Punjab Fire Source Marker */}
            <Marker position={[30.24, 75.84]} icon={fireMarkerIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-white">Punjab Stubble Fire Hotspot Cluster</p>
                  <p className="text-text-secondary mt-0.5">FRP: <span className="font-mono text-tertiary font-bold">{totalFRP} MW</span></p>
                </div>
              </Popup>
            </Marker>

            {/* Delhi Target Marker */}
            <Marker position={[28.6139, 77.2090]} icon={delhiMarkerIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-white">Delhi NCR Ingress Zone</p>
                  <p className="text-text-secondary mt-0.5">PM2.5 Plume Flux: <span className="font-mono text-aqi-very-poor font-bold">+{currentStep.estimatedPM25} µg/m³</span></p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Advection Metrics Card */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
              <Navigation className="w-4 h-4 text-secondary" /> Wind Vector & Plume Flux
            </h2>

            <div className="p-3.5 rounded-xl bg-surface-container-high border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-text-tertiary">
                <span>Prevailing Wind Direction:</span>
                <span className="text-text-primary font-mono font-bold">{windDirectionLabel}</span>
              </div>
              <div className="flex justify-between text-text-tertiary">
                <span>Centroid Coordinates:</span>
                <span className="text-secondary font-mono font-bold">{currentStep.centroid.lat}° N, {currentStep.centroid.lon}° E</span>
              </div>
              <div className="flex justify-between text-text-tertiary">
                <span>Gaussian Spread Radius:</span>
                <span className="text-tertiary font-mono font-bold">{currentStep.spreadRadiusKm} km</span>
              </div>
              <div className="flex justify-between text-text-tertiary">
                <span>Delhi PM2.5 Contribution:</span>
                <span className="text-aqi-very-poor font-mono font-bold">+{currentStep.estimatedPM25} µg/m³</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-white/5 text-xs text-text-secondary space-y-2">
              <p className="font-bold text-text-primary flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-aqi-very-poor" /> Dispersion Physics Summary
              </p>
              <p>
                Under calm North-Westerly winds (&lt; 2.5 m/s), stubble smoke undergoes slow advection with low lateral dispersion, resulting in dense concentrated smoke plumes arriving over Delhi NCR.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-tertiary/15 border border-tertiary/30 text-xs text-tertiary font-mono font-semibold">
            Status: Plume Simulation Active ({currentStep.reachedDelhi ? "ARRIVED AT DELHI NCR" : "IN TRANSIT OVER PUNJAB-HARYANA"})
          </div>
        </div>
      </div>
    </div>
  );
}
