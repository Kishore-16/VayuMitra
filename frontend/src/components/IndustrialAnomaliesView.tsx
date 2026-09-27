import React, { useEffect, useState } from "react";
import { AlertTriangle, Factory, Clock, MapPin, CheckCircle, Navigation } from "lucide-react";
import type { AnomalyFocus } from "../types";

interface Anomaly {
  id: string;
  zone_name: string;
  lat: number;
  lon: number;
  timestamp: string;
  actual_pm25: number;
  dynamic_baseline: number;
  spike_value: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
  status: string;
}

interface AnomalyResponse {
  timestamp: string;
  total_anomalies: number;
  anomalies: Anomaly[];
}

interface Props {
  onViewOnMap: (focus: AnomalyFocus) => void;
}

export const IndustrialAnomaliesView: React.FC<Props> = ({ onViewOnMap }) => {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Fetch anomalies from our new API route
    const fetchAnomalies = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/anomalies/current");
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch anomalies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("http://localhost:8000/api/anomalies/current");
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch anomalies:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNotify = (id: string) => {
    setNotifiedIds(prev => new Set(prev).add(id));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Scanning for industrial emissions...</div>;
  }

  if (!data || data.total_anomalies === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <Factory className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">No Anomalies Detected</h3>
        <p className="text-slate-400 mt-2 max-w-md">
          Current industrial emissions are within expected dynamic baselines based on historical data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Active Industrial Anomalies ({data.total_anomalies})
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time context-aware detection isolating unexplained PM2.5 spikes from background pollution.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last Updated: {new Date(data.timestamp).toLocaleTimeString()}
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            {isRefreshing ? 'Scanning...' : 'Scan Again'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.anomalies.map((anomaly) => (
          <div 
            key={anomaly.id} 
            className="p-5 rounded-2xl glass-panel border border-red-500/30 bg-red-950/10 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 rounded-full ${anomaly.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">{anomaly.zone_name}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {anomaly.lat.toFixed(4)}, {anomaly.lon.toFixed(4)}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                anomaly.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 
                anomaly.severity === 'HIGH' ? 'bg-orange-500 text-white' : 
                'bg-yellow-500/80 text-black'
              }`}>
                {anomaly.severity}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Expected Baseline</div>
                <div className="text-xl font-mono text-slate-300">{anomaly.dynamic_baseline} <span className="text-[10px]">µg/m³</span></div>
              </div>
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50">
                <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Actual Reading</div>
                <div className="text-xl font-mono text-red-400 font-bold">{anomaly.actual_pm25} <span className="text-[10px]">µg/m³</span></div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs text-red-200">
              <span className="font-bold text-red-400">Alert: </span>
              {anomaly.message}
            </div>
            
            <div className="mt-4 flex gap-2">
               <button 
                 onClick={() => handleNotify(anomaly.id)}
                 disabled={notifiedIds.has(anomaly.id)}
                 className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg transition ${
                   notifiedIds.has(anomaly.id) 
                     ? 'bg-emerald-600 text-white' 
                     : 'bg-red-600 hover:bg-red-700 text-white'
                 }`}
               >
                 {notifiedIds.has(anomaly.id) ? (
                   <><CheckCircle className="w-4 h-4" /> Authorities Notified</>
                 ) : (
                   'Notify Authorities'
                 )}
               </button>
               <button 
                 onClick={() => onViewOnMap({ lat: anomaly.lat, lon: anomaly.lon, name: anomaly.zone_name, severity: anomaly.severity })}
                 className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-cyan-600 hover:text-white rounded-lg transition"
               >
                 <Navigation className="w-4 h-4" /> View on Map
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
