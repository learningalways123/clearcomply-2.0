"""
Authentication module for Clear Comply
Handles Google OAuth, email/password, TOTP/MFA, and JWT token management
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import os
from pydantic import BaseModel

# Security scheme
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production-use-32-char-min")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("SESSION_TIMEOUT_MINUTES", "240"))  # 4 hours default

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Valid roles
VALID_ROLES = {"platform_admin", "org_admin", "lead_assessor", "assessor", "reviewer", "auditor"}
ADMIN_ROLES = {"platform_admin", "org_admin"}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


class User(BaseModel):
    """User model"""
    email: str
    name: str
    picture: Optional[str] = None
    google_id: str
    role: str = "assessor"


class TokenData(BaseModel):
    """Token payload data"""
    email: str
    name: str
    google_id: str
    role: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def verify_google_token(token: str) -> Dict[str, Any]:
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
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

    return User(
        email=token_data.email,
        name=token_data.name,
        google_id=token_data.google_id,
        role=token_data.role,
        picture=payload.get("picture"),
    )


def require_role(*roles: str):
    """Dependency factory — raises 403 if the user's role is not in the allowed set."""
    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted for this action. Required: {list(roles)}",
            )
        return current_user
    return _checker


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
