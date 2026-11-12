import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, BarChart3, Bitcoin, Building2, CalendarClock, Coins, Gem, GitCompareArrows, Grid3x3, Info, Radio, RefreshCw,
  Crown, Search, ShieldCheck, TrendingUp, Trophy, Users, WifiOff, X, Zap,
} from 'lucide-react';
import { RankingsView } from './RankingsView';
import { SentimentBoard } from './SentimentBoard';
import type { AssetClass, AssetResult, Overview, ReleaseEvent } from './types';
import { AssetDetail } from './AssetDetail';
import { PairsView } from './PairsView';
import { CorrelationView } from './CorrelationView';
import { PicksView, REGION_LABEL, type PickRow } from './PicksView';
import { BiasPill, BullBearBar, StatusDot, fetchJsonSafe, fmtNum, fmtPkt, fmtScore, scoreColor, timeAgo } from './ui';

type Tab = AssetClass | 'PICKS' | 'PAIRS' | 'RANKINGS' | 'SENTIMENT' | 'CORRELATIONS' | 'SOURCES';

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'FOREX', label: 'Forex', icon: Coins },
  { id: 'COMMODITIES', label: 'Commodities', icon: Gem },
  { id: 'INDICES', label: 'Indices', icon: BarChart3 },
  { id: 'STOCKS', label: 'Stocks', icon: Building2 },
  { id: 'CRYPTO', label: 'Crypto', icon: Bitcoin },
  { id: 'PICKS', label: 'Top Picks · Long-Term', icon: Crown },
  { id: 'RANKINGS', label: 'Top Bullish / Bearish', icon: Trophy },
  { id: 'PAIRS', label: 'Pairs', icon: GitCompareArrows },
  { id: 'SENTIMENT', label: 'Sentiment', icon: Users },
  { id: 'CORRELATIONS', label: 'Correlations', icon: Grid3x3 },
  { id: 'SOURCES', label: 'Sources & Method', icon: ShieldCheck },
];

const POLL_NORMAL = 60_000;
const POLL_HOT = 20_000;

