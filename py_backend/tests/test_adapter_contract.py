import pytest
from datetime import datetime
from adapters.mock_adapter import MockDataAdapter
from adapters.live_adapters import IMDAdapter, CPCBAdapter, VIIRSAdapter, Sentinel5PAdapter
from models.schemas import WeatherRecord, PollutionRecord, FireEvent, SatelliteTile

def test_mock_adapter_weather_contract():
    adapter = MockDataAdapter()
    record = adapter.fetch_weather("DELHI_CENTRAL")
    assert isinstance(record, WeatherRecord)
    assert record.zone_id == "DELHI_CENTRAL"
    assert record.temperature_c > -50 and record.temperature_c < 60
    assert record.wind_speed_ms >= 0
    assert len(record.vertical_temp_profile_c) == 5

def test_mock_adapter_pollution_contract():
    adapter = MockDataAdapter()
    record = adapter.fetch_pollution("DELHI_CENTRAL")
    assert isinstance(record, PollutionRecord)
    assert record.pm25 > 0
    assert record.pm10 >= record.pm25

def test_mock_adapter_fire_contract():
    adapter = MockDataAdapter()
    events = adapter.fetch_fire_events()
    assert isinstance(events, list)
    assert len(events) > 0
    assert isinstance(events[0], FireEvent)

def test_mock_adapter_satellite_contract():
    adapter = MockDataAdapter()
    tile = adapter.fetch_satellite()
    assert isinstance(tile, SatelliteTile)
    assert tile.product == "AOD_550nm"

def test_live_adapters_contract():
    imd = IMDAdapter()
    cpcb = CPCBAdapter()
    viirs = VIIRSAdapter()

    w = imd.fetch_weather("DELHI_CENTRAL")
    p = cpcb.fetch_pollution("DELHI_CENTRAL")
    f = viirs.fetch_fire_events()

    assert isinstance(w, WeatherRecord)
    assert isinstance(p, PollutionRecord)
    assert isinstance(f[0], FireEvent)
    assert w.source_mode == "live-ready"
    assert p.source_mode == "live-ready"
    assert f[0].source_mode == "live-ready"
