// API service — single axios instance with auth interceptor.
// All request methods live here; no token management needed in components.

import axios from 'axios';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
// Ensure we never double-up /api
export const API_BASE_URL = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;

export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Inject the Bearer token on every request automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error messages + auto-logout on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // If the token is expired or invalid, clear auth and redirect to login
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Only redirect if not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // For blob responses, the error body is a Blob — parse it for a readable message
    const responseData = err.response?.data;
    if (responseData instanceof Blob && responseData.type === 'application/json') {
      return responseData.text().then((text: string) => {
        try {
          const parsed = JSON.parse(text);
          const msg = typeof parsed.detail === 'string' ? parsed.detail : err.message || 'Request failed';
          return Promise.reject(new Error(msg));
        } catch {
          return Promise.reject(new Error(err.message || 'Request failed'));
        }
      });
    }
    const detail = responseData?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : err.message || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Framework {
  id: string;
  name: string;
  description: string;
}

export interface Control {
  id: string;
  frameworkId: string;
  domain: string;
  title: string;
  description: string;
  criticality: 'Low' | 'Medium' | 'High';
}

export interface AssessmentStats {
  totalControls: number;
  selectedControls: number;
  coveragePercent: number;
}

export interface QuestionStats {
  totalQuestions: number;
  answeredQuestions: number;
  completionPercent: number;
}

export interface Assessment {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'reviewed';
  frameworkIds: string[];
  selectedControlIds: string[];
  selectedQuestionIds?: string[];
  moduleIds?: string[];
  familyIds?: string[];
  createdAt: string;
  stats: AssessmentStats;
  questionStats?: QuestionStats;
  riskScore?: number | null;
  soc2AssessmentType?: string;
  soc2Categories?: string[];
  nistConfidentiality?: string;
  nistIntegrity?: string;
  nistAvailability?: string;
  nistBaseline?: string;
  diagramFilename?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  assessmentType?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  createdByEmail?: string;
  sspCount?: number;
  ssps?: Assessment[];
}

export interface CreateProjectRequest {
  name: string;
}


export interface Family {
  id: string;
  familyId: string;
  familyName: string;
  frameworkId: string;
}

export interface Module {
  moduleId: string;
  moduleName: string;
  questionCount: number;
}

export interface Question {
  id: string;
  familyId: string;
  familyName: string;
  controlRefs: string[];
  questionText: string;
  stakeholderRoleId: string;
  answerType: 'text' | 'yes_no' | 'yes_no_justification' | 'multiple_choice' | 'numeric';
  criticality: 'Low' | 'Medium' | 'High';
  functionId?: string;
  functionName?: string;
  subcategoryText?: string;
  answerValue?: string;
  answerYesNo?: string;
  answerJustification?: string;
  lastUpdated?: string;
}

export interface AnswerSubmission {
  questionId: string;
  value?: string;
  yesNo?: string;
  justification?: string;
  implementationStatus?: string;
  controlId?: string;
  controlTitle?: string;
  answerNarrative?: string;
}

// ─── Phase 2 Types ──────────────────────────────────────────────────────────

export interface DomainRiskScore {
  domain: string;
  score: number;
  totalControls: number;
  answeredControls: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
}

export interface RiskScoreResponse {
  assessmentId: string;
  overallScore: number;
  riskBand: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
  domainScores: DomainRiskScore[];
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  totalControls: number;
  answeredControls: number;
}

export interface StateHistoryEntry {
  id: number;
  assessmentId: string;
  fromStatus: string;
  toStatus: string;
  changedByEmail?: string | null;
  changedByName?: string | null;
  changedAt: string;
  note?: string | null;
}

export interface CsfFunctionProfile {
  functionId: string;
  functionName: string;
  currentTier: number;
  targetTier: number;
  notes?: string;
}

export interface CsfProfileResponse {
  assessmentId: string;
  profiles: CsfFunctionProfile[];
}


export interface AuditLogEntry {
  id: number;
  timestamp: string;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  detail: Record<string, unknown> | null;
}

export interface AssessmentSummary {
  id: string;
  name: string;
  status: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercent: number;
  riskScore?: number | null;
}

