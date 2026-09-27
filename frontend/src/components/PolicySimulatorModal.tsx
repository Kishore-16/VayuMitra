import React, { useState } from "react";
import { X, Play, RotateCcw, Zap } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { SimulationParams, SimulationResult } from "../types";
import { runSimulation } from "../services/api";

interface PolicySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicySimulatorModal: React.FC<PolicySimulatorModalProps> = ({ isOpen, onClose }) => {
  const [params, setParams] = useState<SimulationParams>({
    stubble_reduction_pct: 50,
    traffic_reduction_pct: 30,
    industrial_reduction_pct: 40,
    dust_control_pct: 35,
    wind_speed_multiplier: 1.0,
    wind_direction_shift_deg: 0
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const data = await runSimulation(params);
      setResult(data);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setParams({
      stubble_reduction_pct: 0,
      traffic_reduction_pct: 0,
      industrial_reduction_pct: 0,
      dust_control_pct: 0,
      wind_speed_multiplier: 1.0,
      wind_direction_shift_deg: 0
    });
    setResult(null);
  };

  const chartData = result?.hourly_comparison.map(item => ({
    hour: `+${item.hour_offset}h`,
    baselineAQI: item.baseline_aqi,
    simulatedAQI: item.simulated_aqi,
    reduction: item.reduction_ug_m3
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl glass-panel-glow border border-indigo-500/40 p-6 shadow-2xl bg-slate-950/95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                "What-If" Policy & Weather Simulation Sandbox
              </h2>
              <p className="text-xs text-slate-400">
                Coupled sensitivity engine testing hypothetical municipal interventions & meteorological shifts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Stubble Burning Reduction */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-amber-400">🔥 Stubble Fire Enforcement / Ban</span>
              <span className="text-white px-2 py-0.5 rounded bg-slate-800">{params.stubble_reduction_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={params.stubble_reduction_pct}
              onChange={(e) => setParams({ ...params, stubble_reduction_pct: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">In-situ crop residue management & strict field monitoring</span>
          </div>

          {/* Traffic / Odd-Even Reduction */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-cyan-400">🚗 Vehicular Emission Cut (Odd-Even / WFH)</span>
              <span className="text-white px-2 py-0.5 rounded bg-slate-800">{params.traffic_reduction_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={params.traffic_reduction_pct}
              onChange={(e) => setParams({ ...params, traffic_reduction_pct: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">BS-III/IV bans, public transit augmentation & odd-even rationing</span>
          </div>

          {/* Industrial & C&D Reduction */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-purple-400">🏭 Industrial & C&D Work Curfew</span>
              <span className="text-white px-2 py-0.5 rounded bg-slate-800">{params.industrial_reduction_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={params.industrial_reduction_pct}
              onChange={(e) => setParams({ ...params, industrial_reduction_pct: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Stone crushers, brick kilns & major infrastructure halt</span>
          </div>

          {/* Wind Speed Factor */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-emerald-400">💨 Wind Speed Multiplier</span>
              <span className="text-white px-2 py-0.5 rounded bg-slate-800">{params.wind_speed_multiplier}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.1"
              value={params.wind_speed_multiplier}
              onChange={(e) => setParams({ ...params, wind_speed_multiplier: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Ventilation dispersion coefficient modifier</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:opacity-90 text-white font-bold shadow-lg shadow-indigo-600/30 transition active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isSimulating ? "Computing Coupled Response..." : "Execute Policy Simulation"}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Simulation Output Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            {/* KPI Diffs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Average AQI</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">{result.simulated_avg_aqi}</span>
                  <span className="text-xs text-slate-500 line-through">{result.baseline_avg_aqi}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">-{result.aqi_reduction_pct}% Overall</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Peak PM2.5 Avoided</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-cyan-300">-{result.peak_reduction_ug_m3}</span>
                  <span className="text-xs text-slate-400">µg/m³</span>
                </div>
                <span className="text-[10px] text-slate-400">Peak {result.peak_pm25_simulated} vs {result.peak_pm25_baseline}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Baseline GRAP</span>
                <div className="mt-1 text-sm font-black text-red-400">{result.baseline_grap_stage}</div>
                <span className="text-[10px] text-slate-500">Unmitigated</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                <span className="text-[11px] text-emerald-300 font-medium">Simulated GRAP</span>
                <div className="mt-1 text-sm font-black text-emerald-400">{result.simulated_grap_stage}</div>
                <span className="text-[10px] font-bold text-emerald-300">Downshift Achieved</span>
              </div>
            </div>

            {/* Comparison Chart */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <h4 className="text-xs font-bold text-white mb-2">72-Hour AQI Trajectory: Baseline vs Simulated Policy</h4>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" name="Baseline AQI (Unmitigated)" dataKey="baselineAQI" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" name="Simulated AQI (With Actions)" dataKey="simulatedAQI" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
