import os
import hashlib
import secrets
import time
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple, List
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
import httpx
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Security Settings & Production Environment Validation
_raw_jwt_secret = os.getenv("JWT_SECRET_KEY", "").strip()
_environment = os.getenv("ENVIRONMENT", "").strip().lower()
IS_PRODUCTION = (
    _environment in ("production", "prod")
    or os.getenv("RENDER", "").strip().lower() == "true"
    or bool(os.getenv("RENDER_SERVICE_ID"))
)

FALLBACK_DEV_JWT_SECRET = "learnloop-dev-only-secret-key-not-for-production-use-min32c!"

if not _raw_jwt_secret:
    if IS_PRODUCTION:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY environment variable is required in production. "
            "Please configure a strong, random 32+ character secret in your hosting provider's environment settings (e.g. Render Dashboard)."
        )
    JWT_SECRET_KEY = FALLBACK_DEV_JWT_SECRET
else:
    if len(_raw_jwt_secret) < 32:
        raise ValueError(
            "SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY must be at least 32 characters long for cryptographic security."
        )
    JWT_SECRET_KEY = _raw_jwt_secret

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

# Argon2id Password Hasher (OWASP recommended parameters)
pwd_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=4,
    hash_len=32
)

bearer_scheme = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash plaintext password using Argon2id."""
    return pwd_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash with full exception safety."""
    if not hashed_password or not plain_password:
        return False
    try:
        return pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    except Exception:
        return False

def hash_token(raw_token: str) -> str:
    """Compute SHA-256 hash of a raw token for secure database storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create short-lived signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": secrets.token_hex(16)
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a signed JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def create_refresh_token() -> Tuple[str, str, str]:
    """
    Generate a cryptographically secure rotating refresh token.
    Returns: (raw_token, token_hash, expires_at_iso)
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_token(raw_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()
    return raw_token, token_hash, expires_at

def verify_google_id_token(id_token_str: str) -> Dict[str, Any]:
    """
    Verify Google ID token with Google's official public tokeninfo service.
    Validates digital signature, issuer, client audience, and expiration.
    """
    if not id_token_str or not id_token_str.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Google identity token."
        )

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token_str.strip()}")
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google identity credential."
                )
            token_info = resp.json()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to reach Google identity verification service: {e}"
        )

    # 1. Validate Issuer
    iss = token_info.get("iss", "")
    if iss not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Untrusted Google token issuer."
        )

    # 2. Validate Audience (if configured)
    if GOOGLE_CLIENT_ID:
        aud = token_info.get("aud", "")
        if aud != GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token audience mismatch."
            )

    # 3. Validate Email and Verification Status
    email = token_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account must have an associated email address."
        )

    email_verified = token_info.get("email_verified")
    if str(email_verified).lower() not in ["true", "1"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unverified Google email address rejected for account authentication."
        )

    sub = token_info.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing subject identifier."
        )

    return {
        "google_sub": sub,
        "email": email.strip().lower(),
        "name": token_info.get("name") or email.split("@")[0].title(),
        "picture": token_info.get("picture"),
        "email_verified": True
    }

def extract_token_from_request(
    request: Optional[Request] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = None
) -> Optional[str]:
    """Extract access token from Bearer header or Authorization header."""
    if credentials and credentials.credentials:
        return credentials.credentials.strip()
    if request:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        # Fallback to query param or cookie if ever needed
        if "access_token" in request.cookies:
            return request.cookies.get("access_token")
    return None

def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    """
    Retrieve currently authenticated user if token is valid.
    Returns None if no credentials were provided (enabling preview mode for visitors).
    Raises HTTP 401 Unauthorized if credentials were provided but are invalid or expired.
    """
    raw_token = extract_token_from_request(request, credentials)
    if not raw_token:
        return None

    payload = decode_access_token(raw_token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    from app.storage.db import storage
    user = storage.get_user_by_id(payload["sub"])
    if not user or not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token is inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user["is_demo"] = bool(user.get("is_demo", False) or payload.get("is_demo", False) or user.get("id") == "usr_guest_demo")
    return user

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """
    Enforce authentication. Returns user dict or raises HTTP 401 Unauthorized.
    """
    user = get_current_user_optional(request, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def require_roles(allowed_roles: List[str]):
    """Role-based authorization dependency factory."""
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "student")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {allowed_roles}, your role is '{user_role}'."
            )
        return user
    return role_checker

# Owner Console Security Settings
# Authorized owner emails configured via environment variable (comma-separated if multiple)
DEFAULT_OWNER_EMAIL = "karanrajput872@gmail.com"
OWNER_EMAILS_RAW = os.getenv("OWNER_EMAIL", DEFAULT_OWNER_EMAIL)

def get_authorized_owner_emails() -> List[str]:
    """Retrieve normalized lowercase list of authorized owner emails from configuration."""
    raw = os.getenv("OWNER_EMAIL", DEFAULT_OWNER_EMAIL)
    emails = [e.strip().lower() for e in raw.split(",") if e.strip()]
    if not emails:
        emails = [DEFAULT_OWNER_EMAIL.lower()]
    return emails

