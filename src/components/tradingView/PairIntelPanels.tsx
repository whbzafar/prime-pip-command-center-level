/**
 * Real, per-pair intelligence for the Premium TradingView right dock (no simulated data):
 *  · Sentiment & COT — live retail positioning (FXSSI brokers / crypto exchanges) + CFTC
 *    non-commercial positioning for each leg, combined into one positioning verdict.
 *  · Seasonality — computed from the instrument's real monthly history (Dukascopy archive since
 *    the 1970s for FX, Yahoo for indices/stocks, Binance for crypto), by lookback window.
 *  · News — TradingView's live news timeline for the selected symbol.
 *  · Economic calendar — TradingView's live calendar widget.
 *  · Pair widget — fundamentals + seasonality + COT non-commercials + sentiment in one view.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Building2, CalendarDays, Info, Landmark, RefreshCw, Users } from 'lucide-react';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS } from '../chartAnalysis/fullHistoryDatafeed';

// ───────────────────────────────────────────── symbol mapping
const ENGINE: Record<string, string> = { SPX500: 'US500', NAS100: 'US100', USOIL: 'WTIUSD', BRENT: 'WTIUSD', UKOIL: 'WTIUSD', COPPER: 'XCUUSD', NATGAS: 'NATGASUSD' };
const CATALOG_ALIAS: Record<string, string> = { SPX500: 'US500', NAS100: 'US100', BRENT: 'UKOIL' };
export const cleanSym = (s: string) => s.replace(/^[A-Z_]+:/, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const engineSymbolFor = (s: string) => { const c = cleanSym(s); return ENGINE[c] || c.replace(/USDT$/, 'USD'); };
export const catalogEntryFor = (s: string) => { const c = cleanSym(s); return CATALOG.find((e) => e.ticker === (CATALOG_ALIAS[c] || c)); };

const fmtK = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`);
const sign = (n: number | null | undefined, d = 1) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(d)}`);
const tone = (n: number | null | undefined) => (n === null || n === undefined ? 'text-slate-400' : n > 0 ? 'text-emerald-400' : n < 0 ? 'text-rose-400' : 'text-slate-300');

// ───────────────────────────────────────────── data hook
export interface PairIntel {
  kind: 'pair' | 'asset'; symbol: string; display: string;
  score: number | null; bias: string; confidence: number; explanation: string;
  legs: Array<{ code: string; name: string; score: number | null; inst: any | null }>;
  sentiment: any | null; crowd: Array<{ currency: string; longPct: number }>;
  pillars?: Array<{ name: string; score: number | null; weight: number }>;
}

const intelCache = new Map<string, { at: number; data: PairIntel | null; err?: string }>();
export function usePairIntel(symbol: string, pollMs = 60_000) {
  const eng = engineSymbolFor(symbol);
  const hit = intelCache.get(eng);
  const [data, setData] = useState<PairIntel | null>(hit?.data || null);
  const [error, setError] = useState<string | null>(hit?.err || null);
  const [loading, setLoading] = useState(!hit);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        let intel: PairIntel | null = null;
        const pr = await fetch(`/api/macro/pair/${eng}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (pr?.ok) {
          const p = pr.data;
          intel = {
            kind: 'pair', symbol: p.symbol, display: p.display, score: p.score, bias: p.bias, confidence: p.confidence, explanation: p.explanation,
            legs: [
              { code: p.base, name: pr.base?.name || p.base, score: p.baseScore, inst: pr.institutional?.base?.available ? pr.institutional.base : null },
              { code: p.quote, name: pr.quote?.name || p.quote, score: p.quoteScore, inst: pr.institutional?.quote?.available ? pr.institutional.quote : null },
            ],
            sentiment: pr.sentiment?.pair || null,
            crowd: [pr.sentiment?.base, pr.sentiment?.quote].filter(Boolean),
          };
        } else {
          const [ar, se] = await Promise.all([
            fetch(`/api/macro/asset/${eng}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch('/api/macro/sentiment').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          ]);
          if (ar?.ok) {
            const a = ar.data;
            const c = cleanSym(symbol);
            const row = se?.ok ? se.data.rows.find((r: any) => r.symbol === c || r.symbol === eng || r.symbol === CATALOG_ALIAS[c]) : null;
            intel = {
              kind: 'asset', symbol: a.symbol, display: a.name, score: a.score, bias: a.bias, confidence: a.confidence,
              explanation: a.summary || a.explanation || '',
              legs: [{ code: a.symbol, name: a.name, score: a.score, inst: ar.institutional?.available ? ar.institutional : null }],
              sentiment: row, crowd: [],
              pillars: (a.pillars || []).map((p: any) => ({ name: p.name, score: p.score, weight: p.weight })),
            };
          }
        }
        intelCache.set(eng, { at: Date.now(), data: intel, err: intel ? undefined : `No live fundamentals for ${symbol}` });
        if (live) { setData(intel); setError(intel ? null : `No live fundamental coverage for ${symbol}.`); }
      } catch (e: any) { if (live) setError(e?.message || 'Unavailable'); }
      finally { if (live) setLoading(false); }
    };
    if (!hit || Date.now() - hit.at > pollMs) load(); else { setData(hit.data); setLoading(false); }
    const id = setInterval(load, pollMs);
    return () => { live = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng, pollMs]);
  return { data, error, loading };
}

/** Combined positioning verdict: CFTC speculators (52-week COT index) + contrarian retail crowd. */
export function positioningVerdict(intel: PairIntel | null) {
  if (!intel) return null;
  const parts: Array<{ label: string; v: number }> = [];
  const idx = (inst: any) => (inst?.speculators?.cotIndex52w ?? null) as number | null;
  if (intel.kind === 'pair') {
    const b = idx(intel.legs[0]?.inst), q = idx(intel.legs[1]?.inst);
    if (b !== null && q !== null) parts.push({ label: 'Institutional (COT)', v: (b - 50) - (q - 50) });
    else if (b !== null) parts.push({ label: 'Institutional (COT)', v: (b - 50) * 2 });
    else if (q !== null) parts.push({ label: 'Institutional (COT)', v: -(q - 50) * 2 });
  } else {
    const a = idx(intel.legs[0]?.inst);
    if (a !== null) parts.push({ label: 'Institutional (COT)', v: (a - 50) * 2 });
  }
  if (intel.sentiment?.longPct !== undefined) parts.push({ label: 'Retail crowd (contrarian)', v: (50 - intel.sentiment.longPct) * 2 });
  if (!parts.length) return null;
  const v = Math.max(-100, Math.min(100, parts.reduce((s, p) => s + p.v, 0) / parts.length));
  return { score: Math.round(v), bullPct: Math.round(50 + v / 2), parts };
}

