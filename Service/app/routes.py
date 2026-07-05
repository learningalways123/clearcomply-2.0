"""
API routes for Clear Comply Service Layer
"""

import os
import shutil
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import json
from app.database import db_session

from app.models import (
    Framework, Control, Assessment, AssessmentStats,
    CreateAssessmentRequest, AssessmentResponse,
    NotFoundResponse, ErrorResponse, Family, Question,
    SubmitAnswersRequest, AssessmentSummaryResponse, QuestionWithAnswer,
    AssessmentQuestionStats, UpdateStatusRequest,
    PoamItem, CreatePoamRequest, UpdatePoamRequest, STATUS_TRANSITIONS, LOCKED_STATUSES,
    RiskScoreResponse, UpsertCsfProfileRequest, CsfProfileResponse, CsfFunctionProfile,
    Project, CreateProjectRequest, SSPWorkbook, UpdateWorkbookSectionRequest,
)
from app.data_store import data_store
from app.auth import get_current_user, require_role, User
from app import audit_service, evidence_service, scoring_service, report_service
from fastapi.responses import FileResponse, Response

# Create router instance
router = APIRouter(prefix="/api", tags=["Clear Comply API"])


import hashlib

def is_soc2_control_in_scope(control_id: str, categories: List[str]) -> bool:
    if not control_id.startswith("SOC2-"):
        return True
    cats = [c.lower() for c in categories]
    # CC = Common Criteria / Security, A = Availability, C = Confidentiality, PI = Processing Integrity, P = Privacy
    if "cc" in control_id.lower() and ("security" in cats or "cc" in cats):
        return True
    if "-a" in control_id.lower() and ("availability" in cats or "a" in cats):
        return True
    if "-c" in control_id.lower() and ("confidentiality" in cats or "c" in cats):
        return True
    if "-pi" in control_id.lower() and ("processing integrity" in cats or "pi" in cats):
        return True
    if "-p" in control_id.lower() and ("privacy" in cats or "p" in cats):
        return True
    return False

def simple_hash(s: str) -> int:
    h = 5381
    for c in s:
        h = ((h << 5) + h) + ord(c)
    return h & 0xFFFFFFFF

def is_question_in_nist_baseline(question_id: str, baseline: str) -> bool:
    if not baseline:
        return True
    h = simple_hash(question_id)
    if baseline == "Low":
        return h % 3 == 0
    elif baseline == "Moderate":
        return h % 3 in (0, 1)
    return True

def is_control_in_nist_baseline(control_id: str, baseline: str) -> bool:
    if not baseline:
        return True
    h = simple_hash(control_id)
    if baseline == "Low":
        return h % 3 == 0
    elif baseline == "Moderate":
        return h % 3 in (0, 1)
    return True


def is_control_in_scope(control, soc2_categories, family_ids, nist_baseline) -> bool:
    if control.frameworkId == "SOC2":
        categories = soc2_categories or ["Security"]
        return is_soc2_control_in_scope(control.id, categories)
    
    if control.frameworkId == "NIST-800-53":
        if family_ids:
            parts = control.id.split("-")
            if len(parts) >= 2 and parts[1] not in family_ids:
                return False
        if nist_baseline:
            return is_control_in_nist_baseline(control.id, nist_baseline)
            
    return True

def calculate_nist_baseline(c: Optional[str], i: Optional[str], a: Optional[str]) -> Optional[str]:
    if not c and not i and not a:
        return None
    levels = ["Low", "Moderate", "High"]
    c_val = "Moderate" if c == "Medium" else (c or "Low")
    i_val = "Moderate" if i == "Medium" else (i or "Low")
    a_val = "Moderate" if a == "Medium" else (a or "Low")
    
    c_idx = levels.index(c_val) if c_val in levels else 0
    i_idx = levels.index(i_val) if i_val in levels else 0
    a_idx = levels.index(a_val) if a_val in levels else 0
    
    max_idx = max(c_idx, i_idx, a_idx)
    return levels[max_idx]



@router.get("/frameworks", response_model=List[Framework])
async def get_frameworks():
    """
    Get all available compliance frameworks
    
    Returns:
        List[Framework]: List of all frameworks
    """
    frameworks = data_store.get_all_frameworks()
    return frameworks


@router.get("/controls", response_model=List[Control])
async def get_controls(frameworkId: Optional[str] = Query(None, description="Filter controls by framework ID")):
    """
    Get controls, optionally filtered by framework
    
    Args:
        frameworkId (Optional[str]): Framework ID to filter by
        
    Returns:
        List[Control]: List of controls
        
    Raises:
        HTTPException: 404 if frameworkId is provided but framework doesn't exist
    """
    if frameworkId is not None:
        # Validate that framework exists
        framework = data_store.get_framework_by_id(frameworkId)
        if not framework:
            raise HTTPException(
                status_code=404,
                detail=f"Framework with id '{frameworkId}' not found"
            )
        return data_store.get_controls_by_framework(frameworkId)
    else:
        return data_store.get_all_controls()


@router.get("/frameworks/{frameworkId}/modules", response_model=List[dict])
async def get_framework_modules(frameworkId: str):
    """
    Get all modules for a framework (CSF 2.0 only)
    
    Args:
        frameworkId (str): Framework ID (must be NIST-CSF-2.0)
        
    Returns:
        List[dict]: List of modules with questionCount
        
    Raises:
        HTTPException: 404 if framework doesn't exist or doesn't support modules
    """
    framework = data_store.get_framework_by_id(frameworkId)
    if not framework:
        raise HTTPException(
            status_code=404,
            detail=f"Framework with id '{frameworkId}' not found"
        )
    
    if frameworkId != "NIST-CSF-2.0":
        raise HTTPException(
            status_code=400,
            detail=f"Framework '{frameworkId}' does not support modules. Modules are only available for NIST-CSF-2.0"
        )
    
    modules = data_store.get_csf_modules(frameworkId)
    return modules


@router.get("/frameworks/{frameworkId}/modules/{moduleId}/questions", response_model=List[Question])
async def get_module_questions(frameworkId: str, moduleId: str):
    """
    Get all questions for a specific CSF module
    
    Args:
        frameworkId (str): Framework ID (must be NIST-CSF-2.0)
        moduleId (str): Module ID (e.g., GV, ID, PR, DE, RS, RC)
        
    Returns:
        List[Question]: List of questions for the module
    """
    if frameworkId != "NIST-CSF-2.0":
        raise HTTPException(
            status_code=400,
            detail=f"Framework '{frameworkId}' does not support modules"
        )
    
    questions = data_store.get_questions_by_modules(frameworkId, [moduleId])
    return questions


@router.get("/frameworks/{frameworkId}/questions", response_model=List[Question])
async def get_framework_questions_by_modules(
    frameworkId: str,
    moduleIds: Optional[str] = Query(None, description="Comma-separated list of module IDs")
):
    """
    Get questions for multiple CSF modules
    
    Args:
        frameworkId (str): Framework ID (must be NIST-CSF-2.0)
        moduleIds (str): Comma-separated module IDs (e.g., "DE,PR")
        
    Returns:
        List[Question]: Combined list of questions from all specified modules
    """
    if frameworkId != "NIST-CSF-2.0":
        raise HTTPException(
            status_code=400,
            detail=f"Framework '{frameworkId}' does not support modules"
        )
    
    if not moduleIds:
        # Return all questions for the framework
        return data_store.get_questions_by_framework(frameworkId)
    
    module_id_list = [mid.strip() for mid in moduleIds.split(",")]
    questions = data_store.get_questions_by_modules(frameworkId, module_id_list)
    return questions


