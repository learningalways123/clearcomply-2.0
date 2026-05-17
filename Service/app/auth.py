"""
Authentication module for Clear Comply
Handles Google OAuth authentication and JWT token management
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
from pydantic import BaseModel

# Security scheme
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 240  # 4 hours

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class User(BaseModel):
    """User model"""
    email: str
    name: str
    picture: Optional[str] = None
    google_id: str
    role: str = "assessor"  # Default role


class TokenData(BaseModel):
    """Token payload data"""
    email: str
    name: str
    google_id: str
    role: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Dictionary containing user data to encode
        expires_delta: Optional token expiration time
        
    Returns:
        str: Encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def verify_google_token(token: str) -> Dict[str, Any]:
    """
    Verify Google OAuth token
    
    Args:
        token: Google ID token
        
    Returns:
        Dict containing user info from Google
        
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        return idinfo
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Dependency to get the current authenticated user from JWT token
    
    Args:
        credentials: HTTP Authorization credentials
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        email: str = payload.get("email")
        name: str = payload.get("name")
        google_id: str = payload.get("google_id")
        role: str = payload.get("role", "assessor")
        
        if email is None or google_id is None:
            raise credentials_exception
            
        token_data = TokenData(email=email, name=name, google_id=google_id, role=role)
        
    except JWTError:
        raise credentials_exception
    
    user = User(
        email=token_data.email,
        name=token_data.name,
        google_id=token_data.google_id,
        role=token_data.role,
        picture=payload.get("picture")
    )
    
    return user


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """
    Dependency to optionally get the current user (doesn't raise exception if not authenticated)
    
    Args:
        credentials: HTTP Authorization credentials
        
    Returns:
        Optional[User]: Current authenticated user or None
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
