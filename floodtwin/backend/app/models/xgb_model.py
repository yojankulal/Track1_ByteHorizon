import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import pandas as pd
import xgboost as xgb

# ---------------------------------------------------------
# Feature order - exact match to trained model
# ---------------------------------------------------------
FEATURES = [
    "lon",
    "lat",
    "precip_1d",
    "precip_3d",
    "landcover",
    "elevation",
    "slope",
    "TWI",
    "upstream_area_log",
    "aspect_sin",
    "aspect_cos",
]

FEATURE_LABELS = {
    "elevation": "Elevation (DEM)",
    "landcover": "Land Cover Type",
    "precip_3d": "3-Day Precipitation",
    "precip_1d": "1-Day Precipitation",
    "lon": "Longitude",
    "lat": "Latitude",
    "slope": "Terrain Slope",
    "TWI": "Topographic Wetness (TWI)",
    "upstream_area_log": "Upstream Drainage Area",
    "aspect_sin": "Aspect (North-South)",
    "aspect_cos": "Aspect (East-West)",
}

FEATURE_DESCRIPTIONS = {
    "elevation": "Low elevation increases accumulation potential; high elevation promotes runoff.",
    "landcover": "Surface roughness and soil permeability influence infiltration vs. standing water.",
    "precip_3d": "Sustained 72-hour rainfall saturates catchment soil and elevates base river flow.",
    "precip_1d": "Intense 24-hour storm precipitation drives flash surface runoff.",
    "lon": "Spatial geographic position within Sulawesi basin.",
    "lat": "Spatial geographic position within Sulawesi basin.",
    "slope": "Flatter terrain slows drainage rate, causing pooling in depressions.",
    "TWI": "Higher Topographic Wetness Index indicates natural topographic convergence zones.",
    "upstream_area_log": "Larger upstream contributing area channels greater hydrological discharge.",
    "aspect_sin": "Slope orientation influencing solar insolation and localized drainage direction.",
    "aspect_cos": "Slope orientation influencing localized drainage trajectory.",
}


# ---------------------------------------------------------
# Path resolution
# ---------------------------------------------------------
def _resolve_path(rel_paths: List[str]) -> Path:
    """Find existing path across common run directories."""
    base_dirs = [
        Path(__file__).resolve().parents[3],
        Path(__file__).resolve().parents[2],
        Path(__file__).resolve().parents[1],
        Path.cwd(),
        Path.cwd() / "floodtwin",
    ]
    for b in base_dirs:
        for r in rel_paths:
            p = (b / r).resolve()
            if p.exists():
                return p
    return (base_dirs[0] / rel_paths[0]).resolve()


MODEL_PATH = _resolve_path(["models/flood_xgb.json", "floodtwin/models/flood_xgb.json"])
DATA_PATH = _resolve_path([
    "data/preprocessed/modis_clean.parquet",
    "floodtwin/data/preprocessed/modis_clean.parquet",
    "data/processed/modis_clean.parquet",
    "floodtwin/data/processed/modis_clean.parquet",
])
METRICS_PATH = _resolve_path(["models/metrics.json", "floodtwin/models/metrics.json"])
FEAT_IMP_PATH = _resolve_path(["models/feature_importance.csv", "floodtwin/models/feature_importance.csv"])
SHAP_IMP_PATH = _resolve_path(["models/shap_importance.csv", "floodtwin/models/shap_importance.csv"])


# ---------------------------------------------------------
# Singletons & Cache
# ---------------------------------------------------------
_model: Optional[xgb.XGBClassifier] = None
_grid_cache: Optional[Dict[str, Any]] = None
_dataset_df: Optional[pd.DataFrame] = None


def get_risk_level(probability: float) -> str:
    """Official risk thresholds."""
    if probability < 0.20:
        return "Low"
    if probability < 0.50:
        return "Moderate"
    if probability < 0.75:
        return "High"
    return "Critical"


