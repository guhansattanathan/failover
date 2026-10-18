"""Deterministic rule functions over normalized graphs and frozen lesson parameters."""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from .catalog import DATABASE_TYPES
from .validation import validate_graph

EVALUATOR_VERSION = "1.0.0"


@dataclass
class Context:
    graph: dict
    lesson: dict

    def of(self, kind):
        return [n for n in self.graph["nodes"] if n["type"] in DATABASE_TYPES] if kind == "database" else [n for n in self.graph["nodes"] if n["type"] == kind]

    def one(self, kind):
        values = self.of(kind)
        return values[0] if len(values) == 1 else None

    def edge(self, a, b, operation):
        return bool(a and b and any(e["source"] == a["id"] and e["target"] == b["id"] and e["operation"] == operation for e in self.graph["edges"]))

    def reached(self):
        client, app = self.one("client"), self.one("application")
        origins = [client]
        if self.lesson["parameters"].get("allowCdn"):
            origins += [cdn for cdn in self.of("cdn") if self.edge(client, cdn, "request")]
        via = any(self.edge(origin, lb, "request") and self.edge(lb, app, "request") for origin in origins for lb in self.of("load_balancer"))
        return via if self.lesson["slug"] == "url-shortener" else via or any(self.edge(origin, app, "request") for origin in origins)

    def pipeline(self):
        return self.reached() and self.edge(self.one("application"), self.one("queue"), "publish") and self.edge(self.one("queue"), self.one("worker"), "consume")

    def result(self, rule, title, passed, expected, observed, hint, kinds):
        nodes = [n["id"] for k in kinds for n in self.of(k)]
        edges = [e["id"] for e in self.graph["edges"] if e["source"] in nodes and e["target"] in nodes]
        return {"ruleId": rule, "title": title, "required": True, "passed": bool(passed), "expected": expected,
                "observed": observed, "explanation": "This requirement is satisfied in the lesson model." if passed else "The connected design does not yet satisfy this requirement.",
                "hint": hint, "nodeIds": nodes, "edgeIds": edges}


def topology(c):
    kinds = {"url-shortener": ["client", "application"], "notification-service": ["client", "application", "queue", "worker"], "product-catalog": ["client", "application", "cache", "database"]}[c.lesson["slug"]]
    return c.result("topology", "Required component counts", all(len(c.of(k)) == 1 for k in kinds), "Exactly one of: " + ", ".join(kinds), "; ".join(f"{k}: {len(c.of(k))}" for k in kinds), "Use instances to scale a tier. Remove extra tier nodes or add missing components.", kinds)


def request_path(c):
    return c.result("request_path", "Reach the application", c.reached(), ("Client → optional CDN → load balancer → application" if c.lesson["parameters"].get("allowCdn") else "Client → load balancer → application") if c.lesson["slug"] == "url-shortener" else ("Client → optional CDN → application, directly or via load balancer" if c.lesson["parameters"].get("allowCdn") else "Client → application, directly or via load balancer"), f"Complete request path: {c.reached()}", "Connect the client to the application with request arrows. URL shortener requires a load balancer in that path.", ["client", "cdn", "load_balancer", "application"])


def storage(c):
    app = c.one("application")
    dbs = [d for d in c.of("database") if d["configuration"]["persistent"] and c.edge(app, d, "read") and c.edge(app, d, "write")]
    return c.result("storage", "Keep links in persistent storage", c.reached() and bool(dbs), "A reachable application reads and writes the same persistent database", f"Qualifying databases: {len(dbs)}; application reachable: {c.reached()}", "Add separate read and write arrows to the same database and enable persistent storage.", ["application", "database"])


def surviving_capacity(c):
    app, p = c.one("application"), c.lesson["parameters"]
    count = app["configuration"]["instances"] if app else 0
    capacity = max(0, count - p["failedInstances"]) * p["appCapacity"]
    return c.result("surviving_capacity", "Survive one application failure", c.reached() and capacity >= p["requiredRps"], f"Surviving capacity ≥ {p['requiredRps']:,} requests/second", f"max(0, {count} − {p['failedInstances']}) × {p['appCapacity']:,} = {capacity:,} requests/second; reachable: {c.reached()}", f"After one instance fails, remaining capacity is {capacity:,}; this challenge requires {p['requiredRps']:,}. Increase the connected application instance count.", ["application"])


def pipeline(c):
    return c.result("pipeline", "Deliver jobs to a worker", c.pipeline(), "Reachable application → queue (publish) → worker (consume)", f"Connected pipeline: {c.pipeline()}", "Publish from application to queue; draw consume from queue to worker, not the reverse.", ["application", "queue", "worker"])