export interface PoamItem {
  id: string;
  assessmentId: string;
  questionId?: string | null;
  title: string;
  description?: string | null;
  status: 'open' | 'in_remediation' | 'closed';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string | null;
  owner?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface CreatePoamRequest {
  assessmentId: string;
  questionId?: string;
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  owner?: string;
}

export interface UpdatePoamRequest {
  title?: string;
  description?: string;
  status?: 'open' | 'in_remediation' | 'closed';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  owner?: string;
}

export interface DashboardRisk {
  questionId: string;
  questionText: string;
  criticality: 'High' | 'Medium' | 'Low';
  familyName: string;
  functionName: string | null;
  frameworkId: string;
  assessmentCount: number;
}

export interface DashboardTrendPoint {
  assessmentId: string;
  name: string;
  createdAt: string;
  completionPercent: number;
  frameworks: string[];
}

export interface DashboardFramework {
  frameworkId: string;
  frameworkName: string;
  assessmentCount: number;
  avgCompletionPercent: number;
  riskGaps: number;
}

export interface DashboardData {
  totalAssessments: number;
  avgCompletionPercent: number;
  totalRiskGaps: number;
  highRiskGaps: number;
  riskGapsByCriticality: { High: number; Medium: number; Low: number };
  completionTrend: DashboardTrendPoint[];
  topRisks: DashboardRisk[];
  frameworkBreakdown: DashboardFramework[];
}

export interface EvidenceRecord {
  id: string;
  assessmentId: string;
  questionId?: string | null;
  controlRef?: string | null;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  asOfDate?: string | null;
  expiryDate?: string | null;
  description?: string | null;
  tags: string[];
  uploadedByEmail: string;
  createdAt: string;
}

export interface CreateAssessmentRequest {
  name: string;
  frameworkIds: string[];
  selectedControlIds: string[];
  selectedQuestionIds?: string[];
  moduleIds?: string[];
  familyIds?: string[];
  soc2AssessmentType?: string;
  soc2Categories?: string[];
  nistConfidentiality?: string;
  nistIntegrity?: string;
  nistAvailability?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  assessmentType?: string;
}


export interface SSPWorkbook {
  id: string;
  assessmentId: string;
  coverPage: Record<string, any>;
  checklist: any[];
  contactsInfo: Record<string, any>;
  riskAssessment: Record<string, any>;
  dataCategorization: Record<string, any>;
  environments: any[];
  inventory: Record<string, any>;
  diagrams: Record<string, any>;
  scanning: any[];
  controls: any[];
  findingsExtra: Record<string, any>;
  firewall: any[];
  additionalResources: any[];
  revisionHistory: any[];
  createdAt: string;
  updatedAt: string;
  controlDefinitions?: any[];
}

export interface SSPWorkbookProgress {
  progressPercent: number;
  completedTasks: number;
  totalTasks: number;
}

export interface SSPWorkbookRiskScore {
  impactScore: number | null;
  impactRating: string;
  likelihoodScore: number | null;
  likelihoodRating: string;
  overallRisk: string;
  applicableCount: number;
  overallLikelihoodQ: number | null;
}


// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  googleLogin: (credential: string) =>
    apiClient.post<{ access_token: string; user: { email: string; name: string; picture?: string; role: string } }>(
      '/auth/google/login',
      { credential },
    ).then(r => r.data),

  // Frameworks
  getFrameworks: () => apiClient.get<Framework[]>('/frameworks').then(r => r.data),

  // Projects
  getProjects: () => apiClient.get<Project[]>('/projects').then(r => r.data),
  createProject: (name: string) => apiClient.post<Project>('/projects', { name }).then(r => r.data),
  getProject: (id: string) => apiClient.get<Project & { ssps: Assessment[] }>(`/projects/${id}`).then(r => r.data),
  deleteProject: (id: string) => apiClient.delete(`/projects/${id}`).then(r => r.data),

  // Controls
  getControls: (frameworkId?: string) => {
    const url = frameworkId ? `/controls?frameworkId=${frameworkId}` : '/controls';
    return apiClient.get<Control[]>(url).then(r => r.data);
  },

  // Families
  getFamilies: (frameworkId?: string) => {
    const url = frameworkId ? `/families?framework_id=${frameworkId}` : '/families';
    return apiClient.get<Family[]>(url).then(r => r.data);
  },

  // Questions
  getQuestions: (frameworkId?: string, familyId?: string) => {
    const params = new URLSearchParams();
    if (frameworkId) params.set('framework_id', frameworkId);
    if (familyId) params.set('family_id', familyId);
    const qs = params.toString();
    return apiClient.get<Question[]>(`/questions${qs ? `?${qs}` : ''}`).then(r => r.data);
  },