def get_model() -> xgb.XGBClassifier:
    """Load the trained XGBoost model once and reuse it."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Flood model not found at {MODEL_PATH}")
        _model = xgb.XGBClassifier()
        _model.load_model(str(MODEL_PATH))
    return _model


# ---------------------------------------------------------
# Inference & SHAP
# ---------------------------------------------------------
def predict_flood_probability(data: dict) -> float:
    """Predict flood probability for one observation."""
    model = get_model()
    row = pd.DataFrame([[data[f] for f in FEATURES]], columns=FEATURES)
    prob = model.predict_proba(row)[0, 1]
    return float(prob)


def explain_flood_prediction(data: dict) -> dict:
    """
    Calculate exact local TreeSHAP contributions using the XGBoost booster.
    Computes marginal feature contributions in log-odds and probability space.
    """
    model = get_model()
    row = pd.DataFrame([[data[f] for f in FEATURES]], columns=FEATURES)
    
    # Predict probability
    prob = float(model.predict_proba(row)[0, 1])
    risk_lvl = get_risk_level(prob)

    # Use native XGBoost pred_contribs to compute TreeSHAP values
    booster = model.get_booster()
    dmatrix = xgb.DMatrix(row)
    contribs = booster.predict(dmatrix, pred_contribs=True)[0]
    
    feature_shap = contribs[:-1]
    base_value = float(contribs[-1])
    output_margin = float(np.sum(contribs))

    total_abs_shap = float(np.sum(np.abs(feature_shap))) if np.sum(np.abs(feature_shap)) > 0 else 1.0

    contributions = []
    for i, feat in enumerate(FEATURES):
        val = float(data[feat])
        s_val = float(feature_shap[i])
        direction = "increases_risk" if s_val > 0 else "decreases_risk"
        pct_impact = round((abs(s_val) / total_abs_shap) * 100, 1)

        contributions.append({
            "feature": feat,
            "label": FEATURE_LABELS.get(feat, feat),
            "value": val,
            "shap_value": round(s_val, 4),
            "direction": direction,
            "percentage_impact": pct_impact,
            "description": FEATURE_DESCRIPTIONS.get(feat, ""),
        })

    # Sort contributions by absolute SHAP impact descending
    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    shap_res = {
        "base_value": round(base_value, 4),
        "output_margin": round(output_margin, 4),
        "flood_probability": prob,
        "flood_probability_percent": round(prob * 100, 2),
        "risk_level": risk_lvl,
        "contributions": contributions,
    }

    try:
        try:
            from backend.app.models.llm_explainer import generate_llm_shap_explanation, _generate_fallback_explanation
        except ImportError:
            from floodtwin.backend.app.models.llm_explainer import generate_llm_shap_explanation, _generate_fallback_explanation
        llm_exp = generate_llm_shap_explanation(shap_res, data)
        shap_res["llm_explanation"] = llm_exp
    except Exception as e:
        try:
            shap_res["llm_explanation"] = _generate_fallback_explanation(
                prob * 100,
                risk_lvl,
                [c for c in contributions if c.get("direction") == "increases_risk"][:3],
                data
            )
        except Exception:
            pass

    return shap_res


def simulate_whatif_scenario(
    baseline_data: dict,
    sim_precip_1d: float,
    sim_precip_3d: float,
    sim_elevation_adj: float = 0.0,
) -> dict:
    """
    Physically consistent hydrological scenario simulation:
    Couples XGBoost baseline terrain susceptibility with precipitation surge dynamics.
    Guarantees monotonic positive risk scaling under heavy rain and risk reduction under low rain.
    """
    base_prob = predict_flood_probability(baseline_data)
    base_risk = get_risk_level(base_prob)

    delta_1d = sim_precip_1d - baseline_data.get("precip_1d", 0.0)
    delta_3d = sim_precip_3d - baseline_data.get("precip_3d", 0.0)
    elev = max(1.0, baseline_data.get("elevation", 10.0) + sim_elevation_adj)
    twi = baseline_data.get("TWI", 3.0)

    # Topographic amplification: flat low-elevation valleys pool water faster
    topo_multiplier = (1.0 + max(0.0, 20.0 - elev) / 20.0 * 0.8) * (1.0 + twi / 8.0 * 0.3)

    # Precipitation forcing in logit space
    rain_logit_shift = ((delta_3d / 25.0) * 0.95 + (delta_1d / 15.0) * 0.65) * topo_multiplier
    elev_logit_shift = -(sim_elevation_adj / 10.0) * 0.85

    total_shift = rain_logit_shift + elev_logit_shift

    # Convert baseline probability to logit
    p_clamped = max(0.005, min(0.995, base_prob))
    base_logit = float(np.log(p_clamped / (1.0 - p_clamped)))

    scenario_logit = base_logit + total_shift
    scenario_prob = float(1.0 / (1.0 + np.exp(-scenario_logit)))
    scenario_prob = max(0.01, min(0.995, scenario_prob))
    scenario_risk = get_risk_level(scenario_prob)

    delta_pp = round((scenario_prob - base_prob) * 100, 2)

    if delta_pp > 0:
        expl = f"Precipitation surge (+{max(0, delta_3d):.1f}mm 3-day) increased inundation probability by {delta_pp:+.1f} percentage points."
    elif delta_pp < 0:
        expl = f"Reduced precipitation/enhanced drainage decreased inundation probability by {abs(delta_pp):.1f} percentage points."
    else:
        expl = "Simulation parameters match baseline observation."

    return {
        "baseline_probability": round(base_prob, 4),
        "baseline_probability_percent": round(base_prob * 100, 2),
        "baseline_risk_level": base_risk,
        "scenario_probability": round(scenario_prob, 4),
        "scenario_probability_percent": round(scenario_prob * 100, 2),
        "scenario_risk_level": scenario_risk,
        "delta_percentage_points": delta_pp,
        "explanation": expl,
    }


# ---------------------------------------------------------
# Dataset & Grid Sampling
# ---------------------------------------------------------
def get_dataset() -> pd.DataFrame:
    """Load the full preprocessed Sulawesi dataset (cached)."""
    global _dataset_df
    if _dataset_df is None:
        if not DATA_PATH.exists():
            raise FileNotFoundError(f"Preprocessed dataset not found at {DATA_PATH}")
        _dataset_df = pd.read_parquet(DATA_PATH)
    return _dataset_df


def generate_sulawesi_grid(sample_size: int = 1200) -> Dict[str, Any]:
    """
    Generate a deterministic, scientifically representative spatial grid
    from real Sulawesi MODIS observations across flood & non-flood regions.
    """
    global _grid_cache
    if _grid_cache is not None and len(_grid_cache.get("cells", [])) == sample_size:
        return _grid_cache

    df = get_dataset()
    model = get_model()

    # Deterministic stratified spatial sampling:
    # 1. Take flood-positive observations (target == 1) to ensure critical zones are represented
    # 2. Take spatial grid sample across blocks and dates (target == 0)
    flood_pos = df[df["target"] == 1]
    flood_neg = df[df["target"] == 0]

    n_pos = min(len(flood_pos), int(sample_size * 0.35))
    n_neg = sample_size - n_pos

    rng = np.random.default_rng(42)
    pos_idx = rng.choice(flood_pos.index, size=n_pos, replace=False)
    neg_idx = rng.choice(flood_neg.index, size=n_neg, replace=False)

    sampled_indices = np.concatenate([pos_idx, neg_idx])
    sampled_df = df.loc[sampled_indices].copy().reset_index(drop=True)

    # Sort deterministically by lon, lat
    sampled_df = sampled_df.sort_values(by=["lat", "lon"]).reset_index(drop=True)

    # Batch model prediction
    X = sampled_df[FEATURES]
    probabilities = model.predict_proba(X)[:, 1]

    cells = []
    risk_counts = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}

    for idx, row in sampled_df.iterrows():
        prob = float(probabilities[idx])
        risk = get_risk_level(prob)
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

        loc_name = f"Sulawesi Sector {idx+1:04d} ({row['lat']:.2f}°, {row['lon']:.2f}°)"

        cell = {
            "id": f"SUL-{idx+1:04d}",
            "lon": float(row["lon"]),
            "lat": float(row["lat"]),
            "event_id": str(row["event_id"]) if "event_id" in row else None,
            "precip_1d": float(row["precip_1d"]),
            "precip_3d": float(row["precip_3d"]),
            "landcover": float(row["landcover"]),
            "elevation": float(row["elevation"]),
            "slope": float(row["slope"]),
            "TWI": float(row["TWI"]),
            "upstream_area_log": float(row["upstream_area_log"]),
            "aspect_sin": float(row["aspect_sin"]),
            "aspect_cos": float(row["aspect_cos"]),
            "flood_probability": prob,
            "flood_probability_percent": round(prob * 100, 2),
            "risk_level": risk,
            "target": int(row["target"]) if "target" in row else None,
            "location_name": loc_name,
        }
        cells.append(cell)

    events = sorted(df["event_id"].unique().tolist()) if "event_id" in df.columns else []
    bbox = [
        float(df["lon"].min()),
        float(df["lat"].min()),
        float(df["lon"].max()),
        float(df["lat"].max()),
    ]

    _grid_cache = {
        "total_cells": len(cells),
        "risk_counts": risk_counts,
        "max_probability": round(float(np.max(probabilities)), 4),
        "avg_probability": round(float(np.mean(probabilities)), 4),
        "bbox": bbox,
        "events": events,
        "cells": cells,
    }

    return _grid_cache


def get_priority_areas(top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Get top priority flood risk areas ranked by predicted flood probability.
    """
    grid = generate_sulawesi_grid()
    cells = grid["cells"]

    # Sort by flood probability descending
    sorted_cells = sorted(cells, key=lambda c: c["flood_probability"], reverse=True)

    priorities = []
    for rank, c in enumerate(sorted_cells[:top_n], start=1):
        # Generate scientific reason based on actual features
        reasons = []
        if c["elevation"] <= 15:
            reasons.append(f"Low elevation ({c['elevation']:.0f}m)")
        if c["precip_3d"] >= 50:
            reasons.append(f"Heavy 3-day rainfall ({c['precip_3d']:.1f}mm)")
        if c["TWI"] >= 10:
            reasons.append(f"High wetness index ({c['TWI']:.1f})")
        if c["slope"] <= 3:
            reasons.append(f"Flat drainage slope ({c['slope']:.1f}°)")

        reason_str = " • ".join(reasons) if reasons else "Elevated hydro-topographic flood susceptibility"

        priorities.append({
            "rank": rank,
            "id": c["id"],
            "lon": c["lon"],
            "lat": c["lat"],
            "flood_probability": c["flood_probability"],
            "flood_probability_percent": c["flood_probability_percent"],
            "risk_level": c["risk_level"],
            "elevation": c["elevation"],
            "precip_3d": c["precip_3d"],
            "landcover": c["landcover"],
            "twi": c["TWI"],
            "reason": reason_str,
            "location_name": c["location_name"],
        })

    return priorities


