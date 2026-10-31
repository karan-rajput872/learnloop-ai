from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from app.dsa.syllabus import DSA_CONCEPTS, PREREQUISITE_EDGES, get_all_concepts, get_concept
from app.storage.db import storage
from app.auth.security import get_current_user_optional, resolve_student_id

router = APIRouter(prefix="/api/concepts", tags=["Concept Graph"])

@router.get("")
def list_concepts(
    student_id: Optional[str] = "student_default",
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve all 12 concepts, their layout coordinates, prerequisites, and student mastery."""
    effective_id = resolve_student_id(user, student_id)
    profile = storage.get_learner_profile(effective_id)
    student_concepts = profile.get("concepts", {}) if profile else {}

    concept_nodes = []
    for c in get_all_concepts():
        cid = c["id"]
        mastery_info = student_concepts.get(cid, {})
        concept_nodes.append({
            **c,
            "mastery_percentage": mastery_info.get("mastery_percentage", 0.0),
            "questions_attempted": mastery_info.get("questions_attempted", 0),
            "current_difficulty": mastery_info.get("current_difficulty", "novice"),
            "last_misconception_name": mastery_info.get("last_misconception_name"),
            "next_revision_at": mastery_info.get("next_revision_at")
        })

    return {
        "concepts": concept_nodes,
        "edges": PREREQUISITE_EDGES
    }

@router.get("/{concept_id}")
def get_concept_details(
    concept_id: str,
    student_id: Optional[str] = "student_default",
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    c = get_concept(concept_id)
    if not c:
        raise HTTPException(status_code=404, detail="Concept not found")

    effective_id = resolve_student_id(user, student_id)
    profile = storage.get_learner_profile(effective_id)
    mastery_info = profile.get("concepts", {}).get(concept_id, {}) if profile else {}

    return {
        "concept": c,
        "mastery": mastery_info
    }
