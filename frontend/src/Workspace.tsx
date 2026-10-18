import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import type { Connection, OnConnectEnd, ReactFlowInstance } from '@xyflow/react';
import { ArrowLeft, Check, ChevronDown, CircleHelp, Grid2X2, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { api, ApiError, message } from './api';
import { graphError } from './graph';
import { technologyName } from './componentMetrics';
import { ComponentNode, OperationEdge, DiagramProvider } from './Diagram';
import { ComponentIllustration } from './ComponentIllustration';
import type { DiagramEdge, DiagramNode } from './Diagram';
import { TechnologyPicker } from './TechnologyPicker';
import { TechnologyIcon } from './TechnologyIcon';
import type { Catalog, Challenge, ComponentEntry, Draft, Graph, GraphNode, HistoryPage, Operation, Submission, Viewport } from './types';
import '@xyflow/react/dist/style.css';

const nodeTypes = { component: ComponentNode }, edgeTypes = { operation: OperationEdge };
const labels: Record<string, string> = { instances: 'Instances', memoryMB: 'Cache memory (MB)', persistent: 'Persistent storage', durable: 'Durable queue', ackAfterProcessing: 'Acknowledge after successful processing' };
const emptyGraph: Graph = { schemaVersion: 1, nodes: [], edges: [] };
const defaultViewport = { x: 0, y: 0, zoom: 1 };
const isActive = (s: Submission | null) => !!s && ['pending', 'running'].includes(s.status);

export function Workspace() { const { slug = '' } = useParams(); return <ReactFlowProvider key={slug}><Editor slug={slug}/></ReactFlowProvider>; }

function Editor({ slug }: { slug: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null), [challenge, setChallenge] = useState<Challenge | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdge>([]);
  const [showGrid, setShowGrid] = useState(() => {
    try { return localStorage.getItem('failover.canvas.showGrid') !== 'false'; }
    catch { return true; }
  });
  function toggleGrid() {
    const next = !showGrid;
    setShowGrid(next);
    try { localStorage.setItem('failover.canvas.showGrid', String(next)); } catch { /* Still works when storage is unavailable. */ }
  }
  const [viewport, setViewport] = useState<Viewport>(defaultViewport);
  const [revision, setRevision] = useState(0), [draftReady, setDraftReady] = useState(false), [dirty, setDirty] = useState(false);
  const editVersion = useRef(0), flow = useRef<ReactFlowInstance<DiagramNode, DiagramEdge> | null>(null);
  const [error, setError] = useState(''), [draftError, setDraftError] = useState(''), [loading, setLoading] = useState(true), [loadAttempt, setLoadAttempt] = useState(0);
  const [notice, setNotice] = useState(''), [saving, setSaving] = useState(false), [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null), [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [result, setResult] = useState<Submission | null>(null), [history, setHistory] = useState<HistoryPage | null>(null), [historyPage, setHistoryPage] = useState(1), [historyError, setHistoryError] = useState('');
  const [bottomTab, setBottomTab] = useState<'results' | 'history'>('results'), [leftTab, setLeftTab] = useState<'problem' | 'components'>('problem');
  const [pollEpoch, setPollEpoch] = useState(0), [pollMessage, setPollMessage] = useState('');
  const [source, setSource] = useState(''), [target, setTarget] = useState(''), [operation, setOperation] = useState<Operation>('request');
  const [paletteChoices, setPaletteChoices] = useState<Record<string, string>>({});
  const changed = useCallback(() => { editVersion.current += 1; setDirty(true); setNotice(''); }, []);
  const selectionChanged = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: { nodes: DiagramNode[]; edges: DiagramEdge[] }) => { setSelected(selectedNodes[0]?.id || null); setSelectedEdge(selectedEdges[0]?.id || null); }, []);

  const toGraph = useCallback((): Graph => ({ schemaVersion: 1, nodes: nodes.map(n => ({ ...n.data.component, position: n.position })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, operation: e.data!.operation })) }), [nodes, edges]);
  const installGraph = useCallback((g: Graph, c: Catalog, v: Viewport) => {
    setNodes(g.nodes.map(n => ({ id: n.id, type: 'component', position: n.position, data: { component: n, operations: [...new Set(c.connections.filter(x => x.source === n.type).map(x => x.operation))] } })));
    setEdges(g.edges.map(e => ({ ...e, type: 'operation', sourceHandle: e.operation, data: { operation: e.operation }, markerEnd: { type: MarkerType.ArrowClosed } })));
    setViewport(v); void flow.current?.setViewport(v); setSelected(null); setSelectedEdge(null);
  }, [setNodes, setEdges]);
  const loadHistory = useCallback(async () => {
    try { const h = await api<HistoryPage>(`/challenges/${slug}/submissions?page=${historyPage}`); setHistory(h); setHistoryError(''); }
    catch (e) { setHistoryError(message(e)); }
  }, [slug, historyPage]);

  useEffect(() => { let alive = true; setLoading(true); setError('');
    Promise.all([api<Catalog>('/components'), api<Challenge>(`/challenges/${slug}`)]).then(async ([c, lesson]) => {
      if (!alive) return; setCatalog(c); setChallenge(lesson);
      try { const d = await api<Draft>(`/challenges/${slug}/draft`); if (!alive) return;
        if (![1, 2, c.version].includes(d.catalogVersion)) throw new Error('Saved draft uses an unsupported catalog. Submit a new design or export your work before migrating.');
        installGraph(d.graph, c, d.viewport); setRevision(d.revision); setDraftReady(true); setDirty(false);
      } catch (e) { if (alive) setDraftError(message(e)); }
    }).catch(e => { if (alive) setError(message(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug, installGraph, loadAttempt]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);
  useEffect(() => { const listener = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } }; window.addEventListener('beforeunload', listener); return () => window.removeEventListener('beforeunload', listener); }, [dirty]);

  const activeId = result && isActive(result) ? result.id : null;
  useEffect(() => {
    if (!activeId) return;
    let alive = true, timer = 0; const started = Date.now(); setPollMessage('');
    async function poll() {
      if (Date.now() - started > 120000) { setPollMessage('Still waiting. Your submission is stored. Check services, then refresh status; recovery may take up to 8 minutes.'); return; }
      try { const next = await api<Submission>(`/submissions/${activeId}`); if (!alive) return; setResult(next);
        if (isActive(next)) timer = window.setTimeout(poll, 1500); else void loadHistory();
      } catch (e) { if (alive) setPollMessage(message(e)); }
    }
    timer = window.setTimeout(poll, 700);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [activeId, pollEpoch, loadHistory]);

  function addComponent(entry: ComponentEntry, position?: { x: number; y: number }) {
    if (nodes.length >= 50) { setError('This lesson supports at most 50 components.'); return; }
    const index = nodes.length;
    const n: GraphNode = { id: crypto.randomUUID(), type: entry.type, technology: entry.technology, label: entry.type.includes('database') ? technologyName(entry.technology) : entry.title, position: position || { x: 40 + (index % 3) * 230, y: 70 + Math.floor(index / 3) * 180 }, configuration: Object.fromEntries(Object.entries(entry.configuration).map(([k, s]) => [k, s.default])) };
    setNodes(old => [...old.map(x => ({ ...x, selected: false })), { id: n.id, type: 'component', selected: true, position: n.position, data: { component: n, operations: [...new Set(catalog!.connections.filter(c => c.source === n.type).map(c => c.operation))] } }]);
    setSelected(n.id); setSelectedEdge(null); changed(); setError('');
  }
  function connect(connection: Connection | { source: string; target: string; sourceHandle: string }) {
    if (!catalog || !connection.source || !connection.target) { setError('Select both components.'); return; }
    const edge = { id: crypto.randomUUID(), source: connection.source, target: connection.target, operation: (connection.sourceHandle || operation) as Operation };
    const problem = graphError({ ...toGraph(), edges: [...toGraph().edges, edge] }, catalog);
    if (problem) { setError(problem); return; }
    setEdges(old => [...old, { ...edge, type: 'operation', sourceHandle: edge.operation, data: { operation: edge.operation }, markerEnd: { type: MarkerType.ArrowClosed } }]); changed(); setError('');
  }
  const finishConnection: OnConnectEnd = (event, state) => {
    if (state.isValid || !state.fromNode || !state.fromHandle) return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    const element = document.elementFromPoint(point.clientX, point.clientY)?.closest('.react-flow__node');
    const targetId = element?.getAttribute('data-id');
    if (!targetId) return;
    if (state.fromHandle.type === 'source') {
      connect({ source: state.fromNode.id, target: targetId, sourceHandle: state.fromHandle.id || operation });
    } else {
      setError('Start an arrow from a labeled output on the right, then drop it onto its destination.');
    }
  };
  function chooseTechnology(technology: string) {
    const next = catalog!.components.find(c => c.technology === technology && c.type === activeNode?.data.component.type);
    if (!next || !activeNode) return;
    const old = activeNode.data.component;
    const automaticLabel = old.label === entry?.title || old.label === technologyName(old.technology);
    updateNode({ technology, label: automaticLabel ? (old.type.includes('database') ? technologyName(technology) : next.title) : old.label });
  }
  const activeNode = nodes.find(n => n.id === selected);
  const activeEdge = edges.find(e => e.id === selectedEdge);
  const entry = catalog?.components.find(c => c.technology === activeNode?.data.component.technology && c.type === activeNode?.data.component.type);
  function updateNode(patch: Partial<GraphNode>) { setNodes(old => old.map(n => n.id === selected ? { ...n, data: { ...n.data, component: { ...n.data.component, ...patch } } } : n)); changed(); }
  function removeSelected() { setNodes(old => old.filter(n => n.id !== selected)); setEdges(old => old.filter(e => e.id !== selectedEdge && e.source !== selected && e.target !== selected)); setSelected(null); setSelectedEdge(null); changed(); }
  async function save() {
    if (!catalog) return; const problem = graphError(toGraph(), catalog); if (problem) { setError(problem); return; }
    const version = editVersion.current; setSaving(true); setError('');
    try { const d = await api<Draft>(`/challenges/${slug}/draft`, { method: 'PUT', body: JSON.stringify({ graph: toGraph(), viewport, revision, catalogVersion: catalog.version }) });
      setRevision(d.revision); setDirty(editVersion.current !== version); setNotice('Draft saved'); setDraftError('');
    } catch (e) { setError(message(e)); if (e instanceof ApiError && e.status === 409) setDraftError(message(e)); }
    finally { setSaving(false); }
  }
  async function reloadDraft() {
    if (dirty && !window.confirm('Replace your unsaved canvas with the saved draft?')) return;
    try { const d = await api<Draft>(`/challenges/${slug}/draft`); if (![1, 2, catalog!.version].includes(d.catalogVersion)) throw new Error('Saved draft catalog is incompatible.'); installGraph(d.graph, catalog!, d.viewport); setRevision(d.revision); setDirty(false); setDraftReady(true); setDraftError(''); setError(''); setNotice('Saved draft reloaded'); }
    catch (e) { setDraftError(message(e)); }
  }
  async function submit() {
    const problem = graphError(toGraph(), catalog!); if (problem) { setError(problem); return; }
    setSubmitting(true); setError(''); setPollMessage('');
    try { const s = await api<Submission>(`/challenges/${slug}/submissions`, { method: 'POST', body: JSON.stringify({ graph: toGraph(), challengeVersion: challenge!.version, catalogVersion: catalog!.version }) }); setResult(s); setBottomTab('results'); void loadHistory(); }
    catch (e) { setError(message(e)); } finally { setSubmitting(false); }
  }
  async function retrySubmission() {
    if (!result) return; setSubmitting(true);
    try { const s = await api<Submission>(`/submissions/${result.id}/retry`, { method: 'POST', body: '{}' }); setResult(s); setPollEpoch(v => v + 1); setPollMessage(''); void loadHistory(); }
    catch (e) { setError(message(e)); } finally { setSubmitting(false); }
  }
  function reopen(s: Submission) {
    if (![1, 2, catalog!.version].includes(s.catalogVersion)) { setError('This snapshot needs a catalog migration before editing.'); return; }
    if (dirty && !window.confirm('Replace unsaved edits with this submission snapshot?')) return;
    installGraph(s.graph, catalog!, defaultViewport); changed(); setNotice(`Opened snapshot ${s.id.slice(0, 8)} as an unsaved draft`); setResult(s); setBottomTab('results');
  }
  function reset() { if ((dirty || nodes.length || edges.length) && !window.confirm('Clear this canvas? Save first to keep your current work.')) return; installGraph(emptyGraph, catalog!, defaultViewport); changed(); }

  if (loading) return <main className="workspace-loading" role="status">Loading your workbench…</main>;
  if (!challenge || !catalog) return <main className="catalog-shell"><Link to="/">← Challenges</Link><div className="notice error" role="alert">{error || 'Could not load this challenge.'}<button onClick={() => setLoadAttempt(v => v + 1)}>Retry</button></div></main>;

  const groups = [...new Set(catalog.components.map(c => c.type))].map(type => {
    const choices = catalog.components.filter(c => c.type === type);
    return { choices, chosen: choices.find(c => c.technology === paletteChoices[type]) || choices[0] };
  });

  return <DiagramProvider lesson={challenge}><main className="workspace"><div className="workspace-toolbar"><div className="workspace-title"><Link aria-label="Back to challenges" to="/" onClick={e => { if (dirty && !window.confirm('Leave this page with unsaved edits?')) e.preventDefault(); }}><ArrowLeft size={18}/></Link><div><span className="eyebrow">CHALLENGE / {challenge.difficulty}</span><h1>{challenge.title}</h1></div></div><div className="toolbar-actions"><span className={`save-state ${dirty ? 'unsaved' : ''}`} role="status">{saving ? 'Saving…' : notice || (dirty ? 'Unsaved changes' : `Draft revision ${revision}`)}</span><button onClick={reset} title="Reset canvas"><RotateCcw size={16}/><span>Reset</span></button><button onClick={save} disabled={saving || !draftReady}><Save size={16}/><span>Save draft</span></button><button className="primary" onClick={submit} disabled={submitting}><Send size={16}/>{submitting ? 'Submitting…' : 'Submit design'}</button></div></div>
    <p className="mobile-note">Canvas editing works best on a larger display. Expand panels below to read requirements and feedback.</p>
    {error && <div className="notice error compact" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}
    {draftError && <div className="notice compact" role="alert">{draftError}<button onClick={reloadDraft}>Reload saved draft</button></div>}
    <div className="workbench-grid"><details className="left-panel panel" open><summary>Requirements & components <ChevronDown size={16}/></summary><div className="tabs" aria-label="Left panel"><button className={leftTab === 'problem' ? 'active' : ''} onClick={() => setLeftTab('problem')}>Problem</button><button className={leftTab === 'components' ? 'active' : ''} onClick={() => setLeftTab('components')}>Components <span>{groups.length}</span></button></div>
      {leftTab === 'problem' ? <div className="panel-content problem"><span className="difficulty">{challenge.difficulty} · Lesson {challenge.version}</span><h2>The brief</h2><p>{challenge.prompt}</p><h3>Required checks</h3><ol>{challenge.constraints.map(c => <li key={c}>{c}</li>)}</ol><details className="assumptions" open><summary>Model & assumptions</summary>{challenge.assumptions.map(a => <p key={a}>{a}</p>)}</details><button className="wide" onClick={() => setLeftTab('components')}><Plus size={16}/> Start assembling</button></div> : <div className="panel-content palette"><p className="muted">Drag onto the canvas, or click to add. Select a component to configure it.</p>{groups.map(({ choices, chosen: c }) => <div className="palette-group" key={c.type}>
        <button className="palette-item" draggable onDragStart={e => { e.dataTransfer.setData('application/failover', c.technology); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => addComponent(c)} aria-label={`Add ${c.technology}`}><span className="palette-preview"><ComponentIllustration technology={c.technology}/></span><span><strong>{c.title}</strong><small>Drag or click to add</small></span><Plus size={16}/></button>
        <TechnologyPicker label={`${c.title} technology`} value={c.technology} choices={choices} onChange={technology => setPaletteChoices(old => ({ ...old, [c.type]: technology }))}/>
      </div>)}<p className="palette-footnote">Technology logos identify products. Capacity is defined by the lesson, not the logo.</p></div>}
    </details>
    <section className="canvas-section" aria-label="Architecture canvas"><div className="canvas-caption"><span>ARCHITECTURE</span><div className="canvas-display-controls"><span>{nodes.length} components · {edges.length} connections</span><button className="grid-toggle" type="button" aria-label="Dot grid" aria-pressed={showGrid} title={showGrid ? 'Hide dot grid' : 'Show dot grid'} onClick={toggleGrid}><Grid2X2 size={14}/> Grid <span>{showGrid ? 'On' : 'Off'}</span></button></div></div><div className="canvas" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={e => { e.preventDefault(); const c = catalog.components.find(c => c.technology === e.dataTransfer.getData('application/failover')); if (c && flow.current) addComponent(c, flow.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })); }}>
      <ReactFlow<DiagramNode, DiagramEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={changes => { onNodesChange(changes); if (changes.some(c => ['position', 'remove'].includes(c.type))) changed(); }} onEdgesChange={changes => { onEdgesChange(changes); if (changes.some(c => c.type === 'remove')) changed(); }} onConnect={connect} onConnectEnd={finishConnection} onSelectionChange={selectionChanged} onNodeClick={(_, n) => { setSelected(n.id); setSelectedEdge(null); }} onEdgeClick={(_, e) => { setSelectedEdge(e.id); setSelected(null); }} onPaneClick={() => { setSelected(null); setSelectedEdge(null); }} onInit={instance => { flow.current = instance; void instance.setViewport(viewport); }} onMoveEnd={(_, next) => { if (next.x !== viewport.x || next.y !== viewport.y || next.zoom !== viewport.zoom) { setViewport(next); changed(); } }} defaultViewport={viewport} minZoom={0.1} maxZoom={4} deleteKeyCode={['Backspace', 'Delete']} connectionRadius={36}>
        {showGrid && <Background id="architecture-grid" variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#afbeb5"/>}<Controls showInteractive={false}/>
      </ReactFlow>
      {!nodes.length && <div className="canvas-empty"><div className="empty-glyph"><Plus size={22}/></div><h2>A blank canvas. A clear brief.</h2><p>Add your first component from the palette.<br />Then connect the operations your system needs.</p><button onClick={() => setLeftTab('components')}>Browse components <Plus size={16}/></button></div>}
    </div><div className="canvas-footer"><span>Drag a labeled output onto a component · Select + Delete to remove</span><span>One-way flow</span></div></section>
    <details className="right-panel panel" open><summary>Inspector <ChevronDown size={16}/></summary><div className="panel-content inspector"><p className="eyebrow">CONFIGURATION</p>{activeNode && entry ? <><h2><TechnologyIcon technology={entry.technology}/> {entry.title}</h2><p className="muted">{entry.description}</p><TechnologyPicker label="Component technology" value={entry.technology} choices={catalog.components.filter(c => c.type === entry.type)} onChange={chooseTechnology}/><label>Component label<input value={activeNode.data.component.label} maxLength={80} onChange={e => updateNode({ label: e.target.value })}/></label>{Object.entries(entry.configuration).map(([key, spec]) => <label className={spec.kind === 'boolean' ? 'check-label' : ''} key={key}>{spec.kind === 'boolean' ? <><input type="checkbox" checked={Boolean(activeNode.data.component.configuration[key])} onChange={e => updateNode({ configuration: { ...activeNode.data.component.configuration, [key]: e.target.checked } })}/>{labels[key]}</> : <>{labels[key]}{spec.kind === 'enum' ? <select aria-label={labels[key]} value={Number(activeNode.data.component.configuration[key])} onChange={e => updateNode({ configuration: { ...activeNode.data.component.configuration, [key]: Number(e.target.value) } })}>{spec.values!.map(v => <option key={v} value={v}>{v}</option>)}</select> : <input type="number" min={spec.min} max={spec.max} value={Number(activeNode.data.component.configuration[key])} onChange={e => updateNode({ configuration: { ...activeNode.data.component.configuration, [key]: Number(e.target.value) } })}/>}</>}</label>)}<p className="field-note">Effective values shown, including catalog defaults.</p><button className="danger" onClick={removeSelected}><Trash2 size={16}/> Delete component</button></> : activeEdge ? <><h2>Connection</h2><p>{activeEdge.data?.operation}: {nodes.find(n => n.id === activeEdge.source)?.data.component.label} → {nodes.find(n => n.id === activeEdge.target)?.data.component.label}</p><p className="muted">Delete and reconnect to change the operation.</p><button className="danger" onClick={removeSelected}><Trash2 size={16}/> Delete connection</button></> : <div className="inspector-empty"><CircleHelp size={20}/><h2>Inspect your design</h2><p>Select a component to adjust its configuration, or a connection to remove it.</p></div>}
      <form className="connection-form" onSubmit={e => { e.preventDefault(); connect({ source, target, sourceHandle: operation }); }}><h3>Add a connection</h3><p className="muted">An alternative to dragging handles.</p><label>From<select aria-label="From" value={source} onChange={e => setSource(e.target.value)}><option value="">Choose source</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.data.component.label}</option>)}</select></label><label>Operation<select aria-label="Operation" value={operation} onChange={e => setOperation(e.target.value as Operation)}>{['request', 'read', 'write', 'publish', 'consume'].map(o => <option key={o}>{o}</option>)}</select></label><label>To<select aria-label="To" value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose target</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.data.component.label}</option>)}</select></label><button className="wide" type="submit" disabled={!source || !target}><Plus size={16}/> Connect</button></form>
    </div></details></div>
    <details className="feedback-panel" open><summary>Evaluation & history <ChevronDown size={16}/></summary><div className="feedback-heading"><div className="tabs"><button className={bottomTab === 'results' ? 'active' : ''} onClick={() => setBottomTab('results')}>Evaluation</button><button className={bottomTab === 'history' ? 'active' : ''} onClick={() => { setBottomTab('history'); void loadHistory(); }}>Submission history {history && <span>{history.count}</span>}</button></div><span className="muted">Score = passed required checks / total required checks × 100</span></div>
    {bottomTab === 'results' ? <div className="feedback-content">{!result ? <div className="results-empty"><Check size={20}/><div><h3>Your next decision starts with feedback.</h3><p>Submit a design to see each requirement, the observed evidence, and a practical hint.</p></div></div> : <><div className="result-header"><div><span className={`status-pill ${result.status}`}>{result.status}</span><span className="snapshot-id">Snapshot {result.id.slice(0, 8)} · Lesson v{result.challengeVersion} · Evaluator {result.evaluatorVersion}</span></div><strong>{result.results ? `${result.results.score} / 100 · ${result.results.passedChecks}/${result.results.totalChecks} checks` : isActive(result) ? 'Evaluation in progress…' : 'Evaluation unavailable'}</strong></div><p className="field-note">Results belong to this immutable snapshot. Editing the canvas does not change them.</p>{result.status === 'error' && <div className="notice error" role="alert">{result.errorCategory === 'evaluator_error' ? 'The evaluator encountered an internal error. Check worker logs; this is not a learner failure.' : `Infrastructure failure (${result.errorCategory}). Restore services, then retry the same snapshot.`}{result.canRetry && <button disabled={submitting} onClick={retrySubmission}>Retry evaluation</button>}</div>}{pollMessage && <div className="notice" role="status">{pollMessage}<button onClick={() => setPollEpoch(v => v + 1)}>Refresh status</button></div>}{result.results?.rules.map(rule => <details className={`rule ${rule.passed ? 'passed' : 'failed'}`} key={rule.ruleId} open={!rule.passed}><summary><span className="rule-symbol">{rule.passed ? '✓' : '×'}</span><strong>{rule.title}</strong><span>{rule.passed ? 'Passed' : 'Needs revision'}</span></summary><div className="rule-detail"><p><strong>Expected</strong> {rule.expected}</p><p><strong>Observed</strong> {rule.observed}</p><p>{rule.explanation}</p>{!rule.passed && <p className="hint"><strong>Try this</strong> {rule.hint}</p>}</div></details>)}<p className="field-note">A pass satisfies this lesson’s synthetic model. It is not production certification.</p></>}</div> : <div className="feedback-content">{historyError && <div className="notice error" role="alert">{historyError}<button onClick={loadHistory}>Retry history</button></div>}{!history && !historyError && <p role="status">Loading submission history…</p>}{history?.count === 0 && <p className="muted">No submissions yet. Your first attempt will appear here.</p>}{history?.results.map(s => <div className="history-row" key={s.id}><span className={`status-pill ${s.status}`}>{s.status}</span><div><strong>{new Date(s.createdAt).toLocaleString()}</strong><small>{s.id.slice(0, 8)} · Lesson v{s.challengeVersion}</small></div><strong>{s.results ? `${s.results.score}/100` : '—'}</strong><button onClick={() => { setResult(s); setBottomTab('results'); setPollEpoch(v => v + 1); }}>View results</button><button onClick={() => reopen(s)}>Open as draft</button></div>)}{history && history.count > 10 && <div className="pagination"><button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>Previous</button><span>Page {history.page}</span><button disabled={historyPage * 10 >= history.count} onClick={() => setHistoryPage(p => p + 1)}>Next</button></div>}</div>}</details>
  </main></DiagramProvider>;
}
