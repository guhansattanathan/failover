"""Authoritative teaching catalog. No capacities are accepted from a browser."""
CATALOG_VERSION = 3
SCHEMA_VERSION = 1


def integer(default, minimum=1, maximum=10):
    return {"kind": "integer", "default": default, "min": minimum, "max": maximum}


def boolean(default):
    return {"kind": "boolean", "default": default}


# Technology variants share semantic rules and configuration, not real-world guarantees.
GROUPS = [
    ("cdn", "CDN", {}, [("generic-cdn", "Generic CDN"), ("cloudflare", "Cloudflare"), ("cloudfront", "AWS CloudFront")]),
    ("client", "Client", {}, [("generic-client", "Generic client"), ("browser", "Web browser"), ("android", "Android"), ("ios", "iOS")]),
    ("load_balancer", "Load balancer", {}, [("generic-balancer", "Generic load balancer"), ("nginx", "NGINX")]),
    ("application", "Application service", {"instances": integer(1)}, [("service", "Generic application"), ("nodejs", "Node.js"), ("django", "Django"), ("spring", "Spring Boot")]),
    ("cache", "Cache", {"memoryMB": {"kind": "enum", "default": 128, "values": [128, 256, 512]}}, [("generic-cache", "Generic cache"), ("redis", "Redis"), ("memcached", "Memcached"), ("elasticache", "Amazon ElastiCache")]),
    ("relational_database", "Relational database", {"persistent": boolean(True)}, [("generic-sql", "Generic relational database"), ("postgresql", "PostgreSQL"), ("mysql", "MySQL"), ("oracle", "Oracle Database"), ("rds", "Amazon RDS")]),
    ("nonrelational_database", "NoSQL database", {"persistent": boolean(True)}, [("generic-nosql", "Generic NoSQL database"), ("mongodb", "MongoDB"), ("dynamodb", "Amazon DynamoDB"), ("cassandra", "Apache Cassandra")]),
    ("queue", "Message queue", {"durable": boolean(False)}, [("generic-queue", "Generic message queue"), ("rabbitmq", "RabbitMQ"), ("kafka", "Apache Kafka"), ("sqs", "Amazon SQS")]),
    ("worker", "Background worker", {"instances": integer(1), "ackAfterProcessing": boolean(False)}, [("generic-worker", "Generic background worker"), ("celery", "Celery"), ("sidekiq", "Sidekiq"), ("lambda", "AWS Lambda")]),
]
DESCRIPTIONS = {
    "cdn": "Delivers content from edge locations and forwards origin requests. Connect client → CDN → application or load balancer. Cache hits, memory, latency and throughput are not modeled; a CDN does not replace the lesson cache.",
    "client": "Starts application requests.",
    "load_balancer": "Routes requests across application instances.",
    "application": "One homogeneous service tier; lesson constants determine capacity.",
    "cache": "A read cache; the catalog lesson assigns synthetic hit ratios to memory sizes.",
    "relational_database": "Structured storage with a simplified persistence setting. RDS represents a managed relational service, not a database engine.",
    "nonrelational_database": "Non-relational storage with a simplified persistence setting.",
    "queue": "Buffers jobs for workers. Kafka is modeled only as a delivery queue in these lessons.",
    "worker": "Processes jobs. Lambda represents a worker role; instance and acknowledgment settings are lesson abstractions.",
}
COMPONENTS = [
    {"type": kind, "title": title, "technology": tech, "technologyTitle": name, "icon": tech,
     "description": DESCRIPTIONS[kind], "configuration": config}
    for kind, title, config, variants in GROUPS for tech, name in variants
]
DATABASE_TYPES = {"relational_database", "nonrelational_database"}
CONNECTIONS = [
    ("client", "cdn", "request"), ("cdn", "application", "request"), ("cdn", "load_balancer", "request"),
    ("client", "application", "request"), ("client", "load_balancer", "request"),
    ("load_balancer", "application", "request"), ("application", "cache", "read"),
    ("application", "queue", "publish"), ("queue", "worker", "consume"),
] + [("application", t, op) for t in sorted(DATABASE_TYPES) for op in ("read", "write")] + [("worker", t, "write") for t in sorted(DATABASE_TYPES)]


def catalog():
    return {"version": CATALOG_VERSION, "schemaVersion": SCHEMA_VERSION, "components": COMPONENTS,
            "connections": [{"source": s, "target": t, "operation": o} for s, t, o in CONNECTIONS],
            "limits": {"nodes": 50, "edges": 100, "payloadBytes": 131072}}
