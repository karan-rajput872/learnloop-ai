"""
LearnLoop AI — Personalized Learner Onboarding, Profiling & Adaptive Skill-Level Engine.
Connects learner background, career/academic goals, and self-assessment to the
diagnostic assessment, concept prerequisite DAG, and 7 bounded agent tools.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.dsa.syllabus import DSA_CONCEPTS
from app.dsa.question_bank import QUESTION_BANK, get_diagnostic_questions, get_questions_for_concept

# --------------------------------------------------------------------------
# 1. VERIFIED PROFICIENCY LEVEL CLASSIFICATION
# --------------------------------------------------------------------------
PROFICIENCY_LEVELS = {
    "level_1": {
        "level_number": 1,
        "level": "Level 1 — Beginner",
        "level_title": "Level 1 — Beginner",
        "title": "Beginner",
        "description": "Requires foundational concept learning, syntax familiarity, and guided practice.",
        "recommended_difficulty": "novice",
        "min_score": 0.0,
        "max_score": 30.0
    },
    "level_2": {
        "level_number": 2,
        "level": "Level 2 — Elementary",
        "level_title": "Level 2 — Elementary",
        "title": "Elementary",
        "description": "Understands fundamental data structures but requires independent problem-solving practice.",
        "recommended_difficulty": "novice",
        "min_score": 30.1,
        "max_score": 55.0
    },
    "level_3": {
        "level_number": 3,
        "level": "Level 3 — Intermediate",
        "level_title": "Level 3 — Intermediate",
        "title": "Intermediate",
        "description": "Demonstrates reliable understanding of core linear and hierarchical concepts and can solve standard problems.",
        "recommended_difficulty": "intermediate",
        "min_score": 55.1,
        "max_score": 74.0
    },
    "level_4": {
        "level_number": 4,
        "level": "Level 4 — Advanced",
        "level_title": "Level 4 — Advanced",
        "title": "Advanced",
        "description": "Demonstrates strong conceptual mastery and handles complex algorithmic reasoning tasks.",
        "recommended_difficulty": "advanced",
        "min_score": 74.1,
        "max_score": 89.0
    },
    "level_5": {
        "level_number": 5,
        "level": "Level 5 — Proficient",
        "level_title": "Level 5 — Proficient",
        "title": "Proficient",
        "description": "Consistently strong performance with sound algorithmic reasoning and zero critical misconceptions.",
        "recommended_difficulty": "advanced",
        "min_score": 89.1,
        "max_score": 100.0
    }
}

def calculate_verified_proficiency(
    score: int = 0,
    total_questions: int = 1,
    self_reported_level: Optional[str] = None,
    detected_misconceptions: Optional[List[Dict[str, Any]]] = None,
    difficulty_mix: Optional[Dict[str, int]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Transparently calculate provisional verified proficiency based on:
    - Diagnostic accuracy (base score)
    - Question difficulty weighting
    - Identified misconception severity
    - Self-assessed baseline calibration
    """
    if total_questions <= 0:
        return PROFICIENCY_LEVELS["level_1"]

    raw_accuracy = (score / total_questions) * 100.0

    # Weight difficulty tiers if provided
    difficulty_bonus = 0.0
    if difficulty_mix:
        adv_count = difficulty_mix.get("advanced", 0)
        inter_count = difficulty_mix.get("intermediate", 0)
        difficulty_bonus = (adv_count * 3.0) + (inter_count * 1.5)

    # Misconception penalty (structural misconceptions reduce calibrated score)
    misconception_penalty = 0.0
    if detected_misconceptions:
        # Cap penalty at 15 points
        misconception_penalty = min(15.0, len(detected_misconceptions) * 4.0)

    calibrated_score = max(0.0, min(100.0, raw_accuracy + difficulty_bonus - misconception_penalty))

    # Self-reported level anchor (gives max 5% adjustment toward self-reported if close)
    if self_reported_level:
        s_norm = self_reported_level.strip().lower()
        if "advanced" in s_norm and calibrated_score >= 70.0:
            calibrated_score = min(100.0, calibrated_score + 4.0)
        elif "beginner" in s_norm and calibrated_score < 40.0:
            calibrated_score = max(0.0, calibrated_score - 2.0)

    calibrated_score = round(calibrated_score, 1)

    if calibrated_score <= 30.0:
        result = dict(PROFICIENCY_LEVELS["level_1"])
    elif calibrated_score <= 55.0:
        result = dict(PROFICIENCY_LEVELS["level_2"])
    elif calibrated_score <= 74.0:
        result = dict(PROFICIENCY_LEVELS["level_3"])
    elif calibrated_score <= 89.0:
        result = dict(PROFICIENCY_LEVELS["level_4"])
    else:
        result = dict(PROFICIENCY_LEVELS["level_5"])

    result["score"] = calibrated_score
    result["proficiency_score"] = calibrated_score
    result["raw_accuracy"] = round(raw_accuracy, 1)
    result["questions_correct"] = score
    result["total_questions"] = total_questions
    result["assessed_at"] = datetime.now(timezone.utc).isoformat()
    return result


