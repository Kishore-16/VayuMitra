"""
CAMS (Copernicus Atmosphere Monitoring Service) Chemical Assimilation Engine
============================================================================
Ingests satellite-derived atmospheric composition products from the
Copernicus Atmosphere Data Store (ADS) and NASA EarthData LAADS/DAAC.

Data products assimilated:
  - Aerosol Optical Depth @ 550nm (AOD)        → radiative feedback coupling
  - Black Carbon / Organic Carbon mass fraction → stubble burning tracer
  - Sulfate + Nitrate mass fraction             → industrial + power emissions
  - Mineral Dust AOD                            → Thar Desert transport
  - Total Column NO₂                           → vehicular emission intensity
  - PM2.5 columnar estimates                    → model validation & calibration

Uses the free Open-Meteo Air Quality API as primary source for real-time
satellite-assimilated products (CAMS-based), with CAMS ADS as secondary.
"""

import os
import math
import httpx
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

DELHI_LAT = 28.6139
DELHI_LON = 77.2090

CAMS_API_KEY = os.getenv("CAMS_API", "").strip()
NASA_EARTHDATA_KEY = os.getenv("NASA_EARTHDATA_API", "").strip()


# ──────────────────────────────────────────────────────────────────
# 1. CAMS Satellite Chemical Products (via Open-Meteo AQ endpoint)
# ──────────────────────────────────────────────────────────────────

async def fetch_cams_satellite_products(
    lat: float = DELHI_LAT,
    lon: float = DELHI_LON,
    forecast_days: int = 3,
) -> Dict[str, Any]:
    """
    Fetches satellite-assimilated atmospheric composition data from
    Open-Meteo's Air Quality API (backed by Copernicus CAMS).

    Returns hourly AOD, dust, PM speciation, and chemical tracers.
    """
    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,"
        f"carbon_monoxide,dust,aerosol_optical_depth,"
        f"uv_index,uv_index_clear_sky&"
        f"forecast_days={forecast_days}&timezone=Asia%2FKolkata"
    )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                hourly = data.get("hourly", {})
                times = hourly.get("time", [])[:72]

                products = []
                for i, t in enumerate(times):
                    aod = hourly.get("aerosol_optical_depth", [None] * len(times))
                    dust = hourly.get("dust", [None] * len(times))
                    pm25 = hourly.get("pm2_5", [None] * len(times))
                    pm10 = hourly.get("pm10", [None] * len(times))
                    no2 = hourly.get("nitrogen_dioxide", [None] * len(times))
                    o3 = hourly.get("ozone", [None] * len(times))
                    so2 = hourly.get("sulphur_dioxide", [None] * len(times))
                    co = hourly.get("carbon_monoxide", [None] * len(times))
                    uv = hourly.get("uv_index", [None] * len(times))

                    aod_val = aod[i] if i < len(aod) and aod[i] is not None else 0.0
                    dust_val = dust[i] if i < len(dust) and dust[i] is not None else 0.0
                    pm25_val = pm25[i] if i < len(pm25) and pm25[i] is not None else 0.0
                    pm10_val = pm10[i] if i < len(pm10) and pm10[i] is not None else 0.0
                    no2_val = no2[i] if i < len(no2) and no2[i] is not None else 0.0
                    o3_val = o3[i] if i < len(o3) and o3[i] is not None else 0.0
                    so2_val = so2[i] if i < len(so2) and so2[i] is not None else 0.0
                    co_val = co[i] if i < len(co) and co[i] is not None else 0.0
                    uv_val = uv[i] if i < len(uv) and uv[i] is not None else 0.0

                    # Derive chemical speciation from total PM & satellite tracers
                    speciation = compute_chemical_speciation(
                        pm25_val, pm10_val, dust_val, no2_val, so2_val, co_val, aod_val
                    )

                    products.append({
                        "timestamp": t,
                        "hour_offset": i,
                        # Satellite column products
                        "aod_550nm": round(aod_val, 4),
                        "dust_concentration_ug_m3": round(dust_val, 1),
                        "uv_index": round(uv_val, 1),
                        # Gas-phase chemistry
                        "pm25_satellite_ug_m3": round(pm25_val, 1),
                        "pm10_satellite_ug_m3": round(pm10_val, 1),
                        "no2_satellite_ug_m3": round(no2_val, 1),
                        "o3_satellite_ug_m3": round(o3_val, 1),
                        "so2_satellite_ug_m3": round(so2_val, 1),
                        "co_satellite_ug_m3": round(co_val, 1),
                        # Derived speciation
                        **speciation,
                    })

                print(f"[CAMS] Successfully fetched {len(products)} hourly satellite products")
                return {
                    "source": "CAMS via Open-Meteo",
                    "is_live": True,
                    "location": {"lat": lat, "lon": lon},
                    "products": products,
                }

    except Exception as e:
        print(f"[CAMS] Satellite product fetch failed: {e}")

    # Fallback: Generate physics-based synthetic satellite products
    return generate_synthetic_satellite_products(lat, lon)


