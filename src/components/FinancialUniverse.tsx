import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJsonSafe, peekJson } from './fundamentalAnalysis/ui';

/**
 * Financial Universe — every asset (or pair) the Fundamentals engine has scored, drawn as one bubble.
 * Colour = direction (green bullish, red bearish, blue-grey neutral). Size = how strong the lean is
 * (the bigger of the bullish / bearish percentage). Hover shows the exact split, click opens the full
 * Fundamentals view for that item. Data is the live engine output, refreshed every 45 s.
 */
type Side = 'bull' | 'bear' | 'neutral';
type Cls = 'FOREX' | 'COMMODITIES' | 'INDICES' | 'STOCKS' | 'CRYPTO';
interface Item { kind: 'asset' | 'pair'; symbol: string; label: string; name: string; assetClass: Cls; score: number; bullishPct: number; bearishPct: number; side: Side; confidence: number }
interface Universe { generatedAt: string; assets: Item[]; pairs: Item[] }
type SideFilter = 'ALL' | Side;

const COL: Record<Side, string> = { bull: '#34d399', bear: '#fb3f5e', neutral: '#8aa4d6' };
const CLS_LABEL: Record<Cls, string> = { FOREX: 'Forex', COMMODITIES: 'Commodities', INDICES: 'Indices', STOCKS: 'Stocks', CRYPTO: 'Crypto' };
const CLS_PAIR: Record<Cls, string> = { FOREX: 'Forex pairs', COMMODITIES: 'Commodity pairs', INDICES: 'Index pairs', STOCKS: 'Stock pairs', CRYPTO: 'Crypto pairs' };
const CLS_ONE: Record<Cls, string> = { FOREX: 'Forex', COMMODITIES: 'Commodity', INDICES: 'Index', STOCKS: 'Stock', CRYPTO: 'Crypto' };
const CLASSES: Cls[] = ['FOREX', 'COMMODITIES', 'INDICES', 'STOCKS', 'CRYPTO'];
const SIDE_WORD: Record<Side, string> = { bull: 'Bullish', bear: 'Bearish', neutral: 'Neutral' };
export const FOCUS_KEY = 'ppfx:fa-focus';

/** Strength of the lean: 50 % = no lean, 100 % = all-in. */
const strength = (i: Item) => Math.max(i.bullishPct, i.bearishPct);
const radiusOf = (i: Item) => 5 + ((Math.min(100, Math.max(50, strength(i))) - 50) / 50) * 15;

/** Deterministic spiral circle-packing (largest first, stretched to the box shape, grid-accelerated). */
function pack(items: Item[], aspect: number) {
  const ax = Math.min(2.4, Math.max(1, aspect));
  const CELL = 44; const grid = new Map<string, Array<{ x: number; y: number; r: number }>>();
  const placed: Array<{ item: Item; x: number; y: number; r: number }> = [];
  const sorted = [...items].sort((a, b) => radiusOf(b) - radiusOf(a) || a.symbol.localeCompare(b.symbol));
  for (const item of sorted) {
    const r = radiusOf(item); let rho = 0, th = 0, x = 0, y = 0;
    for (let k = 0; k < 60000; k++) {
      rho = 0.35 * th; x = Math.cos(th) * rho * ax; y = Math.sin(th) * rho;
      const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL); let ok = true;
      for (let i = gx - 1; i <= gx + 1 && ok; i++) for (let j = gy - 1; j <= gy + 1 && ok; j++) {
        const cell = grid.get(`${i},${j}`); if (!cell) continue;
        for (const p of cell) { const dx = p.x - x, dy = p.y - y, m = p.r + r + 3.2; if (dx * dx + dy * dy < m * m) { ok = false; break; } }
      }
      if (ok) break;
      th += 1.4 / (rho + 3);
    }
    const c = { x, y, r }; const key = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    (grid.get(key) ?? grid.set(key, []).get(key)!).push(c); placed.push({ item, ...c });
  }
  return placed;
}

