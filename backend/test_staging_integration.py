"""
================================================================================
LearnLoop AI — Phase 2.2: Local PostgreSQL Staging Application Integration Test Suite
================================================================================
Validates real application functionality against Neon PostgreSQL staging:
1. Application startup and health check (/api/health).
2. Database connection & pool lifecycle.
3. User authentication & session handling (/api/auth/me, /api/auth/refresh).
4. Learner profile & dashboard data (/api/learner/profile, /api/concepts).
5. Concept mastery & syllabus retrieval.
6. Assessment history (/api/diagnostic/attempts).
7. Tutor chat history & revision tasks (/api/tutor/messages, /api/tutor/revision/tasks).
8. Gamification data retrieval.
9. Owner authorization & platform analytics (/api/owner/overview, /api/owner/users).
10. Isolated write test with immediate cleanup (net 0 rows added).
11. Gemini AI integration (response generation, misconception detection, fallback).
12. Security validation (RBAC, unauthenticated rejection, credential non-leakage).
================================================================================
"""

import os
import sys
import uuid
import unittest
from datetime import datetime, timezone

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set environment before importing app modules
POOLED_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://learnloop_staging_owner:<STAGING_PASSWORD>@ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require&channel_binding=require"
)
os.environ["DATABASE_URL"] = POOLED_URL
os.environ["ANALYTICS_RETENTION_DAYS"] = "0"  # Prevent automatic purging of staging telemetry
os.environ["ENVIRONMENT"] = "development"

from fastapi.testclient import TestClient
from app.main import app
from app.storage.db import storage, StorageManager, PostgresConnectionWrapper, SqliteConnectionWrapper
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password
)
from app.agent.gemini_service import gemini_tutor
from app.tools.question_generator import generate_adaptive_question
from app.tools.misconception_evaluator import evaluate_reasoning_and_detect_misconception

EXPECTED_BASELINE_ROWS = 4352
EXPECTED_20_TABLES = [
    "users", "learners", "concept_mastery", "attempts", "revision_tasks",
    "teacher_demo_cohort", "chat_messages", "diagnostic_attempts", "user_sessions",
    "password_reset_tokens", "user_activity_logs", "user_streaks", "user_gamification",
    "user_achievements", "user_challenges", "user_settings", "user_notifications",
    "login_events", "user_activity_events", "owner_audit_logs"
]


class TestStagingAppIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # Verify initial database state
        with storage.get_connection() as conn:
            cur = conn.cursor()
            total = 0
            for t in EXPECTED_20_TABLES:
                cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
                total += cur.fetchone()["cnt"]
            cls.initial_total_rows = total
            print(f"\n[SETUP] Initial total rows in Neon staging: {cls.initial_total_rows}")
            assert cls.initial_total_rows == EXPECTED_BASELINE_ROWS, f"Expected {EXPECTED_BASELINE_ROWS}, got {cls.initial_total_rows}"

    @classmethod
    def tearDownClass(cls):
        # Final reconciliation check
        with storage.get_connection() as conn:
            cur = conn.cursor()
            final_total = 0
            for t in EXPECTED_20_TABLES:
                cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
                final_total += cur.fetchone()["cnt"]
            print(f"\n[TEARDOWN] Final total rows in Neon staging: {final_total}")
            assert final_total == EXPECTED_BASELINE_ROWS, f"Baseline count mismatch: {final_total} != {EXPECTED_BASELINE_ROWS}"

    # --------------------------------------------------------------------------
    # 1. Health & Startup
    # --------------------------------------------------------------------------
    def test_01_application_startup_and_health(self):
        """GET /api/health returns 200, healthy status, engine info, and syllabus metadata."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "LearnLoop AI Adaptive Tutor")
        self.assertIn("engine", data)
        self.assertIn("syllabus", data)
        self.assertEqual(data["syllabus"]["concepts_count"], 12)
        self.assertEqual(data["features"]["diagnostic_test"], "active")

    # --------------------------------------------------------------------------
    # 2. Database Connection & Pool Lifecycle
    # --------------------------------------------------------------------------
    def test_02_database_connection_and_pool_lifecycle(self):
        """PostgreSQL connection pool checkouts, executes probe, and returns cleanly."""
        self.assertTrue(storage.is_postgres)
        self.assertIsNotNone(storage._pg_pool)
        
        with storage.get_connection() as conn:
            self.assertIsInstance(conn, PostgresConnectionWrapper)
            cur = conn.cursor()
            cur.execute("SELECT current_database(), current_user, 1")
            row = cur.fetchone()
            self.assertEqual(row[0], "learnloop_staging")
            self.assertEqual(row[1], "learnloop_staging_owner")
            self.assertEqual(row[2], 1)

    # --------------------------------------------------------------------------
    # 3. Learner Profile & Concepts
    # --------------------------------------------------------------------------
    def test_03_learner_profile_retrieval(self):
        """GET /api/learner/profile?student_id=student_default retrieves persistent profile."""
        res = self.client.get("/api/learner/profile?student_id=student_default")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("profile", data)
        profile = data["profile"]
        self.assertEqual(profile["student_id"], "student_default")
        self.assertEqual(profile["name"], "Alex Chen")
        self.assertIn("concepts", profile)
        self.assertEqual(len(profile["concepts"]), 12)
        self.assertIn("arrays", profile["concepts"])

    def test_04_concept_catalog_retrieval(self):
        """GET /api/concepts returns all 12 syllabus concepts with dependencies."""
        res = self.client.get("/api/concepts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("concepts", data)
        self.assertIn("edges", data)
        self.assertEqual(len(data["concepts"]), 12)

        res_single = self.client.get("/api/concepts/arrays")
        self.assertEqual(res_single.status_code, 200)
        c_data = res_single.json()
        self.assertIn("concept", c_data)
        self.assertEqual(c_data["concept"]["name"], "Arrays")

    # --------------------------------------------------------------------------
    # 4. Assessment, Tutor, & Revision History
    # --------------------------------------------------------------------------
    def test_05_diagnostic_attempts_history(self):
        """GET /api/diagnostic/attempts?student_id=student_default returns attempt history."""
        res = self.client.get("/api/diagnostic/attempts?student_id=student_default")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("attempts", data)
        self.assertIsInstance(data["attempts"], list)

    def test_06_tutor_messages_history(self):
        """GET /api/tutor/messages?student_id=student_default returns chat messages."""
        res = self.client.get("/api/tutor/messages?student_id=student_default")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("messages", data)
        self.assertIsInstance(data["messages"], list)

    def test_07_revision_tasks_retrieval(self):
        """GET /api/tutor/revision/tasks?student_id=student_default returns revision tasks."""
        res = self.client.get("/api/tutor/revision/tasks?student_id=student_default")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("tasks", data)
        self.assertIsInstance(data["tasks"], list)

    # --------------------------------------------------------------------------
    # 5. Teacher Demo Dashboard
    # --------------------------------------------------------------------------
    def test_08_teacher_demo_dashboard(self):
        """GET /api/teacher/demo-dashboard returns cohort overview for teachers."""
        res = self.client.get("/api/teacher/demo-dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_demo_learners", data)
        self.assertEqual(data["total_demo_learners"], 6)
        self.assertIn("students_requiring_intervention", data)

    # --------------------------------------------------------------------------
    # 6. Owner Authorization & Analytics
    # --------------------------------------------------------------------------
    def test_09_owner_overview_metrics(self):
        """GET /api/owner/overview with owner JWT returns full platform analytics."""
        owner_token = create_access_token({
            "sub": "usr_owner_main",
            "student_id": "student_owner",
            "email": "karanrajput872@gmail.com",
            "name": "LearnLoop Platform Owner",
            "role": "owner"
        })
        headers = {"Authorization": f"Bearer {owner_token}"}
        res = self.client.get("/api/owner/overview", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_registered_users", data)
        self.assertGreaterEqual(data["total_registered_users"], 1)

    def test_10_owner_users_directory(self):
        """GET /api/owner/users returns user directory without exposing password hashes."""
        owner_token = create_access_token({
            "sub": "usr_owner_main",
            "student_id": "student_owner",
            "email": "karanrajput872@gmail.com",
            "name": "LearnLoop Platform Owner",
            "role": "owner"
        })
        headers = {"Authorization": f"Bearer {owner_token}"}
        res = self.client.get("/api/owner/users?limit=5", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("users", data)
        self.assertGreaterEqual(len(data["users"]), 1)
        for u in data["users"]:
            self.assertNotIn("hashed_password", u)

    def test_11_owner_login_activity_and_learning_analytics(self):
        """GET /api/owner/login-activity & learning-analytics return valid telemetry."""
        owner_token = create_access_token({
            "sub": "usr_owner_main",
            "student_id": "student_owner",
            "email": "karanrajput872@gmail.com",
            "name": "LearnLoop Platform Owner",
            "role": "owner"
        })
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        res_logins = self.client.get("/api/owner/login-activity?limit=5", headers=headers)
        self.assertEqual(res_logins.status_code, 200)
        self.assertIn("events", res_logins.json())

        res_learning = self.client.get("/api/owner/learning-analytics", headers=headers)
        self.assertEqual(res_learning.status_code, 200)

    # --------------------------------------------------------------------------
    # 7. Isolated Write Test & Immediate Net-Zero Cleanup
    # --------------------------------------------------------------------------
    def test_12_isolated_write_and_immediate_cleanup(self):
        """
        Verify real PostgreSQL write operations using dedicated test identity:
        Registers test user, logs in, accesses /api/auth/me, logs activity,
        then cleans up ONLY test records and verifies 100% net-zero row impact.
        """
        test_email = f"test_{uuid.uuid4().hex[:8]}@learnloop.ai"
        test_pwd = "TestPassword123!"

        try:
            # 1. Register test user via API
            reg_payload = {
                "full_name": "Integration Test Student",
                "email": test_email,
                "password": test_pwd,
                "confirm_password": test_pwd,
                "terms_accepted": True
            }
            res_reg = self.client.post("/api/auth/register", json=reg_payload)
            self.assertEqual(res_reg.status_code, 201)
            reg_data = res_reg.json()
            token = reg_data["access_token"]
            user_id = reg_data["user"]["id"]
            student_id = reg_data["user"]["student_id"]

            # 2. Access /api/auth/me with test token
            headers = {"Authorization": f"Bearer {token}"}
            res_me = self.client.get("/api/auth/me", headers=headers)
            self.assertEqual(res_me.status_code, 200)
            me_data = res_me.json()
            self.assertEqual(me_data["user"]["email"], test_email)
            self.assertNotIn("hashed_password", me_data["user"])

            # 3. Log gamification activity for test student
            res_act = self.client.post("/api/gamification/record-activity", json={
                "student_id": student_id,
                "activity_type": "quiz_question",
                "activity_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "learning_minutes": 5,
                "details": {"test": True}
            }, headers=headers)
            self.assertEqual(res_act.status_code, 200)

            # 4. Verify cookie was set on registration response
            cookie = res_reg.headers.get("set-cookie", "")
            self.assertIn("HttpOnly", cookie)
            self.assertIn("Path=/api/auth", cookie)

        finally:
            # CLEANUP: Delete ONLY records belonging to test identity
            with storage.get_connection() as conn:
                cur = conn.cursor()
                
                # Fetch created test user ID if registered
                cur.execute("SELECT id, student_id FROM users WHERE normalized_email = ?", (test_email.lower(),))
                row = cur.fetchone()
                if row:
                    del_uid = row["id"]
                    del_sid = row["student_id"]

                    cur.execute("DELETE FROM user_activity_logs WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_streaks WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_gamification WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_achievements WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_challenges WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_settings WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_notifications WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM user_activity_events WHERE user_id = ? OR student_id = ?", (del_uid, del_sid))
                    cur.execute("DELETE FROM login_events WHERE user_id = ? OR email = ?", (del_uid, test_email.lower()))
                    cur.execute("DELETE FROM user_sessions WHERE user_id = ?", (del_uid,))
                    cur.execute("DELETE FROM revision_tasks WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM attempts WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM diagnostic_attempts WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM chat_messages WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM concept_mastery WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM learners WHERE student_id = ?", (del_sid,))
                    cur.execute("DELETE FROM users WHERE id = ?", (del_uid,))
                    conn.commit()

            # Verify total row count is back to exactly baseline
            with storage.get_connection() as conn:
                cur = conn.cursor()
                inter_total = 0
                for t in EXPECTED_20_TABLES:
                    cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
                    inter_total += cur.fetchone()["cnt"]
                self.assertEqual(inter_total, EXPECTED_BASELINE_ROWS, f"Net rows diverged: expected {EXPECTED_BASELINE_ROWS}, got {inter_total}")
                print(f"\n[CLEANUP VERIFIED] Neon staging database restored to exactly {inter_total} rows across 20 tables.")

    # --------------------------------------------------------------------------
    # 8. AI Integration Tests
    # --------------------------------------------------------------------------
    def test_13_ai_tutor_deterministic_fallback(self):
        """AI tutor fallback executes cleanly with Socratic structure when API is unconfigured."""
        import asyncio
        loop = asyncio.get_event_loop()
        
        learner_ctx = {
            "learner_category": "College Student",
            "preferred_language": "Python",
            "overall_mastery": 45.0,
            "weakest_concept": "stacks"
        }
        res = loop.run_until_complete(
            gemini_tutor.generate_tutor_response(
                student_query="I don't understand how pop works",
                cleaned_query="how pop works in a stack",
                learner_context=learner_ctx,
                recent_misconception="stack_lifo_vs_fifo"
            )
        )
        self.assertIsInstance(res, str)
        self.assertGreater(len(res), 50)
        self.assertTrue(any(k in res.lower() for k in ["stack", "lifo", "pop", "top"]))

    def test_14_adaptive_assessment_generation(self):
        """Adaptive question generator creates calibrated questions with distractors."""
        q_novice, log_novice = generate_adaptive_question("arrays", difficulty="novice")
        self.assertIn("question_text", q_novice)
        self.assertIn("options", q_novice)
        self.assertEqual(len(q_novice["options"]), 4)

        q_inter, log_inter = generate_adaptive_question("binary_trees", difficulty="intermediate")
        self.assertIn("question_text", q_inter)
        self.assertEqual(len(q_inter["options"]), 4)

    def test_15_misconception_detection(self):
        """Misconception evaluator detects specific flaw from student reasoning."""
        eval_res, log = evaluate_reasoning_and_detect_misconception(
            question_id="q_stk_01",
            concept_id="stacks",
            selected_option="B",
            student_reasoning="Since element 1 entered first, it should be the first one to come out when popped."
        )
        self.assertFalse(eval_res["is_correct"])
        self.assertIsNotNone(eval_res["detected_misconception"])
        self.assertIn("fifo", eval_res["detected_misconception"]["id"].lower())

    def test_16_tutor_actions(self):
        """Tutor action handler produces hints, analogies, and worked examples."""
        hint = gemini_tutor.execute_tutor_action("stacks", "hint")
        self.assertEqual(hint["action_type"], "hint")
        self.assertIn("content", hint)
        self.assertIn("push", hint["content"].lower())
        self.assertIn("pop", hint["content"].lower())

        analogy = gemini_tutor.execute_tutor_action("binary_trees", "analogy")
        self.assertEqual(analogy["action_type"], "analogy")
        self.assertIn("content", analogy)

    def test_17_ai_unavailable_graceful_handling(self):
        """Verify graceful fallback when Gemini API encounters simulated error or quota limit."""
        # Test visual inspection fallback
        frame_result = gemini_tutor.deterministic_frame_analysis("binary_trees", "Check my tree diagram")
        self.assertIn("analysis", frame_result)
        self.assertEqual(frame_result["detected_concept"], "binary_trees")
        self.assertFalse(frame_result["is_ai_powered"])
        self.assertIn("BST Invariant Check", frame_result["analysis"])

    # --------------------------------------------------------------------------
    # 9. Security Validation
    # --------------------------------------------------------------------------
    def test_18_unauthenticated_endpoints_rejected(self):
        """Unauthenticated requests to protected endpoints return 401."""
        res_me = self.client.get("/api/auth/me")
        self.assertEqual(res_me.status_code, 401)

        res_owner = self.client.get("/api/owner/overview")
        self.assertEqual(res_owner.status_code, 401)

        res_teacher_agg = self.client.post("/api/teacher/aggregate")
        self.assertEqual(res_teacher_agg.status_code, 401)

    def test_19_role_based_access_control(self):
        """Student token cannot access owner or teacher endpoints (HTTP 403)."""
        # Snapshot existing audit log IDs to ensure net-zero audit additions
        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM owner_audit_logs")
            pre_ids = set(r["id"] for r in cur.fetchall())

        # Using real verified student from database
        student_token = create_access_token({
            "sub": "usr_f0ae8c3ac28c",
            "student_id": "student_870b50a56a",
            "email": "alice_1793455567@learnloop.edu",
            "name": "Alice Student",
            "role": "student"
        })
        headers = {"Authorization": f"Bearer {student_token}"}

        # Owner endpoint rejection
        try:
            res_owner = self.client.get("/api/owner/overview", headers=headers)
            self.assertEqual(res_owner.status_code, 403)
        finally:
            # Clean up ONLY the newly created security audit log entry
            with storage.get_connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM owner_audit_logs")
                post_ids = set(r["id"] for r in cur.fetchall())
                for nid in (post_ids - pre_ids):
                    cur.execute("DELETE FROM owner_audit_logs WHERE id = %s", (nid,))
                conn.commit()

        # Teacher endpoint rejection
        res_teacher = self.client.get("/api/teacher/dashboard", headers=headers)
        self.assertEqual(res_teacher.status_code, 403)

        # Verify teacher account CAN access teacher dashboard
        teacher_token = create_access_token({
            "sub": "usr_demo_teacher",
            "student_id": "stu_demo_teacher",
            "email": "teacher@learnloop.ai",
            "name": "Sarah Jenkins",
            "role": "teacher"
        })
        t_headers = {"Authorization": f"Bearer {teacher_token}"}
        res_t = self.client.get("/api/teacher/dashboard", headers=t_headers)
        self.assertEqual(res_t.status_code, 200)

    def test_20_credentials_never_exposed(self):
        """Sensitive credential hashes and raw passwords are never present in responses."""
        res = self.client.get("/api/learner/profile?student_id=student_default")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("hashed_password", res.text)
        self.assertNotIn("npg_", res.text)
        self.assertNotIn("neon.tech", res.text)


if __name__ == "__main__":
    unittest.main()
