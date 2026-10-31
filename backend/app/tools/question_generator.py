import time
import random
from typing import Dict, Any, Tuple, Optional
from app.dsa.question_bank import get_questions_for_concept, QUESTION_BANK

def generate_adaptive_question(
    concept_id: str,
    difficulty: str = "novice",
    prior_misconception: Optional[str] = None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Tool 3: Generate or retrieve an adaptive question targeting the student's weak concept and difficulty."""
    start_time = time.time()

    candidates = get_questions_for_concept(concept_id, difficulty)
    if not candidates:
        candidates = get_questions_for_concept(concept_id)

    if not candidates:
        # Fallback to any question
        candidates = QUESTION_BANK

    # Prefer questions addressing the prior misconception if available
    selected = None
    if prior_misconception:
        for q in candidates:
            if prior_misconception in q.get("option_misconceptions", {}).values():
                selected = q
                break

    if not selected:
        selected = random.choice(candidates)

    # Return question object without exposing correct_option or explanation to student ahead of submission
    safe_question = {
        "id": selected["id"],
        "concept_id": selected["concept_id"],
        "difficulty": selected["difficulty"],
        "question_text": selected["question_text"],
        "options": selected["options"],
        "is_diagnostic": selected.get("is_diagnostic", False)
    }

    duration_ms = round((time.time() - start_time) * 1000, 2)
    log = {
        "tool_name": "AdaptiveQuestionGenerator",
        "status": "success",
        "execution_time_ms": duration_ms,
        "input_summary": f"Target: concept='{concept_id}', calibrated_difficulty='{difficulty}', target_misconception='{prior_misconception or 'None'}'",
        "output_summary": f"Selected Question ID: '{selected['id']}' for {concept_id.upper()} ({selected['difficulty']}).",
        "decision_made": f"Calibrated {selected['difficulty']} question '{selected['id']}' targeting '{concept_id}'{' to resolve prior misconception: ' + prior_misconception if prior_misconception else ' to advance mastery'}.",
        "model_mutation": "None (Question selection)"
    }
    return safe_question, log
