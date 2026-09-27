// CPCB National Air Quality Index (NAQI) Sub-index & Category Calculator

export function calculateAQI(pm25, pm10, o3 = 30, no2 = 40) {
  const pm25Sub = calcSubIndex(pm25, [0, 30, 60, 90, 120, 250, 380, 500], [0, 50, 100, 200, 300, 400, 450, 500]);
  const pm10Sub = calcSubIndex(pm10, [0, 50, 100, 250, 350, 430, 500, 600], [0, 50, 100, 200, 300, 400, 450, 500]);
  const o3Sub = calcSubIndex(o3, [0, 50, 100, 168, 208, 748, 1000], [0, 50, 100, 200, 300, 400, 500]);
  const no2Sub = calcSubIndex(no2, [0, 40, 80, 180, 280, 400, 800], [0, 50, 100, 200, 300, 400, 500]);

  // Overall AQI is the maximum of responsible sub-indices
  const aqi = Math.max(pm25Sub, pm10Sub, o3Sub, no2Sub);

  let category = "Good";
  let color = "#2E9B4F";
  let grapStage = "Stage I (Monitoring)";
  let grapAction = "Standard pollution prevention measures.";

  if (aqi > 450) {
    category = "Severe+";
    color = "#581845"; // Deep Maroon
    grapStage = "Stage IV (Emergency)";
    grapAction = "Ban on BS-IV diesel heavy vehicles, entry of trucks restricted, school closures recommended.";
  } else if (aqi > 400) {
    category = "Severe";
    color = "#8C1D2B"; // Dark Red
    grapStage = "Stage III (Severe)";
    grapAction = "Strict ban on non-essential construction & demolition, closure of stone crushers.";
  } else if (aqi > 300) {
    category = "Very Poor";
    color = "#E13B3B"; // Red
    grapStage = "Stage II (Very Poor)";
    grapAction = "Enhance parking fees to discourage private transport, increase diesel bus frequency.";
  } else if (aqi > 200) {
    category = "Poor";
    color = "#F08C1D"; // Orange
    grapStage = "Stage I (Poor)";
    grapAction = "Mechanized sweeping & anti-smog water sprinkling on major roads.";
  } else if (aqi > 100) {
    category = "Moderate";
    color = "#F4C430"; // Yellow
    grapStage = "Normal Operations";
    grapAction = "Regular dust control monitoring.";
  } else if (aqi > 50) {
    category = "Satisfactory";
    color = "#8FCB3E"; // Light Green
    grapStage = "Normal Operations";
    grapAction = "Clean air baseline maintained.";
  }

  return {
    aqi,
    category,
    color,
    grapStage,
    grapAction,
    prominentPollutant: pm25Sub >= pm10Sub ? "PM2.5" : "PM10",
    subIndices: { pm25: pm25Sub, pm10: pm10Sub, o3: o3Sub, no2: no2Sub }
  };
}

function calcSubIndex(val, concBreaks, indexBreaks) {
  if (val <= 0) return 0;
  for (let i = 0; i < concBreaks.length - 1; i++) {
    if (val >= concBreaks[i] && val <= concBreaks[i + 1]) {
      const cLow = concBreaks[i];
      const cHigh = concBreaks[i + 1];
      const iLow = indexBreaks[i];
      const iHigh = indexBreaks[i + 1];
      return Math.round(iLow + ((iHigh - iLow) / (cHigh - cLow)) * (val - cLow));
    }
  }
  return 500;
}