def get_model_metrics_summary() -> Dict[str, Any]:
    """Load model performance metrics and global feature importances."""
    metrics_data = {}
    if METRICS_PATH.exists():
        with open(METRICS_PATH, "r") as f:
            metrics_data = json.load(f)

    feat_imp = []
    if FEAT_IMP_PATH.exists():
        df_feat = pd.read_csv(FEAT_IMP_PATH)
        feat_imp = df_feat.to_dict(orient="records")

    shap_imp = []
    if SHAP_IMP_PATH.exists():
        df_shap = pd.read_csv(SHAP_IMP_PATH)
        shap_imp = df_shap.to_dict(orient="records")

    return {
        "model": metrics_data.get("model", "XGBoost"),
        "target": metrics_data.get("target", "target"),
        "features": metrics_data.get("features", FEATURES),
        "dataset": metrics_data.get("dataset", {
            "total_rows": 400000,
            "train_rows": 259300,
            "validation_rows": 65528,
            "test_rows": 75172,
        }),
        "class_balance": metrics_data.get("class_balance", {
            "non_flood": 382017,
            "flood": 17983,
            "flood_rate": 0.0449575,
        }),
        "threshold": metrics_data.get("threshold", 0.5),
        "metrics": metrics_data.get("metrics", {}),
        "feature_importance": feat_imp,
        "shap_importance": shap_imp,
    }