from fastapi import APIRouter
from ..services.grap_advisor import get_grap_guidelines
from ..services.plume_dispersion import compute_live_plume_trajectories
from ..models.schemas import GRAPStatusResponse
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/grap", tags=["GRAP Decision Support"])


@router.get("/status", response_model=GRAPStatusResponse)
async def get_grap_status():
    """
    Returns statutory CAQM GRAP (Graded Response Action Plan) active stage
    with pre-emptive plume-triggered escalation.

    The system fetches live fire data and wind trajectories to predict
    whether a stubble plume will push Delhi's AQI beyond safe thresholds
    and raises GRAP alerts BEFORE the pollution arrives.
    """
    forecast, _ = await get_cached_forecast()
    current = forecast[0]
    current_aqi = current.aqi
    max_forecast_aqi = max(p.aqi for p in forecast)

    # Get live plume predictions
    try:
        trajectories, total_plume_impact = await compute_live_plume_trajectories(
            delhi_wind_speed=current.wind_speed_kmh,
            delhi_wind_dir=current.wind_dir_deg,
            delhi_pbl=current.pbl_height_m,
        )

        # Find the earliest plume arrival
        earliest_eta = -1.0
        for traj in trajectories:
            if traj.delhi_eta_hours > 0:
                if earliest_eta < 0 or traj.delhi_eta_hours < earliest_eta:
                    earliest_eta = traj.delhi_eta_hours
    except Exception as e:
        print(f"[GRAP] Plume prediction failed, using base AQI only: {e}")
        total_plume_impact = 0.0
        earliest_eta = -1.0

    return get_grap_guidelines(
        current_aqi=current_aqi,
        max_forecast_aqi=max_forecast_aqi,
        plume_impact_pm25=total_plume_impact,
        plume_eta_hours=earliest_eta,
        inversion_active=current.inversion_layer_active,
    )
