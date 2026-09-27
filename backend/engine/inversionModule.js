// Atmospheric Inversion Detection & Strength Tracking Module

export function calculateInversion(verticalTempProfileC, pblHeightM) {
  if (!verticalTempProfileC || verticalTempProfileC.length < 2) {
    return { isi: 0, category: "Low", description: "No inversion detected (neutral lapse rate)" };
  }

  const surfaceT = verticalTempProfileC[0];
  const topT = verticalTempProfileC[verticalTempProfileC.length - 1];
  const deltaT = topT - surfaceT; // Positive deltaT = temperature increases with altitude (inversion)

  let isi = 0;
  if (deltaT > 0) {
    // Max expected lapse rate inversion in Delhi winter is ~3.5°C over 500m
    isi = Math.min(1.0, deltaT / 3.2);
  }

  // Adjust ISI slightly if PBL is severely collapsed (< 200m)
  if (pblHeightM < 200) {
    isi = Math.min(1.0, isi * 1.15);
  }

  isi = parseFloat(isi.toFixed(2));

  let category = "Low";
  let color = "#2E9B4F"; // Good/Low
  if (isi >= 0.75) {
    category = "Severe";
    color = "#8C1D2B";
  } else if (isi >= 0.50) {
    category = "High";
    color = "#E13B3B";
  } else if (isi >= 0.25) {
    category = "Moderate";
    color = "#F4C430";
  }

  return {
    isi,
    category,
    color,
    deltaT: parseFloat(deltaT.toFixed(2)),
    pblHeightM,
    description: isi > 0.25
      ? `Temperature inversion active (+${deltaT.toFixed(1)}°C gradient). Boundary layer trapped at ${pblHeightM}m.`
      : `Unstable/normal vertical mixing. Boundary layer open at ${pblHeightM}m.`
  };
}
