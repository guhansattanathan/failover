from .settings import *  # noqa: F403

# Fast isolated tests only. The running application always uses PostgreSQL.
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
