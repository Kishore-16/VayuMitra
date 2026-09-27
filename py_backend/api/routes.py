import os
import yaml
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from database import get_db
from models.db_models import ZoneDB, DataSourceConfigDB, AlertDB, RunLogDB, ForecastDB, UserDB
from models.schemas import (
    WeatherRecord, PollutionRecord, FireEvent, SatelliteTile, InversionResult,
    PlumeForecast, ForecastPoint, ExplainResult, AlertRecord, DataSourceStatus,
    UserLogin, UserToken, UserSettings
)
from engines.coupling_engine import run_coupled_simulation
from engines.explain_engine import generate_explanation
from engines.alert_engine import AlertEngine
from adapters.factory import get_adapter

router = APIRouter()
alert_engine = AlertEngine()

# Active WebSocket connections registry
active_connections: List[WebSocket] = []

# --- 1. Auth ---
@router.post("/auth/login", response_model=UserToken)
def login(creds: UserLogin):
    role = "admin" if "admin" in creds.email else ("official" if "moes" in creds.email or "cpcb" in creds.email else "public")
    return UserToken(access_token=f"mock_jwt_token_for_{creds.email}", role=role)

# --- 2. Public Summary ---
@router.get("/public/summary")
def get_public_summary(zone_id: str = "DELHI_CENTRAL"):
    series, plume, weather, pollution = run_coupled_simulation(zone_id)
    current = series[0]
    return {
        "zone_id": zone_id,
        "current_aqi": current.aqi,
        "category": current.aqi_category,
        "color": current.aqi_color,
        "pm25": current.pm25,
        "advisory": f"Air quality is {current.aqi_category}. Sensitive groups should limit outdoor activity.",
        "simplified_3day_strip": [
            {"day": "Today", "aqi": series[0].aqi, "category": series[0].aqi_category},
            {"day": "Tomorrow", "aqi": series[8].aqi, "category": series[8].aqi_category},
            {"day": "Day 3", "aqi": series[16].aqi, "category": series[16].aqi_category}
        ]
    }

# --- 3. Zones List ---
@router.get("/zones")
def get_zones(db: Session = Depends(get_db)):
    zones = db.query(ZoneDB).all()
    res = []
    pollution_adapter = get_adapter("pollution")
    for z in zones:
        obs = pollution_adapter.fetch_pollution(z.zone_id)
        series, _, _, _ = run_coupled_simulation(z.zone_id)
        res.append({
            "zone_id": z.zone_id,
            "name": z.name,
            "centroid_lat": z.centroid_lat,
            "centroid_lon": z.centroid_lon,
            "current_pm25": obs.pm25,
            "current_aqi": series[0].aqi,
            "aqi_category": series[0].aqi_category,
            "aqi_color": series[0].aqi_color
        })
    return res

# --- 4. Dashboard Summary ---
@router.get("/dashboard/summary")
def get_dashboard_summary(zone_id: str = "DELHI_CENTRAL"):
    series, plume, weather, pollution = run_coupled_simulation(zone_id)
    current = series[0]
    peak = max(series, key=lambda s: s.aqi)
    return {
        "zone_id": zone_id,
        "current_aqi": current.aqi,
        "aqi_delta_24h": "+42 pts",
        "current_pm25": current.pm25,
        "pm25_exceedance": "3.07x Limit",
        "current_pm10": current.pm10,
        "current_o3": current.o3,
        "current_isi": current.isi,
        "isi_category": current.inversion_category,
        "pbl_height_m": current.pbl_height_m,
        "plume_eta_hours": plume.eta_hours,
        "plume_pm25_contrib": plume.estimated_pm25_contribution,
        "peak_forecast_aqi": peak.aqi,
        "peak_forecast_hour": peak.hour_offset
    }

# --- 5. Forecast Series (72h) ---
@router.get("/forecast/{zone_id}", response_model=List[ForecastPoint])
def get_forecast(zone_id: str = "DELHI_CENTRAL", horizon: str = "72h"):
    series, _, _, _ = run_coupled_simulation(zone_id)
    return series

# --- 6. Inversion Data ---
@router.get("/inversion/{zone_id}")
def get_inversion(zone_id: str = "DELHI_CENTRAL"):
    weather_adapter = get_adapter("weather")
    weather = weather_adapter.fetch_weather(zone_id)
    series, _, _, _ = run_coupled_simulation(zone_id)
    return {
        "zone_id": zone_id,
        "current_isi": series[0].isi,
        "category": series[0].inversion_category,
        "pbl_height_m": series[0].pbl_height_m,
        "vertical_profile": [
            {"altitude_m": idx * 125, "temperature_c": t}
            for idx, t in enumerate(weather.vertical_temp_profile_c)
        ],
        "isi_72h_trend": [
            {"hour": s.hour_offset, "isi": s.isi, "pbl_height_m": s.pbl_height_m}
            for s in series
        ]
    }

