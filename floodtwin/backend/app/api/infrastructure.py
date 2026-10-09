"""
infrastructure.py
-----------------
Serves real OSM road network (via osmnx) for the South Sulawesi pilot area,
tagged with flood-risk scores derived from the nearest flood-prediction grid cells.

Flow:
  1. On first request, download road edges from OSM and cache as GeoJSON.
  2. On every request, reload cached roads + tag each segment with flood_risk [0-1]
     by proximity to the nearest prediction grid cell.
  3. Frontend renders roads as a color-gradient heatmap (green → amber → red).
"""

from fastapi import APIRouter
import os
import json
import math
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger("infrastructure")

try:
    from floodtwin.backend.app.models.priority_engine import CRITICAL_INFRASTRUCTURE
    from floodtwin.backend.app.models.xgb_model import generate_sulawesi_grid
except ImportError:
    from backend.app.models.priority_engine import CRITICAL_INFRASTRUCTURE
    from backend.app.models.xgb_model import generate_sulawesi_grid

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])

# ── Cache path ──────────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # floodtwin/
_CACHE_DIR = _BASE_DIR / "data" / "cache"
_ROADS_CACHE = _CACHE_DIR / "osm_roads.geojson"

# ── OSM bounding box: covers Makassar + the Sulawesi prediction grid ─────────
# (west, south, east, north) – kept tight to avoid huge downloads
OSM_BBOX = (119.10, -5.80, 120.50, -3.90)


# ── Haversine distance (km) ──────────────────────────────────────────────────
def _haversine_km(lon1, lat1, lon2, lat2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Road segment midpoint ────────────────────────────────────────────────────
def _midpoint(coords: List[List[float]]):
    if not coords:
        return None, None
    n = len(coords)
    return (
        sum(c[0] for c in coords) / n,
        sum(c[1] for c in coords) / n,
    )



# Alternative Overpass API endpoints (tried in order)
# Note: osmnx appends /interpreter automatically, so we just provide the base path
OVERPASS_ENDPOINTS = [
    "https://overpass.openstreetmap.fr/api",
    "https://overpass.osm.ch/api",
    "https://maps.mail.ru/osm/tools/overpass/api",
    "https://overpass-api.de/api",
    "https://lz4.overpass-api.de/api",
    "https://z.overpass-api.de/api",
    "https://overpass.kumi.systems/api",
]


# ── Download & cache OSM roads ───────────────────────────────────────────────
def _download_osm_roads() -> Dict[str, Any]:
    """Download drive-network roads from OSM for the metro bbox and cache."""
    import osmnx as ox

    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    # Target entire coastal area using bounding box
    # west, south, east, north -> left, bottom, right, top
    bbox = OSM_BBOX

    # Try each Overpass mirror in turn
    last_err = None
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            ox.settings.overpass_url = endpoint
            ox.settings.timeout = 180
            logger.info(f"Trying Overpass endpoint: {endpoint} for bbox {bbox}")
            G = ox.graph_from_bbox(
                bbox=bbox,
                network_type="drive",
                simplify=True,
                retain_all=False,
                custom_filter='["highway"~"motorway|trunk|primary"]',
            )
            logger.info(f"Downloaded graph: {len(G.nodes)} nodes, {len(G.edges)} edges via {endpoint}")
            break
        except Exception as e:
            logger.warning(f"Endpoint {endpoint} failed: {e}")
            last_err = e
            continue
    else:
        raise RuntimeError(f"All Overpass endpoints failed. Last error: {last_err}")

    # Convert to GeoDataFrame then GeoJSON
    gdf = ox.graph_to_gdfs(G, nodes=False, edges=True)
    gdf = gdf[["geometry", "highway", "name", "length"]].copy()
    gdf = gdf.reset_index(drop=True)

    # Simplify highway tags
    def _road_type(hw):
        if isinstance(hw, list):
            hw = hw[0]
        if hw in ("motorway", "trunk", "primary"):
            return "primary"
        return "secondary"

    gdf["road_type"] = gdf["highway"].apply(_road_type)

    geojson = json.loads(gdf.to_json())
    with open(_ROADS_CACHE, "w") as f:
        json.dump(geojson, f)

    logger.info(f"Cached {len(geojson['features'])} road segments → {_ROADS_CACHE}")
    return geojson


# ── Load cached roads ────────────────────────────────────────────────────────
def _load_roads() -> Dict[str, Any]:
    if _ROADS_CACHE.exists():
        with open(_ROADS_CACHE) as f:
            return json.load(f)
    return _download_osm_roads()


# ── Tag roads with flood risk ────────────────────────────────────────────────
def _tag_roads_with_flood_risk(road_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """
    For each road segment, find the nearest prediction grid cell within 5 km
    and assign its flood_probability as flood_risk [0–1].
    Falls back to 0.05 (very low) if no cell is close enough.
    """
    try:
        grid = generate_sulawesi_grid(n_cells=600)
        cells = grid["cells"]  # list of dicts with lat, lon, flood_probability
    except Exception as e:
        logger.warning(f"Could not load grid for road tagging: {e}")
        cells = []

    tagged_features = []
    for feat in road_geojson.get("features", []):
        geom = feat.get("geometry", {})
        if geom.get("type") != "LineString":
            tagged_features.append(feat)
            continue

        coords = geom.get("coordinates", [])
        mid_lon, mid_lat = _midpoint(coords)
        if mid_lon is None:
            tagged_features.append(feat)
            continue

        # Find nearest cell within 5 km
        best_risk = 0.05
        best_dist = float("inf")
        for cell in cells:
            d = _haversine_km(mid_lon, mid_lat, cell["lon"], cell["lat"])
            if d < best_dist:
                best_dist = d
                best_risk = cell.get("flood_probability", 0.05)

        if best_dist > 5.0:
            best_risk = 0.05  # too far from any grid cell → low risk

        props = feat.get("properties", {}) or {}
        props["flood_risk"] = round(float(best_risk), 4)
        tagged_features.append({**feat, "properties": props})

    return {**road_geojson, "features": tagged_features}


# ── Facilities GeoJSON ───────────────────────────────────────────────────────
def _facilities_geojson() -> Dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": node,
                "geometry": {"type": "Point", "coordinates": [node["lon"], node["lat"]]},
            }
            for node in CRITICAL_INFRASTRUCTURE
        ],
    }


# ── Endpoint ─────────────────────────────────────────────────────────────────
@router.get("/data")
def get_infrastructure():
    roads_raw = _load_roads()
    roads_tagged = _tag_roads_with_flood_risk(roads_raw)
    return {
        "facilities": _facilities_geojson(),
        "roads": roads_tagged,
    }


@router.post("/refresh-roads")
def refresh_roads():
    """Force re-download of OSM roads (clears cache)."""
    if _ROADS_CACHE.exists():
        _ROADS_CACHE.unlink()
    roads_raw = _download_osm_roads()
    return {"message": f"Downloaded {len(roads_raw['features'])} road segments"}
