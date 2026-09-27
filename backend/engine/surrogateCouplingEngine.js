// Physics-Informed Two-Way Coupled Weather-Chemistry Surrogate Model Engine

import { getAdapter } from '../adapters/dataSourceAdapter.js';
import { calculateInversion } from './inversionModule.js';
import { calculatePlumeDispersion } from './stubblePlumeModule.js';
import { calculateAQI } from './aqiCalculator.js';
import { generateExplanation } from './explainabilityEngine.js';

export function runCoupledForecast(zoneId = "DELHI_CENTRAL", startTimestamp = new Date()) {
  const weatherAdapter = getAdapter("weather");
  const pollutionAdapter = getAdapter("pollution");
  const fireAdapter = getAdapter("fire");

  const initialWeather = weatherAdapter.fetchWeather(zoneId, startTimestamp);
  const initialPollution = pollutionAdapter.fetchPollution(zoneId, startTimestamp);
  const fireEvents = fireAdapter.fetchFireEvents();

  const plumeAnalysis = calculatePlumeDispersion(fireEvents, initialWeather.windSpeedMs, initialWeather.windDirDeg);

  const forecastSeries = [];
  let currentPM25 = initialPollution.pm25;
  let currentPM10 = initialPollution.pm10;
  let currentWind = initialWeather.windSpeedMs;
  let currentPBL = initialWeather.pblHeightM;
  let currentTemp = initialWeather.temperatureC;
  let currentTempProfile = [...initialWeather.verticalTempProfileC];

  // 72-hour forecast cycle (3-hour resolution = 25 timesteps)
  for (let step = 0; step <= 24; step++) {
    const hourOffset = step * 3;
    const validTs = new Date(new Date(startTimestamp).getTime() + hourOffset * 3600 * 1000).toISOString();

    // 1. Calculate Inversion Strength Index (ISI) for this step
    const inversion = calculateInversion(currentTempProfile, currentPBL);

    // 2. Dispersion Base Term: wind disperses pollution (lower wind = higher accumulation)
    const dispersionFactor = 1.6 / (currentWind + 0.3);

    // 3. Inversion Trapping Factor: ISI traps PM2.5 near surface
    const trappingFactor = 1.0 + (inversion.isi * 1.35);

    // 4. Stubble Plume Contribution: lookup plume arriving at hourOffset
    const plumePoint = plumeAnalysis.plumeTimeline.find(p => p.hour <= hourOffset && p.hour + 6 > hourOffset);
    const plumePM25Contrib = plumePoint ? plumePoint.estimatedPM25 : (hourOffset >= plumeAnalysis.etaHours ? plumeAnalysis.estimatedPM25Contrib : 0);

    // 5. Compute Forecast PM2.5 with two-way physical coupling
    const basePM25 = initialPollution.pm25 * 0.75;
    const forecastPM25 = (basePM25 * dispersionFactor * trappingFactor) + plumePM25Contrib;
    const forecastPM10 = forecastPM25 * 1.58;
    const forecastO3 = Math.max(12, 45 + Math.sin(step * 0.5) * 22);

    // 6. Compute AQI using CPCB formula
    const aqiData = calculateAQI(forecastPM25, forecastPM10, forecastO3, initialPollution.no2);

    // 7. TWO-WAY FEEDBACK STEP (Pollution ➔ Weather):
    // Dense PM2.5 aerosols reduce solar radiation reaching surface -> suppresses surface temperature & lowers PBL height
    const aerosolOpticalDepth = forecastPM25 / 110.0;
    const radiativeForcingCorrection = -0.45 * aerosolOpticalDepth; // surface cooling effect

    // Update weather for next timestep: lower PBL & stronger inversion gradient
    currentPBL = Math.max(110, Math.round(initialWeather.pblHeightM + (radiativeForcingCorrection * 60)));
    currentTemp = parseFloat((initialWeather.temperatureC + radiativeForcingCorrection).toFixed(1));
    currentTempProfile[2] = currentTempProfile[2] + (0.12 * aerosolOpticalDepth); // enhancing top inversion warmth

    forecastSeries.push({
      step,
      hourOffset,
      validTs,
      pm25: parseFloat(forecastPM25.toFixed(1)),
      pm10: parseFloat(forecastPM10.toFixed(1)),
      o3: parseFloat(forecastO3.toFixed(1)),
      aqi: aqiData.aqi,
      aqiCategory: aqiData.category,
      aqiColor: aqiData.color,
      grapStage: aqiData.grapStage,
      isi: inversion.isi,
      inversionCategory: inversion.category,
      pblHeightM: currentPBL,
      temperatureC: currentTemp,
      windSpeedMs: currentWind,
      plumePM25Contrib,
      feedbackCoolingC: parseFloat(radiativeForcingCorrection.toFixed(2))
    });
  }

  // Find peak AQI hour in forecast
  const peakStep = forecastSeries.reduce((max, cur) => cur.aqi > max.aqi ? cur : max, forecastSeries[0]);

  // Generate Cause -> Effect Explainability text
  const explanationText = generateExplanation(peakStep, plumeAnalysis, initialWeather);

  return {
    zoneId,
    generatedAt: new Date().toISOString(),
    modelVersion: "AeroSense-CoupledSurrogate-v1.0",
    initialObservations: {
      weather: initialWeather,
      pollution: initialPollution
    },
    plumeAnalysis,
    series: forecastSeries,
    peakForecast: peakStep,
    explanationText,
    grapRecommendation: peakStep.grapStage,
    grapAction: peakStep.aqi > 400 ? "Stage III/IV Severe Preparedness Required" : "Stage II Active Monitoring"
  };
}
