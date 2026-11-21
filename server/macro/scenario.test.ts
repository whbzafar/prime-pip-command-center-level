import { describe, it, expect } from 'vitest';
import { runScenario, aggregate } from './scenario';
import type { AssetResult, PillarResult } from './types';

const pil = (id: string, score: number | null, weight: number, indicators: any[] = [{}]): PillarResult => ({ id, name: id, description: '', weight, score, bullishPct: score === null ? null : (score + 100) / 2, coverage: 1, indicators, reasoning: '' });
const asset = (symbol: string, assetClass: any, pillars: PillarResult[]): AssetResult => { const s = aggregate(pillars); return { symbol, name: symbol, assetClass, score: s, bullishPct: s === null ? null : (s + 100) / 2, bearishPct: null, bias: (s ?? 0) > 20 ? 'BULLISH' : (s ?? 0) < -20 ? 'BEARISH' : 'NEUTRAL', confidence: 100, pillars, summary: '', topDrivers: [], updatedAt: '' } as AssetResult; };
const snap = () => ({ assets: [
  asset('USD', 'FOREX', [pil('monetary', 30, 30), pil('labour', 10, 20)]),
  asset('EUR', 'FOREX', [pil('monetary', -10, 30), pil('labour', -10, 20)]),
  asset('XAU', 'COMMODITIES', [pil('real', 0, 10), pil('usd', -22, 10, [])]),
] });

describe('scenario lab', () => {
  it('aggregates exactly like the engine (weights × coverage)', () => expect(aggregate([pil('a', 50, 30), pil('b', -10, 20)])).toBe(26));
  it('no shock = no change', () => { const r = runScenario(snap(), []); expect(r.assets).toEqual([]); expect(r.pairs).toEqual([]); });
  it('a dovish Fed lowers USD and lifts gold through the inverse-dollar pillar', () => {
    const r = runScenario(snap(), [{ asset: 'USD', pillar: 'monetary', delta: -40 }]);
    const usd = r.assets.find((a) => a.symbol === 'USD')!; const xau = r.assets.find((a) => a.symbol === 'XAU')!;
    expect(usd.delta).toBeLessThan(0); expect(xau.delta).toBeGreaterThan(0);
    expect(r.pairs.find((p) => p.symbol === 'EURUSD')!.delta).toBeGreaterThan(0);
  });
  it('skips shocks on pillars that do not exist or have no data, never inventing them', () => {
    const r = runScenario(snap(), [{ asset: 'USD', pillar: 'nope', delta: 10 }, { asset: 'ZZZ', pillar: 'x', delta: 5 }]);
    expect(r.applied).toHaveLength(0); expect(r.skipped).toHaveLength(2);
  });
  it('clamps pillar scores to ±100', () => { const r = runScenario(snap(), [{ asset: 'USD', pillar: 'monetary', delta: 500 }]); expect(r.applied[0].after).toBe(100); });
});
