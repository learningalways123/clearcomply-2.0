"""
Demo seed data for Clear Comply.

Loaded on first startup (when the DB has no assessments).
Creates 4 realistic assessments across NIST 800-53 and NIST CSF 2.0 with
varied completion levels, answer patterns, and POA&M items — giving the
dashboard and risk views interesting data straight away.
"""

import json
import random
import uuid
from datetime import datetime, timedelta

from app.database import db_session
from app.db_models import AssessmentRecord, AnswerRecord, PoamRecord, UserRecord


# ─── Answer patterns (index into a question list) ────────────────────────────
# (start, count, yes_rate, has_narrative)
SCENARIO_HIGH_COMPLETION = dict(start=0, count=40, yes_rate=0.75)
SCENARIO_MID_COMPLETION = dict(start=0, count=25, yes_rate=0.60)
SCENARIO_LOW_COMPLETION = dict(start=0, count=12, yes_rate=0.50)
SCENARIO_REVIEWED = dict(start=0, count=50, yes_rate=0.85)

JUSTIFICATIONS = [
    "Policy documented in our ISMS and reviewed annually.",
    "Controls implemented via CrowdStrike EDR and reviewed quarterly.",
    "Vendor assessment completed Q1 2026; SLA in place.",
    "Access reviews conducted every 90 days through our IAM platform.",
    "Incident response playbook updated March 2026.",
    "Training completion rate 94% as of April 2026.",
    "Evidence uploaded in SharePoint security folder.",
    "Not yet implemented — identified as a gap. Due Q3 2026.",
    "Partial controls in place; full remediation underway.",
    "Third-party audit confirmed compliance in Feb 2026.",
]

GAP_JUSTIFICATIONS = [
    "No formal policy exists. Owner assigned: CISO. Target: Q3 2026.",
    "Tool not yet procured. Budget approved for next quarter.",
    "Process exists informally but not documented.",
    "Last review was >12 months ago. Renewal overdue.",
    "Coverage limited to production only; dev/test excluded.",
]


def _pick(lst, seed_offset=0):
    random.seed(42 + seed_offset)
    return random.choice(lst)


def seed_demo_data():
    """Call on startup. If assessments already exist, do nothing."""
    with db_session() as db:
        count = db.query(AssessmentRecord).count()
        if count > 0:
            return
        print("[seed] No assessments found — loading demo data…")
        # Ensure the demo user exists (FK constraint on created_by_email)
        demo_user = db.query(UserRecord).filter_by(email="demo@clearcomply.io").first()
        if not demo_user:
            db.add(UserRecord(
                id=str(uuid.uuid4()),
                google_id="demo-seed-user",
                email="demo@clearcomply.io",
                name="Demo Admin",
                role="admin",
                created_at=datetime.utcnow(),
            ))

    # Import here to avoid circular deps during early startup
    from app.data_store import data_store

    nist_qs = data_store.get_questions_by_framework("NIST-800-53")

    if not nist_qs:
        print("[seed] Question banks not loaded yet — skipping seed.")
        return

    _create_assessment(
        name="FY2026 NIST 800-53 Full Assessment",
        framework_id="NIST-800-53",
        questions=nist_qs,
        scenario=SCENARIO_HIGH_COMPLETION,
        status="in_progress",
        days_ago=45,
        seed=1,
        poam_titles=[
            ("Awareness & Training policy not formally approved", "high",
             "Existing policy draft needs legal sign-off and board approval."),
            ("Access review cadence below policy requirement", "medium",
             "Reviews running every 180 days vs required 90 days. IAM team assigned."),
            ("Incident response tabletop exercise overdue", "medium",
             "Last exercise was 14 months ago. Scheduling Q3 2026 exercise now."),
        ],
    )

    _create_assessment(
        name="Critical Systems NIST 800-53 Review",
        framework_id="NIST-800-53",
        questions=nist_qs,
        scenario=SCENARIO_MID_COMPLETION,
        status="submitted",
        days_ago=20,
        seed=3,
        poam_titles=[
            ("No automated vulnerability scanning on legacy systems", "high",
             "Legacy ERP excluded from Qualys scans. Waiver approved to Q4 2026."),
            ("Contingency plan not tested in 18 months", "medium",
             "DR test scheduled for September 2026. Owners notified."),
            ("Vendor security assessments incomplete for 3 suppliers", "low",
             "Tier-2 vendors pending questionnaire. Due August 2026."),
        ],
    )

    print("[seed] Demo data loaded successfully ✓")