// ───────────────────────────────────────────── small UI pieces
const Split: React.FC<{ longPct: number; h?: string }> = ({ longPct, h = 'h-2' }) => (
  <div className={`relative w-full ${h} rounded-full overflow-hidden bg-rose-500/80`}>
    <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${longPct}%` }} />
    <div className="absolute inset-y-0 left-1/2 w-px bg-slate-950/70" />
  </div>
);
const Section: React.FC<{ title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, right, children }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
    <div className="flex items-center gap-1.5 mb-2">
      {icon}<span className="text-[10.5px] font-mono-code uppercase tracking-[0.14em] text-slate-400">{title}</span>
      <span className="ml-auto">{right}</span>
    </div>
    {children}
  </div>
);
const Loading: React.FC<{ text?: string }> = ({ text = 'Loading live data…' }) => (
  <div className="flex items-center gap-2 text-[11.5px] text-slate-500 py-6 justify-center"><RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />{text}</div>
);
const Verdict: React.FC<{ title: string; bullPct: number; sub?: string }> = ({ title, bullPct, sub }) => {
  const bull = bullPct > 52, bear = bullPct < 48;
  return (
    <div className={`rounded-xl border p-3 ${bull ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : bear ? 'border-rose-500/40 bg-rose-500/[0.07]' : 'border-slate-700 bg-slate-900/60'}`}>
      <div className="text-[10px] font-mono-code uppercase tracking-[0.14em] text-slate-400">{title}</div>
      <div className="flex items-baseline gap-2 mt-1">
        {bull ? <ArrowUpRight className="w-5 h-5 text-emerald-400 self-center" /> : bear ? <ArrowDownRight className="w-5 h-5 text-rose-400 self-center" /> : null}
        <span className={`text-xl font-bold ${bull ? 'text-emerald-300' : bear ? 'text-rose-300' : 'text-slate-200'}`}>{bull ? 'Bullish' : bear ? 'Bearish' : 'Neutral'} {bull ? bullPct : bear ? 100 - bullPct : 50}%</span>
      </div>
      <div className="mt-2"><Split longPct={bullPct} h="h-1.5" /></div>
      {sub && <div className="mt-1.5 text-[10.5px] text-slate-500 leading-relaxed">{sub}</div>}
    </div>
  );
};

const CotLeg: React.FC<{ code: string; name: string; inst: any | null; compact?: boolean }> = ({ code, name, inst, compact }) => {
  if (!inst) return <div className="text-[11px] text-slate-500">{code}: no CFTC futures market publishes institutional positioning for this leg.</div>;
  const s = inst.speculators, c = inst.commercials;
  const hist: Array<{ specNet: number }> = (inst.history || []).slice(-16);
  const max = Math.max(1, ...hist.map((h) => Math.abs(h.specNet)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-100 text-[12.5px]">{code}</span>
        <span className="text-[10px] text-slate-500 truncate">{inst.market || name}</span>
        <span className={`ml-auto text-[11px] font-mono-code font-bold ${tone(s.net)}`}>{s.net > 0 ? 'Net long' : 'Net short'} {fmtK(Math.abs(s.net))}</span>
      </div>
      <Split longPct={s.longPct} h="h-1.5" />
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono-code">
        <div><div className="text-slate-500">Long</div><div className="text-emerald-300">{fmtK(s.long)}</div></div>
        <div><div className="text-slate-500">Short</div><div className="text-rose-300">{fmtK(s.short)}</div></div>
        <div><div className="text-slate-500">Δ week</div><div className={tone(s.netChange)}>{s.netChange > 0 ? '+' : ''}{fmtK(s.netChange)}</div></div>
        {!compact && <>
          <div><div className="text-slate-500">COT idx 52w</div><div className="text-slate-200">{s.cotIndex52w?.toFixed?.(0) ?? '—'}</div></div>
          <div><div className="text-slate-500">idx 3y</div><div className="text-slate-200">{s.cotIndex3y?.toFixed?.(0) ?? '—'}</div></div>
          <div><div className="text-slate-500">Commercials</div><div className={tone(c?.net)}>{c ? fmtK(c.net) : '—'}</div></div>
        </>}
      </div>
      {!compact && hist.length > 2 && (
        <div className="flex items-center gap-[2px] h-8" title="Non-commercial net position, last 16 weeks">
          {hist.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-center h-full">
              <div className={`${h.specNet >= 0 ? 'bg-emerald-500/70 self-end' : 'bg-rose-500/70'} w-full rounded-[1px]`} style={{ height: `${Math.max(6, (Math.abs(h.specNet) / max) * 100) / 2}%`, marginTop: h.specNet >= 0 ? 'auto' : '50%', marginBottom: h.specNet >= 0 ? '50%' : 'auto' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ───────────────────────────────────────────── 1. Sentiment & COT
export const SentimentCotPanel: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, error, loading } = usePairIntel(symbol);
  const verdict = positioningVerdict(data);
  if (loading && !data) return <Loading />;
  if (!data) return <div className="text-[12px] text-amber-300 p-2">{error}</div>;
  const s = data.sentiment;
  const reportDate = data.legs.find((l) => l.inst)?.inst?.reportDate;
  const nextRelease = data.legs.find((l) => l.inst)?.inst?.nextReleaseAt;
  return (
    <div className="space-y-2.5">
      {verdict && <Verdict title={`${data.display} positioning`} bullPct={verdict.bullPct} sub={verdict.parts.map((p) => `${p.label} ${sign(p.v, 0)}`).join(' · ') + ' — averaged into one score.'} />}
      <Section title="Retail sentiment (live)" icon={<Users className="w-3.5 h-3.5 text-cyan-400" />} right={s ? <span className={`text-[10px] font-mono-code px-1.5 py-0.5 rounded border ${s.contrarian === 'BULLISH' ? 'text-emerald-300 border-emerald-500/40' : s.contrarian === 'BEARISH' ? 'text-rose-300 border-rose-500/40' : 'text-slate-400 border-slate-700'}`}>{s.contrarian === 'NEUTRAL' ? 'Neutral' : `Contrarian ${s.contrarian.toLowerCase()}`}</span> : null}>
        {s ? (
          <>
            <Split longPct={s.longPct} />
            <div className="mt-1 flex justify-between text-[11px] font-mono-code"><span className="text-emerald-400 font-bold">{s.longPct}% long</span><span className="text-rose-400 font-bold">{s.shortPct}% short</span></div>
            <div className="mt-2 space-y-1">
              {s.sources.map((x: any) => (
                <div key={x.name} className="grid grid-cols-[80px_1fr_34px] items-center gap-2 text-[10px] font-mono-code"><span className="text-slate-400 truncate">{x.name}</span><Split longPct={x.longPct} h="h-1" /><span className="text-right text-slate-300">{Math.round(x.longPct)}%</span></div>
              ))}
            </div>
            {data.crowd.length > 0 && <div className="mt-2 text-[10px] font-mono-code text-slate-500">Crowd by currency: {data.crowd.map((c) => `${c.currency} ${c.longPct}% long`).join(' · ')}</div>}
            {s.method === 'derived' && <div className="mt-1 text-[10px] text-indigo-300">Derived from currency-level positioning — no source publishes this cross directly.</div>}
          </>
        ) : <div className="text-[11px] text-slate-500">No free live retail data source covers this instrument.</div>}
      </Section>
      <Section title="Institutional · CFTC COT (non-commercial)" icon={<Landmark className="w-3.5 h-3.5 text-amber-300" />} right={reportDate ? <span className="text-[9.5px] font-mono-code text-slate-500">as of {reportDate}</span> : null}>
        <div className="space-y-3">{data.legs.map((l) => <CotLeg key={l.code} code={l.code} name={l.name} inst={l.inst} />)}</div>
        {nextRelease && <div className="mt-2 text-[10px] text-slate-500">Next CFTC release: {new Date(nextRelease).toUTCString().slice(0, 22)} UTC (Fridays 15:30 New York).</div>}
      </Section>
    </div>
  );
};

// ───────────────────────────────────────────── 2. Seasonality (real monthly history)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
interface SeasonRow { m: number; avg: number; median: number; upPct: number; best: number; worst: number; n: number; sd: number }
const monthlyCache = new Map<string, Array<{ t: number; o: number; c: number }>>();

export function useSeasonality(symbol: string) {
  const entry = catalogEntryFor(symbol);
  const [bars, setBars] = useState<Array<{ t: number; o: number; c: number }> | null>(entry ? monthlyCache.get(entry.ticker) || null : null);
  const [error, setError] = useState<string | null>(entry ? null : `No price history source for ${symbol}.`);
  useEffect(() => {
    if (!entry) { setBars(null); setError(`No price history source for ${symbol}.`); return; }
    const cached = monthlyCache.get(entry.ticker);
    if (cached) { setBars(cached); setError(null); return; }
    let live = true;
    setBars(null); setError(null);
    const feed = new FullHistoryDatafeed(() => {});
    const M = PRO_PERIODS.find((p) => p.text === 'M') || PRO_PERIODS[PRO_PERIODS.length - 1];
    feed.getHistoryKLineData(entry as any, M, 0, Date.now()).then((rows: any[]) => {
      if (!live) return;
      const b = (rows || []).map((r) => ({ t: r.timestamp, o: r.open, c: r.close })).filter((r) => r.o > 0 && r.c > 0);
      if (b.length < 14) { setError('Not enough monthly history to measure seasonality.'); return; }
      monthlyCache.set(entry.ticker, b); setBars(b);
    }).catch((e: any) => live && setError(e?.message || 'History unavailable'));
    return () => { live = false; };
  }, [entry, symbol]);
  return { bars, error, entry };
}

export function seasonStats(bars: Array<{ t: number; o: number; c: number }>, years: number | 'all') {
  const nowY = new Date().getUTCFullYear();
  const done = bars.filter((b, i) => i < bars.length - 1 || new Date(b.t).getUTCMonth() !== new Date().getUTCMonth() || new Date(b.t).getUTCFullYear() !== nowY);
  // month return = close / previous month's close (falls back to open for the first bar)
  const rets: Array<{ y: number; m: number; r: number }> = [];
  for (let i = 0; i < done.length; i++) {
    const prevC = i > 0 ? done[i - 1].c : done[i].o;
    const d = new Date(done[i].t);
    rets.push({ y: d.getUTCFullYear(), m: d.getUTCMonth(), r: (done[i].c / prevC - 1) * 100 });
  }
  const minY = years === 'all' ? -Infinity : nowY - years;
  const use = rets.filter((x) => x.y >= minY && x.y < nowY + 1);
  const rows: SeasonRow[] = MONTHS.map((_, m) => {
    const xs = use.filter((x) => x.m === m).map((x) => x.r).sort((a, b) => a - b);
    const n = xs.length;
    const avg = n ? xs.reduce((s, v) => s + v, 0) / n : 0;
    const sd = n > 1 ? Math.sqrt(xs.reduce((s, v) => s + (v - avg) ** 2, 0) / (n - 1)) : 0;
    return { m, avg, median: n ? (n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2) : 0, upPct: n ? (xs.filter((v) => v > 0).length / n) * 100 : 0, best: n ? xs[n - 1] : 0, worst: n ? xs[0] : 0, n, sd };
  });
  const thisYear = rets.filter((x) => x.y === nowY);
  const firstYear = rets.length ? rets[0].y : nowY;
  const running = bars.length ? (() => { const last = bars[bars.length - 1], prev = bars[bars.length - 2]; const d = new Date(last.t); return d.getUTCFullYear() === nowY && d.getUTCMonth() === new Date().getUTCMonth() && prev ? (last.c / prev.c - 1) * 100 : null; })() : null;
  return { rows, thisYear, firstYear, running, sample: use.length };
}

export const SeasonalityPanel: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { bars, error, entry } = useSeasonality(symbol);
  const [lb, setLb] = useState<5 | 10 | 15 | 'all'>(10);
  const st = useMemo(() => (bars ? seasonStats(bars, lb) : null), [bars, lb]);
  const cur = new Date().getUTCMonth();
  if (error) return <div className="text-[12px] text-amber-300 p-2">{error}</div>;
  if (!st) return <Loading text="Measuring seasonality from monthly history…" />;
  const maxAbs = Math.max(0.01, ...st.rows.map((r) => Math.abs(r.avg)));
  // Average seasonal path (cumulative) vs this year's actual path
  const avgPath = st.rows.reduce<number[]>((acc, r) => [...acc, (acc[acc.length - 1] ?? 0) + r.avg], []);
  const yrPath = st.thisYear.reduce<number[]>((acc, r) => [...acc, (acc[acc.length - 1] ?? 0) + r.r], []);
  if (st.running !== null) yrPath.push((yrPath[yrPath.length - 1] ?? 0) + st.running);
  const all = [...avgPath, ...yrPath, 0];
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const pt = (v: number, i: number) => `${(i / 11) * 280 + 10},${70 - ((v - lo) / span) * 60}`;
  const now = st.rows[cur], next = st.rows[(cur + 1) % 12];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] text-slate-500">Lookback</span>
        {([5, 10, 15, 'all'] as const).map((v) => (
          <button key={String(v)} type="button" onClick={() => setLb(v)} className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono-code border cursor-pointer ${lb === v ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-100' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}>{v === 'all' ? `All (${st.firstYear}+)` : `${v}Y`}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ label: `${MONTHS[cur]} (this month)`, r: now, extra: st.running !== null ? `so far ${sign(st.running, 2)}%` : '' }, { label: `${MONTHS[(cur + 1) % 12]} (next)`, r: next, extra: '' }].map(({ label, r, extra }) => (
          <div key={label} className={`rounded-xl border p-2.5 ${r.avg > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-rose-500/30 bg-rose-500/[0.06]'}`}>
            <div className="text-[10px] font-mono-code uppercase text-slate-400">{label}</div>
            <div className={`text-lg font-bold ${tone(r.avg)}`}>{sign(r.avg, 2)}%</div>
            <div className="text-[10px] text-slate-400">up in {r.upPct.toFixed(0)}% of {r.n} years · median {sign(r.median, 2)}%</div>
            {extra && <div className="text-[10px] text-cyan-300 mt-0.5">{extra}</div>}
          </div>
        ))}
      </div>
      <Section title="Average return by month" icon={<CalendarDays className="w-3.5 h-3.5 text-cyan-400" />}>
        <div className="flex items-end gap-1 h-28">
          {st.rows.map((r) => (
            <div key={r.m} className="flex-1 flex flex-col items-center h-full" title={`${MONTHS[r.m]}: avg ${sign(r.avg, 2)}% · median ${sign(r.median, 2)}% · up ${r.upPct.toFixed(0)}% · best ${sign(r.best, 1)}% · worst ${sign(r.worst, 1)}% · σ ${r.sd.toFixed(2)} · n=${r.n}`}>
              <div className="flex-1 w-full flex flex-col justify-end">{r.avg > 0 && <div className="w-full rounded-t bg-emerald-500/80" style={{ height: `${(r.avg / maxAbs) * 100}%` }} />}</div>
              <div className="h-px w-full bg-slate-700" />
              <div className="flex-1 w-full">{r.avg < 0 && <div className="w-full rounded-b bg-rose-500/80" style={{ height: `${(-r.avg / maxAbs) * 100}%` }} />}</div>
              <div className={`text-[8.5px] font-mono-code mt-0.5 ${r.m === cur ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}>{MONTHS[r.m][0]}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Seasonal path vs this year" right={<span className="text-[9.5px] font-mono-code"><span className="text-amber-300">— average</span> <span className="text-cyan-300 ml-1">— {new Date().getUTCFullYear()}</span></span>}>
        <svg viewBox="0 0 300 80" className="w-full h-24">
          <line x1="10" x2="290" y1={70 - ((0 - lo) / span) * 60} y2={70 - ((0 - lo) / span) * 60} stroke="#334155" strokeDasharray="3 3" />
          <polyline fill="none" stroke="#fbbf24" strokeWidth="1.8" points={avgPath.map(pt).join(' ')} />
          {yrPath.length > 1 && <polyline fill="none" stroke="#22d3ee" strokeWidth="1.8" points={yrPath.map(pt).join(' ')} />}
        </svg>
      </Section>
      <Section title="Month detail">
        <table className="w-full text-[10.5px] font-mono-code">
          <thead><tr className="text-slate-500"><th className="text-left font-normal">Month</th><th className="text-right font-normal">Avg</th><th className="text-right font-normal">Median</th><th className="text-right font-normal">Up %</th><th className="text-right font-normal">Best</th><th className="text-right font-normal">Worst</th></tr></thead>
          <tbody>
            {st.rows.map((r) => (
              <tr key={r.m} className={r.m === cur ? 'bg-cyan-500/10' : ''}>
                <td className="py-0.5 text-slate-300">{MONTHS[r.m]}</td><td className={`text-right ${tone(r.avg)}`}>{sign(r.avg, 2)}</td><td className={`text-right ${tone(r.median)}`}>{sign(r.median, 2)}</td>
                <td className="text-right text-slate-300">{r.upPct.toFixed(0)}</td><td className="text-right text-emerald-400/80">{sign(r.best, 1)}</td><td className="text-right text-rose-400/80">{sign(r.worst, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1.5 text-[10px] text-slate-500 flex gap-1"><Info className="w-3 h-3 shrink-0 mt-0.5" />{st.sample} monthly returns from {entry?.binance ? 'Binance' : entry?.yahoo && !entry?.duka ? 'Yahoo Finance' : 'the Dukascopy archive'} ({lb === 'all' ? `since ${st.firstYear}` : `last ${lb} years`}); return = month close vs prior month close. Seasonality is a tendency, not a forecast.</div>
      </Section>
    </div>
  );
};

// ───────────────────────────────────────────── 3/4. TradingView live widgets (news timeline, economic calendar)
export const TvEmbed: React.FC<{ script: string; config: Record<string, unknown>; className?: string }> = ({ script, config, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(config);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    host.appendChild(inner);
    const s = document.createElement('script');
    s.src = script; s.async = true; s.type = 'text/javascript';
    s.innerHTML = key;
    host.appendChild(s);
    return () => { host.innerHTML = ''; };
  }, [script, key]);
  return <div ref={ref} className={`tradingview-widget-container ${className || ''}`} style={{ height: '100%', width: '100%' }} />;
};

export const PairNewsPanel: React.FC<{ tvSymbol: string; display: string }> = ({ tvSymbol, display }) => (
  <div className="h-[calc(100vh-260px)] min-h-[420px] rounded-xl overflow-hidden border border-slate-800">
    <TvEmbed key={tvSymbol} script="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
      config={{ feedMode: 'symbol', symbol: tvSymbol, colorTheme: 'dark', isTransparent: false, displayMode: 'regular', width: '100%', height: '100%', locale: 'en' }} />
    <span className="sr-only">Live news for {display}</span>
  </div>
);

export const TvCalendarPanel: React.FC = () => (
  <div className="h-[calc(100vh-260px)] min-h-[460px] rounded-xl overflow-hidden border border-slate-800">
    <TvEmbed script="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
      config={{ colorTheme: 'dark', isTransparent: false, width: '100%', height: '100%', locale: 'en', importanceFilter: '-1,0,1', countryFilter: 'us,eu,gb,jp,ch,au,nz,ca,cn,de,fr,it' }} />
  </div>
);

// ───────────────────────────────────────────── 5. Pair widget (fundamentals + seasonality + COT + sentiment)
export const PairWidgetPanel: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, error, loading } = usePairIntel(symbol);
  const { bars } = useSeasonality(symbol);
  const st = useMemo(() => (bars ? seasonStats(bars, 10) : null), [bars]);
  const verdict = positioningVerdict(data);
  const cur = new Date().getUTCMonth();
  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-2.5">
      {data ? (
        <>
          <Verdict title={`${data.display} · live fundamentals`} bullPct={Math.round(50 + (data.score ?? 0) / 2)} sub={`Score ${sign(data.score)} · ${data.confidence}% data confidence`} />
          <Section title="Fundamentals" icon={<Building2 className="w-3.5 h-3.5 text-cyan-400" />}>
            <div className="space-y-1.5">
              {data.kind === 'pair' ? data.legs.map((l) => (
                <div key={l.code} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-12 font-bold text-slate-100">{l.code}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full ${(l.score ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.abs(l.score ?? 0))}%` }} /></div>
                  <span className={`w-12 text-right font-mono-code ${tone(l.score)}`}>{sign(l.score)}</span>
                </div>
              )) : (data.pillars || []).filter((p) => p.score !== null).slice(0, 6).map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-28 truncate text-slate-300">{p.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full ${(p.score ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.abs(p.score ?? 0))}%` }} /></div>
                  <span className={`w-10 text-right font-mono-code ${tone(p.score)}`}>{sign(p.score, 0)}</span>
                </div>
              ))}
              {data.explanation && <p className="text-[10.5px] text-slate-400 leading-relaxed pt-1">{data.explanation}</p>}
            </div>
          </Section>
        </>
      ) : <div className="text-[12px] text-amber-300">{error}</div>}
      <Section title="Seasonality (10 years)" icon={<CalendarDays className="w-3.5 h-3.5 text-cyan-400" />}>
        {st ? (
          <>
            <div className="flex items-end gap-[3px] h-14">
              {st.rows.map((r) => {
                const max = Math.max(0.01, ...st.rows.map((x) => Math.abs(x.avg)));
                return <div key={r.m} className="flex-1 flex flex-col h-full" title={`${MONTHS[r.m]} avg ${sign(r.avg, 2)}%, up ${r.upPct.toFixed(0)}%`}>
                  <div className="flex-1 flex flex-col justify-end">{r.avg > 0 && <div className={`rounded-t ${r.m === cur ? 'bg-cyan-400' : 'bg-emerald-500/75'}`} style={{ height: `${(r.avg / max) * 100}%` }} />}</div>
                  <div className="flex-1">{r.avg < 0 && <div className={`rounded-b ${r.m === cur ? 'bg-cyan-400' : 'bg-rose-500/75'}`} style={{ height: `${(-r.avg / max) * 100}%` }} />}</div>
                </div>;
              })}
            </div>
            <div className="mt-1 text-[10.5px] text-slate-400">{MONTHS[cur]}: avg <b className={tone(st.rows[cur].avg)}>{sign(st.rows[cur].avg, 2)}%</b>, up in {st.rows[cur].upPct.toFixed(0)}% of years · next {MONTHS[(cur + 1) % 12]} {sign(st.rows[(cur + 1) % 12].avg, 2)}%</div>
          </>
        ) : <Loading text="Measuring seasonality…" />}
      </Section>
      {data && (
        <Section title="COT · non-commercial positioning" icon={<Landmark className="w-3.5 h-3.5 text-amber-300" />}>
          <div className="space-y-2.5">{data.legs.map((l) => <CotLeg key={l.code} code={l.code} name={l.name} inst={l.inst} compact />)}</div>
        </Section>
      )}
      {data && (
        <Section title="Sentiment" icon={<Users className="w-3.5 h-3.5 text-cyan-400" />}>
          {data.sentiment ? (
            <>
              <Split longPct={data.sentiment.longPct} />
              <div className="mt-1 flex justify-between text-[11px] font-mono-code"><span className="text-emerald-400">{data.sentiment.longPct}% long</span><span className="text-slate-500">{data.sentiment.contrarian === 'NEUTRAL' ? 'neutral' : `contrarian ${data.sentiment.contrarian.toLowerCase()}`}</span><span className="text-rose-400">{data.sentiment.shortPct}% short</span></div>
            </>
          ) : <div className="text-[11px] text-slate-500">No free live retail data covers this instrument.</div>}
          {verdict && <div className="mt-2 text-[10.5px] text-slate-400">Positioning verdict: <b className={tone(verdict.score)}>{verdict.bullPct > 52 ? `Bullish ${verdict.bullPct}%` : verdict.bullPct < 48 ? `Bearish ${100 - verdict.bullPct}%` : 'Neutral'}</b> (COT + contrarian crowd)</div>}
        </Section>
      )}
    </div>
  );
};
