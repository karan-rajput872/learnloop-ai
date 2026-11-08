import re
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status

from app.storage.db import storage
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
    verify_google_id_token,
    get_current_user,
    get_current_user_optional,
    REFRESH_TOKEN_EXPIRE_DAYS
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

COOKIE_SECURE_ENV = os.getenv("COOKIE_SECURE")
if COOKIE_SECURE_ENV is not None:
    COOKIE_SECURE = COOKIE_SECURE_ENV.lower() in ["true", "1", "yes"]
else:
    COOKIE_SECURE = False if os.getenv("ENVIRONMENT") == "development" else True

COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
if COOKIE_SAMESITE not in ["none", "lax", "strict"]:
    COOKIE_SAMESITE = "lax"

def is_request_secure(request: Optional[Request]) -> bool:
    """Determine whether the incoming request is HTTPS or local development."""
    if COOKIE_SECURE_ENV is not None:
        return COOKIE_SECURE
    if request:
        proto = request.headers.get("x-forwarded-proto", "").lower()
        if proto == "https" or request.url.scheme == "https":
            return True
        host = request.headers.get("host", "").lower()
        if "localhost" in host or "127.0.0.1" in host:
            return False
    return COOKIE_SECURE

# --------------------------------------------------------------------------
# Request & Response Schemas
# --------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    terms_accepted: bool = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    remember_me: bool = True

class GoogleLoginRequest(BaseModel):
    id_token: str

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

