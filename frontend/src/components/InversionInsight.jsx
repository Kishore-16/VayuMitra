import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Layers, ArrowRightLeft, ShieldAlert, Cpu, Sun, Thermometer } from 'lucide-react';

export default function InversionInsight({ inversionData, forecastData }) {
  if (!inversionData || !forecastData) return null;

  const { isi, category, color, deltaT, pblHeightM, description, verticalProfile } = inversionData;
  const peak = forecastData.peakForecast;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] bg-secondary/20 text-secondary font-mono font-semibold uppercase">
              Lapse Rate Radiosonde + IMD Vertical Profile
            </span>
            <span className="text-text-tertiary">|</span>
            <span className="text-xs text-tertiary font-mono">SIH Mandatory Scope Item C & E</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Atmospheric Inversion & Boundary Layer Analytics
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            Vertical temperature profile, lapse rate calculations, and two-way aerosol-radiation coupling
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 text-center">
            <span className="text-text-tertiary text-[10px] block font-mono">Inversion Index (ISI)</span>
            <span className="text-2xl font-bold font-mono" style={{ color }}>{isi} ({category})</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 text-center">
            <span className="text-text-tertiary text-[10px] block font-mono">PBL Height</span>
            <span className="text-2xl font-bold font-mono text-secondary">{pblHeightM}m</span>
          </div>
        </div>
      </div>

      {/* Vertical Temp Profile Chart & PBL Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vertical Lapse Profile Recharts Graph */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-secondary" /> Vertical Temperature Lapse Rate (0m ➔ 500m)
              </h2>
              <p className="text-xs text-text-tertiary">
                Positive temperature gradient (+{deltaT}°C) indicates trapped inversion layer
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-surface-container-high text-secondary text-xs font-mono">
              Delta T: +{deltaT}°C
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={verticalProfile} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#232a39" />
                <XAxis type="number" domain={['dataMin - 1', 'dataMax + 1']} stroke="#64748B" fontSize={11} name="Temp (°C)" />
                <YAxis dataKey="altitudeM" type="number" stroke="#64748B" fontSize={11} name="Altitude (m)" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151b2a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#F8FAFC' }}
                />
                <Line type="monotone" dataKey="temperatureC" stroke="#5de6ff" strokeWidth={3} dot={{ r: 5, fill: '#5de6ff' }} name="Temperature (°C)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-white/5 text-xs text-text-secondary mt-3">
            <span className="font-bold text-text-primary">Inversion Diagnostic: </span>
            {description}
          </div>
        </div>

        {/* Boundary Layer Collapse & Coupling Summary */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-tertiary" /> Boundary Layer Compression
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">Vertical mixing ceiling</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-high border border-white/5 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-text-tertiary">Current PBL Height:</span>
              <span className="font-mono font-bold text-secondary">{pblHeightM} meters</span>
            </div>
            <div className="w-full bg-surface-container-lowest h-3 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-aqi-very-poor to-secondary h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (pblHeightM / 800) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-text-tertiary">
              <span>100m (Severe Trap)</span>
              <span>800m (Normal Boundary)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-high/60 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-text-primary">
              <Sun className="w-4 h-4 text-tertiary" /> Aerosol Radiative Forcing
            </div>
            <p className="text-text-secondary">
              Dense PM2.5 aerosol loading reduces surface solar irradiance, producing a simulated <span className="text-secondary font-mono font-bold">{peak.feedbackCoolingC}°C</span> surface cooling feedback that further compresses PBL height.
            </p>
          </div>
        </div>
      </div>

      {/* Two-Way Feedback Cycle Blueprint */}
      <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col gap-4">
        <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-secondary" /> Two-Way Coupled Feedback Loop Mechanics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-surface-container-high border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-tertiary block">Step 1</span>
            <span className="text-xs font-bold text-text-primary block">High PM2.5 Ingress</span>
            <span className="text-[11px] text-text-tertiary block">Ground accumulation</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-high border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-tertiary block">Step 2</span>
            <span className="text-xs font-bold text-secondary block">Solar Radiation Block</span>
            <span className="text-[11px] text-text-tertiary block">AOD optical extinction</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-high border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-tertiary block">Step 3</span>
            <span className="text-xs font-bold text-tertiary block">Surface Cooling</span>
            <span className="text-[11px] text-text-tertiary block">Suppressed convective heat</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-high border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-tertiary block">Step 4</span>
            <span className="text-xs font-bold text-aqi-very-poor block">PBL Compression</span>
            <span className="text-[11px] text-text-tertiary block">Mixing ceiling drops</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-high border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-tertiary block">Step 5</span>
            <span className="text-xs font-bold text-aqi-severe block">Enhanced Inversion</span>
            <span className="text-[11px] text-text-tertiary block">Feedback loop closes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
