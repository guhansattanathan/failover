from copy import deepcopy
import pytest
from core.catalog import CONNECTIONS
from core.evaluator import evaluate
from core.lessons import LESSONS, lesson
from core.validation import validate_graph, GraphError
from tests.fixtures import passing, node


@pytest.mark.parametrize("slug", [l["slug"] for l in LESSONS])
@pytest.mark.parametrize("database", ["postgresql", "mysql", "mongodb"])
def test_all_passing_alternatives(slug, database):
    g = passing(slug, database)
    before = deepcopy(g)
    r = evaluate(g, lesson(slug))
    assert r["passed"] and r["score"] == 100
    assert r == evaluate(g, deepcopy(lesson(slug)))
    assert g == before
    assert all(x["observed"] and x["hint"] and x["expected"] and "nodeIds" in x for x in r["rules"])


CASES = [
    ("url-shortener", "topology", "extra", "client", None),
    ("url-shortener", "request_path", "disconnect", "client", None),
    ("url-shortener", "storage", "config", "db", ("persistent", False)),
    ("url-shortener", "storage", "remove_op", "app", "read"),
    ("url-shortener", "storage", "remove_op", "app", "write"),
    ("url-shortener", "surviving_capacity", "config", "app", ("instances", 2)),
    ("notification-service", "topology", "extra", "queue", None),
    ("notification-service", "request_path", "disconnect", "client", None),
    ("notification-service", "pipeline", "remove_op", "app", "publish"),
    ("notification-service", "pipeline", "remove_op", "queue", "consume"),
    ("notification-service", "durability", "config", "queue", ("durable", False)),
    ("notification-service", "processing", "config", "worker", ("ackAfterProcessing", False)),
    ("notification-service", "processing", "config", "db", ("persistent", False)),
    ("notification-service", "processing", "remove_op", "worker", "write"),
    ("notification-service", "drain_time", "config", "worker", ("instances", 1)),
    ("product-catalog", "topology", "extra", "cache", None),
    ("product-catalog", "request_path", "disconnect", "client", None),
    ("product-catalog", "data_paths", "disconnect", "cache", None),
    ("product-catalog", "data_paths", "remove_op", "app", "write"),
    ("product-catalog", "persistence", "config", "db", ("persistent", False)),
    ("product-catalog", "app_capacity", "config", "app", ("instances", 5)),
    ("product-catalog", "database_load", "config", "cache", ("memoryMB", 256)),
]


@pytest.mark.parametrize("slug,rule,change,id,value", CASES)
def test_each_required_rule_fails_with_actionable_evidence(slug, rule, change, id, value):
    g = passing(slug)
    n = next(n for n in g["nodes"] if n["id"] == id)
    if change == "extra":
        g["nodes"].append({**deepcopy(n), "id": "extra"})
    elif change == "disconnect":
        g["edges"] = [e for e in g["edges"] if e["source"] != id and e["target"] != id]
    elif change == "remove_op":
        g["edges"] = [e for e in g["edges"] if not (e["source"] == id and e["operation"] == value)]
    else:
        n["configuration"][value[0]] = value[1]
    result = evaluate(g, lesson(slug))
    assert not next(r for r in result["rules"] if r["ruleId"] == rule)["passed"]
    assert not result["passed"] and result["score"] < 100


@pytest.mark.parametrize("slug", [l["slug"] for l in LESSONS])
def test_disconnected_nodes_do_not_satisfy_rules(slug):
    g = passing(slug); g["edges"] = []
    results = evaluate(g, lesson(slug))["rules"]
    assert all(not r["passed"] for r in results if r["ruleId"] != "topology")


@pytest.mark.parametrize("slug", ["notification-service", "product-catalog"])
def test_optional_load_balancer_is_valid(slug):
    g = passing(slug); g["nodes"].append(node("lb", "nginx")); g["edges"][0]["target"] = "lb"
    g["edges"].append({"id": "lb-app", "source": "lb", "target": "app", "operation": "request"})
    assert evaluate(g, lesson(slug))["passed"]


