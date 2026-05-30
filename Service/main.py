"""
Clear Comply - FastAPI Backend Service
Main application entry point
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any
import os
from dotenv import load_dotenv

# Load environment variables FIRST — before any app modules read os.getenv() at import time
load_dotenv()

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Import our routes
from app.routes import router as api_router
from app.auth_routes import auth_router
from app.database import init_db

# Rate limiter — keyed on client IP
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Disable interactive API docs in production to avoid exposing the full API surface.
# Set ENABLE_API_DOCS=true (e.g. in .env) to re-enable during local development.
_DOCS_ENABLED = os.getenv("ENABLE_API_DOCS", "false").lower() == "true"

# Create FastAPI instance
app = FastAPI(
    title="Clear Comply API",
    description="Backend service for Clear Comply compliance management application",
    version="1.0.0",
    docs_url="/api/docs" if _DOCS_ENABLED else None,
    redoc_url="/api/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://accounts.google.com; "
        "frame-ancestors 'none';"
    )
    return response

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(api_router)


@app.on_event("startup")
async def startup():
    init_db()
    print("[startup] Database initialized")
    from app.seed_data import seed_demo_data
    seed_demo_data()


# ── Health / utility endpoints ────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    message: str
    version: str


@app.get("/")
async def root():
    return {"message": "Clear Comply API is running!"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", message="Clear Comply API is running smoothly", version="1.0.0")


@app.get("/api/status")
async def api_status():
    return {
        "api": "Clear Comply",
        "status": "operational",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "features": [
            "Frameworks Management", "Controls Management",
            "Assessment Creation", "Assessment History",
            "Evidence Management", "POA&M Tracking",
            "Audit Trail", "Role-Based Access Control",
            "MFA / TOTP",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    uvicorn.run("main:app", host=host, port=port, reload=reload)
