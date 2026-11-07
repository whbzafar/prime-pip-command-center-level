/**
 * PAIRS & CORRELATIONS
 * Pair score (BASE/QUOTE) = (base score − quote score) / 2   →  −100 … +100.
 * For USD-priced assets (XAU, WTI, BTC…) the asset score already nets out the dollar
 * (it contains a "US Dollar (inverse)" pillar), so XAU/USD = XAU asset score.
 * Retail positioning (Myfxbook / Binance) is shown alongside as a contrarian overlay
 * with a fixed 15% weight when available.
 */
import { biasFromScore, biasLabel } from './scoring.js';
import { CURRENCIES } from './assets.js';
import type { AssetResult, CorrelationMatrix, PairResult } from './types.js';
import { PRICE_UNIVERSE, getPrices } from './sources/prices.js';
import { sentimentStorage } from '../sentiment/storage.js';

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** Market-convention ordering for FX crosses. */
const PRIORITY = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];

export function fxPairs(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let i = 0; i < PRIORITY.length; i++) for (let j = i + 1; j < PRIORITY.length; j++) out.push([PRIORITY[i], PRIORITY[j]]);
  return out.filter(([a, b]) => CURRENCIES.includes(a) && CURRENCIES.includes(b));
}

function retailFor(symbol: string) {
  const items = sentimentStorage.getAllItems().items;
  const it = items.find((i) => i.symbol === symbol && !i.isUnavailable && !i.notProvided);
  if (!it) return null;
  return { longPct: it.longPct, shortPct: it.shortPct, source: it.source, contrarianScore: round(it.shortPct - it.longPct, 1) };
}

export function buildPairs(results: Map<string, AssetResult>, corr90: CorrelationMatrix | null): PairResult[] {
  const out: PairResult[] = [];
  const corrToDxy = (sym: string): number | null => {
    if (!corr90) return null;
    const i = corr90.symbols.indexOf(sym); const j = corr90.symbols.indexOf('DXY');
    return i >= 0 && j >= 0 ? corr90.matrix[i][j] : null;
  };

  for (const [b, q] of fxPairs()) {
    const B = results.get(b); const Q = results.get(q);
    const macro = B?.score != null && Q?.score != null ? round((B.score - Q.score) / 2) : null;
    const symbol = `${b}${q}`;
    const retail = retailFor(symbol);
    const score = macro === null ? null : retail ? round(0.85 * macro + 0.15 * retail.contrarianScore) : macro;
    const confidence = B && Q ? Math.round(Math.min(B.confidence, Q.confidence)) : 0;
    out.push({
      symbol, display: `${b}/${q}`, base: b, quote: q, assetClass: 'FOREX', score,
      bullishPct: score === null ? null : round((score + 100) / 2), bias: biasFromScore(score), confidence,
      baseScore: B?.score ?? null, quoteScore: Q?.score ?? null, retailSentiment: retail, correlationToUsd: corrToDxy(symbol),
      explanation: macro === null
        ? `Waiting for live data on ${b} or ${q}.`
        : `${b} scores ${fmtS(B!.score)} and ${q} scores ${fmtS(Q!.score)} → macro differential ${fmtS(macro)}.` +
          (retail ? ` Retail traders are ${retail.longPct}% long ${b}/${q} (contrarian ${fmtS(retail.contrarianScore)}, 15% weight).` : '') +
          ` Net: ${fmtS(score)} = ${biasLabel(biasFromScore(score))} ${b}/${q}.`,
    });
  }

  const usdPriced: Array<[string, string, string]> = [
    ['XAU', 'XAUUSD', 'COMMODITIES'], ['XAG', 'XAGUSD', 'COMMODITIES'], ['XPT', 'XPTUSD', 'COMMODITIES'], ['XCU', 'XCUUSD', 'COMMODITIES'],
    ['WTI', 'USOIL', 'COMMODITIES'], ['NATGAS', 'NATGAS', 'COMMODITIES'],
    ['BTC', 'BTCUSD', 'CRYPTO'], ['ETH', 'ETHUSD', 'CRYPTO'], ['XRP', 'XRPUSD', 'CRYPTO'], ['SOL', 'SOLUSD', 'CRYPTO'],
  ];
  const usd = results.get('USD');
  for (const [asset, sym, cls] of usdPriced) {
    const A = results.get(asset);
    if (!A) continue;
    const retail = retailFor(cls === 'CRYPTO' ? `${asset}USDT` : `${asset}USD`);
    const own = A.pillars.filter((p) => p.id !== 'usd' && p.score !== null);
    const ownW = own.reduce((s, p) => s + p.weight, 0);
    const ownScore = ownW ? round(own.reduce((s, p) => s + (p.score as number) * p.weight, 0) / ownW) : null;
    out.push({
      symbol: sym, display: `${asset}/USD`, base: asset, quote: 'USD', assetClass: cls as PairResult['assetClass'],
      score: A.score, bullishPct: A.bullishPct, bias: A.bias, confidence: Math.min(A.confidence, usd?.confidence ?? 0),
      baseScore: ownScore, quoteScore: usd?.score ?? null, retailSentiment: retail, correlationToUsd: corrToDxy(sym),
      explanation: A.score === null ? `Waiting for live data on ${asset}.`
        : `${A.name}'s own drivers score ${fmtS(ownScore)}; the US Dollar scores ${fmtS(usd?.score ?? null)} and enters inverted. ` +
          `Combined: ${fmtS(A.score)} = ${biasLabel(A.bias)} ${asset}/USD.` +
          (retail ? ` Retail is ${retail.longPct}% long (shown for context, contrarian ${fmtS(retail.contrarianScore)}).` : ''),
    });
  }
  return out.sort((a, b) => Math.abs(b.score ?? 0) - Math.abs(a.score ?? 0));
}

