# 05 — Backend Schema: Data Model, Auth & API

**Project:** Coastal Flood Digital Twin (FloodTwin) — SINGULARITY 2026, Track 1

> All schema decisions are **\[PROPOSED\]**. The brief does not prescribe a database. Because this is a hackathon, the design is **file-first** (Parquet/GeoJSON/CSV loaded into memory at startup) with an equivalent **SQL schema** (PostgreSQL + PostGIS, or SQLite + SpatiaLite) defined below so the data model is explicit and can be migrated if needed. Do not over-engineer: the mandatory core must work from files alone.

## 1. Storage Decision

| Data | Primary storage (MVP) | Optional upgrade |
| --- | --- | --- |
| Zones, roads, buildings, facilities | GeoJSON / GeoParquet in `data/processed/` | PostGIS tables |
| Training dataset | `flood_dataset.csv` / Parquet | Table `observations` |
| Predictions & forecasts | Parquet in `data/cache/` + in-memory dict | Table `predictions` |
| Models | Pickle/JSON files in `models/` | Model registry table |
| Metrics | `models/metrics.json` | Table `model_metrics` |
| DEM | GeoTIFF in `data/raw/` | n/a |

All geometries use **WGS84 (EPSG:4326)**; use a projected CRS only for distance/area calculations.

## 2. Entity Relationship Overview

```text
zones 1 ──── * observations
zones 1 ──── * predictions ──── * prediction_drivers
zones 1 ──── * roads | buildings | facilities
predictions 1 ──── * asset_impacts (roads / buildings / facilities)
zones 1 ──── * priority_rankings
scenarios 1 ──── * predictions
events 1 ──── * observations (replay)
```

## 3. Tables

### `zones`

Prediction unit (neighbourhood, grid cell or hydrologically meaningful zone).

| Column | Type | Notes |
| --- | --- | --- |
| `zone_id` | text PK | e.g. `zone_a` |
| `name` | text | Display name, e.g. "Coastal Ward 7" |
| `geometry` | geometry(Polygon, 4326) | Zone boundary |
| `centroid` | geometry(Point, 4326) | For labels/routing |
| `area_km2` | float |  |
| `population_estimate` | int | Proxy: buildings × occupants or raster sum |
| `elevation_mean` | float | metres a.s.l. (from DEM) |
| `elevation_min` | float |  |
| `relative_elevation` | float | Zone vs surrounding terrain |
| `slope_mean` | float | degrees |
| `flow_accumulation` | float | DEM-derived |
| `depression_fraction` | float | Share of area in terrain depressions |
| `drainage_capacity` | float | 0 = blocked, 1 = excellent |
| `impervious_fraction` | float | 0–1 |
| `vegetation_fraction` | float | 0–1 |
| `land_use` | text | Dominant class |
| `distance_to_coast_km` | float |  |
| `previous_flood_count` | int | Historical flood events |

### `observations` (training & live inputs)

One row per zone per timestep. Matches the canonical dataset schema.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK |  |
| `timestamp` | timestamptz | UTC |
| `zone_id` | text FK → zones | indexed |
| `event_id` | text FK → events, nullable |  |
| `rain_15m`, `rain_1h`, `rain_3h`, `rain_6h`, `rain_24h` | float | mm (accumulated) |
| `rain_intensity` | float | mm/h |
| `tide` | float | metres |
| `storm_surge` | float | metres |
| `flood_occurred` | boolean | Label for probability model |
| `flood_probability` | float | 0–1 (simulated target or derived) |
| `flood_severity` | smallint | 0–4 |
| `onset_hours` | float, nullable | Hours from timestamp to onset |
| `peak_hours` | float, nullable | Hours from timestamp to peak |
| `source` | text | `real_kerala` / `simulated` / `openmeteo` / `noaa` |

### `predictions`

