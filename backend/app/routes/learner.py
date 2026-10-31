from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from app.storage.db import storage
from app.auth.security import get_current_user_optional, resolve_student_id
from app.dsa.personalization import generate_personalized_learning_path, calculate_verified_proficiency

router = APIRouter(prefix="/api/learner", tags=["Learner Model"])

class OnboardingPayload(BaseModel):
    learner_category: str = Field(..., description="Learner category, e.g. College/University Student, Working Professional")
    category_details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Category-specific metadata")
    programming_experience: str = Field("Intermediate", description="Programming experience level")
    dsa_experience: str = Field("Basic", description="DSA experience level")
    programming_languages: List[str] = Field(default_factory=lambda: ["Python"], description="Languages known")
    preferred_language: str = Field("Python", description="Preferred coding language")
    previously_studied_concepts: List[str] = Field(default_factory=list, description="Concepts already studied")
    primary_goals: List[str] = Field(default_factory=list, description="Primary learning goals")
    target_timeline: str = Field("2-3 months", description="Timeline goal")
    daily_availability: str = Field("30-60 mins/day", description="Daily practice time available")
    self_assessed_skill_level: str = Field("Intermediate", description="Self-assessed level (Beginner/Elementary/Intermediate/Advanced)")
    learning_preferences: List[str] = Field(default_factory=list, description="Learning preferences (step_by_step, visual, code, etc.)")
    diagnostic_mode: str = Field("comprehensive", description="quick (6 Qs) or comprehensive (12 Qs)")

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

@router.get("/onboarding")
def get_onboarding(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve learner onboarding data and status."""
    effective_id = resolve_student_id(user, student_id)
    onboarding_data = storage.get_learner_onboarding(effective_id)
    profile = storage.get_learner_profile(effective_id)
    is_completed = bool(profile.get("onboarding_completed")) if profile else False
    return {
        "student_id": effective_id,
        "onboarding_completed": is_completed,
        "onboarding_data": onboarding_data or {}
    }

@router.post("/onboarding")
def save_onboarding(
    payload: OnboardingPayload,
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Save complete learner onboarding questionnaire, update learner category,
    and generate initial personalized learning path.
    """
    effective_id = resolve_student_id(user, student_id)
    storage.ensure_learner(effective_id, user.get("full_name") if user else None)

    onboarding_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    storage.save_learner_onboarding(effective_id, onboarding_dict)

    # Generate updated personalized learning path
    profile = storage.get_learner_profile(effective_id)
    learning_path = generate_personalized_learning_path(effective_id, profile)
    storage.save_learning_path(effective_id, learning_path)

    # Refresh profile to return latest state
    updated_profile = storage.get_learner_profile(effective_id)

    return {
        "status": "success",
        "message": "Learner onboarding successfully saved and learning path generated.",
        "onboarding_completed": True,
        "profile": updated_profile,
        "learning_path": learning_path
    }

@router.get("/learning-path")
def get_learning_path(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve or generate the learner's personalized learning path."""
    effective_id = resolve_student_id(user, student_id)
    storage.ensure_learner(effective_id, user.get("full_name") if user else None)

    learning_path = storage.get_learning_path(effective_id)
    if not learning_path:
        profile = storage.get_learner_profile(effective_id)
        learning_path = generate_personalized_learning_path(effective_id, profile)
        storage.save_learning_path(effective_id, learning_path)

    return {"learning_path": learning_path}

@router.get("/proficiency")
def get_proficiency(
    student_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve verified proficiency level details."""
    effective_id = resolve_student_id(user, student_id)
    profile = storage.get_learner_profile(effective_id)
    raw_lvl = profile.get("verified_proficiency_level", 1) if profile else 1
    if isinstance(raw_lvl, int):
        level_num = raw_lvl
    elif isinstance(raw_lvl, str) and raw_lvl.isdigit():
        level_num = int(raw_lvl)
    elif isinstance(raw_lvl, str) and "Level " in raw_lvl:
        try:
            level_num = int(raw_lvl.split("Level ")[1][0])
        except Exception:
            level_num = 1
    else:
        level_num = 1

    score = float(profile.get("verified_proficiency_score") or 0.0) if profile else 0.0

    levels_map = {
        1: {"title": "Level 1 — Beginner", "description": "Building intuition for core linear structures and computational fundamentals."},
        2: {"title": "Level 2 — Elementary", "description": "Understanding basic algorithms with growing complexity awareness."},
        3: {"title": "Level 3 — Intermediate", "description": "Competent across linear structures, sorting, trees, and standard time/space invariants."},
        4: {"title": "Level 4 — Advanced", "description": "Proficient across non-linear structures, recursion, dynamic thinking, and asymptotic tradeoffs."},
        5: {"title": "Level 5 — Proficient", "description": "Mastery of DSA concepts, graph traversals, and deep structural memory mechanics."}
    }
    level_info = levels_map.get(level_num, levels_map[1])

    return {
        "student_id": effective_id,
        "verified_proficiency_level": level_num,
        "verified_proficiency_score": score,
        "level_title": level_info["title"],
        "level_description": level_info["description"],
        "diagnostic_completed": profile.get("diagnostic_completed", False) if profile else False,
        "overall_mastery": profile.get("overall_mastery", 0.0) if profile else 0.0
    }

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
        cursor.execute("""
            UPDATE learners
            SET overall_mastery = 0.0,
                diagnostic_completed = 0,
                onboarding_completed = 0,
                verified_proficiency_level = 1,
                verified_proficiency_score = 0.0,
                learning_path_json = NULL
            WHERE student_id = ?
        """, (effective_id,))
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
