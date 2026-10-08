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


def assign_zone_name(lat: float, lon: float, idx: int = 1) -> str:
    """Map coordinates to the closest named response zone in South Sulawesi."""
    nearest = min(ZONE_CENTROIDS, key=lambda z: haversine_km(lat, lon, z["lat"], z["lon"]))
    return nearest["name"]


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
        zone_name = assign_zone_name(p["lat"], p["lon"], idx=len(zone_dict)+1)
        if zone_name not in zone_dict:
            zone_dict[zone_name] = []
        zone_dict[zone_name].append(p)

    zone_list = []
    for z_name, z_sectors in zone_dict.items():
        z_count = len(z_sectors)
        avg_priority = float(np.mean([s["priority_score"] for s in z_sectors]))
        max_priority = float(np.max([s["priority_score"] for s in z_sectors]))
        peak_prob = float(np.max([s["flood_probability"] for s in z_sectors]))
        avg_exposure = float(np.mean([s["factor_breakdown"]["exposure"]["score"] for s in z_sectors]))
        avg_access = float(np.mean([s["factor_breakdown"]["accessibility"]["score"] for s in z_sectors]))
        avg_crit = float(np.mean([s["factor_breakdown"]["criticality"]["score"] for s in z_sectors]))
        avg_delta = int(round(np.mean([s["rank_delta"] for s in z_sectors])))

        lats = [s["lat"] for s in z_sectors]
        lons = [s["lon"] for s in z_sectors]
        centroid = [float(np.mean(lons)), float(np.mean(lats))]
        bbox = [float(min(lons)), float(min(lats)), float(max(lons)), float(max(lats))]

        # Key Reason Synthesis
        reasons = []
        if avg_crit >= 0.55:
            reasons.append("Hospital & Emergency Lifeline Threatened")
        if avg_access >= 0.50:
            reasons.append(f"{int(avg_access*100)}% Cut-off Access Risk")
        if avg_exposure >= 0.65:
            reasons.append("High Urban/Cropland Asset Density")
        if not reasons:
            reasons.append(f"Peak Inundation {int(peak_prob*100)}% with low elevation")

        reason_str = " • ".join(reasons)

        zone_list.append({
            "zone_id": f"ZONE-{len(zone_list)+1:02d}",
            "name": z_name,
            "sector_count": z_count,
            "priority_score": round(max_priority, 4),
            "priority_percent": round(max_priority * 100, 1),
            "peak_probability_percent": round(peak_prob * 100, 1),
            "rank_delta": avg_delta,
            "rank_delta_label": f"▲ +{avg_delta} vs prob" if avg_delta > 0 else (f"▼ -{abs(avg_delta)} vs prob" if avg_delta < 0 else "= Same"),
            "reason": reason_str,
            "centroid": centroid,
            "bbox": bbox,
            "factor_breakdown": {
                "probability": round(peak_prob * 0.40 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                "exposure": round(avg_exposure * 0.25 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                "accessibility": round(avg_access * 0.20 / max_priority * 100, 1) if max_priority > 0 else 25.0,
                "criticality": round(avg_crit * 0.15 / max_priority * 100, 1) if max_priority > 0 else 25.0,
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
    Clusters flooded sectors into 10–20 named incidents using spatial DBSCAN.
    Each incident includes:
    - Name (e.g. 'Coastal strip near Maros, 41 sectors, peak risk 99%')
    - Onset, Peak time
    - Top drivers
    - Action line
    - Alert state (New, Escalated, Cleared)
    - Trend arrow (▲, ▶, ▼)
    - Countdown timer (e.g. 'Impact in 2h 10m')
    """
    flooded_cells = [c for c in cells if c["flood_probability"] >= 0.45]
    if not flooded_cells:
        return []

    coords = np.array([[c["lat"], c["lon"]] for c in flooded_cells])

    # DBSCAN spatial clustering (eps ~0.08 deg is approx 9 km)
    db = DBSCAN(eps=0.08, min_samples=2).fit(coords)
    labels = db.labels_

    clusters_dict = {}
    for idx, label in enumerate(labels):
        if label not in clusters_dict:
            clusters_dict[label] = []
        clusters_dict[label].append(flooded_cells[idx])

    incidents = []
    incident_counter = 1

    # Deterministic incident templates based on cluster geographic centroid
    for label, c_cells in sorted(clusters_dict.items(), key=lambda item: len(item[1]), reverse=True):
        if len(c_cells) < 1:
            continue

        lats = [c["lat"] for c in c_cells]
        lons = [c["lon"] for c in c_cells]
        mean_lat = float(np.mean(lats))
        mean_lon = float(np.mean(lons))
        peak_prob = float(np.max([c["flood_probability"] for c in c_cells]))
        avg_prob = float(np.mean([c["flood_probability"] for c in c_cells]))
        min_elev = float(np.min([c["elevation"] for c in c_cells]))
        max_rain = float(np.max([c["precip_3d"] for c in c_cells]))
        max_twi = float(np.max([c["TWI"] for c in c_cells]))

        zone_name = assign_zone_name(mean_lat, mean_lon, idx=incident_counter)
        sector_count = len(c_cells)

        # Dynamic State, Trend, and Countdown
        if peak_prob >= 0.88:
            state = "Escalated"
            trend = "▲ Intensifying"
            countdown = "Peak Surge in 2h 15m"
            onset = "+1h 00m (Imminent)"
            peak = "+6h 00m (High Tide 3.6m)"
            action_line = f"Issue Level-3 evacuation order for {sector_count} low-elevation sectors; dispatch amphibious rescue units."
        elif peak_prob >= 0.70:
            state = "New"
            trend = "▲ Escalating"
            countdown = "Impact in 3h 40m"
            onset = "+2h 30m"
            peak = "+7h 00m (Spring Tide)"
            action_line = f"Pre-stage sandbags along drainage canals; activate tidal dewatering pumps before high tide."
        else:
            state = "Cleared" if max_rain < 25 else "New"
            trend = "▼ Receding" if state == "Cleared" else "▶ Stable"
            countdown = "Recession in 4h 20m" if state == "Cleared" else "Monitoring"
            onset = "+4h 00m"
            peak = "+8h 00m"
            action_line = f"Clear drainage culverts; inspect secondary road access routes for receding water."

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
            "incident_id": f"INC-{incident_counter:02d}",
            "name": f"{zone_name}",
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
            "sector_ids": [c["id"] for c in c_cells[:12]],
        })
        incident_counter += 1

    # Sort incidents by peak risk descending
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



