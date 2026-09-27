import math
from typing import Dict, Tuple

def deg_to_compass(deg: float) -> str:
    val = int((deg / 22.5) + 0.5)
    arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", 
           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return arr[(val % 16)]

def calculate_sub_index(conc: float, breakpoints: list) -> float:
    """
    Calculate CPCB AQI sub-index using linear interpolation between breakpoints.
    breakpoints: list of (C_low, C_high, I_low, I_high)
    """
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= conc <= c_high:
            return i_low + (i_high - i_low) * (conc - c_low) / (c_high - c_low)
    if conc > breakpoints[-1][1]:
        # Extrapolate beyond maximum breakpoint
        c_low, c_high, i_low, i_high = breakpoints[-1]
        return min(500.0, i_high + (conc - c_high) * 0.5)
    return 0.0

def calculate_indian_aqi(pm25: float, pm10: float, no2: float, o3: float) -> Tuple[int, str, str, str, str]:
    """
    Calculates Indian National Air Quality Index (AQI) based on CPCB standard sub-indices.
    Returns: (aqi_value, category, color_hex, prominent_pollutant, grap_stage)
    """
    # PM2.5 breakpoints (ug/m3) -> AQI
    pm25_bp = [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500)
    ]
    # PM10 breakpoints (ug/m3)
    pm10_bp = [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 600, 401, 500)
    ]
    # NO2 breakpoints (ug/m3)
    no2_bp = [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, 600, 401, 500)
    ]
    # O3 breakpoints (ug/m3)
    o3_bp = [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 168, 101, 200),
        (169, 208, 201, 300),
        (209, 748, 301, 400),
        (749, 1000, 401, 500)
    ]

    sub_pm25 = calculate_sub_index(pm25, pm25_bp)
    sub_pm10 = calculate_sub_index(pm10, pm10_bp)
    sub_no2 = calculate_sub_index(no2, no2_bp)
    sub_o3 = calculate_sub_index(o3, o3_bp)

    sub_indices = {
        "PM2.5": sub_pm25,
        "PM10": sub_pm10,
        "NO₂": sub_no2,
        "O₃": sub_o3
    }

    prominent = max(sub_indices, key=sub_indices.get)
    aqi_val = int(round(sub_indices[prominent]))

    if aqi_val <= 50:
        cat = "Good"
        color = "#10b981" # Green
        grap = "Normal"
    elif aqi_val <= 100:
        cat = "Satisfactory"
        color = "#84cc16" # Light green
        grap = "Normal"
    elif aqi_val <= 200:
        cat = "Moderate"
        color = "#eab308" # Yellow
        grap = "Stage 1 (Moderate/Poor)"
    elif aqi_val <= 300:
        cat = "Poor"
        color = "#f97316" # Orange
        grap = "Stage 1 (Poor)"
    elif aqi_val <= 400:
        cat = "Very Poor"
        color = "#ef4444" # Red
        grap = "Stage 2 (Very Poor)"
    elif aqi_val <= 450:
        cat = "Severe"
        color = "#9333ea" # Purple
        grap = "Stage 3 (Severe)"
    else:
        cat = "Severe Plus (Emergency)"
        color = "#7f1d1d" # Deep Maroon
        grap = "Stage 4 (Severe+)"

    return aqi_val, cat, color, prominent, grap

def compute_aerosol_radiation_feedback(
    baseline_temp_c: float,
    baseline_pbl_m: float,
    pm25_conc: float,
    hour_of_day: int
) -> Dict[str, float]:
    """
    Computes two-way aerosol-radiation-PBL coupling.
    High PM2.5 -> High Aerosol Optical Depth (AOD) -> Solar Extinction -> 
    Surface Cooling -> PBL Height Suppression -> Trapped Higher Concentrations.
    """
    # Mass extinction conversion (0.005 m2/mg ~ 0.005 / ug/m3 for column)
    estimated_aod = max(0.1, min(3.5, pm25_conc * 0.0068))
    
    # Solar dimming is active during daylight (6:00 to 18:00)
    is_daylight = 6 <= hour_of_day <= 18
    sun_elevation = math.sin(math.pi * max(0, hour_of_day - 6) / 12) if is_daylight else 0.0
    clear_sky_flux = 800.0 * max(0.0, sun_elevation)
    
    # Radiative forcing (solar attenuation at ground)
    dimming_flux = clear_sky_flux * (1.0 - math.exp(-0.75 * estimated_aod))
    
    # Surface temperature suppression (up to -2.8 C in extreme episodes)
    cooling_delta = (dimming_flux / 180.0) if is_daylight else (estimated_aod * 0.35)
    surface_cooling_c = round(min(3.2, cooling_delta), 2)
    
    # PBL suppression factor
    # During high aerosol loading, thermal buoyancy is suppressed, reducing mixing depth
    suppression_fraction = min(0.48, (estimated_aod * 0.16) + (0.12 if not is_daylight else 0.05))
    pbl_suppression_m = round(baseline_pbl_m * suppression_fraction, 1)
    coupled_pbl_m = max(80.0, round(baseline_pbl_m - pbl_suppression_m, 1))
    
    # Trapping feedback multiplier on surface PM2.5
    # C_coupled = C_uncoupled * (PBL_base / PBL_coupled)^0.45
    trapping_ratio = math.pow(baseline_pbl_m / max(50.0, coupled_pbl_m), 0.45)
    trapping_multiplier_pct = round((trapping_ratio - 1.0) * 100.0, 1)
    
    coupled_pm25 = round(pm25_conc * trapping_ratio, 1)
    feedback_delta = round(coupled_pm25 - pm25_conc, 1)

    return {
        "aod_550nm": round(estimated_aod, 2),
        "solar_dimming_w_m2": round(dimming_flux, 1),
        "surface_cooling_c": surface_cooling_c,
        "baseline_pbl_m": baseline_pbl_m,
        "coupled_pbl_m": coupled_pbl_m,
        "pbl_suppression_m": pbl_suppression_m,
        "trapping_multiplier_pct": trapping_multiplier_pct,
        "uncoupled_pm25": round(pm25_conc, 1),
        "coupled_pm25": coupled_pm25,
        "feedback_delta_pm25": feedback_delta
    }
