from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional, List, Dict, Any

# --- Section 2 Pydantic Shared Data Contracts ---

class WeatherRecord(BaseModel):
    timestamp: datetime
    zone_id: str
    lat: float
    lon: float
    temperature_c: float
    wind_speed_ms: float
    wind_dir_deg: float
    pbl_height_m: float
    surface_pressure_hpa: float
    vertical_temp_profile_c: List[float]
    source_mode: Literal["mock", "live", "live-ready"]

class PollutionRecord(BaseModel):
    timestamp: datetime
    zone_id: str
    lat: float
    lon: float
    pm25: float
    pm10: float
    o3: float
    no2: float
    so2: Optional[float] = None
    co: Optional[float] = None
    source_mode: Literal["mock", "live", "live-ready"]

class FireEvent(BaseModel):
    timestamp: datetime
    lat: float
    lon: float
    frp_mw: float
    confidence: float
    region: str
    source_mode: Literal["mock", "live", "live-ready"]

class SatelliteTile(BaseModel):
    timestamp: datetime
    product: Literal["AOD_550nm", "HCHO", "NO2", "O3"]
    bbox: List[float]
    grid_resolution_km: float
    values_ref: str
    source_mode: Literal["mock", "live", "live-ready"]

# --- Core Processing Schemas ---

class InversionResult(BaseModel):
    timestamp: datetime
    zone_id: str
    isi: float
    category: str
    color: str
    delta_t: float
    pbl_height_m: float
    description: str

class PlumeTimelineItem(BaseModel):
    hour: int
    time_label: str
    progress_pct: int
    centroid: Dict[str, float]
    spread_radius_km: int
    estimated_pm25: float
    reached_delhi: bool

class PlumeForecast(BaseModel):
    source_region: str
    active_fires_count: int
    total_frp: float
    eta_hours: float
    estimated_pm25_contribution: float
    wind_direction_label: str
    alert_level: str
    timeline: List[PlumeTimelineItem]

class ForecastPoint(BaseModel):
    step: int
    hour_offset: int
    valid_ts: datetime
    zone_id: str
    pm25: float
    pm10: float
    o3: float
    nox: float
    aqi: int
    aqi_category: str
    aqi_color: str
    grap_stage: str
    isi: float
    inversion_category: str
    pbl_height_m: float
    temperature_c: float
    wind_speed_ms: float
    plume_pm25_contrib: float
    feedback_cooling_c: float

class CausalChainItem(BaseModel):
    icon: str
    label: str

class ExplainResult(BaseModel):
    forecast_id: Optional[int] = None
    headline: str
    causal_chain: List[CausalChainItem]
    narrative: str
    confidence_pct: int

class AlertRecord(BaseModel):
    id: str
    forecast_id: Optional[int] = None
    zone_id: str
    triggered_ts: datetime
    threshold_crossed: int
    grap_stage: str
    status: str = "new"  # new | acknowledged | actioned
    title: str
    message: str
    delivered_channels: List[str] = ["in-app", "webhook_stub"]

class DataSourceStatus(BaseModel):
    data_type: str
    mode: str
    provider: str
    last_fetch_ts: datetime
    health_status: str
    label: str
    mock_description: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class UserSettings(BaseModel):
    email: str
    role: str
    language_pref: str = "en"
    notification_prefs: Dict[str, Any] = {"email": True, "sms": False, "grap_alerts": True}
