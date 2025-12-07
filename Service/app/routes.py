"""
API routes for Clear Comply Service Layer
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.models import (
    Framework, Control, Assessment, AssessmentStats,
    CreateAssessmentRequest, AssessmentResponse,
    NotFoundResponse, ErrorResponse, Family, Question,
    SubmitAnswersRequest, AssessmentSummaryResponse, QuestionWithAnswer,
    AssessmentQuestionStats
)
from app.data_store import data_store

# Create router instance
router = APIRouter(prefix="/api", tags=["Clear Comply API"])


@router.get("/frameworks", response_model=List[Framework])
async def get_frameworks():
    """
    Get all available compliance frameworks
    
    Returns:
        List[Framework]: List of all frameworks
    """
    print("GET /frameworks called")  # Debug log
    frameworks = data_store.get_all_frameworks()
    print(f"Returning {len(frameworks)} frameworks")  # Debug log
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


@router.post("/assessments", response_model=AssessmentResponse)
async def create_assessment(request: CreateAssessmentRequest):
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
    
    # Create assessment
    assessment = Assessment(
        id=str(uuid.uuid4()),
        name=request.name,
        frameworkIds=request.frameworkIds,
        selectedControlIds=request.selectedControlIds,
        selectedQuestionIds=request.selectedQuestionIds,
        createdAt=datetime.now(),
        stats=AssessmentStats(
            totalControls=total_controls,
            selectedControls=selected_controls,
            coveragePercent=coverage_percent
        ),
        questionStats=AssessmentQuestionStats(
            totalQuestions=len(request.selectedQuestionIds),
            answeredQuestions=0,
            completionPercent=0.0
        )
    )
    
    # Save assessment
    created_assessment = data_store.create_assessment(assessment)
    
    # Return response
    return AssessmentResponse(
        id=created_assessment.id,
        name=created_assessment.name,
        frameworkIds=created_assessment.frameworkIds,
        selectedControlIds=created_assessment.selectedControlIds,
        selectedQuestionIds=created_assessment.selectedQuestionIds,
        createdAt=created_assessment.createdAt.isoformat(),
        stats=created_assessment.stats,
        questionStats=created_assessment.questionStats
    )


@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(assessment_id: str):
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
        frameworkIds=assessment.frameworkIds,
        selectedControlIds=assessment.selectedControlIds,
        selectedQuestionIds=assessment.selectedQuestionIds,
        createdAt=assessment.createdAt.isoformat(),
        stats=assessment.stats,
        questionStats=assessment.questionStats
    )


@router.get("/assessments", response_model=List[AssessmentResponse])
async def get_assessments():
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
            frameworkIds=assessment.frameworkIds,
            selectedControlIds=assessment.selectedControlIds,
            selectedQuestionIds=assessment.selectedQuestionIds,
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
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while retrieving families: {str(e)}"
        )


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
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while retrieving questions: {str(e)}"
        )


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
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while retrieving question: {str(e)}"
        )


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
                answer_value = None
                if question_id in assessment.answers:
                    answer_value = assessment.answers[question_id].value
                
                question_with_answer = QuestionWithAnswer(
                    id=question.id,
                    familyId=question.familyId,
                    familyName=question.familyName,
                    controlRefs=question.controlRefs,
                    questionText=question.questionText,
                    stakeholderRoleId=question.stakeholderRoleId,
                    answerType=question.answerType,
                    criticality=question.criticality,
                    answerValue=answer_value
                )
                questions_with_answers.append(question_with_answer)
        
        return questions_with_answers
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while retrieving assessment questions: {str(e)}"
        )


@router.post("/assessments/{assessment_id}/answers", response_model=AssessmentSummaryResponse, summary="Submit answers for assessment")
async def submit_assessment_answers(assessment_id: str, request: SubmitAnswersRequest):
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
        
        # Convert answers to dict format
        answers_dict = {answer.questionId: answer.value for answer in request.answers}
        
        # Update assessment with new answers
        updated_assessment = data_store.update_assessment_answers(assessment_id, answers_dict)
        
        # Return summary response
        return AssessmentSummaryResponse(
            id=updated_assessment.id,
            name=updated_assessment.name,
            totalQuestions=updated_assessment.questionStats.totalQuestions,
            answeredQuestions=updated_assessment.questionStats.answeredQuestions,
            completionPercent=updated_assessment.questionStats.completionPercent
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while submitting answers: {str(e)}"
        )