def durability(c):
    queue = c.one("queue")
    durable = bool(queue and queue["configuration"]["durable"])
    return c.result("durability", "Retain queued jobs", c.pipeline() and durable, "The connected queue is durable", f"durable: {durable}; pipeline connected: {c.pipeline()}", "Enable Durable on the queue in the connected processing pipeline.", ["queue"])


def processing(c):
    worker = c.one("worker")
    ack = bool(worker and worker["configuration"]["ackAfterProcessing"])
    dbs = [d for d in c.of("database") if d["configuration"]["persistent"] and c.edge(worker, d, "write")]
    return c.result("processing", "Acknowledge after persisting results", c.pipeline() and ack and bool(dbs), "Connected worker acknowledges after success and writes to persistent storage", f"acknowledge after processing: {ack}; connected persistent databases: {len(dbs)}; pipeline: {c.pipeline()}", "Enable acknowledgment after processing and connect a worker write arrow to a persistent database. This does not guarantee exactly-once delivery.", ["worker", "database"])


def drain_time(c):
    worker, p = c.one("worker"), c.lesson["parameters"]
    instances = worker["configuration"]["instances"] if worker else 0
    capacity = instances * p["workerCapacity"]
    backlog = max(0, (p["burstRate"] - capacity) * p["burstSeconds"])
    seconds = backlog / capacity if capacity else None
    return c.result("drain_time", "Clear the burst backlog", c.pipeline() and seconds is not None and seconds <= p["drainLimit"], f"Drain time ≤ {p['drainLimit']} seconds", f"capacity = {instances} × {p['workerCapacity']} = {capacity} jobs/s; backlog = max(0, ({p['burstRate']} − {capacity}) × {p['burstSeconds']}) = {backlog}; drain = {seconds if seconds is not None else 'undefined'} seconds; pipeline: {c.pipeline()}", "Increase instances on the connected worker tier. Workers also process jobs during the burst.", ["queue", "worker"])


def data_paths(c):
    app, cache, db = c.one("application"), c.one("cache"), c.one("database")
    connected = c.reached() and c.edge(app, cache, "read") and c.edge(app, db, "read") and c.edge(app, db, "write")
    return c.result("data_paths", "Connect cache and database operations", connected, "Reachable application reads cache and reads/writes database", f"Complete data paths: {connected}", "Add a cache read arrow plus separate database read (cache miss) and write arrows.", ["application", "cache", "database"])


def persistence(c):
    db, app = c.one("database"), c.one("application")
    persistent = bool(db and db["configuration"]["persistent"])
    connected = c.reached() and c.edge(app, db, "write")
    return c.result("persistence", "Retain product data", persistent and connected, "Persistent database connected to reachable application writes", f"persistent: {persistent}; write path: {connected}", "Enable persistent storage on the database and connect application writes.", ["application", "database"])


def app_capacity(c):
    app, p = c.one("application"), c.lesson["parameters"]
    count = app["configuration"]["instances"] if app else 0
    capacity = count * p["appCapacity"]
    total = p["reads"] + p["writes"]
    return c.result("app_capacity", "Serve reads and writes", c.reached() and capacity >= total, f"Application capacity ≥ {total:,} requests/second", f"{count} × {p['appCapacity']:,} = {capacity:,} requests/second; reachable: {c.reached()}", "Increase instances on the connected application. Include both reads and writes in demand.", ["application"])


def database_load(c):
    app, cache, db, p = c.one("application"), c.one("cache"), c.one("database"), c.lesson["parameters"]
    connected = c.reached() and c.edge(app, cache, "read") and c.edge(app, db, "read") and c.edge(app, db, "write")
    ratio = Decimal(str(p["hitRatios"][str(cache["configuration"]["memoryMB"])])) if cache and connected else Decimal(0)
    load = Decimal(p["reads"]) * (1 - ratio) + p["writes"]
    return c.result("database_load", "Keep database demand within capacity", connected and load <= p["dbCapacity"], f"Database load ≤ {p['dbCapacity']:,} operations/second", f"{p['reads']:,} × (1 − {ratio}) + {p['writes']} = {load:,.0f} operations/second; connected: {connected}", "Increase memory on the connected Redis cache. 128 / 256 / 512 MB assumes 50% / 80% / 90% hits for this dataset only.", ["application", "cache", "database"])


RULES = {f.__name__: f for f in (topology, request_path, storage, surviving_capacity, pipeline, durability, processing, drain_time, data_paths, persistence, app_capacity, database_load)}


def evaluate(graph, lesson):
    c = Context(validate_graph(graph), lesson)
    results = [RULES[r](c) for r in lesson["rules"]]
    required = [r for r in results if r["required"]]
    passed = sum(r["passed"] for r in required)
    score = int((Decimal(100 * passed) / len(required)).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    return {"evaluatorVersion": EVALUATOR_VERSION, "passed": all(r["passed"] for r in required), "score": score, "passedChecks": passed, "totalChecks": len(required), "rules": results}
