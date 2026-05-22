#!/bin/sh
# Entrypoint for Cloud Run (and Docker generally).
# 1. Runs Alembic migrations so the DB schema is always up to date on deploy.
# 2. Starts uvicorn on the PORT injected by Cloud Run (defaults to 8000).

set -e

echo "[start.sh] Running database migrations..."
alembic upgrade head

echo "[start.sh] Starting server on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
