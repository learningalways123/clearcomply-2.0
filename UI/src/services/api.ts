// API service for Clear Comply backend integration

// Try both possible API URLs in case of environment variable issues
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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
  frameworkIds: string[];
  selectedControlIds: string[];
  selectedQuestionIds?: string[];
  createdAt: string;
  stats: AssessmentStats;
  questionStats?: QuestionStats;
}

export interface Family {
  id: string;
  familyId: string;
  familyName: string;
  frameworkId: string;
}

export interface Question {
  id: string;
  familyId: string;
  familyName: string;
  controlRefs: string[];
  questionText: string;
  stakeholderRoleId: string;
  answerType: 'text' | 'yes_no' | 'multiple_choice' | 'numeric';
  criticality: 'Low' | 'Medium' | 'High';
  answerValue?: string;
  lastUpdated?: string;
}

export interface AnswerSubmission {
  questionId: string;
  value: string;
}

export interface SubmitAnswersRequest {
  answers: AnswerSubmission[];
}

export interface CreateAssessmentRequest {
  name: string;
  frameworkIds: string[];
  selectedControlIds: string[];
  selectedQuestionIds?: string[];
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the API. Please ensure the backend is running.');
      }
      throw error;
    }
  }

  // Framework endpoints
  async getFrameworks(): Promise<Framework[]> {
    return this.request<Framework[]>('/frameworks');
  }

  // Control endpoints
  async getControls(frameworkId?: string): Promise<Control[]> {
    const endpoint = frameworkId ? `/controls?frameworkId=${frameworkId}` : '/controls';
    return this.request<Control[]>(endpoint);
  }

  // Family endpoints
  async getFamilies(frameworkId?: string): Promise<Family[]> {
    const endpoint = frameworkId ? `/families?framework_id=${frameworkId}` : '/families';
    return this.request<Family[]>(endpoint);
  }

  // Question endpoints
  async getQuestions(frameworkId?: string, familyId?: string): Promise<Question[]> {
    let endpoint = '/questions';
    const params = [];
    if (frameworkId) params.push(`framework_id=${frameworkId}`);
    if (familyId) params.push(`family_id=${familyId}`);
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    return this.request<Question[]>(endpoint);
  }

  async getQuestion(questionId: string): Promise<Question> {
    return this.request<Question>(`/questions/${questionId}`);
  }

  // Assessment endpoints
  async createAssessment(data: CreateAssessmentRequest): Promise<Assessment> {
    return this.request<Assessment>('/assessments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAssessments(): Promise<Assessment[]> {
    return this.request<Assessment[]>('/assessments');
  }

  async getAssessment(id: string): Promise<Assessment> {
    return this.request<Assessment>(`/assessments/${id}`);
  }

  async getAssessmentQuestions(id: string): Promise<Question[]> {
    return this.request<Question[]>(`/assessments/${id}/questions`);
  }

  async submitAssessmentAnswers(id: string, data: SubmitAnswersRequest): Promise<Assessment> {
    return this.request<Assessment>(`/assessments/${id}/answers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async checkHealth(): Promise<{ status: string; message: string; version: string }> {
    return this.request('/status');
  }
}

export const apiService = new ApiService();
