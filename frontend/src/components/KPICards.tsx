import React from "react";
import { 
  Gauge, 
  TrendingUp, 
  Layers, 
  Flame, 
  SunDim, 
  Compass
} from "lucide-react";
import type { ForecastSummary, HourlyForecastPoint } from "../types";

interface KPICardsProps {
  summary: ForecastSummary | null;
  currentPoint: HourlyForecastPoint | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ summary, currentPoint }) => {
  if (!summary || !currentPoint) return null;

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (aqi <= 100) return "text-lime-400 bg-lime-500/10 border-lime-500/30";
    if (aqi <= 200) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    if (aqi <= 300) return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    if (aqi <= 400) return "text-red-400 bg-red-500/10 border-red-500/30";
    if (aqi <= 450) return "text-purple-400 bg-purple-500/10 border-purple-500/30";
    return "text-red-500 bg-red-950/50 border-red-700";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1. Current Frame AQI */}
      <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${getAQIColor(currentPoint.aqi)}`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
            {currentPoint.hour_offset === 0 ? "Current Delhi AQI" : `Hour +${currentPoint.hour_offset} AQI`}
          </span>
          <Gauge className="w-4 h-4 opacity-80" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight">{currentPoint.aqi}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-black/40">
            {currentPoint.aqi_category}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-300 flex items-center justify-between">
          <span>PM2.5: {currentPoint.pm25} µg/m³</span>
          <span className="font-semibold text-xs text-cyan-300">{currentPoint.grap_stage.split(' ')[0]}</span>
        </div>
      </div>

      {/* 2. 72h Peak Projected AQI */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            72h Max Projected
          </span>
          <TrendingUp className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-purple-400">{summary.peak_aqi_72h}</span>
          <span className="text-xs font-medium text-slate-400">AQI Peak</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Avg PM2.5: {summary.avg_pm25_72h} µg</span>
          <span className="text-purple-300 font-semibold">Critical Trap</span>
        </div>
      </div>

      {/* 3. Inversion Strength & PBL */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Inversion & PBL
          </span>
          <Layers className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-cyan-300">
            {currentPoint.inversion_strength_c_100m} <span className="text-xs font-normal text-slate-400">°C/100m</span>
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
          <span>PBL: {currentPoint.pbl_height_m} m</span>
          <span className={currentPoint.inversion_layer_active ? "text-amber-400 font-bold" : "text-emerald-400"}>
            {currentPoint.inversion_layer_active ? "Inversion Active" : "Neutral/Mixed"}
          </span>
        </div>
      </div>

      {/* 4. Stubble Smoke Share */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Stubble Smoke Share
          </span>
          <Flame className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-amber-400">{currentPoint.stubble_contribution_pct}%</span>
          <span className="text-xs text-slate-400">of PM2.5</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Urban: {currentPoint.urban_contribution_pct}%</span>
          <span className="text-amber-300 font-medium">NW Advection</span>
        </div>
      </div>

      {/* 5. Aerosol Solar Dimming */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Radiative Forcing
          </span>
          <SunDim className="w-4 h-4 text-rose-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-rose-300">
            -{currentPoint.radiative_forcing_w_m2} <span className="text-xs font-normal text-slate-400">W/m²</span>
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Feedback Dimming</span>
          <span className="text-rose-400 font-medium">2-Way Coupled</span>
        </div>
      </div>

      {/* 6. Meteorology */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Surface Meteorology
          </span>
          <Compass className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-indigo-300">{currentPoint.temp_c}°C</span>
          <span className="text-xs text-slate-400">RH {currentPoint.humidity_pct}%</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{currentPoint.wind_speed_kmh} km/h</span>
          <span className="text-cyan-300 font-semibold">{currentPoint.wind_dir_compass} ({currentPoint.wind_dir_deg}°)</span>
        </div>
      </div>
    </div>
  );
};