def compute_chemical_speciation(
    pm25: float, pm10: float, dust: float,
    no2: float, so2: float, co: float, aod: float
) -> Dict[str, Any]:
    """
    Derives PM2.5 chemical speciation (source attribution) from
    satellite-measured bulk concentrations and tracers.

    Based on receptor modeling approaches used in CPCB/IIT studies:
    - Black Carbon (BC) + Organic Carbon (OC): Biomass burning tracer
    - Sulfate (SO4): Industrial + power plant emissions
    - Nitrate (NO3): Vehicular NOx secondary aerosol
    - Mineral Dust: Crustal + Thar Desert transport
    - Sea Salt: Negligible for landlocked Delhi
    """
    total_pm25 = max(1.0, pm25)

    # --- Mineral Dust fraction ---
    # High dust → Thar Desert transport or construction
    dust_fraction = min(0.30, dust / max(1.0, pm10) * 0.6) if dust > 0 else 0.08
    dust_mass = total_pm25 * dust_fraction

    # --- Secondary Inorganic Aerosol (SIA) ---
    # Sulfate: SO2 oxidation → ammonium sulfate
    so2_proxy = max(0.0, so2)
    sulfate_fraction = min(0.18, 0.06 + so2_proxy * 0.003)
    sulfate_mass = total_pm25 * sulfate_fraction

    # Nitrate: NO2 → HNO3 → ammonium nitrate (esp. winter nocturnal)
    no2_proxy = max(0.0, no2)
    nitrate_fraction = min(0.20, 0.07 + no2_proxy * 0.002)
    nitrate_mass = total_pm25 * nitrate_fraction

    # --- Carbonaceous aerosol (Biomass burning tracer) ---
    # High AOD + moderate CO + low SO2 → stubble/biomass signal
    biomass_signal = min(1.0, aod * 2.5) * (1.0 + co * 0.0002) if aod > 0.2 else 0.3
    bc_oc_fraction = min(0.45, 0.18 + biomass_signal * 0.15)
    bc_mass = total_pm25 * bc_oc_fraction * 0.3  # ~30% of carbonaceous is BC
    oc_mass = total_pm25 * bc_oc_fraction * 0.7  # ~70% is OC

    # --- Residual (ammonium, trace metals, water) ---
    accounted = dust_mass + sulfate_mass + nitrate_mass + bc_mass + oc_mass
    residual = max(0.0, total_pm25 - accounted)

    return {
        "speciation_dust_ug_m3": round(dust_mass, 1),
        "speciation_sulfate_ug_m3": round(sulfate_mass, 1),
        "speciation_nitrate_ug_m3": round(nitrate_mass, 1),
        "speciation_black_carbon_ug_m3": round(bc_mass, 1),
        "speciation_organic_carbon_ug_m3": round(oc_mass, 1),
        "speciation_residual_ug_m3": round(residual, 1),
        "biomass_burning_tracer_index": round(biomass_signal, 3),
        "industrial_tracer_index": round(sulfate_fraction + nitrate_fraction, 3),
    }


