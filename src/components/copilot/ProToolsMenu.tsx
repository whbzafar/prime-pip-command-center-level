import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wand2, ChevronDown } from 'lucide-react';

export interface ProTool { id: string; label: string; desc: string; Icon: any; cls: string; onClick: () => void }

/** One toolbar button that opens the advanced tools (keeps the chart toolbar on one line). */
export const ProToolsMenu: React.FC<{ items: ProTool[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 328)) });
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.('[data-pro-tools]')) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', close); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <>
      <button ref={btn} type="button" data-pro-tools onClick={() => setOpen((o) => !o)} data-testid="open-pro-tools"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 border-cyan-400/50 text-cyan-50 hover:from-cyan-500/30 hover:to-fuchsia-500/30 ${open ? 'ring-1 ring-cyan-300/60' : ''}`}
        title="Pro Tools — Quant Edge, Copilot, Radar, News shock, Exposure">
        <Wand2 className="w-4 h-4 text-cyan-300" /><span>Pro Tools</span><ChevronDown className={`w-3.5 h-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div data-pro-tools className="fixed z-[2147483050] w-80 rounded-2xl border border-slate-700 shadow-2xl p-1.5" style={{ top: pos.top, left: pos.left, backgroundColor: '#0b1222' }}>
          {items.map((it) => (
            <button key={it.id} type="button" data-testid={`pro-tool-${it.id}`} onClick={() => { setOpen(false); it.onClick(); }} className="w-full flex items-start gap-2.5 text-left px-2.5 py-2 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <it.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${it.cls}`} />
              <span className="min-w-0"><span className="block text-xs font-bold text-white">{it.label}</span><span className="block text-[10.5px] text-slate-400 leading-snug">{it.desc}</span></span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};
