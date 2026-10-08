# FloodTwin — Coastal Flood Intelligence Platform

> AI-powered real-time coastal flood digital twin for Mangaluru and the Sulawesi coastline.
> Built for **Singularity 2026 · Track 1 · ByteHorizon**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup — Backend](#setup--backend)
- [Setup — Frontend](#setup--frontend)
- [Running the Application](#running-the-application)
- [Training the ML Model](#training-the-ml-model)
- [API Reference](#api-reference)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)

---

## Overview

FloodTwin is a full-stack flood risk intelligence platform that combines:

- **XGBoost ML model** trained on MODIS satellite flood data
- **Interactive MapLibre map** with real-time zone-level flood probability overlays
- **4D Hydrological Forecast Timeline** with playback simulation
- **SHAP explainability** for local feature attribution
- **What-If scenario simulator** for emergency planning
- **Mangaluru zone system** — 7 coastal/riverine zones with severity, onset, and peak predictions

---

## Architecture

```
Singularity/
├── floodtwin/
│   ├── backend/          # FastAPI Python backend
│   │   └── app/
│   │       ├── main.py           # FastAPI app entry point
│   │       ├── schemas.py        # Pydantic request/response models
│   │       ├── api/
│   │       │   └── predict.py    # /predict/flood endpoint
│   │       └── models/
│   │           └── xgb_model.py  # XGBoost loader & inference
│   ├── frontend/         # React + Vite TypeScript frontend
│   │   └── src/
│   │       ├── pages/            # Dashboard, Alerts, Priority, WhatIf
│   │       ├── components/       # Layout, Map, Timeline, Briefing
│   │       └── lib/
│   │           └── api-client.ts # Typed API calls to backend
│   ├── data/
│   │   ├── raw/                  # Raw MODIS / rainfall CSVs
│   │   └── preprocessed/         # modis_clean.parquet (generated)
│   ├── models/                   # Trained model artifacts
│   │   ├── flood_xgb.json
│   │   ├── metrics.json
│   │   ├── feature_importance.csv
│   │   ├── shap_importance.csv
│   │   └── confusion_matrix.png
│   └── scripts/
│       ├── preprocess_floodtwin.py   # Data preprocessing
│       └── train_flood_model.py      # XGBoost training script
└── requirements.txt      # Python dependencies
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | >= 3.11 | Required for backend and ML |
| Node.js | >= 18 | Required for frontend |
| npm | >= 9 | Bundled with Node.js |
| Git | any | Version control |

---

## Setup — Backend

### 1. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

---

## Setup — Frontend

```bash
cd floodtwin/frontend
npm install
```

---

## Running the Application

Both the backend and frontend must run simultaneously in separate terminals.

### Terminal 1 — Backend API

Run from the `floodtwin/` directory (important for correct Python path):

```powershell
cd floodtwin
python -m uvicorn backend.app.main:app --reload
```

- API: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- Swagger docs: http://127.0.0.1:8000/docs

### Terminal 2 — Frontend Dev Server

```bash
cd floodtwin/frontend
npm run dev
```

- App: http://localhost:5173

---

## Training the ML Model

Only needed if `models/flood_xgb.json` does not exist.

### Step 1 — Preprocess raw data

```bash
cd floodtwin
python scripts/preprocess_floodtwin.py
```

Reads raw CSVs from `data/raw/_extracted/` → writes `data/preprocessed/modis_clean.parquet`.

### Step 2 — Train XGBoost model

```bash
python scripts/train_flood_model.py
```

Outputs to `models/`: flood_xgb.json, metrics.json, feature_importance.csv, shap_importance.csv, confusion_matrix.png

---

## API Reference

### GET /health

```json
{ "status": "ok", "service": "FloodTwin API", "model": "XGBoost flood probability model" }
```

### POST /predict/flood

Request:
```json
{
  "lon": 74.826, "lat": 12.858,
  "precip_1d": 85.0, "precip_3d": 210.0,
  "landcover": 10, "elevation": 3.0, "slope": 0.5,
  "TWI": 6.2, "upstream_area_log": 0.8,
  "aspect_sin": 0.71, "aspect_cos": -0.71
}
```

Response:
```json
{ "flood_probability": 0.874, "flood_probability_percent": 87.4, "risk_level": "Critical" }
```

Risk levels: Low (<20%) · Moderate (20-50%) · High (50-75%) · Critical (>=75%)

---

## Key Features

| Feature | Description |
|---------|-------------|
| Interactive Map | MapLibre satellite with colour-coded flood probability points |
| Forecast Timeline | 7-step 4D timeline (Now to +72h) with playback and scrubber |
| Hover Tooltips | Zone data: probability, elevation, rainfall, TWI on hover |
| Fullscreen Map | Expand map; tooltip works in fullscreen mode |
| SHAP Explainability | Per-cell local feature attribution |
| What-If Simulator | Adjust rainfall/elevation to simulate scenarios |
| Mangaluru Zones | 7 named coastal zones with onset, peak, severity, mitigation |
| Dark / Light Mode | Theme toggle persisted in localStorage |
| Priority Ranking | AI-ranked highest-risk zones for emergency dispatch |
| Alerts Panel | Real-time alert feed with cyclone, tide, and rainfall drivers |

---

## Tech Stack

**Backend:** FastAPI · XGBoost · SHAP · Pandas · Uvicorn

**Frontend:** React 18 · TypeScript · Vite · MapLibre GL · react-map-gl · Recharts · Tailwind CSS · Zustand · Lucide React
