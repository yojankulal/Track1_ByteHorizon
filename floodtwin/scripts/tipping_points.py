"""
Rainfall tipping-point map: for every sector, how much 3-day rain does it take for the model to
call it flooded (probability >= threshold)?  A resilience map, not just a hazard map.

    python tipping_points.py --model models/xgb_flood.json --data data/processed/modis_clean.parquet
    python tipping_points.py --model models/xgb_flood.json --data ... --event 2003-12-10 --threshold 0.5

Works with an XGBoost model saved as .json, or any scikit-learn style model saved with joblib
(.joblib/.pkl) that has predict_proba. Feature names are read from the model when available,
otherwise pass --features a,b,c.

Outputs: data/processed/tipping_points.csv / .json  (lon, lat, tipping_mm, current_3d_mm,
         margin_mm, sensitivity)

HONEST LABEL: "model-estimated tipping point" - it is what the trained model implies for this
terrain, not a physical rainfall threshold. Other inputs (1-day rain) are co-varied using each
sector's own 1d/3d ratio.
"""
import argparse, json
from pathlib import Path
import numpy as np
import pandas as pd

BANDS = [(25, "Extremely sensitive"), (60, "Sensitive"), (120, "Moderate"), (np.inf, "Resilient")]


def load_model(path):
    p = Path(path)
    if p.suffix == ".json":
        from xgboost import XGBClassifier
        m = XGBClassifier(); m.load_model(str(p)); return m
    import joblib
    return joblib.load(p)


def model_features(m, fallback):
    if hasattr(m, "feature_names_in_"):
        return list(m.feature_names_in_)
    try:
        names = m.get_booster().feature_names
        if names: return list(names)
    except Exception:
        pass
    if fallback: return fallback
    raise SystemExit("Could not read feature names from the model; pass --features a,b,c")


def classify(tip):
    if tip == 0: return "Flooded at any rain"
    for hi, name in BANDS:
        if tip < hi: return name
    return BANDS[-1][1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--data", default="data/processed/modis_clean.parquet")
    ap.add_argument("--event", help="event_id/date whose rainfall is the 'current' state (default: wettest)")
    ap.add_argument("--features", help="comma-separated, only if the model has no feature names")
    ap.add_argument("--rain1", default="precip_1d"); ap.add_argument("--rain3", default="precip_3d")
    ap.add_argument("--threshold", type=float, default=0.5)
    ap.add_argument("--max-mm", type=float, default=300); ap.add_argument("--step", type=float, default=10)
    ap.add_argument("--max-cells", type=int, default=50000, help="subsample cells for speed (0 = all)")
    ap.add_argument("--out", default="data/processed")
    a = ap.parse_args()

    p = Path(a.data)
    df = pd.read_parquet(p) if p.suffix == ".parquet" else pd.read_csv(p)
    model = load_model(a.model)
    feats = model_features(model, a.features.split(",") if a.features else None)
    for c in (a.rain1, a.rain3):
        if c not in feats: raise SystemExit(f"{c} is not a model feature: {feats}")

    ev = a.event or df.groupby("event_id")[a.rain3].mean().idxmax()
    cur = df[df.event_id == ev].drop_duplicates(["lon", "lat"]).reset_index(drop=True)
    if a.max_cells and len(cur) > a.max_cells:
        cur = cur.sample(a.max_cells, random_state=42).reset_index(drop=True)
    print(f"event {ev}: {len(cur)} cells; features: {feats}")

    r3 = cur[a.rain3].to_numpy(float)
    ratio = np.where(r3 > 1e-6, cur[a.rain1].to_numpy(float) / np.maximum(r3, 1e-6), 0.35).clip(0, 1)
    grid = np.arange(0, a.max_mm + a.step, a.step)
    tip = np.full(len(cur), np.inf)
    static = cur[feats].copy()
    for mm in grid:                                   # first rainfall level that crosses the threshold
        X = static.copy()
        X[a.rain3] = mm
        X[a.rain1] = mm * ratio
        prob = model.predict_proba(X[feats])[:, 1]
        hit = (prob >= a.threshold) & np.isinf(tip)
        tip[hit] = mm

    out = pd.DataFrame({"lon": cur.lon, "lat": cur.lat, "current_3d_mm": r3.round(1),
                        "tipping_mm": np.where(np.isinf(tip), np.nan, tip)})
    out["margin_mm"] = (out.current_3d_mm - out.tipping_mm).round(1)       # >0 = already past the tipping point
    out["sensitivity"] = [classify(t) if not np.isnan(t) else f"Resilient (> {a.max_mm:.0f} mm)"
                          for t in out.tipping_mm]
    out["already_flooding_dry"] = (out.tipping_mm == 0)
    Path(a.out).mkdir(parents=True, exist_ok=True)
    out.to_csv(Path(a.out) / "tipping_points.csv", index=False)
    out.replace({np.nan: None}).to_json(Path(a.out) / "tipping_points.json", orient="records")

    print(out.sensitivity.value_counts().to_string())
    print(f"already past tipping point under event rain: {(out.margin_mm > 0).mean():.1%}")
    print(f"flagged flooded even at 0 mm (terrain-driven; check model/labels): {out.already_flooding_dry.mean():.1%}")
    print(f"wrote {Path(a.out)/'tipping_points.csv'} and .json")


if __name__ == "__main__":
    main()