import asyncio
import os
import subprocess
import edge_tts

OUTPUT_DIR = os.path.abspath("demo_assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

FFMPEG_PATH = os.path.abspath("frontend/node_modules/ffmpeg-static/ffmpeg.exe")

VOICE = "en-US-ChristopherNeural"  # Professional, articulate, authoritative tech tutor voice

SCENES = [
    {
        "id": "scene_01_intro",
        "title": "Introduction",
        "text": (
            "Hello everyone, and welcome to LearnLoop AI — an adaptive exam-preparation tutor built for the "
            "Product Space and Wispr Flow Agentic AI Hackathon. Our mission is captured in our tagline: "
            "Don't just learn the answers. Master the concepts. "
            "Traditional exam platforms present identical question banks to every learner, encouraging rote memorization. "
            "LearnLoop changes this by introducing an agentic continuous learner modeling engine that tracks individual "
            "prerequisite dependencies, diagnoses subtle conceptual misunderstandings, and personalizes the entire exam preparation journey."
        )
    },
    {
        "id": "scene_02_auth",
        "title": "Authentication & Persistent Sessions",
        "text": (
            "Every learner receives a private, cryptographically secure account. "
            "LearnLoop supports both modern email registration and Google Sign-In with Argon2id password hashing, "
            "access token rotation, and HttpOnly SameSite cookies. "
            "This ensures strict multi-user data isolation: every student's learning history, concept mastery, "
            "and revision schedule persist permanently across devices and browser sessions."
        )
    },
    {
        "id": "scene_03_onboarding",
        "title": "Personalized Learner Onboarding",
        "text": (
            "Personalization starts on day one with our multi-step Learner Profile Builder. "
            "Whether you are a university student preparing for semester exams, a working professional refreshing fundamentals, "
            "or a job seeker targeting software engineering interviews, LearnLoop understands your context. "
            "The learner selects their category, programming experience, languages known, learning goals, target timeline, "
            "and daily practice availability. "
            "We also capture their preferred pedagogical styles, such as visual diagrams, code demonstrations, or Socratic questioning. "
            "This sets an initial baseline without introducing bias."
        )
    },
    {
        "id": "scene_04_diagnostic",
        "title": "Diagnostic Assessment & Verified Proficiency",
        "text": (
            "Next, LearnLoop conducts an initial Diagnostic Assessment to evaluate real knowledge. "
            "Learners can choose between a quick six-question diagnostic or a comprehensive twelve-concept evaluation. "
            "As the learner solves problems, they can record their reasoning. "
            "Upon completion, our engine calculates their Verified Proficiency Level — from Level 1 Beginner to Level 5 Proficient. "
            "Unlike simple scores, verified proficiency weighs question difficulty, detects prerequisite gaps, "
            "and penalizes misconception patterns, establishing a trustworthy pedagogical foundation."
        )
    },
    {
        "id": "scene_05_adaptive_quiz",
        "title": "Adaptive Practice & Bounded Agent Tools",
        "text": (
            "With the learner model established, LearnLoop powers its Adaptive Practice using seven specialized, bounded agent tools. "
            "First, the Learner Profile Retriever and Concept Mastery Inspector examine the syllabus graph to target the student's weakest prerequisite. "
            "The Adaptive Question Generator calibrates difficulty in real time. "
            "When the student submits their answer, the Reasoning Misconception Evaluator diagnoses whether errors stem from common flaws — "
            "such as confusing stack LIFO with queue FIFO, or violating global binary search tree range constraints. "
            "The Learner Model Updater and Update Verifier ensure genuine, verifiable state mutations with zero fabricated progress."
        )
    },
    {
        "id": "scene_06_ai_tutor",
        "title": "Socratic AI Tutor",
        "text": (
            "When learners encounter difficult topics, they can turn to our Socratic AI Tutor. "
            "Powered by Gemini 2.5 Flash with Wispr Flow speech dictation disfluency cleaning, the tutor personalizes its responses "
            "to the learner's preferred language and background. "
            "Crucially, the tutor employs the Socratic method: instead of giving away answers, it offers intuitive physical analogies — "
            "like stacks as pancake plates or linked lists as train cars — alongside worked examples and targeted challenges "
            "that guide the student to discover the solution independently."
        )
    },
    {
        "id": "scene_07_graph_revision",
        "title": "Concept Graph & Spaced Revision",
        "text": (
            "LearnLoop structures introductory computer science into an interactive Prerequisite Concept Graph. "
            "The graph visually maps dependencies — showing how mastering arrays and memory contiguity is essential for linked lists, "
            "and how recursion unlocks binary trees and graph traversals. "
            "To combat the forgetting curve, our Spaced Repetition Scheduler implements the SuperMemo SM-2 algorithm, "
            "calibrated to the learner's daily availability. High-priority reviews are automatically scheduled after detected misconceptions."
        )
    },
    {
        "id": "scene_08_closing",
        "title": "Progress & Conclusion",
        "text": (
            "Back on the Dashboard, learners see their overall mastery grow alongside their verified proficiency level, "
            "personalized focus strategy, and daily practice targets. "
            "LearnLoop AI transforms exam preparation from passive rote learning into an adaptive, concept-first mastery loop. "
            "Thank you for watching our demonstration. Visit us live at learnloop-ai-one.vercel.app, and master the concepts today."
        )
    }
]

async def generate_voice_tracks():
    print("Generating speech audio tracks using Microsoft Neural Edge-TTS...")
    audio_files = []
    
    for i, scene in enumerate(SCENES):
        filename = f"{scene['id']}.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        print(f"  [{i+1}/{len(SCENES)}] Generating voice for '{scene['title']}' ({VOICE})...")
        communicate = edge_tts.Communicate(scene["text"], VOICE, rate="-2%")
        await communicate.save(filepath)
        audio_files.append(filepath)
        
    print("All scene voice tracks generated successfully!")
    return audio_files

if __name__ == "__main__":
    asyncio.run(generate_voice_tracks())

