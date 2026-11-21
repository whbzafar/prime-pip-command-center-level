import React, { useEffect, useRef, useState } from 'react';
import { CANVAS_DEFAULT, CANVAS_PRESETS, getCanvasColor, onCanvasColor, setCanvasColor } from '../../utils/chartCanvas';

/** Small “Canvas” button: pick any chart background colour (saved, shared by every chart). */
export const CanvasColorControl: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [color, setColor] = useState(getCanvasColor);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => onCanvasColor(setColor), []);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', off); return () => document.removeEventListener('mousedown', off);
  }, [open]);
  return (
    <div ref={box} className={`relative ${className}`} data-testid="canvas-color-control">
      <button type="button" title="Chart canvas colour" aria-label="Chart canvas colour" onClick={() => setOpen((o) => !o)}
        className="h-9 px-2.5 rounded-full bg-slate-900/90 border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400 shadow-lg flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
        <span className="w-4 h-4 rounded-full border border-slate-400" style={{ background: color }} />Canvas
      </button>
      {open && (
        <div className="absolute bottom-11 right-0 z-30 w-[210px] rounded-xl border border-slate-600 bg-slate-950 p-3 shadow-2xl space-y-2.5">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Canvas colour</div>
          <div className="flex flex-wrap gap-1.5">
            {CANVAS_PRESETS.map((c) => (
              <button key={c} type="button" aria-label={`Use ${c}`} onClick={() => setCanvasColor(c)} className={`w-7 h-7 rounded-full border-2 cursor-pointer ${color === c ? 'border-cyan-400' : 'border-slate-600'}`} style={{ background: c }} />
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">Custom
            <input type="color" value={color} onChange={(e) => setCanvasColor(e.target.value)} className="w-10 h-7 bg-transparent border border-slate-600 rounded cursor-pointer" data-testid="canvas-color-input" />
            <span className="font-mono-code text-slate-400">{color}</span>
          </label>
          <button type="button" onClick={() => setCanvasColor(CANVAS_DEFAULT)} className="text-[11px] text-cyan-300 hover:text-cyan-200 cursor-pointer">Reset to white</button>
          <div className="text-[10px] text-slate-500">Saved automatically.</div>
        </div>
      )}
    </div>
  );
};
