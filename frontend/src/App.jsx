import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CommandCenter from './components/CommandCenter';
import PlumeTracker from './components/PlumeTracker';
import InversionInsight from './components/InversionInsight';
import PublicCitizenView from './components/PublicCitizenView';
import AdminDataSources from './components/AdminDataSources';

export default function App() {
  const [activeTab, setActiveTab] = useState('command');
  const [selectedZone, setSelectedZone] = useState('DELHI_CENTRAL');
  const [forecastData, setForecastData] = useState(null);
  const [zonesData, setZonesData] = useState(null);
  const [inversionData, setInversionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (zoneId = selectedZone) => {
    try {
      setIsRefreshing(true);
      const [forecastRes, zonesRes, inversionRes] = await Promise.all([
        fetch(`/api/v1/forecast/${zoneId}`),
        fetch('/api/v1/zones'),
        fetch('/api/v1/inversion/current')
      ]);

      const [forecast, zones, inversion] = await Promise.all([
        forecastRes.json(),
        zonesRes.json(),
        inversionRes.json()
      ]);

      setForecastData(forecast);
      setZonesData(zones);
      setInversionData(inversion);
    } catch (e) {
      console.error('Error fetching AeroSense-Delhi data:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedZone);
  }, [selectedZone]);

  const handleZoneSelect = (zoneId) => {
    setSelectedZone(zoneId);
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={() => loadData(selectedZone)}
        isRefreshing={isRefreshing}
      />

      {/* Sidebar Rail */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content View Container */}
      <main className="pt-20 pb-12 md:ml-64 px-4 md:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 text-text-tertiary gap-3">
              <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-mono">Initializing AeroSense-Delhi Coupled Physics Engine...</p>
            </div>
          ) : (
            <>
              {(activeTab === 'command' || activeTab === 'forecast-detail' || activeTab === 'grap' || activeTab === 'comparison') && (
                <CommandCenter
                  forecastData={forecastData}
                  zonesData={zonesData}
                  onZoneSelect={handleZoneSelect}
                  selectedZone={selectedZone}
                />
              )}

              {activeTab === 'plume' && (
                <PlumeTracker plumeData={forecastData?.plumeAnalysis} />
              )}

              {(activeTab === 'inversion' || activeTab === 'explainability') && (
                <InversionInsight
                  inversionData={inversionData}
                  forecastData={forecastData}
                />
              )}

              {activeTab === 'public' && (
                <PublicCitizenView forecastData={forecastData} />
              )}

              {activeTab === 'admin' && (
                <AdminDataSources />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
