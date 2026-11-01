import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.responses import Response

from app.storage.db import storage
from app.auth.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    require_owner,
    is_owner_user,
    check_owner_rate_limit,
    reset_owner_rate_limit,
    get_authorized_owner_emails,
    parse_user_agent
)
from app.routes.auth import set_refresh_cookie, build_public_user

router = APIRouter(prefix="/api/owner", tags=["Private Owner Console"])

class OwnerLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

class OwnerAuditLogPayload(BaseModel):
    action: str
    target: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

@router.get("/verify-session")
def verify_owner_session(
    request: Request,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Verify that the current authenticated user possesses authorized owner credentials.
    Returns owner metadata or raises HTTP 403 Forbidden.
    """
    client_ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")

    # Record console access in immutable audit log
    storage.record_owner_audit_event(
        actor_id=user["id"],
        actor_email=user["email"],
        action="CONSOLE_ACCESS_VERIFIED",
        target="/owner-console",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua
    )

    return {
        "status": "success",
        "is_owner": True,
        "email": user["email"],
        "name": user["full_name"],
        "role": "owner",
        "last_login_at": user.get("last_login_at"),
        "server_time_utc": datetime.now(timezone.utc).isoformat()
    }

@router.post("/login")
def owner_login(
    payload: OwnerLoginRequest,
    request: Request,
    response: Response
):
    """
    Dedicated owner authentication endpoint with brute-force protection,
    rate limiting, and immediate audit logging.
    """
    norm_email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    rate_limit_key = f"owner_login:{client_ip}:{norm_email}"

    # 1. Check brute force rate limit
    if not check_owner_rate_limit(rate_limit_key, max_attempts=5, window_seconds=900):
        storage.record_owner_audit_event(
            actor_email=norm_email,
            action="OWNER_LOGIN_RATE_LIMITED",
            target="api/owner/login",
            status="DENIED",
            ip_address=client_ip,
            user_agent=ua,
            details={"reason": "Excessive failed owner authentication attempts (5+ in 15min)"}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed owner login attempts. For security, please wait 15 minutes before retrying."
        )

    # 2. Verify account exists
    user = storage.get_user_by_email(norm_email)
    authorized_emails = get_authorized_owner_emails()

    # Reject non-owner email attempts cleanly
    if not user or norm_email not in authorized_emails:
        storage.record_login_event_safe(
            email=norm_email,
            event_type="LOGIN_FAILED",
            auth_provider="local_owner",
            status="FAILED",
            failure_reason="Non-owner or non-existent credential attempt",
            ip_address=client_ip,
            user_agent=ua
        )
        storage.record_owner_audit_event(
            actor_email=norm_email,
            action="OWNER_LOGIN_FAILED",
            target="api/owner/login",
            status="DENIED",
            ip_address=client_ip,
            user_agent=ua,
            details={"reason": "Email not present in authorized OWNER_EMAIL configuration"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid owner credentials."
        )

    # 3. Verify password
    if not user.get("hashed_password") or not verify_password(payload.password, user["hashed_password"]):
        storage.record_login_event_safe(
            user_id=user["id"],
            email=norm_email,
            event_type="LOGIN_FAILED",
            auth_provider="local_owner",
            status="FAILED",
            failure_reason="Incorrect owner password",
            ip_address=client_ip,
            user_agent=ua
        )
        storage.record_owner_audit_event(
            actor_id=user["id"],
            actor_email=norm_email,
            action="OWNER_LOGIN_FAILED",
            target="api/owner/login",
            status="DENIED",
            ip_address=client_ip,
            user_agent=ua,
            details={"reason": "Password verification mismatch"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid owner credentials."
        )

    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    # Reset rate limit counter upon successful owner sign-in
    reset_owner_rate_limit(rate_limit_key)

    # Update role to owner if not already set
    if user.get("role") != "owner":
        storage.ensure_owner_bootstrap()
        user = storage.get_user_by_id(user["id"])

    storage.update_user_last_login(user["id"])

    # Create session tokens
    raw_refresh_token, token_hash, expires_at = create_refresh_token()
    session_id = f"sess_owner_{uuid.uuid4().hex[:10]}"
    storage.create_user_session({
        "id": session_id,
        "user_id": user["id"],
        "refresh_token_hash": token_hash,
        "expires_at": expires_at,
        "device_info": "owner_console_session"
    })

    access_token = create_access_token({
        "sub": user["id"],
        "student_id": user["student_id"],
        "email": user["normalized_email"],
        "name": user["full_name"],
        "role": "owner"
    })

    set_refresh_cookie(response, raw_refresh_token)

    # Record successful login event
    storage.record_login_event_safe(
        user_id=user["id"],
        email=norm_email,
        event_type="LOGIN_SUCCESS",
        auth_provider="local_owner",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua
    )

    # Record in immutable owner audit log
    storage.record_owner_audit_event(
        actor_id=user["id"],
        actor_email=norm_email,
        action="OWNER_LOGIN_SUCCESS",
        target="api/owner/login",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua,
        details={"session_id": session_id}
    )

    return {
        "status": "success",
        "message": "Authenticated as platform owner successfully.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user)
    }

@router.get("/overview")
def get_owner_overview(
    range_days: int = 30,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Retrieve aggregated platform metrics, registration tallies, DAU/WAU/MAU,
    active sessions, and continuous daily trend series.
    """
    return storage.get_owner_overview_metrics(range_days=range_days)

@router.get("/users")
def get_owner_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 25,
    offset: int = 0,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Searchable, filterable, paginated user directory.
    Omits sensitive credentials, passwords, and tokens.
    """
    return storage.get_owner_user_directory(
        search=search,
        role=role,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=min(limit, 100),
        offset=max(offset, 0)
    )

@router.get("/users/{user_id}")
def get_owner_user_profile(
    user_id: str,
    request: Request,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Inspect detailed activity profile for a specific user.
    """
    client_ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")

    detail = storage.get_owner_user_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="User record not found.")

    storage.record_owner_audit_event(
        actor_id=user["id"],
        actor_email=user["email"],
        action="VIEW_USER_DETAIL",
        target=f"user:{user_id}",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua
    )

    return detail

