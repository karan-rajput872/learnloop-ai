# LearnLoop AI — Final Database Architecture Report
**Document ID:** `LEARNLOOP_FINAL_DATABASE_ARCHITECTURE_REPORT`  
**Date:** November 2026  
**Status:** COMPLETE & VERIFIED  
**Architecture Classification:** Dual-Engine Database Abstraction (PostgreSQL Production / SQLite Dev & Test)

---

## 1. Executive Summary

LearnLoop AI uses a unified database access layer implemented in [`backend/app/storage/db.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic AI Hackathon/learnloop-ai/backend/app/storage/db.py) via `StorageManager`. Historically, the application defaulted to an ephemeral SQLite database stored inside the container filesystem at `data/learnloop.db` whenever a PostgreSQL connection was unavailable. On ephemeral container platforms such as Render, any service restart, redeployment, or dyno cycling resets the container disk, resulting in silent and catastrophic account and learning telemetry loss.

To resolve this vulnerability permanently, the database architecture has been hardened with a strict production startup guard that eliminates silent fallback while preserving local developer ergonomics and automated test isolation.

---

## 2. Architectural Comparison: Engine Lifecycle

| Subsystem Component | Local Development & Test Mode (`SQLite`) | Production Mode (`Neon Managed PostgreSQL 17.11`) |
| :--- | :--- | :--- |
| **Engine Implementation** | `sqlite3` via `SqliteConnectionWrapper` | `psycopg2` via `PostgresConnectionWrapper` & connection pool |
| **Connection Pooling** | Context-managed single thread-safe connection | `psycopg2.pool.ThreadedConnectionPool` (min=1, max=10) |
| **Target Storage** | Container local disk (`backend/data/learnloop.db`) | Serverless NVMe SSD at Neon AWS Singapore (`ap-southeast-1`) |
| **Persistence Guarantee** | **Ephemeral** (lost upon container restart/redeploy) | **Persistent** (independent storage engine, PITR WAL backups) |
| **Foreign Keys** | Enforced via `PRAGMA foreign_keys = ON;` | Enforced natively by PostgreSQL schema constraints |
| **JSON Extraction** | SQLite native `json_extract(data, '$.field')` | PostgreSQL PL/pgSQL compatibility function `json_extract()` |
| **Date/Time Handling** | `datetime('now')` string representation | PostgreSQL PL/pgSQL compatibility function `datetime()` |
| **Auto-Increment Primary Key** | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` with sequence `attempts_id_seq` |

---

## 3. Strict Elimination of Production SQLite Fallback

### 3.1 Startup Guard Implementation
In [`backend/app/storage/db.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic AI Hackathon/learnloop-ai/backend/app/storage/db.py), the `is_production_environment()` function inspects system indicators:
```python
def is_production_environment() -> bool:
    env = os.getenv("ENVIRONMENT", "").lower()
    is_prod_env = env in ("production", "prod")
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
    return is_prod_env or is_render
```

During initialization in `StorageManager.__init__`:
```python
if is_production_environment():
    if not self.database_url:
        raise RuntimeError(
            "CRITICAL DATABASE CONFIGURATION ERROR: Production environment detected "
            "(ENVIRONMENT=production or Render service), but DATABASE_URL is not set. "
            "LearnLoop AI strictly prohibits falling back to ephemeral SQLite in production "
            "to prevent silent data loss across container redeployments. Please configure "
            "DATABASE_URL with a managed PostgreSQL connection string in your hosting provider's dashboard."
        )
    if self.database_url.lower().startswith("sqlite") or "learnloop.db" in self.database_url:
        raise RuntimeError(
            "CRITICAL DATABASE CONFIGURATION ERROR: Production environment detected, but "
            "DATABASE_URL points to SQLite. LearnLoop AI strictly prohibits SQLite in production. "
            "A managed PostgreSQL database is required to guarantee persistence across container redeploys."
        )
    if not (self.database_url.startswith("postgresql://") or self.database_url.startswith("postgres://")):
        raise RuntimeError(
            f"CRITICAL DATABASE CONFIGURATION ERROR: Production environment detected, but "
            f"DATABASE_URL scheme is invalid. Expected postgresql:// or postgres://, got: {self.database_url[:15]}... "
            f"A managed PostgreSQL database is required in production."
        )
```

### 3.2 Verification of Guard Failure Modes
The test suite in [`backend/scripts/test_startup_guards.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic AI Hackathon/learnloop-ai/backend/scripts/test_startup_guards.py) confirms 7/7 guard behaviors:
1. `ENVIRONMENT=production` with missing `DATABASE_URL` immediately raises `RuntimeError`.
2. `ENVIRONMENT=production` with `sqlite:///...` immediately raises `RuntimeError`.
3. `ENVIRONMENT=production` with invalid URI scheme raises `RuntimeError`.
4. `RENDER=true` or `RENDER_SERVICE_ID=...` with `sqlite:///...` raises `RuntimeError`.
5. `ENVIRONMENT=development` without `DATABASE_URL` safely defaults to SQLite for local development.
6. `ENVIRONMENT=testing` without `DATABASE_URL` safely defaults to SQLite for unit test suites.
7. Valid `postgresql://` string triggers connection pool instantiation and schema verification.

---

## 4. Connection Pooling and PgBouncer Compatibility

Neon provides two connection entry points:
- **Direct Connection (Port 5432):** Direct compute instance access, recommended for schema migrations, DDL executions, and long-lived admin tasks.
- **Pooled Connection (Port 5432 via PgBouncer / Neon Proxy):** Transaction-level pooling recommended for FastAPI application runtime concurrency.

### PgBouncer Compatibility Hardening:
1. Prepared statements are avoided in runtime pooled mode; standard parameterized queries (`%s`) are utilized by `psycopg2`.
2. Session-level variables (`SET ...`) are executed per-connection checkout or avoided to prevent cross-transaction leakage.
3. Keepalives and connection recycling: `pool = ThreadedConnectionPool(minconn=1, maxconn=10, ...)` with automatic recycling on checkout prevents stale idle sockets.

---

## 5. Schema Compatibility and Custom Translation Functions

To allow identical SQL query strings across both SQLite and PostgreSQL without requiring complex ORM overhead, PostgreSQL includes native PL/pgSQL polyfill functions:

```sql
-- SQLite datetime('now') translation
CREATE OR REPLACE FUNCTION datetime(val text) RETURNS timestamp AS $$
BEGIN
    IF val = 'now' THEN
        RETURN CURRENT_TIMESTAMP;
    END IF;
    RETURN val::timestamp;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- SQLite json_extract() compatibility
CREATE OR REPLACE FUNCTION json_extract(doc text, path text) RETURNS integer AS $$
DECLARE
    key_name text;
    val_json json;
BEGIN
    IF doc IS NULL OR doc = '' THEN
        RETURN NULL;
    END IF;
    key_name := replace(path, '$.', '');
    val_json := (doc::json)->key_name;
    IF val_json IS NULL THEN
        RETURN NULL;
    END IF;
    IF val_json::text = 'true' OR val_json::text = '1' THEN
        RETURN 1;
    ELSIF val_json::text = 'false' OR val_json::text = '0' THEN
        RETURN 0;
    END IF;
    RETURN (val_json #>> '{}')::integer;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 6. Real-Time Telemetry and Health Endpoint Security

The `/api/health` endpoint in [`backend/app/main.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic AI Hackathon/learnloop-ai/backend/app/main.py) provides truthful infrastructure telemetry while strictly safeguarding credentials:

```json
{
  "status": "healthy",
  "service": "LearnLoop AI Adaptive Tutor",
  "version": "1.0.0",
  "database": {
    "engine": "sqlite",
    "is_persistent": false,
    "environment_mode": "development_or_testing"
  }
}
```

Upon deploying to production with `DATABASE_URL` pointing to Neon, `/api/health` reports:
```json
{
  "status": "healthy",
  "service": "LearnLoop AI Adaptive Tutor",
  "version": "1.0.0",
  "database": {
    "engine": "postgresql",
    "is_persistent": true,
    "environment_mode": "production"
  }
}
```

**Security Verification:** The test in [`backend/scripts/test_health_endpoint.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic AI Hackathon/learnloop-ai/backend/scripts/test_health_endpoint.py) verified that passwords, usernames, secret tokens, hostnames, and connection strings are strictly omitted from all responses.

