"""
Data storage for Clear Comply API.

Read-only static data (frameworks, controls, questions, families) kept in memory.
Mutable data (assessments, answers) persisted in SQLite via SQLAlchemy.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from app.models import (
    Assessment, AssessmentQuestionStats, AssessmentStats,
    Control, CriticalityLevel, Family, Framework, Question, QuestionAnswer,
    QuestionBank, QuestionWithAnswer,
)
from app.database import db_session
from app.db_models import AssessmentRecord, AnswerRecord


def _record_to_assessment(rec: AssessmentRecord) -> Assessment:
    answers: Dict[str, QuestionAnswer] = {}
    for a in rec.answers:
        answers[a.question_id] = QuestionAnswer(
            value=a.value or "",
            yesNo=a.yes_no,
            justification=a.justification,
            lastUpdated=a.updated_at or datetime.utcnow(),
        )
    return Assessment(
        id=rec.id,
        name=rec.name,
        frameworkIds=json.loads(rec.framework_ids or "[]"),
        selectedControlIds=json.loads(rec.selected_control_ids or "[]"),
        selectedQuestionIds=json.loads(rec.selected_question_ids or "[]"),
        moduleIds=json.loads(rec.module_ids or "[]"),
        familyIds=json.loads(rec.family_ids or "[]"),
        createdAt=rec.created_at or datetime.utcnow(),
        answers=answers,
        stats=AssessmentStats(
            totalControls=rec.total_controls,
            selectedControls=rec.selected_controls_count,
            coveragePercent=rec.coverage_percent,
        ),
        questionStats=AssessmentQuestionStats(
            totalQuestions=rec.total_questions,
            answeredQuestions=rec.answered_questions,
            completionPercent=rec.completion_percent,
        ),
    )


class DataStore:
    def __init__(self):
        self.frameworks: Dict[str, Framework] = {}
        self.controls: Dict[str, Control] = {}
        self.families: Dict[str, Family] = {}
        self.questions: Dict[str, Question] = {}
        self.question_banks: Dict[str, List[Question]] = {}
        self._initialize_seed_data()
        self._load_question_banks()

    def _initialize_seed_data(self):
        self._seed_frameworks()
        self._seed_controls()

    def _seed_frameworks(self):
        for d in [
            {"id": "SOC2", "name": "SOC 2", "description": "Service Organization Control 2 - Framework for managing customer data."},
            {"id": "NIST-800-53", "name": "NIST 800-53", "description": "NIST SP 800-53 - Security and Privacy Controls for Federal Information Systems."},
            {"id": "NIST-CSF-2.0", "name": "NIST Cybersecurity Framework 2.0", "description": "NIST CSF 2.0 - Risk-based approach to managing cybersecurity risk."},
            {"id": "ISO27001", "name": "ISO 27001", "description": "ISO/IEC 27001 - International standard for information security management systems."},
        ]:
            f = Framework(**d)
            self.frameworks[f.id] = f

    def _seed_controls(self):
        controls_data = [
            {"id": "SOC2-CC6.1", "frameworkId": "SOC2", "domain": "Access Control", "title": "Logical and Physical Access Controls", "description": "Implements logical and physical access controls.", "criticality": CriticalityLevel.HIGH},
            {"id": "SOC2-CC6.2", "frameworkId": "SOC2", "domain": "Access Control", "title": "Access Control Requests", "description": "Registers and authorizes new users.", "criticality": CriticalityLevel.HIGH},
            {"id": "SOC2-CC6.3", "frameworkId": "SOC2", "domain": "Access Control", "title": "User Access Reviews", "description": "Periodic re-authentication and access removal.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "SOC2-CC7.1", "frameworkId": "SOC2", "domain": "Incident Response", "title": "Incident Detection and Response", "description": "Identifies and analyzes security incidents.", "criticality": CriticalityLevel.HIGH},
            {"id": "SOC2-CC7.2", "frameworkId": "SOC2", "domain": "Incident Response", "title": "Incident Communication", "description": "Executes incident response program.", "criticality": CriticalityLevel.HIGH},
            {"id": "SOC2-CC9.1", "frameworkId": "SOC2", "domain": "Vendor Risk", "title": "Vendor Risk Assessment", "description": "Identifies risks with vendors.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "SOC2-A1.1", "frameworkId": "SOC2", "domain": "Monitoring", "title": "System Performance Monitoring", "description": "Monitors system performance.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "NIST-AC-1", "frameworkId": "NIST-800-53", "domain": "Access Control", "title": "Access Control Policy", "description": "Develop and disseminate access control policy.", "criticality": CriticalityLevel.HIGH},
            {"id": "NIST-AC-2", "frameworkId": "NIST-800-53", "domain": "Access Control", "title": "Account Management", "description": "Manage information system accounts.", "criticality": CriticalityLevel.HIGH},
            {"id": "NIST-AC-3", "frameworkId": "NIST-800-53", "domain": "Access Control", "title": "Access Enforcement", "description": "Enforce approved authorizations.", "criticality": CriticalityLevel.HIGH},
            {"id": "NIST-IR-1", "frameworkId": "NIST-800-53", "domain": "Incident Response", "title": "Incident Response Policy", "description": "Develop incident response policy.", "criticality": CriticalityLevel.HIGH},
            {"id": "NIST-IR-2", "frameworkId": "NIST-800-53", "domain": "Incident Response", "title": "Incident Response Training", "description": "Provide incident response training.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "NIST-SA-9", "frameworkId": "NIST-800-53", "domain": "Vendor Risk", "title": "External Information System Services", "description": "Require providers to comply with security requirements.", "criticality": CriticalityLevel.HIGH},
            {"id": "NIST-CP-1", "frameworkId": "NIST-800-53", "domain": "Business Continuity", "title": "Contingency Planning Policy", "description": "Develop contingency planning policy.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "ISO-A.9.1.1", "frameworkId": "ISO27001", "domain": "Access Control", "title": "Access Control Policy", "description": "Access control policy based on business requirements.", "criticality": CriticalityLevel.HIGH},
            {"id": "ISO-A.9.2.1", "frameworkId": "ISO27001", "domain": "Access Control", "title": "User Registration", "description": "Formal user registration and de-registration.", "criticality": CriticalityLevel.HIGH},
            {"id": "ISO-A.9.2.6", "frameworkId": "ISO27001", "domain": "Access Control", "title": "Access Rights Review", "description": "Regular review of access rights.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "ISO-A.16.1.1", "frameworkId": "ISO27001", "domain": "Incident Response", "title": "Responsibilities and Procedures", "description": "Incident response management responsibilities.", "criticality": CriticalityLevel.HIGH},
            {"id": "ISO-A.16.1.2", "frameworkId": "ISO27001", "domain": "Incident Response", "title": "Reporting Security Events", "description": "Reporting through management channels.", "criticality": CriticalityLevel.HIGH},
            {"id": "ISO-A.15.1.1", "frameworkId": "ISO27001", "domain": "Vendor Risk", "title": "Supplier Relationships Policy", "description": "Security requirements for supplier access.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "ISO-A.17.1.1", "frameworkId": "ISO27001", "domain": "Business Continuity", "title": "Planning Security Continuity", "description": "Continuity of information security management.", "criticality": CriticalityLevel.MEDIUM},
            {"id": "ISO-A.12.6.1", "frameworkId": "ISO27001", "domain": "Monitoring", "title": "Technical Vulnerability Management", "description": "Timely information about technical vulnerabilities.", "criticality": CriticalityLevel.LOW},
        ]
        for d in controls_data:
            c = Control(**d)
            self.controls[c.id] = c

    def _load_question_banks(self):
        base = os.path.dirname(os.path.dirname(__file__))
        data_dir = os.path.join(base, "data")
        for fname in ["nist_800_53_300_questions.json", "csf_2_0_questions_all.json"]:
            path = os.path.join(data_dir, fname)
            if os.path.exists(path):
                try:
                    with open(path) as f:
                        bank = QuestionBank(**json.load(f))
                    self._process_question_bank(bank)
                except Exception as e:
                    import traceback
                    print(f"[DataStore] Error loading {fname}: {e}")
                    traceback.print_exc()

    def _process_question_bank(self, bank: QuestionBank):
        for q in bank.questions:
            self.questions[q.id] = q
        self.question_banks[bank.frameworkId] = bank.questions
        for q in bank.questions:
            key = f"{bank.frameworkId}-{q.familyId}"
            if key not in self.families:
                self.families[key] = Family(id=key, familyId=q.familyId, familyName=q.familyName, frameworkId=bank.frameworkId)

    # ── Framework ────────────────────────────────────────────────────────────
    def get_all_frameworks(self): return list(self.frameworks.values())
    def get_framework_by_id(self, fid): return self.frameworks.get(fid)

    # ── Controls ─────────────────────────────────────────────────────────────
    def get_all_controls(self): return list(self.controls.values())
    def get_controls_by_framework(self, fid): return [c for c in self.controls.values() if c.frameworkId == fid]
    def get_controls_by_ids(self, ids): return [self.controls[i] for i in ids if i in self.controls]
    def get_controls_count_for_frameworks(self, fids): return sum(1 for c in self.controls.values() if c.frameworkId in fids)

    # ── Families ─────────────────────────────────────────────────────────────
    def get_all_families(self): return list(self.families.values())
    def get_families_by_framework(self, fid): return [f for f in self.families.values() if f.frameworkId == fid]

    # ── Questions ────────────────────────────────────────────────────────────
    def get_all_questions(self): return list(self.questions.values())
    def get_questions_by_framework(self, fid): return [q for q in self.questions.values() if q.frameworkId == fid]
    def get_questions_by_family(self, fid): return [q for q in self.questions.values() if q.familyId == fid]
    def get_question_by_id(self, qid): return self.questions.get(qid)

    def get_csf_modules(self, framework_id: str) -> List[dict]:
        if framework_id != "NIST-CSF-2.0":
            return []
        md: Dict[str, dict] = {}
        for q in self.get_questions_by_framework(framework_id):
            if q.functionId and q.functionName:
                if q.functionId not in md:
                    md[q.functionId] = {"moduleId": q.functionId, "moduleName": q.functionName, "questionCount": 0}
                md[q.functionId]["questionCount"] += 1
        return sorted(md.values(), key=lambda m: m["moduleId"])

    def get_questions_by_modules(self, framework_id: str, module_ids: List[str]) -> List[Question]:
        if framework_id != "NIST-CSF-2.0":
            return []
        return [q for q in self.get_questions_by_framework(framework_id) if q.functionId in module_ids]

    # ── Assessments (SQLite) ─────────────────────────────────────────────────
    def create_assessment(self, assessment: Assessment, created_by_email: Optional[str] = None) -> Assessment:
        with db_session() as db:
            rec = AssessmentRecord(
                id=assessment.id,
                name=assessment.name,
                framework_ids=json.dumps(assessment.frameworkIds),
                selected_control_ids=json.dumps(assessment.selectedControlIds),
                selected_question_ids=json.dumps(assessment.selectedQuestionIds),
                module_ids=json.dumps(assessment.moduleIds),
                family_ids=json.dumps(assessment.familyIds),
                created_at=assessment.createdAt,
                created_by_email=created_by_email,
                total_controls=assessment.stats.totalControls,
                selected_controls_count=assessment.stats.selectedControls,
                coverage_percent=assessment.stats.coveragePercent,
                total_questions=assessment.questionStats.totalQuestions,
                answered_questions=0,
                completion_percent=0.0,
            )
            db.add(rec)
        return assessment

    def get_assessment_by_id(self, assessment_id: str) -> Optional[Assessment]:
        with db_session() as db:
            rec = db.query(AssessmentRecord).filter_by(id=assessment_id).first()
            if not rec:
                return None
            return _record_to_assessment(rec)

    def get_all_assessments(self) -> List[Assessment]:
        with db_session() as db:
            recs = db.query(AssessmentRecord).order_by(AssessmentRecord.created_at.desc()).all()
            return [_record_to_assessment(r) for r in recs]

    # ── Answers (SQLite) ─────────────────────────────────────────────────────
    def update_assessment_answers_v2(
        self,
        assessment_id: str,
        answer_submissions: list,
        updated_by_email: Optional[str] = None,
    ) -> Assessment:
        with db_session() as db:
            rec = db.query(AssessmentRecord).filter_by(id=assessment_id).first()
            if not rec:
                raise ValueError(f"Assessment '{assessment_id}' not found")
            selected_ids = json.loads(rec.selected_question_ids or "[]")
            now = datetime.utcnow()
            for sub in answer_submissions:
                qid = sub.questionId
                if qid not in selected_ids:
                    raise ValueError(f"Question {qid} is not part of this assessment")
                existing = db.query(AnswerRecord).filter_by(assessment_id=assessment_id, question_id=qid).first()
                if existing:
                    existing.yes_no = sub.yesNo
                    existing.justification = sub.justification
                    existing.value = sub.value
                    existing.updated_at = now
                    existing.updated_by_email = updated_by_email
                else:
                    db.add(AnswerRecord(
                        id=str(uuid.uuid4()),
                        assessment_id=assessment_id,
                        question_id=qid,
                        yes_no=sub.yesNo,
                        justification=sub.justification,
                        value=sub.value,
                        updated_at=now,
                        updated_by_email=updated_by_email,
                    ))
            db.flush()  # make new rows visible to the count query below
            total = len(selected_ids)
            all_ans = db.query(AnswerRecord).filter_by(assessment_id=assessment_id).all()
            answered = sum(1 for a in all_ans if (a.yes_no and a.yes_no.strip()) or (a.value and a.value.strip()))
            rec.total_questions = total
            rec.answered_questions = answered
            rec.completion_percent = round(answered / total * 100, 2) if total else 0.0
        return self.get_assessment_by_id(assessment_id)

    def update_assessment_answers(self, assessment_id: str, answers: Dict[str, str]) -> Assessment:
        from app.models import AnswerSubmission
        subs = [AnswerSubmission(questionId=qid, value=val) for qid, val in answers.items()]
        return self.update_assessment_answers_v2(assessment_id, subs)

    def get_assessment_questions_with_answers(self, assessment_id: str) -> List[QuestionWithAnswer]:
        assessment = self.get_assessment_by_id(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment '{assessment_id}' not found")
        result = []
        for qid in assessment.selectedQuestionIds:
            q = self.questions.get(qid)
            if q:
                ans = assessment.answers.get(qid)
                result.append(QuestionWithAnswer(
                    id=q.id, familyId=q.familyId, familyName=q.familyName,
                    controlRefs=q.controlRefs, questionText=q.questionText,
                    stakeholderRoleId=q.stakeholderRoleId, answerType=q.answerType,
                    criticality=q.criticality, functionId=q.functionId,
                    functionName=q.functionName, subcategoryText=q.subcategoryText,
                    answerValue=ans.value if ans else None,
                    answerYesNo=ans.yesNo if ans else None,
                    answerJustification=ans.justification if ans else None,
                ))
        return result


data_store = DataStore()
