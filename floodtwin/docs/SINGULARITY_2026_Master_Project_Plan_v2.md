# SINGULARITY 2026 — Track 1: AI for Coastal Flood Intelligence
## Master Requirements + Proposed Solution + Implementation Plan

> **Purpose:** Consolidated master document combining the official Track 1 requirements with our proposed implementation.
>
> **Important:** **OFFICIAL REQUIREMENT** sections come from the provided hackathon requirements. **PROPOSED** sections are our engineering/design decisions and are not claims about what the brief mandates.


# 1. Official Track Context

## OFFICIAL REQUIREMENT

**SINGULARITY 2026 by Gears of Excel — Track 1: AI for Coastal Flood Intelligence**

The track's mindset is **“Stop reacting, start anticipating.”** Teams are expected to build software-only AI systems that identify coastal-flood problems early and tell people what to do.

The central question is:

> **Where, when and how severely will flooding hit?**

The brief highlights time-series forecasting, geospatial AI and explainable ML, with the decision focus being which zones should be warned or responded to first.

The challenge is not simply detecting an existing flood. It is about **actionable early intelligence**.

## Practical questions

The system should help answer:
- Will water reach a particular street?
- When will it happen?
- How severe will it be?
- Should ground-floor people leave?
- Who needs help first?
- Which areas should emergency teams reach first?


# 2. Mandatory Objectives

## OFFICIAL REQUIREMENT

### Objective 1 — Flood prediction

For specific neighbourhoods/zones, predict:
1. **Flood probability**
2. **Flood severity**
3. **Flood onset**
4. **Flood peak**

Suggested signals include rainfall, tides, storm surge, terrain, drainage, land use and past flood events. Historical or simulated data is acceptable.

### Objective 2 — Dynamic flood-risk maps

Provide local/neighbourhood-level maps showing:
- Vulnerable zones
- Affected roads
- Affected buildings
- Critical facilities such as hospitals and shelters

### Objective 3 — Explanation and action

The system should:
- Explain why a zone is at risk
- Provide early warnings
- Recommend which areas emergency teams should reach first


# 3. Mandatory Deliverables

## OFFICIAL REQUIREMENT

The working system should provide:

- A flood-prediction model producing probability, severity, onset and peak
- An interactive live/updating risk map
- Zone alerts containing zone, risk, onset, peak and main drivers
- Identification of affected roads, buildings and critical facilities
- A ranked emergency-priority list
- Plain-language explanations

A working dashboard is preferable to a slide-only concept.


# 4. Judging Criteria

## OFFICIAL REQUIREMENT

| Category | Weight |
|---|---:|
| Prediction quality | 25 |
| Local/geospatial depth | 20 |
| Explainability | 15 |
| Actionability | 15 |
| Dashboard/usability | 10 |
| Innovation | 10 |
| Demo/storytelling | 5 |
| **Total** | **100** |

Prediction should be tested on historical or simulated events and reported honestly. Examples of useful metrics in the brief include onset-time error, precision, recall and AUC.

Geospatial depth means going beyond a city-wide score: use local areas and map risk onto roads, buildings and critical infrastructure.

Explainability should include ranked contributing factors and plain-language reasoning; SHAP is suggested as one possible approach.

Actionability means early, specific and timely warnings plus a defensible response ranking.


# 5. Mandatory vs Optional

## OFFICIAL REQUIREMENT

### Mandatory core
- Probability
- Severity
- Onset
- Peak
- Dynamic risk map
- Vulnerable zones
- Roads
- Buildings
- Critical facilities
- Alerts
- Plain-language explanation
- Ranked response priorities
- Working model
- Working dashboard

### Optional/innovation examples
The brief mentions satellite imagery, computer vision, uncertainty ranges and generative-AI briefings as examples of innovation. They are not mandatory.

### Important scope note
The official brief does **not** prescribe a particular:
- Dataset
- Geographic location
- ML algorithm
- Programming language
- Cloud platform
- API
- Database
- Map provider
- Model architecture

Those are implementation decisions.