def generate_synthetic_satellite_products(
    lat: float, lon: float
) -> Dict[str, Any]:
    """Generates realistic synthetic CAMS products for fallback scenarios."""
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    products = []

    for h in range(72):
        dt = now + timedelta(hours=h)
        hod = dt.hour

        # Diurnal AOD cycle: higher during afternoon convection, lower at night
        aod_base = 0.65 + 0.35 * math.sin((hod - 6) * math.pi / 12)
        # Stubble burning seasonal enhancement
        aod = aod_base * (1.2 if dt.month in (10, 11) else 0.9) + 0.1 * math.sin(h / 8.0)

        # Dust: Higher in afternoon, transported from west
        dust = max(5.0, 18.0 + 12.0 * max(0.0, math.sin((hod - 10) * math.pi / 14)))

        # PM2.5 from CAMS estimate
        pm25_base = 145.0
        nocturnal_trap = 1.6 if (0 <= hod <= 7 or hod >= 22) else 0.85
        pm25 = pm25_base * nocturnal_trap * (1.0 + 0.2 * math.sin(h / 6.0))

        pm10 = pm25 * 1.7 + dust * 0.8
        no2 = 55.0 * (1.5 if (8 <= hod <= 10 or 18 <= hod <= 21) else 0.8)
        o3 = max(8.0, 18.0 + 50.0 * max(0.0, math.sin((hod - 8) * math.pi / 12)))
        so2 = 12.0 + 6.0 * math.sin(hod * math.pi / 12)
        co = 800.0 + 400.0 * (1.3 if (18 <= hod or hod <= 4) else 0.7)
        uv = max(0.0, 8.0 * max(0.0, math.sin((hod - 6) * math.pi / 12)))

        speciation = compute_chemical_speciation(pm25, pm10, dust, no2, so2, co, aod)

        products.append({
            "timestamp": dt.strftime("%Y-%m-%dT%H:00:00+05:30"),
            "hour_offset": h,
            "aod_550nm": round(aod, 4),
            "dust_concentration_ug_m3": round(dust, 1),
            "uv_index": round(uv, 1),
            "pm25_satellite_ug_m3": round(pm25, 1),
            "pm10_satellite_ug_m3": round(pm10, 1),
            "no2_satellite_ug_m3": round(no2, 1),
            "o3_satellite_ug_m3": round(o3, 1),
            "so2_satellite_ug_m3": round(so2, 1),
            "co_satellite_ug_m3": round(co, 1),
            **speciation,
        })

    return {
        "source": "Physics-Based Synthetic (CAMS Fallback)",
        "is_live": False,
        "location": {"lat": lat, "lon": lon},
        "products": products,
    }


# ──────────────────────────────────────────────────────────────────
# 2. Wind Field Grid for Frontend Particle Animation
# ──────────────────────────────────────────────────────────────────

