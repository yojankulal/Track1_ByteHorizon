import math
from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.cluster import DBSCAN


# ---------------------------------------------------------
# Critical Infrastructure Nodes (South Sulawesi Pilot Area)
# ---------------------------------------------------------
CRITICAL_INFRASTRUCTURE = [
    {
        "id": "HOSP-01",
        "name": "RSUP Dr. Wahidin Sudirohusodo Makassar",
        "type": "Level-1 Tertiary Referral Hospital",
        "lat": -5.134,
        "lon": 119.493,
        "capacity": "850 beds / Regional ICU",
        "boost_weight": 1.0,
    },
    {
        "id": "HOSP-02",
        "name": "RSUD Salewangang Maros",
        "type": "General District Hospital",
        "lat": -5.002,
        "lon": 119.574,
        "capacity": "240 beds / Trauma Center",
        "boost_weight": 0.95,
    },
    {
        "id": "HOSP-03",
        "name": "RSUD Batara Siang Pangkep",
        "type": "Lowland Coastal Hospital",
        "lat": -4.786,
        "lon": 119.552,
        "capacity": "180 beds / Emergency Ward",
        "boost_weight": 0.90,
    },
    {
        "id": "HOSP-04",
        "name": "RSUD Syekh Yusuf Gowa",
        "type": "District Hospital",
        "lat": -5.204,
        "lon": 119.458,
        "capacity": "210 beds",
        "boost_weight": 0.85,
    },
    {
        "id": "HOSP-05",
        "name": "RSUD Lanto Daeng Pasewang Jeneponto",
        "type": "Coastal Regional Clinic",
        "lat": -5.670,
        "lon": 119.742,
        "capacity": "150 beds",
        "boost_weight": 0.80,
    },
    {
        "id": "SHELTER-01",
        "name": "Sultan Hasanuddin Disaster Logistics Hub",
        "type": "Primary Air Logistics & Evac Hub",
        "lat": -5.061,
        "lon": 119.553,
        "capacity": "5,000 displaced capacity",
        "boost_weight": 0.90,
    },
    {
        "id": "SHELTER-02",
        "name": "Makassar Port Maritime Evacuation Terminal",
        "type": "Coastal Ferry & Sea Rescue Base",
        "lat": -5.118,
        "lon": 119.408,
        "capacity": "3,500 capacity",
        "boost_weight": 0.85,
    },
    {
        "id": "INFRA-01",
        "name": "Maros Trans-Sulawesi Trunk Sluice Barrage",
        "type": "Critical Sluice Gate & Substation",
        "lat": -4.950,
        "lon": 119.510,
        "capacity": "11kV/33kV Feeder Grid",
        "boost_weight": 0.85,
    },
    {
        "id": "INFRA-02",
        "name": "Tallo Estuary Tidal Defense Station",
        "type": "Hydraulic Pump Station",
        "lat": -5.105,
        "lon": 119.445,
        "capacity": "500 m3/h pumping capacity",
        "boost_weight": 0.80,
    },
    {
        "id": "INFRA-03",
        "name": "Pangkep Lowland Coastal Barrage",
        "type": "Agricultural Flood Control Barrage",
        "lat": -4.815,
        "lon": 119.520,
        "capacity": "Drainage gate",
        "boost_weight": 0.75,
    },
]

# Geographic Zone Reference Centroids for South Sulawesi
ZONE_CENTROIDS = [
    {"name": "Maros Coastal Defense Zone", "lat": -5.00, "lon": 119.55},
    {"name": "Makassar North Medical Corridor", "lat": -5.13, "lon": 119.45},
    {"name": "Pangkep Lowland Agricultural Corridor", "lat": -4.80, "lon": 119.55},
    {"name": "Tallo River Estuary Basin", "lat": -5.11, "lon": 119.44},
    {"name": "Tanete Rilau Coastal Lowlands", "lat": -4.58, "lon": 119.60},
    {"name": "Gowa Lowland Catchment Zone", "lat": -5.25, "lon": 119.50},
    {"name": "Barru Coastal Strip Corridor", "lat": -4.30, "lon": 119.65},
    {"name": "Jeneponto Delta Basin", "lat": -5.65, "lon": 119.72},
    {"name": "Takalar Coastal Fishery Belt", "lat": -5.40, "lon": 119.45},
    {"name": "Bone Lowland River Basin", "lat": -4.65, "lon": 120.10},
    {"name": "Sidrap Lake Tempe Basin", "lat": -3.95, "lon": 119.95},
    {"name": "Pinrang Agricultural Plain", "lat": -3.80, "lon": 119.65},
    {"name": "Parepare Maritime River Corridor", "lat": -4.00, "lon": 119.62},
    {"name": "Wajo Floodplain Delta", "lat": -4.12, "lon": 120.03},
    {"name": "Soppeng Valley Basin", "lat": -4.35, "lon": 119.88},
]


