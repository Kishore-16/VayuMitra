from fastapi import APIRouter
from ..services.anomaly_detector import get_industrial_anomalies

router = APIRouter(
    prefix="/api/anomalies",
    tags=["Industrial Anomalies"]
)

@router.get("/current")
async def get_current_anomalies():
    """
    Returns real-time detected anomalies comparing dynamic baselines vs actuals 
    across major industrial zones.
    """
    return get_industrial_anomalies()
