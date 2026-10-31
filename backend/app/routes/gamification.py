from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import Optional, Dict, Any, List
from app.auth.security import get_current_user_optional, resolve_student_id
from app.gamification.service import gamification_service

router = APIRouter(prefix="/api", tags=["Gamification & User Preferences"])

@router.get("/gamification/dashboard")
def get_gamification_dashboard(
    student_id: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Retrieve user streak, calendar, heatmap, XP level, achievements, and active challenges.
    """
    effective_student_id = resolve_student_id(user, student_id, allow_preview=True)
    return gamification_service.get_gamification_dashboard(effective_student_id)

@router.post("/gamification/record-activity")
def record_activity(
    payload: Dict[str, Any] = Body(...),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Record an educational activity (quiz, revision, diagnostic, tutor session).
    """
    effective_student_id = resolve_student_id(user, payload.get("student_id"), allow_preview=True)
    activity_type = payload.get("activity_type", "study_session")
    qualifying = bool(payload.get("qualifying", True))
    learning_minutes = int(payload.get("learning_minutes", 5))
    details = payload.get("details", {})
    client_date = payload.get("client_date")

    result = gamification_service.record_activity(
        student_id=effective_student_id,
        activity_type=activity_type,
        qualifying=qualifying,
        learning_minutes=learning_minutes,
        details=details,
        client_date=client_date
    )
    return result

@router.get("/user/settings")
def get_user_settings(
    student_id: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Retrieve user preferences and settings.
    """
    effective_student_id = resolve_student_id(user, student_id, allow_preview=True)
    return gamification_service.get_user_settings(effective_student_id)

@router.put("/user/settings")
def update_user_settings(
    payload: Dict[str, Any] = Body(...),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Update user preferences and settings.
    """
    effective_student_id = resolve_student_id(user, payload.get("student_id"), allow_preview=True)
    return gamification_service.update_user_settings(effective_student_id, payload)

@router.get("/user/notifications")
def get_user_notifications(
    student_id: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Retrieve in-app notifications.
    """
    effective_student_id = resolve_student_id(user, student_id, allow_preview=True)
    return gamification_service.get_notifications(effective_student_id)

@router.post("/user/notifications/mark-read")
def mark_all_notifications_read(
    payload: Optional[Dict[str, Any]] = Body(default={}),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Mark all user notifications as read.
    """
    effective_student_id = resolve_student_id(user, payload.get("student_id") if payload else None, allow_preview=True)
    gamification_service.mark_notifications_read(effective_student_id)
    return {"status": "success", "message": "All notifications marked as read"}

@router.post("/user/notifications/{notification_id}/read")
def mark_single_notification_read(
    notification_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Mark a specific notification as read.
    """
    effective_student_id = resolve_student_id(user, None, allow_preview=True)
    gamification_service.mark_notifications_read(effective_student_id, notification_id)
    return {"status": "success", "message": f"Notification {notification_id} marked as read"}
