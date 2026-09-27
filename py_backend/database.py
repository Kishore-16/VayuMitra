from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.db_models import Base, ZoneDB, DataSourceConfigDB, UserDB
from datetime import datetime

DATABASE_URL = "sqlite:///./aerosense.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed Zones if empty
        if db.query(ZoneDB).count() == 0:
            zones = [
                ZoneDB(zone_id="DELHI_CENTRAL", name="Central Delhi (ITO / Mandir Marg)", centroid_lat=28.628, centroid_lon=77.241),
                ZoneDB(zone_id="DELHI_EAST", name="East Delhi (Anand Vihar)", centroid_lat=28.647, centroid_lon=77.315),
                ZoneDB(zone_id="DELHI_NORTH", name="North Delhi (Jahangirpuri / DTU)", centroid_lat=28.732, centroid_lon=77.171),
                ZoneDB(zone_id="DELHI_SOUTH", name="South Delhi (R.K. Puram / Okhla)", centroid_lat=28.563, centroid_lon=77.186),
                ZoneDB(zone_id="DELHI_WEST", name="West Delhi (Mundka / Punjabi Bagh)", centroid_lat=28.679, centroid_lon=77.028),
                ZoneDB(zone_id="GURUGRAM", name="Gurugram NCR (Vikas Sadan)", centroid_lat=28.459, centroid_lon=77.026),
                ZoneDB(zone_id="NOIDA", name="Noida Sector-62 NCR", centroid_lat=28.627, centroid_lon=77.373),
                ZoneDB(zone_id="GHAZIABAD", name="Ghaziabad NCR (Loni / Vasundhara)", centroid_lat=28.669, centroid_lon=77.453),
            ]
            db.bulk_save_objects(zones)

        # Seed Data Source Config if empty
        if db.query(DataSourceConfigDB).count() == 0:
            sources = [
                DataSourceConfigDB(
                    data_type="weather", mode="mock", provider="mock",
                    last_fetch_ts=datetime.utcnow(), health_status="HEALTHY (MOCK)",
                    label="IMD AWS & ERA5 Coupled Weather Feed",
                    mock_description="Statistical Delhi NCR climatology generator (winter inversion calibrated)"
                ),
                DataSourceConfigDB(
                    data_type="pollution", mode="mock", provider="mock",
                    last_fetch_ts=datetime.utcnow(), health_status="HEALTHY (MOCK)",
                    label="CPCB 40-Station Continuous Ground Network",
                    mock_description="CPCB diurnal PM2.5/PM10/O3/NO2 distribution model"
                ),
                DataSourceConfigDB(
                    data_type="fire", mode="mock", provider="mock",
                    last_fetch_ts=datetime.utcnow(), health_status="HEALTHY (MOCK)",
                    label="NASA VIIRS/MODIS Stubble Fire Radiative Power (FRP)",
                    mock_description="Punjab/Haryana stubble fire event & plume flux simulator"
                ),
                DataSourceConfigDB(
                    data_type="satellite", mode="mock", provider="mock",
                    last_fetch_ts=datetime.utcnow(), health_status="STANDBY (MOCK)",
                    label="Copernicus Sentinel-5P TROPOMI & INSAT-3D AOD",
                    mock_description="Sample optical depth (AOD 550nm) and HCHO/NO2 satellite tiles"
                )
            ]
            db.bulk_save_objects(sources)

        # Seed Users if empty
        if db.query(UserDB).count() == 0:
            admin_user = UserDB(
                email="admin@moes.gov.in",
                password_hash="secret_hashed_pass",
                role="official",
                language_pref="en",
                notification_prefs={"email": True, "sms": False, "grap_alerts": True}
            )
            db.add(admin_user)

        db.commit()
    finally:
        db.close()
