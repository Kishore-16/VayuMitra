from fastapi import APIRouter
from typing import List
from ..services.plume_dispersion import fetch_live_fires_as_schema, compute_live_plume_trajectories
from ..models.schemas import StubbleFire, PlumeTrajectory
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/plume", tags=["Stubble Plume Dispersion"])


@router.get("/fires", response_model=List[StubbleFire])
async def get_active_fires():
    """Returns live active stubble burning fire clusters from NASA FIRMS (VIIRS satellite)."""
    return await fetch_live_fires_as_schema()


@router.get("/trajectories", response_model=List[PlumeTrajectory])
async def get_plume_trajectories():
    """
    Returns forward Lagrangian smoke plume trajectories towards Delhi-NCR
    computed using live wind fields from Open-Meteo and fire data from NASA FIRMS.
    """
    forecast, _ = await get_cached_forecast()
    current = forecast[0]
    trajectories, _ = await compute_live_plume_trajectories(
        delhi_wind_speed=current.wind_speed_kmh,
        delhi_wind_dir=current.wind_dir_deg,
        delhi_pbl=current.pbl_height_m,
    )
    return trajectories
