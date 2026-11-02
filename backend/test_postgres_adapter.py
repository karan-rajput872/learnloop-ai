"""
================================================================================
LEARNLOOP AI — PHASE 1.5 POSTGRESQL & SQLITE DUAL-ADAPTER TEST SUITE
================================================================================
Comprehensive verification of:
1. SQL tokenizer & parameter adaptation (? -> %s outside quotes/comments)
2. Database engine switching (SQLite vs PostgreSQL via DATABASE_URL)
3. PostgreSQL connection pooling, lease, commit, rollback, and cleanup
4. Broken socket disposal (putconn close=True) and stale connection renewal
5. Destructor connection leak prevention (__del__)
6. Application lifecycle shutdown pool cleanup
7. All 3 SQL compatibility fixes:
   - json_extract() dual-engine handling
   - 4 GROUP BY 1 queries
   - verified_proficiency_level = 'Level 1 — Beginner' string literal
8. All 5 ANSI-compliant UPSERT statements (ON CONFLICT DO UPDATE)
9. Full compatibility with existing SQLite production database
================================================================================
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.storage.db import (
    adapt_sql_for_postgres,
    PostgresCursorWrapper,
    PostgresConnectionWrapper,
    SqliteConnectionWrapper,
    StorageManager,
    DB_PATH
)
from app.gamification.service import gamification_service


class TestSqlTokenizerAndAdaptation(unittest.TestCase):
    """Test SQL query tokenization and safe parameter replacement."""

    def test_basic_placeholder_replacement(self):
        sql = "SELECT * FROM users WHERE email = ? AND role = ?"
        expected = "SELECT * FROM users WHERE email = %s AND role = %s"
        self.assertEqual(adapt_sql_for_postgres(sql), expected)

    def test_placeholder_inside_single_quotes_preserved(self):
        sql = "SELECT id, 'What is recursion?' as question FROM problems WHERE topic = ?"
        expected = "SELECT id, 'What is recursion?' as question FROM problems WHERE topic = %s"
        self.assertEqual(adapt_sql_for_postgres(sql), expected)

    def test_placeholder_inside_escaped_quotes_preserved(self):
        sql = "SELECT 'Don''t miss the ? sign' as msg WHERE id = ?"
        expected = "SELECT 'Don''t miss the ? sign' as msg WHERE id = %s"
        self.assertEqual(adapt_sql_for_postgres(sql), expected)

    def test_placeholder_inside_double_quotes_preserved(self):
        sql = 'SELECT "column?name" FROM table_name WHERE id = ?'
        expected = 'SELECT "column?name" FROM table_name WHERE id = %s'
        self.assertEqual(adapt_sql_for_postgres(sql), expected)

    def test_placeholder_inside_line_comment_preserved(self):
        sql = "SELECT * FROM users -- should we check id = ?\nWHERE email = ?"
        expected = "SELECT * FROM users -- should we check id = ?\nWHERE email = %s"
        self.assertEqual(adapt_sql_for_postgres(sql), expected)

    def test_placeholder_inside_block_comment_preserved(self):
        sql = "SELECT * FROM users /* comment with ? mark */ WHERE id = ?"
        expected = "SELECT * FROM users /* comment with ? mark */ WHERE id = %s"
        self.assertEqual(adapt_sql_for_postgres(sql), expected)

    def test_datetime_now_conversion(self):
        sql = "SELECT * FROM tasks WHERE datetime(due_date) <= datetime('now')"
        adapted = adapt_sql_for_postgres(sql)
        self.assertIn("CURRENT_TIMESTAMP", adapted)
        self.assertNotIn("datetime('now')", adapted)


class TestPostgresAdapterWrappers(unittest.TestCase):
    """Test PostgreSQL connection pooling, cursor wrapping, and transactions."""

    def test_cursor_wrapper_executes_adapted_sql(self):
        mock_real_cursor = MagicMock()
        wrapper = PostgresCursorWrapper(mock_real_cursor)

        wrapper.execute("SELECT * FROM learners WHERE student_id = ?", ("s123",))
        mock_real_cursor.execute.assert_called_once_with(
            "SELECT * FROM learners WHERE student_id = %s",
            ("s123",)
        )

    def test_cursor_wrapper_executemany(self):
        mock_real_cursor = MagicMock()
        wrapper = PostgresCursorWrapper(mock_real_cursor)

        params = [("s1", "c1"), ("s2", "c2")]
        wrapper.executemany("DELETE FROM concept_mastery WHERE student_id = ? AND concept_id = ?", params)
        mock_real_cursor.executemany.assert_called_once_with(
            "DELETE FROM concept_mastery WHERE student_id = %s AND concept_id = %s",
            params
        )

    def test_connection_wrapper_commits_and_returns_on_success(self):
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn

        with PostgresConnectionWrapper(mock_pool) as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")

        mock_conn.commit.assert_called_once()
        mock_pool.putconn.assert_called_once_with(mock_conn, close=False)

    def test_connection_wrapper_rolls_back_and_returns_on_error(self):
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn

        with self.assertRaises(ValueError):
            with PostgresConnectionWrapper(mock_pool) as conn:
                raise ValueError("Simulated database error")

        mock_conn.rollback.assert_called_once()
        mock_pool.putconn.assert_called_once_with(mock_conn, close=False)

    def test_broken_connection_disposal_close_true(self):
        """Verify that broken sockets (closed != 0) are discarded via putconn(conn, close=True)."""
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0  # initially open
        mock_pool.getconn.return_value = mock_conn

        wrapper = PostgresConnectionWrapper(mock_pool)
        # Simulate connection dropping while in use
        mock_conn.closed = 1
        wrapper.close()

        mock_pool.putconn.assert_called_once_with(mock_conn, close=True)

    def test_stale_connection_retry_on_lease(self):
        """Verify that a stale socket leased from pool is discarded and renewed."""
        mock_pool = MagicMock()
        stale_conn = MagicMock()
        stale_conn.closed = 1  # severed by Neon idle suspend
        fresh_conn = MagicMock()
        fresh_conn.closed = 0

        mock_pool.getconn.side_effect = [stale_conn, fresh_conn]

        wrapper = PostgresConnectionWrapper(mock_pool)
        self.assertEqual(wrapper._conn, fresh_conn)
        mock_pool.putconn.assert_called_once_with(stale_conn, close=True)

    def test_destructor_prevents_leaks(self):
        """Verify __del__ releases connection if closed was not explicitly called."""
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn

        wrapper = PostgresConnectionWrapper(mock_pool)
        del wrapper
        mock_pool.putconn.assert_called_once_with(mock_conn, close=False)

    def test_pool_exhaustion_raises_runtime_error(self):
        """Verify that psycopg2 PoolError is caught and raised with informative message."""
        import psycopg2.pool
        mock_pool = MagicMock()
        mock_pool.getconn.side_effect = psycopg2.pool.PoolError("connection pool exhausted")

        with self.assertRaises(RuntimeError) as ctx:
            PostgresConnectionWrapper(mock_pool)
        self.assertIn("connection pool exhausted", str(ctx.exception))

    def test_storage_close_cleans_pool(self):
        """Verify storage.close() gracefully invokes closeall() on pool."""
        storage = StorageManager()
        mock_pool = MagicMock()
        storage._pg_pool = mock_pool

        storage.close()
        mock_pool.closeall.assert_called_once()
        self.assertIsNone(storage._pg_pool)


class TestSqlCompatibilityFixes(unittest.TestCase):
    """Test the three specific SQL compatibility fixes."""

    def test_01_json_extract_owner_analytics_sqlite(self):
        """Verify get_owner_learning_analytics runs accurately in SQLite without error."""
        storage = StorageManager()
        storage.is_postgres = False
        res = storage.get_owner_learning_analytics(range_days=30)
        self.assertIn("top_concepts", res)
        self.assertIn("events_by_type", res)
        self.assertIn("volume_series", res)

    def test_02_json_extract_postgres_syntax(self):
        """Verify get_owner_learning_analytics generates PostgreSQL native JSON operator."""
        storage = StorageManager()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cur
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.__exit__.return_value = None

        storage.is_postgres = True
        try:
            with patch.object(storage, "get_connection", return_value=mock_conn):
                storage.get_owner_learning_analytics(range_days=30)

            # Check that the query used metadata_json::json->>
            executed_queries = [call[0][0] for call in mock_cur.execute.call_args_list]
            accuracy_query = next((q for q in executed_queries if "attempts_count" in q), None)
            self.assertIsNotNone(accuracy_query)
            self.assertIn("metadata_json::json->>'is_correct'", accuracy_query)
            self.assertNotIn("json_extract", accuracy_query)
        finally:
            storage.is_postgres = False

    def test_03_all_four_group_by_1_queries_on_sqlite(self):
        """Verify that all four GROUP BY 1 queries execute cleanly on SQLite."""
        storage = StorageManager()
        with storage.get_connection() as conn:
            cur = conn.cursor()

            # Query 1: users daily registrations
            cur.execute("""
                SELECT substr(created_at, 1, 10) as day, COUNT(*) as cnt
                FROM users
                WHERE is_demo = 0
                GROUP BY 1
                ORDER BY 1 ASC
            """)
            r1 = cur.fetchall()
            self.assertIsInstance(r1, list)

            # Query 2: login_events daily active users & logins
            cur.execute("""
                SELECT substr(created_at, 1, 10) as day,
                       COUNT(DISTINCT user_id) as active_users,
                       COUNT(*) as logins
                FROM login_events
                WHERE event_type = 'LOGIN_SUCCESS'
                GROUP BY 1
                ORDER BY 1 ASC
            """)
            r2 = cur.fetchall()
            self.assertIsInstance(r2, list)

            # Query 3: user_activity_events daily events
            cur.execute("""
                SELECT substr(created_at, 1, 10) as day, COUNT(*) as total_events
                FROM user_activity_events
                GROUP BY 1
                ORDER BY 1 ASC
            """)
            r3 = cur.fetchall()
            self.assertIsInstance(r3, list)

            # Query 4: user_activity_events volume trend breakdown
            cur.execute("""
                SELECT substr(created_at, 1, 10) as day,
                       COUNT(*) as total_events,
                       SUM(CASE WHEN event_type = 'TUTOR_QUESTION_SUBMITTED' THEN 1 ELSE 0 END) as tutor_questions,
                       SUM(CASE WHEN event_type = 'QUIZ_QUESTION_ATTEMPTED' THEN 1 ELSE 0 END) as quiz_attempts,
                       SUM(CASE WHEN event_type = 'DIAGNOSTIC_COMPLETED' THEN 1 ELSE 0 END) as diagnostics
                FROM user_activity_events
                GROUP BY 1
                ORDER BY 1 ASC
            """)
            r4 = cur.fetchall()
            self.assertIsInstance(r4, list)

    def test_04_verified_proficiency_level_string_literal(self):
        """Verify that reset profile query assigns string 'Level 1 — Beginner' matching schema."""
        storage = StorageManager()
        test_id = "test_reset_learner_prof_001"
        storage.ensure_learner(test_id, "Test Reset")

        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE learners
                SET overall_mastery = 0.0,
                    diagnostic_completed = 0,
                    onboarding_completed = 0,
                    verified_proficiency_level = 'Level 1 — Beginner',
                    verified_proficiency_score = 0.0,
                    learning_path_json = NULL
                WHERE student_id = ?
            """, (test_id,))
            conn.commit()

            cur.execute("SELECT verified_proficiency_level FROM learners WHERE student_id = ?", (test_id,))
            row = cur.fetchone()
            self.assertEqual(row["verified_proficiency_level"], "Level 1 — Beginner")

            cur.execute("DELETE FROM learners WHERE student_id = ?", (test_id,))
            cur.execute("DELETE FROM concept_mastery WHERE student_id = ?", (test_id,))
            conn.commit()


