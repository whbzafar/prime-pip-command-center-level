import type { AssetClass, MacroSnapshot } from './types.js';

/** One bubble in the "Financial Universe" map. Everything is read straight from the live scoring engine. */
export interface UniverseItem {
  kind: 'asset' | 'pair';
  symbol: string;
  label: string;
  name: string;
  assetClass: AssetClass;
  score: number;
  bullishPct: number;
  bearishPct: number;
  side: 'bull' | 'bear' | 'neutral';
  confidence: number;
}

export interface UniverseMap {
  generatedAt: string;
  assets: UniverseItem[];
  pairs: UniverseItem[];
}

/** Same thresholds as biasFromScore: +10 and above is bullish, -10 and below is bearish, in between is neutral. */
export const sideOf = (score: number): UniverseItem['side'] => (score >= 10 ? 'bull' : score <= -10 ? 'bear' : 'neutral');

const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildUniverseMap(s: MacroSnapshot): UniverseMap {
  const assets: UniverseItem[] = [];
  for (const a of s.assets) {
    if (a.score === null || a.bullishPct === null) continue; // unscored assets are not shown, never guessed
    assets.push({
      kind: 'asset', symbol: a.symbol, label: a.symbol, name: a.name, assetClass: a.assetClass, score: r1(a.score),
      bullishPct: r1(a.bullishPct), bearishPct: r1(100 - a.bullishPct), side: sideOf(a.score), confidence: Math.round(a.confidence),
    });
  }
  const pairs: UniverseItem[] = [];
  for (const p of s.pairs) {
    if (p.score === null || p.bullishPct === null) continue;
    pairs.push({
      kind: 'pair', symbol: p.symbol, label: p.display, name: p.display, assetClass: p.assetClass, score: r1(p.score),
      bullishPct: r1(p.bullishPct), bearishPct: r1(100 - p.bullishPct), side: sideOf(p.score), confidence: Math.round(p.confidence),
    });
  }
  return { generatedAt: s.generatedAt, assets, pairs };
}
