import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  Layers,
  Wind,
  FileCode2,
  AlertTriangle,
  GitCompare,
  Activity
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'command', label: 'Command Center', icon: LayoutDashboard },
    { id: 'forecast-detail', label: '72h Forecast Detail', icon: LineChart },
    { id: 'inversion', label: 'Inversion & Boundary', icon: Layers },
    { id: 'plume', label: 'Stubble Plume Tracker', icon: Wind },
    { id: 'explainability', label: 'Explainability (Cause➔Effect)', icon: FileCode2 },
    { id: 'grap', label: 'GRAP Action & Alerts', icon: AlertTriangle },
    { id: 'comparison', label: 'Zone Comparison', icon: GitCompare },
    { id: 'admin', label: 'System Health & Sources', icon: Activity },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest/90 backdrop-blur-xl border-r border-white/5 z-30 flex flex-col justify-between py-4 hidden md:flex">
      <div className="flex flex-col gap-1 px-3">
        <div className="px-3 py-2 text-[10px] uppercase font-mono font-bold tracking-wider text-text-tertiary">
          Meteorological Rails
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (activeTab === 'public' && item.id === 'command');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-primary-container text-white font-semibold shadow-lg shadow-primary-container/25'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-secondary' : 'text-text-tertiary'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 py-3 mx-3 rounded-xl bg-surface-container-high/60 border border-white/5">
        <div className="flex items-center justify-between text-text-tertiary text-[10px] font-mono mb-1">
          <span>IMD Ensemble 4km</span>
          <span className="text-tertiary font-bold">Synchronized</span>
        </div>
        <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
          <div className="bg-secondary h-full w-[94%]"></div>
        </div>
      </div>
    </aside>
  );
}
