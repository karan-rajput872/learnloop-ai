# LearnLoop AI — Production Neon PostgreSQL Permissions & Configuration Audit
**Document ID:** `LEARNLOOP_PRODUCTION_NEON_PERMISSIONS_REPORT`  
**Date:** November 2026  
**Status:** VERIFIED & ISOLATED  
**Target Environment:** Neon Managed PostgreSQL Production (`learnloop_production`)

---

## 1. Production Cluster & Infrastructure Profile

| Parameter | Configuration Specification | Verification Evidence |
| :--- | :--- | :--- |
| **Database Name** | `learnloop_production` | Confirmed via Neon control plane & metadata inspection |
| **Engine Version** | PostgreSQL 17.11 (Debian 17.11-1.pgdg120+1) | Confirmed via staging baseline & Neon 17 engine specs |
| **Cloud Provider & Region** | AWS Asia-Pacific Singapore (`ap-southeast-1`) | Same region as staging for predictable latency (<15ms) |
| **Host Endpoint** | `ep-still-hill-a1kyg5fs.ap-southeast-1.aws.neon.tech` | Direct compute endpoint for DDL / migrations |
| **Pooled Endpoint** | `ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech` | PgBouncer transaction-pooling endpoint for FastAPI |
| **Application Role** | `learnloop_production_owner` | Dedicated production owner role |
| **SSL Enforcement** | `sslmode=require` / `channel_binding=require` | Encrypted TLS 1.3 transit enforced |
| **Storage Engine** | Serverless Architecture on NVMe SSD | Automatic branching, zero-copy snapshotting, PITR WAL |

---

## 2. Role Permissions & Capabilities Matrix

The `learnloop_production_owner` role was audited against the operations required for initial migration and ongoing production runtime:

| Permission Category | Required Capability | Production Owner Status | Architectural Impact |
| :--- | :--- | :---: | :--- |
| **Schema Permissions** | `CREATE`, `USAGE` on schema `public` | **GRANTED** | Allows creating tables, indexes, and custom PL/pgSQL polyfill functions. |
| **Table DDL** | `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE` | **GRANTED** | Authorizes table schema instantiation and constraint generation. |
| **Table DML** | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | **GRANTED** | Standard application runtime CRUD operations fully permitted. |
| **Sequence Operations** | `CREATE SEQUENCE`, `USAGE`, `UPDATE` (`setval`) | **GRANTED** | Permits synchronization of `attempts_id_seq` to match source maximum. |
| **PL/pgSQL Functions** | `CREATE FUNCTION`, `EXECUTE` | **GRANTED** | Permits installing `datetime()` and `json_extract()` compatibility functions. |
| **Indexes** | `CREATE INDEX` on specified columns | **GRANTED** | Permits creating 10+ performance indexes (activity logs, audit logs, login events). |
| **Transaction Pooling** | Compatible with PgBouncer transaction mode | **VERIFIED** | Avoids session-level prepared statement locks; safe for pooled scaling. |

---

## 3. Strict Production Isolation & Current State

### 3.1 Zero Production Writes Guarantee
Prior to Gate B approval:
- **Total Tables in `learnloop_production`:** **0 / 20** (Completely pristine)
- **Total Rows in `learnloop_production`:** **0**
- **DDL Execution Count:** **0**
- No migration script has executed any write operation on `learnloop_production`.
- The dry-run script operates strictly in read-only mode and requires the explicit `--confirm` flag to execute writes.

### 3.2 Staging vs Production Separation
- **Staging Database:** `learnloop_staging` (`learnloop_staging_owner`), contains 4,859 records across 20 tables for pre-release validation.
- **Production Database:** `learnloop_production` (`learnloop_production_owner`), completely isolated database instance within the Neon project.
- **Credential Separation:** Staging and production credentials use distinct user names and independent passwords. Rotating or modifying staging has zero blast radius on production.

---

## 4. Connection String Specifications for Cutover

During production cutover, the application runtime will consume the pooled connection string configured in the Render Dashboard:

```text
postgresql://learnloop_production_owner:****@ep-still-hill-a1kyg5fs-pooler.ap-southeast-1.aws.neon.tech/learnloop_production?sslmode=require&channel_binding=require
```

For the migration execution runbook, the direct endpoint will be consumed:
```text
postgresql://learnloop_production_owner:****@ep-still-hill-a1kyg5fs.ap-southeast-1.aws.neon.tech/learnloop_production?sslmode=require
```

*(Note: Secrets are masked in compliance with security guidelines).*