# --------------------------------------------------------------------------
# 2. PERSONALIZED LEARNING PATH GENERATOR
# --------------------------------------------------------------------------
def generate_personalized_learning_path(
    student_id: str,
    profile: Optional[Dict[str, Any]] = None,
    onboarding_data: Optional[Dict[str, Any]] = None,
    learner_profile: Optional[Dict[str, Any]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Generate dynamic personalized learning path using:
    - Learner Category (Student, Working Pro, Job Seeker, Independent)
    - Primary Objectives & Target Timeline
    - Daily Availability (minutes per day)
    - Concept Mastery state & Prerequisite DAG
    """
    prof = profile or learner_profile or {}
    onboarding = onboarding_data or prof.get("onboarding_data", {})
    learner_category = onboarding.get("learner_category") or prof.get("learner_category") or "General Learner"
    primary_goals = onboarding.get("primary_goals") or ["DSA fundamentals"]
    target_timeline = onboarding.get("target_timeline") or "Within 3 months"
    daily_availability = onboarding.get("daily_learning_availability") or "30–60 minutes"
    verified_level = prof.get("verified_proficiency_level") or "Level 1 — Beginner"

    concepts_map = prof.get("concepts", {})
    strong_concepts = []
    learning_concepts = []
    weak_concepts = []

    for cid, cdata in concepts_map.items():
        m = cdata.get("mastery_percentage", 0.0)
        c_info = DSA_CONCEPTS.get(cid, {})
        entry = {
            "concept_id": cid,
            "concept_name": c_info.get("name", cid.replace("_", " ").title()),
            "category": c_info.get("category", "General"),
            "mastery_percentage": m,
            "current_difficulty": cdata.get("current_difficulty", "novice"),
            "last_misconception": cdata.get("last_misconception_name")
        }
        if m >= 75.0:
            strong_concepts.append(entry)
        elif m >= 40.0:
            learning_concepts.append(entry)
        else:
            weak_concepts.append(entry)

    # Missing prerequisites check via DAG
    missing_prerequisites = []
    for cid, cinfo in DSA_CONCEPTS.items():
        prereqs = cinfo.get("prerequisites", [])
        c_mastery = concepts_map.get(cid, {}).get("mastery_percentage", 0.0)
        # If learner is trying to learn this concept but prereqs are weak
        if c_mastery > 0.0 or any(p in [w["concept_id"] for w in weak_concepts] for p in prereqs):
            for pid in prereqs:
                p_mastery = concepts_map.get(pid, {}).get("mastery_percentage", 0.0)
                if p_mastery < 60.0:
                    p_info = DSA_CONCEPTS.get(pid, {})
                    missing_prerequisites.append({
                        "prerequisite_id": pid,
                        "prerequisite_name": p_info.get("name", pid.title()),
                        "blocks_concept_id": cid,
                        "blocks_concept_name": cinfo.get("name", cid.title()),
                        "current_mastery": p_mastery,
                        "required_mastery": 60.0
                    })

    # Deduplicate prerequisites
    seen_prereqs = set()
    dedup_missing_prereqs = []
    for mp in missing_prerequisites:
        if mp["prerequisite_id"] not in seen_prereqs:
            seen_prereqs.add(mp["prerequisite_id"])
            dedup_missing_prereqs.append(mp)

    # Topological Recommendation: Recommend weak foundational concepts first
    ordered_ids = [
        "arrays", "time_complexity", "space_complexity", "linked_lists",
        "recursion", "stacks", "queues", "searching", "sorting",
        "trees", "binary_trees", "graphs"
    ]
    recommended_next = []
    for cid in ordered_ids:
        c_mastery = concepts_map.get(cid, {}).get("mastery_percentage", 0.0)
        if c_mastery < 75.0 and len(recommended_next) < 3:
            c_info = DSA_CONCEPTS.get(cid, {})
            recommended_next.append({
                "concept_id": cid,
                "concept_name": c_info.get("name", cid.title()),
                "category": c_info.get("category", "General"),
                "current_mastery": c_mastery,
                "reason": (
                    f"Core prerequisite for advanced topics; reinforce to at least 75%."
                    if c_mastery < 40.0 else
                    f"Intermediate comprehension; practice adaptive challenges to achieve mastery."
                )
            })

    # Daily target calibration based on availability
    daily_quota = {
        "15–30 minutes": {"questions_per_day": 2, "estimated_study_hours_week": 2.5, "pace": "Focused & Sustainable"},
        "30–60 minutes": {"questions_per_day": 3, "estimated_study_hours_week": 5.0, "pace": "Optimal Daily Rhythm"},
        "1–2 hours": {"questions_per_day": 5, "estimated_study_hours_week": 9.0, "pace": "Accelerated Mastery"},
        "2–3 hours": {"questions_per_day": 8, "estimated_study_hours_week": 14.0, "pace": "Intensive Boot Camp"},
        "More than 3 hours": {"questions_per_day": 10, "estimated_study_hours_week": 20.0, "pace": "Full Immersion"}
    }.get(daily_availability, {"questions_per_day": 3, "estimated_study_hours_week": 5.0, "pace": "Optimal Daily Rhythm"})

    # Timeline calculation
    now = datetime.now(timezone.utc)
    target_date_str = onboarding.get("target_date")
    if not target_date_str:
        days_map = {
            "Within 1 week": 7,
            "Within 1 month": 30,
            "Within 3 months": 90,
            "Within 6 months": 180,
            "No fixed deadline": 120
        }
        days_ahead = days_map.get(target_timeline, 60)
        target_date_str = (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # Tailored focus strategy per learner category
    if "Job Seeker" in learner_category or any("interview" in g.lower() for g in primary_goals):
        focus_strategy = "Interview-Optimized: Emphasis on time complexity constraints, edge-case analysis, and in-place transformations."
    elif "Student" in learner_category or any("exam" in g.lower() for g in primary_goals):
        focus_strategy = "Curriculum-Aligned: Systematic mastery of formal invariants, tree traversals, and recurrences."
    elif "Professional" in learner_category:
        focus_strategy = "Production-Focused: Architectural tradeoffs, memory overheads, and scalable data structure selection."
    else:
        focus_strategy = "Foundational Growth: Conceptual clarity with step-by-step Socratic reinforcement."

    return {
        "student_id": student_id,
        "learner_category": learner_category,
        "primary_goals": primary_goals,
        "verified_proficiency_level": verified_level,
        "focus_strategy": focus_strategy,
        "strong_concepts": strong_concepts,
        "learning_concepts": learning_concepts,
        "weak_concepts": weak_concepts,
        "missing_prerequisites": dedup_missing_prereqs,
        "recommended_next_concepts": recommended_next,
        "suggested_question_difficulty": "intermediate" if "Intermediate" in verified_level or "Advanced" in verified_level else "novice",
        "daily_practice_target": daily_quota,
        "daily_question_target": daily_quota["questions_per_day"],
        "target_timeline": target_timeline,
        "target_completion_date": target_date_str,
        "learning_preferences": onboarding.get("learning_preferences") or ["Step-by-step explanations", "Code demonstrations"],
        "generated_at": now.isoformat()
    }


# --------------------------------------------------------------------------
# 3. PERSONALIZED DIAGNOSTIC QUESTION SELECTOR
# --------------------------------------------------------------------------
def select_personalized_diagnostic_questions(
    mode: str = "comprehensive",
    onboarding_data: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Selects diagnostic questions tailored to the learner's chosen mode and background:
    - Quick Mode: 6 high-signal foundational & structural concepts
    - Comprehensive Mode: 12 concepts covering complete syllabus
    - Calibrated difficulty starting tier
    """
    all_diag = get_diagnostic_questions()
    by_concept = {q["concept_id"]: q for q in all_diag}

    # If learner reported advanced DSA experience, substitute novice questions with intermediate where available
    experience = (onboarding_data or {}).get("dsa_experience", "")
    is_experienced = any(term in experience.lower() for term in ["intermediate", "advanced", "comfortable"])

    def get_calibrated_question(concept_id: str) -> Dict[str, Any]:
        if is_experienced:
            inter_qs = get_questions_for_concept(concept_id, "intermediate")
            if inter_qs:
                return inter_qs[0]
        return by_concept.get(concept_id) or QUESTION_BANK[0]

    if mode == "quick":
        # 6 core foundational concepts for fast skill estimation
        quick_concepts = ["arrays", "time_complexity", "linked_lists", "stacks", "recursion", "binary_trees"]
        selected = [get_calibrated_question(cid) for cid in quick_concepts if get_calibrated_question(cid)]
    else:
        # Comprehensive 12-concept coverage
        ordered_ids = [
            "arrays", "time_complexity", "space_complexity", "linked_lists",
            "recursion", "stacks", "queues", "searching", "sorting",
            "trees", "binary_trees", "graphs"
        ]
        selected = [get_calibrated_question(cid) for cid in ordered_ids if get_calibrated_question(cid)]

    safe_list = []
    for q in selected:
        safe_list.append({
            "id": q["id"],
            "concept_id": q["concept_id"],
            "difficulty": q["difficulty"],
            "question_text": q["question_text"],
            "options": q["options"],
            "is_diagnostic": True
        })
    return safe_list
