import React, { useEffect, useRef, useState } from 'react';
import { fetchJsonSafe, peekJson } from './fundamentalAnalysis/ui';
import { openChart } from './fundamentalAnalysis/LiveBiasStrip';

/**
 * IntelligenceGlobe — the Global Financial Intelligence core: a slowly rotating holographic globe whose nodes are
 * the world's currencies, gold, oil, indices and bitcoin. Node colour/size = live fundamental score, arcs = the
 * strongest long-term pairs, pulses = a score that just changed. Nothing here is decorative data.
 * Core states: IDLE (slow), ANALYSING (a refresh is in flight, faster), DISCOVERING (a score just moved: light pulses).
 */
interface Node { id: string; sym: string; name: string; lat: number; lon: number; kind: 'fx' | 'com' | 'idx' | 'crypto' }
const NODES: Node[] = [
  { id: 'USD', sym: 'USD', name: 'US Dollar', lat: 38.9, lon: -77, kind: 'fx' }, { id: 'EUR', sym: 'EUR', name: 'Euro', lat: 50.1, lon: 8.7, kind: 'fx' },
  { id: 'GBP', sym: 'GBP', name: 'British Pound', lat: 51.5, lon: -0.1, kind: 'fx' }, { id: 'JPY', sym: 'JPY', name: 'Japanese Yen', lat: 35.7, lon: 139.7, kind: 'fx' },
  { id: 'CHF', sym: 'CHF', name: 'Swiss Franc', lat: 46.9, lon: 7.4, kind: 'fx' }, { id: 'AUD', sym: 'AUD', name: 'Australian Dollar', lat: -33.9, lon: 151.2, kind: 'fx' },
  { id: 'NZD', sym: 'NZD', name: 'New Zealand Dollar', lat: -41.3, lon: 174.8, kind: 'fx' }, { id: 'CAD', sym: 'CAD', name: 'Canadian Dollar', lat: 45.4, lon: -75.7, kind: 'fx' },
  { id: 'XAU', sym: 'XAU', name: 'Gold', lat: -26.2, lon: 28, kind: 'com' }, { id: 'WTI', sym: 'WTI', name: 'WTI Crude Oil', lat: 24.7, lon: 46.7, kind: 'com' },
  { id: 'US500', sym: 'US500', name: 'S&P 500', lat: 40.7, lon: -74, kind: 'idx' }, { id: 'US100', sym: 'US100', name: 'Nasdaq 100', lat: 37.4, lon: -122, kind: 'idx' },
  { id: 'GER40', sym: 'GER40', name: 'DAX 40', lat: 48.1, lon: 11.6, kind: 'idx' }, { id: 'BTCUSD', sym: 'BTCUSD', name: 'Bitcoin', lat: 1.35, lon: 103.8, kind: 'crypto' },
];
const CHART_SYM: Record<string, string> = { XAU: 'XAUUSD', WTI: 'USOIL', BTCUSD: 'BTCUSD' };
const GOLD = '212,175,55', CYAN = '34,211,238', VIOLET = '167,139,250', UP = '52,211,153', DOWN = '244,63,94';

type Asset = { symbol: string; name: string; score: number | null; bias: string; confidence: number; summary?: string; topDrivers?: any[] };
const proj = (lat: number, lon: number, rot: number, tilt: number) => {
  const la = (lat * Math.PI) / 180, lo = ((lon + rot) * Math.PI) / 180;
  let x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x, y: y2, z: z2 };
};

