import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import diagnostic, concepts, learner, quiz, tutor, teacher
from app.dsa.syllabus import DSA_CONCEPTS
from app.agent.gemini_service import gemini_tutor

load_dotenv()

app = FastAPI(
    title="LearnLoop AI — Adaptive Exam-Prep Tutor Backend",
    description="Multi-tool agentic learning platform with persistent learner modeling and misconception detection.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(diagnostic.router)
app.include_router(concepts.router)
app.include_router(learner.router)
app.include_router(quiz.router)
app.include_router(tutor.router)
app.include_router(teacher.router)

@app.get("/")
def root():
    return {
        "service": "LearnLoop AI",
        "tagline": "Don't just learn the answers. Master the concepts.",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    has_gemini = gemini_tutor.is_ai_configured()
    return {
        "status": "healthy",
        "service": "LearnLoop AI Adaptive Tutor",
        "version": "1.0.0",
        "engine": {
            "provider": "Gemini AI API" if has_gemini else "Deterministic Local Orchestrator",
            "is_ai_configured": has_gemini,
            "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash") if has_gemini else "rule-based-pedagogical-engine",
            "fallback_available": True
        },
        "syllabus": {
            "name": "Introductory Data Structures & Algorithms",
            "concepts_count": len(DSA_CONCEPTS),
            "concepts": list(DSA_CONCEPTS.keys())
        },
        "features": {
            "diagnostic_test": "active",
            "interactive_concept_graph": "active",
            "persistent_learner_model": "active",
            "adaptive_question_generator": "active",
            "misconception_detection": "active",
            "spaced_repetition": "active",
            "teacher_dashboard": "active",
            "wispr_flow_speech_parser": "active"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