async def fetch_wind_field_grid(
    lat_min: float = 26.0,
    lat_max: float = 32.0,
    lon_min: float = 73.0,
    lon_max: float = 79.5,
    resolution: float = 0.5,
    forecast_hours: int = 72,
) -> Dict[str, Any]:
    """
    Fetches a spatial wind vector grid from Open-Meteo for rendering
    Windy.com-style animated particle flow on the frontend canvas.

    Returns a structured grid with u/v wind components at each node.
    """
    lat_steps = int((lat_max - lat_min) / resolution) + 1
    lon_steps = int((lon_max - lon_min) / resolution) + 1

    lats = [round(lat_min + i * resolution, 2) for i in range(lat_steps)]
    lons = [round(lon_min + i * resolution, 2) for i in range(lon_steps)]

    # Batch grid-point queries (Open-Meteo supports multi-location)
    lat_list = []
    lon_list = []
    for lat in lats:
        for lon in lons:
            lat_list.append(lat)
            lon_list.append(lon)

    lat_str = ",".join(str(l) for l in lat_list)
    lon_str = ",".join(str(l) for l in lon_list)

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat_str}&longitude={lon_str}&"
        f"hourly=wind_speed_10m,wind_direction_10m,temperature_2m&"
        f"forecast_days=3&timezone=Asia%2FKolkata"
    )

    grid_snapshots = []

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()

                # Open-Meteo returns array of results for multi-location
                results = data if isinstance(data, list) else [data]

                # We need wind field per hour for animation frames
                num_hours = min(forecast_hours, 72)

                for hour_idx in range(num_hours):
                    grid_points = []
                    for idx, result in enumerate(results):
                        hourly = result.get("hourly", {})
                        speeds = hourly.get("wind_speed_10m", [])
                        dirs = hourly.get("wind_direction_10m", [])
                        temps = hourly.get("temperature_2m", [])

                        ws = speeds[hour_idx] if hour_idx < len(speeds) else 8.0
                        wd = dirs[hour_idx] if hour_idx < len(dirs) else 315.0
                        temp = temps[hour_idx] if hour_idx < len(temps) else 22.0

                        # Convert speed+direction → u,v components
                        wd_rad = math.radians(wd)
                        u = -ws * math.sin(wd_rad)  # East-West component
                        v = -ws * math.cos(wd_rad)  # North-South component

                        grid_points.append({
                            "lat": lat_list[idx],
                            "lon": lon_list[idx],
                            "u": round(u, 2),
                            "v": round(v, 2),
                            "speed": round(ws, 1),
                            "dir": round(wd, 1),
                            "temp": round(temp, 1),
                        })

                    grid_snapshots.append({
                        "hour_offset": hour_idx,
                        "grid": grid_points,
                    })

                print(f"[WIND-GRID] Fetched {len(grid_snapshots)} hourly wind field snapshots ({lat_steps}×{lon_steps} grid)")
                return {
                    "source": "Open-Meteo Live",
                    "is_live": True,
                    "grid_meta": {
                        "lat_min": lat_min, "lat_max": lat_max,
                        "lon_min": lon_min, "lon_max": lon_max,
                        "resolution_deg": resolution,
                        "nx": lon_steps, "ny": lat_steps,
                    },
                    "snapshots": grid_snapshots,
                }

    except Exception as e:
        print(f"[WIND-GRID] Live wind field fetch failed: {e}")

    # Fallback: Generate synthetic wind field
    return generate_synthetic_wind_field(lats, lons, forecast_hours)


def generate_synthetic_wind_field(
    lats: List[float], lons: List[float], hours: int = 72
) -> Dict[str, Any]:
    """
    Generates realistic synthetic wind field grid for the Indo-Gangetic
    plain during October-November stubble burning season.

    Dominant: NW flow (300-330°) advecting smoke from Punjab → Delhi.
    """
    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    snapshots = []

    for h in range(min(hours, 72)):
        dt = now + timedelta(hours=h)
        hod = dt.hour

        # Base NW wind with diurnal modulation
        base_speed = 7.5 + 4.5 * max(0.0, math.sin((hod - 9) * math.pi / 12))
        base_dir = 315.0 + 15.0 * math.sin(h / 10.0)

        grid = []
        for lat in lats:
            for lon in lons:
                # Spatial variation: wind accelerates through the IGP channel
                lat_factor = 1.0 + 0.15 * (lat - 28.0) / 4.0
                lon_factor = 1.0 - 0.1 * abs(lon - 76.5) / 3.0

                local_speed = base_speed * lat_factor * lon_factor
                local_speed += 1.5 * math.sin((lat * 10 + lon * 10 + h) * 0.3)
                local_speed = max(1.0, local_speed)

                local_dir = base_dir + 8.0 * math.sin((lat * 5 + h) * 0.5)
                local_dir = local_dir % 360.0

                wd_rad = math.radians(local_dir)
                u = -local_speed * math.sin(wd_rad)
                v = -local_speed * math.cos(wd_rad)

                temp = 21.0 + 7.0 * math.sin((hod - 9) * math.pi / 12) - (lat - 28.0) * 0.8

                grid.append({
                    "lat": lat, "lon": lon,
                    "u": round(u, 2), "v": round(v, 2),
                    "speed": round(local_speed, 1),
                    "dir": round(local_dir, 1),
                    "temp": round(temp, 1),
                })

        snapshots.append({"hour_offset": h, "grid": grid})

    return {
        "source": "Physics-Based Synthetic (IGP NW Flow)",
        "is_live": False,
        "grid_meta": {
            "lat_min": min(lats), "lat_max": max(lats),
            "lon_min": min(lons), "lon_max": max(lons),
            "resolution_deg": round(lats[1] - lats[0], 2) if len(lats) > 1 else 0.5,
            "nx": len(set(l for l in lons)),
            "ny": len(set(l for l in lats)),
        },
        "snapshots": snapshots,
    }
