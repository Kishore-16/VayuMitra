from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.forecast_routes import router as forecast_router
from .api.stations_routes import router as stations_router
from .api.inversion_routes import router as inversion_router
from .api.plume_routes import router as plume_router
from .api.grap_routes import router as grap_router
from .api.simulation_routes import router as simulation_router

app = FastAPI(
    title="DELHI-AIR-COUPLED API",
    description="High-Resolution Coupled Meteorology-Chemistry 72-Hour AQI Forecasting & Inversion Tracking System for Delhi-NCR",
    version="1.0.0"
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(forecast_router)
app.include_router(stations_router)
app.include_router(inversion_router)
app.include_router(plume_router)
app.include_router(grap_router)
app.include_router(simulation_router)

@app.get("/")
async def root():
    return {
        "system": "DELHI-AIR-COUPLED Operational Forecasting System",
        "version": "1.0.0",
        "status": "ONLINE",
        "domain": "Delhi-NCR & Indo-Gangetic Plain",
        "spatial_resolution": "High-Resolution Coupled D01-D03",
        "forecast_horizon": "72 Hours (Hourly)",
        "endpoints": {
            "72h_forecast": "/api/forecast/72h",
            "forecast_summary": "/api/forecast/summary",
            "aerosol_feedback": "/api/forecast/feedback",
            "cpcb_stations": "/api/stations",
            "inversion_sounding": "/api/inversion/sounding?hour=0",
            "inversion_timeline": "/api/inversion/timeline",
            "stubble_fires": "/api/plume/fires",
            "plume_trajectories": "/api/plume/trajectories",
            "grap_status": "/api/grap/status",
            "policy_simulation": "/api/simulation/run"
        }
    }
