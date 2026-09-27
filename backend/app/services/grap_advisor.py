from typing import List, Dict, Any
from ..models.schemas import GRAPStageDetail, GRAPStatusResponse

def get_grap_guidelines(current_aqi: int, max_forecast_aqi: int) -> GRAPStatusResponse:
    """
    Evaluates current and 72-hour projected AQI against statutory CAQM GRAP stages.
    Stage 1: 'Poor' (AQI 201 - 300)
    Stage 2: 'Very Poor' (AQI 301 - 400)
    Stage 3: 'Severe' (AQI 401 - 450)
    Stage 4: 'Severe Plus / Emergency' (AQI > 450 or PM2.5 > 300 ug/m3)
    """
    eval_aqi = max(current_aqi, max_forecast_aqi)
    
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

    stages: List[GRAPStageDetail] = [
        GRAPStageDetail(
            stage="Stage I",
            title="Poor AQI (201 - 300)",
            aqi_range="201 - 300",
            active=eval_aqi >= 201,
            trigger_condition="AQI projected to breach 200",
            key_actions=[
                "Strict anti-dust measures at all C&D sites (>500 sq.m)",
                "Periodic mechanized road sweeping and water sprinkling",
                "Strict enforcement of ban on open biomass & garbage burning",
                "Ensure uninterrupted power supply to deter diesel generator use"
            ],
            public_health_guidelines=[
                "Keep vehicle engines tuned and tires properly inflated",
                "Avoid unnecessary idling at traffic intersections",
                "Switch off engines during prolonged red lights"
            ]
        ),
        GRAPStageDetail(
            stage="Stage II",
            title="Very Poor AQI (301 - 400)",
            aqi_range="301 - 400",
            active=eval_aqi >= 301,
            trigger_condition="AQI projected in Very Poor category (301-400)",
            key_actions=[
                "Daily mechanized sweeping and water sprinkling along with dust suppressants",
                "Enhanced parking fees to discourage private transport usage",
                "Augment electric/CNG bus services and metro frequencies",
                "Strict regulated use of DG sets only for emergency services"
            ],
            public_health_guidelines=[
                "People with respiratory or cardiac ailments to minimize outdoor exertion",
                "Prefer public transport (Metro/Bus) over private personal vehicles",
                "Use certified N95/N99 masks when stepping outside in early morning/night"
            ]
        ),
        GRAPStageDetail(
            stage="Stage III",
            title="Severe AQI (401 - 450)",
            aqi_range="401 - 450",
            active=eval_aqi >= 401,
            trigger_condition="AQI breaches 400 with atmospheric inversion entrapment",
            key_actions=[
                "Complete ban on non-essential construction and demolition (C&D) works",
                "Closure of all stone crushers and mining activities across NCR",
                "Ban on plying of BS-III Petrol and BS-IV Diesel 4-wheeler LMVs in Delhi-NCR",
                "Shift primary school classes (up to Class 5) to online mode"
            ],
            public_health_guidelines=[
                "Vulnerable groups (children, elderly, pregnant women) stay strictly indoors",
                "Avoid morning jogs, outdoor sports, and strenuous physical workouts",
                "Close windows during late night and early morning inversion peak hours"
            ]
        ),
        GRAPStageDetail(
            stage="Stage IV",
            title="Severe+ / Emergency AQI (> 450)",
            aqi_range="> 450",
            active=eval_aqi > 450,
            trigger_condition="AQI reaches critical threshold (>450) with stubble plume surge",
            key_actions=[
                "Ban on entry of non-Delhi registered commercial trucks into Delhi (except LNG/CNG/Electric)",
                "Ban on plying of Delhi-registered diesel Medium/Heavy Goods Vehicles (MGVs/HGVs)",
                "Complete ban on all construction activities including public infrastructure projects",
                "Mandatory 50% work-from-home (WFH) in public and private offices across NCR",
                "Discontinue physical classes for all grades (Class 1 to 11), shift entirely online",
                "Government may invoke Odd-Even vehicle rationing scheme"
            ],
            public_health_guidelines=[
                "Complete emergency advisory: Total avoidance of all outdoor exposure",
                "Operate HEPA-filtered indoor air purifiers in homes and medical facilities",
                "Seek immediate medical attention in case of chest discomfort or wheezing"
            ]
        )
    ]

    critical_window = "Early Morning Inversion (02:00 - 08:00 AM) & Evening Stubble Advection (18:00 - 23:00)"
    primary_driver = "Coupled North-Westerly Stubble Burning Plumes trapped under Strong Nocturnal Inversion Layer"

    return GRAPStatusResponse(
        current_stage=active_stage,
        max_forecast_aqi=eval_aqi,
        critical_time_window=critical_window,
        primary_driver=primary_driver,
        stages=stages
    )
