import os
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from app.dsa.syllabus import DSA_CONCEPTS

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
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (
                    id, student_id, full_name, email, normalized_email,
                    hashed_password, google_sub, auth_provider, role,
                    is_email_verified, is_active, created_at, updated_at, last_login_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                user_data.get("last_login_at", now)
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

    def get_teacher_dashboard_data(self) -> Dict[str, Any]:
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
                "sample_notice": "Demonstration Cohort Notice: Metrics displayed here represent seeded demonstration cohorts for educational demonstration as required by the hackathon specifications."
            }

storage = StorageManager()
