"""
Unit tests for Chronos zero-shot time-series forecasting, onset, and peak detection.
"""
import unittest
import numpy as np

from backend.app.models.flood_timing import calculate_flood_timing
from backend.app.models.chronos_model import forecast_sector_temporal
from backend.app.models.water_level_proxy import compute_water_level_proxy_series


class TestChronosTiming(unittest.TestCase):
    def test_water_level_proxy_generation(self):
        proxy = compute_water_level_proxy_series(
            precip_1d=25.0,
            precip_3d=60.0,
            elevation=8.0,
            slope=1.5,
            twi=6.5,
            base_probability=0.45,
            context_hours=48,
            forecast_hours=24,
        )
        self.assertIn("context", proxy)
        self.assertEqual(len(proxy["context"]), 48)
        self.assertEqual(len(proxy["true_future"]), 24)
        self.assertTrue(np.all(proxy["context"] >= 0.0))

    def test_flood_timing_threshold_crossing(self):
        hours = np.arange(1, 25)
        # Series that crosses 0.50 at hour 3 and peaks at hour 7
        median_probs = np.array([0.2, 0.4, 0.55, 0.65, 0.75, 0.82, 0.90, 0.85, 0.70] + [0.4] * 15)
        q10_probs = np.maximum(0.1, median_probs - 0.15)
        q90_probs = np.minimum(0.99, median_probs + 0.10)

        timing = calculate_flood_timing(
            forecast_hours=hours,
            median_probs=median_probs,
            q10_probs=q10_probs,
            q90_probs=q90_probs,
            threshold=0.50,
        )

        self.assertEqual(timing["onset_hour"], 3)
        self.assertEqual(timing["peak_hour"], 7)
        self.assertEqual(timing["peak_probability"], 0.90)
        self.assertEqual(timing["onset_status"], "Imminent")

    def test_flood_timing_subthreshold_edge_case(self):
        hours = np.arange(1, 25)
        # Series that never reaches 0.50
        median_probs = np.full(24, 0.25)
        q10_probs = np.full(24, 0.10)
        q90_probs = np.full(24, 0.35)

        timing = calculate_flood_timing(
            forecast_hours=hours,
            median_probs=median_probs,
            q10_probs=q10_probs,
            q90_probs=q90_probs,
            threshold=0.50,
        )

        self.assertIsNone(timing["onset_hour"])
        self.assertEqual(timing["onset_status"], "Sub-threshold")
        self.assertIn("Sub-threshold", timing["onset_range"])

    def test_sector_temporal_forecast(self):
        dummy_cell = {
            "id": "SUL-TEST-01",
            "location_name": "Test Coastal Sector",
            "precip_1d": 35.0,
            "precip_3d": 80.0,
            "elevation": 5.0,
            "slope": 1.0,
            "TWI": 8.0,
            "flood_probability": 0.75,
        }

        res = forecast_sector_temporal(dummy_cell, horizon_hours=24, use_cache=False)
        self.assertEqual(res["sector_id"], "SUL-TEST-01")
        self.assertEqual(len(res["hourly_series"]), 24)
        self.assertGreaterEqual(res["peak_hour"], 1)
        self.assertIn("hourly_series", res)
        self.assertEqual(res["current_probability_percent"], 75.0)


if __name__ == "__main__":
    unittest.main()