Output of the models for a zone at an issue time and scenario.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK |  |
| `issued_at` | timestamptz | When the prediction was made |
| `zone_id` | text FK → zones |  |
| `scenario_id` | text FK → scenarios | `baseline` by default |
| `time_offset_min` | int | 0, 30, 60, 120 for timeline steps |
| `probability` | float | 0–1 |
| `probability_low`, `probability_high` | float, nullable | Optional interval |
| `severity` | smallint | 0–4 |
| `severity_label` | text | None/Minor/Moderate/Severe/Critical |
| `onset_time` | timestamptz, nullable | Median onset |
| `onset_low`, `onset_high` | timestamptz, nullable | Uncertainty range (Chronos quantiles) |
| `peak_time` | timestamptz, nullable | Median peak |
| `peak_low`, `peak_high` | timestamptz, nullable |  |
| `peak_level_proxy` | float | Forecast maximum of water-level proxy |
| `explanation_text` | text | Plain-language reasoning |
| `model_version` | text |  |

### `prediction_drivers` (SHAP output)

| Column | Type | Notes |
| --- | --- | --- |
| `prediction_id` | bigint FK → predictions |  |
| `rank` | smallint | 1 = strongest |
| `feature` | text | e.g. `rain_3h` |
| `label` | text | Human label: "Heavy 3-hour rainfall" |
| `shap_value` | float | Signed contribution |
| `direction` | text | `increases_risk` / `decreases_risk` |
| PK | (`prediction_id`, `rank`) |  |

### `roads` (from OpenStreetMap)

| Column | Type | Notes |
| --- | --- | --- |
| `road_id` | text PK | OSM way id |
| `zone_id` | text FK → zones | Via spatial join (split roads crossing zones) |
| `name` | text, nullable |  |
| `road_class` | text | motorway/primary/secondary/residential… |
| `geometry` | geometry(LineString, 4326) |  |
| `elevation_min` | float, nullable | From DEM along the line |
| `is_evacuation_route` | boolean | Class-based or flagged |

### `buildings` (from OpenStreetMap)

| Column | Type | Notes |
| --- | --- | --- |
| `building_id` | text PK | OSM id |
| `zone_id` | text FK → zones |  |
| `building_type` | text | residential/commercial/… |
| `levels` | smallint, nullable | For ground-floor guidance |
| `geometry` | geometry(Polygon, 4326) |  |
| `ground_elevation` | float, nullable | From DEM |
| `occupancy_estimate` | int, nullable | Proxy |

### `facilities` (critical infrastructure)

| Column | Type | Notes |
| --- | --- | --- |
| `facility_id` | text PK | OSM id |
| `zone_id` | text FK → zones |  |
| `name` | text |  |
| `facility_type` | text | `hospital` / `shelter` / `fire_station` / `school` / `police` / other |
| `geometry` | geometry(Point, 4326) |  |
| `capacity` | int, nullable | Mostly for shelters |
| `criticality` | float | 0–1 weight used by priority engine |

### `asset_impacts`

Which assets are affected at which time step (powers map highlighting and "roads/buildings/facilities affected").

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK |  |
| `prediction_id` | bigint FK → predictions |  |
| `asset_type` | text | `road` / `building` / `facility` |
| `asset_id` | text | Refers to the matching table |
| `status` | text | `affected` / `access_threatened` / `safe` |
| `expected_affected_at` | timestamptz, nullable |  |

### `priority_rankings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK |  |
| `issued_at` | timestamptz |  |
| `scenario_id` | text FK |  |
| `time_offset_min` | int |  |
| `rank` | smallint | 1 = respond first |
| `zone_id` | text FK → zones |  |
| `priority_score` | float | Flood risk × population exposure × infrastructure criticality × accessibility impact |
| `risk_factor`, `population_factor`, `criticality_factor`, `accessibility_factor` | float | Each normalised 0–1 |
| `reason` | text | e.g. "Hospital access threatened" |

