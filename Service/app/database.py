"""
Database engine, session factory, and initialisation helpers.

Default (local dev): SQLite at Service/clearcomply.db
With Docker Postgres : set DATABASE_URL=postgresql://clearcomply:clearcomply_dev@localhost:5432/clearcomply
                       (the docker-compose.dev.yml sets this automatically for the backend-dev container)
"""

import os
from contextlib import contextmanager
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Resolve DATABASE_URL — prefer env var, fall back to local SQLite
_raw = os.getenv("DATABASE_URL", "")
if not _raw:
    _service_dir = os.path.dirname(os.path.dirname(__file__))
    _raw = f"sqlite:///{os.path.join(_service_dir, 'clearcomply.db')}"

DATABASE_URL = _raw
_is_sqlite = DATABASE_URL.startswith("sqlite")

# Build engine — SQLite needs check_same_thread; Postgres does not
_engine_kwargs: dict = {}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Small pool per instance — Cloud Run scales horizontally, so each instance
    # should hold few connections to avoid exhausting Cloud SQL's limit.
    # db-f1-micro allows 25 total; 2 + 3 overflow = 5 per instance → safe up to ~5 instances.
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_size"] = 2
    _engine_kwargs["max_overflow"] = 3

engine = create_engine(DATABASE_URL, echo=False, **_engine_kwargs)

# SQLite-only pragmas (WAL mode + foreign key enforcement)
if _is_sqlite:
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
    """
    Create all tables that don't exist yet.

    For SQLite (local dev without Docker) this is still the quick path.
    For PostgreSQL the preferred workflow is `alembic upgrade head`, but
    create_all() is kept as a safe fallback so the app starts cleanly even
    if migrations haven't been run yet.
    """
    import app.db_models  # noqa: F401 — registers models on Base
    Base.metadata.create_all(bind=engine)
    db_type = "PostgreSQL" if not _is_sqlite else "SQLite"
    print(f"[DB] {db_type} initialised at: {DATABASE_URL}")
