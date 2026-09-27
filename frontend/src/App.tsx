import React, { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { KPICards } from "./components/KPICards";
import { TimelineSlider } from "./components/TimelineSlider";
import { GISMap } from "./components/LeafletMap";
import { MapplsView } from "./components/MapplsView";
import { InversionSoundingView } from "./components/InversionSoundingView";
import { CoupledFeedbackView } from "./components/CoupledFeedbackView";
import { StubblePlumeView } from "./components/StubblePlumeView";
import { GRAPAdvisorView } from "./components/GRAPAdvisorView";
import { PolicySimulatorModal } from "./components/PolicySimulatorModal";
import { StationDetailModal } from "./components/StationDetailModal";
import { IndustrialAnomaliesView } from "./components/IndustrialAnomaliesView";

import type {
  HourlyForecastPoint,
  CPCBStation,
  InversionSounding,
  StubbleFire,
  PlumeTrajectory,
  AerosolFeedbackDiagnostic,
  GRAPStatusResponse,
  ForecastSummary,
  AnomalyFocus
} from "./types";

import {
  fetchForecast72h,
  fetchForecastSummary,
  fetchFeedbackDiagnostics,
  fetchStations,
  fetchInversionSounding,
  fetchActiveFires,
  fetchPlumeTrajectories,
  fetchGRAPStatus
} from "./services/api";

export const App: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>("map");
  const [currentHour, setCurrentHour] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<CPCBStation | null>(null);

  // Datasets
  const [forecast, setForecast] = useState<HourlyForecastPoint[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [feedback, setFeedback] = useState<AerosolFeedbackDiagnostic[]>([]);
  const [stations, setStations] = useState<CPCBStation[]>([]);
  const [sounding, setSounding] = useState<InversionSounding | null>(null);
  const [fires, setFires] = useState<StubbleFire[]>([]);
  const [trajectories, setTrajectories] = useState<PlumeTrajectory[]>([]);
  const [grap, setGrap] = useState<GRAPStatusResponse | null>(null);
  const [camsData, setCamsData] = useState<any>(null);
  const [windGrid, setWindGrid] = useState<any>(null);
  const [anomalyFocus, setAnomalyFocus] = useState<AnomalyFocus | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const { fetchCamsData, fetchWindGrid } = await import("./services/api");
      const [
        forecastData,
        summaryData,
        feedbackData,
        stationsData,
        soundingData,
        firesData,
        trajectoriesData,
        grapData,
        camsResult,
        windGridResult
      ] = await Promise.all([
        fetchForecast72h(),
        fetchForecastSummary(),
        fetchFeedbackDiagnostics(),
        fetchStations(),
        fetchInversionSounding(0),
        fetchActiveFires(),
        fetchPlumeTrajectories(),
        fetchGRAPStatus(),
        fetchCamsData().catch(() => null),
        fetchWindGrid().catch(() => null)
      ]);

      setForecast(forecastData);
      setSummary(summaryData);
      setFeedback(feedbackData);
      setStations(stationsData);
      setSounding(soundingData);
      setFires(firesData);
      setTrajectories(trajectoriesData);
      setGrap(grapData);
      setCamsData(camsResult);
      setWindGrid(windGridResult);
    } catch (err) {
      console.error("Failed to load operational data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update sounding whenever the timeline scrubber moves
  useEffect(() => {
    fetchInversionSounding(currentHour)
      .then((data) => setSounding(data))
      .catch((err) => console.error("Error updating sounding:", err));
  }, [currentHour]);

  const currentPoint = forecast[currentHour] || forecast[0] || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100">
      {/* Header / Navbar */}
      <Navbar
        summary={summary}
        grap={grap}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        onRefresh={loadInitialData}
        isLoading={isLoading}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-5">
        {/* Top KPI Diagnostics */}
        <KPICards summary={summary} currentPoint={currentPoint} camsData={camsData} />

        {/* 72-Hour Interactive Time Scrubber */}
        <TimelineSlider
          forecast={forecast}
          currentHour={currentHour}
          onHourChange={setCurrentHour}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
        />

        {/* Tab Views */}
        <div className="transition-all duration-300">
          {selectedTab === "map" && (
            <div className="space-y-4">
              <GISMap
                stations={stations}
                fires={fires}
                trajectories={trajectories}
                currentPoint={currentPoint}
                onSelectStation={setSelectedStation}
                windGrid={windGrid}
                anomalyFocus={anomalyFocus}
                onAnomalyFocusCleared={() => setAnomalyFocus(null)}
              />

              {/* Station Quick Cards Carousel */}
              <div className="p-4 rounded-xl glass-panel border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Key Delhi-NCR Monitoring Stations ({stations.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click any station for 72h downscaled profile
                  </span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {stations.slice(0, 12).map((st) => {
                    const stFc = st.forecast_72h && st.forecast_72h[currentHour];
                    const aqi = stFc ? stFc.aqi : st.current_aqi;
                    const cat = stFc ? stFc.aqi_category : st.aqi_category;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStation(st)}
                        className="flex-shrink-0 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition w-52"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white truncate max-w-[130px]">{st.name.split(',')[0]}</span>
                          <span className="text-xs font-black text-cyan-300">{aqi}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{st.city}</span>
                          <span className="font-semibold text-slate-300">{cat}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedTab === "mappls" && (
            <MapplsView
              stations={stations}
              fires={fires}
              trajectories={trajectories}
              currentPoint={currentPoint}
            />
          )}

          {selectedTab === "sounding" && (
            <InversionSoundingView sounding={sounding} />
          )}

          {selectedTab === "feedback" && (
            <CoupledFeedbackView diagnostics={feedback} />
          )}

          {selectedTab === "plumes" && (
            <StubblePlumeView fires={fires} trajectories={trajectories} />
          )}

          {selectedTab === "grap" && (
            <GRAPAdvisorView grap={grap} />
          )}

          {selectedTab === "anomalies" && (
            <IndustrialAnomaliesView
              onViewOnMap={(focus) => {
                setAnomalyFocus(focus);
                setSelectedTab("map");
              }}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">DELHI-AIR-COUPLED</span>
            <span>•</span>
            <span>WRF-Chem Coupled Meteorology-Chemistry System</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Operational v1.0</span>
          </div>
          <div>
            Coupled Radiative Feedback • Inversion Soundings • NASA VIIRS Stubble Dispersion • CAQM GRAP
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PolicySimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      <StationDetailModal
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
      />
    </div>
  );
};

export default App;
