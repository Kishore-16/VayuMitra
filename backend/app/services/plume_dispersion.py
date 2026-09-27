import json
import math
import os
from typing import List, Dict, Any
from ..models.schemas import StubbleFire, PlumeTrajectory, TrajectoryPoint

# Delhi Central Coordinates
DELHI_LAT = 28.6139
DELHI_LON = 77.2090

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def load_stubble_fires() -> List[StubbleFire]:
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "stubble_hotspots.json")
    with open(data_path, "r", encoding="utf-8") as f:
        raw_fires = json.load(f)
    
    fires = []
    for f in raw_fires:
        # Plume injection height based on Freitas plume-rise parameterization (function of FRP)
        # Hp = H_sfc + 350 + 8.5 * sqrt(FRP)
        injection_h = round(350.0 + 8.5 * math.sqrt(f["mean_frp_mw"]), 1)
        fires.append(StubbleFire(
            id=f["id"],
            district=f["district"],
            state=f["state"],
            lat=f["lat"],
            lon=f["lon"],
            active_fires=f["active_fires"],
            mean_frp_mw=f["mean_frp_mw"],
            confidence=f["confidence"],
            crop_type=f["crop_type"],
            estimated_emission_rate_kg_s=f["estimated_emission_rate_kg_s"],
            plume_injection_height_m=injection_h
        ))
    return fires

def compute_plume_trajectories(
    wind_speed_kmh: float,
    wind_dir_deg: float,
    current_pbl_m: float
) -> List[PlumeTrajectory]:
    """
    Computes forward trajectory and dispersion footprint for active stubble fire clusters
    towards Delhi NCR based on evolving wind field and PBL capping.
    """
    fires = load_stubble_fires()
    trajectories: List[PlumeTrajectory] = []
    
    # Wind direction indicates FROM where the wind blows.
    # Advection vector is in the direction TO which the wind blows (wind_dir + 180 mod 360)
    advection_deg = (wind_dir_deg + 180.0) % 360.0
    advection_rad = math.radians(advection_deg)
    
    # Speed in km/h
    effective_speed = max(4.0, wind_speed_kmh * 1.25)  # Transport wind at injection height is ~25% faster than 10m wind
    
    for fire in fires:
        dist_to_delhi_km = haversine_distance_km(fire.lat, fire.lon, DELHI_LAT, DELHI_LON)
        
        # Bearing angle from fire to Delhi
        dlat = math.radians(DELHI_LAT - fire.lat)
        dlon = math.radians(DELHI_LON - fire.lon)
        y = math.sin(dlon) * math.cos(math.radians(DELHI_LAT))
        x = (math.cos(math.radians(fire.lat)) * math.sin(math.radians(DELHI_LAT)) -
             math.sin(math.radians(fire.lat)) * math.cos(math.radians(DELHI_LAT)) * math.cos(dlon))
        bearing_to_delhi = (math.degrees(math.atan2(y, x)) + 360.0) % 360.0
        
        # Alignment between advection vector and bearing to Delhi
        # When wind is North-Westerly (~315 deg), advection is ~135 deg (South-East, directly towards Delhi)
        angle_diff = abs((advection_deg - bearing_to_delhi + 180) % 360 - 180)
        alignment_factor = max(0.05, math.cos(math.radians(angle_diff))) if angle_diff < 85 else 0.02
        
        eta_hours = round(dist_to_delhi_km / effective_speed, 1)
        
        # Impact on Delhi surface PM2.5 (ug/m3) based on emission rate, alignment, and PBL trapping
        base_emission = fire.estimated_emission_rate_kg_s
        impact_pm25 = round((base_emission * 2.8 * alignment_factor * (600.0 / max(150.0, current_pbl_m))), 1)
        
        # Generate 12 hourly trajectory points along the plume path
        points: List[TrajectoryPoint] = []
        curr_lat = fire.lat
        curr_lon = fire.lon
        curr_alt = fire.plume_injection_height_m
        initial_conc = fire.estimated_emission_rate_kg_s * 45.0
        
        # Add origin
        points.append(TrajectoryPoint(
            hour=0,
            lat=round(curr_lat, 4),
            lon=round(curr_lon, 4),
            altitude_m=round(curr_alt, 1),
            pm25_concentration=round(initial_conc, 1)
        ))
        
        steps = min(24, max(8, int(eta_hours * 1.4)))
        dt = dist_to_delhi_km / (steps * effective_speed) # time step in hours
        
        for step in range(1, steps + 1):
            t_hour = int(round(step * dt))
            # Distance traveled in this step
            step_km = effective_speed * dt
            
            # Advection with slight turbulence wobble
            lat_disp = (step_km * math.cos(advection_rad)) / 111.0
            lon_disp = (step_km * math.sin(advection_rad)) / (111.0 * math.cos(math.radians(curr_lat)))
            
            curr_lat += lat_disp
            curr_lon += lon_disp
            
            # Plume descends into nocturnal boundary layer or gets mixed down
            if curr_alt > current_pbl_m:
                curr_alt = max(current_pbl_m * 0.8, curr_alt - 18.0 * dt)
            else:
                curr_alt = max(60.0, curr_alt - 8.0 * dt)
            
            # Gaussian dispersion concentration decay
            travel_dist = step_km * step
            decay_factor = 1.0 / (1.0 + 0.015 * travel_dist + 0.00008 * (travel_dist ** 1.8))
            step_conc = initial_conc * decay_factor
            
            points.append(TrajectoryPoint(
                hour=t_hour,
                lat=round(curr_lat, 4),
                lon=round(curr_lon, 4),
                altitude_m=round(curr_alt, 1),
                pm25_concentration=round(step_conc, 1)
            ))
            
        trajectories.append(PlumeTrajectory(
            fire_id=fire.id,
            district=fire.district,
            state=fire.state,
            origin_lat=fire.lat,
            origin_lon=fire.lon,
            frp_mw=fire.mean_frp_mw,
            delhi_eta_hours=eta_hours,
            delhi_impact_pm25_ug_m3=impact_pm25,
            trajectory_points=points
        ))
        
    return trajectories
