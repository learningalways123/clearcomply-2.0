"""
Risk Scoring Service — Phase 2 Sprint 13-14

Calculates weighted compliance risk scores per control/domain/overall.

Implementation Status Weights:
  Implemented                → 1.0
  Alternative Implementation → 0.8
  Partially Implemented      → 0.5
  Planned                    → 0.3
  Inherited                  → 1.0  (counts as implemented)
  Not Applicable             → excluded from score
  Not Implemented            → 0.0
  N/A                        → excluded

When no implementation_status is present (legacy yes/no answers):
  yes  → 1.0   no → 0.0   (blank → excluded)

Criticality Multipliers (for gap severity counts):
  High   → 3
  Medium → 2
  Low    → 1
"""

from __future__ import annotations
from typing import List, Dict, Optional, TYPE_CHECKING
from app.models import DomainRiskScore, RiskScoreResponse

if TYPE_CHECKING:
    from app.data_store import DataStore

# ─── Weight tables ────────────────────────────────────────────────────────────

IMPL_WEIGHTS: Dict[str, float] = {
    "implemented": 1.0,
    "alternative implementation": 0.8,
    "partially implemented": 0.5,
    "planned": 0.3,
    "inherited": 1.0,
    "not implemented": 0.0,
}
EXCLUDED_STATUSES = {"not applicable", "n/a", "not_applicable"}

CRIT_MULTIPLIER: Dict[str, int] = {"High": 3, "Medium": 2, "Low": 1}


def _impl_weight(answer) -> Optional[float]:
    """Return weight [0,1] or None if excluded/unanswerable."""
    # Extended field takes priority
    if answer.implementation_status:
        key = answer.implementation_status.strip().lower()
        if key in EXCLUDED_STATUSES:
            return None
        return IMPL_WEIGHTS.get(key, 0.0)

    # Fall back to yes/no
    yn = (answer.yes_no or "").strip().lower()
    if yn in ("yes", "y"):
        return 1.0
    if yn in ("no", "n"):
        return 0.0
    return None  # blank/unanswered → excluded


def compute_risk_score(assessment, data_store) -> RiskScoreResponse:
    """
    Compute the full risk score for an assessment.

    Returns a RiskScoreResponse with overall score + per-domain breakdown.
    """
    from app.data_store import AnswerRecord as _AR  # avoid circular at module load

    # Fetch all answers keyed by question_id
    answer_map: Dict[str, any] = {
        a.question_id: a for a in assessment.answers
        if hasattr(a, "question_id")
    }

    # Group questions by family/domain
    domain_data: Dict[str, Dict] = {}

    for qid in assessment.selected_question_ids_list():
        question = data_store.get_question_by_id(qid)
        if not question:
            continue
        domain_id = question.familyId
        domain_name = question.familyName
        if domain_id not in domain_data:
            domain_data[domain_id] = {
                "name": domain_name,
                "weights": [],
                "crits": [],
                "gaps": {"High": 0, "Medium": 0, "Low": 0},
            }

        ans = answer_map.get(qid)
        w = _impl_weight(ans) if ans else None

        if w is not None:
            domain_data[domain_id]["weights"].append(w)
            domain_data[domain_id]["crits"].append(question.criticality)
            if w < 1.0:
                crit = question.criticality if hasattr(question.criticality, "__str__") else "Low"
                crit_str = str(crit)
                domain_data[domain_id]["gaps"][crit_str] = domain_data[domain_id]["gaps"].get(crit_str, 0) + 1

    # Per-domain scores
    domain_scores: List[DomainRiskScore] = []
    total_weighted_sum = 0.0
    total_weight_count = 0
    total_gaps = {"High": 0, "Medium": 0, "Low": 0}

    for domain_id, d in domain_data.items():
        ws = d["weights"]
        if not ws:
            continue
        score = round(sum(ws) / len(ws) * 100, 1)
        answered = sum(1 for w in ws if w >= 1.0)

        domain_scores.append(DomainRiskScore(
            domain=d["name"],
            score=score,
            totalControls=len(ws),
            answeredControls=answered,
            highGaps=d["gaps"].get("High", 0),
            mediumGaps=d["gaps"].get("Medium", 0),
            lowGaps=d["gaps"].get("Low", 0),
        ))
        total_weighted_sum += sum(ws)
        total_weight_count += len(ws)
        for k, v in d["gaps"].items():
            total_gaps[k] = total_gaps.get(k, 0) + v

    overall = round(total_weighted_sum / total_weight_count * 100, 1) if total_weight_count else 0.0

    # Sort domains by score ascending (worst first)
    domain_scores.sort(key=lambda x: x.score)

    # Risk band
    if overall >= 90:
        band = "Minimal"
    elif overall >= 75:
        band = "Low"
    elif overall >= 50:
        band = "Medium"
    elif overall >= 25:
        band = "High"
    else:
        band = "Critical"

    return RiskScoreResponse(
        assessmentId=assessment.id,
        overallScore=overall,
        riskBand=band,
        domainScores=domain_scores,
        highGaps=total_gaps.get("High", 0),
        mediumGaps=total_gaps.get("Medium", 0),
        lowGaps=total_gaps.get("Low", 0),
        totalControls=total_weight_count,
        answeredControls=sum(d.answeredControls for d in domain_scores),
    )
