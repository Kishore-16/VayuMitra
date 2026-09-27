from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..services.data_collector import build_72h_forecast_dataset
from ..models.schemas import HourlyForecastPoint, AerosolFeedbackDiagnostic

router = APIRouter(prefix="/api/forecast", tags=["72-Hour Forecast"])

# Simple cache for fast responsiveness
_cache: Dict[str, Any] = {}

async def get_cached_forecast():
    if "forecast" not in _cache:
        points, feedback = await build_72h_forecast_dataset()
        _cache["forecast"] = points
        _cache["feedback"] = feedback
    return _cache["forecast"], _cache["feedback"]

@router.get("/72h", response_model=List[HourlyForecastPoint])
async def get_72h_forecast():
    """Returns the regional coupled 72-hour hourly forecast with weather, pollutants, and AQI."""
    forecast, _ = await get_cached_forecast()
    return forecast

@router.get("/feedback", response_model=List[AerosolFeedbackDiagnostic])
async def get_feedback_diagnostics():
    """Returns two-way aerosol-radiation-PBL coupling diagnostics for the 72h window."""
    _, feedback = await get_cached_forecast()
    return feedback

@router.get("/summary")
async def get_forecast_summary():
    """Returns high-level summary KPIs (peak AQI, average PM2.5, critical inversion windows)."""
    forecast, _ = await get_cached_forecast()
    
    current = forecast[0]
    peak_aqi = max(p.aqi for p in forecast)
    avg_pm25 = round(sum(p.pm25 for p in forecast) / len(forecast), 1)
    max_inversion = max(p.inversion_strength_c_100m for p in forecast)
    peak_stubble_share = max(p.stubble_contribution_pct for p in forecast)
    
    return {
        "current_aqi": current.aqi,
        "current_category": current.aqi_category,
        "current_grap": current.grap_stage,
        "current_pm25": current.pm25,
        "current_temp": current.temp_c,
        "current_wind": f"{current.wind_speed_kmh} km/h ({current.wind_dir_compass})",
        "current_pbl": f"{current.pbl_height_m} m",
        "peak_aqi_72h": peak_aqi,
        "avg_pm25_72h": avg_pm25,
        "max_inversion_strength": f"{max_inversion} °C/100m",
        "peak_stubble_share_pct": peak_stubble_share,
        "total_stations_monitored": 34
    }

@router.post("/refresh")
async def refresh_forecast():
    """Forces cache refresh to re-ingest latest data."""
    points, feedback = await build_72h_forecast_dataset()
    _cache["forecast"] = points
    _cache["feedback"] = feedback
    return {"status": "success", "message": "Forecast dataset refreshed successfully"}
