import {
  HealthInfo,
  LearnerProfile,
  ConceptNode,
  ConceptEdge,
  Question,
  EvaluationResult,
  RevisionTask,
  TeacherDashboardData
} from '../types';

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);

// If VITE_API_BASE is provided in build env, use it.
// Otherwise, detect if running on the web (e.g. Vercel) and route to production Render backend automatically.
export const getApiBase = (): string => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim() !== '') {
    return envBase.trim().replace(/\/+$/, '');
  }
  return isLocalhost
    ? 'http://localhost:8000/api'
    : 'https://learnloop-ai-backend.onrender.com/api';
};

const API_BASE = getApiBase();

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The backend on Render may be waking up from sleep mode.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getBaseUrl(): string {
    return API_BASE;
  },

  async getHealth(): Promise<HealthInfo> {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 15000);
    if (!res.ok) throw new Error('Backend health check failed');
    return await res.json();
  },

  async getConcepts(studentId = 'student_default'): Promise<{ concepts: ConceptNode[]; edges: ConceptEdge[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/concepts?student_id=${studentId}`);
    if (!res.ok) throw new Error('Failed to fetch concepts');
    return await res.json();
  },

  async getLearnerProfile(studentId = 'student_default'): Promise<LearnerProfile> {
    const res = await fetchWithTimeout(`${API_BASE}/learner/profile?student_id=${studentId}`);
    if (!res.ok) throw new Error('Failed to fetch learner profile');
    const data = await res.json();
    return data.profile;
  },

  async resetLearnerProfile(studentId = 'student_default'): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/learner/reset?student_id=${studentId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset profile');
  },

  async getDiagnosticQuestions(): Promise<{ questions: Question[]; total: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/questions`);
    if (!res.ok) throw new Error('Failed to fetch diagnostic questions');
    return await res.json();
  },

  async submitDiagnostic(
    submissions: { question_id: string; concept_id: string; selected_option: string; student_reasoning?: string }[],
    studentId = 'student_default'
  ): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE}/diagnostic/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, submissions })
    });
    if (!res.ok) throw new Error('Failed to submit diagnostic assessment');
    return await res.json();
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
    if (!res.ok) throw new Error('Failed to generate adaptive question');
    return await res.json();
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
    if (!res.ok) throw new Error('Failed to submit quiz answer');
    return await res.json();
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
    if (!res.ok) throw new Error('Tutor communication failed');
    return await res.json();
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
    if (!res.ok) throw new Error(`Tutor action '${actionType}' failed`);
    return await res.json();
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
    if (!res.ok) throw new Error('Failed to retrieve chat messages');
    return await res.json();
  },

  async getRevisionTasks(studentId = 'student_default'): Promise<{ tasks: RevisionTask[]; total: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/revision/tasks?student_id=${studentId}`);
    if (!res.ok) throw new Error('Failed to fetch revision tasks');
    return await res.json();
  },

  async completeRevisionTask(taskId: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE}/tutor/revision/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId })
    });
    if (!res.ok) throw new Error('Failed to complete revision task');
  },

  async getTeacherDashboard(): Promise<TeacherDashboardData> {
    const res = await fetchWithTimeout(`${API_BASE}/teacher/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch teacher dashboard data');
    return await res.json();
  }
};
