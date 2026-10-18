import { createContext, useContext, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { BaseEdge, EdgeLabelRenderer, Handle, Position, useConnection } from '@xyflow/react';
import type { Edge, EdgeProps, Node, NodeProps } from '@xyflow/react';
import { ComponentIllustration } from './ComponentIllustration';
import { componentMetrics, technologyName } from './componentMetrics';
import type { Challenge, GraphNode, Operation } from './types';

const DiagramLessonContext = createContext<Challenge | null>(null);
const HoverContext = createContext<{ activeId: string | null; setActiveId: Dispatch<SetStateAction<string | null>> }>({ activeId: null, setActiveId: () => {} });

export function DiagramProvider({ lesson, children }: { lesson: Challenge; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  return <DiagramLessonContext.Provider value={lesson}><HoverContext.Provider value={{ activeId, setActiveId }}>{children}</HoverContext.Provider></DiagramLessonContext.Provider>;
}

export type DiagramNode = Node<{ component: GraphNode; operations: Operation[] }, 'component'>;
export type DiagramEdge = Edge<{ operation: Operation }, 'operation'>;

export function ComponentNode({ data, selected }: NodeProps<DiagramNode>) {
  const connection = useConnection();
  const n = data.component;
  const lesson = useContext(DiagramLessonContext);
  const hover = useContext(HoverContext);
  const anchor = useRef<HTMLDivElement>(null);
  const connecting = useRef(false);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const metrics = componentMetrics(n, lesson);
  function show() {
    if (connecting.current || connection.inProgress) return;
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(292, window.innerWidth - 24);
    const left = rect.right + width + 16 < window.innerWidth ? rect.right + 12 : Math.max(12, rect.left - width - 12);
    hover.setActiveId(n.id);
    setTip({ left, top: Math.max(12, Math.min(rect.top, window.innerHeight - (135 + metrics.length * 35))) });
  }
  function hide() { setTip(null); hover.setActiveId(id => id === n.id ? null : id); }
  const visible = !connection.inProgress && tip && hover.activeId === n.id;
  return <div ref={anchor} className={`component-node ${selected ? 'selected' : ''} ${connection.inProgress && connection.fromNode.id !== n.id ? 'connection-destination' : ''}`} data-testid={`component-${n.technology}`}
    tabIndex={0} role="button" aria-label={`${n.label}, ${technologyName(n.technology)}. Select to configure.`}
    aria-describedby={visible ? `metrics-${n.id}` : undefined} onMouseEnter={() => { connecting.current = false; show(); }} onMouseLeave={() => { connecting.current = false; hide(); }} onFocus={show} onBlur={hide}
    onPointerDown={e => { if ((e.target as Element).closest('.react-flow__handle')) { connecting.current = true; hide(); } }}
    onKeyDown={e => { if (e.key === 'Escape') { hide(); e.stopPropagation(); } }}>
    {n.type !== 'client' && <Handle type="target" position={Position.Left} aria-label={`${n.label} input`}/>}
    <div className="component-art"><ComponentIllustration technology={n.technology}/></div>
    <strong className="node-name">{n.label}</strong><span className="node-tech">{technologyName(n.technology)}</span>
    {data.operations.map((op, i) => <Handle key={op} type="source" position={Position.Right} id={op} title={op} aria-label={`${n.label} ${op} output`} style={{ top: `${25 + i * 22}%` }}><span className="port-label">{op}</span></Handle>)}
    {visible && createPortal(<div id={`metrics-${n.id}`} role="tooltip" className="component-tooltip" style={tip!}>
      <div className="tooltip-heading"><strong>{n.label}</strong><span>{technologyName(n.technology)}</span></div>
      <dl>{metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>
      <p>Synthetic lesson model. Capacity counts only on valid connected paths.</p>
    </div>, document.body)}
  </div>;
}

export function OperationEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, style, data, selected }: EdgeProps<DiagramEdge>) {
  const op = data?.operation || 'request';
  const offset = op === 'write' ? 28 : op === 'read' ? -15 : 0;
  const midX = (sourceX + targetX) / 2;
  let midY = (sourceY + targetY) / 2 + offset * 1.5;
  const spread = Math.max(70, Math.abs(targetX - sourceX) / 2);
  let path = `M ${sourceX},${sourceY} C ${sourceX + spread},${sourceY + offset * 2} ${targetX - spread},${targetY + offset * 2} ${targetX},${targetY}`;
  if (targetX <= sourceX) {
    // Route backwards-facing connections below the symbols, with a separate lane per operation.
    // Avoid giant Bézier loops outside the viewport or arrows crossing component labels.
    const lane = Math.max(sourceY, targetY) + 120 + (op === 'write' ? 22 : 0);
    const right = sourceX + 26 + (op === 'write' ? 14 : 0), left = targetX - 24;
    path = `M ${sourceX} ${sourceY} H ${right - 8} Q ${right} ${sourceY} ${right} ${sourceY + 8} V ${lane - 8} Q ${right} ${lane} ${right - 8} ${lane} H ${left + 8} Q ${left} ${lane} ${left} ${lane - 8} V ${targetY + 8} Q ${left} ${targetY} ${left + 8} ${targetY} H ${targetX}`;
    midY = lane;
  }
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ ...style, stroke: selected ? '#0f766e' : '#829394', strokeWidth: selected ? 2.5 : 1.5 }}/><EdgeLabelRenderer><div className="edge-label nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)` }}>{op}</div></EdgeLabelRenderer></>;
}
