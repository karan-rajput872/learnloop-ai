import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import diagnostic, concepts, learner, quiz, tutor, teacher, auth, gamification, owner
from app.dsa.syllabus import DSA_CONCEPTS
from app.agent.gemini_service import gemini_tutor

load_dotenv()

app = FastAPI(
    title="LearnLoop AI — Adaptive Exam-Prep Tutor Backend",
    description="Multi-tool agentic learning platform with persistent learner modeling and misconception detection.",
    version="1.0.0"
)

# Parse CORS allowed origins from environment variable or default to local development + Vercel production
baseline_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://learnloop-ai-one.vercel.app",
    "https://learnloop-9h5dt8gay-priyanshukaran25-5139.vercel.app",
    "https://learnloop-ai.vercel.app"
]

cors_origins_raw = os.getenv("CORS_ORIGINS", "")
if cors_origins_raw.strip():
    custom_origins = [
        origin.strip().strip('"').strip("'").rstrip("/")
        for origin in cors_origins_raw.split(",")
        if origin.strip().strip('"').strip("'").rstrip("/")
    ]
    # Ensure baseline production and development origins are preserved
    allowed_origins = list(dict.fromkeys(baseline_origins + custom_origins))
else:
    allowed_origins = baseline_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://[a-zA-Z0-9\-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(auth.router)
app.include_router(diagnostic.router)
app.include_router(concepts.router)
app.include_router(learner.router)
app.include_router(quiz.router)
app.include_router(tutor.router)
app.include_router(teacher.router)
app.include_router(gamification.router)
app.include_router(owner.router)

@app.on_event("shutdown")
def shutdown_event():
    """Cleanly close database pools and network resources on shutdown."""
    from app.storage.db import storage
    storage.close()

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