# --- 7. PBL Height Trend ---
@router.get("/pbl/{zone_id}")
def get_pbl_trend(zone_id: str = "DELHI_CENTRAL"):
    series, _, _, _ = run_coupled_simulation(zone_id)
    return [
        {"hour": s.hour_offset, "pbl_height_m": s.pbl_height_m, "isi": s.isi}
        for s in series
    ]

# --- 8. Plume Timeline ---
@router.get("/plume/timeline", response_model=PlumeForecast)
def get_plume_timeline(region: str = "punjab_haryana"):
    fire_adapter = get_adapter("fire")
    weather_adapter = get_adapter("weather")
    fires = fire_adapter.fetch_fire_events(region)
    weather = weather_adapter.fetch_weather("DELHI_CENTRAL")
    from engines.plume_engine import compute_plume_dispersion
    return compute_plume_dispersion(fires, weather.wind_speed_ms, weather.wind_dir_deg)

# --- 9. Fire Events ---
@router.get("/fire-events", response_model=List[FireEvent])
def get_fire_events(region: str = "punjab_haryana"):
    fire_adapter = get_adapter("fire")
    return fire_adapter.fetch_fire_events(region)

# --- 10. Explainability ---
@router.get("/explain/{forecast_id}", response_model=ExplainResult)
def get_explanation(forecast_id: int):
    series, plume, weather, _ = run_coupled_simulation("DELHI_CENTRAL")
    peak = max(series, key=lambda s: s.aqi)
    return generate_explanation(peak, plume, weather)

# --- 11. Alerts GET ---
@router.get("/alerts", response_model=List[AlertRecord])
def get_alerts(zone_id: Optional[str] = None, status: Optional[str] = None):
    series, plume, _, _ = run_coupled_simulation("DELHI_CENTRAL")
    return alert_engine.process_forecast(series, plume)

# --- 12. Alerts PATCH ---
@router.patch("/alerts/{alert_id}")
def patch_alert(alert_id: str, action: str = "acknowledge"):
    return {
        "id": alert_id,
        "status": "acknowledged" if action == "acknowledge" else "actioned",
        "updated_at": datetime.utcnow().isoformat()
    }

# --- 13. GRAP Reference ---
@router.get("/grap/reference")
def get_grap_reference():
    return [
        {"stage": "Stage I", "range": "AQI 201-300", "title": "Poor", "actions": "Mechanized road sweeping & water sprinkling."},
        {"stage": "Stage II", "range": "AQI 301-400", "title": "Very Poor", "actions": "Enhance parking fees, increase diesel bus frequency."},
        {"stage": "Stage III", "range": "AQI 401-450", "title": "Severe", "actions": "Strict ban on non-essential construction & demolition."},
        {"stage": "Stage IV", "range": "AQI > 450", "title": "Severe+", "actions": "Ban on BS-IV diesel heavy vehicles & trucks, school closures."}
    ]

# --- 14. Zone Comparison ---
@router.get("/zones/comparison")
def get_zone_comparison(db: Session = Depends(get_db)):
    zones = db.query(ZoneDB).all()
    comp = []
    for z in zones:
        series, plume, _, _ = run_coupled_simulation(z.zone_id)
        peak = max(series, key=lambda s: s.aqi)
        comp.append({
            "zone_id": z.zone_id,
            "name": z.name,
            "current_aqi": series[0].aqi,
            "peak_72h_aqi": peak.aqi,
            "isi": series[0].isi,
            "plume_exposure_pm25": plume.estimated_pm25_contribution
        })
    return comp

# --- 15. History ---
@router.get("/history")
def get_history(zone_id: str = "DELHI_CENTRAL"):
    ts = datetime.utcnow()
    return [
        {
            "timestamp": (ts - timedelta(hours=i*6)).isoformat(),
            "actual_pm25": round(180 + math.sin(i) * 35, 1),
            "forecast_pm25": round(175 + math.sin(i) * 30, 1),
            "aqi": int(280 + math.sin(i) * 40)
        }
        for i in range(10)
    ]

# --- 16. Report Generator ---
@router.post("/reports/generate")
def generate_report(format_type: str = "pdf"):
    return {
        "status": "SUCCESS",
        "file_name": f"AeroSense_MoES_Brief_{datetime.utcnow().strftime('%Y%m%d')}.{format_type}",
        "download_url": f"/static/reports/AeroSense_MoES_Brief_{datetime.utcnow().strftime('%Y%m%d')}.{format_type}"
    }

