/**
 * Vela scripting engine that runs a PRIVATE indicator on the server.
 *
 * The chart only knows an indicator by reference (`ppfx:<scriptId>`). Bars go up, the drawn
 * output (plots, labels, boxes, tables, strategy fills…) comes back — the Pine source never
 * reaches the browser. `request.security` series are loaded here from the app's own feed when
 * the server asks for them, then the run completes on the server.
 */
import { authInit } from './pineLibrary';

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

    const run = async () => {
      if (stopped) return;
      if (running) { dirty = true; return; }
      running = true; dirty = false;
      try {
        const all = (req.getBars?.() || req.bars || []) as any[];
        const bars = all.slice(-MAX_BARS).map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 }));
        if (!bars.length) return;
        lastBarTime = bars[bars.length - 1].time;
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
          handlers.onModel({ ...j.model, id: instanceId });
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

    if (!waitingForHistory) setTimeout(run, 0);

    return {
      stop() { stopped = true; try { ctrl?.abort(); } catch { /* ignore */ } },
      update(nextInputs: Record<string, any>, nextProps?: Record<string, any>) {
        inputs = { ...inputs, ...(nextInputs || {}) };
        if (nextProps) props = { ...props, ...nextProps };
        run();
      },
      setVisibleRange() { /* not viewport dependent */ },
      notifyBars(reason?: 'backfill' | 'complete') {
        if (reason === 'backfill') return;
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
