from fastapi import APIRouter, HTTPException
from app.dsa.syllabus import DSA_CONCEPTS, PREREQUISITE_EDGES, get_all_concepts, get_concept
from app.storage.db import storage

router = APIRouter(prefix="/api/concepts", tags=["Concept Graph"])

@router.get("")
def list_concepts(student_id: str = "student_default"):
    """Retrieve all 12 concepts, their layout coordinates, prerequisites, and student mastery."""
    profile = storage.get_learner_profile(student_id)
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
def get_concept_details(concept_id: str, student_id: str = "student_default"):
    c = get_concept(concept_id)
    if not c:
        raise HTTPException(status_code=404, detail="Concept not found")

    profile = storage.get_learner_profile(student_id)
    mastery_info = profile.get("concepts", {}).get(concept_id, {}) if profile else {}

    return {
        "concept": c,
        "mastery": mastery_info
    }
