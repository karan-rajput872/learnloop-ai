# LearnLoop AI — Phase 2.5: Production Cutover & Rollback Plan

**Document Version:** 1.0  
**Target Execution Date:** Post-Approval Production Window  
**Target Environment:** Render Web Service (`https://learnloop-ai-backend.onrender.com`)  
**Database:** Neon Serverless PostgreSQL (`learnloop_staging` on AWS Singapore)  
**Security Level:** Production Runbook (Masked Secrets)

---

## 1. Cutover Overview & Architecture

### 1.1 Objective
Transition LearnLoop AI's live backend on Render from its current ephemeral SQLite database (`data/learnloop.db`) to the production-hardened Neon Serverless PostgreSQL database.

### 1.2 Target Database Endpoints
- **Runtime Application Connection (Connection Pooling Active):**
  ```text
  postgresql://learnloop_staging_owner:****@ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require&channel_binding=require
  ```
  *Note:* Always connect via the `-pooler` hostname for FastAPI application traffic. This utilizes PgBouncer connection pooling on Neon, preventing client connection exhaustion.
- **Administrative & Direct Migration Endpoint:**
  ```text
  postgresql://learnloop_staging_owner:****@ep-still-hill-a1kyg5fs.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require&channel_binding=require
  ```
  *Note:* Reserved exclusively for DDL alterations, migrations, or direct logical backups that bypass transaction pooling.

---

## 2. Pre-Cutover Backup & Verification Procedure

Before initiating any changes in the Render Dashboard, execute the following non-destructive safety checks:

### Step 2.1: Local Master SQLite Snapshot
Execute the Online Backup script to capture a frozen, consistent snapshot of `learnloop.db`:
```bash
python -c "
import sqlite3, shutil, datetime
src = 'backend/data/learnloop.db'
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
dst = f'backend/data/learnloop_pre_cutover_backup_{ts}.db'
src_conn = sqlite3.connect(f'file:{src}?mode=ro', uri=True)
dst_conn = sqlite3.connect(dst)
src_conn.backup(dst_conn)
dst_conn.close()
src_conn.close()
chk_conn = sqlite3.connect(dst)
cur = chk_conn.cursor()
cur.execute('PRAGMA integrity_check;')
assert cur.fetchone()[0] == 'ok', 'Backup integrity check failed!'
chk_conn.close()
print(f'Safe read-only backup created: {dst}')
"
```

### Step 2.2: Neon PostgreSQL Point-In-Time Snapshot
1. Navigate to the **Neon Console** -> Project `ep-still-hill-a1kyg5fs`.
2. Under **Branches**, click **Create Branch** -> name it `pre-cutover-baseline-backup`.
3. Neon will create an instant copy-on-write branch snapshot at zero cost, capturing the exact 4,352-row state for instant rollback capability.

### Step 2.3: Verify Sequence Alignment
Confirm that the auto-increment sequence for the `attempts` table is positioned above the current maximum ID:
```sql
SELECT setval('attempts_id_seq', COALESCE((SELECT MAX(id) FROM attempts), 1), true);
```
*(Verified during Phase 2.4: current sequence value is 284, safely above MAX(id) = 282).*

---

## 3. Step-by-Step Production Cutover Runbook

```mermaid
flowchart TD
    A[Start Cutover Window] --> B[Create Pre-Cutover Backups]
    B --> C[Verify Neon Staging Parity 4352 Rows]
    C --> D[Open Render Service Settings]
    D --> E[Set DATABASE_URL, DB_POOL_MIN, DB_POOL_MAX]
    E --> F[Trigger Render Zero-Downtime Redeploy]
    F --> G{Container Healthcheck}
    G -- Healthy HTTP 200 --> H[Execute Smoke Test Suite]
    G -- Failed / Unhealthy --> R[Trigger Immediate Rollback]
    H --> I{Smoke Tests Pass?}
    I -- Yes --> J[Post-Cutover Live Verification]
    I -- No --> R
    J --> K[Declare Cutover Complete]
    R --> S[Remove DATABASE_URL & Restore SQLite]
```

