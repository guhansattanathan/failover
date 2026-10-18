"""Immutable lesson definitions; passing architectures live only in tests."""
COMMON = ["One application node is one homogeneous service tier. Unrelated nodes never contribute capacity.",
          "Only request, read, write, publish and queue-to-worker consume arrows are supported. No response arrows or cycles.",
          "Synthetic lesson constants, not real measurements or production certification. Persistence and durability are simplified settings."]
LESSONS = [
    {"slug": "url-shortener", "title": "URL shortener", "difficulty": "Easy", "summary": "Keep links available when an application instance fails.",
     "prompt": "Design a service that creates short links and redirects users. Preserve links through application restarts and handle 1,500 requests/second after one application instance fails.",
     "constraints": ["Exactly one client and one application tier.", "Client → load balancer → application, using request edges.", "Application reads and writes the same persistent database; either database type is accepted.", "Surviving capacity: (instances − 1) × 1,000 ≥ 1,500 requests/second."],
     "assumptions": COMMON + ["Each application instance handles 1,000 requests/second. Only one application-instance failure is modeled.", "Database capacity/failure, load balancer failure and network failure are outside this model. Extra components do not improve the score."],
     "parameters": {"appCapacity": 1000, "requiredRps": 1500, "failedInstances": 1},
     "rules": ["topology", "request_path", "storage", "surviving_capacity"]},
    {"slug": "notification-service", "title": "Asynchronous notification service", "difficulty": "Medium", "summary": "Buffer a burst of jobs and drain the backlog reliably.",
     "prompt": "Accept notification jobs for background processing. Absorb 500 jobs/second for 60 seconds, retain queued jobs through a queue restart, and clear the backlog within 120 seconds after the burst ends.",
     "constraints": ["Exactly one client, application tier, queue and worker tier.", "Client reaches the application directly or through a load balancer, using request edges.", "Application → queue (publish) → worker (consume). Queue must be durable.", "Worker acknowledges after successful processing and writes to a persistent database of either type.", "Backlog / worker capacity ≤ 120 seconds; worker instances must be 1–10."],
     "assumptions": COMMON + ["Each worker instance processes 100 jobs/second, including during the burst. No new jobs arrive afterward.", "worker_capacity = instances × 100; backlog = max(0, (500 − worker_capacity) × 60); drain_seconds = backlog / worker_capacity.", "Queue storage is sufficient. API and database capacity are outside the model. These checks do not prove exactly-once delivery or complete real-world durability."],
     "parameters": {"workerCapacity": 100, "burstRate": 500, "burstSeconds": 60, "drainLimit": 120},
     "rules": ["topology", "request_path", "pipeline", "durability", "processing", "drain_time"]},
    {"slug": "product-catalog", "title": "Read-heavy product catalog", "difficulty": "Medium", "summary": "Use a cache to protect persistent storage from read traffic.",
     "prompt": "Serve 10,000 product reads/second and 100 writes/second. Use caching to keep database demand within capacity while retaining persistent product data.",
     "constraints": ["Exactly one client, application tier, Redis cache and database (either type).", "Client reaches the application directly or through a load balancer, using request edges.", "Application reads the cache and reads/writes the same persistent database.", "Application capacity: instances × 2,000 ≥ 10,100 requests/second.", "Database load: 10,000 × (1 − assumed hit ratio) + 100 ≤ 2,000 operations/second."],
     "assumptions": COMMON + ["For this fixed dataset: 128 / 256 / 512 MB implies synthetic hit ratios of 50% / 80% / 90%.", "A connected Redis cache models cache-aside behavior. Database reads represent misses; writes go to the database.", "Cache capacity is sufficient. Cache failure and invalidation correctness are ungraded follow-up topics."],
     "parameters": {"appCapacity": 2000, "reads": 10000, "writes": 100, "dbCapacity": 2000, "hitRatios": {"128": 0.5, "256": 0.8, "512": 0.9}},
     "rules": ["topology", "request_path", "data_paths", "persistence", "app_capacity", "database_load"]},
]
# New frozen lessons permit one optional CDN hop; historical definitions keep their old rules.
for definition in LESSONS:
    definition["parameters"]["allowCdn"] = True
    definition["constraints"].append("An optional CDN may sit between the client and application or load balancer, using request edges. URL shortener still requires a load balancer.")
    definition["assumptions"].append("CDN cache hits, latency, capacity and failure are not modeled. CDN use does not reduce graded traffic or replace the application cache.")
MODEL_VERSION = 2


def lesson(slug):
    return next(l for l in LESSONS if l["slug"] == slug)
