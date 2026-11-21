/**
 * SCENARIO LAB — a what-if run through the SAME fundamental engine.
 *
 * Nothing here predicts anything or invents a probability. The caller states a shock ("the US monetary-policy
 * pillar moves -40 points"); the engine then re-aggregates exactly like the live model does (pillar weights ×
 * coverage), re-flows the inverse/mirror pillars (USD → gold, EUR → DAX …) and rebuilds the pairs. The result is
 * "given today's real readings AND this shock, which assets and pairs would flip?". The shock size is the user's
 * assumption and is always labelled as such.
 */
import type { AssetResult, Bias, MacroSnapshot, PairResult, PillarResult } from './types.js';
import { biasFromScore } from './scoring.js';
import { buildPairs } from './pairs.js';

export interface Shock { asset: string; pillar: string; delta: number }
export interface ScenarioPreset { id: string; title: string; plain: string; shocks: Shock[] }

/** Documented presets: the shock sizes are illustrative assumptions (moderate = ±30–40 pillar points). */
export const PRESETS: ScenarioPreset[] = [
  { id: 'fed-dovish', title: 'Fed turns dovish (rate cuts)', plain: 'The US central bank cuts rates faster than expected.', shocks: [{ asset: 'USD', pillar: 'monetary', delta: -40 }] },
  { id: 'fed-hawkish', title: 'Fed turns hawkish (rates stay high / hike)', plain: 'The US central bank signals higher-for-longer.', shocks: [{ asset: 'USD', pillar: 'monetary', delta: 40 }] },
  { id: 'us-inflation-hot', title: 'US inflation comes in hot', plain: 'US prices rise faster than forecast, so rate cuts get pushed back.', shocks: [{ asset: 'USD', pillar: 'inflation', delta: 35 }, { asset: 'USD', pillar: 'monetary', delta: 15 }] },
  { id: 'ecb-hawkish', title: 'ECB turns hawkish', plain: 'The European central bank signals higher rates.', shocks: [{ asset: 'EUR', pillar: 'monetary', delta: 40 }] },
  { id: 'boj-hike', title: 'Bank of Japan hikes', plain: 'Japan raises interest rates, ending the ultra-low-rate era.', shocks: [{ asset: 'JPY', pillar: 'monetary', delta: 45 }] },
  { id: 'boe-dovish', title: 'Bank of England cuts', plain: 'The UK central bank cuts rates.', shocks: [{ asset: 'GBP', pillar: 'monetary', delta: -40 }] },
  { id: 'us-jobs-weak', title: 'US jobs collapse', plain: 'US jobs data comes in far weaker than expected.', shocks: [{ asset: 'USD', pillar: 'labour', delta: -40 }, { asset: 'US500', pillar: 'growth', delta: -25 }] },
  { id: 'risk-off', title: 'Global risk-off shock', plain: 'Fear spikes: stocks fall, safe havens (USD, JPY, CHF) gain, risk currencies (AUD, NZD, CAD) fall.', shocks: [
    { asset: 'US500', pillar: 'risk', delta: -40 }, { asset: 'US100', pillar: 'risk', delta: -40 }, { asset: 'US30', pillar: 'risk', delta: -40 }, { asset: 'GER40', pillar: 'risk', delta: -40 },
    { asset: 'JPY', pillar: 'external', delta: 30 }, { asset: 'CHF', pillar: 'external', delta: 30 }, { asset: 'USD', pillar: 'external', delta: 15 },
    { asset: 'AUD', pillar: 'external', delta: -30 }, { asset: 'NZD', pillar: 'external', delta: -30 }, { asset: 'CAD', pillar: 'external', delta: -20 }] },
  { id: 'china-slowdown', title: 'China slowdown', plain: 'Chinese factories and demand weaken sharply.', shocks: [{ asset: 'AUD', pillar: 'external', delta: -35 }, { asset: 'NZD', pillar: 'external', delta: -30 }, { asset: 'XCU', pillar: 'china', delta: -40 }] },
];

const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number) => Math.max(-100, Math.min(100, v));

/** Which asset a mirror pillar copies, and with what sign — same rule the asset drill-down uses. */
export function mirrorOf(a: AssetResult, p: PillarResult): { ref: string; sign: 1 | -1 } | null {
  if (p.indicators.length) return null;
  if (p.id === 'usd') return { ref: 'USD', sign: -1 };
  if (p.id === 'euro') return { ref: 'EUR', sign: -1 };
  if (p.id === 'pound') return { ref: 'GBP', sign: -1 };
  if (p.id === 'yen') return { ref: 'JPY', sign: -1 };
  if (p.id === 'macro') return { ref: String(a.meta?.macroAsset || 'US500'), sign: 1 };
  return null;
}

/** The engine's own asset aggregation (scoreAsset): pillar weight × (0.5 + 0.5 × coverage). */
export function aggregate(pillars: PillarResult[]): number | null {
  const scored = pillars.filter((p) => p.score !== null && p.coverage > 0);
  const eff = (p: PillarResult) => p.weight * (0.5 + 0.5 * Math.min(1, p.coverage));
  const W = scored.reduce((s, p) => s + eff(p), 0);
  return W > 0 ? r1(scored.reduce((s, p) => s + (p.score as number) * eff(p), 0) / W) : null;
}

