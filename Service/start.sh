#!/bin/sh
# Entrypoint for Cloud Run (and Docker generally).
# 1. Runs Alembic migrations so the DB schema is always up to date on deploy.
# 2. Starts uvicorn on the PORT injected by Cloud Run (defaults to 8000).

set -e

echo "[start.sh] Running database migrations..."

# Run migrations. If the DB already has tables but no alembic_version record
# (e.g. created by SQLAlchemy create_all during local dev and accidentally
# packaged into the image), stamp the current state as head first, then
# re-run so any newer migrations are still applied.
if ! alembic upgrade head 2>&1; then
  echo "[start.sh] Initial migration failed — DB may have pre-existing tables."
  echo "[start.sh] Stamping current schema as head and retrying..."
  alembic stamp head
  alembic upgrade head
fi

echo "[start.sh] Starting server on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
