/**
 * COT PAIR INTELLIGENCE & CROSS-ASSET DIFFERENTIAL ENGINE
 * 
 * Analyzes CFTC Commitments of Traders (COT) non-commercial and commercial positioning
 * to derive mathematical relative strength scores for individual assets, and cross-references
 * them to compute pair bullishness/bearishness percentages and directional bias ratings.
 */

import { CotMarketSummary, CotRecord } from '../types/cotTypes';

export type CotPairCategory = 'FOREX' | 'COMMODITIES' | 'INDICES' | 'CRYPTO' | 'CUSTOM';

export type CotPairBiasLabel =
  | 'STRONGLY BULLISH'
  | 'MODERATELY BULLISH'
  | 'MILDLY BULLISH'
  | 'BALANCED'
  | 'MILDLY BEARISH'
  | 'MODERATELY BEARISH'
  | 'STRONGLY BEARISH';

export interface CotAssetMetric {
  symbol: string;
  name: string;
  marketCode: string;
  category: string;
  nonCommNet: number;
  openInterest: number;
  netPctOI: number;
  weeklyChangeNet: number;
  weeklyChangePctOI: number;
  commNet: number;
  commNetPctOI: number;
  strengthScore: number; // -100 to +100
  reportDate: string;
}

export interface CotPairResult {
  id: string;
  pair: string; // e.g. "EUR/USD"
  baseAsset: string; // "EUR"
  quoteAsset: string; // "USD"
  baseName: string;
  quoteName: string;
  category: CotPairCategory;

  // Single asset metrics
  baseMetric: CotAssetMetric;
  quoteMetric: CotAssetMetric;

  // Differential & Bullish/Bearish percentage
  differentialScore: number; // baseScore - quoteScore (-200 to +200)
  bullishnessPct: number; // 0% to 100%
  bearishnessPct: number; // 0% to 100%
  biasLabel: CotPairBiasLabel;
  biasGrade: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

  // Analysis Details
  weeklyFlowBias: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL';
  thesis: string;
  keyDrivers: string[];
}

/**
 * Standard Code-to-Symbol mapping for CFTC Legacy markets
 */
export const CFTC_SYMBOL_MAP: Record<string, { symbol: string; name: string; category: string }> = {
  // Currencies
  '099741': { symbol: 'EUR', name: 'Euro FX', category: 'Currencies' },
  '096742': { symbol: 'GBP', name: 'British Pound', category: 'Currencies' },
  '097741': { symbol: 'JPY', name: 'Japanese Yen', category: 'Currencies' },
  '092741': { symbol: 'CHF', name: 'Swiss Franc', category: 'Currencies' },
  '090741': { symbol: 'CAD', name: 'Canadian Dollar', category: 'Currencies' },
  '232741': { symbol: 'AUD', name: 'Australian Dollar', category: 'Currencies' },
  '112741': { symbol: 'NZD', name: 'New Zealand Dollar', category: 'Currencies' },
  '098662': { symbol: 'USD', name: 'U.S. Dollar Index', category: 'Currencies' },
  '095741': { symbol: 'MXN', name: 'Mexican Peso', category: 'Currencies' },
  '102741': { symbol: 'BRL', name: 'Brazilian Real', category: 'Currencies' },
  '122741': { symbol: 'ZAR', name: 'South African Rand', category: 'Currencies' },

  // Commodities
  '088691': { symbol: 'XAU', name: 'Gold', category: 'Commodities' },
  '084691': { symbol: 'XAG', name: 'Silver', category: 'Commodities' },
  '085692': { symbol: 'COPPER', name: 'Copper', category: 'Commodities' },
  '076651': { symbol: 'PLATINUM', name: 'Platinum', category: 'Commodities' },
  '075651': { symbol: 'PALLADIUM', name: 'Palladium', category: 'Commodities' },
  '067651': { symbol: 'WTI', name: 'Crude Oil (WTI)', category: 'Commodities' },
  '023651': { symbol: 'NATGAS', name: 'Natural Gas', category: 'Commodities' },
  '002602': { symbol: 'CORN', name: 'Corn', category: 'Commodities' },
  '005602': { symbol: 'SOYBEAN', name: 'Soybeans', category: 'Commodities' },
  '001602': { symbol: 'WHEAT', name: 'Wheat', category: 'Commodities' },

  // Stock Indices
  '13874+': { symbol: 'SPX', name: 'S&P 500', category: 'Stock Indices' },
  '13874A': { symbol: 'SPX', name: 'S&P 500', category: 'Stock Indices' },
  '209742': { symbol: 'NAS100', name: 'Nasdaq-100', category: 'Stock Indices' },
  '124603': { symbol: 'US30', name: 'Dow Jones', category: 'Stock Indices' },
  '239742': { symbol: 'US2000', name: 'Russell 2000', category: 'Stock Indices' },

  // Crypto
  '133741': { symbol: 'BTC', name: 'Bitcoin (CME)', category: 'Crypto' },
  '146021': { symbol: 'ETH', name: 'Ether (CME)', category: 'Crypto' },

  // Bonds / Rates
  '042601': { symbol: 'US2Y', name: '2-Year T-Note', category: 'Bonds/Rates' },
  '043602': { symbol: 'US10Y', name: '10-Year T-Note', category: 'Bonds/Rates' },
  '020601': { symbol: 'US30Y', name: '30-Year T-Bond', category: 'Bonds/Rates' },
};

