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
ASSESSMENT_STATUSES = ["draft", "in_progress", "submitted", "reviewed"]
STATUS_TRANSITIONS: Dict[str, List[str]] = {
    "draft": ["in_progress"],
    "in_progress": ["submitted"],
    "submitted": ["reviewed", "in_progress"],
    "reviewed": [],
}


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


# Request/Response Models
class CreateAssessmentRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Assessment name")
    frameworkIds: List[str] = Field(..., min_items=1, description="List of framework IDs")
    selectedControlIds: List[str] = Field(default=[], description="List of selected control IDs")
    selectedQuestionIds: List[str] = Field(default=[], description="List of selected question IDs")
    moduleIds: List[str] = Field(default=[], description="List of selected CSF module IDs")
    familyIds: List[str] = Field(default=[], description="List of selected NIST family IDs")


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


class AnswerSubmission(BaseModel):
    questionId: str
    value: Optional[str] = None  # For text/yes_no questions
    yesNo: Optional[str] = None  # For yes_no_justification questions
    justification: Optional[str] = None  # For yes_no_justification questions


class SubmitAnswersRequest(BaseModel):
    answers: List[AnswerSubmission]


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="New status: draft | in_progress | submitted | reviewed")


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
    functionId: Optional[str] = None  # For CSF questions
    functionName: Optional[str] = None  # For CSF questions
    subcategoryText: Optional[str] = None  # For CSF questions
    answerValue: Optional[str] = None
    answerYesNo: Optional[str] = None
    answerJustification: Optional[str] = None


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
    assessmentId: str
    questionId: Optional[str] = None
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    priority: str = "medium"
    dueDate: Optional[str] = None
    owner: Optional[str] = None


class UpdatePoamRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    owner: Optional[str] = None


# CSF Module Model
class Module(BaseModel):
    moduleId: str
    moduleName: str
    questionCount: int
