# 02 — Technical Requirements Document (TRD)

**Project:** Coastal Flood Digital Twin (FloodTwin) — SINGULARITY 2026, Track 1

> The official brief does **not** prescribe any dataset, location, algorithm, language, cloud, API, database, or map provider. Everything below is a **\[PROPOSED\]** engineering decision, locked in so the AI coding agent stays consistent across every file.

## 1. Technical Summary

A Python/FastAPI backend runs a two-model prediction pipeline per zone, a geospatial layer maps predictions onto roads, buildings and critical facilities, a priority engine ranks zones, and a map-first web dashboard presents everything.

```text
Rainfall / Weather ─┐
Tide / Storm Surge ─┤
DEM / Terrain ──────┤
OSM / Infrastructure┤
Historical Floods ──┘
          ↓
Feature Engineering
          ↓
Flood Prediction Model (XGBoost + Chronos)
          ↓
Probability + Severity + Onset + Peak
          ↓
Flood Progression Simulation
          ↓
Roads + Buildings + Critical Facilities
          ↓
Emergency Priority Engine
          ↓
Risk Map + Alerts + Explanation + AI Briefing
```

## 2. Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Backend | Python 3.11 + FastAPI | JSON API, async, auto OpenAPI docs |
| Data | pandas, NumPy | Feature tables, simulation |
| ML (tabular) | XGBoost (scikit-learn API) | Probability + severity |
| ML (time series) | Chronos-T5-Small (`amazon/chronos-t5-small`) | Zero-shot onset + peak |
| Explainability | SHAP (`TreeExplainer`) | Ranked drivers per zone |
| Geospatial | GeoPandas, Shapely, Rasterio, PyProj | Zones, roads, buildings, DEM |
| Map data | OpenStreetMap | Roads, buildings, coastline, waterways, hospitals, shelters |
| Terrain | Separate DEM (e.g. SRTM / Copernicus GLO-30) | Elevation, slope, flow direction, flow accumulation, depressions |
| Frontend (fast path) | Streamlit + Folium/pydeck | Fastest to a working dashboard |
| Frontend (polished path) | React + Vite + TypeScript + Tailwind + MapLibre GL (or Leaflet) | Preferred if time allows |
| Persistence | Files first (Parquet/GeoJSON/CSV); optional SQLite/PostGIS | Keep it simple for a hackathon |
| LLM (optional) | Any LLM API for the AI Flood Commander briefing | Input = structured JSON only |

**Decision:** build the backend as FastAPI regardless. Start the UI in Streamlit only if React cannot be ready in time; do not build both.

## 3. Critical Technical Clarification: OSM vs DEM

OpenStreetMap is **not** an elevation source. Use:

- **OSM** for roads, buildings, coastline, rivers/waterways, hospitals, shelters, other mapped infrastructure.
- **A separate DEM** for elevation, slope, flow direction, flow accumulation, terrain depressions and other terrain-derived flood features.

OSM + DEM is stronger than OSM alone. A map can exist without DEM, but terrain-aware spread modelling is substantially weaker. If DEM acquisition fails, fall back to a documented synthetic elevation per zone and say so.

## 4. Prediction Unit

Neighbourhoods, grid cells, or hydrologically meaningful zones — **never one city-wide score**. Default: 8–20 zones for the pilot area (`zone_id`), each with a polygon geometry.

## 5. Feature Set (inputs)

**Weather:** rainfall over 15 min, 1 h, 3 h, 6 h, 24 h; rainfall intensity. **Ocean/coastal:** tide, storm surge, distance to coast. **Terrain:** elevation, slope, flow direction, flow accumulation, depressions, relative elevation. **Drainage:** drainage proximity/density, drainage capacity where available. **Land use:** impervious/built-up fraction, vegetation, open land, water bodies. **Historical:** previous flood events, historical water levels/frequency.

### Canonical dataset schema

```text
timestamp, zone_id,
rain_15m, rain_1h, rain_3h, rain_6h, rain_24h,
rain_intensity, tide, storm_surge,
elevation, slope, flow_accumulation,
drainage_capacity, land_use, impervious_fraction,
distance_to_coast, previous_flood_count,
flood_probability, flood_severity, onset_time, peak_time
```

The simulated fallback uses a reduced column set (`rain_1h, rain_3h, rain_24h, tide, storm_surge, elevation, slope, drainage_capacity, impervious_fraction, distance_to_coast`). The pipeline must accept either; missing columns are filled by the feature-engineering step.

## 6. Model Strategy — Two-Model Approach

| Output | Model | Pretrained? |
| --- | --- | --- |
| Flood probability | XGBoost | No — train on dataset (fast) |
| Flood severity | XGBoost (second classifier) | No — train on dataset (fast) |
| Flood onset time | Chronos-T5-Small | Yes — zero-shot |
| Flood peak time | Chronos-T5-Small | Yes — zero-shot |
| Explainability | SHAP with XGBoost | Library, no training |

### Model A — XGBoost (probability + severity)

Why: no pretrained public tabular flood model matches this input/output; trains in under a minute on \~10,000 rows; native SHAP support covers the Explainability criterion; standard sensible choice for tabular environmental data; easy to defend in judge Q&A.

