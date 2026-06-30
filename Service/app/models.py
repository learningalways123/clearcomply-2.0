"""
Data models and schemas for Clear Comply API
"""

from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class CriticalityLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class AnswerType(str, Enum):
    TEXT = "text"
    YES_NO = "yes_no"
    YES_NO_JUSTIFICATION = "yes_no_justification"
    MULTIPLE_CHOICE = "multiple_choice"
    NUMERIC = "numeric"


# Framework Models
class Framework(BaseModel):
    id: str
    name: str
    description: str


# Family Models
class Family(BaseModel):
    id: str
    familyId: str
    familyName: str
    frameworkId: str


# Question Models  
class Question(BaseModel):
    id: str
    frameworkId: str
    familyId: str
    familyName: str
    controlRefs: List[str] = Field(default=[], description="Related control references")
    questionText: str
    stakeholderRoleId: str
    answerType: AnswerType
    criticality: CriticalityLevel
    functionId: Optional[str] = None  # For CSF questions
    functionName: Optional[str] = None  # For CSF questions
    subcategoryText: Optional[str] = None  # For CSF questions


# Question Bank Model
class QuestionBank(BaseModel):
    frameworkId: str
    questions: List[Question]


# Control Models
class Control(BaseModel):
    id: str
    frameworkId: str
    domain: str
    title: str
    description: str
    criticality: CriticalityLevel


# Assessment Models
class AssessmentStats(BaseModel):
    totalControls: int
    selectedControls: int
    coveragePercent: float = Field(..., description="Coverage percentage rounded to 2 decimal places")


class QuestionAnswer(BaseModel):
    value: str = Field(default="", description="Answer value for text/yes_no questions")
    yesNo: Optional[str] = Field(default=None, description="Yes/No/Not applicable answer")
    justification: Optional[str] = Field(default=None, description="Justification text")
    lastUpdated: datetime


class AssessmentQuestionStats(BaseModel):
    totalQuestions: int
    answeredQuestions: int
    completionPercent: float = Field(..., description="Completion percentage rounded to 2 decimal places")


# Valid assessment status values and their allowed forward transitions
ASSESSMENT_STATUSES = ["draft", "in_progress", "submitted", "reviewed", "remediation", "completed", "archived"]
STATUS_TRANSITIONS: Dict[str, List[str]] = {
    "draft":        ["in_progress"],
    "in_progress":  ["submitted"],
    "submitted":    ["reviewed", "in_progress"],     # reviewer can send back
    "reviewed":     ["completed", "remediation"],   # approve or send to remediation
    "remediation":  ["submitted"],                   # re-submit after fixes
    "completed":    ["archived"],
    "archived":     [],
}
# Statuses where answers are locked (read-only)
LOCKED_STATUSES = {"submitted", "reviewed", "completed", "archived"}


class Assessment(BaseModel):
    id: str
    name: str
    status: str = "in_progress"
    frameworkIds: List[str]
    selectedControlIds: List[str]
    selectedQuestionIds: List[str] = Field(default=[], description="List of selected question IDs")
    moduleIds: List[str] = Field(default=[], description="List of selected CSF module IDs")
    familyIds: List[str] = Field(default=[], description="List of selected NIST family IDs")
    answers: Dict[str, QuestionAnswer] = Field(default={}, description="Answers keyed by question ID")
    createdAt: datetime
    stats: AssessmentStats
    questionStats: AssessmentQuestionStats = Field(default_factory=lambda: AssessmentQuestionStats(totalQuestions=0, answeredQuestions=0, completionPercent=0.0))
    riskScore: Optional[float] = Field(default=None, description="Weighted compliance risk score 0-100 (higher = more compliant)")
    soc2AssessmentType: Optional[str] = Field(default=None, description="SOC 2 Assessment Type: Type I | Type II")
    soc2Categories: List[str] = Field(default=[], description="Selected SOC 2 Trust Services Categories")
    nistConfidentiality: Optional[str] = Field(default=None, description="NIST FIPS 199 Confidentiality impact: Low | Moderate | High")
    nistIntegrity: Optional[str] = Field(default=None, description="NIST FIPS 199 Integrity impact: Low | Moderate | High")
    nistAvailability: Optional[str] = Field(default=None, description="NIST FIPS 199 Availability impact: Low | Moderate | High")
    nistBaseline: Optional[str] = Field(default=None, description="NIST Calculated Baseline: Low | Moderate | High")
    diagramFilename: Optional[str] = Field(default=None, description="Uploaded data flow diagram filename")



