export interface HourlyForecastPoint {
  timestamp: string;
  hour_offset: number;
  temp_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_dir_deg: number;
  wind_dir_compass: string;
  pbl_height_m: number;
  radiative_forcing_w_m2: number;
  inversion_strength_c_100m: number;
  inversion_layer_active: boolean;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  aqi: number;
  aqi_category: string;
  grap_stage: string;
  stubble_contribution_pct: number;
  urban_contribution_pct: number;
}

export interface CPCBStation {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  type: string;
  current_pm25: number;
  current_pm10: number;
  current_no2: number;
  current_o3: number;
  current_aqi: number;
  aqi_category: string;
  grap_stage: string;
  forecast_72h?: HourlyForecastPoint[];
}

export interface SoundingLevel {
  altitude_m: number;
  pressure_hpa: number;
  temp_c: number;
  dew_point_c: number;
  lapse_rate_c_km: number;
  pm25_ug_m3: number;
}

export interface InversionSounding {
  timestamp: string;
  hour_offset: number;
  surface_temp_c: number;
  pbl_height_m: number;
  inversion_base_m?: number;
  inversion_top_m?: number;
  inversion_strength_c_100m: number;
  capping_inversion: boolean;
  trapping_efficiency_pct: number;
  ventilation_coefficient_m2_s: number;
  levels: SoundingLevel[];
}

export interface StubbleFire {
  id: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  active_fires: number;
  mean_frp_mw: number;
  confidence: number;
  crop_type: string;
  estimated_emission_rate_kg_s: number;
  plume_injection_height_m: number;
}

export interface TrajectoryPoint {
  hour: number;
  lat: number;
  lon: number;
  altitude_m: number;
  pm25_concentration: number;
}

export interface PlumeTrajectory {
  fire_id: string;
  district: string;
  state: string;
  origin_lat: number;
  origin_lon: number;
  frp_mw: number;
  delhi_eta_hours: number;
  delhi_impact_pm25_ug_m3: number;
  trajectory_points: TrajectoryPoint[];
}

export interface AerosolFeedbackDiagnostic {
  hour_offset: number;
  timestamp: string;
  aod_550nm: number;
  solar_dimming_w_m2: number;
  surface_cooling_c: number;
  baseline_pbl_m: number;
  coupled_pbl_m: number;
  pbl_suppression_m: number;
  trapping_multiplier_pct: number;
  uncoupled_pm25: number;
  coupled_pm25: number;
  feedback_delta_pm25: number;
}

export interface GRAPStageDetail {
  stage: string;
  title: string;
  aqi_range: string;
  active: boolean;
  trigger_condition: string;
  key_actions: string[];
  public_health_guidelines: string[];
}

export interface GRAPStatusResponse {
  current_stage: string;
  max_forecast_aqi: number;
  critical_time_window: string;
  primary_driver: string;
  stages: GRAPStageDetail[];
}

export interface ForecastSummary {
  current_aqi: number;
  current_category: string;
  current_grap: string;
  current_pm25: number;
  current_temp: number;
  current_wind: string;
  current_pbl: string;
  peak_aqi_72h: number;
  avg_pm25_72h: number;
  max_inversion_strength: string;
  peak_stubble_share_pct: number;
  total_stations_monitored: number;
}

export interface SimulationParams {
  stubble_reduction_pct: number;
  traffic_reduction_pct: number;
  industrial_reduction_pct: number;
  dust_control_pct: number;
  wind_speed_multiplier: number;
  wind_direction_shift_deg: number;
}

export interface SimulationResult {
  baseline_avg_aqi: number;
  simulated_avg_aqi: number;
  aqi_reduction_pct: number;
  peak_pm25_baseline: number;
  peak_pm25_simulated: number;
  peak_reduction_ug_m3: number;
  baseline_grap_stage: string;
  simulated_grap_stage: string;
  hourly_comparison: {
    timestamp: string;
    hour_offset: number;
    baseline_aqi: number;
    simulated_aqi: number;
    baseline_pm25: number;
    simulated_pm25: number;
    reduction_ug_m3: number;
  }[];
}

export interface CartoBasemapOption {
  id: string;
  name: string;
  description: string;
  url?: string;
  base_url?: string;
  labels_url?: string;
  subdomains: string;
  maxZoom: number;
  attribution: string;
}

export interface CartoPresetRegion {
  name: string;
  center: [number, number];
  zoom: number;
  description: string;
}

export interface CartoConfig {
  carto_connected: boolean;
  api_key_status: string;
  carto_api_key_masked: string;
  engine_version: string;
  default_basemap: string;
  basemaps: Record<string, CartoBasemapOption>;
  presets: Record<string, CartoPresetRegion>;
  airshed_geojson?: any;
}

export interface AnomalyFocus {
  lat: number;
  lon: number;
  name: string;
  severity: string;
}
