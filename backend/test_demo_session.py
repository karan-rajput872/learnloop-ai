import sys
import os
import httpx

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_demo_session_flow():
    print("Testing Demo Session Flow...")

    # 1. Start demo session
    res = client.post("/api/auth/demo-session")
    assert res.status_code == 200, f"Failed demo session: {res.text}"
    data = res.json()
    assert data["status"] == "success"
    assert data["user"]["is_demo"] is True
    assert "Demo Learner" in data["user"]["full_name"]
    token = data["access_token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check profile
    prof_res = client.get("/api/learner/profile", headers=headers)
    assert prof_res.status_code == 200, f"Failed profile: {prof_res.text}"
    prof_data = prof_res.json()
    prof = prof_data.get("profile", prof_data)
    assert prof["student_id"] == "student_guest_demo"
    assert prof["overall_mastery"] > 0
    assert prof["verified_proficiency_level"] == "Level 2 — Developing Apprentice"
    print("  [PASS] Demo Learner profile retrieved with realistic progress!")

    # 3. Check teacher dashboard access (allowed for demo user)
    teach_res = client.get("/api/teacher/dashboard", headers=headers)
    assert teach_res.status_code == 200, f"Teacher dashboard access failed: {teach_res.text}"
    teach_data = teach_res.json()
    print("Teacher dashboard keys:", list(teach_data.keys()))
    assert len(teach_data.keys()) > 0
    print("  [PASS] Demo user authorized to view Teacher Dashboard!")

    # 4. Check demo reset
    reset_res = client.post("/api/auth/demo-reset", headers=headers)
    assert reset_res.status_code == 200, f"Reset failed: {reset_res.text}"
    print("  [PASS] Demo reset endpoint verified!")

    print("\nALL DEMO SESSION TESTS PASSED 100%!")

if __name__ == "__main__":
    test_demo_session_flow()
