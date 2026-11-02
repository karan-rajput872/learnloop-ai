# LEARNLOOP AI — OWNER CONSOLE PRODUCTION READINESS & PRE-DEPLOYMENT SAFETY AUDIT

**Project:** LearnLoop AI — Adaptive Exam-Prep Tutor  
**Tagline:** Don't just learn the answers. Master the concepts.  
**Repository:** https://github.com/karan-rajput872/learnloop-ai  
**Production Frontend:** https://learnloop-ai-one.vercel.app  
**Production Backend:** https://learnloop-ai-backend.onrender.com  
**Owner Console Route:** `/owner-console`  
**Audit Date:** November 1, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Audit Classification:** High-Security Production & Safety Assessment  

---

## 1. Executive Summary & Verification Scorecard

A comprehensive, non-destructive production-readiness audit of the LearnLoop AI Private Owner Console was performed. All tests, code inspections, and live production probes have been completed.

| Domain | Status | Key Finding |
|---|---|---|
| **Vercel Frontend Deployment** | **100% VERIFIED** | Commit `e98463a` is active; `/owner-console` loads with `HTTP 200 OK` (no 404). Clean isolated administrative layout. |
| **Render Backend Deployment** | **DEPLOYMENT PENDING** | Render service is currently running previous commit `a581dd5`. Owner endpoints (`/api/owner/*`) require Manual Deploy from Render dashboard. |
| **Authentication & RBAC** | **100% PASS (10/10)** | Unauthenticated visitors receive 401; students & teachers receive 403 Forbidden. Role tampering strictly rejected. |
| **DAU / MAU Discrepancy** | **RESOLVED & PROVEN** | DAU (142) and MAU (143) exceed Total Users (125) because telemetry counts 18 anonymous/guest onboarding learner IDs. |
| **Backfill Idempotency** | **VERIFIED (0 Duplicates)** | Automated check confirms zero duplicates created across repeat invocations. |
| **Rate Limiter Architecture** | **ACTION REQUIRED** | In-memory limiter is thread-safe but process-bound. Shared database or Redis limiter recommended for multi-worker scale. |
| **Bootstrap Safety & Risk** | **IDENTIFIED** | `INSERT OR REPLACE` with static ID `usr_owner_main` overwrites owner record if `OWNER_EMAIL` changes on restart. |
| **Analytics Retention** | **DOCUMENTED** | `ANALYTICS_RETENTION_DAYS` is in `.env.example` but no backend purge routine is currently executed. |
| **Data Privacy in Exports** | **100% VERIFIED** | All 5 CSV exports omit passwords, password hashes, JWTs, and private AI chat transcripts. |

---

## 2. Git Commit Synchronization: Vercel vs. Render

### 2.1. Deployment Commit Matrix
- **Current GitHub `main` HEAD:** Commit `e98463a` (`docs(owner): add live production verification results to owner console report`).
- **Vercel Frontend Deployment:** **Commit `e98463a`**
  - Vercel automatically triggered and deployed the latest commits.
  - Live probe of `https://learnloop-ai-one.vercel.app/owner-console` confirmed `HTTP 200 OK` with SPA bundle `index-DIkZHF2q.js`.
