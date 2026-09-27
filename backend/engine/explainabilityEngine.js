// Natural Language Cause ➔ Effect Explainability Engine

export function generateExplanation(peakStep, plumeAnalysis, initialWeather) {
  const hour = peakStep.hourOffset;
  const aqi = peakStep.aqi;
  const cat = peakStep.aqiCategory;
  const isiCat = peakStep.inversionCategory;
  const pbl = peakStep.pblHeightM;
  const wind = peakStep.windSpeedMs;
  const plumePM = peakStep.plumePM25Contrib;

  let causeFactors = [];

  if (plumePM > 30) {
    causeFactors.push(`stubble-burning smoke plume arriving from ${plumeAnalysis.windDirectionLabel} (contributing +${plumePM} µg/m³ PM2.5)`);
  }

  if (peakStep.isi >= 0.5) {
    causeFactors.push(`a ${isiCat} surface temperature inversion (ISI: ${peakStep.isi}) compressing the planetary boundary layer to ${pbl}m`);
  }

  if (wind <= 2.0) {
    causeFactors.push(`stagnant surface wind speeds of only ${wind} m/s suppressing atmospheric dispersion`);
  }

  const causeClause = causeFactors.length > 0 ? causeFactors.join(", combined with ") : "ambient local emissions accumulation";

  return `AQI is forecasted to peak at ${aqi} (${cat}) at +${hour} hours. This deterioration is driven by ${causeClause}. The resulting aerosol optical depth reduces surface radiation, reinforcing thermal inversion and maintaining high ground-level PM2.5 persistence.`;
}
