from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any
from app.storage.db import storage
from app.auth.security import get_current_user_optional, resolve_student_id

router = APIRouter(prefix="/api/learner", tags=["Learner Model"])

@router.get("/profile")
def get_profile(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    effective_id = resolve_student_id(user, student_id)
    profile = storage.get_learner_profile(effective_id)
    if not profile:
        storage.ensure_learner(effective_id, user.get("full_name") if user else None)
        profile = storage.get_learner_profile(effective_id)
    return {"profile": profile}

@router.get("/history")
def get_attempt_history(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve full chronological attempt history for the learner."""
    effective_id = resolve_student_id(user, student_id)
    history = storage.get_attempt_history(effective_id)
    return {"history": history, "total": len(history)}

@router.get("/misconceptions")
def get_misconception_history(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve historical occurrences of misconceptions identified for the learner."""
    effective_id = resolve_student_id(user, student_id)
    all_attempts = storage.get_attempt_history(effective_id)
    misconceptions = [a for a in all_attempts if a.get("detected_misconception")]
    return {"history": misconceptions, "total": len(misconceptions)}

@router.post("/reset")
def reset_profile(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Reset learner model for fresh demonstration testing."""
    effective_id = resolve_student_id(user, student_id)
    storage.ensure_learner(effective_id, user.get("full_name") if user else None)
    with storage.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE learners SET overall_mastery = 0.0, diagnostic_completed = 0 WHERE student_id = ?", (effective_id,))
        cursor.execute("""
            UPDATE concept_mastery
            SET mastery_percentage = 0.0,
                questions_attempted = 0,
                correct_answers = 0,
                incorrect_answers = 0,
                current_difficulty = 'novice',
                last_misconception = NULL,
                last_misconception_name = NULL,
                last_practiced_at = NULL,
                next_revision_at = NULL,
                consecutive_correct = 0
            WHERE student_id = ?
        """, (effective_id,))
        cursor.execute("DELETE FROM attempts WHERE student_id = ?", (effective_id,))
        cursor.execute("DELETE FROM revision_tasks WHERE student_id = ?", (effective_id,))
        cursor.execute("DELETE FROM diagnostic_attempts WHERE student_id = ?", (effective_id,))
        conn.commit()

    return {"status": "success", "message": "Learner profile reset to clean baseline state."}
