from copy import deepcopy
from datetime import timedelta
from unittest.mock import Mock, patch
import mongomock
import pytest
from django.core.management import call_command
from django.db import connection, DatabaseError, transaction
from django.utils import timezone
from redis.exceptions import ConnectionError
from rest_framework.test import APIClient
from learning.models import Submission, ChallengeVersion
from learning.tasks import evaluate_submission, recover_stranded, MAX_RECOVERIES
from tests.fixtures import passing

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(autouse=True)
def services(monkeypatch):
    monkeypatch.setattr("learning.stores.redis", Mock(side_effect=ConnectionError("offline")))
    collection = mongomock.MongoClient().failover.drafts
    monkeypatch.setattr("learning.stores.drafts", lambda: collection)
    monkeypatch.setattr(evaluate_submission, "apply_async", Mock())
    call_command("seed", verbosity=0)


@pytest.fixture
def client():
    return APIClient()


def create(client, graph=None):
    response = client.post("/api/v1/challenges/url-shortener/submissions", {"graph": graph if graph is not None else passing("url-shortener"), "challengeVersion": 2, "catalogVersion": 2}, format="json")
    assert response.status_code == 202, response.data
    return response.data


def run(s):
    row = Submission.objects.get(pk=s["id"])
    evaluate_submission.run(str(row.pk), str(row.generation))
    row.refresh_from_db()
    return row


def test_draft_roundtrip_conflict_and_snapshot_isolation(client):
    path = "/api/v1/challenges/url-shortener/draft"
    assert client.get(path).data["revision"] == 0
    g = passing("url-shortener"); g["nodes"][0]["position"] = {"x": -82.25, "y": 541.5}
    data = {"graph": g, "viewport": {"x": 20, "y": -10, "zoom": 0.75}, "revision": 0, "catalogVersion": 2}
    saved = client.put(path, data, format="json")
    assert saved.status_code == 200 and saved.data["revision"] == 1
    restored = client.get(path).data
    assert restored["graph"] == g and restored["viewport"] == data["viewport"]
    assert client.put(path, data, format="json").status_code == 409
    submission = create(client, g); row = run(submission)
    frozen_results = deepcopy(row.results)
    data["revision"] = 1; data["graph"]["nodes"][2]["configuration"]["instances"] = 1
    assert client.put(path, data, format="json").status_code == 200
    row.refresh_from_db()
    assert row.graph["nodes"][2]["configuration"]["instances"] == 3 and row.results == frozen_results


def test_submission_independent_of_mongo(client, monkeypatch):
    monkeypatch.setattr("learning.views.read_draft", Mock(side_effect=RuntimeError()))
    assert run(create(client)).status == "passed"


def test_queued_job_persists_results_and_duplicate_delivery_is_noop(client):
    s = create(client)
    assert s["status"] == "pending" and evaluate_submission.apply_async.call_count == 1
    row = run(s); timestamp = row.finished_at; results = row.results
    assert row.status == "passed" and results["score"] == 100
    row = run(s)
    assert row.finished_at == timestamp and row.results == results
    fetched = client.get(f"/api/v1/submissions/{row.pk}").data
    assert fetched["results"] == results
    assert client.get("/api/v1/challenges").data[0]["completed"] is True


def test_broker_failure_retries_same_snapshot(client):
    evaluate_submission.apply_async.side_effect = OSError("broker offline")
    s = create(client)
    assert s["status"] == "error" and s["errorCategory"] == "broker_unavailable" and s["canRetry"]
    row = Submission.objects.get(pk=s["id"]); old_token = row.generation
    evaluate_submission.apply_async.side_effect = None
    retried = client.post(f"/api/v1/submissions/{row.pk}/retry", {}, format="json")
    assert retried.status_code == 202 and retried.data["graph"] == s["graph"]
    evaluate_submission.run(str(row.pk), str(old_token))
    row.refresh_from_db(); assert row.status == "pending"
    assert run(s).status == "passed"


def test_failed_design_cannot_retry(client):
    s = create(client, {"schemaVersion": 1, "nodes": [], "edges": []})
    assert run(s).status == "failed"
    assert client.post(f"/api/v1/submissions/{s['id']}/retry", {}, format="json").status_code == 409


