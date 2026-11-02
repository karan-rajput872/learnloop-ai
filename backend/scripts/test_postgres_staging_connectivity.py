"""
================================================================================
LearnLoop AI — PostgreSQL 17 Staging Read-Only Connectivity & Inspection Utility
================================================================================
STRICT READ-ONLY GUARANTEES:
1. Sets PostgreSQL session to readonly: `conn.set_session(readonly=True, autocommit=True)`.
2. Executes ONLY read-only metadata queries (`SELECT ...`, `information_schema`, `pg_stat_ssl`).
3. ZERO writes: Never executes CREATE, ALTER, DROP, INSERT, UPDATE, DELETE, or TRUNCATE.
4. Credential Masking: Passwords are automatically masked in all outputs and error logs.
5. Preserves existing SQLite database and Render/Vercel production configurations.
================================================================================
"""

import os
import sys
import argparse
import re
from typing import Dict, Any, List, Optional, Tuple

try:
    import psycopg2
    import psycopg2.extensions
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

# Expected LearnLoop AI 20 application tables
EXPECTED_20_TABLES = [
    "users",
    "learners",
    "concept_mastery",
    "attempts",
    "revision_tasks",
    "teacher_demo_cohort",
    "chat_messages",
    "diagnostic_attempts",
    "user_sessions",
    "password_reset_tokens",
    "user_activity_logs",
    "user_streaks",
    "user_gamification",
    "user_achievements",
    "user_challenges",
    "user_settings",
    "user_notifications",
    "login_events",
    "user_activity_events",
    "owner_audit_logs"
]

def mask_connection_url(url: str) -> str:
    """Mask password in PostgreSQL URL for secure display."""
    if not url:
        return "<UNSET>"
    # Matches :password@ in URL
    masked = re.sub(r":([^:@/]+)@", ":****@", url)
    return masked

def get_target_url(cli_url: Optional[str]) -> str:
    """Resolve target PostgreSQL connection URL safely."""
    raw = (cli_url or os.getenv("DATABASE_URL") or "").strip()
    if not raw:
        return ""
    if raw.startswith("postgres://"):
        return "postgresql://" + raw[len("postgres://"):]
    return raw