export const IntelligenceGlobe: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const cv = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const assets = useRef<Map<string, Asset>>(new Map());
  const arcs = useRef<Array<{ a: string; b: string; bull: boolean }>>([]);
  const pulses = useRef<Map<string, number>>(new Map());
  const stateRef = useRef<'IDLE' | 'ANALYSING' | 'DISCOVERING'>('IDLE');
  const [coreState, setCoreState] = useState<'IDLE' | 'ANALYSING' | 'DISCOVERING'>('IDLE');
  const [sel, setSel] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  const [count, setCount] = useState({ assets: 0, bull: 0, bear: 0 });
  const [shown, setShown] = useState({ assets: 0, bull: 0, bear: 0 });
  const [asOf, setAsOf] = useState<string>('');
  selRef.current = sel;

  // data
  useEffect(() => {
    let alive = true;
    const apply = (ov: any, rk: any) => {
      const list: Asset[] = ov?.data?.assets || [];
      if (list.length) {
        let changed = false;
        for (const a of list) {
          const prev = assets.current.get(a.symbol);
          if (prev && prev.score !== null && a.score !== null && Math.abs(prev.score - a.score) >= 2) { pulses.current.set(a.symbol, performance.now()); changed = true; }
          assets.current.set(a.symbol, a);
        }
        const scored = list.filter((a) => a.score !== null);
        setCount({ assets: scored.length, bull: scored.filter((a) => (a.score as number) >= 10).length, bear: scored.filter((a) => (a.score as number) <= -10).length });
        if (changed) { stateRef.current = 'DISCOVERING'; setCoreState('DISCOVERING'); window.setTimeout(() => { stateRef.current = 'IDLE'; setCoreState('IDLE'); }, 4500); }
        setAsOf(new Date(ov?.data?.generatedAt || Date.now()).toLocaleTimeString());
      }
      const r = rk?.data; const out: Array<{ a: string; b: string; bull: boolean }> = [];
      for (const [rows, bull] of [[r?.longTerm?.bullish || [], true], [r?.longTerm?.bearish || [], false]] as const) {
        for (const x of rows.slice(0, 3)) { const [a, b] = String(x.display).split('/'); if (a && b && NODES.some((n) => n.id === a) && NODES.some((n) => n.id === b)) out.push({ a, b, bull }); }
      }
      arcs.current = out;
    };
    const pull = async () => {
      if (stateRef.current === 'IDLE') { stateRef.current = 'ANALYSING'; setCoreState('ANALYSING'); }
      try { const [ov, rk] = await Promise.all([fetchJsonSafe<any>('/api/macro/overview'), fetchJsonSafe<any>('/api/macro/rankings')]); if (alive) apply(ov, rk); } catch { /* keep last */ }
      if (alive && stateRef.current === 'ANALYSING') { stateRef.current = 'IDLE'; setCoreState('IDLE'); }
    };
    apply(peekJson<any>('/api/macro/overview'), peekJson<any>('/api/macro/rankings'));
    void pull(); const t = window.setInterval(pull, 90_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  // animated counters (smooth, no jumps)
  useEffect(() => {
    let raf = 0; const step = () => { setShown((s) => { const k = (a: number, b: number) => (Math.abs(b - a) < 0.5 ? b : a + (b - a) * 0.12); const n = { assets: k(s.assets, count.assets), bull: k(s.bull, count.bull), bear: k(s.bear, count.bear) }; if (n.assets === s.assets && n.bull === s.bull && n.bear === s.bear) return s; raf = requestAnimationFrame(step); return n; }); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [count]);

  // render
  useEffect(() => {
    const c = cv.current, b = box.current; if (!c || !b) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0; const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const size = () => { W = b.clientWidth; H = b.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(b);
    let rot = 20, vel = 0, drag = false, lastX = 0; const tilt = 0.38;
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2, p: Math.random() * 6 }));
    const hit: Array<{ id: string; x: number; y: number; r: number }> = [];
    const down = (e: PointerEvent) => { drag = true; lastX = e.clientX; };
    const move = (e: PointerEvent) => { if (!drag) return; vel = (e.clientX - lastX) * 0.25; rot += vel; lastX = e.clientX; };
    const up = (e: PointerEvent) => {
      if (drag && Math.abs(vel) < 0.6) { const r = c.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; const h = hit.find((n) => Math.hypot(n.x - x, n.y - y) <= n.r + 8); setSel(h ? h.id : null); }
      drag = false; vel = 0;
    };
    c.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    let raf = 0, visible = true, last = 0;
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }); io.observe(b);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 28) return; last = now;
      const st = stateRef.current; const speed = reduce ? 0 : st === 'ANALYSING' ? 0.34 : st === 'DISCOVERING' ? 0.2 : 0.07;
      if (!drag) rot += speed;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 + 6, R = Math.min(W * 0.42, H * 0.43);
      // starfield
      for (const s of stars) { const a = 0.25 + 0.5 * Math.abs(Math.sin(now / 1500 + s.p)); ctx.fillStyle = `rgba(200,220,255,${a * s.z * 0.7})`; ctx.fillRect(((s.x * W) + (rot * s.z * 0.6)) % W, s.y * H, s.z * 1.4, s.z * 1.4); }
      // atmosphere
      const g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.45); g.addColorStop(0, `rgba(${CYAN},0.20)`); g.addColorStop(0.5, `rgba(${VIOLET},0.07)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, 7); ctx.fill();
      const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R); body.addColorStop(0, 'rgba(14,30,52,0.88)'); body.addColorStop(1, 'rgba(3,7,16,0.96)');
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(${GOLD},0.55)`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      // graticule (lat/lon)
      ctx.lineWidth = 0.6;
      for (let lat = -60; lat <= 60; lat += 30) { ctx.strokeStyle = `rgba(${CYAN},0.16)`; ctx.beginPath(); let on = false; for (let lo = -180; lo <= 180; lo += 6) { const p = proj(lat, lo, rot, tilt); if (p.z > 0) { const X = cx + p.x * R, Y = cy - p.y * R; on ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); on = true; } else on = false; } ctx.stroke(); }
      for (let lo = -180; lo < 180; lo += 30) { ctx.strokeStyle = `rgba(${CYAN},0.13)`; ctx.beginPath(); let on = false; for (let lat = -90; lat <= 90; lat += 6) { const p = proj(lat, lo, rot, tilt); if (p.z > 0) { const X = cx + p.x * R, Y = cy - p.y * R; on ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); on = true; } else on = false; } ctx.stroke(); }
      // scanning ring
      const sc = (now / 4200) % 1; ctx.strokeStyle = `rgba(${GOLD},${0.22 * (1 - sc)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, R * (0.4 + sc * 0.75), R * (0.4 + sc * 0.75) * 0.3, 0, 0, 7); ctx.stroke();
      // arcs between strongest pairs
      const pos = new Map<string, { x: number; y: number; z: number; X: number; Y: number }>();
      for (const n of NODES) { const p = proj(n.lat, n.lon, rot, tilt); pos.set(n.id, { ...p, X: cx + p.x * R, Y: cy - p.y * R }); }
      for (const a of arcs.current) {
        const A = pos.get(a.a), B = pos.get(a.b); if (!A || !B || (A.z < -0.1 && B.z < -0.1)) continue;
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, mz = (A.z + B.z) / 2; const len = Math.max(0.0001, Math.hypot(mx, my, mz)); const lift = 1.22;
        const qx = cx + (mx / len) * R * lift, qy = cy - (my / len) * R * lift; const col = a.bull ? UP : DOWN;
        ctx.strokeStyle = `rgba(${col},${0.55})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(A.X, A.Y); ctx.quadraticCurveTo(qx, qy, B.X, B.Y); ctx.stroke();
        const t = ((now / 1800) + (a.a.charCodeAt(0) % 7) / 7) % 1; const ix = (1 - t) * (1 - t) * A.X + 2 * (1 - t) * t * qx + t * t * B.X, iy = (1 - t) * (1 - t) * A.Y + 2 * (1 - t) * t * qy + t * t * B.Y;
        ctx.fillStyle = `rgba(${col},0.95)`; ctx.beginPath(); ctx.arc(ix, iy, 2.2, 0, 7); ctx.fill();
      }
      // nodes
      hit.length = 0;
      const order = NODES.map((n) => ({ n, p: pos.get(n.id)! })).sort((u, v) => u.p.z - v.p.z);
      for (const { n, p } of order) {
        const back = p.z < 0; const as = assets.current.get(n.sym); const score = as?.score ?? null;
        const col = score === null ? '148,163,184' : score >= 10 ? UP : score <= -10 ? DOWN : GOLD;
        const base = 3.4 + (score === null ? 0 : Math.min(5, Math.abs(score) / 12)); const depth = back ? 0.25 : 0.55 + 0.45 * p.z;
        if (!back) hit.push({ id: n.id, x: p.X, y: p.Y, r: base });
        const pu = pulses.current.get(n.sym); if (pu !== undefined) { const k = (now - pu) / 2600; if (k < 1) { ctx.strokeStyle = `rgba(${col},${0.7 * (1 - k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.X, p.Y, base + k * 34, 0, 7); ctx.stroke(); } else pulses.current.delete(n.sym); }
        const halo = ctx.createRadialGradient(p.X, p.Y, 0, p.X, p.Y, base * 3.2); halo.addColorStop(0, `rgba(${col},${0.55 * depth})`); halo.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.X, p.Y, base * 3.2, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(${col},${depth})`; ctx.beginPath(); ctx.arc(p.X, p.Y, base, 0, 7); ctx.fill();
        if (selRef.current === n.id) { ctx.strokeStyle = `rgba(${GOLD},0.95)`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.X, p.Y, base + 7, 0, 7); ctx.stroke(); }
        if (!back && (p.z > 0.35 || selRef.current === n.id)) { ctx.font = '600 9.5px ui-sans-serif,system-ui'; ctx.fillStyle = `rgba(226,232,240,${0.55 + 0.4 * p.z})`; ctx.fillText(n.id, p.X + base + 4, p.Y + 3); }
      }
      // core energy particles in ANALYSING
      if (st === 'ANALYSING') for (let i = 0; i < 14; i++) { const a = now / 500 + i * 0.45; const rr = R * (1.02 + 0.2 * ((i * 37) % 10) / 10); ctx.fillStyle = `rgba(${GOLD},0.6)`; ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55, 1.8, 1.8); }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); c.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, []);

  const selNode = NODES.find((n) => n.id === sel); const selAsset = selNode ? assets.current.get(selNode.sym) : undefined;
  const tone = (s: number | null) => (s === null ? 'text-slate-400' : s >= 10 ? 'text-emerald-300' : s <= -10 ? 'text-rose-300' : 'text-amber-200');
  return (
    <section data-testid="intelligence-globe" className="relative overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#02050c] shadow-[0_0_60px_-20px_rgba(212,175,55,0.35)]">
      <div ref={box} className="relative h-[330px] sm:h-[420px] w-full"><canvas ref={cv} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing touch-pan-y" /></div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,5,12,0.85)_100%)]" />
      <div className="pointer-events-none absolute left-4 top-3 sm:left-6 sm:top-5">
        <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.42em] text-[#d4af37]">PrimePipFx · Global Intelligence Core</div>
        <div className="mt-1 text-xl sm:text-3xl font-extralight uppercase tracking-[0.22em] text-slate-100">Financial Universe</div>
        <div className="mt-1.5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-cyan-300/90"><span className={`h-1.5 w-1.5 rounded-full ${coreState === 'IDLE' ? 'bg-emerald-400' : coreState === 'ANALYSING' ? 'bg-cyan-300 animate-ping' : 'bg-[#d4af37] animate-pulse'}`} />Core · {coreState}{asOf ? ` · ${asOf}` : ''}</div>
      </div>
      <div className="pointer-events-none absolute right-4 top-3 sm:right-6 sm:top-5 flex gap-4 sm:gap-6 text-right">
        {[['Assets scored', shown.assets, 'text-slate-100'], ['Bullish', shown.bull, 'text-emerald-300'], ['Bearish', shown.bear, 'text-rose-300']].map(([l, v, c]) => (
          <div key={String(l)}><div className={`text-lg sm:text-2xl font-extralight tabular-nums ${c}`}>{Math.round(v as number)}</div><div className="text-[8px] sm:text-[9px] uppercase tracking-[0.28em] text-slate-500">{l}</div></div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-4 sm:left-6 text-[9px] uppercase tracking-[0.2em] text-slate-500">Drag to rotate · tap a node · arcs = strongest long-term pairs</div>
      {selNode && (
        <div data-testid="globe-panel" className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 w-[260px] max-w-[calc(100%-1.5rem)] rounded-xl border border-[#d4af37]/40 bg-[#050a14]/90 p-3 backdrop-blur-md shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)]">
          <div className="flex items-start justify-between gap-2">
            <div><div className="text-[9px] uppercase tracking-[0.3em] text-[#d4af37]">{selNode.kind === 'fx' ? 'Currency' : selNode.kind === 'com' ? 'Commodity' : selNode.kind === 'idx' ? 'Index' : 'Crypto'}</div><div className="text-sm font-semibold text-slate-100">{selNode.name}</div></div>
            <button onClick={() => setSel(null)} className="text-slate-500 hover:text-white text-sm leading-none" aria-label="Close">×</button>
          </div>
          {selAsset && selAsset.score !== null ? (
            <>
              <div className="mt-2 flex items-baseline gap-2"><span className={`text-2xl font-extralight tabular-nums ${tone(selAsset.score)}`}>{selAsset.score > 0 ? '+' : ''}{Math.round(selAsset.score)}</span><span className="text-[10px] uppercase tracking-widest text-slate-400">{String(selAsset.bias).replace(/_/g, ' ')} · {Math.round(selAsset.confidence)}% conf</span></div>
              {selAsset.summary && <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-slate-300">{selAsset.summary}</p>}
            </>
          ) : <p className="mt-2 text-[11px] text-slate-400">Score still loading…</p>}
          <div className="mt-2.5 flex gap-2">
            <button onClick={() => onNavigate?.('FUNDAMENTAL_INDICATORS')} className="flex-1 rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#f3d98a] hover:bg-[#d4af37]/20">Fundamentals</button>
            {selNode.kind !== 'fx' && <button onClick={() => { onNavigate?.('PRO_TRADING'); window.setTimeout(() => openChart(CHART_SYM[selNode.id] || selNode.id), 250); }} className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20">Chart</button>}
          </div>
        </div>
      )}
    </section>
  );
};
export default IntelligenceGlobe;
