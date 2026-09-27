from fastapi import APIRouter, HTTPException
from typing import List
from ..services.data_collector import compute_station_downscaled_forecasts
from ..models.schemas import CPCBStation
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/stations", tags=["CPCB Stations"])

_stations_cache = None

async def get_cached_stations() -> List[CPCBStation]:
    global _stations_cache
    forecast, _ = await get_cached_forecast()
    _stations_cache = compute_station_downscaled_forecasts(forecast)
    return _stations_cache

@router.get("", response_model=List[CPCBStation])
async def get_all_stations():
    """Returns all 34+ CPCB monitoring stations with current readings and AQI."""
    return await get_cached_stations()

@router.get("/{station_id}", response_model=CPCBStation)
async def get_station_by_id(station_id: str):
    """Returns detailed station readings and 72-hour hourly forecast timeline for a specific station."""
    stations = await get_cached_stations()
    for s in stations:
        if s.id.lower() == station_id.lower():
            return s
    raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found")
