import { BrandGlyph } from './TechnologyIcon';
import { technologies } from './technologies';

function Brand({ technology, x, y, size = 24, color = '#fff' }: { technology: string; x: number; y: number; size?: number; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${size / 24})`} fill={color} color={color}><BrandGlyph technology={technology}/></g>;
}

function ServerStack({ worker = false, technology }: { worker?: boolean; technology: string }) {
  const top = worker ? '#87b0a4' : '#7fa9c0', left = worker ? '#426e61' : '#3d657d', right = worker ? '#31564c' : '#28485e';
  return <>
    <path d="M80 120v12m-24-25-20 13H15m89-13 20 13h21" fill="none" stroke="#afbeb6" strokeWidth="3" strokeLinejoin="round"/>
    {[58, 34, 10].map(y => <g key={y} transform={`translate(0 ${y})`}>
      <path d="m24 29 56 27v29L24 58Z" fill={left}/><path d="m80 56 56-27v29L80 85Z" fill={right}/>
      <path d="M24 29 80 2l56 27-56 27Z" fill={top}/><path d="m39 29 41-19 41 19-41 19Z" fill={right} opacity=".45"/>
      <path d="m34 47 31 15m-31-8 21 10" stroke="#bbd2d8" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="119" cy="48" rx="2.5" ry="3.4" fill="#e5be73"/><ellipse cx="108" cy="53" rx="2.5" ry="3.4" fill="#bdd7cb"/>
    </g>)}
    {technology !== 'service' && <g transform="translate(108 92)"><circle r="23" fill="#f2f6ed" stroke="#426e61" strokeWidth="2"/><Brand technology={technology} x={-14} y={-14} size={28} color="#426e61"/></g>}
  </>;
}

function Database({ technology }: { technology: string }) {
  const doc = technologies[technology]?.type === 'nonrelational_database';
  const body = doc ? '#426e61' : '#396e8e', edge = doc ? '#31564c' : '#28526e', top = doc ? '#99beb0' : '#95bfd1';
  return <>
    <path d="M30 29v76c0 15 100 15 100 0V29Z" fill={body}/>
    <path d="M104 37v77c16-2 26-5 26-11V29Z" fill={edge}/>
    <ellipse cx="80" cy="29" rx="50" ry="16" fill={top}/><ellipse cx="80" cy="29" rx="37" ry="10" fill={body} opacity=".35"/>
    <path d="M30 53c0 19 100 19 100 0M30 78c0 19 100 19 100 0M30 102c0 19 100 19 100 0" fill="none" stroke={top} strokeWidth="3"/>
    <circle cx="80" cy="77" r="23" fill={body}/><Brand technology={technology} x={61} y={58} size={38}/>
  </>;
}

function RedisStack() {
  return <>
    {[62, 38, 14].map(y => <g key={y} transform={`translate(0 ${y})`}>
      <path d="m18 32 62 27 62-27v16L80 75 18 48Z" fill="#972c29"/>
      <path d="M18 32 80 5l62 27-62 27Z" fill="#c8463c"/>
    </g>)}
    <ellipse cx="55" cy="47" rx="15" ry="5" fill="#fff5eb"/>
    <path d="m93 28 3 6 13 3-12 3-4 7-6-6-13-2 12-4Z" fill="#fff5eb"/>
    <path d="m77 53 20 4-12 9Z" fill="#fff5eb"/>
    <path d="m104 45 12-5 11 5-12 5Z" fill="#842d2a"/>
  </>;
}

function Client({ technology }: { technology: string }) {
  return <>
    <path d="M70 103h20v18H70Z" fill="#8caaa8"/><path d="M56 119h48l8 9H48Z" fill="#4a686b"/>
    <rect x="16" y="19" width="128" height="86" rx="8" fill="#35535d"/>
    <path d="M23 27h114v61H23Z" fill="#e2eeea"/>
    <path d="M23 27h114v11H23Z" fill="#b0c8c5"/>
    <circle cx="30" cy="32" r="2" fill="#648881"/><circle cx="37" cy="32" r="2" fill="#648881"/>
    <Brand technology={technology} x={65} y={47} size={30} color="#648881"/>
    <path d="M16 90h128v8a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7Z" fill="#a3bdbb"/><circle cx="80" cy="97" r="3" fill="#f1f5ec"/>
  </>;
}

function LoadBalancer({ technology }: { technology: string }) {
  return <>
    <path d="M80 10v20m0 56v12H35v13m45-13v13m0-13h45v13" fill="none" stroke="#73968b" strokeWidth="4" strokeLinejoin="round"/>
    <path d="m76 22 4 7 4-7m-53 83 4 7 4-7m37 0 4 7 4-7m37 0 4 7 4-7" fill="none" stroke="#73968b" strokeWidth="3" strokeLinecap="round"/>
    <path d="m24 44 56-18 56 18-56 19Z" fill="#9bbfb2"/><path d="m24 44 56 19v22L24 66Z" fill="#507f6e"/><path d="m80 63 56-19v22L80 85Z" fill="#345b4f"/>
    <Brand technology={technology} x={65} y={33} size={29} color="#f4f7ed"/>
    {[20, 65, 110].map(x => <g key={x}><rect x={x} y="114" width="30" height="17" rx="3" fill="#52736a"/><path d={`M${x + 5} 120h12m-12 5h8`} stroke="#c3d7cc" strokeWidth="2"/></g>)}
  </>;
}

function Queue({ technology }: { technology: string }) {
  return <>
    <path d="M9 77h142" stroke="#a2b5ac" strokeWidth="4" strokeDasharray="5 5"/>
    <path d="m25 40 96-14 18 15-96 15Z" fill="#d1b080"/><path d="m43 56 96-15v49l-96 15Z" fill="#9b753f"/><path d="m25 40 18 16v49L25 89Z" fill="#76572f"/>
    {[0, 24, 48].map(x => <g key={x} transform={`translate(${x} ${-x / 7})`}><path d="M48 62h19v27H48Z" fill="#faf4e4"/><path d="m48 62 9 10 10-10" fill="none" stroke="#b69a6e" strokeWidth="2"/></g>)}
    <circle cx="121" cy="108" r="20" fill="#f4f0e5" stroke="#9b753f" strokeWidth="2"/><Brand technology={technology} x={109} y={96} size={24} color="#9b753f"/>
    <path d="m9 72 7 5-7 5m135-10 7 5-7 5" fill="none" stroke="#739284" strokeWidth="3"/>
  </>;
}

function Cdn({ technology }: { technology: string }) {
  return <>
    <path d="M80 76v22M35 111l45-13 45 13M35 111V91m90 20V91" fill="none" stroke="#73968b" strokeWidth="3"/>
    <path d="M42 76C14 76 13 40 38 37c4-27 44-33 56-8 28-7 43 16 34 34-4 9-13 13-24 13Z" fill="#9bbfb2" stroke="#507f6e" strokeWidth="3"/>
    <Brand technology={technology} x={59} y={32} size={42} color="#31564c"/>
    {[35, 80, 125].map(x => <g key={x}><path d={`M${x - 14} 110l14-7 14 7v17l-14 7-14-7Z`} fill="#507f6e"/><path d={`M${x - 14} 110l14 7 14-7-14-7Z`} fill="#9bbfb2"/><circle cx={x} cy="124" r="2" fill="#e5be73"/></g>)}
  </>;
}

/** Local vector artwork stays sharp at every editor zoom; no remote image calls. */
export function ComponentIllustration({ technology }: { technology: string }) {
  const kind = technologies[technology]?.type;
  return <svg className="component-illustration" viewBox="0 0 160 144" fill="none" aria-hidden="true">
    {kind === 'cdn' ? <Cdn technology={technology}/> : kind === 'client' ? <Client technology={technology}/> : kind === 'application' ? <ServerStack technology={technology}/> : kind === 'worker' ? <ServerStack worker technology={technology}/> : kind === 'cache' ? technology === 'redis' ? <RedisStack/> : <><path d="m20 43 60-25 60 25v56l-60 25-60-25Z" fill="#507f6e"/><path d="m20 43 60 25 60-25-60-25Z" fill="#9bbfb2"/><Brand technology={technology} x={59} y={67} size={42}/></> : kind === 'load_balancer' ? <LoadBalancer technology={technology}/> : kind === 'queue' ? <Queue technology={technology}/> : <Database technology={technology}/>}

  </svg>;
}