def _create_assessment(
    name: str,
    framework_id: str,
    questions: list,
    scenario: dict,
    status: str,
    days_ago: int,
    seed: int,
    poam_titles: list,
):
    rng = random.Random(seed * 100)
    count = min(scenario["count"], len(questions))
    selected_qs = questions[:count]
    selected_q_ids = [q.id for q in selected_qs]

    created_at = datetime.utcnow() - timedelta(days=days_ago)
    assessment_id = str(uuid.uuid4())

    # Compute stats
    total_q = len(selected_q_ids)
    answers_to_submit = _build_answers(selected_qs, scenario["yes_rate"], rng)
    answered = len(answers_to_submit)
    completion_pct = round(answered / total_q * 100, 2) if total_q else 0.0
    coverage_pct = round(count / max(len(questions), 1) * 100, 2)

    with db_session() as db:
        rec = AssessmentRecord(
            id=assessment_id,
            name=name,
            status=status,
            framework_ids=json.dumps([framework_id]),
            selected_control_ids=json.dumps([]),
            selected_question_ids=json.dumps(selected_q_ids),
            module_ids=json.dumps([]),
            family_ids=json.dumps([]),
            created_at=created_at,
            created_by_email="demo@clearcomply.io",
            total_controls=0,
            selected_controls_count=0,
            coverage_percent=coverage_pct,
            total_questions=total_q,
            answered_questions=answered,
            completion_percent=completion_pct,
        )
        db.add(rec)

        for ans in answers_to_submit:
            db.add(AnswerRecord(
                id=str(uuid.uuid4()),
                assessment_id=assessment_id,
                question_id=ans["question_id"],
                yes_no=ans.get("yes_no"),
                justification=ans.get("justification"),
                value=ans.get("value"),
                updated_at=created_at + timedelta(hours=rng.randint(1, 48)),
                updated_by_email="demo@clearcomply.io",
            ))

        for title, priority, desc in poam_titles:
            # Find a relevant question to link (first 'No' answer)
            linked_qid = next(
                (a["question_id"] for a in answers_to_submit if a.get("yes_no", "").lower() == "no"),
                None,
            )
            db.add(PoamRecord(
                id=str(uuid.uuid4()),
                assessment_id=assessment_id,
                question_id=linked_qid,
                title=title,
                description=desc,
                status="open",
                priority=priority,
                due_date=(datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d"),
                owner="CISO Team",
                created_at=created_at + timedelta(days=2),
                updated_at=created_at + timedelta(days=2),
            ))

        # Seed Checklist Items
        from app.db_models import ChecklistItemRecord, IntakeTeamRecord, RiskQuestionRecord, InventoryItemRecord
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
                assessment_id=assessment_id,
                title=title,
                status=status,
                target_link=link
            ))

        # Seed Intake Teams
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
                assessment_id=assessment_id,
                name=name,
                lead_name=lead_name,
                lead_email=lead_email,
                response_rate=response_rate,
                status=t_status,
                last_active_days_ago=active_days,
                families=families
            ))

        # Seed Risk Questions
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
                assessment_id=assessment_id,
                question_text=q_text,
                mapped_control=control,
                response=resp,
                points_missed=pts
            ))

        # Seed Inventory Items
        inventory_items = [
            ("Server 01", "VM", "Active", "IT Operations"),
            ("Production DB", "Database", "Active", "Business / Data Owners"),
            ("Secure Gateway", "Network Device", "Active", "IT Operations"),
            ("Assessor Laptop", "Workstation", "Active", "Security Team")
        ]
        for name, type_str, i_status, owner in inventory_items:
            db.add(InventoryItemRecord(
                id=str(uuid.uuid4()),
                assessment_id=assessment_id,
                name=name,
                type=type_str,
                status=i_status,
                owner=owner
            ))


    print(f"[seed]   Created: '{name}' ({answered}/{total_q} answered, status={status})")


def _build_answers(questions: list, yes_rate: float, rng: random.Random) -> list:
    answers = []
    for q in questions:
        roll = rng.random()
        if roll < 0.15:
            # Leave unanswered
            continue
        if roll < 0.15 + (yes_rate * 0.85):
            yn = "Yes"
            just = _pick(JUSTIFICATIONS, seed_offset=rng.randint(0, 50))
        else:
            yn = "No"
            just = _pick(GAP_JUSTIFICATIONS, seed_offset=rng.randint(0, 50))
        answers.append({
            "question_id": q.id,
            "yes_no": yn,
            "justification": just,
            "value": yn,
        })
    return answers
