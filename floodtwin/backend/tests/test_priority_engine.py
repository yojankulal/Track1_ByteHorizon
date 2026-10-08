import unittest
from backend.app.models.priority_engine import (
    calculate_multi_factor_priorities,
    get_response_zones,
    get_clustered_incidents,
)

class TestPriorityEngine(unittest.TestCase):
    def setUp(self):
        self.sample_cells = [
            {
                "id": "cell_1",
                "lat": -5.134,
                "lon": 119.493,
                "flood_probability": 0.92,
                "landcover": 13,
                "elevation": 5.0,
                "precip_3d": 50.0,
                "TWI": 12.0,
            },
            {
                "id": "cell_2",
                "lat": -5.135,
                "lon": 119.494,
                "flood_probability": 0.88,
                "landcover": 12,
                "elevation": 6.0,
                "precip_3d": 45.0,
                "TWI": 11.0,
            },
            {
                "id": "cell_3",
                "lat": -5.002,
                "lon": 119.574,
                "flood_probability": 0.65,
                "landcover": 4,
                "elevation": 15.0,
                "precip_3d": 30.0,
                "TWI": 8.0,
            },
            {
                "id": "cell_4",
                "lat": -4.786,
                "lon": 119.552,
                "flood_probability": 0.30,
                "landcover": 1,
                "elevation": 25.0,
                "precip_3d": 10.0,
                "TWI": 5.0,
            },
        ]

    def test_calculate_multi_factor_priorities(self):
        priorities = calculate_multi_factor_priorities(self.sample_cells, top_n=10)
        self.assertGreater(len(priorities), 0)
        self.assertIn("priority_score", priorities[0])
        self.assertIn("rank_delta", priorities[0])
        self.assertIn("factor_breakdown", priorities[0])

    def test_get_response_zones(self):
        zones = get_response_zones(self.sample_cells, top_n=10)
        self.assertGreater(len(zones), 0)
        self.assertIn("name", zones[0])
        self.assertIn("priority_score", zones[0])
        self.assertIn("factor_breakdown", zones[0])

    def test_get_clustered_incidents(self):
        incidents = get_clustered_incidents(self.sample_cells)
        self.assertGreater(len(incidents), 0)
        self.assertIn("incident_id", incidents[0])
        self.assertIn("onset", incidents[0])
        self.assertIn("peak", incidents[0])
        self.assertIn("action_line", incidents[0])
        self.assertIn("state", incidents[0])
        self.assertIn("trend", incidents[0])

if __name__ == "__main__":
    unittest.main()