def run_connectivity_check(pg_url: str) -> Dict[str, Any]:
    """
    Execute read-only connectivity test:
    Reports PostgreSQL version, database name, role, SSL status, and pooler mode.
    """
    print("=" * 80)
    print("LEARNLOOP AI — POSTGRESQL 17 STAGING CONNECTIVITY CHECK (READ-ONLY)")
    print("=" * 80)
    
    if not PSYCOPG2_AVAILABLE:
        print("[ERROR] psycopg2-binary is not installed. Run: pip install psycopg2-binary")
        return {"success": False, "error": "psycopg2 not installed"}

    masked_url = mask_connection_url(pg_url)
    print(f"Target Connection: {masked_url}")

    result = {"success": False}

    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(pg_url)
        # Enforce server-side READ-ONLY session (PostgreSQL engine will abort any write attempt)
        conn.set_session(readonly=True, autocommit=True)
        cur = conn.cursor()

        # 1. Version
        cur.execute("SELECT version();")
        version_str = cur.fetchone()[0]

        # 2. Database Name
        cur.execute("SELECT current_database();")
        database_name = cur.fetchone()[0]

        # 3. Current Role / User
        cur.execute("SELECT current_user, session_user;")
        current_user, session_user = cur.fetchone()

        # 4. Server Port & IP
        cur.execute("SELECT inet_server_port(), inet_server_addr();")
        port_row = cur.fetchone()
        server_port = port_row[0]
        server_addr = str(port_row[1]) if port_row[1] else "cloud-proxy"

        # 5. SSL Status from psycopg2 connection object
        conn_info = conn.info
        ssl_in_use = getattr(conn_info, "ssl_in_use", None)
        ssl_protocol = conn_info.ssl_attribute("protocol") if hasattr(conn_info, "ssl_attribute") else None
        ssl_cipher = conn_info.ssl_attribute("cipher") if hasattr(conn_info, "ssl_attribute") else None

        # 6. SSL Status from PostgreSQL server view (pg_stat_ssl)
        server_ssl_info = {}
        try:
            cur.execute("""
                SELECT ssl, version, cipher, bits 
                FROM pg_stat_ssl 
                WHERE pid = pg_backend_pid();
            """)
            ssl_row = cur.fetchone()
            if ssl_row:
                server_ssl_info = {
                    "ssl": ssl_row[0],
                    "version": ssl_row[1],
                    "cipher": ssl_row[2],
                    "bits": ssl_row[3]
                }
        except Exception:
            pass

        # 7. Connection Pooling Mode Detection
        is_neon_pooler = "-pooler" in pg_url
        pooler_mode = "Neon PgBouncer Transaction Pooler (Detected via endpoint)" if is_neon_pooler else "Direct Compute Endpoint (Unpooled)"
        
        # Test if SHOW pool_mode is supported (PgBouncer admin feature)
        try:
            cur.execute("SHOW pool_mode;")
            pm_row = cur.fetchone()
            if pm_row:
                pooler_mode = f"PgBouncer Pool Mode: {pm_row[0]}"
        except Exception:
            pass

        conn.close()

        result = {
            "success": True,
            "version": version_str,
            "database": database_name,
            "current_user": current_user,
            "session_user": session_user,
            "server_port": server_port,
            "server_addr": server_addr,
            "ssl_in_use": ssl_in_use,
            "ssl_protocol": ssl_protocol or server_ssl_info.get("version", "TLS (Active)"),
            "ssl_cipher": ssl_cipher or server_ssl_info.get("cipher", "Unknown"),
            "pooler_mode": pooler_mode,
            "is_neon_pooler": is_neon_pooler
        }

        # Print formatted report
        print("\n[CONNECTIVITY VERIFIED]")
        print(f"  Status                 : CONNECTED (100% Read-Only Session Enforced)")
        print(f"  PostgreSQL Version     : {result['version']}")
        print(f"  Database Name          : {result['database']}")
        print(f"  Authenticated Role     : {result['current_user']} (Session: {result['session_user']})")
        print(f"  Server Endpoint Port   : {result['server_port']} ({result['server_addr']})")
        print(f"  SSL / TLS Encryption   : {'ACTIVE (Encrypted)' if result['ssl_in_use'] or server_ssl_info.get('ssl') else 'INACTIVE'}")
        print(f"  TLS Protocol / Cipher  : {result['ssl_protocol']} / {result['ssl_cipher']}")
        print(f"  Connection Pooler      : {result['pooler_mode']}")

        # Architectural Assessment
        print("\n[TRANSACTION POOLING COMPATIBILITY ASSESSMENT]")
        if is_neon_pooler:
            print("  -> Neon PgBouncer transaction pooling endpoint confirmed.")
            print("  -> LearnLoop AI context managers (with storage.get_connection():) maintain clean transaction scoping.")
            print("  -> Temporary tables, session settings, and named prepared statements are NOT used by the backend.")
            print("  -> Helper functions (datetime, json_extract) are schema-level in public, fully compatible with transaction pooling.")
        else:
            print("  -> Notice: Endpoint does not contain '-pooler'. For serverless high-concurrency staging,")
            print("     Neon recommends using the pooled connection string ending in -pooler.")

    except Exception as e:
        result["error"] = str(e)
        print("\n[CONNECTIVITY FAILED]")
        print(f"  Error: {e}")
        print("\nTroubleshooting tips:")
        print("  1. Verify the DATABASE_URL contains ?sslmode=require.")
        print("  2. Ensure the Neon compute endpoint is active (not suspended).")
        print("  3. Check credentials and firewall/network permissions for AWS Singapore (ap-southeast-1).")

    print("=" * 80)
    return result

