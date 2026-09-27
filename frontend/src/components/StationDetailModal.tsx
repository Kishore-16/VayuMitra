import React from "react";
import { X, MapPin, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { CPCBStation } from "../types";

interface StationDetailModalProps {
  station: CPCBStation | null;
  onClose: () => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({ station, onClose }) => {
  if (!station) return null;

  const chartData = station.forecast_72h?.map((pt) => ({
    hour: `+${pt.hour_offset}h`,
    aqi: pt.aqi,
    pm25: pt.pm25,
    pm10: pt.pm10,
    no2: pt.no2,
    pbl: pt.pbl_height_m
  })) || [];

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-emerald-400 bg-emerald-950/60 border-emerald-500/40";
    if (aqi <= 100) return "text-lime-400 bg-lime-950/60 border-lime-500/40";
    if (aqi <= 200) return "text-yellow-400 bg-yellow-950/60 border-yellow-500/40";
    if (aqi <= 300) return "text-orange-400 bg-orange-950/60 border-orange-500/40";
    if (aqi <= 400) return "text-red-400 bg-red-950/60 border-red-500/40";
    if (aqi <= 450) return "text-purple-400 bg-purple-950/60 border-purple-500/40";
    return "text-red-500 bg-red-950 border-red-700";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl glass-panel-glow border border-slate-700/80 p-6 shadow-2xl bg-slate-950/95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{station.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {station.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {station.city}, {station.state} • <span className="text-cyan-300 font-medium">{station.type}</span>
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

        {/* Current Pollutant Readout Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div className={`p-3 rounded-xl border ${getAQIColor(station.current_aqi)}`}>
            <span className="text-[10px] uppercase font-bold text-slate-300">Station AQI</span>
            <div className="text-2xl font-black">{station.current_aqi}</div>
            <span className="text-[10px] font-bold">{station.aqi_category}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">PM2.5</span>
            <div className="text-xl font-bold text-white">{station.current_pm25} <span className="text-xs font-normal text-slate-400">µg</span></div>
            <span className="text-[10px] text-slate-400">Breathing Zone</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">PM10</span>
            <div className="text-xl font-bold text-white">{station.current_pm10} <span className="text-xs font-normal text-slate-400">µg</span></div>
            <span className="text-[10px] text-slate-400">Coarse Dust</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">NO₂</span>
            <div className="text-xl font-bold text-white">{station.current_no2} <span className="text-xs font-normal text-slate-400">µg</span></div>
            <span className="text-[10px] text-slate-400">Traffic / Diesel</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">O₃ (Ozone)</span>
            <div className="text-xl font-bold text-white">{station.current_o3} <span className="text-xs font-normal text-slate-400">µg</span></div>
            <span className="text-[10px] text-slate-400">Photochemical</span>
          </div>
        </div>

        {/* 72h Timeline Trend Chart */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            72-Hour Downscaled Station Forecast
          </h4>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }} />
                <Line type="monotone" name="AQI" dataKey="aqi" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" name="PM2.5 (µg/m³)" dataKey="pm25" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
