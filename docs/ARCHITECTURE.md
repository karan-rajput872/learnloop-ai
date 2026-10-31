# LearnLoop AI — System Architecture & Agent Specifications

> **"Don't just learn the answers. Master the concepts."**<br/>
> *Official Challenge: 02 — Adaptive Exam-Prep Tutor*<br/>
> *Product Space × Wispr Flow Agentic AI Hackathon '26*

---

## 1. High-Level Architecture Overview

LearnLoop AI is an agentic, concept-first exam preparation platform designed for technical mastery in introductory Data Structures and Algorithms (DSA). Rather than functioning as a standard conversational chatbot or a multiple-choice grader, LearnLoop AI implements a **closed-loop pedagogical agent pipeline** that continuously inspects, updates, and verifies an evolving knowledge graph of student conceptual mastery.

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Client (React 19 + TypeScript + Vite)"]
        UI_Dash["Dashboard & KPIs"]
        UI_Graph["Concept Graph (Pan / Zoom / List)"]
        UI_Quiz["Adaptive Practice & Rationale"]
        UI_Tutor["Socratic Tutor & Speech Chat"]
        UI_Rev["Spaced Repetition Schedule"]
        UI_Teach["Teacher Cohort Analytics"]
    end

    subgraph APILayer["FastAPI REST Interface (Python 3.11)"]
        R_Diag["/api/diagnostic/*"]
        R_Concepts["/api/concepts/*"]
        R_Learner["/api/learner/*"]
        R_Quiz["/api/quiz/*"]
        R_Tutor["/api/tutor/*"]
        R_Teacher["/api/teacher/*"]
    end

    subgraph AgentOrchestrator["TutorAgent Orchestrator (Multi-Tool Loop)"]
        T1["Tool 1: LearnerProfileRetriever"]
        T2["Tool 2: ConceptMasteryInspector"]
        T3["Tool 3: AdaptiveQuestionGenerator"]
        T4["Tool 4: ReasoningMisconceptionEvaluator"]
        T5["Tool 5: LearnerModelUpdater"]
        T6["Tool 6: SpacedRepetitionScheduler"]
        T7["Tool 7: ModelUpdateVerifier"]
    end

    subgraph CognitiveEngines["Cognitive & Language Engines"]
        SpeechParser["Wispr Flow Speech Disfluency Parser"]
        GeminiAPI["Google Gemini API (gemini-2.5-flash)"]
        LocalFallback["Deterministic Pedagogical Fallback Engine"]
    end

    subgraph PersistenceLayer["Persistence Layer (SQLite)"]
        DB_Learners[("learners")]
        DB_Concepts[("concept_mastery")]
        DB_Attempts[("attempts")]
        DB_Revisions[("revision_tasks")]
        DB_Demo[("teacher_demo_cohort")]
        DB_Chat[("chat_messages")]
    end

    ClientLayer <-->|REST HTTP / JSON| APILayer
    APILayer --> AgentOrchestrator
    AgentOrchestrator --> CognitiveEngines
    AgentOrchestrator <--> PersistenceLayer