def assign_zone_info(lat: float, lon: float, idx: int = 1) -> Dict[str, str]:
    """Map coordinates to the closest named response zone and return zone metadata."""
    nearest_idx, nearest = min(enumerate(ZONE_CENTROIDS, start=1), key=lambda z: haversine_km(lat, lon, z[1]["lat"], z[1]["lon"]))
    return {
        "zone_id": f"ZONE-{nearest_idx:02d}",
        "name": nearest["name"],
    }


def assign_zone_name(lat: float, lon: float, idx: int = 1) -> str:
    """Map coordinates to the closest named response zone in South Sulawesi."""
    return assign_zone_info(lat, lon, idx)["name"]


def get_response_zones(cells: List[Dict[str, Any]], top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Groups priority sectors by Response Zones.
    Provides aggregated metrics, 4-factor breakdown bars, rank changes, and specific action reasons.
    """
    multi_priorities = calculate_multi_factor_priorities(cells, top_n=len(cells))
    if not multi_priorities:
        return []

    # Cluster sectors into zones based on proximity
    zone_dict = {}
    for p in multi_priorities:
        zone_name = p.get("residing_zone_name", assign_zone_name(p["lat"], p["lon"]))
        if zone_name not in zone_dict:
            zone_dict[zone_name] = []
        zone_dict[zone_name].append(p)

    zone_list = []
    for z_name, z_sectors in zone_dict.items():
        z_count = len(z_sectors)
        z_id = z_sectors[0].get("residing_zone_id", "ZONE-01")
        avg_priority = float(np.mean([s["priority_score"] for s in z_sectors]))
        max_priority = float(np.max([s["priority_score"] for s in z_sectors]))
        peak_prob = float(np.max([s["flood_probability"] for s in z_sectors]))
        
        # Safely extract scores handling dict structure
        avg_exposure = float(np.mean([s["factor_breakdown"]["exposure"]["score"] if isinstance(s["factor_breakdown"]["exposure"], dict) else s["factor_breakdown"]["exposure"] for s in z_sectors]))
        avg_access = float(np.mean([s["factor_breakdown"]["accessibility"]["score"] if isinstance(s["factor_breakdown"]["accessibility"], dict) else s["factor_breakdown"]["accessibility"] for s in z_sectors]))
        avg_crit = float(np.mean([s["factor_breakdown"]["criticality"]["score"] if isinstance(s["factor_breakdown"]["criticality"], dict) else s["factor_breakdown"]["criticality"] for s in z_sectors]))
        avg_delta = int(round(np.mean([s["rank_delta"] for s in z_sectors])))
        nearest_hub = z_sectors[0].get("nearest_critical_hub", {}).get("name", "Regional Medical Center")

        lats = [s["lat"] for s in z_sectors]
        lons = [s["lon"] for s in z_sectors]
        centroid = [float(np.mean(lons)), float(np.mean(lats))]
        bbox = [float(min(lons)), float(min(lats)), float(max(lons)), float(max(lats))]

        # Key Reason Synthesis
        reasons = []
        if avg_crit >= 0.55:
            reasons.append(f"Critical Medical/Logistics Lifeline Threat ({nearest_hub})")
        if avg_access >= 0.50:
            reasons.append(f"Severe Isolation ({int(avg_access*100)}% Road Cut-Off Risk within 2km)")
        if avg_exposure >= 0.65:
            reasons.append("High Urban & Agricultural Asset Density at Risk")
        if not reasons:
            reasons.append(f"Peak Inundation {int(peak_prob*100)}% in Low-Lying Coastal Valley")

        reason_str = " • ".join(reasons)
        if avg_delta != 0:
            reason_str += f" (Shifted {avg_delta:+} spots vs raw hazard rank)"

        zone_list.append({
            "zone_id": z_id,
            "name": z_name,
            "sector_count": z_count,
            "priority_score": round(max_priority, 4),
            "priority_percent": round(max_priority * 100, 1),
            "peak_probability_percent": round(peak_prob * 100, 1),
            "rank_delta": avg_delta,
            "rank_delta_label": f"▲ +{avg_delta} vs raw risk" if avg_delta > 0 else (f"▼ -{abs(avg_delta)} vs raw risk" if avg_delta < 0 else "= Same as raw risk"),
            "reason": reason_str,
            "centroid": centroid,
            "bbox": bbox,
            "factor_breakdown": {
                "probability": {
                    "score": round(peak_prob, 3),
                    "weight": 0.40,
                    "pct_of_total": round(peak_prob * 0.40 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                    "name": "Inundation Risk",
                    "label": "XGBoost Hazard Probability",
                    "description": "Predicted surface water hazard from terrain topography & rainfall forcing",
                },
                "exposure": {
                    "score": round(avg_exposure, 3),
                    "weight": 0.25,
                    "pct_of_total": round(avg_exposure * 0.25 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                    "name": "Asset Exposure",
                    "label": "Population & Crop Land Density",
                    "description": "Vulnerability of built-up urban structures, residential settlements, and cropland",
                },
                "accessibility": {
                    "score": round(avg_access, 3),
                    "weight": 0.20,
                    "pct_of_total": round(avg_access * 0.20 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                    "name": "Road Isolation",
                    "label": "Emergency Access Cut-Off",
                    "description": "Percentage of surrounding sectors within 2km flooded, severing road access",
                },
                "criticality": {
                    "score": round(avg_crit, 3),
                    "weight": 0.15,
                    "pct_of_total": round(avg_crit * 0.15 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                    "name": "Lifeline Threat",
                    "label": "Hospital & Evacuation Base Proximity",
                    "description": "Proximity threat to critical referral hospitals, trauma centers, and disaster hubs",
                },
            },
            "top_sectors": [s["id"] for s in z_sectors[:6]],
        })

    # Sort zones by max priority score
    zone_list.sort(key=lambda z: z["priority_score"], reverse=True)
    for idx, z in enumerate(zone_list[:top_n], start=1):
        z["rank"] = idx

    return zone_list[:top_n]


def get_clustered_incidents(cells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Returns alert incidents grouped by all defense response zones across Sulawesi.
    Displays every zone with aggregated sector count, peak risk, onset, peak,
    and action recommendations.
    """
    if not cells:
        return []

    # Group all sectors by their assigned defense response zone
    zones_dict: Dict[str, List[Dict[str, Any]]] = {}
    for c in cells:
        z_name = c.get("residing_zone_name") or assign_zone_name(c["lat"], c["lon"])
        if z_name not in zones_dict:
            zones_dict[z_name] = []
        zones_dict[z_name].append(c)

    incidents = []
    for incident_counter, (zone_name, z_cells) in enumerate(zones_dict.items(), start=1):
        z_id = z_cells[0].get("residing_zone_id") or f"ZONE-{incident_counter:02d}"
        lats = [c["lat"] for c in z_cells]
        lons = [c["lon"] for c in z_cells]
        mean_lat = float(np.mean(lats))
        mean_lon = float(np.mean(lons))
        peak_prob = float(np.max([c["flood_probability"] for c in z_cells]))
        avg_prob = float(np.mean([c["flood_probability"] for c in z_cells]))
        min_elev = float(np.min([c["elevation"] for c in z_cells]))
        max_rain = float(np.max([c["precip_3d"] for c in z_cells]))
        max_twi = float(np.max([c["TWI"] for c in z_cells]))
        sector_count = len(z_cells)

        # Dynamic State, Trend, and Countdown
        if peak_prob >= 0.88:
            state = "Escalated"
            trend = "▲ Intensifying"
            countdown = "Peak Surge in 2h 15m"
            onset = "+1h 00m (Imminent)"
            peak = "+6h 00m (High Tide 3.6m)"
            action_line = f"Issue Level-3 evacuation order for {sector_count} sectors in {zone_name}; dispatch amphibious rescue units."
        elif peak_prob >= 0.70:
            state = "New"
            trend = "▲ Escalating"
            countdown = "Impact in 3h 40m"
            onset = "+2h 30m"
            peak = "+7h 00m (Spring Tide)"
            action_line = f"Pre-stage sandbags along drainage canals; activate tidal dewatering pumps in {zone_name}."
        elif peak_prob >= 0.35:
            state = "New"
            trend = "▶ Monitoring"
            countdown = "Monitoring Tide"
            onset = "+4h 00m"
            peak = "+8h 00m"
            action_line = f"Inspect secondary road access routes and culverts across {zone_name}; monitor runoff."
        else:
            state = "Cleared"
            trend = "▼ Nominal"
            countdown = "Nominal Baseline"
            onset = "No Flood Onset"
            peak = "Baseline Risk"
            action_line = f"Zone operating within safe capacity. Standard maintenance and monitoring."

        # Top Drivers
        drivers = []
        if min_elev <= 10:
            drivers.append(f"Low-lying coastal delta (Elevation {min_elev:.0f}m)")
        if max_rain >= 45:
            drivers.append(f"Extreme 3-day rainfall ({max_rain:.1f}mm)")
        if max_twi >= 10:
            drivers.append(f"High topographic wetness index (TWI {max_twi:.1f})")
        if not drivers:
            drivers.append(f"Hydro-topographic catchment runoff (Peak {int(peak_prob*100)}%)")

        incidents.append({
            "incident_id": z_id,
            "name": zone_name,
            "headline": f"{zone_name}, {sector_count} sectors, peak risk {int(peak_prob*100)}%",
            "sector_count": sector_count,
            "peak_probability": round(peak_prob, 4),
            "peak_probability_percent": round(peak_prob * 100, 1),
            "avg_probability_percent": round(avg_prob * 100, 1),
            "onset": onset,
            "peak": peak,
            "top_drivers": drivers,
            "action_line": action_line,
            "state": state,
            "trend": trend,
            "countdown": countdown,
            "centroid": [round(mean_lon, 4), round(mean_lat, 4)],
            "bbox": [round(min(lons), 4), round(min(lats), 4), round(max(lons), 4), round(max(lats), 4)],
            "sector_ids": [c["id"] for c in z_cells[:12]],
        })

    # Sort incidents by peak risk descending so highest-risk zones appear first
    incidents.sort(key=lambda x: x["peak_probability"], reverse=True)
    return incidents



def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def get_exposure_score(landcover_code: float) -> float:
    """
    Exposure proxy from Land Cover classification:
    Built-up / Urban settlements: 1.0
    Intensive Cropland / Agriculture: 0.75
    Mixed vegetation / Agroforestry: 0.45
    Shrubland / Grassland: 0.25
    Forest / Water / Barren: 0.10
    """
    lc = int(round(landcover_code))
    if lc in [9, 13]:  # Urban / Built-up
        return 1.0
    elif lc in [4, 5, 12]:  # Cropland / Agriculture / Paddy
        return 0.75
    elif lc in [3, 8]:  # Mixed vegetation / Agroforestry
        return 0.45
    elif lc in [6, 7]:  # Grassland / Shrubland
        return 0.25
    else:
        return 0.15


def get_criticality_info(lat: float, lon: float) -> Dict[str, Any]:
    """Find nearest critical infrastructure node and compute distance & criticality boost."""
    nearest = None
    min_dist = float("inf")

    for node in CRITICAL_INFRASTRUCTURE:
        dist = haversine_km(lat, lon, node["lat"], node["lon"])
        if dist < min_dist:
            min_dist = dist
            nearest = node

    # Compute criticality score in [0.1, 1.0]
    if min_dist <= 3.0:
        score = 1.0 * (nearest["boost_weight"] if nearest else 1.0)
    elif min_dist <= 8.0:
        decay = (8.0 - min_dist) / 5.0
        score = (0.25 + 0.75 * decay) * (nearest["boost_weight"] if nearest else 1.0)
    else:
        score = 0.12

    return {
        "criticality_score": round(float(np.clip(score, 0.05, 1.0)), 3),
        "nearest_node_name": nearest["name"] if nearest else "General Public Corridor",
        "nearest_node_type": nearest["type"] if nearest else "Infrastructure",
        "nearest_distance_km": round(min_dist, 2),
    }


def compute_accessibility_scores(cells: List[Dict[str, Any]], radius_km: float = 2.0) -> List[float]:
    """
    Accessibility / Isolation risk:
    The share of neighbouring sectors within ~2 km that are also flooded (prob >= 0.50).
    A sector surrounded by inundated terrain has high isolation risk (A ~ 1.0).
    """
    coords = np.array([[c["lat"], c["lon"]] for c in cells])
    n = len(cells)
    probs = np.array([c["flood_probability"] for c in cells])
    is_flooded = (probs >= 0.50).astype(float)

    accessibility_scores = []
    for i in range(n):
        lat_i, lon_i = coords[i]
        # Fast bounding box filter (~0.03 deg is ~3.3km)
        box_mask = (
            (np.abs(coords[:, 0] - lat_i) <= 0.03) &
            (np.abs(coords[:, 1] - lon_i) <= 0.03)
        )
        neighbor_indices = np.where(box_mask)[0]

        if len(neighbor_indices) <= 1:
            accessibility_scores.append(float(is_flooded[i]))
            continue

        # Compute actual haversine for filtered neighbours
        dists = np.array([haversine_km(lat_i, lon_i, coords[j, 0], coords[j, 1]) for j in neighbor_indices])
        within_radius = neighbor_indices[dists <= radius_km]

        if len(within_radius) <= 1:
            accessibility_scores.append(float(is_flooded[i]))
        else:
            # Fraction of neighbours flooded
            flooded_ratio = float(np.mean(is_flooded[within_radius]))
            accessibility_scores.append(round(flooded_ratio, 3))

    return accessibility_scores


def calculate_multi_factor_priorities(cells: List[Dict[str, Any]], top_n: int = 20) -> List[Dict[str, Any]]:
    """
    Multi-Factor Priority Calculation:
    Priority Score = 0.40 * Probability + 0.25 * Exposure + 0.20 * Accessibility + 0.15 * Criticality

    Also calculates:
    - Probability Rank vs Multi-Factor Priority Rank
    - Rank Delta (e.g. +14 for hospital proximity boosting a sector)
    - 4-segment factor breakdown bar components
    """
    n = len(cells)
    if n == 0:
        return []

    accessibility_scores = compute_accessibility_scores(cells, radius_km=2.0)

    # 1. Compute raw probability ranks
    prob_sorted_indices = np.argsort([-c["flood_probability"] for c in cells])
    prob_ranks = {cells[idx]["id"]: rank + 1 for rank, idx in enumerate(prob_sorted_indices)}

    enriched_cells = []
    for i, c in enumerate(cells):
        p = float(c["flood_probability"])
        e = get_exposure_score(c.get("landcover", 1.0))
        a = accessibility_scores[i]
        crit_info = get_criticality_info(c["lat"], c["lon"])
        crit = crit_info["criticality_score"]

        # Composite Multi-Criteria Decision Score
        priority_score = round(0.40 * p + 0.25 * e + 0.20 * a + 0.15 * crit, 4)
        priority_percent = round(priority_score * 100, 1)

        enriched_cells.append({
            "id": c["id"],
            "lon": c["lon"],
            "lat": c["lat"],
            "location_name": c.get("location_name", f"Sector {c['id']}"),
            "elevation": c.get("elevation", 10.0),
            "precip_3d": c.get("precip_3d", 30.0),
            "landcover": c.get("landcover", 1.0),
            "twi": c.get("TWI", 3.0),
            "flood_probability": p,
            "flood_probability_percent": round(p * 100, 1),
            "risk_level": c.get("risk_level", "Moderate"),
            "exposure_score": round(e, 3),
            "accessibility_score": round(a, 3),
            "criticality_score": round(crit, 3),
            "priority_score": priority_score,
            "priority_percent": priority_percent,
            "nearest_node_name": crit_info["nearest_node_name"],
            "nearest_node_type": crit_info["nearest_node_type"],
            "nearest_distance_km": crit_info["nearest_distance_km"],
            "prob_rank": prob_ranks[c["id"]],
        })

    # 2. Sort by Composite Priority Score descending
    enriched_cells.sort(key=lambda x: x["priority_score"], reverse=True)

    # 3. Assign priority ranks and compute rank delta
    priorities = []
    for rank, item in enumerate(enriched_cells[:top_n], start=1):
        rank_delta = item["prob_rank"] - rank  # Positive means boosted!

        # Factor contributions for 4-segment breakdown bar
        total_weights = 0.40 + 0.25 + 0.20 + 0.15
        p_pct = round((item["flood_probability"] * 0.40 / item["priority_score"]) * 100, 1) if item["priority_score"] > 0 else 25.0
        e_pct = round((item["exposure_score"] * 0.25 / item["priority_score"]) * 100, 1) if item["priority_score"] > 0 else 25.0
        a_pct = round((item["accessibility_score"] * 0.20 / item["priority_score"]) * 100, 1) if item["priority_score"] > 0 else 25.0
        c_pct = round((item["criticality_score"] * 0.15 / item["priority_score"]) * 100, 1) if item["priority_score"] > 0 else 25.0

        # Defensible Reason Formulation
        reasons = []
        if item["criticality_score"] >= 0.70:
            reasons.append(f"Criticality Boost ({item['nearest_node_name']})")
        if item["accessibility_score"] >= 0.65:
            reasons.append(f"Severe Isolation ({int(item['accessibility_score']*100)}% neighbours inundated)")
        if item["exposure_score"] >= 0.75:
            reasons.append("High Asset/Population Exposure (Urban/Cropland)")
        if item["elevation"] <= 12:
            reasons.append(f"Low elevation ({item['elevation']:.0f}m)")

        reason_str = " • ".join(reasons) if reasons else f"Multi-factor priority score: {item['priority_percent']}%"

        priorities.append({
            "rank": rank,
            "id": item["id"],
            "lon": item["lon"],
            "lat": item["lat"],
            "location_name": item["location_name"],
            "flood_probability": item["flood_probability"],
            "flood_probability_percent": item["flood_probability_percent"],
            "risk_level": item["risk_level"],
            "elevation": item["elevation"],
            "precip_3d": item["precip_3d"],
            "landcover": item["landcover"],
            "twi": item["twi"],
            "priority_score": item["priority_score"],
            "priority_percent": item["priority_percent"],
            "rank_delta": rank_delta,
            "rank_delta_label": f"▲ +{rank_delta} vs raw prob" if rank_delta > 0 else (f"▼ -{abs(rank_delta)} vs raw prob" if rank_delta < 0 else "= Same as prob rank"),
            "factor_breakdown": {
                "probability": {"score": item["flood_probability"], "weight": 0.40, "pct_of_total": p_pct, "label": "Model Probability"},
                "exposure": {"score": item["exposure_score"], "weight": 0.25, "pct_of_total": e_pct, "label": "Exposure (Built-up/Cropland Proxy)"},
                "accessibility": {"score": item["accessibility_score"], "weight": 0.20, "pct_of_total": a_pct, "label": "Isolation / Access Risk"},
                "criticality": {"score": item["criticality_score"], "weight": 0.15, "pct_of_total": c_pct, "label": "Critical Hub Proximity"},
            },
            "nearest_critical_hub": {
                "name": item["nearest_node_name"],
                "type": item["nearest_node_type"],
                "distance_km": item["nearest_distance_km"],
            },
            "reason": reason_str,
        })

    return priorities



