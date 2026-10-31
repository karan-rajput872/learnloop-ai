from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class ConceptMasterySchema(BaseModel):
    concept_id: str
    concept_name: str
    category: str
    mastery_percentage: float = 0.0
    questions_attempted: int = 0
    correct_answers: int = 0
    incorrect_answers: int = 0
    current_difficulty: str = "novice"
    last_misconception: Optional[str] = None
    last_misconception_name: Optional[str] = None
    last_practiced_at: Optional[str] = None
    next_revision_at: Optional[str] = None
    consecutive_correct: int = 0

class LearnerProfileSchema(BaseModel):
    student_id: str
    name: str = "Alex Chen"
    target_exam: str = "DSA Technical Assessment / Exam"
    overall_mastery: float = 0.0
    diagnostic_completed: bool = False
    concepts: Dict[str, ConceptMasterySchema]
    created_at: str
    updated_at: str

class QuestionOptionSchema(BaseModel):
    id: str
    text: str

class QuestionSchema(BaseModel):
    id: str
    concept_id: str
    difficulty: str
    question_text: str
    options: List[QuestionOptionSchema]
    is_diagnostic: bool = False
    correct_option: Optional[str] = None
    explanation: Optional[str] = None

class QuestionAnswerSubmission(BaseModel):
    student_id: str
    question_id: str
    concept_id: str
    selected_option: str
    student_reasoning: str = ""
    confidence_level: str = "medium"  # low, medium, high

class AgentToolExecutionLog(BaseModel):
    tool_name: str
    status: str
    execution_time_ms: float
    input_summary: str
    output_summary: str
    decision_made: Optional[str] = None
    model_mutation: Optional[str] = None

class EvaluationResponse(BaseModel):
    is_correct: bool
    score_delta: float
    new_mastery: float
    correct_option: str
    explanation: str
    classification: Optional[str] = "correct_sound"
    detected_misconception: Optional[Dict[str, Any]] = None
    clarifying_question: Optional[str] = None
    agent_feedback: str
    decision_rationale: Optional[str] = None
    next_recommended_concept: str
    next_revision_date: str
    tools_executed: List[AgentToolExecutionLog]

class SpeechInputPayload(BaseModel):
    student_id: str
    raw_transcript: str  # Dictated speech from Wispr Flow
    conversation_context: Optional[str] = None

class TutorMessage(BaseModel):
    role: str  # user, assistant
    content: str
    timestamp: str
    cleaned_query: Optional[str] = None
    filler_words_removed: Optional[List[str]] = None
    tools_executed: Optional[List[AgentToolExecutionLog]] = None

class RevisionTaskSchema(BaseModel):
    id: str
    student_id: str
    concept_id: str
    concept_name: str
    due_date: str
    status: str  # pending, completed, overdue
    reason: str
    urgency: str  # high, medium, low

class TeacherStudentIntervention(BaseModel):
    student_id: str
    name: str
    weakest_concept: str
    mastery: float
    primary_misconception: str
    days_since_practice: int
    recommended_intervention: str

class TeacherDashboardData(BaseModel):
    total_demo_learners: int
    average_concept_mastery: float
    weakest_concepts: List[Dict[str, Any]]
    class_misconception_distribution: List[Dict[str, Any]]
    students_requiring_intervention: List[TeacherStudentIntervention]
    sample_notice: str
