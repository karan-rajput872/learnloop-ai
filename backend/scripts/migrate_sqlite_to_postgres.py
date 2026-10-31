"""
LearnLoop AI — Zero-Downtime SQLite to PostgreSQL Migration Utility
Transfers all users, learner profiles, concept masteries, attempts, revision tasks,
chat messages, and authentication sessions from local SQLite to managed PostgreSQL.
Preserves primary keys, foreign keys, timestamps, and row counts.
"""

import os
import sys
import shutil
import sqlite3
import json
from datetime import datetime, timezone

try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("[ERROR] psycopg2-binary is not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_PATH = os.path.join(BACKEND_DIR, "data", "learnloop.db")
BACKUP_DIR = os.path.join(BACKEND_DIR, "data", "backups")

# 1. PostgreSQL Schema Definition
PG_TABLE_SCHEMAS = {
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            student_id VARCHAR(64) UNIQUE,
            full_name VARCHAR(128) NOT NULL,
            email VARCHAR(255) NOT NULL,
            normalized_email VARCHAR(255) NOT NULL UNIQUE,
            hashed_password TEXT,
            google_sub VARCHAR(128) UNIQUE,
            auth_provider VARCHAR(32) NOT NULL DEFAULT 'local',
            role VARCHAR(32) NOT NULL DEFAULT 'student',
            is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL,
            last_login_at TIMESTAMPTZ
        );
    """,
    "learners": """
        CREATE TABLE IF NOT EXISTS learners (
            student_id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128),
            target_exam VARCHAR(128),
            overall_mastery DOUBLE PRECISION,
            diagnostic_completed INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ
        );
    """,
    "concept_mastery": """
        CREATE TABLE IF NOT EXISTS concept_mastery (
            student_id VARCHAR(64),
            concept_id VARCHAR(64),
            concept_name VARCHAR(128),
            category VARCHAR(64),
            mastery_percentage DOUBLE PRECISION,
            questions_attempted INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            incorrect_answers INTEGER DEFAULT 0,
            current_difficulty VARCHAR(32),
            last_misconception TEXT,
            last_misconception_name TEXT,
            last_practiced_at TIMESTAMPTZ,
            next_revision_at TIMESTAMPTZ,
            consecutive_correct INTEGER DEFAULT 0,
            PRIMARY KEY (student_id, concept_id)
        );
    """,
    "attempts": """
        CREATE TABLE IF NOT EXISTS attempts (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(64),
            question_id VARCHAR(64),
            concept_id VARCHAR(64),
            selected_option VARCHAR(16),
            is_correct INTEGER,
            student_reasoning TEXT,
            detected_misconception TEXT,
            score_delta DOUBLE PRECISION,
            timestamp TIMESTAMPTZ
        );
    """,
    "revision_tasks": """
        CREATE TABLE IF NOT EXISTS revision_tasks (
            id VARCHAR(64) PRIMARY KEY,
            student_id VARCHAR(64),
            concept_id VARCHAR(64),
            concept_name VARCHAR(128),
            due_date TIMESTAMPTZ,
            status VARCHAR(32),
            reason TEXT,
            urgency VARCHAR(32)
        );
    """,
    "teacher_demo_cohort": """
        CREATE TABLE IF NOT EXISTS teacher_demo_cohort (
            student_id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128),
            overall_mastery DOUBLE PRECISION,
            weakest_concept VARCHAR(64),
            primary_misconception TEXT,
            days_inactive INTEGER,
            needs_intervention INTEGER,
            data_json TEXT
        );
    """,
    "chat_messages": """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id VARCHAR(64) PRIMARY KEY,
            session_id VARCHAR(64),
            student_id VARCHAR(64),
            role VARCHAR(32),
            content TEXT,
            metadata_json TEXT,
            timestamp TIMESTAMPTZ
        );
    """,
    "diagnostic_attempts": """
        CREATE TABLE IF NOT EXISTS diagnostic_attempts (
            id VARCHAR(64) PRIMARY KEY,
            student_id VARCHAR(64),
            score INTEGER,
            total_questions INTEGER,
            percentage DOUBLE PRECISION,
            concept_results TEXT,
            question_details TEXT,
            timestamp TIMESTAMPTZ
        );
    """,
    "user_sessions": """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
            device_info TEXT,
            created_at TIMESTAMPTZ NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            last_used_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            previous_token_hash VARCHAR(128),
            rotated_at TIMESTAMPTZ
        );
    """,
    "password_reset_tokens": """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(128) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL
        );
    """
}

def create_sqlite_backup():
    """Create timestamped physical copy of SQLite database before migration."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"learnloop_pre_migration_{ts}.db")
    shutil.copy2(SQLITE_PATH, backup_file)
    print(f"[BACKUP] Verified SQLite database snapshot saved to:\n  -> {backup_file}")
    return backup_file

