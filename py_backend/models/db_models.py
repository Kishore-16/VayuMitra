from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class ZoneDB(Base):
    __tablename__ = "zones"

    zone_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    boundary_geojson = Column(JSON, nullable=True)

class WeatherObsDB(Base):
    __tablename__ = "weather_obs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.utcnow, index=True)
    zone_id = Column(String, ForeignKey("zones.zone_id"))
    temperature_c = Column(Float)
    wind_speed_ms = Column(Float)
    wind_dir_deg = Column(Float)
    pbl_height_m = Column(Float)
    surface_pressure_hpa = Column(Float)
    vertical_temp_profile_c = Column(JSON)  # List of floats
    source_mode = Column(String)

class PollutionObsDB(Base):
    __tablename__ = "pollution_obs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.utcnow, index=True)
    zone_id = Column(String, ForeignKey("zones.zone_id"))
    pm25 = Column(Float)
    pm10 = Column(Float)
    o3 = Column(Float)
    no2 = Column(Float)
    so2 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    source_mode = Column(String)

class FireEventDB(Base):
    __tablename__ = "fire_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.utcnow, index=True)
    lat = Column(Float)
    lon = Column(Float)
    frp_mw = Column(Float)
    confidence = Column(Float)
    region = Column(String)
    source_mode = Column(String)

class ForecastDB(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_ts = Column(DateTime, default=datetime.utcnow, index=True)
    valid_ts = Column(DateTime, index=True)
    zone_id = Column(String, ForeignKey("zones.zone_id"))
    pm25 = Column(Float)
    pm10 = Column(Float)
    o3 = Column(Float)
    nox = Column(Float)
    aqi = Column(Integer)
    isi = Column(Float)
    pbl_height_m = Column(Float)
    temperature_c = Column(Float)
    wind_speed_ms = Column(Float)
    model_version = Column(String)
    source_mode = Column(String)

class PlumeForecastDB(Base):
    __tablename__ = "plume_forecasts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_ts = Column(DateTime, default=datetime.utcnow, index=True)
    source_region = Column(String)
    frp_total = Column(Float)
    eta_hours = Column(Float)
    estimated_pm25_contribution = Column(Float)
    timeline_geojson = Column(JSON)

class ExplanationDB(Base):
    __tablename__ = "explanations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.id"))
    headline = Column(String)
    causal_chain = Column(JSON)
    narrative = Column(String)
    confidence_pct = Column(Integer)

class AlertDB(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    forecast_id = Column(Integer, nullable=True)
    zone_id = Column(String)
    triggered_ts = Column(DateTime, default=datetime.utcnow)
    threshold_crossed = Column(Integer)
    grap_stage = Column(String)
    status = Column(String, default="new")  # new | acknowledged | actioned
    title = Column(String)
    message = Column(String)
    delivered_channels = Column(JSON)

class DataSourceConfigDB(Base):
    __tablename__ = "data_source_config"

    data_type = Column(String, primary_key=True)  # weather | pollution | fire | satellite
    mode = Column(String, default="mock")         # mock | live-provider-name
    provider = Column(String, default="mock")
    last_fetch_ts = Column(DateTime, default=datetime.utcnow)
    health_status = Column(String, default="HEALTHY")
    label = Column(String)
    mock_description = Column(String)

class RunLogDB(Base):
    __tablename__ = "run_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_ts = Column(DateTime, default=datetime.utcnow)
    duration_ms = Column(Integer)
    model_version = Column(String)
    source_modes = Column(JSON)

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="official")  # public | official | admin
    language_pref = Column(String, default="en")
    notification_prefs = Column(JSON)
