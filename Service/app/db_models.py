"""
SQLAlchemy ORM table definitions for Clear Comply.

Tables:
  users        — authenticated users with roles (Google OAuth + email/password)
  assessments  — assessment metadata + aggregated stats
  answers      — one row per (assessment, question) with yes/no + narrative
  audit_log    — append-only log of every user action
  poam_items   — Plan of Action & Milestones
  evidence     — uploaded evidence files linked to assessments/controls
"""

import json
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


def _new_id() -> str:
    return str(uuid.uuid4())


class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_new_id)
    google_id = Column(String, unique=True, nullable=True, index=True)   # nullable for email/pass users
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    # Roles: platform_admin | org_admin | lead_assessor | assessor | reviewer | auditor
    role = Column(String, nullable=False, default="assessor")
    # Email/password auth
    password_hash = Column(String, nullable=True)
    # TOTP/MFA
    totp_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessments = relationship("AssessmentRecord", back_populates="creator", foreign_keys="AssessmentRecord.created_by_email")


class ProjectRecord(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=_new_id)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_email = Column(String, ForeignKey("users.email"), nullable=True)

    creator = relationship("UserRecord", backref="projects")
    ssps = relationship("AssessmentRecord", back_populates="project", cascade="all, delete-orphan")


class AssessmentRecord(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True, default=_new_id)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
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
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    assessment_type = Column(String, nullable=True, default="ssp")

    # Aggregated stats (kept in sync on every answer submission)
    total_controls = Column(Integer, default=0)
    selected_controls_count = Column(Integer, default=0)
    coverage_percent = Column(Float, default=0.0)
    total_questions = Column(Integer, default=0)
    answered_questions = Column(Integer, default=0)
    completion_percent = Column(Float, default=0.0)

    # Scoping data (Phase 3 additions)
    soc2_assessment_type = Column(String, nullable=True)
    soc2_categories = Column(Text, nullable=True, default="[]")
    nist_confidentiality = Column(String, nullable=True)
    nist_integrity = Column(String, nullable=True)
    nist_availability = Column(String, nullable=True)
    nist_baseline = Column(String, nullable=True)
    diagram_filename = Column(String, nullable=True)
    diagram_storage_path = Column(String, nullable=True)


    creator = relationship("UserRecord", back_populates="assessments", foreign_keys=[created_by_email])
    project = relationship("ProjectRecord", back_populates="ssps")
    answers = relationship("AnswerRecord", back_populates="assessment", cascade="all, delete-orphan")
    checklist_items = relationship("ChecklistItemRecord", back_populates="assessment", cascade="all, delete-orphan")
    intake_teams = relationship("IntakeTeamRecord", back_populates="assessment", cascade="all, delete-orphan")
    risk_questions = relationship("RiskQuestionRecord", back_populates="assessment", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItemRecord", back_populates="assessment", cascade="all, delete-orphan")
    workbook = relationship("SSPWorkbookRecord", back_populates="assessment", uselist=False, cascade="all, delete-orphan")

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

    # Basic answer fields
    yes_no = Column(String, nullable=True)
    justification = Column(Text, nullable=True)
    value = Column(Text, nullable=True)

    # Extended answer fields (Phase 2 — Answer Type Expansion)
    # NIST 800-53: Implemented | Partially Implemented | Planned | Alternative
    # Implementation | Not Implemented | Not Applicable | Inherited | N/A
    implementation_status = Column(String, nullable=True)
    # Free-form implementation description
    implementation_description = Column(Text, nullable=True)
    # Responsible role (e.g. "Security Operations")
    responsible_role = Column(String, nullable=True)
    # Assessment methods: JSON list e.g. ["examine", "interview", "test"]
    assessment_methods = Column(Text, nullable=True)
    # Inherited control toggle + provider
    inherited = Column(Boolean, nullable=False, default=False)
    inherited_from = Column(String, nullable=True)
    # SOC 2: design / operating effectiveness
    design_effectiveness = Column(String, nullable=True)   # Effective | Partially | Not Effective | N/A
    operating_effectiveness = Column(String, nullable=True) # Effective | Partially | Not Effective | N/A
    # CSF: current / target tier (1-4)
    current_tier = Column(Integer, nullable=True)
    target_tier = Column(Integer, nullable=True)
    # Gap notes (CSF) / testing notes (SOC 2)
    internal_notes = Column(Text, nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_email = Column(String, nullable=True)

    assessment = relationship("AssessmentRecord", back_populates="answers")


class AssessmentStateHistory(Base):
    """Immutable log of every status transition for an assessment."""
    __tablename__ = "assessment_state_history"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String, nullable=True)   # null on first transition
    to_status = Column(String, nullable=False)
    changed_by_email = Column(String, nullable=True)
    changed_by_name = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assessment = relationship("AssessmentRecord", backref="state_history")


class CsfProfileRecord(Base):
    """CSF 2.0 Profile: current / target tier per function per assessment."""
    __tablename__ = "csf_profiles"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    function_id = Column(String, nullable=False)      # GV | ID | PR | DE | RS | RC
    function_name = Column(String, nullable=True)
    current_tier = Column(Integer, nullable=False, default=1)
    target_tier = Column(Integer, nullable=False, default=1)
    gap_description = Column(Text, nullable=True)
    priority = Column(String, nullable=True)   # P1 | P2 | P3
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessment = relationship("AssessmentRecord", backref="csf_profiles")


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


class EvidenceRecord(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    # Optional link to a specific question/control
    question_id = Column(String, nullable=True, index=True)
    control_ref = Column(String, nullable=True)

    # File metadata
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)     # bytes
    mime_type = Column(String, nullable=True)
    storage_path = Column(String, nullable=False)   # path on disk

    # Expiry / validity tracking
    as_of_date = Column(String, nullable=True)       # ISO date "YYYY-MM-DD"
    expiry_date = Column(String, nullable=True)      # ISO date "YYYY-MM-DD"
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)               # JSON array of tag strings

    uploaded_by_email = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assessment = relationship("AssessmentRecord", backref="evidence_files")


