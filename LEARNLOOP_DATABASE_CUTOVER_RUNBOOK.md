# LEARNLOOP AI — PRODUCTION DATABASE CUTOVER RUNBOOK
**Operational Runbook, 90-Second Maintenance Protocol & Rollback Procedures**
*Date: November 7, 2026 | Document Version: 1.0 | Status: OPERATOR APPROVAL REQUIRED (GATE B)*

---

## 1. Executive Summary & Protocol Overview

This document defines the strict, zero-data-loss cutover runbook for migrating the live LearnLoop AI backend from its temporary ephemeral container storage to the dedicated, persistent **Neon PostgreSQL Production Database** (`learnloop_production`).

To completely eliminate split-brain writes and prevent data corruption, the cutover utilizes the approved **90-Second Suspend/Resume Protocol**:

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Operator
    participant Render as Render Control Plane
    participant OldBackend as Old SQLite Container
    participant Utility as migrate_sqlite_to_postgres.py
    participant Neon as Neon learnloop_production
    participant NewBackend as New PostgreSQL Container

    Note over Operator,Neon: PHASE 1: PRE-CUTOVER PREPARATION
    Operator->>Neon: Verify learnloop_production is clean (0 tables)
    Operator->>Utility: Run --dry-run validation (4,859 records verified)

    Note over Operator,Neon: PHASE 2: 90-SECOND MAINTENANCE WINDOW
    Operator->>Render: Click "Suspend Service"
    Render->>OldBackend: Send SIGTERM & drain active connections (30s max)
    OldBackend-->>Render: Terminated (Zero SQLite writes possible)

    Note over Operator,Neon: PHASE 3: EXECUTE MIGRATION & RECONFIGURATION
    Operator->>Utility: Run --confirm with production connection string
    Utility->>Neon: Create 20 tables & copy 4,859 records in FK order
    Utility->>Neon: Synchronize attempts_id_seq to MAX(id)
    Utility-->>Operator: 100% Parity Verified
    Operator->>Render: Update DATABASE_URL = postgresql://...learnloop_production

    Note over Operator,Neon: PHASE 4: RESUME SERVICE & POST-CUTOVER CHECKS
    Operator->>Render: Click "Resume Service"
    Render->>NewBackend: Boot Container with DATABASE_URL
    NewBackend->>Neon: Initialize ThreadedConnectionPool (min=1, max=10)
    NewBackend-->>Render: Booted & Validated
    Operator->>NewBackend: Probe GET /api/health (database.is_persistent == true)
    Operator->>NewBackend: Verify Login (karanrajput872@gmail.com)
```

---

## 2. Pre-Cutover Verification Checklist (Phase A)

Before initiating the maintenance window, complete and verify each prerequisite:

- [ ] **1. Production Catalog Identity Verified**:
  - Catalog: `learnloop_production`
  - Host: `ep-still-hill-a1kyg5fs.ap-southeast-1.aws.neon.tech` (AWS Singapore)
  - Engine: PostgreSQL 17.11
  - Table Count: Exactly **0 / 20 tables** (Verified in Phase 3.2).
- [ ] **2. Production Role Verified**:
  - Role: `learnloop_production_owner`
  - Capability: `LOGIN` capability confirmed; default privileges on public schema.
- [ ] **3. Immutable Master Backup Snapshot**:
  - Run:
    ```bash
    python -c "from scripts.migrate_sqlite_to_postgres import create_sqlite_backup, DEFAULT_SQLITE_PATH; create_sqlite_backup(DEFAULT_SQLITE_PATH)"
    ```
  - Confirmed: New backup file created in `backend/data/backups/`.
- [ ] **4. Dry-Run Migration Verification**:
  - Run:
    ```bash
    python scripts/migrate_sqlite_to_postgres.py --url "$PRODUCTION_DATABASE_URL" --dry-run
    ```
  - Output must report: `Total Records to Migrate: 4,859` and `Zero writes made to target database`.

---

## 3. Step-by-Step Cutover Execution (Phase B)

Estimated execution duration: **90 seconds**.

### Step 1: Suspend Render Web Service (T-00:00)
1. Open the [Render Dashboard](https://dashboard.render.com).
2. Select web service: **`learnloop-ai-backend`**.
3. In the upper-right corner, open the action menu -> select **Suspend Service**.
4. Confirm suspension.
5. Render edge proxy immediately serves `HTTP 503 Maintenance`. Old container drains connections within 500ms and halts.
*Result: Zero writes can reach ephemeral SQLite.*

### Step 2: Execute Live Production Data Migration (T-00:15)
1. In your local terminal, execute the migration utility with the explicit `--confirm` flag:
   ```bash
   python backend/scripts/migrate_sqlite_to_postgres.py \
       --url "postgresql://learnloop_production_owner:PASSWORD@ep-still-hill-a1kyg5fs.ap-southeast-1.aws.neon.tech/learnloop_production?sslmode=require" \
       --confirm
   ```
2. Wait for completion (typically ~8 seconds for 4,859 records across 20 tables).
3. Confirm final verification message:
   `[MIGRATION SUCCESS] 20/20 tables, 4,859 records migrated and verified with 100% parity.`

### Step 3: Configure Render Environment Variables (T-00:40)
1. In the Render Dashboard under **`learnloop-ai-backend`** -> click **Environment**.
2. Add or update the variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://learnloop_production_owner:PASSWORD@ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech/learnloop_production?sslmode=require`
   *(Note: Use the `-pooler` connection string endpoint for pooled serverless access).*
3. Set `ENVIRONMENT`: `production`.
4. Click **Save Changes**.

### Step 4: Resume Render Web Service (T-00:55)
1. In the Render action menu -> click **Resume Service**.
2. Render provisions and boots the new container with the updated environment.
3. The new container initializes `StorageManager`, connects to Neon PostgreSQL, runs `_validate_postgres_connection()`, and marks the service active.

---

## 4. Post-Cutover Verification Protocol (Phase C)

Execute the following post-cutover verification steps immediately after service resumption:

### Verification 1: Health & Database Persistence Check
```bash
curl -s https://learnloop-ai-backend.onrender.com/api/health | jq .database
```
**Expected Response**:
```json
{
  "engine": "postgresql",
  "is_persistent": true,
  "environment_mode": "production"
}
```

### Verification 2: Owner Account Authentication Check
Test login for the administrative account:
```bash
curl -s -X POST https://learnloop-ai-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "karanrajput872@gmail.com", "password": "OwnerPass123456!"}'
```
**Expected Response**: `HTTP 200 OK` with valid JWT access token and `role: "owner"`.

### Verification 3: Student Profile Telemetry Check
Verify diagnostic history for sample learner:
```bash
curl -s https://learnloop-ai-backend.onrender.com/api/learners/profile \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected Response**: `HTTP 200 OK` with 12 concept masteries populated.

---

## 5. Rollback Protocol (Contingency)

If the new container fails to connect or errors exceed acceptable thresholds during post-cutover verification:

1. **Step 1: Revert Render `DATABASE_URL`**:
   - In Render Dashboard -> Environment -> remove `DATABASE_URL` or point it to the verified staging database `learnloop_staging`.
2. **Step 2: Restart Service**:
   - Trigger **Manual Deploy** -> **Clear build cache & deploy**.
3. **Step 3: Post-Mortem Analysis**:
   - Inspect Render runtime logs for connection timeout or authentication failure reasons.
   - Note: The master SQLite database (`backend/data/learnloop.db`) and backup snapshots remain completely untouched and can be re-migrated at any time.

---
*Runbook certified and awaiting Gate B authorization.*

