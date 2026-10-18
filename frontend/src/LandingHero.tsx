import { useEffect, useRef, useState } from 'react';
import { ArrowDown, RotateCcw, Unplug } from 'lucide-react';

function Server({ x, offline = false, name }: { x: number; offline?: boolean; name: string }) {
  return <g transform={`translate(${x} 154)`} className={`hero-server ${offline ? 'is-offline' : ''}`}>
    <path d="M0 18 45 0l45 18-45 18Z" fill="#b8d1bb" stroke="#183f3b" strokeWidth="2"/>
    <path d="M0 18v96l45 20V36Z" fill="#729e8e" stroke="#183f3b" strokeWidth="2"/>
    <path d="M45 36 90 18v96l-45 20Z" fill="#3f7567" stroke="#183f3b" strokeWidth="2"/>
    {[42, 69, 96].map(y => <g key={y}><path d={`M8 ${y}l28 12m-28 -5 17 8`} stroke="#dce8d3" strokeWidth="3"/><circle cx="75" cy={y + 3} r="3" fill={offline ? '#6e7d73' : '#e4c88d'}/></g>)}
    {offline && <g stroke="#eedbb4" strokeWidth="4" strokeLinecap="round"><path d="m22 57 45 35m0-35-45 35"/></g>}
    <text x="45" y="210" textAnchor="middle" fill="#d0dfce" fontSize="12" fontFamily="monospace">{name}{offline ? ' / OFFLINE' : ' / ONLINE'}</text>
  </g>;
}

export function LandingHero() {
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const illustration = useRef<SVGSVGElement>(null);
  useEffect(() => { if (paused) illustration.current?.pauseAnimations(); else illustration.current?.unpauseAnimations(); }, [paused]);
  return <section className={`landing-hero ${paused ? 'motion-paused' : ''}`} aria-labelledby="hero-title">
    <div className="hero-copy"><p className="hero-kicker">A place to think in systems.</p><h1 id="hero-title">One server down.<br/><em>Does your design hold?</em></h1><p className="hero-description">Connect the pieces. Make the tradeoffs.<br/>Practice system design with feedback you can act on.</p><a className="hero-cta" href="#challenges">Choose a challenge <ArrowDown size={16}/></a></div>
    <div className="hero-playground">
      <svg ref={illustration} className="hero-architecture" viewBox="0 0 1200 390" role="img" aria-label={failed ? 'Illustrative architecture: one server offline, two request paths still active' : 'Illustrative architecture: requests routed to three application servers'}>
        <defs><path id="hero-route-a" d="M-30 320H180Q220 320 220 280V135Q220 110 250 110H420Q455 110 455 150V190"/><path id="hero-route-b" d="M-30 320H180Q220 320 220 280V135Q220 110 250 110H600Q635 110 635 150V190"/><path id="hero-route-c" d="M-30 320H180Q220 320 220 280V135Q220 110 250 110H780Q815 110 815 150V190"/></defs>
        <g fill="none" stroke="#30534a" strokeWidth="1"><ellipse cx="630" cy="335" rx="560" ry="70"/><ellipse cx="630" cy="335" rx="440" ry="44"/><path d="M80 380 330 190m790 190L930 190"/></g>
        <path d="M55 392C-70 245 38 242 10 110" fill="none" stroke="#8caf99" strokeWidth="55"/><path d="M1130 400c150-145 15-185 83-279" fill="none" stroke="#d8c9a3" strokeWidth="55"/>
        <g fill="none" stroke="#6c9380" strokeWidth="3"><use href="#hero-route-a"/><use href="#hero-route-b"/><use href="#hero-route-c"/><path d="M900 245h70q30 0 30-30v-40q0-25 25-25h190"/></g>
        <g className="hero-packets" fill="#f0d297">
          {!failed && <circle r="5"><animateMotion dur="5s" repeatCount="indefinite"><mpath href="#hero-route-a"/></animateMotion></circle>}
          <circle r="5"><animateMotion dur="4s" repeatCount="indefinite"><mpath href="#hero-route-b"/></animateMotion></circle>
          <circle r="5"><animateMotion dur="4.5s" begin="-2s" repeatCount="indefinite"><mpath href="#hero-route-c"/></animateMotion></circle>
        </g>
        <g fill="none" stroke="#b8cbb2" strokeWidth="4"><path d="M330 340V75m600 265V75M330 87Q630 365 930 87"/><path d="M390 137v170m90-116v116m90-92v92m120-92v92m90-116v116m90-170v170" strokeWidth="2"/></g>
        <path d="M303 310h654v23H303Z" fill="#aec3a5" stroke="#173d36" strokeWidth="2"/><path d="M303 333h654v9H303Z" fill="#62876f"/>
        <circle cx="330" cy="75" r="6" fill="#e5d4ac"/><circle cx="930" cy="75" r="6" fill="#e5d4ac"/>
        <Server x={410} offline={failed} name="APP 01"/><Server x={590} name="APP 02"/><Server x={770} name="APP 03"/>
        <g transform="translate(132 260)"><path d="m0 20 42-16 42 16-42 16Z" fill="#d6dfc8"/><path d="M0 20v35l42 17V36Z" fill="#87a78d"/><path d="m42 36 42-16v35L42 72Z" fill="#557c66"/><text x="42" y="96" textAnchor="middle" fill="#d0dfce" fontSize="12" fontFamily="monospace">ROUTER</text></g>
        <g transform="translate(1034 75)" fill="#9ab99d" stroke="#284d40" strokeWidth="2"><path d="M0 15v66c0 21 82 21 82 0V15Z"/><ellipse cx="41" cy="15" rx="41" ry="15" fill="#c5d5b5"/><path d="M0 45c0 21 82 21 82 0M0 68c0 21 82 21 82 0" fill="none"/></g>
      </svg>
      <div className="hero-demo-controls"><button onClick={() => setFailed(v => !v)}>{failed ? <RotateCcw size={14}/> : <Unplug size={14}/>} {failed ? 'Bring it back online' : 'Take one server offline'}</button><button className="animation-control" aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Resume motion' : 'Pause motion'}</button></div>
      <p className="hero-demo-note" aria-live="polite">{failed ? 'One instance offline. Two routes remain.' : 'Three instances. Three routes. Try taking one offline.'} <span>Interactive illustration, not a performance simulation.</span></p>
    </div>
  </section>;
}