/**
 * Standard Catalog of Curated Pairs across Forex, Commodities, Indices, Crypto
 */
export const CURATED_COT_PAIRS: Array<{
  pair: string;
  base: string;
  quote: string;
  category: CotPairCategory;
  description: string;
}> = [
  // --- FOREX G8 MAJORS & CROSSES (28 PAIRS) ---
  { pair: 'EUR/USD', base: 'EUR', quote: 'USD', category: 'FOREX', description: 'Euro vs US Dollar' },
  { pair: 'GBP/USD', base: 'GBP', quote: 'USD', category: 'FOREX', description: 'British Pound vs US Dollar' },
  { pair: 'USD/JPY', base: 'USD', quote: 'JPY', category: 'FOREX', description: 'US Dollar vs Japanese Yen' },
  { pair: 'USD/CHF', base: 'USD', quote: 'CHF', category: 'FOREX', description: 'US Dollar vs Swiss Franc' },
  { pair: 'USD/CAD', base: 'USD', quote: 'CAD', category: 'FOREX', description: 'US Dollar vs Canadian Dollar' },
  { pair: 'AUD/USD', base: 'AUD', quote: 'USD', category: 'FOREX', description: 'Australian Dollar vs US Dollar' },
  { pair: 'NZD/USD', base: 'NZD', quote: 'USD', category: 'FOREX', description: 'New Zealand Dollar vs US Dollar' },

  { pair: 'EUR/GBP', base: 'EUR', quote: 'GBP', category: 'FOREX', description: 'Euro vs British Pound' },
  { pair: 'EUR/JPY', base: 'EUR', quote: 'JPY', category: 'FOREX', description: 'Euro vs Japanese Yen' },
  { pair: 'EUR/CHF', base: 'EUR', quote: 'CHF', category: 'FOREX', description: 'Euro vs Swiss Franc' },
  { pair: 'EUR/CAD', base: 'EUR', quote: 'CAD', category: 'FOREX', description: 'Euro vs Canadian Dollar' },
  { pair: 'EUR/AUD', base: 'EUR', quote: 'AUD', category: 'FOREX', description: 'Euro vs Australian Dollar' },
  { pair: 'EUR/NZD', base: 'EUR', quote: 'NZD', category: 'FOREX', description: 'Euro vs New Zealand Dollar' },

  { pair: 'GBP/JPY', base: 'GBP', quote: 'JPY', category: 'FOREX', description: 'British Pound vs Japanese Yen' },
  { pair: 'GBP/CHF', base: 'GBP', quote: 'CHF', category: 'FOREX', description: 'British Pound vs Swiss Franc' },
  { pair: 'GBP/CAD', base: 'GBP', quote: 'CAD', category: 'FOREX', description: 'British Pound vs Canadian Dollar' },
  { pair: 'GBP/AUD', base: 'GBP', quote: 'AUD', category: 'FOREX', description: 'British Pound vs Australian Dollar' },
  { pair: 'GBP/NZD', base: 'GBP', quote: 'NZD', category: 'FOREX', description: 'British Pound vs New Zealand Dollar' },

  { pair: 'AUD/JPY', base: 'AUD', quote: 'JPY', category: 'FOREX', description: 'Australian Dollar vs Japanese Yen' },
  { pair: 'AUD/CHF', base: 'AUD', quote: 'CHF', category: 'FOREX', description: 'Australian Dollar vs Swiss Franc' },
  { pair: 'AUD/CAD', base: 'AUD', quote: 'CAD', category: 'FOREX', description: 'Australian Dollar vs Canadian Dollar' },
  { pair: 'AUD/NZD', base: 'AUD', quote: 'NZD', category: 'FOREX', description: 'Australian Dollar vs New Zealand Dollar' },

  { pair: 'NZD/JPY', base: 'NZD', quote: 'JPY', category: 'FOREX', description: 'New Zealand Dollar vs Japanese Yen' },
  { pair: 'NZD/CHF', base: 'NZD', quote: 'CHF', category: 'FOREX', description: 'New Zealand Dollar vs Swiss Franc' },
  { pair: 'NZD/CAD', base: 'NZD', quote: 'CAD', category: 'FOREX', description: 'New Zealand Dollar vs Canadian Dollar' },

  { pair: 'CAD/JPY', base: 'CAD', quote: 'JPY', category: 'FOREX', description: 'Canadian Dollar vs Japanese Yen' },
  { pair: 'CAD/CHF', base: 'CAD', quote: 'CHF', category: 'FOREX', description: 'Canadian Dollar vs Swiss Franc' },
  { pair: 'CHF/JPY', base: 'CHF', quote: 'JPY', category: 'FOREX', description: 'Swiss Franc vs Japanese Yen' },

  // Emerging
  { pair: 'USD/MXN', base: 'USD', quote: 'MXN', category: 'FOREX', description: 'US Dollar vs Mexican Peso' },
  { pair: 'USD/BRL', base: 'USD', quote: 'BRL', category: 'FOREX', description: 'US Dollar vs Brazilian Real' },
  { pair: 'USD/ZAR', base: 'USD', quote: 'ZAR', category: 'FOREX', description: 'US Dollar vs South African Rand' },

  // --- COMMODITIES ---
  { pair: 'XAU/USD', base: 'XAU', quote: 'USD', category: 'COMMODITIES', description: 'Gold vs US Dollar' },
  { pair: 'XAG/USD', base: 'XAG', quote: 'USD', category: 'COMMODITIES', description: 'Silver vs US Dollar' },
  { pair: 'XAU/XAG', base: 'XAU', quote: 'XAG', category: 'COMMODITIES', description: 'Gold/Silver Ratio' },
  { pair: 'WTI/USD', base: 'WTI', quote: 'USD', category: 'COMMODITIES', description: 'Crude Oil vs US Dollar' },
  { pair: 'COPPER/XAU', base: 'COPPER', quote: 'XAU', category: 'COMMODITIES', description: 'Copper vs Gold (Growth vs Safety)' },
  { pair: 'WTI/CAD', base: 'WTI', quote: 'CAD', category: 'COMMODITIES', description: 'Crude Oil vs Petro-Currency CAD' },
  { pair: 'XAU/EUR', base: 'XAU', quote: 'EUR', category: 'COMMODITIES', description: 'Gold priced in Euros' },
  { pair: 'XAU/JPY', base: 'XAU', quote: 'JPY', category: 'COMMODITIES', description: 'Gold priced in Japanese Yen' },
  { pair: 'XAU/AUD', base: 'XAU', quote: 'AUD', category: 'COMMODITIES', description: 'Gold priced in Australian Dollar' },

  // --- STOCK INDICES ---
  { pair: 'SPX/USD', base: 'SPX', quote: 'USD', category: 'INDICES', description: 'S&P 500 vs US Dollar' },
  { pair: 'NAS100/USD', base: 'NAS100', quote: 'USD', category: 'INDICES', description: 'Nasdaq-100 vs US Dollar' },
  { pair: 'US30/USD', base: 'US30', quote: 'USD', category: 'INDICES', description: 'Dow Jones vs US Dollar' },
  { pair: 'NAS100/SPX', base: 'NAS100', quote: 'SPX', category: 'INDICES', description: 'Tech vs Broad Equity Ratio' },
  { pair: 'US30/SPX', base: 'US30', quote: 'SPX', category: 'INDICES', description: 'Value vs Broad Equity Ratio' },
  { pair: 'SPX/XAU', base: 'SPX', quote: 'XAU', category: 'INDICES', description: 'S&P 500 vs Gold (Risk-On vs Safety)' },

  // --- CRYPTO ---
  { pair: 'BTC/USD', base: 'BTC', quote: 'USD', category: 'CRYPTO', description: 'Bitcoin (CME) vs US Dollar' },
  { pair: 'ETH/USD', base: 'ETH', quote: 'USD', category: 'CRYPTO', description: 'Ether (CME) vs US Dollar' },
  { pair: 'ETH/BTC', base: 'ETH', quote: 'BTC', category: 'CRYPTO', description: 'Ethereum vs Bitcoin Ratio' },
  { pair: 'BTC/XAU', base: 'BTC', quote: 'XAU', category: 'CRYPTO', description: 'Digital Gold vs Physical Gold' },
];

