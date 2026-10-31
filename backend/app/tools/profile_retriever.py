import time
from typing import Dict, Any, Tuple
from app.storage.db import storage

def retrieve_learner_profile(student_id: str = "student_default") -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Tool 1: Retrieve student profile and concept mastery state."""
    start_time = time.time()
    storage.ensure_learner(student_id)
    profile = storage.get_learner_profile(student_id)
    if not profile:
        profile = {
            "student_id": student_id,
            "name": f"Student {student_id}",
            "overall_mastery": 0.0,
            "diagnostic_completed": False,
            "concepts": {}
        }

    category = profile.get("learner_category") or "General"
    level = profile.get("verified_proficiency_level", 1)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    log = {
        "tool_name": "LearnerProfileRetriever",
        "status": "success",
        "execution_time_ms": duration_ms,
        "input_summary": f"student_id='{student_id}'",
        "output_summary": f"Retrieved profile for {profile.get('name')} [{category}, Level {level}]: Overall mastery {profile.get('overall_mastery')}%, {len(profile.get('concepts', {}))} tracked concepts.",
        "decision_made": f"Loaded profile for {profile.get('name')} (Category: {category}, Level: {level}, Diagnostic: {profile.get('diagnostic_completed')}) to evaluate prerequisite state.",
        "model_mutation": "None (Read-only query)"
    }
    return profile, log
