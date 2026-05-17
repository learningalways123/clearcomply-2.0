"""
Audit service — append-only writes to audit_log table.
Import and call log_action() from any route that mutates data.
"""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.database import db_session
from app.db_models import AuditLogRecord


def log_action(
    action: str,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Write one immutable audit log entry.

    Args:
        action:      Short action name, e.g. CREATE_ASSESSMENT, SUBMIT_ANSWERS, LOGIN, UPDATE_ROLE
        user_email:  Email of the acting user (None for unauthenticated)
        user_name:   Display name of the acting user
        entity_type: What kind of thing was affected (assessment, user, …)
        entity_id:   ID of the affected entity
        detail:      Any extra JSON-serialisable context
    """
    try:
        with db_session() as db:
            record = AuditLogRecord(
                id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                user_email=user_email,
                user_name=user_name,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                detail=json.dumps(detail) if detail else None,
            )
            db.add(record)
    except Exception as exc:
        # Audit failures must never crash the main request
        print(f"[AUDIT] Failed to write log entry: {exc}")


def get_audit_log(
    limit: int = 100,
    offset: int = 0,
    user_email: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
) -> list:
    """Retrieve audit log entries, newest first."""
    from app.db_models import AuditLogRecord
    from sqlalchemy import desc

    with db_session() as db:
        q = db.query(AuditLogRecord)
        if user_email:
            q = q.filter(AuditLogRecord.user_email == user_email)
        if entity_id:
            q = q.filter(AuditLogRecord.entity_id == entity_id)
        if action:
            q = q.filter(AuditLogRecord.action == action)
        rows = q.order_by(desc(AuditLogRecord.timestamp)).offset(offset).limit(limit).all()
        return [_row_to_dict(r) for r in rows]


def _row_to_dict(r: AuditLogRecord) -> dict:
    return {
        "id": r.id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "userEmail": r.user_email,
        "userName": r.user_name,
        "action": r.action,
        "entityType": r.entity_type,
        "entityId": r.entity_id,
        "detail": json.loads(r.detail) if r.detail else None,
    }