# 6. Proposed Project Concept

## PROPOSED

### Coastal Flood Digital Twin

> **An AI-powered coastal flood digital twin that predicts where, when and how severely flooding will occur, simulates its progression, explains the causes, identifies vulnerable infrastructure and people, and recommends the highest-priority emergency actions.**

Core loop:

> **PREDICT → SIMULATE → EXPLAIN → RESPOND**


# 7. Proposed System Architecture

## PROPOSED

```text
Rainfall / Weather ─┐
Tide / Storm Surge ─┤
DEM / Terrain ──────┤
OSM / Infrastructure┤
Historical Floods ──┘
          ↓
Feature Engineering
          ↓
Flood Prediction Model
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

Suggested implementation stack:
- Python/FastAPI backend
- pandas/NumPy/scikit-learn
- XGBoost or LightGBM if useful
- SHAP for explainability
- GeoPandas/Shapely/Rasterio/PyProj
- OpenStreetMap for infrastructure
- Separate DEM for elevation
- Streamlit for rapid development or React + Leaflet/MapLibre for a polished UI

These technologies are **proposed**, not official requirements.


# 8. Objective 1 — Proposed Prediction System

## PROPOSED

### Prediction unit

Use neighbourhoods, geographic grid cells or hydrologically meaningful zones rather than one city-wide score.

### Proposed inputs

**Weather**
- Rainfall: 15 min, 1 h, 3 h, 6 h, 24 h
- Rainfall intensity

**Ocean/coastal**
- Tide
- Storm surge
- Distance to coast

**Terrain**
- Elevation
- Slope
- Flow direction
- Flow accumulation
- Depressions
- Relative elevation

**Drainage**
- Drainage proximity/density
- Drainage capacity where available

**Land use**
- Impervious/built-up fraction
- Vegetation
- Open land
- Water bodies

**Historical**
- Previous flood events
- Historical water levels/frequency where available

### Example schema

```text
timestamp, zone_id,
rain_15m, rain_1h, rain_3h, rain_6h, rain_24h,
rain_intensity, tide, storm_surge,
elevation, slope, flow_accumulation,
drainage_capacity, land_use, impervious_fraction,
distance_to_coast, previous_flood_count,
flood_probability, flood_severity, onset_time, peak_time
```

### Model strategy — Two-Model Approach

The four required prediction outputs are split across two models, each chosen for what it does best:

| Output | Model | Pretrained? |
|---|---|---|
| Flood probability | XGBoost | No — train on dataset (fast) |
| Flood severity | XGBoost (same model) | No — train on dataset (fast) |
| Flood onset time | Chronos-T5-Small | ✅ Yes — zero-shot, no training |
| Flood peak time | Chronos-T5-Small | ✅ Yes — zero-shot, no training |
| Explainability | SHAP (with XGBoost) | ✅ Yes — library, no training |

---

#### Model A — XGBoost (Probability + Severity)

XGBoost is the primary model. It takes all the tabular features listed above (rainfall, tide, elevation, drainage, land use etc.) and outputs:
- **Flood probability** (0.0 – 1.0)
- **Flood severity class** (0–4 scale below)

Why XGBoost over a pretrained model:
- No pretrained tabular flood-prediction model exists publicly for this exact input/output combination
- XGBoost trains in under a minute even on 10,000 rows
- Has **native SHAP support** — this directly and easily covers the 15-point Explainability judging criterion
- The problem statement explicitly mentions SHAP as a suggested approach
- Judges want "sensible modelling choices" — XGBoost on tabular environmental data is the industry-standard sensible choice
- Easy to explain architecture and decisions during the judge Q&A

Severity scale:

| Level | Label | Meaning |
|---|---|---|
| 0 | None | No significant risk |
| 1 | Minor | Localised, low-lying puddles |
| 2 | Moderate | Road flooding, some access disruption |
| 3 | Severe | Widespread flooding, building entry |
| 4 | Critical | Life-threatening, full evacuation required |

Actual thresholds should be learned from the dataset used. Severity can be treated as a multi-class classification task or an ordinal regression task.

Training approach:
```python
from xgboost import XGBClassifier
from sklearn.multioutput import MultiOutputClassifier

