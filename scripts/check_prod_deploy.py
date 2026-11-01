import httpx
import re

print("Checking Vercel...")
try:
    r = httpx.get('https://learnloop-ai-one.vercel.app', timeout=10.0)
    js_files = re.findall(r'/assets/[^\s\"\'\>]+\.js', r.text)
    print("Found JS files:", js_files)
    for js in js_files:
        r_js = httpx.get('https://learnloop-ai-one.vercel.app' + js, timeout=10.0)
        found = 'Teacher Demo Dashboard' in r_js.text
        print(f"File {js}: contains 'Teacher Demo Dashboard': {found}")
except Exception as e:
    print("Vercel check error:", e)

print("\nChecking Render...")
try:
    r_backend = httpx.get('https://learnloop-ai-backend.onrender.com/api/teacher/demo-dashboard', timeout=10.0)
    print(f"Render /api/teacher/demo-dashboard status: {r_backend.status_code}")
    if r_backend.status_code == 200:
        print("Render is live with new commit! Notice:", r_backend.json().get('sample_notice')[:60])
    else:
        print("Render response:", r_backend.text[:120])
except Exception as e:
    print("Render check error:", e)
