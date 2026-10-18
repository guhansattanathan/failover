"""Authoritative teaching catalog. No capacities are accepted from a browser."""
CATALOG_VERSION = 1
SCHEMA_VERSION = 1


def integer(default, minimum=1, maximum=10):
    return {"kind": "integer", "default": default, "min": minimum, "max": maximum}


def boolean(default):
    return {"kind": "boolean", "default": default}


COMPONENTS = [
    {"type": "client", "title": "Client", "technology": "browser", "icon": "monitor", "description": "A browser or mobile application that starts requests.", "configuration": {}},
    {"type": "load_balancer", "title": "Load balancer", "technology": "nginx", "icon": "nginx", "description": "Routes incoming requests across application instances.", "configuration": {}},
    {"type": "application", "title": "Application service", "technology": "service", "icon": "server", "description": "One homogeneous service tier. Instances share the same role; lesson constants determine their capacity.", "configuration": {"instances": integer(1)}},
    {"type": "cache", "title": "Cache", "technology": "redis", "icon": "redis", "description": "Redis read cache. Only the catalog lesson assigns synthetic hit ratios to memory sizes.", "configuration": {"memoryMB": {"kind": "enum", "default": 128, "values": [128, 256, 512]}}},
    {"type": "relational_database", "title": "Relational database", "technology": "postgresql", "icon": "postgresql", "description": "PostgreSQL persistent structured storage. Persistence is a simplified lesson setting.", "configuration": {"persistent": boolean(True)}},
    {"type": "relational_database", "title": "Relational database", "technology": "mysql", "icon": "mysql", "description": "MySQL persistent structured storage. Accepted wherever a lesson requires a database.", "configuration": {"persistent": boolean(True)}},
    {"type": "nonrelational_database", "title": "Document database", "technology": "mongodb", "icon": "mongodb", "description": "MongoDB document storage. Accepted wherever a lesson requires a database.", "configuration": {"persistent": boolean(True)}},
    {"type": "queue", "title": "Message queue", "technology": "rabbitmq", "icon": "rabbitmq", "description": "Buffers jobs between the API and background workers. Durability is an educational simplification.", "configuration": {"durable": boolean(False)}},
    {"type": "worker", "title": "Background worker", "technology": "celery", "icon": "celery", "description": "Processes delivered jobs and acknowledges them after successful processing when enabled.", "configuration": {"instances": integer(1), "ackAfterProcessing": boolean(False)}},
]
DATABASE_TYPES = {"relational_database", "nonrelational_database"}
CONNECTIONS = [
    ("client", "application", "request"), ("client", "load_balancer", "request"),
    ("load_balancer", "application", "request"), ("application", "cache", "read"),
    ("application", "queue", "publish"), ("queue", "worker", "consume"),
] + [("application", t, op) for t in sorted(DATABASE_TYPES) for op in ("read", "write")] + [("worker", t, "write") for t in sorted(DATABASE_TYPES)]


def catalog():
    return {"version": CATALOG_VERSION, "schemaVersion": SCHEMA_VERSION, "components": COMPONENTS,
            "connections": [{"source": s, "target": t, "operation": o} for s, t, o in CONNECTIONS],
            "limits": {"nodes": 50, "edges": 100, "payloadBytes": 131072}}
