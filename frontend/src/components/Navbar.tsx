import React from "react";
import { Activity, ShieldAlert, RefreshCw, Wind, Flame, CloudRain } from "lucide-react";
import type { ForecastSummary, GRAPStatusResponse } from "../types";

interface NavbarProps {
  summary: ForecastSummary | null;
  grap: GRAPStatusResponse | null;
  selectedTab: string;
  onSelectTab: (tab: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenSimulator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  grap,
  selectedTab,
  onSelectTab,
  onRefresh,
  isLoading,
  onOpenSimulator
}) => {
  const getGrapBadgeColor = (stage: string) => {
    if (stage.includes("Stage IV")) return "bg-red-950 text-red-400 border-red-600 animate-pulse";
    if (stage.includes("Stage III")) return "bg-purple-950 text-purple-400 border-purple-600";
    if (stage.includes("Stage II")) return "bg-red-900/60 text-red-300 border-red-500";
    if (stage.includes("Stage I")) return "bg-amber-900/60 text-amber-300 border-amber-500";
    return "bg-emerald-950 text-emerald-400 border-emerald-600";
  };

  const navItems = [
    { id: "map", label: "Coupled GIS Map", icon: Wind },
    { id: "sounding", label: "Inversion Sounding", icon: CloudRain },
    { id: "feedback", label: "Aerosol Feedback", icon: Activity },
    { id: "plumes", label: "Stubble Plumes", icon: Flame },
    { id: "grap", label: "GRAP Advisor", icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand & System Status */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <Wind className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0b0f19] rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0b0f19] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  DELHI-AIR-COUPLED
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 rounded-md">
                  WRF-Chem v4.5+ Emulated
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                High-Res 72h Meteorology–Chemistry Forecasting & Inversion System
              </p>
            </div>
          </div>

          {/* Mobile Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="lg:hidden p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls & GRAP Badge */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          {grap && (
            <div className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${getGrapBadgeColor(grap.current_stage)}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{grap.current_stage}</span>
            </div>
          )}

          {/* What-If Sandbox Button */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <span>What-If Sandbox</span>
          </button>

          {/* Desktop Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Forecast Data"
            className="hidden lg:flex items-center justify-center p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
