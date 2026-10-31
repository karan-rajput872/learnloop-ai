from fastapi import APIRouter
from app.storage.db import storage

router = APIRouter(prefix="/api/learner", tags=["Learner Model"])

@router.get("/profile")
def get_profile(student_id: str = "student_default"):
    profile = storage.get_learner_profile(student_id)
    if not profile:
        storage.ensure_default_learner()
        profile = storage.get_learner_profile(student_id)
    return {"profile": profile}

@router.get("/history")
def get_attempt_history(student_id: str = "student_default"):
    """Retrieve full chronological attempt history for the learner."""
    history = storage.get_attempt_history(student_id)
    return {"history": history, "total": len(history)}

@router.get("/misconceptions")
def get_misconception_history(student_id: str = "student_default"):
    """Retrieve historical occurrences of misconceptions identified for the learner."""
    all_attempts = storage.get_attempt_history(student_id)
    misconceptions = [a for a in all_attempts if a.get("detected_misconception")]
    return {"history": misconceptions, "total": len(misconceptions)}

@router.post("/reset")
def reset_profile(student_id: str = "student_default"):
    """Reset learner model for fresh demonstration testing."""
    storage.ensure_default_learner()
    with storage.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE learners SET overall_mastery = 0.0, diagnostic_completed = 0 WHERE student_id = ?", (student_id,))
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
        """, (student_id,))
        cursor.execute("DELETE FROM attempts WHERE student_id = ?", (student_id,))
        cursor.execute("DELETE FROM revision_tasks WHERE student_id = ?", (student_id,))
        cursor.execute("DELETE FROM diagnostic_attempts WHERE student_id = ?", (student_id,))
        conn.commit()

    return {"status": "success", "message": "Learner profile reset to clean baseline state."}
