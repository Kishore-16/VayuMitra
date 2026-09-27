import math
from typing import Dict, Any

def apply_ml_bias_correction(
    raw_pm25: float,
    raw_pm10: float,
    raw_no2: float,
    raw_o3: float,
    temp_c: float,
    humidity_pct: float,
    wind_speed_kmh: float,
    pbl_height_m: float,
    hour_of_day: int
) -> Dict[str, float]:
    """
    Simulates ML Gradient Boosted Bias Correction (XGBoost / LightGBM) trained on 
    5-year historical Delhi CPCB CAAQMS ground station residuals.
    
    Correction addresses:
    1. WRF-Chem known underestimation of severe nocturnal inversion trapping (01:00 - 07:00)
    2. Over-dilution of localized rush-hour NO2/PM2.5 peaks (08:00 - 10:00, 18:00 - 21:00)
    3. Secondary aerosol photochemical formation non-linearities at high RH (>75%)
    """
    # 1. Nocturnal Inversion Bias Multiplier
    if 1 <= hour_of_day <= 7:
        # Low wind + shallow PBL leads to strong systematic under-prediction in raw Eulerian models
        inversion_factor = 1.0 + (1.0 - min(1.0, pbl_height_m / 600.0)) * 0.22
    elif 13 <= hour_of_day <= 16:
        # Afternoon convective mixing is well-captured; slight damping of over-ventilation
        inversion_factor = 0.96
    else:
        inversion_factor = 1.05

    # 2. Humidity & Secondary Sulfate/Nitrate Formation Bias
    # In Delhi winters, high RH + high ammonia accelerates rapid secondary inorganic aerosol (SIA) formation
    rh_factor = 1.0 + max(0.0, (humidity_pct - 70.0) / 100.0) * 0.25

    # 3. Traffic Rush Hour localized emission scaling
    is_morning_rush = 8 <= hour_of_day <= 11
    is_evening_rush = 18 <= hour_of_day <= 22
    traffic_factor = 1.20 if (is_morning_rush or is_evening_rush) else 1.0

    # 4. Wind stagnation factor
    stagnation_factor = 1.15 if wind_speed_kmh < 6.0 else 1.0

    # Compute corrected concentrations
    corrected_pm25 = raw_pm25 * inversion_factor * rh_factor * stagnation_factor
    corrected_pm10 = raw_pm10 * (1.0 + (inversion_factor - 1.0) * 0.7) * stagnation_factor
    corrected_no2 = raw_no2 * traffic_factor * (1.1 if pbl_height_m < 300 else 1.0)
    
    # O3 is titrated by high NO during night, but peaks in bright afternoon
    if 11 <= hour_of_day <= 16:
        corrected_o3 = raw_o3 * (1.0 + (temp_c / 40.0) * 0.2)
    else:
        corrected_o3 = max(8.0, raw_o3 * 0.65) # Night titration

    return {
        "corrected_pm25": round(max(15.0, corrected_pm25), 1),
        "corrected_pm10": round(max(25.0, corrected_pm10), 1),
        "corrected_no2": round(max(10.0, corrected_no2), 1),
        "corrected_o3": round(max(5.0, corrected_o3), 1),
        "bias_delta_pm25": round(corrected_pm25 - raw_pm25, 1)
    }
