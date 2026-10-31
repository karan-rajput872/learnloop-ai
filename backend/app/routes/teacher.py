from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any
from app.storage.db import storage
from app.auth.security import get_current_user_optional, require_roles

router = APIRouter(prefix="/api/teacher", tags=["Teacher Dashboard"])

@router.get("/dashboard")
def get_teacher_dashboard(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """
    Retrieve class-wide learning metrics, weakest concepts, and student intervention alerts.
    - If authenticated as a student: access is forbidden (HTTP 403) to safeguard learner privacy.
    - If authenticated as a teacher or admin: returns real aggregated class telemetry.
    - If unauthenticated or demo user: returns synthetic demonstration cohort data.
    """
    if user and user.get("role") == "student" and not user.get("is_demo") and user.get("id") != "usr_guest_demo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student accounts are not authorized to view the Teacher Dashboard. Please switch to Demo Mode to explore cohort telemetry safely."
        )

    if user and user.get("role") in ["teacher", "admin"]:
        return storage.get_real_teacher_dashboard_data()

    return storage.get_demo_teacher_dashboard_data()

@router.get("/demo-dashboard")
def get_teacher_demo_dashboard():
    """
    Retrieve synthetic demonstration cohort analytics.
    Publicly accessible to learners, evaluators, and hackathon reviewers.
    Provides safe, full exploration of educator telemetry without exposing private student records.
    """
    return storage.get_demo_teacher_dashboard_data()

@router.post("/aggregate")
def aggregate_teacher_metrics(user: Dict[str, Any] = Depends(require_roles(["teacher", "admin"]))):
    """
    Recalculate class telemetry and misconception clusters across all active learners.
    Requires verified educator (teacher or admin) role.
    """
    metrics = storage.get_real_teacher_dashboard_data()
    return {
        "status": "success",
        "message": "Class telemetry re-aggregated successfully",
        "data": metrics
    }

@router.post("/aggregate-demo")
def aggregate_demo_metrics():
    """
    Recalculate and refresh synthetic demonstration cohort metrics.
    Publicly accessible for reviewers and students exploring teacher analytics in demo mode.
    """
    metrics = storage.get_demo_teacher_dashboard_data()
    return {
        "status": "success",
        "message": "Demonstration cohort telemetry re-aggregated successfully",
        "data": metrics
    }