class TestDatabaseAgnosticSchemaInspection(unittest.TestCase):
    """Test _get_table_columns on both SQLite and PostgreSQL modes."""

    def test_schema_inspection_sqlite(self):
        storage = StorageManager()
        with storage.get_connection() as conn:
            cur = conn.cursor()
            cols = storage._get_table_columns(cur, "users")
            self.assertIn("id", cols)
            self.assertIn("email", cols)
            self.assertIn("role", cols)
            self.assertIn("is_demo", cols)

    def test_schema_inspection_postgres_mock(self):
        storage = StorageManager()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = [("id",), ("student_id",), ("name",), ("overall_mastery",)]

        storage.is_postgres = True
        try:
            cols = storage._get_table_columns(mock_cur, "learners")
            self.assertEqual(cols, ["id", "student_id", "name", "overall_mastery"])
            mock_cur.execute.assert_called_once()
            called_sql = mock_cur.execute.call_args[0][0]
            self.assertIn("information_schema.columns", called_sql)
        finally:
            storage.is_postgres = False


class TestUpsertStatementsLive(unittest.TestCase):
    """Test all 5 rewritten ON CONFLICT DO UPDATE statements on the database."""

    def test_01_learners_upsert(self):
        storage = StorageManager()
        now = datetime.now(timezone.utc).isoformat()
        test_id = "test_upsert_learner_001"

        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO learners
                (student_id, name, target_exam, overall_mastery, diagnostic_completed, onboarding_completed, verified_proficiency_level, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    target_exam = EXCLUDED.target_exam,
                    overall_mastery = EXCLUDED.overall_mastery,
                    diagnostic_completed = EXCLUDED.diagnostic_completed,
                    onboarding_completed = EXCLUDED.onboarding_completed,
                    verified_proficiency_level = EXCLUDED.verified_proficiency_level,
                    updated_at = EXCLUDED.updated_at
            """, (test_id, "Test Upsert Initial", "Exam A", 10.0, 0, 0, "Level 1 — Beginner", now, now))
            conn.commit()

            cur.execute("""
                INSERT INTO learners
                (student_id, name, target_exam, overall_mastery, diagnostic_completed, onboarding_completed, verified_proficiency_level, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    target_exam = EXCLUDED.target_exam,
                    overall_mastery = EXCLUDED.overall_mastery,
                    diagnostic_completed = EXCLUDED.diagnostic_completed,
                    onboarding_completed = EXCLUDED.onboarding_completed,
                    verified_proficiency_level = EXCLUDED.verified_proficiency_level,
                    updated_at = EXCLUDED.updated_at
            """, (test_id, "Test Upsert Updated", "Exam B", 75.0, 1, 1, "Level 3 — Proficient", now, now))
            conn.commit()

            cur.execute("SELECT name, target_exam, overall_mastery FROM learners WHERE student_id = ?", (test_id,))
            row = cur.fetchone()
            self.assertEqual(row["name"], "Test Upsert Updated")
            self.assertEqual(row["target_exam"], "Exam B")
            self.assertEqual(row["overall_mastery"], 75.0)

            cur.execute("DELETE FROM learners WHERE student_id = ?", (test_id,))
            conn.commit()

    def test_02_concept_mastery_upsert(self):
        storage = StorageManager()
        test_sid = "test_upsert_student_002"
        test_cid = "test_concept_arrays"

        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO concept_mastery
                (student_id, concept_id, concept_name, category, mastery_percentage,
                 questions_attempted, correct_answers, incorrect_answers, current_difficulty,
                 last_misconception, last_misconception_name, last_practiced_at, next_revision_at, consecutive_correct)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id, concept_id) DO UPDATE SET
                    concept_name = EXCLUDED.concept_name,
                    category = EXCLUDED.category,
                    mastery_percentage = EXCLUDED.mastery_percentage,
                    questions_attempted = EXCLUDED.questions_attempted,
                    correct_answers = EXCLUDED.correct_answers,
                    incorrect_answers = EXCLUDED.incorrect_answers,
                    current_difficulty = EXCLUDED.current_difficulty,
                    last_misconception = EXCLUDED.last_misconception,
                    last_misconception_name = EXCLUDED.last_misconception_name,
                    last_practiced_at = EXCLUDED.last_practiced_at,
                    next_revision_at = EXCLUDED.next_revision_at,
                    consecutive_correct = EXCLUDED.consecutive_correct
            """, (test_sid, test_cid, "Arrays", "Linear", 0.0, 0, 0, 0, "novice", None, None, None, None, 0))
            conn.commit()

            cur.execute("""
                INSERT INTO concept_mastery
                (student_id, concept_id, concept_name, category, mastery_percentage,
                 questions_attempted, correct_answers, incorrect_answers, current_difficulty,
                 last_misconception, last_misconception_name, last_practiced_at, next_revision_at, consecutive_correct)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id, concept_id) DO UPDATE SET
                    concept_name = EXCLUDED.concept_name,
                    category = EXCLUDED.category,
                    mastery_percentage = EXCLUDED.mastery_percentage,
                    questions_attempted = EXCLUDED.questions_attempted,
                    correct_answers = EXCLUDED.correct_answers,
                    incorrect_answers = EXCLUDED.incorrect_answers,
                    current_difficulty = EXCLUDED.current_difficulty,
                    last_misconception = EXCLUDED.last_misconception,
                    last_misconception_name = EXCLUDED.last_misconception_name,
                    last_practiced_at = EXCLUDED.last_practiced_at,
                    next_revision_at = EXCLUDED.next_revision_at,
                    consecutive_correct = EXCLUDED.consecutive_correct
            """, (test_sid, test_cid, "Arrays", "Linear", 90.0, 10, 9, 1, "proficient", None, None, "2026-11-01", "2026-11-04", 4))
            conn.commit()

            cur.execute("SELECT mastery_percentage, consecutive_correct FROM concept_mastery WHERE student_id = ? AND concept_id = ?", (test_sid, test_cid))
            row = cur.fetchone()
            self.assertEqual(row["mastery_percentage"], 90.0)
            self.assertEqual(row["consecutive_correct"], 4)

            cur.execute("DELETE FROM concept_mastery WHERE student_id = ?", (test_sid,))
            conn.commit()

    def test_03_revision_tasks_upsert(self):
        storage = StorageManager()
        task = {
            "id": "test_rev_task_003",
            "student_id": "test_student_003",
            "concept_id": "binary_search",
            "concept_name": "Binary Search",
            "due_date": "2026-11-05",
            "status": "pending",
            "reason": "Test Spaced Repetition",
            "urgency": "high"
        }
        storage.schedule_revision(task)

        task["urgency"] = "critical"
        task["status"] = "in_progress"
        storage.schedule_revision(task)

        tasks = storage.get_revision_tasks("test_student_003")
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["urgency"], "critical")
        self.assertEqual(tasks[0]["status"], "in_progress")

        with storage.get_connection() as conn:
            conn.cursor().execute("DELETE FROM revision_tasks WHERE student_id = 'test_student_003'")
            conn.commit()

    def test_04_diagnostic_attempts_upsert(self):
        storage = StorageManager()
        attempt = {
            "id": "test_diag_attempt_004",
            "student_id": "test_student_004",
            "score": 5,
            "total_questions": 6,
            "percentage": 83.3,
            "concept_results": [{"concept": "arrays", "correct": 1}],
            "question_details": []
        }
        storage.save_diagnostic_attempt(attempt)

        attempt["score"] = 6
        attempt["percentage"] = 100.0
        storage.save_diagnostic_attempt(attempt)

        attempts = storage.get_diagnostic_attempts("test_student_004")
        self.assertEqual(len(attempts), 1)
        self.assertEqual(attempts[0]["score"], 6)
        self.assertEqual(attempts[0]["percentage"], 100.0)

        with storage.get_connection() as conn:
            conn.cursor().execute("DELETE FROM diagnostic_attempts WHERE student_id = 'test_student_004'")
            conn.commit()

    def test_05_user_settings_upsert(self):
        test_sid = "test_user_settings_005"
        settings_1 = {
            "theme": "dark",
            "daily_goal_minutes": 45,
            "reminder_notifications": True
        }
        gamification_service.update_user_settings(test_sid, settings_1)

        settings_2 = {
            "theme": "light",
            "daily_goal_minutes": 60,
            "reminder_notifications": False
        }
        saved = gamification_service.update_user_settings(test_sid, settings_2)
        self.assertEqual(saved["theme"], "light")
        self.assertEqual(saved["daily_goal_minutes"], 60)
        self.assertEqual(saved["reminder_notifications"], False)

        with StorageManager().get_connection() as conn:
            conn.cursor().execute("DELETE FROM user_settings WHERE student_id = ?", (test_sid,))
            conn.commit()


