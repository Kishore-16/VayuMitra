import React from "react";
import type { StubbleFire, PlumeTrajectory } from "../types";
import { Flame, Clock, Wind } from "lucide-react";

interface StubblePlumeViewProps {
  fires: StubbleFire[];
  trajectories: PlumeTrajectory[];
}

export const StubblePlumeView: React.FC<StubblePlumeViewProps> = ({ fires, trajectories }) => {
  const totalFires = fires.reduce((acc, f) => acc + f.active_fires, 0);
  const avgFrp = (fires.reduce((acc, f) => acc + f.mean_frp_mw, 0) / (fires.length || 1)).toFixed(1);
  const totalEmissionRate = fires.reduce((acc, f) => acc + f.estimated_emission_rate_kg_s, 0).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Total Active Hotspots (VIIRS/MODIS)
            </span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-400">{totalFires}</span>
            <span className="text-xs text-slate-400">Fire Clusters</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Covering Punjab, Haryana, Western UP
          </p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Mean Fire Radiative Power (FRP)
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{avgFrp}</span>
            <span className="text-xs text-slate-400">MW / Cluster</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            High thermal buoyancy driving Freitas plume-rise
          </p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Estimated Emission Mass Flux
            </span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-300">{totalEmissionRate}</span>
            <span className="text-xs text-slate-400">kg / second</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Advecting towards Delhi-NCR via North-Westerly corridor
          </p>
        </div>
      </div>

      {/* Trajectories Table & District Dispersion */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Regional Fire Hotspots & Forward Plume Dispersion to Delhi
            </h3>
            <p className="text-xs text-slate-400">
              Computed arrival time (ETA), injection height, and downwind PM2.5 loading
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">District / State</th>
                <th className="py-3 px-3">Active Fires</th>
                <th className="py-3 px-3">FRP (MW)</th>
                <th className="py-3 px-3">Plume Rise (AGL)</th>
                <th className="py-3 px-3">Delhi ETA</th>
                <th className="py-3 px-3">Delhi Influx (PM2.5)</th>
                <th className="py-3 px-4">Crop Residue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {fires.map((f) => {
                const traj = trajectories.find(t => t.fire_id === f.id);
                return (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {f.district}, {f.state}
                    </td>
                    <td className="py-3 px-3 font-semibold text-red-400">{f.active_fires}</td>
                    <td className="py-3 px-3 text-amber-300">{f.mean_frp_mw} MW</td>
                    <td className="py-3 px-3 text-cyan-300 font-mono">{f.plume_injection_height_m} m</td>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {traj ? `${traj.delhi_eta_hours} hrs` : "Calculated"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-red-950 text-red-300 border border-red-800">
                        +{traj ? traj.delhi_impact_pm25_ug_m3 : "--"} µg/m³
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{f.crop_type}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
