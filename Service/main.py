"""
Clear Comply - FastAPI Backend Service
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import os
from dotenv import load_dotenv

# Import our routes
from app.routes import router as api_router
from app.auth_routes import auth_router
from app.database import init_db

# Load environment variables
load_dotenv()

# Create FastAPI instance
app = FastAPI(
    title="Clear Comply API",
    description="Backend service for Clear Comply compliance management application",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Configure CORS - Updated to include localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React default port
        "http://localhost:5173",   # Vite default port
        "http://localhost:5174",   # Vite alternative port
        "http://localhost:6000",   # Custom Vite port
        "http://localhost:8080",   # Alternative development port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(auth_router)
app.include_router(api_router)


@app.on_event("startup")
async def startup():
    init_db()
    print("[startup] Database initialized")
    from app.seed_data import seed_demo_data
    seed_demo_data()

# Pydantic models for existing endpoints
class HealthResponse(BaseModel):
    status: str
    message: str
    version: str

class MessageRequest(BaseModel):
    message: str

class MessageResponse(BaseModel):
    response: str
    timestamp: str

# Existing routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Clear Comply API is running!", "docs": "/api/docs"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="Clear Comply API is running smoothly",
        version="1.0.0"
    )

@app.get("/api/status")
async def api_status():
    """API status endpoint"""
    return {
        "api": "Clear Comply",
        "status": "operational",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "features": [
            "Frameworks Management",
            "Controls Management", 
            "Assessment Creation",
            "Assessment History"
        ]
    }

@app.post("/api/message", response_model=MessageResponse)
async def process_message(request: MessageRequest):
    """Example endpoint to process messages"""
    from datetime import datetime
    
    return MessageResponse(
        response=f"Received: {request.message}",
        timestamp=datetime.now().isoformat()
    )

if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload
    )
