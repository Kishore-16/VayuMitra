"""
Live Data Source Adapters (Stubs for Production Rollout)

These classes satisfy the DataSourceAdapter interface and provide the migration blueprint
for connecting live IMD, CPCB, ERA5, NASA VIIRS, and Sentinel-5P feeds.
"""

from typing import List, Optional
from datetime import datetime
from adapters.base_adapter import DataSourceAdapter
from adapters.mock_adapter import MockDataAdapter
from models.schemas import WeatherRecord, PollutionRecord, FireEvent, SatelliteTile

class IMDAdapter(DataSourceAdapter):
    """IMD AWS / GFS Live Weather Adapter Stub."""
    def __init__(self):
        self._fallback = MockDataAdapter()

    def fetch_weather(self, zone_id: str, timestamp: Optional[datetime] = None) -> WeatherRecord:
        record = self._fallback.fetch_weather(zone_id, timestamp)
        record.source_mode = "live-ready"
        return record

    def fetch_pollution(self, zone_id: str, timestamp: Optional[datetime] = None) -> PollutionRecord:
        return self._fallback.fetch_pollution(zone_id, timestamp)

    def fetch_fire_events(self, region: str = "punjab_haryana") -> List[FireEvent]:
        return self._fallback.fetch_fire_events(region)

    def fetch_satellite(self, region: str = "delhi_ncr") -> SatelliteTile:
        return self._fallback.fetch_satellite(region)

class CPCBAdapter(DataSourceAdapter):
    """CPCB data.gov.in / SAFAR 40-Station Live Ground Network Adapter Stub."""
    def __init__(self):
        self._fallback = MockDataAdapter()

    def fetch_weather(self, zone_id: str, timestamp: Optional[datetime] = None) -> WeatherRecord:
        return self._fallback.fetch_weather(zone_id, timestamp)

    def fetch_pollution(self, zone_id: str, timestamp: Optional[datetime] = None) -> PollutionRecord:
        record = self._fallback.fetch_pollution(zone_id, timestamp)
        record.source_mode = "live-ready"
        return record

    def fetch_fire_events(self, region: str = "punjab_haryana") -> List[FireEvent]:
        return self._fallback.fetch_fire_events(region)

    def fetch_satellite(self, region: str = "delhi_ncr") -> SatelliteTile:
        return self._fallback.fetch_satellite(region)

class VIIRSAdapter(DataSourceAdapter):
    """NASA FIRMS VIIRS NRT 375m Active Fire Feed Adapter Stub."""
    def __init__(self):
        self._fallback = MockDataAdapter()

    def fetch_weather(self, zone_id: str, timestamp: Optional[datetime] = None) -> WeatherRecord:
        return self._fallback.fetch_weather(zone_id, timestamp)

    def fetch_pollution(self, zone_id: str, timestamp: Optional[datetime] = None) -> PollutionRecord:
        return self._fallback.fetch_pollution(zone_id, timestamp)

    def fetch_fire_events(self, region: str = "punjab_haryana") -> List[FireEvent]:
        events = self._fallback.fetch_fire_events(region)
        for e in events:
            e.source_mode = "live-ready"
        return events

    def fetch_satellite(self, region: str = "delhi_ncr") -> SatelliteTile:
        return self._fallback.fetch_satellite(region)

class Sentinel5PAdapter(DataSourceAdapter):
    """Copernicus Sentinel-5P TROPOMI & INSAT-3D Satellite Feed Adapter Stub."""
    def __init__(self):
        self._fallback = MockDataAdapter()

    def fetch_weather(self, zone_id: str, timestamp: Optional[datetime] = None) -> WeatherRecord:
        return self._fallback.fetch_weather(zone_id, timestamp)

    def fetch_pollution(self, zone_id: str, timestamp: Optional[datetime] = None) -> PollutionRecord:
        return self._fallback.fetch_pollution(zone_id, timestamp)

    def fetch_fire_events(self, region: str = "punjab_haryana") -> List[FireEvent]:
        return self._fallback.fetch_fire_events(region)

    def fetch_satellite(self, region: str = "delhi_ncr") -> SatelliteTile:
        tile = self._fallback.fetch_satellite(region)
        tile.source_mode = "live-ready"
        return tile