```python
from xgboost import XGBClassifier

# Probability — binary classification
prob_model = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05)
prob_model.fit(X_train, y_prob_train)

# Severity — multi-class classification (0–4)
sev_model = XGBClassifier(n_estimators=200, max_depth=6,
                          objective='multi:softprob', num_class=5)
sev_model.fit(X_train, y_severity_train)
```

Note: the probability target must be a binary `flood_occurred` label (derived from `flood_probability > 0.5` or from real flood records), and `predict_proba` is used as the displayed probability.

**Severity scale**

| Level | Label | Meaning |
| --- | --- | --- |
| 0 | None | No significant risk |
| 1 | Minor | Localised, low-lying puddles |
| 2 | Moderate | Road flooding, some access disruption |
| 3 | Severe | Widespread flooding, building entry |
| 4 | Critical | Life-threatening, full evacuation required |

Thresholds should be learned from the dataset used. Severity may be multi-class or ordinal regression.

**SHAP**

```python
import shap
explainer = shap.TreeExplainer(sev_model)
shap_values = explainer.shap_values(X_zone)
# Top contributing factors per zone feed the plain-language alert
```

### Model B — Chronos-T5-Small (onset + peak)

Zero-shot time-series foundation model from Amazon on Hugging Face. Feed 24–48 h of rainfall and tide readings per zone; it forecasts 6–12 h ahead of a water-level proxy.

- **Onset** = first forecast timestep where the value crosses the flood threshold.
- **Peak** = timestep of the maximum forecast value.
- **Uncertainty:** Chronos returns multiple sample paths, so onset/peak are reported as ranges (e.g. 3:20–3:40 PM) using low/high quantiles.

```python
from chronos import ChronosPipeline
import torch

pipeline = ChronosPipeline.from_pretrained(
    "amazon/chronos-t5-small", device_map="cpu", torch_dtype=torch.float32)

forecast = pipeline.predict(context, prediction_length=24)  # [num_samples, 24]
median = forecast.median(dim=0).values
onset_hour = (median > FLOOD_THRESHOLD).nonzero(as_tuple=True)[0][0].item()
peak_hour = median.argmax().item()
```

**Edge cases the code must handle:** forecast never crosses threshold (onset = `None`, no alert); first model weights download needs internet — cache the model locally before the demo; CPU inference latency — precompute per-zone forecasts and cache them rather than calling Chronos on each click. The "water-level proxy" must be defined explicitly in code (e.g. a normalized combination of rolling rainfall and tide) and documented, since Chronos forecasts a single univariate series.

**Fallback:** if Chronos cannot be run in time, derive onset/peak from the simulated `onset_hours`/`peak_hours` columns using a small XGBoost regressor, and say so in the pitch.

## 7. Data Strategy — Decision Rule

```text
START
  ↓
Search for Kerala flood dataset on Kaggle
  ↓
Found + reasonably clean in < 30 minutes?
  ├── YES → use it, adapt schema to the feature list above
  └── NO  → switch to simulated data immediately
```

**30 minutes is the hard cutoff.**

**Option A — real data (preferred if obtainable):** Kerala Flood Dataset (Kaggle, 2018 floods, district-level rainfall and flood occurrence). Other sources: NOAA tide gauge data, Open-Meteo historical weather API (free, no key), IMD historical rainfall.

**Option B — physics-based simulated data (fully allowed):** the brief says historical or simulated data is acceptable. Generate \~8,000 rows via a composite risk score:

```text
score = rain_3h/40 + tide/2.0 + storm_surge/1.0 - elevation/6.0
        - drainage*1.5 + impervious*0.8 - dist_coast*0.1 + N(0, 0.3)
flood_prob = clip(score/6, 0, 1)
severity: <1.0 → 0, <2.5 → 1, <4.0 → 2, <5.5 → 3, else 4
onset_h = max(0.25, 4.0 - score + U(-0.5, 0.5)); peak_h = onset_h + U(0.5, 2.5)  (only if flood_prob > 0.3)
```

Random seed fixed at 42. Honest framing for judges: "We used physics-based simulated data because real-time coastal sensor data was not accessible within the hackathon timeframe; the problem statement explicitly allows this."

**Honesty caveat to implement:** when data is simulated from a formula, a model can trivially re-learn that formula, so headline metrics will look inflated. The dashboard and pitch must state that metrics are on simulated data, and where possible validate on a held-out simulated *event* and add noise/domain shift rather than present near-perfect scores as real-world accuracy.

## 8. Flood Progression Simulation

Time steps NOW, +30 min, +1 h, +2 h (finer if cheap). At each step, recompute per-zone probability/severity by advancing the rainfall/tide inputs along the forecast, then re-run impact tagging. Describe it as an **AI-driven flood progression simulation**, not a hydrodynamic simulation, unless a validated hydrodynamic model is actually implemented.

## 9. Geospatial Impact Analysis

