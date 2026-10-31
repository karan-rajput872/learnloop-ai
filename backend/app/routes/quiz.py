from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from app.models.schemas import QuestionAnswerSubmission
from app.agent.tutor_agent import tutor_agent
from app.auth.security import get_current_user_optional, resolve_student_id

router = APIRouter(prefix="/api/quiz", tags=["Adaptive Quiz"])

@router.get("/adaptive")
async def get_adaptive_question(
    student_id: Optional[str] = "student_default",
    concept_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Invoke the agent to generate/select an adaptive question matching the student's weakest concept and calibrated difficulty."""
    effective_id = resolve_student_id(user, student_id)
    result = await tutor_agent.get_adaptive_question(student_id=effective_id, concept_id=concept_id)
    return result

@router.post("/submit")
async def submit_answer(
    submission: QuestionAnswerSubmission,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Submit student answer and reasoning text.
    Executes the multi-tool agent loop to evaluate reasoning, identify misconceptions,
    update the learner model, schedule revision, and verify persistence.
    """
    if not submission.question_id or not submission.concept_id or not submission.selected_option:
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: 'question_id', 'concept_id', and 'selected_option' must not be empty."
        )

    effective_id = resolve_student_id(user, submission.student_id)

    result = await tutor_agent.evaluate_submission(
        student_id=effective_id,
        question_id=submission.question_id,
        concept_id=submission.concept_id,
        selected_option=submission.selected_option,
        student_reasoning=submission.student_reasoning,
        confidence_level=submission.confidence_level
    )
    return result
