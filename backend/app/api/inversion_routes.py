from fastapi import APIRouter, Query
from typing import List, Dict, Any
from ..services.inversion_engine import generate_vertical_sounding
from ..models.schemas import InversionSounding
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/inversion", tags=["Inversion Analysis"])

@router.get("/sounding", response_model=InversionSounding)
async def get_inversion_sounding(hour: int = Query(default=0, ge=0, le=71)):
    """
    Returns vertical atmospheric sounding profile (altitude vs temperature/dewpoint/PM2.5) 
    and inversion diagnostics for the specified forecast hour offset.
    """
    forecast, _ = await get_cached_forecast()
    pt = forecast[hour] if hour < len(forecast) else forecast[0]
    
    sounding = generate_vertical_sounding(
        hour_offset=pt.hour_offset,
        surface_temp_c=pt.temp_c,
        surface_humidity_pct=pt.humidity_pct,
        wind_speed_kmh=pt.wind_speed_kmh,
        pbl_height_m=pt.pbl_height_m,
        surface_pm25=pt.pm25,
        timestamp=pt.timestamp
    )
    return sounding

@router.get("/timeline")
async def get_inversion_timeline():
    """Returns 72-hour timeline of PBL height, inversion strength, and ventilation coefficients."""
    forecast, _ = await get_cached_forecast()
    
    timeline = []
    for pt in forecast:
        wind_ms = pt.wind_speed_kmh / 3.6
        vent_coeff = round(pt.pbl_height_m * wind_ms, 1)
        timeline.append({
            "timestamp": pt.timestamp,
            "hour_offset": pt.hour_offset,
            "pbl_height_m": pt.pbl_height_m,
            "inversion_strength_c_100m": pt.inversion_strength_c_100m,
            "inversion_active": pt.inversion_layer_active,
            "ventilation_coeff_m2_s": vent_coeff,
            "dispersion_quality": "Extremely Stagnant" if vent_coeff < 2000 else ("Poor" if vent_coeff < 6000 else "Favorable")
        })
    return timeline
