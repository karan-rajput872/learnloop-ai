import os
import subprocess

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

concat_list_path = os.path.join(ASSETS_DIR, "audio_concat.txt")
with open(concat_list_path, "w") as f:
    for s in scenes:
        mp3_name = f"{s}.mp3"
        f.write(f"file '{mp3_name}'\n")

output_audio = os.path.join(ASSETS_DIR, "full_narration.mp3")
cmd = [
    FFMPEG_PATH, "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concat_list_path,
    "-c", "copy",
    output_audio
]
subprocess.run(cmd, check=True)
print(f"Full narration assembled at: {output_audio}")