export const FinancialUniverse: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const box = useRef<HTMLDivElement>(null);
  const prevScores = useRef<Map<string, number>>(new Map());
  const [uni, setUni] = useState<Universe | null>(() => peekJson<any>('/api/macro/universe')?.data ?? null);
  const [error, setError] = useState(false);
  const [scope, setScope] = useState<'asset' | 'pair'>('pair');
  const [cls, setCls] = useState<'ALL' | Cls>('ALL');
  const [side, setSide] = useState<SideFilter>('ALL');
  const [size, setSize] = useState({ w: 900, h: 420 });
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [asOf, setAsOf] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      setBusy(true);
      try {
        const r = await fetchJsonSafe<{ data: Universe }>('/api/macro/universe');
        if (!alive) return;
        const d = r.data; const ch: Record<string, number> = {};
        for (const i of [...d.assets, ...d.pairs]) { const k = `${i.kind}:${i.symbol}`; const p = prevScores.current.get(k); if (p !== undefined && Math.abs(p - i.score) >= 2) ch[k] = Date.now(); prevScores.current.set(k, i.score); }
        if (Object.keys(ch).length) { setFlash(ch); window.setTimeout(() => alive && setFlash({}), 4000); }
        setUni(d); setError(false); setAsOf(new Date().toLocaleTimeString());
      } catch { if (alive) setError(true); }
      if (alive) setBusy(false);
    };
    void pull(); const t = window.setInterval(pull, 45_000);
    const vis = () => { if (!document.hidden) void pull(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; window.clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, []);

  useEffect(() => {
    const b = box.current; if (!b) return;
    const f = () => setSize({ w: Math.max(280, b.clientWidth), h: Math.max(260, b.clientHeight) });
    f(); const ro = new ResizeObserver(f); ro.observe(b); return () => ro.disconnect();
  }, []);

  const base = useMemo(() => (uni ? (scope === 'asset' ? uni.assets : uni.pairs) : []), [uni, scope]);
  const inClass = useMemo(() => base.filter((i) => cls === 'ALL' || i.assetClass === cls), [base, cls]);
  const counts = useMemo(() => ({ all: inClass.length, bull: inClass.filter((i) => i.side === 'bull').length, bear: inClass.filter((i) => i.side === 'bear').length, neutral: inClass.filter((i) => i.side === 'neutral').length }), [inClass]);
  const visible = useMemo(() => inClass.filter((i) => side === 'ALL' || i.side === side), [inClass, side]);
  const layout = useMemo(() => {
    const placed = pack(visible, size.w / size.h);
    if (!placed.length) return { items: [] as typeof placed, k: 1, cx: 0, cy: 0 };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of placed) { x0 = Math.min(x0, p.x - p.r); x1 = Math.max(x1, p.x + p.r); y0 = Math.min(y0, p.y - p.r); y1 = Math.max(y1, p.y + p.r); }
    const k = Math.min((size.w - 16) / (x1 - x0), (size.h - 16) / (y1 - y0), 2.6);
    return { items: placed, k, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }, [visible, size]);

  const key = (i: Item) => `${i.kind}:${i.symbol}`;
  const open = (i: Item) => {
    try { sessionStorage.setItem(FOCUS_KEY, JSON.stringify({ kind: i.kind, symbol: i.symbol, assetClass: i.assetClass, t: Date.now() })); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('ppfx:fa-focus'));
    onNavigate?.('FUNDAMENTAL_INDICATORS');
  };
  const active = layout.items.find((p) => key(p.item) === (pinned ?? hover));
  const pill = (id: SideFilter, label: string, n: number, color: string) => (
    <button type="button" onClick={() => { setSide(id); setPinned(null); }} aria-pressed={side === id} data-testid={`universe-stat-${id}`}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${side === id ? 'border-white/40 bg-white/10 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
      <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}<b className="tabular-nums" style={{ color }}>{n}</b>
    </button>
  );
  const chip = (id: 'ALL' | Cls, label: string, n: number) => (
    <button key={id} type="button" onClick={() => { setCls(id); setPinned(null); }} aria-pressed={cls === id}
      className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider cursor-pointer ${cls === id ? 'border-[#d4af37]/70 bg-[#d4af37]/15 text-[#f3d98a]' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>{label} <span className="opacity-60">{n}</span></button>
  );
  const clsCount = (c: Cls) => base.filter((i) => i.assetClass === c).length;

  return (
    <section data-testid="financial-universe" className="relative overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#02050c] shadow-[0_0_60px_-20px_rgba(212,175,55,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(34,211,238,0.07),transparent_60%)]" />
      <div className="relative px-4 pt-4 sm:px-6 sm:pt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pr-14 sm:pr-6">
        <div>
          <div className="text-lg sm:text-2xl font-extralight uppercase tracking-[0.2em] text-slate-100">Financial Universe</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-rose-400' : busy ? 'bg-cyan-300 animate-ping' : 'bg-emerald-400'}`} />
            {error ? 'Reconnecting…' : `Live${asOf ? ` · updated ${asOf}` : ''}`}
          </div>
        </div>
      </div>
      <div className="relative px-4 sm:px-6 mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by direction">
        {pill('ALL', scope === 'asset' ? 'All assets' : 'All pairs', counts.all, '#e2e8f0')}
        {pill('bull', 'Bullish', counts.bull, COL.bull)}
        {pill('bear', 'Bearish', counts.bear, COL.bear)}
        {pill('neutral', 'Neutral', counts.neutral, COL.neutral)}
      </div>
      <div className="relative px-4 sm:px-6 mt-3 flex items-center gap-2">
        <div className="flex shrink-0 rounded-full border border-slate-600 overflow-hidden" role="group" aria-label="What to show">
          {(['pair', 'asset'] as const).map((k) => (
            <button key={k} type="button" onClick={() => { setScope(k); setCls('ALL'); setPinned(null); }} aria-pressed={scope === k} data-testid={`universe-scope-${k}`}
              className={`px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer ${scope === k ? 'bg-cyan-400/25 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>{k === 'pair' ? 'Pairs' : 'Single assets'}</button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {chip('ALL', scope === 'pair' ? 'All pairs' : 'All markets', base.length)}
          {CLASSES.filter((c) => clsCount(c) > 0).map((c) => chip(c, scope === 'pair' ? CLS_PAIR[c] : CLS_LABEL[c], clsCount(c)))}
        </div>
      </div>
      <div ref={box} className="relative h-[400px] sm:h-[480px] w-full mt-1" onPointerLeave={() => setHover(null)}>
        {!uni && !error && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Loading live fundamentals…</div>}
        {!uni && error && <div className="absolute inset-0 grid place-items-center text-sm text-rose-300">Could not load the data yet — retrying automatically.</div>}
        {uni && layout.items.length === 0 && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Nothing matches this filter right now.</div>}
        <svg width={size.w} height={size.h} className="absolute inset-0" role="img" aria-label="Bubble map of bullish and bearish assets">
          <g transform={`translate(${size.w / 2} ${size.h / 2})`}>
            {layout.items.map(({ item, x, y, r }) => {
              const k = key(item), px = (x - layout.cx) * layout.k, py = (y - layout.cy) * layout.k, pr = r * layout.k;
              const on = active && key(active.item) === k, dim = active && !on;
              const c = COL[item.side];
              return (
                <g key={k} style={{ transform: `translate(${px}px, ${py}px)`, transition: 'transform .7s cubic-bezier(.2,.8,.2,1)', opacity: dim ? 0.35 : 1 }}
                  className="cursor-pointer" onPointerEnter={() => setHover(k)} data-testid="universe-bubble" data-symbol={item.symbol} data-side={item.side}
                  onClick={(e) => {
                    const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch' || (e.nativeEvent as PointerEvent).pointerType === 'pen';
                    if (touch && pinned !== k) { setPinned(k); setHover(k); } else open(item);
                  }}>
                  {flash[k] && <circle r={pr} fill="none" stroke={c} strokeWidth={2}><animate attributeName="r" from={pr} to={pr * 2.2} dur="1.6s" repeatCount="2" /><animate attributeName="opacity" from=".9" to="0" dur="1.6s" repeatCount="2" /></circle>}
                  <circle r={pr} fill={c} fillOpacity={on ? 0.95 : 0.78} stroke={on ? '#fff' : c} strokeOpacity={on ? 1 : 0.9} strokeWidth={on ? 2 : 1} style={{ transition: 'r .7s, fill-opacity .2s' }} />
                  {pr >= 17 && (() => { const L = item.label; const fs = Math.min(12.5, (pr * 1.75) / (L.length * 0.62)); const f = Math.max(fs, 6.8); const max = Math.max(3, Math.floor((pr * 1.75) / (f * 0.62))); const t = fs >= 6.8 || L.length <= max ? L : L.slice(0, max - 1) + '…'; return <text textAnchor="middle" y={pr >= 30 ? -2 : 3.5} fontSize={f} fontWeight={700} fill="#04101a" style={{ pointerEvents: 'none' }}>{t}</text>; })()}
                  {pr >= 30 && <text textAnchor="middle" y={11} fontSize={9.5} fontWeight={600} fill="#04101a" fillOpacity={0.7} style={{ pointerEvents: 'none' }}>{Math.round(strength(item))}%</text>}
                </g>
              );
            })}
          </g>
        </svg>
        {active && (() => {
          const i = active.item; const px = size.w / 2 + (active.x - layout.cx) * layout.k, py = size.h / 2 + (active.y - layout.cy) * layout.k;
          const left = Math.min(size.w - 236, Math.max(8, px - 114)); const top = py > size.h * 0.55 ? Math.max(8, py - active.r * layout.k - 128) : Math.min(size.h - 130, py + active.r * layout.k + 10);
          return (
            <div data-testid="universe-tip" className="absolute z-10 w-[228px] rounded-xl border border-white/15 bg-[#050a14]/95 p-3 shadow-xl backdrop-blur-md" style={{ left, top }}
              onPointerEnter={() => setHover(key(i))}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold text-slate-100 truncate">{i.label}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">{CLS_ONE[i.assetClass]}{i.kind === 'pair' ? ' pair' : ''}</div>
              </div>
              {i.kind === 'asset' && i.name !== i.label && <div className="text-[11px] text-slate-400 truncate">{i.name}</div>}
              <div className="mt-2 flex h-2 rounded-full overflow-hidden bg-slate-800">
                <div style={{ width: `${i.bullishPct}%`, background: COL.bull }} /><div style={{ width: `${i.bearishPct}%`, background: COL.bear }} />
              </div>
              <div className="mt-1 flex justify-between text-[12px] font-semibold tabular-nums">
                <span style={{ color: COL.bull }}>{Math.round(i.bullishPct)}% bullish</span><span style={{ color: COL.bear }}>{100 - Math.round(i.bullishPct)}% bearish</span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-300">Overall: <b style={{ color: COL[i.side] }}>{SIDE_WORD[i.side]}</b> · score {i.score > 0 ? '+' : ''}{Math.round(i.score)} · data confidence {i.confidence}%</div>
              <button type="button" onClick={() => open(i)} className="mt-2 w-full rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#f3d98a] hover:bg-[#d4af37]/20 cursor-pointer">Open full analysis</button>
            </div>
          );
        })()}
      </div>
      <div className="relative px-4 sm:px-6 pb-4 text-[11px] text-slate-500">Bubble size = how strong the lean is. Hover for the bullish / bearish split · click to open the full analysis.</div>
    </section>
  );
};
export default FinancialUniverse;
