from fastapi import APIRouter
from typing import List
from ..services.plume_dispersion import load_stubble_fires, compute_plume_trajectories
from ..models.schemas import StubbleFire, PlumeTrajectory
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/plume", tags=["Stubble Plume Dispersion"])

@router.get("/fires", response_model=List[StubbleFire])
async def get_active_fires():
    """Returns all regional active stubble burning fire clusters with Fire Radiative Power (FRP)."""
    return load_stubble_fires()

@router.get("/trajectories", response_model=List[PlumeTrajectory])
async def get_plume_trajectories():
    """Returns forward Lagrangian smoke plume trajectories towards Delhi-NCR with arrival time (ETA)."""
    forecast, _ = await get_cached_forecast()
    current = forecast[0]
    return compute_plume_trajectories(
        wind_speed_kmh=current.wind_speed_kmh,
        wind_dir_deg=current.wind_dir_deg,
        current_pbl_m=current.pbl_height_m
    )
