# 06 — Implementation Plan: Step-by-Step Build Sequence

**Project:** Coastal Flood Digital Twin (FloodTwin) — SINGULARITY 2026, Track 1

> **How to use:** Give this plan to the AI coding agent together with documents 01–05. Tell it: *"Build phase by phase. Do not start a phase until the previous phase's done-criteria are met. Do not add features that are not in the plan."*
>
> **Principle:** Build the mandatory core first. Then add one or two high-impact innovations rather than many unfinished features.

## Build Order at a Glance

| Phase | Goal | Tier |
| --- | --- | --- |
| 0 | Decisions & the 30-minute data rule | Setup |
| 1 | Project setup | Mandatory |
| 2 | Data: dataset, zones, DEM, OSM | Mandatory |
| 3 | Prediction models (probability, severity) + SHAP | Mandatory |
| 4 | Timing models (onset, peak) + uncertainty | Mandatory |
| 5 | Impact analysis + priority engine + alerts | Mandatory |
| 6 | Backend API | Mandatory |
| 7 | Dashboard & risk map | Mandatory |
| 8 | Strong demo: timeline, replay, better alerts | Phase 2 |
| 9 | Innovation (pick 1–2) | Phase 3 |
| 10 | Testing, validation, honesty pass | Mandatory |
| 11 | Demo hardening & deployment | Mandatory |

The phase numbers above sequence the *build*; they map onto the master plan's three tiers (Mandatory core → Strong demo → Innovation).

---

## Phase 0 — Decisions (do first, \~15 min)

**Tasks**

1. Pick the pilot geography (Kerala coast preferred if real data is used; otherwise a named coastal area with a bounding box).
2. Set a 30-minute timer for the real-data attempt (Kerala Flood Dataset on Kaggle). If not found **and** reasonably clean within 30 minutes, switch immediately to simulated data and record the decision in `USE_SIMULATED_DATA`.
3. Choose the UI path: **React + MapLibre** if at least one teammate is comfortable with it, otherwise **Streamlit**. Do not build both.
4. Assign owners: data/ML, geospatial/backend, frontend, demo/pitch.

**Done when:** pilot area, data path, UI path and owners are written in `README.md`.

## Phase 1 — Project Setup

**Tasks**

1. Create the repo with the folder structure from the TRD (`backend/`, `frontend/`, `data/`, `models/`, `notebooks/`).
2. Create a Python 3.11 virtual environment; install: `fastapi uvicorn pandas numpy scikit-learn xgboost shap geopandas shapely rasterio pyproj osmnx networkx pyarrow pydantic python-dotenv torch chronos-forecasting`.
3. Add `.env.example` with every variable from the TRD; add `.gitignore` (data, models, `.env`).
4. Create a `/health` endpoint and confirm the server runs.
5. Pre-download Chronos weights (`amazon/chronos-t5-small`) while internet is available.
6. Create `config.py` holding thresholds, feature labels, severity labels, priority weights.

**Done when:** `uvicorn` starts, `/health` returns OK, all libraries import, Chronos loads and returns a forecast on a dummy series.

## Phase 2 — Data Layer

**2A. Flood dataset**

1. If real data was found: clean it, map columns to the canonical schema, document what is missing.
2. Otherwise: implement `simulate.py` using the physics-based composite score from the TRD (seed 42, \~8,000 rows, 8+ zones). Add a `flood_occurred` binary label.
3. Save to `data/processed/flood_dataset.csv`; write basic checks (no NaN in features, class balance, severity distribution).

**2B. Zones & terrain**

1. Define zone polygons for the pilot area (neighbourhood boundaries from OSM admin boundaries, or a regular grid clipped to the coast).
2. Obtain a DEM (e.g. SRTM/Copernicus). Compute per-zone elevation mean/min, slope, relative elevation, flow accumulation, depression fraction. If DEM fails, use documented synthetic elevation and flag it.
3. Save `zones.geojson` and populate the `zones` fields from the Backend Schema.

**2C. Infrastructure**

1. Download/cache OSM roads, buildings, hospitals, shelters (and other critical facilities) for the bounding box.
2. Spatially join each asset to a zone; sample DEM elevation for roads/buildings if possible.
3. Save `roads.geojson`, `buildings.geojson`, `facilities.geojson`.
4. Ensure at least a few hospitals and shelters exist in the pilot area; if OSM has none, add a small documented set manually.

**Done when:** dataset CSV, zones, roads, buildings and facilities all load in a notebook, render on a quick map, and every asset has a `zone_id`.

## Phase 3 — Probability & Severity Models (XGBoost + SHAP)

**Tasks**

