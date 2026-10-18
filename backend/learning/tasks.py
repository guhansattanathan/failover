"""SQL state is authoritative. Generation tokens fence off stale deliveries."""
import logging
from datetime import timedelta
from uuid import uuid4
from celery import shared_task
from billiard.exceptions import SoftTimeLimitExceeded
from django.db import transaction
from django.utils import timezone
from core.evaluator import evaluate, EVALUATOR_VERSION
from .models import Submission

logger = logging.getLogger(__name__)
INFRA_ERRORS = {"broker_unavailable", "worker_timeout"}
LEASE_SECONDS = 120
MAX_RECOVERIES = 3


def dispatch(submission_id, generation):
    try:
        evaluate_submission.apply_async(args=[str(submission_id), str(generation)], retry=False)
    except Exception:
        logger.warning("Evaluation dispatch failed for %s", submission_id)
        Submission.objects.filter(pk=submission_id, generation=generation, status="pending").update(status="error", error_category="broker_unavailable", updated_at=timezone.now(), finished_at=timezone.now())


@shared_task
def evaluate_submission(submission_id, generation):
    with transaction.atomic():
        submission = Submission.objects.select_for_update().select_related("challenge_version").filter(pk=submission_id).first()
        if not submission or str(submission.generation) != str(generation) or submission.status != "pending":
            return
        submission.status = "running"
        submission.save(update_fields=["status", "updated_at"])
        graph, definition = submission.graph, submission.challenge_version.definition
        evaluator_version = submission.evaluator_version
    try:
        if evaluator_version != EVALUATOR_VERSION:
            raise ValueError("Unsupported evaluator version")
        result = evaluate(graph, definition)
        update = {"status": "passed" if result["passed"] else "failed", "results": result, "error_category": ""}
    except SoftTimeLimitExceeded:
        logger.warning("Worker time limit exceeded for %s", submission_id)
        update = {"status": "error", "error_category": "worker_timeout"}
    except Exception:
        logger.exception("Evaluator failed for %s", submission_id)
        update = {"status": "error", "error_category": "evaluator_error"}
    Submission.objects.filter(pk=submission_id, generation=generation, status="running").update(**update, finished_at=timezone.now(), updated_at=timezone.now())


def recover_stranded():
    cutoff = timezone.now() - timedelta(seconds=LEASE_SECONDS)
    ids = list(Submission.objects.filter(status__in=["pending", "running"], updated_at__lt=cutoff).values_list("id", flat=True)[:100])
    for pk in ids:
        with transaction.atomic():
            s = Submission.objects.select_for_update().get(pk=pk)
            if s.status not in ("pending", "running") or s.updated_at >= cutoff:
                continue
            s.generation = uuid4()
            if s.recovery_count >= MAX_RECOVERIES:
                s.status, s.error_category, s.finished_at = "error", "worker_timeout", timezone.now()
            else:
                s.recovery_count += 1
                s.status, s.error_category = "pending", ""
                transaction.on_commit(lambda pk=s.pk, token=s.generation: dispatch(pk, token))
            s.save(update_fields=["generation", "recovery_count", "status", "error_category", "finished_at", "updated_at"])
    return len(ids)