@router.get("/login-activity")
def get_login_activity(
    search: Optional[str] = None,
    status: Optional[str] = None,
    provider: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Retrieve real authentication event records with device and browser telemetry.
    """
    return storage.get_owner_login_activity(
        search=search,
        status=status,
        provider=provider,
        limit=min(limit, 100),
        offset=max(offset, 0)
    )

@router.get("/learning-analytics")
def get_learning_analytics(
    range_days: int = 30,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Retrieve genuine learning activity metrics: tutor questions, quizzes,
    diagnostics, revisions, and concept frequency.
    """
    return storage.get_owner_learning_analytics(range_days=range_days)

@router.get("/engagement-analytics")
def get_engagement_analytics(
    range_days: int = 30,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Retrieve engagement trends, feature adoption percentages, and weekly cohort retention.
    """
    return storage.get_owner_engagement_analytics(range_days=range_days)

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Retrieve immutable audit trail of owner activities and administrative operations.
    """
    return storage.get_owner_audit_logs(
        limit=min(limit, 100),
        offset=max(offset, 0),
        action=action
    )

@router.post("/audit-log")
def log_owner_action(
    payload: OwnerAuditLogPayload,
    request: Request,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Record an owner console navigation or client-side action in the audit log.
    """
    client_ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")

    audit_id = storage.record_owner_audit_event(
        actor_id=user["id"],
        actor_email=user["email"],
        action=payload.action.strip().upper(),
        target=payload.target,
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua,
        details=payload.details
    )

    return {"status": "success", "audit_id": audit_id}

@router.get("/export/{report_type}")
def export_report_csv(
    report_type: str,
    range_days: int = 30,
    request: Request = None,
    user: Dict[str, Any] = Depends(require_owner)
):
    """
    Export authorized CSV reports for platform telemetry.
    Supported report types: registrations, logins, learning-activity, feature-usage, audit-logs.
    """
    valid_reports = ["registrations", "logins", "learning-activity", "feature-usage", "audit-logs"]
    if report_type not in valid_reports:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report type. Allowed: {valid_reports}"
        )

    csv_content = storage.export_owner_report_csv(report_type=report_type, range_days=range_days)

    client_ip = request.client.host if (request and request.client) else "unknown"
    ua = request.headers.get("user-agent", "") if request else ""
    storage.record_owner_audit_event(
        actor_id=user["id"],
        actor_email=user["email"],
        action="EXPORT_REPORT",
        target=f"csv:{report_type}",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua,
        details={"report_type": report_type, "range_days": range_days}
    )

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"learnloop_{report_type}_{timestamp_str}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-store, no-cache, must-revalidate"
        }
    )

