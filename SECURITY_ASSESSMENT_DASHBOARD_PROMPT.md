# Security Assessment Dashboard — Expert Requirements Prompt

**Authored by**: Senior Security Assessor Perspective  
**Target Frameworks**: SOC 2 Type I/II · NIST 800-53 Rev 5 · NIST Cybersecurity Framework 2.0  
**Target Audience**: Internal security teams at small-to-mid-size organizations (50–2,500 employees)  
**Document Purpose**: Detailed product requirements for an AI-assisted, web-based security assessment platform to replace spreadsheet-based workflows

---

## 1. Context & Problem Statement

Security assessment teams at SMBs and mid-market companies today manage compliance work through a fragmented, error-prone stack: Excel workbooks with hundreds of rows, shared SharePoint folders of evidence screenshots, email threads for reviewer sign-offs, and manual copy-paste to generate audit reports. This creates four critical failure modes:

1. **Version chaos** — Multiple analysts working in different spreadsheet copies with no merge capability
2. **Evidence decay** — Evidence is collected but not linked to specific controls, making re-assessments start from scratch
3. **No audit trail** — There is no record of *who* answered *what* and *when*, which auditors increasingly require
4. **Zero analytics** — Completion percentage in a spreadsheet tells you nothing about risk posture, control gaps, or remediation priority

The assessment dashboard described below replaces this workflow entirely. It is built for a **security team of 2–10 analysts** conducting assessments on behalf of their own organization or client organizations.

---

## 2. Framework-Specific Requirements

### 2A. SOC 2 (Trust Services Criteria)

SOC 2 is an auditor-driven framework, not a checklist — the platform must reflect this nuance.

**Control Structure:**
- Organize controls by the five **Trust Services Categories (TSC)**:
  - **CC** — Common Criteria (Security) — ~60 criteria, always required
  - **A** — Availability — optional, ~15 criteria
  - **C** — Confidentiality — optional, ~14 criteria
  - **PI** — Processing Integrity — optional, ~16 criteria
  - **P** — Privacy — optional, ~22 criteria
- Each criterion maps to the COSO framework points of focus. The platform must allow assessors to document *which* points of focus are satisfied and *how*.
- Distinguish between **Type I** (design effectiveness, point-in-time) and **Type II** (operating effectiveness, period-of-time, typically 6–12 months). The assessment type must gate which questions and evidence expectations are presented.

**Answer Model for SOC 2:**
Each control criterion requires assessors to document:
1. **Control Description** — How the organization has implemented this control (free text, 200–2,000 chars)
2. **Control Owner** — Person or team responsible (dropdown from a people/role list)
3. **Design Effectiveness** — [Effective | Partially Effective | Not Effective | Not Applicable] + rationale
4. **Operating Effectiveness** (Type II only) — [Effective | Partially Effective | Not Effective | Not Applicable] + evidence of consistent operation over the audit period
5. **Evidence** — One or more attached or linked evidence items (see Evidence Management, Section 5)
6. **Testing Notes** — Auditor or assessor observations (internal field, not exported to management summary)
7. **Gap/Finding** — [Yes | No]. If Yes, severity [Critical | High | Medium | Low] + remediation recommendation

**SOC 2-Specific Workflow:**
- Assessors must be able to flag criteria as **In Scope** or **Out of Scope** at the start of each engagement. Out-of-scope criteria are hidden from the question queue but preserved in the report with justification.
- The platform must enforce that every **In Scope** criterion has at minimum: a control description, a design effectiveness rating, and at least one evidence item before the assessment can be marked complete.
- Generate a **Management Assertion Readiness Report** summarizing control descriptions and effectiveness ratings in the format auditors expect, exportable as DOCX or PDF.
- Track **carryover controls** — controls that have not changed since the last assessment period and can be re-attested with a reference to prior evidence rather than new collection.

---

### 2B. NIST 800-53 Rev 5

NIST 800-53 is the most granular of the three frameworks, with 1,000+ control parameters across 20 families. The platform must handle this scale without overwhelming the assessor.

