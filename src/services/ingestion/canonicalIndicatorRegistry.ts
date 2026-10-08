/**
 * PRIME PIP FX COMMAND CENTER — Canonical Indicator Registry & Alias Resolver
 * Centralized, asset-agnostic indicator mapping engine supporting all 8 major currencies,
 * commodities, yields, indices, and equities.
 */

import { CanonicalIndicatorDefinition } from '../../types/documentIngestionTypes';
import { OFFICIAL_INDICATOR_REGISTRY } from '../../data/fundamentalRegistryData';

export const CANONICAL_INDICATOR_DEFINITIONS: CanonicalIndicatorDefinition[] = [
  // ==========================================
  // 1. UNITED STATES (USD)
  // ==========================================
  {
    id: 'USD_FED_FUNDS_RATE',
    name: 'Fed Funds Target Rate (Upper Limit)',
    shortLabel: 'Fed Funds Rate',
    asset: 'USD',
    category: 'MONETARY_POLICY',
    unit: '%',
    frequency: 'IRREGULAR',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'fed funds rate',
      'federal funds rate',
      'fed funds target rate',
      'policy rate',
      'interest rate',
      'target rate',
      'upper limit',
      'fed policy rate',
      'fomc rate',
      'us interest rate',
    ],
    expectedMin: 0.0,
    expectedMax: 20.0,
  },
  {
    id: 'USD_CPI_HEADLINE',
    name: 'US CPI — Headline YoY',
    shortLabel: 'US CPI YoY',
    asset: 'USD',
    category: 'INFLATION',
    unit: '%',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'cpi yoy',
      'consumer price index yoy',
      'headline cpi',
      'us cpi',
      'consumer price index',
      'inflation rate yoy',
      'us inflation',
      'cpi headline',
      'cpi (yoy)',
    ],
    expectedMin: -5.0,
    expectedMax: 25.0,
  },
  {
    id: 'USD_CPI_CORE',
    name: 'US Core CPI — ex Food & Energy YoY',
    shortLabel: 'Core CPI YoY',
    asset: 'USD',
    category: 'INFLATION',
    unit: '%',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'core cpi yoy',
      'core cpi',
      'core consumer price index',
      'cpi ex food energy',
      'core inflation',
      'us core cpi',
      'core cpi (yoy)',
    ],
    expectedMin: -2.0,
    expectedMax: 20.0,
  },
  {
    id: 'USD_CORE_PCE',
    name: 'US Core PCE Price Index YoY (Fed Preferred Target)',
    shortLabel: 'Core PCE YoY',
    asset: 'USD',
    category: 'INFLATION',
    unit: '%',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'core pce yoy',
      'core pce',
      'pce price index',
      'pce core',
      'personal consumption expenditures',
      'pce inflation',
      'core pce deflator',
      'core pce (yoy)',
    ],
    expectedMin: -2.0,
    expectedMax: 20.0,
  },
  {
    id: 'USD_NFP',
    name: 'US Non-Farm Payrolls (Employment Change)',
    shortLabel: 'NFP Payrolls',
    asset: 'USD',
    category: 'EMPLOYMENT',
    unit: 'k',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'non-farm payrolls',
      'nonfarm payrolls',
      'nfp payrolls',
      'nfp',
      'employment change',
      'total nonfarm',
      'payrolls',
      'us nonfarm',
      'payems',
    ],
    expectedMin: -20000,
    expectedMax: 20000,
  },
  {
    id: 'USD_UNEMPLOYMENT',
    name: 'US Unemployment Rate (U-3)',
    shortLabel: 'Unemployment Rate',
    asset: 'USD',
    category: 'EMPLOYMENT',
    unit: '%',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BEARISH',
    aliases: [
      'unemployment rate',
      'jobless rate',
      'u-3 rate',
      'unemployment',
      'us unemployment',
      'civilian unemployment',
    ],
    expectedMin: 1.0,
    expectedMax: 25.0,
  },
  {
    id: 'USD_GDP_QOQ_ANN',
    name: 'US Real GDP Growth (QoQ Annualized Rate)',
    shortLabel: 'GDP QoQ Ann.',
    asset: 'USD',
    category: 'GROWTH',
    unit: '%',
    frequency: 'QUARTERLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'gdp qoq ann.',
      'gdp qoq',
      'real gdp growth',
      'gross domestic product',
      'gdp annualized',
      'us gdp',
      'gdp growth',
      'economic growth',
    ],
    expectedMin: -35.0,
    expectedMax: 35.0,
  },
  {
    id: 'USD_ISM_MFG_PMI',
    name: 'US ISM Manufacturing PMI (50 = Neutral Baseline)',
    shortLabel: 'ISM Mfg PMI',
    asset: 'USD',
    category: 'BUSINESS_ACTIVITY',
    unit: 'Points',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'ism mfg pmi',
      'ism manufacturing',
      'manufacturing pmi',
      'ism factory',
      'ism mfg',
      'purchasing managers index mfg',
    ],
    expectedMin: 20.0,
    expectedMax: 80.0,
  },
  {
    id: 'USD_ISM_SERVICES_PMI',
    name: 'US ISM Services PMI (Non-Manufacturing)',
    shortLabel: 'ISM Services PMI',
    asset: 'USD',
    category: 'BUSINESS_ACTIVITY',
    unit: 'Points',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'ism services pmi',
      'ism services',
      'non-manufacturing pmi',
      'services pmi',
      'ism non-mfg',
      'purchasing managers index services',
    ],
    expectedMin: 20.0,
    expectedMax: 80.0,
  },
  {
    id: 'USD_RETAIL_SALES_MOM',
    name: 'US Retail Sales (MoM)',
    shortLabel: 'Retail Sales MoM',
    asset: 'USD',
    category: 'CONSUMER',
    unit: '%',
    frequency: 'MONTHLY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'retail sales mom',
      'retail sales',
      'advance retail sales',
      'consumer spending mom',
      'retail sales (mom)',
    ],
    expectedMin: -25.0,
    expectedMax: 25.0,
  },
  {
    id: 'USD_10Y_YIELD',
    name: 'US 10-Year Treasury Benchmark Yield',
    shortLabel: 'US 10Y Yield',
    asset: 'USD',
    category: 'RATES_YIELDS',
    unit: '%',
    frequency: 'DAILY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'us 10y yield',
      '10-year treasury yield',
      '10y yield',
      '10-year note yield',
      '10y benchmark',
      'us 10-year',
      'dgs10',
    ],
    expectedMin: 0.0,
    expectedMax: 20.0,
  },

  // ==========================================
  // 2. COMMODITIES (GOLD, SILVER, CRUDE OIL)
  // ==========================================
  {
    id: 'GOLD_SPOT',
    name: 'Gold Spot / Futures Price (XAU/USD)',
    shortLabel: 'Gold Spot Price',
    asset: 'GOLD',
    category: 'COMMODITIES',
    unit: '$',
    frequency: 'DAILY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'gold spot price',
      'gold price',
      'xau/usd',
      'xauusd',
      'gold spot',
      'spot gold',
      'comex gold',
      'gold futures',
    ],
    expectedMin: 100.0,
    expectedMax: 10000.0,
  },
  {
    id: 'SILVER_SPOT',
    name: 'Silver Spot / Futures Price (XAG/USD)',
    shortLabel: 'Silver Spot Price',
    asset: 'SILVER',
    category: 'COMMODITIES',
    unit: '$',
    frequency: 'DAILY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'silver spot price',
      'silver price',
      'xag/usd',
      'xagusd',
      'silver spot',
      'spot silver',
      'comex silver',
    ],
    expectedMin: 5.0,
    expectedMax: 200.0,
  },
  {
    id: 'CRUDE_OIL_SPOT',
    name: 'Crude Oil Spot / Futures Price (WTI / USOIL)',
    shortLabel: 'Crude Oil Spot',
    asset: 'CRUDE_OIL',
    category: 'COMMODITIES',
    unit: '$',
    frequency: 'DAILY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      'crude oil spot',
      'crude oil price',
      'wti oil',
      'wti crude',
      'usoil',
      'oil price',
      'light sweet crude',
      'nymex wti',
    ],
    expectedMin: 10.0,
    expectedMax: 250.0,
  },
  {
    id: 'COMMODITY_REAL_YIELD',
    name: 'US 10-Year Real TIPS Yield (Discount Rate)',
    shortLabel: '10Y Real Yield',
    asset: 'GOLD',
    category: 'RATES_YIELDS',
    unit: '%',
    frequency: 'DAILY',
    directionRule: 'HIGHER_IS_BEARISH',
    aliases: [
      '10y real yield',
      'us 10-year real yield',
      '10-year real tips yield',
      'real yield',
      'tips yield',
      'dfii10',
    ],
    expectedMin: -5.0,
    expectedMax: 10.0,
  },
  {
    id: 'COMMODITY_BREAKEVEN_INFLATION',
    name: 'US 5-Year Breakeven Inflation Rate',
    shortLabel: '5Y Breakeven Inflation',
    asset: 'GOLD',
    category: 'INFLATION',
    unit: '%',
    frequency: 'DAILY',
    directionRule: 'HIGHER_IS_BULLISH',
    aliases: [
      '5y breakeven inflation',
      'breakeven inflation',
      '5-year breakeven inflation rate',
      'inflation breakeven',
      't5yie',
    ],
    expectedMin: -2.0,
    expectedMax: 10.0,
  },
  {
    id: 'COMMODITY_OIL_INVENTORY_SURPRISE',
    name: 'Weekly Crude Oil Inventories Surprise',
    shortLabel: 'EIA Crude Inventories',
    asset: 'CRUDE_OIL',
    category: 'COMMODITIES',
    unit: 'Mb',
    frequency: 'WEEKLY',
    directionRule: 'HIGHER_IS_BEARISH',
    aliases: [
      'eia crude inventories',
      'crude oil inventory surprise',
      'oil inventory change',
      'eia weekly inventories',
      'crude stocks',
    ],
    expectedMin: -50.0,
    expectedMax: 50.0,
  },
];

