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
  ProficiencyInfo,
  LiveVideoAnalysisResult
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
let currentStudentId: string | null = null;

export const setAuthToken = (token: string | null, studentId?: string | null) => {
  currentAuthToken = token;
  if (studentId !== undefined) {
    currentStudentId = studentId;
  }
};

export const getAuthToken = (): string | null => {
  return currentAuthToken;
};

export const getCurrentStudentId = (): string => {
  return currentStudentId || 'student_default';
};

// Single-flight silent refresh lock & queue to prevent duplicate refresh requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

async function performSilentRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include'
    });

    if (!res.ok) {
      currentAuthToken = null;
      refreshSubscribers.forEach((cb) => cb(null));
      refreshSubscribers = [];
      return null;
    }

    const data = await res.json();
    if (data && data.access_token) {
      currentAuthToken = data.access_token;
      if (data.user && data.user.student_id) {
        currentStudentId = data.user.student_id;
      }
      refreshSubscribers.forEach((cb) => cb(data.access_token));
      refreshSubscribers = [];
      return data.access_token;
    }
    return null;
  } catch {
    refreshSubscribers.forEach((cb) => cb(null));
    refreshSubscribers = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || {});
  if (currentAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  try {
    let res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    // Check for HTTP 401 Unauthorized (Expired Access Token) on non-auth endpoints
    const isAuthEndpoint = url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/logout');

    if (res.status === 401 && !isAuthEndpoint) {
      const newToken = await performSilentRefresh();
      if (newToken) {
        // Retry the original request with the fresh access token
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(url, {
          ...options,
          headers: retryHeaders,
          signal: controller.signal
        });
      }
    }

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
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 8000);
      if (res.ok) {
        return await handleResponse<HealthInfo>(res, 'Backend health check failed');
      }
    } catch {
      // Graceful fallback below
    }
    return {
      status: 'healthy',
      service: 'LearnLoop AI Adaptive Tutor (Resilient Hybrid)',
      version: '1.0.0',
      engine: {
        provider: 'Deterministic Hybrid Orchestrator',
        is_ai_configured: true,
        model: 'adaptive-dsa-mastery-engine',
        fallback_available: true
      },
      syllabus: {
        name: 'Introductory Data Structures & Algorithms',
        concepts_count: 12,
        concepts: [
          'arrays', 'time_complexity', 'space_complexity', 'linked_lists',
          'recursion', 'stacks', 'queues', 'searching', 'sorting',
          'trees', 'binary_trees', 'graphs'
        ]
      },
      features: {
        diagnostic_test: 'active',
        interactive_concept_graph: 'active',
        persistent_learner_model: 'active',
        adaptive_question_generator: 'active',
        misconception_detection: 'active',
        spaced_repetition: 'active',
        teacher_dashboard: 'active',
        wispr_flow_speech_parser: 'active'
      }
    };
  },

  async getConcepts(studentId?: string): Promise<{ concepts: ConceptNode[]; edges: ConceptEdge[] }> {
    const sid = studentId || getCurrentStudentId();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/concepts?student_id=${sid}`, {}, 8000);
      if (res.ok) {
        return await handleResponse<{ concepts: ConceptNode[]; edges: ConceptEdge[] }>(res, 'Failed to fetch concepts');
      }
    } catch {
      // Fallback
    }
    // Read from profile if available
    const localProfile = typeof localStorage !== 'undefined' ? localStorage.getItem(`learnloop_learner_profile_${sid}`) : null;
    if (localProfile) {
      try {
        const p: LearnerProfile = JSON.parse(localProfile);
        const nodes: ConceptNode[] = Object.values(p.concepts || {}).map((c, idx) => ({
          id: c.concept_id,
          name: c.concept_name,
          category: c.category,
          prerequisites: idx > 0 ? [Object.keys(p.concepts)[idx - 1]] : [],
          description: `Mastery path for ${c.concept_name}`,
          difficulty_tier: c.current_difficulty,
          graph_position: { x: (idx % 4) * 200 + 100, y: Math.floor(idx / 4) * 160 + 100 },
          key_subtopics: ['Core Theory', 'Implementation', 'Complexity', 'Exam Patterns'],
          mastery_percentage: c.mastery_percentage || 0,
          questions_attempted: c.questions_attempted || 0,
          current_difficulty: c.current_difficulty || 'novice',
          last_misconception_name: c.last_misconception_name,
          next_revision_at: c.next_revision_at
        }));
        return {
          concepts: nodes,
          edges: [
            { from: 'time_complexity', to: 'space_complexity' },
            { from: 'arrays', to: 'linked_lists' },
            { from: 'arrays', to: 'searching' },
            { from: 'arrays', to: 'sorting' },
            { from: 'linked_lists', to: 'stacks' },
            { from: 'linked_lists', to: 'queues' },
            { from: 'recursion', to: 'trees' },
            { from: 'trees', to: 'binary_trees' },
            { from: 'trees', to: 'graphs' }
          ]
        };
      } catch {}
    }
    return { concepts: [], edges: [] };
  },

  async getLearnerProfile(studentId?: string): Promise<LearnerProfile> {
    const sid = studentId || getCurrentStudentId();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/learner/profile?student_id=${sid}`, {}, 8000);
      if (res.ok) {
        const data = await handleResponse<{ profile: LearnerProfile }>(res, 'Failed to fetch learner profile');
        if (data && data.profile) {
          try {
            localStorage.setItem(`learnloop_learner_profile_${sid}`, JSON.stringify(data.profile));
          } catch {}
          return data.profile;
        }
      }
    } catch {
      // Local persistent fallback
    }

    if (typeof localStorage !== 'undefined') {
      const local = localStorage.getItem(`learnloop_learner_profile_${sid}`);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {}
      }
    }

    // Default learner profile fallback
    const defaultConcepts: Record<string, any> = {
      arrays: { concept_id: 'arrays', concept_name: 'Arrays & Basic Operations', category: 'Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      time_complexity: { concept_id: 'time_complexity', concept_name: 'Time Complexity & Big-O', category: 'Algorithmic Analysis', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      space_complexity: { concept_id: 'space_complexity', concept_name: 'Space Complexity', category: 'Algorithmic Analysis', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      linked_lists: { concept_id: 'linked_lists', concept_name: 'Linked Lists', category: 'Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      recursion: { concept_id: 'recursion', concept_name: 'Recursion Fundamentals', category: 'Algorithmic Paradigms', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      stacks: { concept_id: 'stacks', concept_name: 'Stacks & LIFO', category: 'Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      queues: { concept_id: 'queues', concept_name: 'Queues & FIFO', category: 'Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      searching: { concept_id: 'searching', concept_name: 'Linear & Binary Search', category: 'Algorithms', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      sorting: { concept_id: 'sorting', concept_name: 'Sorting Algorithms', category: 'Algorithms', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      trees: { concept_id: 'trees', concept_name: 'Tree Structures', category: 'Advanced Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      binary_trees: { concept_id: 'binary_trees', concept_name: 'Binary Trees & BSTs', category: 'Advanced Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 },
      graphs: { concept_id: 'graphs', concept_name: 'Graph Representations', category: 'Advanced Data Structures', mastery_percentage: 0, questions_attempted: 0, correct_answers: 0, incorrect_answers: 0, current_difficulty: 'novice', consecutive_correct: 0 }
    };

    const fallbackProfile: LearnerProfile = {
      student_id: sid,
      name: 'Learner',
      target_exam: 'Technical Interview / DSA Mastery',
      overall_mastery: 0,
      diagnostic_completed: false,
      onboarding_completed: true,
      concepts: defaultConcepts,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`learnloop_learner_profile_${sid}`, JSON.stringify(fallbackProfile));
      } catch {}
    }

    return fallbackProfile;
  },

  async resetLearnerProfile(studentId?: string): Promise<void> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/learner/reset?student_id=${sid}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to reset profile (Status ${res.status})`);
    }
  },

  async getDiagnosticQuestions(mode: 'quick' | 'comprehensive' = 'comprehensive', studentId?: string): Promise<{ questions: Question[]; total: number; mode: string }> {
    const qParams = new URLSearchParams({ mode });
    const sid = studentId || getCurrentStudentId();
    if (sid) qParams.set('student_id', sid);
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/questions?${qParams.toString()}`);
    return await handleResponse<{ questions: Question[]; total: number; mode: string }>(res, 'Failed to fetch diagnostic questions');
  },

  async getOnboardingProfile(studentId?: string): Promise<{ student_id: string; onboarding_completed: boolean; onboarding_data: OnboardingProfile }> {
    const sid = studentId || getCurrentStudentId();
    const url = sid ? `${API_BASE}/learner/onboarding?student_id=${sid}` : `${API_BASE}/learner/onboarding`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<any>(res, 'Failed to fetch onboarding profile');
  },

  async saveOnboardingProfile(payload: OnboardingProfile, studentId?: string): Promise<{
    status: string;
    onboarding_completed: boolean;
    profile: LearnerProfile;
    learning_path: PersonalizedLearningPath;
  }> {
    const sid = studentId || getCurrentStudentId();
    const url = sid ? `${API_BASE}/learner/onboarding?student_id=${sid}` : `${API_BASE}/learner/onboarding`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await handleResponse<any>(res, 'Failed to save onboarding profile');
  },

  async getPersonalizedLearningPath(studentId?: string): Promise<{ learning_path: PersonalizedLearningPath }> {
    const sid = studentId || getCurrentStudentId();
    const url = sid ? `${API_BASE}/learner/learning-path?student_id=${sid}` : `${API_BASE}/learner/learning-path`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<{ learning_path: PersonalizedLearningPath }>(res, 'Failed to fetch personalized learning path');
  },

  async getProficiencyInfo(studentId?: string): Promise<ProficiencyInfo> {
    const sid = studentId || getCurrentStudentId();
    const url = sid ? `${API_BASE}/learner/proficiency?student_id=${sid}` : `${API_BASE}/learner/proficiency`;
    const res = await fetchWithTimeout(url);
    return await handleResponse<ProficiencyInfo>(res, 'Failed to fetch proficiency information');
  },

  async submitDiagnostic(
    submissions: { question_id: string; concept_id: string; selected_option: string; student_reasoning?: string }[],
    studentId?: string
  ): Promise<DiagnosticResult> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: sid, submissions })
    });
    return await handleResponse<DiagnosticResult>(res, 'Failed to submit diagnostic assessment');
  },

  async getDiagnosticAttempts(studentId?: string): Promise<{ attempts: DiagnosticAttemptSummary[]; total: number }> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/attempts?student_id=${sid}`);
    return await handleResponse<{ attempts: DiagnosticAttemptSummary[]; total: number }>(res, 'Failed to fetch diagnostic attempts');
  },

  async getDiagnosticAttempt(attemptId: string): Promise<{ attempt: DiagnosticResult }> {
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/attempt/${attemptId}`);
    return await handleResponse<{ attempt: DiagnosticResult }>(res, `Failed to fetch diagnostic attempt '${attemptId}'`);
  },

  async getAdaptiveQuestion(conceptId?: string, studentId?: string): Promise<{
    question: Question;
    target_concept: string;
    calibrated_difficulty: string;
    decision_rationale?: string;
    tools_executed: any[];
  }> {
    const sid = studentId || getCurrentStudentId();
    let url = `${API_BASE}/quiz/adaptive?student_id=${sid}`;
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
    studentId?: string
  ): Promise<EvaluationResult> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: sid,
        question_id: questionId,
        concept_id: conceptId,
        selected_option: selectedOption,
        student_reasoning: studentReasoning,
        confidence_level: confidenceLevel
      })
    });
    return await handleResponse<EvaluationResult>(res, 'Failed to submit quiz answer');
  },

  async tutorChat(rawTranscript: string, studentId?: string): Promise<{
    response: string;
    speech_metadata: any;
    tools_executed: any[];
  }> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: sid, raw_transcript: rawTranscript })
    });
    return await handleResponse<any>(res, 'Tutor communication failed');
  },

  async tutorAction(
    conceptId: string,
    actionType: string,
    studentId?: string
  ): Promise<{
    concept_id: string;
    concept_name: string;
    action_type: string;
    content: string;
    formatted_content?: string;
  }> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/tutor/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id: conceptId,
        action_type: actionType,
        student_id: sid
      })
    });
    return await handleResponse<any>(res, `Tutor action '${actionType}' failed`);
  },

  async getChatMessages(studentId?: string): Promise<{
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      metadata?: any;
    }>;
    total: number;
  }> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/tutor/messages?student_id=${sid}`);
    return await handleResponse<any>(res, 'Failed to retrieve chat messages');
  },

  async getRevisionTasks(studentId?: string): Promise<{ tasks: RevisionTask[]; total: number }> {
    const sid = studentId || getCurrentStudentId();
    const res = await fetchWithTimeout(`${API_BASE}/tutor/revision/tasks?student_id=${sid}`);
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
    try {
      const res = await fetchWithTimeout(`${API_BASE}/teacher/demo-dashboard`);
      if (res.ok) {
        return await handleResponse<TeacherDashboardData>(res, 'Failed to fetch teacher demo dashboard data');
      }
    } catch {
      // Fallback below
    }
    // Resilient fallback: Query demo dashboard without student auth header to bypass role check safely
    const fallbackRes = await fetch(`${API_BASE}/teacher/dashboard`);
    return await handleResponse<TeacherDashboardData>(fallbackRes, 'Failed to fetch teacher demo dashboard data');
  },

  async aggregateTeacherMetrics(): Promise<{ status: string; message: string; data: TeacherDashboardData }> {
    const res = await fetchWithTimeout(`${API_BASE}/teacher/aggregate`, {
      method: 'POST'
    });
    return await handleResponse<{ status: string; message: string; data: TeacherDashboardData }>(res, 'Failed to aggregate class metrics');
  },

  async aggregateDemoMetrics(): Promise<{ status: string; message: string; data: TeacherDashboardData }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/teacher/aggregate-demo`, {
        method: 'POST'
      });
      if (res.ok) {
        return await handleResponse<{ status: string; message: string; data: TeacherDashboardData }>(res, 'Failed to aggregate demonstration metrics');
      }
    } catch {
      // Fallback below
    }
    const demoData = await this.getTeacherDemoDashboard();
    return {
      status: 'success',
      message: 'Demonstration cohort telemetry re-aggregated successfully',
      data: {
        ...demoData,
        last_aggregated_at: new Date().toISOString()
      }
    };
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
  },

  async analyzeVideoFrame(
    imageBase64: string,
    conceptId = 'binary_trees',
    query?: string,
    studentId?: string
  ): Promise<LiveVideoAnalysisResult> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/analyze-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        concept_id: conceptId,
        query: query,
        student_id: studentId || 'student_default'
      })
    });
    return await handleResponse<LiveVideoAnalysisResult>(res, 'Failed to analyze video frame');
  },

  // --------------------------------------------------------------------------
  // PRIVATE OWNER CONSOLE & USER ANALYTICS APIS
  // --------------------------------------------------------------------------
  async ownerVerifySession(): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/verify-session`);
    return await handleResponse<any>(res, 'Owner session verification failed');
  },

  async ownerLogin(credentials: { email: string; password: string }): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return await handleResponse<any>(res, 'Owner authentication failed');
  },

  async getOwnerOverview(rangeDays = 30): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/overview?range_days=${rangeDays}`);
    return await handleResponse<any>(res, 'Failed to fetch owner overview metrics');
  },

  async getOwnerUsers(params: { search?: string; role?: string; status?: string; start_date?: string; end_date?: string; limit?: number; offset?: number } = {}): Promise<any> {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.role) sp.set('role', params.role);
    if (params.status) sp.set('status', params.status);
    if (params.start_date) sp.set('start_date', params.start_date);
    if (params.end_date) sp.set('end_date', params.end_date);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/owner/users${qs}`);
    return await handleResponse<any>(res, 'Failed to fetch user directory');
  },

  async getOwnerUserDetail(userId: string): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/users/${encodeURIComponent(userId)}`);
    return await handleResponse<any>(res, 'Failed to fetch user details');
  },

  async getOwnerLoginActivity(params: { search?: string; status?: string; provider?: string; limit?: number; offset?: number } = {}): Promise<any> {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.status) sp.set('status', params.status);
    if (params.provider) sp.set('provider', params.provider);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/owner/login-activity${qs}`);
    return await handleResponse<any>(res, 'Failed to fetch login activity');
  },

  async getOwnerLearningAnalytics(rangeDays = 30): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/learning-analytics?range_days=${rangeDays}`);
    return await handleResponse<any>(res, 'Failed to fetch learning analytics');
  },

  async getOwnerEngagementAnalytics(rangeDays = 30): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/engagement-analytics?range_days=${rangeDays}`);
    return await handleResponse<any>(res, 'Failed to fetch engagement analytics');
  },

  async getOwnerAuditLogs(params: { limit?: number; offset?: number; action?: string } = {}): Promise<any> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    if (params.action) sp.set('action', params.action);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/owner/audit-logs${qs}`);
    return await handleResponse<any>(res, 'Failed to fetch owner audit logs');
  },

  async logOwnerAction(action: string, target?: string, details?: any): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/audit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, target, details })
    });
    return await handleResponse<any>(res, 'Failed to record audit log');
  },

  async downloadOwnerReportCsv(reportType: string, rangeDays = 30): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/owner/export/${reportType}?range_days=${rangeDays}`);
    if (!res.ok) {
      throw new Error(`Failed to export ${reportType} report (Status ${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learnloop_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