def test_evaluator_errors_are_not_learner_failures(client):
    s = create(client)
    with patch("learning.tasks.evaluate", side_effect=RuntimeError("internal")):
        assert run(s).status == "error"
    value = client.get(f"/api/v1/submissions/{s['id']}").data
    assert value["errorCategory"] == "evaluator_error" and not value["canRetry"]


def test_soft_time_limit_is_recoverable_infrastructure_failure(client):
    from billiard.exceptions import SoftTimeLimitExceeded
    s = create(client)
    with patch("learning.tasks.evaluate", side_effect=SoftTimeLimitExceeded()):
        assert run(s).status == "error"
    value = client.get(f"/api/v1/submissions/{s['id']}").data
    assert value["errorCategory"] == "worker_timeout" and value["canRetry"]


def test_missing_resource_errors_are_json(client):
    response = client.get("/api/v1/not-a-resource")
    assert response.status_code == 404 and response.json()["error"]["code"] == "not_found"


def test_crash_recovery_is_bounded_and_fences_old_jobs(client):
    s = create(client); row = Submission.objects.get(pk=s["id"]); token = row.generation
    for i in range(MAX_RECOVERIES + 1):
        Submission.objects.filter(pk=row.pk).update(status="running", updated_at=timezone.now() - timedelta(seconds=121))
        assert recover_stranded() == 1
        row.refresh_from_db()
        assert row.status == ("pending" if i < MAX_RECOVERIES else "error")
    assert row.error_category == "worker_timeout"
    evaluate_submission.run(str(row.pk), str(token))
    row.refresh_from_db(); assert row.status == "error"
    assert client.post(f"/api/v1/submissions/{row.pk}/retry", {}, format="json").status_code == 202
    assert run(s).status == "passed"


def test_cache_failure_has_authoritative_fallback(client):
    assert len(client.get("/api/v1/components").data["components"]) >= 8
    assert len(client.get("/api/v1/challenges").data) == 3
    call_command("seed", verbosity=0)
    assert ChallengeVersion.objects.count() == 3


def test_invalid_payload_and_origin_errors(client):
    g = passing("url-shortener"); g["nodes"][2]["configuration"]["capacity"] = 999999
    data = {"graph": g, "challengeVersion": 2, "catalogVersion": 2}
    assert client.post("/api/v1/challenges/url-shortener/submissions", data, format="json").status_code == 400
    assert not Submission.objects.exists()
    assert client.post("/api/v1/challenges/url-shortener/submissions", data, format="json", HTTP_ORIGIN="https://evil.invalid").status_code == 403
    large = client.post("/api/v1/challenges/url-shortener/submissions", {"padding": "x" * 131072}, format="json")
    assert large.status_code == 413 and "error" in large.json()


def test_pagination_and_version_validation(client):
    for _ in range(11): create(client)
    p1 = client.get("/api/v1/challenges/url-shortener/submissions").data
    p2 = client.get("/api/v1/challenges/url-shortener/submissions?page=2").data
    assert len(p1["results"]) == 10 and len(p2["results"]) == 1 and p1["count"] == 11
    assert client.get("/api/v1/challenges/url-shortener/submissions?page=-1").status_code == 400
    assert client.post("/api/v1/challenges/url-shortener/submissions", {"graph": passing("url-shortener"), "challengeVersion": 99, "catalogVersion": 2}, format="json").status_code == 400


def test_model_snapshots_immutable(client):
    s = create(client); row = Submission.objects.get(pk=s["id"])
    row.graph = {}
    with pytest.raises(ValueError): row.save()
    version = row.challenge_version
    with pytest.raises(ValueError): version.save()
    if connection.vendor == "postgresql":
        with pytest.raises(DatabaseError), transaction.atomic():
            Submission.objects.filter(pk=row.pk).update(graph={})


def test_reseed_adds_catalog_version_without_mutating_old_history(client):
    from learning.models import Challenge
    challenge = Challenge.objects.get(slug='url-shortener')
    current = challenge.current_version
    old = ChallengeVersion.objects.create(challenge=challenge, number=1, catalog_version=1, model_version=current.model_version, definition=current.definition)
    challenge.current_version = old
    challenge.save()
    call_command('seed', verbosity=0)
    challenge.refresh_from_db()
    old.refresh_from_db()
    assert challenge.current_version_id == current.id
    assert old.catalog_version == 1 and old.number == 1
    call_command('seed', verbosity=0)
    assert ChallengeVersion.objects.filter(challenge=challenge).count() == 2
