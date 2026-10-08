from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException

from backend.app.schemas import (
    FloodPredictionRequest,
    FloodPredictionResponse,
    LocalShapResponse,
    GridResponse,
    PriorityArea,
    ModelMetricsResponse,
)
from backend.app.models.xgb_model import (
    predict_flood_probability,
    explain_flood_prediction,
    generate_sulawesi_grid,
    get_priority_areas,
    get_model_metrics_summary,
    get_risk_level,
)


router = APIRouter(
    prefix="/predict",
    tags=["Prediction"],
)


@router.post(
    "/flood",
    response_model=FloodPredictionResponse,
    summary="Predict flood probability for an observation",
)
def predict_flood(request: FloodPredictionRequest):
    """
    Predict flood probability using the trained XGBoost model.
    """
    probability = predict_flood_probability(request.model_dump())
    return FloodPredictionResponse(
        flood_probability=probability,
        flood_probability_percent=round(probability * 100, 2),
        risk_level=get_risk_level(probability),
    )


@router.post(
    "/explain",
    response_model=LocalShapResponse,
    summary="Calculate exact local TreeSHAP explanations for a feature vector",
)
def explain_flood(request: FloodPredictionRequest):
    """
    Calculates exact local TreeSHAP values using XGBoost's native margin contributions.
    Returns feature impacts (+/-) and percentage importance for the given location.
    """
    return explain_flood_prediction(request.model_dump())


@router.get(
    "/grid",
    response_model=GridResponse,
    summary="Get Sulawesi spatial prediction grid derived from real MODIS observations",
)
def get_grid(
    sample_size: int = Query(
        default=1200,
        ge=1,
        le=5000,
        description="Number of deterministic representative points to return",
    )
):
    """
    Returns deterministically sampled Sulawesi spatial prediction cells with real features,
    XGBoost flood probabilities, and risk classifications.
    """
    try:
        grid = generate_sulawesi_grid(sample_size=sample_size)
        return grid
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating grid: {str(e)}")


@router.get(
    "/priority",
    response_model=List[PriorityArea],
    summary="Get ranked emergency priority areas in Sulawesi based on predicted flood risk",
)
def get_priorities(
    top_n: int = Query(default=10, ge=1, le=50, description="Number of priority areas")
):
    """
    Returns the highest risk Sulawesi sectors ranked by model-predicted flood probability.
    """
    return get_priority_areas(top_n=top_n)


@router.get(
    "/metrics",
    response_model=ModelMetricsResponse,
    summary="Get trained XGBoost model performance metrics and global feature importances",
)
def get_metrics():
    """
    Returns the test and validation metrics (ROC-AUC, PR-AUC, Recall) and global SHAP importances.
    """
    return get_model_metrics_summary()