/**
 * Quantifies an asset's institutional positioning from CFTC COT record into a score from -100 to +100
 */
export function calculateAssetCotStrength(record: CotRecord, nameHint?: string): CotAssetMetric {
  const oi = Math.max(1, record.openInterest);
  const net = record.nonCommNet;
  const netPctOI = (net / oi) * 100;

  // Weekly flow momentum
  const weeklyChangeNet = record.changeNonCommNet;
  const weeklyChangePctOI = (weeklyChangeNet / oi) * 100;

  // Commercial net for contrarian reference
  const commNet = record.commNet;
  const commNetPctOI = (commNet / oi) * 100;

  // Composite Strength:
  // 65% weighted on Net as % of Open Interest (scaled so ±35% OI gives ±70 pts)
  // 35% weighted on Weekly Net Shift (scaled so ±5% weekly shift gives ±30 pts)
  const baseNetComponent = Math.min(70, Math.max(-70, netPctOI * 2.0));
  const momentumComponent = Math.min(30, Math.max(-30, weeklyChangePctOI * 6.0));

  const strengthScore = Math.min(100, Math.max(-100, Math.round(baseNetComponent + momentumComponent)));

  const mapped = CFTC_SYMBOL_MAP[record.marketCode];
  const symbol = mapped?.symbol || record.marketCode;
  const name = nameHint || mapped?.name || record.marketName;
  const category = mapped?.category || 'Other';

  return {
    symbol,
    name,
    marketCode: record.marketCode,
    category,
    nonCommNet: net,
    openInterest: oi,
    netPctOI: Math.round(netPctOI * 10) / 10,
    weeklyChangeNet,
    weeklyChangePctOI: Math.round(weeklyChangePctOI * 100) / 100,
    commNet,
    commNetPctOI: Math.round(commNetPctOI * 10) / 10,
    strengthScore,
    reportDate: record.reportDate,
  };
}