def parse_user_agent(ua_string: Optional[str]) -> Tuple[str, str, str]:
    """
    Zero-dependency, privacy-preserving User-Agent parser.
    Extracts coarse (device_category, browser, os) without invasive fingerprinting.
    """
    if not ua_string:
        return "unknown", "Other", "Other"
    ua = ua_string.lower()

    # Device category
    if "ipad" in ua or "tablet" in ua:
        device = "tablet"
    elif "mobile" in ua or "android" in ua or "iphone" in ua or "ipod" in ua:
        device = "mobile"
    else:
        device = "desktop"

    # Browser
    if "edg/" in ua or "edgios/" in ua or "edge" in ua:
        browser = "Edge"
    elif "chrome/" in ua and "safari/" in ua and "edg" not in ua and "opr" not in ua:
        browser = "Chrome"
    elif "firefox/" in ua or "fxios/" in ua:
        browser = "Firefox"
    elif "safari/" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "opera" in ua or "opr/" in ua:
        browser = "Opera"
    else:
        browser = "Other"

    # OS
    if "windows" in ua:
        os_name = "Windows"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua or "ios" in ua:
        os_name = "iOS"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Other"

    return device, browser, os_name

# In-memory sliding window rate limiter for owner endpoints and brute-force prevention
_owner_rate_limit: Dict[str, List[float]] = {}
_rate_limit_lock = threading.Lock()

def check_owner_rate_limit(
    key: str,
    max_attempts: int = 5,
    window_seconds: int = 900,
    client_ip: Optional[str] = None,
    email: Optional[str] = None
) -> bool:
    """
    Hybrid sliding-window rate limit check:
    1. Fast in-memory check for burst attacks.
    2. Shared, multi-worker persistent database check via storage.check_database_rate_limit().
    Returns True if permitted, False if limit exceeded.
    Default: max 5 failed attempts per 15 minutes (900s).
    """
    now = time.time()
    with _rate_limit_lock:
        attempts = _owner_rate_limit.get(key, [])
        # Expire old entries outside the window
        attempts = [t for t in attempts if now - t < window_seconds]
        if len(attempts) >= max_attempts:
            _owner_rate_limit[key] = attempts
            return False

    # Check shared database rate limit across processes
    try:
        from app.storage.db import storage
        if not storage.check_database_rate_limit(client_ip, email, max_failures=max_attempts, window_seconds=window_seconds):
            return False
    except Exception:
        pass

    with _rate_limit_lock:
        attempts.append(now)
        _owner_rate_limit[key] = attempts
        return True

def reset_owner_rate_limit(key: str):
    """Clear rate limit entry on successful authentication."""
    with _rate_limit_lock:
        if key in _owner_rate_limit:
            del _owner_rate_limit[key]

def is_owner_user(user: Optional[Dict[str, Any]]) -> bool:
    """Check if the given authenticated user dict has authorized owner privileges."""
    if not user:
        return False
    authorized_emails = get_authorized_owner_emails()
    user_email = (user.get("normalized_email") or user.get("email") or "").strip().lower()
    user_role = user.get("role", "student")
    return (user_email in authorized_emails) or (user_role == "owner")

def require_owner(
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Strict backend authorization dependency for Private Owner Console endpoints.
    Enforces that:
    1. The user is actively authenticated with a valid JWT token.
    2. The user's verified email matches configured OWNER_EMAIL or has role='owner'.
    3. Student and teacher accounts are strictly rejected with HTTP 403 Forbidden.
    4. Failed/unauthorized attempts are logged to the immutable audit trail.
    """
    if not is_owner_user(user):
        client_ip = request.client.host if request.client else "unknown"
        ua = request.headers.get("user-agent", "")
        actor_email = (user.get("normalized_email") or user.get("email") or "unknown").strip().lower()
        actor_role = user.get("role", "student")

        try:
            from app.storage.db import storage
            storage.record_owner_audit_event(
                actor_id=user.get("id"),
                actor_email=actor_email,
                action="UNAUTHORIZED_ACCESS_ATTEMPT",
                target=request.url.path,
                status="DENIED",
                ip_address=client_ip,
                user_agent=ua,
                details={
                    "reason": "Account is not in authorized OWNER_EMAIL configuration",
                    "user_role": actor_role,
                    "attempted_method": request.method
                }
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student and standard educator accounts are not authorized to access the Private Owner Console."
        )

    return user

def resolve_student_id(
    user: Optional[Dict[str, Any]],
    requested_id: Optional[str] = None,
    allow_preview: bool = True
) -> str:
    """
    Safely resolve the effective student_id for an endpoint:
    - If user is authenticated:
        - If requested_id is provided and differs from user["student_id"]:
            - If user has teacher/admin role, allow reading requested_id.
            - Otherwise raise HTTP 403 Forbidden.
        - Returns user["student_id"].
    - If user is unauthenticated:
        - If allow_preview: return requested_id or "student_default".
        - Otherwise raise HTTP 401 Unauthorized.
    """
    if user:
        authenticated_student_id = user.get("student_id")
        user_role = user.get("role", "student")
        if requested_id and requested_id != authenticated_student_id and requested_id != "student_default":
            if user_role not in ["teacher", "admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You cannot access or modify another student's private learning records."
                )
            return requested_id
        return authenticated_student_id

    if allow_preview:
        return requested_id or "student_default"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required."
    )
