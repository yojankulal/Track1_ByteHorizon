"""
Water Level Proxy Module for FloodTwin.

Chronos forecasts a single univariate series. Since real-time gauge sensors
are unavailable across all Sulawesi sectors, we construct a defensible
physics-informed "water level proxy" h(t) [meters] derived from:
  1. Antecedent and rolling rainfall (short-term surge and accumulation)
  2. Topographic drainage constraints (TWI, slope, elevation)
  3. Coastal tidal cycles (semi-diurnal tide component based on coastal proximity)
"""
import math
from typing import Dict, Any, List
import numpy as np

# Semi-diurnal tidal period ~ 12.42 hours
TIDE_PERIOD_HOURS = 12.42
FLOOD_THRESHOLD_METERS = 1.20  # Equivalent to flood probability ~ 0.50


def compute_water_level_proxy_series(
    precip_1d: float,
    precip_3d: float,
    elevation: float,
    slope: float,
    twi: float,
    base_probability: float,
    context_hours: int = 48,
    forecast_hours: int = 24,
    random_seed: int = 42,
) -> Dict[str, np.ndarray]:
    """
    Generates a realistic 48-hour historical context series and 24-hour forward
    simulation of the water level proxy for a given sector.
    
    Returns:
        dict containing:
            - 'context': 1D array of length context_hours (t = -47 .. 0)
            - 'true_future': 1D array of length forecast_hours (t = 1 .. 24)
            - 'rainfall_profile': hourly rainfall intensity
    """
    rng = np.random.default_rng(random_seed + int(elevation * 10))

    # Drainage retention factor: high TWI + low slope + low elevation = water pools quickly and drains slowly
    retention = np.clip((twi / 12.0) * (1.0 / max(slope, 0.5)) * (50.0 / max(elevation + 1.0, 1.0)), 0.2, 3.5)
    
    # Tidal amplitude: higher near sea level
    is_coastal = elevation < 25.0
    tide_amp = max(0.0, (25.0 - elevation) / 25.0 * 0.8) if is_coastal else 0.05

    total_hours = context_hours + forecast_hours
    t_axis = np.arange(-context_hours + 1, forecast_hours + 1)  # -47 to +24

    # Synthetic storm hyetograph (rainfall pulse arriving around t = -6h to +6h)
    peak_storm_hour = rng.integers(-4, 4)
    storm_sigma = rng.uniform(4.0, 7.0)
    
    hourly_rain = (precip_1d / 12.0) * np.exp(-0.5 * ((t_axis - peak_storm_hour) / storm_sigma) ** 2)
    hourly_rain += np.maximum(0, rng.normal(0, 0.3, size=total_hours))

    # Hydrograph response: convolution of rainfall with retention decay
    water_level = np.zeros(total_hours)
    current_level = base_probability * 1.5  # initialize from current XGBoost state
    
    for i, t in enumerate(t_axis):
        rain_inflow = hourly_rain[i] * 0.08 * retention
        # Tide component
        tide = tide_amp * math.sin(2.0 * math.pi * t / TIDE_PERIOD_HOURS)
        # Drain rate
        drain_rate = 0.05 * (1.0 / retention)
        current_level = max(0.0, current_level * (1.0 - drain_rate) + rain_inflow + tide * 0.02)
        # Add small physical noise
        noise = float(rng.normal(0, 0.02))
        water_level[i] = round(max(0.0, current_level + tide + noise), 3)

    return {
        "context": water_level[:context_hours],
        "true_future": water_level[context_hours:],
        "hourly_rain": hourly_rain[context_hours:],
        "t_axis_forecast": np.arange(1, forecast_hours + 1),
    }
