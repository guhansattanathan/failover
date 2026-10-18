"""Strict JSON graph validation, independent of Django and infrastructure."""
import math
import re
from copy import deepcopy
from .catalog import COMPONENTS, CONNECTIONS, SCHEMA_VERSION


class GraphError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise GraphError(message)


def keys(value, allowed, required, name):
    require(isinstance(value, dict), f"{name} must be an object.")
    require(set(value) <= set(allowed), f"{name} contains unsupported fields.")
    require(set(required) <= set(value), f"{name} is missing required fields.")


def identifier(value):
    return isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value)


def finite(value, limit=100000):
    return type(value) in (int, float) and math.isfinite(value) and abs(value) <= limit


def validate_viewport(viewport):
    keys(viewport, ("x", "y", "zoom"), ("x", "y", "zoom"), "viewport")
    require(finite(viewport["x"]) and finite(viewport["y"]) and finite(viewport["zoom"]) and 0.1 <= viewport["zoom"] <= 4, "Invalid viewport coordinates or zoom.")
    return viewport


def validate_graph(value):
    keys(value, ("schemaVersion", "nodes", "edges"), ("schemaVersion", "nodes", "edges"), "graph")
    require(type(value["schemaVersion"]) is int and value["schemaVersion"] == SCHEMA_VERSION, "Unsupported graph schema version.")
    require(isinstance(value["nodes"], list) and len(value["nodes"]) <= 50, "Graph must have at most 50 nodes.")
    require(isinstance(value["edges"], list) and len(value["edges"]) <= 100, "Graph must have at most 100 edges.")
    graph = deepcopy(value)
    nodes = {}
    for n in graph["nodes"]:
        keys(n, ("id", "type", "technology", "label", "position", "configuration"), ("id", "type", "technology", "label", "position", "configuration"), "node")
        require(identifier(n["id"]) and n["id"] not in nodes, "Node IDs must be unique, 1–64 letters, numbers, underscores or hyphens.")
        require(isinstance(n["label"], str) and 1 <= len(n["label"].strip()) <= 80, "Node labels must contain 1–80 characters.")
        entry = next((c for c in COMPONENTS if c["type"] == n["type"] and c["technology"] == n["technology"]), None)
        require(entry is not None, "Unknown component type or technology.")
        keys(n["position"], ("x", "y"), ("x", "y"), "position")
        require(all(finite(x) for x in n["position"].values()), "Invalid node position.")
        specs = entry["configuration"]
        keys(n["configuration"], specs, (), "configuration")
        for key, spec in specs.items():
            v = n["configuration"].get(key, spec["default"])
            valid = ((spec["kind"] == "boolean" and type(v) is bool)
                     or (spec["kind"] == "integer" and type(v) is int and spec["min"] <= v <= spec["max"])
                     or (spec["kind"] == "enum" and type(v) is int and v in spec["values"]))
            require(valid, f"Invalid {key} for {n['label']}.")
            n["configuration"][key] = v
        nodes[n["id"]] = n
    ids, triples = set(), set()
    adjacency = {n: [] for n in nodes}
    for e in graph["edges"]:
        keys(e, ("id", "source", "target", "operation"), ("id", "source", "target", "operation"), "edge")
        require(identifier(e["id"]) and e["id"] not in ids, "Edge IDs must be unique and valid.")
        require(identifier(e["source"]) and identifier(e["target"]) and e["source"] in nodes and e["target"] in nodes, "Edge endpoints must exist.")
        require(isinstance(e["operation"], str), "Edge operation must be text.")
        require(e["source"] != e["target"], "Self-loops are not supported.")
        triple = (e["source"], e["target"], e["operation"])
        require(triple not in triples, "Exact duplicate connections are not supported.")
        require((nodes[e["source"]]["type"], nodes[e["target"]]["type"], e["operation"]) in CONNECTIONS, "Unsupported direction or operation for this connection.")
        adjacency[e["source"]].append(e["target"])
        ids.add(e["id"])
        triples.add(triple)
    visited, active = set(), set()

    def visit(n):
        require(n not in active, "Cycles are not supported in this one-way teaching graph.")
        if n in visited:
            return
        active.add(n)
        for target in adjacency[n]:
            visit(target)
        active.remove(n)
        visited.add(n)
    for n in nodes:
        visit(n)
    return graph
