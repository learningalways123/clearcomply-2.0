"""
SQLAlchemy ORM table definitions for Clear Comply.

Tables:
  users        — authenticated users with roles
  assessments  — assessment metadata + aggregated stats
  answers      — one row per (assessment, question) with yes/no + narrative
  audit_log    — append-only log of every user action
"""

import json
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _new_id() -> str:
    return str(uuid.uuid4())


class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_new_id)
    google_id = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    # Roles: platform_admin | org_admin | lead_assessor | assessor | reviewer | auditor
    role = Column(String, nullable=False, default="assessor")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessments = relationship("AssessmentRecord", back_populates="creator", foreign_keys="AssessmentRecord.created_by_email")


class AssessmentRecord(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True, default=_new_id)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="in_progress")

    # JSON-encoded lists
    framework_ids = Column(Text, nullable=False, default="[]")
    selected_control_ids = Column(Text, nullable=False, default="[]")
    selected_question_ids = Column(Text, nullable=False, default="[]")
    module_ids = Column(Text, nullable=False, default="[]")
    family_ids = Column(Text, nullable=False, default="[]")

    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_email = Column(String, ForeignKey("users.email"), nullable=True)

    # Aggregated stats (kept in sync on every answer submission)
    total_controls = Column(Integer, default=0)
    selected_controls_count = Column(Integer, default=0)
    coverage_percent = Column(Float, default=0.0)
    total_questions = Column(Integer, default=0)
    answered_questions = Column(Integer, default=0)
    completion_percent = Column(Float, default=0.0)

    creator = relationship("UserRecord", back_populates="assessments", foreign_keys=[created_by_email])
    answers = relationship("AnswerRecord", back_populates="assessment", cascade="all, delete-orphan")

    # Convenience helpers -------------------------------------------------------
    def framework_ids_list(self):
        return json.loads(self.framework_ids or "[]")

    def selected_control_ids_list(self):
        return json.loads(self.selected_control_ids or "[]")

    def selected_question_ids_list(self):
        return json.loads(self.selected_question_ids or "[]")

    def module_ids_list(self):
        return json.loads(self.module_ids or "[]")

    def family_ids_list(self):
        return json.loads(self.family_ids or "[]")


class AnswerRecord(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, nullable=False, index=True)

    # Yes/No questions
    yes_no = Column(String, nullable=True)
    justification = Column(Text, nullable=True)
    # Plain text questions
    value = Column(Text, nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_email = Column(String, nullable=True)

    assessment = relationship("AssessmentRecord", back_populates="answers")


class AuditLogRecord(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True, default=_new_id)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user_email = Column(String, nullable=True, index=True)
    user_name = Column(String, nullable=True)

    # e.g.  CREATE_ASSESSMENT | SUBMIT_ANSWERS | LOGIN | UPDATE_ROLE
    action = Column(String, nullable=False, index=True)
    # e.g.  assessment | user
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True, index=True)
    # Free-form JSON detail (assessment name, answer counts, old/new role, …)
    detail = Column(Text, nullable=True)


class PoamRecord(Base):
    __tablename__ = "poam_items"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # open | in_remediation | closed
    status = Column(String, nullable=False, default="open")
    # high | medium | low
    priority = Column(String, nullable=False, default="medium")
    due_date = Column(String, nullable=True)   # stored as ISO date string "YYYY-MM-DD"
    owner = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    assessment = relationship("AssessmentRecord", backref="poam_items")
