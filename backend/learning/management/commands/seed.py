from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.catalog import CATALOG_VERSION
from core.lessons import LESSONS, MODEL_VERSION
from learning.models import Challenge, ChallengeVersion
from learning.stores import invalidate_cache


class Command(BaseCommand):
    help = "Idempotently seed immutable lesson versions."

    def handle(self, *args, **options):
        with transaction.atomic():
            for definition in LESSONS:
                c, _ = Challenge.objects.get_or_create(slug=definition["slug"], defaults={"title": definition["title"], "difficulty": definition["difficulty"]})
                version, _ = ChallengeVersion.objects.get_or_create(challenge=c, number=CATALOG_VERSION, defaults={"catalog_version": CATALOG_VERSION, "model_version": MODEL_VERSION, "definition": definition})
                if version.definition != definition:
                    raise CommandError("Existing lesson version differs. Bump the version; never rewrite history.")
                c.title, c.difficulty, c.current_version = definition["title"], definition["difficulty"], version
                c.save()
        invalidate_cache()
        self.stdout.write("Seeded three immutable challenge versions.")
