// Stubble-Burning Plume Dispersion & Advection Module

export function calculatePlumeDispersion(fireEvents, windSpeedMs, windDirDeg) {
  // Average distance from Punjab fires to Delhi NCR is ~250 km
  const totalDistanceKm = 240;
  const windSpeedKmh = Math.max(2.0, windSpeedMs * 3.6);
  const etaHours = Math.round(totalDistanceKm / windSpeedKmh);

  const totalFRP = fireEvents.reduce((acc, f) => acc + f.frpMW, 0);

  // PM2.5 contribution to Delhi (µg/m³) is proportional to total FRP and inversely proportional to wind speed
  const plumePM25Contrib = Math.round((totalFRP * 1.85) / Math.sqrt(windSpeedMs));

  // Generate plume trajectory polygons across 72 hours
  const timesteps = [0, 6, 12, 24, 48, 72];
  const plumeTimeline = timesteps.map(t => {
    // Fraction of distance traveled toward Delhi
    const progressFraction = Math.min(1.0, (t * windSpeedKmh) / totalDistanceKm);
    
    // Centroid lat/lon interpolated from Punjab (30.8, 75.2) to Delhi (28.65, 77.2)
    const centroidLat = 30.8 - (progressFraction * (30.8 - 28.65));
    const centroidLon = 75.2 + (progressFraction * (77.2 - 75.2));
    
    // Plume spreads outward as it travels (Gaussian dispersion)
    const spreadKm = 20 + (progressFraction * 60);

    return {
      hour: t,
      timeLabel: t === 0 ? "Now (t=0h)" : `+${t} Hours`,
      progressPct: Math.round(progressFraction * 100),
      centroid: { lat: parseFloat(centroidLat.toFixed(3)), lon: parseFloat(centroidLon.toFixed(3)) },
      spreadRadiusKm: Math.round(spreadKm),
      estimatedPM25: Math.round(plumePM25Contrib * Math.min(1.0, progressFraction * 1.2)),
      reachedDelhi: progressFraction >= 0.85
    };
  });

  return {
    activeFiresCount: fireEvents.reduce((acc, f) => acc + f.activeCount, 0),
    totalFRP: parseFloat(totalFRP.toFixed(1)),
    etaHours,
    estimatedPM25Contrib: plumePM25Contrib,
    windDirectionLabel: "North-Westerly (NW ➔ SE)",
    plumeTimeline,
    alertLevel: plumePM25Contrib > 90 ? "CRITICAL" : plumePM25Contrib > 45 ? "ELEVATED" : "LOW"
  };
}