/**
 * Synthesizes USD strength from DXY market or G6 currency inverse weighting
 */
export function deriveUsdAssetMetric(
  metricsBySymbol: Map<string, CotAssetMetric>,
  dxyRecord?: CotRecord
): CotAssetMetric {
  if (dxyRecord) {
    const dxy = calculateAssetCotStrength(dxyRecord, 'U.S. Dollar Index');
    dxy.symbol = 'USD';
    return dxy;
  }

  // Fallback: Inverse G6 basket (EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, CHF 4.2%, AUD 3.6%)
  const eur = metricsBySymbol.get('EUR')?.strengthScore ?? 0;
  const jpy = metricsBySymbol.get('JPY')?.strengthScore ?? 0;
  const gbp = metricsBySymbol.get('GBP')?.strengthScore ?? 0;
  const cad = metricsBySymbol.get('CAD')?.strengthScore ?? 0;
  const chf = metricsBySymbol.get('CHF')?.strengthScore ?? 0;
  const aud = metricsBySymbol.get('AUD')?.strengthScore ?? 0;

  const basketForeignScore =
    eur * 0.576 + jpy * 0.136 + gbp * 0.119 + cad * 0.091 + chf * 0.042 + aud * 0.036;

  const usdScore = Math.round(-basketForeignScore);

  return {
    symbol: 'USD',
    name: 'U.S. Dollar',
    marketCode: 'SYNTHETIC_USD',
    category: 'Currencies',
    nonCommNet: Math.round(-((metricsBySymbol.get('EUR')?.nonCommNet ?? 0) * 0.6)),
    openInterest: metricsBySymbol.get('EUR')?.openInterest ?? 500000,
    netPctOI: Math.round(-basketForeignScore * 0.3 * 10) / 10,
    weeklyChangeNet: -(metricsBySymbol.get('EUR')?.weeklyChangeNet ?? 0),
    weeklyChangePctOI: Math.round(-(metricsBySymbol.get('EUR')?.weeklyChangePctOI ?? 0) * 10) / 10,
    commNet: 0,
    commNetPctOI: 0,
    strengthScore: usdScore,
    reportDate: metricsBySymbol.get('EUR')?.reportDate || new Date().toISOString().slice(0, 10),
  };
}

