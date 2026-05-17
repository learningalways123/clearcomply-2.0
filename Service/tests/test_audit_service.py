"""
Unit tests for audit_service — log_action() and get_audit_log().
"""

import pytest
from app.audit_service import log_action, get_audit_log


def test_log_action_creates_entry():
    log_action(action="TEST_ACTION", entity_type="assessment", entity_id="abc-123")
    entries = get_audit_log()
    assert len(entries) == 1
    assert entries[0]["action"] == "TEST_ACTION"
    assert entries[0]["entityId"] == "abc-123"


def test_log_action_with_user_and_detail():
    log_action(
        action="CREATE_ASSESSMENT",
        user_email="user@example.com",
        user_name="Alice",
        entity_type="assessment",
        entity_id="id-1",
        detail={"name": "SOC2 Audit"},
    )
    entries = get_audit_log()
    e = entries[0]
    assert e["userEmail"] == "user@example.com"
    assert e["userName"] == "Alice"
    assert e["detail"]["name"] == "SOC2 Audit"


def test_log_multiple_entries_ordered_newest_first():
    log_action(action="FIRST")
    log_action(action="SECOND")
    log_action(action="THIRD")
    entries = get_audit_log()
    actions = [e["action"] for e in entries]
    assert actions[0] == "THIRD"
    assert actions[-1] == "FIRST"


def test_get_audit_log_filter_by_action():
    log_action(action="LOGIN")
    log_action(action="SUBMIT_ANSWERS", entity_id="a1")
    log_action(action="SUBMIT_ANSWERS", entity_id="a2")
    entries = get_audit_log(action="SUBMIT_ANSWERS")
    assert len(entries) == 2
    assert all(e["action"] == "SUBMIT_ANSWERS" for e in entries)


def test_get_audit_log_filter_by_user_email():
    log_action(action="A", user_email="alice@example.com")
    log_action(action="B", user_email="bob@example.com")
    entries = get_audit_log(user_email="alice@example.com")
    assert len(entries) == 1
    assert entries[0]["userEmail"] == "alice@example.com"


def test_get_audit_log_filter_by_entity_id():
    log_action(action="X", entity_id="entity-99")
    log_action(action="Y", entity_id="entity-00")
    entries = get_audit_log(entity_id="entity-99")
    assert len(entries) == 1
    assert entries[0]["entityId"] == "entity-99"


def test_get_audit_log_limit():
    for i in range(10):
        log_action(action=f"ACTION_{i}")
    entries = get_audit_log(limit=3)
    assert len(entries) == 3


def test_get_audit_log_offset():
    for i in range(5):
        log_action(action=f"A{i}")
    all_entries = get_audit_log(limit=5)
    paged = get_audit_log(limit=5, offset=2)
    assert len(paged) == 3
    assert all_entries[2]["id"] == paged[0]["id"]


def test_log_action_none_detail_is_safe():
    """detail=None should not crash and should be stored as None."""
    log_action(action="NO_DETAIL")
    entries = get_audit_log()
    assert entries[0]["detail"] is None


def test_log_action_timestamp_is_string():
    log_action(action="TIMESTAMPED")
    entries = get_audit_log()
    ts = entries[0]["timestamp"]
    assert isinstance(ts, str) and len(ts) > 10
