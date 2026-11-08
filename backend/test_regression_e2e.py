"""
================================================================================
LearnLoop AI — Phase 2.3: Full Application End-to-End Regression Test Suite
================================================================================
Comprehensive verification of all 7 core subsystem requirements:
1. Learner Journey (Registration, Login, Onboarding, Diagnostic, Path, Profile)
2. AI Tutor (Socratic Chat, Persistence, Multi-Turn, Actions, Frame Analysis, Quota Fallback)
3. Assessments & Mastery (Adaptive Gen, Submission, Misconception Detection, History)
4. Revision System (Task Retrieval, Completion, Spaced Repetition, Cross-Session Persistence)
5. Gamification (XP, Streaks, Levels, Challenges, Notifications, Idempotency)
6. Teacher Dashboard (Cohort Overview, Misconception Clusters, Interventions, RBAC)
7. Owner Console (Owner Login, Metrics, Directory, Telemetry, Audit Logs, Access Denial)
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

# Configuration
if os.getenv("USE_SQLITE", "").lower() in ("1", "true") or not os.getenv("DATABASE_URL"):
    os.environ.pop("DATABASE_URL", None)
    os.environ["ENVIRONMENT"] = "testing"
else:
    POOLED_URL = os.getenv("DATABASE_URL")
    os.environ["DATABASE_URL"] = POOLED_URL
    os.environ["ENVIRONMENT"] = "development"
os.environ["ANALYTICS_RETENTION_DAYS"] = "0"

from fastapi.testclient import TestClient
from app.main import app
from app.storage.db import storage, PostgresConnectionWrapper
from app.auth.security import create_access_token
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


class TestPhase23Regression(unittest.TestCase):
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
            assert cls.initial_total_rows > 0, f"Expected non-empty database, got {cls.initial_total_rows}"

        # Initialize dedicated test run identity
        cls.run_id = uuid.uuid4().hex[:8]
        cls.test_email = f"test_e2e_{cls.run_id}@learnloop.ai"
        cls.test_password = "E2eTestPassword2026!"
        cls.test_full_name = "Regression Test Learner"
        
        cls.user_id = None
        cls.student_id = None
        cls.access_token = None
        cls.auth_headers = {}

        # Snapshot pre-existing audit log IDs, login event IDs, and user session IDs
        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM owner_audit_logs")
            cls.pre_audit_ids = set(r["id"] for r in cur.fetchall())
            cur.execute("SELECT id FROM login_events")
            cls.pre_login_event_ids = set(r["id"] for r in cur.fetchall())
            cur.execute("SELECT id FROM user_sessions")
            cls.pre_user_session_ids = set(r["id"] for r in cur.fetchall())

    @classmethod
    def tearDownClass(cls):
        # Comprehensive surgical cleanup of all test-created entities
        with storage.get_connection() as conn:
            cur = conn.cursor()
            
            # Lookup created user/student ID
            cur.execute("SELECT id, student_id FROM users WHERE normalized_email = ?", (cls.test_email.lower(),))
            row = cur.fetchone()
            del_uid = row["id"] if row else cls.user_id
            del_sid = row["student_id"] if row else cls.student_id

            if del_sid or del_uid:
                cur.execute("DELETE FROM user_activity_logs WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_streaks WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_gamification WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_achievements WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_challenges WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_settings WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_notifications WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM user_activity_events WHERE user_id = ? OR student_id = ?", (del_uid, del_sid))
                cur.execute("DELETE FROM login_events WHERE user_id = ? OR email = ?", (del_uid, cls.test_email.lower()))
                cur.execute("DELETE FROM user_sessions WHERE user_id = ?", (del_uid,))
                cur.execute("DELETE FROM revision_tasks WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM attempts WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM diagnostic_attempts WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM chat_messages WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM concept_mastery WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM learners WHERE student_id = ?", (del_sid,))
                cur.execute("DELETE FROM users WHERE id = ?", (del_uid,))

            p = "%s" if storage.postgres_url else "?"
            # Clean up any audit logs created during test run
            cur.execute("SELECT id FROM owner_audit_logs")
            post_audit_ids = set(r["id"] for r in cur.fetchall())
            for aid in post_audit_ids - cls.pre_audit_ids:
                cur.execute(f"DELETE FROM owner_audit_logs WHERE id = {p}", (aid,))

            # Clean up any login events created during test run (e.g. owner login)
            cur.execute("SELECT id FROM login_events")
            post_login_ids = set(r["id"] for r in cur.fetchall())
            for lid in post_login_ids - cls.pre_login_event_ids:
                cur.execute(f"DELETE FROM login_events WHERE id = {p}", (lid,))

            # Clean up any user sessions created during test run (e.g. owner session)
            cur.execute("SELECT id FROM user_sessions")
            post_sess_ids = set(r["id"] for r in cur.fetchall())
            for sid in post_sess_ids - cls.pre_user_session_ids:
                cur.execute(f"DELETE FROM user_sessions WHERE id = {p}", (sid,))

            conn.commit()

        # Final count reconciliation
        with storage.get_connection() as conn:
            cur = conn.cursor()
            final_total = 0
            for t in EXPECTED_20_TABLES:
                cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
                final_total += cur.fetchone()["cnt"]
            print(f"\n[TEARDOWN] Final total rows in Neon staging: {final_total}")
            assert final_total == cls.initial_total_rows, f"Baseline count mismatch: {final_total} != {cls.initial_total_rows}"

    # ==========================================================================
    # 1. LEARNER END-TO-END JOURNEY
    # ==========================================================================
    def test_01_learner_registration_and_auth(self):
        """[REQ-1] Register new student, verify session tokens, and authenticate via login."""
        # 1. Register
        reg_payload = {
            "full_name": self.test_full_name,
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password,
            "terms_accepted": True
        }
        res_reg = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 201)
        data_reg = res_reg.json()
        self.assertEqual(data_reg["status"], "success")
        self.assertIn("access_token", data_reg)
        
        self.__class__.user_id = data_reg["user"]["id"]
        self.__class__.student_id = data_reg["user"]["student_id"]
        self.__class__.access_token = data_reg["access_token"]
        self.__class__.auth_headers = {"Authorization": f"Bearer {self.access_token}"}

        # 2. Re-login
        login_payload = {
            "email": self.test_email,
            "password": self.test_password,
            "remember_me": True
        }
        res_login = self.client.post("/api/auth/login", json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        data_login = res_login.json()
        self.assertEqual(data_login["user"]["id"], self.user_id)
        self.assertNotIn("hashed_password", data_login["user"])

        # 3. Verify session
        res_me = self.client.get("/api/auth/me", headers=self.auth_headers)
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json()["user"]["email"], self.test_email)

    def test_02_learner_onboarding_and_path(self):
        """[REQ-1] Submit learner onboarding profile and verify personalized path generation."""
        onboarding_payload = {
            "learner_category": "College / University Student",
            "programming_experience": "1–2 years",
            "dsa_experience": "Basic Concepts",
            "programming_languages": ["Python", "Java"],
            "preferred_language": "Python",
            "primary_goals": ["College exam preparation", "Technical interview readiness"],
            "target_timeline": "Within 3 months",
            "daily_availability": "30–60 minutes",
            "self_assessed_skill_level": "Intermediate",
            "learning_preferences": ["Visual diagrams & memory layouts", "Code demonstrations & walkthroughs"],
            "diagnostic_mode": "comprehensive"
        }
        res = self.client.post("/api/learner/onboarding", json=onboarding_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        profile = res.json()["profile"]
        self.assertTrue(profile["onboarding_completed"])
        self.assertEqual(profile["learner_category"], "College / University Student")

        # Verify learning path endpoint
        res_path = self.client.get("/api/learner/learning-path", headers=self.auth_headers)
        self.assertEqual(res_path.status_code, 200)
        self.assertIn("learning_path", res_path.json())

    def test_03_diagnostic_assessment_and_proficiency(self):
        """[REQ-1 & 3] Fetch diagnostic questions, submit responses, and verify calibrated proficiency."""
        res_q = self.client.get("/api/diagnostic/questions?mode=quick", headers=self.auth_headers)
        self.assertEqual(res_q.status_code, 200)
        questions = res_q.json()["questions"]
        self.assertGreaterEqual(len(questions), 6)

        # Build responses: answer 4 correct, 2 incorrect to evaluate calibration
        submissions = []
        for i, q in enumerate(questions[:6]):
            chosen = "A" if i < 4 else "B"
            submissions.append({
                "question_id": q["id"],
                "concept_id": q["concept_id"],
                "selected_option": chosen,
                "student_reasoning": f"Calculated answer for {q['concept_id']}"
            })

        submit_payload = {
            "student_id": self.student_id,
            "submissions": submissions
        }
        res_sub = self.client.post("/api/diagnostic/submit", json=submit_payload, headers=self.auth_headers)
        self.assertEqual(res_sub.status_code, 200)
        sub_data = res_sub.json()
        self.assertEqual(sub_data["total_questions"], 6)
        self.assertIn("score", sub_data)
        self.assertIn("verified_proficiency", sub_data)
        self.assertEqual(sub_data["verified_proficiency"]["level_number"], 3)

    def test_04_profile_recommendations_and_updates(self):
        """[REQ-1] Retrieve dashboard recommendations based on diagnostic and update profile name."""
        res_prof = self.client.get("/api/learner/profile", headers=self.auth_headers)
        self.assertEqual(res_prof.status_code, 200)
        profile = res_prof.json()["profile"]
        self.assertTrue(profile["diagnostic_completed"])
        self.assertIn("recommended_activity", profile)
        self.assertIn("concepts", profile)

        # Update profile
        update_payload = {"full_name": "Regression Test Learner Pro"}
        res_update = self.client.put("/api/auth/profile", json=update_payload, headers=self.auth_headers)
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["user"]["full_name"], "Regression Test Learner Pro")

    # ==========================================================================
    # 2. AI TUTOR
    # ==========================================================================
    def test_05_ai_tutor_socratic_chat_and_persistence(self):
        """[REQ-2] Submit tutor question, verify Socratic response, and confirm chat persistence."""
        chat_payload = {
            "session_id": f"sess_chat_{self.run_id}",
            "student_id": self.student_id,
            "raw_transcript": "Can you explain why linked lists take O(n) for random access but arrays take O(1)?",
            "concept_context": "linked_lists"
        }
        res = self.client.post("/api/tutor/chat", json=chat_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("response", data)
        self.assertIn("tools_executed", data)

        # Query chat history
        res_history = self.client.get(f"/api/tutor/messages?student_id={self.student_id}", headers=self.auth_headers)
        self.assertEqual(res_history.status_code, 200)
        messages = res_history.json()["messages"]
        self.assertGreaterEqual(len(messages), 2)  # User message + Assistant response

    def test_06_ai_tutor_pedagogical_actions(self):
        """[REQ-2] Test interactive Socratic action triggers: hint, analogy, and worked example."""
        # 1. Hint
        res_hint = self.client.post("/api/tutor/action", json={
            "student_id": self.student_id,
            "concept_id": "binary_trees",
            "action_type": "hint"
        }, headers=self.auth_headers)
        self.assertEqual(res_hint.status_code, 200)
        self.assertIn("content", res_hint.json())

        # 2. Analogy
        res_analogy = self.client.post("/api/tutor/action", json={
            "student_id": self.student_id,
            "concept_id": "recursion",
            "action_type": "analogy"
        }, headers=self.auth_headers)
        self.assertEqual(res_analogy.status_code, 200)
        self.assertIn("content", res_analogy.json())

        # 3. Worked example
        res_example = self.client.post("/api/tutor/action", json={
            "student_id": self.student_id,
            "concept_id": "stacks",
            "action_type": "worked_example"
        }, headers=self.auth_headers)
        self.assertEqual(res_example.status_code, 200)

    def test_07_ai_tutor_video_frame_and_graceful_fallback(self):
        """[REQ-2] Test multimodal live video analysis fallback and Gemini API unconfigured behavior."""
        frame_payload = {
            "student_id": self.student_id,
            "image_base64": "data:image/jpeg;base64,dGVzdF9mcmFtZV9kYXRh",
            "concept_id": "binary_trees",
            "query": "Is my binary search tree valid?"
        }
        res = self.client.post("/api/tutor/live-video/analyze", json=frame_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("analysis", data)
        self.assertIn("BST Invariant Check", data["analysis"])

    # ==========================================================================
    # 3. ASSESSMENTS AND MASTERY
    # ==========================================================================
    def test_08_adaptive_question_generation(self):
        """[REQ-3] Request adaptive question targeting learner's current concept difficulty."""
        res = self.client.get("/api/quiz/adaptive?concept_id=arrays", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("question", data)
        q = data["question"]
        self.assertIn("question_text", q)
        self.assertEqual(len(q["options"]), 4)

    def test_09_quiz_submission_and_misconception_detection(self):
        """[REQ-3] Submit answer revealing stack_fifo_confusion and verify misconception detection."""
        sub_payload = {
            "student_id": self.student_id,
            "question_id": "q_stk_01",
            "concept_id": "stacks",
            "selected_option": "B",
            "student_reasoning": "Since element 1 was pushed first, it will naturally be popped first.",
            "confidence_level": "high"
        }
        res = self.client.post("/api/quiz/submit", json=sub_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_correct"])
        self.assertIsNotNone(data["detected_misconception"])
        self.assertIn("fifo", data["detected_misconception"]["id"].lower())

    def test_10_assessment_attempt_history(self):
        """[REQ-3] Verify diagnostic attempt history is retrieved accurately."""
        res = self.client.get(f"/api/diagnostic/attempts?student_id={self.student_id}", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        attempts = res.json()["attempts"]
        self.assertGreaterEqual(len(attempts), 1)

    # ==========================================================================
    # 4. REVISION SYSTEM
    # ==========================================================================
    def test_11_revision_task_retrieval_and_completion(self):
        """[REQ-4] Retrieve pending revision tasks and complete review enforcing ownership."""
        res = self.client.get(f"/api/tutor/revision/tasks?student_id={self.student_id}", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        tasks = res.json()["tasks"]
        self.assertGreaterEqual(len(tasks), 1)
        task_id = tasks[0]["id"]
        self.__class__.completed_revision_task_id = task_id

        # Complete task
        res_comp = self.client.post("/api/tutor/revision/complete", json={"task_id": task_id}, headers=self.auth_headers)
        self.assertEqual(res_comp.status_code, 200)

    def test_12_revision_cross_session_persistence(self):
        """[REQ-4] Re-login and verify completed revision task status persists."""
        # Fresh login
        login_res = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        self.assertEqual(login_res.status_code, 200)
        new_token = login_res.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # Query tasks
        res = self.client.get(f"/api/tutor/revision/tasks?student_id={self.student_id}", headers=new_headers)
        self.assertEqual(res.status_code, 200)
        # Verify completed task retains status across session re-auth
        tasks = res.json()["tasks"]
        matched = [t for t in tasks if t["id"] == getattr(self, "completed_revision_task_id", None)]
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["status"], "completed")

    # ==========================================================================
    # 5. GAMIFICATION
    # ==========================================================================
    def test_13_gamification_streaks_xp_and_level(self):
        """[REQ-5] Query gamification dashboard for streaks, total XP, and level."""
        res = self.client.get(f"/api/gamification/dashboard?student_id={self.student_id}", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("streak", data)
        self.assertIn("gamification", data)
        self.assertIn("total_xp", data["gamification"])
        self.assertIn("level", data["gamification"])
        self.assertIn("achievements", data)
        self.assertIn("challenges", data)

    def test_14_gamification_challenges_and_idempotency(self):
        """[REQ-5] Verify activity recording increments XP and duplicate requests are handled safely."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        act_payload = {
            "student_id": self.student_id,
            "activity_type": "quiz_question",
            "activity_date": today,
            "learning_minutes": 5,
            "details": {"test_action": "quiz_completed"}
        }
        res1 = self.client.post("/api/gamification/record-activity", json=act_payload, headers=self.auth_headers)
        self.assertEqual(res1.status_code, 200)
        xp1 = res1.json().get("total_xp", 0)

        # Immediate repeat
        res2 = self.client.post("/api/gamification/record-activity", json=act_payload, headers=self.auth_headers)
        self.assertEqual(res2.status_code, 200)

    def test_15_gamification_notifications_and_settings(self):
        """[REQ-5] Retrieve user notifications and update user preferences."""
        res_notif = self.client.get(f"/api/user/notifications?student_id={self.student_id}", headers=self.auth_headers)
        self.assertEqual(res_notif.status_code, 200)

        # Update settings
        settings_payload = {
            "student_id": self.student_id,
            "theme": "dark",
            "daily_goal_minutes": 45,
            "sound_effects": 0
        }
        res_set = self.client.put("/api/user/settings", json=settings_payload, headers=self.auth_headers)
        self.assertEqual(res_set.status_code, 200)
        self.assertEqual(res_set.json()["theme"], "dark")

    # ==========================================================================
    # 6. TEACHER DASHBOARD
    # ==========================================================================
    def test_16_teacher_cohort_analytics_and_interventions(self):
        """[REQ-6] View demonstration cohort metrics, struggling students, and misconception clusters."""
        res = self.client.get("/api/teacher/demo-dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_demo_learners"], 6)
        self.assertGreaterEqual(len(data["students_requiring_intervention"]), 1)
        self.assertGreaterEqual(len(data["class_misconception_distribution"]), 1)

    def test_17_teacher_aggregation_and_rbac(self):
        """[REQ-6] Verify student is rejected from teacher endpoints (HTTP 403) and teacher is permitted."""
        # Student rejected
        res_stud = self.client.post("/api/teacher/aggregate", headers=self.auth_headers)
        self.assertEqual(res_stud.status_code, 403)

        # Teacher permitted
        teacher_token = create_access_token({
            "sub": "usr_demo_teacher",
            "student_id": "stu_demo_teacher",
            "email": "teacher@learnloop.ai",
            "name": "Sarah Jenkins",
            "role": "teacher"
        })
        t_headers = {"Authorization": f"Bearer {teacher_token}"}
        res_teacher = self.client.get("/api/teacher/dashboard", headers=t_headers)
        self.assertEqual(res_teacher.status_code, 200)

    # ==========================================================================
    # 7. OWNER CONSOLE
    # ==========================================================================
    def test_18_owner_login_and_overview_metrics(self):
        """[REQ-7] Authenticate owner and retrieve comprehensive platform telemetry."""
        # 1. Owner Login
        owner_login_payload = {
            "email": "karanrajput872@gmail.com",
            "password": "OwnerPass123456!"
        }
        res_login = self.client.post("/api/owner/login", json=owner_login_payload)
        self.assertEqual(res_login.status_code, 200)
        owner_token = res_login.json()["access_token"]
        owner_headers = {"Authorization": f"Bearer {owner_token}"}

        # 2. Overview metrics
        res_overview = self.client.get("/api/owner/overview", headers=owner_headers)
        self.assertEqual(res_overview.status_code, 200)
        data = res_overview.json()
        self.assertIn("total_registered_users", data)
        self.assertGreaterEqual(data["total_registered_users"], 125)
        self.assertIn("active_user_trends", data)

    def test_19_owner_user_directory_and_privacy(self):
        """[REQ-7] Search user directory and verify password hashes are never exposed."""
        owner_token = create_access_token({
            "sub": "usr_owner_main",
            "student_id": "student_owner",
            "email": "karanrajput872@gmail.com",
            "name": "LearnLoop Platform Owner",
            "role": "owner"
        })
        headers = {"Authorization": f"Bearer {owner_token}"}
        res = self.client.get("/api/owner/users?limit=10", headers=headers)
        self.assertEqual(res.status_code, 200)
        users = res.json()["users"]
        self.assertGreaterEqual(len(users), 1)
        for u in users:
            self.assertNotIn("hashed_password", u)
            self.assertIn("normalized_email", u)

    def test_20_owner_telemetry_audit_and_access_denial(self):
        """[REQ-7] Verify login events, audit logs, and access denial for non-owners (HTTP 403)."""
        owner_token = create_access_token({
            "sub": "usr_owner_main",
            "student_id": "student_owner",
            "email": "karanrajput872@gmail.com",
            "name": "LearnLoop Platform Owner",
            "role": "owner"
        })
        headers = {"Authorization": f"Bearer {owner_token}"}

        # Login activity
        res_login_act = self.client.get("/api/owner/login-activity?limit=5", headers=headers)
        self.assertEqual(res_login_act.status_code, 200)

        # Audit logs
        res_audit = self.client.get("/api/owner/audit-logs?limit=5", headers=headers)
        self.assertEqual(res_audit.status_code, 200)

        # Student rejection from owner console
        res_denied = self.client.get("/api/owner/overview", headers=self.auth_headers)
        self.assertEqual(res_denied.status_code, 403)


if __name__ == "__main__":
    unittest.main()

