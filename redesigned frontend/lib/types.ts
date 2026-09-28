export interface HourlyForecastPoint {
  timestamp: string
  hour_offset: number
  temp_c: number
  humidity_pct: number
  wind_speed_kmh: number
  wind_dir_deg: number
  wind_dir_compass: string
  pbl_height_m: number
  radiative_forcing_w_m2: number
  inversion_strength_c_100m: number
  inversion_layer_active: boolean
  pm25: number
  pm10: number
  no2: number
  o3: number
  aqi: number
  aqi_category: string
  grap_stage: string
  stubble_contribution_pct: number
  urban_contribution_pct: number
}

export interface CPCBStation {
  id: string
  name: string
  city: string
  state: string
  lat: number
  lon: number
  type: string
  current_pm25: number
  current_pm10: number
  current_no2: number
  current_o3: number
  current_aqi: number
  aqi_category: string
  grap_stage: string
  multiplier: number
}

export interface SoundingLevel {
  altitude_m: number
  pressure_hpa: number
  temp_c: number
  dew_point_c: number
  lapse_rate_c_km: number
  pm25_ug_m3: number
}

export interface InversionSounding {
  timestamp: string
  hour_offset: number
  surface_temp_c: number
  pbl_height_m: number
  inversion_base_m?: number
  inversion_top_m?: number
  inversion_strength_c_100m: number
  capping_inversion: boolean
  trapping_efficiency_pct: number
  ventilation_coefficient_m2_s: number
  levels: SoundingLevel[]
}

export interface StubbleFire {
  id: string
  district: string
  state: string
  lat: number
  lon: number
  active_fires: number
  mean_frp_mw: number
  confidence: number
  crop_type: string
  estimated_emission_rate_kg_s: number
  plume_injection_height_m: number
}

export interface PlumeTrajectory {
  fire_id: string
  district: string
  state: string
  origin_lat: number
  origin_lon: number
  frp_mw: number
  delhi_eta_hours: number
  delhi_impact_pm25_ug_m3: number
  trajectory_points: {
    hour: number
    lat: number
    lon: number
    altitude_m: number
    pm25_concentration: number
  }[]
}

export interface AerosolFeedbackDiagnostic {
  hour_offset: number
  timestamp: string
  aod_550nm: number
  solar_dimming_w_m2: number
  surface_cooling_c: number
  baseline_pbl_m: number
  coupled_pbl_m: number
  pbl_suppression_m: number
  trapping_multiplier_pct: number
  uncoupled_pm25: number
  coupled_pm25: number
  feedback_delta_pm25: number
}

export interface IndustrialAnomaly {
  id: string
  zone: string
  sector: string
  lat: number
  lon: number
  expected_pm25: number
  actual_pm25: number
  excess_pct: number
  z_score: number
  severity: 'watch' | 'elevated' | 'critical'
  likely_source: string
  detected_at: string
}

export interface DashboardData {
  forecast: HourlyForecastPoint[]
  stations: CPCBStation[]
  fires: StubbleFire[]
  trajectories: PlumeTrajectory[]
  feedback: AerosolFeedbackDiagnostic[]
  anomalies: IndustrialAnomaly[]
  issuedAt: string
}

export interface SimulationInput {
  stubbleBan: number
  vehicleCut: number
  industrialCut: number
  windMultiplier: number
}

export interface SimulationPoint {
  hour_offset: number
  label: string
  baseline_aqi: number
  mitigated_aqi: number
  baseline_pm25: number
  mitigated_pm25: number
}

export interface SimulationResult {
  points: SimulationPoint[]
  baselinePeakAqi: number
  mitigatedPeakAqi: number
  pm25Avoided: number
  baselineStage: string
  mitigatedStage: string
}

export type TabId = 'overview' | 'map' | 'heatmap' | 'sounding' | 'feedback' | 'plumes' | 'grap' | 'anomalies'