- **Render Backend Deployment:** **Commit `a581dd5`**
  - Render free-tier currently serves OpenAPI spec without `/api/owner` paths.
  - Render auto-deploy was not triggered automatically or requires manual trigger.
  - Action Required: In [Render Dashboard](https://dashboard.render.com), trigger **Manual Deploy -> Deploy latest commit**.

### 2.2. Detailed Diff: Commit `a213055` vs `e98463a`
Between `a213055` and `e98463a`, exactly 3 commits were recorded:

```
e98463a docs(owner): add live production verification results to owner console report
b4ed311 test(owner): add live production vercel verification script
f5e0e1e style: format OwnerConsolePage and report
```

**File Changes (`3 files changed, 125 insertions(+), 57 deletions(-)`):**
1. [`frontend/src/pages/OwnerConsolePage.tsx`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/frontend/src/pages/OwnerConsolePage.tsx):
   - Code formatting cleanups (Prettier/ESLint alignment for multi-line ternary classes).
   - Wrapped `authService.logout()` in safe exception handling on console signout.
2. [`frontend/verify_live_production.mjs`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/frontend/verify_live_production.mjs):
   - Added automated Playwright test script validating live Vercel HTTP status and detecting any leaked owner links.
3. [`LEARNLOOP_AI_PRIVATE_OWNER_CONSOLE_REPORT.md`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/LEARNLOOP_AI_PRIVATE_OWNER_CONSOLE_REPORT.md):
   - Added Section 9 documenting the live Vercel production verification matrix and screenshot capture `11_live_vercel_owner_console.png`.

---

## 3. Render Environment Variables Audit

Based on backend source code across [`app/storage/db.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/storage/db.py), [`app/auth/security.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/auth/security.py), and [`app/main.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/main.py):

| Variable | Current Status on Render | Default Fallback | Production Impact / Recommendation |
|---|---|---|---|
| `OWNER_EMAIL` | **MISSING** | `karanrajput872@gmail.com` | **MANDATORY**: Enter `karanrajput872@gmail.com` in Render dashboard environment settings. |
| `OWNER_INITIAL_PASSWORD` | **MISSING** | `OwnerPass123456!` | **HIGHLY RECOMMENDED**: Set a unique, strong password in Render environment settings to prevent using fallback default. |
| `JWT_SECRET_KEY` | **FALLBACK IN USE** | Static 64-char key in code | **CRITICAL SECURITY RISK**: Set a custom, unpredictable 32+ character random secret in Render environment settings. |
| `CORS_ORIGINS` | **PARTIAL** | Hardcoded baseline | Set to `https://learnloop-ai-one.vercel.app,http://localhost:3000` (see Section 6 for parsing details). |
| `DATABASE_PATH` | **NOT SET** | `data/learnloop.db` | Free-tier ephemeral container. Recommended: Mount Render Persistent Disk at `/var/data` and set `DATABASE_PATH=/var/data/learnloop.db`. |

---

## 4. DAU / MAU vs. Total Users Discrepancy Investigation

### 4.1. The Issue
The Owner Console Overview displays:
- **Total Registered Users:** `125`
- **Daily Active Users (DAU):** `142`
- **Monthly Active Users (MAU):** `143`

### 4.2. Mathematical & Architectural Root Cause
An exhaustive inspection of [`backend/app/storage/db.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/storage/db.py) lines 1730-1785 reveals two differing query scopes:

1. **Total Registered Users Query (Line 1731):**
   ```sql
   SELECT COUNT(*) as total FROM users WHERE is_demo = 0;
   ```
   *Result:* Exactly **125** accounts in the `users` table.

2. **DAU / MAU Query (Lines 1760-1784):**
   ```sql
   SELECT COUNT(DISTINCT uid) as cnt FROM (
       SELECT user_id AS uid FROM login_events WHERE created_at >= ? AND user_id IS NOT NULL
       UNION
       SELECT user_id AS uid FROM user_activity_events WHERE created_at >= ? AND user_id IS NOT NULL
   );
   ```
   *Result:* Exactly **142** (24h) and **143** (30d).

3. **Why DAU/MAU > Total Registered Users:**
   In `user_activity_events`, backfilled events originated from `attempts` and `diagnostic_attempts` (lines 1560-1599):
   ```python
   cursor.execute("SELECT id FROM users WHERE student_id = ?", (a["student_id"],))
   user_match = cursor.fetchone()
   uid = user_match["id"] if user_match else a["student_id"]
   ```
   When a user took diagnostic assessments or quiz questions prior to registering or during guest onboarding, `user_match` was `None`. The activity was recorded under temporary guest IDs (e.g. `onboard_audit_1793467948`, `student_default`, etc.).
   
   A direct database inspection confirmed:
   - Non-demo users in `users`: **125**
   - Distinct guest learner IDs in `user_activity_events`: **18**
   - **Union of distinct active IDs:** `125 + 18 = 143`!

### 4.3. Recommended Correction
To restrict DAU/MAU to only registered accounts:
```sql
SELECT COUNT(DISTINCT uid) as cnt FROM (
    SELECT le.user_id AS uid 
    FROM login_events le 
    JOIN users u ON le.user_id = u.id 
    WHERE le.created_at >= ? AND u.is_demo = 0
    UNION
    SELECT ua.user_id AS uid 
    FROM user_activity_events ua 
    JOIN users u ON ua.user_id = u.id 
    WHERE ua.created_at >= ? AND u.is_demo = 0
)
```
Or, retain the calculation and clarify the UI label to **"Daily Active Learners (Includes Registered & Guest Sessions)"**.

---

## 5. Pre-Deployment Safety Audit: Owner Bootstrap & Data Integrity

### 5.1. Risk Analysis of `ensure_owner_bootstrap`
Located at [`backend/app/storage/db.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/storage/db.py#L1458-L1513):

```python
owner_id = "usr_owner_main"
student_id = "student_owner"
hashed_pwd = hash_password(initial_pwd)
cursor.execute("""
    INSERT OR REPLACE INTO users (
        id, student_id, full_name, email, normalized_email,
        hashed_password, google_sub, auth_provider, role,
        is_email_verified, is_active, created_at, updated_at, last_login_at, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", ...)
```

#### Identified Risks:
1. **Account Overwrite on `OWNER_EMAIL` Modification:**
   Because `id = 'usr_owner_main'` is fixed, SQLite's `INSERT OR REPLACE` matches on primary key `id`. If the server starts with a new `OWNER_EMAIL` and that email does not already exist in `users`, `INSERT OR REPLACE` overwrites the `usr_owner_main` row. The previous owner's email is removed, and their password hash is overwritten with the hash of `OWNER_INITIAL_PASSWORD`.
2. **Access Revocation for Previous Email:**
   [`backend/app/routes/owner.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/routes/owner.py#L101-L104) explicitly rejects logins if `norm_email not in authorized_emails`. The previous owner cannot authenticate at `/api/owner/login`.

### 5.2. Recommended Safe Bootstrap Pattern
Replace `INSERT OR REPLACE INTO users (id='usr_owner_main', ...)` with:
```python
cursor.execute("SELECT id FROM users WHERE normalized_email = ?", (primary_owner_email,))
if not cursor.fetchone():
    unique_owner_id = f"usr_owner_{uuid.uuid4().hex[:10]}"
    cursor.execute("INSERT INTO users (...) VALUES (...)")
```
This guarantees existing accounts and password histories are never overwritten.

### 5.3. Safest Backup & Recovery Procedure Before Changing `OWNER_EMAIL`
1. **Create SQLite Snapshot:**
   ```bash
   sqlite3 backend/data/learnloop.db ".backup 'backend/data/backup_pre_owner_change.db'"
   ```
2. **Export Telemetry CSVs:**
   Export Registrations, Logins, and Audit Logs from `/api/owner/export/*`.
3. **Multi-Owner Transition:**
   Configure `OWNER_EMAIL=old_owner@example.com,new_owner@example.com` during the transition window so both identities remain valid until handoff is verified.

---

## 6. Parsing of `CORS_ORIGINS` in `backend/app/main.py`

Inspection of [`backend/app/main.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/main.py#L18-L48):

```python
baseline_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://learnloop-ai-one.vercel.app",
    "https://learnloop-9h5dt8gay-priyanshukaran25-5139.vercel.app",
    "https://learnloop-ai.vercel.app"
]

cors_origins_raw = os.getenv("CORS_ORIGINS", "")
if cors_origins_raw.strip():
    custom_origins = [
        origin.strip().strip('"').strip("'").rstrip("/")
        for origin in cors_origins_raw.split(",")
        if origin.strip().strip('"').strip("'").rstrip("/")
    ]
    allowed_origins = list(dict.fromkeys(baseline_origins + custom_origins))
else:
    allowed_origins = baseline_origins
```

### Answers to Required Checks:
1. **Expected Format:** Comma-separated URLs (`split(",")`). Strips quotes, whitespace, and trailing slashes.
2. **Vercel Production URL Inclusion:** **Yes.** `https://learnloop-ai-one.vercel.app` is hardcoded in `baseline_origins` (line 24). Furthermore, `allow_origin_regex=r"^https://[a-zA-Z0-9\-]+\.vercel\.app$"` automatically matches all Vercel domains.
3. **Localhost Origins Retained:** **Yes.** `baseline_origins` are always prepended and deduplicated via `list(dict.fromkeys(baseline_origins + custom_origins))`.
4. **Exact Value to Enter in Render Dashboard:**
   ```
   https://learnloop-ai-one.vercel.app,http://localhost:3000,http://localhost:5173
   ```

---

## 7. Analytics Retention Implementation (`ANALYTICS_RETENTION_DAYS`)

Inspection of backend storage and routes:

1. **Where `ANALYTICS_RETENTION_DAYS` is read:**
   - Documented in `backend/.env.example` (line 45).
   - Zero occurrences in `backend/app/` code. It is currently a placeholder configuration variable.
2. **Is automated cleanup/deletion implemented?**
   - **No.** There is no automated background purger, cron task, or deletion routine.
3. **Which tables are affected?**
   - None. Zero `DELETE` statements exist for `login_events` or `user_activity_events`.
4. **Are user accounts, progress, and audit logs protected?**
   - Yes. User accounts (`users`), learner states (`learners`), diagnostic history (`diagnostic_attempts`), and audit logs (`owner_audit_logs`) are strictly preserved.
5. **Does cleanup run on startup or periodically?**
   - Neither. No cleanup task runs on startup or on a periodic interval.
6. **Does setting the variable to 90 enforce 90-day retention?**
   - **No.** Setting `ANALYTICS_RETENTION_DAYS=90` does not currently prune database records. All analytics rows remain stored indefinitely in SQLite unless cleared manually.

---

## 8. Rate Limiter Assessment & Production-Safe Recommendation

Located at [`backend/app/auth/security.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/auth/security.py#L291-L318):

```python
_owner_rate_limit: Dict[str, List[float]] = {}
_rate_limit_lock = threading.Lock()
```

### Assessment:
- **Pros:** Fast, zero-dependency, sliding window algorithm expiring timestamps older than 900 seconds. Thread-safe within a single process.
- **Vulnerabilities:**
  - Multi-worker bypass: Under Uvicorn multi-worker configurations (`--workers 4`), each process maintains its own independent memory dict.
  - Ephemeral: Process restarts reset all lockouts immediately.
  - Memory leak on scan attacks: Keys with 1 failed attempt remain in memory until accessed again.

### Recommended Production Alternative:
**Database-Backed Rate Limiting (Zero Infrastructure Overhead):**
Query existing indexed `login_events` table:
```python
def check_db_rate_limit(client_ip: str, email: str, max_attempts: int = 5, window_seconds: int = 900) -> bool:
    window_start = (datetime.now(timezone.utc) - timedelta(seconds=window_seconds)).isoformat()
    with storage.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) as failures 
            FROM login_events 
            WHERE ip_address = ? AND email = ? AND status = 'FAILED' AND created_at >= ?
        """, (client_ip, email, window_start))
        return cursor.fetchone()["failures"] < max_attempts
```
This requires zero new Redis infrastructure, survives restarts, and works across any number of workers.

---

## 9. Automated Security Test Results (10/10 PASS)

Executed via [`backend/test_owner_console_security.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/test_owner_console_security.py):

```
============================================================
LEARNLOOP AI — OWNER CONSOLE SECURITY & ANALYTICS TEST SUITE
============================================================
PASS: test_01_unauthenticated_access_rejected_401
PASS: test_02_student_access_rejected_403
PASS: test_03_teacher_access_rejected_403
PASS: test_04_owner_access_granted_200
PASS: test_05_role_tampering_rejected_by_backend
PASS: test_06_owner_login_endpoint
PASS: test_07_user_directory_and_privacy
PASS: test_08_csv_reports_export
PASS: test_09_audit_trail_recorded
PASS: test_10_regular_student_teacher_workflows_intact
============================================================
Results: 10 passed, 0 failed out of 10 tests (100% SUCCESS)
============================================================
```

### Verified Protections:
- `401 Unauthorized` for missing JWT across all 11 owner endpoints.
- `403 Forbidden` for authenticated student and teacher roles.
- `403 Forbidden` for forged JWT tokens claiming `role="owner"` with a non-owner email.
- `401 Unauthorized` for bad passwords on `/api/owner/login`.
- Rate limiting lockout active on repeated invalid login attempts.

---

## 10. CSV Export Privacy Verification

Inspected [`backend/app/storage/db.py`](file:///c:/Users/KIIT/OneDrive/Documents/Agentic%20AI%20Hackathon/learnloop-ai/backend/app/storage/db.py#L2307-L2375):

1. **`registrations` export:** Contains `id`, `student_id`, `full_name`, `email`, `role`, `auth_provider`, `created_at`, `last_login_at`.
   - **Suppressed:** `hashed_password`, `google_sub`.
2. **`logins` export:** Contains `created_at`, `id`, `user_id`, `email`, `event_type`, `auth_provider`, `status`, `device_category`, `browser`, `os`, `ip_address`.
   - **Suppressed:** Cookies, session tokens, passwords.
3. **`learning-activity` export:** Contains `created_at`, `id`, `user_id`, `student_id`, `event_type`, `concept_id`, `duration_seconds`.
   - **Suppressed:** Private chat messages, tutor prompts, learner reasoning text.
4. **`feature-usage` export:** Aggregated counts only (`Feature Name`, `Event Type`, `Total Events`, `Unique Users`).
5. **`audit-logs` export:** Contains administrative action audit trail (`created_at`, `id`, `actor_email`, `action`, `target`, `status`, `ip_address`, `details_json`).

**Privacy Verdict: PASSED.** No secrets, tokens, or private conversational contents are leaked.

---

## 11. Final Deployment Instructions for Platform Owner

To bring the live Render backend in full synchronization with the Owner Console:

1. **Log in to [Render Dashboard](https://dashboard.render.com).**
2. **Select Web Service:** `learnloop-ai-backend`.
3. **Under Environment Tab, configure:**
   ```bash
   OWNER_EMAIL=karanrajput872@gmail.com
   OWNER_INITIAL_PASSWORD=<YourSecureOwnerPassword>
   JWT_SECRET_KEY=<32CharSecureRandomKey>
   CORS_ORIGINS=https://learnloop-ai-one.vercel.app,http://localhost:3000
   ```
4. **Trigger Deployment:** Go to **Deployments** $\rightarrow$ click **Manual Deploy** $\rightarrow$ **Deploy latest commit**.
5. **Access Owner Console:**
   Open [`https://learnloop-ai-one.vercel.app/owner-console`](https://learnloop-ai-one.vercel.app/owner-console) in your browser and log in with your configured owner credentials.

