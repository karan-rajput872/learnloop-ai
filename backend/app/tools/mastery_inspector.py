import time
from typing import Dict, Any, List, Tuple
from app.dsa.syllabus import DSA_CONCEPTS

def inspect_concept_mastery(profile: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Tool 2: Inspect concept mastery, detect prerequisite bottlenecks, and pinpoint weakest concepts."""
    start_time = time.time()
    concepts = profile.get("concepts", {})

    weakest_concepts: List[Dict[str, Any]] = []
    ready_concepts: List[str] = []
    blocked_concepts: List[Dict[str, Any]] = []

    for cid, cdata in DSA_CONCEPTS.items():
        mastery_info = concepts.get(cid, {})
        m_pct = mastery_info.get("mastery_percentage", 0.0)

        # Check prerequisite satisfaction
        prereqs = cdata.get("prerequisites", [])
        unmet_prereqs = []
        for p in prereqs:
            p_mastery = concepts.get(p, {}).get("mastery_percentage", 0.0)
            if p_mastery < 50.0:  # 50% threshold to consider prerequisite satisfied
                unmet_prereqs.append(p)

        if unmet_prereqs:
            blocked_concepts.append({"concept_id": cid, "unmet_prerequisites": unmet_prereqs})
        else:
            ready_concepts.append(cid)

        weakest_concepts.append({
            "concept_id": cid,
            "name": cdata["name"],
            "mastery": m_pct,
            "current_difficulty": mastery_info.get("current_difficulty", "novice"),
            "last_misconception": mastery_info.get("last_misconception")
        })

    # Sort weakest first
    weakest_concepts.sort(key=lambda x: x["mastery"])

    # Select the optimal focus concept: weakest among ready concepts
    focus_concept = None
    for item in weakest_concepts:
        if item["concept_id"] in ready_concepts:
            focus_concept = item["concept_id"]
            break

    if not focus_concept and weakest_concepts:
        focus_concept = weakest_concepts[0]["concept_id"]

    analysis_result = {
        "weakest_concept": focus_concept,
        "recommended_difficulty": concepts.get(focus_concept, {}).get("current_difficulty", "novice"),
        "ready_concepts": ready_concepts,
        "blocked_concepts": blocked_concepts,
        "mastery_ranking": weakest_concepts
    }

    duration_ms = round((time.time() - start_time) * 1000, 2)
    focus_name = DSA_CONCEPTS.get(focus_concept, {}).get('name', focus_concept)
    focus_m = concepts.get(focus_concept, {}).get('mastery_percentage', 0.0)
    log = {
        "tool_name": "ConceptMasteryInspector",
        "status": "success",
        "execution_time_ms": duration_ms,
        "input_summary": f"Analyzed {len(concepts)} concept mastery nodes.",
        "output_summary": f"Target focus identified: '{focus_name}' (Mastery: {focus_m}%). {len(ready_concepts)} ready, {len(blocked_concepts)} blocked by prerequisites.",
        "decision_made": f"Prioritized '{focus_name}' (Mastery: {focus_m}%) as the primary learning bottleneck with all prerequisites satisfied.",
        "model_mutation": "None (Read-only ranking)"
    }
    return analysis_result, log
