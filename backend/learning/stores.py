import json
from datetime import datetime, timezone
from functools import lru_cache
from django.conf import settings
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError
from redis import Redis, RedisError
from .errors import Conflict, ServiceUnavailable


@lru_cache
def mongo():
    return MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=2000, connectTimeoutMS=2000, socketTimeoutMS=2000)


def drafts():
    return mongo().failover.drafts


def read_draft(slug):
    try:
        doc = drafts().find_one({"_id": slug})
        if doc:
            doc.pop("_id")
        return doc
    except PyMongoError as exc:
        raise ServiceUnavailable("Draft storage is unavailable. Submissions remain available independently.") from exc


def save_draft(slug, data):
    revision = data["revision"]
    document = {**data, "challengeSlug": slug, "revision": revision + 1, "updatedAt": datetime.now(timezone.utc).isoformat()}
    try:
        if revision == 0:
            drafts().insert_one({"_id": slug, **document})
        else:
            result = drafts().find_one_and_replace({"_id": slug, "revision": revision}, {"_id": slug, **document}, return_document=ReturnDocument.AFTER)
            if result is None:
                raise Conflict()
        return document
    except DuplicateKeyError as exc:
        raise Conflict() from exc
    except PyMongoError as exc:
        raise ServiceUnavailable("Draft storage is unavailable. Your current canvas has not been saved.") from exc


def redis():
    return Redis.from_url(settings.REDIS_URL, socket_connect_timeout=0.3, socket_timeout=0.3)


def cached(key, loader):
    try:
        value = redis().get(key)
        if value:
            return json.loads(value)
    except (RedisError, ValueError, TypeError):
        pass
    value = loader()
    try:
        redis().setex(key, 60, json.dumps(value))
    except RedisError:
        pass
    return value


def invalidate_cache():
    try:
        keys = list(redis().scan_iter("failover:*", count=100))
        if keys:
            redis().delete(*keys)
    except RedisError:
        pass
