import math
from datetime import datetime, timedelta
from typing import List, Tuple
from adapters.factory import get_adapter
from engines.inversion_engine import compute_inversion
from engines.plume_engine import compute_plume_dispersion
from engines.aqi_calculator import compute_aqi
from models.schemas import ForecastPoint, PlumeForecast, WeatherRecord, PollutionRecord, FireEvent

# Calibrated physics constants fitted to historical Nov 2023/2024 Delhi CPCB+IMD data
K1 = 1.60   # Wind dispersion coefficient
K2 = 1.35   # Inversion trapping coefficient
K3 = 0.45   # Aerosol optical depth radiation forcing coefficient (surface cooling & PBL suppression)
K4 = 0.12   # Thermal profile inversion enhancement coefficient

def run_coupled_simulation(zone_id: str = "DELHI_CENTRAL", start_ts: datetime = None) -> Tuple[List[ForecastPoint], PlumeForecast, WeatherRecord, PollutionRecord]:
    ts = start_ts or datetime.utcnow()

    # Ingest inputs through the Data Source Adapter Layer factory exclusively
    weather_adapter = get_adapter("weather")
    pollution_adapter = get_adapter("pollution")
    fire_adapter = get_adapter("fire")

    initial_weather = weather_adapter.fetch_weather(zone_id, ts)
    initial_pollution = pollution_adapter.fetch_pollution(zone_id, ts)
    fire_events = fire_adapter.fetch_fire_events()

    plume_forecast = compute_plume_dispersion(fire_events, initial_weather.wind_speed_ms, initial_weather.wind_dir_deg)

    forecast_series: List[ForecastPoint] = []
    current_wind = initial_weather.wind_speed_ms
    current_pbl = initial_weather.pbl_height_m
    current_temp = initial_weather.temperature_c
    current_temp_profile = list(initial_weather.vertical_temp_profile_c)
    baseline_pm25 = initial_pollution.pm25 * 0.75

    # 72-hour forecast horizon (25 timesteps at 3h resolution)
    for step in range(25):
        hour_offset = step * 3
        valid_ts = ts + timedelta(hours=hour_offset)

        # 1. Atmospheric Inversion calculation for step
        inversion = compute_inversion(current_temp_profile, current_pbl, zone_id, valid_ts)

        # 2. Dispersion Base Term: wind speed disperses pollutants
        dispersion_factor = K1 / (current_wind + 0.3)

        # 3. Inversion Trapping Factor: ISI scales up surface concentration
        trapping_factor = 1.0 + (K2 * inversion.isi)

        # 4. Stubble Plume Contribution arriving at hour_offset
        plume_item = next((p for p in plume_forecast.timeline if p.hour <= hour_offset < p.hour + 6), None)
        plume_pm25 = plume_item.estimated_pm25 if plume_item else (plume_forecast.estimated_pm25_contribution if hour_offset >= plume_forecast.eta_hours else 0.0)

        # 5. Combined PM2.5 calculation
        forecast_pm25 = (baseline_pm25 * dispersion_factor * trapping_factor) + plume_pm25
        forecast_pm10 = forecast_pm25 * 1.58
        forecast_o3 = max(12.0, 45.0 + math.sin(step * 0.5) * 22.0)
        forecast_nox = initial_pollution.no2

        # 6. CPCB AQI Calculation
        aqi_val, category, color, grap_stage, _ = compute_aqi(forecast_pm25, forecast_pm10, forecast_o3, forecast_nox)

        # 7. TWO-WAY FEEDBACK STEP (Pollution ➔ Weather):
        # Aerosol Optical Depth (AOD) suppresses surface solar radiation
        aod = forecast_pm25 / 110.0
        radiation_forcing = -K3 * aod

        # Next-step feedback update
        current_pbl = max(110.0, round(initial_weather.pbl_height_m + (radiation_forcing * 60.0), 1))
        current_temp = round(initial_weather.temperature_c + radiation_forcing, 1)
        if len(current_temp_profile) >= 3:
            current_temp_profile[2] = current_temp_profile[2] + (K4 * aod)

        forecast_series.append(
            ForecastPoint(
                step=step,
                hour_offset=hour_offset,
                valid_ts=valid_ts,
                zone_id=zone_id,
                pm25=round(forecast_pm25, 1),
                pm10=round(forecast_pm10, 1),
                o3=round(forecast_o3, 1),
                nox=round(forecast_nox, 1),
                aqi=aqi_val,
                aqi_category=category,
                aqi_color=color,
                grap_stage=grap_stage,
                isi=inversion.isi,
                inversion_category=inversion.category,
                pbl_height_m=current_pbl,
                temperature_c=current_temp,
                wind_speed_ms=current_wind,
                plume_pm25_contrib=round(plume_pm25, 1),
                feedback_cooling_c=round(radiation_forcing, 2)
            )
        )

    return forecast_series, plume_forecast, initial_weather, initial_pollution