1. Load OSM roads, buildings, hospitals, shelters for the pilot bounding box (cache as GeoJSON/Parquet; do not hit Overpass live during the demo).
2. Assign each feature to a zone via spatial join.
3. Compute DEM-derived zone features (elevation, slope, flow accumulation, relative elevation).
4. For each time step, mark a road/building/facility as **affected** when its zone's probability and severity exceed thresholds and (if available) its own elevation is below the zone's predicted water-level proxy.
5. Facility access: flag a hospital/shelter as *access threatened* when roads within a defined radius or on the nearest routes are affected.

## 10. Emergency Priority Engine

```text
Priority = Flood Risk × Population Exposure × Infrastructure Criticality × Accessibility Impact
```

Each factor is normalised to 0–1 (document the normalisation). Population exposure can be a proxy: building count × assumed occupants, or a population raster if available. Output a ranked list with a one-line reason (e.g. "Hospital access threatened"). Keep the formula and weights configurable in one file.

## 11. Optional Features — Technical Notes

- **What-If:** same inference path with overridden rainfall/tide/surge inputs; must return in a few seconds, so use cached features and the lightweight XGBoost path.
- **Escape routes:** build a road graph (OSMnx or NetworkX), set edge weights from predicted road risk, run Dijkstra to the nearest safe shelter.
- **AI Flood Commander:** prompt the LLM with structured JSON only and an instruction to use no facts outside the JSON; the LLM must not invent predictions. Fall back to a template-based briefing if the API is unavailable.

## 12. API Surface (FastAPI)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/zones` | Zone polygons + current prediction summary |
| GET | `/zones/{zone_id}` | Full prediction, uncertainty ranges, drivers, explanation |
| GET | `/zones/{zone_id}/explain` | SHAP ranked drivers + plain-language text |
| GET | `/alerts` | Zone alerts (zone, risk, onset, peak, main drivers) |
| GET | `/impact?t=<offset_min>` | Affected roads, buildings, facilities at a time step |
| GET | `/priority?t=<offset_min>` | Ranked emergency priority list |
| POST | `/whatif` | Override rainfall/tide/surge, return recomputed results |
| GET | `/route?from=<lat,lon>` | Safest route to shelter (optional) |
| GET | `/briefing` | AI Flood Commander briefing (optional) |
| GET | `/replay/{event_id}` | Historical/simulated event replay (optional) |

## 13. Folder Structure

```text
floodtwin/
├── README.md
├── .env.example
├── requirements.txt
├── data/
│   ├── raw/            # Kaggle CSVs, DEM tiles, OSM extracts
│   ├── processed/      # flood_dataset.csv, zones.geojson, roads/buildings/facilities
│   └── cache/          # precomputed forecasts, SHAP values
├── models/             # saved XGBoost models, metrics.json
├── notebooks/          # exploration only
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/        # routers
│   │   ├── data/       # simulate.py, load_real.py, features.py
│   │   ├── models/     # xgb_model.py, chronos_model.py, explain.py
│   │   ├── geo/        # osm.py, dem.py, impact.py
│   │   ├── engine/     # priority.py, simulation.py, whatif.py, routing.py
│   │   └── schemas.py  # Pydantic models
│   └── tests/
└── frontend/           # React app (or app.py for Streamlit)
```

**Naming:** snake\_case in Python and JSON fields, kebab-case for frontend files, PascalCase for React components, ISO-8601 UTC timestamps in the API and local time in the UI, WGS84 (EPSG:4326) for all GeoJSON, projected CRS only for metric calculations.

## 14. Environment Variables

```text
APP_ENV
DATA_DIR
MODEL_DIR
PILOT_BBOX            # min_lon,min_lat,max_lon,max_lat
DEM_PATH
USE_SIMULATED_DATA    # true/false (30-minute rule outcome)
FLOOD_THRESHOLD       # water-level proxy threshold for onset
CHRONOS_MODEL_ID      # default amazon/chronos-t5-small
CHRONOS_CONTEXT_HOURS # default 48
CHRONOS_HORIZON_HOURS # default 24
LLM_API_KEY           # optional, for AI Flood Commander
LLM_MODEL             # optional
MAP_STYLE_URL         # optional, MapLibre style
CORS_ORIGINS
```

Never commit real values; ship `.env.example` only.

## 15. Validation Plan

Avoid random time-series splits that leak future information. Prefer time-based train/validation/test splits, event-based validation, and historical-event replay.

- **Probability:** precision, recall, ROC-AUC, PR-AUC.
- **Severity:** accuracy, macro F1, confusion matrix.
- **Timing:** mean absolute onset error and peak-time error.
- **Operations:** high-risk-zone detection and priority-ranking quality.
- Save all metrics to `models/metrics.json` and show them (with limitations) in the dashboard.

## 16. Constraints

- Software-only; no hardware sensors.
- Must run on a laptop CPU (no GPU required); Chronos-T5-Small on CPU with cached forecasts.
- Must work offline during the demo (pre-cache OSM, DEM, models, forecasts).
- Free tiers / open data only.
- Responsive enough for a projector and a phone-sized viewport.
- No claim of validated hydrodynamic physics; state limitations honestly.
- The LLM may only restate model outputs, never create predictions.
