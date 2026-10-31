import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
from app.dsa.syllabus import DSA_CONCEPTS
from app.storage.db import storage

def schedule_spaced_repetition(
    student_id: str,
    concept_id: str,
    is_correct: bool,
    mastery: float,
    confidence: str = "medium",
    detected_misconception: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Tool 6: Schedule spaced-repetition intervals based on correctness, confidence, and current mastery."""
    start_time = time.time()
    now = datetime.utcnow()

    concept_name = DSA_CONCEPTS.get(concept_id, {}).get("name", concept_id.title())

    if not is_correct:
        # Immediate / 1-day reinforcement
        interval_days = 1
        urgency = "high"
        m_name = detected_misconception.get("name") if detected_misconception else "conceptual error"
        reason = f"Urgent Remedial Review: Overcome detected misconception: '{m_name}' in {concept_name}."
    elif confidence == "low" or mastery < 50.0:
        interval_days = 2
        urgency = "high"
        reason = f"Low-confidence reinforcement check for {concept_name}."
    elif mastery < 75.0:
        interval_days = 4
        urgency = "medium"
        reason = f"Spaced retention check for intermediate mastery in {concept_name}."
    else:
        # High mastery
        interval_days = 7 if confidence == "medium" else 14
        urgency = "low"
        reason = f"Long-term retention maintenance for mastered concept: {concept_name}."

    due_date = (now + timedelta(days=interval_days)).strftime("%Y-%m-%d")

    task = {
        "id": f"rev_{uuid.uuid4().hex[:8]}",
        "student_id": student_id,
        "concept_id": concept_id,
        "concept_name": concept_name,
        "due_date": due_date,
        "status": "pending",
        "reason": reason,
        "urgency": urgency
    }

    storage.schedule_revision(task)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    log = {
        "tool_name": "SpacedRepetitionScheduler",
        "status": "success",
        "execution_time_ms": duration_ms,
        "input_summary": f"concept='{concept_id}', is_correct={is_correct}, mastery={mastery}%, confidence='{confidence}'",
        "output_summary": f"Scheduled review for '{concept_name}' in {interval_days} day(s) on {due_date} (Urgency: {urgency.upper()}).",
        "decision_made": f"Scheduled spaced revision for '{concept_name}' on {due_date} (interval: {interval_days}d, urgency: {urgency.upper()}) based on SM-2 calibration.",
        "model_mutation": f"Revision task registered: due {due_date}"
    }
    return {"due_date": due_date, "interval_days": interval_days, "urgency": urgency}, log