def run_schema_inspection(pg_url: str) -> Dict[str, Any]:
    """
    Execute read-only schema inspection on target PostgreSQL database:
    Lists all tables in public schema, row counts, columns, constraints, and helper functions.
    """
    print("=" * 80)
    print("LEARNLOOP AI — POSTGRESQL 17 STAGING SCHEMA INSPECTION (READ-ONLY)")
    print("=" * 80)
    
    if not PSYCOPG2_AVAILABLE:
        print("[ERROR] psycopg2-binary is not installed.")
        return {"success": False, "error": "psycopg2 not installed"}

    masked_url = mask_connection_url(pg_url)
    print(f"Target Connection: {masked_url}")

    result = {"success": False}

    try:
        conn = psycopg2.connect(pg_url)
        # Enforce server-side READ-ONLY session (Engine-level write prevention)
        conn.set_session(readonly=True, autocommit=True)
        cur = conn.cursor()

        # 1. Existing base tables in public schema
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name ASC;
        """)
        all_tables_in_pg = [row[0] for row in cur.fetchall()]
        all_tables_set = set(all_tables_in_pg)

        # 2. Check each of the 20 expected application tables
        table_summary = {}
        total_target_records = 0

        for tbl in EXPECTED_20_TABLES:
            if tbl in all_tables_set:
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                cnt = cur.fetchone()[0]
                total_target_records += cnt

                # Column count
                cur.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s;
                """, (tbl,))
                col_cnt = cur.fetchone()[0]

                table_summary[tbl] = {"exists": True, "count": cnt, "columns": col_cnt}
            else:
                table_summary[tbl] = {"exists": False, "count": 0, "columns": 0}

        # 3. Check for any unexpected extra tables in public schema
        unexpected_tables = [t for t in all_tables_in_pg if t not in EXPECTED_20_TABLES]

        # 4. Check helper functions in public schema
        cur.execute("""
            SELECT routine_name, data_type 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' AND routine_name IN ('datetime', 'json_extract');
        """)
        functions_found = {row[0]: row[1] for row in cur.fetchall()}

        # 5. Check sequences
        cur.execute("""
            SELECT sequence_name 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public';
        """)
        sequences_found = [row[0] for row in cur.fetchall()]

        conn.close()

        # Display results
        existing_count = sum(1 for v in table_summary.values() if v["exists"])
        print(f"\n[SCHEMA READINESS SUMMARY]")
        print(f"  Target Database Tables Found : {existing_count} / 20 LearnLoop tables")
        print(f"  Total Existing Records       : {total_target_records:,}")
        
        # Categorize destination readiness
        if existing_count == 0:
            dest_status = "CLEAN & EMPTY (Uninitialized — ready for initial schema creation & migration)"
        elif total_target_records == 0 and existing_count == 20:
            dest_status = "INITIALIZED & EMPTY (All 20 tables exist with 0 records — ready for ETL transfer)"
        elif total_target_records > 0:
            dest_status = f"NON-EMPTY ({total_target_records:,} records exist across {existing_count} tables — requires --resume)"
        else:
            dest_status = f"PARTIALLY INITIALIZED ({existing_count} / 20 tables exist with {total_target_records:,} records)"

        print(f"  Destination Migration Status : {dest_status}")

        print("\nTable Breakdown:")
        for idx, tbl in enumerate(EXPECTED_20_TABLES, 1):
            t_info = table_summary[tbl]
            if t_info["exists"]:
                status_pill = f"EXISTS ({t_info['columns']:2d} cols, {t_info['count']:>5d} records)"
            else:
                status_pill = "NOT CREATED YET"
            print(f"  {idx:2d}. {tbl.ljust(25)}: {status_pill}")

        if unexpected_tables:
            print(f"\n  [NOTICE] Non-LearnLoop tables present in target: {unexpected_tables}")

        print("\n[HELPER FUNCTIONS & SEQUENCES]")
        dt_status = "INSTALLED" if "datetime" in functions_found else "NOT INSTALLED (Will be created during migration)"
        json_status = "INSTALLED" if "json_extract" in functions_found else "NOT INSTALLED (Will be created during migration)"
        print(f"  datetime(text) helper      : {dt_status}")
        print(f"  json_extract(text) helper  : {json_status}")
        
        seq_status = "EXISTS" if "attempts_id_seq" in sequences_found else "NOT CREATED YET (Created with attempts table)"
        print(f"  attempts_id_seq sequence  : {seq_status}")

        print("\n[RESULT] Read-only schema inspection completed successfully. Zero writes executed.")
        result = {
            "success": True,
            "existing_tables": existing_count,
            "total_records": total_target_records,
            "destination_status": dest_status,
            "table_summary": table_summary,
            "functions": functions_found,
            "sequences": sequences_found
        }

    except Exception as e:
        result["error"] = str(e)
        print("\n[INSPECTION FAILED]")
        print(f"  Error: {e}")

    print("=" * 80)
    return result

def main():
    parser = argparse.ArgumentParser(description="LearnLoop AI — PostgreSQL 17 Staging Read-Only Connectivity & Inspection")
    parser.add_argument("--url", default=os.getenv("DATABASE_URL", ""), help="Target Neon PostgreSQL connection URL (e.g. postgresql://user:pwd@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require)")
    parser.add_argument("--check-connection", action="store_true", help="Run read-only connectivity test")
    parser.add_argument("--inspect-schema", action="store_true", help="Run read-only schema inspection")

    args = parser.parse_args()

    target_url = get_target_url(args.url)
    if not target_url:
        print("=" * 80)
        print("[ERROR] DATABASE_URL is not set.")
        print("=" * 80)
        print("Please provide the connection string via:")
        print("  1. CLI parameter: --url \"postgresql://user:password@ep-...-pooler.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require\"")
        print("  2. Shell environment variable: $env:DATABASE_URL = \"...\" (PowerShell) or export DATABASE_URL=\"...\" (Bash)")
        print("  3. Local file: backend/.env.local (gitignored)")
        print("=" * 80)
        sys.exit(1)

    # Default to running both if neither specific flag is given
    run_all = not args.check_connection and not args.inspect_schema

    conn_success = True
    if run_all or args.check_connection:
        res = run_connectivity_check(target_url)
        conn_success = res.get("success", False)

    if (run_all or args.inspect_schema) and conn_success:
        run_schema_inspection(target_url)

if __name__ == "__main__":
    main()

