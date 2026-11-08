/**
 * Runs a stored Pine Script on the server and returns only its drawn output (plots, labels,
 * boxes, tables, strategy fills…). The browser of a student never receives the source.
 *
 * `request.security` series are not fetched here: the first pass reports which
 * (symbol, timeframe, range) the script asked for, the browser loads them from the app's own
 * feed and posts them back, and the second pass completes the run.
 */
import { PineEngine } from '@luxalgo/vela-pinets';

export interface SeriesNeed { symbol: string; timeframe: string; range: { from?: number; to?: number; limit?: number } }
export interface RunInput {
  source: string;
  market: { symbol: string; timeframe: string; symbolInfo?: any };
  bars: Array<{ time: number; open: number; high: number; low: number; close: number; volume?: number }>;
  inputs?: Record<string, any>;
  props?: Record<string, any>;
  series?: Record<string, any[]>;
}
export interface RunOutput {
  ok: boolean;
  model?: any;
  need?: SeriesNeed[];
  warnings?: string[];
  alerts?: any[];
  error?: string;
  line?: number | null;
  ms: number;
}

export const MAX_BARS = 5000;
const RUN_TIMEOUT_MS = 40_000;
export const seriesKey = (symbol: string, timeframe: string) => `${String(symbol).toUpperCase()}|${timeframe}`;

const cleanBars = (bars: any[]) =>
  (Array.isArray(bars) ? bars : [])
    .map((b) => ({ time: Number(b.time), open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close), volume: Number(b.volume ?? 0) }))
    .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close))
    .slice(-MAX_BARS);

/** Prepare (parse) a script and return its schema WITHOUT the source-bearing token. */
export async function prepareScript(source: string, instanceId: string) {
  const prepared: any = await new PineEngine().prepare(source, instanceId);
  const { token: _token, ...safe } = prepared;
  return safe;
}

export function errorLine(err: any): number | null {
  const msg = String(err?.message || err || '');
  const line = Number(err?.line ?? err?.loc?.line ?? msg.match(/line\s+(\d+)/i)?.[1] ?? NaN);
  return Number.isFinite(line) ? line : null;
}

export async function runScript(input: RunInput): Promise<RunOutput> {
  const t0 = Date.now();
  const engine = new PineEngine();
  const supplied = input.series || {};
  const need = new Map<string, SeriesNeed>();
  const warnings: string[] = [];
  const alerts: any[] = [];
  let prepared: any;
  try {
    prepared = await engine.prepare(input.source, 'srv');
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err), line: errorLine(err), ms: Date.now() - t0 };
  }
  const bars = cleanBars(input.bars);
  if (!bars.length) return { ok: false, error: 'No bars to run on.', ms: Date.now() - t0 };

  const fetchSeries = async (symbol: string, timeframe: string, range: any) => {
    const key = seriesKey(symbol, timeframe);
    const rows = supplied[key];
    if (!rows) {
      need.set(key, { symbol, timeframe, range: { from: range?.from, to: range?.to, limit: range?.limit } });
      return [];
    }
    return cleanBars(rows).filter((b) => (range?.from === undefined || b.time >= range.from) && (range?.to === undefined || b.time <= range.to));
  };

  return await new Promise<RunOutput>((resolve) => {
    let model: any = null;
    let settled = false;
    const finish = (out: Omit<RunOutput, 'ms'>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { session?.stop(); } catch { /* ignore */ }
      resolve({ ...out, ms: Date.now() - t0 });
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'The script took too long to run on this many bars.' }), RUN_TIMEOUT_MS);
    let session: any;
    try {
      session = engine.execute(
        {
          prepared,
          market: { symbol: input.market.symbol, timeframe: input.market.timeframe, symbolInfo: input.market.symbolInfo },
          bars,
          getBars: () => bars,
          fetchSeries,
          inputs: input.inputs,
          props: input.props,
          mode: 'static',
          historyState: 'complete',
        } as any,
        {
          onModel: (m: any) => { model = m; },
          onWarning: (w: any) => { warnings.push(String(w?.message || w)); },
          onAlert: (a: any) => { alerts.push(a); },
          onError: (err: any) => finish({ ok: false, error: String(err?.message || err), line: errorLine(err) }),
          onDone: () => {
            if (need.size) finish({ ok: true, need: [...need.values()] });
            else finish({ ok: true, model, warnings, alerts: alerts.slice(-50) });
          },
        },
      );
    } catch (err: any) {
      finish({ ok: false, error: String(err?.message || err), line: errorLine(err) });
    }
  });
}
