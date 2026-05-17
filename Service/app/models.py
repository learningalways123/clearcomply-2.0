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


class Assessment(BaseModel):
    id: str
    name: str
    frameworkIds: List[str]
    selectedControlIds: List[str]
    selectedQuestionIds: List[str] = Field(default=[], description="List of selected question IDs")
    moduleIds: List[str] = Field(default=[], description="List of selected CSF module IDs")
    familyIds: List[str] = Field(default=[], description="List of selected NIST family IDs")
    answers: Dict[str, QuestionAnswer] = Field(default={}, description="Answers keyed by question ID")
    createdAt: datetime
    stats: AssessmentStats
    questionStats: AssessmentQuestionStats = Field(default_factory=lambda: AssessmentQuestionStats(totalQuestions=0, answeredQuestions=0, completionPercent=0.0))


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


class AssessmentSummaryResponse(BaseModel):
    id: str
    name: str
    totalQuestions: int
    answeredQuestions: int
    completionPercent: float


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


# CSF Module Model
class Module(BaseModel):
    moduleId: str
    moduleName: str
    questionCount: int
