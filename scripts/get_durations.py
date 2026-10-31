import os
import subprocess
import json

FFMPEG_PATH = os.path.abspath("frontend/node_modules/ffmpeg-static/ffmpeg.exe")
ASSETS_DIR = os.path.abspath("demo_assets")

scenes = [
    "scene_01_intro",
    "scene_02_auth",
    "scene_03_onboarding",
    "scene_04_diagnostic",
    "scene_05_adaptive_quiz",
    "scene_06_ai_tutor",
    "scene_07_graph_revision",
    "scene_08_closing"
]

total_duration = 0.0
scene_durations = {}

for s in scenes:
    mp3_path = os.path.join(ASSETS_DIR, f"{s}.mp3")
    cmd = [
        FFMPEG_PATH, "-i", mp3_path
    ]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    # Parse Duration: 00:00:23.45
    duration_sec = 0.0
    for line in p.stderr.splitlines():
        if "Duration:" in line:
            parts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, sec = parts.split(":")
            duration_sec = float(h)*3600 + float(m)*60 + float(sec)
            break
    scene_durations[s] = duration_sec
    total_duration += duration_sec
    print(f"{s}: {duration_sec:.2f} seconds")

print(f"\nTOTAL AUDIO DURATION: {total_duration:.2f} seconds ({total_duration/60:.2f} minutes)")
with open(os.path.join(ASSETS_DIR, "durations.json"), "w") as f:
    json.dump({"scenes": scene_durations, "total": total_duration}, f, indent=2)

