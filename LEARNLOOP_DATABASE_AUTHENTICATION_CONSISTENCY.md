# LearnLoop AI — Database & Authentication State Consistency Report

## 1. Database Architecture & Safety Standards
- **Primary Database:** SQLite in `backend/data/learnloop.db` (staging/production mirrored).
- **Safety Protocol:** Zero drops, zero destructive migrations, zero truncate operations. All tables (`users`, `learners`, `user_sessions`, `auth_audit_log`, `concepts`, `diagnostic_questions`) preserved with full integrity.

## 2. Verified Accounts in Persistent Database

| Email | Full Name | Student Partition ID | Role | Auth Provider | Password Hash |
|---|---|---|---|---|---|
| `pwkaran25@gmail.com` | Karan | `student_d63085727e` | student | local | Argon2id (`Password123!`) |
| `karanrajput872@gmail.com` | LearnLoop Platform Owner | `student_owner` | student / owner | local | Argon2id |
| `evaluator_student_*@learnloop.ai` | Evaluator / Morgan Freeman | `student_e111d2cfe8` | student | local | Argon2id |
| `student_guest_demo` | Alex Rivera (Guest Demo) | `student_guest_demo` | student | demo | Isolated Demo Profile |

## 3. Account Collision & Data Isolation Guarantees
- Each registered account is uniquely mapped to an isolated `student_id`.
- User mastery profiles (`learners`), diagnostic responses, adaptive quiz attempts, and spaced revision queues are partitioned strictly by `student_id`.
- Multiple user accounts never cross-contaminate concept scores or BSS algorithm weights.