/**
 * Determines bias label and grade based on differential score and bullishness percentage
 */
export function determinePairBias(
  differential: number,
  bullishnessPct: number
): {
  biasLabel: CotPairBiasLabel;
  biasGrade: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
} {
  if (bullishnessPct >= 72 || differential >= 75) {
    return { biasLabel: 'STRONGLY BULLISH', biasGrade: 'STRONG_BUY' };
  }
  if (bullishnessPct >= 60 || differential >= 35) {
    return { biasLabel: 'MODERATELY BULLISH', biasGrade: 'BUY' };
  }
  if (bullishnessPct >= 53 || differential >= 10) {
    return { biasLabel: 'MILDLY BULLISH', biasGrade: 'BUY' };
  }
  if (bullishnessPct <= 28 || differential <= -75) {
    return { biasLabel: 'STRONGLY BEARISH', biasGrade: 'STRONG_SELL' };
  }
  if (bullishnessPct <= 40 || differential <= -35) {
    return { biasLabel: 'MODERATELY BEARISH', biasGrade: 'SELL' };
  }
  if (bullishnessPct <= 47 || differential <= -10) {
    return { biasLabel: 'MILDLY BEARISH', biasGrade: 'SELL' };
  }
  return { biasLabel: 'BALANCED', biasGrade: 'NEUTRAL' };
}

/**
 * Builds a natural institutional research thesis for the pair
 */
