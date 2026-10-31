import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def test_onboarding_and_personalization():
    print("Testing LearnLoop AI Onboarding & Personalization Suite...")
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    
    # 1. Test Diagnostic Questions (Quick vs Comprehensive)
    res_comp = client.get("/diagnostic/questions?mode=comprehensive")
    assert res_comp.status_code == 200, f"Comprehensive questions failed: {res_comp.text}"
    comp_data = res_comp.json()
    assert comp_data["total"] == 12, f"Expected 12 questions in comprehensive mode, got {comp_data['total']}"
    print("  [PASS] Comprehensive Diagnostic returns 12 questions")

    res_quick = client.get("/diagnostic/questions?mode=quick")
    assert res_quick.status_code == 200, f"Quick questions failed: {res_quick.text}"
    quick_data = res_quick.json()
    assert quick_data["total"] == 6, f"Expected 6 questions in quick mode, got {quick_data['total']}"
    print("  [PASS] Quick Diagnostic returns 6 calibrated questions")

    # 2. Test Onboarding Submission
    student_id = "test_onboard_user_1"
    onboarding_payload = {
        "learner_category": "College/University Student",
        "category_details": {
            "university": "Stanford University",
            "major": "Computer Science",
            "year": "Junior (3rd Year)"
        },
        "programming_experience": "Intermediate (1-3 years)",
        "dsa_experience": "Basic arrays, strings and recursion",
        "programming_languages": ["Python", "C++"],
        "preferred_language": "Python",
        "previously_studied_concepts": ["arrays", "recursion"],
        "primary_goals": ["Interview Preparation", "Academic Coursework"],
        "target_timeline": "2-3 months",
        "daily_availability": "1-2 hours/day",
        "self_assessed_skill_level": "Intermediate",
        "learning_preferences": ["visual_diagrams", "code_demonstrations", "step_by_step"],
        "diagnostic_mode": "quick"
    }

    res_onboard = client.post(f"/learner/onboarding?student_id={student_id}", json=onboarding_payload)
    assert res_onboard.status_code == 200, f"Onboarding submission failed: {res_onboard.text}"
    onboard_res_data = res_onboard.json()
    assert onboard_res_data["status"] == "success"
    assert onboard_res_data["onboarding_completed"] is True
    assert onboard_res_data["profile"]["learner_category"] == "College/University Student"
    assert "learning_path" in onboard_res_data
    print("  [PASS] Onboarding profile saved and category updated in learner model")

    # 3. Test Retrieval of Onboarding
    res_get_onboard = client.get(f"/learner/onboarding?student_id={student_id}")
    assert res_get_onboard.status_code == 200
    get_onboard_data = res_get_onboard.json()
    assert get_onboard_data["onboarding_completed"] is True
    assert get_onboard_data["onboarding_data"]["preferred_language"] == "Python"
    print("  [PASS] Onboarding data retrieved accurately")

    # 4. Test Learning Path Generation and DAG Prerequisite Analysis
    res_lp = client.get(f"/learner/learning-path?student_id={student_id}")
    assert res_lp.status_code == 200
    lp_data = res_lp.json()["learning_path"]
    assert "daily_question_target" in lp_data
    assert lp_data["daily_question_target"] >= 3
    assert "missing_prerequisites" in lp_data
    assert "recommended_next_concepts" in lp_data
    print(f"  [PASS] Personalized learning path verified (Daily Target: {lp_data['daily_question_target']} Qs, Focus: {lp_data.get('category_focus')})")

    # 5. Test Diagnostic Submit with Verified Proficiency Level Integration
    submissions = []
    for q in quick_data["questions"]:
        submissions.append({
            "question_id": q["id"],
            "concept_id": q["concept_id"],
            "selected_option": "A",
            "student_reasoning": "Selected option A based on invariant analysis"
        })

    submit_payload = {
        "student_id": student_id,
        "submissions": submissions
    }
    res_submit = client.post("/diagnostic/submit", json=submit_payload)
    assert res_submit.status_code == 200, f"Diagnostic submit failed: {res_submit.text}"
    submit_data = res_submit.json()
    assert "verified_proficiency" in submit_data
    vp = submit_data["verified_proficiency"]
    assert 1 <= vp["level_number"] <= 5
    assert "level_title" in vp
    print(f"  [PASS] Verified Proficiency computed: {vp['level_title']} (Score: {vp['proficiency_score']}%)")

    # 6. Test Proficiency Endpoint
    res_prof = client.get(f"/learner/proficiency?student_id={student_id}")
    assert res_prof.status_code == 200
    prof_data = res_prof.json()
    print("  [DEBUG] prof_data:", prof_data)
    print("  [DEBUG] vp:", vp)
    assert prof_data["verified_proficiency_level"] == vp["level_number"], f"Level mismatch: {prof_data['verified_proficiency_level']} vs {vp['level_number']}"
    assert prof_data["diagnostic_completed"] is True, f"Diagnostic not completed: {prof_data}"
    print("  [PASS] GET /api/learner/proficiency returned accurate verified level")

    print("\nALL 6 ONBOARDING & PERSONALIZATION TESTS PASSED!")

if __name__ == "__main__":
    try:
        test_onboarding_and_personalization()
    except Exception as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
