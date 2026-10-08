"""
FloodTwin - dataset preprocessing.

Usage:
    python preprocess_floodtwin.py --raw ./uploads --out ./data/processed
    python preprocess_floodtwin.py --raw ./uploads --max-rows 400000

--raw may contain the original .zip files and/or the extracted CSVs. Needs: pandas, numpy
(pyarrow optional: writes .parquet when installed, otherwise .csv.gz).

What it produces (in --out):
  modis_clean.*              Real satellite flood labels (Sulawesi, Indonesia) with leakage columns
                             removed and spatial-block train/val/test splits.
  kerala_districts.csv       14 Kerala districts: approx. location, rainfall normals, rainfall scaling
                             factors (for turning a state-level rainfall signal into zone rainfall).
  kerala_climatology.csv     Kerala 1901-2018 monthly/annual rainfall + anomalies + monsoon totals.
  subdivision_climatology.csv  Annual/monsoon normals for all 36 IMD subdivisions (context).
  preprocess_report.json     Shapes, dropped columns, class balance per split, caveats.

Deliberately NOT used (see report): flood_risk_dataset_india.csv (statistically random noise) and the
Kaggle playground-series-s4e5 set (abstract 0-19 scores, ~linear in its inputs, no geography/time).
"""
import argparse
import json
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
MODIS_NAME = "modis_flood_features_paling cleaning (1).csv"

# Columns that come from the same satellite water mask / imagery as the label -> leakage.
LEAKY = ["flooded", "jrc_perm_water", "NDWI", "NDVI"]
MODIS_KEEP = ["date", "lon", "lat", "precip_1d", "precip_3d", "landcover", "elevation",
              "slope", "aspect", "upstream_area", "TWI", "target"]

# Approximate district headquarters coordinates (hand-entered, +/- a few km) - replace with
# real district polygons when you build zones.geojson.
KERALA_DISTRICTS = {
    "THIRUVANANTHAPURAM": (8.52, 76.94, 1), "KOLLAM": (8.89, 76.61, 1),
    "PATHANAMTHITTA": (9.26, 76.78, 0), "ALAPPUZHA": (9.49, 76.34, 1),
    "KOTTAYAM": (9.59, 76.52, 0), "IDUKKI": (9.85, 76.97, 0),
    "ERNAKULAM": (9.98, 76.28, 1), "THRISSUR": (10.53, 76.21, 1),
    "PALAKKAD": (10.78, 76.65, 0), "MALAPPURAM": (11.07, 76.07, 1),
    "KOZHIKODE": (11.26, 75.78, 1), "WAYANAD": (11.61, 76.08, 0),
    "KANNUR": (11.87, 75.37, 1), "KASARGOD": (12.50, 74.99, 1),
}
NAME_FIX = {"THIRUVANANTHA": "THIRUVANANTHAPURAM", "CANNUR": "KANNUR", "KASARAGOD": "KASARGOD"}


# ---------------------------------------------------------------- helpers
def find_csv(raw: Path, name: str) -> Path:
    """Return path to CSV `name`, extracting it from any zip in --raw if needed."""
    direct = list(raw.rglob(name))
    if direct:
        return direct[0]
    cache = raw / "_extracted"
    cache.mkdir(exist_ok=True)
    for z in raw.glob("*.zip"):
        with zipfile.ZipFile(z) as zf:
            if name in zf.namelist():
                zf.extract(name, cache)
                return cache / name
    raise FileNotFoundError(f"{name} not found in {raw} (or inside its zip files)")


def save(df: pd.DataFrame, out: Path, stem: str) -> str:
    try:
        import pyarrow  # noqa: F401
        p = out / f"{stem}.parquet"
        df.to_parquet(p, index=False)
    except ImportError:
        p = out / f"{stem}.csv.gz"
        df.to_csv(p, index=False)
    return p.name


