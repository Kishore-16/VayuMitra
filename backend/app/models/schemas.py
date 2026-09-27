from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AQIInfo(BaseModel):
    aqi: int
    category: str
    color: str
    prominent_pollutant: str
    grap_stage: str

class HourlyForecastPoint(BaseModel):
    timestamp: str
    hour_offset: int
    temp_c: float
    humidity_pct: float
    wind_speed_kmh: float
    wind_dir_deg: float
    wind_dir_compass: str
    pbl_height_m: float
    radiative_forcing_w_m2: float
    inversion_strength_c_100m: float
    inversion_layer_active: bool
    pm25: float
    pm10: float
    no2: float
    o3: float
    aqi: int
    aqi_category: str
    grap_stage: str
    stubble_contribution_pct: float
    urban_contribution_pct: float

class CPCBStation(BaseModel):
    id: str
    name: str
    city: str
    state: str
    lat: float
    lon: float
    type: str
    current_pm25: float
    current_pm10: float
    current_no2: float
    current_o3: float
    current_aqi: int
    aqi_category: str
    grap_stage: str
    forecast_72h: Optional[List[HourlyForecastPoint]] = None

class SoundingLevel(BaseModel):
    altitude_m: float
    pressure_hpa: float
    temp_c: float
    dew_point_c: float
    lapse_rate_c_km: float
    pm25_ug_m3: float

class InversionSounding(BaseModel):
    timestamp: str
    hour_offset: int
    surface_temp_c: float
    pbl_height_m: float
    inversion_base_m: Optional[float]
    inversion_top_m: Optional[float]
    inversion_strength_c_100m: float
    capping_inversion: bool
    trapping_efficiency_pct: float
    ventilation_coefficient_m2_s: float
    levels: List[SoundingLevel]

class StubbleFire(BaseModel):
    id: str
    district: str
    state: str
    lat: float
    lon: float
    active_fires: int
    mean_frp_mw: float
    confidence: int
    crop_type: str
    estimated_emission_rate_kg_s: float
    plume_injection_height_m: float

class TrajectoryPoint(BaseModel):
    hour: int
    lat: float
    lon: float
    altitude_m: float
    pm25_concentration: float

class PlumeTrajectory(BaseModel):
    fire_id: str
    district: str
    state: str
    origin_lat: float
    origin_lon: float
    frp_mw: float
    delhi_eta_hours: float
    delhi_impact_pm25_ug_m3: float
    trajectory_points: List[TrajectoryPoint]

class AerosolFeedbackDiagnostic(BaseModel):
    hour_offset: int
    timestamp: str
    aod_550nm: float
    solar_dimming_w_m2: float
    surface_cooling_c: float
    baseline_pbl_m: float
    coupled_pbl_m: float
    pbl_suppression_m: float
    trapping_multiplier_pct: float
    uncoupled_pm25: float
    coupled_pm25: float
    feedback_delta_pm25: float

class GRAPStageDetail(BaseModel):
    stage: str
    title: str
    aqi_range: str
    active: bool
    trigger_condition: str
    key_actions: List[str]
    public_health_guidelines: List[str]

class GRAPStatusResponse(BaseModel):
    current_stage: str
    max_forecast_aqi: int
    critical_time_window: str
    primary_driver: str
    stages: List[GRAPStageDetail]

class SimulationParams(BaseModel):
    stubble_reduction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    traffic_reduction_pct: float = Field(default=0.0, ge=0.0, le=80.0)
    industrial_reduction_pct: float = Field(default=0.0, ge=0.0, le=80.0)
    dust_control_pct: float = Field(default=0.0, ge=0.0, le=80.0)
    wind_speed_multiplier: float = Field(default=1.0, ge=0.3, le=2.5)
    wind_direction_shift_deg: float = Field(default=0.0, ge=-90.0, le=90.0)

class SimulationResult(BaseModel):
    baseline_avg_aqi: int
    simulated_avg_aqi: int
    aqi_reduction_pct: float
    peak_pm25_baseline: float
    peak_pm25_simulated: float
    peak_reduction_ug_m3: float
    baseline_grap_stage: str
    simulated_grap_stage: str
    hourly_comparison: List[Dict[str, Any]]