# --- 17. Admin Data Sources GET ---
@router.get("/admin/data-sources", response_model=List[DataSourceStatus])
def get_data_sources_status(db: Session = Depends(get_db)):
    configs = db.query(DataSourceConfigDB).all()
    return [
        DataSourceStatus(
            data_type=c.data_type,
            mode=c.mode,
            provider=c.provider,
            last_fetch_ts=c.last_fetch_ts,
            health_status=c.health_status,
            label=c.label or c.data_type.capitalize(),
            mock_description=c.mock_description or ""
        )
        for c in configs
    ]

# --- 18. Admin Data Sources PATCH ---
@router.patch("/admin/data-sources/{data_type}")
def patch_data_source(data_type: str, mode: str = "mock", db: Session = Depends(get_db)):
    c = db.query(DataSourceConfigDB).filter(DataSourceConfigDB.data_type == data_type).first()
    if not c:
        raise HTTPException(status_code=404, detail="Data source not found")
    c.mode = mode
    c.provider = mode
    c.last_fetch_ts = datetime.utcnow()
    c.health_status = "HEALTHY (MOCK)" if mode == "mock" else "HEALTHY (LIVE-READY)"
    db.commit()

    # Also update config.yaml
    config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            cfg = yaml.safe_load(f) or {}
        cfg.setdefault("data_sources", {})[data_type] = mode
        with open(config_path, "w") as f:
            yaml.safe_dump(cfg, f)

    return {"status": "SUCCESS", "data_type": data_type, "new_mode": mode}

# --- 19. Admin Run Logs ---
@router.get("/admin/run-logs")
def get_run_logs(db: Session = Depends(get_db)):
    logs = db.query(RunLogDB).order_by(RunLogDB.id.desc()).limit(20).all()
    if not logs:
        return [
            {
                "id": 1,
                "run_ts": datetime.utcnow().isoformat(),
                "duration_ms": 142,
                "model_version": "AeroSense-CoupledSurrogate-v1.0",
                "source_modes": {"weather": "mock", "pollution": "mock", "fire": "mock", "satellite": "mock"}
            }
        ]
    return logs

# --- 20. Forecast Run POST ---
@router.post("/forecast/run")
def trigger_forecast_run(zone_id: str = "DELHI_CENTRAL", db: Session = Depends(get_db)):
    start_time = datetime.utcnow()
    series, plume, weather, pollution = run_coupled_simulation(zone_id)
    duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

    log = RunLogDB(
        run_ts=start_time,
        duration_ms=duration_ms,
        model_version="AeroSense-CoupledSurrogate-v1.0",
        source_modes={"weather": "mock", "pollution": "mock", "fire": "mock", "satellite": "mock"}
    )
    db.add(log)
    db.commit()

    return {
        "status": "SUCCESS",
        "duration_ms": duration_ms,
        "peak_aqi": max(series, key=lambda s: s.aqi).aqi,
        "series_length": len(series)
    }

# --- 21. Methodology ---
@router.get("/about/methodology")
def get_methodology():
    return {
        "project": "AeroSense-Delhi",
        "problem_statement": "SIH #26082 | Ministry of Earth Sciences",
        "coupling_method": "Two-Way Physics-Informed Surrogate Engine (Aerosol Radiative Forcing ➔ PBL Compression)",
        "inversion_method": "Lapse Rate Vertical Gradient ISI Normalization",
        "plume_method": "Gaussian Advection Model (FRP Scaling)",
        "target_production_engine": "WRF-Chem v4.4 on HPC"
    }

# --- 22. User Settings GET/PATCH ---
@router.get("/user/settings", response_model=UserSettings)
def get_user_settings(db: Session = Depends(get_db)):
    user = db.query(UserDB).first()
    return UserSettings(
        email=user.email if user else "admin@moes.gov.in",
        role=user.role if user else "official",
        language_pref=user.language_pref if user else "en",
        notification_prefs=user.notification_prefs if user else {"email": True, "sms": False, "grap_alerts": True}
    )

@router.patch("/user/settings")
def patch_user_settings(settings: UserSettings, db: Session = Depends(get_db)):
    user = db.query(UserDB).first()
    if user:
        user.language_pref = settings.language_pref
        user.notification_prefs = settings.notification_prefs
        db.commit()
    return settings

# --- 23. WebSocket Live Updates ---
@router.websocket("/ws/live-updates")
async def websocket_live_updates(websocket: WebSocket, zone_id: str = "DELHI_CENTRAL"):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        series, plume, _, _ = run_coupled_simulation(zone_id)
        current = series[0]
        await websocket.send_json({
            "event": "LIVE_TELEMETRY_UPDATE",
            "zone_id": zone_id,
            "aqi": current.aqi,
            "pm25": current.pm25,
            "isi": current.isi,
            "timestamp": datetime.utcnow().isoformat()
        })
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"event": "ACK", "payload": data})
    except WebSocketDisconnect:
        active_connections.remove(websocket)
