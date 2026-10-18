import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "local-demo-only-never-use-in-public-hosting")
DEBUG = False
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,api,testserver").split(",")
INSTALLED_APPS = ["django.contrib.contenttypes", "rest_framework", "learning"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "learning.middleware.RequestBoundary"]
ROOT_URLCONF = "failover.urls"
DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": os.environ.get("POSTGRES_DB", "failover"),
    "USER": os.environ.get("POSTGRES_USER", "failover"), "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "local-demo-password"),
    "HOST": os.environ.get("POSTGRES_HOST", "postgres"), "PORT": os.environ.get("POSTGRES_PORT", "5432"), "CONN_MAX_AGE": 60,
    "OPTIONS": {"connect_timeout": 3}}}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"
DATA_UPLOAD_MAX_MEMORY_SIZE = 131072
REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": [], "UNAUTHENTICATED_USER": None,
                  "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"], "EXCEPTION_HANDLER": "learning.errors.exception_handler"}
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://mongo:27017")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "amqp://failover:local-demo-password@rabbitmq:5672//")
CELERY_TASK_IGNORE_RESULT = True
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_SOFT_TIME_LIMIT = 20
CELERY_TASK_TIME_LIMIT = 30
CELERY_TASK_PUBLISH_RETRY = False
CELERY_BROKER_CONNECTION_TIMEOUT = 3
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_TRANSPORT_OPTIONS = {"confirm_publish": True}
SAFE_ORIGINS = os.environ.get("SAFE_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173").split(",")
