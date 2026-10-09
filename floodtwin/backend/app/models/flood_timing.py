"""
Flood Timing Module: Onset and Peak Calculations.

Computes defensible zero-shot timing metrics from forecasted time series
(Chronos probabilistic samples or quantile paths):
- Onset: First timestep where forecast probability or water level crosses threshold.
- Peak: Timestep where the forecast reaches its global maximum.
- Uncertainty ranges derived from 10th and 90th quantile forecast paths.
"""
from typing import Dict, Any, Optional, List
import numpy as np


def calculate_flood_timing(
    forecast_hours: np.ndarray,
    median_probs: np.ndarray,
    q10_probs: np.ndarray,
    q90_probs: np.ndarray,
    threshold: float = 0.50,
) -> Dict[str, Any]:
    """
    Computes onset, peak, and uncertainty ranges from 24-hour forecasted probability paths.

    Args:
        forecast_hours: Array of forecast hour offsets (e.g. 1..24).
        median_probs: 50th percentile (median) probability forecast.
        q10_probs: 10th percentile (conservative/low) probability forecast.
        q90_probs: 90th percentile (aggressive/high) probability forecast.
        threshold: Threshold probability for calling an area flooded (default 0.50).

    Returns:
        Dict with onset_hour, onset_range, peak_hour, peak_range, peak_prob, etc.
    """
    # 1. Onset Detection
    # First timestep where median probability >= threshold
    onset_idx = None
    median_crossings = np.where(median_probs >= threshold)[0]
    if len(median_crossings) > 0:
        onset_idx = int(median_crossings[0])

    # Aggressive (q90) onset and conservative (q10) onset for uncertainty range
    q90_crossings = np.where(q90_probs >= threshold)[0]
    q10_crossings = np.where(q10_probs >= threshold)[0]

    early_onset_h = int(forecast_hours[q90_crossings[0]]) if len(q90_crossings) > 0 else None
    late_onset_h = int(forecast_hours[q10_crossings[0]]) if len(q10_crossings) > 0 else None

    if onset_idx is not None:
        onset_hour = int(forecast_hours[onset_idx])
        min_h = early_onset_h if early_onset_h is not None else max(1, onset_hour - 1)
        max_h = late_onset_h if late_onset_h is not None else onset_hour + 2
        onset_range_str = f"+{min_h}h – +{max_h}h"
        onset_str = f"+{onset_hour}h 00m"
        onset_status = "Imminent" if onset_hour <= 3 else "Expected"
    else:
        onset_hour = None
        onset_range_str = "None (Sub-threshold)"
        onset_str = "No Flood Onset"
        onset_status = "Sub-threshold"

    # 2. Peak Detection
    peak_idx = int(np.argmax(median_probs))
    peak_hour = int(forecast_hours[peak_idx])
    peak_prob = float(median_probs[peak_idx])

    # Peak uncertainty range from q10 and q90 maximums
    peak_q90_idx = int(np.argmax(q90_probs))
    peak_q10_idx = int(np.argmax(q10_probs))
    peak_early = min(forecast_hours[peak_q90_idx], forecast_hours[peak_q10_idx], peak_hour)
    peak_late = max(forecast_hours[peak_q90_idx], forecast_hours[peak_q10_idx], peak_hour)
    peak_range_str = f"+{int(peak_early)}h – +{int(peak_late)}h"
    peak_str = f"+{peak_hour}h 00m"

    return {
        "onset_hour": onset_hour,
        "onset_str": onset_str,
        "onset_range": onset_range_str,
        "onset_status": onset_status,
        "peak_hour": peak_hour,
        "peak_str": peak_str,
        "peak_range": peak_range_str,
        "peak_probability": round(peak_prob, 4),
        "peak_probability_percent": round(peak_prob * 100, 1),
    }