export interface AssetChange { symbol: string; name: string; assetClass: string; before: number; after: number; delta: number; biasBefore: Bias; biasAfter: Bias; flipped: boolean; why: string }
export interface PairChange { symbol: string; display: string; assetClass: string; before: number; after: number; delta: number; biasBefore: Bias; biasAfter: Bias; flipped: boolean; sideBefore: 'bullish' | 'bearish' | 'neutral'; sideAfter: 'bullish' | 'bearish' | 'neutral'; why: string }
export interface ScenarioResult {
  applied: Array<Shock & { assetName: string; pillarName: string; before: number; after: number }>;
  skipped: Array<Shock & { reason: string }>;
  assets: AssetChange[]; pairs: PairChange[];
  flips: { toBullish: PairChange[]; toBearish: PairChange[] };
  method: string;
}

const side = (b: Bias) => (b.includes('BULL') ? 'bullish' : b.includes('BEAR') ? 'bearish' : 'neutral') as 'bullish' | 'bearish' | 'neutral';

export function runScenario(snap: Pick<MacroSnapshot, 'assets'>, shocks: Shock[]): ScenarioResult {
  const base = new Map(snap.assets.map((a) => [a.symbol, a]));
  const work = new Map<string, AssetResult>(snap.assets.map((a) => [a.symbol, { ...a, pillars: a.pillars.map((p) => ({ ...p })) }]));
  const applied: ScenarioResult['applied'] = []; const skipped: ScenarioResult['skipped'] = [];
  const direct = new Map<string, string[]>();
  for (const s of shocks) {
    const a = work.get(s.asset); const p = a?.pillars.find((x) => x.id === s.pillar);
    if (!a || !p) { skipped.push({ ...s, reason: !a ? `${s.asset} is not scored` : `${s.asset} has no “${s.pillar}” pillar` }); continue; }
    if (p.score === null) { skipped.push({ ...s, reason: `${a.name} · ${p.name} has no live data` }); continue; }
    if (!Number.isFinite(s.delta)) { skipped.push({ ...s, reason: 'shock size is not a number' }); continue; }
    const before = p.score; p.score = r1(clamp(before + s.delta)); p.bullishPct = r1((p.score + 100) / 2);
    applied.push({ ...s, assetName: a.name, pillarName: p.name, before, after: p.score });
    direct.set(a.symbol, [...(direct.get(a.symbol) || []), `${p.name} ${s.delta > 0 ? '+' : ''}${s.delta}`]);
  }
  // Re-flow: direct shocks first, then mirror pillars (USD → gold/crypto, EUR → DAX, US500 → stocks …) until stable.
  const rescore = (a: AssetResult) => { if (a.score !== null) { const v = aggregate(a.pillars); if (v !== null) { a.score = v; a.bullishPct = r1((v + 100) / 2); a.bearishPct = r1(100 - a.bullishPct); a.bias = biasFromScore(v); } } };
  const via = new Map<string, string[]>();
  for (let pass = 0; pass < 4; pass++) {
    for (const a of work.values()) {
      let touched = false;
      for (const p of a.pillars) {
        const m = mirrorOf(a, p); const ref = m && work.get(m.ref);
        if (!m || !ref || ref.score === null) continue;
        const next = r1(clamp(ref.score * m.sign));
        if (p.score !== next) { p.score = next; p.bullishPct = r1((next + 100) / 2); touched = true; if (Math.abs(next - (base.get(a.symbol)?.pillars.find((x) => x.id === p.id)?.score ?? next)) >= 0.5) via.set(a.symbol, [`${ref.name} ${m.sign < 0 ? '(inverse)' : ''}`.trim()]); }
      }
      if (touched || direct.has(a.symbol)) rescore(a);
    }
  }
  const assets: AssetChange[] = [];
  for (const a of work.values()) {
    const b = base.get(a.symbol)!; if (b.score === null || a.score === null) continue;
    const delta = r1(a.score - b.score); if (Math.abs(delta) < 0.1) continue;
    const bits = [...(direct.get(a.symbol) || []).map((d) => `shock: ${d}`), ...(via.get(a.symbol) || []).map((v) => `follows ${v}`)];
    assets.push({ symbol: a.symbol, name: a.name, assetClass: a.assetClass, before: b.score, after: a.score, delta, biasBefore: b.bias, biasAfter: a.bias, flipped: side(b.bias) !== side(a.bias), why: bits.join(' · ') || 'knock-on effect' });
  }
  assets.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const was = new Map(buildPairs(base, null).map((p) => [p.symbol, p]));
  const pairs: PairChange[] = [];
  for (const p of buildPairs(work, null) as PairResult[]) {
    const b = was.get(p.symbol); if (!b || b.score === null || p.score === null) continue;
    const delta = r1(p.score - b.score); if (Math.abs(delta) < 0.1) continue;
    const ba = base.get(p.base)?.score, aa = work.get(p.base)?.score, bq = base.get(p.quote)?.score, aq = work.get(p.quote)?.score;
    const moved = (n: string, x?: number | null, y?: number | null) => (x != null && y != null && Math.abs(y - x) >= 0.1 ? `${n} ${x > 0 ? '+' : ''}${x} → ${y > 0 ? '+' : ''}${y}` : '');
    pairs.push({ symbol: p.symbol, display: p.display, assetClass: p.assetClass, before: b.score, after: p.score, delta, biasBefore: b.bias, biasAfter: p.bias, flipped: side(b.bias) !== side(p.bias), sideBefore: side(b.bias), sideAfter: side(p.bias), why: [moved(p.base, ba, aa), moved(p.quote, bq, aq)].filter(Boolean).join(' · ') || 'knock-on effect' });
  }
  pairs.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return {
    applied, skipped, assets, pairs,
    flips: { toBullish: pairs.filter((p) => p.flipped && p.sideAfter === 'bullish'), toBearish: pairs.filter((p) => p.flipped && p.sideAfter === 'bearish') },
    method: 'Today’s real readings + your shock, re-scored with the live engine’s own pillar weights. Not a forecast: the shock size is your assumption.',
  };
}
