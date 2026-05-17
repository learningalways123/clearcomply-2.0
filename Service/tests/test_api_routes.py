"""
Integration tests for the FastAPI API routes using httpx TestClient.

All tests run against an in-memory SQLite database (see conftest.py).
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    """Fresh TestClient per test (DB is wiped by the autouse reset_db fixture)."""
    from main import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── /api/frameworks ───────────────────────────────────────────────────────────

def test_get_frameworks_returns_list(client):
    resp = client.get("/api/frameworks")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 4


def test_frameworks_have_required_fields(client):
    resp = client.get("/api/frameworks")
    for fw in resp.json():
        assert "id" in fw and "name" in fw and "description" in fw


# ── /api/controls ─────────────────────────────────────────────────────────────

def test_get_all_controls(client):
    resp = client.get("/api/controls")
    assert resp.status_code == 200
    assert len(resp.json()) > 0


def test_get_controls_filter_by_framework(client):
    resp = client.get("/api/controls?frameworkId=SOC2")
    assert resp.status_code == 200
    controls = resp.json()
    assert len(controls) > 0
    assert all(c["frameworkId"] == "SOC2" for c in controls)


def test_get_controls_unknown_framework_404(client):
    resp = client.get("/api/controls?frameworkId=FAKE")
    assert resp.status_code == 404


# ── /api/questions ────────────────────────────────────────────────────────────

def test_get_questions_returns_many(client):
    resp = client.get("/api/questions")
    assert resp.status_code == 200
    assert len(resp.json()) > 100


def test_get_questions_filter_by_framework(client):
    resp = client.get("/api/questions?framework_id=NIST-800-53")
    assert resp.status_code == 200
    qs = resp.json()
    assert len(qs) > 0
    assert all(q["frameworkId"] == "NIST-800-53" for q in qs)


def test_get_question_by_id(client):
    qs = client.get("/api/questions?framework_id=NIST-800-53").json()
    qid = qs[0]["id"]
    resp = client.get(f"/api/questions/{qid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == qid


def test_get_question_by_id_unknown_404(client):
    resp = client.get("/api/questions/no-such-question")
    assert resp.status_code == 404


# ── /api/frameworks/{id}/modules ─────────────────────────────────────────────

def test_get_csf_modules(client):
    resp = client.get("/api/frameworks/NIST-CSF-2.0/modules")
    assert resp.status_code == 200
    modules = resp.json()
    assert len(modules) > 0
    assert all("moduleId" in m for m in modules)


def test_get_modules_non_csf_400(client):
    resp = client.get("/api/frameworks/SOC2/modules")
    assert resp.status_code == 400


def test_get_modules_unknown_framework_404(client):
    resp = client.get("/api/frameworks/FAKE/modules")
    assert resp.status_code == 404


# ── /api/assessments (CRUD) ───────────────────────────────────────────────────

def _create_nist_assessment(client, name="Test"):
    return client.post("/api/assessments", json={
        "name": name,
        "frameworkIds": ["NIST-800-53"],
        "selectedControlIds": [],
    })


def test_create_assessment_success(client):
    resp = _create_nist_assessment(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test"
    assert len(data["selectedQuestionIds"]) > 0
    assert "id" in data


def test_create_assessment_persists(client):
    created = _create_nist_assessment(client, "Persist Test").json()
    resp = client.get(f"/api/assessments/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Persist Test"


def test_create_assessment_invalid_framework_400(client):
    resp = client.post("/api/assessments", json={
        "name": "Bad",
        "frameworkIds": ["NOT-REAL"],
        "selectedControlIds": [],
    })
    assert resp.status_code == 400


def test_create_assessment_empty_name_422(client):
    resp = client.post("/api/assessments", json={
        "name": "",
        "frameworkIds": ["NIST-800-53"],
        "selectedControlIds": [],
    })
    assert resp.status_code == 422


def test_get_all_assessments(client):
    _create_nist_assessment(client, "Alpha")
    _create_nist_assessment(client, "Beta")
    resp = client.get("/api/assessments")
    assert resp.status_code == 200
    names = {a["name"] for a in resp.json()}
    assert "Alpha" in names and "Beta" in names


def test_get_assessment_unknown_404(client):
    resp = client.get("/api/assessments/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# ── /api/assessments/{id}/answers ────────────────────────────────────────────

def test_submit_answers_updates_stats(client):
    created = _create_nist_assessment(client).json()
    qid = created["selectedQuestionIds"][0]

    resp = client.post(f"/api/assessments/{created['id']}/answers", json={
        "answers": [{"questionId": qid, "yesNo": "Yes", "justification": "Implemented"}]
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["answeredQuestions"] == 1
    assert data["completionPercent"] > 0


def test_submit_answers_all_complete(client):
    created = _create_nist_assessment(client).json()
    qids = created["selectedQuestionIds"]

    answers = [{"questionId": q, "yesNo": "Yes"} for q in qids]
    resp = client.post(f"/api/assessments/{created['id']}/answers", json={"answers": answers})
    assert resp.status_code == 200
    data = resp.json()
    assert data["answeredQuestions"] == len(qids)
    assert data["completionPercent"] == 100.0


def test_submit_answers_invalid_question_400(client):
    created = _create_nist_assessment(client).json()
    resp = client.post(f"/api/assessments/{created['id']}/answers", json={
        "answers": [{"questionId": "fake-q-id", "yesNo": "Yes"}]
    })
    assert resp.status_code == 400


def test_submit_answers_unknown_assessment_404(client):
    resp = client.post("/api/assessments/no-such-id/answers", json={
        "answers": [{"questionId": "q1", "yesNo": "Yes"}]
    })
    assert resp.status_code == 404


# ── /api/assessments/{id}/questions ──────────────────────────────────────────

def test_get_assessment_questions(client):
    created = _create_nist_assessment(client).json()
    resp = client.get(f"/api/assessments/{created['id']}/questions")
    assert resp.status_code == 200
    qs = resp.json()
    assert len(qs) == len(created["selectedQuestionIds"])


def test_assessment_questions_reflect_submitted_answer(client):
    created = _create_nist_assessment(client).json()
    qid = created["selectedQuestionIds"][0]
    client.post(f"/api/assessments/{created['id']}/answers", json={
        "answers": [{"questionId": qid, "yesNo": "No", "justification": "Gap"}]
    })
    qs = client.get(f"/api/assessments/{created['id']}/questions").json()
    answered = next(q for q in qs if q["id"] == qid)
    assert answered["answerYesNo"] == "No"
    assert answered["answerJustification"] == "Gap"


# ── /api/audit-log ────────────────────────────────────────────────────────────

def test_audit_log_empty_initially(client):
    resp = client.get("/api/audit-log")
    assert resp.status_code == 200
    data = resp.json()
    assert "entries" in data
    assert isinstance(data["entries"], list)


def test_audit_log_records_answer_submission(client):
    created = _create_nist_assessment(client).json()
    qid = created["selectedQuestionIds"][0]
    client.post(f"/api/assessments/{created['id']}/answers", json={
        "answers": [{"questionId": qid, "yesNo": "Yes"}]
    })
    resp = client.get("/api/audit-log")
    entries = resp.json()["entries"]
    actions = [e["action"] for e in entries]
    assert "SUBMIT_ANSWERS" in actions


def test_audit_log_filter_by_action(client):
    created = _create_nist_assessment(client).json()
    qid = created["selectedQuestionIds"][0]
    client.post(f"/api/assessments/{created['id']}/answers", json={
        "answers": [{"questionId": qid, "yesNo": "Yes"}]
    })
    resp = client.get("/api/audit-log?action=SUBMIT_ANSWERS")
    entries = resp.json()["entries"]
    assert all(e["action"] == "SUBMIT_ANSWERS" for e in entries)


def test_audit_log_pagination(client):
    resp = client.get("/api/audit-log?limit=5&offset=0")
    assert resp.status_code == 200


# ── /api/status ───────────────────────────────────────────────────────────────

def test_health_check(client):
    resp = client.get("/api/status")
    assert resp.status_code == 200
    assert resp.json().get("status") in ("healthy", "operational")
