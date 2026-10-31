import time
from typing import Dict, Any, List
from app.tools.profile_retriever import retrieve_learner_profile
from app.tools.mastery_inspector import inspect_concept_mastery
from app.tools.question_generator import generate_adaptive_question
from app.tools.misconception_evaluator import evaluate_reasoning_and_detect_misconception
from app.tools.model_updater import update_learner_model
from app.tools.repetition_scheduler import schedule_spaced_repetition
from app.tools.update_verifier import verify_learner_model_update
from app.agent.speech_parser import parse_wispr_flow_speech
from app.agent.gemini_service import gemini_tutor
from app.storage.db import storage

class TutorAgentOrchestrator:
    """
    Master Bounded Tool-Using Agent for LearnLoop AI.
    Executes actual tools, tracks real execution telemetry, and verifies state mutations.
    """

    async def evaluate_submission(
        self,
        student_id: str,
        question_id: str,
        concept_id: str,
        selected_option: str,
        student_reasoning: str,
        confidence_level: str = "medium"
    ) -> Dict[str, Any]:
        tools_executed: List[Dict[str, Any]] = []

        # Step 1: Retrieve learner profile (Tool 1)
        profile, log_1 = retrieve_learner_profile(student_id)
        tools_executed.append(log_1)

        # Step 2: Evaluate student reasoning and detect misconceptions (Tool 4)
        eval_result, log_4 = evaluate_reasoning_and_detect_misconception(
            question_id=question_id,
            concept_id=concept_id,
            selected_option=selected_option,
            student_reasoning=student_reasoning
        )
        tools_executed.append(log_4)

        # Step 3: Update learner model concept-wise mastery (Tool 5)
        model_result, log_5 = update_learner_model(
            student_id=student_id,
            concept_id=concept_id,
            is_correct=eval_result["is_correct"],
            detected_misconception=eval_result["detected_misconception"],
            confidence_level=confidence_level
        )
        tools_executed.append(log_5)

        # Record attempt history in DB
        storage.record_attempt({
            "student_id": student_id,
            "question_id": question_id,
            "concept_id": concept_id,
            "selected_option": selected_option,
            "is_correct": eval_result["is_correct"],
            "student_reasoning": student_reasoning,
            "detected_misconception": eval_result["detected_misconception"]["id"] if eval_result["detected_misconception"] else None,
            "score_delta": model_result["score_delta"]
        })

        # Step 4: Schedule spaced repetition revision task (Tool 6)
        sched_result, log_6 = schedule_spaced_repetition(
            student_id=student_id,
            concept_id=concept_id,
            is_correct=eval_result["is_correct"],
            mastery=model_result["new_mastery"],
            confidence=confidence_level,
            detected_misconception=eval_result["detected_misconception"]
        )
        tools_executed.append(log_6)

        # Step 5: Read-after-write verification of learner model (Tool 7)
        verified, log_7 = verify_learner_model_update(
            student_id=student_id,
            concept_id=concept_id,
            expected_mastery=model_result["new_mastery"]
        )
        tools_executed.append(log_7)

        # Step 6: Re-inspect concept graph to select next learning target (Tool 2)
        refreshed_profile = storage.get_learner_profile(student_id)
        inspection, log_2 = inspect_concept_mastery(refreshed_profile)
        tools_executed.append(log_2)

        # Build understandable pedagogical decision rationale
        c_title = concept_id.replace('_', ' ').title()
        if eval_result["is_correct"]:
            decision_rationale = f"Your answer demonstrated sound reasoning on {c_title}. The agent increased mastery to {model_result['new_mastery']}% and recommended '{inspection['weakest_concept']}' based on prerequisite priority."
        else:
            m_name = eval_result["detected_misconception"]["name"] if eval_result["detected_misconception"] else "conceptual flaw"
            decision_rationale = f"Your mastery of {c_title} was lowered to {model_result['new_mastery']}% due to '{m_name}'. The agent scheduled an urgent 24h review and retained {model_result['difficulty']} difficulty to reinforce fundamentals before advancing."

        return {
            "is_correct": eval_result["is_correct"],
            "score_delta": model_result["score_delta"],
            "new_mastery": model_result["new_mastery"],
            "correct_option": eval_result["correct_option"],
            "classification": eval_result.get("classification", "correct_sound"),
            "explanation": eval_result["explanation"],
            "detected_misconception": eval_result["detected_misconception"],
            "clarifying_question": eval_result.get("clarifying_question"),
            "agent_feedback": eval_result["agent_feedback"],
            "decision_rationale": decision_rationale,
            "next_recommended_concept": inspection["weakest_concept"],
            "next_revision_date": sched_result["due_date"],
            "tools_executed": tools_executed
        }

    async def get_adaptive_question(
        self,
        student_id: str,
        concept_id: str = None
    ) -> Dict[str, Any]:
        tools_executed: List[Dict[str, Any]] = []

        # Step 1: Retrieve profile (Tool 1)
        profile, log_1 = retrieve_learner_profile(student_id)
        tools_executed.append(log_1)

        # Step 2: Inspect mastery & determine target concept (Tool 2)
        inspection, log_2 = inspect_concept_mastery(profile)
        tools_executed.append(log_2)

        target_concept = concept_id if concept_id else inspection["weakest_concept"]
        c_info = profile.get("concepts", {}).get(target_concept, {})
        difficulty = c_info.get("current_difficulty", "novice")
        prior_misconception = c_info.get("last_misconception")

        # Step 3: Calibrated question generation (Tool 3)
        question, log_3 = generate_adaptive_question(
            concept_id=target_concept,
            difficulty=difficulty,
            prior_misconception=prior_misconception
        )
        tools_executed.append(log_3)

        decision_rationale = (
            f"Target concept '{target_concept}' was selected (current mastery: {c_info.get('mastery_percentage', 0.0)}%, "
            f"tier: {difficulty}) with active focus on: {prior_misconception or 'baseline calibration'}."
        )

        return {
            "question": question,
            "target_concept": target_concept,
            "calibrated_difficulty": difficulty,
            "decision_rationale": decision_rationale,
            "tools_executed": tools_executed
        }

    async def handle_speech_chat(
        self,
        student_id: str,
        raw_transcript: str
    ) -> Dict[str, Any]:
        tools_executed: List[Dict[str, Any]] = []

        # Step 1: Parse natural speech dictation (Wispr Flow disfluency cleaning)
        speech_data = parse_wispr_flow_speech(raw_transcript)

        # Step 2: Retrieve learner profile (Tool 1)
        profile, log_1 = retrieve_learner_profile(student_id)
        tools_executed.append(log_1)

        # Step 3: Inspect concept mastery (Tool 2)
        inspection, log_2 = inspect_concept_mastery(profile)
        tools_executed.append(log_2)

        # Determine recent misconception if any
        recent_m = profile.get("concepts", {}).get(inspection["weakest_concept"], {}).get("last_misconception")

        # Step 4: Pedagogical response generation via Gemini API / Local Fallback
        onboarding = profile.get("onboarding_data") or {}
        response_text = await gemini_tutor.generate_tutor_response(
            student_query=raw_transcript,
            cleaned_query=speech_data["cleaned_query"],
            learner_context={
                "overall_mastery": profile.get("overall_mastery", 0.0),
                "weakest_concept": inspection["weakest_concept"],
                "learner_category": profile.get("learner_category") or onboarding.get("learner_category", "Student"),
                "preferred_language": onboarding.get("preferred_language", "Python"),
                "learning_preferences": onboarding.get("learning_preferences", []),
                "primary_goals": onboarding.get("primary_goals", []),
                "verified_level": profile.get("verified_proficiency_level", 1)
            },
            recent_misconception=recent_m
        )

        return {
            "response": response_text,
            "speech_metadata": speech_data,
            "tools_executed": tools_executed
        }

tutor_agent = TutorAgentOrchestrator()
