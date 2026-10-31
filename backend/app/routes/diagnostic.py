from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel
from app.dsa.question_bank import get_diagnostic_questions, get_question_by_id
from app.dsa.syllabus import DSA_CONCEPTS
from app.dsa.misconceptions import MISCONCEPTION_CATALOG
from app.dsa.personalization import (
    select_personalized_diagnostic_questions,
    calculate_verified_proficiency,
    generate_personalized_learning_path
)
from app.storage.db import storage
from app.tools.repetition_scheduler import schedule_spaced_repetition
from app.auth.security import get_current_user_optional, resolve_student_id

router = APIRouter(prefix="/api/diagnostic", tags=["Diagnostic Assessment"])

class DiagnosticSubmissionItem(BaseModel):
    question_id: str
    concept_id: str
    selected_option: str
    student_reasoning: str = ""

class DiagnosticBatchSubmission(BaseModel):
    student_id: str = "student_default"
    submissions: List[DiagnosticSubmissionItem]

@router.get("/questions")
def get_diagnostic_test(
    mode: str = "comprehensive",
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Retrieve personalized diagnostic assessment questions.
    Supports mode='quick' (6 high-signal questions) or mode='comprehensive' (12 questions).
    Difficulty is calibrated based on self-assessed skill level from onboarding if available.
    Security guarantee: Strips all answer keys, explanations, and misconception triggers.
    """
    effective_id = resolve_student_id(user, student_id)
    onboarding = storage.get_learner_onboarding(effective_id) if effective_id else None
    self_level = onboarding.get("self_assessed_skill_level", "Intermediate") if onboarding else "Intermediate"

    questions = select_personalized_diagnostic_questions(mode=mode, onboarding_data=onboarding)
    safe_list = []
    for q in questions:
        safe_list.append({
            "id": q["id"],
            "concept_id": q["concept_id"],
            "difficulty": q["difficulty"],
            "question_text": q["question_text"],
            "options": q["options"]
        })
    return {"questions": safe_list, "total": len(safe_list), "mode": mode}

@router.post("/submit")
def submit_diagnostic_test(
    payload: DiagnosticBatchSubmission,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Evaluate diagnostic answers, establish calibrated baseline concept mastery,
    persist full attempt history, and return comprehensive results + review payload.
    """
    student_id = resolve_student_id(user, payload.student_id)
    results = []
    question_reviews = []
    concept_breakdown = []

    score = 0
    total_questions = len(payload.submissions)

    for item in payload.submissions:
        q = get_question_by_id(item.question_id)
        if not q:
            continue

        correct_opt = q.get("correct_option", "A").strip().upper()
        selected_opt = item.selected_option.strip().upper()
        is_correct = (selected_opt == correct_opt)

        if is_correct:
            score += 1
            # Calibrated baseline: Initial mastery for demonstrating correct foundational comprehension
            baseline_mastery = 80.0
            difficulty = "intermediate"
            consecutive_correct = 1
            last_misc_id = None
            last_misc_name = None
            misconception_detail = None
        else:
            # Calibrated baseline: Identified foundational knowledge gap
            baseline_mastery = 20.0
            difficulty = "novice"
            consecutive_correct = 0
            last_misc_id = q.get("option_misconceptions", {}).get(item.selected_option)
            if last_misc_id and last_misc_id in MISCONCEPTION_CATALOG:
                m_info = MISCONCEPTION_CATALOG[last_misc_id]
                last_misc_name = m_info["name"]
                misconception_detail = {
                    "id": last_misc_id,
                    "name": m_info["name"],
                    "description": m_info["description"],
                    "remediation_tip": m_info["remediation_tip"],
                    "prerequisite_to_review": m_info.get("prerequisite_to_review")
                }
            else:
                last_misc_name = "Conceptual misunderstanding" if last_misc_id else None
                misconception_detail = {
                    "id": last_misc_id or "unspecified_error",
                    "name": "Alternative Distractor Selected",
                    "description": "Selected an incorrect option indicating unformed prerequisite intuition.",
                    "remediation_tip": "Review the core definition and step through an example calculation carefully.",
                    "prerequisite_to_review": item.concept_id
                }

        # Update persistent concept mastery in SQLite
        storage.update_concept_mastery(student_id, item.concept_id, {
            "mastery_percentage": baseline_mastery,
            "questions_attempted": 1,
            "correct_answers": 1 if is_correct else 0,
            "incorrect_answers": 0 if is_correct else 1,
            "current_difficulty": difficulty,
            "last_misconception": last_misc_id,
            "last_misconception_name": last_misc_name,
            "last_practiced_at": datetime.utcnow().isoformat(),
            "consecutive_correct": consecutive_correct
        })

        # Schedule initial spaced revision task
        schedule_spaced_repetition(student_id, item.concept_id, is_correct, baseline_mastery)

        c_meta = DSA_CONCEPTS.get(item.concept_id, {})
        concept_name = c_meta.get("name", item.concept_id.replace("_", " ").title())
        category = c_meta.get("category", "Data Structures")

        # Performance Tier classification: Strong (>=80%), Developing (50-79%), Needs Improvement (<50%)
        status = "Strong" if is_correct else "Needs Improvement"

        concept_breakdown.append({
            "concept_id": item.concept_id,
            "concept_name": concept_name,
            "category": category,
            "total_questions": 1,
            "correct_answers": 1 if is_correct else 0,
            "incorrect_answers": 0 if is_correct else 1,
            "accuracy": 100.0 if is_correct else 0.0,
            "status": status,
            "calibrated_mastery": baseline_mastery
        })

        question_reviews.append({
            "question_id": q["id"],
            "concept_id": item.concept_id,
            "concept_name": concept_name,
            "category": category,
            "difficulty": q.get("difficulty", "novice"),
            "question_text": q.get("question_text", ""),
            "options": q.get("options", []),
            "selected_option": item.selected_option,
            "correct_option": correct_opt,
            "is_correct": is_correct,
            "status": "correct" if is_correct else ("unanswered" if not item.selected_option else "incorrect"),
            "explanation": q.get("explanation", ""),
            "student_reasoning": item.student_reasoning,
            "misconception": misconception_detail,
            "calibrated_mastery": baseline_mastery
        })

        results.append({
            "concept_id": item.concept_id,
            "is_correct": is_correct,
            "baseline_mastery": baseline_mastery
        })

    # Activate profile
    storage.set_diagnostic_completed(student_id)
    profile = storage.get_learner_profile(student_id)

    accuracy_percentage = round((score / max(1, total_questions)) * 100, 1)
    attempt_id = f"diag_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}"
    completed_at = datetime.utcnow().isoformat()

    # Calculate and persist Verified Proficiency Level (Levels 1-5)
    onboarding_data = storage.get_learner_onboarding(student_id)
    verified_proficiency = calculate_verified_proficiency(
        accuracy_percentage=accuracy_percentage,
        score=score,
        total_questions=total_questions,
        concept_breakdown=concept_breakdown,
        question_reviews=question_reviews,
        onboarding_profile=onboarding_data
    )
    storage.update_verified_proficiency(
        student_id=student_id,
        level=verified_proficiency["level_number"],
        score=verified_proficiency["proficiency_score"]
    )

    # Refresh profile with updated proficiency
    profile = storage.get_learner_profile(student_id)

    # Generate and save personalized learning path
    learning_path = generate_personalized_learning_path(
        student_id=student_id,
        learner_profile=profile,
        verified_proficiency=verified_proficiency
    )
    storage.save_learning_path(student_id, learning_path)

    attempt_record = {
        "id": attempt_id,
        "student_id": student_id,
        "score": score,
        "total_questions": total_questions,
        "percentage": accuracy_percentage,
        "concept_results": concept_breakdown,
        "question_details": question_reviews,
        "timestamp": completed_at
    }

    # Save to SQLite diagnostic_attempts table
    storage.save_diagnostic_attempt(attempt_record)

    return {
        "status": "success",
        "diagnostic_completed": True,
        "attempt_id": attempt_id,
        "score": score,
        "total_questions": total_questions,
        "percentage": accuracy_percentage,
        "completed_at": completed_at,
        "overall_mastery": profile.get("overall_mastery", 0.0),
        "concept_breakdown": concept_breakdown,
        "question_reviews": question_reviews,
        "results": results,
        "verified_proficiency": verified_proficiency,
        "learning_path": learning_path
    }

@router.get("/attempts")
def get_diagnostic_attempts(
    student_id: Optional[str] = "student_default",
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """List historical diagnostic assessment attempts for a student."""
    effective_id = resolve_student_id(user, student_id)
    attempts = storage.get_diagnostic_attempts(effective_id)
    return {"attempts": attempts, "total": len(attempts)}

@router.get("/attempt/{attempt_id}")
def get_diagnostic_attempt(
    attempt_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve full review details for a specific diagnostic attempt without modifying learner profile."""
    attempt = storage.get_diagnostic_attempt_by_id(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Diagnostic attempt '{attempt_id}' not found")

    # Enforce data isolation if authenticated
    if user and user.get("role") not in ["teacher", "admin"]:
        if attempt.get("student_id") != user.get("student_id"):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You cannot view another student's diagnostic attempt."
            )

    return {"attempt": attempt}
