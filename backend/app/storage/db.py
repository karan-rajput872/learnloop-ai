import os
import json
import sqlite3
import uuid
import csv
import io
import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple
from app.dsa.syllabus import DSA_CONCEPTS

logger = logging.getLogger(__name__)

# Database Storage Configuration
# Supports custom persistent path (e.g. Render Persistent Disk mounted at /var/data/learnloop.db)
CUSTOM_DB_PATH = os.getenv("DATABASE_PATH") or os.getenv("SQLITE_PATH")
if CUSTOM_DB_PATH:
    DB_PATH = os.path.abspath(CUSTOM_DB_PATH)
    DB_DIR = os.path.dirname(DB_PATH)
else:
    DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
    DB_PATH = os.path.join(DB_DIR, "learnloop.db")
JSON_FALLBACK = os.path.join(DB_DIR, "learner_store.json")

class StorageManager:
    def __init__(self):
        os.makedirs(DB_DIR, exist_ok=True)
        self.init_sqlite()
        self.ensure_default_learner()
        self.ensure_teacher_demo_cohort()
        self.ensure_demo_teacher()
        self.ensure_owner_bootstrap()
        self.backfill_historical_analytics()

    def get_connection(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def init_sqlite(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Profiles table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learners (
                    student_id TEXT PRIMARY KEY,
                    name TEXT,
                    target_exam TEXT,
                    overall_mastery REAL,
                    diagnostic_completed INTEGER,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            # Concept mastery table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS concept_mastery (
                    student_id TEXT,
                    concept_id TEXT,
                    concept_name TEXT,
                    category TEXT,
                    mastery_percentage REAL,
                    questions_attempted INTEGER,
                    correct_answers INTEGER,
                    incorrect_answers INTEGER,
                    current_difficulty TEXT,
                    last_misconception TEXT,
                    last_misconception_name TEXT,
                    last_practiced_at TEXT,
                    next_revision_at TEXT,
                    consecutive_correct INTEGER,
                    PRIMARY KEY (student_id, concept_id)
                )
            """)
            # Submission attempt history
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT,
                    question_id TEXT,
                    concept_id TEXT,
                    selected_option TEXT,
                    is_correct INTEGER,
                    student_reasoning TEXT,
                    detected_misconception TEXT,
                    score_delta REAL,
                    timestamp TEXT
                )
            """)
            # Revision schedule table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS revision_tasks (
                    id TEXT PRIMARY KEY,
                    student_id TEXT,
                    concept_id TEXT,
                    concept_name TEXT,
                    due_date TEXT,
                    status TEXT,
                    reason TEXT,
                    urgency TEXT
                )
            """)
            # Teacher demonstration cohorts
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS teacher_demo_cohort (
                    student_id TEXT PRIMARY KEY,
                    name TEXT,
                    overall_mastery REAL,
                    weakest_concept TEXT,
                    primary_misconception TEXT,
                    days_inactive INTEGER,
                    needs_intervention INTEGER,
                    data_json TEXT
                )
            """)
            # Persistent Tutor Chat Messages
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    student_id TEXT,
                    role TEXT,
                    content TEXT,
                    metadata_json TEXT,
                    timestamp TEXT
                )
            """)
            # Diagnostic Assessment Attempts History
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS diagnostic_attempts (
                    id TEXT PRIMARY KEY,
                    student_id TEXT,
                    score INTEGER,
                    total_questions INTEGER,
                    percentage REAL,
                    concept_results TEXT,
                    question_details TEXT,
                    timestamp TEXT
                )
            """)
            # Authentication: Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    student_id TEXT UNIQUE,
                    full_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    normalized_email TEXT NOT NULL UNIQUE,
                    hashed_password TEXT,
                    google_sub TEXT UNIQUE,
                    auth_provider TEXT NOT NULL DEFAULT 'local',
                    role TEXT NOT NULL DEFAULT 'student',
                    is_email_verified INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_login_at TEXT
                )
            """)
            # Authentication: User sessions / Refresh tokens
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    refresh_token_hash TEXT NOT NULL UNIQUE,
                    device_info TEXT,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    last_used_at TEXT NOT NULL,
                    revoked_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            # Authentication: Password reset tokens
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    expires_at TEXT NOT NULL,
                    used_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Schema upgrade for concurrent refresh coordination & grace window
            cursor.execute("PRAGMA table_info(user_sessions)")
            session_cols = [c[1] for c in cursor.fetchall()]
            if "previous_token_hash" not in session_cols:
                cursor.execute("ALTER TABLE user_sessions ADD COLUMN previous_token_hash TEXT")
            if "rotated_at" not in session_cols:
                cursor.execute("ALTER TABLE user_sessions ADD COLUMN rotated_at TEXT")

            # Schema upgrade for users is_demo flag
            cursor.execute("PRAGMA table_info(users)")
            user_cols = [c[1] for c in cursor.fetchall()]
            if "is_demo" not in user_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN is_demo INTEGER DEFAULT 0")

            # Schema upgrade for learners onboarding & verified proficiency
            cursor.execute("PRAGMA table_info(learners)")
            learner_cols = [c[1] for c in cursor.fetchall()]
            if "onboarding_completed" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN onboarding_completed INTEGER DEFAULT 0")
            if "onboarding_completed_at" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN onboarding_completed_at TEXT")
            if "learner_category" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN learner_category TEXT")
            if "onboarding_data" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN onboarding_data TEXT")
            if "verified_proficiency_level" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN verified_proficiency_level TEXT DEFAULT 'Level 1 — Beginner'")
            if "verified_proficiency_score" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN verified_proficiency_score REAL DEFAULT 0.0")
            if "learning_path_json" not in learner_cols:
                cursor.execute("ALTER TABLE learners ADD COLUMN learning_path_json TEXT")

            # Gamification: Activity logs for streaks and engagement tracking
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_activity_logs (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    activity_type TEXT NOT NULL,
                    activity_date TEXT NOT NULL,
                    qualifying INTEGER NOT NULL DEFAULT 1,
                    learning_minutes INTEGER DEFAULT 5,
                    details_json TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_student_date ON user_activity_logs(student_id, activity_date)")

            # Gamification: Daily streaks
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_streaks (
                    student_id TEXT PRIMARY KEY,
                    current_streak INTEGER NOT NULL DEFAULT 0,
                    longest_streak INTEGER NOT NULL DEFAULT 0,
                    last_activity_date TEXT,
                    total_active_days INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                )
            """)

            # Gamification: XP and Level
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_gamification (
                    student_id TEXT PRIMARY KEY,
                    total_xp INTEGER NOT NULL DEFAULT 0,
                    level INTEGER NOT NULL DEFAULT 1,
                    updated_at TEXT NOT NULL
                )
            """)

            # Gamification: Achievements
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_achievements (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    achievement_id TEXT NOT NULL,
                    unlocked INTEGER NOT NULL DEFAULT 0,
                    progress_current INTEGER NOT NULL DEFAULT 0,
                    progress_target INTEGER NOT NULL DEFAULT 1,
                    unlocked_at TEXT,
                    UNIQUE(student_id, achievement_id)
                )
            """)

            # Gamification: Daily and Weekly Challenges
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_challenges (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    challenge_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    challenge_type TEXT NOT NULL,
                    current_count INTEGER NOT NULL DEFAULT 0,
                    target_count INTEGER NOT NULL DEFAULT 1,
                    xp_reward INTEGER NOT NULL DEFAULT 15,
                    completed INTEGER NOT NULL DEFAULT 0,
                    completed_at TEXT,
                    period_key TEXT NOT NULL
                )
            """)

            # Settings: User preferences
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_settings (
                    student_id TEXT PRIMARY KEY,
                    theme TEXT NOT NULL DEFAULT 'light',
                    timezone TEXT NOT NULL DEFAULT 'UTC',
                    daily_goal_minutes INTEGER NOT NULL DEFAULT 30,
                    preferred_study_days TEXT NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
                    reminder_notifications INTEGER NOT NULL DEFAULT 1,
                    revision_reminders INTEGER NOT NULL DEFAULT 1,
                    streak_reminders INTEGER NOT NULL DEFAULT 1,
                    sound_effects INTEGER NOT NULL DEFAULT 1,
                    updated_at TEXT NOT NULL
                )
            """)

            # Notifications: In-app notifications
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_notifications (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    notification_type TEXT NOT NULL DEFAULT 'info',
                    action_tab TEXT,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """)

            # --------------------------------------------------------------------------
            # OWNER CONSOLE & PLATFORM ANALYTICS TABLES
            # --------------------------------------------------------------------------
            # 1. Login Events (Audit trail of all authentication events, successes, and failures)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS login_events (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    email TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    auth_provider TEXT NOT NULL,
                    status TEXT NOT NULL,
                    failure_reason TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    device_category TEXT,
                    browser TEXT,
                    os TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(event_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_login_events_status ON login_events(status)")

            # 2. User Activity Events (Learning events, tutor, quizzes, diagnostics, revisions, live video)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_activity_events (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    concept_id TEXT,
                    duration_seconds INTEGER DEFAULT 0,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_events_created ON user_activity_events(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_events_user ON user_activity_events(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_events_type ON user_activity_events(event_type)")

            # 3. Owner Audit Logs (Immutable audit log for administrative, console, and security activity)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS owner_audit_logs (
                    id TEXT PRIMARY KEY,
                    actor_id TEXT,
                    actor_email TEXT NOT NULL,
                    action TEXT NOT NULL,
                    target TEXT,
                    status TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    details_json TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_owner_audit_created ON owner_audit_logs(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_owner_audit_actor ON owner_audit_logs(actor_email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_owner_audit_action ON owner_audit_logs(action)")

            conn.commit()

    def ensure_default_learner(self):
        self.ensure_learner("student_default", "Alex Chen", onboarding_completed=1)

    def ensure_learner(self, student_id: str, name: str = None, onboarding_completed: int = 0):
        """Ensure learner and 12 concept mastery rows exist for any given student ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT student_id FROM learners WHERE student_id = ?", (student_id,))
            if not cursor.fetchone():
                now = datetime.utcnow().isoformat()
                display_name = name or (f"Student {student_id}" if student_id != "student_default" else "Alex Chen")
                cursor.execute("""
                    INSERT OR REPLACE INTO learners
                    (student_id, name, target_exam, overall_mastery, diagnostic_completed, onboarding_completed, verified_proficiency_level, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (student_id, display_name, "Data Structures & Algorithms Exam", 0.0, 0, onboarding_completed, "Level 1 — Beginner", now, now))

                for cid, cdata in DSA_CONCEPTS.items():
                    cursor.execute("""
                        INSERT OR REPLACE INTO concept_mastery
                        (student_id, concept_id, concept_name, category, mastery_percentage,
                         questions_attempted, correct_answers, incorrect_answers, current_difficulty,
                         last_misconception, last_misconception_name, last_practiced_at, next_revision_at, consecutive_correct)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (student_id, cid, cdata["name"], cdata["category"], 0.0, 0, 0, 0, "novice", None, None, None, None, 0))
                conn.commit()

    def populate_sample_demo_progress(self, student_id: str = "student_guest_demo"):
        """Populate realistic sample progress for the demo learner."""
        now = datetime.now(timezone.utc).isoformat()
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        onboarding_json = json.dumps({
            "learner_category": "College / University Student",
            "institution_or_company": "Stanford University",
            "field_or_role": "Computer Science",
            "programming_experience": "1–2 years",
            "dsa_experience": "Have studied basic concepts",
            "preferred_language": "Python",
            "previously_studied_concepts": ["arrays", "time_complexity", "linked_lists"],
            "primary_goals": ["College exam preparation", "Technical interview readiness"],
            "target_timeline": "Within 3 months",
            "daily_learning_availability": "30–60 minutes",
            "self_assessed_skill_level": "Intermediate",
            "learning_preferences": ["Visual diagrams & memory layouts", "Code demonstrations & walkthroughs"],
            "diagnostic_mode": "quick",
            "onboarding_completed": True
        })

        learning_path_json = json.dumps({
            "focus_strategy": "Concept Consolidation & Gap Bridging: Bridge intermediate structural concepts before advancing to non-linear trees and graphs.",
            "daily_question_target": 6,
            "recommended_next_concepts": [
                {"concept_id": "stacks", "concept_name": "Stacks", "priority": "High: Immediate prerequisite for DFS and Graph traversals"},
                {"concept_id": "queues", "concept_name": "Queues", "priority": "Medium: Foundation for Breadth-First Search"},
                {"concept_id": "binary_trees", "concept_name": "Binary Trees", "priority": "Target: Core hierarchical data structure"}
            ]
        })

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE learners
                SET overall_mastery = 38.5,
                    diagnostic_completed = 1,
                    onboarding_completed = 1,
                    onboarding_completed_at = ?,
                    learner_category = 'College / University Student',
                    onboarding_data = ?,
                    verified_proficiency_level = 'Level 2 — Developing Apprentice',
                    verified_proficiency_score = 58.0,
                    learning_path_json = ?,
                    updated_at = ?
                WHERE student_id = ?
            """, (yesterday, onboarding_json, learning_path_json, now, student_id))

            sample_mastery = {
                "arrays": (80.0, 4, 3, 1, "intermediate", None, None),
                "time_complexity": (65.0, 3, 2, 1, "intermediate", None, None),
                "space_complexity": (50.0, 2, 1, 1, "novice", None, None),
                "stacks": (40.0, 2, 1, 1, "novice", "stack_lifo_vs_fifo", "Stack LIFO vs FIFO Invariants"),
                "queues": (35.0, 1, 0, 1, "novice", "queue_circular_wrap", "Queue Circular Buffer Array Wrapping"),
                "linked_lists": (45.0, 2, 1, 1, "novice", None, None),
                "recursion": (20.0, 1, 0, 1, "novice", "recursion_base_case_omission", "Base Case Omission"),
                "binary_trees": (25.0, 1, 0, 1, "novice", "bst_left_child_ancestor_invariant", "BST Ancestor Invariant Violation")
            }

            for cid, (m, att, cor, incor, diff, misc_id, misc_name) in sample_mastery.items():
                cursor.execute("""
                    UPDATE concept_mastery
                    SET mastery_percentage = ?,
                        questions_attempted = ?,
                        correct_answers = ?,
                        incorrect_answers = ?,
                        current_difficulty = ?,
                        last_misconception = ?,
                        last_misconception_name = ?,
                        last_practiced_at = ?
                    WHERE student_id = ? AND concept_id = ?
                """, (m, att, cor, incor, diff, misc_id, misc_name, yesterday, student_id, cid))

            # Sample revision tasks
            cursor.execute("DELETE FROM revision_tasks WHERE student_id = ?", (student_id,))
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            cursor.execute("""
                INSERT INTO revision_tasks (id, student_id, concept_id, concept_name, due_date, status, reason, urgency)
                VALUES
                (?, ?, 'stacks', 'Stacks', ?, 'pending', 'Misconception detected: confused stack order with queue', 'high'),
                (?, ?, 'binary_trees', 'Binary Trees', ?, 'pending', 'Prerequisite concept for balanced AVL trees', 'medium')
            """, (f"rev_demo_1_{student_id}", student_id, today_str, f"rev_demo_2_{student_id}", student_id, today_str))

            # Sample diagnostic attempt for history review
            cursor.execute("DELETE FROM diagnostic_attempts WHERE student_id = ?", (student_id,))
            diag_attempt_id = f"diag_demo_{student_id[:8]}"
            concept_results = json.dumps([
                {"concept_id": "arrays", "concept_name": "Arrays", "category": "Linear Structures", "accuracy": 100, "status": "Strong", "calibrated_mastery": 80.0, "total_questions": 1, "correct_answers": 1, "incorrect_answers": 0},
                {"concept_id": "time_complexity", "concept_name": "Time Complexity", "category": "Analysis", "accuracy": 100, "status": "Strong", "calibrated_mastery": 65.0, "total_questions": 1, "correct_answers": 1, "incorrect_answers": 0},
                {"concept_id": "linked_lists", "concept_name": "Linked Lists", "category": "Linear Structures", "accuracy": 100, "status": "Strong", "calibrated_mastery": 55.0, "total_questions": 1, "correct_answers": 1, "incorrect_answers": 0},
                {"concept_id": "stacks", "concept_name": "Stacks", "category": "Linear Structures", "accuracy": 0, "status": "Needs Improvement", "calibrated_mastery": 30.0, "total_questions": 1, "correct_answers": 0, "incorrect_answers": 1},
                {"concept_id": "recursion", "concept_name": "Recursion", "category": "Algorithms", "accuracy": 0, "status": "Needs Improvement", "calibrated_mastery": 20.0, "total_questions": 1, "correct_answers": 0, "incorrect_answers": 1},
                {"concept_id": "binary_trees", "concept_name": "Binary Trees", "category": "Hierarchical Structures", "accuracy": 50, "status": "Developing", "calibrated_mastery": 25.0, "total_questions": 1, "correct_answers": 0, "incorrect_answers": 1}
            ])
            cursor.execute("""
                INSERT INTO diagnostic_attempts (id, student_id, score, total_questions, percentage, concept_results, question_details, timestamp)
                VALUES (?, ?, 3, 6, 50.0, ?, '[]', ?)
            """, (diag_attempt_id, student_id, concept_results, yesterday))

            conn.commit()

    def get_or_create_demo_user(self):
        """Create or retrieve isolated demo user with rich sample learning progress."""
        demo_user_id = "usr_guest_demo"
        demo_student_id = "student_guest_demo"
        demo_email = "demo.learner@learnloop.ai"
        now = datetime.now(timezone.utc).isoformat()

        user = self.get_user_by_id(demo_user_id)
        if not user:
            user_data = {
                "id": demo_user_id,
                "student_id": demo_student_id,
                "full_name": "Demo Learner (Guest Explorer)",
                "email": demo_email,
                "normalized_email": demo_email,
                "hashed_password": None,
                "google_sub": None,
                "auth_provider": "demo",
                "role": "student",
                "is_email_verified": 1,
                "is_active": 1,
                "is_demo": 1,
                "created_at": now,
                "updated_at": now,
                "last_login_at": now
            }
            user = self.create_user(user_data)

        self.ensure_learner(demo_student_id, "Demo Learner (Guest Explorer)", onboarding_completed=1)
        profile = self.get_learner_profile(demo_student_id)
        if not profile or profile.get("overall_mastery", 0) == 0:
            self.populate_sample_demo_progress(demo_student_id)
            profile = self.get_learner_profile(demo_student_id)

        return user, profile

    def reset_demo_learner(self):
        """Reset the demo user profile and progress back to baseline sample state."""
        demo_student_id = "student_guest_demo"
        self.populate_sample_demo_progress(demo_student_id)
        return self.get_learner_profile(demo_student_id)

    def get_learner_profile(self, student_id: str = "student_default") -> Optional[Dict[str, Any]]:
        self.ensure_learner(student_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM learners WHERE student_id = ?", (student_id,))
            learner_row = cursor.fetchone()
            if not learner_row:
                return None

            cursor.execute("SELECT * FROM concept_mastery WHERE student_id = ?", (student_id,))
            concept_rows = cursor.fetchall()
            concepts = {}
            mastered_count = 0
            learning_count = 0
            needs_attention_count = 0
            weakest_concept = None
            min_mastery = 999.0

            for row in concept_rows:
                c_dict = dict(row)
                concepts[row["concept_id"]] = c_dict
                m = c_dict.get("mastery_percentage", 0.0)
                if m >= 75.0:
                    mastered_count += 1
                elif m >= 40.0:
                    learning_count += 1
                else:
                    needs_attention_count += 1

                if m < min_mastery:
                    min_mastery = m
                    weakest_concept = c_dict

            # Calculate real learning streak from attempts table
            cursor.execute("""
                SELECT DISTINCT SUBSTR(timestamp, 1, 10) as practice_date
                FROM attempts
                WHERE student_id = ?
                ORDER BY practice_date DESC
            """, (student_id,))
            dates = [r["practice_date"] for r in cursor.fetchall() if r["practice_date"]]
            streak_days = len(dates)  # Actual distinct practice days logged

            # Fetch recent activity
            cursor.execute("""
                SELECT id, question_id, concept_id, is_correct, detected_misconception, score_delta, timestamp
                FROM attempts
                WHERE student_id = ?
                ORDER BY id DESC
                LIMIT 5
            """, (student_id,))
            recent_attempts = []
            for r in cursor.fetchall():
                c_data = DSA_CONCEPTS.get(r["concept_id"], {})
                recent_attempts.append({
                    "id": r["id"],
                    "question_id": r["question_id"],
                    "concept_id": r["concept_id"],
                    "concept_name": c_data.get("name", r["concept_id"].replace("_", " ").title()),
                    "is_correct": bool(r["is_correct"]),
                    "detected_misconception": r["detected_misconception"],
                    "score_delta": r["score_delta"],
                    "timestamp": r["timestamp"]
                })

            profile = dict(learner_row)
            profile["diagnostic_completed"] = bool(profile.get("diagnostic_completed", 0))
            profile["onboarding_completed"] = bool(profile.get("onboarding_completed", 0))
            profile["onboarding_completed_at"] = profile.get("onboarding_completed_at")
            profile["learner_category"] = profile.get("learner_category")
            profile["verified_proficiency_level"] = profile.get("verified_proficiency_level") or "Level 1 — Beginner"
            profile["verified_proficiency_score"] = float(profile.get("verified_proficiency_score") or 0.0)

            try:
                profile["onboarding_data"] = json.loads(profile.get("onboarding_data") or "{}")
            except Exception:
                profile["onboarding_data"] = {}

            try:
                profile["learning_path"] = json.loads(profile.get("learning_path_json") or "{}")
            except Exception:
                profile["learning_path"] = {}

            profile["concepts"] = concepts
            profile["mastered_count"] = mastered_count
            profile["learning_count"] = learning_count
            profile["needs_attention_count"] = needs_attention_count
            profile["streak_days"] = streak_days
            profile["recent_activity"] = recent_attempts

            # Personalized, non-hardcoded learning recommendation based on real data
            if not profile["diagnostic_completed"]:
                profile["recommended_activity"] = {
                    "type": "diagnostic",
                    "concept_id": "diagnostic",
                    "concept_name": "Diagnostic Assessment",
                    "reason": "Complete the 12-question diagnostic test to calibrate your initial DSA mastery across introductory topics."
                }
            elif weakest_concept:
                w_cid = weakest_concept["concept_id"]
                w_name = weakest_concept["concept_name"]
                w_misc = weakest_concept.get("last_misconception_name")
                w_mastery = weakest_concept.get("mastery_percentage", 0.0)

                if w_misc:
                    reason = f"Your last attempt revealed confusion with {w_misc}. Let's reinforce core invariants for {w_name} before moving forward."
                elif w_mastery == 0.0:
                    reason = f"You haven't practiced {w_name} yet. Complete an introductory challenge to establish this prerequisite."
                else:
                    reason = f"Current mastery of {w_name} is {w_mastery}%. Reinforcing this topic will strengthen your foundation for dependent concepts."

                profile["recommended_activity"] = {
                    "type": "concept_practice",
                    "concept_id": w_cid,
                    "concept_name": w_name,
                    "reason": reason
                }
            else:
                profile["recommended_activity"] = {
                    "type": "concept_practice",
                    "concept_id": "arrays",
                    "concept_name": "Arrays",
                    "reason": "Continue daily practice to maintain active recall."
                }

            return profile

    def save_learner_onboarding(self, student_id: str, onboarding_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Save onboarding profile data and mark onboarding completed."""
        self.ensure_learner(student_id)
        now = datetime.utcnow().isoformat()
        category = onboarding_dict.get("learner_category", "Independent Learner")
        onboarding_json = json.dumps(onboarding_dict)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE learners
                SET onboarding_completed = 1,
                    onboarding_completed_at = ?,
                    learner_category = ?,
                    onboarding_data = ?,
                    updated_at = ?
                WHERE student_id = ?
            """, (now, category, onboarding_json, now, student_id))
            conn.commit()

        # Generate initial personalized learning path
        from app.dsa.personalization import generate_personalized_learning_path
        profile = self.get_learner_profile(student_id)
        learning_path = generate_personalized_learning_path(student_id, profile, onboarding_dict)
        self.save_learning_path(student_id, learning_path)
        return self.get_learner_profile(student_id)

    def get_learner_onboarding(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve onboarding profile data for a student."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT onboarding_data, onboarding_completed, learner_category FROM learners WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            if not row:
                return None
            try:
                data = json.loads(row["onboarding_data"] or "{}")
            except Exception:
                data = {}
            data["onboarding_completed"] = bool(row["onboarding_completed"])
            data["learner_category"] = row["learner_category"]
            return data

    def update_verified_proficiency(self, student_id: str, level: str, score: float):
        """Update verified proficiency level and score from diagnostic evaluation."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE learners
                SET verified_proficiency_level = ?,
                    verified_proficiency_score = ?,
                    updated_at = ?
                WHERE student_id = ?
            """, (level, score, now, student_id))
            conn.commit()

    def save_learning_path(self, student_id: str, learning_path_dict: Dict[str, Any]):
        """Persist personalized learning path JSON."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE learners
                SET learning_path_json = ?,
                    updated_at = ?
                WHERE student_id = ?
            """, (json.dumps(learning_path_dict), now, student_id))
            conn.commit()

    def get_learning_path(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve personalized learning path for student."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT learning_path_json FROM learners WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            if not row or not row["learning_path_json"]:
                from app.dsa.personalization import generate_personalized_learning_path
                profile = self.get_learner_profile(student_id)
                return generate_personalized_learning_path(student_id, profile)
            try:
                return json.loads(row["learning_path_json"])
            except Exception:
                return {}

    def update_concept_mastery(self, student_id: str, concept_id: str, mastery_data: Dict[str, Any]):
        self.ensure_learner(student_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE concept_mastery
                SET mastery_percentage = ?,
                    questions_attempted = ?,
                    correct_answers = ?,
                    incorrect_answers = ?,
                    current_difficulty = ?,
                    last_misconception = ?,
                    last_misconception_name = ?,
                    last_practiced_at = ?,
                    next_revision_at = ?,
                    consecutive_correct = ?
                WHERE student_id = ? AND concept_id = ?
            """, (
                mastery_data["mastery_percentage"],
                mastery_data["questions_attempted"],
                mastery_data["correct_answers"],
                mastery_data["incorrect_answers"],
                mastery_data["current_difficulty"],
                mastery_data.get("last_misconception"),
                mastery_data.get("last_misconception_name"),
                mastery_data.get("last_practiced_at"),
                mastery_data.get("next_revision_at"),
                mastery_data.get("consecutive_correct", 0),
                student_id,
                concept_id
            ))

            # Recalculate overall mastery across all 12 concepts
            cursor.execute("SELECT AVG(mastery_percentage) as avg_mastery FROM concept_mastery WHERE student_id = ?", (student_id,))
            avg_row = cursor.fetchone()
            new_overall = round(avg_row["avg_mastery"] if avg_row and avg_row["avg_mastery"] else 0.0, 1)

            cursor.execute("""
                UPDATE learners
                SET overall_mastery = ?, updated_at = ?
                WHERE student_id = ?
            """, (new_overall, datetime.utcnow().isoformat(), student_id))
            conn.commit()

    def record_attempt(self, attempt_data: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO attempts
                (student_id, question_id, concept_id, selected_option, is_correct, student_reasoning, detected_misconception, score_delta, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                attempt_data["student_id"],
                attempt_data["question_id"],
                attempt_data["concept_id"],
                attempt_data["selected_option"],
                1 if attempt_data["is_correct"] else 0,
                attempt_data.get("student_reasoning", ""),
                attempt_data.get("detected_misconception"),
                attempt_data.get("score_delta", 0.0),
                datetime.utcnow().isoformat()
            ))
            conn.commit()

    def set_diagnostic_completed(self, student_id: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE learners SET diagnostic_completed = 1, updated_at = ? WHERE student_id = ?",
                           (datetime.utcnow().isoformat(), student_id))
            conn.commit()

    def schedule_revision(self, task: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Check if pending task already exists for this concept to avoid duplicate clutter
            cursor.execute("""
                SELECT id FROM revision_tasks
                WHERE student_id = ? AND concept_id = ? AND status = 'pending'
            """, (task["student_id"], task["concept_id"]))
            existing = cursor.fetchone()
            task_id = existing["id"] if existing else task["id"]

            cursor.execute("""
                INSERT OR REPLACE INTO revision_tasks
                (id, student_id, concept_id, concept_name, due_date, status, reason, urgency)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                task["student_id"],
                task["concept_id"],
                task["concept_name"],
                task["due_date"],
                task.get("status", "pending"),
                task.get("reason", "Scheduled spaced repetition"),
                task.get("urgency", "medium")
            ))
            conn.commit()

    def get_revision_tasks(self, student_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM revision_tasks WHERE student_id = ? ORDER BY due_date ASC", (student_id,))
            return [dict(r) for r in cursor.fetchall()]

    def get_attempt_history(self, student_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM attempts
                WHERE student_id = ?
                ORDER BY id DESC
            """, (student_id,))
            return [dict(r) for r in cursor.fetchall()]

    def get_revision_task_by_id(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM revision_tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def complete_revision_task(self, task_id: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE revision_tasks SET status = 'completed' WHERE id = ?", (task_id,))
            conn.commit()

    def save_chat_message(self, message: Dict[str, Any]):
        """Persist a conversation turn for a student."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_messages (id, session_id, student_id, role, content, metadata_json, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                message["id"],
                message.get("session_id", "default_session"),
                message.get("student_id", "student_default"),
                message["role"],
                message["content"],
                json.dumps(message.get("metadata", {})),
                message.get("timestamp", datetime.utcnow().isoformat())
            ))
            conn.commit()

    def get_chat_messages(self, student_id: str = "student_default", limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve historical chat turns for a student in chronological order."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM chat_messages
                WHERE student_id = ?
                ORDER BY timestamp ASC
                LIMIT ?
            """, (student_id, limit))
            rows = cursor.fetchall()
            messages = []
            for r in rows:
                m = dict(r)
                if m.get("metadata_json"):
                    try:
                        m["metadata"] = json.loads(m["metadata_json"])
                    except Exception:
                        m["metadata"] = {}
                messages.append(m)
            return messages

    def save_diagnostic_attempt(self, attempt_data: Dict[str, Any]):
        """Persist a complete diagnostic assessment attempt with concept results and question details."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO diagnostic_attempts
                (id, student_id, score, total_questions, percentage, concept_results, question_details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                attempt_data["id"],
                attempt_data.get("student_id", "student_default"),
                attempt_data["score"],
                attempt_data["total_questions"],
                attempt_data["percentage"],
                json.dumps(attempt_data.get("concept_results", [])),
                json.dumps(attempt_data.get("question_details", [])),
                attempt_data.get("timestamp", datetime.utcnow().isoformat())
            ))
            conn.commit()

    def get_diagnostic_attempts(self, student_id: str = "student_default") -> List[Dict[str, Any]]:
        """Retrieve historical diagnostic assessment attempts summaries for a student."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, student_id, score, total_questions, percentage, timestamp
                FROM diagnostic_attempts
                WHERE student_id = ?
                ORDER BY timestamp DESC
            """, (student_id,))
            return [dict(r) for r in cursor.fetchall()]

    def get_diagnostic_attempt_by_id(self, attempt_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full details of a specific diagnostic attempt by ID for review."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM diagnostic_attempts WHERE id = ?", (attempt_id,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            try:
                res["concept_results"] = json.loads(res.get("concept_results") or "[]")
            except Exception:
                res["concept_results"] = []
            try:
                res["question_details"] = json.loads(res.get("question_details") or "[]")
            except Exception:
                res["question_details"] = []
            return res

    # --------------------------------------------------------------------------
    # AUTHENTICATION & MULTI-USER STORAGE METHODS
    # --------------------------------------------------------------------------
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new authenticated user record."""
        now = datetime.utcnow().isoformat()
        is_demo_val = 1 if user_data.get("is_demo") else 0
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (
                    id, student_id, full_name, email, normalized_email,
                    hashed_password, google_sub, auth_provider, role,
                    is_email_verified, is_active, created_at, updated_at, last_login_at, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_data["id"],
                user_data["student_id"],
                user_data["full_name"],
                user_data["email"],
                user_data["normalized_email"],
                user_data.get("hashed_password"),
                user_data.get("google_sub"),
                user_data.get("auth_provider", "local"),
                user_data.get("role", "student"),
                1 if user_data.get("is_email_verified") else 0,
                1 if user_data.get("is_active", True) else 0,
                user_data.get("created_at", now),
                user_data.get("updated_at", now),
                user_data.get("last_login_at", now),
                is_demo_val
            ))
            conn.commit()
            return self.get_user_by_id(user_data["id"])

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by unique user ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by case-insensitive normalized email."""
        norm = email.strip().lower()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE normalized_email = ?", (norm,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_user_by_google_sub(self, google_sub: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by unique Google subject identifier."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE google_sub = ?", (google_sub,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def link_google_account(self, user_id: str, google_sub: str, is_email_verified: bool = True) -> bool:
        """Link an existing local account to a verified Google Identity."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET google_sub = ?,
                    auth_provider = CASE WHEN auth_provider = 'local' THEN 'local+google' ELSE auth_provider END,
                    is_email_verified = MAX(is_email_verified, ?),
                    updated_at = ?,
                    last_login_at = ?
                WHERE id = ?
            """, (google_sub, 1 if is_email_verified else 0, now, now, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_user_last_login(self, user_id: str):
        """Update last login timestamp on successful authentication."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?", (now, now, user_id))
            conn.commit()

    def update_user_password(self, user_id: str, hashed_password: str):
        """Update hashed password for a user."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?", (hashed_password, now, user_id))
            conn.commit()

    def update_user_profile(self, user_id: str, full_name: str) -> Optional[Dict[str, Any]]:
        """Update full name and synchronize with learner profile."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?", (full_name, now, user_id))
            cursor.execute("SELECT student_id FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row and row["student_id"]:
                cursor.execute("UPDATE learners SET name = ?, updated_at = ? WHERE student_id = ?", (full_name, now, row["student_id"]))
            conn.commit()
            return self.get_user_by_id(user_id)

    def create_user_session(self, session_data: Dict[str, Any]):
        """Persist a user session record with token hash."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, created_at, expires_at, last_used_at, revoked_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
            """, (
                session_data["id"],
                session_data["user_id"],
                session_data["refresh_token_hash"],
                session_data.get("device_info", "browser"),
                session_data.get("created_at", datetime.now(timezone.utc).isoformat()),
                session_data["expires_at"],
                session_data.get("last_used_at", datetime.now(timezone.utc).isoformat())
            ))
            conn.commit()

    def get_session_by_token_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        """Lookup session by SHA-256 hash of active OR previous refresh token."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT *,
                       CASE WHEN refresh_token_hash = ? THEN 1 ELSE 0 END AS is_current,
                       CASE WHEN previous_token_hash = ? THEN 1 ELSE 0 END AS is_previous
                FROM user_sessions
                WHERE refresh_token_hash = ? OR previous_token_hash = ?
            """, (token_hash, token_hash, token_hash, token_hash))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_session_token_hash(self, session_id: str, new_token_hash: str, new_expires_at: str, current_token_hash: Optional[str] = None):
        """Rotate refresh token hash, archive previous hash with timestamp, and update session activity."""
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE user_sessions
                SET previous_token_hash = COALESCE(?, refresh_token_hash),
                    rotated_at = ?,
                    refresh_token_hash = ?,
                    expires_at = ?,
                    last_used_at = ?
                WHERE id = ?
            """, (current_token_hash, now, new_token_hash, new_expires_at, now, session_id))
            conn.commit()

    def revoke_session(self, session_id: str):
        """Mark a session as revoked on logout or token rotation invalidation."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE user_sessions SET revoked_at = ? WHERE id = ?", (now, session_id))
            conn.commit()

    def revoke_all_user_sessions(self, user_id: str):
        """Revoke all active sessions for a user (e.g., security breach or token reuse detection)."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", (now, user_id))
            conn.commit()

    def create_password_reset_token(self, token_data: Dict[str, Any]):
        """Store hashed password reset token with short expiration."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
                VALUES (?, ?, ?, ?, NULL, ?)
            """, (
                token_data["id"],
                token_data["user_id"],
                token_data["token_hash"],
                token_data["expires_at"],
                token_data.get("created_at", datetime.utcnow().isoformat())
            ))
            conn.commit()

    def get_password_reset_token(self, token_hash: str) -> Optional[Dict[str, Any]]:
        """Lookup unused password reset token by hash."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL", (token_hash,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def mark_password_reset_used(self, token_id: str):
        """Mark reset token as used."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?", (now, token_id))
            conn.commit()

    def ensure_teacher_demo_cohort(self):
        """Seed realistic demonstration cohort data for the teacher dashboard (clearly labeled sample data)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM teacher_demo_cohort")
            if cursor.fetchone()["count"] > 0:
                return

            demo_students = [
                {
                    "student_id": "demo_001",
                    "name": "Jordan Rivera",
                    "overall_mastery": 38.5,
                    "weakest_concept": "Stacks",
                    "primary_misconception": "LIFO vs FIFO Inversion (stack_fifo_confusion)",
                    "days_inactive": 4,
                    "needs_intervention": 1,
                    "concept_scores": {"stacks": 22.0, "recursion": 35.0, "arrays": 65.0, "trees": 32.0}
                },
                {
                    "student_id": "demo_002",
                    "name": "Maya Patel",
                    "overall_mastery": 44.0,
                    "weakest_concept": "Binary Trees",
                    "primary_misconception": "BST Local Child vs Global Ancestor Flaw (bst_ancestor_constraint_violation)",
                    "days_inactive": 2,
                    "needs_intervention": 1,
                    "concept_scores": {"binary_trees": 28.0, "trees": 40.0, "queues": 70.0, "sorting": 45.0}
                },
                {
                    "student_id": "demo_003",
                    "name": "Lucas Vance",
                    "overall_mastery": 52.0,
                    "weakest_concept": "Recursion",
                    "primary_misconception": "Recursion Call Stack Memory Ignored (space_recursion_stack_ignored)",
                    "days_inactive": 1,
                    "needs_intervention": 0,
                    "concept_scores": {"recursion": 42.0, "time_complexity": 60.0, "linked_lists": 55.0}
                },
                {
                    "student_id": "demo_004",
                    "name": "Priya Sharma",
                    "overall_mastery": 79.5,
                    "weakest_concept": "Graphs",
                    "primary_misconception": "Using BFS for Weighted Shortest Path (graph_bfs_weighted_shortest_path)",
                    "days_inactive": 1,
                    "needs_intervention": 0,
                    "concept_scores": {"graphs": 68.0, "trees": 85.0, "arrays": 92.0}
                },
                {
                    "student_id": "demo_005",
                    "name": "Ethan Brooks",
                    "overall_mastery": 31.0,
                    "weakest_concept": "Linked Lists",
                    "primary_misconception": "Orphaned Node via Premature Pointer Overwrite (linked_list_pointer_loss)",
                    "days_inactive": 6,
                    "needs_intervention": 1,
                    "concept_scores": {"linked_lists": 18.0, "stacks": 25.0, "arrays": 50.0}
                },
                {
                    "student_id": "demo_006",
                    "name": "Sophia Zhang",
                    "overall_mastery": 88.0,
                    "weakest_concept": "Sorting",
                    "primary_misconception": "Worst-Case vs Average-Case Equivalence Flaw (complexity_worst_vs_average)",
                    "days_inactive": 0,
                    "needs_intervention": 0,
                    "concept_scores": {"sorting": 75.0, "graphs": 84.0, "arrays": 95.0}
                }
            ]

            for s in demo_students:
                cursor.execute("""
                    INSERT INTO teacher_demo_cohort
                    (student_id, name, overall_mastery, weakest_concept, primary_misconception, days_inactive, needs_intervention, data_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    s["student_id"],
                    s["name"],
                    s["overall_mastery"],
                    s["weakest_concept"],
                    s["primary_misconception"],
                    s["days_inactive"],
                    s["needs_intervention"],
                    json.dumps(s)
                ))
            conn.commit()

    def ensure_demo_teacher(self):
        """Ensure a demo educator account exists for educator dashboard evaluation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = 'teacher@learnloop.ai'")
            if cursor.fetchone():
                return

            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO users (
                    id, student_id, full_name, email, normalized_email,
                    hashed_password, google_sub, auth_provider, role,
                    is_email_verified, is_active, created_at, updated_at, last_login_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "usr_demo_teacher",
                "stu_demo_teacher",
                "Prof. Alan Turing (Educator)",
                "teacher@learnloop.ai",
                "teacher@learnloop.ai",
                "$argon2id$v=19$m=65536,t=2,p=4$8b/zNvY3Re++MWdsM4C96g$wdmj6fc957Ndf4/Bci2wK9xjt06KwA/6TWSv0S/5Wr4",
                None,
                "local",
                "teacher",
                1,
                1,
                now,
                now,
                now
            ))
            conn.commit()

    def get_demo_teacher_dashboard_data(self) -> Dict[str, Any]:
        """Retrieve synthetic demonstration cohort analytics for safe demo viewing."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM teacher_demo_cohort")
            cohort_rows = [dict(r) for r in cursor.fetchall()]

            total_learners = len(cohort_rows)
            avg_mastery = round(sum(r["overall_mastery"] for r in cohort_rows) / max(1, total_learners), 1)

            # Weakest concepts distribution
            concept_counts: Dict[str, int] = {}
            for r in cohort_rows:
                c = r["weakest_concept"]
                concept_counts[c] = concept_counts.get(c, 0) + 1

            weakest_concepts = [{"concept": k, "struggling_students": v} for k, v in sorted(concept_counts.items(), key=lambda x: x[1], reverse=True)]

            # Misconceptions breakdown
            misconception_counts: Dict[str, int] = {}
            for r in cohort_rows:
                m = r["primary_misconception"]
                misconception_counts[m] = misconception_counts.get(m, 0) + 1

            misconception_dist = [{"misconception": k, "count": v} for k, v in sorted(misconception_counts.items(), key=lambda x: x[1], reverse=True)]

            # Students requiring intervention
            interventions = []
            for r in cohort_rows:
                if r["needs_intervention"]:
                    interventions.append({
                        "student_id": r["student_id"],
                        "name": r["name"],
                        "weakest_concept": r["weakest_concept"],
                        "mastery": r["overall_mastery"],
                        "primary_misconception": r["primary_misconception"],
                        "days_since_practice": r["days_inactive"],
                        "recommended_intervention": f"Assign remedial review for {r['weakest_concept']} focusing on: {r['primary_misconception'].split('(')[0].strip()}."
                    })

            return {
                "total_demo_learners": total_learners,
                "average_concept_mastery": avg_mastery,
                "weakest_concepts": weakest_concepts,
                "class_misconception_distribution": misconception_dist,
                "students_requiring_intervention": interventions,
                "is_demo": True,
                "sample_notice": "Demonstration Cohort Notice: Metrics displayed here represent seeded demonstration cohorts for educational demonstration as required by the hackathon specifications.",
                "last_aggregated_at": datetime.now(timezone.utc).isoformat()
            }

    def get_real_teacher_dashboard_data(self) -> Dict[str, Any]:
        """Aggregate real learner cohort metrics from the active student database."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT student_id, name, overall_mastery, updated_at
                FROM learners
                WHERE student_id NOT LIKE 'demo_%'
                  AND student_id != 'student_default'
                  AND student_id != 'usr_guest_demo'
            """)
            real_learners = [dict(r) for r in cursor.fetchall()]
            total_learners = len(real_learners)

            if total_learners == 0:
                return {
                    "total_demo_learners": 0,
                    "average_concept_mastery": 0.0,
                    "weakest_concepts": [],
                    "class_misconception_distribution": [],
                    "students_requiring_intervention": [],
                    "is_demo": False,
                    "sample_notice": None,
                    "message": "No active class sessions recorded yet. Enrolled learners will appear here once they complete diagnostic assessments or adaptive practice.",
                    "last_aggregated_at": datetime.now(timezone.utc).isoformat()
                }

            avg_mastery = round(sum(r["overall_mastery"] for r in real_learners) / max(1, total_learners), 1)

            # Weakest concepts across cohort
            cursor.execute("""
                SELECT concept_name, COUNT(*) as struggling_count
                FROM concept_mastery
                WHERE mastery_percentage < 40.0
                  AND student_id NOT LIKE 'demo_%'
                  AND student_id != 'student_default'
                  AND student_id != 'usr_guest_demo'
                GROUP BY concept_name
                ORDER BY struggling_count DESC
                LIMIT 6
            """)
            weakest_concepts = [{"concept": r["concept_name"], "struggling_students": r["struggling_count"]} for r in cursor.fetchall()]

            # Misconceptions breakdown
            cursor.execute("""
                SELECT last_misconception, COUNT(*) as cnt
                FROM concept_mastery
                WHERE last_misconception IS NOT NULL AND last_misconception != ''
                  AND student_id NOT LIKE 'demo_%'
                  AND student_id != 'student_default'
                  AND student_id != 'usr_guest_demo'
                GROUP BY last_misconception
                ORDER BY cnt DESC
                LIMIT 6
            """)
            misconception_dist = [{"misconception": r["last_misconception"], "count": r["cnt"]} for r in cursor.fetchall()]

            # Students requiring intervention
            interventions = []
            for lr in real_learners:
                if lr["overall_mastery"] < 50.0:
                    cursor.execute("""
                        SELECT concept_name, mastery_percentage, last_misconception
                        FROM concept_mastery
                        WHERE student_id = ?
                        ORDER BY mastery_percentage ASC
                        LIMIT 1
                    """, (lr["student_id"],))
                    weak_row = cursor.fetchone()
                    weak_concept = weak_row["concept_name"] if weak_row else "Core Fundamentals"
                    misc = weak_row["last_misconception"] if (weak_row and weak_row["last_misconception"]) else "Conceptual foundation pending practice"
                    interventions.append({
                        "student_id": lr["student_id"],
                        "name": lr["name"] or f"Learner {lr['student_id'][:8]}",
                        "weakest_concept": weak_concept,
                        "mastery": lr["overall_mastery"],
                        "primary_misconception": misc,
                        "days_since_practice": 1,
                        "recommended_intervention": f"Assign targeted review for {weak_concept} to resolve foundational gaps."
                    })
                    if len(interventions) >= 12:
                        break

            return {
                "total_demo_learners": total_learners,
                "average_concept_mastery": avg_mastery,
                "weakest_concepts": weakest_concepts,
                "class_misconception_distribution": misconception_dist,
                "students_requiring_intervention": interventions,
                "is_demo": False,
                "sample_notice": None,
                "last_aggregated_at": datetime.now(timezone.utc).isoformat()
            }

    def get_teacher_dashboard_data(self) -> Dict[str, Any]:
        """Backward-compatible default returning demo teacher dashboard data."""
        return self.get_demo_teacher_dashboard_data()

    # --------------------------------------------------------------------------
    # OWNER CONSOLE & PLATFORM ANALYTICS STORAGE ENGINE
    # --------------------------------------------------------------------------
    def ensure_owner_bootstrap(self):
        """
        Secure, idempotent owner account bootstrap.
        Ensures the user matching OWNER_EMAIL exists with role='owner'.
        If no user exists, initializes a secure owner account using OWNER_INITIAL_PASSWORD.
        """
        from app.auth.security import hash_password, get_authorized_owner_emails
        authorized_emails = get_authorized_owner_emails()
        primary_owner_email = authorized_emails[0]
        initial_pwd = os.getenv("OWNER_INITIAL_PASSWORD", "OwnerPass123456!")
        now = datetime.now(timezone.utc).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            for email in authorized_emails:
                cursor.execute("SELECT id, role, student_id FROM users WHERE normalized_email = ?", (email,))
                user_row = cursor.fetchone()
                if user_row:
                    if user_row["role"] != "owner":
                        cursor.execute("UPDATE users SET role = 'owner', updated_at = ? WHERE id = ?", (now, user_row["id"]))
                        conn.commit()
                        self.record_owner_audit_event(
                            actor_id=user_row["id"],
                            actor_email=email,
                            action="ROLE_ELEVATED_TO_OWNER",
                            target="users",
                            status="SUCCESS",
                            details={"note": "Existing user account promoted to owner role based on OWNER_EMAIL"}
                        )
                elif email == primary_owner_email:
                    # Initialize default owner record if primary owner doesn't exist yet
                    owner_id = "usr_owner_main"
                    student_id = "student_owner"
                    hashed_pwd = hash_password(initial_pwd)
                    cursor.execute("""
                        INSERT OR REPLACE INTO users (
                            id, student_id, full_name, email, normalized_email,
                            hashed_password, google_sub, auth_provider, role,
                            is_email_verified, is_active, created_at, updated_at, last_login_at, is_demo
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        owner_id, student_id, "LearnLoop Platform Owner", primary_owner_email, primary_owner_email,
                        hashed_pwd, None, "local", "owner",
                        1, 1, now, now, None, 0
                    ))
                    conn.commit()
                    self.ensure_learner(student_id, "LearnLoop Platform Owner", onboarding_completed=1)
                    self.record_owner_audit_event(
                        actor_id=owner_id,
                        actor_email=primary_owner_email,
                        action="OWNER_ACCOUNT_BOOTSTRAPPED",
                        target="users",
                        status="SUCCESS",
                        details={"note": "Platform owner account initialized securely on startup"}
                    )

    def backfill_historical_analytics(self):
        """
        One-time graceful backfill of historical analytics events from existing database records.
        Populates login_events and user_activity_events so metrics reflect real historical usage.
        """
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Backfill login_events if empty
            cursor.execute("SELECT COUNT(*) as count FROM login_events")
            if cursor.fetchone()["count"] == 0:
                cursor.execute("SELECT id, email, auth_provider, created_at, last_login_at FROM users WHERE is_demo = 0")
                users = cursor.fetchall()
                for u in users:
                    event_id = f"log_bf_{uuid.uuid4().hex[:10]}"
                    cursor.execute("""
                        INSERT INTO login_events (
                            id, user_id, email, event_type, auth_provider,
                            status, failure_reason, ip_address, user_agent,
                            device_category, browser, os, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        event_id, u["id"], u["email"], "LOGIN_SUCCESS", u["auth_provider"] or "local",
                        "SUCCESS", None, "127.0.0.1", "Initial Historical Session",
                        "desktop", "Chrome", "Windows", u["created_at"] or now
                    ))
                    if u["last_login_at"] and u["last_login_at"] != u["created_at"]:
                        event_id2 = f"log_bf_{uuid.uuid4().hex[:10]}"
                        cursor.execute("""
                            INSERT INTO login_events (
                                id, user_id, email, event_type, auth_provider,
                                status, failure_reason, ip_address, user_agent,
                                device_category, browser, os, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            event_id2, u["id"], u["email"], "LOGIN_SUCCESS", u["auth_provider"] or "local",
                            "SUCCESS", None, "127.0.0.1", "Returning Historical Session",
                            "desktop", "Chrome", "Windows", u["last_login_at"]
                        ))
                conn.commit()

            # 2. Backfill user_activity_events if empty
            cursor.execute("SELECT COUNT(*) as count FROM user_activity_events")
            if cursor.fetchone()["count"] == 0:
                # Attempts -> Quiz question attempts
                cursor.execute("SELECT id, student_id, concept_id, is_correct, timestamp FROM attempts")
                attempts = cursor.fetchall()
                for a in attempts:
                    act_id = f"act_bf_{uuid.uuid4().hex[:10]}"
                    cursor.execute("SELECT id FROM users WHERE student_id = ?", (a["student_id"],))
                    user_match = cursor.fetchone()
                    uid = user_match["id"] if user_match else a["student_id"]
                    cursor.execute("""
                        INSERT INTO user_activity_events (
                            id, user_id, student_id, event_type,
                            concept_id, duration_seconds, metadata_json, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        act_id, uid, a["student_id"], "QUIZ_QUESTION_ATTEMPTED",
                        a["concept_id"], 45, json.dumps({"is_correct": bool(a["is_correct"])}),
                        a["timestamp"] or now
                    ))

                # Diagnostic attempts -> Diagnostic completed
                cursor.execute("SELECT id, student_id, score, total_questions, percentage, timestamp FROM diagnostic_attempts")
                diag_attempts = cursor.fetchall()
                for d in diag_attempts:
                    act_id = f"act_bf_{uuid.uuid4().hex[:10]}"
                    cursor.execute("SELECT id FROM users WHERE student_id = ?", (d["student_id"],))
                    user_match = cursor.fetchone()
                    uid = user_match["id"] if user_match else d["student_id"]
                    cursor.execute("""
                        INSERT INTO user_activity_events (
                            id, user_id, student_id, event_type,
                            concept_id, duration_seconds, metadata_json, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        act_id, uid, d["student_id"], "DIAGNOSTIC_COMPLETED",
                        None, 180, json.dumps({
                            "score": d["score"],
                            "total": d["total_questions"],
                            "percentage": d["percentage"]
                        }),
                        d["timestamp"] or now
                    ))
                conn.commit()

    def record_login_event(
        self,
        email: str,
        event_type: str,
        auth_provider: str = "local",
        status: str = "SUCCESS",
        user_id: Optional[str] = None,
        failure_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Record an authentication event in the login_events table."""
        from app.auth.security import parse_user_agent
        device, browser, os_name = parse_user_agent(user_agent)
        event_id = f"log_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO login_events (
                    id, user_id, email, event_type, auth_provider,
                    status, failure_reason, ip_address, user_agent,
                    device_category, browser, os, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, user_id, email.strip().lower(), event_type, auth_provider,
                status, failure_reason, ip_address, user_agent,
                device, browser, os_name, now
            ))
            conn.commit()
        return event_id

    def record_login_event_safe(self, **kwargs) -> Optional[str]:
        """Fail-safe non-blocking wrapper for recording login events."""
        try:
            return self.record_login_event(**kwargs)
        except Exception as e:
            logger.warning(f"Non-blocking login event logging failure: {e}")
            return None

    def record_user_activity_event(
        self,
        user_id: str,
        student_id: str,
        event_type: str,
        concept_id: Optional[str] = None,
        duration_seconds: int = 0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Record a legitimate learning activity event in user_activity_events.
        Stores zero PII or private conversation text.
        """
        event_id = f"act_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        metadata_json = json.dumps(metadata) if metadata else None

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_activity_events (
                    id, user_id, student_id, event_type,
                    concept_id, duration_seconds, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, user_id, student_id, event_type,
                concept_id, duration_seconds, metadata_json, now
            ))
            conn.commit()
        return event_id

    def record_user_activity_event_safe(self, **kwargs) -> Optional[str]:
        """Fail-safe non-blocking wrapper for recording learning activity events."""
        try:
            return self.record_user_activity_event(**kwargs)
        except Exception as e:
            logger.warning(f"Non-blocking user activity logging failure: {e}")
            return None

    def record_owner_audit_event(
        self,
        actor_email: str,
        action: str,
        target: Optional[str] = None,
        status: str = "SUCCESS",
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Record an immutable administrative or security audit event.
        Audit logs cannot be modified or deleted via the dashboard.
        """
        audit_id = f"aud_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        details_json = json.dumps(details) if details else None

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO owner_audit_logs (
                    id, actor_id, actor_email, action, target,
                    status, ip_address, user_agent, details_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                audit_id, actor_id, actor_email.strip().lower(), action, target,
                status, ip_address, user_agent, details_json, now
            ))
            conn.commit()
        return audit_id

    def get_owner_overview_metrics(self, range_days: int = 30) -> Dict[str, Any]:
        """
        Generate complete, database-backed platform metrics for the Owner Console Overview.
        Includes user counts, DAU/WAU/MAU, login tallies, active sessions, and trend series.
        """
        now = datetime.now(timezone.utc)
        today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        one_day_ago = (now - timedelta(days=1)).isoformat()
        range_start = (now - timedelta(days=range_days)).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Registration tallies
            cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_demo = 0")
            total_registered_users = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE is_demo = 0 AND created_at >= ?", (today_midnight,))
            new_registrations_today = cursor.fetchone()["cnt"]

            cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE is_demo = 0 AND created_at >= ?", (seven_days_ago,))
            new_registrations_week = cursor.fetchone()["cnt"]

            cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE is_demo = 0 AND created_at >= ?", (thirty_days_ago,))
            new_registrations_month = cursor.fetchone()["cnt"]

            # 2. Login tallies
            cursor.execute("SELECT COUNT(*) as cnt FROM login_events WHERE event_type = 'LOGIN_SUCCESS'")
            total_successful_logins = cursor.fetchone()["cnt"]

            cursor.execute("""
                SELECT COUNT(*) as cnt FROM (
                    SELECT user_id FROM login_events
                    WHERE event_type = 'LOGIN_SUCCESS' AND user_id IS NOT NULL
                    GROUP BY user_id
                    HAVING COUNT(*) > 1
                )
            """)
            returning_users = cursor.fetchone()["cnt"]

            # 3. Active User Metrics (DAU, WAU, MAU)
            # Distinct users who either logged in or executed learning activity within period
            cursor.execute("""
                SELECT COUNT(DISTINCT uid) as cnt FROM (
                    SELECT user_id AS uid FROM login_events WHERE created_at >= ? AND user_id IS NOT NULL
                    UNION
                    SELECT user_id AS uid FROM user_activity_events WHERE created_at >= ? AND user_id IS NOT NULL
                )
            """, (one_day_ago, one_day_ago))
            dau = cursor.fetchone()["cnt"]

            cursor.execute("""
                SELECT COUNT(DISTINCT uid) as cnt FROM (
                    SELECT user_id AS uid FROM login_events WHERE created_at >= ? AND user_id IS NOT NULL
                    UNION
                    SELECT user_id AS uid FROM user_activity_events WHERE created_at >= ? AND user_id IS NOT NULL
                )
            """, (seven_days_ago, seven_days_ago))
            wau = cursor.fetchone()["cnt"]

            cursor.execute("""
                SELECT COUNT(DISTINCT uid) as cnt FROM (
                    SELECT user_id AS uid FROM login_events WHERE created_at >= ? AND user_id IS NOT NULL
                    UNION
                    SELECT user_id AS uid FROM user_activity_events WHERE created_at >= ? AND user_id IS NOT NULL
                )
            """, (thirty_days_ago, thirty_days_ago))
            mau = cursor.fetchone()["cnt"]

            # 4. Currently Active Sessions
            now_iso = now.isoformat()
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) as cnt
                FROM user_sessions
                WHERE expires_at > ? AND revoked_at IS NULL
            """, (now_iso,))
            active_sessions = cursor.fetchone()["cnt"]

            # 5. Engagement rate
            engagement_rate = round((mau / total_registered_users * 100), 1) if total_registered_users > 0 else 0.0

            # 6. Trend Charts Data (Daily buckets across range_days)
            # A. Daily registrations
            cursor.execute("""
                SELECT substr(created_at, 1, 10) as day, COUNT(*) as cnt
                FROM users
                WHERE is_demo = 0 AND created_at >= ?
                GROUP BY day
                ORDER BY day ASC
            """, (range_start,))
            reg_dict = {row["day"]: row["cnt"] for row in cursor.fetchall()}

            # B. Daily active users & logins
            cursor.execute("""
                SELECT substr(created_at, 1, 10) as day,
                       COUNT(DISTINCT user_id) as active_users,
                       COUNT(*) as logins
                FROM login_events
                WHERE created_at >= ? AND event_type = 'LOGIN_SUCCESS'
                GROUP BY day
                ORDER BY day ASC
            """, (range_start,))
            act_dict = {row["day"]: {"active_users": row["active_users"], "logins": row["logins"]} for row in cursor.fetchall()}

            # C. Daily learning events
            cursor.execute("""
                SELECT substr(created_at, 1, 10) as day, COUNT(*) as total_events
                FROM user_activity_events
                WHERE created_at >= ?
                GROUP BY day
                ORDER BY day ASC
            """, (range_start,))
            learn_dict = {row["day"]: row["total_events"] for row in cursor.fetchall()}

            # Assemble contiguous daily array
            registration_trends = []
            active_user_trends = []
            engagement_trends = []

            for i in range(range_days - 1, -1, -1):
                day_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                registration_trends.append({
                    "date": day_str,
                    "registrations": reg_dict.get(day_str, 0)
                })
                act_info = act_dict.get(day_str, {"active_users": 0, "logins": 0})
                active_user_trends.append({
                    "date": day_str,
                    "active_users": act_info["active_users"],
                    "logins": act_info["logins"]
                })
                engagement_trends.append({
                    "date": day_str,
                    "events": learn_dict.get(day_str, 0)
                })

            # 7. Device Category Breakdown
            cursor.execute("""
                SELECT device_category, COUNT(*) as count
                FROM login_events
                WHERE device_category IS NOT NULL
                GROUP BY device_category
            """)
            device_breakdown = [{ "name": row["device_category"].capitalize(), "value": row["count"] } for row in cursor.fetchall()]

            # 8. Role Breakdown
            cursor.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role")
            role_breakdown = [{ "name": row["role"].capitalize(), "value": row["count"] } for row in cursor.fetchall()]

            return {
                "total_registered_users": total_registered_users,
                "new_registrations_today": new_registrations_today,
                "new_registrations_week": new_registrations_week,
                "new_registrations_month": new_registrations_month,
                "dau": dau,
                "wau": wau,
                "mau": mau,
                "total_successful_logins": total_successful_logins,
                "returning_users": returning_users,
                "active_sessions": active_sessions,
                "engagement_rate": engagement_rate,
                "registration_trends": registration_trends,
                "active_user_trends": active_user_trends,
                "engagement_trends": engagement_trends,
                "device_breakdown": device_breakdown,
                "role_breakdown": role_breakdown,
                "calculated_at": now.isoformat()
            }

    def get_owner_user_directory(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 25,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Query searchable, filterable, paginated user directory for the Owner Console.
        Omits sensitive hashes, tokens, and raw private messages.
        """
        query_conditions = ["1=1"]
        params = []

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query_conditions.append("(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR id LIKE ? OR student_id LIKE ?)")
            params.extend([term, term, term, term])

        if role and role.strip() and role != "all":
            query_conditions.append("role = ?")
            params.append(role.strip().lower())

        if status and status.strip() and status != "all":
            if status == "active":
                query_conditions.append("is_active = 1")
            elif status == "inactive":
                query_conditions.append("is_active = 0")

        if start_date and start_date.strip():
            query_conditions.append("created_at >= ?")
            params.append(start_date.strip())

        if end_date and end_date.strip():
            query_conditions.append("created_at <= ?")
            params.append(end_date.strip() + "T23:59:59")

        where_clause = " AND ".join(query_conditions)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Total count for pagination
            cursor.execute(f"SELECT COUNT(*) as total FROM users WHERE {where_clause}", tuple(params))
            total_records = cursor.fetchone()["total"]

            # Paginated records
            query_sql = f"""
                SELECT id, student_id, full_name, email, normalized_email,
                       auth_provider, role, is_email_verified, is_active,
                       created_at, updated_at, last_login_at
                FROM users
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query_sql, tuple(params + [limit, offset]))
            rows = cursor.fetchall()

            users = []
            for r in rows:
                user_dict = dict(r)

                # Query total login count for this user
                cursor.execute("SELECT COUNT(*) as count FROM login_events WHERE user_id = ? AND event_type = 'LOGIN_SUCCESS'", (user_dict["id"],))
                user_dict["total_successful_logins"] = cursor.fetchone()["count"]

                # Query total learning activity count and last activity timestamp
                cursor.execute("""
                    SELECT COUNT(*) as count, MAX(created_at) as last_activity
                    FROM user_activity_events
                    WHERE user_id = ? OR student_id = ?
                """, (user_dict["id"], user_dict["student_id"]))
                act_row = cursor.fetchone()
                user_dict["total_learning_activity"] = act_row["count"] if act_row else 0
                user_dict["last_activity_at"] = act_row["last_activity"] if (act_row and act_row["last_activity"]) else user_dict["last_login_at"]

                users.append(user_dict)

            return {
                "users": users,
                "total": total_records,
                "limit": limit,
                "offset": offset
            }

    def get_owner_user_detail(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve deep activity profile for a specific user.
        Safely summarizes concept mastery, recent learning events, and login history.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, student_id, full_name, email, auth_provider, role,
                       is_email_verified, is_active, created_at, updated_at, last_login_at
                FROM users
                WHERE id = ?
            """, (user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return None

            user_data = dict(user_row)
            student_id = user_data["student_id"]

            # 1. Learner Overview & Mastery
            cursor.execute("SELECT * FROM learners WHERE student_id = ?", (student_id,))
            learner_row = cursor.fetchone()
            user_data["learner"] = dict(learner_row) if learner_row else None

            cursor.execute("""
                SELECT concept_id, concept_name, category, mastery_percentage,
                       questions_attempted, correct_answers, current_difficulty,
                       last_practiced_at
                FROM concept_mastery
                WHERE student_id = ?
                ORDER BY mastery_percentage DESC
            """, (student_id,))
            user_data["concept_mastery"] = [dict(c) for c in cursor.fetchall()]

            # 2. Recent Learning Activity Events (Last 25)
            cursor.execute("""
                SELECT id, event_type, concept_id, duration_seconds, metadata_json, created_at
                FROM user_activity_events
                WHERE user_id = ? OR student_id = ?
                ORDER BY created_at DESC
                LIMIT 25
            """, (user_id, student_id))
            user_data["recent_activity"] = [dict(a) for a in cursor.fetchall()]

            # 3. Recent Login Events (Last 15)
            cursor.execute("""
                SELECT id, event_type, auth_provider, status, ip_address,
                       device_category, browser, os, created_at
                FROM login_events
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 15
            """, (user_id,))
            user_data["recent_logins"] = [dict(l) for l in cursor.fetchall()]

            return user_data

    def get_owner_login_activity(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        provider: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Retrieve login audit events with search, filtering, and device/browser breakdowns.
        """
        conditions = ["1=1"]
        params = []

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            conditions.append("(LOWER(email) LIKE ? OR user_id LIKE ? OR ip_address LIKE ?)")
            params.extend([term, term, term])

        if status and status.strip() and status != "all":
            conditions.append("status = ?")
            params.append(status.strip().upper())

        if provider and provider.strip() and provider != "all":
            conditions.append("auth_provider = ?")
            params.append(provider.strip().lower())

        where_clause = " AND ".join(conditions)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(f"SELECT COUNT(*) as total FROM login_events WHERE {where_clause}", tuple(params))
            total = cursor.fetchone()["total"]

            cursor.execute(f"""
                SELECT id, user_id, email, event_type, auth_provider, status,
                       failure_reason, ip_address, device_category, browser, os, created_at
                FROM login_events
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, tuple(params + [limit, offset]))
            events = [dict(r) for r in cursor.fetchall()]

            # Browser breakdown
            cursor.execute("SELECT browser, COUNT(*) as count FROM login_events GROUP BY browser ORDER BY count DESC LIMIT 6")
            browser_breakdown = [{ "name": r["browser"] or "Other", "value": r["count"] } for r in cursor.fetchall()]

            # Status breakdown
            cursor.execute("SELECT status, COUNT(*) as count FROM login_events GROUP BY status")
            status_breakdown = [{ "name": r["status"], "value": r["count"] } for r in cursor.fetchall()]

            return {
                "events": events,
                "total": total,
                "limit": limit,
                "offset": offset,
                "browser_breakdown": browser_breakdown,
                "status_breakdown": status_breakdown
            }

    def get_owner_learning_analytics(self, range_days: int = 30) -> Dict[str, Any]:
        """
        Calculate feature adoption and learning volume across the platform.
        """
        now = datetime.now(timezone.utc)
        range_start = (now - timedelta(days=range_days)).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Total Events by Type
            cursor.execute("""
                SELECT event_type, COUNT(*) as event_count, COUNT(DISTINCT user_id) as unique_users
                FROM user_activity_events
                WHERE created_at >= ?
                GROUP BY event_type
                ORDER BY event_count DESC
            """, (range_start,))
            events_by_type = [dict(r) for r in cursor.fetchall()]

            # 2. Top Engaged Concepts
            cursor.execute("""
                SELECT concept_id, COUNT(*) as attempts_count,
                       ROUND(AVG(CASE WHEN json_extract(metadata_json, '$.is_correct') = 1 THEN 100.0 ELSE 0.0 END), 1) as accuracy
                FROM user_activity_events
                WHERE concept_id IS NOT NULL AND created_at >= ?
                GROUP BY concept_id
                ORDER BY attempts_count DESC
                LIMIT 10
            """, (range_start,))
            top_concepts = [dict(r) for r in cursor.fetchall()]

            # Map concept names
            for tc in top_concepts:
                cid = tc["concept_id"]
                tc["concept_name"] = DSA_CONCEPTS.get(cid, {}).get("name", cid.replace("_", " ").title())

            # 3. Daily Learning Volume Trend
            cursor.execute("""
                SELECT substr(created_at, 1, 10) as day,
                       COUNT(*) as total_events,
                       SUM(CASE WHEN event_type = 'TUTOR_QUESTION_SUBMITTED' THEN 1 ELSE 0 END) as tutor_questions,
                       SUM(CASE WHEN event_type = 'QUIZ_QUESTION_ATTEMPTED' THEN 1 ELSE 0 END) as quiz_attempts,
                       SUM(CASE WHEN event_type = 'DIAGNOSTIC_COMPLETED' THEN 1 ELSE 0 END) as diagnostics
                FROM user_activity_events
                WHERE created_at >= ?
                GROUP BY day
                ORDER BY day ASC
            """, (range_start,))
            daily_rows = {r["day"]: dict(r) for r in cursor.fetchall()}

            volume_series = []
            for i in range(range_days - 1, -1, -1):
                day_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                ddata = daily_rows.get(day_str, {
                    "total_events": 0,
                    "tutor_questions": 0,
                    "quiz_attempts": 0,
                    "diagnostics": 0
                })
                volume_series.append({
                    "date": day_str,
                    "total_events": ddata["total_events"],
                    "tutor_questions": ddata["tutor_questions"],
                    "quiz_attempts": ddata["quiz_attempts"],
                    "diagnostics": ddata["diagnostics"]
                })

            return {
                "events_by_type": events_by_type,
                "top_concepts": top_concepts,
                "volume_series": volume_series,
                "range_days": range_days
            }

    def get_owner_engagement_analytics(self, range_days: int = 30) -> Dict[str, Any]:
        """
        Calculate user engagement, feature adoption rates, and weekly cohort retention.
        """
        now = datetime.now(timezone.utc)
        range_start = (now - timedelta(days=range_days)).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Total non-demo users for percentage calculations
            cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_demo = 0")
            total_users = max(cursor.fetchone()["total"], 1)

            # Feature Adoption (% of registered users who tried each feature)
            features = [
                ("Diagnostic Assessment", "DIAGNOSTIC_COMPLETED"),
                ("Socratic AI Tutor", "TUTOR_QUESTION_SUBMITTED"),
                ("Adaptive Quiz", "QUIZ_QUESTION_ATTEMPTED"),
                ("Spaced Revision", "REVISION_SESSION_COMPLETED"),
                ("Explore Live Video", "LIVE_VIDEO_SESSION_STARTED")
            ]

            feature_adoption = []
            for name, etype in features:
                cursor.execute("""
                    SELECT COUNT(DISTINCT user_id) as users_count
                    FROM user_activity_events
                    WHERE event_type = ?
                """, (etype,))
                ucnt = cursor.fetchone()["users_count"]
                pct = round((ucnt / total_users) * 100, 1)
                feature_adoption.append({
                    "feature": name,
                    "event_type": etype,
                    "unique_users": ucnt,
                    "adoption_percentage": pct
                })

            # Weekly Cohort Retention Matrix (Last 6 weeks)
            cohorts = []
            for w in range(5, -1, -1):
                cohort_start = (now - timedelta(days=(w + 1) * 7)).isoformat()
                cohort_end = (now - timedelta(days=w * 7)).isoformat()
                week_label = (now - timedelta(days=(w + 1) * 7)).strftime("%b %d")

                # Users registered in this cohort window
                cursor.execute("""
                    SELECT id FROM users
                    WHERE is_demo = 0 AND created_at >= ? AND created_at < ?
                """, (cohort_start, cohort_end))
                cohort_user_ids = [r["id"] for r in cursor.fetchall()]
                cohort_size = len(cohort_user_ids)

                if cohort_size == 0:
                    cohorts.append({
                        "week": week_label,
                        "size": 0,
                        "w0": 100.0,
                        "w1": 0.0,
                        "w2": 0.0,
                        "w3": 0.0
                    })
                    continue

                # For weeks 1, 2, 3: percentage of these cohort_user_ids who had activity
                retention_rates = {"w0": 100.0}
                placeholders = ",".join("?" * cohort_size)

                for offset_w in [1, 2, 3]:
                    w_start = (now - timedelta(days=(w + 1 - offset_w) * 7)).isoformat()
                    w_end = (now - timedelta(days=(w - offset_w) * 7)).isoformat()
                    if datetime.fromisoformat(w_start) > now:
                        retention_rates[f"w{offset_w}"] = None
                        continue

                    cursor.execute(f"""
                        SELECT COUNT(DISTINCT user_id) as active_count
                        FROM user_activity_events
                        WHERE user_id IN ({placeholders}) AND created_at >= ? AND created_at < ?
                    """, tuple(cohort_user_ids + [w_start, w_end]))
                    active_cnt = cursor.fetchone()["active_count"]
                    retention_rates[f"w{offset_w}"] = round((active_cnt / cohort_size) * 100, 1)

                cohorts.append({
                    "week": week_label,
                    "size": cohort_size,
                    **retention_rates
                })

            return {
                "feature_adoption": feature_adoption,
                "cohort_retention": cohorts,
                "total_users_sample": total_users
            }

    def get_owner_audit_logs(
        self,
        limit: int = 50,
        offset: int = 0,
        action: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Query immutable audit trail of owner actions, logins, and security events.
        """
        conditions = ["1=1"]
        params = []

        if action and action.strip() and action != "all":
            conditions.append("action = ?")
            params.append(action.strip().upper())

        where_clause = " AND ".join(conditions)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(f"SELECT COUNT(*) as total FROM owner_audit_logs WHERE {where_clause}", tuple(params))
            total = cursor.fetchone()["total"]

            cursor.execute(f"""
                SELECT id, actor_id, actor_email, action, target, status,
                       ip_address, user_agent, details_json, created_at
                FROM owner_audit_logs
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, tuple(params + [limit, offset]))
            logs = [dict(r) for r in cursor.fetchall()]

            return {
                "logs": logs,
                "total": total,
                "limit": limit,
                "offset": offset
            }

    def export_owner_report_csv(self, report_type: str, range_days: int = 30) -> str:
        """
        Generate authorized, privacy-respecting CSV report exports.
        Does not export passwords, hashes, session tokens, or raw private transcripts.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        now = datetime.now(timezone.utc)
        range_start = (now - timedelta(days=range_days)).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()

            if report_type == "registrations":
                writer.writerow(["User ID", "Student ID", "Full Name", "Email", "Role", "Auth Provider", "Created At (UTC)", "Last Login (UTC)"])
                cursor.execute("""
                    SELECT id, student_id, full_name, email, role, auth_provider, created_at, last_login_at
                    FROM users
                    WHERE is_demo = 0
                    ORDER BY created_at DESC
                """)
                for r in cursor.fetchall():
                    writer.writerow([r["id"], r["student_id"], r["full_name"], r["email"], r["role"], r["auth_provider"], r["created_at"], r["last_login_at"]])

            elif report_type == "logins":
                writer.writerow(["Timestamp (UTC)", "Event ID", "User ID", "Email", "Event Type", "Auth Provider", "Status", "Device", "Browser", "OS", "IP Address"])
                cursor.execute("""
                    SELECT created_at, id, user_id, email, event_type, auth_provider, status, device_category, browser, os, ip_address
                    FROM login_events
                    WHERE created_at >= ?
                    ORDER BY created_at DESC
                """, (range_start,))
                for r in cursor.fetchall():
                    writer.writerow([r["created_at"], r["id"], r["user_id"], r["email"], r["event_type"], r["auth_provider"], r["status"], r["device_category"], r["browser"], r["os"], r["ip_address"]])

            elif report_type == "learning-activity":
                writer.writerow(["Timestamp (UTC)", "Activity ID", "User ID", "Student ID", "Event Type", "Concept ID", "Duration Seconds"])
                cursor.execute("""
                    SELECT created_at, id, user_id, student_id, event_type, concept_id, duration_seconds
                    FROM user_activity_events
                    WHERE created_at >= ?
                    ORDER BY created_at DESC
                """, (range_start,))
                for r in cursor.fetchall():
                    writer.writerow([r["created_at"], r["id"], r["user_id"], r["student_id"], r["event_type"], r["concept_id"] or "", r["duration_seconds"]])

            elif report_type == "feature-usage":
                writer.writerow(["Feature Name", "Event Type", "Total Events", "Unique Users"])
                cursor.execute("""
                    SELECT event_type, COUNT(*) as event_count, COUNT(DISTINCT user_id) as unique_users
                    FROM user_activity_events
                    WHERE created_at >= ?
                    GROUP BY event_type
                    ORDER BY event_count DESC
                """, (range_start,))
                for r in cursor.fetchall():
                    writer.writerow([r["event_type"].replace("_", " ").title(), r["event_type"], r["event_count"], r["unique_users"]])

            elif report_type == "audit-logs":
                writer.writerow(["Timestamp (UTC)", "Log ID", "Actor Email", "Action", "Target", "Status", "IP Address", "Details"])
                cursor.execute("""
                    SELECT created_at, id, actor_email, action, target, status, ip_address, details_json
                    FROM owner_audit_logs
                    ORDER BY created_at DESC
                """)
                for r in cursor.fetchall():
                    writer.writerow([r["created_at"], r["id"], r["actor_email"], r["action"], r["target"], r["status"], r["ip_address"], r["details_json"] or ""])

            else:
                writer.writerow(["Error", "Invalid report type specified"])

        return output.getvalue()

storage = StorageManager()
