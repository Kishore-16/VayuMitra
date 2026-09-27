import React from 'react';
import { HeartPulse, AlertCircle, ShieldCheck, Home, Activity } from 'lucide-react';

export default function PublicCitizenView({ forecastData }) {
  if (!forecastData) return null;

  const currentStep = forecastData.series[0] || {};
  const { aqi = 318, aqiCategory = "Very Poor", aqiColor = "#E13B3B", pm25 = 184.2 } = currentStep;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Hero AQI Card */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-surface-container-low border border-white/10 shadow-2xl flex flex-col items-center text-center">
        {/* Glow behind card */}
        <div className="absolute -top-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: aqiColor }}></div>

        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white/5 text-text-secondary border border-white/10">
            Delhi NCR Public Citizen Bulletin
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
          Current Air Quality Advisory
        </h1>
        <p className="text-xs text-text-tertiary mt-1 mb-6">
          MoES · CPCB Public Health Guidance System
        </p>

        {/* Large AQI Badge */}
        <div className="my-2 flex flex-col items-center">
          <div
            className="w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl transition-transform hover:scale-105"
            style={{ backgroundColor: `${aqiColor}15`, borderColor: aqiColor }}
          >
            <span className="text-5xl font-extrabold font-mono tracking-tight" style={{ color: aqiColor }}>
              {aqi}
            </span>
            <span className="text-xs font-bold uppercase mt-1" style={{ color: aqiColor }}>
              {aqiCategory}
            </span>
          </div>
          <span className="text-xs text-text-secondary font-mono mt-4">
            Fine Particulate (PM2.5): <span className="font-bold text-text-primary">{pm25} µg/m³</span>
          </span>
        </div>
      </div>

      {/* Sensitive Groups Warning */}
      <div className="p-5 rounded-2xl bg-aqi-very-poor/15 border border-aqi-very-poor/30 flex items-start gap-4">
        <HeartPulse className="w-6 h-6 text-aqi-very-poor flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-text-primary">High Health Risk for Sensitive Groups</h2>
          <p className="text-xs text-text-secondary">
            Children, elderly individuals, pregnant women, and citizens with asthma or respiratory conditions should avoid prolonged outdoor physical activity.
          </p>
        </div>
      </div>

      {/* Practical Action Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-3">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Keep Windows Closed</h3>
          <p className="text-xs text-text-tertiary">
            Keep indoor air clean by closing doors and windows during peak inversion hours (10 PM to 9 AM).
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Wear N95 Respirators</h3>
          <p className="text-xs text-text-tertiary">
            Use well-fitted N95 or N99 respirator masks when traveling outdoors or commuting along heavy traffic corridors.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center text-tertiary mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Use Air Purifiers</h3>
          <p className="text-xs text-text-tertiary">
            Operate HEPA air purifiers in living areas and bedrooms, especially for vulnerable family members.
          </p>
        </div>
      </div>
    </div>
  );
}
