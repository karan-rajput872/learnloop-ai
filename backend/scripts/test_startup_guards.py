"""
Test suite validating StorageManager production startup guards and health checks.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from unittest.mock import patch
from app.storage.db import StorageManager, is_production_environment

class TestProductionStartupGuards(unittest.TestCase):

    def setUp(self):
        # Save original environment
        self.original_env = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_production_flag_detection(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            self.assertTrue(is_production_environment())
        with patch.dict(os.environ, {"ENVIRONMENT": "prod"}):
            self.assertTrue(is_production_environment())
        with patch.dict(os.environ, {"RENDER": "true", "ENVIRONMENT": ""}):
            self.assertTrue(is_production_environment())
        with patch.dict(os.environ, {"RENDER_SERVICE_ID": "srv-12345", "ENVIRONMENT": ""}):
            self.assertTrue(is_production_environment())
        with patch.dict(os.environ, {"ENVIRONMENT": "development", "RENDER": "", "RENDER_SERVICE_ID": ""}):
            self.assertFalse(is_production_environment())
        with patch.dict(os.environ, {"ENVIRONMENT": "testing", "RENDER": "", "RENDER_SERVICE_ID": ""}):
            self.assertFalse(is_production_environment())

    def test_production_missing_database_url_raises(self):
        env = {"ENVIRONMENT": "production", "DATABASE_URL": "", "RENDER": "", "RENDER_SERVICE_ID": ""}
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(RuntimeError) as ctx:
                StorageManager()
            self.assertIn("CRITICAL DATABASE CONFIGURATION ERROR", str(ctx.exception))
            self.assertIn("DATABASE_URL is not set", str(ctx.exception))

    def test_production_sqlite_scheme_raises(self):
        env = {"ENVIRONMENT": "production", "DATABASE_URL": "sqlite:///data/learnloop.db", "RENDER": "", "RENDER_SERVICE_ID": ""}
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(RuntimeError) as ctx:
                StorageManager()
            self.assertIn("CRITICAL DATABASE CONFIGURATION ERROR", str(ctx.exception))
            self.assertIn("strictly prohibits SQLite in production", str(ctx.exception))

    def test_production_local_path_raises(self):
        env = {"ENVIRONMENT": "production", "DATABASE_URL": "data/learnloop.db", "RENDER": "", "RENDER_SERVICE_ID": ""}
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(RuntimeError) as ctx:
                StorageManager()
            self.assertIn("Expected postgresql:// or postgres://", str(ctx.exception))

    def test_render_flag_sqlite_raises(self):
        env = {"RENDER": "true", "DATABASE_URL": "sqlite:///ephemeral.db", "ENVIRONMENT": ""}
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(RuntimeError) as ctx:
                StorageManager()
            self.assertIn("CRITICAL DATABASE CONFIGURATION ERROR", str(ctx.exception))
            self.assertIn("strictly prohibits SQLite in production", str(ctx.exception))

    def test_development_allows_sqlite(self):
        env = {"ENVIRONMENT": "development", "DATABASE_URL": "", "RENDER": "", "RENDER_SERVICE_ID": ""}
        with patch.dict(os.environ, env, clear=True):
            mgr = StorageManager()
            self.assertFalse(mgr.is_postgres)

    def test_testing_allows_sqlite(self):
        env = {"ENVIRONMENT": "testing", "DATABASE_URL": "", "RENDER": "", "RENDER_SERVICE_ID": ""}
        with patch.dict(os.environ, env, clear=True):
            mgr = StorageManager()
            self.assertFalse(mgr.is_postgres)

if __name__ == "__main__":
    unittest.main()
