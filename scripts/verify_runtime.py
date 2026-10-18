"""Destructive-to-demo-state verification: stop/restart only this Compose project's services.

Run against a dedicated local instance. Preserves original drafts; adds submission history.
Never used by the application. Requires the running stack and host Python requests.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from tests.fixtures import passing  # noqa: E402

BASE = os.environ.get("FAILOVER_URL", "http://127.0.0.1:8080") + "/api/v1"


def compose(*args):
    result = subprocess.run(["docker", "compose", *args], cwd=ROOT, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError(f"Compose operation failed: {' '.join(args[:3])}")
    return result.stdout


def sql(code):
    return compose("exec", "-T", "api", "python", "manage.py", "shell", "-c", code)


def get(path):
    response = requests.get(BASE + path, timeout=15)
    response.raise_for_status()
    return response.json()


def submit():
    response = requests.post(BASE + "/challenges/url-shortener/submissions", json={"graph": passing("url-shortener"), "challengeVersion": 3, "catalogVersion": 3}, timeout=30)
    assert response.status_code == 202, response.status_code
    return response.json()


def wait_result(id):
    for _ in range(60):
        value = get(f"/submissions/{id}")
        if value["status"] not in ("pending", "running"):
            return value
        time.sleep(1)
    raise AssertionError("Evaluation did not finish")


def ready():
    for _ in range(60):
        try:
            get("/health/ready")
            return
        except (requests.RequestException, ValueError):
            time.sleep(1)
    raise AssertionError("Stack not ready")


def main():
    ready()
    # Redis is optional for correctness, even after a previously cached read.
    get("/components"); get("/challenges")
    try:
        compose("stop", "redis")
        assert len(get("/components")["components"]) >= 8
        assert len(get("/challenges")) == 3
        print("PASS: authoritative catalog reads while Redis is stopped", flush=True)
    finally:
        compose("start", "redis")

    try:
        compose("stop", "rabbitmq")
        failed = submit()
        assert failed["status"] == "error" and failed["errorCategory"] == "broker_unavailable", failed["status"]
    finally:
        compose("start", "rabbitmq")
    ready()
    response = requests.post(BASE + f"/submissions/{failed['id']}/retry", json={}, timeout=30)
    assert response.status_code == 202
    assert wait_result(failed["id"])["status"] == "passed"
    print("PASS: real broker outage and retry of the same immutable snapshot", flush=True)

    try:
        compose("stop", "worker")
        queued = submit()
        assert queued["status"] == "pending"
        for i in range(4):
            # Advance the lease clock, avoiding an eight-minute acceptance-test delay.
            sql("from learning.models import Submission; from django.utils import timezone; from datetime import timedelta; "
                f"Submission.objects.filter(pk='{queued['id']}').update(updated_at=timezone.now()-timedelta(seconds=121))")
            compose("exec", "-T", "api", "python", "manage.py", "recover_jobs")
        value = get(f"/submissions/{queued['id']}")
        assert value["status"] == "error" and value["errorCategory"] == "worker_timeout"
    finally:
        compose("start", "worker")
    response = requests.post(BASE + f"/submissions/{queued['id']}/retry", json={}, timeout=30)
    assert response.status_code == 202
    done = wait_result(queued["id"])
    assert done["status"] == "passed"
    print("PASS: absent worker, bounded lease recovery, stale messages and explicit retry", flush=True)

    sql("from learning.models import Submission; from learning.tasks import evaluate_submission; "
        f"s=Submission.objects.get(pk='{queued['id']}'); evaluate_submission.delay(str(s.pk),str(s.generation)); evaluate_submission.delay(str(s.pk),str(s.generation))")
    time.sleep(2)
    after = get(f"/submissions/{queued['id']}")
    assert after["results"] == done["results"] and after["updatedAt"] == done["updatedAt"]
    print("PASS: duplicate RabbitMQ deliveries preserve terminal results and timestamps", flush=True)

    path = "/challenges/url-shortener/draft"
    old = get(path)
    body = {"revision": old["revision"], "catalogVersion": 3, "graph": passing("url-shortener"), "viewport": {"x": 38.5, "y": -122, "zoom": 0.75}}
    try:
        response = requests.put(BASE + path, json=body, timeout=15)
        assert response.status_code == 200
        saved = response.json()
        compose("restart", "postgres", "mongo")
        ready()
        restored = get(path)
        assert restored == saved
        assert get(f"/submissions/{queued['id']}")["results"] == done["results"]
        print("PASS: draft layout/configuration/viewport and SQL history survive database restarts", flush=True)
    finally:
        current = get(path)
        response = requests.put(BASE + path, json={"revision": current["revision"], "catalogVersion": 3, "graph": old["graph"], "viewport": old["viewport"]}, timeout=15)
        assert response.status_code == 200
    print(json.dumps({"runtimeVerification": "passed", "checks": 5}), flush=True)


if __name__ == "__main__":
    main()
