type InstrumentCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD' | 'XAU' | 'XAG';
type FactorKey = 'monetaryPolicy' | 'growthInflation' | 'positioning' | 'momentum';

interface FactorScore {
  key: FactorKey;
  label: string;
  score: number;
  weight: number;
  status: 'LIVE' | 'UNAVAILABLE';
  updatedAt: string | null;
  reason: string;
}

interface InstrumentScore {
  code: InstrumentCode;
  score: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  factors: FactorScore[];
  freshness: 'LIVE' | 'PARTIAL' | 'UNAVAILABLE';
}

const WEIGHTS: Record<FactorKey, number> = {
  monetaryPolicy: 35,
  growthInflation: 25,
  positioning: 20,
  momentum: 20,
};

const CODES: InstrumentCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'XAU', 'XAG'];
const FRED_POLICY_SERIES: Partial<Record<InstrumentCode, string>> = {
  USD: 'FEDFUNDS',
  EUR: 'ECBDFR',
  GBP: 'IRSTCI01GBM156N',
  JPY: 'IRSTCI01JPM156N',
  CHF: 'IRSTCI01CHM156N',
  CAD: 'IRSTCI01CAM156N',
  AUD: 'IRSTCI01AUM156N',
  NZD: 'IRSTCI01NZM156N',
};
const cache = new Map<string, { value: number; updatedAt: string }>();

function labelForScore(score: number): InstrumentScore['label'] {
  if (score > 60) return 'Bullish';
  if (score < 40) return 'Bearish';
  return 'Neutral';
}

async function getFredLatest(seriesId: string): Promise<{ value: number; updatedAt: string } | null> {
  const cached = cache.get(seriesId);
  if (cached && Date.now() - Date.parse(cached.updatedAt) < 15 * 60 * 1000) return cached;
  try {
    const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`, {
      headers: { Accept: 'text/csv', 'User-Agent': 'PrimePipFX-Fundamental-Terminal/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return cached || null;
    const rows = (await response.text()).trim().split(/\r?\n/).slice(1).reverse();
    const row = rows.find((line) => {
      const value = line.split(',')[1];
      return value && value !== '.' && Number.isFinite(Number(value));
    });
    if (!row) return cached || null;
    const [date, rawValue] = row.split(',');
    const result = { value: Number(rawValue), updatedAt: new Date(`${date}T00:00:00Z`).toISOString() };
    cache.set(seriesId, result);
    return result;
  } catch (error) {
    console.error(`FRED ${seriesId} adapter error:`, error);
    return cached || null;
  }
}

function unavailableFactor(key: FactorKey, label: string, weight: number): FactorScore {
  return { key, label, score: 50, weight, status: 'UNAVAILABLE', updatedAt: null, reason: 'No verified live observation is configured for this factor yet.' };
}

export async function getFundamentalStrengthDashboard() {
  const rates = await Promise.all(
    CODES.filter((code) => FRED_POLICY_SERIES[code]).map(async (code) => [code, await getFredLatest(FRED_POLICY_SERIES[code] as string)] as const),
  );
  const rateMap = new Map(rates);
  const liveRates = rates.map(([, item]) => item?.value).filter((value): value is number => typeof value === 'number');
  const averageRate = liveRates.length ? liveRates.reduce((sum, value) => sum + value, 0) / liveRates.length : 0;

  const instruments: InstrumentScore[] = CODES.map((code) => {
    const rate = rateMap.get(code);
    const monetaryPolicy: FactorScore = rate
      ? {
        key: 'monetaryPolicy',
        label: 'Monetary policy',
        score: Math.max(0, Math.min(100, 50 + (rate.value - averageRate) * 8)),
        weight: WEIGHTS.monetaryPolicy,
        status: 'LIVE',
        updatedAt: rate.updatedAt,
        reason: `${rate.value.toFixed(2)}% policy-rate proxy versus ${averageRate.toFixed(2)}% major-currency average.`,
      }
      : unavailableFactor('monetaryPolicy', 'Monetary policy', WEIGHTS.monetaryPolicy);
    const factors = [
      monetaryPolicy,
      unavailableFactor('growthInflation', 'Growth and inflation surprises', WEIGHTS.growthInflation),
      unavailableFactor('positioning', 'COT positioning', WEIGHTS.positioning),
      unavailableFactor('momentum', 'Price momentum', WEIGHTS.momentum),
    ];
    const score = Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight / 100, 0));
    const freshness: InstrumentScore['freshness'] = factors.some((factor) => factor.status === 'LIVE') ? 'PARTIAL' : 'UNAVAILABLE';
    return { code, score, label: labelForScore(score), factors, freshness };
  }).sort((a, b) => b.score - a.score);

  return {
    generatedAt: new Date().toISOString(),
    methodology: { weights: WEIGHTS, thresholds: { bullish: 60, bearish: 40 } },
    coverage: { liveFactors: 1, totalFactors: 4, note: 'Scores are intentionally marked PARTIAL until each adapter has a verified observation.' },
    instruments,
  };
}
