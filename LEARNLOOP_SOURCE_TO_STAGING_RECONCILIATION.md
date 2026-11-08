# LearnLoop AI — Source SQLite to Neon Staging Reconciliation Report
**Document ID:** `LEARNLOOP_SOURCE_TO_STAGING_RECONCILIATION`  
**Date:** November 2026  
**Status:** 100% VERIFIED PARITY  
**Source Database:** SQLite (`backend/data/learnloop.db`)  
**Target Comparison Database:** Neon PostgreSQL Staging (`learnloop_staging`)

---

## 1. Source Database Physical Verification

- **Absolute Physical Path:** `c:\Users\KIIT\OneDrive\Documents\Agentic AI Hackathon\learnloop-ai\backend\data\learnloop.db`
- **File Size:** `2,674,688 bytes` (2.67 MB)
- **Engine PRAGMA integrity_check:** `[('ok',)]` (Clean B-Tree structure, zero page corruption)
- **Engine PRAGMA foreign_key_check:** `[]` (0 referential integrity violations)
- **Active Table Count:** 20 tables (100% of defined application tables present)
- **Total Master Record Count:** **4,859 records**

---

## 2. Table-by-Table Row Count Reconciliation

The table below reconciles the master SQLite database records against the Neon PostgreSQL staging database:

| # | Table Name | SQLite Master Rows | Neon Staging Rows | Variance | Status | Primary Key Schema |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | `users` | 145 | 145 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 2 | `learners` | 162 | 162 | 0 | **MATCH** | `student_id TEXT PRIMARY KEY` |
| 3 | `concept_mastery` | 1,968 | 1,968 | 0 | **MATCH** | `(student_id, concept_id) PRIMARY KEY` |
| 4 | `attempts` | 284 | 284 | 0 | **MATCH** | `id SERIAL PRIMARY KEY` |
| 5 | `revision_tasks` | 183 | 183 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 6 | `teacher_demo_cohort` | 6 | 6 | 0 | **MATCH** | `student_id TEXT PRIMARY KEY` |
| 7 | `chat_messages` | 438 | 438 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 8 | `diagnostic_attempts` | 105 | 105 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 9 | `user_sessions` | 258 | 258 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 10 | `password_reset_tokens` | 0 | 0 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 11 | `user_activity_logs` | 101 | 101 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 12 | `user_streaks` | 22 | 22 | 0 | **MATCH** | `student_id TEXT PRIMARY KEY` |
| 13 | `user_gamification` | 22 | 22 | 0 | **MATCH** | `student_id TEXT PRIMARY KEY` |
| 14 | `user_achievements` | 176 | 176 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 15 | `user_challenges` | 125 | 125 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 16 | `user_settings` | 5 | 5 | 0 | **MATCH** | `student_id TEXT PRIMARY KEY` |
| 17 | `user_notifications` | 69 | 69 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 18 | `login_events` | 255 | 255 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 19 | `user_activity_events` | 414 | 414 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| 20 | `owner_audit_logs` | 121 | 121 | 0 | **MATCH** | `id TEXT PRIMARY KEY` |
| **TOTAL** | **20 Tables** | **4,859** | **4,859** | **0** | **100% PARITY** | — |

---

## 3. Account & Identity Parity

### 3.1 User Authentication Integrity
- **Total Registered Accounts:** 145 user accounts in both systems.
- **Password Hashes:** Verbatim Argon2 (`$argon2id$...`) and bcrypt (`$2b$...`) hashes remain unaltered. No password rehashing or truncation occurred.
- **Email Normalization:** All emails have corresponding lowercase `normalized_email` indexes preventing case-collision attacks.
- **Demo Accounts:** 3 dedicated demo accounts (`student_demo`, `teacher_demo`, `owner_demo`) verified intact with full role assignments (`student`, `teacher`, `owner`).

### 3.2 Google OAuth Persistence
- **Linked Google Accounts:** Verified users with `auth_provider = 'google'` contain intact `google_sub` identifiers.
- **Account Linking:** Users authenticated through Google cannot have duplicate accounts created via local registration.

---

## 4. Referential & Relational Integrity

Referential checks between foreign keys were verified with 0 orphan records:
- `user_sessions.user_id -> users.id`: 258 sessions referenced valid users. 0 orphans.
- `password_reset_tokens.user_id -> users.id`: 0 reset tokens. 0 orphans.
- `users.student_id -> learners.student_id`: 145 users mapped to learners. 0 orphans.
- `concept_mastery.student_id -> learners.student_id`: 1,968 mastery records correctly assigned. 0 orphans.
- `diagnostic_attempts.student_id -> learners.student_id`: 105 diagnostic attempts correctly assigned. 0 orphans.
- `attempts.student_id -> learners.student_id`: 284 question attempts correctly assigned. 0 orphans.

---

## 5. Sequence Parity Verification

In PostgreSQL, auto-incrementing primary keys rely on database sequences.
- Table: `attempts`
- Primary Key: `id SERIAL`
- Associated Sequence: `attempts_id_seq`
- Maximum `attempts.id` in SQLite: `284`
- PostgreSQL `attempts_id_seq` current value: `284`
- Next inserted attempt will reliably receive `id = 285` without unique constraint collision.

---

## 6. Verification Conclusion

The source SQLite database and Neon PostgreSQL staging database demonstrate **exact 100% data parity** across all 4,859 records, 20 tables, and primary/foreign key relationships.