1. `features.py`: build the feature matrix (rainfall windows, tide, surge, terrain, drainage, land use, distance to coast, previous flood count).
2. Split **by time or by event**, not randomly. Hold out a test set and, if possible, a whole held-out event.
3. Train `prob_model` (binary) and `sev_model` (5-class) per the TRD hyperparameters; tune lightly only if time allows.
4. Evaluate: precision, recall, ROC-AUC, PR-AUC (probability); accuracy, macro F1, confusion matrix (severity). Save to `models/metrics.json` with the data source recorded.
5. Build `explain.py`: SHAP `TreeExplainer`, top 3–5 drivers per zone, mapped through `FEATURE_LABELS` to plain-language names, plus a template that turns drivers into a sentence.
6. Save models.

**Done when:** a function `predict_zone(features) -> probability, severity, drivers, explanation` works for every zone and metrics are saved. Metrics are honestly labelled (note if the data is simulated).

## Phase 4 — Onset & Peak (Chronos) + Uncertainty

**Tasks**

1. Define the **water-level proxy** series per zone (documented formula combining rolling rainfall and tide, scaled by zone vulnerability) and `FLOOD_THRESHOLD`.
2. Build a context window of the last 24–48 h per zone (from the dataset, a replayed event, or Open-Meteo/NOAA if available).
3. Run Chronos zero-shot; take the median for onset/peak and 10th/90th percentile sample paths for ranges.
4. Handle "no crossing" (onset = None) and cache forecasts per zone to `data/cache/`.
5. Evaluate on historical/simulated events: mean absolute onset error and peak error (minutes).
6. **Fallback:** if Chronos underperforms or cannot run, train a small XGBoost regressor on `onset_hours`/`peak_hours` and document it.

**Done when:** `forecast_timing(zone, context) -> onset, peak, ranges` works, results are cached, timing error is measured and recorded.

## Phase 5 — Impact, Priority & Alerts

**Tasks**

1. `impact.py`: for each time offset (0, 30, 60, 120 min) mark affected roads, buildings and facilities using the rules in the Backend Schema; flag facilities with **access threatened**.
2. `simulation.py`: advance rainfall/tide along the forecast to produce per-step probability and severity (AI-driven progression, not hydrodynamic).
3. `priority.py`: compute `Risk × Population × Criticality × Accessibility`, normalise factors, return a ranked list with a one-line reason.
4. `alerts.py`: generate the standard alert (zone, risk, onset, peak, drivers, plain-language why, action) for zones with severity ≥ 2 or probability ≥ 0.5.
5. Template-based briefing generator (always available).

**Done when:** for the baseline scenario and each time offset the system returns affected assets, a ranked priority list, and complete alerts for the top zones.

## Phase 6 — Backend API

**Tasks**

1. Implement endpoints from the TRD: `/zones`, `/zones/{id}`, `/zones/{id}/explain`, `/alerts`, `/impact`, `/priority`, `/briefing`.
2. Pydantic response models matching the example shapes; ISO-8601 UTC timestamps.
3. Load models and caches at startup; target < 500 ms for cached responses.
4. CORS from `CORS_ORIGINS`; input validation and clear error JSON.
5. Add `/whatif` only if Phase 9 includes the What-If feature.

**Done when:** every mandatory deliverable can be fetched from the API, and OpenAPI docs at `/docs` show all endpoints with example responses.

## Phase 7 — Dashboard & Risk Map (Mandatory UI)

**Tasks**

1. Scaffold the frontend (React + Vite + Tailwind + MapLibre, or the Streamlit equivalent). Define design tokens from the UI/UX Brief (colours, severity scale, typography).
2. Build the **map**: zone polygons coloured by severity, probability as opacity, roads, buildings, hospitals, shelters, layer control, legend.
3. Build the **selected-zone panel**: probability, severity badge, onset/peak with ranges, ranked drivers, plain-language explanation, affected-asset counts.
4. Build the **alerts list** and the **emergency priority list** (rank, zone, severity, reason).
5. Add the data-source badge and the **Method & Limitations** view with metrics.
6. Implement loading, empty and error states from the App Flow.
7. Responsive layout (desktop, tablet, mobile bottom sheet).

**Done when:** a user can open the dashboard, see the map coloured by risk, click any zone and read probability, severity, onset, peak, drivers and explanation, see affected roads/buildings/facilities, and see the ranked priority list.

## Phase 8 — Strong Demo Features (Tier 2)

**Tasks (in order)**

1. **Timeline slider** (NOW, +30 m, +1 h, +2 h, play/pause) driving map, panel and priority list; sync `?t=` in the URL.
2. **Uncertainty display** on onset/peak (and probability if available).
3. **Better alert wording** and critical-alert banner.
4. **Flood Replay:** replay a stored historical/simulated event with predicted vs observed overlay and timing error.

**Done when:** moving the slider updates all views consistently and the replay runs end-to-end.

## Phase 9 — Innovation Features (Tier 3, pick one or two)

Suggested priority: **What-If Simulator** and **AI Flood Commander** (highest demo impact per effort), then Escape Route / Safe Zone Finder, Emergency Command Mode, and Flood Chain Reaction visual.

