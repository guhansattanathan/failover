import { useEffect, useRef } from 'react';
import { ArrowDown } from 'lucide-react';

function Server({ x, name }: { x: number; name: string }) {
  return <g transform={`translate(${x - 45} 293)`}>
    <path d="M0 18 45 0l45 18-45 18Z" fill="#b8d1bb" stroke="#183f3b" strokeWidth="2"/>
    <path d="M0 18v86l45 20V36Z" fill="#729e8e" stroke="#183f3b" strokeWidth="2"/>
    <path d="M45 36 90 18v86l-45 20Z" fill="#3f7567" stroke="#183f3b" strokeWidth="2"/>
    {[42, 66, 90].map(y => <g key={y}><path d={`M8 ${y}l28 12m-28 -5 17 8`} stroke="#dce8d3" strokeWidth="3"/><circle cx="75" cy={y + 3} r="3" fill="#e4c88d"/></g>)}
    <text x="45" y="148" textAnchor="middle">{name}</text>
  </g>;
}
function Database({ x, name, replica = false }: { x: number; name: string; replica?: boolean }) {
  return <g transform={`translate(${x - 46} 500)`}>
    <g stroke="#284d40" strokeWidth="2"><path d="M0 15v65c0 22 92 22 92 0V15Z" fill={replica ? '#719b89' : '#9ab99d'}/><ellipse cx="46" cy="15" rx="46" ry="16" fill={replica ? '#a0bdac' : '#c5d5b5'}/><path d="M0 43c0 22 92 22 92 0M0 65c0 22 92 22 92 0" fill="none"/></g>
    <text x="46" y="118" textAnchor="middle">{name}</text>
  </g>;
}

export function LandingHero() {
  const illustration = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { if (preference.matches) { illustration.current?.pauseAnimations(); illustration.current?.setCurrentTime(0); } else illustration.current?.unpauseAnimations(); };
    sync(); preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  return <section className="landing-hero" aria-labelledby="hero-title"><div className="hero-layout">
    <div className="hero-copy"><p className="hero-kicker">A place to think in systems.</p><h1 id="hero-title">One server down.<br/><em>Does your design hold?</em></h1><p className="hero-description">Connect the pieces. Make the tradeoffs.<br/>Practice system design with feedback you can act on.</p><a className="hero-cta" href="#challenges">Choose a challenge <ArrowDown size={16}/></a></div>
    <div className="hero-playground">
      <svg ref={illustration} className="hero-architecture" viewBox="0 0 560 650" role="img" aria-label="Client requests alternate through a load balancer to two application servers. Both write to the primary database, which replicates to a replica database.">
        <defs>
          <marker id="hero-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="none" stroke="#779c88" strokeWidth="1.3"/></marker>
          <path id="hero-request-left" d="M280 106V232Q280 252 260 252H160Q140 252 140 272V462Q140 480 140 500V550H420"/>
          <path id="hero-request-right" d="M280 106V232Q280 252 300 252H400Q420 252 420 272V451Q420 469 402 469H158Q140 469 140 487V550H420"/>
        </defs>
        <g className="hero-diagram-lines" fill="none" stroke="#779c88" strokeWidth="2" markerEnd="url(#hero-arrow)">
          <path d="M280 106V175"/>
          <path d="M280 226v6q0 20-20 20H160q-20 0-20 20v20"/>
          <path d="M280 226v6q0 20 20 20H400q20 0 20 20v20"/>
          <path d="M140 417v82"/>
          <path d="M420 417v34q0 18-18 18H158q-18 0-18 18v12"/>
          <path d="M188 550H371" strokeDasharray="5 6"/>
        </g>
        <g className="hero-packets" fill="#f0d297">
          <circle r="5" data-route="left"><animateMotion dur="12s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.5;1"><mpath href="#hero-request-left"/></animateMotion><animate attributeName="opacity" values="1;0;0" keyTimes="0;0.5;1" calcMode="discrete" dur="12s" repeatCount="indefinite"/></circle>
          <circle r="5" data-route="right"><animateMotion dur="12s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1" keyTimes="0;0.5;1"><mpath href="#hero-request-right"/></animateMotion><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" calcMode="discrete" dur="12s" repeatCount="indefinite"/></circle>
        </g>
        <g transform="translate(234 20)">
          <rect width="92" height="62" rx="5" fill="#90b09b" stroke="#274d40" strokeWidth="2"/><rect x="6" y="6" width="80" height="45" rx="2" fill="#d9e2cc"/><path d="m34 21-8 7 8 7m24-14 8 7-8 7m-16 3 7-20" fill="none" stroke="#557e6c" strokeWidth="2"/><path d="M40 62v15H27v7h38v-7H52V62" fill="#90b09b"/>
          <text x="115" y="35">CLIENT</text>
        </g>
        <g transform="translate(234 172)">
          <path d="M0 14 46 0l46 14-46 16Z" fill="#c5d5b5"/><path d="M0 14v24l46 17V30Z" fill="#87a78d"/><path d="m46 30 46-16v24L46 55Z" fill="#557c66"/>
          <path d="M29 13h34m-5-4 5 4-5 4m-24-8-5 4 5 4" fill="none" stroke="#3a6150" strokeWidth="2"/>
          <text x="115" y="27">LOAD BALANCER</text>
        </g>
        <Server x={140} name="SERVER 01"/><Server x={420} name="SERVER 02"/>
        <Database x={140} name="PRIMARY DATABASE"/><Database x={420} name="REPLICA DATABASE" replica/>
        <text x="280" y="538" textAnchor="middle" className="replication-label">REPLICATION</text>
      </svg>
    </div>
  </div></section>;
}
