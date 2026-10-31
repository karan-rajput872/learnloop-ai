import httpx
import sys

BASE_URL = "http://localhost:8000/api"

def check_pre():
    client = httpx.Client(timeout=10.0)
    prof = client.get(f"{BASE_URL}/learner/profile?student_id=student_audit").json()["profile"]
    tasks = client.get(f"{BASE_URL}/tutor/revision/tasks?student_id=student_audit").json()["tasks"]
    history = client.get(f"{BASE_URL}/learner/misconceptions?student_id=student_audit").json().get("history", [])

    print(f"PRE_RESTART: mastery={prof['overall_mastery']}, concepts_count={len(prof['concepts'])}, tasks_count={len(tasks)}, history_count={len(history)}")
    return {
        "mastery": prof["overall_mastery"],
        "concepts_count": len(prof["concepts"]),
        "tasks_count": len(tasks),
        "history_count": len(history)
    }

def check_post(expected):
    client = httpx.Client(timeout=10.0)
    prof = client.get(f"{BASE_URL}/learner/profile?student_id=student_audit").json()["profile"]
    tasks = client.get(f"{BASE_URL}/tutor/revision/tasks?student_id=student_audit").json()["tasks"]
    history = client.get(f"{BASE_URL}/learner/misconceptions?student_id=student_audit").json().get("history", [])

    print(f"POST_RESTART: mastery={prof['overall_mastery']}, concepts_count={len(prof['concepts'])}, tasks_count={len(tasks)}, history_count={len(history)}")

    assert prof["overall_mastery"] == expected["mastery"], "Mastery mismatch after restart"
    assert len(prof["concepts"]) == expected["concepts_count"], "Concepts count mismatch after restart"
    assert len(tasks) == expected["tasks_count"], "Tasks count mismatch after restart"
    assert len(history) == expected["history_count"], "History count mismatch after restart"
    print("SUCCESS: Persistence across server restart fully verified!")

if __name__ == "__main__":
    if sys.argv[1] == "pre":
        import json
        data = check_pre()
        with open("pre_state.json", "w") as f:
            json.dump(data, f)
    elif sys.argv[1] == "post":
        import json
        with open("pre_state.json") as f:
            expected = json.load(f)
        check_post(expected)