**Control Structure:**
- 20 control families: AC, AT, AU, CA, CM, CP, IA, IR, MA, MP, PE, PL, PM, PS, PT, RA, SA, SC, SI, SR
- Each control has a **base control** plus **control enhancements** (e.g., AC-2, AC-2(1), AC-2(2)...)
- Controls are tiered by **baseline** — [Low | Moderate | High]. An organization selects a baseline at assessment start, and only applicable controls are shown. The platform must enforce this scoping.
- Each control maps to **NIST SP 800-53B** baselines and optionally to **NIST SP 800-53A** assessment procedures.

**Answer Model for NIST 800-53:**
Each control requires:
1. **Implementation Status** — [Implemented | Partially Implemented | Planned | Alternative Implementation | Not Applicable | Not Implemented]
2. **Implementation Description** — Narrative of how the control is met (free text)
3. **Responsible Role** — Who owns this control
4. **Assessment Method** — [Examine | Interview | Test] per NIST 800-53A procedures — the platform should suggest the appropriate method per control
5. **Assessment Objective Met** — [Yes | No | Partially] with justification
6. **Evidence** — Linked evidence items
7. **Inherited Controls** — Flag if control is inherited from a cloud provider or shared service (e.g., AWS inherits PE controls). Inherited controls require documentation of the inheritance relationship and boundary.
8. **POA&M Entry** — If not implemented or partially implemented, auto-create a Plan of Action & Milestones entry with: finding description, corrective action, responsible party, scheduled completion date, milestone status

**NIST 800-53-Specific Workflow:**
- **Inheritance modeling**: Allow assessors to define a **System Authorization Boundary** and map controls to: Organization-level, System-level, Inherited (from provider), Hybrid. Inherited controls show a reduced question set.
- **Control correlation**: When an assessor marks a control as Not Implemented, surface other controls in the same family that are likely also impacted.
- **POA&M dashboard**: Dedicated view of all open Plan of Action & Milestones items across the assessment, sortable by severity, owner, and due date. Must be exportable to Excel in federal POA&M template format.
- **FIPS 199 categorization**: At assessment start, prompt the assessor to categorize the system's information types by Confidentiality, Integrity, and Availability impact levels [Low | Moderate | High]. The system overall impact level (highest water mark) determines the applicable baseline and auto-scopes controls.

---

### 2C. NIST Cybersecurity Framework 2.0

CSF 2.0 is a risk-based, outcome-oriented framework — it is less prescriptive than NIST 800-53 and uses a Tier/Profile model that the platform must implement.

**Control Structure:**
- 6 Functions: **GOVERN (GV)**, **IDENTIFY (ID)**, **PROTECT (PR)**, **DETECT (DE)**, **RESPOND (RS)**, **RECOVER (RC)**
- Each Function contains Categories and Subcategories (~106 subcategories total in CSF 2.0)
- CSF 2.0 added GOVERN as the new top-level function — this must be prominently surfaced as it governs all other functions
- Subcategories reference **Informative References** to other standards (NIST 800-53, ISO 27001, CIS Controls) — these cross-references must be visible to assessors

**Answer Model for CSF 2.0:**
Each subcategory requires:
1. **Current Tier** — [Tier 1: Partial | Tier 2: Risk Informed | Tier 3: Repeatable | Tier 4: Adaptive]
2. **Target Tier** — Where the organization wants to be (must be ≥ Current Tier or documented exception)
3. **Gap Description** — If Current < Target, describe the gap
4. **Priority** — [P1 | P2 | P3] for remediation sequencing
5. **Narrative** — How the organization currently addresses this subcategory
6. **Evidence** — Supporting documentation links
7. **Not Applicable Flag** — With justification (some subcategories do not apply to all organizations)

**CSF 2.0-Specific Workflow:**
- **Current Profile vs. Target Profile**: The platform must generate a visual **CSF Profile** showing the organization's current state vs. target state per function and category, as a radar/spider chart and as a gap table.
- **Tier assessment**: Before individual subcategory scoring, prompt the assessor to assess the organization's overall Tier per function. The individual subcategory scores must be consistent with the function-level Tier rating. Surface inconsistencies as warnings.
- **Informative References panel**: Alongside each subcategory, show a collapsible panel of mapped controls from NIST 800-53, ISO 27001, and CIS Controls v8 so assessors can cross-reference without switching tools.
- **Prioritized Action Plan**: Based on gap between Current and Target Tier, automatically generate a prioritized remediation roadmap grouped by Function, sortable by gap size and priority.

---

## 3. Assessment Lifecycle Management

