/**
 * TradingView-style left drawing toolbar for the Pro chart: same buttons in the same order
 * (cursor · trend lines · Fib · patterns · forecasting · brushes · text · icons │ measure · zoom · magnet · stay │ trash),
 * with flyouts, a star on every tool and a floating favourites bar for the starred tools. Drives the chart's drawings API.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

type Chart = any;
const THEME_KEY = 'ppfx_pro_chart_theme_v1';
const FAV_KEY = 'ppfx_pro_tool_favs_v2';
const LAST_KEY = 'ppfx_pro_tool_last_v1';

const L: Record<string, string> = {
  trendline: 'Trend Line', ray: 'Ray', extendedline: 'Extended Line', hline: 'Horizontal Line', vline: 'Vertical Line', hray: 'Horizontal Ray', crossline: 'Cross Line', infoline: 'Info Line', trendangle: 'Trend Angle',
  parallelchannel: 'Parallel Channel', disjointchannel: 'Disjoint Channel', flattopbottom: 'Flat Top/Bottom', regressionchannel: 'Regression Trend',
  fibretracement: 'Fib Retracement', fibextension: 'Trend-Based Fib Extension', fibchannel: 'Fib Channel', fibtimezones: 'Fib Time Zone', fibfan: 'Fib Speed Resistance Fan', fibcircles: 'Fib Circles', fibarcs: 'Fib Speed Resistance Arcs', fibspiral: 'Fib Spiral', gannfan: 'Gann Fan', gannbox: 'Gann Box', gannsquare: 'Gann Square', pitchfork: 'Pitchfork', schiffpitchfork: 'Schiff Pitchfork',
  xabcd: 'XABCD Pattern', abcd: 'ABCD Pattern', headshoulders: 'Head and Shoulders', gartley: 'Gartley Pattern', bat: 'Bat Pattern', butterfly: 'Butterfly Pattern', crab: 'Crab Pattern', shark: 'Shark Pattern', cypher: 'Cypher Pattern', elliottimpulse: 'Elliott Impulse Wave', elliottcorrection: 'Elliott Correction Wave',
  position: 'Long/Short Position', datepricerange: 'Date and Price Range', fairvaluegap: 'Fair Value Gap', orderblock: 'Order Block', liquidity: 'Liquidity', anchoredvwap: 'Anchored VWAP', fixedrangevp: 'Fixed Range Volume Profile',
  freehand: 'Brush', highlighter: 'Highlighter', box: 'Rectangle', rotatedrect: 'Rotated Rectangle', circle: 'Circle', ellipse: 'Ellipse', triangle: 'Triangle', polyline: 'Polyline', path: 'Path', arc: 'Arc', curve: 'Curve', arrow: 'Arrow',
  text: 'Text', note: 'Note', pricenote: 'Price Note', comment: 'Comment', callout: 'Callout', pricelabel: 'Price Label', signpost: 'Signpost',
  iconstamp: 'Emoji / Icon', flagmark: 'Flag Mark', arrowmarkup: 'Arrow Mark Up', arrowmarkdown: 'Arrow Mark Down', magnifier: 'Zoom In',
};
const label = (k: string) => L[k] || k.replace(/([a-z])([A-Z])/g, '$1 $2');

const GROUPS: Array<{ id: string; title: string; tools: string[] }> = [
  { id: 'lines', title: 'Trend line tools', tools: ['trendline', 'ray', 'extendedline', 'hline', 'vline', 'hray', 'crossline', 'infoline', 'trendangle', 'parallelchannel', 'disjointchannel', 'flattopbottom', 'regressionchannel'] },
  { id: 'fib', title: 'Fib & Gann tools', tools: ['fibretracement', 'fibextension', 'fibchannel', 'fibtimezones', 'fibfan', 'fibcircles', 'fibarcs', 'fibspiral', 'gannfan', 'gannbox', 'gannsquare', 'pitchfork', 'schiffpitchfork'] },
  { id: 'patterns', title: 'Patterns', tools: ['xabcd', 'abcd', 'headshoulders', 'gartley', 'bat', 'butterfly', 'crab', 'shark', 'cypher', 'elliottimpulse', 'elliottcorrection'] },
  { id: 'forecast', title: 'Prediction & measurement', tools: ['position', 'datepricerange', 'fairvaluegap', 'orderblock', 'liquidity', 'anchoredvwap', 'fixedrangevp'] },
  { id: 'brush', title: 'Brushes & shapes', tools: ['freehand', 'highlighter', 'box', 'rotatedrect', 'circle', 'ellipse', 'triangle', 'polyline', 'path', 'arc', 'curve', 'arrow'] },
  { id: 'text', title: 'Text & notes', tools: ['text', 'note', 'pricenote', 'comment', 'callout', 'pricelabel', 'signpost'] },
  { id: 'icons', title: 'Icons', tools: ['iconstamp', 'flagmark', 'arrowmarkup', 'arrowmarkdown'] },
];

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS: Record<string, React.ReactNode> = {
  cursor: <Svg><path d="M14 6v16M6 14h16" /><circle cx="14" cy="14" r="1.6" fill="currentColor" /></Svg>,
  lines: <Svg><path d="M7 21 21 7" /><circle cx="7" cy="21" r="2" /><circle cx="21" cy="7" r="2" /></Svg>,
  fib: <Svg><path d="M7 8h14M7 13h14M7 18h14M7 23h14" /><path d="M7 8v15" /></Svg>,
  patterns: <Svg><path d="M6 20 11 9l5 8 6-11" /><circle cx="6" cy="20" r="1.8" /><circle cx="11" cy="9" r="1.8" /><circle cx="16" cy="17" r="1.8" /><circle cx="22" cy="6" r="1.8" /></Svg>,
  forecast: <Svg><rect x="6" y="6" width="16" height="16" rx="1" /><path d="M6 14h16M14 6v16" /><path d="m17 11 3-3m-3 0h3v3" /></Svg>,
  brush: <Svg><path d="M20 7c1.5 1.5 1.5 3 0 4.5L13 18l-3-3 6.5-7C18 6.5 19 6 20 7Z" /><path d="M10 15c-2 0-3 1.5-3 3.5 0 1 .5 2 1.5 2 2 0 4-1.5 3.5-3.5" /></Svg>,
  text: <Svg><path d="M8 8h12M14 8v13M11 21h6" /></Svg>,
  icons: <Svg><circle cx="14" cy="14" r="8" /><path d="M11 12v1M17 12v1M10.5 16.5c1 1.6 5.5 1.6 7 0" /></Svg>,
  measure: <Svg><rect x="4" y="11" width="20" height="7" rx="1" transform="rotate(-35 14 14.5)" /><path d="m9 16 1.5 1.3m1.5-3.8L13.5 14m1-4 1.4 1.2m1.4-3.9L18.7 8" transform="translate(-0.5 3)" /></Svg>,
  zoom: <Svg><circle cx="12.5" cy="12.5" r="6" /><path d="m17 17 5 5M12.5 10v5M10 12.5h5" /></Svg>,
  magnet: <Svg><path d="M8 20v-8a6 6 0 0 1 12 0v8h-4v-8a2 2 0 0 0-4 0v8H8Z" /><path d="M8 17h4M16 17h4" /></Svg>,
  stay: <Svg><path d="m9 21 2-5 8-8 3 3-8 8-5 2Z" /><rect x="5" y="4" width="8" height="6" rx="1" /><path d="M7 4V3a2 2 0 0 1 4 0v1" /></Svg>,
  trash: <Svg><path d="M8 9h12M12 9V7h4v2M10 9l1 12h6l1-12" /></Svg>,
};

export const TvLeftToolbar: React.FC<{ getChart: () => Chart | null; ready: boolean; onClearAll: () => void; hasObjects?: () => boolean }> = ({ getChart, ready, onClearAll }) => {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; } });
  const [active, setActive] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [snap, setSnap] = useState<'off' | 'weak' | 'strong'>('off');
  const [stay, setStay] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } });
  const [last, setLast] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); } catch { return {}; } });
  const [trashAsk, setTrashAsk] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { const f = () => { try { setDark(localStorage.getItem(THEME_KEY) === 'dark'); } catch { /* ignore */ } }; window.addEventListener('ppfx:pro-theme', f); return () => window.removeEventListener('ppfx:pro-theme', f); }, []);
  useEffect(() => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* ignore */ } try { getChart()?.drawings?.setFavorites?.(favs); } catch { /* ignore */ } }, [favs, getChart, ready]);
  useEffect(() => { try { localStorage.setItem(LAST_KEY, JSON.stringify(last)); } catch { /* ignore */ } }, [last]);
  useEffect(() => {
    const c = getChart(); if (!ready || !c) return;
    const offs = [
      c.on?.('drawing:tool', (e: any) => setActive(e?.type ?? null)),
      c.on?.('drawing:mode', (e: any) => setMode(e?.mode ?? null)),
      c.on?.('drawing:snap', (e: any) => setSnap(e?.mode ?? 'off')),
      c.on?.('drawing:stay', (e: any) => setStay(!!e?.on)),
    ];
    try { setSnap(c.drawings?.getSnapMode?.() || 'off'); setStay(!!c.drawings?.getStayMode?.()); } catch { /* ignore */ }
    return () => offs.forEach((o) => { try { o?.(); } catch { /* ignore */ } });
  }, [ready, getChart]);
  useEffect(() => {
    if (!open && !trashAsk) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) { setOpen(null); setTrashAsk(false); } };
    document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off);
  }, [open, trashAsk]);

  const arm = useCallback((gid: string | null, tool: string | null) => {
    const c = getChart(); if (!c?.drawings) return;
    try { c.drawings.setMode?.(null); c.drawings.setTool(tool); } catch { /* ignore */ }
    if (gid && tool) setLast((l) => ({ ...l, [gid]: tool }));
    setOpen(null);
  }, [getChart]);
  const toggleFav = (t: string) => setFavs((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]));
  const cycleSnap = () => { const n = snap === 'off' ? 'weak' : snap === 'weak' ? 'strong' : 'off'; try { getChart()?.drawings?.setSnapMode(n); setSnap(n); } catch { /* ignore */ } };

  const bg = dark ? '#131722' : '#ffffff', fg = dark ? '#b2b5be' : '#131722', hov = dark ? '#2a2e39' : '#f0f3fa', line = dark ? '#363a45' : '#e0e3eb', sel = dark ? '#2a2e39' : '#e3effd';
  const btn = (on: boolean): React.CSSProperties => ({ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? '#2962ff' : fg, background: on ? sel : 'transparent', borderRadius: 4, border: 0, cursor: 'pointer', position: 'relative' });
  const Btn: React.FC<{ id: string; icon: string; on: boolean; title: string; onClick: () => void; arrow?: boolean; onArrow?: (e: React.MouseEvent<HTMLButtonElement>) => void; extra?: React.ReactNode }> = ({ id, icon, on, title, onClick, arrow, onArrow, extra }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="ppfx-tvl-row">
      <button type="button" data-testid={`tvl-${id}`} title={title} aria-label={title} aria-pressed={on} onClick={onClick} style={btn(on)}
        onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = hov; }} onMouseLeave={(e) => { e.currentTarget.style.background = on ? sel : 'transparent'; }}>{ICONS[icon]}{extra}</button>
      {arrow && <button type="button" aria-label={`${title} — more`} onClick={onArrow} style={{ position: 'absolute', right: -3, top: 8, width: 13, height: 24, border: 0, borderRadius: 3, background: hov, color: fg, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, opacity: 1, lineHeight: '24px' }} className="ppfx-tvl-arrow">›</button>}
    </div>
  );

  return (
    <>
      <style>{`.ppfx-tvl-row:hover .ppfx-tvl-arrow{opacity:1!important}`}</style>
      <div ref={root} data-testid="tv-left-toolbar" style={{ width: 48, background: bg, borderRight: `1px solid ${line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', gap: 2, height: '100%', overflowY: 'auto', overflowX: 'visible', position: 'relative', zIndex: 30 }}>
        <Btn id="cursor" icon="cursor" title="Cross / Cursor" on={!active && !mode} onClick={() => arm(null, null)} />
        {GROUPS.map((g) => {
          const cur = last[g.id] && g.tools.includes(last[g.id]) ? last[g.id] : g.tools[0];
          return (
            <div key={g.id} data-grp={g.id} style={{ position: 'relative' }}>
              <Btn id={g.id} icon={g.id} title={label(cur)} on={!!active && g.tools.includes(active)} onClick={() => arm(g.id, cur)} arrow onArrow={(e) => { const r = (e.currentTarget.closest('[data-grp]') as HTMLElement).getBoundingClientRect(); setPos({ x: r.right + 4, y: Math.max(8, Math.min(r.top, window.innerHeight - 380)) }); setOpen(open === g.id ? null : g.id); }} />
              {open === g.id && (
                <div role="menu" style={{ position: 'fixed', left: pos.x, top: pos.y, width: 280, maxHeight: 360, overflowY: 'auto', background: bg, color: fg, border: `1px solid ${line}`, borderRadius: 6, boxShadow: '0 8px 28px rgba(0,0,0,.28)', padding: '4px 0', zIndex: 80 }}>
                  <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .6 }}>{g.title}</div>
                  {g.tools.map((t) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', height: 32, padding: '0 8px 0 14px', cursor: 'pointer', fontSize: 13, background: active === t ? sel : 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = hov; }} onMouseLeave={(e) => { e.currentTarget.style.background = active === t ? sel : 'transparent'; }}>
                      <span style={{ flex: 1 }} onClick={() => arm(g.id, t)}>{label(t)}</span>
                      <button type="button" data-testid={`tvl-star-${t}`} aria-label={favs.includes(t) ? 'Remove from favorites' : 'Add to favorites'} onClick={(e) => { e.stopPropagation(); toggleFav(t); }} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 15, color: favs.includes(t) ? '#f5b50a' : fg, opacity: favs.includes(t) ? 1 : .45 }}>{favs.includes(t) ? '★' : '☆'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ width: 28, height: 1, background: line, margin: '4px 0' }} />
        <Btn id="measure" icon="measure" title="Measure" on={mode === 'measure'} onClick={() => { const c = getChart(); try { c?.drawings?.setTool(null); c?.drawings?.setMode(mode === 'measure' ? null : 'measure'); } catch { /* ignore */ } }} />
        <Btn id="zoom" icon="zoom" title="Zoom in" on={active === 'magnifier'} onClick={() => arm(null, active === 'magnifier' ? null : 'magnifier')} />
        <div style={{ width: 28, height: 1, background: line, margin: '4px 0' }} />
        <Btn id="magnet" icon="magnet" title={`Magnet mode: ${snap}`} on={snap !== 'off'} onClick={cycleSnap} extra={snap === 'strong' ? <span style={{ position: 'absolute', right: 6, bottom: 6, width: 6, height: 6, borderRadius: 3, background: '#2962ff' }} /> : null} />
        <Btn id="stay" icon="stay" title="Stay in drawing mode" on={stay} onClick={() => { const n = !stay; try { getChart()?.drawings?.setStayMode(n); setStay(n); } catch { /* ignore */ } }} />
        <div style={{ flex: 1 }} />
        <div data-grp="trash" style={{ position: 'relative' }}>
          <Btn id="trash" icon="trash" title={trashAsk ? 'Click again to remove ALL drawings' : 'Remove drawings'} on={trashAsk} onClick={() => { if (!trashAsk) { setTrashAsk(true); window.setTimeout(() => setTrashAsk(false), 4000); return; } setTrashAsk(false); onClearAll(); }} />
                  </div>
      </div>
      {favs.length > 0 && (
        <div data-testid="tv-fav-bar" style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 40, display: 'flex', gap: 2, background: bg, color: fg, border: `1px solid ${line}`, borderRadius: 6, padding: 3, boxShadow: '0 4px 16px rgba(0,0,0,.2)', maxWidth: '70%', overflowX: 'auto' }}>
          <span title="Favorite drawing tools" style={{ color: '#f5b50a', padding: '4px 6px', fontSize: 14 }}>★</span>
          {favs.map((t) => (
            <button key={t} type="button" data-testid={`tv-fav-${t}`} title={label(t)} onClick={() => arm(null, active === t ? null : t)} style={{ border: 0, cursor: 'pointer', borderRadius: 4, padding: '4px 9px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: active === t ? '#2962ff' : fg, background: active === t ? sel : 'transparent' }}>{label(t)}</button>
          ))}
        </div>
      )}
    </>
  );
};
export default TvLeftToolbar;
