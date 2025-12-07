"""
In-memory data storage for Clear Comply API
Contains seed data for frameworks, controls, assessments, families, and questions
"""

import json
import os
from typing import Dict, List
from app.models import (
    Framework, Control, Assessment, CriticalityLevel, Family, Question, QuestionBank,
    QuestionAnswer, AssessmentQuestionStats, QuestionWithAnswer
)
from datetime import datetime
import uuid


class DataStore:
    """In-memory data storage class"""
    
    def __init__(self):
        self.frameworks: Dict[str, Framework] = {}
        self.controls: Dict[str, Control] = {}
        self.assessments: Dict[str, Assessment] = {}
        self.families: Dict[str, Family] = {}
        self.questions: Dict[str, Question] = {}
        self.question_banks: Dict[str, List[Question]] = {}
        self._initialize_seed_data()
        self._load_question_banks()
    
    def _initialize_seed_data(self):
        """Initialize the data store with seed data"""
        self._seed_frameworks()
        self._seed_controls()
    
    def _seed_frameworks(self):
        """Seed frameworks data"""
        frameworks_data = [
            {
                "id": "SOC2",
                "name": "SOC 2",
                "description": "Service Organization Control 2 - Framework for managing customer data based on five trust service principles: security, availability, processing integrity, confidentiality, and privacy."
            },
            {
                "id": "nist-800-53",
                "name": "NIST 800-53",
                "description": "NIST Special Publication 800-53 - Security and Privacy Controls for Federal Information Systems and Organizations."
            },
            {
                "id": "ISO27001",
                "name": "ISO 27001",
                "description": "ISO/IEC 27001 - International standard for information security management systems (ISMS)."
            }
        ]
        
        for framework_data in frameworks_data:
            framework = Framework(**framework_data)
            self.frameworks[framework.id] = framework
    
    def _seed_controls(self):
        """Seed controls data for each framework"""
        
        # SOC 2 Controls
        soc2_controls = [
            {
                "id": "SOC2-CC6.1",
                "frameworkId": "SOC2",
                "domain": "Access Control",
                "title": "Logical and Physical Access Controls",
                "description": "The entity implements logical and physical access controls to restrict access to assets and resources.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "SOC2-CC6.2",
                "frameworkId": "SOC2",
                "domain": "Access Control",
                "title": "Access Control Requests",
                "description": "Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "SOC2-CC6.3",
                "frameworkId": "SOC2",
                "domain": "Access Control",
                "title": "User Access Reviews",
                "description": "The entity requires users to reauthenticate periodically and implements procedures to remove or disable access rights in a timely manner.",
                "criticality": CriticalityLevel.MEDIUM
            },
            {
                "id": "SOC2-CC7.1",
                "frameworkId": "SOC2",
                "domain": "Incident Response",
                "title": "Incident Detection and Response",
                "description": "The entity identifies, captures, and analyzes security events and incidents.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "SOC2-CC7.2",
                "frameworkId": "SOC2",
                "domain": "Incident Response",
                "title": "Incident Communication",
                "description": "The entity responds to identified incidents by executing a defined incident response program.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "SOC2-CC9.1",
                "frameworkId": "SOC2",
                "domain": "Vendor Risk",
                "title": "Vendor Risk Assessment",
                "description": "The entity identifies and assesses risks associated with vendors and other third parties.",
                "criticality": CriticalityLevel.MEDIUM
            },
            {
                "id": "SOC2-A1.1",
                "frameworkId": "SOC2",
                "domain": "Monitoring",
                "title": "System Performance Monitoring",
                "description": "The entity monitors system performance and capacity to meet availability commitments.",
                "criticality": CriticalityLevel.MEDIUM
            }
        ]
        
        # NIST 800-53 Controls
        nist_controls = [
            {
                "id": "NIST-AC-1",
                "frameworkId": "nist-800-53",
                "domain": "Access Control",
                "title": "Access Control Policy and Procedures",
                "description": "Develop, document, and disseminate access control policy and procedures.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "NIST-AC-2",
                "frameworkId": "nist-800-53",
                "domain": "Access Control",
                "title": "Account Management",
                "description": "Manage information system accounts including establishing, activating, modifying, disabling, and removing accounts.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "NIST-AC-3",
                "frameworkId": "nist-800-53",
                "domain": "Access Control",
                "title": "Access Enforcement",
                "description": "Enforce approved authorizations for logical access to information and system resources.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "NIST-IR-1",
                "frameworkId": "nist-800-53",
                "domain": "Incident Response",
                "title": "Incident Response Policy and Procedures",
                "description": "Develop, document, and disseminate incident response policy and procedures.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "NIST-IR-2",
                "frameworkId": "nist-800-53",
                "domain": "Incident Response",
                "title": "Incident Response Training",
                "description": "Provide incident response training to information system users.",
                "criticality": CriticalityLevel.MEDIUM
            },
            {
                "id": "NIST-SA-9",
                "frameworkId": "nist-800-53",
                "domain": "Vendor Risk",
                "title": "External Information System Services",
                "description": "Require providers of external information system services to comply with organizational information security requirements.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "NIST-CP-1",
                "frameworkId": "nist-800-53",
                "domain": "Business Continuity",
                "title": "Contingency Planning Policy and Procedures",
                "description": "Develop, document, and disseminate contingency planning policy and procedures.",
                "criticality": CriticalityLevel.MEDIUM
            }
        ]
        
        # ISO 27001 Controls
        iso_controls = [
            {
                "id": "ISO-A.9.1.1",
                "frameworkId": "ISO27001",
                "domain": "Access Control",
                "title": "Access Control Policy",
                "description": "An access control policy shall be established, documented and reviewed based on business and information security requirements.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "ISO-A.9.2.1",
                "frameworkId": "ISO27001",
                "domain": "Access Control",
                "title": "User Registration and De-registration",
                "description": "A formal user registration and de-registration process shall be implemented to enable assignment of access rights.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "ISO-A.9.2.6",
                "frameworkId": "ISO27001",
                "domain": "Access Control",
                "title": "Access Rights Review",
                "description": "Management shall review users' access rights at regular intervals.",
                "criticality": CriticalityLevel.MEDIUM
            },
            {
                "id": "ISO-A.16.1.1",
                "frameworkId": "ISO27001",
                "domain": "Incident Response",
                "title": "Responsibilities and Procedures",
                "description": "Management responsibilities and procedures shall be established to ensure a quick, effective and orderly response to information security incidents.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "ISO-A.16.1.2",
                "frameworkId": "ISO27001",
                "domain": "Incident Response",
                "title": "Reporting Information Security Events",
                "description": "Information security events shall be reported through appropriate management channels as quickly as possible.",
                "criticality": CriticalityLevel.HIGH
            },
            {
                "id": "ISO-A.15.1.1",
                "frameworkId": "ISO27001",
                "domain": "Vendor Risk",
                "title": "Information Security Policy for Supplier Relationships",
                "description": "Information security requirements for mitigating risks associated with supplier access shall be agreed with the supplier and documented.",
                "criticality": CriticalityLevel.MEDIUM
            },
            {
                "id": "ISO-A.17.1.1",
                "frameworkId": "ISO27001",
                "domain": "Business Continuity",
                "title": "Planning Information Security Continuity",
                "description": "The organization shall determine its requirements for information security and the continuity of information security management in adverse situations.",
                "criticality": CriticalityLevel.MEDIUM
            },
            {
                "id": "ISO-A.12.6.1",
                "frameworkId": "ISO27001",
                "domain": "Monitoring",
                "title": "Management of Technical Vulnerabilities",
                "description": "Information about technical vulnerabilities of information systems being used shall be obtained in a timely fashion.",
                "criticality": CriticalityLevel.LOW
            }
        ]
        
        # Add all controls to the store
        all_controls = soc2_controls + nist_controls + iso_controls
        for control_data in all_controls:
            control = Control(**control_data)
            self.controls[control.id] = control
    
    # Framework methods
    def get_all_frameworks(self) -> List[Framework]:
        """Get all frameworks"""
        return list(self.frameworks.values())
    
    def get_framework_by_id(self, framework_id: str) -> Framework:
        """Get framework by ID"""
        return self.frameworks.get(framework_id)
    
    # Control methods
    def get_all_controls(self) -> List[Control]:
        """Get all controls"""
        return list(self.controls.values())
    
    def get_controls_by_framework(self, framework_id: str) -> List[Control]:
        """Get controls for a specific framework"""
        return [control for control in self.controls.values() if control.frameworkId == framework_id]
    
    def get_controls_by_ids(self, control_ids: List[str]) -> List[Control]:
        """Get controls by list of IDs"""
        return [self.controls[control_id] for control_id in control_ids if control_id in self.controls]
    
    def get_controls_count_for_frameworks(self, framework_ids: List[str]) -> int:
        """Get total count of controls for given frameworks"""
        return len([control for control in self.controls.values() if control.frameworkId in framework_ids])
    
    # Assessment methods
    def create_assessment(self, assessment: Assessment) -> Assessment:
        """Create a new assessment"""
        self.assessments[assessment.id] = assessment
        return assessment
    
    def get_assessment_by_id(self, assessment_id: str) -> Assessment:
        """Get assessment by ID"""
        return self.assessments.get(assessment_id)
    
    def get_all_assessments(self) -> List[Assessment]:
        """Get all assessments"""
        return list(self.assessments.values())

    def update_assessment_answers(self, assessment_id: str, answers: Dict[str, str]) -> Assessment:
        """Update answers for an assessment and recalculate completion stats"""
        assessment = self.assessments.get(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment with ID {assessment_id} not found")
        
        # Update answers
        now = datetime.now()
        for question_id, answer_value in answers.items():
            # Validate that the question is part of this assessment
            if question_id not in assessment.selectedQuestionIds:
                raise ValueError(f"Question {question_id} is not part of this assessment")
            
            # Update or create the answer
            assessment.answers[question_id] = QuestionAnswer(
                value=answer_value,
                lastUpdated=now
            )
        
        # Recalculate completion stats
        self._recalculate_question_stats(assessment)
        
        # Save the updated assessment
        self.assessments[assessment_id] = assessment
        return assessment

    def _recalculate_question_stats(self, assessment: Assessment) -> None:
        """Recalculate question statistics for an assessment"""
        total_questions = len(assessment.selectedQuestionIds)
        answered_questions = len([
            answer for answer in assessment.answers.values() 
            if answer.value.strip()  # Non-empty string check
        ])
        completion_percent = round((answered_questions / total_questions * 100) if total_questions > 0 else 0, 2)
        
        assessment.questionStats = AssessmentQuestionStats(
            totalQuestions=total_questions,
            answeredQuestions=answered_questions,
            completionPercent=completion_percent
        )

    def get_assessment_questions_with_answers(self, assessment_id: str) -> List[QuestionWithAnswer]:
        """Get questions for an assessment with current answer values included"""
        assessment = self.assessments.get(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment with ID {assessment_id} not found")
        
        questions_with_answers = []
        for question_id in assessment.selectedQuestionIds:
            question = self.questions.get(question_id)
            if question:
                # Get answer value if it exists
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

    def _load_question_banks(self):
        """Load question banks from JSON files"""
        try:
            # Get the path to the data directory relative to the current file
            current_dir = os.path.dirname(os.path.dirname(__file__))
            data_dir = os.path.join(current_dir, 'data')
            
            # Load NIST 800-53 question bank
            nist_file_path = os.path.join(data_dir, 'nist_800_53_questions.json')
            if os.path.exists(nist_file_path):
                with open(nist_file_path, 'r') as f:
                    question_bank_data = json.load(f)
                    question_bank = QuestionBank(**question_bank_data)
                    
                    # Store questions individually
                    for question in question_bank.questions:
                        self.questions[question.id] = question
                    
                    # Store questions grouped by framework
                    self.question_banks[question_bank.frameworkId] = question_bank.questions
                    
                    # Extract unique families from questions
                    families_dict = {}
                    for question in question_bank.questions:
                        family_key = f"{question_bank.frameworkId}-{question.familyId}"
                        if family_key not in families_dict:
                            families_dict[family_key] = Family(
                                id=family_key,
                                familyId=question.familyId,
                                familyName=question.familyName,
                                frameworkId=question_bank.frameworkId
                            )
                    
                    # Store families
                    self.families.update(families_dict)
                    
        except Exception as e:
            print(f"Error loading question banks: {e}")

    # Question and Family retrieval methods
    def get_all_families(self) -> List[Family]:
        """Get all families"""
        return list(self.families.values())
    
    def get_families_by_framework(self, framework_id: str) -> List[Family]:
        """Get families for a specific framework"""
        return [family for family in self.families.values() if family.frameworkId == framework_id]
    
    def get_all_questions(self) -> List[Question]:
        """Get all questions"""
        return list(self.questions.values())
    
    def get_questions_by_framework(self, framework_id: str) -> List[Question]:
        """Get questions for a specific framework"""
        return self.question_banks.get(framework_id, [])
    
    def get_questions_by_family(self, family_id: str) -> List[Question]:
        """Get questions for a specific family"""
        return [question for question in self.questions.values() if question.familyId == family_id]
    
    def get_question_by_id(self, question_id: str) -> Question:
        """Get question by ID"""
        return self.questions.get(question_id)


# Global data store instance
data_store = DataStore()
