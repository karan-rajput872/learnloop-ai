from fastapi import APIRouter
from app.storage.db import storage

router = APIRouter(prefix="/api/teacher", tags=["Teacher Dashboard"])

@router.get("/dashboard")
def get_teacher_dashboard():
    """Retrieve class-wide learning metrics, weakest concepts, and student intervention alerts."""
    data = storage.get_teacher_dashboard_data()
    return data
