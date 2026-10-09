import sys
from pathlib import Path

# Ensure floodtwin package is on sys.path
_pkg_root = Path(__file__).resolve().parents[2]
if str(_pkg_root) not in sys.path:
    sys.path.insert(0, str(_pkg_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from floodtwin.backend.app.api.predict import router as predict_router
    from floodtwin.backend.app.api.alerts import router as alerts_router
    from floodtwin.backend.app.api.infrastructure import router as infra_router
except ImportError:
    from backend.app.api.predict import router as predict_router
    from backend.app.api.alerts import router as alerts_router
    from backend.app.api.infrastructure import router as infra_router


app = FastAPI(
    title="FloodTwin API",
    description="AI-powered coastal flood digital twin backend",
    version="1.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "FloodTwin API",
        "model": "XGBoost flood probability model",
    }


# ---------------------------------------------------------
# Routers
# ---------------------------------------------------------

app.include_router(predict_router)
app.include_router(alerts_router)
app.include_router(infra_router)