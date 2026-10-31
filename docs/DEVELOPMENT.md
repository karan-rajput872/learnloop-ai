# LearnLoop AI — Development & Operations Guide

This guide details the technical workflow for configuring, developing, testing, and debugging LearnLoop AI locally.

---

## 1. Environment Requirements

- **Operating System:** Windows, macOS, or Linux
- **Runtime Engines:**
  - **Node.js:** v18.0.0 or later (v20+ recommended)
  - **Python:** 3.11 or later
- **Recommended Tools:**
  - `uv` (Fastest Python toolchain) or standard `python -m venv`
  - `npm` or `pnpm`
  - Visual Studio Code or Google Antigravity

---

## 2. Project Directory Structure

```
learnloop-ai/
├── backend/
│   ├── app/
│   │   ├── agent/               # Agent orchestration & speech parser
│   │   │   ├── gemini_service.py
│   │   │   ├── speech_parser.py
│   │   │   └── tutor_agent.py
│   │   ├── dsa/                 # Syllabus, concept DAG & misconception rules
│   │   │   ├── misconceptions.py
│   │   │   ├── question_bank.py
│   │   │   └── syllabus.py
│   │   ├── models/              # Pydantic validation schemas
│   │   │   └── schemas.py
│   │   ├── routes/              # FastAPI REST endpoints
│   │   │   ├── concepts.py
│   │   │   ├── diagnostic.py
│   │   │   ├── learner.py
│   │   │   ├── quiz.py
│   │   │   ├── teacher.py
│   │   │   └── tutor.py
│   │   ├── storage/             # SQLite persistence & cohort seeding
│   │   │   └── db.py
│   │   ├── tools/               # 7 Bounded agent tools
│   │   │   ├── mastery_inspector.py
│   │   │   ├── misconception_evaluator.py
│   │   │   ├── model_updater.py
│   │   │   ├── profile_retriever.py
│   │   │   ├── question_generator.py
│   │   │   ├── repetition_scheduler.py
│   │   │   └── update_verifier.py
│   │   └── main.py              # Application entry point
│   ├── data/                    # SQLite database storage (git-ignored)
│   │   └── learnloop.db
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Backend environment template
│   ├── test_audit.py            # Comprehensive 29-check automated QA audit
│   └── test_persistence_restart.py
├── frontend/
│   ├── src/
│   │   ├── assets/              # Static SVG and imagery
│   │   ├── components/          # Reusable UI widgets
│   │   │   ├── AgentTimeline.tsx
│   │   │   ├── ConceptGraphView.tsx
│   │   │   ├── MasteryGauge.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── WisprFlowDictaphone.tsx
│   │   ├── pages/               # Main application views
│   │   │   ├── AdaptiveQuizPage.tsx
│   │   │   ├── ConceptGraphPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DiagnosticPage.tsx
│   │   │   ├── SpacedRevisionPage.tsx
│   │   │   ├── TeacherDashboardPage.tsx
│   │   │   └── TutorChatPage.tsx
│   │   ├── services/            # API client layer
│   │   │   └── api.ts
│   │   ├── types/               # TypeScript interfaces
│   │   │   └── index.ts
│   │   ├── App.tsx              # Routing and navigation shell
│   │   ├── index.css            # Tailwind directives and custom animations
│   │   └── main.tsx             # React DOM entry point
│   ├── public/                  # Public assets
│   ├── .env.example             # Frontend environment template
│   ├── package.json             # NPM dependencies & scripts
│   ├── tailwind.config.js       # Tailwind theme extensions
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite build config
├── docs/                        # Architecture & technical documentation
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
├── .gitignore                   # Comprehensive repository exclusions
└── README.md                    # Public GitHub documentation
```

---

## 3. Step-by-Step Local Setup

