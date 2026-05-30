"""
Authentication API routes — Google OAuth, email/password, TOTP/MFA, user management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import timedelta, datetime
import uuid

from app.auth import (
    verify_google_token,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
    is_email_allowed,
    VALID_ROLES,
    ADMIN_ROLES,
    User,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.database import db_session
from app.db_models import UserRecord
from app import audit_service

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ── Request / Response models ─────────────────────────────────────────────────

class GoogleLoginRequest(BaseModel):
    credential: str

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("email")
    @classmethod
    def email_lower(cls, v: str) -> str:
        return v.strip().lower()

class LoginPasswordRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_lower(cls, v: str) -> str:
        return v.strip().lower()

class MfaVerifyRequest(BaseModel):
    email: str
    password: Optional[str] = None
    google_token: Optional[str] = None
    totp_code: str

class MfaSetupConfirmRequest(BaseModel):
    totp_code: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class MfaRequiredResponse(BaseModel):
    mfa_required: bool = True
    message: str = "MFA code required"

class UserResponse(BaseModel):
    email: str
    name: str
    picture: Optional[str]
    role: str
    mfa_enabled: bool

class RoleUpdate(BaseModel):
    role: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_token(user_rec: UserRecord) -> LoginResponse:
    access_token = create_access_token(
        data={
            "email": user_rec.email,
            "name": user_rec.name,
            "picture": user_rec.picture,
            "google_id": user_rec.google_id or user_rec.id,
            "role": user_rec.role,
        }
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "email": user_rec.email,
            "name": user_rec.name,
            "picture": user_rec.picture,
            "role": user_rec.role,
            "mfa_enabled": user_rec.mfa_enabled,
        },
    )

# ── Google OAuth ──────────────────────────────────────────────────────────────

@auth_router.post("/google/login")
async def google_login(request: GoogleLoginRequest):
    try:
        google_user_info = await verify_google_token(request.credential)
        email = google_user_info.get("email", "").strip().lower()
        name = google_user_info.get("name", "")
        picture = google_user_info.get("picture")
        google_id = google_user_info.get("sub")

        if not email or not google_id:
            raise HTTPException(status_code=400, detail="Invalid Google token: missing required fields")

        if not is_email_allowed(email):
            raise HTTPException(
                status_code=403,
                detail="Access denied. This application is restricted to invited users only.",
            )

        with db_session() as db:
            user_rec = db.query(UserRecord).filter_by(google_id=google_id).first()
            if user_rec:
                user_rec.email = email
                user_rec.name = name
                user_rec.picture = picture
                user_rec.last_login = datetime.utcnow()
            else:
                user_rec = UserRecord(
                    google_id=google_id, email=email, name=name, picture=picture,
                    role="assessor", mfa_enabled=False,
                    created_at=datetime.utcnow(), last_login=datetime.utcnow(),
                )
                db.add(user_rec)
            db.flush()
            if user_rec.mfa_enabled:
                return MfaRequiredResponse()
            response = _build_token(user_rec)

        audit_service.log_action(action="LOGIN", user_email=email, user_name=name,
                                 entity_type="user", entity_id=email, detail={"method": "google"})
        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

# ── Email / Password ──────────────────────────────────────────────────────────

@auth_router.post("/register", status_code=201)
async def register(request: RegisterRequest):
    """Register a new user with email + password."""
    if not is_email_allowed(request.email):
        raise HTTPException(
            status_code=403,
            detail="Access denied. This application is restricted to invited users only.",
        )
    with db_session() as db:
        existing = db.query(UserRecord).filter_by(email=request.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        user_rec = UserRecord(
            id=str(uuid.uuid4()),
            google_id=None,
            email=request.email,
            name=request.name.strip(),
            password_hash=hash_password(request.password),
            role="assessor",
            mfa_enabled=False,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow(),
        )
        db.add(user_rec)
        db.flush()
        response = _build_token(user_rec)

    audit_service.log_action(action="REGISTER", user_email=request.email,
                             user_name=request.name, entity_type="user",
                             entity_id=request.email, detail={"method": "email"})
    return response


@auth_router.post("/login")
async def login_password(request: LoginPasswordRequest):
    """Login with email + password."""
    if not is_email_allowed(request.email):
        raise HTTPException(
            status_code=403,
            detail="Access denied. This application is restricted to invited users only.",
        )
    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=request.email).first()
        if not user_rec or not user_rec.password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(request.password, user_rec.password_hash):
            audit_service.log_action(action="LOGIN_FAILED", user_email=request.email,
                                     entity_type="user", entity_id=request.email, detail={"method": "email"})
            raise HTTPException(status_code=401, detail="Invalid credentials")
        user_rec.last_login = datetime.utcnow()
        if user_rec.mfa_enabled:
            return MfaRequiredResponse()
        response = _build_token(user_rec)

    audit_service.log_action(action="LOGIN", user_email=request.email,
                             user_name=user_rec.name, entity_type="user",
                             entity_id=request.email, detail={"method": "email"})
    return response

# ── TOTP / MFA ────────────────────────────────────────────────────────────────

@auth_router.post("/mfa/setup")
async def mfa_setup(current_user: User = Depends(get_current_user)):
    """Generate TOTP secret and QR code for the current user."""
    try:
        import pyotp, qrcode, io, base64
    except ImportError:
        raise HTTPException(status_code=500, detail="MFA libraries not installed")

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name="ClearComply")
    qr = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=current_user.email).first()
        if not user_rec:
            raise HTTPException(status_code=404, detail="User not found")
        user_rec.totp_secret = secret

    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri,
        "qr_code_png_base64": qr_b64,
        "message": "Scan QR code in your authenticator app, then POST to /mfa/confirm with a valid code.",
    }


@auth_router.post("/mfa/confirm")
async def mfa_confirm(request: MfaSetupConfirmRequest, current_user: User = Depends(get_current_user)):
    """Confirm TOTP code to activate MFA."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=500, detail="pyotp not installed")

    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=current_user.email).first()
        if not user_rec or not user_rec.totp_secret:
            raise HTTPException(status_code=400, detail="Call /mfa/setup first")
        if not pyotp.TOTP(user_rec.totp_secret).verify(request.totp_code, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid TOTP code")
        user_rec.mfa_enabled = True

    audit_service.log_action(action="MFA_ENABLED", user_email=current_user.email,
                             user_name=current_user.name, entity_type="user", entity_id=current_user.email)
    return {"message": "MFA enabled successfully"}


class MfaDisableRequest(BaseModel):
    totp_code: str

@auth_router.post("/mfa/disable")
async def mfa_disable(request: MfaDisableRequest, current_user: User = Depends(get_current_user)):
    """Disable MFA — requires a valid TOTP code to confirm intent."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=500, detail="pyotp not installed")

    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=current_user.email).first()
        if not user_rec or not user_rec.mfa_enabled:
            raise HTTPException(status_code=400, detail="MFA is not enabled for this account")
        if not user_rec.totp_secret or not pyotp.TOTP(user_rec.totp_secret).verify(request.totp_code, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid TOTP code")
        user_rec.mfa_enabled = False
        user_rec.totp_secret = None
    audit_service.log_action(action="MFA_DISABLED", user_email=current_user.email,
                             user_name=current_user.name, entity_type="user", entity_id=current_user.email)
    return {"message": "MFA disabled"}


@auth_router.post("/mfa/verify")
async def mfa_verify(request: MfaVerifyRequest):
    """Complete login when MFA is required (email+password or google_token flow)."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=500, detail="pyotp not installed")

    if not is_email_allowed(request.email.strip().lower()):
        raise HTTPException(
            status_code=403,
            detail="Access denied. This application is restricted to invited users only.",
        )

    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=request.email.strip().lower()).first()
        if not user_rec:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if request.password:
            if not user_rec.password_hash or not verify_password(request.password, user_rec.password_hash):
                raise HTTPException(status_code=401, detail="Invalid credentials")
        elif request.google_token:
            info = await verify_google_token(request.google_token)
            if info.get("email", "").lower() != user_rec.email:
                raise HTTPException(status_code=401, detail="Google token email mismatch")
        else:
            raise HTTPException(status_code=400, detail="Provide password or google_token")

        if not user_rec.totp_secret:
            raise HTTPException(status_code=400, detail="MFA not configured")
        if not pyotp.TOTP(user_rec.totp_secret).verify(request.totp_code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")

        user_rec.last_login = datetime.utcnow()
        response = _build_token(user_rec)

    audit_service.log_action(action="LOGIN", user_email=user_rec.email,
                             user_name=user_rec.name, entity_type="user",
                             entity_id=user_rec.email, detail={"method": "mfa"})
    return response

# ── Current user / session ────────────────────────────────────────────────────

@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=current_user.email).first()
        mfa_enabled = user_rec.mfa_enabled if user_rec else False
    return UserResponse(
        email=current_user.email, name=current_user.name,
        picture=current_user.picture, role=current_user.role, mfa_enabled=mfa_enabled,
    )


@auth_router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    audit_service.log_action(action="LOGOUT", user_email=current_user.email,
                             user_name=current_user.name, entity_type="user", entity_id=current_user.email)
    return {"message": "Successfully logged out"}

# ── User management (admin only) ──────────────────────────────────────────────

@auth_router.patch("/users/{email}/role")
async def update_user_role(email: str, body: RoleUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin role required")
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(VALID_ROLES)}")
    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=email).first()
        if not user_rec:
            raise HTTPException(status_code=404, detail="User not found")
        old_role = user_rec.role
        user_rec.role = body.role
    audit_service.log_action(action="UPDATE_ROLE", user_email=current_user.email,
                             user_name=current_user.name, entity_type="user",
                             entity_id=email, detail={"old_role": old_role, "new_role": body.role})
    return {"email": email, "role": body.role}


@auth_router.get("/users")
async def list_users(current_user: User = Depends(get_current_user)):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin role required")
    with db_session() as db:
        users = db.query(UserRecord).all()
        return [
            {"email": u.email, "name": u.name, "role": u.role,
             "mfa_enabled": u.mfa_enabled,
             "lastLogin": u.last_login.isoformat() if u.last_login else None}
            for u in users
        ]