Every assessment in the platform moves through a defined lifecycle. This is not optional — auditors and security committees require evidence that assessments follow a controlled, repeatable process.

### 3A. Assessment States

```
DRAFT → IN PROGRESS → REVIEW → REMEDIATION → COMPLETED → ARCHIVED
```

- **DRAFT**: Created but not yet assigned. Scope is being defined.
- **IN PROGRESS**: Assigned to assessors. Questions are being answered. Evidence is being collected.
- **REVIEW**: All questions answered. Submitted for senior reviewer or team lead sign-off. Assessors can no longer modify answers without reviewer unlocking the record.
- **REMEDIATION**: Reviewer has identified gaps. Open findings are assigned owners and remediation deadlines.
- **COMPLETED**: All findings resolved or formally accepted as residual risk. Assessment signed off.
- **ARCHIVED**: Historical record. Read-only. Retained per org's data retention policy.

### 3B. Multi-Assessor Collaboration

- Assessments can be assigned to **multiple assessors**. Each control family or CSF function can be assigned to a different team member.
- **Concurrent editing**: Two assessors must not be able to edit the same question simultaneously (optimistic locking or section-level locks).
- **Assignment dashboard**: Each assessor sees their personal queue — only the controls assigned to them, with completion status and days remaining.
- **Comment threads**: Each control/question has an internal comment thread for assessor discussion. Comments are timestamped and attributed. Comments are preserved in the audit log.
- **@mention notifications**: Tag a team member in a comment to trigger an in-platform notification.

### 3C. Audit Trail (Non-Negotiable)

Every action in the platform must be logged immutably:
- Who created the assessment
- Who answered each question, and when
- Every change to an answer (old value → new value), timestamped
- Who uploaded each evidence item
- Who submitted the assessment for review
- Reviewer comments and sign-off
- Any answer unlocked after review, with reason

The audit log must be exportable and must not be editable by any user including administrators.

---

## 4. Risk Scoring Engine

The platform must produce a defensible, transparent risk score — not a black box percentage. Security teams need to explain the score to a board or an auditor.

### 4A. Scoring Model

**Per Control:**
- Combine **Criticality** (from the framework: High/Medium/Low) × **Implementation Status** to produce a control score
- Implementation status weights (suggested defaults, configurable):
  - Implemented: 1.0 (full credit)
  - Partially Implemented: 0.5
  - Planned (with documented date): 0.3
  - Alternative Implementation (with evidence): 0.8
  - Not Implemented: 0.0
  - Not Applicable: excluded from scoring

**Per Domain/Family/Function:**
- Weighted average of control scores within the domain
- Display as percentage (0–100%) and as a maturity band: [Critical Risk | High Risk | Medium Risk | Low Risk | Compliant]

**Overall Score:**
- Weighted average across domains. Domain weights are configurable (e.g., Access Control may carry more weight than Personnel Security for a SaaS company).
- Display overall score as a gauge, with breakdown by domain

### 4B. Risk Heatmap

- Matrix view: X-axis = Control Family/Function, Y-axis = Criticality level
- Each cell colored by implementation completeness
- Click a cell to drill into the specific controls driving that color
- Exportable as PNG or embedded in reports

### 4C. Trend Tracking

- When a second assessment against the same framework is created for the same organization, the platform computes delta scores: which domains improved, which regressed, which stayed flat
- Display as a trend line chart over time (per assessment date)
- Highlight controls that have been Not Implemented for more than 90 days

---

## 5. Evidence Management

Evidence collection is where most assessment teams lose time. The platform must make evidence first-class.

### 5A. Evidence Types Supported

| Type | Description |
|------|-------------|
| **File Upload** | PDF, DOCX, XLSX, PNG, JPG — max 25MB per file |
| **URL Link** | Link to a policy in Confluence, a screenshot in SharePoint, a report in a GRC tool |
| **Screenshot** | Paste or drag-drop screenshot directly into the evidence panel |
| **Policy Reference** | Reference to an internal policy document stored in the platform's policy library |
| **External Tool Reference** | Reference to a ticket in Jira, ServiceNow, etc. (manual entry of ticket ID and URL) |

### 5B. Evidence Linking

