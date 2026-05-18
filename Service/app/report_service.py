"""
Report Generation Service — Phase 2 Sprint 15-16

Generates:
  - PDF Executive Summary (2-4 pages)
  - PDF Technical Assessment Report (full control-by-control)
  - XLSX Gap Analysis spreadsheet
"""

from __future__ import annotations
import io
import json
from datetime import date, datetime
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ─── Shared helpers ───────────────────────────────────────────────────────────

BRAND_PRIMARY = colors.HexColor("#4f46e5")
BRAND_DARK    = colors.HexColor("#3730a3")
BRAND_LIGHT   = colors.HexColor("#e0e7ff")
RED           = colors.HexColor("#dc2626")
ORANGE        = colors.HexColor("#d97706")
GREEN         = colors.HexColor("#059669")
GREY          = colors.HexColor("#6b7280")
LIGHT_GREY    = colors.HexColor("#f3f4f6")


def _base_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("brand_title",
        fontName="Helvetica-Bold", fontSize=24, textColor=BRAND_PRIMARY,
        spaceAfter=6))
    styles.add(ParagraphStyle("section_header",
        fontName="Helvetica-Bold", fontSize=13, textColor=BRAND_DARK,
        spaceBefore=14, spaceAfter=4))
    styles.add(ParagraphStyle("body_small",
        fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#374151"),
        spaceAfter=4, leading=13))
    styles.add(ParagraphStyle("caption",
        fontName="Helvetica", fontSize=8, textColor=GREY,
        spaceAfter=2))
    styles.add(ParagraphStyle("label",
        fontName="Helvetica-Bold", fontSize=9, textColor=BRAND_DARK))
    return styles


def _risk_color(score: float):
    if score >= 90: return GREEN
    if score >= 75: return colors.HexColor("#16a34a")
    if score >= 50: return ORANGE
    if score >= 25: return colors.HexColor("#ea580c")
    return RED


def _risk_band(score: float) -> str:
    if score >= 90: return "Compliant"
    if score >= 75: return "Low Risk"
    if score >= 50: return "Medium Risk"
    if score >= 25: return "High Risk"
    return "Critical Risk"


# ─── Executive Summary PDF ────────────────────────────────────────────────────

def generate_executive_summary_pdf(
    assessment_name: str,
    framework_names: List[str],
    risk_score_data: dict,
    completion_percent: float,
    answered: int,
    total: int,
    high_gaps: int,
    created_by: str,
    engagement_name: str = "",
    org_name: str = "ClearComply",
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            topMargin=0.75*inch, bottomMargin=0.75*inch,
                            leftMargin=1*inch, rightMargin=1*inch)
    styles = _base_styles()
    story = []
    overall = risk_score_data.get("overallScore", 0)
    band = _risk_band(overall)
    band_color = _risk_color(overall)

    # Cover header
    story.append(Paragraph(org_name, styles["brand_title"]))
    story.append(Paragraph("Security Assessment — Executive Summary", styles["Heading2"]))
    if engagement_name:
        story.append(Paragraph(engagement_name, styles["body_small"]))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_PRIMARY, spaceAfter=10))

    # Meta table
    meta_data = [
        ["Assessment", assessment_name],
        ["Framework(s)", ", ".join(framework_names)],
        ["Prepared By", created_by],
        ["Date", date.today().strftime("%B %d, %Y")],
        ["Status", "CONFIDENTIAL"],
    ]
    meta_tbl = Table(meta_data, colWidths=[1.6*inch, 4.5*inch])
    meta_tbl.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND_DARK),
        ("TOPPADDING",(0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 16))

    # Score highlight
    story.append(Paragraph("Overall Risk Posture", styles["section_header"]))
    score_data = [
        [Paragraph(f"<font size=36 color='#{band_color.hexval()[2:]}'><b>{overall:.1f}%</b></font>", styles["body_small"]),
         Paragraph(f"<b>{band}</b><br/>The overall compliance score is based on {answered} answered questions out of {total} total across {', '.join(framework_names)}.", styles["body_small"])],
    ]
    score_tbl = Table(score_data, colWidths=[1.8*inch, 4.3*inch])
    score_tbl.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BACKGROUND", (0,0), (0,0), BRAND_LIGHT),
        ("ROWBACKGROUNDS", (1,0),(1,-1), [colors.white]),
        ("BOX", (0,0), (-1,-1), 0.5, BRAND_PRIMARY),
        ("TOPPADDING", (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING", (0,0),(-1,-1), 10),
    ]))
    story.append(score_tbl)
    story.append(Spacer(1, 16))

    # Stats summary
    story.append(Paragraph("Key Metrics", styles["section_header"]))
    metrics = [
        ["Metric", "Value"],
        ["Questions Answered", f"{answered} / {total} ({completion_percent:.1f}%)"],
        ["High-Risk Gaps", str(risk_score_data.get("highGaps", 0))],
        ["Medium-Risk Gaps", str(risk_score_data.get("mediumGaps", 0))],
        ["Low-Risk Gaps", str(risk_score_data.get("lowGaps", 0))],
        ["Risk Band", band],
    ]
    metrics_tbl = Table(metrics, colWidths=[3*inch, 3.1*inch])
    metrics_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",      (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    story.append(metrics_tbl)
    story.append(Spacer(1, 16))

    # Domain scores
    domain_scores = risk_score_data.get("domainScores", [])
    if domain_scores:
        story.append(Paragraph("Domain Risk Breakdown (Worst First)", styles["section_header"]))
        domain_rows = [["Domain", "Score", "Gaps", "Risk Band"]]
        for d in domain_scores[:15]:
            sc = d.get("score", 0) if isinstance(d, dict) else d.score
            name = d.get("domainName", "") if isinstance(d, dict) else d.domainName
            gaps = d.get("gapCount", 0) if isinstance(d, dict) else d.gapCount
            domain_rows.append([name, f"{sc:.1f}%", str(gaps), _risk_band(sc)])
        dom_tbl = Table(domain_rows, colWidths=[2.8*inch, 1*inch, 0.8*inch, 1.5*inch])
        dom_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), BRAND_PRIMARY),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(dom_tbl)

    # Footer disclaimer
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY))
    story.append(Paragraph(
        "This report is confidential and intended solely for the use of the named organization. "
        "Generated by ClearComply Assessment Platform.",
        styles["caption"]
    ))

    doc.build(story)
    return buf.getvalue()