export const FundamentalAnalysisView: React.FC = () => {
  const [ov, setOv] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [tab, setTab] = useState<Tab>('FOREX');
  const [selected, setSelected] = useState<Record<string, string>>({ FOREX: 'USD', COMMODITIES: 'XAU', INDICES: 'US500', STOCKS: 'AAPL', CRYPTO: 'BTC' });
  const [detail, setDetail] = useState<{ asset: AssetResult; mirrors: Record<string, AssetResult>; institutional?: any } | null>(null);
  const [alerts, setAlerts] = useState<ReleaseEvent[]>([]);
  const [pairJump, setPairJump] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('ALL');
  const [showAll, setShowAll] = useState(false);
  const seenReleases = useRef<Set<string> | null>(null);

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const ovRef = useRef<Overview | null>(null);

  const load = useCallback(async (force = false) => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    const scheduleRetry = () => {
      // Back off 5s, 8s, 12s … up to 30s while the server warms up or recovers
      const delay = Math.min(30_000, 5_000 + retries.current * 3_000);
      retries.current += 1;
      retryTimer.current = setTimeout(() => { if (navigator.onLine) load(); }, delay);
    };
    try {
      if (force) setRefreshing(true);
      const j = await fetchJsonSafe<{ ok: boolean; data: Overview }>(force ? '/api/macro/refresh' : '/api/macro/overview', { method: force ? 'POST' : 'GET' });
      const data: Overview = j.data;
      // New-release alerts (skip on first load)
      if (seenReleases.current) {
        const fresh = data.releases.filter((r) => !seenReleases.current!.has(r.id));
        if (fresh.length) setAlerts((a) => [...fresh, ...a].slice(0, 4));
      }
      seenReleases.current = new Set(data.releases.map((r) => r.id));
      // Never replace good data with an empty warm-up response
      if (data.assets.length > 0 || !ovRef.current) { setOv(data); ovRef.current = data; }
      setError(null);
      if (data.warming || data.assets.length === 0) scheduleRetry();
      else retries.current = 0;
    } catch (e: any) {
      setError(e?.message || 'Could not reach the fundamentals engine — retrying automatically.');
      scheduleRetry();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); }, []);

  // Poll: faster when a tracked release is due within 15 minutes
  const hot = useMemo(() => !!ov?.upcoming.some((u) => Math.abs(new Date(u.scheduledAt).getTime() - Date.now()) < 15 * 60_000), [ov]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const id = setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') load(); }, hot ? POLL_HOT : POLL_NORMAL);
    return () => clearInterval(id);
  }, [load, hot]);

  // Reconnect & tab-focus: refresh immediately
  useEffect(() => {
    const on = () => { setOnline(true); load(); };
    const off = () => setOnline(false);
    const vis = () => { if (document.visibilityState === 'visible' && navigator.onLine) load(); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  const assetTab = tab === 'FOREX' || tab === 'COMMODITIES' || tab === 'INDICES' || tab === 'STOCKS' || tab === 'CRYPTO';
  const selSymbol = assetTab ? selected[tab] : null;

  useEffect(() => {
    if (!selSymbol || !ov) return;
    let alive = true;
    fetchJsonSafe<any>(`/api/macro/asset/${encodeURIComponent(selSymbol)}`)
      .then((j) => { if (alive && j?.ok) setDetail({ asset: j.data, mirrors: j.mirrors || {}, institutional: j.institutional }); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [selSymbol, ov?.generatedAt]);

  const regionOf = (a: AssetResult) => String((a.meta as any)?.region ?? '');
  const isBasket = (a: AssetResult) => (a.meta as any)?.kind === 'basket';
  const filterable = tab === 'STOCKS' || tab === 'INDICES';
  const fullList = useMemo(() => (ov && assetTab ? ov.assets.filter((a) => a.assetClass === tab) : []), [ov, tab, assetTab]);
  const filtered = useMemo(() => {
    if (!filterable) return fullList;
    const q = query.trim().toLowerCase();
    let l = fullList.filter((a) => {
      if (q && !(`${a.symbol} ${a.name} ${(a.meta as any)?.sector ?? ''}`.toLowerCase().includes(q))) return false;
      if (region === 'ALL') return true;
      if (tab === 'INDICES' && region === 'MACRO') return !isBasket(a);
      return regionOf(a) === region;
    });
    l = [...l].sort((a, b) => (b.score ?? -9999) - (a.score ?? -9999));
    return l;
  }, [fullList, query, region, filterable, tab]);
  const LIMIT = 40;
  const list = filterable && !showAll && !query ? filtered.slice(0, LIMIT) : filtered;
  const currencies = useMemo(() => (ov ? ov.assets.filter((a) => a.assetClass === 'FOREX').sort((a, b) => (b.score ?? -999) - (a.score ?? -999)) : []), [ov]);

  const openPair = (sym: string) => { setPairJump(sym); setTab('PAIRS'); };

  return (
    <div className="space-y-4">
      {/* Status strip */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {online ? <StatusDot status={error ? 'degraded' : 'live'} /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
          <span className="text-[11px] font-mono-code font-bold text-slate-200 uppercase tracking-wider">
            {!online ? 'Offline — will update on reconnect' : error ? 'Reconnecting…' : ov?.warming ? 'Connecting to live sources…' : hot ? 'Live · release window (20s refresh)' : 'Live · auto-refresh 60s'}
          </span>
        </div>
        {ov && <span className="text-[11px] font-mono-code text-slate-500">Model {ov.methodologyVersion} · computed {timeAgo(ov.generatedAt)}</span>}
        <button type="button" onClick={() => load(true)} disabled={refreshing || !online}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono-code text-slate-200 hover:border-cyan-500/50 disabled:opacity-50 cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Pulling all sources…' : 'Refresh now'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[12px] text-amber-200 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> {error}{ov ? ' Showing the last loaded data meanwhile.' : ''}
        </div>
      )}
      {!error && ov?.warming && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-2.5 text-[12px] text-cyan-100 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> Connecting to the live economic calendar and market feeds — scores fill in automatically within a few seconds.
        </div>
      )}

      {/* New release alerts */}
      {alerts.map((r) => (
        <div key={r.id} className="rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 via-slate-950 to-slate-950 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Zap className="w-4 h-4 text-cyan-300 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 text-[12.5px] text-slate-200">
            <b className="text-white">{r.sourceTitle}</b> ({r.asset}) just released: <b>A {fmtNum(r.actual, r.unit)}</b> · F {fmtNum(r.forecast, r.unit)} · P {fmtNum(r.previous, r.unit)} →{' '}
            <span className={scoreColor(r.indicatorScore)}>{r.verdict}</span>
            <div className="text-[11px] font-mono-code text-slate-400 mt-0.5">
              {r.impacts.map((i) => i.assetScoreBefore === null ? `${i.asset} now ${fmtScore(i.assetScoreAfter)}` : `${i.asset} ${fmtScore(i.assetScoreBefore)} → ${fmtScore(i.assetScoreAfter)}`).join(' · ')}
            </div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setAlerts((a) => a.filter((x) => x.id !== r.id))} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      ))}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => { setTab(t.id); setQuery(''); setRegion('ALL'); setShowAll(false); }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[12px] font-semibold cursor-pointer transition-colors ${active ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100 shadow-lg shadow-cyan-500/10' : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {!ov && (loading || error) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-10 text-center">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
          <div className="mt-3 text-sm text-slate-300">Pulling live data from TradingView, FRED, CFTC, SEC and crypto markets…</div>
          <div className="mt-1 text-[11px] font-mono-code text-slate-500">Usually ready in a few seconds.</div>
        </div>
      )}

      {ov && assetTab && (
        <div className="space-y-4">
          {tab === 'FOREX' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">Currency strength ranking</span>
                <span className="text-[10.5px] font-mono-code text-slate-500">strongest vs weakest = best fundamental pair</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {currencies.map((c, i) => (
                  <button key={c.symbol} type="button" onClick={() => setSelected((s) => ({ ...s, FOREX: c.symbol }))}
                    className={`rounded-xl border p-2 text-center cursor-pointer ${selected.FOREX === c.symbol ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`}>
                    <div className="text-[9.5px] font-mono-code text-slate-500">#{i + 1}</div>
                    <div className="font-military font-bold text-white">{c.symbol}</div>
                    <div className={`font-mono-code text-[12px] font-bold ${scoreColor(c.score)}`}>{fmtScore(c.score)}</div>
                    <div className="h-12 mt-1 flex items-end justify-center">
                      <div className={`w-3 rounded-t ${c.score !== null && c.score >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: `${c.score === null ? 4 : Math.max(8, Math.min(100, Math.abs(c.score) * 1.5))}%` }} />
                    </div>
                  </button>
                ))}
              </div>
              {currencies.length >= 2 && currencies[0].score !== null && currencies[currencies.length - 1].score !== null && (() => {
                const strong = currencies[0].symbol, weak = currencies[currencies.length - 1].symbol;
                const pair = ov.pairs.find((p) => (p.base === strong && p.quote === weak) || (p.base === weak && p.quote === strong));
                return pair ? (
                  <button type="button" onClick={() => openPair(pair.symbol)} className="mt-3 text-[12px] text-slate-300 hover:text-white cursor-pointer">
                    Widest fundamental divergence: <b className="text-white">{pair.display}</b> <span className={scoreColor(pair.score)}>{fmtScore(pair.score)}</span> → open pair analysis
                  </button>
                ) : null;
              })()}
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
            <div className="space-y-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
              {filterable && (
                <div className="space-y-2 sticky top-0 z-10 bg-[#030712]/95 backdrop-blur pb-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input data-testid="fa-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'STOCKS' ? 'Search any stock — name, ticker or sector…' : 'Search indices & baskets…'}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[12.5px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(tab === 'STOCKS' ? ['ALL', 'PK', 'ASIA', 'US', 'EU', 'GLOBAL'] : ['ALL', 'MACRO', 'PK', 'ASIA', 'EU', 'US', 'WORLD']).map((k) => (
                      <button key={k} type="button" onClick={() => { setRegion(k); setShowAll(false); }}
                        className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-semibold cursor-pointer ${region === k ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100' : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                        {k === 'ALL' ? 'All' : k === 'MACRO' ? 'Macro indices' : k === 'WORLD' ? 'World' : REGION_LABEL[k]}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10.5px] font-mono-code text-slate-500">{filtered.length} {tab === 'STOCKS' ? 'stocks' : 'indices'} · {filtered.filter((a) => a.score !== null).length} scored · sorted most bullish first</div>
                </div>
              )}
              {list.map((a) => (
                <button key={a.symbol} type="button" onClick={() => setSelected((s) => ({ ...s, [tab]: a.symbol }))}
                  className={`w-full text-left rounded-2xl border p-3 transition-colors cursor-pointer ${selSymbol === a.symbol ? 'border-cyan-400/60 bg-cyan-500/10 shadow-lg shadow-cyan-500/5' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-military font-bold text-slate-100">{a.symbol}</span>
                        <span className="text-[11px] text-slate-500 truncate">{a.name}</span>
                      </div>
                      <div className="mt-1"><BiasPill bias={a.bias} score={a.score} /></div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono-code text-lg font-bold ${scoreColor(a.score)}`}>{fmtScore(a.score)}</div>
                      <div className="text-[10px] font-mono-code text-slate-500">conf {a.confidence}%</div>
                    </div>
                  </div>
                  <div className="mt-2"><BullBearBar bullishPct={a.bullishPct} /></div>
                  <div className="mt-1 flex justify-between text-[10px] font-mono-code">
                    <span className="text-emerald-400">{a.bullishPct === null ? '' : `${a.bullishPct.toFixed(0)}% bull`}</span>
                    <span className="text-rose-400">{a.bullishPct === null ? '' : `${100 - Math.round(a.bullishPct)}% bear`}</span>
                  </div>
                </button>
              ))}
              {filterable && !showAll && !query && filtered.length > LIMIT && (
                <button type="button" onClick={() => setShowAll(true)} className="w-full py-2 rounded-xl border border-slate-700 text-[11.5px] text-slate-300 hover:text-white hover:border-cyan-500/50 cursor-pointer">Show all {filtered.length}</button>
              )}
              {filterable && list.length === 0 && <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-[12px] text-slate-500">Nothing matches “{query}”.</div>}
            </div>
            <div className="min-w-0 space-y-3">
              {detail && detail.asset.symbol === selSymbol ? (
                <>
                  {(tab === 'COMMODITIES' || tab === 'CRYPTO') && ov.pairs.some((p) => p.base === selSymbol) && (
                    <button type="button" onClick={() => openPair(ov.pairs.find((p) => p.base === selSymbol)!.symbol)}
                      className="text-[12px] text-cyan-400 hover:text-cyan-300 cursor-pointer">Open {selSymbol}/USD side-by-side analysis →</button>
                  )}
                  {(tab === 'FOREX' || tab === 'COMMODITIES' || tab === 'INDICES') && <CoverageNotice asset={detail.asset} />}
                  <AssetDetail asset={detail.asset} mirrors={detail.mirrors} institutional={detail.institutional} />
                </>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-500">Loading breakdown…</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'PICKS' && <PicksView onOpen={(r: PickRow) => {
        const t: Tab = r.assetClass === 'STOCKS' ? 'STOCKS' : r.assetClass === 'INDICES' ? 'INDICES' : r.assetClass === 'COMMODITIES' ? 'COMMODITIES' : r.assetClass === 'FOREX' ? 'FOREX' : 'CRYPTO';
        setQuery(''); setRegion('ALL'); setSelected((x) => ({ ...x, [t]: r.symbol })); setTab(t);
      }} />}
      {ov && tab === 'RANKINGS' && <RankingsView pairs={ov.pairs} onPair={openPair} />}
      {tab === 'SENTIMENT' && <SentimentBoard />}
      {ov && tab === 'PAIRS' && <PairsView pairs={ov.pairs} generatedAt={ov.generatedAt} initial={pairJump} upcoming={ov.upcoming} />}
      {ov && tab === 'CORRELATIONS' && <CorrelationView w30={ov.correlations.w30} w90={ov.correlations.w90} />}
      {ov && tab === 'SOURCES' && <SourcesPanel ov={ov} />}

      {/* Release feed + upcoming */}
      {ov && (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-3"><Radio className="w-4 h-4 text-cyan-400" /><span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">Latest scored releases</span></div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {ov.releases.length === 0 && <div className="text-[12px] text-slate-500">Releases appear here the moment they are published and scored.</div>}
              {ov.releases.slice(0, 25).map((r) => (
                <div key={r.id} className="rounded-xl bg-slate-900/60 border border-slate-800 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-slate-100 font-semibold truncate">{r.asset} · {r.sourceTitle}</span>
                    <span className="text-[10px] font-mono-code text-slate-500 shrink-0">{timeAgo(r.releasedAt)}</span>
                  </div>
                  <div className="text-[11px] font-mono-code text-slate-400 mt-0.5 flex flex-wrap gap-x-3">
                    <span>A <b className="text-slate-200">{fmtNum(r.actual, r.unit)}</b></span><span>F {fmtNum(r.forecast, r.unit)}</span><span>P {fmtNum(r.previous, r.unit)}</span>
                    <span className={scoreColor(r.indicatorScore)}>{r.verdict}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4 text-cyan-400" /><span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">Next scored releases (7 days)</span></div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {ov.upcoming.length === 0 && <div className="text-[12px] text-slate-500">No tracked releases scheduled in the next 7 days.</div>}
              {ov.upcoming.slice(0, 30).map((u) => (
                <div key={u.asset + u.title + u.scheduledAt} className="flex items-center gap-3 rounded-xl bg-slate-900/60 border border-slate-800 px-3 py-2">
                  <span className={`w-1.5 h-6 rounded-full ${u.importance === 'HIGH' ? 'bg-rose-400' : u.importance === 'MEDIUM' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-slate-100 truncate"><b>{u.asset}</b> · {u.title}</div>
                    <div className="text-[10.5px] font-mono-code text-slate-500">{fmtPkt(u.scheduledAt)} · F {fmtNum(u.forecast)} · P {fmtNum(u.previous)}</div>
                  </div>
                  <span className="text-[10.5px] font-mono-code text-slate-400 shrink-0">{timeAgo(u.scheduledAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SourcesPanel: React.FC<{ ov: Overview }> = ({ ov }) => (
  <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-cyan-400" /><span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">Live data sources (all free, no paid subscriptions)</span></div>
      {ov.sources.map((s) => (
        <div key={s.id} className="rounded-xl bg-slate-900/60 border border-slate-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <StatusDot status={s.status} />
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-slate-100 font-semibold hover:text-cyan-300">{s.name}</a>
            <span className="ml-auto text-[10px] font-mono-code uppercase text-slate-500">{s.status.replace('_', ' ')}</span>
          </div>
          <div className="text-[10.5px] font-mono-code text-slate-500 mt-0.5">
            Last success {timeAgo(s.lastSuccess)}{s.itemCount ? ` · ${s.itemCount} items` : ''}{s.lastError ? ` · last error: ${s.lastError}` : ''}
          </div>
          {s.note && <div className="text-[10.5px] text-slate-400 mt-0.5">{s.note}</div>}
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-[12px] text-slate-300 leading-relaxed">
      <div className="flex items-center gap-2"><Info className="w-4 h-4 text-cyan-400" /><span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">How the score works</span></div>
      <p><b className="text-white">Sub-indicator score (−100…+100).</b> Each release is compared with its forecast (surprise, 45%), its previous value (momentum, 30%) and, where meaningful, an anchor such as the central bank’s inflation target or the PMI 50 line (level, 25%). Each part is normalized by that indicator’s typical surprise size, then signed by how it affects the asset (e.g. higher unemployment is bearish for the currency).</p>
      <p><b className="text-white">Pillars & asset.</b> Sub-scores average into pillars (Monetary Policy, Inflation, Labour, Growth, Confidence/Trade, Positioning…), and pillars combine with the weights shown on every card. Old prints lose weight gradually, and missing data is <i>excluded</i> — never filled in or estimated.</p>
      <p><b className="text-white">Pairs.</b> Currency pair = (base − quote) ÷ 2. Metals, energy and crypto include a “US Dollar (inverse)” pillar, so XAU/USD already nets out the dollar. Retail positioning is a 15% contrarian overlay on FX pairs when data exists.</p>
      <p><b className="text-white">Bullish % = (score + 100) ÷ 2.</b> It expresses the balance of fundamental evidence, <i>not</i> a probability that price will rise. Fundamentals set the medium-term bias; timing still comes from your technical plan and risk management.</p>
      <p><b className="text-white">Confidence</b> is the share of the model’s weight backed by live, fresh data. Below 50% the reading is provisional.</p>
      <p className="text-slate-500 text-[11px]">Every number links to its source. If a provider is down the affected indicators show “No live data” and drop out of the score instead of being guessed. Model {ov.methodologyVersion}.</p>
    </div>
  </div>
);

/** Tells the reader exactly which inputs are not in this score and why (never filled with guesses). */
const CoverageNotice: React.FC<{ asset: AssetResult }> = ({ asset }) => {
  const inds = asset.pillars.flatMap((p) => (p.indicators || []).map((i) => ({ ...i, pillar: p.name })));
  if (!inds.length) return null;
  const missing = inds.filter((i) => i.status === 'missing');
  const stale = inds.filter((i) => i.status === 'stale');
  const pmi = missing.filter((i) => /pmi/i.test(i.name));
  const other = missing.filter((i) => !/pmi/i.test(i.name));
  const live = inds.length - missing.length - stale.length;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-[11.5px] text-slate-400 leading-relaxed" data-testid="coverage-notice">
      <b className="text-slate-200">Data coverage · {live} of {inds.length} indicators live</b>
      {stale.length > 0 && <> · {stale.length} waiting for their next release ({stale.slice(0, 4).map((i) => i.name).join(', ')}{stale.length > 4 ? '…' : ''})</>}
      {pmi.length > 0 && <div className="mt-1"><b className="text-amber-300">PMI surveys not included:</b> the S&amp;P Global / HCOB / au Jibun PMI numbers are licensed — every free calendar publishes the release date but withholds the figure ({pmi.map((i) => i.name).join(', ')}). The model leaves them out instead of guessing; their weight moves to the live indicators.</div>}
      {other.length > 0 && <div className="mt-1"><b className="text-slate-300">Not published for this economy / no live reading:</b> {other.map((i) => i.name).join(', ')}.</div>}
    </div>
  );
};
