from typing import Dict, Any, Tuple

def calc_sub_index(val: float, conc_breaks: list, index_breaks: list) -> int:
    if val <= 0:
        return 0
    for i in range(len(conc_breaks) - 1):
        if conc_breaks[i] <= val <= conc_breaks[i + 1]:
            c_low, c_high = conc_breaks[i], conc_breaks[i + 1]
            i_low, i_high = index_breaks[i], index_breaks[i + 1]
            return round(i_low + ((i_high - i_low) / (c_high - c_low)) * (val - c_low))
    return 500

def compute_aqi(pm25: float, pm10: float, o3: float = 30.0, no2: float = 40.0) -> Tuple[int, str, str, str, str]:
    pm25_sub = calc_sub_index(pm25, [0, 30, 60, 90, 120, 250, 380, 500], [0, 50, 100, 200, 300, 400, 450, 500])
    pm10_sub = calc_sub_index(pm10, [0, 50, 100, 250, 350, 430, 500, 600], [0, 50, 100, 200, 300, 400, 450, 500])
    o3_sub = calc_sub_index(o3, [0, 50, 100, 168, 208, 748, 1000], [0, 50, 100, 200, 300, 400, 500])
    no2_sub = calc_sub_index(no2, [0, 40, 80, 180, 280, 400, 800], [0, 50, 100, 200, 300, 400, 500])

    aqi = max(pm25_sub, pm10_sub, o3_sub, no2_sub)

    category = "Good"
    color = "#2E9B4F"
    grap_stage = "Stage I (Monitoring)"
    grap_action = "Standard pollution prevention measures."

    if aqi > 450:
        category = "Severe+"
        color = "#581845"
        grap_stage = "Stage IV (Emergency)"
        grap_action = "Strict ban on BS-IV diesel heavy vehicles, entry of trucks restricted, school closures recommended."
    elif aqi > 400:
        category = "Severe"
        color = "#8C1D2B"
        grap_stage = "Stage III (Severe)"
        grap_action = "Strict ban on non-essential construction & demolition, closure of stone crushers."
    elif aqi > 300:
        category = "Very Poor"
        color = "#E13B3B"
        grap_stage = "Stage II (Very Poor)"
        grap_action = "Enhance parking fees to discourage private transport, increase diesel bus frequency."
    elif aqi > 200:
        category = "Poor"
        color = "#F08C1D"
        grap_stage = "Stage I (Poor)"
        grap_action = "Mechanized sweeping & anti-smog water sprinkling on major roads."
    elif aqi > 100:
        category = "Moderate"
        color = "#F4C430"
        grap_stage = "Normal Operations"
        grap_action = "Regular dust control monitoring."
    elif aqi > 50:
        category = "Satisfactory"
        color = "#8FCB3E"
        grap_stage = "Normal Operations"
        grap_action = "Clean air baseline maintained."

    return aqi, category, color, grap_stage, grap_action
