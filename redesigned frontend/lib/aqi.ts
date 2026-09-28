export interface AqiBand {
  min: number
  max: number
  label: string
  color: string
  advice: string
}

export const AQI_BANDS: AqiBand[] = [
  { min: 0, max: 50, label: 'Good', color: '#10b981', advice: 'Air is clean. Enjoy outdoor activities.' },
  { min: 51, max: 100, label: 'Satisfactory', color: '#84cc16', advice: 'Minor discomfort for very sensitive people.' },
  { min: 101, max: 200, label: 'Moderate', color: '#eab308', advice: 'People with asthma or heart disease should limit exertion.' },
  { min: 201, max: 300, label: 'Poor', color: '#f97316', advice: 'Breathing discomfort on long exposure. Reduce outdoor time.' },
  { min: 301, max: 400, label: 'Very Poor', color: '#ef4444', advice: 'Respiratory illness on prolonged exposure. Wear an N95 outdoors.' },
  { min: 401, max: 450, label: 'Severe', color: '#a855f7', advice: 'Affects healthy people. Avoid all outdoor exertion.' },
  { min: 451, max: 500, label: 'Severe+', color: '#be123c', advice: 'Health emergency. Stay indoors with air purification.' },
]

export function aqiBand(aqi: number): AqiBand {
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1]
}

export const aqiColor = (aqi: number) => aqiBand(aqi).color

const PM25_BREAKPOINTS: [number, number, number, number][] = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 350, 401, 450],
  [350, 500, 451, 500],
]

export function pm25ToAqi(pm: number): number {
  for (const [cLo, cHi, iLo, iHi] of PM25_BREAKPOINTS) {
    if (pm <= cHi) return Math.round(iLo + ((pm - cLo) / (cHi - cLo)) * (iHi - iLo))
  }
  return 500
}

export interface GrapStage {
  id: 'none' | 'I' | 'II' | 'III' | 'IV'
  name: string
  short: string
  range: string
  color: string
}

export const GRAP_STAGES: GrapStage[] = [
  { id: 'I', name: 'Stage I', short: 'Poor', range: 'AQI 201–300', color: '#f97316' },
  { id: 'II', name: 'Stage II', short: 'Very Poor', range: 'AQI 301–400', color: '#ef4444' },
  { id: 'III', name: 'Stage III', short: 'Severe', range: 'AQI 401–450', color: '#a855f7' },
  { id: 'IV', name: 'Stage IV', short: 'Severe+', range: 'AQI 451+', color: '#be123c' },
]

export function grapFromAqi(aqi: number): GrapStage {
  if (aqi > 450) return GRAP_STAGES[3]
  if (aqi > 400) return GRAP_STAGES[2]
  if (aqi > 300) return GRAP_STAGES[1]
  if (aqi > 200) return GRAP_STAGES[0]
  return { id: 'none', name: 'No GRAP', short: 'Below trigger', range: 'AQI ≤ 200', color: '#10b981' }
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export const toCompass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]

export function formatIST(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...opts,
  }).format(new Date(iso))
}

export function hourLabel(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function istHour(iso: string) {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date(iso)),
  )
}
