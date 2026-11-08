/**
 * The Premium terminal's main chart while Pine indicators are switched ON.
 *
 * TradingView's free embed cannot load custom scripts, so when an indicator is shown the main
 * chart is drawn by Vela (open-source chart) on the app's own full-history feed, with every
 * shown indicator applied directly on it. It follows the terminal's pair and timeframe, and the
 * indicators stay applied across switches and reloads.
 *
 * Students' indicators run on the server (RemotePineEngine) — their browser never receives the
 * code. The administrator's scripts and drafts run locally in a worker.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { VelaWorkspace } from '@luxalgo/vela/workspace';
import { PineWorkerEngine } from '@luxalgo/vela-pinets';
import { catalogFor, makeProvider, velaTf } from './pineData';
import { DRAFT_ID, pineLib, setIndicatorStatus, type LibraryScript } from './pineLibrary';
import { RemotePineEngine, REMOTE_LANG, remoteRef } from './remoteEngine';

interface Running { key: string; remove: () => void }

export const PineMainChart: React.FC<{ symbol: string; interval: string; height?: number | string }> = ({ symbol, interval, height = '100%' }) => {
  const host = useRef<HTMLDivElement>(null);
  const ws = useRef<VelaWorkspace | null>(null);
  const running = useRef(new Map<string, Running>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [lib, setLib] = useState(() => ({ ...pineLib.get() }));
  const entry = useMemo(() => catalogFor(symbol), [symbol]);
  const tf = velaTf(interval);

  useEffect(() => pineLib.subscribe(() => setLib({ ...pineLib.get() })), []);

  // Build the chart once.
  useEffect(() => {
    if (!host.current || !entry) return;
    const w = new VelaWorkspace(host.current, {
      layout: false, symbol: entry.ticker, timeframe: tf, theme: 'dark', live: true, persist: false,
      providers: { ppfx: () => makeProvider() },
      engines: { pine: () => new PineWorkerEngine(), [REMOTE_LANG]: () => new RemotePineEngine() },
    } as any);
    ws.current = w;
    let alive = true;
    w.chart.ready().then(() => { if (alive) setReady(true); }).catch(() => {});
    return () => {
      alive = false;
      running.current.clear();
      try { w.destroy(); } catch { /* ignore */ }
      ws.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(entry)]);

  // Follow the terminal's pair and timeframe; indicators stay applied and re-run on the new bars.
  useEffect(() => {
    const chart: any = ws.current?.chart;
    if (!chart || !entry || !ready) return;
    chart.setMarket({ symbol: entry.ticker }).catch?.(() => {});
  }, [entry, ready]);
  useEffect(() => {
    const chart: any = ws.current?.chart;
    if (!chart || !ready) return;
    chart.setMarket({ timeframe: tf }).catch?.(() => {});
  }, [tf, ready]);

  // Keep the chart's indicators in step with the shown list.
  useEffect(() => {
    if (!ready) return;
    const chart: any = ws.current?.chart;
    if (!chart) return;
    const wanted = new Map<string, { key: string; source: string; language: string; name: string }>();
    for (const id of lib.shown) {
      if (id === DRAFT_ID) {
        if (lib.isAdmin && lib.draft) wanted.set(id, { key: `draft:${lib.draft.source}`, source: lib.draft.source, language: 'pine', name: lib.draft.name });
        continue;
      }
      const s: LibraryScript | undefined = lib.scripts.find((x) => x.id === id);
      if (!s) continue;
      if (lib.isAdmin && s.source) wanted.set(id, { key: `${s.id}:${s.updatedAt}`, source: s.source, language: 'pine', name: s.name });
      else wanted.set(id, { key: `${s.id}:${s.updatedAt}`, source: remoteRef(s.id), language: REMOTE_LANG, name: s.name });
    }

    queue.current = queue.current.then(async () => {
      for (const [id, r] of [...running.current]) {
        const w = wanted.get(id);
        if (!w || w.key !== r.key) { r.remove(); running.current.delete(id); if (!w) setIndicatorStatus(id, null); }
      }
      for (const [id, w] of wanted) {
        if (running.current.has(id)) continue;
        setIndicatorStatus(id, { kind: 'busy', text: `Loading “${w.name}”…` });
        const res: any = await chart.runScript(w.source, { id: `ind_${id}`, language: w.language, title: w.name }).catch((e: any) => ({ ok: false, error: e }));
        if (res?.ok) {
          running.current.set(id, { key: w.key, remove: () => { try { res.remove(); } catch { /* gone */ } } });
          const st = res.run?.strategy;
          setIndicatorStatus(id, { kind: 'ok', text: `“${res.run?.title || w.name}” is on the chart.${st ? ` Strategy: net P&L ${Number(st.netPnl ?? 0).toFixed(2)}, ${st.closedTrades ?? st.totalTrades ?? 0} closed trades.` : ''}` });
        } else {
          const err = res?.error;
          const msg = typeof err === 'string' ? err : err?.message || 'The indicator could not run.';
          const line = Number(err?.line ?? err?.loc?.line ?? (String(msg).match(/line\s+(\d+)/i)?.[1] ?? NaN));
          setIndicatorStatus(id, { kind: 'error', text: msg, line: Number.isFinite(line) ? line : null });
        }
      }
    }).catch(() => {});
  }, [lib.shown, lib.scripts, lib.draft, lib.isAdmin, ready]);

  if (!entry) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[12px] text-amber-300 p-4 text-center">
        Indicators are not available for {symbol} yet — switch to a listed pair, or hide the indicators to use the TradingView chart.
      </div>
    );
  }
  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={host} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[12px] gap-2 pointer-events-none">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading {entry.ticker} chart…
        </div>
      )}
    </div>
  );
};

export default PineMainChart;