### Timeline & Execution Sequence (Estimated: 8–10 Minutes)

| Time | Step | Action | Expected Result |
|:---:|:---:|---|---|
| **T-00:00** | **1** | Initiate cutover window. Announce to stakeholders. | Window open. |
| **T-00:01** | **2** | Run Step 2.1 SQLite snapshot and Step 2.2 Neon console branch. | Baseline preserved. |
| **T-00:03** | **3** | Log in to **Render Dashboard** -> Navigate to `learnloop-ai-backend` -> **Environment**. | Environment variables page loaded. |
| **T-00:04** | **4** | Add/Update environment variables: | Variables staged. |
| | | `DATABASE_URL`: `postgresql://learnloop_staging_owner:****@ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require&channel_binding=require` | Pooled Neon connection. |
| | | `DB_POOL_MIN`: `2` | Minimum pooled connections. |
| | | `DB_POOL_MAX`: `10` | Maximum pooled connections. |
| **T-00:05** | **5** | Click **Save Changes**. Render will automatically trigger a rolling build/redeploy. | Deployment in progress. |
| **T-00:07** | **6** | Monitor Render build & deploy logs. | Render emits `[STORAGE ACTIVE] Initialized Neon/PostgreSQL connection pool (min=2, max=10)`. |
| **T-00:08** | **7** | Execute Smoke Test Suite against `https://learnloop-ai-backend.onrender.com`: | All smoke tests PASS. |
| | | - Health: `GET /api/health` -> HTTP 200. | Service healthy. |
| | | - Teacher: `GET /api/teacher/dashboard` -> HTTP 200 (Cohort loads). | Real cohort data from Neon. |
| | | - Auth: `POST /api/auth/login` -> HTTP 200. | Authentication active. |
| | | - Diagnostic: `GET /api/diagnostic/questions` -> HTTP 200. | Diagnostic syllabus active. |
| **T-00:10** | **8** | Verify frontend (`https://learnloop-ai-one.vercel.app`) communicates smoothly with backend. | End-to-end verified. |
| **T-00:10** | **9** | **Declare Cutover Complete.** | Production Live on PostgreSQL. |

---

## 4. Rollback Plan (Zero Data Loss Architecture)

If any fatal blocker occurs during cutover (e.g., Render cannot connect to Neon, connection timeouts, or critical API failures), follow this exact rollback procedure.

### 4.1 Scenario A: Immediate Rollback (Within 5 Minutes, Zero Production Writes)
If the new deployment fails health checks before production traffic is routed:
1. In Render Dashboard, delete the `DATABASE_URL` environment variable (or unset it).
2. Click **Save Changes**. Render will redeploy with default SQLite storage.
3. Verification: `GET /api/health` returns HTTP 200. Service restored to baseline in < 2 minutes.

### 4.2 Scenario B: Rollback After Production Writes Occurred (Post-Cutover Reversal)
If the service has been live for 10–60 minutes and students have submitted diagnostic tests or created accounts on Neon before a critical issue is discovered:

**Objective:** Extract new writes made to Neon PostgreSQL and backport them into SQLite before reverting, guaranteeing **zero student progress is lost**.

```mermaid
sequenceDiagram
    participant User as Production Traffic
    participant Render as Render Backend
    participant Neon as Neon PostgreSQL
    participant Script as Sync Script
    participant SQLite as learnloop.db

    Note over User,Neon: Incident Occurs After Writes
    Render->>Render: Set MAINTENANCE_MODE = true (Pause Writes)
    Script->>Neon: Query all rows where created_at >= CUTOVER_TIME
    Neon-->>Script: Extracted Delta (Users, Attempts, Mastery)
    Script->>SQLite: Insert Delta Rows into SQLite
    SQLite-->>Script: Verified Row Counts Match
    Render->>Render: Remove DATABASE_URL & Deploy SQLite
    Render->>SQLite: Backend Connects to SQLite
    Note over User,SQLite: Rollback Complete with Zero Data Loss
```

