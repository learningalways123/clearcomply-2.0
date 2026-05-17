"""
Unit tests for DataStore — static (in-memory) data and SQLite-persisted data.
"""

import pytest


# ── Frameworks ────────────────────────────────────────────────────────────────

def test_get_all_frameworks_returns_four(store):
    frameworks = store.get_all_frameworks()
    assert len(frameworks) == 4


def test_framework_ids_are_expected(store):
    ids = {f.id for f in store.get_all_frameworks()}
    assert ids == {"SOC2", "NIST-800-53", "NIST-CSF-2.0", "ISO27001"}


def test_get_framework_by_id_known(store):
    fw = store.get_framework_by_id("SOC2")
    assert fw is not None
    assert fw.name == "SOC 2"


def test_get_framework_by_id_unknown_returns_none(store):
    assert store.get_framework_by_id("DOES-NOT-EXIST") is None


# ── Controls ──────────────────────────────────────────────────────────────────

def test_get_all_controls_non_empty(store):
    assert len(store.get_all_controls()) > 0


def test_get_controls_by_framework_soc2(store):
    controls = store.get_controls_by_framework("SOC2")
    assert len(controls) > 0
    assert all(c.frameworkId == "SOC2" for c in controls)


def test_get_controls_by_unknown_framework_empty(store):
    assert store.get_controls_by_framework("FAKE") == []


def test_get_controls_by_ids(store):
    all_ids = [c.id for c in store.get_all_controls()][:3]
    result = store.get_controls_by_ids(all_ids)
    assert len(result) == 3
    assert {c.id for c in result} == set(all_ids)


def test_get_controls_count_for_frameworks(store):
    soc2_count = store.get_controls_count_for_frameworks(["SOC2"])
    assert soc2_count > 0
    both = store.get_controls_count_for_frameworks(["SOC2", "ISO27001"])
    assert both >= soc2_count


# ── Questions ────────────────────────────────────────────────────────────────

def test_questions_loaded(store):
    # NIST 800-53 and CSF 2.0 JSON files should load
    assert len(store.get_all_questions()) > 100


def test_get_questions_by_framework_nist(store):
    qs = store.get_questions_by_framework("NIST-800-53")
    assert len(qs) > 0
    assert all(q.frameworkId == "NIST-800-53" for q in qs)


def test_get_question_by_id_roundtrip(store):
    first_q = store.get_all_questions()[0]
    found = store.get_question_by_id(first_q.id)
    assert found is not None
    assert found.id == first_q.id


def test_get_question_by_id_unknown_returns_none(store):
    assert store.get_question_by_id("no-such-id") is None


def test_get_csf_modules_returns_modules(store):
    modules = store.get_csf_modules("NIST-CSF-2.0")
    assert len(modules) > 0
    for m in modules:
        assert "moduleId" in m and "moduleName" in m and "questionCount" in m


def test_get_csf_modules_wrong_framework_empty(store):
    assert store.get_csf_modules("SOC2") == []


# ── Assessments (SQLite) ──────────────────────────────────────────────────────

def _make_assessment(store, name="Test Assessment", framework="NIST-800-53"):
    """Helper: pick 5 questions and create an assessment."""
    questions = store.get_questions_by_framework(framework)[:5]
    qids = [q.id for q in questions]
    from app.models import Assessment, AssessmentStats, AssessmentQuestionStats
    from datetime import datetime
    import uuid

    a = Assessment(
        id=str(uuid.uuid4()),
        name=name,
        frameworkIds=[framework],
        selectedControlIds=[],
        selectedQuestionIds=qids,
        moduleIds=[],
        familyIds=[],
        createdAt=datetime.utcnow(),
        stats=AssessmentStats(totalControls=10, selectedControls=0, coveragePercent=0.0),
        questionStats=AssessmentQuestionStats(totalQuestions=len(qids), answeredQuestions=0, completionPercent=0.0),
    )
    return store.create_assessment(a), qids


def test_create_assessment_persists(store):
    created, _ = _make_assessment(store)
    fetched = store.get_assessment_by_id(created.id)
    assert fetched is not None
    assert fetched.name == created.name