```

---

## 2. Frontend-to-Backend Communication

Communication is structured around clean RESTful contracts defined via TypeScript types (`frontend/src/types/index.ts`) matching backend Pydantic schemas (`backend/app/models/schemas.py`).

| Domain | Route | Method | Payload / Parameters | Primary Responsibility |
|---|---|---|---|---|
| **System** | `/api/health` | `GET` | — | Returns health, model status, syllabus concepts, and active feature flags. |
| **Diagnostic** | `/api/diagnostic/questions` | `GET` | — | Delivers 12 diagnostic assessment questions covering all syllabus concepts. |
| **Diagnostic** | `/api/diagnostic/submit` | `POST` | `{ student_id, submissions: [...] }` | Evaluates initial assessment and initializes baseline mastery profile. |
| **Concepts** | `/api/concepts` | `GET` | `student_id` | Returns all 12 nodes, directed prerequisite edges, and live student mastery. |
| **Concepts** | `/api/concepts/{id}` | `GET` | `concept_id`, `student_id` | Returns deep conceptual details, prerequisites, and mastery history. |
| **Learner** | `/api/learner/profile` | `GET` | `student_id` | Fetches active profile, overall mastery score, and concept-wise states. |
| **Learner** | `/api/learner/history` | `GET` | `student_id` | Chronological log of student practice attempts and evaluation outcomes. |
| **Learner** | `/api/learner/misconceptions` | `GET` | `student_id` | Filtered log of diagnosed conceptual misconceptions. |
| **Learner** | `/api/learner/reset` | `POST` | `student_id` | Resets learner state to fresh unassessed baseline for demo purposes. |
| **Quiz** | `/api/quiz/adaptive` | `GET` | `student_id`, `concept_id?` | Generates a difficulty-calibrated question targeting the student's weakest concept. |
| **Quiz** | `/api/quiz/submit` | `POST` | `{ student_id, question_id, concept_id, selected_option, student_reasoning, confidence_level }` | Executes 6-tool evaluation pipeline; updates mastery; returns decision rationale. |
| **Tutor** | `/api/tutor/chat` | `POST` | `{ student_id, raw_transcript }` | Parses natural voice/text dictation, isolates disfluencies, returns Socratic response. |
| **Tutor** | `/api/tutor/action` | `POST` | `{ student_id, concept_id, action_type }` | Executes targeted pedagogical action (`hint`, `analogy`, `worked_example`, `socratic_challenge`, `explain_simple`). |
| **Tutor** | `/api/tutor/messages` | `GET` | `student_id`, `limit?` | Fetches persistent chat turns stored in SQLite. |
| **Tutor** | `/api/tutor/revision/tasks` | `GET` | `student_id` | Retrieves scheduled spaced-repetition tasks with urgency indicators. |
| **Tutor** | `/api/tutor/revision/complete` | `POST` | `{ task_id }` | Marks a scheduled revision task as completed. |
| **Teacher** | `/api/teacher/dashboard` | `GET` | — | Aggregates class-wide mastery, misconception frequency, and students requiring intervention. |

---

## 3. The Seven Specialized Agent Tools

The architecture organizes bounded capabilities into 7 isolated tools located in `backend/app/tools/`. Each tool logs structured execution telemetry (`tool_name`, `execution_time_ms`, `input_summary`, `output_summary`, `status`).

```mermaid
classDiagram
    class LearnerProfileRetriever {
        +retrieve_learner_profile(student_id)
        Loads learner profile and concept mastery records
    }
    class ConceptMasteryInspector {
        +inspect_concept_mastery(profile)
        Computes weakest concept and prerequisite readiness
    }
    class AdaptiveQuestionGenerator {
        +generate_adaptive_question(concept_id, difficulty, prior_misconception)
        Synthesizes calibrated question targeting specific gap
    }
    class ReasoningMisconceptionEvaluator {
        +evaluate_reasoning_and_detect_misconception(question_id, concept_id, selected_option, reasoning)
        Diagnoses LIFO/FIFO, BST ancestor, recursion flaws
    }
    class LearnerModelUpdater {
        +update_learner_model(student_id, concept_id, is_correct, misconception, confidence)
        Applies Bayesian mastery delta and difficulty tier transitions
    }
    class SpacedRepetitionScheduler {
        +schedule_spaced_repetition(student_id, concept_id, is_correct, mastery, confidence)
        Calculates SM-2 interval and dispatches revision task
    }
    class ModelUpdateVerifier {
        +verify_learner_model_update(student_id, concept_id, expected_mastery)
        Executes read-after-write verification to prevent corruption
    }