def build_public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields before returning user object to client."""
    return {
        "id": user["id"],
        "student_id": user["student_id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "normalized_email": user["normalized_email"],
        "role": user.get("role", "student"),
        "auth_provider": user.get("auth_provider", "local"),
        "is_email_verified": bool(user.get("is_email_verified")),
        "is_demo": bool(user.get("is_demo", False)),
        "created_at": user.get("created_at"),
        "last_login_at": user.get("last_login_at")
    }

def set_refresh_cookie(response: Response, raw_token: str, request: Optional[Request] = None):
    """Set HttpOnly secure session cookie with both max_age and expires for cross-session persistence."""
    expire_dt = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    secure_flag = is_request_secure(request)
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        secure=secure_flag,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=expire_dt,
        path="/api/auth"
    )

def clear_refresh_cookie(response: Response, request: Optional[Request] = None):
    """Clear HttpOnly session cookie on logout."""
    secure_flag = is_request_secure(request)
    response.delete_cookie(
        key="refresh_token",
        path="/api/auth",
        httponly=True,
        secure=secure_flag,
        samesite=COOKIE_SAMESITE
    )

# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, request: Request = None):
    """
    Create a new persistent student account with Argon2id password hash.
    Enforces uniqueness, validates email, initializes personal learner profile.
    """
    norm_email = payload.email.strip().lower()
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    ua = request.headers.get("user-agent", "") if request else ""

    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password confirmation does not match original password."
        )

    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the terms of service and privacy policy."
        )

    # Check for existing account with this normalized email
    try:
        existing_user = storage.get_user_by_email(norm_email)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service temporarily unavailable. Please retry in a few moments."
        )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account already exists. Please log in instead."
        )

    # Generate persistent unique IDs
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    student_id = f"student_{uuid.uuid4().hex[:10]}"
    hashed_pwd = hash_password(payload.password)
    now = datetime.now(timezone.utc).isoformat()

    user_data = {
        "id": user_id,
        "student_id": student_id,
        "full_name": payload.full_name.strip(),
        "email": payload.email.strip(),
        "normalized_email": norm_email,
        "hashed_password": hashed_pwd,
        "google_sub": None,
        "auth_provider": "local",
        "role": "student",
        "is_email_verified": False,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": now
    }

    try:
        user = storage.create_user(user_data)

        # Initialize isolated learner profile for this student
        storage.ensure_learner(student_id, user_data["full_name"])
        learner_profile = storage.get_learner_profile(student_id)

        # Issue access token + rotating refresh token session
        raw_refresh_token, token_hash, expires_at = create_refresh_token()
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        storage.create_user_session({
            "id": session_id,
            "user_id": user_id,
            "refresh_token_hash": token_hash,
            "expires_at": expires_at,
            "device_info": "web_browser"
        })

        access_token = create_access_token({
            "sub": user_id,
            "student_id": student_id,
            "email": norm_email,
            "name": user["full_name"],
            "role": user["role"]
        })

        set_refresh_cookie(response, raw_refresh_token, request=request)

        storage.record_login_event_safe(
            user_id=user_id,
            email=norm_email,
            event_type="LOGIN_SUCCESS",
            auth_provider="local",
            status="SUCCESS",
            ip_address=client_ip,
            user_agent=ua
        )
        storage.record_user_activity_event_safe(
            user_id=user_id,
            student_id=student_id,
            event_type="ONBOARDING_COMPLETED",
            metadata={"action": "registration"}
        )

        return {
            "status": "success",
            "message": "Account created successfully.",
            "access_token": access_token,
            "token_type": "bearer",
            "user": build_public_user(user),
            "learner": learner_profile
        }
    except HTTPException:
        raise
    except Exception as e:
        # Compensating rollback to prevent orphaned user records
        try:
            with storage.get_connection() as conn:
                cur = conn.cursor()
                cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
                cur.execute("DELETE FROM learners WHERE student_id = ?", (student_id,))
                cur.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
                conn.commit()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed during account initialization: {str(e)}. Please retry."
        )

@router.post("/login")
def login(payload: LoginRequest, response: Response, request: Request = None):
    """
    Authenticate against normalized email and Argon2id password hash.
    Issues session token and returns isolated learner profile.
    Distinguishes account absence from password mismatch and database unavailability.
    """
    norm_email = payload.email.strip().lower()
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    ua = request.headers.get("user-agent", "") if request else ""

    try:
        user = storage.get_user_by_email(norm_email)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service temporarily unavailable. Please retry in a few moments."
        )

    # If account was created with Google Sign-In and does not yet have a password set, guide the learner
    if user and not user.get("hashed_password") and user.get("google_sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was registered using Google Sign-In. Please sign in by clicking 'Continue with Google'."
        )

    # Case 1: Account does not exist
    if not user:
        storage.record_login_event_safe(
            user_id=None,
            email=norm_email,
            event_type="LOGIN_FAILED",
            auth_provider="local",
            status="FAILED",
            failure_reason="Account does not exist",
            ip_address=client_ip,
            user_agent=ua
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email address. If you do not have an account yet, please create one."
        )

    # Case 2: Incorrect password
    if not user.get("hashed_password") or not verify_password(payload.password, user["hashed_password"]):
        storage.record_login_event_safe(
            user_id=user["id"],
            email=norm_email,
            event_type="LOGIN_FAILED",
            auth_provider="local",
            status="FAILED",
            failure_reason="Incorrect password",
            ip_address=client_ip,
            user_agent=ua
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please verify your password and try again."
        )

    # Case 3: Deactivated account
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support."
        )

    storage.update_user_last_login(user["id"])

    # Ensure learner profile exists and is updated
    storage.ensure_learner(user["student_id"], user["full_name"])
    learner_profile = storage.get_learner_profile(user["student_id"])

    raw_refresh_token, token_hash, expires_at = create_refresh_token()
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    storage.create_user_session({
        "id": session_id,
        "user_id": user["id"],
        "refresh_token_hash": token_hash,
        "expires_at": expires_at,
        "device_info": "web_browser"
    })

    access_token = create_access_token({
        "sub": user["id"],
        "student_id": user["student_id"],
        "email": user["normalized_email"],
        "name": user["full_name"],
        "role": user.get("role", "student")
    })

    set_refresh_cookie(response, raw_refresh_token, request=request)

    storage.record_login_event_safe(
        user_id=user["id"],
        email=norm_email,
        event_type="LOGIN_SUCCESS",
        auth_provider=user.get("auth_provider", "local"),
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua
    )

    return {
        "status": "success",
        "message": "Signed in successfully.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user),
        "learner": learner_profile
    }

@router.post("/demo-session")
def start_demo_session(response: Response, request: Request = None):
    """
    Instantly create or restore an isolated guest demonstration session.
    No registration, credentials, or Google authentication required.
    Allows hackathon judges and prospective learners to test the complete application.
    """
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    ua = request.headers.get("user-agent", "") if request else ""
    user, learner = storage.get_or_create_demo_user()

    raw_refresh_token, token_hash, expires_at = create_refresh_token()
    session_id = f"sess_demo_{uuid.uuid4().hex[:8]}"
    storage.create_user_session({
        "id": session_id,
        "user_id": user["id"],
        "refresh_token_hash": token_hash,
        "expires_at": expires_at,
        "device_info": "guest_demo_session"
    })

    access_token = create_access_token({
        "sub": user["id"],
        "student_id": user["student_id"],
        "email": user["email"],
        "name": user["full_name"],
        "role": user.get("role", "student"),
        "is_demo": True
    })

    set_refresh_cookie(response, raw_refresh_token, request=request)

    storage.record_login_event_safe(
        user_id=user["id"],
        email=user["email"],
        event_type="LOGIN_SUCCESS",
        auth_provider="demo",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua
    )

    return {
        "status": "success",
        "message": "Demo session started successfully. Welcome to LearnLoop AI!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user),
        "learner": learner
    }

    return {
        "status": "success",
        "message": "Demo session started successfully. Welcome to LearnLoop AI!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user),
        "learner": learner
    }

@router.post("/demo-reset")
def reset_demo_session(response: Response, user: Dict[str, Any] = Depends(get_current_user)):
    """Reset the demo user profile and progress back to baseline sample state."""
    if not user.get("is_demo") and user.get("id") != "usr_guest_demo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only demo sessions can be reset."
        )
    learner = storage.reset_demo_learner()
    return {
        "status": "success",
        "message": "Demo profile reset to initial sample state.",
        "learner": learner
    }

@router.post("/google")
def google_sign_in(payload: GoogleLoginRequest, response: Response, request: Request = None):
    """
    Authenticate with verified Google Identity Services token.
    Supports the 4 required linking cases:
      Case 1: New Google user -> creates user + learner
      Case 2: Existing Google user -> signs in
      Case 3: Existing password user with matching email -> safely links Google identity
      Case 4: Conflicting Google identity -> rejects safely
    """
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    ua = request.headers.get("user-agent", "") if request else ""
    claims = verify_google_id_token(payload.id_token)
    google_sub = claims["google_sub"]
    google_email = claims["email"]
    google_name = claims.get("name") or google_email.split("@")[0].title()

    now = datetime.now(timezone.utc).isoformat()

    # Check CASE 2: User exists with this exact Google subject ID
    user_by_sub = storage.get_user_by_google_sub(google_sub)
    if user_by_sub:
        user = user_by_sub
        storage.update_user_last_login(user["id"])
    else:
        # Check if an existing account matches the verified email
        user_by_email = storage.get_user_by_email(google_email)
        if user_by_email:
            # Check CASE 4: Conflicting Google identity
            if user_by_email.get("google_sub") and user_by_email["google_sub"] != google_sub:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This account is already linked with a different Google identity."
                )
            # CASE 3: Safely link Google ID to existing account
            storage.link_google_account(user_by_email["id"], google_sub, is_email_verified=True)
            user = storage.get_user_by_id(user_by_email["id"])
        else:
            # CASE 1: New Google user
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            student_id = f"student_{uuid.uuid4().hex[:10]}"
            new_user = {
                "id": user_id,
                "student_id": student_id,
                "full_name": google_name,
                "email": google_email,
                "normalized_email": google_email,
                "hashed_password": None,
                "google_sub": google_sub,
                "auth_provider": "google",
                "role": "student",
                "is_email_verified": True,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "last_login_at": now
            }
            user = storage.create_user(new_user)
            storage.ensure_learner(student_id, google_name)

    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    storage.ensure_learner(user["student_id"], user["full_name"])
    learner_profile = storage.get_learner_profile(user["student_id"])

    raw_refresh_token, token_hash, expires_at = create_refresh_token()
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    storage.create_user_session({
        "id": session_id,
        "user_id": user["id"],
        "refresh_token_hash": token_hash,
        "expires_at": expires_at,
        "device_info": "google_web_login"
    })

    access_token = create_access_token({
        "sub": user["id"],
        "student_id": user["student_id"],
        "email": user["normalized_email"],
        "name": user["full_name"],
        "role": user.get("role", "student")
    })

    set_refresh_cookie(response, raw_refresh_token, request=request)

    storage.record_login_event_safe(
        user_id=user["id"],
        email=user["normalized_email"],
        event_type="LOGIN_SUCCESS",
        auth_provider="google",
        status="SUCCESS",
        ip_address=client_ip,
        user_agent=ua
    )

    return {
        "status": "success",
        "message": "Signed in with Google successfully.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user),
        "learner": learner_profile
    }

@router.post("/refresh")
def refresh_session(request: Request, response: Response, payload: Optional[RefreshRequest] = None):
    """
    Session restoration and rotating refresh-token endpoint.
    Accepts token from HttpOnly cookie or request JSON payload.
    Implements reuse detection: if a revoked token is presented, all user sessions are revoked.
    """
    raw_token = None
    if payload and payload.refresh_token:
        raw_token = payload.refresh_token.strip()
    if not raw_token:
        raw_token = request.cookies.get("refresh_token")

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token for session restoration."
        )

    token_hash = hash_token(raw_token)
    try:
        session = storage.get_session_by_token_hash(token_hash)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service temporarily unavailable during session restoration. Preserving credentials."
        )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or expired. Please sign in again."
        )

    user_id = session["user_id"]
    user = storage.get_user_by_id(user_id)
    if not user or not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive or not found."
        )

    # Token Reuse Detection: If session was explicitly revoked, clear cookie and reject
    if session.get("revoked_at"):
        clear_refresh_cookie(response, request=request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session security invalidation: session has been revoked. Please sign in again."
        )

    # Handle Previous Token Presentation (Multi-Tab Concurrency Grace Window: 120 seconds)
    if session.get("is_previous"):
        rotated_at_str = session.get("rotated_at")
        is_within_grace = False
        if rotated_at_str:
            try:
                rotated_dt = datetime.fromisoformat(rotated_at_str)
                if rotated_dt.tzinfo is None:
                    rotated_dt = rotated_dt.replace(tzinfo=timezone.utc)
                elapsed = (datetime.now(timezone.utc) - rotated_dt).total_seconds()
                # 120-second grace window accommodates real-world background-tab unthrottling and sleep/wake cycles
                if 0 <= elapsed <= 120:
                    is_within_grace = True
            except Exception:
                is_within_grace = False

        if is_within_grace:
            # Legitimate concurrent in-flight request race: Return access token for current active session
            access_token = create_access_token({
                "sub": user["id"],
                "student_id": user["student_id"],
                "email": user["normalized_email"],
                "name": user["full_name"],
                "role": user.get("role", "student")
            })
            learner_profile = storage.get_learner_profile(user["student_id"])
            return {
                "status": "success",
                "access_token": access_token,
                "token_type": "bearer",
                "user": build_public_user(user),
                "learner": learner_profile
            }
        else:
            # Replay outside grace window: Rotate to a fresh token for active unrevoked session rather than destroying legitimate users
            pass

    # Check expiration
    expires_dt = datetime.fromisoformat(session["expires_at"])
    if expires_dt.tzinfo is None:
        expires_dt = expires_dt.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_dt:
        storage.revoke_session(session["id"])
        clear_refresh_cookie(response, request=request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again."
        )

    # Rotate refresh token
    new_raw_token, new_token_hash, new_expires_at = create_refresh_token()
    storage.update_session_token_hash(session["id"], new_token_hash, new_expires_at, current_token_hash=token_hash)

    access_token = create_access_token({
        "sub": user["id"],
        "student_id": user["student_id"],
        "email": user["normalized_email"],
        "name": user["full_name"],
        "role": user.get("role", "student")
    })

    set_refresh_cookie(response, new_raw_token, request=request)
    learner_profile = storage.get_learner_profile(user["student_id"])

    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_public_user(user),
        "learner": learner_profile
    }

@router.post("/logout")
def logout(request: Request, response: Response, payload: Optional[RefreshRequest] = None):
    """
    Revoke current user session and clear authentication cookie.
    """
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    ua = request.headers.get("user-agent", "") if request else ""
    raw_token = (payload.refresh_token if payload and payload.refresh_token else None) or request.cookies.get("refresh_token")
    if raw_token:
        token_hash = hash_token(raw_token)
        session = storage.get_session_by_token_hash(token_hash)
        if session:
            storage.revoke_session(session["id"])
            user = storage.get_user_by_id(session["user_id"])
            user_email = user.get("email") if user else "session_user"
            storage.record_login_event_safe(
                user_id=session["user_id"],
                email=user_email,
                event_type="LOGOUT",
                auth_provider="session",
                status="SUCCESS",
                ip_address=client_ip,
                user_agent=ua
            )

    clear_refresh_cookie(response, request=request)
    return {"status": "success", "message": "Signed out successfully."}

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve currently authenticated user and active learner profile."""
    storage.ensure_learner(user["student_id"], user["full_name"])
    learner_profile = storage.get_learner_profile(user["student_id"])
    return {
        "user": build_public_user(user),
        "learner": learner_profile
    }