def test_get_all_assessments_includes_created(store):
    _make_assessment(store, "Alpha")
    _make_assessment(store, "Beta")
    all_a = store.get_all_assessments()
    names = {a.name for a in all_a}
    assert "Alpha" in names and "Beta" in names


def test_get_assessment_by_id_unknown_returns_none(store):
    assert store.get_assessment_by_id("00000000-0000-0000-0000-000000000000") is None


def test_assessment_question_ids_preserved(store):
    created, qids = _make_assessment(store)
    fetched = store.get_assessment_by_id(created.id)
    assert set(fetched.selectedQuestionIds) == set(qids)


# ── Answers (SQLite) ─────────────────────────────────────────────────────────

def test_submit_answers_updates_completion(store):
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    subs = [AnswerSubmission(questionId=qids[0], yesNo="Yes", justification="OK")]
    updated = store.update_assessment_answers_v2(created.id, subs)
    assert updated.questionStats.answeredQuestions == 1
    assert updated.questionStats.completionPercent > 0


def test_submit_all_answers_100_percent(store):
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    subs = [AnswerSubmission(questionId=q, yesNo="Yes") for q in qids]
    updated = store.update_assessment_answers_v2(created.id, subs)
    assert updated.questionStats.answeredQuestions == len(qids)
    assert updated.questionStats.completionPercent == 100.0


def test_submit_answer_upsert(store):
    """Submitting the same question twice should upsert, not duplicate."""
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    store.update_assessment_answers_v2(created.id, [AnswerSubmission(questionId=qids[0], yesNo="Yes")])
    store.update_assessment_answers_v2(created.id, [AnswerSubmission(questionId=qids[0], yesNo="No")])
    fetched = store.get_assessment_by_id(created.id)
    assert fetched.answers[qids[0]].yesNo == "No"
    assert fetched.questionStats.answeredQuestions == 1


def test_submit_answer_invalid_question_raises(store):
    created, _ = _make_assessment(store)
    from app.models import AnswerSubmission
    with pytest.raises(ValueError, match="not part of this assessment"):
        store.update_assessment_answers_v2(
            created.id, [AnswerSubmission(questionId="fake-question-id", yesNo="Yes")]
        )


def test_submit_answer_unknown_assessment_raises(store):
    from app.models import AnswerSubmission
    with pytest.raises(ValueError, match="not found"):
        store.update_assessment_answers_v2(
            "no-such-id", [AnswerSubmission(questionId="q1", yesNo="Yes")]
        )


def test_get_assessment_questions_with_answers(store):
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    store.update_assessment_answers_v2(created.id, [AnswerSubmission(questionId=qids[0], yesNo="Yes")])
    result = store.get_assessment_questions_with_answers(created.id)
    assert len(result) == len(qids)
    answered = [r for r in result if r.answerYesNo == "Yes"]
    assert len(answered) == 1


# ── Status transitions (SQLite) ───────────────────────────────────────────────

def test_assessment_default_status_is_in_progress(store):
    created, _ = _make_assessment(store)
    assert created.status == "in_progress"


def test_update_assessment_status_valid_transition(store):
    created, _ = _make_assessment(store)
    updated = store.update_assessment_status(created.id, "submitted")
    assert updated.status == "submitted"


def test_update_assessment_status_persisted(store):
    created, _ = _make_assessment(store)
    store.update_assessment_status(created.id, "submitted")
    fetched = store.get_assessment_by_id(created.id)
    assert fetched.status == "submitted"


def test_update_assessment_status_unknown_id_returns_none(store):
    # data_store raises ValueError when assessment not found
    with pytest.raises(ValueError, match="not found"):
        store.update_assessment_status("no-such-id", "submitted")


# ── Risk scoring ──────────────────────────────────────────────────────────────

def test_risk_score_none_when_no_answers(store):
    created, _ = _make_assessment(store)
    fetched = store.get_assessment_by_id(created.id)
    assert fetched.riskScore is None


