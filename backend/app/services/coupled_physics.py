"""
Coupled Aerosol-Radiation-PBL Feedback Engine
===============================================
This module implements the two-way coupling that is the scientific
crown jewel of the DELHI-AIR-COUPLED system.

Physics chain (feedback loop):
  1. High PM2.5 concentration -> elevated Aerosol Optical Depth (AOD)
  2. High AOD -> solar radiation extinction at surface (Beer-Lambert)
  3. Less solar heating -> surface temperature drops ("aerosol dimming")
  4. Cooler surface -> weaker thermals -> PBL height is suppressed
  5. Shallower PBL -> pollutants trapped in smaller volume -> higher PM2.5
  6. Go back to step 1 (positive feedback loop)

Additionally, when a stubble-burning plume is predicted to arrive:
  - The incoming plume mass is injected into the feedback loop
  - The feedback amplifies the plume impact by further suppressing PBL
  - This triggers earlier and stronger GRAP alerts

References:
  - Bharali et al. (2019), JGR Atmospheres - Aerosol-PBL feedback over IGP
  - Li et al. (2017), ACP - WRF-Chem aerosol-radiation interactions
  - Guttikunda & Calori (2013) - Delhi emission-concentration relationships
"""

import math
from typing import Dict, Tuple, List, Optional


# ── Utility ──────────────────────────────────────────────────────────────────

def deg_to_compass(deg: float) -> str:
    """Converts wind direction degrees to 16-point compass label."""
    val = int((deg / 22.5) + 0.5)
    arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return arr[(val % 16)]


# ── Indian AQI Calculation (CPCB Standard) ───────────────────────────────────

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
        "NO2": sub_no2,
        "O3": sub_o3
    }

    prominent = max(sub_indices, key=sub_indices.get)
    aqi_val = int(round(sub_indices[prominent]))

    if aqi_val <= 50:
        cat = "Good"
        color = "#10b981"  # Green
        grap = "Normal"
    elif aqi_val <= 100:
        cat = "Satisfactory"
        color = "#84cc16"  # Light green
        grap = "Normal"
    elif aqi_val <= 200:
        cat = "Moderate"
        color = "#eab308"  # Yellow
        grap = "Stage 1 (Moderate/Poor)"
    elif aqi_val <= 300:
        cat = "Poor"
        color = "#f97316"  # Orange
        grap = "Stage 1 (Poor)"
    elif aqi_val <= 400:
        cat = "Very Poor"
        color = "#ef4444"  # Red
        grap = "Stage 2 (Very Poor)"
    elif aqi_val <= 450:
        cat = "Severe"
        color = "#9333ea"  # Purple
        grap = "Stage 3 (Severe)"
    else:
        cat = "Severe Plus (Emergency)"
        color = "#7f1d1d"  # Deep Maroon
        grap = "Stage 4 (Severe+)"

    return aqi_val, cat, color, prominent, grap


# ── Coupled Aerosol-Radiation-PBL Feedback ───────────────────────────────────

def compute_aerosol_radiation_feedback(
    baseline_temp_c: float,
    baseline_pbl_m: float,
    pm25_conc: float,
    hour_of_day: int,
    incoming_plume_pm25: float = 0.0,
) -> Dict[str, float]:
    """
    Computes two-way aerosol-radiation-PBL coupling with plume injection.
    
    When a stubble plume is arriving at hour H, the `incoming_plume_pm25`
    parameter adds that mass to the feedback calculation. This causes:
      - Higher AOD -> more solar dimming
      - More cooling -> further PBL suppression
      - More trapping -> amplified total concentration
    
    This is the key differentiator vs. uncoupled models.
    """
    # Total PM2.5 for feedback calculation includes incoming plume mass
    total_pm25_for_feedback = pm25_conc + incoming_plume_pm25

    # ── Step 1: PM2.5 -> AOD via mass extinction efficiency ──
    # Beer-Lambert: AOD ~ integral of extinction through column
    # MEE for Delhi winter aerosol: ~4.5 m2/g (Sharma et al., 2020)
    # Column approximation: AOD ~ PM2.5_surface * PBL / (density * 1e6) * MEE
    # Simplified empirical: AOD ~ PM2.5 * 0.0068  (validated for IGP)
    estimated_aod = max(0.1, min(4.0, total_pm25_for_feedback * 0.0068))

    # ── Step 2: AOD -> Solar dimming (Beer-Lambert at surface) ──
    is_daylight = 6 <= hour_of_day <= 18
    sun_elevation = math.sin(math.pi * max(0, hour_of_day - 6) / 12) if is_daylight else 0.0
    clear_sky_flux = 850.0 * max(0.0, sun_elevation)  # W/m2 for Delhi latitude

    # Transmittance T = exp(-tau / cos(theta))
    # Simplified: dimming = flux * (1 - exp(-0.75 * AOD))
    dimming_flux = clear_sky_flux * (1.0 - math.exp(-0.75 * estimated_aod))

    # ── Step 3: Solar dimming -> Surface cooling ──
    # Empirical: dT ~ -dimming_flux / 180  (daytime)
    # At night: radiative cooling enhanced by aerosol LW emission
    if is_daylight:
        cooling_delta = dimming_flux / 180.0
    else:
        cooling_delta = estimated_aod * 0.35  # Aerosol longwave effect
    surface_cooling_c = round(min(3.5, cooling_delta), 2)

    # ── Step 4: Surface cooling -> PBL suppression ──
    # Reduced buoyancy flux -> weaker thermals -> shallower mixing depth
    # Suppression fraction increases with AOD and is stronger at night
    night_penalty = 0.12 if not is_daylight else 0.05
    suppression_fraction = min(0.52, (estimated_aod * 0.17) + night_penalty)
    pbl_suppression_m = round(baseline_pbl_m * suppression_fraction, 1)
    coupled_pbl_m = max(60.0, round(baseline_pbl_m - pbl_suppression_m, 1))

    # ── Step 5: PBL suppression -> concentration amplification ──
    # C_coupled = C_uncoupled * (PBL_base / PBL_coupled)^alpha
    # alpha ~ 0.45 for well-mixed PBL (Stull, 1988)
    trapping_ratio = math.pow(baseline_pbl_m / max(50.0, coupled_pbl_m), 0.45)
    trapping_multiplier_pct = round((trapping_ratio - 1.0) * 100.0, 1)

    coupled_pm25 = round(total_pm25_for_feedback * trapping_ratio, 1)
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
        "feedback_delta_pm25": feedback_delta,
        "incoming_plume_pm25": round(incoming_plume_pm25, 1),
    }


# ── Plume-arrival schedule builder ───────────────────────────────────────────

def build_plume_arrival_schedule(
    trajectories: list,
    forecast_hours: int = 72,
) -> List[float]:
    """
    Given a list of PlumeTrajectory objects, builds an hour-by-hour array
    of expected plume PM2.5 contributions arriving at Delhi.

    For each trajectory that has a positive delhi_eta_hours, the plume
    impact is spread over a window around the ETA (Gaussian kernel).
    """
    schedule = [0.0] * forecast_hours

    for traj in trajectories:
        eta = traj.delhi_eta_hours
        impact = traj.delhi_impact_pm25_ug_m3

        if eta <= 0 or impact <= 0:
            continue

        # Spread impact over a 6-hour Gaussian window centered on ETA
        # This reflects that plume arrival isn't instantaneous
        sigma = 3.0  # hours
        for h in range(forecast_hours):
            gaussian = math.exp(-0.5 * ((h - eta) / sigma) ** 2)
            schedule[h] += impact * gaussian

    return [round(v, 1) for v in schedule]
