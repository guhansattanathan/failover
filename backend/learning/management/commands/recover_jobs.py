import time
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from learning.tasks import recover_stranded


class Command(BaseCommand):
    help = "Recover stale evaluation leases; run independently of the broker."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            try:
                count = recover_stranded()
                if count:
                    self.stdout.write(f"Handled {count} stranded submissions.")
            except Exception:
                self.stderr.write("Recovery could not reach PostgreSQL; will retry on the next sweep.")
                if not options["loop"]:
                    raise
            if not options["loop"]:
                break
            time.sleep(15)