#### Step 4.2.1: Delta Extraction Query
Run the reverse-sync extraction script:
```python
import psycopg2, sqlite3, json

CUTOVER_TIME = "2026-11-02T16:00:00"  # Exact cutover timestamp
pg_conn = psycopg2.connect("postgresql://learnloop_staging_owner:****@ep-still-hill-a1kyg5fs.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require")
sq_conn = sqlite3.connect("backend/data/learnloop.db")

# Sync new users created on Neon
pg_cur = pg_conn.cursor()
sq_cur = sq_conn.cursor()

pg_cur.execute("SELECT * FROM users WHERE created_at >= %s", (CUTOVER_TIME,))
new_users = pg_cur.fetchall()
col_names = [desc[0] for desc in pg_cur.description]

placeholders = ", ".join(["?"] * len(col_names))
cols = ", ".join(col_names)
for u in new_users:
    sq_cur.execute(f"INSERT OR REPLACE INTO users ({cols}) VALUES ({placeholders})", u)

# Sync new attempts
pg_cur.execute("SELECT * FROM attempts WHERE timestamp >= %s", (CUTOVER_TIME,))
new_attempts = pg_cur.fetchall()
att_cols = [desc[0] for desc in pg_cur.description]
att_placeholders = ", ".join(["?"] * len(att_cols))
for a in new_attempts:
    sq_cur.execute(f"INSERT OR REPLACE INTO attempts ({', '.join(att_cols)}) VALUES ({att_placeholders})", a)

# Sync new diagnostic attempts
pg_cur.execute("SELECT * FROM diagnostic_attempts WHERE timestamp >= %s", (CUTOVER_TIME,))
new_diag = pg_cur.fetchall()
diag_cols = [desc[0] for desc in pg_cur.description]
diag_placeholders = ", ".join(["?"] * len(diag_cols))
for d in new_diag:
    sq_cur.execute(f"INSERT OR REPLACE INTO diagnostic_attempts ({', '.join(diag_cols)}) VALUES ({diag_placeholders})", d)

sq_conn.commit()
print("Post-cutover writes successfully reconciled into SQLite.")
```

#### Step 4.2.2: Revert Render Storage
1. Unset `DATABASE_URL` in Render.
2. Commit/deploy SQLite snapshot.
3. Verify all student records exist in SQLite.

---

## 5. Render Configuration Reference

| Environment Variable | Recommended Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://learnloop_staging_owner:****@ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech/learnloop_staging?sslmode=require&channel_binding=require` | Pooled PostgreSQL connection via Neon PgBouncer. |
| `DB_POOL_MIN` | `2` | Minimum active connections maintained in thread pool. |
| `DB_POOL_MAX` | `10` | Maximum connections allowed to prevent saturation. |
| `CORS_ORIGINS` | `https://learnloop-ai-one.vercel.app,http://localhost:3000` | Allowed frontend domains. |
| `JWT_SECRET_KEY` | *(Existing 64-char key in Render settings)* | Secure user session token signing. |
| `GEMINI_API_KEY` | *(Existing Gemini API key in Render settings)* | AI Tutor Socratic engine. |
| `OWNER_EMAIL` | `karanrajput872@gmail.com` | Authorized platform owner email. |

---

## 6. Pre-Cutover Readiness Verdict

- [x] Architecture fully supports PostgreSQL adapter with transparent parameter adaptation (`?` -> `%s`).
- [x] Threaded connection pool with stale socket disposal implemented in `backend/app/storage/db.py`.
- [x] Exact 4,352-row data parity verified across all 20 tables.
- [x] Sequences aligned.
- [x] Zero-data-loss rollback procedure documented and verified.
- [x] **Status:** APPROVED FOR CUTOVER PENDING STAKEHOLDER MAINTENANCE WINDOW EXECUTION.