### `alerts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK |  |
| `prediction_id` | bigint FK |  |
| `zone_id` | text FK |  |
| `risk_pct` | float |  |
| `severity` | smallint |  |
| `onset_time`, `peak_time` | timestamptz, nullable |  |
| `main_drivers` | jsonb | Top 3–5 driver labels |
| `message` | text | Plain-language alert text |
| `status` | text | `active` / `escalated` / `cleared` |
| `created_at` | timestamptz |  |

### `scenarios` (what-if)

| Column | Type | Notes |
| --- | --- | --- |
| `scenario_id` | text PK | `baseline` or generated id |
| `label` | text |  |
| `rain_multiplier` | float | e.g. 1.5 = 50% more rainfall |
| `tide_override` / `surge_override` | float, nullable |  |
| `created_at` | timestamptz |  |

### `events` (replay)

| Column | Type | Notes |
| --- | --- | --- |
| `event_id` | text PK |  |
| `name` | text | e.g. "Kerala 2018" or "Simulated Event 1" |
| `start_time`, `end_time` | timestamptz |  |
| `source` | text | real/simulated |
| `description` | text |  |

### `model_metrics`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK |  |
| `model_name` | text | `xgb_probability`, `xgb_severity`, `chronos_timing` |
| `split` | text | `train`/`val`/`test`/`event_replay` |
| `metric` | text | precision, recall, roc\_auc, pr\_auc, accuracy, macro\_f1, onset\_mae\_min, peak\_mae\_min |
| `value` | float |  |
| `data_source` | text | Must show real vs simulated |
| `created_at` | timestamptz |  |

## 4. Relationships

- `observations.zone_id`, `predictions.zone_id`, `roads.zone_id`, `buildings.zone_id`, `facilities.zone_id`, `priority_rankings.zone_id`, `alerts.zone_id` → `zones.zone_id` (many-to-one).
- `prediction_drivers.prediction_id`, `asset_impacts.prediction_id`, `alerts.prediction_id` → `predictions.id` (many-to-one).
- `predictions.scenario_id`, `priority_rankings.scenario_id` → `scenarios.scenario_id`.
- `observations.event_id` → `events.event_id`.

## 5. Indexes

- GiST (spatial) indexes on every `geometry` column.
- `observations (zone_id, timestamp)`.
- `predictions (zone_id, scenario_id, time_offset_min, issued_at DESC)`.
- `asset_impacts (prediction_id, asset_type)`.
- `priority_rankings (scenario_id, time_offset_min, rank)`.
- `alerts (status, severity DESC)`.
- `roads (zone_id)`, `buildings (zone_id)`, `facilities (zone_id, facility_type)`.

## 6. Auth Model

There is **no end-user authentication in v1** **\[PROPOSED\]** — the demo is read-mostly and public. Instead:

| Role | Access |
| --- | --- |
| `viewer` (default, anonymous) | Read all zones, alerts, impacts, priority list, briefing, replay |
| `scenario_user` (anonymous, session-scoped) | Create what-if scenarios (stored in memory/session, auto-expire) |
| `admin` (optional, API key in env) | Trigger data refresh, retrain models, regenerate cache |

If auth is added later: Supabase Auth or FastAPI + JWT; with Row Level Security, `scenarios` rows would be restricted to their creator, and `admin` would be required to write to `predictions`, `priority_rankings`, `alerts` and `model_metrics`.

**Security rules regardless:**

- Mutating endpoints (`/whatif` is stateless; admin endpoints) rate-limited and validated with Pydantic ranges (e.g. rainfall multiplier 0–5, tide 0–6 m, surge 0–5 m).
- CORS restricted to known origins via `CORS_ORIGINS`.
- No secrets in the repo; LLM key only in env.
- Never pass raw user text to the LLM; the briefing prompt receives only structured JSON from the backend.
- No personal data is stored. If the Resident view collects a location, keep it on the client and do not persist it server-side.

## 6a. Sensitive Fields

