"""
Temporal Forecasting API Router.

Integrates Chronos time-series zero-shot forecasting for onset and peak flood timing,
providing 24-hour predictive trajectories, uncertainty quantiles (p10, p50, p90),
and water level proxy estimates.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query

try:
    from floodtwin.backend.app.schemas import TemporalForecastResponse
    from floodtwin.backend.app.models.chronos_model import forecast_sector_temporal
    from floodtwin.backend.app.models.xgb_model import generate_sulawesi_grid
except ImportError:
    from backend.app.schemas import TemporalForecastResponse
    from backend.app.models.chronos_model import forecast_sector_temporal
    from backend.app.models.xgb_model import generate_sulawesi_grid

router = APIRouter(
    prefix="/temporal",
    tags=["Temporal Timing (Chronos)"],
)


@router.get(
    "/forecast/{sector_id}",
    response_model=TemporalForecastResponse,
    summary="Get 24-hour Chronos onset and peak forecast for a specific sector",
)
def get_sector_temporal_forecast(
    sector_id: str,
    horizon_hours: int = Query(default=24, ge=6, le=72, description="Forecast horizon in hours"),
):
    """
    Returns 24-hour hourly probability paths, water-level proxy, and zero-shot
    onset / peak timing calculated via Chronos-T5-Small / foundation emulator.
    """
    grid = generate_sulawesi_grid()
    cells = grid.get("cells", [])
    
    # Locate matching cell
    target_cell = next((c for c in cells if str(c.get("id")) == str(sector_id)), None)
    if not target_cell:
        # Fallback to closest match or first cell
        if cells:
            target_cell = cells[0]
        else:
            raise HTTPException(status_code=404, detail=f"Sector ID {sector_id} not found")

    forecast = forecast_sector_temporal(target_cell, horizon_hours=horizon_hours)
    return forecast


@router.get(
    "/forecast",
    response_model=TemporalForecastResponse,
    summary="Get Chronos onset and peak forecast for highest-risk or specified sector",
)
def get_temporal_forecast(
    sector_id: Optional[str] = Query(default=None, description="Optional Sector ID"),
    horizon_hours: int = Query(default=24, ge=6, le=72, description="Forecast horizon in hours"),
):
    """
    Returns temporal forecast for the specified sector or automatically selects
    the highest-risk sector across Sulawesi if none is specified.
    """
    grid = generate_sulawesi_grid()
    cells = grid.get("cells", [])
    if not cells:
        raise HTTPException(status_code=500, detail="Grid cells not initialized")

    if sector_id:
        target_cell = next((c for c in cells if str(c.get("id")) == str(sector_id)), None)
        if not target_cell:
            target_cell = max(cells, key=lambda c: c.get("flood_probability", 0.0))
    else:
        target_cell = max(cells, key=lambda c: c.get("flood_probability", 0.0))

    return forecast_sector_temporal(target_cell, horizon_hours=horizon_hours)
