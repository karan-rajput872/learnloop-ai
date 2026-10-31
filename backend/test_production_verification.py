import httpx
import time
import sys

# Force unbuffered output
import functools
print = functools.partial(print, flush=True)

PROD_VERCEL_API = "https://learnloop-ai-one.vercel.app/api"
PROD_RENDER_API = "https://learnloop-ai-backend.onrender.com/api"

def verify_live_production():
    print("=" * 70)
    print("LEARNLOOP AI LIVE PRODUCTION VERIFICATION SUITE")
    print("=" * 70)
    
    # Use Vercel Same-Site Proxy as primary endpoint
    client = httpx.Client(base_url=PROD_VERCEL_API, timeout=30.0, follow_redirects=True)
    
    print("\n[PHASE 1] Waiting for Render deployment of commit 5a7c744...")
    for attempt in range(1, 20):
        try:
            r = client.get("/health")
            if r.status_code == 200:
                # Check if new quick mode endpoint is active
                r_quick = client.get("/diagnostic/questions?mode=quick")
                if r_quick.status_code == 200 and r_quick.json().get("total") == 6:
                    print(f"  [SUCCESS] Live production is serving commit 5a7c744! (Quick mode verified: 6 Qs)")
                    break
                else:
                    print(f"  [WAIT] Render build in progress (quick mode total: {r_quick.json().get('total')}). Retry {attempt}/20 in 10s...")
            else:
                print(f"  [WAIT] Health status {r.status_code}. Retry {attempt}/20 in 10s...")
        except Exception as e:
            print(f"  [WAIT] Connecting... ({e}). Retry {attempt}/20 in 10s...")
        time.sleep(10)
    else:
        print("  [WARN] Polling timed out. Proceeding with verification...")

    # 1. Health check
    r_health = client.get("/health")
    assert r_health.status_code == 200
    h_data = r_health.json()
    print(f"  [PASS] Backend health verified: {h_data['service']} v{h_data['version']} (AI Configured: {h_data['engine']['is_ai_configured']})")

    # 2. Comprehensive mode (12 questions)
    r_comp = client.get("/diagnostic/questions?mode=comprehensive")
    assert r_comp.status_code == 200
    assert r_comp.json()["total"] == 12
    print("  [PASS] Comprehensive Diagnostic verified (12 questions)")

    # 3. Quick mode (6 questions)
    r_quick = client.get("/diagnostic/questions?mode=quick")
    assert r_quick.status_code == 200
    assert r_quick.json()["total"] == 6
    print("  [PASS] Quick Diagnostic verified (6 high-signal questions)")

    # 4. Scenario A: Register New Learner on Live Production
    timestamp = int(time.time())
    email = f"prod_learner_{timestamp}@learnloop.ai"
    password = "ProdSecurePassword#2026"
    full_name = f"Taylor Swift {timestamp % 1000}"

    print(f"\n[PHASE 2] Scenario A: Register new learner on live production ({email})...")
    reg_payload = {
        "email": email,
        "password": password,
        "confirm_password": password,
        "full_name": full_name,
        "terms_accepted": True
    }
    r_reg = client.post("/auth/register", json=reg_payload)
    assert r_reg.status_code == 201, f"Registration failed: {r_reg.text}"
    reg_data = r_reg.json()
    token = reg_data["access_token"]
    student_id = reg_data["user"]["student_id"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print(f"  [PASS] Account created: student_id='{student_id}', name='{full_name}'")

    # 5. Submit Personalized Onboarding
    print("\n[PHASE 3] Scenario A: Submit Personalized Onboarding Questionnaire...")
    onboard_payload = {
        "learner_category": "College / University Student",
        "category_details": {
            "institution": "University of Washington",
            "major": "Computer Science & Engineering",
            "year": "Senior"
        },
        "programming_experience": "2–4 years",
        "dsa_experience": "Comfortable with basic data structures",
        "programming_languages": ["Python", "Java", "C++"],
        "preferred_language": "Python",
        "previously_studied_concepts": ["arrays", "linked_lists", "stacks", "recursion"],
        "primary_goals": ["Technical interviews", "Placement preparation"],
        "target_timeline": "Within 3 months",
        "daily_availability": "1–2 hours",
        "self_assessed_skill_level": "Intermediate",
        "learning_preferences": ["step_by_step", "visual_diagrams", "code_demonstrations"],
        "diagnostic_mode": "quick"
    }
    r_onboard = client.post("/learner/onboarding", json=onboard_payload, headers=auth_headers)
    assert r_onboard.status_code == 200, f"Onboarding failed: {r_onboard.text}"
    onboard_res = r_onboard.json()
    assert onboard_res["onboarding_completed"] is True
    assert onboard_res["profile"]["learner_category"] == "College / University Student"
    lp = onboard_res["learning_path"]
    print(f"  [PASS] Onboarding saved: Category='{onboard_res['profile']['learner_category']}'")
    print(f"  [PASS] Learning Path generated: Daily Target={lp['daily_question_target']} Qs, Timeline='{lp['target_timeline']}'")

    # 6. Retrieve Onboarding & Learning Path
    r_get_path = client.get("/learner/learning-path", headers=auth_headers)
    assert r_get_path.status_code == 200
    assert "missing_prerequisites" in r_get_path.json()["learning_path"]
    print("  [PASS] GET /api/learner/learning-path confirmed DAG prerequisite analysis")

    # 7. Complete Diagnostic Assessment on Live Production
    print("\n[PHASE 4] Scenario A: Complete Diagnostic & Calculate Verified Proficiency...")
    diag_submissions = []
    for q in r_quick.json()["questions"]:
        diag_submissions.append({
            "question_id": q["id"],
            "concept_id": q["concept_id"],
            "selected_option": "A",
            "student_reasoning": "Live production verification answer trace"
        })
    r_submit = client.post("/diagnostic/submit", json={
        "student_id": student_id,
        "submissions": diag_submissions
    }, headers=auth_headers)
    assert r_submit.status_code == 200, f"Submit failed: {r_submit.text}"
    submit_res = r_submit.json()
    assert "verified_proficiency" in submit_res
    vp = submit_res["verified_proficiency"]
    print(f"  [PASS] Verified Proficiency computed: {vp['level_title']} (Calibrated Score: {vp['proficiency_score']}%)")

    # 8. Scenario B: Returning Learner Login & Session Verification
    print(f"\n[PHASE 5] Scenario B: Returning Learner Login with same credentials...")
    login_client = httpx.Client(base_url=PROD_VERCEL_API, timeout=30.0, follow_redirects=True)
    r_login = login_client.post("/auth/login", json={
        "email": email,
        "password": password,
        "remember_me": True
    })
    assert r_login.status_code == 200, f"Returning login failed: {r_login.text}"
    login_data = r_login.json()
    assert login_data["user"]["email"] == email
    ret_token = login_data["access_token"]
    ret_headers = {"Authorization": f"Bearer {ret_token}"}
    print(f"  [PASS] Returning login successful for {email}")

    # Verify profile persistence for returning learner
    r_ret_prof = login_client.get("/learner/profile", headers=ret_headers)
    assert r_ret_prof.status_code == 200
    ret_prof = r_ret_prof.json()["profile"]
    assert ret_prof["onboarding_completed"] is True
    assert ret_prof["diagnostic_completed"] is True
    print(f"  [PASS] Returning learner state persisted: Category='{ret_prof['learner_category']}', Diagnostic Completed={ret_prof['diagnostic_completed']}")

    # 9. Scenario E: Multi-User Data Isolation Check
    print("\n[PHASE 6] Scenario E: Multi-User Strict Isolation Check...")
    email_b = f"prod_learner_b_{timestamp}@learnloop.ai"
    r_reg_b = client.post("/auth/register", json={
        "email": email_b,
        "password": password,
        "confirm_password": password,
        "full_name": "Bob Dylan",
        "terms_accepted": True
    })
    assert r_reg_b.status_code == 201
    user_b_token = r_reg_b.json()["access_token"]
    user_b_id = r_reg_b.json()["user"]["student_id"]
    headers_b = {"Authorization": f"Bearer {user_b_token}"}

    # User B attempts to access User A's student_id -> HTTP 403 Forbidden!
    r_cross_access = client.get(f"/learner/profile?student_id={student_id}", headers=headers_b)
    assert r_cross_access.status_code == 403, f"Expected 403 Forbidden on cross-user profile access, got {r_cross_access.status_code}"
    print("  [PASS] Cross-user access rejected with HTTP 403 Forbidden (Strict Multi-User Isolation verified)")

    print("\n" + "=" * 70)
    print("ALL LIVE PRODUCTION VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    try:
        verify_live_production()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\nPRODUCTION VERIFICATION FAILED: {e}")
        sys.exit(1)
