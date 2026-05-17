"""
SQLite database engine, session factory, and initialisation helpers.
SQLite is stored at Service/clearcomply.db (path configurable via DATABASE_URL env var).
"""

import os
from contextlib import contextmanager
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Default: SQLite file next to the service root.  Override with DATABASE_URL=sqlite:///path
_raw = os.getenv("DATABASE_URL", "")
if not _raw:
    _service_dir = os.path.dirname(os.path.dirname(__file__))
    _raw = f"sqlite:///{os.path.join(_service_dir, 'clearcomply.db')}"

DATABASE_URL = _raw

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite
    echo=False,
)

# Enable WAL mode and foreign keys on every new connection
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(conn, _record):
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Context manager for use outside FastAPI (e.g. DataStore methods)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist yet.  Called once on app startup."""
    # Import here to ensure models are registered on Base before create_all
    import app.db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print(f"[DB] SQLite initialised at: {DATABASE_URL}")