function fmtS(v: number | null): string {
  return v === null ? '—' : `${v > 0 ? '+' : ''}${v}`;
}

// ───────────────────────────────────────── correlations

export function logReturns(points: Array<{ date: string; value: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].value > 0 && points[i].value > 0) m.set(points[i].date, Math.log(points[i].value / points[i - 1].value));
  }
  return m;
}

export function pearson(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 15) return null;
  const ma = a.reduce((s, x) => s + x, 0) / n; const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  if (!da || !db) return null;
  return num / Math.sqrt(da * db);
}

/** Pairwise correlation of daily log returns over the last `window` common trading days. */
export function buildCorrelation(window: number): CorrelationMatrix | null {
  const series = PRICE_UNIVERSE.map((s) => ({ spec: s, rets: logReturns(getPrices(s.symbol)) })).filter((s) => s.rets.size > window / 2);
  if (series.length < 3) return null;
  const allDates = new Set<string>();
  series.forEach((s) => s.rets.forEach((_, d) => allDates.add(d)));
  const dates = Array.from(allDates).sort();
  const matrix: Array<Array<number | null>> = series.map(() => series.map(() => null));
  for (let i = 0; i < series.length; i++) {
    for (let j = i; j < series.length; j++) {
      if (i === j) { matrix[i][j] = 1; continue; }
      const common = dates.filter((d) => series[i].rets.has(d) && series[j].rets.has(d)).slice(-window);
      const r = pearson(common.map((d) => series[i].rets.get(d)!), common.map((d) => series[j].rets.get(d)!));
      const v = r === null ? null : Math.round(r * 100) / 100;
      matrix[i][j] = v; matrix[j][i] = v;
    }
  }
  return {
    window, symbols: series.map((s) => s.spec.symbol), labels: series.map((s) => s.spec.label), matrix,
    asOf: dates[dates.length - 1] || null, source: 'Daily closes — Yahoo Finance, FRED fallback',
  };
}
