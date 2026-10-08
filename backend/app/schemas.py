from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class FloodPredictionRequest(BaseModel):
    lon: float
    lat: float
    precip_1d: float = Field(..., description="Accumulated precipitation over 1 day (mm)")
    precip_3d: float = Field(..., description="Accumulated precipitation over 3 days (mm)")
    landcover: float = Field(..., description="Landcover classification code")
    elevation: float = Field(..., description="Elevation above sea level (m)")
    slope: float = Field(..., description="Terrain slope (degrees)")
    TWI: float = Field(..., description="Topographic Wetness Index")
    upstream_area_log: float = Field(..., description="Log-transformed upstream catchment area")
    aspect_sin: float = Field(..., description="Sine of terrain aspect angle")
    aspect_cos: float = Field(..., description="Cosine of terrain aspect angle")


class FloodPredictionResponse(BaseModel):
    flood_probability: float
    flood_probability_percent: float
    risk_level: str


class LocalShapContribution(BaseModel):
    feature: str
    label: str
    value: float
    shap_value: float
    direction: str  # "increases_risk" or "decreases_risk"
    percentage_impact: float
    description: str


class LocalShapResponse(BaseModel):
    base_value: float
    output_margin: float
    flood_probability: float
    flood_probability_percent: float
    risk_level: str
    contributions: List[LocalShapContribution]


class GridCell(BaseModel):
    id: str
    lon: float
    lat: float
    event_id: Optional[str] = None
    precip_1d: float
    precip_3d: float
    landcover: float
    elevation: float
    slope: float
    TWI: float
    upstream_area_log: float
    aspect_sin: float
    aspect_cos: float
    flood_probability: float
    flood_probability_percent: float
    risk_level: str
    target: Optional[int] = None
    location_name: str


class GridResponse(BaseModel):
    total_cells: int
    risk_counts: Dict[str, int]
    max_probability: float
    avg_probability: float
    bbox: List[float]
    events: List[str]
    cells: List[GridCell]


class PriorityArea(BaseModel):
    rank: int
    id: str
    lon: float
    lat: float
    flood_probability: float
    flood_probability_percent: float
    risk_level: str
    elevation: float
    precip_3d: float
    landcover: float
    twi: float
    reason: str
    location_name: str


class ModelMetricsResponse(BaseModel):
    model: str
    target: str
    features: List[str]
    dataset: Dict[str, Any]
    class_balance: Dict[str, Any]
    threshold: float
    metrics: Dict[str, Any]
    feature_importance: List[Dict[str, Any]]
    shap_importance: List[Dict[str, Any]]