import os
import sys
import asyncio
import subprocess
import json
import edge_tts

VOICE = "en-US-ChristopherNeural"
RATE = "-8%"
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../demo_assets/final"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCENES = [
    {
        "id": "scene_01",
        "title": "Product Introduction & Problem Space",
        "text": "Welcome to LearnLoop AI, an adaptive exam-preparation tutor designed for the Product Space and Wispr Flow Agentic AI Hackathon. Traditional DSA exam preparation forces students into rote memorization—grinding hundreds of disjointed LeetCode problems without understanding the underlying invariants. LearnLoop AI transforms preparation into genuine conceptual mastery through an evidence-based knowledge DAG and bounded agent architecture."
    },
    {
        "id": "scene_02",
        "title": "Landing Page & Instant Guest Demo Access",
        "text": "For hackathon evaluators and learners, exploring LearnLoop AI requires zero registration, zero passwords, and zero authentication barriers. With a single click on 'Explore Live Demo', an isolated guest session initializes immediately with realistic sample progress. Normal multi-user registration, Google Identity linking, and Argon2id security remain fully operational, but demo explorers get instant, frictionless access."
    },
    {
        "id": "scene_03",
        "title": "Personalized Learner Onboarding Wizard",
        "text": "Effective tutoring begins by understanding the learner. LearnLoop's 6-step onboarding captures academic background, target exam timelines, and daily study availability. Whether you are a university student preparing for finals, a career switcher, or a competitive programmer, our system calibrates question difficulty, daily practice targets, and concept recommendations to your personal learning profile."
    },
    {
        "id": "scene_04",
        "title": "Diagnostic Assessment & Verified Skill Level",
        "text": "Next, our calibrated diagnostic assessment establishes an empirical skill baseline across the syllabus. Rather than self-reported guessing, the engine calculates your Verified Algorithmic Proficiency Level from Level 1 to 5. Upon completion, the learner receives an evidence-backed proficiency credential and a tailored focus strategy targeting their exact prerequisite gaps."
    },
    {
        "id": "scene_05",
        "title": "DSA Concept Graph & Adaptive Learning",
        "text": "Here is our 12-concept Knowledge DAG. Computer science concepts are not isolated lists; they build strictly upon foundational prerequisites. The interactive graph reveals how array contiguous memory underpins stacks and circular queues, while binary search trees enforce hierarchical invariants. Learners can inspect prerequisites, track mastery progression, and launch targeted practice directly from any node."
    },
    {
        "id": "scene_06",
        "title": "Adaptive Quiz & 7 Bounded Agent Tools",
        "text": "In the Adaptive Quiz, questions are dynamically calibrated based on prerequisite mastery. Crucially, LearnLoop requires learners to explain their reasoning alongside their choice. When submitted, our agent pipeline executes seven specialized bounded tools: retrieving learner profiles, inspecting prerequisite masteries, diagnosing catalogued misconceptions, atomically updating the learner model, and calculating the next review interval. You see the transparent tool execution trace in real time."
    },
    {
        "id": "scene_07",
        "title": "Socratic AI Tutor & Wispr Flow Voice Integration",
        "text": "Our AI Tutor engages in true Socratic dialogue rather than simply handing out answers. Integrated with Wispr Flow conversational voice input, learners can speak naturally. Notice how the agent automatically removes filler words, resolves mid-sentence corrections, and filters out off-topic exam stress—distilling the pure algorithmic inquiry. Socratic quick actions then generate tailored analogies, worked examples, and comprehension challenges."
    },
    {
        "id": "scene_08",
        "title": "Spaced Repetition & Progress Dashboard",
        "text": "To ensure long-term retention, LearnLoop implements a modified SuperMemo SM-2 spaced repetition engine. Concepts where misconceptions were detected are scheduled for prioritized review. Returning to the Dashboard, learners see their overall syllabus mastery gauge, urgent review tasks, and verified proficiency tier—providing clear, continuous visibility into their exam readiness."
    },
    {
        "id": "scene_09",
        "title": "Teacher Analytics Dashboard & Closing",
        "text": "For educators, our Teacher Dashboard aggregates class-wide mastery and highlights students needing intervention with clearly labeled demonstration cohort data. LearnLoop AI delivers an end-to-end, agentic exam-prep experience. Don't just learn the answers—master the concepts. Thank you."
    }
]

FFMPEG = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/node_modules/ffmpeg-static/ffmpeg.exe"))

def get_audio_duration(file_path):
    cmd = [FFMPEG, "-i", file_path]
    result = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    for line in result.stderr.splitlines():
        if "Duration:" in line:
            time_str = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = time_str.split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

async def generate_narration():
    print(f"Generating neural narration using {VOICE} at rate {RATE}...")
    durations = {}

    for scene in SCENES:
        sid = scene["id"]
        out_path = os.path.join(OUTPUT_DIR, f"{sid}.mp3")
        print(f"  Synthesizing {sid}: {scene['title']}...")
        communicate = edge_tts.Communicate(scene["text"], VOICE, rate=RATE)
        await communicate.save(out_path)
        dur = get_audio_duration(out_path)
        durations[sid] = {
            "title": scene["title"],
            "duration": round(dur, 2),
            "file": out_path
        }
        print(f"    -> Duration: {round(dur, 2)}s")

    # Generate audio concat list
    concat_txt_path = os.path.join(OUTPUT_DIR, "concat_list.txt")
    with open(concat_txt_path, "w", encoding="utf-8") as f:
        for scene in SCENES:
            f.write(f"file '{scene['id']}.mp3'\n")

    full_audio_path = os.path.join(OUTPUT_DIR, "full_narration_285s.mp3")
    concat_cmd = [
        FFMPEG, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_txt_path, "-c", "copy", full_audio_path
    ]
    subprocess.run(concat_cmd, check=True)
    total_dur = get_audio_duration(full_audio_path)

    durations["total"] = {
        "duration": round(total_dur, 2),
        "duration_minutes": f"{int(total_dur // 60)}m {int(total_dur % 60)}s",
        "file": full_audio_path
    }

    dur_json_path = os.path.join(OUTPUT_DIR, "scene_durations.json")
    with open(dur_json_path, "w", encoding="utf-8") as f:
        json.dump(durations, f, indent=2)

    print("\n=======================================================")
    print(f"FULL NARRATION AUDIO GENERATED: {round(total_dur, 2)}s (~{int(total_dur // 60)}m {int(total_dur % 60)}s)")
    print(f"Output File: {full_audio_path}")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(generate_narration())
