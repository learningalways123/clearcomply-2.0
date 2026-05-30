"""
API routes for Clear Comply Service Layer
"""

from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
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
)
from app.data_store import data_store
from app.auth import get_current_user, require_role, User
from app import audit_service, evidence_service, scoring_service, report_service
from fastapi.responses import FileResponse, Response

# Create router instance
router = APIRouter(prefix="/api", tags=["Clear Comply API"])


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
    
    # Compute stats
    total_controls = data_store.get_controls_count_for_frameworks(request.frameworkIds)
    selected_controls = len(request.selectedControlIds)
    coverage_percent = round((selected_controls / total_controls * 100) if total_controls > 0 else 0, 2)
    
    # If no specific questions are selected, automatically select questions based on moduleIds or familyIds
    selected_question_ids = request.selectedQuestionIds or []
    if not selected_question_ids:
        # Check if this is a CSF assessment with module selection
        if "NIST-CSF-2.0" in request.frameworkIds and request.moduleIds:
            # Get questions for selected CSF modules
            csf_questions = data_store.get_questions_by_modules("NIST-CSF-2.0", request.moduleIds)
            selected_question_ids.extend([q.id for q in csf_questions])
        else:
            # Default: Get all questions for the specified frameworks
            for framework_id in request.frameworkIds:
                framework_questions = data_store.get_questions_by_framework(framework_id)
                selected_question_ids.extend([q.id for q in framework_questions])
    
    # Create assessment
    assessment = Assessment(
        id=str(uuid.uuid4()),
        name=request.name,
        frameworkIds=request.frameworkIds,
        selectedControlIds=request.selectedControlIds,
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
        )
    )
    
    # Save assessment
    created_assessment = data_store.create_assessment(assessment)

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
        questionStats=created_assessment.questionStats
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
        questionStats=assessment.questionStats
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
            questionStats=assessment.questionStats
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
        
        questions_with_answers = []
        for question_id in assessment.selectedQuestionIds:
            question = data_store.get_question_by_id(question_id)
            if question:
                ans = assessment.answers.get(question_id)
                question_with_answer = QuestionWithAnswer(
                    id=question.id,
                    familyId=question.familyId,
                    familyName=question.familyName,
                    controlRefs=question.controlRefs,
                    questionText=question.questionText,
                    stakeholderRoleId=question.stakeholderRoleId,
                    answerType=question.answerType,
                    criticality=question.criticality,
                    functionId=question.functionId,
                    functionName=question.functionName,
                    subcategoryText=question.subcategoryText,
                    answerValue=ans.value if ans else None,
                    answerYesNo=ans.yesNo if ans else None,
                    answerJustification=ans.justification if ans else None,
                )
                questions_with_answers.append(question_with_answer)
        
        return questions_with_answers
    
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


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
