import time
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
from app.storage.db import storage

def update_learner_model(
    student_id: str,
    concept_id: str,
    is_correct: bool,
    detected_misconception: Optional[Dict[str, Any]],
    confidence_level: str = "medium"
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Tool 5: Update concept-wise mastery, attempts, difficulty tier, and misconception logs."""
    start_time = time.time()
    profile = storage.get_learner_profile(student_id)
    concepts = profile.get("concepts", {})
    concept_data = concepts.get(concept_id, {
        "mastery_percentage": 0.0,
        "questions_attempted": 0,
        "correct_answers": 0,
        "incorrect_answers": 0,
        "current_difficulty": "novice",
        "consecutive_correct": 0
    })

    current_mastery = concept_data.get("mastery_percentage", 0.0)
    attempted = concept_data.get("questions_attempted", 0) + 1
    correct = concept_data.get("correct_answers", 0)
    incorrect = concept_data.get("incorrect_answers", 0)
    consecutive = concept_data.get("consecutive_correct", 0)
    current_difficulty = concept_data.get("current_difficulty", "novice")

    # Dynamic delta calculation
    if is_correct:
        correct += 1
        consecutive += 1
        # Base gain
        gain = 16.0 if current_difficulty == "novice" else (14.0 if current_difficulty == "intermediate" else 12.0)
        # Confidence multiplier
        if confidence_level == "high":
            gain += 4.0
        # Streak multiplier
        gain += min(6.0, consecutive * 2.0)
        new_mastery = min(100.0, round(current_mastery + gain, 1))

        # Check for difficulty progression
        if new_mastery >= 75.0 and current_difficulty == "novice":
            current_difficulty = "intermediate"
        elif new_mastery >= 90.0 and current_difficulty == "intermediate":
            current_difficulty = "advanced"

        last_misconception_id = concept_data.get("last_misconception")
        last_misconception_name = concept_data.get("last_misconception_name")
        score_delta = round(new_mastery - current_mastery, 1)
    else:
        incorrect += 1
        consecutive = 0
        # Penalty
        penalty = 12.0
        if confidence_level == "high":
            penalty += 4.0  # High confidence with wrong answer indicates deep rooted misconception

        new_mastery = max(0.0, round(current_mastery - penalty, 1))

        # Recalibrate difficulty down if struggling
        if new_mastery < 45.0 and current_difficulty == "advanced":
            current_difficulty = "intermediate"
        elif new_mastery < 30.0 and current_difficulty == "intermediate":
            current_difficulty = "novice"

        last_misconception_id = detected_misconception["id"] if detected_misconception else "unspecified_error"
        last_misconception_name = detected_misconception["name"] if detected_misconception else "Conceptual mistake"
        score_delta = round(new_mastery - current_mastery, 1)

    updated_data = {
        "mastery_percentage": new_mastery,
        "questions_attempted": attempted,
        "correct_answers": correct,
        "incorrect_answers": incorrect,
        "current_difficulty": current_difficulty,
        "last_misconception": last_misconception_id,
        "last_misconception_name": last_misconception_name,
        "last_practiced_at": datetime.utcnow().isoformat(),
        "consecutive_correct": consecutive
    }

    # Persist in storage
    storage.update_concept_mastery(student_id, concept_id, updated_data)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    delta_str = f"+{score_delta}%" if score_delta > 0 else f"{score_delta}%"
    log = {
        "tool_name": "LearnerModelUpdater",
        "status": "success",
        "execution_time_ms": duration_ms,
        "input_summary": f"student_id='{student_id}', concept='{concept_id}', is_correct={is_correct}, confidence='{confidence_level}'",
        "output_summary": f"Mastery: {current_mastery}% -> {new_mastery}% (Delta: {delta_str}). Difficulty: {current_difficulty}. Streak: {consecutive}.",
        "decision_made": f"Mutated {concept_id} mastery by {delta_str} and calibrated difficulty to '{current_difficulty}' based on {consecutive} consecutive correct answers.",
        "model_mutation": f"{concept_id}: {current_mastery}% -> {new_mastery}% ({delta_str})"
    }
    return {"new_mastery": new_mastery, "score_delta": score_delta, "difficulty": current_difficulty}, log
