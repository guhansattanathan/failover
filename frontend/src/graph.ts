import type { Catalog, Graph, GraphNode } from './types';

export function graphError(graph: Graph, catalog: Catalog): string | null {
  if (graph.nodes.length > 50 || graph.edges.length > 100) return 'Use at most 50 components and 100 connections.';
  const ids = new Set(graph.nodes.map(n => n.id));
  if (ids.size !== graph.nodes.length) return 'Component IDs must be unique.';
  for (const node of graph.nodes) {
    const entry = catalog.components.find(c => c.type === node.type && c.technology === node.technology);
    if (!entry) return 'This component is not in the current catalog.';
    if (!node.label.trim() || node.label.length > 80) return 'Give each component a label of 1–80 characters.';
    for (const [key, value] of Object.entries(node.configuration)) {
      const spec = entry.configuration[key];
      if (!spec) return `Unsupported configuration: ${key}.`;
      if (spec.kind === 'boolean' ? typeof value !== 'boolean' : typeof value !== 'number' || !Number.isInteger(value)) return `Invalid ${key}.`;
      if (spec.kind === 'integer' && (Number(value) < spec.min! || Number(value) > spec.max!)) return `${key} must be ${spec.min}–${spec.max}.`;
      if (spec.kind === 'enum' && !spec.values!.includes(Number(value))) return `Unsupported ${key}.`;
    }
  }
  const triples = new Set<string>();
  for (const edge of graph.edges) {
    const source = graph.nodes.find(n => n.id === edge.source), target = graph.nodes.find(n => n.id === edge.target);
    if (!source || !target) return 'Both ends of a connection must exist.';
    if (source.id === target.id) return 'A component cannot connect to itself.';
    if (!catalog.connections.some(c => c.source === source.type && c.target === target.type && c.operation === edge.operation)) return 'That direction or operation is not supported. Choose a compatible connection.';
    const key = `${edge.source}:${edge.target}:${edge.operation}`;
    if (triples.has(key)) return 'This exact connection already exists. Read and write can use separate arrows.';
    triples.add(key);
  }
  const visited = new Set<string>(), active = new Set<string>();
  function visit(id: string): boolean {
    if (active.has(id)) return false;
    if (visited.has(id)) return true;
    active.add(id);
    for (const edge of graph.edges.filter(e => e.source === id)) if (!visit(edge.target)) return false;
    active.delete(id); visited.add(id); return true;
  }
  if (!graph.nodes.every(n => visit(n.id))) return 'Cycles are not supported in this one-way teaching graph.';
  return null;
}

export const configurationSummary = (n: GraphNode) => {
  if ('instances' in n.configuration) return `${n.configuration.instances} instance${n.configuration.instances === 1 ? '' : 's'}`;
  if ('memoryMB' in n.configuration) return `${n.configuration.memoryMB} MB memory`;
  if ('persistent' in n.configuration) return n.configuration.persistent ? 'Persistent storage' : 'Volatile storage';
  if ('durable' in n.configuration) return n.configuration.durable ? 'Durable queue' : 'Non-durable queue';
  return n.type === 'client' ? 'Request origin' : 'Request routing';
};