### 3.1 Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd learnloop-ai/backend
   ```
2. Create and activate a virtual environment:
   - **Using uv (Recommended):**
     ```bash
     uv venv
     .venv\Scripts\activate   # Windows
     # source .venv/bin/activate  # macOS/Linux
     ```
   - **Using standard python:**
     ```bash
     python -m venv .venv
     .venv\Scripts\activate   # Windows
     # source .venv/bin/activate  # macOS/Linux
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env     # Windows: copy .env.example .env
   ```
   *(Note: `GEMINI_API_KEY` is optional. If left blank, the platform defaults to its local deterministic pedagogical engine).*
5. Start the backend server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Verify at: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 3.2 Frontend Setup
1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd learnloop-ai/frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (optional):
   ```bash
   cp .env.example .env     # Windows: copy .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application is available at [http://localhost:3000](http://localhost:3000).

---

## 4. Running Tests & Quality Verification

### 4.1 Backend 29-Check QA Audit
Run the automated test suite against the running backend server:
```bash
cd learnloop-ai/backend
python test_audit.py
```
This tests:
- Diagnostic questions & baseline scoring (1.1, 1.2)
- Adaptive question generation & prerequisite logic (2.1, 2.2, 2.3)
- Misconception detection for Stack, BST, and Recursion (3.1, 3.2, 3.3, 3.4)
- SQLite schema, atomic persistence & REST queries (4.1, 4.2, 4.3)
- Spaced repetition calculation & revision tasks (5.1, 5.2)
- Teacher dashboard KPIs, distributions & notice disclosure (6.1, 6.2, 6.3)
- All 7 specialized agent tools and telemetry tracking (7.1, 7.2, 7.3)
- Wispr Flow speech disfluency cleaning, self-corrections, digressions (8.1, 8.2, 8.3)
- Socratic response generation, all 5 quick actions, and chat persistence (8.4, 8.5, 8.6)
- Input validation, 404 handling, and fallback resilience (9.1, 9.2, 9.3)

### 4.2 State Persistence Verification
To verify state persistence across backend process restarts:
```bash
cd learnloop-ai/backend
python test_persistence_restart.py pre
# [Restart uvicorn server]
python test_persistence_restart.py post
```

### 4.3 Frontend Type Check & Production Build
```bash
cd learnloop-ai/frontend
npx tsc -b
npm run build
```

---

## 5. Troubleshooting & Common Issues

| Symptom | Cause | Resolution |
|---|---|---|
| `Port 8000 already in use` | Previous uvicorn server still running in the background. | Identify and kill the process using port 8000: `netstat -ano \| findstr :8000` followed by `taskkill /PID <PID> /F`. |
| `UnicodeEncodeError: 'charmap' codec can't encode...` | Running Python test scripts on Windows CMD/PowerShell with default `cp1252` encoding when outputting Unicode emojis. | Output has been sanitized to ASCII tags `[PASS]` and `[FAIL]`. Set `$env:PYTHONIOENCODING="utf-8"` in PowerShell if needed. |
| `No inputs were found in config file 'tsconfig.app.json'` | Running `tsc -b` while stale `.tsbuildinfo` files exist in cache. | Run `npx tsc -b --clean` before rebuilding. |
| `404 Not Found on /api/learner/profile` | Requesting an unseeded student ID. | `StorageManager.ensure_learner()` auto-provisions learner records. If this happens, verify that the backend is at version 1.0.0. |
| `Wispr Flow not dictating into browser` | Wispr Flow desktop app is not running or mic permission not granted. | Ensure the Wispr Flow desktop app is active. In browser mode, use the Web Speech microphone button or one of the 4 authentic preset test transcripts. |

---

## 6. Current Technical Limitations

1. **Syllabus Boundary**: Curated specifically for introductory Data Structures and Algorithms (12 foundational concepts). Custom syllabus ingestion is planned for v2.0.
2. **Wispr Flow Integration Scope**: Dictation occurs via the system-level Wispr Flow desktop application into any text input. The web app contains an NLP disfluency and digression cleaning parser, alongside standard Web Speech API fallback.
3. **Teacher Demonstration Cohort**: The teacher analytics view uses a seeded cohort of 6 synthetic students to demonstrate class-wide aggregations and intervention alerts without compromising student privacy.