# ─── Technical Assessment Report PDF ─────────────────────────────────────────

def generate_technical_report_pdf(
    assessment_name: str,
    framework_names: List[str],
    questions_with_answers: List[dict],
    risk_score_data: dict,
    completion_percent: float,
    created_by: str,
    engagement_name: str = "",
    org_name: str = "ClearComply",
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            topMargin=0.75*inch, bottomMargin=0.75*inch,
                            leftMargin=1*inch, rightMargin=1*inch)
    styles = _base_styles()
    story = []
    overall = risk_score_data.get("overallScore", 0)

    # Cover
    story.append(Paragraph(org_name, styles["brand_title"]))
    story.append(Paragraph("Security Assessment — Technical Report", styles["Heading2"]))
    if engagement_name:
        story.append(Paragraph(engagement_name, styles["body_small"]))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_PRIMARY, spaceAfter=10))
    meta_data = [
        ["Assessment", assessment_name],
        ["Framework(s)", ", ".join(framework_names)],
        ["Prepared By", created_by],
        ["Date", date.today().strftime("%B %d, %Y")],
        ["Overall Score", f"{overall:.1f}% — {_risk_band(overall)}"],
    ]
    meta_tbl = Table(meta_data, colWidths=[1.6*inch, 4.5*inch])
    meta_tbl.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND_DARK),
        ("TOPPADDING",(0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
    ]))
    story.append(meta_tbl)
    story.append(PageBreak())

    # Group by family
    families: dict[str, list] = {}
    for q in questions_with_answers:
        fid = q.get("familyId", "other")
        fname = q.get("familyName", fid)
        key = f"{fid}||{fname}"
        families.setdefault(key, []).append(q)

    for key, qs in families.items():
        fname = key.split("||", 1)[1]
        story.append(Paragraph(fname, styles["section_header"]))
        for q in qs:
            story.append(Paragraph(
                f"<b>[{q.get('criticality','—')}]</b> {q.get('questionText','')[:300]}",
                styles["body_small"]
            ))
            ans_parts = []
            impl = q.get("implementationStatus") or q.get("answerYesNo", "")
            if impl:
                ans_parts.append(f"Status: <b>{impl}</b>")
            desc = q.get("implementationDescription") or q.get("answerJustification") or q.get("answerValue", "")
            if desc:
                ans_parts.append(f"Description: {str(desc)[:500]}")
            role = q.get("responsibleRole")
            if role:
                ans_parts.append(f"Responsible Role: {role}")
            if ans_parts:
                story.append(Paragraph(" &nbsp;&nbsp;".join(ans_parts), styles["body_small"]))
            else:
                story.append(Paragraph("<i>Not answered</i>", styles["caption"]))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 6))

    # Sign-off
    story.append(PageBreak())
    story.append(Paragraph("Assessor Sign-Off", styles["section_header"]))
    story.append(Paragraph(f"Assessor: {created_by}", styles["body_small"]))
    story.append(Paragraph(f"Date: {date.today().strftime('%B %d, %Y')}", styles["body_small"]))
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width=3*inch, thickness=0.5, color=GREY))
    story.append(Paragraph("Signature", styles["caption"]))

    doc.build(story)
    return buf.getvalue()


