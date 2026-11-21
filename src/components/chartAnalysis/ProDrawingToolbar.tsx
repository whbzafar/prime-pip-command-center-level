/**
 * TradingView-style left drawing toolbar for the Unlimited chart. Same buttons in the same order as TradingView:
 * cursor · trend lines · Fib & Gann · patterns · shapes · text & notes │ magnet · stay in drawing mode · lock · hide · remove,
 * each tool group with a flyout (star any tool → it joins the draggable favourites bar), remembering the last tool used per group.
 * Drives the klinecharts overlay API directly, so drawings are saved by the chart's auto-save like before.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Chart } from 'klinecharts';
import { ICONS, Svg } from '../pine/TvLeftToolbar';
import { isLightCanvas, getCanvasColor, onCanvasColor } from '../../utils/chartCanvas';

const FAV_KEY = 'ppfx_unl_tool_favs_v1';
const LAST_KEY = 'ppfx_unl_tool_last_v1';
type Group = { id: string; title: string; tools: Array<[string, string]> };
const GROUPS: Group[] = [
  { id: 'lines', title: 'Trend line tools', tools: [['segment', 'Trend Line'], ['rayLine', 'Ray'], ['straightLine', 'Extended Line'], ['horizontalStraightLine', 'Horizontal Line'], ['horizontalRayLine', 'Horizontal Ray'], ['horizontalSegment', 'Horizontal Segment'], ['verticalStraightLine', 'Vertical Line'], ['verticalRayLine', 'Vertical Ray'], ['verticalSegment', 'Vertical Segment'], ['priceLine', 'Price Line'], ['priceChannelLine', 'Price Channel'], ['parallelStraightLine', 'Parallel Channel'], ['arrow', 'Arrow']] },
  { id: 'fib', title: 'Fib & Gann tools', tools: [['fibonacciLine', 'Fib Retracement'], ['fibonacciExtension', 'Trend-Based Fib Extension'], ['fibonacciSegment', 'Fib Segment'], ['fibonacciCircle', 'Fib Circles'], ['fibonacciSpiral', 'Fib Spiral'], ['fibonacciSpeedResistanceFan', 'Fib Speed Resistance Fan'], ['gannBox', 'Gann Box']] },
  { id: 'patterns', title: 'Patterns', tools: [['xabcd', 'XABCD Pattern'], ['abcd', 'ABCD Pattern'], ['threeWaves', 'Three Waves'], ['fiveWaves', 'Five Waves (Elliott)'], ['eightWaves', 'Eight Waves'], ['anyWaves', 'Any Waves']] },
  { id: 'shapes', title: 'Geometric shapes', tools: [['rect', 'Rectangle'], ['circle', 'Circle'], ['triangle', 'Triangle'], ['parallelogram', 'Parallelogram']] },
  { id: 'text', title: 'Text & notes', tools: [['simpleAnnotation', 'Annotation'], ['simpleTag', 'Price Tag']] },
];
const ICON_FOR: Record<string, string> = { lines: 'lines', fib: 'fib', patterns: 'patterns', shapes: 'forecast', text: 'text' };
const NAME: Record<string, string> = Object.fromEntries(GROUPS.flatMap((g) => g.tools));
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return d; } };

export const ProDrawingToolbar: React.FC<{ getChart: () => Chart | null }> = ({ getChart }) => {
  const [dark, setDark] = useState(() => !isLightCanvas(getCanvasColor()));
  const [active, setActive] = useState<string | null>(null);
  const [magnet, setMagnet] = useState<'normal' | 'weak_magnet' | 'strong_magnet'>('normal');
  const [stay, setStay] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [favs, setFavs] = useState<string[]>(() => read(FAV_KEY, []));
  const [last, setLast] = useState<Record<string, string>>(() => read(LAST_KEY, {}));
  const [trashAsk, setTrashAsk] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragMoved = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const live = useRef({ magnet, stay });
  live.current = { magnet, stay };
  const armRef = useRef<(t: string | null) => void>(() => {});

  useEffect(() => onCanvasColor((c) => setDark(!isLightCanvas(c))), []);
  useEffect(() => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* ignore */ } }, [favs]);
  useEffect(() => { try { localStorage.setItem(LAST_KEY, JSON.stringify(last)); } catch { /* ignore */ } }, [last]);
  useEffect(() => {
    if (!open && !trashAsk) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) { setOpen(null); setTrashAsk(false); } };
    document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off);
  }, [open, trashAsk]);

  const cancelInProgress = (c: Chart) => {
    try { const inst = (c as any)._chartStore?.getOverlayStore?.()._progressInstanceInfo?.instance; if (inst && inst.currentStep !== -1) c.removeOverlay(inst.id); } catch { /* ignore */ }
  };
  const arm = useCallback((tool: string | null) => {
    const c = getChart(); if (!c) return;
    cancelInProgress(c);
    setOpen(null);
    if (!tool) { setActive(null); return; }
    setActive(tool);
    try {
      c.createOverlay({
        name: tool, mode: live.current.magnet as any, lock: false, visible: true,
        onDrawEnd: () => { if (live.current.stay) window.setTimeout(() => armRef.current(tool), 0); else setActive((a) => (a === tool ? null : a)); return false; },
      } as any);
    } catch { setActive(null); }
  }, [getChart]);
  armRef.current = arm;

  const pick = (gid: string | null, tool: string) => { if (gid) setLast((l) => ({ ...l, [gid]: tool })); arm(active === tool && !gid ? null : tool); };
  const toggleFav = (t: string) => setFavs((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]));
  const all = (patch: Record<string, unknown>) => { try { getChart()?.overrideOverlay(patch as any); } catch { /* ignore */ } };

  const bg = dark ? '#131722' : '#ffffff', fg = dark ? '#b2b5be' : '#131722', hov = dark ? '#2a2e39' : '#f0f3fa', line = dark ? '#363a45' : '#e0e3eb', sel = dark ? '#2a2e39' : '#e3effd';
  const btn = (on: boolean): React.CSSProperties => ({ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? '#2962ff' : fg, background: on ? sel : 'transparent', borderRadius: 4, border: 0, cursor: 'pointer', position: 'relative' });
  const Btn: React.FC<{ id: string; icon: React.ReactNode; on: boolean; title: string; onClick: () => void; onArrow?: (e: React.MouseEvent<HTMLButtonElement>) => void; badge?: string }> = ({ id, icon, on, title, onClick, onArrow, badge }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="ppfx-unl-row">
      <button type="button" data-testid={`unl-${id}`} title={title} aria-label={title} aria-pressed={on} onClick={onClick} style={btn(on)}
        onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = hov; }} onMouseLeave={(e) => { e.currentTarget.style.background = on ? sel : 'transparent'; }}>
        {icon}{badge && <span style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 9, fontWeight: 800, color: '#2962ff' }}>{badge}</span>}
      </button>
      {onArrow && <button type="button" aria-label={`${title} — more tools`} onClick={onArrow} style={{ position: 'absolute', right: -3, top: 8, width: 13, height: 24, border: 0, borderRadius: 3, background: hov, color: fg, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, lineHeight: '24px' }}>›</button>}
    </div>
  );
  const sep = <div style={{ width: 28, height: 1, background: line, margin: '4px 0' }} />;
  const lockIcon = <Svg><rect x="8" y="13" width="12" height="8" rx="1.5" /><path d={locked ? 'M10 13v-3a4 4 0 0 1 8 0v3' : 'M10 13v-3a4 4 0 0 1 7.5-1.8'} /></Svg>;
  const eyeIcon = <Svg><path d="M4 14s3.5-6 10-6 10 6 10 6-3.5 6-10 6S4 14 4 14Z" /><circle cx="14" cy="14" r="2.6" />{hidden && <path d="M6 22 22 6" />}</Svg>;

  return (
    <>
      <style>{'.ppfx-unl-row:hover button[aria-label$="more tools"]{opacity:1!important}.ppfx-unl-row button[aria-label$="more tools"]{opacity:.55}'}</style>
      <div ref={root} data-testid="unl-left-toolbar" style={{ width: 48, flex: '0 0 48px', background: bg, borderRight: `1px solid ${line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', gap: 2, height: '100%', overflowY: 'auto', overflowX: 'visible', position: 'relative', zIndex: 30 }}>
        <Btn id="cursor" icon={ICONS.cursor} title="Cross / Cursor" on={!active} onClick={() => arm(null)} />
        {GROUPS.map((g) => {
          const cur = last[g.id] && NAME[last[g.id]] && g.tools.some(([k]) => k === last[g.id]) ? last[g.id] : g.tools[0][0];
          return (
            <div key={g.id} data-grp={g.id} style={{ position: 'relative' }}>
              <Btn id={g.id} icon={ICONS[ICON_FOR[g.id]]} title={NAME[cur]} on={!!active && g.tools.some(([k]) => k === active)} onClick={() => pick(g.id, cur)}
                onArrow={(e) => { const r = (e.currentTarget.closest('[data-grp]') as HTMLElement).getBoundingClientRect(); setPos({ x: r.right + 4, y: Math.max(8, Math.min(r.top, window.innerHeight - 380)) }); setOpen(open === g.id ? null : g.id); }} />
              {open === g.id && (
                <div role="menu" style={{ position: 'fixed', left: pos.x, top: pos.y, width: 280, maxHeight: 360, overflowY: 'auto', background: bg, color: fg, border: `1px solid ${line}`, borderRadius: 6, boxShadow: '0 8px 28px rgba(0,0,0,.28)', padding: '4px 0', zIndex: 80 }}>
                  <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .6 }}>{g.title}</div>
                  {g.tools.map(([k, label]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', height: 32, padding: '0 8px 0 14px', cursor: 'pointer', fontSize: 13, background: active === k ? sel : 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = hov; }} onMouseLeave={(e) => { e.currentTarget.style.background = active === k ? sel : 'transparent'; }}>
                      <span style={{ flex: 1 }} onClick={() => pick(g.id, k)}>{label}</span>
                      <button type="button" data-testid={`unl-star-${k}`} aria-label={favs.includes(k) ? 'Remove from favorites' : 'Add to favorites'} onClick={(e) => { e.stopPropagation(); toggleFav(k); }}
                        style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 15, color: favs.includes(k) ? '#f5b50a' : fg, opacity: favs.includes(k) ? 1 : .45 }}>{favs.includes(k) ? '★' : '☆'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {sep}
        <Btn id="magnet" icon={ICONS.magnet} title={`Magnet mode: ${magnet === 'normal' ? 'off' : magnet === 'weak_magnet' ? 'weak' : 'strong'} (click to change)`} on={magnet !== 'normal'} badge={magnet === 'strong_magnet' ? 'S' : magnet === 'weak_magnet' ? 'W' : undefined}
          onClick={() => setMagnet((m) => (m === 'normal' ? 'weak_magnet' : m === 'weak_magnet' ? 'strong_magnet' : 'normal'))} />
        <Btn id="stay" icon={ICONS.stay} title="Stay in drawing mode" on={stay} onClick={() => setStay((v) => !v)} />
        {sep}
        <Btn id="lock" icon={lockIcon} title={locked ? 'Unlock all drawings' : 'Lock all drawings'} on={locked} onClick={() => { const n = !locked; setLocked(n); all({ lock: n }); }} />
        <Btn id="hide" icon={eyeIcon} title={hidden ? 'Show all drawings' : 'Hide all drawings'} on={hidden} onClick={() => { const n = !hidden; setHidden(n); all({ visible: !n }); }} />
        <div style={{ flex: 1 }} />
        <Btn id="trash" icon={ICONS.trash} title={trashAsk ? 'Click again to remove ALL drawings' : 'Remove drawings'} on={trashAsk}
          onClick={() => { if (!trashAsk) { setTrashAsk(true); window.setTimeout(() => setTrashAsk(false), 4000); return; } setTrashAsk(false); try { const c = getChart(); if (c) { cancelInProgress(c); c.removeOverlay(); } } catch { /* ignore */ } setActive(null); }} />
      </div>
      {favs.length > 0 && (
        <div data-testid="unl-fav-bar" style={{ position: 'absolute', top: 8, left: 56, width: 'max-content', zIndex: 40, display: 'flex', alignItems: 'center', gap: 2, background: bg, color: fg, border: `1px solid ${line}`, borderRadius: 6, padding: 3, boxShadow: '0 4px 16px rgba(0,0,0,.2)', maxWidth: 'min(calc(100vw - 120px), 720px)', overflowX: 'auto' }}>
          <span title="Favorite drawing tools — drag a tool to reorder" style={{ color: '#f5b50a', padding: '4px 6px', fontSize: 14 }}>★</span>
          {favs.map((t) => (
            <button key={t} type="button" data-fav={t} title={`${NAME[t] || t} — drag to reorder`}
              onClick={() => { if (dragMoved.current) { dragMoved.current = false; return; } pick(null, t); }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const bar = e.currentTarget.parentElement as HTMLElement; const el = e.currentTarget; const sx = e.clientX; dragMoved.current = false;
                const move = (ev: PointerEvent) => {
                  if (!dragMoved.current && Math.abs(ev.clientX - sx) < 5) return;
                  dragMoved.current = true; setDragging(t);
                  const items = Array.from(bar.querySelectorAll('[data-fav]')) as HTMLElement[]; const from = items.indexOf(el); let to = from;
                  items.forEach((it, i) => { if (it === el) return; const r = it.getBoundingClientRect(); const mid = r.left + r.width / 2; if (i < from && ev.clientX < mid) to = Math.min(to, i); if (i > from && ev.clientX > mid) to = Math.max(to, i); });
                  if (to !== from) setFavs((f) => { const a = [...f]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; });
                };
                const up = () => { setDragging(null); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.setTimeout(() => { dragMoved.current = false; }, 0); };
                window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
              }}
              style={{ border: 0, cursor: dragging === t ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none', borderRadius: 4, padding: '4px 9px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: active === t ? '#2962ff' : fg, background: dragging === t ? hov : active === t ? sel : 'transparent' }}>{NAME[t] || t}</button>
          ))}
        </div>
      )}
    </>
  );
};
export default ProDrawingToolbar;
