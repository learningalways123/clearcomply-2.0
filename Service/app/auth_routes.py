"""
Authentication API routes
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta, datetime

from app.auth import (
    verify_google_token, 
    create_access_token, 
    get_current_user,
    User,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.database import db_session
from app.db_models import UserRecord

# Create auth router
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    """Request model for Google login"""
    credential: str  # Google ID token


class LoginResponse(BaseModel):
    """Response model for login"""
    access_token: str
    token_type: str
    user: dict


class UserResponse(BaseModel):
    """Response model for user info"""
    email: str
    name: str
    picture: Optional[str]
    role: str


@auth_router.post("/google/login", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest):
    """
    Authenticate user with Google OAuth token
    
    Args:
        request: Google login request containing the credential token
        
    Returns:
        LoginResponse: Access token and user information
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Verify Google token and get user info
        google_user_info = await verify_google_token(request.credential)
        
        # Extract user data
        email = google_user_info.get("email")
        name = google_user_info.get("name")
        picture = google_user_info.get("picture")
        google_id = google_user_info.get("sub")
        
        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token: missing required fields"
            )

        # Upsert user in DB and read role
        role = "assessor"
        try:
            with db_session() as db:
                user_rec = db.query(UserRecord).filter_by(google_id=google_id).first()
                if user_rec:
                    user_rec.email = email
                    user_rec.name = name
                    user_rec.picture = picture
                    user_rec.last_login = datetime.utcnow()
                    role = user_rec.role or "assessor"
                else:
                    user_rec = UserRecord(
                        google_id=google_id,
                        email=email,
                        name=name,
                        picture=picture,
                        role="assessor",
                        created_at=datetime.utcnow(),
                        last_login=datetime.utcnow(),
                    )
                    db.add(user_rec)
        except Exception as db_err:
            print(f"[auth] DB upsert failed (non-fatal): {db_err}")

        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "email": email,
                "name": name,
                "picture": picture,
                "google_id": google_id,
                "role": role,
            },
            expires_delta=access_token_expires
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "email": email,
                "name": name,
                "picture": picture,
                "role": role,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Args:
        current_user: Current authenticated user (from JWT token)
        
    Returns:
        UserResponse: Current user information
    """
    return UserResponse(
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        role=current_user.role
    )


@auth_router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint (client should discard the token)"""
    return {"message": "Successfully logged out"}


class RoleUpdate(BaseModel):
    role: str


@auth_router.patch("/users/{email}/role")
async def update_user_role(
    email: str,
    body: RoleUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update a user's role. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    allowed = {"admin", "assessor", "viewer"}
    if body.role not in allowed:
        raise HTTPException(status_code=400, detail=f"Role must be one of {allowed}")
    with db_session() as db:
        user_rec = db.query(UserRecord).filter_by(email=email).first()
        if not user_rec:
            raise HTTPException(status_code=404, detail="User not found")
        user_rec.role = body.role
    return {"email": email, "role": body.role}


@auth_router.get("/users")
async def list_users(current_user: User = Depends(get_current_user)):
    """List all users. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    with db_session() as db:
        users = db.query(UserRecord).all()
        return [
            {"email": u.email, "name": u.name, "role": u.role, "lastLogin": u.last_login.isoformat() if u.last_login else None}
            for u in users
        ]
