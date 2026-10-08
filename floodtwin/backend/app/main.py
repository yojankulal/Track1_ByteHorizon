from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.predict import router as predict_router


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