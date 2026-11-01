import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.models.schemas import SpeechInputPayload, FrameAnalysisPayload, FrameAnalysisResponse
from app.agent.tutor_agent import tutor_agent
from app.agent.gemini_service import gemini_tutor
from app.storage.db import storage
from app.auth.security import get_current_user_optional, resolve_student_id

router = APIRouter(prefix="/api/tutor", tags=["AI Tutor & Revision"])

class CompleteRevisionPayload(BaseModel):
    task_id: str

class TutorActionPayload(BaseModel):
    concept_id: str
    action_type: str  # hint, analogy, worked_example, socratic_challenge, explain_simple, solution
    student_id: Optional[str] = "student_default"

@router.get("/messages")
def get_chat_history(
    student_id: Optional[str] = "student_default",
    limit: int = 50,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve persistent conversation history for the student."""
    effective_id = resolve_student_id(user, student_id)
    messages = storage.get_chat_messages(student_id=effective_id, limit=limit)
    return {"messages": messages, "total": len(messages)}

@router.post("/chat")
async def tutor_chat(
    payload: SpeechInputPayload,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Tutor dialogue accepting natural speech dictated using Wispr Flow.
    Disfluency parsing cleans filler words ('um', 'like', 'you know'),
    resolves self-corrections, and isolates digressions before agent reasoning.
    Persists turns to SQLite chat_messages.
    """
    effective_id = resolve_student_id(user, payload.student_id)

    # 1. Save user message to persistent storage
    user_msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    storage.save_chat_message({
        "id": user_msg_id,
        "session_id": "default_session",
        "student_id": effective_id,
        "role": "user",
        "content": payload.raw_transcript,
        "metadata": {},
        "timestamp": datetime.utcnow().isoformat()
    })

    # 2. Execute bounded agent reasoning
    result = await tutor_agent.handle_speech_chat(
        student_id=effective_id,
        raw_transcript=payload.raw_transcript
    )

    # 3. Save assistant message to persistent storage
    asst_msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    storage.save_chat_message({
        "id": asst_msg_id,
        "session_id": "default_session",
        "student_id": effective_id,
        "role": "assistant",
        "content": result["response"],
        "metadata": {
            "speech_metadata": result.get("speech_metadata", {}),
            "tools_executed": result.get("tools_executed", [])
        },
        "timestamp": datetime.utcnow().isoformat()
    })

    # Gamification: Record tutor chat interaction
    try:
        from app.gamification.service import gamification_service
        gamification_service.record_activity(
            student_id=effective_id,
            activity_type="tutor_chat",
            qualifying=True,
            learning_minutes=2,
            details={"tools_executed": len(result.get("tools_executed", []))}
        )
    except Exception as err:
        print("Gamification tutor chat activity error:", err)

    return {
        **result,
        "user_message_id": user_msg_id,
        "assistant_message_id": asst_msg_id
    }

@router.post("/action")
def tutor_action(
    payload: TutorActionPayload,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Interactive Socratic guidance controls:
    Provides hints, physical analogies, worked examples, challenge questions, or simple explanations.
    """
    effective_id = resolve_student_id(user, payload.student_id)
    profile = storage.get_learner_profile(effective_id)
    recent_m = profile.get("concepts", {}).get(payload.concept_id, {}).get("last_misconception") if profile else None
    result = gemini_tutor.execute_tutor_action(
        concept_id=payload.concept_id,
        action_type=payload.action_type,
        recent_misconception=recent_m
    )

    # Persist action to chat history as assistant pedagogical intervention
    action_labels = {
        "hint": "Hint",
        "analogy": "Conceptual Analogy",
        "worked_example": "Worked Example",
        "socratic_challenge": "Socratic Challenge",
        "explain_simple": "Simplified Explanation",
        "solution": "Solution"
    }
    lbl = action_labels.get(payload.action_type, payload.action_type.title())
    action_content = f"**[Socratic Action: {lbl} for {result['concept_name']}]**\n\n{result['content']}"

    msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    storage.save_chat_message({
        "id": msg_id,
        "session_id": "default_session",
        "student_id": effective_id,
        "role": "assistant",
        "content": action_content,
        "metadata": {
            "action_type": payload.action_type,
            "concept_id": payload.concept_id
        },
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        **result,
        "message_id": msg_id,
        "formatted_content": action_content
    }

@router.post("/analyze-frame", response_model=FrameAnalysisResponse)
async def analyze_frame(
    payload: FrameAnalysisPayload,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Explore Live Video: Multimodal visual inspection of student whiteboard sketches,
    recursion trees, BST diagrams, and code snippets powered by Gemini 2.5 Flash.
    """
    effective_id = resolve_student_id(user, payload.student_id)
    profile = storage.get_learner_profile(effective_id)
    learner_context = {
        "learner_category": profile.get("target_exam", "Student"),
        "overall_mastery": profile.get("overall_mastery", 0.0),
        "weakest_concept": profile.get("weakest_concept", "binary_trees")
    } if profile else {}

    result = await gemini_tutor.analyze_video_frame(
        image_base64=payload.image_base64,
        concept_id=payload.concept_id,
        query=payload.query,
        learner_context=learner_context
    )

    # Gamification: Record live video learning activity (3 minutes)
    try:
        from app.gamification.service import gamification_service
        gamification_service.record_activity(
            student_id=effective_id,
            activity_type="live_video_analysis",
            qualifying=True,
            learning_minutes=3,
            details={"concept_id": payload.concept_id, "is_ai_powered": result.get("is_ai_powered")}
        )
    except Exception as err:
        print("Gamification video analysis activity error:", err)

    return result

@router.post("/live-video/analyze", response_model=FrameAnalysisResponse)
async def analyze_live_video(
    payload: FrameAnalysisPayload,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    return await analyze_frame(payload, user)

@router.get("/revision/tasks")
def list_revision_tasks(
    student_id: Optional[str] = "student_default",
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Retrieve spaced repetition revision schedule."""
    effective_id = resolve_student_id(user, student_id)
    tasks = storage.get_revision_tasks(effective_id)
    return {"tasks": tasks, "total": len(tasks)}

@router.post("/revision/complete")
def mark_revision_completed(
    payload: CompleteRevisionPayload,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Mark a spaced repetition task as completed, enforcing student ownership."""
    task = storage.get_revision_task_by_id(payload.task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Revision task '{payload.task_id}' not found.")

    if user and user.get("role") not in ["teacher", "admin"]:
        if task.get("student_id") != user.get("student_id"):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You cannot complete another student's revision task."
            )

    storage.complete_revision_task(payload.task_id)

    # Gamification: Record revision activity
    try:
        from app.gamification.service import gamification_service
        st_id = task.get("student_id") or (user.get("student_id") if user else "student_default")
        gamification_service.record_activity(
            student_id=st_id,
            activity_type="revision",
            qualifying=True,
            learning_minutes=5,
            details={"task_id": payload.task_id, "concept_id": task.get("concept_id")}
        )
    except Exception as err:
        print("Gamification revision activity error:", err)

    return {"status": "success", "message": f"Task {payload.task_id} completed."}
