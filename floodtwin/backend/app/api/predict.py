from fastapi import APIRouter

from backend.app.schemas import (
    FloodPredictionRequest,
    FloodPredictionResponse,
)

from backend.app.models.xgb_model import predict_flood_probability


router = APIRouter(
    prefix="/predict",
    tags=["Prediction"],
)


def get_risk_level(probability: float) -> str:

    if probability < 0.20:
        return "Low"

    if probability < 0.50:
        return "Moderate"

    if probability < 0.75:
        return "High"

    return "Critical"


@router.post(
    "/flood",
    response_model=FloodPredictionResponse,
)
def predict_flood(request: FloodPredictionRequest):

    probability = predict_flood_probability(
        request.model_dump()
    )

    return FloodPredictionResponse(
        flood_probability=probability,
        flood_probability_percent=probability * 100,
        risk_level=get_risk_level(probability),
    )