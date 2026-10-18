from core.catalog import COMPONENTS
from core.validation import validate_graph


def node(id, technology, **configuration):
    c = next(c for c in COMPONENTS if c["technology"] == technology)
    return {"id": id, "type": c["type"], "technology": technology, "label": id, "position": {"x": 20, "y": 30}, "configuration": configuration}


def graph(nodes, triples):
    return validate_graph({"schemaVersion": 1, "nodes": nodes, "edges": [{"id": f"e{i}", "source": s, "target": t, "operation": o} for i, (s, t, o) in enumerate(triples)]})


def passing(slug, database="postgresql"):
    if slug == "url-shortener":
        return graph([node("client", "browser"), node("lb", "nginx"), node("app", "service", instances=3), node("db", database)], [("client", "lb", "request"), ("lb", "app", "request"), ("app", "db", "read"), ("app", "db", "write")])
    if slug == "notification-service":
        return graph([node("client", "browser"), node("app", "service"), node("queue", "rabbitmq", durable=True), node("worker", "celery", instances=2, ackAfterProcessing=True), node("db", database)], [("client", "app", "request"), ("app", "queue", "publish"), ("queue", "worker", "consume"), ("worker", "db", "write")])
    return graph([node("client", "browser"), node("app", "service", instances=6), node("cache", "redis", memoryMB=512), node("db", database)], [("client", "app", "request"), ("app", "cache", "read"), ("app", "db", "read"), ("app", "db", "write")])
