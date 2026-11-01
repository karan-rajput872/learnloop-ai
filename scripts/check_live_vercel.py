import httpx
import re
import time

def check_live():
    print("Checking https://learnloop-ai-one.vercel.app...")
    for attempt in range(1, 13):
        try:
            r = httpx.get('https://learnloop-ai-one.vercel.app', headers={'Cache-Control': 'no-cache'}, timeout=15.0)
            js_files = re.findall(r'/assets/[^\s"\'\>]+\.js', r.text)
            print(f"[Attempt {attempt}] HTTP {r.status_code}, Found JS: {js_files}")
            for js in js_files:
                r_js = httpx.get('https://learnloop-ai-one.vercel.app' + js, timeout=15.0)
                has_landing = "Don't just learn the answers" in r_js.text or "Master the concepts" in r_js.text
                has_menu = "Account and application options" in r_js.text
                print(f"  -> {js}: has_landing={has_landing}, has_menu={has_menu}")
                if has_landing and has_menu:
                    print("\n SUCCESS! Vercel has deployed the new build!")
                    return True
        except Exception as e:
            print(f"[Attempt {attempt}] Error: {e}")
        time.sleep(10)
    return False

if __name__ == '__main__':
    check_live()