function generatePairThesis(
  base: CotAssetMetric,
  quote: CotAssetMetric,
  pairName: string,
  biasLabel: CotPairBiasLabel,
  bullishPct: number
): { thesis: string; keyDrivers: string[] } {
  const diff = base.strengthScore - quote.strengthScore;
  const baseSign = base.strengthScore >= 0 ? `+${base.strengthScore}` : `${base.strengthScore}`;
  const quoteSign = quote.strengthScore >= 0 ? `+${quote.strengthScore}` : `${quote.strengthScore}`;

  const drivers: string[] = [];

  // Base description
  if (base.netPctOI > 5) {
    drivers.push(`Hedge funds hold net long exposure on ${base.symbol} (+${base.netPctOI}% of OI)`);
  } else if (base.netPctOI < -5) {
    drivers.push(`Large speculators hold heavy net short positioning in ${base.symbol} (${base.netPctOI}% of OI)`);
  } else {
    drivers.push(`Institutional positioning in ${base.symbol} is near neutral (${base.netPctOI}% of OI)`);
  }

  // Quote description
  if (quote.netPctOI > 5) {
    drivers.push(`Speculative positioning on ${quote.symbol} is net long (+${quote.netPctOI}% of OI)`);
  } else if (quote.netPctOI < -5) {
    drivers.push(`Large speculators are net short on ${quote.symbol} (${quote.netPctOI}% of OI)`);
  } else {
    drivers.push(`Positioning on ${quote.symbol} is balanced (${quote.netPctOI}% of OI)`);
  }

  // Flow momentum
  if (base.weeklyChangeNet > 0 && quote.weeklyChangeNet < 0) {
    drivers.push(`Weekly contract accumulation strongly favors ${base.symbol} over ${quote.symbol}`);
  } else if (base.weeklyChangeNet < 0 && quote.weeklyChangeNet > 0) {
    drivers.push(`Recent capital flows show liquidation in ${base.symbol} while ${quote.symbol} is being bought`);
  }

  let thesis = '';
  if (biasLabel === 'STRONGLY BULLISH') {
    thesis = `The COT report indicates extreme institutional divergence for ${pairName}. ${base.symbol} exhibits high speculative demand (Strength: ${baseSign}) while ${quote.symbol} suffers from strong institutional selling or short overhang (Strength: ${quoteSign}). This creates an authoritative ${bullishPct}% bullish tailwind.`;
  } else if (biasLabel === 'MODERATELY BULLISH') {
    thesis = `Institutional positioning favors ${base.symbol} over ${quote.symbol} with a net differential of ${diff > 0 ? `+${diff}` : diff} points. Large non-commercial accounts are positioning for upside continuation on ${pairName} (${bullishPct}% bullish probability).`;
  } else if (biasLabel === 'MILDLY BULLISH') {
    thesis = `${pairName} shows modest bullish divergence (${bullishPct}%). While ${base.symbol} holds a slight edge over ${quote.symbol}, positioning is not yet at historical extreme levels.`;
  } else if (biasLabel === 'STRONGLY BEARISH') {
    thesis = `Severe bearish institutional pressure detected on ${pairName} (${100 - bullishPct}% bearish). ${quote.symbol} (Strength: ${quoteSign}) holds significant speculative capital advantage over weak ${base.symbol} (Strength: ${baseSign}), indicating high probability of downward trend persistence.`;
  } else if (biasLabel === 'MODERATELY BEARISH') {
    thesis = `The Commitment of Traders data exhibits clear institutional favor toward ${quote.symbol} against ${base.symbol} (${diff} point divergence). Look for short execution alignments on higher timeframe structures.`;
  } else if (biasLabel === 'MILDLY BEARISH') {
    thesis = `${pairName} leans mildly bearish (${100 - bullishPct}% bearish) due to minor capital rotation into ${quote.symbol}.`;
  } else {
    thesis = `Positioning across ${base.symbol} and ${quote.symbol} is well balanced (${bullishPct}%). Large speculators are not expressing a dominant directional bias on this pair, indicating potential range-bound consolidation or mean reversion.`;
  }

  return { thesis, keyDrivers: drivers };
}

/**
 * Cross-references two asset metrics to produce a comprehensive COT pair result
 */
export function evaluateCotPair(
  baseMetric: CotAssetMetric,
  quoteMetric: CotAssetMetric,
  category: CotPairCategory = 'CUSTOM'
): CotPairResult {
  const pairName = `${baseMetric.symbol}/${quoteMetric.symbol}`;
  const diff = baseMetric.strengthScore - quoteMetric.strengthScore;

  // Bullishness %: 50% = neutral, 100% = max bullish (+200 diff), 0% = max bearish (-200 diff)
  const rawBullishPct = 50 + diff / 4;
  const bullishnessPct = Math.min(100, Math.max(0, Math.round(rawBullishPct * 10) / 10));
  const bearishnessPct = Math.round((100 - bullishnessPct) * 10) / 10;

  const { biasLabel, biasGrade } = determinePairBias(diff, bullishnessPct);

  // Flow bias
  let weeklyFlowBias: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL' = 'NEUTRAL';
  if (baseMetric.weeklyChangePctOI > 0.5 && quoteMetric.weeklyChangePctOI < -0.5) {
    weeklyFlowBias = 'ACCUMULATING';
  } else if (baseMetric.weeklyChangePctOI < -0.5 && quoteMetric.weeklyChangePctOI > 0.5) {
    weeklyFlowBias = 'DISTRIBUTING';
  }

  const { thesis, keyDrivers } = generatePairThesis(baseMetric, quoteMetric, pairName, biasLabel, bullishnessPct);

  return {
    id: `${baseMetric.symbol}_${quoteMetric.symbol}`,
    pair: pairName,
    baseAsset: baseMetric.symbol,
    quoteAsset: quoteMetric.symbol,
    baseName: baseMetric.name,
    quoteName: quoteMetric.name,
    category,
    baseMetric,
    quoteMetric,
    differentialScore: diff,
    bullishnessPct,
    bearishnessPct,
    biasLabel,
    biasGrade,
    weeklyFlowBias,
    thesis,
    keyDrivers,
  };
}

/**
 * Master function to process all COT market summaries and generate the complete pair universe
 */
