// Main REST API Routes for AeroSense-Delhi
import express from 'express';
import { runCoupledForecast } from '../engine/surrogateCouplingEngine.js';
import { DELHI_ZONES, MockDataAdapter } from '../adapters/mockAdapter.js';
import { calculateInversion } from '../engine/inversionModule.js';
import { getAdapter } from '../adapters/dataSourceAdapter.js';

const router = express.Router();
const mockAdapter = new MockDataAdapter();

// 1. Get 72-hour Coupled Forecast for a Zone
router.get('/forecast/:zoneId?', (req, res) => {
  const zoneId = req.params.zoneId || "DELHI_CENTRAL";
  const forecast = runCoupledForecast(zoneId);
  res.json(forecast);
});

// 2. Get All Delhi NCR Zones with Current AQI
router.get('/zones', (req, res) => {
  const pollutionAdapter = getAdapter("pollution");
  const weatherAdapter = getAdapter("weather");

  const zonesData = DELHI_ZONES.map(z => {
    const pollution = pollutionAdapter.fetchPollution ? pollutionAdapter.fetchPollution(z.id) : mockAdapter.fetchPollution(z.id);
    const weather = weatherAdapter.fetchWeather ? weatherAdapter.fetchWeather(z.id) : mockAdapter.fetchWeather(z.id);
    const forecast = runCoupledForecast(z.id);

    return {
      ...z,
      currentPM25: pollution.pm25,
      currentAQI: forecast.series[0].aqi,
      aqiCategory: forecast.series[0].aqiCategory,
      aqiColor: forecast.series[0].aqiColor,
      temperatureC: weather.temperatureC,
      windSpeedMs: weather.windSpeedMs,
      pblHeightM: weather.pblHeightM
    };
  });

  res.json(zonesData);
});

// 3. Get Atmospheric Inversion Status
router.get('/inversion/current', (req, res) => {
  const weatherAdapter = getAdapter("weather");
  const weather = weatherAdapter.fetchWeather ? weatherAdapter.fetchWeather("DELHI_CENTRAL") : mockAdapter.fetchWeather("DELHI_CENTRAL");
  const inversion = calculateInversion(weather.verticalTempProfileC, weather.pblHeightM);

  res.json({
    timestamp: weather.timestamp,
    ...inversion,
    verticalProfile: weather.verticalTempProfileC.map((t, idx) => ({
      altitudeM: idx * 125,
      temperatureC: t
    }))
  });
});

// 4. Get Stubble Plume Timeline
router.get('/plume/timeline', (req, res) => {
  const forecast = runCoupledForecast("DELHI_CENTRAL");
  res.json(forecast.plumeAnalysis);
});

// 5. Get Active Alerts & GRAP Warnings
router.get('/alerts', (req, res) => {
  const forecast = runCoupledForecast("DELHI_CENTRAL");
  const peak = forecast.peakForecast;

  const alerts = [];
  if (peak.aqi >= 400) {
    alerts.push({
      id: "ALT-GRAP-3",
      severity: "CRITICAL",
      title: "GRAP Stage III Threshold Crossing",
      message: `Forecasted AQI reaches ${peak.aqi} (${peak.aqiCategory}) at +${peak.hourOffset}h. Strict construction ban & dust suppression advised.`,
      timestamp: new Date().toISOString()
    });
  }

  if (forecast.plumeAnalysis.alertLevel === "CRITICAL") {
    alerts.push({
      id: "ALT-PLUME-1",
      severity: "WARNING",
      title: "Stubble Smoke Plume Ingress",
      message: `Active fires in Punjab generating ${forecast.plumeAnalysis.estimatedPM25Contrib} µg/m³ PM2.5 plume flux. ETA: ${forecast.plumeAnalysis.etaHours} hours.`,
      timestamp: new Date().toISOString()
    });
  }

  if (peak.isi >= 0.75) {
    alerts.push({
      id: "ALT-INV-1",
      severity: "HIGH",
      title: "Severe Temperature Inversion Layer",
      message: `Lapse rate inversion active. Planetary boundary layer compressed to ${peak.pblHeightM}m.`,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    activeAlertsCount: alerts.length,
    alerts,
    grapStage: forecast.grapRecommendation
  });
});

// 6. Get Explainability Narrative
router.get('/explain/:zoneId?', (req, res) => {
  const zoneId = req.params.zoneId || "DELHI_CENTRAL";
  const forecast = runCoupledForecast(zoneId);
  res.json({
    zoneId,
    peakAQI: forecast.peakForecast.aqi,
    explanation: forecast.explanationText
  });
});

// 7. Trigger Fresh Forecast Run
router.post('/run-forecast', (req, res) => {
  const zoneId = req.body?.zoneId || "DELHI_CENTRAL";
  const forecast = runCoupledForecast(zoneId);
  res.json({
    status: "SUCCESS",
    message: `Coupled weather-chemistry forecast generated for ${zoneId}`,
    forecast
  });
});

export default router;