# ---------------------------------------------------------------- MODIS
def process_modis(raw: Path, out: Path, max_rows: int, report: dict):
    df = pd.read_csv(find_csv(raw, MODIS_NAME))
    rep = {"rows_raw": len(df), "dates": sorted(df.date.unique().tolist()),
           "bbox": [float(df.lon.min()), float(df.lat.min()), float(df.lon.max()), float(df.lat.max())],
           "region_note": "Sulawesi, Indonesia - NOT India. Use as a methodology/spatial-susceptibility "
                          "demonstration; state this in the pitch."}

    # target must equal flooded AND not permanent water (verified); keep target only
    assert (((df.flooded == 1) & (df.jrc_perm_water == 0)).astype(int) == df.target).all(), \
        "target definition changed - re-check leakage columns"
    rep["dropped_leakage_columns"] = LEAKY

    df = df[MODIS_KEEP].drop_duplicates()
    df = df.replace([np.inf, -np.inf], np.nan).dropna()
    df["landcover"] = df.landcover.astype(int)
    df["upstream_area_log"] = np.log1p(df.upstream_area)
    df["aspect_sin"] = np.sin(np.deg2rad(df.aspect))
    df["aspect_cos"] = np.cos(np.deg2rad(df.aspect))
    df = df.drop(columns=["aspect", "upstream_area"])
    df = df.rename(columns={"date": "event_id"})

    # --- spatial-block split (the same grid cells appear on every date, so splitting by date
    # alone lets the model memorise cells). 0.25 deg blocks assigned to splits at random.
    bx = np.floor(df.lon / 0.25).astype(int)
    by = np.floor(df.lat / 0.25).astype(int)
    df["block_id"] = bx.astype(str) + "_" + by.astype(str)
    rng = np.random.default_rng(SEED)
    blocks = np.array(sorted(df.block_id.unique()))
    rng.shuffle(blocks)
    n = len(blocks)
    split_of = {b: ("train" if i < .70 * n else "val" if i < .85 * n else "test")
                for i, b in enumerate(blocks)}
    df["split"] = df.block_id.map(split_of)
    # extra hold-out: two whole flood dates flagged for event-level testing
    dates = sorted(df.event_id.unique())
    holdout_dates = [dates[2], dates[5]] if len(dates) >= 6 else dates[-1:]
    df["holdout_event"] = df.event_id.isin(holdout_dates).astype(int)
    rep["holdout_dates"] = holdout_dates

    # optional down-sample
    if max_rows and len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=SEED)   # random sample keeps overall prevalence
    df = df.reset_index(drop=True)

    rep["rows_clean"] = len(df)
    rep["flood_rate"] = float(df.target.mean())
    rep["per_split"] = {s: {"rows": int(len(g)), "flood_rate": round(float(g.target.mean()), 4)}
                        for s, g in df.groupby("split")}
    rep["per_date_flood_rate"] = df.groupby("event_id").target.mean().round(4).to_dict()
    rep["features"] = ["precip_1d", "precip_3d", "landcover", "elevation", "slope",
                       "aspect_sin", "aspect_cos", "upstream_area_log", "TWI"]
    rep["output"] = save(df, out, "modis_clean")
    report["modis"] = rep