export function generateAllCotPairs(summaries: CotMarketSummary[]): {
  assetMetrics: CotAssetMetric[];
  allPairs: CotPairResult[];
  pairsByCategory: Record<CotPairCategory, CotPairResult[]>;
  topBullishPairs: CotPairResult[];
  topBearishPairs: CotPairResult[];
} {
  const assetMap = new Map<string, CotAssetMetric>();

  // 1. Process all available summaries into normalized asset metrics
  for (const s of summaries) {
    if (!s.hasData || !s.latest) continue;
    const metric = calculateAssetCotStrength(s.latest, s.market?.name);
    assetMap.set(metric.symbol, metric);
  }

  // 2. Ensure USD exists (derive from DXY or foreign basket if not already in summaries)
  if (!assetMap.has('USD')) {
    const dxySummary = summaries.find((s) => s.market?.code === '098662' && s.latest);
    const usdMetric = deriveUsdAssetMetric(assetMap, dxySummary?.latest);
    assetMap.set('USD', usdMetric);
  }

  // 3. Evaluate Curated Pairs
  const allPairs: CotPairResult[] = [];
  const pairsByCategory: Record<CotPairCategory, CotPairResult[]> = {
    FOREX: [],
    COMMODITIES: [],
    INDICES: [],
    CRYPTO: [],
    CUSTOM: [],
  };

  for (const config of CURATED_COT_PAIRS) {
    const baseMetric = assetMap.get(config.base);
    const quoteMetric = assetMap.get(config.quote);

    if (baseMetric && quoteMetric) {
      const pairResult = evaluateCotPair(baseMetric, quoteMetric, config.category);
      allPairs.push(pairResult);
      pairsByCategory[config.category].push(pairResult);
    }
  }

  // 4. Sort pairs by Bullishness descending for top lists
  const sorted = [...allPairs].sort((a, b) => b.bullishnessPct - a.bullishnessPct);
  const topBullishPairs = sorted.filter((p) => p.bullishnessPct >= 55).slice(0, 8);
  const topBearishPairs = [...sorted].reverse().filter((p) => p.bullishnessPct <= 45).slice(0, 8);

  const assetMetrics = Array.from(assetMap.values());

  return {
    assetMetrics,
    allPairs,
    pairsByCategory,
    topBullishPairs,
    topBearishPairs,
  };
}

/**
 * Resolves standard financial symbols (EURUSD, XAUUSD, BTCUSDT, US30) into Base and Quote COT assets
 */
export function parseSymbolToAssets(symbol: string): { base: string; quote: string } {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean === 'XAUUSD' || clean === 'GOLD') return { base: 'XAU', quote: 'USD' };
  if (clean === 'XAGUSD' || clean === 'SILVER') return { base: 'XAG', quote: 'USD' };
  if (clean === 'USOIL' || clean === 'WTI' || clean === 'BRENT') return { base: 'WTI', quote: 'USD' };
  if (clean.startsWith('BTC')) return { base: 'BTC', quote: 'USD' };
  if (clean.startsWith('ETH')) return { base: 'ETH', quote: 'USD' };
  if (clean === 'US30') return { base: 'US30', quote: 'USD' };
  if (clean === 'NAS100') return { base: 'NAS100', quote: 'USD' };
  if (clean === 'SPX500' || clean === 'SPX') return { base: 'SPX', quote: 'USD' };

  if (clean.length === 6) {
    return { base: clean.slice(0, 3), quote: clean.slice(3, 6) };
  }
  return { base: clean, quote: 'USD' };
}

/**
 * Directly looks up or calculates the COT pair differential for any active symbol
 */
export function getCotPairForSymbol(symbol: string, summaries: CotMarketSummary[]): CotPairResult | null {
  if (!symbol || !summaries || summaries.length === 0) return null;
  const { base, quote } = parseSymbolToAssets(symbol);
  const { assetMetrics } = generateAllCotPairs(summaries);
  const baseMetric = assetMetrics.find((a) => a.symbol === base);
  const quoteMetric = assetMetrics.find((a) => a.symbol === quote);
  if (baseMetric && quoteMetric) {
    return evaluateCotPair(baseMetric, quoteMetric, 'CUSTOM');
  }
  return null;
}
