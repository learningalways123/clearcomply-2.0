"""
Evidence service — file upload, metadata management, linked to assessments/controls.
Files are stored on the local filesystem under EVIDENCE_STORAGE_PATH.
"""

import json
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException, UploadFile

from app.database import db_session
from app.db_models import EvidenceRecord

# Allowed MIME types
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain", "text/csv",
    "application/zip",
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

# Storage root — override via env var
EVIDENCE_STORAGE_PATH = Path(
    os.getenv("EVIDENCE_STORAGE_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "evidence"))
)


def _ensure_storage() -> Path:
    EVIDENCE_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    return EVIDENCE_STORAGE_PATH


def _row_to_dict(r: EvidenceRecord) -> dict:
    return {
        "id": r.id,
        "assessmentId": r.assessment_id,
        "questionId": r.question_id,
        "controlRef": r.control_ref,
        "filename": r.original_filename,
        "fileSize": r.file_size,
        "mimeType": r.mime_type,
        "asOfDate": r.as_of_date,
        "expiryDate": r.expiry_date,
        "description": r.description,
        "tags": json.loads(r.tags) if r.tags else [],
        "uploadedBy": r.uploaded_by_email,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
    }


async def upload_evidence(
    file: UploadFile,
    assessment_id: str,
    question_id: Optional[str],
    control_ref: Optional[str],
    description: Optional[str],
    as_of_date: Optional[str],
    expiry_date: Optional[str],
    tags: Optional[str],
    uploaded_by_email: Optional[str],
) -> dict:
    # Validate MIME type
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{file.content_type}' not allowed. Allowed types: PDF, images, Office docs, CSV, ZIP.",
        )

    # Read file content and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 25 MB limit")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # Parse tags
    tags_list = []
    if tags:
        try:
            tags_list = json.loads(tags)
            if not isinstance(tags_list, list):
                tags_list = [str(tags)]
        except (json.JSONDecodeError, TypeError):
            tags_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Save file to disk with a UUID-namespaced filename to avoid collisions
    storage_root = _ensure_storage()
    file_id = str(uuid.uuid4())
    suffix = Path(file.filename or "file").suffix
    stored_filename = f"{file_id}{suffix}"
    storage_path = storage_root / stored_filename
    storage_path.write_bytes(content)

    # Persist metadata
    with db_session() as db:
        rec = EvidenceRecord(
            id=file_id,
            assessment_id=assessment_id,
            question_id=question_id,
            control_ref=control_ref,
            filename=stored_filename,
            original_filename=file.filename or stored_filename,
            file_size=len(content),
            mime_type=file.content_type,
            storage_path=str(storage_path),
            as_of_date=as_of_date,
            expiry_date=expiry_date,
            description=description,
            tags=json.dumps(tags_list) if tags_list else None,
            uploaded_by_email=uploaded_by_email,
            created_at=datetime.utcnow(),
        )
        db.add(rec)
        db.flush()
        return _row_to_dict(rec)


def list_evidence(
    assessment_id: Optional[str] = None,
    question_id: Optional[str] = None,
    control_ref: Optional[str] = None,
) -> List[dict]:
    with db_session() as db:
        q = db.query(EvidenceRecord)
        if assessment_id:
            q = q.filter_by(assessment_id=assessment_id)
        if question_id:
            q = q.filter_by(question_id=question_id)
        if control_ref:
            q = q.filter_by(control_ref=control_ref)
        rows = q.order_by(EvidenceRecord.created_at.desc()).all()
        return [_row_to_dict(r) for r in rows]


def get_evidence_file_path(evidence_id: str) -> tuple[str, str]:
    """Return (storage_path, original_filename) or raise 404."""
    with db_session() as db:
        rec = db.query(EvidenceRecord).filter_by(id=evidence_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Evidence not found")
        if not Path(rec.storage_path).exists():
            raise HTTPException(status_code=404, detail="Evidence file missing from storage")
        return rec.storage_path, rec.original_filename


def delete_evidence(evidence_id: str, user_email: Optional[str] = None) -> None:
    with db_session() as db:
        rec = db.query(EvidenceRecord).filter_by(id=evidence_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Evidence not found")
        path = Path(rec.storage_path)
        db.delete(rec)

    # Delete from disk after DB commit
    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass  # Log but don't fail