# ---------------------------------------------------------------- Kerala
def process_kerala(raw: Path, out: Path, report: dict):
    # ---- districts
    dn = pd.read_csv(find_csv(raw, "district wise rainfall normal.csv"))
    dn = dn[dn.STATE_UT_NAME.str.upper().str.contains("KERALA")].copy()
    dn["DISTRICT"] = dn.DISTRICT.str.strip().str.upper().replace(NAME_FIX)
    dn = dn.drop(columns=["STATE_UT_NAME"]).set_index("DISTRICT")
    loc = pd.DataFrame(KERALA_DISTRICTS, index=["lat", "lon", "is_coastal"]).T
    d = loc.join(dn, how="left").reset_index().rename(columns={"index": "district"})
    assert d["ANNUAL"].notna().all(), f"missing normals: {d[d.ANNUAL.isna()].district.tolist()}"
    d = d.rename(columns={"ANNUAL": "annual_normal_mm", "Jun-Sep": "monsoon_normal_mm"})
    d["is_coastal"] = d.is_coastal.astype(int)
    d["monsoon_share"] = d.monsoon_normal_mm / d.annual_normal_mm
    # rainfall scaling: zone rainfall = state-level rainfall x scale (mean of districts = 1)
    d["rain_scale_annual"] = d.annual_normal_mm / d.annual_normal_mm.mean()
    d["rain_scale_monsoon"] = d.monsoon_normal_mm / d.monsoon_normal_mm.mean()
    d["data_note"] = "lat/lon approximate district HQ"
    d.to_csv(out / "kerala_districts.csv", index=False)

    # ---- Kerala long-run climatology (kerala.csv runs to 2018, the 1901-2015 file does not)
    k = pd.read_csv(find_csv(raw, "kerala.csv"))
    k.columns = [c.strip() for c in k.columns]
    k = k.rename(columns={"ANNUAL RAINFALL": "annual_mm", "FLOODS": "flood_year_label"})
    mons = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    k["monsoon_mm"] = k[["JUN", "JUL", "AUG", "SEP"]].sum(axis=1)
    base = k[k.YEAR <= 2015]                           # baseline period used for anomalies
    for col in ["annual_mm", "monsoon_mm", "AUG"]:
        k[f"{col}_z"] = (k[col] - base[col].mean()) / base[col].std()
        k[f"{col}_pctile"] = k[col].apply(lambda v: float((base[col] < v).mean()))
    k["flood_year"] = (k.flood_year_label.str.upper() == "YES").astype(int)
    k.to_csv(out / "kerala_climatology.csv", index=False)
    y18 = k[k.YEAR == 2018].iloc[0]
    flood_thr = float(k[k.flood_year == 1].annual_mm.min())

    # ---- all subdivisions
    r = pd.read_csv(find_csv(raw, "rainfall in india 1901-2015.csv"))
    r["monsoon"] = r[["JUN", "JUL", "AUG", "SEP"]].sum(axis=1, min_count=4)
    sub = r.groupby("SUBDIVISION").agg(
        years=("YEAR", "nunique"), annual_mean=("ANNUAL", "mean"), annual_std=("ANNUAL", "std"),
        monsoon_mean=("monsoon", "mean"), monsoon_std=("monsoon", "std")).round(1).reset_index()
    sub.to_csv(out / "subdivision_climatology.csv", index=False)

    report["kerala"] = {
        "districts": len(d), "years": [int(k.YEAR.min()), int(k.YEAR.max())],
        "rainfall_2018": {"annual_mm": float(y18.annual_mm), "annual_z": round(float(y18.annual_mm_z), 2),
                          "aug_mm": float(y18.AUG), "aug_z": round(float(y18.AUG_z), 2),
                          "aug_pctile_vs_1901_2015": round(float(y18.AUG_pctile), 3)},
        "flood_label_note": f"FLOODS label is almost a pure threshold on annual rainfall (~{flood_thr:.0f} mm); "
                            "use as climatology context, not as a predictive training target.",
        "outputs": ["kerala_districts.csv", "kerala_climatology.csv", "subdivision_climatology.csv"]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="uploads", help="folder with the zips / CSVs")
    ap.add_argument("--out", default="data/processed")
    ap.add_argument("--max-rows", type=int, default=400_000, help="cap for MODIS rows (0 = keep all)")
    a = ap.parse_args()
    raw, out = Path(a.raw), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    report = {"ignored": {
        "flood_risk_dataset_india.csv": "10k rows; every feature has |corr| < 0.03 with the label, uniform random "
                                        "values, implausible elevations - no learnable signal.",
        "playground-series-s4e5": "20 abstract 0-19 vulnerability scores, ~linear in inputs (R2 ~0.85), no "
                                  "geography or time - cannot support map, timing or impact analysis."}}
    process_modis(raw, out, a.max_rows, report)
    process_kerala(raw, out, report)
    json.dump(report, open(out / "preprocess_report.json", "w"), indent=2, default=str)
    print(json.dumps({k: v for k, v in report.items() if k != "ignored"}, indent=2, default=str))


if __name__ == "__main__":
    main()