There are no payment or personal-identity fields. Treat the following as sensitive: LLM API key, admin API key, any precise resident location (client-side only).

## 7. File & Media Storage

```text
data/raw/
  kerala_flood.csv                # if Option A succeeds
  dem/                            # GeoTIFF tiles
  osm/                            # extracts or Overpass responses
data/processed/
  flood_dataset.csv               # real or simulated
  zones.geojson
  roads.geojson
  buildings.geojson
  facilities.geojson
data/cache/
  forecasts_<issued_at>.parquet   # Chronos output per zone
  shap_<issued_at>.parquet
  impacts_<scenario>_<t>.parquet
models/
  xgb_probability.json
  xgb_severity.json
  metrics.json
```

## 8. Triggers / Background Jobs

| Trigger | Action |
| --- | --- |
| App startup | Load zones/assets, load models, load or compute cached forecasts |
| Data refresh (admin or timer) | Recompute features → predictions → impacts → priorities → alerts |
| New prediction with severity ≥ 3 | Create/escalate an alert |
| Severity drop below 1 for all horizons | Mark alert `cleared` |
| What-if request | Run inference with overrides; return results without persisting |

## 9. Derived Computation Contracts

- **Probability:** `prob_model.predict_proba(X)[:, 1]`.
- **Severity:** `argmax(sev_model.predict_proba(X))`, 0–4.
- **Drivers:** top 3–5 features by absolute SHAP value for the predicted severity class, mapped through a `FEATURE_LABELS` dictionary to plain-language labels.
- **Onset/Peak:** from the Chronos median forecast against `FLOOD_THRESHOLD`; ranges from 10th/90th percentile sample paths.
- **Affected asset:** zone severity ≥ 2 **and** (asset elevation < predicted level proxy **or** asset elevation unknown and zone probability ≥ 0.5).
- **Priority score:** `risk × population × criticality × accessibility`, each factor normalised 0–1, weights/constants in `config.py`.

## 10. Example API Response Shapes

**GET `/zones/zone_a`**

```json
{
  "zone_id": "zone_a",
  "name": "Coastal Ward 7",
  "issued_at": "2026-10-08T09:30:00Z",
  "probability": 0.86,
  "severity": 3,
  "severity_label": "Severe",
  "onset": {"time": "2026-10-08T09:50:00Z", "low": "2026-10-08T09:50:00Z", "high": "2026-10-08T10:10:00Z"},
  "peak":  {"time": "2026-10-08T11:05:00Z", "low": "2026-10-08T10:50:00Z", "high": "2026-10-08T11:20:00Z"},
  "drivers": [
    {"rank": 1, "feature": "rain_3h", "label": "Heavy 3-hour rainfall", "shap": 0.42},
    {"rank": 2, "feature": "tide", "label": "High tide", "shap": 0.31},
    {"rank": 3, "feature": "elevation", "label": "Low elevation", "shap": 0.27}
  ],
  "explanation": "Heavy rainfall is occurring while tide levels are elevated. The area is also low-lying, so water is expected to accumulate rapidly.",
  "affected": {"roads": 14, "buildings": 212, "facilities": ["General Hospital"]}
}
```

**GET `/priority?t=60`**

```json
[
  {"rank": 1, "zone_id": "zone_a", "severity_label": "Critical", "score": 0.81, "reason": "Hospital access threatened"},
  {"rank": 2, "zone_id": "zone_c", "severity_label": "Severe",   "score": 0.67, "reason": "High population exposure"},
  {"rank": 3, "zone_id": "zone_f", "severity_label": "Severe",   "score": 0.59, "reason": "Main evacuation route affected"}
]
```

**POST `/whatif`**

```json
{"rain_multiplier": 1.5, "tide_override": 3.8, "surge_override": 1.2}
```

Returns the same shapes as `/zones` and `/priority`, plus a `changes` array (zone, old severity, new severity).
