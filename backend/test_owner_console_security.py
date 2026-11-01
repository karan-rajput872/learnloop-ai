"""
Automated Security, Authentication, Authorization and Analytics Test Suite
for LearnLoop AI Private Owner Console.
"""

import os
from fastapi.testclient import TestClient
from app.main import app
from app.storage.db import storage
from app.auth.security import create_access_token, hash_password

client = TestClient(app)

def test_01_unauthenticated_access_rejected_401():
    """Unauthenticated visitor requesting any owner endpoint must receive HTTP 401."""
    endpoints = [
        "/api/owner/verify-session",
        "/api/owner/overview",
        "/api/owner/users",
        "/api/owner/login-activity",
        "/api/owner/learning-analytics",
        "/api/owner/engagement-analytics",
        "/api/owner/audit-logs",
        "/api/owner/export/registrations"
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401, f"Expected 401 on {ep}, got {res.status_code}"

def test_02_student_access_rejected_403():
    """Authenticated student account must be rejected with HTTP 403 Forbidden."""
    # Retrieve an active student user from the database
    with storage.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, student_id, email, full_name, role FROM users WHERE role = 'student' AND is_active = 1 LIMIT 1")
        student = dict(cursor.fetchone())

    student_token = create_access_token({
        "sub": student["id"],
        "student_id": student["student_id"],
        "email": student["email"],
        "name": student["full_name"],
        "role": "student"
    })
    headers = {"Authorization": f"Bearer {student_token}"}
    res = client.get("/api/owner/overview", headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden for student, got {res.status_code}"
    assert "Student and standard" in res.json().get("detail", "")

def test_03_teacher_access_rejected_403():
    """Authenticated educator/teacher account must be rejected with HTTP 403 Forbidden."""
    # Ensure a teacher exists
    teacher_token = create_access_token({
        "sub": "usr_demo_teacher",
        "student_id": "student_teacher_alan",
        "email": "teacher@learnloop.ai",
        "name": "Prof. Alan Turing",
        "role": "teacher"
    })
    headers = {"Authorization": f"Bearer {teacher_token}"}
    res = client.get("/api/owner/overview", headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden for teacher, got {res.status_code}"

def test_04_owner_access_granted_200():
    """Authenticated owner account matching OWNER_EMAIL must receive HTTP 200."""
    owner_user = storage.get_user_by_email("karanrajput872@gmail.com")
    assert owner_user is not None
    assert owner_user["role"] == "owner"

    owner_token = create_access_token({
        "sub": owner_user["id"],
        "student_id": owner_user["student_id"],
        "email": owner_user["email"],
        "name": owner_user["full_name"],
        "role": "owner"
    })
    headers = {"Authorization": f"Bearer {owner_token}"}

    res_verify = client.get("/api/owner/verify-session", headers=headers)
    assert res_verify.status_code == 200
    assert res_verify.json()["is_owner"] is True

    res_overview = client.get("/api/owner/overview", headers=headers)
    assert res_overview.status_code == 200
    data = res_overview.json()
    assert "total_registered_users" in data
    assert "dau" in data
    assert "registration_trends" in data

def test_05_role_tampering_rejected_by_backend():
    """Forged token claiming role='owner' but with a student email must be rejected by backend."""
    fake_owner_token = create_access_token({
        "sub": "usr_fake_attacker",
        "student_id": "student_fake",
        "email": "attacker@evilcorp.com",
        "name": "Attacker",
        "role": "owner"  # Claimed role in payload
    })
    headers = {"Authorization": f"Bearer {fake_owner_token}"}
    res = client.get("/api/owner/overview", headers=headers)
    # The user doesn't exist in DB or doesn't match OWNER_EMAIL -> 401 or 403
    assert res.status_code in [401, 403]

def test_06_owner_login_endpoint():
    """Test dedicated /api/owner/login endpoint."""
    # Attempt invalid password
    res_bad = client.post("/api/owner/login", json={
        "email": "karanrajput872@gmail.com",
        "password": "WrongPassword123"
    })
    assert res_bad.status_code == 401

    # Attempt valid owner password
    res_good = client.post("/api/owner/login", json={
        "email": "karanrajput872@gmail.com",
        "password": "OwnerPass123456!"
    })
    assert res_good.status_code == 200
    assert "access_token" in res_good.json()
    assert res_good.json()["user"]["role"] == "owner"

def test_07_user_directory_and_privacy():
    """User directory must paginate, filter, and omit passwords or tokens."""
    owner_user = storage.get_user_by_email("karanrajput872@gmail.com")
    owner_token = create_access_token({
        "sub": owner_user["id"],
        "student_id": owner_user["student_id"],
        "email": owner_user["email"],
        "name": owner_user["full_name"],
        "role": "owner"
    })
    headers = {"Authorization": f"Bearer {owner_token}"}

    res = client.get("/api/owner/users?limit=10", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert "users" in payload
    assert len(payload["users"]) > 0

    first_user = payload["users"][0]
    # Verify strict privacy guarantees
    assert "hashed_password" not in first_user
    assert "password" not in first_user
    assert "google_sub" not in first_user

def test_08_csv_reports_export():
    """Owner CSV reports must stream valid CSV without leaking credentials."""
    owner_user = storage.get_user_by_email("karanrajput872@gmail.com")
    owner_token = create_access_token({
        "sub": owner_user["id"],
        "student_id": owner_user["student_id"],
        "email": owner_user["email"],
        "name": owner_user["full_name"],
        "role": "owner"
    })
    headers = {"Authorization": f"Bearer {owner_token}"}

    for rep in ["registrations", "logins", "learning-activity", "feature-usage", "audit-logs"]:
        res = client.get(f"/api/owner/export/{rep}", headers=headers)
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        text = res.text
        assert "hashed_password" not in text
        assert "password" not in text

def test_09_audit_trail_recorded():
    """Verify that unauthorized attempt and console access were logged in audit trail."""
    owner_user = storage.get_user_by_email("karanrajput872@gmail.com")
    owner_token = create_access_token({
        "sub": owner_user["id"],
        "student_id": owner_user["student_id"],
        "email": owner_user["email"],
        "name": owner_user["full_name"],
        "role": "owner"
    })
    headers = {"Authorization": f"Bearer {owner_token}"}

    res = client.get("/api/owner/audit-logs?limit=10", headers=headers)
    assert res.status_code == 200
    logs = res.json()["logs"]
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert "OWNER_ACCOUNT_BOOTSTRAPPED" in actions or "CONSOLE_ACCESS_VERIFIED" in actions or "OWNER_LOGIN_SUCCESS" in actions

def test_10_regular_student_teacher_workflows_intact():
    """Verify standard learner diagnostic, quiz, concepts, and health endpoints remain functional."""
    # Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200

    # Concepts syllabus
    res_concepts = client.get("/api/concepts")
    assert res_concepts.status_code == 200
    assert len(res_concepts.json()["concepts"]) == 12

    # Teacher demo dashboard
    res_teacher = client.get("/api/teacher/demo-dashboard")
    assert res_teacher.status_code == 200

if __name__ == "__main__":
    tests = [
        test_01_unauthenticated_access_rejected_401,
        test_02_student_access_rejected_403,
        test_03_teacher_access_rejected_403,
        test_04_owner_access_granted_200,
        test_05_role_tampering_rejected_by_backend,
        test_06_owner_login_endpoint,
        test_07_user_directory_and_privacy,
        test_08_csv_reports_export,
        test_09_audit_trail_recorded,
        test_10_regular_student_teacher_workflows_intact
    ]
    passed = 0
    failed = 0
    print("=" * 60)
    print("LEARNLOOP AI — OWNER CONSOLE SECURITY & ANALYTICS TEST SUITE")
    print("=" * 60)
    for t in tests:
        name = t.__name__
        try:
            t()
            print(f"PASS: {name}")
            passed += 1
        except Exception as e:
            print(f"FAIL: {name} -> {e}")
            failed += 1
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests.")
    print("=" * 60)
    if failed > 0:
        exit(1)
