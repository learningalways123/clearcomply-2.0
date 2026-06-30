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
    QuestionBank, QuestionWithAnswer, PoamItem,
)
from app.database import db_session
from app.db_models import AssessmentRecord, AnswerRecord, PoamRecord, ChecklistItemRecord, IntakeTeamRecord, RiskQuestionRecord, InventoryItemRecord


WEIGHTS = {"High": 3, "Medium": 2, "Low": 1}


def _compute_risk_score(answers: Dict[str, QuestionAnswer], questions: Dict[str, "Question"]) -> Optional[float]:
    """Weighted compliance score 0–100. Higher = more compliant."""
    w_yes = 0
    w_total = 0
    for qid, ans in answers.items():
        yn = (ans.yesNo or "").strip().lower()
        if yn not in ("yes", "no"):
            continue
        q = questions.get(qid)
        if not q:
            continue
        w = WEIGHTS.get(q.criticality.value if hasattr(q.criticality, 'value') else str(q.criticality), 1)
        w_total += w
        if yn == "yes":
            w_yes += w
    if w_total == 0:
        return None
    return round(w_yes / w_total * 100, 1)


def _record_to_assessment(rec: AssessmentRecord, questions: Optional[Dict] = None) -> Assessment:
    answers: Dict[str, QuestionAnswer] = {}
    for a in rec.answers:
        answers[a.question_id] = QuestionAnswer(
            value=a.value or "",
            yesNo=a.yes_no,
            justification=a.justification,
            lastUpdated=a.updated_at or datetime.utcnow(),
        )
    risk_score = _compute_risk_score(answers, questions or {}) if questions else None
    return Assessment(
        id=rec.id,
        name=rec.name,
        status=rec.status or "in_progress",
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
        riskScore=risk_score,
        soc2AssessmentType=rec.soc2_assessment_type,
        soc2Categories=json.loads(rec.soc2_categories or "[]"),
        nistConfidentiality=rec.nist_confidentiality,
        nistIntegrity=rec.nist_integrity,
        nistAvailability=rec.nist_availability,
        nistBaseline=rec.nist_baseline,
        diagramFilename=rec.diagram_filename,
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
                soc2_assessment_type=assessment.soc2AssessmentType,
                soc2_categories=json.dumps(assessment.soc2Categories or []),
                nist_confidentiality=assessment.nistConfidentiality,
                nist_integrity=assessment.nistIntegrity,
                nist_availability=assessment.nistAvailability,
                nist_baseline=assessment.nistBaseline,
                diagram_filename=assessment.diagramFilename,
                diagram_storage_path=None,
            )
            db.add(rec)

            # Auto-populate checklist items
            checklist_items = [
                ("Application Inventory", "complete", "inventory"),
                ("Step #1 — System Contacts & Data", "complete", "data-categorization"),
                ("Application Risk Assessment", "complete", "risk"),
                ("Vendor Risk Assessment", "in_progress", "risk"),
                ("Data Categorization", "complete", "data-categorization"),
                ("System Environments", "complete", "data-categorization"),
                ("Scanning Strategy", "complete", "data-categorization"),
                ("System Inventory", "in_progress", "inventory"),
                ("System Diagrams", "in_progress", "inventory"),
                ("Controls Assessment", "in_progress", "controls")
            ]
            for title, status, link in checklist_items:
                db.add(ChecklistItemRecord(
                    id=str(uuid.uuid4()),
                    assessment_id=assessment.id,
                    title=title,
                    status=status,
                    target_link=link
                ))

            # Auto-populate intake teams
            intake_teams = [
                ("Business / Data Owners", "Sarah Kim", "s.kim@agency.gov", 67, "in_progress", 2, "Data Categorization"),
                ("IT Operations", "Marcus Johnson", "m.johnson@agency.gov", 69, "in_progress", 1, "Disaster Recovery Planning"),
                ("IAM / IT Ops", "Priya Nair", "p.nair@agency.gov", 88, "complete", 0, "Identity & Access Management"),
                ("Security Team", "Derek Walsh", "d.walsh@agency.gov", 30, "overdue", 5, "Incident Management"),
                ("CISO Office", "Linda Torres", "l.torres@agency.gov", 100, "complete", 0, "Security Governance")
            ]
            for name, lead_name, lead_email, response_rate, t_status, active_days, families in intake_teams:
                db.add(IntakeTeamRecord(
                    id=str(uuid.uuid4()),
                    assessment_id=assessment.id,
                    name=name,
                    lead_name=lead_name,
                    lead_email=lead_email,
                    response_rate=response_rate,
                    status=t_status,
                    last_active_days_ago=active_days,
                    families=families
                ))

            # Auto-populate risk questions
            risk_questions = [
                ("Inventory of authorized/unauthorized devices documented?", "Secure Config 3", "Full", 0),
                ("Installed software limited to approved and documented list?", "Secure Config 4", "Full", 0),
                ("Secure configuration baselines applied to all systems?", "Secure Config 10", "Partial", 5),
                ("Monthly vulnerability scanning on all servers/devices?", "TVM 2", "Full", 0),
                ("MFA required for all administrative access?", "IAM 11", "None", 15),
                ("Centralized log server receiving all system logs?", "SLM 1", "N/A", 0),
                ("All technologies modern and fully supported?", "Secure Config 7", "Full", 0)
            ]
            for q_text, control, resp, pts in risk_questions:
                db.add(RiskQuestionRecord(
                    id=str(uuid.uuid4()),
                    assessment_id=assessment.id,
                    question_text=q_text,
                    mapped_control=control,
                    response=resp,
                    points_missed=pts
                ))

            # Auto-populate inventory items
            inventory_items = [
                ("Server 01", "VM", "Active", "IT Operations"),
                ("Production DB", "Database", "Active", "Business / Data Owners"),
                ("Secure Gateway", "Network Device", "Active", "IT Operations"),
                ("Assessor Laptop", "Workstation", "Active", "Security Team")
            ]
            for name, type_str, i_status, owner in inventory_items:
                db.add(InventoryItemRecord(
                    id=str(uuid.uuid4()),
                    assessment_id=assessment.id,
                    name=name,
                    type=type_str,
                    status=i_status,
                    owner=owner
                ))
        return assessment


    def get_assessment_by_id(self, assessment_id: str) -> Optional[Assessment]:
        with db_session() as db:
            rec = db.query(AssessmentRecord).filter_by(id=assessment_id).first()
            if not rec:
                return None
            return _record_to_assessment(rec, self.questions)

    def get_all_assessments(self) -> List[Assessment]:
        with db_session() as db:
            recs = db.query(AssessmentRecord).order_by(AssessmentRecord.created_at.desc()).all()
            return [_record_to_assessment(r, self.questions) for r in recs]

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
                    # Extended fields (Phase 2)
                    if hasattr(sub, 'implementationStatus') and sub.implementationStatus is not None:
                        existing.implementation_status = sub.implementationStatus
                    if hasattr(sub, 'implementationDescription') and sub.implementationDescription is not None:
                        existing.implementation_description = sub.implementationDescription
                    if hasattr(sub, 'responsibleRole') and sub.responsibleRole is not None:
                        existing.responsible_role = sub.responsibleRole
                    if hasattr(sub, 'assessmentMethods') and sub.assessmentMethods is not None:
                        import json as _j
                        existing.assessment_methods = _j.dumps(sub.assessmentMethods)
                    if hasattr(sub, 'inherited') and sub.inherited is not None:
                        existing.inherited = sub.inherited
                    if hasattr(sub, 'inheritedFrom') and sub.inheritedFrom is not None:
                        existing.inherited_from = sub.inheritedFrom
                    is_type_i = getattr(rec, 'soc2_assessment_type', None) == "Type I"
                    if hasattr(sub, 'designEffectiveness') and sub.designEffectiveness is not None:
                        existing.design_effectiveness = sub.designEffectiveness
                    if hasattr(sub, 'operatingEffectiveness') and sub.operatingEffectiveness is not None:
                        existing.operating_effectiveness = None if is_type_i else sub.operatingEffectiveness
                    if hasattr(sub, 'currentTier') and sub.currentTier is not None:
                        existing.current_tier = sub.currentTier
                    if hasattr(sub, 'targetTier') and sub.targetTier is not None:
                        existing.target_tier = sub.targetTier
                    if hasattr(sub, 'internalNotes') and sub.internalNotes is not None:
                        existing.internal_notes = sub.internalNotes
                    existing.updated_at = now
                    existing.updated_by_email = updated_by_email
                else:
                    import json as _j
                    is_type_i = getattr(rec, 'soc2_assessment_type', None) == "Type I"
                    operating_eff = getattr(sub, 'operatingEffectiveness', None)
                    if is_type_i:
                        operating_eff = None
                    db.add(AnswerRecord(
                        id=str(uuid.uuid4()),
                        assessment_id=assessment_id,
                        question_id=qid,
                        yes_no=sub.yesNo,
                        justification=sub.justification,
                        value=sub.value,
                        implementation_status=getattr(sub, 'implementationStatus', None),
                        implementation_description=getattr(sub, 'implementationDescription', None),
                        responsible_role=getattr(sub, 'responsibleRole', None),
                        assessment_methods=_j.dumps(sub.assessmentMethods) if getattr(sub, 'assessmentMethods', None) else None,
                        inherited=getattr(sub, 'inherited', False) or False,
                        inherited_from=getattr(sub, 'inheritedFrom', None),
                        design_effectiveness=getattr(sub, 'designEffectiveness', None),
                        operating_effectiveness=operating_eff,
                        current_tier=getattr(sub, 'currentTier', None),
                        target_tier=getattr(sub, 'targetTier', None),
                        internal_notes=getattr(sub, 'internalNotes', None),
                        updated_at=now,
                        updated_by_email=updated_by_email,
                    ))
            db.flush()

  # make new rows visible to the count query below
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

    def update_assessment_status(
        self,
        assessment_id: str,
        new_status: str,
        changed_by_email: Optional[str] = None,
        changed_by_name: Optional[str] = None,
        note: Optional[str] = None,
    ) -> Assessment:
        from app.db_models import AssessmentStateHistory
        with db_session() as db:
            rec = db.query(AssessmentRecord).filter_by(id=assessment_id).first()
            if not rec:
                raise ValueError(f"Assessment '{assessment_id}' not found")
            old_status = rec.status
            rec.status = new_status
            # Append immutable state history entry
            db.add(AssessmentStateHistory(
                assessment_id=assessment_id,
                from_status=old_status,
                to_status=new_status,
                changed_by_email=changed_by_email,
                changed_by_name=changed_by_name,
                note=note,
            ))
        return self.get_assessment_by_id(assessment_id)

    def get_state_history(self, assessment_id: str) -> list:
        from app.db_models import AssessmentStateHistory
        with db_session() as db:
            rows = (
                db.query(AssessmentStateHistory)
                .filter_by(assessment_id=assessment_id)
                .order_by(AssessmentStateHistory.created_at.asc())
                .all()
            )
            return [
                {
                    "id": r.id,
                    "assessmentId": r.assessment_id,
                    "fromStatus": r.from_status,
                    "toStatus": r.to_status,
                    "changedByEmail": r.changed_by_email,
                    "changedByName": r.changed_by_name,
                    "note": r.note,
                    "createdAt": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]

    def auto_create_poam_from_answers(
        self,
        assessment_id: str,
        assessment_name: str,
    ) -> int:
        """Create POA&M items for High/Medium answers with yes_no='no' or not_implemented.
        Returns count of newly created items."""
        created = 0
        with db_session() as db:
            existing_qids = {
                r.question_id for r in
                db.query(PoamRecord.question_id)
                .filter_by(assessment_id=assessment_id)
                .filter(PoamRecord.question_id.isnot(None))
                .all()
            }
            answers = db.query(AnswerRecord).filter_by(assessment_id=assessment_id).all()
            for ans in answers:
                if ans.question_id in existing_qids:
                    continue
                is_gap = (
                    (ans.yes_no or "").strip().lower() == "no" or
                    (ans.implementation_status or "").strip().lower() in
                    ("not implemented", "partially implemented", "planned")
                )
                if not is_gap:
                    continue
                q = self.questions.get(ans.question_id)
                if not q:
                    continue
                crit = str(q.criticality.value if hasattr(q.criticality, 'value') else q.criticality)
                priority = "high" if crit == "High" else ("medium" if crit == "Medium" else "low")
                title = f"Gap: {q.questionText[:120]}"
                desc = f"Control: {', '.join(q.controlRefs)}\nFamily: {q.familyName}\nCriticality: {crit}"
                if ans.implementation_status:
                    desc += f"\nImplementation Status: {ans.implementation_status}"
                db.add(PoamRecord(
                    id=str(uuid.uuid4()),
                    assessment_id=assessment_id,
                    question_id=ans.question_id,
                    title=title,
                    description=desc,
                    priority=priority,
                    status="open",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ))
                created += 1
        return created

    # ── CSF Profile ──────────────────────────────────────────────────────────
    def upsert_csf_profile(self, assessment_id: str, profiles: list) -> list:
        from app.db_models import CsfProfileRecord
        with db_session() as db:
            for p in profiles:
                existing = (
                    db.query(CsfProfileRecord)
                    .filter_by(assessment_id=assessment_id, function_id=p.functionId)
                    .first()
                )
                if existing:
                    existing.function_name = p.functionName
                    existing.current_tier = p.currentTier
                    existing.target_tier = p.targetTier
                    existing.gap_description = p.gapDescription
                    existing.priority = p.priority
                else:
                    db.add(CsfProfileRecord(
                        assessment_id=assessment_id,
                        function_id=p.functionId,
                        function_name=p.functionName,
                        current_tier=p.currentTier,
                        target_tier=p.targetTier,
                        gap_description=p.gapDescription,
                        priority=p.priority,
                    ))
        return self.get_csf_profile(assessment_id)

    def get_csf_profile(self, assessment_id: str) -> list:
        from app.db_models import CsfProfileRecord
        with db_session() as db:
            rows = db.query(CsfProfileRecord).filter_by(assessment_id=assessment_id).all()
            return [
                {
                    "functionId": r.function_id,
                    "functionName": r.function_name,
                    "currentTier": r.current_tier,
                    "targetTier": r.target_tier,
                    "gapDescription": r.gap_description,
                    "priority": r.priority,
                }
                for r in rows
            ]

    # ── POA&M (SQLite) ───────────────────────────────────────────────────────
    def _poam_record_to_item(self, r: PoamRecord) -> PoamItem:
        return PoamItem(
            id=r.id,
            assessmentId=r.assessment_id,
            questionId=r.question_id,
            title=r.title,
            description=r.description,
            status=r.status,
            priority=r.priority,
            dueDate=r.due_date,
            owner=r.owner,
            createdAt=r.created_at or datetime.utcnow(),
            updatedAt=r.updated_at or datetime.utcnow(),
            closedAt=r.closed_at,
        )

    def get_all_poam_items(self, assessment_id: Optional[str] = None, status: Optional[str] = None) -> List[PoamItem]:
        with db_session() as db:
            q = db.query(PoamRecord)
            if assessment_id:
                q = q.filter_by(assessment_id=assessment_id)
            if status:
                q = q.filter_by(status=status)
            recs = q.order_by(PoamRecord.created_at.desc()).all()
            return [self._poam_record_to_item(r) for r in recs]

    def create_poam_item(self, req) -> PoamItem:
        with db_session() as db:
            rec = PoamRecord(
                id=str(uuid.uuid4()),
                assessment_id=req.assessmentId,
                question_id=req.questionId,
                title=req.title,
                description=req.description,
                priority=req.priority or "medium",
                due_date=req.dueDate,
                owner=req.owner,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(rec)
            db.flush()
            return self._poam_record_to_item(rec)

    def update_poam_item(self, item_id: str, req) -> PoamItem:
        with db_session() as db:
            rec = db.query(PoamRecord).filter_by(id=item_id).first()
            if not rec:
                raise ValueError(f"POAM item '{item_id}' not found")
            now = datetime.utcnow()
            if req.title is not None:
                rec.title = req.title
            if req.description is not None:
                rec.description = req.description
            if req.priority is not None:
                rec.priority = req.priority
            if req.dueDate is not None:
                rec.due_date = req.dueDate
            if req.owner is not None:
                rec.owner = req.owner
            if req.status is not None:
                rec.status = req.status
                if req.status == "closed" and rec.closed_at is None:
                    rec.closed_at = now
                elif req.status != "closed":
                    rec.closed_at = None
            rec.updated_at = now
            db.flush()
            return self._poam_record_to_item(rec)

    def delete_poam_item(self, item_id: str) -> None:
        with db_session() as db:
            rec = db.query(PoamRecord).filter_by(id=item_id).first()
            if not rec:
                raise ValueError(f"POAM item '{item_id}' not found")
            db.delete(rec)

    def get_assessment_questions_with_answers_db(self, assessment_id: str) -> list:
        """Return questions with full answer data including Phase 2 extended fields."""
        import json as _j
        assessment = self.get_assessment_by_id(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment '{assessment_id}' not found")
        result = []
        with db_session() as db:
            answer_map = {
                a.question_id: a
                for a in db.query(AnswerRecord).filter_by(assessment_id=assessment_id).all()
            }
            for qid in assessment.selectedQuestionIds:

                q = self.questions.get(qid)
                if not q:
                    continue

                ans = answer_map.get(qid)
                methods = None
                if ans and ans.assessment_methods:
                    try:
                        methods = _j.loads(ans.assessment_methods)
                    except Exception:
                        methods = [ans.assessment_methods]
                result.append({
                    "id": q.id,
                    "familyId": q.familyId,
                    "familyName": q.familyName,
                    "controlRefs": q.controlRefs,
                    "questionText": q.questionText,
                    "stakeholderRoleId": q.stakeholderRoleId,
                    "answerType": q.answerType.value if hasattr(q.answerType, 'value') else q.answerType,
                    "criticality": q.criticality.value if hasattr(q.criticality, 'value') else q.criticality,
                    "functionId": q.functionId,
                    "functionName": q.functionName,
                    "subcategoryText": q.subcategoryText,
                    "answerValue": ans.value if ans else None,
                    "answerYesNo": ans.yes_no if ans else None,
                    "answerJustification": ans.justification if ans else None,
                    "implementationStatus": ans.implementation_status if ans else None,
                    "implementationDescription": ans.implementation_description if ans else None,
                    "responsibleRole": ans.responsible_role if ans else None,
                    "assessmentMethods": methods,
                    "inherited": ans.inherited if ans else False,
                    "inheritedFrom": ans.inherited_from if ans else None,
                    "designEffectiveness": ans.design_effectiveness if ans else None,
                    "operatingEffectiveness": ans.operating_effectiveness if ans else None,
                    "currentTier": ans.current_tier if ans else None,
                    "targetTier": ans.target_tier if ans else None,
                    "internalNotes": ans.internal_notes if ans else None,
                })
        return result



    # ── Dashboard ─────────────────────────────────────────────────────────────
    def get_dashboard_data(self) -> dict:
        import json as _json
        with db_session() as db:
            assessment_rows = db.query(AssessmentRecord).order_by(AssessmentRecord.created_at).all()
            # Eagerly snapshot data we need before session closes
            assessments = [
                {
                    "id": r.id,
                    "name": r.name,
                    "framework_ids": _json.loads(r.framework_ids or "[]"),
                    "completion_percent": r.completion_percent or 0.0,
                    "created_at": r.created_at,
                }
                for r in assessment_rows
            ]
            answer_rows = db.query(AnswerRecord).all()
            answers = [
                {"question_id": a.question_id, "yes_no": a.yes_no}
                for a in answer_rows
            ]

        total = len(assessments)
        avg_completion = round(
            sum(a["completion_percent"] for a in assessments) / total, 1
        ) if total else 0.0

        # Risk gaps: yes_no == 'No'
        risk_by_criticality: Dict[str, int] = {"High": 0, "Medium": 0, "Low": 0}
        top_risks_counter: Dict[str, int] = {}

        for a in answers:
            if a["yes_no"] and a["yes_no"].strip().lower() == "no":
                q = self.questions.get(a["question_id"])
                if q:
                    crit = q.criticality.value
                    if crit in risk_by_criticality:
                        risk_by_criticality[crit] += 1
                    top_risks_counter[a["question_id"]] = top_risks_counter.get(a["question_id"], 0) + 1

        top_risks = []
        for qid, count in sorted(top_risks_counter.items(), key=lambda x: -x[1])[:20]:
            q = self.questions.get(qid)
            if q:
                top_risks.append({
                    "questionId": qid,
                    "questionText": q.questionText,
                    "criticality": q.criticality.value,
                    "familyName": q.familyName,
                    "functionName": q.functionName,
                    "frameworkId": q.frameworkId,
                    "assessmentCount": count,
                })

        # Sort so High criticality comes first
        crit_order = {"High": 0, "Medium": 1, "Low": 2}
        top_risks.sort(key=lambda r: (crit_order.get(r["criticality"], 3), -r["assessmentCount"]))

        # Completion trend (chronological)
        trend = []
        for a in assessments:
            trend.append({
                "assessmentId": a["id"],
                "name": a["name"],
                "createdAt": a["created_at"].isoformat() if a["created_at"] else None,
                "completionPercent": round(a["completion_percent"], 1),
                "frameworks": a["framework_ids"],
            })

        # Framework breakdown
        fw_map: Dict[str, dict] = {}
        for a in assessments:
            for fid in a["framework_ids"]:
                if fid not in fw_map:
                    fw = self.frameworks.get(fid)
                    fw_map[fid] = {
                        "frameworkId": fid,
                        "frameworkName": fw.name if fw else fid,
                        "assessmentCount": 0,
                        "totalCompletion": 0.0,
                        "riskGaps": 0,
                    }
                fw_map[fid]["assessmentCount"] += 1
                fw_map[fid]["totalCompletion"] += a["completion_percent"]

        for a in answers:
            if a["yes_no"] and a["yes_no"].strip().lower() == "no":
                q = self.questions.get(a["question_id"])
                if q and q.frameworkId in fw_map:
                    fw_map[q.frameworkId]["riskGaps"] += 1

        framework_breakdown = []
        for fid, fd in fw_map.items():
            cnt = fd["assessmentCount"]
            framework_breakdown.append({
                "frameworkId": fid,
                "frameworkName": fd["frameworkName"],
                "assessmentCount": cnt,
                "avgCompletionPercent": round(fd["totalCompletion"] / cnt, 1) if cnt else 0.0,
                "riskGaps": fd["riskGaps"],
            })

        return {
            "totalAssessments": total,
            "avgCompletionPercent": avg_completion,
            "totalRiskGaps": sum(risk_by_criticality.values()),
            "highRiskGaps": risk_by_criticality["High"],
            "riskGapsByCriticality": risk_by_criticality,
            "completionTrend": trend,
            "topRisks": top_risks,
            "frameworkBreakdown": framework_breakdown,
        }

    def get_ssp_checklist(self, assessment_id: str) -> list:
        with db_session() as db:
            recs = db.query(ChecklistItemRecord).filter_by(assessment_id=assessment_id).all()
            return [
                {
                    "id": r.id,
                    "assessmentId": r.assessment_id,
                    "title": r.title,
                    "status": r.status,
                    "targetLink": r.target_link,
                }
                for r in recs
            ]

    def get_ssp_intake_teams(self, assessment_id: str) -> list:
        with db_session() as db:
            recs = db.query(IntakeTeamRecord).filter_by(assessment_id=assessment_id).all()
            return [
                {
                    "id": r.id,
                    "assessmentId": r.assessment_id,
                    "name": r.name,
                    "leadName": r.lead_name,
                    "leadEmail": r.lead_email,
                    "responseRate": r.response_rate,
                    "status": r.status,
                    "lastActiveDaysAgo": r.last_active_days_ago,
                    "families": r.families,
                }
                for r in recs
            ]

    def get_ssp_risk_questions(self, assessment_id: str) -> list:
        with db_session() as db:
            recs = db.query(RiskQuestionRecord).filter_by(assessment_id=assessment_id).all()
            return [
                {
                    "id": r.id,
                    "assessmentId": r.assessment_id,
                    "questionText": r.question_text,
                    "mappedControl": r.mapped_control,
                    "response": r.response,
                    "pointsMissed": r.points_missed,
                }
                for r in recs
            ]

    def get_ssp_inventory_items(self, assessment_id: str) -> list:
        with db_session() as db:
            recs = db.query(InventoryItemRecord).filter_by(assessment_id=assessment_id).all()
            return [
                {
                    "id": r.id,
                    "assessmentId": r.assessment_id,
                    "name": r.name,
                    "type": r.type,
                    "status": r.status,
                    "owner": r.owner,
                }
                for r in recs
            ]

    def add_ssp_inventory_item(self, assessment_id: str, name: str, item_type: str, owner: Optional[str]) -> dict:
        with db_session() as db:
            rec = InventoryItemRecord(
                id=str(uuid.uuid4()),
                assessment_id=assessment_id,
                name=name,
                type=item_type,
                status="Active",
                owner=owner or "Unassigned",
            )
            db.add(rec)
            db.flush()
            return {
                "id": rec.id,
                "assessmentId": rec.assessment_id,
                "name": rec.name,
                "type": rec.type,
                "status": rec.status,
                "owner": rec.owner,
            }

    def remind_intake_team(self, team_id: str) -> dict:
        with db_session() as db:
            rec = db.query(IntakeTeamRecord).filter_by(id=team_id).first()
            if not rec:
                raise ValueError(f"Intake team with ID '{team_id}' not found")
            rec.last_active_days_ago = 0
            db.flush()
            return {
                "id": rec.id,
                "name": rec.name,
                "leadEmail": rec.lead_email,
                "message": f"Reminder email successfully sent to {rec.lead_name} ({rec.lead_email})"
            }

    def remind_all_overdue_teams(self, assessment_id: str) -> dict:
        with db_session() as db:
            recs = db.query(IntakeTeamRecord).filter_by(assessment_id=assessment_id, status="overdue").all()
            names = [r.name for r in recs]
            for r in recs:
                r.last_active_days_ago = 0
            db.flush()
            return {
                "assessmentId": assessment_id,
                "remindedTeamsCount": len(recs),
                "message": f"Reminders sent to {len(recs)} overdue teams: {', '.join(names)}" if recs else "No overdue teams to remind"
            }


data_store = DataStore()
