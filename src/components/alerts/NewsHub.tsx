/**
 * NEWS inside Announcements: one place, three live feeds —
 *  • Breaking: market-moving headlines worldwide (separate from the economic calendar)
 *  • World & geopolitics: the same live feed pre-filtered to geopolitics (wars, sanctions, elections)
 *  • Pakistan: PSX, SBP, IMF, budget, rupee and security stories
 */
import React, { useState } from 'react';
import { Globe2, MapPin, Radio } from 'lucide-react';
import { BreakingNewsPanel } from '../calendar/BreakingNewsPanel';
import { PakistanNewsView } from '../fundamentalAnalysis/PakistanNews';

type Sub = 'BREAKING' | 'WORLD' | 'PAKISTAN';
const SUBS: { id: Sub; label: string; icon: React.ReactNode }[] = [
  { id: 'BREAKING', label: 'Breaking', icon: <Radio className="h-3 w-3 text-rose-400" /> },
  { id: 'WORLD', label: 'World & geopolitics', icon: <Globe2 className="h-3 w-3 text-sky-400" /> },
  { id: 'PAKISTAN', label: 'Pakistan', icon: <MapPin className="h-3 w-3 text-emerald-400" /> },
];

export const NewsHub: React.FC<{ initial?: Sub }> = ({ initial = 'BREAKING' }) => {
  const [sub, setSub] = useState<Sub>(initial);
  return (
    <div className="space-y-2.5" data-testid="news-hub">
      <div className="flex gap-1 overflow-x-auto pb-0.5" role="tablist">
        {SUBS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={sub === s.id} onClick={() => setSub(s.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold cursor-pointer ${sub === s.id ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>
      {sub === 'BREAKING' && <BreakingNewsPanel key="b" />}
      {sub === 'WORLD' && <BreakingNewsPanel key="w" initialCat="Geopolitics" />}
      {sub === 'PAKISTAN' && <PakistanNewsView compact />}
    </div>
  );
};
