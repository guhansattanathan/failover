from uuid import uuid4
from django.db import connection, transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from core.catalog import catalog, CATALOG_VERSION
from core.evaluator import EVALUATOR_VERSION
from core.validation import validate_graph, validate_viewport, keys, require, GraphError
from .models import Challenge, Submission
from .stores import cached, read_draft, save_draft, mongo
from .tasks import dispatch, INFRA_ERRORS
from .errors import Conflict


def challenge(slug):
    return get_object_or_404(Challenge.objects.select_related("current_version"), slug=slug)


def serialize(s):
    return {"id": str(s.id), "challengeSlug": s.challenge_version.challenge.slug, "challengeVersion": s.challenge_version.number,
            "catalogVersion": s.challenge_version.catalog_version, "modelVersion": s.challenge_version.model_version,
            "evaluatorVersion": s.evaluator_version, "graph": s.graph, "status": s.status, "results": s.results,
            "errorCategory": s.error_category or None, "canRetry": s.status == "error" and s.error_category in INFRA_ERRORS,
            "createdAt": s.created_at.isoformat(), "updatedAt": s.updated_at.isoformat(),
            "finishedAt": s.finished_at.isoformat() if s.finished_at else None}


def checked(fn, value):
    try:
        return fn(value)
    except GraphError as exc:
        raise ValidationError(str(exc)) from exc


@api_view(["GET"])
def components(request):
    return Response(cached(f"failover:catalog:{CATALOG_VERSION}", catalog))


@api_view(["GET"])
def challenges(request):
    versions = list(Challenge.objects.order_by("id").values_list("id", "current_version_id"))
    signature = ":".join(f"{a}-{b}" for a, b in versions)
    def load():
        return [{"slug": c.slug, "title": c.title, "difficulty": c.difficulty, "summary": c.current_version.definition["summary"], "version": c.current_version.number} for c in Challenge.objects.select_related("current_version").order_by("id") if c.current_version]
    items = cached(f"failover:challenges:{CATALOG_VERSION}:{signature}", load)
    passed = set(Submission.objects.filter(status="passed").values_list("challenge_version_id", flat=True))
    current = dict(Challenge.objects.values_list("slug", "current_version_id"))
    return Response([{**item, "completed": current[item["slug"]] in passed} for item in items])


@api_view(["GET"])
def detail(request, slug):
    c = challenge(slug)
    return Response({**c.current_version.definition, "version": c.current_version.number, "catalogVersion": c.current_version.catalog_version, "modelVersion": c.current_version.model_version})


@api_view(["GET", "PUT"])
def draft(request, slug):
    challenge(slug)
    if request.method == "GET":
        return Response(read_draft(slug) or {"revision": 0, "catalogVersion": CATALOG_VERSION, "graph": {"schemaVersion": 1, "nodes": [], "edges": []}, "viewport": {"x": 0, "y": 0, "zoom": 1}, "updatedAt": None})
    def validate(data):
        keys(data, ("revision", "catalogVersion", "graph", "viewport"), ("revision", "catalogVersion", "graph", "viewport"), "draft")
        require(type(data["revision"]) is int and 0 <= data["revision"] < 2147483647, "Invalid revision number.")
        require(type(data["catalogVersion"]) is int and data["catalogVersion"] == CATALOG_VERSION, "Unsupported catalog version.")
        return {**data, "graph": validate_graph(data["graph"]), "viewport": validate_viewport(data["viewport"])}
    return Response(save_draft(slug, checked(validate, request.data)))


@api_view(["GET", "POST"])
def submissions(request, slug):
    c = challenge(slug)
    if request.method == "GET":
        try:
            page = int(request.query_params.get("page", "1"))
            if page < 1 or page > 100000:
                raise ValueError()
        except ValueError:
            raise ValidationError("Page must be a positive integer up to 100000.")
        rows = Submission.objects.filter(challenge_version__challenge=c).select_related("challenge_version__challenge").order_by("-created_at", "-id")
        return Response({"count": rows.count(), "page": page, "pageSize": 10, "results": [serialize(s) for s in rows[(page - 1) * 10:page * 10]]})
    def validate(data):
        keys(data, ("graph", "challengeVersion", "catalogVersion"), ("graph", "challengeVersion", "catalogVersion"), "submission")
        require(type(data["challengeVersion"]) is int and data["challengeVersion"] == c.current_version.number, "Challenge version changed. Reload the lesson before submitting.")
        require(type(data["catalogVersion"]) is int and data["catalogVersion"] == c.current_version.catalog_version, "Catalog version changed. Reload before submitting.")
        return validate_graph(data["graph"])
    graph = checked(validate, request.data)
    with transaction.atomic():
        s = Submission.objects.create(challenge_version=c.current_version, graph=graph, evaluator_version=EVALUATOR_VERSION)
        transaction.on_commit(lambda: dispatch(s.pk, s.generation))
    s.refresh_from_db()
    return Response(serialize(s), status=202)


@api_view(["GET"])
def submission(request, pk):
    return Response(serialize(get_object_or_404(Submission.objects.select_related("challenge_version__challenge"), pk=pk)))


@api_view(["POST"])
def retry(request, pk):
    with transaction.atomic():
        s = get_object_or_404(Submission.objects.select_for_update().select_related("challenge_version__challenge"), pk=pk)
        if s.status != "error" or s.error_category not in INFRA_ERRORS:
            raise Conflict("Only infrastructure failures can be retried. Revise and submit a new design for learner failures.")
        s.status, s.error_category, s.finished_at, s.results = "pending", "", None, None
        s.generation, s.recovery_count = uuid4(), 0
        s.save(update_fields=["status", "error_category", "finished_at", "results", "generation", "recovery_count", "updated_at"])
        transaction.on_commit(lambda: dispatch(s.pk, s.generation))
    s.refresh_from_db()
    return Response(serialize(s), status=202)


@api_view(["GET"])
def live(request):
    return Response({"status": "alive", "mode": "single-user-local-demo"})


@api_view(["GET"])
def ready(request):
    checks = {}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["postgres"] = True
        checks["seeded"] = Challenge.objects.filter(current_version__isnull=False).count() >= 3
    except Exception:
        checks["postgres"] = False
    try:
        mongo().admin.command("ping")
        checks["mongo"] = True
    except Exception:
        checks["mongo"] = False
    try:
        from failover.celery import app
        with app.connection_for_write() as conn:
            conn.ensure_connection(max_retries=0)
        checks["rabbitmq"] = True
    except Exception:
        checks["rabbitmq"] = False
    healthy = all(checks.values())
    return Response({"status": "ready" if healthy else "unavailable", "checks": checks, "redis": "optional cache; authoritative fallback enabled"}, status=200 if healthy else 503)