class ChecklistItemRecord(Base):
    __tablename__ = "ssp_checklist"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="not_started") # complete | in_progress | not_started
    target_link = Column(String, nullable=True)

    assessment = relationship("AssessmentRecord", back_populates="checklist_items")


class IntakeTeamRecord(Base):
    __tablename__ = "ssp_intake_teams"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    lead_name = Column(String, nullable=False)
    lead_email = Column(String, nullable=False)
    response_rate = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="in_progress") # complete | in_progress | overdue
    last_active_days_ago = Column(Integer, nullable=False, default=0)
    families = Column(Text, nullable=True)
    due_date = Column(String, nullable=True)  # stored as ISO date string "YYYY-MM-DD"

    assessment = relationship("AssessmentRecord", back_populates="intake_teams")


class RiskQuestionRecord(Base):
    __tablename__ = "ssp_risk_questions"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    mapped_control = Column(String, nullable=True)
    response = Column(String, nullable=False, default="None") # Full | Partial | None | N/A
    points_missed = Column(Integer, nullable=False, default=0)

    assessment = relationship("AssessmentRecord", back_populates="risk_questions")


class InventoryItemRecord(Base):
    __tablename__ = "ssp_inventory_items"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Active")
    owner = Column(String, nullable=True)

    assessment = relationship("AssessmentRecord", back_populates="inventory_items")


class SSPWorkbookRecord(Base):
    __tablename__ = "ssp_workbooks"

    id = Column(String, primary_key=True, default=_new_id)
    assessment_id = Column(String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    cover_page = Column(JSON, nullable=True)
    checklist = Column(JSON, nullable=True)
    contacts_info = Column(JSON, nullable=True)
    risk_assessment = Column(JSON, nullable=True)
    data_categorization = Column(JSON, nullable=True)
    environments = Column(JSON, nullable=True)
    inventory = Column(JSON, nullable=True)
    diagrams = Column(JSON, nullable=True)
    scanning = Column(JSON, nullable=True)
    controls = Column(JSON, nullable=True)
    findings_extra = Column(JSON, nullable=True)
    firewall = Column(JSON, nullable=True)
    additional_resources = Column(JSON, nullable=True)
    revision_history = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessment = relationship("AssessmentRecord", back_populates="workbook")


