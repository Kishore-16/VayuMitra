import math
from typing import List
from models.schemas import FireEvent, PlumeForecast, PlumeTimelineItem

def compute_plume_dispersion(fire_events: List[FireEvent], wind_speed_ms: float, wind_dir_deg: float) -> PlumeForecast:
    total_frp = sum(f.frp_mw for f in fire_events)
    total_active_fires = len(fire_events) * 28  # Approximate hotspot cluster count

    distance_km = 240.0
    wind_speed_kmh = max(2.0, wind_speed_ms * 3.6)
    eta_hours = round(distance_km / wind_speed_kmh, 1)

    pm25_contrib = round((total_frp * 1.85) / math.sqrt(max(0.5, wind_speed_ms)), 1)

    timesteps = [0, 6, 12, 24, 48, 72]
    timeline = []

    for t in timesteps:
        progress = min(1.0, (t * wind_speed_kmh) / distance_km)
        lat = 30.8 - (progress * (30.8 - 28.65))
        lon = 75.2 + (progress * (77.2 - 75.2))
        spread = 20.0 + (progress * 60.0)

        timeline.append(
            PlumeTimelineItem(
                hour=t,
                time_label="Now (t=0h)" if t == 0 else f"+{t} Hours",
                progress_pct=round(progress * 100),
                centroid={"lat": round(lat, 3), "lon": round(lon, 3)},
                spread_radius_km=round(spread),
                estimated_pm25=round(pm25_contrib * min(1.0, progress * 1.2), 1),
                reached_delhi=progress >= 0.85
            )
        )

    alert_level = "CRITICAL" if pm25_contrib > 90 else ("ELEVATED" if pm25_contrib > 45 else "LOW")

    return PlumeForecast(
        source_region="Punjab / Haryana Stubble Belt",
        active_fires_count=total_active_fires,
        total_frp=round(total_frp, 1),
        eta_hours=eta_hours,
        estimated_pm25_contribution=pm25_contrib,
        wind_direction_label="North-Westerly (NW ➔ SE)",
        alert_level=alert_level,
        timeline=timeline
    )
