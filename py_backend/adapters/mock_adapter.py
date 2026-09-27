import math
from datetime import datetime
from typing import List, Optional
from adapters.base_adapter import DataSourceAdapter
from models.schemas import WeatherRecord, PollutionRecord, FireEvent, SatelliteTile

DELHI_ZONES_CONFIG = {
    "DELHI_CENTRAL": {"name": "Central Delhi (ITO / Mandir Marg)", "lat": 28.628, "lon": 77.241, "baseline_pm25": 190.0},
    "DELHI_EAST": {"name": "East Delhi (Anand Vihar)", "lat": 28.647, "lon": 77.315, "baseline_pm25": 260.0},
    "DELHI_NORTH": {"name": "North Delhi (Jahangirpuri / DTU)", "lat": 28.732, "lon": 77.171, "baseline_pm25": 240.0},
    "DELHI_SOUTH": {"name": "South Delhi (R.K. Puram / Okhla)", "lat": 28.563, "lon": 77.186, "baseline_pm25": 165.0},
    "DELHI_WEST": {"name": "West Delhi (Mundka / Punjabi Bagh)", "lat": 28.679, "lon": 77.028, "baseline_pm25": 230.0},
    "GURUGRAM": {"name": "Gurugram NCR (Vikas Sadan)", "lat": 28.459, "lon": 77.026, "baseline_pm25": 175.0},
    "NOIDA": {"name": "Noida Sector-62 NCR", "lat": 28.627, "lon": 77.373, "baseline_pm25": 200.0},
    "GHAZIABAD": {"name": "Ghaziabad NCR (Loni / Vasundhara)", "lat": 28.669, "lon": 77.453, "baseline_pm25": 250.0}
}

MOCK_FIRE_HOTSPOTS = [
    {"region": "Punjab - Sangrur Cluster", "lat": 30.24, "lon": 75.84, "frp_mw": 68.4, "confidence": 0.92},
    {"region": "Punjab - Patiala District", "lat": 30.33, "lon": 76.38, "frp_mw": 45.2, "confidence": 0.88},
    {"region": "Punjab - Tarn Taran Belt", "lat": 31.45, "lon": 74.92, "frp_mw": 82.1, "confidence": 0.95},
    {"region": "Punjab - Ludhiana West", "lat": 30.90, "lon": 75.85, "frp_mw": 38.6, "confidence": 0.84},
    {"region": "Haryana - Karnal Border", "lat": 29.68, "lon": 76.98, "frp_mw": 29.0, "confidence": 0.79}
]

class MockDataAdapter(DataSourceAdapter):
    def fetch_weather(self, zone_id: str, timestamp: Optional[datetime] = None) -> WeatherRecord:
        ts = timestamp or datetime.utcnow()
        hour = ts.hour
        zone = DELHI_ZONES_CONFIG.get(zone_id, DELHI_ZONES_CONFIG["DELHI_CENTRAL"])

        is_night = hour >= 21 or hour <= 7
        base_temp = 11.5 + math.sin(hour * 0.2) * 2.0 if is_night else 21.0 - math.cos((hour - 12) * 0.3) * 4.0
        wind_speed = 1.2 + (math.sin(hour) * 0.4) if is_night else 3.4 + (math.cos(hour) * 0.8)
        wind_dir = 315.0 + (math.sin(hour * 0.5) * 15.0)
        pbl_height = 160.0 + (math.sin(hour) * 30.0) if is_night else 650.0 + (math.cos((hour - 12) * 0.3) * 250.0)

        vertical_temp_profile = [
            round(base_temp, 1),
            round(base_temp - 0.2, 1) if is_night else round(base_temp - 0.9, 1),
            round(base_temp + 0.8, 1) if is_night else round(base_temp - 1.8, 1),
            round(base_temp + 1.9, 1) if is_night else round(base_temp - 2.6, 1),
            round(base_temp + 2.4, 1) if is_night else round(base_temp - 3.4, 1)
        ]

        return WeatherRecord(
            timestamp=ts,
            zone_id=zone_id,
            lat=zone["lat"],
            lon=zone["lon"],
            temperature_c=round(base_temp, 1),
            wind_speed_ms=round(max(0.5, wind_speed), 1),
            wind_dir_deg=round(wind_dir, 1),
            pbl_height_m=round(pbl_height, 1),
            surface_pressure_hpa=1016.4,
            vertical_temp_profile_c=vertical_temp_profile,
            source_mode="mock"
        )

    def fetch_pollution(self, zone_id: str, timestamp: Optional[datetime] = None) -> PollutionRecord:
        ts = timestamp or datetime.utcnow()
        hour = ts.hour
        zone = DELHI_ZONES_CONFIG.get(zone_id, DELHI_ZONES_CONFIG["DELHI_CENTRAL"])

        night_peak = 1.45 if (hour >= 20 or hour <= 8) else 0.85
        pm25 = zone["baseline_pm25"] * night_peak + (math.sin(hour * 0.4) * 25.0)
        pm10 = pm25 * 1.62
        o3 = 58.0 if (12 <= hour <= 16) else 18.2
        no2 = 84.5 if (7 <= hour <= 10 or 18 <= hour <= 22) else 42.1

        return PollutionRecord(
            timestamp=ts,
            zone_id=zone_id,
            lat=zone["lat"],
            lon=zone["lon"],
            pm25=round(pm25, 1),
            pm10=round(pm10, 1),
            o3=round(o3, 1),
            no2=round(no2, 1),
            so2=12.4,
            co=1.8,
            source_mode="mock"
        )

    def fetch_fire_events(self, region: str = "punjab_haryana") -> List[FireEvent]:
        ts = datetime.utcnow()
        return [
            FireEvent(
                timestamp=ts,
                lat=f["lat"],
                lon=f["lon"],
                frp_mw=f["frp_mw"],
                confidence=f["confidence"],
                region=f["region"],
                source_mode="mock"
            )
            for f in MOCK_FIRE_HOTSPOTS
        ]

    def fetch_satellite(self, region: str = "delhi_ncr") -> SatelliteTile:
        return SatelliteTile(
            timestamp=datetime.utcnow(),
            product="AOD_550nm",
            bbox=[76.8, 28.3, 77.6, 28.9],
            grid_resolution_km=1.0,
            values_ref="ref://sat_tiles/aod_550nm_mock.bin",
            source_mode="mock"
        )