- Each evidence item can be linked to **multiple controls** across frameworks. A single firewall configuration screenshot may satisfy AC-17, SC-7, and CSF PR.AC-5.
- Evidence reuse panel: when answering a control, show suggested evidence items that are already linked to related controls
- Evidence expiry: each evidence item has an **as-of date** and an optional **expiry date**. Expired evidence is flagged with a warning and must be refreshed before the assessment can be closed.

### 5C. Evidence Repository

- Central repository of all evidence across all assessments for an organization
- Tag evidence by: control family, framework, system, evidence type, date collected
- Search by tag, date range, uploader, or control reference
- When creating a new assessment, pull forward evidence from the prior assessment period that has not yet expired

---

## 6. Reporting Engine

Reports are the primary deliverable of an assessment. They must be professional, accurate, and immediately usable with clients, auditors, and executives.

### 6A. Report Types

**1. Executive Summary Report**
- Audience: CISO, Board, C-Suite
- Contents: Overall risk score, top 5 critical gaps, remediation timeline, trend vs. prior period
- Format: 2–4 page PDF, clean and non-technical
- Tone: Risk-based language, not control-by-control listing

**2. Technical Assessment Report**
- Audience: Security team, IT operations, auditors
- Contents: Full control-by-control results, implementation status, evidence index, all findings with severity and owner
- Format: DOCX or PDF, ~20–100 pages depending on assessment scope
- Must include: Table of Contents, appendix of evidence items, assessor sign-off page

**3. Gap Analysis Report**
- Audience: Project managers, remediation owners
- Contents: Only the controls that are Not Implemented or Partially Implemented, sorted by priority
- Format: XLSX (suitable for importing into a project tracker) and PDF
- Must include: Recommended remediation action per gap, estimated effort [Low | Medium | High], responsible owner field

**4. POA&M Export** (NIST 800-53 only)
- Format: XLSX in federal POA&M template format
- Fields: Control ID, weakness description, corrective action, resources required, milestones, scheduled completion, status

**5. CSF Profile Export** (CSF 2.0 only)
- Format: XLSX per NIST's official CSF Profile template
- Visual: Radar chart embedded in XLSX

### 6B. Report Branding

- Upload organization logo
- Set primary color for report header/footer
- Set report title, engagement name, assessment period, and assessor name
- These settings persist per organization

### 6C. Report Scheduling

- Scheduled draft reports (e.g., generate a progress report every Friday at 5pm)
- Emailed to configured distribution list as PDF attachment

---

## 7. Dashboard & Analytics Views

### 7A. Home Dashboard (Landing Page)

Upon login, the assessor sees:
- **My Queue**: Controls assigned to me, with completion percentage and due date, sorted by urgency
- **Assessment Overview Cards**: All active assessments with status badge, framework tags, completion %, days until target completion
- **Critical Findings Alert Banner**: Any control rated Critical Risk that is unresolved, requiring immediate attention
- **Recent Activity Feed**: Last 10 actions across assessments I'm involved in

### 7B. Assessment Dashboard (Per Assessment)

Within a single assessment:
- **Progress Ring**: Answered / Total, broken down by status (Answered, In Progress, Not Started)
- **Completion by Domain**: Bar chart per control family or function showing % complete
- **Risk Score Gauge**: Current score with benchmark (what score qualifies as audit-ready)
- **Open Findings Table**: Filterable table of all gaps — severity, owner, due date, status
- **Evidence Collection Status**: How many controls have evidence vs. still need it
- **Days Remaining**: Countdown to target assessment completion date

### 7C. Organization Portfolio View (Multi-Assessment)

For teams managing multiple engagements or organizations:
- Grid of all organizations, each showing: frameworks assessed, last assessment date, overall risk score, trend arrow
- Cross-organization gap heatmap: which control families are weakest across the portfolio
- Upcoming assessment deadlines calendar

---

## 8. User Management & Access Control

### 8A. Roles

| Role | Permissions |
|------|-------------|
| **Platform Admin** | Manage users, organizations, system settings |
| **Organization Admin** | Manage their org's assessments, users, and settings |
| **Lead Assessor** | Create assessments, assign controls, approve findings, sign off reports |
| **Assessor** | Answer assigned controls, upload evidence, add comments |
| **Reviewer** | View-only access to assessment + ability to add review comments |
| **Auditor** | Read-only access to specific assessments (scoped by invitation) — sees answers and evidence but not internal comments |

### 8B. Authentication

