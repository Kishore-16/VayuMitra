from datetime import datetime
from typing import List
from models.schemas import InversionResult

def compute_inversion(vertical_temp_profile_c: List[float], pbl_height_m: float, zone_id: str, timestamp: datetime = None) -> InversionResult:
    ts = timestamp or datetime.utcnow()
    if not vertical_temp_profile_c or len(vertical_temp_profile_c) < 2:
        return InversionResult(
            timestamp=ts,
            zone_id=zone_id,
            isi=0.0,
            category="Low",
            color="#2E9B4F",
            delta_t=0.0,
            pbl_height_m=pbl_height_m,
            description="No inversion detected (neutral lapse rate)."
        )

    surface_t = vertical_temp_profile_c[0]
    top_t = vertical_temp_profile_c[-1]
    delta_t = top_t - surface_t

    isi = 0.0
    if delta_t > 0:
        isi = min(1.0, delta_t / 3.2)

    if pbl_height_m < 200:
        isi = min(1.0, isi * 1.15)

    isi = round(isi, 2)

    category = "Low"
    color = "#2E9B4F"
    if isi >= 0.75:
        category = "Severe"
        color = "#8C1D2B"
    elif isi >= 0.50:
        category = "High"
        color = "#E13B3B"
    elif isi >= 0.25:
        category = "Moderate"
        color = "#F4C430"

    desc = f"Temperature inversion active (+{delta_t:.1f}°C gradient). Boundary layer trapped at {int(pbl_height_m)}m." if isi > 0.25 else f"Unstable/normal vertical mixing. Boundary layer open at {int(pbl_height_m)}m."

    return InversionResult(
        timestamp=ts,
        zone_id=zone_id,
        isi=isi,
        category=category,
        color=color,
        delta_t=round(delta_t, 2),
        pbl_height_m=round(pbl_height_m, 1),
        description=desc
    )
