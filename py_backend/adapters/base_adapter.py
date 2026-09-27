from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from models.schemas import WeatherRecord, PollutionRecord, FireEvent, SatelliteTile

class DataSourceAdapter(ABC):
    """
    Abstract Data Source Adapter Interface.
    All weather, pollution, fire, and satellite data ingestion MUST pass through this interface.
    No business module may ever import concrete adapter subclasses directly.
    """

    @abstractmethod
    def fetch_weather(self, zone_id: str, timestamp: Optional[datetime] = None) -> WeatherRecord:
        """Fetch weather observation for a given zone and timestamp."""
        pass

    @abstractmethod
    def fetch_pollution(self, zone_id: str, timestamp: Optional[datetime] = None) -> PollutionRecord:
        """Fetch pollution observation for a given zone and timestamp."""
        pass

    @abstractmethod
    def fetch_fire_events(self, region: str = "punjab_haryana") -> List[FireEvent]:
        """Fetch active fire hotspot events in target region."""
        pass

    @abstractmethod
    def fetch_satellite(self, region: str = "delhi_ncr") -> SatelliteTile:
        """Fetch optical satellite tiles (AOD, HCHO, NO2)."""
        pass
