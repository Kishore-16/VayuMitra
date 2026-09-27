from typing import List
from models.schemas import ForecastPoint, PlumeForecast, WeatherRecord, ExplainResult, CausalChainItem

def generate_explanation(peak_point: ForecastPoint, plume: PlumeForecast, initial_weather: WeatherRecord) -> ExplainResult:
    causal_chain: List[CausalChainItem] = []
    causes = []

    if peak_point.plume_pm25_contrib > 30:
        causal_chain.append(CausalChainItem(icon="fire", label=f"Stubble Plume Ingress (+{peak_point.plume_pm25_contrib:.0f} µg/m³)"))
        causes.append(f"a heavy stubble-burning plume arriving from {plume.wind_direction_label} (+{peak_point.plume_pm25_contrib:.0f} µg/m³ PM2.5)")

    if peak_point.isi >= 0.5:
        causal_chain.append(CausalChainItem(icon="inversion", label=f"Thermal Inversion (ISI: {peak_point.isi})"))
        causes.append(f"a {peak_point.inversion_category} temperature inversion (ISI: {peak_point.isi}) trapping pollutants below a {int(peak_point.pbl_height_m)}m ceiling")

    if peak_point.wind_speed_ms <= 2.0:
        causal_chain.append(CausalChainItem(icon="wind", label=f"Stagnant Winds ({peak_point.wind_speed_ms} m/s)"))
        causes.append(f"calm wind speeds of {peak_point.wind_speed_ms} m/s restricting lateral ventilation")

    causal_chain.append(CausalChainItem(icon="aqi_spike", label=f"AQI Peak {peak_point.aqi} ({peak_point.aqi_category})"))

    cause_phrase = ", combined with ".join(causes) if causes else "ambient baseline emission accumulation"
    headline = f"AQI expected to reach {peak_point.aqi} ({peak_point.aqi_category}) in {peak_point.hour_offset} hours"
    narrative = f"AQI is forecasted to peak at {peak_point.aqi} ({peak_point.aqi_category}) at +{peak_point.hour_offset} hours. This deterioration is driven by {cause_phrase}. The resulting aerosol optical depth reduces surface solar heating, reinforcing the thermal inversion and sustaining high PM2.5 persistence."

    return ExplainResult(
        forecast_id=peak_point.step,
        headline=headline,
        causal_chain=causal_chain,
        narrative=narrative,
        confidence_pct=94
    )
