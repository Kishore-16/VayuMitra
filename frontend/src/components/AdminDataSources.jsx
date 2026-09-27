import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, RefreshCw, Server, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminDataSources() {
  const [sources, setSources] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/v1/admin/data-sources');
      const data = await res.json();
      setSources(data.dataSources);
    } catch (e) {
      console.error('Error fetching admin data sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (sourceType) => {
    try {
      const res = await fetch('/api/v1/admin/data-sources/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setSources(data.allSources);
      }
    } catch (e) {
      console.error('Error toggling source adapter:', e);
    }
  };

  if (loading || !sources) {
    return (
      <div className="p-8 text-center text-text-tertiary">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-secondary" />
        Loading Data Source Adapter Registry...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] bg-primary/20 text-primary font-mono font-semibold uppercase">
              Adapter Pattern + Strategy Config
            </span>
            <span className="text-text-tertiary">|</span>
            <span className="text-xs text-secondary font-mono">FR-1 & FR-9 Architecture Proof</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Data Source Adapter Management Console
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            One-click swappable data ingestion layer: Toggle Mock vs Live feeds with zero downstream code changes
          </p>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 text-xs text-secondary font-mono font-bold">
          System Mode: Adapter-Pattern Scoped
        </div>
      </div>

      {/* Grid of 4 Adapter Feeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(sources).map(([key, src]) => (
          <div
            key={key}
            className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">
                  Feed Adapter #{key.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-text-primary">{src.label}</h3>
                <p className="text-xs text-text-tertiary">{src.mockDescription}</p>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  src.provider === 'mock'
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-tertiary/20 text-tertiary'
                }`}
              >
                {src.provider === 'mock' ? 'MOCK ADAPTER' : 'LIVE READY'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-high border border-white/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-text-tertiary block text-[10px]">Adapter Status</span>
                <span className="text-text-primary font-mono font-bold">{src.status}</span>
              </div>
              <div className="text-right">
                <span className="text-text-tertiary block text-[10px]">Last Fetch Sync</span>
                <span className="text-text-secondary font-mono text-[11px]">{new Date(src.lastFetch).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-text-tertiary font-mono">
                Active Provider: <strong className="text-text-primary uppercase">{src.provider}</strong>
              </span>

              <button
                onClick={() => handleToggle(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  src.provider === 'mock'
                    ? 'bg-primary-container text-white hover:bg-primary-container/80'
                    : 'bg-tertiary text-surface hover:bg-tertiary/90'
                }`}
              >
                {src.provider === 'mock' ? (
                  <>
                    <ToggleLeft className="w-4 h-4 text-secondary" /> Toggle to Live
                  </>
                ) : (
                  <>
                    <ToggleRight className="w-4 h-4 text-surface" /> Toggle to Mock
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
