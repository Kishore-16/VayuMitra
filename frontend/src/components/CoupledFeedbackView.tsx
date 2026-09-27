import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import type { AerosolFeedbackDiagnostic } from "../types";
import { Activity, Layers, Sparkles } from "lucide-react";

interface CoupledFeedbackViewProps {
  diagnostics: AerosolFeedbackDiagnostic[];
}

export const CoupledFeedbackView: React.FC<CoupledFeedbackViewProps> = ({ diagnostics }) => {
  if (!diagnostics || diagnostics.length === 0) return null;

  const chartData = diagnostics.map((d) => ({
    hour: `+${d.hour_offset}h`,
    uncoupledPM25: d.uncoupled_pm25,
    coupledPM25: d.coupled_pm25,
    feedbackDelta: d.feedback_delta_pm25,
    baselinePBL: d.baseline_pbl_m,
    coupledPBL: d.coupled_pbl_m,
    pblSuppression: d.pbl_suppression_m,
    solarDimming: d.solar_dimming_w_m2,
    surfaceCooling: d.surface_cooling_c,
    trappingMultiplier: d.trapping_multiplier_pct
  }));

  const maxDelta = Math.max(...diagnostics.map(d => d.feedback_delta_pm25));
  const maxCooling = Math.max(...diagnostics.map(d => d.surface_cooling_c));
  const maxPBLSupp = Math.max(...diagnostics.map(d => d.pbl_suppression_m));

  return (
    <div className="space-y-4">
      {/* Feedback Overview Callout */}
      <div className="p-4 rounded-2xl glass-panel-glow border border-cyan-500/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Two-Way Aerosol–Radiation–PBL Coupling Mechanism
              </h3>
              <p className="text-xs text-slate-300 max-w-3xl mt-0.5">
                Standard decoupled AQI models fail during Delhi winter episodes because they ignore that heavy aerosol loads 
                block sunlight, cooling the surface by up to <b>{maxCooling}°C</b>, which collapses the Planetary Boundary Layer by <b>{maxPBLSupp}m</b>, 
                trapping pollutants and amplifying PM2.5 concentrations by up to <b>+{maxDelta} µg/m³</b>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-300">
              Coupled Feedback Delta: +{maxDelta} µg/m³
            </div>
          </div>
        </div>
      </div>

      {/* Chart 1: Uncoupled vs Coupled PM2.5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                PM2.5 Concentration: Uncoupled vs Coupled (72h)
              </h4>
              <p className="text-xs text-slate-400">
                Shows additional trapped mass from two-way radiative feedback
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="coupledGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Line
                  type="monotone"
                  name="Uncoupled PM2.5 (Traditional)"
                  dataKey="uncoupledPM25"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Area
                  type="monotone"
                  name="Coupled PM2.5 (DELHI-AIR)"
                  dataKey="coupledPM25"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#coupledGrad)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Boundary Layer (PBL) Suppression */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Planetary Boundary Layer (PBL) Compression
              </h4>
              <p className="text-xs text-slate-400">
                Aerosol radiative cooling suppresses thermal convective mixing height
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pblGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Line
                  type="monotone"
                  name="Baseline PBL (m)"
                  dataKey="baselinePBL"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Area
                  type="monotone"
                  name="Coupled Compressed PBL (m)"
                  dataKey="coupledPBL"
                  stroke="#38bdf8"
                  fillOpacity={1}
                  fill="url(#pblGrad)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
