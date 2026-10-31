from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from app.dsa.question_bank import get_diagnostic_questions, get_question_by_id
from app.storage.db import storage
from app.tools.model_updater import update_learner_model
from app.tools.repetition_scheduler import schedule_spaced_repetition

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
def get_diagnostic_test():
    """Retrieve the 12 diagnostic assessment questions (1 per DSA concept)."""
    questions = get_diagnostic_questions()
    safe_list = []
    for q in questions:
        safe_list.append({
            "id": q["id"],
            "concept_id": q["concept_id"],
            "difficulty": q["difficulty"],
            "question_text": q["question_text"],
            "options": q["options"]
        })
    return {"questions": safe_list, "total": len(safe_list)}

@router.post("/submit")
def submit_diagnostic_test(payload: DiagnosticBatchSubmission):
    """Evaluate diagnostic answers, establish baseline mastery across the 12 concepts, and activate profile."""
    student_id = payload.student_id
    results = []

    for item in payload.submissions:
        q = get_question_by_id(item.question_id)
        is_correct = (item.selected_option.strip().upper() == q.get("correct_option", "A").strip().upper())

        # Calculate baseline mastery: Correct answers get 65% baseline, Incorrect get 25% baseline
        baseline_mastery = 65.0 if is_correct else 25.0
        difficulty = "intermediate" if is_correct else "novice"

        storage.update_concept_mastery(student_id, item.concept_id, {
            "mastery_percentage": baseline_mastery,
            "questions_attempted": 1,
            "correct_answers": 1 if is_correct else 0,
            "incorrect_answers": 0 if is_correct else 1,
            "current_difficulty": difficulty,
            "last_misconception": None if is_correct else q.get("option_misconceptions", {}).get(item.selected_option),
            "last_practiced_at": None,
            "consecutive_correct": 1 if is_correct else 0
        })

        # Schedule initial spaced revision
        schedule_spaced_repetition(student_id, item.concept_id, is_correct, baseline_mastery)

        results.append({
            "concept_id": item.concept_id,
            "is_correct": is_correct,
            "baseline_mastery": baseline_mastery
        })

    storage.set_diagnostic_completed(student_id)
    profile = storage.get_learner_profile(student_id)

    return {
        "status": "success",
        "diagnostic_completed": True,
        "overall_mastery": profile.get("overall_mastery", 0.0),
        "results": results
    }
