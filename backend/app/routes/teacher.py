from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any
from app.storage.db import storage
from app.auth.security import get_current_user_optional

router = APIRouter(prefix="/api/teacher", tags=["Teacher Dashboard"])

@router.get("/dashboard")
def get_teacher_dashboard(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """
    Retrieve class-wide learning metrics, weakest concepts, and student intervention alerts.
    If authenticated as a student, access is forbidden.
    Allows teacher/admin roles, or unauthenticated demonstration mode with clearly labeled demo cohort data.
    """
    if user and user.get("role") == "student" and not user.get("is_demo") and user.get("id") != "usr_guest_demo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student accounts are not authorized to view the Teacher Dashboard."
        )
    data = storage.get_teacher_dashboard_data()
    return data
