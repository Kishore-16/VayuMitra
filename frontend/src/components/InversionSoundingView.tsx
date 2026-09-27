import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine
} from "recharts";
import type { InversionSounding } from "../types";
import { CloudRain, Activity } from "lucide-react";

interface InversionSoundingViewProps {
  sounding: InversionSounding | null;
}

export const InversionSoundingView: React.FC<InversionSoundingViewProps> = ({ sounding }) => {
  if (!sounding) return null;

  const chartData = sounding.levels.map((lvl) => ({
    altitude: lvl.altitude_m,
    temp: lvl.temp_c,
    dewPoint: lvl.dew_point_c,
    lapseRate: lvl.lapse_rate_c_km,
    pm25: lvl.pm25_ug_m3
  }));

  const getVentilationBadge = (vc: number) => {
    if (vc < 2000) {
      return {
        label: "Extremely Stagnant / Severe Trap",
        color: "bg-red-950 text-red-400 border-red-800"
      };
    }
    if (vc < 6000) {
      return {
        label: "Moderate / Sub-optimal Dispersion",
        color: "bg-amber-950 text-amber-400 border-amber-800"
      };
    }
    return {
      label: "Favorable Atmospheric Ventilation",
      color: "bg-emerald-950 text-emerald-400 border-emerald-800"
    };
  };

  const ventBadge = getVentilationBadge(sounding.ventilation_coefficient_m2_s);

  return (
    <div className="space-y-4">
      {/* Sounding Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Inversion Strength Index
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">
              {sounding.inversion_strength_c_100m}
            </span>
            <span className="text-xs text-slate-400">°C / 100m</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {sounding.inversion_strength_c_100m > 3.0 ? "Strong Ground Inversion" : "Moderate Capping"}
          </p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Inversion Layer Bounds
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-cyan-300">
              {sounding.inversion_base_m ?? 0} – {sounding.inversion_top_m ?? 400}
            </span>
            <span className="text-xs text-slate-400">m AGL</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Trapping pollutants below {sounding.inversion_top_m ?? 400}m
          </p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Ventilation Coefficient (Vc)
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-300">
              {sounding.ventilation_coefficient_m2_s}
            </span>
            <span className="text-xs text-slate-400">m²/s</span>
          </div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${ventBadge.color}`}>
            {ventBadge.label}
          </span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Trapping Efficiency
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-400">
              {sounding.trapping_efficiency_pct}%
            </span>
            <span className="text-xs text-slate-400">Trapped Mass</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all"
              style={{ width: `${sounding.trapping_efficiency_pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Vertical Sounding Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Temperature Profile vs Altitude */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                Vertical Atmospheric Sounding Profile (0–3000m AGL)
              </h3>
              <p className="text-xs text-slate-400">
                Explicit WRF-Chem emulated thermodynamic soundings tracking temperature inversion & dew point
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-400 rounded-full" />
                <span className="text-slate-300">Temperature (°C)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
                <span className="text-slate-300">Dew Point (°C)</span>
              </div>
            </div>
          </div>

          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="temp"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  label={{ value: "Temperature (°C)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  dataKey="altitude"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  label={{ value: "Altitude (m AGL)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                {/* Inversion Layer Highlight Area */}
                {sounding.inversion_top_m && (
                  <ReferenceArea
                    y1={sounding.inversion_base_m || 0}
                    y2={sounding.inversion_top_m}
                    fill="#f59e0b"
                    fillOpacity={0.12}
                    label={{ value: "⚠️ INVERSION TRAP LAYER", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }}
                  />
                )}
                {/* PBL Height Ceiling Line */}
                <ReferenceLine
                  y={sounding.pbl_height_m}
                  stroke="#38bdf8"
                  strokeDasharray="4 4"
                  label={{ value: `PBL Ceiling (${sounding.pbl_height_m}m)`, fill: "#38bdf8", fontSize: 10, position: "right" }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#fb7185"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#fb7185" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="dewPoint"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 2, fill: "#38bdf8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vertical PM2.5 Trapping Decay */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Vertical PM2.5 Stratification
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Ground trapped concentration vs Free troposphere
            </p>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="pm25"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    label={{ value: "PM2.5 (µg/m³)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="altitude"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <ReferenceLine y={sounding.pbl_height_m} stroke="#a855f7" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="pm25"
                    stroke="#c084fc"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Surface Breathing Level (10m):</span>
              <strong className="text-rose-400">{chartData[0]?.pm25} µg/m³</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Above PBL Free Air (1500m):</span>
              <strong className="text-emerald-400">{chartData[15]?.pm25 || 12} µg/m³</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
