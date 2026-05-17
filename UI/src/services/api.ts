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

// Normalise error messages
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail;
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

export interface CreateAssessmentRequest {
  name: string;
  frameworkIds: string[];
  selectedControlIds: string[];
  selectedQuestionIds?: string[];
  moduleIds?: string[];
  familyIds?: string[];
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

  // POA&M
  getPoamItems: (params?: { assessment_id?: string; status?: string }) =>
    apiClient.get<PoamItem[]>('/poam', { params }).then(r => r.data),
  createPoamItem: (req: CreatePoamRequest) =>
    apiClient.post<PoamItem>('/poam', req).then(r => r.data),
  updatePoamItem: (id: string, req: UpdatePoamRequest) =>
    apiClient.patch<PoamItem>(`/poam/${id}`, req).then(r => r.data),
  deletePoamItem: (id: string) =>
    apiClient.delete(`/poam/${id}`),
};