// Dynamically augment with any remaining items from the official registry
OFFICIAL_INDICATOR_REGISTRY.forEach((item: any) => {
  const existing = CANONICAL_INDICATOR_DEFINITIONS.find((d) => d.id === item.id);
  if (!existing) {
    CANONICAL_INDICATOR_DEFINITIONS.push({
      id: item.id,
      name: item.name,
      shortLabel: item.shortLabel || item.name,
      asset: item.currency || 'USD',
      category: item.category || 'GROWTH',
      unit: item.unit || '%',
      frequency: item.frequency || 'MONTHLY',
      directionRule: (item.directionRule as any) || 'HIGHER_IS_BULLISH',
      aliases: [
        item.name.toLowerCase(),
        (item.shortLabel || '').toLowerCase(),
        item.id.toLowerCase(),
        `${item.currency || 'USD'} ${item.name}`.toLowerCase(),
      ].filter(Boolean),
    });
  }
});

/**
 * Normalizes an indicator string for matching.
 */
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[….]+/g, ' ')
    .replace(/[()[\]{},;:]/g, ' ')
    .replace(/[-—–_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves any raw indicator name or table row string to its canonical indicator definition.
 */
export function resolveCanonicalIndicator(
  rawName: string,
  assetHint?: string
): CanonicalIndicatorDefinition | null {
  if (!rawName || !rawName.trim()) return null;
  const clean = cleanString(rawName);
  const cleanAsset = assetHint ? assetHint.trim().toUpperCase() : null;

  // Filter candidates if asset hint is provided
  let candidates = CANONICAL_INDICATOR_DEFINITIONS;
  if (cleanAsset && cleanAsset !== 'ALL' && cleanAsset !== 'MULTI') {
    const assetCandidates = CANONICAL_INDICATOR_DEFINITIONS.filter(
      (c) => c.asset.toUpperCase() === cleanAsset ||
             (cleanAsset === 'GOLD' && (c.id.includes('GOLD') || c.id.includes('COMMODITY'))) ||
             (cleanAsset === 'SILVER' && (c.id.includes('SILVER') || c.id.includes('COMMODITY'))) ||
             (cleanAsset === 'CRUDE_OIL' && (c.id.includes('OIL') || c.id.includes('CRUDE')))
    );
    if (assetCandidates.length > 0) {
      candidates = assetCandidates;
    }
  }

  // 1. Exact match against canonical ID or Short Label
  for (const cand of candidates) {
    if (clean === cleanString(cand.id) || clean === cleanString(cand.shortLabel) || clean === cleanString(cand.name)) {
      return cand;
    }
    for (const alias of cand.aliases) {
      if (clean === cleanString(alias)) {
        return cand;
      }
    }
  }

  // 2. High-confidence prefix / substring match (longest matching alias)
  let bestMatch: CanonicalIndicatorDefinition | null = null;
  let maxMatchLength = 0;

  for (const cand of candidates) {
    for (const alias of cand.aliases) {
      const cleanAlias = cleanString(alias);
      if (cleanAlias.length >= 4 && clean.includes(cleanAlias)) {
        if (cleanAlias.length > maxMatchLength) {
          maxMatchLength = cleanAlias.length;
          bestMatch = cand;
        }
      }
    }
  }

  if (bestMatch) return bestMatch;

  // 3. Fallback token-based similarity check
  const inputTokens = clean.split(' ').filter((t) => t.length > 2);
  let bestTokenScore = 0;
  let bestTokenCandidate: CanonicalIndicatorDefinition | null = null;

  for (const cand of candidates) {
    let score = 0;
    const candTokens = cleanString(cand.name).split(' ');
    for (const token of inputTokens) {
      if (candTokens.includes(token)) {
        score += token.length;
      }
    }
    if (score > bestTokenScore && score >= 7) {
      bestTokenScore = score;
      bestTokenCandidate = cand;
    }
  }

  return bestTokenCandidate;
}
