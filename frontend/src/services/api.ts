import {
  HealthInfo,
  LearnerProfile,
  ConceptNode,
  ConceptEdge,
  Question,
  EvaluationResult,
  RevisionTask,
  TeacherDashboardData,
  DiagnosticResult,
  DiagnosticAttemptSummary,
  OnboardingProfile,
  PersonalizedLearningPath,
  ProficiencyInfo
} from '../types';

// Always use same-origin '/api' in browser environment.
// This automatically routes via Vite proxy in development (http://localhost:8000)
// and Vercel edge rewrite proxy in production (https://learnloop-ai-backend.onrender.com),
// guaranteeing first-party cookie handling, zero CORS preflight failures, and complete origin safety.
export const getApiBase = (): string => {
  return '/api';
};

const API_BASE = getApiBase();

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = (): string | null => {
  return currentAuthToken;
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || {});
  if (currentAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    return res;
  } catch (err: any) {
    const endpoint = url.split('?')[0];
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after ${timeoutMs / 1000}s. The backend on Render may be waking up from cold sleep.`);
    }
    throw new Error(`Network failure calling ${endpoint}: ${err.message || 'Check connectivity and CORS'}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      detail = res.statusText || `HTTP ${res.status}`;
    }
    throw new Error(`${fallbackMessage} (Status ${res.status}: ${detail})`);
  }
  return await res.json();
}

