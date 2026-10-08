from pydantic import BaseModel, Field


class FloodPredictionRequest(BaseModel):

    lon: float
    lat: float

    precip_1d: float = Field(
        ...,
        description="Accumulated precipitation over 1 day"
    )

    precip_3d: float = Field(
        ...,
        description="Accumulated precipitation over 3 days"
    )

    landcover: float
    elevation: float
    slope: float
    TWI: float

    upstream_area_log: float

    aspect_sin: float
    aspect_cos: float


class FloodPredictionResponse(BaseModel):

    flood_probability: float
    flood_probability_percent: float
    risk_level: str