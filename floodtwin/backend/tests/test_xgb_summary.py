import unittest
from backend.app.models.xgb_model import (
    get_response_zones_summary,
    get_incidents_summary,
    get_priority_areas
)

class TestXGBModelSummary(unittest.TestCase):
    def test_summaries(self):
        zones = get_response_zones_summary(top_n=5)
        self.assertIsInstance(zones, list)
        incidents = get_incidents_summary()
        self.assertIsInstance(incidents, list)
        priorities = get_priority_areas(top_n=5)
        self.assertIsInstance(priorities, list)

if __name__ == "__main__":
    unittest.main()
