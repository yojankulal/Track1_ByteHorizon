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


class WhatIfSimulationRequest(BaseModel):
    baseline_features: FloodPredictionRequest
    sim_precip_1d: float
    sim_precip_3d: float
    sim_elevation_adj: Optional[float] = 0.0


class WhatIfSimulationResponse(BaseModel):
    baseline_probability: float
    baseline_probability_percent: float
    baseline_risk_level: str
    scenario_probability: float
    scenario_probability_percent: float
    scenario_risk_level: str
    delta_percentage_points: float
    explanation: str


class LocalShapContribution(BaseModel):
    feature: str
    label: str
    value: float
    shap_value: float
    direction: str  # "increases_risk" or "decreases_risk"
    percentage_impact: float
    description: str


class LLMExplanation(BaseModel):
    headline: str
    simple_notice: str
    recommended_actions: List[str]
    key_factors: List[str]
    llm_status: str
    model_used: str


class LocalShapResponse(BaseModel):
    base_value: float
    output_margin: float
    flood_probability: float
    flood_probability_percent: float
    risk_level: str
    contributions: List[LocalShapContribution]
    llm_explanation: Optional[LLMExplanation] = None


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
    residing_zone_name: Optional[str] = None
    residing_zone_id: Optional[str] = None
    tipping_mm: Optional[float] = None
    tipping_margin_mm: Optional[float] = None
    rain_sensitivity: Optional[str] = None


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
    residing_zone_name: Optional[str] = None
    residing_zone_id: Optional[str] = None
    priority_score: Optional[float] = None
    priority_percent: Optional[float] = None
    rank_delta: Optional[int] = None
    rank_delta_label: Optional[str] = None
    factor_breakdown: Optional[Dict[str, Any]] = None
    nearest_critical_hub: Optional[Dict[str, Any]] = None


class ResponseZone(BaseModel):
    zone_id: str
    name: str
    rank: Optional[int] = None
    sector_count: int
    priority_score: float
    priority_percent: float
    peak_probability_percent: float
    rank_delta: int
    rank_delta_label: str
    reason: str
    centroid: List[float]
    bbox: List[float]
    factor_breakdown: Dict[str, Any]
    top_sectors: List[str]


class AlertIncident(BaseModel):
    incident_id: str
    name: str
    headline: str
    sector_count: int
    peak_probability: float
    peak_probability_percent: float
    avg_probability_percent: float
    onset: str
    peak: str
    top_drivers: List[str]
    action_line: str
    state: str  # "New" | "Escalated" | "Cleared"
    trend: str  # "▲ Intensifying" | "▶ Peak" | "▼ Receding"
    countdown: str
    centroid: List[float]
    bbox: List[float]
    sector_ids: List[str]


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