/**
 * Vela scripting engine that runs a PRIVATE indicator on the server.
 *
 * The chart only knows an indicator by reference (`ppfx:<scriptId>`). Bars go up, the drawn
 * output (plots, labels, boxes, tables, strategy fills…) comes back — the Pine source never
 * reaches the browser. `request.security` series are loaded here from the app's own feed when
 * the server asks for them, then the run completes on the server.
 */
import { authInit, pineLib } from './pineLibrary';

/** The SBT indicator's own right-hand "models" table is not shown on the chart (everything else it draws stays). */
const hidesTables = (id: string) => /\bSBT\b/i.test(pineLib.get().scripts.find((s) => s.id === id)?.name || '');
/** Statistics panels (SBT model table, win-rate / trade-statistics box) are never shown on the chart; the small status box stays. */
const STATS_TABLE = /WIN RATE|Total R\b|Avg R\b|\bSkipped\b|Zone R\b|TP\/Hurdle|\bTrades\b|SBT ?\d+[AB]?\b.*(Bull|Bear)|\bBull\b.*\bBear\b/i;
const dropStatsTables = (tables: any) => (Array.isArray(tables) ? tables.filter((t) => { try { return !STATS_TABLE.test(JSON.stringify(t)); } catch { return true; } }) : tables);
/** Last model per indicator + pair + timeframe: shown instantly on the next visit while the fresh run is on its way. */
const modelCache = new Map<string, any>();
const rememberModel = (k: string, m: any) => { modelCache.delete(k); modelCache.set(k, m); if (modelCache.size > 16) modelCache.delete(modelCache.keys().next().value as string); };

/**
 * Speed: the server asks for extra series (other timeframes/symbols) in rounds, and every round re-runs the script.
 * We remember what each indicator asked for last time and fetch it up-front (in parallel), so the next run — after a pair
 * or timeframe switch — usually needs one round instead of several.
 */
type NeedTpl = { symbol: string; timeframe: string; range?: any };
const needTemplates = new Map<string, NeedTpl[]>();
const SYM = '$SYM';

let warmed = false;
/** Compile every strategy on the server in the background (once per visit), so clicking one later skips the compile wait. */
export function warmPine(scripts: Array<{ id: string }>) {
  if (warmed || !scripts.length) return;
  warmed = true;
  const idle = (f: () => void) => (typeof (window as any).requestIdleCallback === 'function' ? (window as any).requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 800));
  idle(async () => {
    for (const sc of scripts) {
      try { await fetch('/api/pine/prepare', authInit({ method: 'POST', body: JSON.stringify({ id: sc.id, instanceId: `warm-${sc.id}` }) })); } catch { /* best effort */ }
    }
  });
}

export const REMOTE_LANG = 'ppfx';
export const remoteRef = (id: string) => `ppfx:${id}`;
const idOf = (source: string) => source.replace(/^ppfx:/, '');

const MAX_BARS = 5000;
const TICK_RERUN_MS = 20_000;

type Handlers = { onModel(m: any): void; onError?(e: Error): void; onWarning?(w: any): void; onAlert?(a: any): void; onDone?(): void };

export class RemotePineEngine {
  readonly language = REMOTE_LANG;
  readonly capabilities = { streaming: false, visibleRange: false, inputs: true, props: true };

