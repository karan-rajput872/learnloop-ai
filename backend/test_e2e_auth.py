import httpx
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def test_full_auth_lifecycle():
    client = httpx.Client(timeout=10.0)
    rand_id = uuid.uuid4().hex[:8]

    email_a = f"alice_{rand_id}@learnloop.edu"
    pwd_a = "SecretPass123!"
    new_pwd_a = "BrandNewSecretPass456!"

    email_b = f"bob_{rand_id}@learnloop.edu"
    pwd_b = "BobSecretPass789!"

    print("=========================================================")
    print("LEARNLOOP AI - COMPREHENSIVE END-TO-END AUTHENTICATION TEST")
    print("=========================================================")

    # 1. Registration - Account A
    print("\n[STEP 1] Registering Account A...")
    r_reg_a = client.post(f"{BASE_URL}/auth/register", json={
        "full_name": "Alice Springs",
        "email": email_a,
        "password": pwd_a,
        "confirm_password": pwd_a,
        "terms_accepted": True
    })
    assert r_reg_a.status_code == 201, f"Reg A failed: {r_reg_a.text}"
    data_a = r_reg_a.json()
    user_a = data_a["user"]
    student_id_a = user_a["student_id"]
    token_a = data_a["access_token"]
    assert "refresh_token" not in data_a, "Refresh token must not be in JSON response"
    refresh_cookie_a = r_reg_a.cookies.get("refresh_token")
    assert refresh_cookie_a is not None, "Refresh token cookie must be present"
    print(f"  -> Created Account A: {user_a['email']} (Student ID: {student_id_a})")

    # 2. Verify Initialized Profile for Account A
    print("\n[STEP 2] Verifying Account A initialized learner profile...")
    r_prof_a = client.get(f"{BASE_URL}/learner/profile", headers={"Authorization": f"Bearer {token_a}"})
    assert r_prof_a.status_code == 200
    prof_a = r_prof_a.json()["profile"]
    assert prof_a["student_id"] == student_id_a
    assert len(prof_a["concepts"]) == 12
    print(f"  -> Profile verified: {len(prof_a['concepts'])} concepts initialized, mastery: {prof_a['overall_mastery']}%")

    # 3. Session Persistence & Token Rotation via HttpOnly Cookie
    print("\n[STEP 3] Testing token rotation & session refresh via HttpOnly cookie...")
    r_ref = client.post(f"{BASE_URL}/auth/refresh", json={}, cookies={"refresh_token": refresh_cookie_a})
    assert r_ref.status_code == 200
    ref_data = r_ref.json()
    new_token_a = ref_data["access_token"]
    assert "refresh_token" not in ref_data, "Refresh token must not be in JSON body"
    new_refresh_cookie_a = r_ref.cookies.get("refresh_token")
    assert new_refresh_cookie_a != refresh_cookie_a, "Refresh token cookie must rotate"
    print("  -> Refresh token rotated successfully.")

    # 4. Registration - Account B
    print("\n[STEP 4] Registering Account B...")
    r_reg_b = client.post(f"{BASE_URL}/auth/register", json={
        "full_name": "Bob Vance",
        "email": email_b,
        "password": pwd_b,
        "confirm_password": pwd_b,
        "terms_accepted": True
    })
    assert r_reg_b.status_code == 201
    data_b = r_reg_b.json()
    user_b = data_b["user"]
    student_id_b = user_b["student_id"]
    token_b = data_b["access_token"]
    print(f"  -> Created Account B: {user_b['email']} (Student ID: {student_id_b})")

    # 5. Isolation Checks: Account IDs must be strictly unique
    assert student_id_a != student_id_b, "Student partition keys must be distinct"
    assert user_a["id"] != user_b["id"], "User IDs must be distinct"

    headers_a = {"Authorization": f"Bearer {new_token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 6. User B creates learning data (Diagnostic attempt)
    print("\n[STEP 5] User B submits a diagnostic assessment...")
    r_sub_b = client.post(f"{BASE_URL}/diagnostic/submit", json={
        "student_id": student_id_b,
        "submissions": [{
            "question_id": "q_arr_01",
            "concept_id": "arrays",
            "selected_option": "A",
            "student_reasoning": "User B arrays reasoning"
        }]
    }, headers=headers_b)
    assert r_sub_b.status_code == 200
    attempt_id_b = r_sub_b.json()["attempt_id"]
    print(f"  -> Diagnostic attempt {attempt_id_b} recorded for Account B.")

    # 7. Cross-Account Unauthorized Access Tests (All must return 403 Forbidden)
    print("\n[STEP 6] Testing Cross-Account Data Access Restrictions...")

    # A tries to access B's profile
    r = client.get(f"{BASE_URL}/learner/profile?student_id={student_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on profile access, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from reading User B's profile.")

    # A tries to access B's attempt history
    r = client.get(f"{BASE_URL}/learner/history?student_id={student_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on history access, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from reading User B's attempt history.")

    # A tries to access B's misconceptions
    r = client.get(f"{BASE_URL}/learner/misconceptions?student_id={student_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on misconceptions, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from reading User B's misconceptions.")

    # A tries to access B's diagnostic attempts list
    r = client.get(f"{BASE_URL}/diagnostic/attempts?student_id={student_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on diagnostic attempts list, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from listing User B's diagnostic attempts.")

    # A tries to access B's specific diagnostic attempt details
    r = client.get(f"{BASE_URL}/diagnostic/attempt/{attempt_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on specific diagnostic attempt, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from inspecting User B's diagnostic attempt.")

    # A tries to access B's revision schedule
    r = client.get(f"{BASE_URL}/tutor/revision/tasks?student_id={student_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on revision tasks, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from viewing User B's revision tasks.")

    # A tries to access B's chat history
    r = client.get(f"{BASE_URL}/tutor/messages?student_id={student_id_b}", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on chat history, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from reading User B's tutor chat history.")

    # A tries to submit a quiz spoofing B's student_id
    r = client.post(f"{BASE_URL}/quiz/submit", json={
        "student_id": student_id_b,
        "question_id": "q_arr_01",
        "concept_id": "arrays",
        "selected_option": "A",
        "student_reasoning": "Spoofed attempt"
    }, headers=headers_a)
    assert r.status_code == 403, f"Expected 403 on spoofed submission, got {r.status_code}"
    print("  [403 FORBIDDEN] User A blocked from submitting quiz answers as User B.")

    # 8. Password Change Workflow
    print("\n[STEP 7] Testing Password Change Workflow...")
    # Change password
    r_chg = client.post(f"{BASE_URL}/auth/change-password", json={
        "old_password": pwd_a,
        "new_password": new_pwd_a,
        "confirm_password": new_pwd_a
    }, headers=headers_a)
    assert r_chg.status_code == 200, f"Password change failed: {r_chg.text}"
    print("  -> Password changed successfully.")

    # Old password must now fail
    r_old_login = client.post(f"{BASE_URL}/auth/login", json={
        "email": email_a,
        "password": pwd_a
    })
    assert r_old_login.status_code == 401, "Old password must be rejected"
    print("  -> Old password rejected (401 Unauthorized).")

    # New password must succeed
    r_new_login = client.post(f"{BASE_URL}/auth/login", json={
        "email": email_a,
        "password": new_pwd_a
    })
    assert r_new_login.status_code == 200, "New password must succeed"
    print("  -> New password accepted (200 OK).")
    latest_refresh = r_new_login.cookies.get("refresh_token")
    assert latest_refresh is not None, "Refresh cookie must be present on login"

    # 9. Logout Workflow
    print("\n[STEP 8] Testing Explicit Logout & Session Invalidation...")
    r_logout = client.post(f"{BASE_URL}/auth/logout", cookies={"refresh_token": latest_refresh})
    assert r_logout.status_code == 200
    print("  -> Logout succeeded.")

    # Refreshing with logged out token must fail
    r_revoked = client.post(f"{BASE_URL}/auth/refresh", cookies={"refresh_token": latest_refresh})
    assert r_revoked.status_code == 401
    print("  -> Revoked refresh token rejected (401 Unauthorized).")

    print("\n=========================================================")
    print("ALL END-TO-END AUTHENTICATION & ISOLATION CHECKS PASSED!")
    print("=========================================================")

if __name__ == "__main__":
    test_full_auth_lifecycle()
