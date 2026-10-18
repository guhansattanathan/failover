"""Real HTTP → PostgreSQL → RabbitMQ → Celery plus Mongo round trip. Opt in."""
import os
import time
import requests
import pytest
from tests.fixtures import passing

pytestmark = [pytest.mark.live, pytest.mark.skipif(not os.environ.get("FAILOVER_LIVE_URL"), reason="Set FAILOVER_LIVE_URL for real infrastructure tests")]


@pytest.mark.parametrize("slug", ["url-shortener", "notification-service", "product-catalog"])
def test_real_queued_submission_and_draft(slug):
    base = os.environ["FAILOVER_LIVE_URL"].rstrip("/") + "/api/v1"
    graph = passing(slug, "mongodb")
    response = requests.post(f"{base}/challenges/{slug}/submissions", json={"graph": graph, "catalogVersion": 3, "challengeVersion": 3}, timeout=15)
    assert response.status_code == 202, response.text
    id = response.json()["id"]
    for _ in range(60):
        value = requests.get(f"{base}/submissions/{id}", timeout=10).json()
        if value["status"] not in ("pending", "running"): break
        time.sleep(1)
    assert value["status"] == "passed" and value["results"]["score"] == 100, value
    path = f"{base}/challenges/{slug}/draft"
    old = requests.get(path, timeout=10).json()
    body = {"revision": old["revision"], "catalogVersion": 3, "graph": graph, "viewport": {"x": -31, "y": 84, "zoom": 0.8}}
    assert requests.put(path, json=body, timeout=10).status_code == 200
    assert requests.put(path, json=body, timeout=10).status_code == 409
    restored = requests.get(path, timeout=10).json()
    assert restored["graph"] == graph and restored["viewport"] == body["viewport"]
    # Leave the learner canvas empty; retain history as verification evidence.
    body.update(revision=restored["revision"], graph={"schemaVersion": 1, "nodes": [], "edges": []}, viewport={"x": 0, "y": 0, "zoom": 1})
    assert requests.put(path, json=body, timeout=10).status_code == 200
