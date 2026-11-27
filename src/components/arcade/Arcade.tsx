import React, { useState } from 'react';

const SpaceShooter = React.lazy(() => import('./SpaceShooter'));
const LawnDefense = React.lazy(() => import('./LawnDefense'));

/** Two original arcade games for a quick break. Only the chosen game is mounted (the other one is fully stopped). */
export const Arcade: React.FC = () => {
  const [g, setG] = useState<'space' | 'lawn'>('space');
  const tab = (id: 'space' | 'lawn', label: string) => (
    <button type="button" data-testid={`arcade-${id}`} onClick={() => setG(id)} className={`rounded-lg px-3 py-1.5 text-[12px] font-bold cursor-pointer ${g === id ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950' : 'border border-slate-700 text-slate-300 hover:text-white'}`}>{label}</button>
  );
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4" data-testid="arcade">
      <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">Take a break · Arcade</span><span className="ml-auto flex gap-2">{tab('space', '🚀 Star Defender')}{tab('lawn', '🌱 Garden Guard')}</span></div>
      <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading game…</div>}>
        {g === 'space' ? <SpaceShooter key="s" /> : <LawnDefense key="l" />}
      </React.Suspense>
    </div>
  );
};
export default Arcade;