export const api = {
  getBaseUrl(): string {
    return API_BASE;
  },

  async getHealth(): Promise<HealthInfo> {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 15000);
    return await handleResponse<HealthInfo>(res, 'Backend health check failed');
  },

  async getConcepts(studentId = 'student_default'): Promise<{ concepts: ConceptNode[]; edges: ConceptEdge[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/concepts?student_id=${studentId}`);
    return await handleResponse<{ concepts: ConceptNode[]; edges: ConceptEdge[] }>(res, 'Failed to fetch concepts');
  },

  async getLearnerProfile(studentId = 'student_default'): Promise<LearnerProfile> {
    const res = await fetchWithTimeout(`${API_BASE}/learner/profile?student_id=${studentId}`);
    const data = await handleResponse<{ profile: LearnerProfile }>(res, 'Failed to fetch learner profile');
    return data.profile;
  },

  async resetLearnerProfile(studentId = 'student_default'): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/learner/reset?student_id=${studentId}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to reset profile (Status ${res.status})`);
    }
  },

  async getDiagnosticQuestions(mode: 'quick' | 'comprehensive' = 'comprehensive', studentId?: string): Promise<{ questions: Question[]; total: number; mode: string }> {
    const qParams = new URLSearchParams({ mode });
    if (studentId) qParams.set('student_id', studentId);
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/questions?${qParams.toString()}`);
    return await handleResponse<{ questions: Question[]; total: number; mode: string }>(res, 'Failed to fetch diagnostic questions');
  },

  async getOnboardingProfile(studentId?: string): Promise<{ student_id: string; onboarding_completed: boolean; onboarding_data: OnboardingProfile }> {
    const url = studentId ? `${API_BASE}/learner/onboarding?student_id=${studentId}` : `${API_BASE}/learner/onboarding`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<any>(res, 'Failed to fetch onboarding profile');
  },

  async saveOnboardingProfile(payload: OnboardingProfile, studentId?: string): Promise<{
    status: string;
    onboarding_completed: boolean;
    profile: LearnerProfile;
    learning_path: PersonalizedLearningPath;
  }> {
    const url = studentId ? `${API_BASE}/learner/onboarding?student_id=${studentId}` : `${API_BASE}/learner/onboarding`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse<any>(res, 'Failed to save onboarding profile');
  },

  async getPersonalizedLearningPath(studentId?: string): Promise<{ learning_path: PersonalizedLearningPath }> {
    const url = studentId ? `${API_BASE}/learner/learning-path?student_id=${studentId}` : `${API_BASE}/learner/learning-path`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<{ learning_path: PersonalizedLearningPath }>(res, 'Failed to fetch personalized learning path');
  },

  async getProficiencyInfo(studentId?: string): Promise<ProficiencyInfo> {
    const url = studentId ? `${API_BASE}/learner/proficiency?student_id=${studentId}` : `${API_BASE}/learner/proficiency`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<ProficiencyInfo>(res, 'Failed to fetch proficiency information');
  },

  async submitDiagnostic(
    submissions: { question_id: string; concept_id: string; selected_option: string; student_reasoning?: string }[],
    studentId = 'student_default'
  ): Promise<DiagnosticResult> {
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, submissions })
    });
    return await handleResponse<DiagnosticResult>(res, 'Failed to submit diagnostic assessment');
  },

  async getDiagnosticAttempts(studentId = 'student_default'): Promise<{ attempts: DiagnosticAttemptSummary[]; total: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/attempts?student_id=${studentId}`);
    return await handleResponse<{ attempts: DiagnosticAttemptSummary[]; total: number }>(res, 'Failed to fetch diagnostic attempts');
  },

  async getDiagnosticAttempt(attemptId: string): Promise<{ attempt: DiagnosticResult }> {
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/attempt/${attemptId}`);
    return await handleResponse<{ attempt: DiagnosticResult }>(res, `Failed to fetch diagnostic attempt '${attemptId}'`);
  },

  async getAdaptiveQuestion(conceptId?: string, studentId = 'student_default'): Promise<{
    question: Question;
    target_concept: string;
    calibrated_difficulty: string;
    decision_rationale?: string;
    tools_executed: any[];
  }> {
    let url = `${API_BASE}/quiz/adaptive?student_id=${studentId}`;
    if (conceptId) url += `&concept_id=${conceptId}`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<any>(res, 'Failed to generate adaptive question');
  },

  async submitAnswer(
    questionId: string,
    conceptId: string,
    selectedOption: string,
    studentReasoning: string,
    confidenceLevel = 'medium',
    studentId = 'student_default'
  ): Promise<EvaluationResult> {
    const res = await fetchWithTimeout(`${API_BASE}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        question_id: questionId,
        concept_id: conceptId,
        selected_option: selectedOption,
        student_reasoning: studentReasoning,
        confidence_level: confidenceLevel
      })
    });
    return await handleResponse<EvaluationResult>(res, 'Failed to submit quiz answer');
  },

  async tutorChat(rawTranscript: string, studentId = 'student_default'): Promise<{
    response: string;
    speech_metadata: any;
    tools_executed: any[];
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, raw_transcript: rawTranscript })
    });
    return await handleResponse<any>(res, 'Tutor communication failed');
  },

  async tutorAction(
    conceptId: string,
    actionType: string,
    studentId = 'student_default'
  ): Promise<{
    concept_id: string;
    concept_name: string;
    action_type: string;
    content: string;
    formatted_content?: string;
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id: conceptId,
        action_type: actionType,
        student_id: studentId
      })
    });
    return await handleResponse<any>(res, `Tutor action '${actionType}' failed`);
  },

  async getChatMessages(studentId = 'student_default'): Promise<{
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      metadata?: any;
    }>;
    total: number;
  }> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/messages?student_id=${studentId}`);
    return await handleResponse<any>(res, 'Failed to retrieve chat messages');
  },

  async getRevisionTasks(studentId = 'student_default'): Promise<{ tasks: RevisionTask[]; total: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/revision/tasks?student_id=${studentId}`);
    return await handleResponse<{ tasks: RevisionTask[]; total: number }>(res, 'Failed to fetch revision tasks');
  },

  async completeRevisionTask(taskId: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/revision/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId })
    });
    if (!res.ok) {
      throw new Error(`Failed to complete revision task (Status ${res.status})`);
    }
  },

  async getTeacherDashboard(): Promise<TeacherDashboardData> {
    const res = await fetchWithTimeout(`${API_BASE}/teacher/dashboard`);
    return await handleResponse<TeacherDashboardData>(res, 'Failed to fetch teacher dashboard data');
  },

  async getTeacherDemoDashboard(): Promise<TeacherDashboardData> {
    const res = await fetchWithTimeout(`${API_BASE}/teacher/demo-dashboard`);
    return await handleResponse<TeacherDashboardData>(res, 'Failed to fetch teacher demo dashboard data');
  },

  async aggregateTeacherMetrics(): Promise<{ status: string; message: string; data: TeacherDashboardData }> {
    const res = await fetchWithTimeout(`${API_BASE}/teacher/aggregate`, {
      method: 'POST'
    });
    return await handleResponse<{ status: string; message: string; data: TeacherDashboardData }>(res, 'Failed to aggregate class metrics');
  },

  async aggregateDemoMetrics(): Promise<{ status: string; message: string; data: TeacherDashboardData }> {
    const res = await fetchWithTimeout(`${API_BASE}/teacher/aggregate-demo`, {
      method: 'POST'
    });
    return await handleResponse<{ status: string; message: string; data: TeacherDashboardData }>(res, 'Failed to aggregate demonstration metrics');
  },

  async getGamificationDashboard(studentId?: string): Promise<any> {
    const query = studentId ? `?student_id=${studentId}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/gamification/dashboard${query}`);
    return await handleResponse<any>(res, 'Failed to fetch gamification dashboard');
  },

  async getUserSettings(studentId?: string): Promise<any> {
    const query = studentId ? `?student_id=${studentId}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/user/settings${query}`);
    return await handleResponse<any>(res, 'Failed to fetch user settings');
  },

  async updateUserSettings(payload: any): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/user/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse<any>(res, 'Failed to update user settings');
  },

  async getUserNotifications(studentId?: string): Promise<any[]> {
    const query = studentId ? `?student_id=${studentId}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/user/notifications${query}`);
    return await handleResponse<any[]>(res, 'Failed to fetch notifications');
  },

  async markNotificationsRead(notificationId?: string): Promise<any> {
    const endpoint = notificationId
      ? `${API_BASE}/user/notifications/${notificationId}/read`
      : `${API_BASE}/user/notifications/mark-read`;
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return await handleResponse<any>(res, 'Failed to mark notifications read');
  }
};
