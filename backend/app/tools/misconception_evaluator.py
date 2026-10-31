import time
from typing import Dict, Any, Tuple, Optional
from app.dsa.question_bank import get_question_by_id
from app.dsa.misconceptions import MISCONCEPTION_CATALOG

def evaluate_reasoning_and_detect_misconception(
    question_id: str,
    concept_id: str,
    selected_option: str,
    student_reasoning: str
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Tool 4: Advanced Misconception & Reasoning Evaluator.
    Distinguishes:
      - Correct answer with sound reasoning
      - Correct answer with flawed reasoning
      - Incorrect answer with partial valid reasoning
      - Incorrect answer with clear conceptual misconception
    Provides analogies, flawed assumption breakdowns, and targeted corrections.
    """
    start_time = time.time()
    question = get_question_by_id(question_id)

    correct_option = question.get("correct_option", "A")
    is_correct = (selected_option.strip().upper() == correct_option.strip().upper())

    detected_misconception = None
    reasoning_lower = student_reasoning.lower().strip()

    # 1. Option-level misconception from question bank
    option_misconceptions = question.get("option_misconceptions", {})
    mapped_id = option_misconceptions.get(selected_option.strip().upper())

    # 2. Text keyword scan across concept misconceptions
    text_matched_id = None
    for m_id, m_data in MISCONCEPTION_CATALOG.items():
        if m_data.get("concept_id") == concept_id:
            for kw in m_data.get("trigger_keywords", []):
                if kw.lower() in reasoning_lower:
                    text_matched_id = m_id
                    break
        if text_matched_id:
            break

    # Determine classification
    classification = "correct_sound"
    clarifying_question = None

    if is_correct:
        if text_matched_id and text_matched_id != mapped_id:
            # Correct answer chosen, but student wrote contradictory reasoning
            classification = "correct_flawed_reasoning"
            m_info = MISCONCEPTION_CATALOG[text_matched_id]
            detected_misconception = {
                "id": m_info["id"],
                "name": m_info["name"],
                "concept_id": m_info["concept_id"],
                "description": m_info["description"],
                "remediation_tip": m_info["remediation_tip"],
                "prerequisite_to_review": m_info.get("prerequisite_to_review"),
                "flawed_assumption": f"Potential lucky guess or contradictory rationale involving: {m_info['name']}.",
                "analogy": "Getting the right destination while taking a dangerous detour.",
                "targeted_correction": "Your final choice was correct, but verify that your thought process directly relies on the core invariant."
            }
        else:
            classification = "correct_sound"
    else:
        # Incorrect option
        final_misconception_id = text_matched_id or mapped_id
        if not final_misconception_id:
            for m_id, m_data in MISCONCEPTION_CATALOG.items():
                if m_data.get("concept_id") == concept_id:
                    final_misconception_id = m_id
                    break

        # Check for partial correct reasoning
        has_partial = any(w in reasoning_lower for w in ["because", "since", "pointer", "index", "memory", "order", "node"])
        if has_partial and not text_matched_id:
            classification = "incorrect_partial_reasoning"
        else:
            classification = "incorrect_misconception"

        if final_misconception_id and final_misconception_id in MISCONCEPTION_CATALOG:
            m_info = MISCONCEPTION_CATALOG[final_misconception_id]

            # Dynamic analogies and flawed assumptions
            analogy = "Consider physical objects: taking a plate off the top of a stack vs standing in a line at a ticket counter."
            if "bst" in final_misconception_id:
                analogy = "A tree is like a nested family boundary: you cannot be older than your parents or younger than your grandparents regardless of which branch you sit on."
            elif "recursion" in final_misconception_id:
                analogy = "A staircase with no ground floor: walking down forever until you run out of energy (stack overflow)."
            elif "linked_list" in final_misconception_id:
                analogy = "Letting go of a rope before grabbing the next rung: the rest of the chain drops to the floor."

            detected_misconception = {
                "id": m_info["id"],
                "name": m_info["name"],
                "concept_id": m_info["concept_id"],
                "description": m_info["description"],
                "remediation_tip": m_info["remediation_tip"],
                "prerequisite_to_review": m_info.get("prerequisite_to_review"),
                "flawed_assumption": f"Assuming {m_info['description'].lower()}",
                "analogy": analogy,
                "targeted_correction": m_info["remediation_tip"]
            }

        if len(student_reasoning.strip()) < 15:
            clarifying_question = f"Could you elaborate on why you felt option ({selected_option}) was the most appropriate choice?"

    # Build rich pedagogical feedback
    if classification == "correct_sound":
        feedback = f"Excellent reasoning! Your explanation demonstrates sound understanding of {concept_id.replace('_', ' ').title()}. {question.get('explanation', '')}"
    elif classification == "correct_flawed_reasoning":
        feedback = f"Correct choice ({correct_option}), but your reasoning suggested a potential misconception: **{detected_misconception['name']}**. Remember: {detected_misconception['remediation_tip']}"
    elif classification == "incorrect_partial_reasoning":
        feedback = f"You had the right intuition regarding the mechanics, but selected ({selected_option}). **Key Insight**: {detected_misconception['remediation_tip'] if detected_misconception else question.get('explanation', '')}"
    else:
        m_name = detected_misconception['name'] if detected_misconception else 'Conceptual Flaw'
        m_tip = detected_misconception['remediation_tip'] if detected_misconception else question.get('explanation', '')
        feedback = f"Incorrect choice ({selected_option}). Identified misconception: **{m_name}**.\n\n🎯 **Correction**: {m_tip}\n\n💡 **Analogy**: {detected_misconception.get('analogy', '')}"

    result = {
        "is_correct": is_correct,
        "correct_option": correct_option,
        "classification": classification,
        "explanation": question.get("explanation", ""),
        "detected_misconception": detected_misconception,
        "clarifying_question": clarifying_question,
        "agent_feedback": feedback
    }

    duration_ms = round((time.time() - start_time) * 1000, 2)
    log = {
        "tool_name": "ReasoningMisconceptionEvaluator",
        "status": "success",
        "execution_time_ms": duration_ms,
        "input_summary": f"Question: '{question_id}', Option: '{selected_option}', Classification: '{classification}'",
        "output_summary": f"Evaluation: {'CORRECT (+)' if is_correct else 'INCORRECT (-)'}. Misconception: {detected_misconception['name'] if detected_misconception else 'None identified'}."
    }
    return result, log