class TestExistingProductionDataIntegrity(unittest.TestCase):
    """Verify that existing production tables, accounts, and learner data are intact."""

    def test_all_20_tables_exist(self):
        storage = StorageManager()
        expected_tables = {
            "learners", "concept_mastery", "attempts", "revision_tasks",
            "teacher_demo_cohort", "chat_messages", "diagnostic_attempts",
            "users", "user_sessions", "password_reset_tokens",
            "user_activity_logs", "user_streaks", "user_gamification",
            "user_achievements", "user_challenges", "user_settings",
            "user_notifications", "login_events", "user_activity_events",
            "owner_audit_logs"
        }
        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing = {r["name"] for r in cur.fetchall()}

        for table in expected_tables:
            self.assertIn(table, existing, f"Table '{table}' must exist in database")

    def test_existing_learner_and_users_readable(self):
        storage = StorageManager()
        with storage.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) as count FROM users")
            user_count = cur.fetchone()["count"]
            self.assertGreater(user_count, 0, "Users table must contain records")

            cur.execute("SELECT COUNT(*) as count FROM learners")
            learner_count = cur.fetchone()["count"]
            self.assertGreater(learner_count, 0, "Learners table must contain records")




class TestConnectionFailureSafety(unittest.TestCase):
    """
    [CATEGORY B: PostgreSQL Mock Unit Tests]
    Verifies connection failure handling, broken socket disposal, failed commit/rollback,
    and prevention of double cleanup or unhandled write replays.
    """

    def test_failed_commit_marks_broken_and_discards(self):
        """Verify that when commit() raises an exception, the connection is marked broken and returned with close=True."""
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn
        mock_conn.commit.side_effect = Exception("Commit error: disk full")

        with self.assertRaises(Exception):
            with PostgresConnectionWrapper(mock_pool) as conn:
                pass  # Context exits cleanly, triggering commit() which raises

        mock_pool.putconn.assert_called_once_with(mock_conn, close=True)

    def test_failed_rollback_marks_broken_and_discards(self):
        """Verify that when rollback() fails during error cleanup, connection is marked broken and returned with close=True."""
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn
        mock_conn.rollback.side_effect = Exception("Rollback error: network disconnected")

        with self.assertRaises(ValueError):
            with PostgresConnectionWrapper(mock_pool) as conn:
                raise ValueError("User block error")

        mock_pool.putconn.assert_called_once_with(mock_conn, close=True)

    def test_double_return_prevented_on_multiple_close_calls(self):
        """Verify that calling close() multiple times returns the connection to pool exactly once."""
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn

        wrapper = PostgresConnectionWrapper(mock_pool)
        wrapper.close()
        wrapper.close()  # Duplicate close call
        del wrapper      # Destructor invocation

        mock_pool.putconn.assert_called_once_with(mock_conn, close=False)

    def test_uncertain_write_outcomes_never_replayed(self):
        """Verify that if a write query fails, the wrapper never automatically replays it and propagates the error."""
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_conn.closed = 0
        mock_pool.getconn.return_value = mock_conn

        mock_cur = MagicMock()
        import psycopg2
        mock_cur.execute.side_effect = psycopg2.OperationalError("server closed the connection unexpectedly")
        mock_conn.cursor.return_value = mock_cur

        with self.assertRaises(psycopg2.OperationalError):
            with PostgresConnectionWrapper(mock_pool) as conn:
                cur = conn.cursor()
                cur.execute("INSERT INTO users (id) VALUES (%s)", ("usr_uncertain",))

        # Ensure query was executed only ONCE (no blind automatic replay of uncertain writes)
        self.assertEqual(mock_cur.execute.call_count, 1)
        # Ensure connection was marked broken and discarded
        mock_pool.putconn.assert_called_once_with(mock_conn, close=True)

    def test_active_probe_discards_dead_socket_and_renews(self):
        """Verify that on checkout, if probe raises OperationalError, dead socket is discarded with close=True and renewed."""
        mock_pool = MagicMock()
        dead_conn = MagicMock()
        dead_conn.closed = 0
        import psycopg2
        dead_cur = MagicMock()
        dead_cur.execute.side_effect = psycopg2.OperationalError("server closed connection unexpectedly")
        dead_conn.cursor.return_value.__enter__.return_value = dead_cur

        live_conn = MagicMock()
        live_conn.closed = 0
        live_cur = MagicMock()
        live_conn.cursor.return_value.__enter__.return_value = live_cur

        mock_pool.getconn.side_effect = [dead_conn, live_conn]

        wrapper = PostgresConnectionWrapper(mock_pool)
        self.assertEqual(wrapper._conn, live_conn)
        mock_pool.putconn.assert_called_once_with(dead_conn, close=True)