# Probability — binary classification
prob_model = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05)
prob_model.fit(X_train, y_prob_train)

# Severity — multi-class classification  
sev_model = XGBClassifier(n_estimators=200, max_depth=6, objective='multi:softprob', num_class=5)
sev_model.fit(X_train, y_severity_train)
```

SHAP integration for explainability:
```python
import shap

explainer = shap.TreeExplainer(sev_model)
shap_values = explainer.shap_values(X_zone)

# Top contributing factors per zone — feeds directly into the plain-language alert
# e.g. "Main drivers: 1. Heavy 3h rainfall  2. High tide  3. Low elevation"
```

---

#### Model B — Chronos-T5-Small (Onset Time + Peak Time)

**Chronos** is Amazon's pretrained time-series foundation model available on Hugging Face (`amazon/chronos-t5-small`). It does **zero-shot forecasting** — no training required. Feed it a sequence of past environmental readings and it forecasts future values.

How it is used here:
- Feed Chronos the past 24–48 hours of rainfall and tide level readings per zone
- It forecasts the next 6–12 hours of water-level proxy values
- Onset time = first timestep where the forecasted value crosses the flood threshold
- Peak time = timestep with the maximum forecasted value

```python
from chronos import ChronosPipeline
import torch

pipeline = ChronosPipeline.from_pretrained(
    "amazon/chronos-t5-small",
    device_map="cpu",
    torch_dtype=torch.float32,
)

# context = past 48 hours of rainfall+tide sequence for a zone (torch tensor)
forecast = pipeline.predict(context, prediction_length=24)
# forecast shape: [num_samples, prediction_length]

median_forecast = forecast.median(dim=0).values
onset_hour = (median_forecast > FLOOD_THRESHOLD).nonzero(as_tuple=True)[0][0].item()
peak_hour = median_forecast.argmax().item()
```

This also enables **uncertainty ranges** (Innovation criterion, 10 pts) — Chronos returns a distribution of forecasts, so onset and peak can be expressed as ranges:
```text
Onset: 3:20 PM – 3:40 PM
Peak:  4:20 PM – 4:50 PM
```

---

### Data Strategy

#### Option A — Real Dataset (preferred if obtainable within 30 minutes)

**Kerala Flood Dataset (Kaggle)** is the most accessible real dataset relevant to coastal India. It contains district-level rainfall and flood occurrence data from the 2018 Kerala floods. Search: *"Kerala flood dataset Kaggle"*.

If found and clean enough, this provides real historical training data. Use it.

Other possible real sources:
- NOAA tide gauge data (global, free API)
- Open-Meteo historical weather API (free, no API key needed)
- IMD (India Meteorological Department) historical rainfall data

#### Option B — Physics-Based Simulated Data (fallback, fully allowed)

The official brief explicitly states: *"Historical or simulated data is acceptable."*

If obtaining and cleaning a real dataset takes more than 30 minutes, switch immediately to simulated data. Do not waste hackathon hours cleaning messy data.

Generate using physics-based rules so the relationships are realistic and defensible to judges:

```python
import numpy as np
import pandas as pd

np.random.seed(42)
zones = ['Zone_A', 'Zone_B', 'Zone_C', 'Zone_D', 'Zone_E',
         'Zone_F', 'Zone_G', 'Zone_H']
rows = []

