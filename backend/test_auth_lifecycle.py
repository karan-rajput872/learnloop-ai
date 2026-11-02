import os
import sys
import unittest
import tempfile
import shutil
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set test environment
os.environ["ENVIRONMENT"] = "testing"
os.environ["COOKIE_SECURE"] = "False"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-chars-long-12345"
os.environ.pop("DATABASE_URL", None)

from starlette.testclient import TestClient
from app.main import app
from app.storage import db
from app.storage.db import storage
from app.auth.security import create_access_token, decode_access_token, hash_password, verify_password

class TestAuthLifecycleAndEdgeCases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an isolated temporary SQLite database for this test run
        cls.temp_dir = tempfile.mkdtemp()
        cls.test_db_path = os.path.join(cls.temp_dir, "test_auth_lifecycle.db")
        
        # Override db path and connection
        db.DB_PATH = cls.test_db_path
        db.DB_DIR = cls.temp_dir
        storage.is_postgres = False
        storage._pg_pool = None
        storage.init_db()
        storage.ensure_default_learner()
        
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        storage.close()
        shutil.rmtree(cls.temp_dir, ignore_errors=True)

    def test_01_registration_atomic_success(self):
        """Test clean registration creates user and learner profile atomically."""
        email = "student1@example.com"
        pwd = "SecurePassword123!"
        resp = self.client.post("/api/auth/register", json={
            "email": email,
            "password": pwd,
            "confirm_password": pwd,
            "full_name": "Test Student 1",
            "terms_accepted": True
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], email)
        student_id = data["user"]["student_id"]
        self.assertTrue(student_id.startswith("student_"))
        
        # Verify HttpOnly cookie
        self.assertIn("refresh_token", resp.cookies)
        
        # Verify learner profile exists in DB
        learner = storage.get_learner_profile(student_id)
        self.assertIsNotNone(learner)
        self.assertEqual(learner["name"], "Test Student 1")
        self.assertEqual(learner["student_id"], student_id)
        self.assertEqual(len(learner.get("concepts", {})), 12)

        # Verify user in database
        user = storage.get_user_by_email(email)
        self.assertIsNotNone(user)
        self.assertEqual(user["student_id"], student_id)

    def test_02_duplicate_registration_returns_409(self):
        """Test duplicate registration returns 409 with exact expected message."""
        email = "student1@example.com"
        pwd = "SecurePassword123!"
        
        # Exact match
        resp = self.client.post("/api/auth/register", json={
            "email": email,
            "password": pwd,
            "confirm_password": pwd,
            "full_name": "Duplicate Student",
            "terms_accepted": True
        })
        self.assertEqual(resp.status_code, 409)
        self.assertIn("This account already exists. Please log in instead.", resp.json()["detail"])

        # Case-insensitive / whitespace variation
        resp_variation = self.client.post("/api/auth/register", json={
            "email": "  STUDENT1@EXAMPLE.COM  ",
            "password": pwd,
            "confirm_password": pwd,
            "full_name": "Duplicate Student Variation",
            "terms_accepted": True
        })
        self.assertEqual(resp_variation.status_code, 409)
        self.assertIn("This account already exists. Please log in instead.", resp_variation.json()["detail"])

    def test_03_login_credential_validation(self):
        """Test differentiated login responses for wrong password vs non-existent user."""
        # Non-existent user
        resp_no_user = self.client.post("/api/auth/login", json={
            "email": "does_not_exist@example.com",
            "password": "SomePassword123!"
        })
        self.assertEqual(resp_no_user.status_code, 401)
        self.assertIn("No account found with this email", resp_no_user.json()["detail"])

        # Existing user with incorrect password
        resp_bad_pwd = self.client.post("/api/auth/login", json={
            "email": "student1@example.com",
            "password": "WrongPassword999!"
        })
        self.assertEqual(resp_bad_pwd.status_code, 401)
        self.assertIn("Incorrect password. Please verify your password and try again.", resp_bad_pwd.json()["detail"])

        # Existing user with correct credentials and whitespace trimming
        resp_ok = self.client.post("/api/auth/login", json={
            "email": "  student1@example.com  ",
            "password": "SecurePassword123!"
        })
        self.assertEqual(resp_ok.status_code, 200)
        data = resp_ok.json()
        self.assertEqual(data["user"]["email"], "student1@example.com")
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", resp_ok.cookies)

    def test_04_token_expiration_and_refresh_rotation(self):
        """Test access token expiration structure and refresh token rotation."""
        login_resp = self.client.post("/api/auth/login", json={
            "email": "student1@example.com",
            "password": "SecurePassword123!"
        })
        access_token = login_resp.json()["access_token"]
        refresh_cookie_1 = login_resp.cookies.get("refresh_token")
        
        # Inspect access token expiration
        payload = decode_access_token(access_token)
        self.assertIsNotNone(payload)
        exp_time = payload["exp"]
        iat_time = payload["iat"]
        # Standard access token duration is 15 minutes (900 seconds)
        self.assertAlmostEqual(exp_time - iat_time, 900, delta=10)

        # Refresh token rotation via HttpOnly cookie
        client_refresh = TestClient(app, cookies={"refresh_token": refresh_cookie_1})
        refresh_resp = client_refresh.post("/api/auth/refresh", json={})
        self.assertEqual(refresh_resp.status_code, 200)
        
        refresh_cookie_2 = refresh_resp.cookies.get("refresh_token")
        self.assertIsNotNone(refresh_cookie_2)
        self.assertNotEqual(refresh_cookie_1, refresh_cookie_2)

    def test_05_multi_tab_grace_window_prevents_cascading_revocation(self):
        """Test that multi-tab refresh within the 120s grace window succeeds."""
        # Initial login
        login_resp = self.client.post("/api/auth/login", json={
            "email": "student1@example.com",
            "password": "SecurePassword123!"
        })
        old_refresh_cookie = login_resp.cookies.get("refresh_token")
        
        # Tab 1 performs refresh -> rotates token
        client_tab1 = TestClient(app, cookies={"refresh_token": old_refresh_cookie})
        resp_tab1 = client_tab1.post("/api/auth/refresh", json={})
        self.assertEqual(resp_tab1.status_code, 200)
        tab1_new_cookie = resp_tab1.cookies.get("refresh_token")
        self.assertNotEqual(old_refresh_cookie, tab1_new_cookie)
        
        # Tab 2 was open in background and still holds old_refresh_cookie!
        # Tab 2 refreshes 1 second later:
        client_tab2 = TestClient(app, cookies={"refresh_token": old_refresh_cookie})
        resp_tab2 = client_tab2.post("/api/auth/refresh", json={})
        
        # Should succeed because it is within the 120-second grace window
        self.assertEqual(resp_tab2.status_code, 200)
        self.assertIn("access_token", resp_tab2.json())
        
        # Neither tab's session was revoked!
        client_tab1_again = TestClient(app, cookies={"refresh_token": tab1_new_cookie})
        resp_active = client_tab1_again.post("/api/auth/refresh", json={})
        self.assertEqual(resp_active.status_code, 200)

    def test_06_explicit_logout_revokes_session(self):
        """Test explicit logout terminates session and invalidates refresh token."""
        login_resp = self.client.post("/api/auth/login", json={
            "email": "student1@example.com",
            "password": "SecurePassword123!"
        })
        token = login_resp.json()["access_token"]
        refresh_cookie = login_resp.cookies.get("refresh_token")

        # Logout with auth header
        client = TestClient(app, cookies={"refresh_token": refresh_cookie})
        logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_resp.status_code, 200)

        # Attempting refresh after explicit logout must fail
        post_logout_refresh = client.post("/api/auth/refresh", json={})
        self.assertEqual(post_logout_refresh.status_code, 401)

    def test_07_atomic_registration_rollback_on_failure(self):
        """Test that if learner profile initialization fails, the user record is rolled back cleanly."""
        email = "fail_test@example.com"
        pwd = "SecurePassword123!"
        
        # Simulate an exception in ensure_learner
        with patch.object(storage, 'ensure_learner', side_effect=RuntimeError("Simulated disk error during learner profile creation")):
            resp = self.client.post("/api/auth/register", json={
                "email": email,
                "password": pwd,
                "confirm_password": pwd,
                "full_name": "Rollback Test",
                "terms_accepted": True
            })
            self.assertEqual(resp.status_code, 500)
        
        # Verify user was cleanly rolled back and does NOT exist in users table
        user = storage.get_user_by_email(email)
        self.assertIsNone(user, "User record must have been deleted by compensating cleanup")

        # Now regular registration for that same email must succeed without 409 conflict
        resp_retry = self.client.post("/api/auth/register", json={
            "email": email,
            "password": pwd,
            "confirm_password": pwd,
            "full_name": "Rollback Test Recovered",
            "terms_accepted": True
        })
        self.assertEqual(resp_retry.status_code, 201)

    def test_08_cold_start_503_simulation(self):
        """Test that a database connection failure during login returns 503 rather than corrupting state."""
        with patch.object(storage, 'get_user_by_email', side_effect=Exception("Database cold boot / network timeout")):
            resp = self.client.post("/api/auth/login", json={
                "email": "student1@example.com",
                "password": "SecurePassword123!"
            })
            self.assertEqual(resp.status_code, 503)
            self.assertIn("Database service temporarily unavailable", resp.json()["detail"])

if __name__ == "__main__":
    unittest.main()
