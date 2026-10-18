import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { LandingHero } from './LandingHero';
import { api, message } from './api';
import type { Challenge } from './types';

export function CatalogPage() {
  const [items, setItems] = useState<Challenge[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let current = true; setError(''); api<Challenge[]>('/challenges').then(v => { if (current) setItems(v); }).catch(e => { if (current) setError(message(e)); }); return () => { current = false; }; }, [attempt]);
  return <main className="landing-page"><LandingHero/><section className="catalog-shell" id="challenges" aria-label="Practice challenges"><div className="section-heading"><div><p className="eyebrow">PRACTICE LIBRARY</p><h2>Three systems. Different tradeoffs.</h2></div><span className="muted">{items ? `${items.filter(c => c.completed).length} / ${items.length} completed` : 'Loading lessons…'}</span></div>
    {error && <div className="notice error" role="alert">{error}<button onClick={() => setAttempt(v => v + 1)}>Retry loading</button></div>}
    {!items && !error && <div className="skeleton" role="status">Loading challenges…</div>}
    {items?.length === 0 && <div className="notice">No challenges are available. Run the backend seed command.</div>}
    <div className="challenge-list">{items?.map((c, i) => <Link className="challenge-row" to={`/challenges/${c.slug}`} key={c.slug}><span className="lesson-number">0{i + 1}</span><div className="lesson-text"><div className="lesson-title"><h3>{c.title}</h3><span className={`difficulty ${c.difficulty.toLowerCase()}`}>{c.difficulty}</span></div><p>{c.summary}</p></div><span className="lesson-state">{c.completed ? <><CheckCircle2 size={16}/> Completed</> : 'Open / resume'}</span><ArrowRight size={18}/></Link>)}</div>
    </section><section className="how-section" id="how-it-works"><p className="eyebrow">FROM A BLANK CANVAS TO A BETTER ANSWER</p><h2>Work through the decisions.</h2><ol><li><span>01 / Read</span><h3>Start with the constraints.</h3><p>Every challenge states its traffic, failure conditions, and model assumptions.</p></li><li><span>02 / Build</span><h3>Give each component a job.</h3><p>Connect clients, services, storage, and queues. Configure the parts that matter.</p></li><li><span>03 / Revise</span><h3>See where the design falls short.</h3><p>Submit your architecture, inspect each check, and improve your next attempt.</p></li></ol></section><footer className="catalog-footer landing-footer"><span>Multiple architectures can pass. Every check is explicit.</span><span>Local demo · Synthetic lesson models</span></footer></main>;
}
