# LearnLoop AI — Adaptive Exam-Prep Tutor

> **"Don't just learn the answers. Master the concepts."**

[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)

**Hackathon Challenge:** Challenge 02 — Adaptive Exam-Prep Tutor<br/>
**Event:** Product Space × Wispr Flow Agentic AI Hackathon '26<br/>
**License:** MIT

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Target Users](#4-target-users)
5. [Core Features](#5-core-features)
6. [How Adaptive Learning Works](#6-how-adaptive-learning-works)
7. [How the Agentic Workflow Works](#7-how-the-agentic-workflow-works)
8. [System Architecture Overview](#8-system-architecture-overview)
9. [Technology Stack](#9-technology-stack)
10. [Wispr Flow Usage & Limitations](#10-wispr-flow-usage--limitations)
11. [AI Integration & Offline Fallback](#11-ai-integration--offline-fallback)
12. [Database & Persistence Model](#12-database--persistence-model)
13. [Installation Requirements](#13-installation-requirements)
14. [Local Setup Instructions](#14-local-setup-instructions)
15. [Backend Startup](#15-backend-startup)
16. [Frontend Startup](#16-frontend-startup)
17. [Environment Variable Configuration](#17-environment-variable-configuration)
18. [API Overview](#18-api-overview)
19. [Testing Instructions](#19-testing-instructions)
20. [Screenshots & UI Walkthrough](#20-screenshots--ui-walkthrough)
21. [Known Limitations](#21-known-limitations)
22. [Future Improvements](#22-future-improvements)
23. [Hackathon & Challenge Alignment](#23-hackathon--challenge-alignment)
24. [Responsible AI & Data-Handling Notes](#24-responsible-ai--data-handling-notes)

---

## 1. Product Overview

**LearnLoop AI** is an agentic, concept-first exam preparation tutor built for technical mastery in introductory Data Structures and Algorithms (DSA).

Standard exam preparation platforms grade students purely on whether a chosen multiple-choice option is right or wrong, while generic chatbots provide direct answers without diagnosing why a student is struggling. LearnLoop AI maintains a **persistent Bayesian learner model** across an interactive topological concept graph. It prompts students to articulate their thought process, diagnoses specific cognitive misconceptions (such as confusing LIFO with FIFO, or failing to check global ancestor bounds in Binary Search Trees), and schedules targeted spaced-repetition practice.

---

## 2. Problem Statement

Students preparing for high-stakes technical assessments and university coursework encounter three systematic bottlenecks:

1. **Illusion of Competence**: Students memorize answer patterns and leetcode templates without understanding underlying data structures, invariants, and pointer mechanics.
2. **Invisible Misconceptions**: Traditional automated assessment tools grade final answers as binary outcomes ($1$ or $0$). If a student errs on a stack question, static systems cannot determine whether the student inverted LIFO/FIFO or miscalculated pointer arithmetic.
3. **Absence of Memory-Retention Modeling**: Standard learning platforms present questions randomly or linearly, ignoring Ebbinghaus forgetting curves and failing to schedule timely reviews before memory decay occurs.

---

## 3. Proposed Solution

LearnLoop AI introduces a closed-loop agent architecture:
- **Topological Mastery Graph**: A 12-concept directed acyclic graph (DAG) representing syllabus prerequisites (e.g., Arrays $\rightarrow$ Stacks/Queues; Recursion $\rightarrow$ Trees $\rightarrow$ Graphs).
- **Reasoning-Driven Diagnosis**: Evaluates natural language reasoning to pinpoint misconceptions from a curated taxonomy of 15+ common DSA errors.
- **Socratic Guidance**: Offers structured scaffolding through 5 quick actions (`hint`, `analogy`, `worked_example`, `socratic_challenge`, `explain_simple`) rather than feeding students direct answers.
- **Dynamic Spaced Repetition**: Applies an adaptive SuperMemo-2 (SM-2) algorithm that schedules retention tasks based on answer correctness, confidence level, and misconception severity.
- **Wispr Flow Dictation Workflow**: Integrates natural voice dictation, tolerating spoken disfluencies, self-corrections, and digressions.

---

## 4. Target Users

- **Computer Science & Engineering Students**: Preparing for midterm/final university exams and foundational technical assessments.
- **Bootcamp & Self-Taught Learners**: Transitioning into technical roles who need deep conceptual grounding rather than rote memorization.
- **Instructors & Teaching Assistants**: Looking to identify class-wide conceptual bottlenecks and monitor student interventions using aggregate cohort analytics.

---

## 5. Core Features

| Feature | Description | Status |
|---|---|---|
| **12-Question Diagnostic Test** | Assesses baseline conceptual mastery across all 12 syllabus topics upon onboarding. | **Implemented** |
| **Interactive Concept Graph** | Topological SVG canvas with Zoom In/Out, Reset, Fit, mouse-drag panning, and mobile List View. | **Implemented** |
| **Persistent Learner Model** | Concept-wise mastery tracking, difficulty calibration (`novice`, `intermediate`, `advanced`), and streak counters. | **Implemented** |
| **Adaptive Question Generator** | Targets student weak concepts and adapts question difficulty based on historical performance. | **Implemented** |
| **Misconception Detection** | Detects LIFO/FIFO inversion, BST ancestor constraint violations, recursion base-case omission, etc. | **Implemented** |
| **Agent Decision Rationale Card** | Surfaces the agent's internal reasoning, Bayesian mastery adjustments, and spaced repetition triggers. | **Implemented** |
| **Socratic Quick Actions** | 5 interactive pedagogical buttons (`hint`, `analogy`, `worked_example`, `socratic_challenge`, `explain_simple`). | **Implemented** |
| **Persistent SQLite Chat History** | Stores user inquiries and tutor turns in SQLite; rehydrates conversation across page refreshes. | **Implemented** |
| **Spaced Repetition Scheduler** | Modified SM-2 algorithm generating review tasks with urgency levels (`urgent`, `medium`, `low`). | **Implemented** |
| **Teacher Analytics Dashboard** | Class-wide mastery KPIs, misconception distributions, and intervention recommendations on sample cohort. | **Implemented** |
| **Wispr Flow Voice Dictation** | Natural speech dictation parser removing speech fillers (`um`, `like`), self-corrections, and digressions. | **Implemented** |

---

## 6. How Adaptive Learning Works

LearnLoop AI's adaptive engine balances prerequisite satisfaction and mastery deficits:

1. **Diagnostic Baseline**: Initial 12-question diagnostic test sets initial baseline masteries (65% for correct answers, 25% for incorrect answers).
2. **Prerequisite Filtering**: The agent traverses the concept DAG. A student cannot be assigned advanced graph traversal questions until foundational concepts (Arrays, Recursion, Trees) achieve acceptable mastery.
3. **Calibrated Difficulty Tiers**:
   - `novice`: Focuses on fundamental definitions, memory representation, and basic operations.
   - `intermediate`: Focuses on algorithmic implementations, boundary conditions, and complexity analysis.
   - `advanced`: Focuses on compound data structure trade-offs, amortized bounds, and edge cases.
4. **Bayesian Mastery Update**: Each submitted answer updates concept mastery based on correctness, confidence level, and whether a diagnosed misconception was triggered.

---

## 7. How the Agentic Workflow Works

The backend implements a **bounded multi-tool agent loop** with 7 specialized tools:

```
[Answer Submission]
        │
        ▼
Tool 1: LearnerProfileRetriever ────► Fetches student state and concept history
        │
        ▼
Tool 4: ReasoningMisconceptionEvaluator ──► Matches student reasoning against DSA taxonomy
        │
        ▼
Tool 5: LearnerModelUpdater ─────────► Computes Bayesian score delta & difficulty tier
        │
        ▼
Tool 6: SpacedRepetitionScheduler ───► Calculates modified SM-2 review interval
        │
        ▼
Tool 7: ModelUpdateVerifier ────────► Read-after-write verification against SQLite
        │
        ▼
Tool 2: ConceptMasteryInspector ────► Evaluates graph bottlenecks & recommends next focus
        │
        ▼
[Decision Rationale Synthesis] ─────► Explains why mastery shifted and what to study next
```

For adaptive question generation:
- `Tool 1: LearnerProfileRetriever` $\rightarrow$ `Tool 2: ConceptMasteryInspector` $\rightarrow$ `Tool 3: AdaptiveQuestionGenerator`.

Every tool call logs exact execution time, input summaries, and output summaries. Zero progress is fabricated.

---

## 8. System Architecture Overview

```
learnloop-ai/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── agent/            # Agent orchestrator & speech parser
│   │   ├── dsa/              # Syllabus, question bank & misconception catalog
│   │   ├── models/           # Pydantic validation schemas
│   │   ├── routes/           # REST API route handlers
│   │   ├── storage/          # SQLite persistence layer
│   │   └── tools/            # 7 Bounded agent tools
│   ├── data/                 # SQLite database storage (git-ignored)
│   ├── requirements.txt      # Python dependencies
│   └── test_audit.py         # 29-check automated QA test suite
└── frontend/                 # React 19 Client
    ├── src/
    │   ├── components/       # Graph, Timeline, Dictaphone, Navigation
    │   ├── pages/            # 7 Main application pages
    │   ├── services/         # API HTTP client
    │   └── types/            # TypeScript interfaces
    ├── package.json
    └── vite.config.ts
```

For comprehensive architectural specifications, refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 9. Technology Stack

- **Frontend:**
  - React 19 & TypeScript
  - Vite v8 (Build toolchain)
  - Tailwind CSS (Dark navy/indigo design system)
  - Recharts (Mastery distributions & cohort analytics)
  - Lucide React (Clean icon set)
- **Backend:**
  - Python 3.11+
  - FastAPI (Async REST API framework)
  - Uvicorn (ASGI server)
  - Pydantic v2 (Input schema validation)
  - SQLite3 (Relational persistence)
  - HTTPX (Async HTTP client)
- **AI & Speech Ingestion:**
  - Google Gemini API (`gemini-2.5-flash`) via official SDK patterns
  - Deterministic Local Pedagogical Fallback Engine (Zero-credential execution)
  - Wispr Flow Speech Parser (NLP disfluency cleaning engine)

---

## 10. Wispr Flow Usage & Limitations

- **How Wispr Flow is Used:**
  Wispr Flow is a system-level desktop dictation application. When running on the student's machine, the student can dictate reasoning naturally into any input field. LearnLoop AI's backend (`speech_parser.py`) processes this raw dictation to:
  - Clean conversational speech fillers (`"um"`, `"uh"`, `"like"`, `"you know"`).
  - Resolve spoken self-corrections (e.g., *"FIFO... wait no, sorry, I mean LIFO"* $\rightarrow$ resolves to *"LIFO"*).
  - Isolate off-topic digressions (e.g., *"by the way my exam is on Friday anyway"*).
- **In-Browser Fallbacks:**
  - For browser-only evaluation where the Wispr Flow desktop app is not running, the application provides an in-browser Web Speech API microphone toggle (`webkitSpeechRecognition`).
  - Includes 4 authentic preset speech dictations with natural disfluencies for instant evaluation.
- **Clarification:** LearnLoop AI does not falsely claim to host a custom acoustic neural speech recognition model; it utilizes Wispr Flow for dictation paired with custom NLP disfluency cleaning.

---

## 11. AI Integration & Offline Fallback

LearnLoop AI provides **zero-credential functionality**:

- **With Gemini API Key (`GEMINI_API_KEY` configured):**
  - Generates real-time conversational Socratic dialogue.
  - Dynamically contextualizes advice to the student's current mastery percentage.
- **Without Gemini API Key (Default Offline Mode):**
  - Automatically engages the `Deterministic Local Pedagogical Engine`.
  - Serves curated pedagogical content across all 12 syllabus concepts for all 5 quick-action types.
  - Detects misconceptions using heuristic pattern matching against student reasoning text.
  - **100% of the platform's core features function without an external API key or network connection.**

---

## 12. Database & Persistence Model

The application uses SQLite (`backend/data/learnloop.db`), automatically created and managed by `StorageManager`:

- `learners`: Student profile, target exam, overall mastery score, and diagnostic completion flag.
- `concept_mastery`: 12 rows per learner tracking mastery percentage, questions attempted, correct/incorrect counts, difficulty level, and next revision dates.
- `attempts`: Historical log of all quiz submissions, student reasoning, detected misconceptions, and score deltas.
- `revision_tasks`: Scheduled spaced-repetition tasks with due dates, urgency brackets, and status.
- `teacher_demo_cohort`: 6 synthetic demonstration students used for teacher dashboard analytics.
- `chat_messages`: Persistent conversation turns saved with role (`user`/`assistant`), action types, and timestamps.

---

## 13. Installation Requirements

- **Node.js:** v18.0.0 or later (v20+ recommended)
- **Python:** 3.11 or later
- **Package Managers:** `npm` (bundled with Node) and `pip` (or `uv`)

---

## 14. Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/learnloop-ai.git
   cd learnloop-ai
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate

   pip install -r requirements.txt
   copy .env.example .env     # macOS/Linux: cp .env.example .env
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   copy .env.example .env     # macOS/Linux: cp .env.example .env
   ```

---

## 15. Backend Startup

From the `backend` directory with virtual environment activated:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base: `http://localhost:8000/api`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

---

## 16. Frontend Startup

From the `frontend` directory:
```bash
npm run dev
```
- Access the web application at: `http://localhost:3000`

---

## 17. Environment Variable Configuration

### Backend (`backend/.env`)
```bash
PORT=8000

# Optional: Google Gemini API Key
# If left empty, LearnLoop AI engages its deterministic local orchestrator
GEMINI_API_KEY=

# Gemini Model Identifier (Default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash
```

### Frontend (`frontend/.env`)
```bash
# Optional: defaults to http://localhost:8000/api
VITE_API_BASE=http://localhost:8000/api
```

---

## 18. API Overview

| Route | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check, engine status, and syllabus concepts |
| `/api/diagnostic/questions` | `GET` | 12 diagnostic onboarding questions |
| `/api/diagnostic/submit` | `POST` | Evaluates diagnostic test and initializes baseline mastery |
| `/api/concepts` | `GET` | All 12 concept nodes, prerequisite edges, and student mastery |
| `/api/concepts/{id}` | `GET` | Concept details, prerequisites, and mastery history |
| `/api/learner/profile` | `GET` | Active learner profile and concept mastery records |
| `/api/learner/history` | `GET` | Complete chronological quiz attempt history |
| `/api/learner/misconceptions` | `GET` | Historical diagnosed misconceptions |
| `/api/learner/reset` | `POST` | Resets learner model to unassessed state |
| `/api/quiz/adaptive` | `GET` | Calibrated adaptive question targeting weakest concept |
| `/api/quiz/submit` | `POST` | Evaluates student answer and reasoning; executes 6-tool pipeline |
| `/api/tutor/chat` | `POST` | Dialogue with speech disfluency cleaning and Socratic response |
| `/api/tutor/action` | `POST` | Quick action (`hint`, `analogy`, `worked_example`, `socratic_challenge`, `explain_simple`) |
| `/api/tutor/messages` | `GET` | Chronological persistent chat message history |
| `/api/tutor/revision/tasks` | `GET` | Scheduled spaced-repetition revision tasks |
| `/api/tutor/revision/complete` | `POST` | Marks a spaced-repetition task as completed |
| `/api/teacher/dashboard` | `GET` | Aggregated class-wide mastery and intervention alerts |

---

## 19. Testing Instructions

### Run Automated QA Audit (29 Checks)
Ensure the backend server is running on port 8000, then run:
```bash
cd backend
python test_audit.py
```
**Expected Output:**
```
TOTAL PASSED CHECKS: 29
TOTAL FAILED CHECKS: 0
```

### Run Persistence Across Restart Verification
```bash
cd backend
python test_persistence_restart.py pre
# [Restart uvicorn process]
python test_persistence_restart.py post
```

### Run Frontend Type Check & Production Build
```bash
cd frontend
npm run build
```

---

## 20. Screenshots & UI Walkthrough

*(Screenshots captured from local running instance)*

### 1. Concept Mastery Graph
Interactive SVG visualization with zoom controls, pan navigation, and live prerequisite edge status.
```
[ Screenshot Placeholder: Concept Graph View with Zoom Controls and Prerequisite Edges ]
```

### 2. Adaptive Quiz & Agent Decision Rationale
Question card with generation rationale banner, reasoning input with Wispr Flow speech dictation, and post-evaluation Agent Decision Rationale card.
```
[ Screenshot Placeholder: Adaptive Quiz Evaluation with Agent Decision Rationale Card ]
```

### 3. Socratic Tutor with Quick Actions & Persistent Chat
Socratic conversation timeline featuring concept dropdown selector, quick-action buttons, and Wispr Flow disfluency cleaning chips.
```
[ Screenshot Placeholder: Tutor Chat with 5 Socratic Quick Action Buttons and Persistent Chat ]
```

### 4. Teacher Analytics Dashboard
Class-wide average mastery gauge, concept weakness distribution, misconception frequency chart, and synthetic student intervention alert table.
```
[ Screenshot Placeholder: Teacher Dashboard with Cohort Analytics & Demonstration Notice ]
```

---

## 21. Known Limitations

1. **Syllabus Scope**: The current release focuses on an introductory Data Structures & Algorithms curriculum (12 concepts). Dynamic syllabus authoring is planned for future versions.
2. **Wispr Flow Integration**: Relies on the Wispr Flow desktop application for system-level speech dictation. In purely web-based environments without the desktop client, the app falls back to browser Web Speech API or built-in authentic speech presets.
3. **Single-Tenant Database**: The current SQLite database implementation is optimized for local development and single-learner demonstrations.

---

## 22. Future Improvements

- [ ] Dynamic custom curriculum ingestion via Markdown / PDF syllabus upload.
- [ ] Multi-tenant PostgreSQL persistence with JWT authentication for institutional deployments.
- [ ] Interactive algorithmic animation sandbox (visualizing stack pushes, tree rotations, graph traversals inline).
- [ ] Direct Wispr Flow SDK integration when official web streaming APIs become publicly available.
- [ ] Peer-to-peer collaborative Socratic study rooms.

---

## 23. Hackathon & Challenge Alignment

- **Event:** Product Space × Wispr Flow Agentic AI Hackathon '26
- **Challenge:** Challenge 02 — Adaptive Exam-Prep Tutor
- **Alignment Highlights:**
  - Addresses the core challenge prompt: *"Don't just learn the answers. Master the concepts."*
  - Complete persistent learner model with concept-wise mastery updates after every answer.
  - Multi-tool agent pipeline (7 bounded tools) tracking real telemetry without mock delays.
  - Granular misconception diagnosis for LIFO/FIFO confusion, BST ancestor boundaries, and recursion base cases.
  - Authentic Wispr Flow dictation workflow with speech disfluency, self-correction, and digression handling.

---

## 24. Responsible AI & Data-Handling Notes

- **Zero Data Harvesting**: LearnLoop AI does not sell, train on, or export student practice data. All progress is stored locally in the learner's SQLite database.
- **Demonstration Cohort Disclosure**: The Teacher Dashboard displays a synthetic cohort of 6 demonstration students (`Alex Chen`, `Maya Patel`, `Jordan Lee`, etc.) to demonstrate class analytics without using real student data.
- **Socratic Guardrails**: The agent's prompt instructions explicitly prevent the tutor from providing direct answers to active assessment questions, prioritizing scaffolding and student self-discovery.