  // Modules
  getFrameworkModules: (frameworkId: string) =>
    apiClient.get<Module[]>(`/frameworks/${frameworkId}/modules`).then(r => r.data),

  getQuestionsByModules: (frameworkId: string, moduleIds: string[]) =>
    apiClient
      .get<Question[]>(`/frameworks/${frameworkId}/questions?moduleIds=${moduleIds.join(',')}`)
      .then(r => r.data),

  // Assessments
  getAssessments: () => apiClient.get<Assessment[]>('/assessments').then(r => r.data),

  getAssessment: (id: string) => apiClient.get<Assessment>(`/assessments/${id}`).then(r => r.data),

  getAssessmentQuestions: (id: string) =>
    apiClient.get<Question[]>(`/assessments/${id}/questions`).then(r => r.data),

  createAssessment: (data: CreateAssessmentRequest) =>
    apiClient.post<Assessment>('/assessments', data).then(r => r.data),

  deleteAssessment: (id: string) => apiClient.delete(`/assessments/${id}`).then(r => r.data),

  submitAnswers: (id: string, answers: AnswerSubmission[]) =>
    apiClient.post<AssessmentSummary>(`/assessments/${id}/answers`, { answers }).then(r => r.data),

  // Health
  checkHealth: () =>
    apiClient.get<{ status: string; message: string; version: string }>('/status').then(r => r.data),

  // Audit Log
  getAuditLog: (params?: { limit?: number; offset?: number; user_email?: string; entity_id?: string; action?: string }) =>
    apiClient.get<{ entries: AuditLogEntry[]; count: number }>('/audit-log', { params }).then(r => r.data),

  // Dashboard
  getDashboard: () =>
    apiClient.get<DashboardData>('/dashboard').then(r => r.data),

  // Assessment status transition
  updateAssessmentStatus: (id: string, status: string) =>
    apiClient.patch<AssessmentSummary>(`/assessments/${id}/status`, { status }).then(r => r.data),

  // Evidence
  uploadEvidence: (formData: FormData) =>
    apiClient.post<EvidenceRecord>('/evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  listEvidence: (assessmentId?: string) => {
    const params = assessmentId ? { assessment_id: assessmentId } : {};
    return apiClient.get<EvidenceRecord[]>('/evidence', { params }).then(r => r.data);
  },

  downloadEvidence: (id: string) =>
    apiClient.get(`/evidence/${id}/download`, { responseType: 'blob' }).then(r => r.data as Blob),

  deleteEvidence: (id: string) =>
    apiClient.delete(`/evidence/${id}`),

  // POA&M
  getPoamItems: (params?: { assessment_id?: string; status?: string }) =>
    apiClient.get<PoamItem[]>('/poam', { params }).then(r => r.data),
  createPoamItem: (req: CreatePoamRequest) =>
    apiClient.post<PoamItem>('/poam', req).then(r => r.data),
  updatePoamItem: (id: string, req: UpdatePoamRequest) =>
    apiClient.patch<PoamItem>(`/poam/${id}`, req).then(r => r.data),
  deletePoamItem: (id: string) =>
    apiClient.delete(`/poam/${id}`),

  // ─── Phase 2 ──────────────────────────────────────────────────────────────

  // Risk Scoring
  getRiskScore: (id: string) =>
    apiClient.get<RiskScoreResponse>(`/assessments/${id}/risk-score`).then(r => r.data),

  // State History
  getStateHistory: (id: string) =>
    apiClient.get<StateHistoryEntry[]>(`/assessments/${id}/history`).then(r => r.data),

  // Reports
  downloadReport: (id: string, type: 'executive-summary' | 'technical' | 'gap-analysis', params?: { engagement_name?: string; org_name?: string }) => {
    const mimeType = type === 'gap-analysis'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';
    return apiClient.get(`/assessments/${id}/reports/${type}`, {
      params,
      responseType: 'blob',
    }).then(r => ({ blob: r.data as Blob, mimeType }));
  },

  // Auto-generate POA&M
  autoGeneratePoam: (id: string) =>
    apiClient.post<{ created: number; message: string }>(`/assessments/${id}/poam/auto-generate`).then(r => r.data),

  // Export POA&M as XLSX
  exportPoamXlsx: (id: string) =>
    apiClient.get(`/assessments/${id}/poam/export`, { responseType: 'blob' }).then(r => r.data as Blob),

