"""
GRAP Decision Support Advisor
==============================
Evaluates current and 72-hour forecast AQI against statutory CAQM GRAP
(Graded Response Action Plan) stages, with pre-emptive alerts triggered
by predicted stubble-plume arrivals before the pollution actually hits.

GRAP Stages (Commission for Air Quality Management):
  Stage I:   Poor        (AQI 201-300)
  Stage II:  Very Poor   (AQI 301-400)
  Stage III: Severe      (AQI 401-450)
  Stage IV:  Severe+     (AQI > 450 or PM2.5 > 300 ug/m3)
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from ..models.schemas import GRAPStageDetail, GRAPStatusResponse


def determine_grap_stage(aqi: int) -> str:
    """Returns the GRAP stage string for a given AQI value."""
    if aqi > 450:
        return "Stage IV (Severe+)"
    elif aqi > 400:
        return "Stage III (Severe)"
    elif aqi > 300:
        return "Stage II (Very Poor)"
    elif aqi > 200:
        return "Stage I (Poor)"
    else:
        return "Stage 0 (Normal / Pre-Emptive)"


def get_grap_guidelines(
    current_aqi: int,
    max_forecast_aqi: int,
    plume_impact_pm25: float = 0.0,
    plume_eta_hours: float = -1.0,
    inversion_active: bool = False,
) -> GRAPStatusResponse:
    """
    Evaluates current and 72-hour projected AQI against statutory CAQM GRAP
    stages, with plume-aware pre-emptive escalation.

    Pre-emptive Logic:
      - If a stubble plume with >50 ug/m3 predicted impact is arriving
        within 12 hours, escalate GRAP stage by one level proactively
      - If inversion is concurrently active, escalate by two levels
      - This gives authorities 6-12 hours of lead time to implement
        emergency measures BEFORE the pollution spike hits
    """
    eval_aqi = max(current_aqi, max_forecast_aqi)

    # ── Pre-emptive plume escalation ──
    plume_alert = False
    plume_alert_message = ""

    if plume_impact_pm25 > 50.0 and 0 < plume_eta_hours <= 12:
        plume_alert = True

        # Estimate what AQI would be after plume arrival
        # Rough: each 10 ug/m3 PM2.5 adds ~15-20 AQI points in the Poor+ range
        estimated_aqi_bump = int(plume_impact_pm25 * 1.6)
        eval_aqi = max(eval_aqi, current_aqi + estimated_aqi_bump)

        eta_str = f"{plume_eta_hours:.0f}" if plume_eta_hours >= 1 else "<1"
        plume_alert_message = (
            f"PRE-EMPTIVE ALERT: Stubble-burning plume predicted to add "
            f"+{plume_impact_pm25:.0f} ug/m3 PM2.5 within {eta_str} hours. "
        )

        if inversion_active:
            eval_aqi = min(500, eval_aqi + 40)  # Inversion compounds the trapping
            plume_alert_message += (
                "Nocturnal inversion layer is ACTIVE - plume will be trapped "
                "at surface level with no vertical ventilation."
            )

    # Determine active stage
    if eval_aqi > 450:
        active_stage = "Stage IV (Severe+)"
    elif eval_aqi > 400:
        active_stage = "Stage III (Severe)"
    elif eval_aqi > 300:
        active_stage = "Stage II (Very Poor)"
    elif eval_aqi > 200:
        active_stage = "Stage I (Poor)"
    else:
        active_stage = "Stage 0 (Normal / Pre-Emptive)"

    if plume_alert:
        active_stage += " [PLUME PRE-EMPTIVE]"

    # ── GRAP Stage Definitions (CAQM statutory actions) ──
    stages: List[GRAPStageDetail] = [
        GRAPStageDetail(
            stage="Stage I",
            title="Poor AQI (201 - 300)",
            aqi_range="201 - 300",
            active=eval_aqi >= 201,
            trigger_condition="AQI projected to breach 200" + (
                f" | Plume ETA: {plume_eta_hours:.0f}h" if plume_alert and eval_aqi >= 201 else ""
            ),
            key_actions=[
                "Strict anti-dust measures at all C&D sites (>500 sq.m)",
                "Periodic mechanized road sweeping and water sprinkling",
                "Strict enforcement of ban on open biomass & garbage burning",
                "Ensure uninterrupted power supply to deter diesel generator use",
            ],
            public_health_guidelines=[
                "Keep vehicle engines tuned and tires properly inflated",
                "Avoid unnecessary idling at traffic intersections",
                "Switch off engines during prolonged red lights",
            ],
        ),
        GRAPStageDetail(
            stage="Stage II",
            title="Very Poor AQI (301 - 400)",
            aqi_range="301 - 400",
            active=eval_aqi >= 301,
            trigger_condition="AQI projected in Very Poor category (301-400)" + (
                f" | Plume ETA: {plume_eta_hours:.0f}h" if plume_alert and eval_aqi >= 301 else ""
            ),
            key_actions=[
                "Daily mechanized sweeping and water sprinkling with dust suppressants",
                "Enhanced parking fees to discourage private transport usage",
                "Augment electric/CNG bus services and metro frequencies",
                "Strict regulated use of DG sets only for emergency services",
            ],
            public_health_guidelines=[
                "People with respiratory or cardiac ailments to minimize outdoor exertion",
                "Prefer public transport (Metro/Bus) over private personal vehicles",
                "Use certified N95/N99 masks when stepping outside in early morning/night",
            ],
        ),
        GRAPStageDetail(
            stage="Stage III",
            title="Severe AQI (401 - 450)",
            aqi_range="401 - 450",
            active=eval_aqi >= 401,
            trigger_condition="AQI breaches 400 with atmospheric inversion entrapment" + (
                f" | PLUME INCOMING: +{plume_impact_pm25:.0f} ug/m3 in {plume_eta_hours:.0f}h"
                if plume_alert and eval_aqi >= 401 else ""
            ),
            key_actions=[
                "Complete ban on non-essential construction and demolition (C&D) works",
                "Closure of all stone crushers and mining activities across NCR",
                "Ban on plying of BS-III Petrol and BS-IV Diesel 4-wheeler LMVs in Delhi-NCR",
                "Shift primary school classes (up to Class 5) to online mode",
            ],
            public_health_guidelines=[
                "Vulnerable groups (children, elderly, pregnant women) stay strictly indoors",
                "Avoid morning jogs, outdoor sports, and strenuous physical workouts",
                "Close windows during late night and early morning inversion peak hours",
            ],
        ),
        GRAPStageDetail(
            stage="Stage IV",
            title="Severe+ / Emergency AQI (> 450)",
            aqi_range="> 450",
            active=eval_aqi > 450,
            trigger_condition="AQI reaches critical threshold (>450) with stubble plume surge" + (
                f" | EMERGENCY: Plume +{plume_impact_pm25:.0f} ug/m3 arriving in {plume_eta_hours:.0f}h"
                if plume_alert and eval_aqi > 450 else ""
            ),
            key_actions=[
                "Ban on entry of non-Delhi registered commercial trucks into Delhi (except LNG/CNG/Electric)",
                "Ban on plying of Delhi-registered diesel Medium/Heavy Goods Vehicles (MGVs/HGVs)",
                "Complete ban on all construction activities including public infrastructure projects",
                "Mandatory 50% work-from-home (WFH) in public and private offices across NCR",
                "Discontinue physical classes for all grades (Class 1 to 11), shift entirely online",
                "Government may invoke Odd-Even vehicle rationing scheme",
            ],
            public_health_guidelines=[
                "Complete emergency advisory: Total avoidance of all outdoor exposure",
                "Operate HEPA-filtered indoor air purifiers in homes and medical facilities",
                "Seek immediate medical attention in case of chest discomfort or wheezing",
            ],
        ),
    ]

    # Determine critical time window based on plume and inversion
    if plume_alert and inversion_active:
        critical_window = (
            f"CRITICAL: Plume arriving in {plume_eta_hours:.0f}h during active inversion "
            f"(02:00-08:00 AM). Expect rapid PM2.5 spike with no ventilation."
        )
    elif plume_alert:
        critical_window = (
            f"Stubble plume ETA: {plume_eta_hours:.0f} hours. "
            f"Evening Advection Window (18:00-23:00) is high risk."
        )
    else:
        critical_window = (
            "Early Morning Inversion (02:00 - 08:00 AM) & "
            "Evening Stubble Advection (18:00 - 23:00)"
        )

    # Determine primary driver
    if plume_impact_pm25 > 80:
        primary_driver = (
            f"Regional stubble-burning plumes ({plume_impact_pm25:.0f} ug/m3 predicted impact) "
            f"coupled with nocturnal inversion trapping"
        )
    elif plume_impact_pm25 > 20:
        primary_driver = (
            "Combined North-Westerly Stubble Burning Plumes and "
            "urban vehicular/industrial emissions under weak ventilation"
        )
    else:
        primary_driver = (
            "Local vehicular, industrial, and dust emissions "
            "trapped under atmospheric inversion layer"
        )

    return GRAPStatusResponse(
        current_stage=active_stage,
        max_forecast_aqi=eval_aqi,
        critical_time_window=critical_window,
        primary_driver=primary_driver,
        stages=stages,
    )
