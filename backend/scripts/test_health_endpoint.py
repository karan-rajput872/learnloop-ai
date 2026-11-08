"""
Test suite validating /api/health endpoint structure and zero credential leakage.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestHealthEndpoint(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint_response_structure(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("status", data)
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)
        db_info = data["database"]
        
        self.assertIn("engine", db_info)
        self.assertIn("is_persistent", db_info)
        self.assertIn("environment_mode", db_info)
        
        # Verify engine and persistence match
        if db_info["engine"] == "sqlite":
            self.assertFalse(db_info["is_persistent"])
        elif db_info["engine"] == "postgresql":
            self.assertTrue(db_info["is_persistent"])
            
        # Security test: ensure no credential leakage in any field
        raw_text = response.text.lower()
        forbidden_keywords = ["password", "token", "secret", "neon.tech", "postgres://", "postgresql://", "owner"]
        for kw in forbidden_keywords:
            self.assertNotIn(kw, raw_text, f"Potential credential/connection leakage detected: {kw}")

if __name__ == "__main__":
    unittest.main()