- SSO via SAML 2.0 / OIDC (required for enterprise)
- Username + password with MFA as fallback
- Session timeout configurable (default: 4 hours inactive)
- All sessions logged (user, IP, timestamp, duration)

### 8C. Data Isolation

- Multi-tenant: each organization's data is fully isolated
- Assessors cannot see other organizations' assessments unless explicitly granted access
- Evidence files are stored in org-scoped storage paths

---

## 9. Questionnaire Engine Requirements

The question answering experience is the most used surface of the application and must be fast and low-friction.

### 9A. Question Navigation

- **Linear mode**: Answer questions one at a time, clicking Next/Previous
- **Grid mode**: See all questions in a scrollable table, click any to open inline answer panel
- **Filter bar**: Filter by status [Unanswered | Answered | Flagged | Needs Evidence], criticality [High | Medium | Low], assigned assessor, keyword search in question text
- **Jump-to control**: Type a control ID (e.g., "AC-2" or "PR.AC-01") to navigate directly
- **Flagging**: Mark a question for follow-up without answering (shows in a "Flagged" filter view)

### 9B. Question Display

Each question card must show:
- **Control ID and Title** (e.g., AC-2 — Account Management)
- **Control Text** — The full normative control statement from the framework
- **Guidance Text** — Supplemental guidance from the framework (collapsible, on by default for first-time assessors)
- **Criticality Badge** — High / Medium / Low
- **Stakeholder Role** — Who should be answering this (e.g., IT Admin, HR, Legal)
- **Related Controls** — Other controls in the same family or with high correlation
- **Informative References** — Mapped controls from other frameworks (collapsible)
- **Prior Answer** — If this control was answered in a prior assessment, show the prior answer and date in a "Prior Period" panel for reference

### 9C. Answer Input

Framework-appropriate answer components:

**SOC 2:**
- Control description (rich text, 200–2,000 chars)
- Design effectiveness selector (radio)
- Operating effectiveness selector (radio, only for Type II)
- Evidence uploader
- Gap flag toggle

**NIST 800-53:**
- Implementation status dropdown
- Implementation description (rich text)
- Responsible role (people picker)
- Assessment method checkboxes (Examine / Interview / Test)
- Assessment objective radio (Yes / No / Partially)
- Inherited control toggle + provider name
- POA&M auto-creation if status is Not Implemented or Partially Implemented

**NIST CSF 2.0:**
- Current Tier selector (1–4) with Tier descriptions shown inline
- Target Tier selector
- Gap description (shown only when Current < Target)
- Priority selector
- Narrative text
- Evidence uploader

### 9D. Auto-Save

- Answers auto-save every 30 seconds and on field blur
- Visual "Saved" indicator in top bar
- If network drops, changes queue locally and sync on reconnect with conflict detection

---

## 10. Integration Requirements

### 10A. Export Integrations

| Destination | Format | Trigger |
|-------------|--------|---------|
| Microsoft Excel | XLSX | Manual export button |
| Microsoft Word | DOCX | Manual export button |
| PDF | PDF | Manual or scheduled |
| Jira | Creates Jira tickets for each finding | Manual per finding or bulk |
| ServiceNow | Creates GRC records | Via webhook |
| Email | PDF attachment | Scheduled or manual |

### 10B. Import Integrations

- **Prior spreadsheet import**: Bulk import answers from an existing Excel workbook using a provided template. Maps spreadsheet columns to control IDs.
- **Policy document import**: Upload a DOCX/PDF policy and have the platform extract policy statements and suggest which controls they satisfy (AI-assisted).

### 10C. API

- REST API for all platform entities (assessments, controls, answers, findings, evidence)
- API key authentication
- Webhook support for assessment state changes (in progress → review → complete)
- Documented with OpenAPI spec

---

## 11. AI-Assisted Features

These are productivity accelerators, not replacements for assessor judgment.

1. **Control answer suggestions**: Based on the organization's industry, size, and prior answers, suggest a draft implementation description for a control. The assessor must review and approve before it's saved.
2. **Evidence suggestions**: For a given control, suggest what types of evidence are typically acceptable (e.g., "For AC-2, auditors typically expect: user account listing export, access review records, HR offboarding procedure").
3. **Gap narrative generator**: Given a list of not-implemented controls, generate a draft gap narrative suitable for a board-level risk report.
4. **Policy-to-control mapper**: Upload a policy PDF, and the AI suggests which controls the policy addresses and highlights which controls are not yet addressed by any policy.
5. **Duplicate answer detection**: Flag if an assessor's answer for one control contradicts the answer for a related control (e.g., claiming MFA is implemented under IA-2 but not referenced under AC-17).

