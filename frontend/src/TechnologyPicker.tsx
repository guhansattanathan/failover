import { ChevronDown, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { TechnologyIcon } from './TechnologyIcon';
import { technologyName } from './technologies';
import type { ComponentEntry } from './types';

export function TechnologyPicker({ label, value, choices, onChange }: { label: string; value: string; choices: ComponentEntry[]; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [up, setUp] = useState(false);
  function placeMenu() {
    const rect = ref.current!.getBoundingClientRect();
    const bounds = ref.current!.closest('.panel')?.getBoundingClientRect();
    const bottom = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight);
    setUp(bottom - rect.bottom < Math.min(280, choices.length * 40 + 12) && rect.top - (bounds?.top ?? 0) > bottom - rect.bottom);
  }
  return <details className={`technology-picker ${up ? 'opens-up' : ''}`} ref={ref} onToggle={() => { if (ref.current?.open) placeMenu(); }} onKeyDown={e => { if (e.key === 'Escape') { ref.current!.open = false; ref.current?.querySelector('summary')?.focus(); e.stopPropagation(); } }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) ref.current!.open = false; }}>
    <summary aria-label={label}><TechnologyIcon technology={value}/><span>{technologyName(value)}</span><ChevronDown size={14}/></summary>
    <div className="technology-options" role="group" aria-label={`${label} options`}>{choices.map(c => <button type="button" key={c.technology} aria-pressed={c.technology === value} onClick={() => { onChange(c.technology); ref.current!.open = false; ref.current?.querySelector('summary')?.focus(); }}><TechnologyIcon technology={c.technology}/><span>{technologyName(c.technology)}</span>{c.technology === value && <Check size={14}/>}</button>)}</div>
  </details>;
}