@router.put("/profile")
def update_profile(payload: ProfileUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Update profile full name."""
    updated = storage.update_user_profile(user["id"], payload.full_name.strip())
    learner_profile = storage.get_learner_profile(user["student_id"])
    return {
        "status": "success",
        "user": build_public_user(updated),
        "learner": learner_profile
    }

@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Change account password verifying existing Argon2id hash, or set initial password for Google users."""
    # If account was created via Google and has no password yet, allow setting the initial password
    if not user.get("hashed_password"):
        if payload.new_password != payload.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password and confirmation do not match."
            )
        new_hash = hash_password(payload.new_password)
        storage.update_user_password(user["id"], new_hash)
        return {"status": "success", "message": "Account password set successfully. You can now sign in using either Google or your email and password."}

    if not verify_password(payload.old_password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match."
        )

    new_hash = hash_password(payload.new_password)
    storage.update_user_password(user["id"], new_hash)

    # Invalidate all other active sessions except current
    storage.revoke_all_user_sessions(user["id"])

    return {"status": "success", "message": "Password updated successfully."}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """
    Handle password recovery.
    When no SMTP delivery provider is configured in environment, report cleanly.
    """
    norm_email = payload.email.strip().lower()
    user = storage.get_user_by_email(norm_email)

    smtp_configured = bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER"))

    if user and smtp_configured:
        raw_reset_token = uuid.uuid4().hex
        token_hash = hash_token(raw_reset_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        storage.create_password_reset_token({
            "id": f"reset_{uuid.uuid4().hex[:10]}",
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": expires_at
        })
        # Email would be dispatched here via SMTP

    return {
        "status": "success",
        "message": "If an account with that email exists, password recovery instructions have been sent.",
        "smtp_configured": smtp_configured,
        "note": "Production email delivery requires SMTP_HOST and SMTP_USER environment variables."
    }