| Feature | Tasks | Done when |
| --- | --- | --- |
| What-If Simulator | `/whatif` endpoint with overrides; sliders in UI; diff badges; reset | Raising rainfall changes zones and ranking within a few seconds |
| AI Flood Commander | Prompt with structured JSON only; "no invented facts" instruction; template fallback; regenerate button | Briefing is 3–5 sentences, matches model outputs, never blank |
| Escape Route / Safe Zone Finder | Road graph (OSMnx/NetworkX); edge weights from predicted road risk; shortest safe path to a shelter; no-route message | Route avoids affected roads at the chosen time horizon |
| Emergency Command Mode | Stripped view: critical zones, roads at risk, facilities threatened, ranking | Responder sees everything needed on one screen |
| Flood Chain Reaction | Simple animated/step diagram driven by real outputs | Chain reflects the selected zone's actual impacts |

**Done when:** the chosen features work reliably in the demo flow. Unfinished features are **removed**, not left half-working.

## Phase 10 — Testing, Validation & Honesty Pass

**Tasks**

1. **Model tests:** reproducible metrics from a fixed seed; confirm no future-data leakage in splits.
2. **Unit tests:** feature builder, severity mapping, priority formula (including edge cases: zero population, no facilities, all-zero risk), impact rules, alert formatter.
3. **API tests:** every endpoint returns valid schema; invalid IDs and what-if inputs return clean errors.
4. **Manual flows:** run all four journeys from the App Flow, on desktop and phone viewport.
5. **Edge cases:** no flood anywhere, everything critical, forecast never crosses threshold, missing DEM or facility data, backend down, LLM down, map tiles failing.
6. **Honesty pass:** the dashboard and pitch state data source (simulated vs real), report all metrics (including weak ones), and describe the progression feature as AI-driven, not hydrodynamic. Check that no claim exceeds what is implemented.
7. **Accessibility check:** keyboard navigation, contrast, severity not colour-only, reduced motion.

**Done when:** tests pass, all flows complete without errors, and the limitations section is accurate.

## Phase 11 — Demo Hardening & Deployment

**Tasks**

1. Pre-cache OSM, DEM, models, forecasts and impacts so the demo works **offline**.
2. Prepare a deterministic **demo scenario** (e.g. conditions that produce Zone A onset 3:20 PM, peak 4:35 PM, Zone A hospital access threatened, Zone C high population, Zone F evacuation route) and a one-click "Load demo scenario".
3. Deploy: backend on a free tier (e.g. Render/Railway/Fly.io) and frontend on Vercel/Netlify, or run everything locally from one command (`make demo` / `docker compose up`) as a safety net.
4. Configure production env vars and CORS.
5. Rehearse the 9-step demo story and a 60-second version; prepare answers for judge Q&A (data source, why XGBoost, why Chronos, SHAP, limitations).
6. Write the README: setup, data decision, model summary, metrics, limitations, team roles.

**Done when:** the full demo runs start-to-finish twice in a row on the presentation machine, with and without internet.

---

## Demo Story (script outline)

1. Incoming conditions → 2. AI prediction → 3. Timing → 4. Geographic impact → 5. Explanation → 6. Priority → 7. Simulation timeline → 8. What-if → 9. AI briefing.

**Pitch line:** *"We don't just show where flooding is happening. We predict where it will happen, when it will arrive, how severe it will become, why it is happening, and who responders should help first."*

## Global Done Criteria (project is "finished" when…)

- [ ] Per-zone **probability, severity, onset, peak** are produced by working models and evaluated on historical/simulated events with honest metrics.
- [ ] An interactive **risk map** shows vulnerable zones, affected roads, buildings, hospitals and shelters.
- [ ] **Alerts** show zone, risk, onset, peak and main drivers.
- [ ] A **ranked emergency-priority list** is shown with reasons.
- [ ] Every zone has a **plain-language explanation** with ranked drivers (SHAP).
- [ ] A **working dashboard** (not slides) runs the full demo story.
- [ ] The **timeline simulation** works and is described honestly.
- [ ] At least **one innovation** feature works reliably.
- [ ] Limitations and data source are visible in the product and in the pitch.

## Judging Criteria Checklist

| Category | Weight | Where it is built |
| --- | --: | --- |
| Prediction quality | 25 | Phases 3, 4, 10 |
| Local/geospatial depth | 20 | Phases 2, 5, 7 |
| Explainability | 15 | Phases 3, 7 |
| Actionability | 15 | Phase 5, 8 |
| Dashboard/usability | 10 | Phases 7, 8 |
| Innovation | 10 | Phases 4 (uncertainty), 9 |
| Demo/storytelling | 5 | Phase 11 |

## Cut List (if time runs short)

Drop in this order: Flood Chain Reaction → Emergency Command Mode → Escape Routes → Replay → AI Flood Commander (keep template briefing) → What-If. **Never cut:** probability, severity, onset, peak, map with roads/buildings/facilities, alerts, explanation, priority ranking, working dashboard.