  // CSF Profile
  getCsfProfile: (id: string) =>
    apiClient.get<CsfProfileResponse>(`/assessments/${id}/csf-profile`).then(r => r.data),
  upsertCsfProfile: (id: string, profiles: CsfFunctionProfile[]) =>
    apiClient.put<CsfProfileResponse>(`/assessments/${id}/csf-profile`, { profiles }).then(r => r.data),

  // ─── SSP Builder Redesign ──────────────────────────────────────────────────
  getChecklist: (id: string) =>
    apiClient.get<ChecklistItem[]>(`/assessments/${id}/checklist`).then(r => r.data),
  getIntake: (id: string) =>
    apiClient.get<IntakeTeam[]>(`/assessments/${id}/intake`).then(r => r.data),
  remindTeam: (id: string, teamId: string) =>
    apiClient.post<{ id: string; name: string; leadEmail: string; message: string }>(`/assessments/${id}/intake/${teamId}/remind`).then(r => r.data),
  remindAllOverdue: (id: string) =>
    apiClient.post<{ assessmentId: string; remindedTeamsCount: number; message: string }>(`/assessments/${id}/remind-overdue`).then(r => r.data),
  getRiskQuestions: (id: string) =>
    apiClient.get<RiskQuestion[]>(`/assessments/${id}/risk-questions`).then(r => r.data),
  getInventory: (id: string) =>
    apiClient.get<InventoryItem[]>(`/assessments/${id}/inventory`).then(r => r.data),
  addInventoryItem: (id: string, name: string, type: string, owner?: string) =>
    apiClient.post<InventoryItem>(`/assessments/${id}/inventory`, { name, type, owner }).then(r => r.data),
  uploadDiagram: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ message: string; filename: string }>(`/assessments/${id}/diagram`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  downloadDiagramUrl: (id: string) => `${apiClient.defaults.baseURL}/assessments/${id}/diagram`,
  deleteDiagram: (id: string) =>
    apiClient.delete<{ message: string }>(`/assessments/${id}/diagram`).then(r => r.data),
  seedDemoAssessment: () =>
    apiClient.post<{ message: string; assessmentId: string }>('/assessments/seed-demo').then(r => r.data),
  addIntakeTeam: (id: string, name: string, leadName: string, leadEmail: string, families?: string, dueDate?: string) =>
    apiClient.post<IntakeTeam>(`/assessments/${id}/intake`, { name, leadName, leadEmail, families, dueDate }).then(r => r.data),
  updateIntakeTeam: (id: string, teamId: string, name: string, leadName: string, leadEmail: string, families?: string, dueDate?: string) =>
    apiClient.put<IntakeTeam>(`/assessments/${id}/intake/${teamId}`, { name, leadName, leadEmail, families, dueDate }).then(r => r.data),
  deleteIntakeTeam: (id: string, teamId: string) =>
    apiClient.delete<{ success: boolean }>(`/assessments/${id}/intake/${teamId}`).then(r => r.data),

  // SSP Workbook
  getSSPWorkbook: (id: string) => apiClient.get<SSPWorkbook>(`/assessments/${id}/workbook`).then(r => r.data),
  updateSSPWorkbookSection: (id: string, section: string, data: any) =>
    apiClient.put<SSPWorkbook>(`/assessments/${id}/workbook/${section}`, { data }).then(r => r.data),
  getSSPWorkbookProgress: (id: string) =>
    apiClient.get<SSPWorkbookProgress>(`/assessments/${id}/workbook/progress`).then(r => r.data),
  getSSPWorkbookRiskScore: (id: string) =>
    apiClient.get<SSPWorkbookRiskScore>(`/assessments/${id}/workbook/risk-score`).then(r => r.data),
};

export interface ChecklistItem {
  id: string;
  assessmentId: string;
  title: string;
  status: 'complete' | 'in_progress' | 'not_started';
  targetLink?: string;
}

export interface IntakeTeam {
  id: string;
  assessmentId: string;
  name: string;
  leadName: string;
  leadEmail: string;
  responseRate: number;
  status: 'complete' | 'in_progress' | 'overdue';
  lastActiveDaysAgo: number;
  families?: string;
  dueDate?: string;
}

export interface RiskQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  mappedControl?: string;
  response: 'Full' | 'Partial' | 'None' | 'N/A';
  pointsMissed: number;
}

export interface InventoryItem {
  id: string;
  assessmentId: string;
  name: string;
  type: string;
  status: string;
  owner?: string;
}