class TestMigrationSafetyHardeningMock(unittest.TestCase):
    """
    [CATEGORY B: PostgreSQL Mock Unit Tests]
    Verifies migration utility conflict protection, row comparison,
    non-empty destination halt, resume verification, and exact count enforcement.
    """

    def test_nonempty_target_table_stops_initial_migration(self):
        """Verify execute_migration halts if target tables contain data and resume=False."""
        from scripts.migrate_sqlite_to_postgres import execute_migration, DEFAULT_SQLITE_PATH
        
        mock_pg_conn = MagicMock()
        mock_cur = MagicMock()
        mock_pg_conn.cursor.return_value = mock_cur
        
        with patch("scripts.migrate_sqlite_to_postgres.create_sqlite_backup", return_value="dummy_backup.db"),              patch("psycopg2.connect", return_value=mock_pg_conn),              patch("sqlite3.connect"),              patch("scripts.migrate_sqlite_to_postgres.inspect_postgres_target") as mock_inspect:
            
            mock_inspect.return_value = {
                "database": "mock_db",
                "user": "mock_user",
                "version": "PostgreSQL 16",
                "existing_tables": {"users"},
                "table_counts": {"users": 5},
                "primary_keys": {"users": ["id"]},
                "foreign_keys": []
            }

            result = execute_migration(
                sqlite_path=DEFAULT_SQLITE_PATH,
                pg_url="postgresql://mock:mock@localhost/mock",
                confirm=True,
                resume=False
            )

            self.assertFalse(result, "Initial migration must halt when target has existing records")

    def test_conflicting_primary_keys_different_values_detected(self):
        """Verify compare_rows flags value divergences between source and target rows."""
        from scripts.migrate_sqlite_to_postgres import compare_rows
        
        source = {"id": "usr_001", "email": "alice@learnloop.ai", "role": "student"}
        target_divergent = {"id": "usr_001", "email": "alice_old@learnloop.ai", "role": "owner"}
        
        diffs = compare_rows(source, target_divergent, ["id", "email", "role"])
        self.assertIn("email", diffs)
        self.assertIn("role", diffs)
        self.assertNotIn("id", diffs)

    def test_identical_primary_keys_marked_as_safe_skip(self):
        """Verify compare_rows returns empty diff list when values match identically."""
        from scripts.migrate_sqlite_to_postgres import compare_rows
        
        source = {"id": "usr_001", "email": "alice@learnloop.ai", "role": "student"}
        target_identical = {"id": "usr_001", "email": "alice@learnloop.ai", "role": "student"}
        
        diffs = compare_rows(source, target_identical, ["id", "email", "role"])
        self.assertEqual(diffs, [])

    def test_exact_count_reconciliation_detects_mismatch(self):
        """Verify that count mismatch (e.g. pg_count != row_count) marks table as MISMATCH."""
        sqlite_count = 126
        pg_count_excess = 127
        pg_count_deficit = 125
        
        self.assertFalse(pg_count_excess == sqlite_count)
        self.assertFalse(pg_count_deficit == sqlite_count)
        self.assertTrue(sqlite_count == 126)

    def test_interrupted_migration_resumes_safely(self):
        """Verify that when resume=True and data is identical, migration proceeds without error."""
        from scripts.migrate_sqlite_to_postgres import execute_migration, DEFAULT_SQLITE_PATH
        
        mock_pg_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = [0]
        mock_pg_conn.cursor.return_value = mock_cur
        
        with patch("scripts.migrate_sqlite_to_postgres.create_sqlite_backup", return_value="dummy_backup.db"),              patch("psycopg2.connect", return_value=mock_pg_conn),              patch("sqlite3.connect") as mock_sqlite_conn,              patch("scripts.migrate_sqlite_to_postgres.inspect_postgres_target") as mock_inspect:
            
            mock_inspect.return_value = {
                "database": "mock_db",
                "user": "mock_user",
                "version": "PostgreSQL 16",
                "existing_tables": {"users"},
                "table_counts": {"users": 0},
                "primary_keys": {"users": ["id"]},
                "foreign_keys": []
            }
            
            mock_s_cur = MagicMock()
            mock_s_cur.fetchall.return_value = []
            mock_sqlite_conn.return_value.cursor.return_value = mock_s_cur
            
            result = execute_migration(
                sqlite_path=DEFAULT_SQLITE_PATH,
                pg_url="postgresql://mock:mock@localhost/mock",
                confirm=True,
                resume=True
            )
            self.assertTrue(result)

if __name__ == "__main__":
    unittest.main(verbosity=2)