# Request/Response Models
class CreateAssessmentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Assessment name")
    frameworkIds: List[str] = Field(..., min_items=1, max_items=20, description="List of framework IDs")
    selectedControlIds: List[str] = Field(default=[], max_items=1000, description="List of selected control IDs")
    selectedQuestionIds: List[str] = Field(default=[], max_items=2000, description="List of selected question IDs")
    moduleIds: List[str] = Field(default=[], max_items=20, description="List of selected CSF module IDs")
    familyIds: List[str] = Field(default=[], max_items=100, description="List of selected NIST family IDs")
    soc2AssessmentType: Optional[str] = Field(default=None, description="SOC 2 Assessment Type: Type I | Type II")
    soc2Categories: List[str] = Field(default=[], description="Selected SOC 2 Trust Services Categories")
    nistConfidentiality: Optional[str] = Field(default=None, description="NIST FIPS 199 Confidentiality impact: Low | Moderate | High")
    nistIntegrity: Optional[str] = Field(default=None, description="NIST FIPS 199 Integrity impact: Low | Moderate | High")
    nistAvailability: Optional[str] = Field(default=None, description="NIST FIPS 199 Availability impact: Low | Moderate | High")



class AssessmentResponse(BaseModel):
    id: str
    name: str
    status: str = "in_progress"
    riskScore: Optional[float] = None
    frameworkIds: List[str]
    selectedControlIds: List[str]
    selectedQuestionIds: List[str]
    moduleIds: List[str] = Field(default=[], description="List of selected CSF module IDs")
    familyIds: List[str] = Field(default=[], description="List of selected NIST family IDs")
    createdAt: str  # ISO8601 string format
    stats: AssessmentStats
    questionStats: AssessmentQuestionStats
    soc2AssessmentType: Optional[str] = Field(default=None, description="SOC 2 Assessment Type: Type I | Type II")
    soc2Categories: List[str] = Field(default=[], description="Selected SOC 2 Trust Services Categories")
    nistConfidentiality: Optional[str] = Field(default=None, description="NIST FIPS 199 Confidentiality impact: Low | Moderate | High")
    nistIntegrity: Optional[str] = Field(default=None, description="NIST FIPS 199 Integrity impact: Low | Moderate | High")
    nistAvailability: Optional[str] = Field(default=None, description="NIST FIPS 199 Availability impact: Low | Moderate | High")
    nistBaseline: Optional[str] = Field(default=None, description="NIST Calculated Baseline: Low | Moderate | High")



class AnswerSubmission(BaseModel):
    questionId: str = Field(..., min_length=1, max_length=200)
    value: Optional[str] = Field(default=None, max_length=10000)
    yesNo: Optional[str] = Field(default=None, pattern=r'^(yes|no|Yes|No|YES|NO|Not applicable|N/A|na|NA)$')
    justification: Optional[str] = Field(default=None, max_length=5000)
    # Extended fields (Phase 2)
    implementationStatus: Optional[str] = Field(default=None, max_length=100)
    implementationDescription: Optional[str] = Field(default=None, max_length=10000)
    responsibleRole: Optional[str] = Field(default=None, max_length=200)
    assessmentMethods: Optional[List[str]] = Field(default=None)
    inherited: Optional[bool] = Field(default=None)
    inheritedFrom: Optional[str] = Field(default=None, max_length=200)
    designEffectiveness: Optional[str] = Field(default=None, max_length=100)
    operatingEffectiveness: Optional[str] = Field(default=None, max_length=100)
    currentTier: Optional[int] = Field(default=None, ge=1, le=4)
    targetTier: Optional[int] = Field(default=None, ge=1, le=4)
    internalNotes: Optional[str] = Field(default=None, max_length=5000)


