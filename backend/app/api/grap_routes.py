from fastapi import APIRouter
from ..services.grap_advisor import get_grap_guidelines
from ..models.schemas import GRAPStatusResponse
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/grap", tags=["GRAP Decision Support"])

@router.get("/status", response_model=GRAPStatusResponse)
async def get_grap_status():
    """Returns statutory CAQM GRAP (Graded Response Action Plan) active stage and municipal enforcement actions."""
    forecast, _ = await get_cached_forecast()
    current_aqi = forecast[0].aqi
    max_forecast_aqi = max(p.aqi for p in forecast)
    return get_grap_guidelines(current_aqi, max_forecast_aqi)