```

### Detailed Tool Specifications

1. **`LearnerProfileRetriever` (`app.tools.profile_retriever`)**
   - **Input:** `student_id: str`
   - **Responsibility:** Retrieves the current learner model from SQLite, including overall mastery, diagnostic completion status, and concept-by-concept mastery rows.
   - **Output:** Structured profile dictionary and telemetry log.

2. **`ConceptMasteryInspector` (`app.tools.mastery_inspector`)**
   - **Input:** `profile: Dict[str, Any]`
   - **Responsibility:** Traverses the topological syllabus graph, analyzes concept mastery percentiles, identifies the current weakest bottleneck concept whose prerequisites are satisfied, and determines readiness for difficulty elevation.
   - **Output:** Weakest concept ID, category, and prerequisite readiness flags.

3. **`AdaptiveQuestionGenerator` (`app.tools.question_generator`)**
   - **Input:** `concept_id: str`, `difficulty: str`, `prior_misconception: Optional[str]`
   - **Responsibility:** Selects or synthesizes a targeted question matching the student's active difficulty tier (`novice`, `intermediate`, `advanced`) and specifically targeting prior misconceptions if present.
   - **Output:** Formatted question object with 4 options and metadata.

4. **`ReasoningMisconceptionEvaluator` (`app.tools.misconception_evaluator`)**
   - **Input:** `question_id: str`, `concept_id: str`, `selected_option: str`, `student_reasoning: str`
   - **Responsibility:** Evaluates student reasoning text against the DSA misconception taxonomy. Identifies specific misconceptions (e.g. `stack_fifo_confusion`, `bst_ancestor_constraint_violation`, `recursion_missing_base_case`) and produces targeted remediation tips.
   - **Output:** Correctness boolean, detected misconception object, explanation, and pedagogical feedback.

5. **`LearnerModelUpdater` (`app.tools.model_updater`)**
   - **Input:** `student_id: str`, `concept_id: str`, `is_correct: bool`, `detected_misconception: Optional[Dict]`, `confidence_level: str`
   - **Responsibility:** Applies Bayesian knowledge-tracing updates to concept mastery. Computes score delta ($\Delta$), promotes/demotes difficulty tiers based on consecutive streaks, updates overall learner mastery, and logs timestamps.
   - **Output:** New concept mastery percentage, score delta, and new difficulty level.

6. **`SpacedRepetitionScheduler` (`app.tools.repetition_scheduler`)**
   - **Input:** `student_id: str`, `concept_id: str`, `is_correct: bool`, `mastery: float`, `confidence: str`, `detected_misconception: Optional[Dict]`
   - **Responsibility:** Calculates optimal review interval using a modified SuperMemo-2 (SM-2) algorithm. In urgent cases (such as high-confidence misconceptions), schedules review within 24 hours. Creates revision tasks in SQLite.
   - **Output:** Due date ISO timestamp, review interval in days, urgency tier (`urgent`, `medium`, `low`), and revision reason.

7. **`ModelUpdateVerifier` (`app.tools.update_verifier`)**
   - **Input:** `student_id: str`, `concept_id: str`, `expected_mastery: float`
   - **Responsibility:** Performs a read-after-write verification against the database to guarantee state integrity before returning the response to the client.
   - **Output:** Verification boolean and status log.

---

## 4. Execution Pipelines & Workflow Sequences

### 4.1 Answer Submission & Evaluation Workflow (6 Tools Sequentially)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant API as FastAPI (/api/quiz/submit)
    participant Orchestrator as TutorAgent Orchestrator
    participant T1 as Tool 1: ProfileRetriever
    participant T4 as Tool 4: MisconceptionEvaluator
    participant T5 as Tool 5: ModelUpdater
    participant DB as SQLite Database
    participant T6 as Tool 6: RepetitionScheduler
    participant T7 as Tool 7: UpdateVerifier
    participant T2 as Tool 2: MasteryInspector

    Student->>API: POST /api/quiz/submit (answer + reasoning + confidence)
    API->>Orchestrator: evaluate_submission()
    Orchestrator->>T1: retrieve_learner_profile()
    T1-->>Orchestrator: current learner profile
    Orchestrator->>T4: evaluate_reasoning_and_detect_misconception()
    T4-->>Orchestrator: correctness, detected misconception, remediation
    Orchestrator->>T5: update_learner_model()
    T5->>DB: UPDATE concept_mastery, UPDATE learners
    T5-->>Orchestrator: new_mastery, score_delta, difficulty
    Orchestrator->>DB: INSERT INTO attempts
    Orchestrator->>T6: schedule_spaced_repetition()
    T6->>DB: INSERT INTO revision_tasks
    T6-->>Orchestrator: due_date, urgency, reason
    Orchestrator->>T7: verify_learner_model_update()
    T7->>DB: SELECT mastery FROM concept_mastery
    T7-->>Orchestrator: verification confirmation
    Orchestrator->>T2: inspect_concept_mastery()
    T2-->>Orchestrator: weakest concept & next recommendation
    Orchestrator->>Orchestrator: Synthesize Decision Rationale
    Orchestrator-->>API: Full Evaluation Result + Telemetry Logs
    API-->>Student: Rationale Card, Misconception Alert, Mastery Progress
```

### 4.2 Adaptive Question Generation Workflow (3 Tools)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant API as FastAPI (/api/quiz/adaptive)
    participant Orchestrator as TutorAgent Orchestrator
    participant T1 as Tool 1: ProfileRetriever
    participant T2 as Tool 2: MasteryInspector
    participant T3 as Tool 3: QuestionGenerator

    Student->>API: GET /api/quiz/adaptive?student_id=...
    API->>Orchestrator: get_adaptive_question()
    Orchestrator->>T1: retrieve_learner_profile()
    T1-->>Orchestrator: learner profile
    Orchestrator->>T2: inspect_concept_mastery()
    T2-->>Orchestrator: weakest unsatisfied concept & tier
    Orchestrator->>T3: generate_adaptive_question(concept, difficulty, prior_misconception)
    T3-->>Orchestrator: calibrated question object
    Orchestrator->>Orchestrator: Formulate selection rationale
    Orchestrator-->>API: Question + Rationale Banner + Telemetry
    API-->>Student: Render practice problem with rationale banner
