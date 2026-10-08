from pathlib import Path

import pandas as pd
import xgboost as xgb


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_PATH = PROJECT_ROOT / "models" / "flood_xgb.json"


# ---------------------------------------------------------
# Feature order
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


# ---------------------------------------------------------
# Model
# ---------------------------------------------------------

_model = None


def get_model():
    """
    Load the trained XGBoost model once and reuse it.
    """

    global _model

    if _model is None:

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Flood model not found: {MODEL_PATH}"
            )

        _model = xgb.XGBClassifier()

        _model.load_model(MODEL_PATH)

    return _model


# ---------------------------------------------------------
# Prediction
# ---------------------------------------------------------

def predict_flood_probability(data: dict) -> float:
    """
    Predict flood probability for one location/time observation.
    """

    model = get_model()

    # Preserve the exact feature order used during training.
    row = pd.DataFrame(
        [[data[feature] for feature in FEATURES]],
        columns=FEATURES,
    )

    probability = model.predict_proba(row)[0, 1]

    return float(probability)