import uuid
from django.db import models


class Challenge(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=120)
    difficulty = models.CharField(max_length=20)
    current_version = models.ForeignKey("ChallengeVersion", null=True, on_delete=models.PROTECT, related_name="current_for")


class ChallengeVersion(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.PROTECT, related_name="versions")
    number = models.PositiveIntegerField()
    catalog_version = models.PositiveIntegerField()
    model_version = models.PositiveIntegerField()
    definition = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["challenge", "number"], name="unique_challenge_version")]

    def save(self, *args, **kwargs):
        if self.pk and ChallengeVersion.objects.filter(pk=self.pk).exists():
            raise ValueError("Challenge versions are immutable. Create a new version.")
        super().save(*args, **kwargs)


class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    challenge_version = models.ForeignKey(ChallengeVersion, on_delete=models.PROTECT)
    graph = models.JSONField()
    status = models.CharField(max_length=12, default="pending", db_index=True)
    evaluator_version = models.CharField(max_length=32)
    results = models.JSONField(null=True)
    error_category = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    finished_at = models.DateTimeField(null=True)
    generation = models.UUIDField(default=uuid.uuid4)
    recovery_count = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if self.pk:
            previous = Submission.objects.filter(pk=self.pk).values("graph", "challenge_version_id", "evaluator_version").first()
            if previous and any(previous[f] != getattr(self, f) for f in previous):
                raise ValueError("Submission snapshots are immutable.")
        super().save(*args, **kwargs)