```

---

## 5. Spaced Repetition Engine (Modified SM-2)

The spaced repetition algorithm calculates recall intervals based on three dynamic variables:
1. **Response Correctness** ($C \in \{0, 1\}$)
2. **Confidence Level** ($K \in \{\text{low: } 0.8, \text{medium: } 1.0, \text{high: } 1.2\}$)
3. **Misconception Severity** ($M \in \{0, 1\}$)

$$I_{\text{next}} = \begin{cases}
1.0 \text{ day (Urgent)}, & \text{if } C = 0 \text{ and } M = 1 \text{ and } K = 1.2 \text{ (High confidence mistake)} \\
2.0 \text{ days}, & \text{if } C = 0 \text{ (Standard mistake)} \\
\max(1, \text{round}(I_{\text{prior}} \times 2.2 \times K)), & \text{if } C = 1 \text{ (Reinforced success)}
\end{cases}$$

Revision tasks are automatically inserted into the `revision_tasks` table and surfaced on the student's Spaced Revision dashboard.

---

## 6. Socratic Tutor Actions Engine

Students can query the tutor using free-form dialogue or trigger one of five Socratic pedagogical quick actions:

```mermaid
flowchart LR
    Act{"Tutor Action"} --> H["hint: Scaffolding clue without direct answer"]
    Act --> A["analogy: Real-world mental model (e.g. Cafeteria plates for Stack)"]
    Act --> W["worked_example: Step-by-step code trace"]
    Act --> S["socratic_challenge: Probing counter-question"]
    Act --> E["explain_simple: Non-technical conceptual breakdown"]
```

When an action is submitted:
1. The student message is saved to `chat_messages` in SQLite.
2. The agent executes targeted action logic via Gemini API (if key is configured) or uses the rich deterministic fallback dictionary.
3. The assistant response is saved to `chat_messages`.
4. The client appends the turn and displays it in the Socratic chat timeline.

---

## 7. Wispr Flow Speech Parsing Architecture

LearnLoop AI provides an authentic desktop dictation workflow using **Wispr Flow**:

```mermaid
flowchart TD
    A["Spoken Natural Dictation"] --> B["Wispr Flow Desktop App (Direct System Input)"]
    B --> C["Raw Dictated Text with Disfluencies"]
    C --> D["speech_parser.py (Regex Cleaning Pipeline)"]
    D --> E["1. Digression Isolation ('my exam is on Friday anyway')"]
    D --> F["2. Self-Correction Resolution ('FIFO... wait no, I mean LIFO' -> 'LIFO')"]
    D --> G["3. Disfluency Removal ('um', 'uh', 'like', 'you know')"]
    E & F & G --> H["Clean Conceptual Query"]
    H --> I["Agent Pedagogical Processing"]
```

---

## 8. Database Schema (SQLite)

The persistence layer resides in `backend/data/learnloop.db` managed by `StorageManager` in `backend/app/storage/db.py`:

```mermaid
erDiagram
    learners ||--o{ concept_mastery : tracks
    learners ||--o{ attempts : logs
    learners ||--o{ revision_tasks : schedules
    learners ||--o{ chat_messages : records

    learners {
        text student_id PK
        text name
        text target_exam
        real overall_mastery
        integer diagnostic_completed
        text created_at
        text updated_at
    }

    concept_mastery {
        text student_id PK,FK
        text concept_id PK
        text concept_name
        text category
        real mastery_percentage
        integer questions_attempted
        integer correct_answers
        integer incorrect_answers
        text current_difficulty
        text last_misconception
        text last_misconception_name
        text last_practiced_at
        text next_revision_at
        integer consecutive_correct
    }

    attempts {
        integer id PK
        text student_id FK
        text question_id
        text concept_id
        text selected_option
        integer is_correct
        text student_reasoning
        text detected_misconception
        real score_delta
        text timestamp
    }

    revision_tasks {
        text id PK
        text student_id FK
        text concept_id
        text concept_name
        text due_date
        text status
        text reason
        text urgency
    }

    chat_messages {
        text id PK
        text session_id
        text student_id FK
        text role
        text content
        text metadata_json
        text timestamp
    }

    teacher_demo_cohort {
        text student_id PK
        text name
        real overall_mastery
        text weakest_concept
        text primary_misconception
        integer days_inactive
        integer needs_intervention
        text data_json
    }
```

---

## 9. Fallback & Offline Resilience

LearnLoop AI provides **zero-credential functionality**:
- **Offline Mode**: If `GEMINI_API_KEY` is absent or network access fails, the platform automatically engages its `Deterministic Local Pedagogical Engine`.
- **Misconception Catalog**: Includes curated remediation advice for 15+ common DSA traps.
- **Socratic Content**: Complete deterministic fallback sets for all 12 concepts across all 5 quick-action types.
- **Self-Healing State**: If a student ID is accessed for the first time, `StorageManager.ensure_learner()` dynamically initializes the learner record and all 12 concept rows.
