export interface ConceptMastery {
  concept_id: string;
  concept_name: string;
  category: string;
  mastery_percentage: number;
  questions_attempted: number;
  correct_answers: number;
  incorrect_answers: number;
  current_difficulty: 'novice' | 'intermediate' | 'advanced';
  last_misconception?: string | null;
  last_misconception_name?: string | null;
  last_practiced_at?: string | null;
  next_revision_at?: string | null;
  consecutive_correct: number;
}

export interface ConceptNode {
  id: string;
  name: string;
  category: string;
  prerequisites: string[];
  description: string;
  difficulty_tier: string;
  graph_position: { x: number; y: number };
  key_subtopics: string[];
  mastery_percentage: number;
  questions_attempted: number;
  current_difficulty: string;
  last_misconception_name?: string | null;
  next_revision_at?: string | null;
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export interface LearnerProfile {
  student_id: string;
  name: string;
  target_exam: string;
  overall_mastery: number;
  diagnostic_completed: boolean;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  learner_category?: string;
  verified_proficiency_level?: number | string;
  verified_proficiency_score?: number;
  onboarding_data?: OnboardingProfile;
  learning_path?: PersonalizedLearningPath;
  streak_days?: number;
  concepts: Record<string, ConceptMastery>;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProfile {
  learner_category: string;
  category_details?: Record<string, any>;
  programming_experience: string;
  dsa_experience: string;
  programming_languages: string[];
  preferred_language: string;
  previously_studied_concepts: string[];
  primary_goals: string[];
  target_timeline: string;
  daily_availability: string;
  self_assessed_skill_level: string;
  learning_preferences: string[];
  diagnostic_mode?: 'quick' | 'comprehensive';
  onboarding_completed?: boolean;
}

export interface PersonalizedLearningPath {
  student_id: string;
  learner_category: string;
  primary_goals: string[];
  verified_proficiency_level: string;
  focus_strategy: string;
  strong_concepts: Array<{ concept_id: string; concept_name: string; category: string; mastery: number }>;
  learning_concepts: Array<{ concept_id: string; concept_name: string; category: string; mastery: number }>;
  weak_concepts: Array<{ concept_id: string; concept_name: string; category: string; mastery: number; reason?: string }>;
  missing_prerequisites: Array<{ prerequisite_id: string; prerequisite_name: string; needed_for: string; current_mastery: number }>;
  recommended_next_concepts: Array<{ concept_id: string; concept_name: string; reason: string }>;
  suggested_question_difficulty: 'novice' | 'intermediate' | 'advanced';
  daily_practice_target?: { questions_per_day: number; estimated_study_hours_week: number; pace: string };
  daily_question_target: number;
  target_timeline: string;
  target_completion_date: string;
  learning_preferences: string[];
  generated_at: string;
}

export interface ProficiencyInfo {
  student_id: string;
  verified_proficiency_level: number;
  verified_proficiency_score: number;
  level_title: string;
  level_description: string;
  diagnostic_completed: boolean;
  overall_mastery: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  concept_id: string;
  difficulty: 'novice' | 'intermediate' | 'advanced';
  question_text: string;
  options: QuestionOption[];
  is_diagnostic?: boolean;
}

export interface AgentToolLog {
  tool_name: string;
  status: string;
  execution_time_ms: number;
  input_summary: string;
  output_summary: string;
}

export interface EvaluationResult {
  is_correct: boolean;
  score_delta: number;
  new_mastery: number;
  correct_option: string;
  explanation: string;
  detected_misconception?: {
    id: string;
    name: string;
    concept_id: string;
    description: string;
    remediation_tip: string;
    prerequisite_to_review?: string;
  } | null;
  classification?: string;
  decision_rationale?: string;
  clarifying_question?: string | null;
  agent_feedback: string;
  next_recommended_concept: string;
  next_revision_date: string;
  tools_executed: AgentToolLog[];
}

export interface RevisionTask {
  id: string;
  student_id: string;
  concept_id: string;
  concept_name: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface TeacherIntervention {
  student_id: string;
  name: string;
  weakest_concept: string;
  mastery: number;
  primary_misconception: string;
  days_since_practice: number;
  recommended_intervention: string;
}

export interface TeacherDashboardData {
  total_demo_learners: number;
  average_concept_mastery: number;
  weakest_concepts: { concept: string; struggling_students: number }[];
  class_misconception_distribution: { misconception: string; count: number }[];
  students_requiring_intervention: TeacherIntervention[];
  sample_notice?: string | null;
  is_demo?: boolean;
  message?: string;
  last_aggregated_at?: string;
}

export interface HealthInfo {
  status: string;
  service: string;
  version: string;
  engine: {
    provider: string;
    is_ai_configured: boolean;
    model: string;
    fallback_available: boolean;
  };
  syllabus: {
    name: string;
    concepts_count: number;
    concepts: string[];
  };
  features: Record<string, string>;
}

export interface DiagnosticQuestionReview {
  question_id: string;
  concept_id: string;
  concept_name: string;
  category: string;
  difficulty: 'novice' | 'intermediate' | 'advanced';
  question_text: string;
  options: QuestionOption[];
  selected_option: string;
  correct_option: string;
  is_correct: boolean;
  status: 'correct' | 'incorrect' | 'unanswered';
  explanation: string;
  student_reasoning?: string;
  misconception?: {
    id: string;
    name: string;
    description: string;
    remediation_tip: string;
    prerequisite_to_review?: string;
  } | null;
  calibrated_mastery: number;
}

export interface DiagnosticConceptAnalysis {
  concept_id: string;
  concept_name: string;
  category: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy: number;
  status: 'Strong' | 'Developing' | 'Needs Improvement';
  calibrated_mastery: number;
}

export interface DiagnosticResult {
  status: string;
  diagnostic_completed: boolean;
  attempt_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  overall_mastery: number;
  concept_breakdown: DiagnosticConceptAnalysis[];
  question_reviews: DiagnosticQuestionReview[];
  verified_proficiency?: {
    level_number: number;
    level_title: string;
    title: string;
    description: string;
    score: number;
    proficiency_score: number;
    raw_accuracy: number;
  };
  learning_path?: PersonalizedLearningPath;
}

export interface DiagnosticAttemptSummary {
  id: string;
  student_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  timestamp: string;
}

export interface User {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  normalized_email?: string;
  role: 'student' | 'teacher' | 'admin';
  auth_provider: 'local' | 'google' | 'demo';
  is_email_verified?: boolean;
  is_demo?: boolean;
  avatar_url?: string;
  created_at?: string;
  last_login_at?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
  learner?: LearnerProfile;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  daily_learning_goal_minutes: number;
  timezone: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  sound_effects: boolean;
  preferred_learning_mode: string;
  learning_preferences?: string[];
}

export interface UserNotification {
  id: string;
  student_id?: string;
  title: string;
  message: string;
  notification_type: 'info' | 'streak' | 'achievement' | 'revision' | 'alert';
  is_read: boolean;
  created_at: string;
}

export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'error' | 'not-found';

export interface LiveVideoAnalysisResult {
  analysis: string;
  detected_concept: string;
  concept_name: string;
  confidence: number;
  feedback_type: 'socratic_hint' | 'correction' | 'worked_example' | 'confirmation';
  is_ai_powered: boolean;
  timestamp: string;
}



