import os
from fastapi import APIRouter
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/carto", tags=["carto"])

CARTO_API_KEY = os.getenv("CARTO_API", "").strip()

@router.get("/config")
async def get_carto_config():
    """
    Returns CARTO GIS Map Engine configuration, basemap tile endpoints,
    configured API credentials, and spatial airshed boundary definitions.
    """
    has_key = bool(CARTO_API_KEY)
    masked_key = f"{CARTO_API_KEY[:6]}...{CARTO_API_KEY[-4:]}" if len(CARTO_API_KEY) > 10 else CARTO_API_KEY

    # CartoDB High-Performance Vector/Raster Basemap Templates
    basemaps = {
        "dark_matter": {
            "id": "dark_matter",
            "name": "CARTO Dark Matter",
            "description": "High-contrast dark cartography tailored for air dispersion & nocturnal thermal inversions",
            "url": "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
            "subdomains": "abcd",
            "maxZoom": 20,
            "attribution": '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        },
        "positron": {
            "id": "positron",
            "name": "CARTO Positron",
            "description": "Clean light cartographic style for daytime solar radiation analysis",
            "url": "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png",
            "subdomains": "abcd",
            "maxZoom": 20,
            "attribution": '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        },
        "voyager": {
            "id": "voyager",
            "name": "CARTO Voyager",
            "description": "Rich topographic cartography with transport corridors & land cover",
            "url": "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            "subdomains": "abcd",
            "maxZoom": 20,
            "attribution": '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        },
        "satellite_hybrid": {
            "id": "satellite_hybrid",
            "name": "CARTO Satellite Hybrid",
            "description": "True-color orbital imagery overlaid with CARTO boundary vectors & place labels",
            "base_url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "labels_url": "https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png",
            "subdomains": "abcd",
            "maxZoom": 19,
            "attribution": 'Imagery &copy; Esri | Vectors & Labels &copy; <a href="https://carto.com/" target="_blank">CARTO</a>'
        }
    }

    # Spatial Presets & Airshed Boundaries
    presets = {
        "regional_basin": {
            "name": "Indo-Gangetic Airshed Basin",
            "center": [29.6, 76.8],
            "zoom": 7,
            "description": "Regional transport corridor from Punjab agricultural belt to Delhi-NCR"
        },
        "delhi_ncr": {
            "name": "Delhi-NCR Core Airshed",
            "center": [28.6139, 77.2090],
            "zoom": 10,
            "description": "High-density urban air monitoring network & local emission zones"
        },
        "stubble_belt": {
            "name": "Punjab & Haryana Stubble Zone",
            "center": [30.45, 75.85],
            "zoom": 8,
            "description": "Primary agricultural fire clusters & plume origin coordinates"
        }
    }

    # Delhi NCR & Airshed Boundary GeoJSON Polygons
    airshed_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "Delhi-NCR Statutory Airshed",
                    "type": "airshed_boundary",
                    "area_km2": 55083,
                    "regulatory_body": "Commission for Air Quality Management (CAQM)"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [76.84, 28.40],
                        [77.35, 28.40],
                        [77.40, 28.88],
                        [77.10, 28.92],
                        [76.84, 28.75],
                        [76.84, 28.40]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "name": "Northwest Stubble Inflow Corridor",
                    "type": "inflow_corridor",
                    "dominant_wind": "North-Westerly (315°)"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [74.60, 31.40],
                        [76.60, 31.20],
                        [77.30, 28.60],
                        [76.80, 28.40],
                        [74.60, 31.40]
                    ]]
                }
            }
        ]
    }

    return {
        "carto_connected": has_key,
        "api_key_status": "AUTHENTICATED" if has_key else "STANDALONE_TILES",
        "carto_api_key_masked": masked_key,
        "engine_version": "CARTO GIS Dynamic Engine v3",
        "default_basemap": "dark_matter",
        "basemaps": basemaps,
        "presets": presets,
        "airshed_geojson": airshed_geojson
    }