def test_boundaries():
    g = passing("url-shortener")
    l = deepcopy(lesson("url-shortener")); l["parameters"]["requiredRps"] = 2000
    assert evaluate(g, l)["passed"]
    l["parameters"]["requiredRps"] = 2001
    assert not evaluate(g, l)["passed"]
    g = passing("notification-service")
    l = deepcopy(lesson("notification-service")); l["parameters"]["burstRate"] = 600
    assert evaluate(g, l)["passed"]
    l["parameters"]["burstRate"] = 601
    assert not evaluate(g, l)["passed"]
    next(n for n in g["nodes"] if n["id"] == "worker")["configuration"]["instances"] = 10
    assert "drain = 0.0 seconds" in evaluate(g, l)["rules"][-1]["observed"]
    g = passing("product-catalog")
    l = deepcopy(lesson("product-catalog")); l["parameters"]["dbCapacity"] = 1100
    assert evaluate(g, l)["passed"]
    l["parameters"]["dbCapacity"] = 1099
    assert not evaluate(g, l)["passed"]
    l["parameters"]["dbCapacity"] = 2000; l["parameters"]["appCapacity"] = 1683
    assert not evaluate(g, l)["passed"]
    l["parameters"]["appCapacity"] = 1684
    assert evaluate(g, l)["passed"]


@pytest.mark.parametrize("mutation", [
    lambda g: g["nodes"][2]["configuration"].update(instances=0),
    lambda g: g["nodes"][2]["configuration"].update(instances=11),
    lambda g: g["nodes"][2]["configuration"].update(instances=True),
    lambda g: g["nodes"][2]["configuration"].update(instances=2.5),
    lambda g: g["nodes"][2]["configuration"].update(capacity=999999),
    lambda g: g["nodes"][3]["configuration"].update(persistent="true"),
    lambda g: g["nodes"][0].update(technology="unknown"),
    lambda g: g["nodes"][0].update(label="x" * 81),
    lambda g: g["nodes"][0].update(id=[]),
    lambda g: g["nodes"][0]["position"].update(x=float("nan")),
    lambda g: g["nodes"].append(deepcopy(g["nodes"][0])),
    lambda g: g["edges"][0].update(target="missing"),
    lambda g: g["edges"][0].update(source="lb", target="client"),
    lambda g: g["edges"][0].update(target="client"),
    lambda g: g["edges"][0].update(operation=[]),
    lambda g: g["edges"].append({**g["edges"][0], "id": "duplicate"}),
    lambda g: g.update(schemaVersion=True),
    lambda g: g.update(scoringRules=[]),
    lambda g: g.update(nodes=g["nodes"] * 13),
    lambda g: g.update(edges=g["edges"] * 26),
])
def test_invalid_graphs_rejected(mutation):
    g = passing("url-shortener"); mutation(g)
    with pytest.raises(GraphError): validate_graph(g)


def test_cycle_guard_even_if_future_catalog_allows_reverse(monkeypatch):
    monkeypatch.setattr("core.validation.CONNECTIONS", CONNECTIONS + [("application", "client", "request")])
    g = passing("product-catalog")
    g["edges"].append({"id": "cycle", "source": "app", "target": "client", "operation": "request"})
    with pytest.raises(GraphError, match="Cycles"): validate_graph(g)


def test_storage_must_use_same_database():
    g = passing("url-shortener"); g["nodes"].append(node("other", "mongodb")); g["edges"][-1]["target"] = "other"
    assert not evaluate(g, lesson("url-shortener"))["passed"]


def test_zero_workers_and_unknown_cache_size_rejected():
    g = passing("notification-service"); g["nodes"][3]["configuration"]["instances"] = 0
    with pytest.raises(GraphError): validate_graph(g)
    g = passing("product-catalog"); g["nodes"][2]["configuration"]["memoryMB"] = 1024
    with pytest.raises(GraphError): validate_graph(g)


def test_empty_graph_is_valid_but_fails_every_rule():
    for l in LESSONS:
        result = evaluate({"schemaVersion": 1, "nodes": [], "edges": []}, l)
        assert result["score"] == 0 and not result["passed"]

@pytest.mark.parametrize('kind', ['client', 'load_balancer', 'application', 'cache', 'relational_database', 'nonrelational_database', 'queue', 'worker'])
def test_technology_variants_keep_semantic_grading(kind):
    from core.catalog import COMPONENTS
    from core.validation import validate_graph
    from core.lessons import LESSONS
    from tests.fixtures import passing
    from core.evaluator import evaluate
    for entry in [c for c in COMPONENTS if c['type'] == kind]:
        slug = 'notification-service' if kind in ('queue', 'worker') else 'product-catalog' if kind == 'cache' else 'url-shortener'
        graph = passing(slug, 'mongodb' if kind == 'nonrelational_database' else 'postgresql')
        node = next(n for n in graph['nodes'] if n['type'] == kind)
        node['technology'] = entry['technology']
        normalized = validate_graph(graph)
        lesson = next(c for c in LESSONS if c['slug'] == slug)
        assert evaluate(normalized, lesson)['passed'], entry['technology']
