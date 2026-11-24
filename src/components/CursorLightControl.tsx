import React, { useState } from 'react';
import { getCursorLight, setCursorLight } from '../utils/cursorLight';

export function CursorLightControl() {
  const [v, setV] = useState(getCursorLight);
  const set = (n: number) => { const c = Math.min(200, Math.max(0, n)); setV(c); setCursorLight(c); };
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3" data-testid="cursor-light-control">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Mouse light brightness</p>
        <span className="text-xs font-bold text-cyan-300">{v === 0 ? 'Off' : `${v}%`}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => set(v - 20)} className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-900 text-lg font-bold text-slate-200" aria-label="Dimmer">−</button>
        <input type="range" min={0} max={200} step={5} value={v} onChange={(e) => set(Number(e.target.value))} className="flex-1" aria-label="Mouse light brightness" />
        <button type="button" onClick={() => set(v + 20)} className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-900 text-lg font-bold text-slate-200" aria-label="Brighter">+</button>
        <button type="button" onClick={() => set(35)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-bold text-slate-300">Reset</button>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">The soft light that follows your mouse (or finger). Move the slider while you move the mouse to see it.</p>
    </div>
  );
}