def test_risk_score_computed_after_yes_answers(store):
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    subs = [AnswerSubmission(questionId=q, yesNo="Yes") for q in qids]
    store.update_assessment_answers_v2(created.id, subs)
    fetched = store.get_assessment_by_id(created.id)
    assert fetched.riskScore is not None
    assert 0.0 <= fetched.riskScore <= 100.0


def test_risk_score_all_no_is_zero(store):
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    subs = [AnswerSubmission(questionId=q, yesNo="No") for q in qids]
    store.update_assessment_answers_v2(created.id, subs)
    fetched = store.get_assessment_by_id(created.id)
    assert fetched.riskScore == 0.0


def test_risk_score_all_yes_is_100(store):
    created, qids = _make_assessment(store)
    from app.models import AnswerSubmission
    subs = [AnswerSubmission(questionId=q, yesNo="Yes") for q in qids]
    store.update_assessment_answers_v2(created.id, subs)
    fetched = store.get_assessment_by_id(created.id)
    assert fetched.riskScore == 100.0


# ── POA&M CRUD (SQLite) ───────────────────────────────────────────────────────

def _make_poam(store, assessment_id, title="Fix gap", priority="high"):
    from app.models import CreatePoamRequest
    req = CreatePoamRequest(
        assessmentId=assessment_id,
        title=title,
        description="Needs remediation",
        priority=priority,
        dueDate="2026-12-31",
        owner="security-team",
    )
    return store.create_poam_item(req)


def test_create_poam_item(store):
    created, _ = _make_assessment(store)
    item = _make_poam(store, created.id)
    assert item.id is not None
    assert item.title == "Fix gap"
    assert item.status == "open"
    assert item.priority == "high"
    assert item.assessmentId == created.id


def test_get_all_poam_items(store):
    created, _ = _make_assessment(store)
    _make_poam(store, created.id, "Item 1")
    _make_poam(store, created.id, "Item 2")
    items = store.get_all_poam_items()
    assert len(items) == 2


def test_get_poam_items_filter_by_assessment(store):
    a1, _ = _make_assessment(store, "A1")
    a2, _ = _make_assessment(store, "A2")
    _make_poam(store, a1.id, "A1 item")
    _make_poam(store, a2.id, "A2 item")
    items = store.get_all_poam_items(assessment_id=a1.id)
    assert len(items) == 1
    assert items[0].assessmentId == a1.id


def test_get_poam_items_filter_by_status(store):
    created, _ = _make_assessment(store)
    _make_poam(store, created.id, "Open item")
    item2 = _make_poam(store, created.id, "Will close")
    from app.models import UpdatePoamRequest
    store.update_poam_item(item2.id, UpdatePoamRequest(status="closed"))
    open_items = store.get_all_poam_items(status="open")
    assert len(open_items) == 1
    assert open_items[0].title == "Open item"


def test_update_poam_item_status_transition(store):
    created, _ = _make_assessment(store)
    item = _make_poam(store, created.id)
    from app.models import UpdatePoamRequest
    updated = store.update_poam_item(item.id, UpdatePoamRequest(status="in_remediation"))
    assert updated.status == "in_remediation"
    assert updated.closedAt is None


def test_update_poam_item_closed_sets_closed_at(store):
    created, _ = _make_assessment(store)
    item = _make_poam(store, created.id)
    from app.models import UpdatePoamRequest
    updated = store.update_poam_item(item.id, UpdatePoamRequest(status="closed"))
    assert updated.status == "closed"
    assert updated.closedAt is not None


def test_update_poam_item_partial_fields(store):
    created, _ = _make_assessment(store)
    item = _make_poam(store, created.id)
    from app.models import UpdatePoamRequest
    updated = store.update_poam_item(item.id, UpdatePoamRequest(owner="new-owner", priority="low"))
    assert updated.owner == "new-owner"
    assert updated.priority == "low"
    assert updated.status == "open"  # unchanged


def test_delete_poam_item(store):
    created, _ = _make_assessment(store)
    item = _make_poam(store, created.id)
    assert store.delete_poam_item(item.id) is None  # returns None on success
    assert store.get_all_poam_items() == []


def test_delete_poam_item_unknown_raises(store):
    with pytest.raises(ValueError, match="not found"):
        store.delete_poam_item("no-such-id")