for _ in range(8000):
    zone = np.random.choice(zones)
    rainfall_1h   = np.random.uniform(0, 120)   # mm/hr
    rainfall_3h   = rainfall_1h * np.random.uniform(0.8, 3.0)
    rainfall_24h  = rainfall_3h * np.random.uniform(0.5, 4.0)
    tide          = np.random.uniform(0.5, 4.2)  # metres
    storm_surge   = np.random.uniform(0.0, 1.8)
    elevation     = np.random.uniform(0.5, 18.0) # metres above sea level
    slope         = np.random.uniform(0.0, 12.0)
    drainage      = np.random.uniform(0.0, 1.0)  # 0=blocked, 1=excellent
    impervious    = np.random.uniform(0.1, 0.95) # fraction of built-up area
    dist_coast    = np.random.uniform(0.1, 8.0)  # km

    # Physics-based composite risk score
    score = (
        (rainfall_3h / 40)
        + (tide / 2.0)
        + (storm_surge / 1.0)
        - (elevation / 6.0)
        - (drainage * 1.5)
        + (impervious * 0.8)
        - (dist_coast * 0.1)
        + np.random.normal(0, 0.3)   # noise
    )

    flood_prob = float(np.clip(score / 6.0, 0.0, 1.0))

    if score < 1.0:   severity = 0
    elif score < 2.5: severity = 1
    elif score < 4.0: severity = 2
    elif score < 5.5: severity = 3
    else:             severity = 4

    # Timing (hours from now until onset/peak — rough physics)
    if flood_prob > 0.3:
        onset_h = max(0.25, (4.0 - score) + np.random.uniform(-0.5, 0.5))
        peak_h  = onset_h + np.random.uniform(0.5, 2.5)
    else:
        onset_h, peak_h = np.nan, np.nan

    rows.append([zone, rainfall_1h, rainfall_3h, rainfall_24h,
                 tide, storm_surge, elevation, slope, drainage,
                 impervious, dist_coast, flood_prob, severity,
                 onset_h, peak_h])

df = pd.DataFrame(rows, columns=[
    'zone_id', 'rain_1h', 'rain_3h', 'rain_24h',
    'tide', 'storm_surge', 'elevation', 'slope',
    'drainage_capacity', 'impervious_fraction', 'distance_to_coast',
    'flood_probability', 'flood_severity', 'onset_hours', 'peak_hours'
])
df.to_csv('flood_dataset.csv', index=False)
```

When judges ask about the data, answer:
> *"We used physics-based simulated data because real-time coastal sensor data was not accessible within the hackathon timeframe. The problem statement explicitly allows this. The simulation follows established relationships between rainfall accumulation, tide levels, elevation and flood risk."*

This is a complete, honest, and acceptable answer.

---

### Decision rule: Real data vs Simulated

```text
START
  ↓
Search for Kerala flood dataset on Kaggle
  ↓
Found + reasonably clean in < 30 minutes?
  ├── YES → use it, adapt schema to match feature list above
  └── NO  → switch to simulated data immediately, do not spend more time
```

30 minutes is the hard cutoff. Every minute beyond that is time stolen from the dashboard and map.


# 9. OSM + DEM

## PROPOSED TECHNICAL CLARIFICATION

**OpenStreetMap is not a complete elevation/DEM source.**

Use OSM mainly for:
- Roads
- Buildings
- Coastline
- Rivers/waterways
- Hospitals
- Shelters
- Other mapped infrastructure

Use a separate DEM for:
- Elevation
- Slope
- Flow direction
- Flow accumulation
- Terrain depressions
- Other terrain-derived flood features

Therefore:

> **OSM + DEM is stronger than OSM alone for flood-risk modelling.**

A map can exist without DEM, but terrain-aware flood-spread modelling is substantially weaker.


# 10. Proposed Dynamic Flood Map

## PROPOSED

Use a real geographic map rather than a generic rectangular heatmap.

Layers:
- Zone flood probability
- Severity
- Onset and peak
- Roads
- Buildings
- Hospitals
- Shelters
- Other critical facilities
- Terrain context

When a zone is selected, show its prediction and explanation beside the map.


# 11. Proposed Flood Progression Simulation

## PROPOSED

Show how predicted flooding changes with time:

```text
2:00 PM → 2:30 PM → 3:00 PM → 3:30 PM → 4:00 PM
```

A timeline slider can reveal:
- Newly affected roads
- Expanding risk zones
- Newly threatened buildings
- Critical-facility access problems
- Peak impact

Unless a validated hydrodynamic model is actually implemented, describe this as an **AI-driven flood progression simulation**, not an exact physical hydrodynamic simulation.


# 12. Proposed Emergency Priority Engine

## PROPOSED

Flood severity alone should not determine priority.

A useful conceptual score is:

```text
Priority =
Flood Risk
× Population Exposure
× Infrastructure Criticality
× Accessibility Impact
```

Possible outputs:

```text
#1 Zone A — Critical
   Hospital access threatened