class SubmitAnswersRequest(BaseModel):
    answers: List[AnswerSubmission]


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., pattern=r'^(draft|in_progress|submitted|reviewed|remediation|completed|archived)$',
                        description="New status: draft | in_progress | submitted | reviewed | remediation | completed | archived")
    note: Optional[str] = Field(default=None, max_length=1000, description="Optional note for audit log")


class AssessmentSummaryResponse(BaseModel):
    id: str
    name: str
    status: str = "in_progress"
    totalQuestions: int
    answeredQuestions: int
    completionPercent: float
    riskScore: Optional[float] = None


class QuestionWithAnswer(BaseModel):
    id: str
    familyId: str
    familyName: str
    controlRefs: List[str]
    questionText: str
    stakeholderRoleId: str
    answerType: AnswerType
    criticality: CriticalityLevel
    functionId: Optional[str] = None
    functionName: Optional[str] = None
    subcategoryText: Optional[str] = None
    answerValue: Optional[str] = None
    answerYesNo: Optional[str] = None
    answerJustification: Optional[str] = None
    # Extended answer fields (Phase 2)
    implementationStatus: Optional[str] = None
    implementationDescription: Optional[str] = None
    responsibleRole: Optional[str] = None
    assessmentMethods: Optional[List[str]] = None
    inherited: Optional[bool] = None
    inheritedFrom: Optional[str] = None
    designEffectiveness: Optional[str] = None
    operatingEffectiveness: Optional[str] = None
    currentTier: Optional[int] = None
    targetTier: Optional[int] = None
    internalNotes: Optional[str] = None


# Error Response Models
class ErrorResponse(BaseModel):
    detail: str
    error_type: str = "validation_error"


class NotFoundResponse(BaseModel):
    detail: str
    error_type: str = "not_found"


# POA&M models
class PoamItem(BaseModel):
    id: str
    assessmentId: str
    questionId: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str = "open"           # open | in_remediation | closed
    priority: str = "medium"       # high | medium | low
    dueDate: Optional[str] = None  # ISO date string
    owner: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    closedAt: Optional[datetime] = None


class CreatePoamRequest(BaseModel):
    assessmentId: str = Field(..., min_length=1, max_length=100)
    questionId: Optional[str] = Field(default=None, max_length=200)
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    priority: str = Field(default="medium", pattern=r'^(high|medium|low)$')
    dueDate: Optional[str] = Field(default=None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    owner: Optional[str] = Field(default=None, max_length=200)


class UpdatePoamRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[str] = Field(default=None, pattern=r'^(open|in_remediation|closed)$')
    priority: Optional[str] = Field(default=None, pattern=r'^(high|medium|low)$')
    dueDate: Optional[str] = Field(default=None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    owner: Optional[str] = Field(default=None, max_length=200)


# CSF Module Model
class Module(BaseModel):
    moduleId: str
    moduleName: str
    questionCount: int


# ─── State History ───────────────────────────────────────────────────────────
class StateHistoryEntry(BaseModel):
    id: str
    assessmentId: str
    fromStatus: Optional[str]
    toStatus: str
    changedByEmail: Optional[str]
    changedByName: Optional[str]
    note: Optional[str]
    createdAt: str


# ─── Risk Scoring ────────────────────────────────────────────────────────────
class DomainRiskScore(BaseModel):
    domain: str
    score: float          # 0-100
    totalControls: int
    answeredControls: int
    highGaps: int
    mediumGaps: int
    lowGaps: int

class RiskScoreResponse(BaseModel):
    assessmentId: str
    overallScore: float
    riskBand: str         # Critical | High | Medium | Low | Minimal
    domainScores: List[DomainRiskScore]
    highGaps: int
    mediumGaps: int
    lowGaps: int
    totalControls: int
    answeredControls: int


# ─── CSF Profile ─────────────────────────────────────────────────────────────
class CsfFunctionProfile(BaseModel):
    functionId: str
    functionName: str
    currentTier: int
    targetTier: int
    gapDescription: Optional[str] = None
    priority: Optional[str] = None   # P1 | P2 | P3

class UpsertCsfProfileRequest(BaseModel):
    profiles: List[CsfFunctionProfile]

class CsfProfileResponse(BaseModel):
    assessmentId: str
    profiles: List[CsfFunctionProfile]
