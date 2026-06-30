"""
Shared pytest fixtures: in-memory SQLite DB and a fresh DataStore per test.
"""

import os
import pytest

# Point SQLAlchemy at an in-memory database for every test session
os.environ["DATABASE_URL"] = "sqlite://"   # in-memory; no file created


@pytest.fixture(autouse=True)
def reset_db():
    """Re-create all tables in the in-memory DB before each test."""
    # Import here so the env-var override has already taken effect
    from app.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def store():
    """Return a freshly constructed DataStore (in-memory questions + clean DB)."""
    from app.data_store import DataStore
    return DataStore()


@pytest.fixture(autouse=True)
def override_auth():
    """Globally mock the authentication dependency for FastAPI in testing."""
    from main import app
    from app.auth import get_current_user, User
    
    mock_user = User(
        email="demo@clearcomply.io",
        name="Test User",
        google_id="12345",
        role="lead_assessor"
    )

    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()