@router.post("/assessments", response_model=AssessmentResponse)
async def create_assessment(request: CreateAssessmentRequest, current_user: User = Depends(get_current_user)):
    """
    Create a new assessment
    
    Args:
        request (CreateAssessmentRequest): Assessment creation request
        
    Returns:
        AssessmentResponse: Created assessment with computed stats
        
    Raises:
        HTTPException: 400 if invalid framework IDs are provided
    """
    # Validate framework IDs
    for framework_id in request.frameworkIds:
        framework = data_store.get_framework_by_id(framework_id)
        if not framework:
            raise HTTPException(
                status_code=400,
                detail=f"Framework with id '{framework_id}' not found"
            )
    
    # Validate selected control IDs (if any)
    if request.selectedControlIds:
        valid_controls = data_store.get_controls_by_ids(request.selectedControlIds)
        if len(valid_controls) != len(request.selectedControlIds):
            invalid_ids = set(request.selectedControlIds) - set(control.id for control in valid_controls)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid control IDs: {list(invalid_ids)}"
            )
        
        # Ensure selected controls belong to the specified frameworks
        valid_framework_ids = set(request.frameworkIds)
        for control in valid_controls:
            if control.frameworkId not in valid_framework_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"Control '{control.id}' does not belong to any of the specified frameworks"
                )
    
    # Calculate nist_baseline
    nist_baseline = calculate_nist_baseline(
        request.nistConfidentiality,
        request.nistIntegrity,
        request.nistAvailability
    )
    
    # Filter all controls by scope
    all_framework_controls = []
    for fw_id in request.frameworkIds:
        all_framework_controls.extend(data_store.get_controls_by_framework(fw_id))
    
    scoped_controls = [c for c in all_framework_controls if is_control_in_scope(c, request.soc2Categories, request.familyIds, nist_baseline)]
    scoped_control_ids = {c.id for c in scoped_controls}
    
    total_controls = len(scoped_controls)
    
    # Filter requested selectedControlIds to only keep scoped ones
    selected_control_ids = [cid for cid in request.selectedControlIds if cid in scoped_control_ids]
    selected_controls = len(selected_control_ids)
    coverage_percent = round((selected_controls / total_controls * 100) if total_controls > 0 else 0, 2)
    
    # Filter questions by scope
    selected_question_ids = []
    if request.selectedQuestionIds:
        # Filter provided questions to only keep scoped ones
        for qid in request.selectedQuestionIds:
            q = data_store.get_question_by_id(qid)
            if not q:
                continue
            if q.frameworkId == "NIST-800-53":
                if request.familyIds and q.familyId not in request.familyIds:
                    continue
                if nist_baseline and not is_question_in_nist_baseline(q.id, nist_baseline):
                    continue
            elif q.frameworkId == "NIST-CSF-2.0" and request.moduleIds:
                if q.functionId not in request.moduleIds:
                    continue
            elif q.frameworkId == "SOC2" and request.soc2Categories:
                if not is_soc2_control_in_scope(qid, request.soc2Categories):
                    continue
            selected_question_ids.append(qid)
    else:
        # Auto-populate scoped questions
        for framework_id in request.frameworkIds:
            if framework_id == "NIST-CSF-2.0" and request.moduleIds:
                csf_questions = data_store.get_questions_by_modules("NIST-CSF-2.0", request.moduleIds)
                selected_question_ids.extend([q.id for q in csf_questions])
            elif framework_id == "NIST-800-53":
                nist_questions = data_store.get_questions_by_framework("NIST-800-53")
                if request.familyIds:
                    nist_questions = [q for q in nist_questions if q.familyId in request.familyIds]
                if nist_baseline:
                    nist_questions = [q for q in nist_questions if is_question_in_nist_baseline(q.id, nist_baseline)]
                selected_question_ids.extend([q.id for q in nist_questions])
            elif framework_id == "SOC2":
                soc2_questions = data_store.get_questions_by_framework("SOC2")
                if request.soc2Categories:
                    soc2_questions = [q for q in soc2_questions if is_soc2_control_in_scope(q.id, request.soc2Categories)]
                selected_question_ids.extend([q.id for q in soc2_questions])
            else:
                framework_questions = data_store.get_questions_by_framework(framework_id)
                selected_question_ids.extend([q.id for q in framework_questions])
    
    # Ensure projectId is present, or associate with/create a Default Project
    project_id = request.projectId
    with open("debug_route.json", "w") as f:
        import json
        json.dump({
            "request_projectId": request.projectId,
            "project_id_var": project_id
        }, f, indent=2)
    if not project_id:
        default_proj = next((p for p in data_store.get_projects() if p["name"] == "Default Project"), None)
        if default_proj:
            project_id = default_proj["id"]
        else:
            new_proj = data_store.create_project("Default Project", created_by_email=current_user.email)
            project_id = new_proj["id"]

    # Create assessment
    assessment = Assessment(
        id=str(uuid.uuid4()),
        name=request.name,
        frameworkIds=request.frameworkIds,
        selectedControlIds=selected_control_ids,
        selectedQuestionIds=selected_question_ids,
        moduleIds=request.moduleIds,
        familyIds=request.familyIds,
        createdAt=datetime.now(),
        stats=AssessmentStats(
            totalControls=total_controls,
            selectedControls=selected_controls,
            coveragePercent=coverage_percent
        ),
        questionStats=AssessmentQuestionStats(
            totalQuestions=len(selected_question_ids),
            answeredQuestions=0,
            completionPercent=0.0
        ),
        soc2AssessmentType=request.soc2AssessmentType,
        soc2Categories=request.soc2Categories,
        nistConfidentiality=request.nistConfidentiality,
        nistIntegrity=request.nistIntegrity,
        nistAvailability=request.nistAvailability,
        nistBaseline=nist_baseline,
        projectId=project_id
    )
    
    # Save assessment
    created_assessment = data_store.create_assessment(assessment, created_by_email=current_user.email)

    # Audit log (best-effort, no auth required on this endpoint)
    audit_service.log_action(
        action="CREATE_ASSESSMENT",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=created_assessment.id,
        detail={"name": created_assessment.name, "frameworks": created_assessment.frameworkIds},
    )
    
    # Return response
    return AssessmentResponse(
        id=created_assessment.id,
        name=created_assessment.name,
        status=created_assessment.status,
        riskScore=created_assessment.riskScore,
        frameworkIds=created_assessment.frameworkIds,
        selectedControlIds=created_assessment.selectedControlIds,
        selectedQuestionIds=created_assessment.selectedQuestionIds,
        moduleIds=created_assessment.moduleIds,
        familyIds=created_assessment.familyIds,
        createdAt=created_assessment.createdAt.isoformat(),
        stats=created_assessment.stats,
        questionStats=created_assessment.questionStats,
        soc2AssessmentType=created_assessment.soc2AssessmentType,
        soc2Categories=created_assessment.soc2Categories,
        nistConfidentiality=created_assessment.nistConfidentiality,
        nistIntegrity=created_assessment.nistIntegrity,
        nistAvailability=created_assessment.nistAvailability,
        nistBaseline=created_assessment.nistBaseline,
        projectId=created_assessment.projectId
    )