# ─── Gap Analysis XLSX ────────────────────────────────────────────────────────

def generate_gap_analysis_xlsx(
    assessment_name: str,
    questions_with_answers: List[dict],
) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Gap Analysis"

    # Header styling
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor="4F46E5")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin = Side(style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    headers = [
        "Control / Question ID", "Family / Domain", "Question",
        "Criticality", "Implementation Status", "Yes/No",
        "Description / Justification", "Responsible Role",
        "Assessment Methods", "Inherited", "Gap?"
    ]
    ws.append(headers)
    for col_num, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = border

    # Column widths
    col_widths = [20, 22, 50, 12, 25, 8, 45, 22, 22, 10, 8]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Freeze header
    ws.freeze_panes = "A2"

    alt_fill = PatternFill("solid", fgColor="F9FAFB")
    gap_fill = PatternFill("solid", fgColor="FEF2F2")

    row_idx = 2
    for q in questions_with_answers:
        impl = q.get("implementationStatus") or ""
        yn = q.get("answerYesNo") or ""
        desc = q.get("implementationDescription") or q.get("answerJustification") or q.get("answerValue") or ""
        methods = q.get("assessmentMethods")
        methods_str = ", ".join(methods) if isinstance(methods, list) else (methods or "")
        inherited = "Yes" if q.get("inherited") else "No"
        is_gap = (
            impl.lower() in ("not implemented", "partially implemented", "planned") or
            yn.lower() == "no" or
            (not impl and not yn)
        )
        row = [
            ", ".join(q.get("controlRefs", [])) or q.get("id", ""),
            q.get("familyName", ""),
            q.get("questionText", "")[:500],
            q.get("criticality", ""),
            impl or "Not answered",
            yn,
            str(desc)[:500],
            q.get("responsibleRole") or "",
            methods_str,
            inherited,
            "Yes" if is_gap else "No",
        ]
        ws.append(row)
        fill = gap_fill if is_gap else (alt_fill if row_idx % 2 == 0 else PatternFill())
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = border
            if is_gap:
                cell.fill = gap_fill
            elif row_idx % 2 == 0:
                cell.fill = alt_fill
        row_idx += 1

    # Auto filter
    ws.auto_filter.ref = ws.dimensions

    # Summary sheet
    ws2 = wb.create_sheet("Summary")
    ws2.append(["Assessment", assessment_name])
    ws2.append(["Generated", date.today().isoformat()])
    ws2.append([])
    ws2.append(["Total Controls", len(questions_with_answers)])
    gaps = [q for q in questions_with_answers if (
        (q.get("implementationStatus") or "").lower() in ("not implemented", "partially implemented", "planned") or
        (q.get("answerYesNo") or "").lower() == "no"
    )]
    ws2.append(["Total Gaps", len(gaps)])
    high_gaps = [g for g in gaps if str(g.get("criticality","")).lower() == "high"]
    ws2.append(["High Criticality Gaps", len(high_gaps)])
    ws2.column_dimensions["A"].width = 30
    ws2.column_dimensions["B"].width = 20

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─── POA&M XLSX ───────────────────────────────────────────────────────────────

def generate_poam_xlsx(
    assessment_name: str,
    poam_items: List[dict],
) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "POA&M"

    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor="4F46E5")
    thin = Side(style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    headers = [
        "Item ID", "Assessment", "Title", "Description",
        "Priority", "Status", "Owner", "Due Date",
        "Question ID", "Created At", "Closed At"
    ]
    ws.append(headers)
    for col_num, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    col_widths = [12, 25, 40, 50, 10, 18, 22, 14, 20, 20, 20]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"

    priority_fills = {
        "high":   PatternFill("solid", fgColor="FEE2E2"),
        "medium": PatternFill("solid", fgColor="FEF3C7"),
        "low":    PatternFill("solid", fgColor="F0FDF4"),
    }

    for row_idx, item in enumerate(poam_items, 2):
        priority = str(item.get("priority", "medium")).lower()
        row = [
            item.get("id", "")[:8],
            assessment_name,
            item.get("title", ""),
            item.get("description") or "",
            item.get("priority", ""),
            item.get("status", ""),
            item.get("owner") or "",
            item.get("dueDate") or "",
            item.get("questionId") or "",
            str(item.get("createdAt", ""))[:10],
            str(item.get("closedAt", "") or ""),
        ]
        ws.append(row)
        fill = priority_fills.get(priority, PatternFill())
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = border
            if fill:
                cell.fill = fill

    ws.auto_filter.ref = ws.dimensions

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