---

## 12. Non-Functional Requirements

### Performance
- Page load < 2 seconds for any view (P95)
- Auto-save latency < 500ms
- Report generation < 30 seconds for assessments up to 500 questions
- Support 50 concurrent assessors without degradation

### Security (The Platform Must Practice What It Preaches)
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Evidence files scanned for malware on upload
- RBAC enforced at API layer, not just UI
- SQL injection, XSS, CSRF protections required
- Penetration test before production launch
- SOC 2 Type II compliant hosting (the platform assessing for SOC 2 must itself be SOC 2 compliant — this is a hard requirement for credibility)

### Availability
- 99.9% uptime SLA
- Automated daily backups with point-in-time recovery
- Disaster recovery RTO < 4 hours

### Compliance
- GDPR-compliant data handling
- Data residency options (US, EU)
- Data retention policies configurable per organization

---

## 13. UI/UX Design Principles

The interface is used for **high-stakes, complex work** by professionals under deadline. The design must serve this context:

1. **Density over decoration**: Assessors need to see a lot of information. Prefer information-dense layouts over whitespace-heavy marketing aesthetics. Tables, filters, and structured forms are preferred over card-heavy UIs.
2. **Status at a glance**: Color coding for completion status (grey = not started, yellow = in progress, green = complete, red = gap/finding) must be used consistently throughout.
3. **Progressive disclosure**: Show control guidance, related controls, and informative references only when the assessor expands them — don't overwhelm with everything upfront.
4. **Dark mode**: Security teams often work in low-light environments or on multiple monitors. Dark mode is required.
5. **Keyboard navigability**: Power users must be able to navigate questions, set answers, and save entirely by keyboard.
6. **Accessibility**: WCAG 2.1 AA compliance — the platform may be used by organizations that require accessible tools.
7. **No dead ends**: Every error state and empty state must tell the user what to do next. No blank screens.

---

## 14. Implementation Priorities (Phased Roadmap)

### Phase 1 — Foundation (Weeks 1–6): Make It Trustworthy
- Database persistence (PostgreSQL)
- User authentication with MFA
- Audit trail (immutable log of all actions)
- SOC 2 and NIST 800-53 complete question banks
- Basic evidence upload and linking
- PDF export of technical assessment report

### Phase 2 — Assessment Quality (Weeks 7–12): Make It Accurate
- Risk scoring engine
- POA&M dashboard and export
- CSF 2.0 Profile (Current vs. Target) visualization
- Evidence expiry and re-use from prior periods
- Assessment state machine (Draft → In Progress → Review → Complete)
- Reviewer sign-off workflow

### Phase 3 — Team Collaboration (Weeks 13–18): Make It Scale
- Multi-assessor assignment per control family
- Comment threads and @mention notifications
- Organization portfolio view
- Scheduled progress reports
- Jira/ServiceNow finding export

### Phase 4 — Intelligence (Weeks 19–24): Make It Smart
- AI-assisted control answer suggestions
- Policy-to-control mapper
- Cross-assessment trend analytics
- Duplicate/contradiction detection
- Benchmarking against industry peers (anonymized)

---

## 15. Success Criteria

The platform is ready for production use when:

1. A security assessor can complete a full SOC 2 Type II assessment — from blank slate to signed-off report — without opening Excel or any other tool
2. A reviewer can verify the completeness and accuracy of an assessment entirely within the platform
3. An auditor (external) can be given read-only access and navigate all evidence and answers without needing a tour
4. A second assessment for the same organization automatically pre-populates prior answers and evidence, reducing data entry by ≥ 40%
5. A report generated by the platform requires less than 30 minutes of manual editing before it can be delivered to a client or auditor
6. The platform itself passes a SOC 2 Type I readiness review

---

*This requirements document should be treated as a living specification. As the security landscape evolves and user feedback accumulates, requirements will be refined. Any AI model or development team implementing this platform should use this document as the authoritative source of truth for feature decisions.*