#2 Zone C — Severe
   High population exposure

#3 Zone F — Severe
   Main evacuation route affected
```

This directly supports the official requirement for ranked emergency response priorities.


# 13. Proposed Explainability

## PROPOSED

### Explain My Zone

Example:

```text
ZONE: Coastal Ward 7

Flood probability: 86%
Severity: Severe
Expected onset: 3:20 PM
Expected peak: 4:35 PM

Main drivers:
1. Heavy 3-hour rainfall
2. High tide
3. Low elevation
4. High flow accumulation
5. Poor drainage
```

Plain-language explanation:

> Heavy rainfall is occurring while tide levels are elevated. The area is also low-lying, so water is expected to accumulate rapidly.

Use SHAP or another validated feature-attribution method to generate the ranked drivers.


# 14. Proposed Innovation Features

## PROPOSED / OPTIONAL

### 14.1 What-If Flood Simulator
Change rainfall, tide or storm-surge values and recalculate the scenario.

### 14.2 Escape Route Mode
Recommend a safer route to a shelter using predicted flood risk on roads.

### 14.3 Emergency Command Mode
Show only the critical information responders need:
- Critical zones
- Roads at risk
- Facilities threatened
- Priority ranking

### 14.4 AI Flood Commander
Generate a short emergency briefing from structured model outputs. The LLM must not invent predictions.

### 14.5 Flood Chain Reaction
Visualize:
```text
Heavy rain → drainage overload → road flooding
→ traffic slowdown → hospital access reduction
→ response-time increase → priority escalation
```

### 14.6 Flood Replay
Replay a historical/simulated event and compare prediction with observed outcome.

### 14.7 Safe Zone Finder
Find shelters and routes that remain safe for the relevant prediction horizon.

### 14.8 Uncertainty
Show confidence and timing ranges, for example:
```text
Probability: 86%
Onset: 3:20–3:40 PM
Peak: 4:20–4:50 PM
```


# 15. Proposed Dashboard

## PROPOSED

```text
┌───────────────────────────────────────────────────────┐
│ COASTAL FLOOD INTELLIGENCE — LIVE                    │
├───────────────────────┬───────────────────────────────┤
│                       │ SELECTED ZONE                │
│      RISK MAP         │ Probability: 86%             │
│                       │ Severity: Severe             │
│ Roads                 │ Onset: 3:20 PM               │
│ Buildings             │ Peak: 4:35 PM                │
│ Hospitals             │                               │
│ Shelters              │ MAIN DRIVERS                 │
│                       │ 1. Rainfall                  │
│                       │ 2. Tide                      │
│                       │ 3. Elevation                 │
├───────────────────────┼───────────────────────────────┤
│ TIMELINE              │ EMERGENCY PRIORITY           │
│ NOW → +30m → +1h → +2h│ #1 Zone A                   │
│                       │ #2 Zone C                   │
│                       │ #3 Zone F                   │
├───────────────────────┴───────────────────────────────┤
│ AI FLOOD BRIEFING                                     │
└───────────────────────────────────────────────────────┘
```


# 16. Validation Plan

## PROPOSED

Avoid random time-series splitting when it could leak future information.

Prefer:
- Time-based train/validation/test splits
- Event-based validation
- Historical-event replay

Evaluate:
- Probability: precision, recall, ROC-AUC, PR-AUC where appropriate
- Severity: accuracy, macro F1, confusion matrix
- Timing: mean absolute onset error and peak-time error
- Operations: high-risk-zone detection and priority-ranking quality

Report limitations honestly.


# 17. Development Priority

## PROPOSED

### Phase 1 — Mandatory core
1. Obtain/construct dataset
2. Build zone-level prediction
3. Probability
4. Severity
5. Onset
6. Peak
7. Interactive map
8. Roads/buildings/facilities
9. Explanation
10. Priority ranking

### Phase 2 — Strong demo
11. Time progression
12. Timeline slider
13. Confidence
14. Better alerts
15. Flood replay

### Phase 3 — Innovation
16. What-if simulator
17. Escape Route Mode
18. Emergency Command Mode
19. AI Flood Commander
20. Flood Chain Reaction
21. Safe Zone Finder


# 18. Feature-to-Requirement Mapping

| Requirement | Proposed feature | Status |
|---|---|---|
| Probability | Zone probability model | Mandatory |
| Severity | Severity model | Mandatory |
| Onset | Timing model | Mandatory |
| Peak | Timing model | Mandatory |
| Dynamic map | Interactive map | Mandatory |
| Vulnerable zones | Risk layer | Mandatory |
| Roads | OSM + impact analysis | Mandatory |
| Buildings | OSM + impact analysis | Mandatory |
| Critical facilities | Hospital/shelter/etc. layer | Mandatory |
| Alerts | Zone alert panel | Mandatory |
| Explanation | SHAP + plain language | Mandatory |
| Response priority | Priority engine | Mandatory |
| Dashboard | Web dashboard | Mandatory |
| Satellite imagery | Optional | Optional |
| Computer vision | Optional | Optional |
| Uncertainty | Confidence/ranges | Optional enhancement |
| GenAI briefing | AI Flood Commander | Optional enhancement |
| What-if simulation | Scenario simulator | Our innovation |
| Escape routes | Safe-route engine | Our innovation |
| Digital Twin | Integrated concept | Our innovation |


# 19. Strongest Demo Story

## PROPOSED

### 1. Incoming conditions
Rainfall increases while tide and storm-surge conditions rise.

### 2. AI prediction
The model identifies several zones with increasing flood probability.

### 3. Timing
Example:
- Zone A onset: 3:20 PM
- Zone A peak: 4:35 PM

### 4. Geographic impact
The map reveals affected roads, buildings and critical facilities.

### 5. Explanation
The system identifies heavy rainfall, high tide and low elevation as leading contributors.

### 6. Priority
Example:
1. Zone A — hospital access threatened
2. Zone C — high population exposure
3. Zone F — evacuation route threatened

### 7. Simulation
Move the timeline forward:
```text
NOW → +30 min → +1 h → +2 h
```

### 8. What-if
Increase rainfall and show how the affected zones and response ranking change.

### 9. AI briefing
Generate a concise responder briefing from the structured results.

### Final story

> **Prediction → Map → Explanation → Simulation → Prioritization → Action**


# 20. Final Project Definition

## PROPOSED

> **A Coastal Flood Digital Twin that uses AI, temporal environmental signals and geospatial data to predict flood probability, severity, onset and peak at neighbourhood level; map affected roads, buildings and critical facilities; explain the main causes; simulate how flooding progresses; and rank the areas requiring emergency response first.**

### Short hackathon pitch

> **“We don't just show where flooding is happening. We predict where it will happen, when it will arrive, how severe it will become, why it is happening, and who responders should help first.”**


# 21. Bottom Line

## OFFICIAL CORE

The project must reliably answer:

> **Where?**  
> **When?**  
> **How severe?**  
> **Why?**  
> **What should responders do first?**

## OUR DIFFERENTIATOR

Turn those requirements into one operational loop:

> **PREDICT → MAP → EXPLAIN → SIMULATE → PRIORITIZE → ACT**

Build the mandatory core first. Then add one or two high-impact innovations rather than many unfinished features.

## Source note

The official requirements are based on the provided **SINGULARITY 2026 — Track 1: AI for Coastal Flood Intelligence Requirements** document. The official brief is the authority for what the hackathon requires; technology choices and additional features in this master plan are explicitly proposed.