  async prepare(source: string, instanceId: string): Promise<any> {
    const id = idOf(source);
    const r = await fetch('/api/pine/prepare', authInit({ method: 'POST', body: JSON.stringify({ id, instanceId }) }));
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || `Indicator unavailable (HTTP ${r.status})`);
    return { ...j.prepared, token: { id, instanceId } };
  }

  execute(req: any, handlers: Handlers) {
    const { id, instanceId } = req.prepared.token as { id: string; instanceId: string };
    let inputs = { ...(req.inputs || {}) };
    let props = { ...(req.props || {}) };
    let stopped = false;
    let running = false;
    let dirty = false;
    let lastRunAt = 0;
    let lastBarTime = 0;
    let ctrl: AbortController | null = null;
    const series: Record<string, any[]> = {};
    let waitingForHistory = req.historyState === 'backfill';

    const keyOf = (symbol: string, timeframe: string) => `${String(symbol).toUpperCase()}|${timeframe}`;
    const prefetch = async () => {
      const tpl = needTemplates.get(id);
      if (!tpl?.length || !req.fetchSeries) return;
      await Promise.all(tpl.map(async (n) => {
        const symbol = n.symbol === SYM ? req.market.symbol : n.symbol;
        const k = keyOf(symbol, n.timeframe);
        if (series[k]) return;
        try {
          const rows = await req.fetchSeries(symbol, n.timeframe, n.range || {});
          series[k] = (rows || []).slice(-MAX_BARS * 2).map((b: any) => [b.time, b.open, b.high, b.low, b.close, b.volume ?? 0]);
        } catch { /* the normal round will ask again */ }
      }));
    };
    const remember = (need: any[]) => {
      const cur = needTemplates.get(id) || [];
      for (const n of need) {
        const t: NeedTpl = { symbol: String(n.symbol).toUpperCase() === String(req.market.symbol).toUpperCase() ? SYM : String(n.symbol), timeframe: n.timeframe, range: n.range };
        if (!cur.some((c) => c.symbol === t.symbol && c.timeframe === t.timeframe)) cur.push(t);
      }
      needTemplates.set(id, cur);
    };
    let firstRound = true;
    const mkey = () => `${id}|${String(req.market.symbol).toUpperCase()}|${req.market.timeframe}|${JSON.stringify(inputs)}`;
    { const hit = modelCache.get(mkey()); if (hit) setTimeout(() => { if (!stopped && !lastRunAt) handlers.onModel({ ...hit, id: instanceId }); }, 0); }
    const run = async () => {
      if (stopped) return;
      if (running) { dirty = true; return; }
      running = true; dirty = false;
      try {
        const all = (req.getBars?.() || req.bars || []) as any[];
        const bars = all.slice(-MAX_BARS).map((b) => [b.time, b.open, b.high, b.low, b.close, b.volume ?? 0]); // compact rows: half the upload
        if (!bars.length) return;
        lastBarTime = bars[bars.length - 1][0] as number;
        if (firstRound) { firstRound = false; await prefetch(); if (stopped) return; }
        for (let round = 0; round < 4 && !stopped; round++) {
          ctrl = new AbortController();
          const r = await fetch('/api/pine/run', authInit({
            method: 'POST',
            signal: ctrl.signal,
            body: JSON.stringify({ id, market: { symbol: req.market.symbol, timeframe: req.market.timeframe, symbolInfo: req.market.symbolInfo }, bars, inputs, props, series }),
          }));
          const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
          if (stopped) return;
          if (!j.ok) { handlers.onError?.(Object.assign(new Error(j.error || 'The indicator failed to run.'), { line: j.line ?? null })); return; }
          if (j.need?.length) {
            remember(j.need);
            if (!req.fetchSeries) { for (const n of j.need) series[`${String(n.symbol).toUpperCase()}|${n.timeframe}`] = []; continue; }
            await Promise.all(j.need.map(async (n: any) => {
              let rows: any[] = [];
              try { rows = await req.fetchSeries(n.symbol, n.timeframe, n.range || {}); } catch { rows = []; }
              series[`${String(n.symbol).toUpperCase()}|${n.timeframe}`] = (rows || []).slice(-MAX_BARS * 2).map((b: any) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 }));
            }));
            continue;
          }
          for (const w of j.warnings || []) handlers.onWarning?.({ message: w });
          for (const a of j.alerts || []) handlers.onAlert?.(a);
          const out = { ...j.model, tables: hidesTables(id) ? [] : dropStatsTables(j.model?.tables), id: instanceId };
          rememberModel(mkey(), out);
          handlers.onModel(out);
          handlers.onDone?.();
          lastRunAt = Date.now();
          return;
        }
      } catch (err: any) {
        if (!stopped && err?.name !== 'AbortError') handlers.onError?.(new Error(`Could not reach the indicator server: ${err?.message || err}`));
      } finally {
        running = false;
        if (dirty && !stopped) setTimeout(run, 50);
      }
    };

    // Run at once on the bars already on screen (fast first paint), then again when the full history lands.
    setTimeout(run, 0);

    return {
      stop() { stopped = true; try { ctrl?.abort(); } catch { /* ignore */ } },
      update(nextInputs: Record<string, any>, nextProps?: Record<string, any>) {
        inputs = { ...inputs, ...(nextInputs || {}) };
        if (nextProps) props = { ...props, ...nextProps };
        run();
      },
      setVisibleRange() { /* not viewport dependent */ },
      notifyBars(reason?: 'backfill' | 'complete') {
        if (reason === 'backfill') { if (Date.now() - lastRunAt > 4000) run(); return; }
        if (reason === 'complete') { waitingForHistory = false; run(); return; }
        if (waitingForHistory) return;
        // Live tick: re-run on every new bar, otherwise at most every 20 s.
        const all = (req.getBars?.() || []) as any[];
        const t = all.length ? all[all.length - 1].time : 0;
        if (t !== lastBarTime || Date.now() - lastRunAt > TICK_RERUN_MS) run();
      },
    };
  }
}
