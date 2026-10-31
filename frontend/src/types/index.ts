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
  concepts: Record<string, ConceptMastery>;
  created_at: string;
  updated_at: string;
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
  sample_notice: string;
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