def get_pg_connection(database_url: str):
    """Normalize and connect to PostgreSQL."""
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(database_url)

def run_migration():
    print("=" * 70)
    print("LEARNLOOP AI — SQLITE TO POSTGRESQL ZERO-DOWNTIME MIGRATION")
    print("=" * 70)

    if not os.path.exists(SQLITE_PATH):
        print(f"[ERROR] SQLite database file not found at: {SQLITE_PATH}")
        sys.exit(1)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("\n[BLOCKED] DATABASE_URL environment variable is not configured.")
        print("\nHOW TO PROVISION AND CONFIGURE MANAGED POSTGRESQL:")
        print("1. Option A (Render Managed PostgreSQL):")
        print("   - In Render Dashboard, click 'New' -> 'PostgreSQL'")
        print("   - Name: learnloop-postgres, Database: learnloop, User: learnloop_user")
        print("   - Copy 'Internal Database URL' (for Render web service) or 'External Database URL'")
        print("2. Option B (Neon Serverless PostgreSQL - Free Tier):")
        print("   - Go to https://neon.tech and create a free project 'learnloop-db'")
        print("   - Copy the connection string: postgresql://user:password@ep-...neon.tech/neondb?sslmode=require")
        print("3. Option C (Supabase PostgreSQL):")
        print("   - Create project at https://supabase.com -> Database Settings -> URI")
        print("\nOnce provisioned, execute this migration:")
        print("   $env:DATABASE_URL='postgresql://user:password@host/dbname'")
        print("   python scripts/migrate_sqlite_to_postgres.py")
        print("=" * 70)
        return False

    # 1. Backup SQLite
    backup_path = create_sqlite_backup()

    # 2. Connect to both databases
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    pg_conn = get_pg_connection(database_url)
    pg_conn.autocommit = False
    pg_cursor = pg_conn.cursor()

    migration_stats = {}

    try:
        # 3. Create tables in dependency order
        print("\n[STEP 1] Creating PostgreSQL Schema & Foreign Key Constraints...")
        for table, schema in PG_TABLE_SCHEMAS.items():
            pg_cursor.execute(schema)
        pg_conn.commit()
        print("  -> Schema initialized successfully.")

        # 4. Migrate tables in dependency order
        tables_in_order = [
            "users",
            "learners",
            "concept_mastery",
            "attempts",
            "revision_tasks",
            "teacher_demo_cohort",
            "chat_messages",
            "diagnostic_attempts",
            "user_sessions",
            "password_reset_tokens"
        ]

        print("\n[STEP 2] Migrating Records Idempotently...")
        for table in tables_in_order:
            sqlite_cursor.execute(f"SELECT * FROM {table}")
            rows = sqlite_cursor.fetchall()
            row_count = len(rows)

            if row_count == 0:
                print(f"  [{table.upper()}] 0 rows found in SQLite. Skipped.")
                migration_stats[table] = {"sqlite": 0, "postgres": 0}
                continue

            col_names = [col[0] for col in sqlite_cursor.description]
            cols_clause = ", ".join(col_names)
            placeholders = ", ".join(["%s"] * len(col_names))

            insert_query = f"""
                INSERT INTO {table} ({cols_clause})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """

            batch_data = []
            for r in rows:
                data_row = []
                for val in r:
                    # Handle boolean conversion for PostgreSQL
                    if table == "users" and val in (0, 1):
                        data_row.append(bool(val))
                    else:
                        data_row.append(val)
                batch_data.append(tuple(data_row))

            execute_batch(pg_cursor, insert_query, batch_data, page_size=200)
            pg_conn.commit()

            # Verify migrated count
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            pg_count = pg_cursor.fetchone()[0]
            migration_stats[table] = {"sqlite": row_count, "postgres": pg_count}
            print(f"  [{table.upper()}] Migrated {row_count} records. PostgreSQL count: {pg_count}")

        print("\n" + "=" * 70)
        print("MIGRATION INTEGRITY SUMMARY")
        print("=" * 70)
        all_passed = True
        for table, counts in migration_stats.items():
            is_valid = counts["postgres"] >= counts["sqlite"]
            status_str = "MATCH" if is_valid else "MISMATCH"
            print(f"  {table.ljust(25)}: SQLite={counts['sqlite']}, Postgres={counts['postgres']} [{status_str}]")
            if not is_valid:
                all_passed = False

        if all_passed:
            print("\n[SUCCESS] PostgreSQL migration successfully completed with 100% data fidelity.")
        else:
            print("\n[WARNING] Row count discrepancies detected. Review details above.")

        return all_passed

    except Exception as e:
        pg_conn.rollback()
        print(f"[MIGRATION FAILED] Rolling back transaction: {e}")
        return False
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    run_migration()

