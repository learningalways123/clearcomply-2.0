import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# ---------------------------------------------------------------------------
# Ensure Service/ is on sys.path so `app.*` imports work from any CWD
# ---------------------------------------------------------------------------
_service_root = str(Path(__file__).resolve().parent.parent)
if _service_root not in sys.path:
    sys.path.insert(0, _service_root)

# Import Base + all ORM models so Alembic can autogenerate migrations
from app.database import Base  # noqa: E402
import app.db_models  # noqa: E402, F401  -- registers all models on Base

# ---------------------------------------------------------------------------
# Alembic config
# ---------------------------------------------------------------------------
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override sqlalchemy.url with DATABASE_URL env var.
# Falls back to local SQLite so plain `alembic` commands still work offline.
_db_url = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{_service_root}/clearcomply.db",
)
config.set_main_option("sqlalchemy.url", _db_url)


# ---------------------------------------------------------------------------
# Migration runners
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (emits SQL script)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
