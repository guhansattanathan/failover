import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GitBranch } from 'lucide-react';
import { api, message } from './api';
import type { Challenge } from './types';

export function CatalogPage() {
  const [items, setItems] = useState<Challenge[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let current = true; setError(''); api<Challenge[]>('/challenges').then(v => { if (current) setItems(v); }).catch(e => { if (current) setError(message(e)); }); return () => { current = false; }; }, [attempt]);
  return <main className="catalog-shell"><div className="catalog-intro"><div><p className="eyebrow">THE ARCHITECTURE WORKBENCH</p><h1>Build a design.<br />Understand its limits.</h1><p className="intro-copy">Turn system requirements into connected architectures.<br />Test your decisions, understand the feedback, and try again.</p></div><div className="loop-diagram" aria-label="Read, assemble, evaluate, revise"><GitBranch size={22}/><span>Read the requirements</span><span>↓</span><span>Assemble your architecture</span><span>↓</span><strong>Evaluate. Understand. Revise.</strong></div></div><div className="section-heading"><div><p className="eyebrow">PRACTICE LIBRARY</p><h2>Three systems. Different tradeoffs.</h2></div><span className="muted">{items ? `${items.filter(c => c.completed).length} / ${items.length} completed` : 'Loading lessons…'}</span></div>
    {error && <div className="notice error" role="alert">{error}<button onClick={() => setAttempt(v => v + 1)}>Retry loading</button></div>}
    {!items && !error && <div className="skeleton" role="status">Loading challenges…</div>}
    {items?.length === 0 && <div className="notice">No challenges are available. Run the backend seed command.</div>}
    <div className="challenge-list">{items?.map((c, i) => <Link className="challenge-row" to={`/challenges/${c.slug}`} key={c.slug}><span className="lesson-number">0{i + 1}</span><div className="lesson-text"><div className="lesson-title"><h3>{c.title}</h3><span className={`difficulty ${c.difficulty.toLowerCase()}`}>{c.difficulty}</span></div><p>{c.summary}</p></div><span className="lesson-state">{c.completed ? <><CheckCircle2 size={16}/> Completed</> : 'Open / resume'}</span><ArrowRight size={18}/></Link>)}</div>
    <footer className="catalog-footer"><span>Multiple architectures can pass. Every check is explicit.</span><span>Synthetic lesson models · No cloud credentials required</span></footer></main>;
}
