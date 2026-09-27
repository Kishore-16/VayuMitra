import math
from typing import List, Dict, Any, Tuple
from ..models.schemas import SoundingLevel, InversionSounding

# Standard vertical levels up to 3000m AGL (Above Ground Level)
SOUNDING_LEVELS_M = [
    10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 650, 800, 1000, 1250, 1500, 1800, 2200, 2600, 3000
]

def generate_vertical_sounding(
    hour_offset: int,
    surface_temp_c: float,
    surface_humidity_pct: float,
    wind_speed_kmh: float,
    pbl_height_m: float,
    surface_pm25: float,
    timestamp: str
) -> InversionSounding:
    """
    Computes atmospheric vertical sounding profile T(z), dew point, lapse rates,
    inversion layer base/top, inversion strength (deg C / 100m) and trapping efficiency.
    """
    hour_of_day = (hour_offset) % 24
    
    # Inversion is strongest in Delhi between 02:00 and 08:00 AM
    # Nocturnal radiative cooling creates strong ground-based inversion
    # In afternoon (12:00 - 16:00), solar heating creates convective mixing layer with elevated capping inversion
    is_night_or_dawn = (0 <= hour_of_day <= 8) or (hour_of_day >= 21)
    
    levels: List[SoundingLevel] = []
    
    # Base surface pressure (hPa)
    p0 = 1005.0
    
    # Determine inversion structure
    if is_night_or_dawn:
        # Nocturnal ground inversion: temperature increases from surface up to inversion top (~250-450m)
        inv_base = 10.0
        inv_top = min(480.0, max(180.0, pbl_height_m * 0.95))
        max_warming = 3.5 + 2.0 * math.cos((hour_of_day - 4) * math.pi / 12)
        inv_strength = round((max_warming / (inv_top - inv_base)) * 100.0, 2)
        has_capping = True
    else:
        # Daytime convective boundary layer: superadiabatic near ground, neutral in mid-PBL, capping inversion at top of PBL
        inv_base = round(pbl_height_m * 0.92, 1)
        inv_top = round(pbl_height_m * 1.25, 1)
        inv_strength = round(0.95 + 0.4 * math.sin(hour_of_day * math.pi / 24), 2)
        has_capping = True if pbl_height_m < 1200 else False

    prev_alt = 0.0
    prev_temp = surface_temp_c
    
    for alt in SOUNDING_LEVELS_M:
        # Pressure decrease with altitude (barometric formula)
        pressure = round(p0 * math.exp(-alt / 8400.0), 1)
        
        # Temperature profile modeling
        if is_night_or_dawn:
            if alt <= inv_top:
                # Temperature inversion layer (warming with height)
                fraction = alt / inv_top
                temp = surface_temp_c + max_warming * math.sin(fraction * (math.pi / 2))
            else:
                # Above inversion: Environmental lapse rate (~ -6.5 C / km)
                peak_temp = surface_temp_c + max_warming
                alt_above = alt - inv_top
                temp = peak_temp - (6.5 * alt_above / 1000.0)
        else:
            if alt <= pbl_height_m:
                # Dry adiabatic lapse rate (-9.8 C/km in lower layer, -6.5 C/km in upper PBL)
                temp = surface_temp_c - (8.5 * alt / 1000.0)
            elif alt <= inv_top:
                # Capping inversion at entrainment zone (slight warming jump)
                pbl_top_temp = surface_temp_c - (8.5 * pbl_height_m / 1000.0)
                temp = pbl_top_temp + 1.2 * math.sin(((alt - pbl_height_m) / (inv_top - pbl_height_m)) * math.pi)
            else:
                # Free troposphere
                base_free_temp = surface_temp_c - (8.5 * pbl_height_m / 1000.0)
                alt_above = alt - inv_top
                temp = base_free_temp - (6.2 * alt_above / 1000.0)
        
        # Dew point profile
        dew_point_surface = surface_temp_c - ((100.0 - surface_humidity_pct) / 5.0)
        dew_point = round(dew_point_surface - (3.5 * alt / 1000.0), 1)
        
        # Lapse rate (-dT/dz in C/km)
        dz = (alt - prev_alt)
        dT = (temp - prev_temp)
        lapse_rate = round(-(dT / (dz / 1000.0)), 2) if dz > 0 else 0.0
        
        # Vertical PM2.5 distribution (exponential decay above PBL, well mixed inside PBL)
        if alt <= pbl_height_m:
            pm_at_alt = surface_pm25 * (1.0 - 0.25 * (alt / max(1.0, pbl_height_m)))
        else:
            decay = math.exp(-2.2 * (alt - pbl_height_m) / 600.0)
            pm_at_alt = (surface_pm25 * 0.75) * decay
            
        levels.append(SoundingLevel(
            altitude_m=float(alt),
            pressure_hpa=pressure,
            temp_c=round(temp, 1),
            dew_point_c=dew_point,
            lapse_rate_c_km=lapse_rate,
            pm25_ug_m3=round(pm_at_alt, 1)
        ))
        
        prev_alt = float(alt)
        prev_temp = temp

    # Ventilation Coefficient Vc = PBLH (m) * Wind Speed (m/s)
    wind_speed_ms = wind_speed_kmh / 3.6
    ventilation_coeff = round(pbl_height_m * wind_speed_ms, 1)
    
    # Trapping efficiency: 100% when Vc < 1000 and strong inversion; drops as ventilation increases
    trapping_eff = round(min(98.0, max(15.0, (1.0 - (ventilation_coeff / 8000.0)) * 100.0 + (inv_strength * 6.0))), 1)

    return InversionSounding(
        timestamp=timestamp,
        hour_offset=hour_offset,
        surface_temp_c=round(surface_temp_c, 1),
        pbl_height_m=round(pbl_height_m, 1),
        inversion_base_m=inv_base,
        inversion_top_m=inv_top,
        inversion_strength_c_100m=inv_strength,
        capping_inversion=has_capping,
        trapping_efficiency_pct=trapping_eff,
        ventilation_coefficient_m2_s=ventilation_coeff,
        levels=levels
    )