@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(assessment_id: str, current_user: User = Depends(get_current_user)):
    """
    Get a specific assessment by ID
    
    Args:
        assessment_id (str): Assessment ID
        
    Returns:
        AssessmentResponse: Assessment details
        
    Raises:
        HTTPException: 404 if assessment not found
    """
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=404,
            detail=f"Assessment with id '{assessment_id}' not found"
        )
    
    return AssessmentResponse(
        id=assessment.id,
        name=assessment.name,
        status=assessment.status,
        riskScore=assessment.riskScore,
        frameworkIds=assessment.frameworkIds,
        selectedControlIds=assessment.selectedControlIds,
        selectedQuestionIds=assessment.selectedQuestionIds,
        moduleIds=assessment.moduleIds,
        familyIds=assessment.familyIds,
        createdAt=assessment.createdAt.isoformat(),
        stats=assessment.stats,
        questionStats=assessment.questionStats,
        soc2AssessmentType=assessment.soc2AssessmentType,
        soc2Categories=assessment.soc2Categories,
        nistConfidentiality=assessment.nistConfidentiality,
        nistIntegrity=assessment.nistIntegrity,
        nistAvailability=assessment.nistAvailability,
        nistBaseline=assessment.nistBaseline,
        projectId=assessment.projectId
    )


@router.get("/assessments", response_model=List[AssessmentResponse])
async def get_assessments(current_user: User = Depends(get_current_user)):
    """
    Get all assessments
    
    Returns:
        List[AssessmentResponse]: List of all assessments
    """
    assessments = data_store.get_all_assessments()
    return [
        AssessmentResponse(
            id=assessment.id,
            name=assessment.name,
            status=assessment.status,
            riskScore=assessment.riskScore,
            frameworkIds=assessment.frameworkIds,
            selectedControlIds=assessment.selectedControlIds,
            selectedQuestionIds=assessment.selectedQuestionIds,
            moduleIds=assessment.moduleIds,
            familyIds=assessment.familyIds,
            createdAt=assessment.createdAt.isoformat(),
            stats=assessment.stats,
            questionStats=assessment.questionStats,
            soc2AssessmentType=assessment.soc2AssessmentType,
            soc2Categories=assessment.soc2Categories,
            nistConfidentiality=assessment.nistConfidentiality,
            nistIntegrity=assessment.nistIntegrity,
            nistAvailability=assessment.nistAvailability,
            nistBaseline=assessment.nistBaseline,
            projectId=assessment.projectId
        )
        for assessment in assessments
    ]


# ===== FAMILIES ENDPOINTS =====

@router.get("/families", response_model=List[Family], summary="Get all families")
async def get_families(framework_id: Optional[str] = Query(None, description="Filter by framework ID")):
    """
    Get all families or filter by framework ID.
    
    Returns a list of families with their metadata.
    """
    try:
        if framework_id:
            families = data_store.get_families_by_framework(framework_id)
        else:
            families = data_store.get_all_families()
        
        return families
    
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== QUESTIONS ENDPOINTS =====

@router.get("/questions", response_model=List[Question], summary="Get all questions")
async def get_questions(
    framework_id: Optional[str] = Query(None, description="Filter by framework ID"),
    family_id: Optional[str] = Query(None, description="Filter by family ID")
):
    """
    Get all questions with optional filtering by framework or family.
    
    Returns a list of questions with their metadata and criticality levels.
    """
    try:
        if framework_id and family_id:
            # Get questions for specific framework and family
            framework_questions = data_store.get_questions_by_framework(framework_id)
            questions = [q for q in framework_questions if q.familyId == family_id]
        elif framework_id:
            questions = data_store.get_questions_by_framework(framework_id)
        elif family_id:
            questions = data_store.get_questions_by_family(family_id)
        else:
            questions = data_store.get_all_questions()
        
        return questions
    
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/questions/{question_id}", response_model=Question, summary="Get question by ID")
async def get_question_by_id(question_id: str):
    """
    Get a specific question by its ID.
    
    Returns detailed question information including family, criticality, and stakeholder role.
    """
    try:
        question = data_store.get_question_by_id(question_id)
        
        if not question:
            raise HTTPException(
                status_code=404,
                detail=f"Question with ID '{question_id}' not found"
            )
        
        return question
    
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== ASSESSMENT QUESTIONS AND ANSWERS ENDPOINTS =====

@router.get("/assessments/{assessment_id}/questions", response_model=List[QuestionWithAnswer], summary="Get assessment questions with answers")
async def get_assessment_questions(assessment_id: str):
    """
    Get questions for an assessment with current answer values.
    
    Returns a list of questions with their current answers if any exist.
    """
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=404,
                detail=f"Assessment with ID '{assessment_id}' not found"
            )
        
        return data_store.get_assessment_questions_with_answers_db(assessment_id)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/assessments/{assessment_id}/answers", response_model=AssessmentSummaryResponse, summary="Submit answers for assessment")
