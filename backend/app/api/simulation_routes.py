import math
from fastapi import APIRouter
from typing import List, Dict, Any
from ..models.schemas import SimulationParams, SimulationResult
from ..services.coupled_physics import calculate_indian_aqi
from .forecast_routes import get_cached_forecast

router = APIRouter(prefix="/api/simulation", tags=["What-If Scenario Sandbox"])

@router.post("/run", response_model=SimulationResult)
async def run_scenario_simulation(params: SimulationParams):
    """
    Simulates hypothetical policy interventions or meteorology changes in real-time.
    Calculates dynamic recalculation of 72-hour AQI, peak PM2.5 avoided, and GRAP stage shifts.
    """
    forecast, _ = await get_cached_forecast()
    
    hourly_comparison = []
    baseline_aqis = []
    simulated_aqis = []
    baseline_pm25s = []
    simulated_pm25s = []
    
    stubble_factor = (100.0 - params.stubble_reduction_pct) / 100.0
    traffic_factor = (100.0 - params.traffic_reduction_pct) / 100.0
    industrial_factor = (100.0 - params.industrial_reduction_pct) / 100.0
    
    # Wind angle effect on stubble transport:
    # Baseline North-West wind (315 deg) brings smoke. Shifting wind away reduces plume influx.
    wind_shift_rad = math.radians(params.wind_direction_shift_deg)
    wind_transport_modifier = max(0.2, math.cos(wind_shift_rad))
    
    # Ventilation factor from wind speed multiplier
    vent_modifier = 1.0 / math.pow(max(0.3, params.wind_speed_multiplier), 0.6)

    for pt in forecast:
        # Deconstruct PM2.5 into components
        stubble_part = pt.pm25 * (pt.stubble_contribution_pct / 100.0)
        urban_traffic_part = pt.pm25 * (pt.urban_contribution_pct / 100.0) * 0.55
        urban_industry_part = pt.pm25 * (pt.urban_contribution_pct / 100.0) * 0.45
        
        # Apply reductions & transport physics
        sim_stubble = stubble_part * stubble_factor * wind_transport_modifier * vent_modifier
        sim_traffic = urban_traffic_part * traffic_factor * vent_modifier
        sim_industry = urban_industry_part * industrial_factor * vent_modifier
        
        sim_pm25 = max(10.0, round(sim_stubble + sim_traffic + sim_industry, 1))
        sim_pm10 = max(20.0, round(pt.pm10 * (sim_pm25 / max(1.0, pt.pm25)), 1))
        sim_no2 = max(8.0, round(pt.no2 * traffic_factor * vent_modifier, 1))
        sim_o3 = pt.o3
        
        sim_aqi, sim_cat, _, _, sim_grap = calculate_indian_aqi(sim_pm25, sim_pm10, sim_no2, sim_o3)
        
        baseline_aqis.append(pt.aqi)
        simulated_aqis.append(sim_aqi)
        baseline_pm25s.append(pt.pm25)
        simulated_pm25s.append(sim_pm25)
        
        hourly_comparison.append({
            "timestamp": pt.timestamp,
            "hour_offset": pt.hour_offset,
            "baseline_aqi": pt.aqi,
            "simulated_aqi": sim_aqi,
            "baseline_pm25": pt.pm25,
            "simulated_pm25": sim_pm25,
            "reduction_ug_m3": round(pt.pm25 - sim_pm25, 1)
        })

    avg_base_aqi = int(round(sum(baseline_aqis) / len(baseline_aqis)))
    avg_sim_aqi = int(round(sum(simulated_aqis) / len(simulated_aqis)))
    
    aqi_red_pct = round(((avg_base_aqi - avg_sim_aqi) / max(1, avg_base_aqi)) * 100.0, 1)
    peak_base_pm25 = max(baseline_pm25s)
    peak_sim_pm25 = max(simulated_pm25s)
    peak_red = round(peak_base_pm25 - peak_sim_pm25, 1)
    
    def get_stage(aqi: int) -> str:
        if aqi > 450: return "Stage IV (Severe+)"
        if aqi > 400: return "Stage III (Severe)"
        if aqi > 300: return "Stage II (Very Poor)"
        if aqi > 200: return "Stage I (Poor)"
        return "Normal / Moderate"

    return SimulationResult(
        baseline_avg_aqi=avg_base_aqi,
        simulated_avg_aqi=avg_sim_aqi,
        aqi_reduction_pct=aqi_red_pct,
        peak_pm25_baseline=peak_base_pm25,
        peak_pm25_simulated=peak_sim_pm25,
        peak_reduction_ug_m3=peak_red,
        baseline_grap_stage=get_stage(max(baseline_aqis)),
        simulated_grap_stage=get_stage(max(simulated_aqis)),
        hourly_comparison=hourly_comparison
    )
