"""
Authentication API routes
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

from app.auth import (
    verify_google_token, 
    create_access_token, 
    get_current_user,
    User,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

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
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "email": email,
                "name": name,
                "picture": picture,
                "google_id": google_id,
                "role": "assessor"  # Default role - can be updated later with database
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
                "role": "assessor"
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
    """
    Logout endpoint (client should discard the token)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        dict: Success message
    """
    return {"message": "Successfully logged out"}