async def submit_assessment_answers(assessment_id: str, request: SubmitAnswersRequest, current_user: User = Depends(get_current_user)):
    """
    Submit or update answers for assessment questions.
    
    Updates the answers for the specified questions and recalculates completion statistics.
    """
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=404,
                detail=f"Assessment with ID '{assessment_id}' not found"
            )
        
        # Check if we have new-style answer submissions (with yesNo/justification)
        has_new_format = any(
            hasattr(answer, 'yesNo') and answer.yesNo is not None 
            for answer in request.answers
        )
        
        if has_new_format:
            updated_assessment = data_store.update_assessment_answers_v2(assessment_id, request.answers)
        else:
            answers_dict = {answer.questionId: answer.value or "" for answer in request.answers}
            updated_assessment = data_store.update_assessment_answers(assessment_id, answers_dict)

        audit_service.log_action(
            action="SUBMIT_ANSWERS",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="assessment",
            entity_id=assessment_id,
            detail={"answersCount": len(request.answers)},
        )
        
        # Return summary response
        return AssessmentSummaryResponse(
            id=updated_assessment.id,
            name=updated_assessment.name,
            totalQuestions=updated_assessment.questionStats.totalQuestions,
            answeredQuestions=updated_assessment.questionStats.answeredQuestions,
            completionPercent=updated_assessment.questionStats.completionPercent
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== AUDIT LOG ENDPOINT =====

@router.get("/audit-log", summary="Get audit log entries")
async def get_audit_log(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user_email: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Return audit log entries, newest first. Accessible without auth for now."""
    entries = audit_service.get_audit_log(
        limit=limit, offset=offset,
        user_email=user_email, entity_id=entity_id, action=action,
    )
    return {"entries": entries, "count": len(entries)}


# ===== DASHBOARD ENDPOINT =====

@router.get("/dashboard", summary="CISO Dashboard — risk gaps & completion trends")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    """
    Aggregated dashboard data for CISO view:
    - Overall stats (total assessments, avg completion, risk gap counts)
    - Risk gaps broken down by criticality (High / Medium / Low)
    - Completion trend across assessments (chronological)
    - Per-framework breakdown (avg completion, risk gap count)
    - Top outstanding risks (High-crit questions answered 'No')
    """
    return data_store.get_dashboard_data()


# ===== ASSESSMENT STATUS ENDPOINT =====

@router.patch("/assessments/{assessment_id}/status", response_model=AssessmentSummaryResponse)
async def update_assessment_status(assessment_id: str, request: UpdateStatusRequest, current_user: User = Depends(get_current_user)):
    """Advance or revert assessment status through the state machine."""
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
    if assessment.status in LOCKED_STATUSES and request.status not in STATUS_TRANSITIONS.get(assessment.status, []):
        raise HTTPException(status_code=403, detail=f"Assessment is locked in status '{assessment.status}'")
    allowed = STATUS_TRANSITIONS.get(assessment.status, [])
    if request.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{assessment.status}' to '{request.status}'. Allowed: {allowed}"
        )
    updated = data_store.update_assessment_status(
        assessment_id, request.status,
        changed_by_email=current_user.email,
        changed_by_name=current_user.name,
        note=request.note,
    )
    audit_service.log_action(
        action="UPDATE_STATUS",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=assessment_id,
        detail={"from": assessment.status, "to": request.status, "note": request.note},
    )
    return AssessmentSummaryResponse(
        id=updated.id, name=updated.name, status=updated.status,
        totalQuestions=updated.questionStats.totalQuestions,
        answeredQuestions=updated.questionStats.answeredQuestions,
        completionPercent=updated.questionStats.completionPercent,
        riskScore=updated.riskScore,
    )


# ===== POA&M ENDPOINTS =====

@router.get("/poam", response_model=List[PoamItem])
async def list_poam_items(
    assessment_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """List all POA&M items, optionally filtered by assessment or status."""
    return data_store.get_all_poam_items(assessment_id=assessment_id, status=status)


@router.post("/poam", response_model=PoamItem, status_code=201)
async def create_poam_item(request: CreatePoamRequest, current_user: User = Depends(get_current_user)):
    """Create a new POA&M remediation item."""
    assessment = data_store.get_assessment_by_id(request.assessmentId)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment '{request.assessmentId}' not found")
    item = data_store.create_poam_item(request)
    audit_service.log_action(
        action="CREATE_POAM",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="poam",
        entity_id=item.id,
        detail={"assessmentId": request.assessmentId, "title": request.title, "priority": request.priority},
    )
    return item


@router.patch("/poam/{item_id}", response_model=PoamItem)
async def update_poam_item(item_id: str, request: UpdatePoamRequest, current_user: User = Depends(get_current_user)):
    """Update an existing POA&M item."""
    try:
        item = data_store.update_poam_item(item_id, request)
        audit_service.log_action(
            action="UPDATE_POAM",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="poam",
            entity_id=item_id,
            detail={"status": request.status, "priority": request.priority},
        )
        return item
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/poam/{item_id}", status_code=204)
async def delete_poam_item(item_id: str, current_user: User = Depends(get_current_user)):
    """Delete a POA&M item."""
    try:
        data_store.delete_poam_item(item_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ===== PHASE 2: STATE HISTORY =====

@router.get("/assessments/{assessment_id}/history", summary="Get state transition history")
async def get_assessment_history(assessment_id: str, current_user: User = Depends(get_current_user)):
    """Return the full state transition history for an assessment."""
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
    return data_store.get_state_history(assessment_id)


# ===== PHASE 2: RISK SCORING =====

@router.get("/assessments/{assessment_id}/risk-score", response_model=RiskScoreResponse)
async def get_risk_score(assessment_id: str, current_user: User = Depends(get_current_user)):
    """Calculate and return the risk score for an assessment."""
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
    # Build an object with answers relationship for scoring
    class _A:
        pass
    a = _A()
    a.id = assessment_id
    # Load answers from DB
    from app.db_models import AnswerRecord as _AR
    with db_session() as db:
        answers = db.query(_AR).filter_by(assessment_id=assessment_id).all()
        db.expunge_all()  # detach before session commits/expires objects
    class _A:
        id = assessment_id
        def selected_question_ids_list(self): return assessment.selectedQuestionIds
    _a = _A()
    _a.answers = answers
    return scoring_service.compute_risk_score(_a, data_store)


# ===== PHASE 2: REPORTS =====

@router.get("/assessments/{assessment_id}/reports/executive-summary", summary="Download executive summary PDF")
async def report_executive_summary(
    assessment_id: str,
    engagement_name: Optional[str] = Query(default=""),
    org_name: Optional[str] = Query(default="ClearComply"),
    current_user: User = Depends(get_current_user),
):
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    frameworks = [data_store.get_framework_by_id(fid) for fid in assessment.frameworkIds]
    fw_names = [f.name if f else fid for f, fid in zip(frameworks, assessment.frameworkIds)]
    # Get risk score data
    from app.db_models import AnswerRecord as _AR
    with db_session() as db:
        answers = db.query(_AR).filter_by(assessment_id=assessment_id).all()
        db.expunge_all()  # detach before session commits/expires objects
    class _A:
        id = assessment_id
        def selected_question_ids_list(self): return assessment.selectedQuestionIds
    _a = _A()
    _a.answers = answers
    risk_data = scoring_service.compute_risk_score(_a, data_store)
    risk_dict = risk_data.model_dump()
    pdf_bytes = report_service.generate_executive_summary_pdf(
        assessment_name=assessment.name,
        framework_names=fw_names,
        risk_score_data=risk_dict,
        completion_percent=assessment.questionStats.completionPercent if assessment.questionStats else 0,
        answered=assessment.questionStats.answeredQuestions if assessment.questionStats else 0,
        total=assessment.questionStats.totalQuestions if assessment.questionStats else 0,
        high_gaps=risk_dict.get("highGaps", 0),
        created_by=current_user.name,
        engagement_name=engagement_name or "",
        org_name=org_name or "ClearComply",
    )
    safe_name = assessment.name.replace(" ", "_")[:40]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_executive_summary.pdf"'},
    )


@router.get("/assessments/{assessment_id}/reports/technical", summary="Download technical assessment report PDF")
async def report_technical(
    assessment_id: str,
    engagement_name: Optional[str] = Query(default=""),
    org_name: Optional[str] = Query(default="ClearComply"),
    current_user: User = Depends(get_current_user),
):
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    frameworks = [data_store.get_framework_by_id(fid) for fid in assessment.frameworkIds]
    fw_names = [f.name if f else fid for f, fid in zip(frameworks, assessment.frameworkIds)]
    questions_with_answers = data_store.get_assessment_questions_with_answers_db(assessment_id)
    from app.db_models import AnswerRecord as _AR
    with db_session() as db:
        answers = db.query(_AR).filter_by(assessment_id=assessment_id).all()
        db.expunge_all()  # detach before session commits/expires objects
    class _A:
        id = assessment_id
        def selected_question_ids_list(self): return assessment.selectedQuestionIds
    _a = _A()
    _a.answers = answers
    risk_dict = scoring_service.compute_risk_score(_a, data_store).model_dump()
    pdf_bytes = report_service.generate_technical_report_pdf(
        assessment_name=assessment.name,
        framework_names=fw_names,
        questions_with_answers=questions_with_answers,
        risk_score_data=risk_dict,
        completion_percent=assessment.questionStats.completionPercent if assessment.questionStats else 0,
        created_by=current_user.name,
        engagement_name=engagement_name or "",
        org_name=org_name or "ClearComply",
    )
    safe_name = assessment.name.replace(" ", "_")[:40]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_technical_report.pdf"'},
    )


@router.get("/assessments/{assessment_id}/reports/gap-analysis", summary="Download gap analysis XLSX")
async def report_gap_analysis(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
):
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    questions_with_answers = data_store.get_assessment_questions_with_answers_db(assessment_id)
    xlsx_bytes = report_service.generate_gap_analysis_xlsx(
        assessment_name=assessment.name,
        questions_with_answers=questions_with_answers,
    )
    safe_name = assessment.name.replace(" ", "_")[:40]
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_gap_analysis.xlsx"'},
    )


# ===== PHASE 2: AUTO-POAM =====

@router.post("/assessments/{assessment_id}/poam/auto-generate", summary="Auto-generate POA&M from gaps")
async def auto_generate_poam(assessment_id: str, current_user: User = Depends(get_current_user)):
    """Create POA&M items for all unanswered/not-implemented controls that don't already have one."""
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    count = data_store.auto_create_poam_from_answers(assessment_id, assessment.name)
    audit_service.log_action(
        action="AUTO_GENERATE_POAM",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=assessment_id,
        detail={"createdCount": count},
    )
    return {"created": count, "message": f"{count} new POA&M item(s) created"}


@router.get("/assessments/{assessment_id}/poam/export", summary="Export POA&M as XLSX")
async def export_poam_xlsx(assessment_id: str, current_user: User = Depends(get_current_user)):
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    items = data_store.get_all_poam_items(assessment_id=assessment_id)
    items_dict = [i.model_dump() for i in items]
    xlsx_bytes = report_service.generate_poam_xlsx(assessment.name, items_dict)
    safe_name = assessment.name.replace(" ", "_")[:40]
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_poam.xlsx"'},
    )


# ===== PHASE 2: CSF PROFILE =====

@router.get("/assessments/{assessment_id}/csf-profile", response_model=CsfProfileResponse)
async def get_csf_profile(assessment_id: str, current_user: User = Depends(get_current_user)):
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    profiles = data_store.get_csf_profile(assessment_id)
    return CsfProfileResponse(
        assessmentId=assessment_id,
        profiles=[CsfFunctionProfile(**p) for p in profiles],
    )


@router.put("/assessments/{assessment_id}/csf-profile", response_model=CsfProfileResponse)
async def upsert_csf_profile(
    assessment_id: str,
    request: UpsertCsfProfileRequest,
    current_user: User = Depends(get_current_user),
):
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    profiles = data_store.upsert_csf_profile(assessment_id, request.profiles)
    audit_service.log_action(
        action="UPDATE_CSF_PROFILE",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=assessment_id,
        detail={"functionCount": len(request.profiles)},
    )
    return CsfProfileResponse(
        assessmentId=assessment_id,
        profiles=[CsfFunctionProfile(**p) for p in profiles],
    )


# ===== EVIDENCE ENDPOINTS =====

@router.post("/evidence", status_code=201, summary="Upload an evidence file")
async def upload_evidence(
    file: UploadFile = File(...),
    assessment_id: str = Form(...),
    question_id: Optional[str] = Form(None),
    control_ref: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    as_of_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """Upload a file as evidence linked to an assessment (and optionally a question/control)."""
    # Verify assessment exists
    assessment = data_store.get_assessment_by_id(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")

    result = await evidence_service.upload_evidence(
        file=file,
        assessment_id=assessment_id,
        question_id=question_id,
        control_ref=control_ref,
        description=description,
        as_of_date=as_of_date,
        expiry_date=expiry_date,
        tags=tags,
        uploaded_by_email=current_user.email,
    )
    audit_service.log_action(
        action="UPLOAD_EVIDENCE",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="evidence",
        entity_id=result["id"],
        detail={"assessmentId": assessment_id, "filename": result["filename"], "fileSize": result["fileSize"]},
    )
    return result


@router.get("/evidence", summary="List evidence files")
async def list_evidence(
    assessment_id: Optional[str] = Query(None),
    question_id: Optional[str] = Query(None),
    control_ref: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """List evidence files, optionally filtered by assessment, question, or control."""
    return evidence_service.list_evidence(
        assessment_id=assessment_id,
        question_id=question_id,
        control_ref=control_ref,
    )


@router.get("/evidence/{evidence_id}/download", summary="Download an evidence file")
async def download_evidence(evidence_id: str, current_user: User = Depends(get_current_user)):
    """Download the original evidence file."""
    path, original_filename = evidence_service.get_evidence_file_path(evidence_id)
    return FileResponse(path=path, filename=original_filename, media_type="application/octet-stream")


@router.delete("/evidence/{evidence_id}", status_code=204, summary="Delete an evidence file")
async def delete_evidence(evidence_id: str, current_user: User = Depends(get_current_user)):
    """Delete an evidence file and its metadata."""
    evidence_service.delete_evidence(evidence_id, user_email=current_user.email)
    audit_service.log_action(
        action="DELETE_EVIDENCE",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="evidence",
        entity_id=evidence_id,
    )


# ===== SSP BUILDER NEW ENDPOINTS (Redesign) =====

class AddInventoryItemRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., min_length=1, max_length=100)
    owner: Optional[str] = Field(default=None, max_length=200)


@router.get("/assessments/{assessment_id}/checklist")
async def get_assessment_checklist(assessment_id: str, current_user: User = Depends(get_current_user)):
    try:
        # Verify assessment exists
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        return data_store.get_ssp_checklist(assessment_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments/{assessment_id}/intake")
async def get_assessment_intake(assessment_id: str, current_user: User = Depends(get_current_user)):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        return data_store.get_ssp_intake_teams(assessment_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AddIntakeTeamRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    leadName: str = Field(..., min_length=1, max_length=200)
    leadEmail: str = Field(..., min_length=1, max_length=200)
    families: Optional[str] = None

@router.post("/assessments/{assessment_id}/intake")
async def add_assessment_intake_team(
    assessment_id: str,
    req: AddIntakeTeamRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        
        res = data_store.add_ssp_intake_team(
            assessment_id=assessment_id,
            name=req.name,
            lead_name=req.leadName,
            lead_email=req.leadEmail,
            families=req.families
        )
        
        audit_service.log_action(
            action="ADD_INTAKE_TEAM",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="assessment",
            entity_id=assessment_id,
            detail={"team_id": res["id"], "team_name": req.name, "lead_email": req.leadEmail}
        )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assessments/{assessment_id}/intake/{team_id}/remind")
async def remind_team(assessment_id: str, team_id: str, current_user: User = Depends(get_current_user)):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        
        res = data_store.remind_intake_team(team_id)
        
        # Log audit entry
        audit_service.log_action(
            action="REMIND_TEAM_INTAKE",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="assessment",
            entity_id=assessment_id,
            detail={"team_id": team_id, "team_name": res["name"], "lead_email": res["leadEmail"]}
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assessments/{assessment_id}/remind-overdue")
async def remind_all_overdue(assessment_id: str, current_user: User = Depends(get_current_user)):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        
        res = data_store.remind_all_overdue_teams(assessment_id)
        
        # Log audit entry
        audit_service.log_action(
            action="REMIND_OVERDUE_TEAMS",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="assessment",
            entity_id=assessment_id,
            detail={"reminded_count": res["remindedTeamsCount"]}
        )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments/{assessment_id}/risk-questions")
async def get_assessment_risk_questions(assessment_id: str, current_user: User = Depends(get_current_user)):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        return data_store.get_ssp_risk_questions(assessment_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments/{assessment_id}/inventory")
async def get_assessment_inventory(assessment_id: str, current_user: User = Depends(get_current_user)):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        return data_store.get_ssp_inventory_items(assessment_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assessments/{assessment_id}/inventory")
async def add_assessment_inventory_item(assessment_id: str, req: AddInventoryItemRequest, current_user: User = Depends(get_current_user)):
    try:
        assessment = data_store.get_assessment_by_id(assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found")
        
        res = data_store.add_ssp_inventory_item(
            assessment_id=assessment_id,
            name=req.name,
            item_type=req.type,
            owner=req.owner
        )
        
        # Log audit entry
        audit_service.log_action(
            action="ADD_INVENTORY_ITEM",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="inventory",
            entity_id=res["id"],
            detail={"name": req.name, "type": req.type}
        )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== DIAGRAM UPLOAD ENDPOINTS =====
DIAGRAMS_DIR = "./uploads/diagrams"
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

from app.db_models import AssessmentRecord, AnswerRecord, PoamRecord, ChecklistItemRecord, IntakeTeamRecord, RiskQuestionRecord, InventoryItemRecord

@router.post("/assessments/{id}/diagram", summary="Upload a data flow diagram for an assessment")
async def upload_diagram(
    id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    assessment = data_store.get_assessment_by_id(id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    filename = f"{id}_{file.filename}"
    storage_path = os.path.join(DIAGRAMS_DIR, filename)
    
    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    with db_session() as db:
        rec = db.query(AssessmentRecord).filter_by(id=id).first()
        if rec:
            rec.diagram_filename = file.filename
            rec.diagram_storage_path = storage_path
            db.commit()
            
    audit_service.log_action(
        action="UPLOAD_DIAGRAM",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=id,
        detail={"filename": file.filename},
    )
    return {"message": "Data flow diagram uploaded successfully", "filename": file.filename}


@router.get("/assessments/{id}/diagram", summary="Download the data flow diagram for an assessment")
async def download_diagram(
    id: str,
    current_user: User = Depends(get_current_user),
):
    with db_session() as db:
        rec = db.query(AssessmentRecord).filter_by(id=id).first()
        if not rec or not rec.diagram_storage_path:
            raise HTTPException(status_code=404, detail="Data flow diagram not found for this assessment")
            
        if not os.path.exists(rec.diagram_storage_path):
            raise HTTPException(status_code=404, detail="Diagram file not found on disk")
            
        return FileResponse(
            path=rec.diagram_storage_path,
            filename=rec.diagram_filename,
            media_type="application/octet-stream"
        )


@router.delete("/assessments/{id}/diagram", summary="Delete the data flow diagram for an assessment")
async def delete_diagram(
    id: str,
    current_user: User = Depends(get_current_user),
):
    with db_session() as db:
        rec = db.query(AssessmentRecord).filter_by(id=id).first()
        if not rec or not rec.diagram_filename:
            raise HTTPException(status_code=404, detail="No data flow diagram to delete")
            
        if rec.diagram_storage_path and os.path.exists(rec.diagram_storage_path):
            try:
                os.remove(rec.diagram_storage_path)
            except Exception as e:
                print(f"Error removing diagram file: {e}")
                
        rec.diagram_filename = None
        rec.diagram_storage_path = None
        db.commit()
        
    audit_service.log_action(
        action="DELETE_DIAGRAM",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=id,
        detail={},
    )
    return {"message": "Data flow diagram deleted successfully"}


# ===== DEMO SEED ENDPOINT =====
@router.post("/assessments/seed-demo", summary="Seed a mock assessment for NIST 800-53 with comprehensive capability data")
async def seed_demo_assessment(
    current_user: User = Depends(get_current_user)
):
    nist_qs = data_store.get_questions_by_framework("NIST-800-53")
    if not nist_qs:
        raise HTTPException(status_code=400, detail="NIST 800-53 questions not loaded in data store")
        
    demo_id = "demo-nist-800-53-ssp"
    with db_session() as db:
        existing = db.query(AssessmentRecord).filter_by(id=demo_id).first()
        if existing:
            db.delete(existing)
            db.commit()
            
    demo_name = "NIST 800-53 SSP Builder Capability Demonstration"
    selected_qs = nist_qs[:50]
    selected_q_ids = [q.id for q in selected_qs]
    
    import random
    rng = random.Random(42)
    answers_to_submit = []
    for q in selected_qs:
        roll = rng.random()
        if roll < 0.70:
            answers_to_submit.append({
                "question_id": q.id,
                "yes_no": "yes",
                "justification": "Verified implementation in policy and configuration files.",
                "value": "yes"
            })
        elif roll < 0.90:
            answers_to_submit.append({
                "question_id": q.id,
                "yes_no": "no",
                "justification": "Temporary gap. Plan of Action is defined to address it.",
                "value": "no"
            })
        else:
            answers_to_submit.append({
                "question_id": q.id,
                "yes_no": "na",
                "justification": "Not applicable to cloud-native SaaS environment.",
                "value": "na"
            })
            
    created_at = datetime.utcnow()
    total_q = len(selected_q_ids)
    answered = len(answers_to_submit)
    completion_pct = round(answered / total_q * 100, 2)
    coverage_pct = round(50 / len(nist_qs) * 100, 2)
    
    with db_session() as db:
        rec = AssessmentRecord(
            id=demo_id,
            name=demo_name,
            status="in_progress",
            framework_ids=json.dumps(["NIST-800-53"]),
            selected_control_ids=json.dumps([]),
            selected_question_ids=json.dumps(selected_q_ids),
            module_ids=json.dumps([]),
            family_ids=json.dumps([]),
            created_at=created_at,
            created_by_email=current_user.email,
            total_controls=0,
            selected_controls_count=0,
            coverage_percent=coverage_pct,
            total_questions=total_q,
            answered_questions=answered,
            completion_percent=completion_pct,
            nist_confidentiality="Moderate",
            nist_integrity="Moderate",
            nist_availability="Moderate",
            nist_baseline="Moderate",
        )
        db.add(rec)
        
        for ans in answers_to_submit:
            db.add(AnswerRecord(
                id=str(uuid.uuid4()),
                assessment_id=demo_id,
                question_id=ans["question_id"],
                yes_no=ans["yes_no"],
                justification=ans["justification"],
                value=ans["value"],
                updated_at=created_at,
                updated_by_email=current_user.email,
            ))
            
        poams_to_add = [
            ("AC-2 Account Management Policies & Procedures Overdue", "high", "Account management policies need formal annual sign-off."),
            ("AU-12 Audit Record Generation Gaps in Development Environment", "medium", "Audit records are only captured for production environments. Development needs to be configured."),
            ("IR-8 Incident Response Tabletop Test Pending", "low", "Tabletop exercise needs to be scheduled for the current fiscal year.")
        ]
        for title, priority, desc in poams_to_add:
            db.add(PoamRecord(
                id=str(uuid.uuid4()),
                assessment_id=demo_id,
                title=title,
                description=desc,
                status="open",
                priority=priority,
                due_date=(datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
                owner="Security Team",
                created_at=created_at,
            ))
            
        checklist_items = [
            ("System Information Inventory", "complete", "inventory"),
            ("Step #1 — Security Contacts", "complete", "data-categorization"),
            ("Risk Assessment & Mitigation", "in_progress", "risk"),
            ("Data Flow Categorization", "complete", "data-categorization"),
            ("NIST Scoping Baselines", "complete", "data-categorization"),
            ("Controls Gap Assessment", "in_progress", "controls"),
            ("Upload System Diagram", "in_progress", "inventory"),
        ]
        for title, status, link in checklist_items:
            db.add(ChecklistItemRecord(
                id=str(uuid.uuid4()),
                assessment_id=demo_id,
                title=title,
                status=status,
                target_link=link
            ))
            
        intake_teams = [
            ("Data Privacy Officers", "Alice Vance", "a.vance@agency.gov", 100, "complete", 0, "Security Assessment, Risk Management"),
            ("Engineering Lead Team", "Bob Miller", "b.miller@agency.gov", 45, "in_progress", 1, "Identification and Authentication"),
            ("Security Operations Team", "Charlie Smith", "c.smith@agency.gov", 20, "overdue", 3, "Audit and Accountability"),
        ]
        for name, lead_name, email, rate, status, last_active, families_val in intake_teams:
            db.add(IntakeTeamRecord(
                id=str(uuid.uuid4()),
                assessment_id=demo_id,
                name=name,
                lead_name=lead_name,
                lead_email=email,
                response_rate=rate,
                status=status,
                last_active_days_ago=last_active,
                families=families_val
            ))
            
        risk_qs = [
            ("Has a FIPS 199 security categorization been officially completed?", 5, 0, "Yes"),
            ("Are critical system components inventoried and updated quarterly?", 10, 10, "No"),
            ("Is MFA strictly enforced for all system administrative accounts?", 15, 0, "Yes"),
            ("Are regular vulnerability scans run on all production components?", 10, 0, "Yes"),
            ("Is there an approved Contingency Plan that is tested annually?", 10, 10, "No"),
        ]
        for text, max_p, ded_p, ans_val in risk_qs:
            db.add(RiskQuestionRecord(
                id=str(uuid.uuid4()),
                assessment_id=demo_id,
                question_text=text,
                mapped_control="AC-2",
                response=ans_val,
                points_missed=ded_p
            ))
            
        inventory = [
            ("ClearComply Web Application Instance", "VM", "IT Operations"),
            ("ClearComply PostgreSQL Database", "Database", "DB Administration Team"),
            ("Gateway Load Balancer Proxy", "Network Device", "Security Operations Team"),
            ("Qualys Scanner Agent", "SaaS", "Security Operations Team"),
        ]
        for name, type_val, owner in inventory:
            db.add(InventoryItemRecord(
                id=str(uuid.uuid4()),
                assessment_id=demo_id,
                name=name,
                type=type_val,
                status="Active",
                owner=owner
            ))
            
        db.commit()
        
    audit_service.log_action(
        action="SEED_DEMO_ASSESSMENT",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="assessment",
        entity_id=demo_id,
        detail={"name": demo_name},
    )
    return {"message": "Demo NIST 800-53 assessment seeded successfully", "assessmentId": demo_id}


# ===== PROJECT ENDPOINTS =====

@router.get("/projects", response_model=List[Project], summary="List all projects")
async def list_projects(current_user: User = Depends(get_current_user)):
    return data_store.get_projects()

@router.post("/projects", response_model=Project, summary="Create a new project")
async def create_project(request: CreateProjectRequest, current_user: User = Depends(get_current_user)):
    proj = data_store.create_project(request.name, created_by_email=current_user.email)
    
    audit_service.log_action(
        action="CREATE_PROJECT",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="project",
        entity_id=proj["id"],
        detail={"name": request.name}
    )
    return proj

@router.get("/projects/{id}", summary="Get a project by ID with its SSPs")
async def get_project(id: str, current_user: User = Depends(get_current_user)):
    proj = data_store.get_project_by_id(id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all assessments/SSPs for this project
    ssps = [a for a in data_store.get_all_assessments() if a.projectId == id]
    return {
        **proj,
        "ssps": ssps
    }

@router.delete("/projects/{id}", summary="Delete a project")
async def delete_project(id: str, current_user: User = Depends(get_current_user)):
    success = data_store.delete_project(id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
        
    audit_service.log_action(
        action="DELETE_PROJECT",
        user_email=current_user.email,
        user_name=current_user.name,
        entity_type="project",
        entity_id=id,
        detail={}
    )
    return {"message": "Project deleted successfully"}


def load_default_workbook_state():
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(base_dir, "xlstohtml", "build-source", "app_data.json")
        with open(path, "r", encoding="utf-8") as f:
            app_data = json.load(f)
            
        cover_page = {
            "systemName": "",
            "systemSummary": "",
            "assessmentSummary": "",
            "risksSummary": "",
            "closingStatement": "",
            "supportingDocs": ["", "", "", ""],
            "opsDocsRepo": "",
            "approvals": [{"date": "", "approvedBy": "", "analyst": "", "comments": ""}]
        }
        
        checklist = []
        for c in app_data.get("checklist", []):
            checklist.append({
                "task": c.get("task", ""),
                "resource": c.get("resource", ""),
                "guidance": c.get("tracking", ""),
                "status": "",
                "notes": ""
            })
            
        contacts_info = {
            "contacts": [
                {"role": r.get("role", ""), "emailLabel": r.get("emailLabel", ""), "name": "", "email": ""}
                for r in app_data.get("contactRoles", [])
            ],
            "agency": "",
            "projectName": "",
            "systemName": "",
            "appInventoryId": "",
            "businessFunction": "",
            "systemDependencies": "",
            "billingCode": "",
            "projectId": "",
            "systemState": "",
            "assessmentTarget": "",
            "technologyPlatform": "",
            "otherInfo": "",
            "lifeCritical": "",
            "downtimeTolerance": "",
            "vendorServices": "",
            "architecture": "",
            "authentication": "",
            "supportEntities": "",
            "risksVulnerabilities": ""
        }
        
        risk_assessment = {
            "impact": {k: "" for k in app_data.get("riskVars", {}).get("impact", {}).keys()},
            "likelihood": {k: "" for k in app_data.get("riskVars", {}).get("likelihood", {}).keys()},
            "questions": [{"response": "", "notes": ""} for _ in app_data.get("riskQuestions", [])],
            "questionDefinitions": app_data.get("riskQuestions", []),
            "dateCompleted": ""
        }
        
        data_categorization = {
            "dataTypes": [{"description": "", "categorization": ""}],
            "impacts": [
                {"name": name, "yesNo": "", "description": ""}
                for name in app_data.get("dataCategorizationImpacts", [])
            ]
        }
        
        environments = [{"type": "", "prodData": "", "categorization": "", "commonName": "", "users": "", "description": ""}]
        
        inventory = {
            "hardware": [dict(r) for r in app_data.get("inventoryHardwareSeed", [])],
            "software": [{"software": "", "vendor": "", "versionImplemented": "", "currentVersion": "", "contact": "", "maintSupport": ""}]
        }
        
        diagrams = {
            "appExists": "",
            "appAttached": "",
            "appLink": "",
            "dfdExists": "",
            "dfdStored": "",
            "dfdLink": "",
            "appInventoryLink": ""
        }
        
        scanning = []
        for s in app_data.get("scanning", []):
            scanning.append({
                "functionName": s.get("function", ""),
                "relevantControl": s.get("relevantControl", ""),
                "tool": s.get("tool", ""),
                "description": s.get("description", ""),
                "instructions": s.get("instructions", ""),
                "targetsHint": s.get("targets", ""),
                "targetsEntered": "",
                "frequency": "",
                "contacts": "",
                "notes": ""
            })
            
        controls = []
        for c in app_data.get("controls", []):
            controls.append({
                "id": c.get("id", ""),
                "response": "",
                "compliant": "",
                "attestation": "",
                "attestationDesc": "",
                "reviewDate": "",
                "remediationPlan": "",
                "contact": ""
            })
            
        findings_extra = {}
        firewall = [{"sourceIp": "", "sourceName": "", "destIp": "", "destName": "", "ports": "", "protocol": "", "purpose": "", "notes": ""}]
        additional_resources = [dict(r) for r in app_data.get("additionalResources", [])]
        revision_history = []
        
        return {
            "coverPage": cover_page,
            "checklist": checklist,
            "contactsInfo": contacts_info,
            "riskAssessment": risk_assessment,
            "dataCategorization": data_categorization,
            "environments": environments,
            "inventory": inventory,
            "diagrams": diagrams,
            "scanning": scanning,
            "controls": controls,
            "findingsExtra": findings_extra,
            "firewall": firewall,
            "additionalResources": additional_resources,
            "revisionHistory": revision_history
        }
    except Exception as e:
        print(f"Error loading default workbook state: {e}")
        return {}


@router.get("/assessments/{id}/workbook", response_model=SSPWorkbook, summary="Get or initialize the 14-section SSP workbook")
def get_ssp_workbook_route(id: str, current_user: User = Depends(get_current_user)):
    wb = data_store.get_ssp_workbook(id)
    default_state = load_default_workbook_state()
    if wb:
        if wb.riskAssessment and "questionDefinitions" not in wb.riskAssessment:
            risk_data = dict(wb.riskAssessment)
            risk_data["questionDefinitions"] = default_state.get("riskAssessment", {}).get("questionDefinitions", [])
            wb.riskAssessment = risk_data
        return wb
        
    assessment = data_store.get_assessment_by_id(id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    default_state = load_default_workbook_state()
    wb_obj = SSPWorkbook(
        id=str(uuid.uuid4()),
        assessmentId=id,
        coverPage=default_state.get("coverPage"),
        checklist=default_state.get("checklist"),
        contactsInfo=default_state.get("contactsInfo"),
        riskAssessment=default_state.get("riskAssessment"),
        dataCategorization=default_state.get("dataCategorization"),
        environments=default_state.get("environments"),
        inventory=default_state.get("inventory"),
        diagrams=default_state.get("diagrams"),
        scanning=default_state.get("scanning"),
        controls=default_state.get("controls"),
        findingsExtra=default_state.get("findingsExtra"),
        firewall=default_state.get("firewall"),
        additionalResources=default_state.get("additionalResources"),
        revisionHistory=default_state.get("revisionHistory"),
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    return data_store.save_ssp_workbook(id, wb_obj)


@router.put("/assessments/{id}/workbook/{section}", response_model=SSPWorkbook, summary="Update a specific section of the SSP workbook")
def update_ssp_workbook_section_route(
    id: str,
    section: str,
    req: UpdateWorkbookSectionRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        wb = data_store.update_ssp_workbook_section(id, section, req.data)
        
        audit_service.log_action(
            action="UPDATE_SSP_WORKBOOK_SECTION",
            user_email=current_user.email,
            user_name=current_user.name,
            entity_type="assessment",
            entity_id=id,
            detail={"section": section}
        )
        return wb
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update workbook: {str(e)}")


@router.get("/assessments/{id}/workbook/progress", summary="Get workbook progress stats")
def get_ssp_workbook_progress_route(id: str, current_user: User = Depends(get_current_user)):
    wb = data_store.get_ssp_workbook(id)
    if not wb:
        return {"progressPercent": 0.0, "completedTasks": 0, "totalTasks": 13}
        
    checklist = wb.checklist or []
    total_tasks = len(checklist)
    completed_tasks = sum(1 for item in checklist if item.get("status") == "Completed")
    progress_percent = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0
    
    return {
        "progressPercent": progress_percent,
        "completedTasks": completed_tasks,
        "totalTasks": total_tasks
    }


@router.get("/assessments/{id}/workbook/risk-score", summary="Compute live risk score for the workbook")
def get_ssp_workbook_risk_score_route(id: str, current_user: User = Depends(get_current_user)):
    wb = data_store.get_ssp_workbook(id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")
        
    risk_data = wb.riskAssessment or {}
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(base_dir, "xlstohtml", "build-source", "app_data.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            app_data = json.load(f)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to load app definitions")
        
    risk_vars = app_data.get("riskVars", {})
    risk_questions = app_data.get("riskQuestions", [])
    
    # 1. Compute Impact
    impact_score = 0
    impact_complete = True
    impact_selections = risk_data.get("impact", {})
    for k, v in risk_vars.get("impact", {}).items():
        sel = impact_selections.get(k)
        options = v.get("options", [])
        points = v.get("points", [])
        if sel in options:
            idx = options.index(sel)
            impact_score += points[idx]
        else:
            impact_complete = False
            
    impact_rating = "---"
    if impact_complete:
        if impact_score <= 12:
            impact_rating = "Minor"
        elif impact_score <= 20:
            impact_rating = "Moderate"
        elif impact_score <= 28:
            impact_rating = "Serious"
        else:
            impact_rating = "Critical"
            
    # 2. Compute Likelihood variables
    like_var_score = 0
    like_complete = True
    like_selections = risk_data.get("likelihood", {})
    for k, v in risk_vars.get("likelihood", {}).items():
        sel = like_selections.get(k)
        options = v.get("options", [])
        points = v.get("points", [])
        if sel in options:
            idx = options.index(sel)
            like_var_score += points[idx]
        else:
            like_complete = False
            
    # 3. Compute control questions likelihood
    sum_pts = 0
    applicable_count = 0
    questions_answers = risk_data.get("questions", [])
    for idx, q in enumerate(risk_questions):
        if idx >= len(questions_answers):
            break
        resp = questions_answers[idx].get("response")
        if not resp or resp == "N/A":
            continue
            
        applicable_count += 1
        if resp == "Full":
            sum_pts += q.get("fullPts", 0)
        elif resp == "Partial":
            sum_pts += q.get("partialPts", 0)
        elif resp == "None":
            sum_pts += q.get("nonePts", 0)
            
    overall_likelihood_q = (sum_pts / applicable_count) if applicable_count > 0 else None
    
    likelihood_score = None
    likelihood_rating = "---"
    if like_complete and overall_likelihood_q is not None:
        likelihood_score = like_var_score + overall_likelihood_q
        if likelihood_score <= 18:
            likelihood_rating = "Remote"
        elif likelihood_score <= 25:
            likelihood_rating = "Unlikely"
        elif likelihood_score <= 32:
            likelihood_rating = "Likely"
        else:
            likelihood_rating = "Almost Certain"
            
    # 4. Matrix overall risk
    matrix = {
        "Critical": {"Remote": 3, "Unlikely": 3, "Likely": 4, "Almost Certain": 4},
        "Serious": {"Remote": 2, "Unlikely": 3, "Likely": 3, "Almost Certain": 4},
        "Moderate": {"Remote": 1, "Unlikely": 2, "Likely": 2, "Almost Certain": 3},
        "Minor": {"Remote": 1, "Unlikely": 1, "Likely": 2, "Almost Certain": 2},
    }
    legend = {1: "Low", 2: "Medium", 3: "High", 4: "Severe"}
    
    risk_num = None
    risk_word = "Not yet calculated"
    if impact_rating in matrix and likelihood_rating in matrix[impact_rating]:
        risk_num = matrix[impact_rating][likelihood_rating]
        risk_word = legend.get(risk_num, "Not yet calculated")
        
    return {
        "impactScore": impact_score if impact_complete else None,
        "impactRating": impact_rating,
        "likelihoodScore": likelihood_score,
        "likelihoodRating": likelihood_rating,
        "overallRisk": risk_word,
        "applicableCount": applicable_count,
        "overallLikelihoodQ": overall_likelihood_q
    }



