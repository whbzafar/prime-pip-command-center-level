import type { Request, Response } from 'express';

type Point = { date: string; value: number };
type SeriesResult = {
  id: string;
  label: string;
  unit: string;
  frequency: string;
  url: string;
  points: Point[];
  latest: Point | null;
  previous: Point | null;
  status: 'LIVE' | 'STALE' | 'UNAVAILABLE';
  error?: string;
};

const SERIES = [
  { id: 'DFF', label: 'Effective Federal Funds Rate', unit: '%', frequency: 'Daily', category: 'policy', url: 'https://fred.stlouisfed.org/series/DFF', maxAgeDays: 10 },
  { id: 'PCEPILFE', label: 'Core PCE Price Index', unit: 'Index', frequency: 'Monthly', category: 'inflation', url: 'https://fred.stlouisfed.org/series/PCEPILFE', maxAgeDays: 75 },
  { id: 'PCEPI', label: 'Headline PCE Price Index', unit: 'Index', frequency: 'Monthly', category: 'inflation', url: 'https://fred.stlouisfed.org/series/PCEPI', maxAgeDays: 75 },
  { id: 'CPILFESL', label: 'Core CPI Price Index', unit: 'Index', frequency: 'Monthly', category: 'inflation', url: 'https://fred.stlouisfed.org/series/CPILFESL', maxAgeDays: 50 },
  { id: 'PAYEMS', label: 'Total Nonfarm Payrolls', unit: 'Thousands of persons', frequency: 'Monthly', category: 'employment', url: 'https://fred.stlouisfed.org/series/PAYEMS', maxAgeDays: 50 },
  { id: 'UNRATE', label: 'Unemployment Rate', unit: '%', frequency: 'Monthly', category: 'employment', url: 'https://fred.stlouisfed.org/series/UNRATE', maxAgeDays: 50 },
  { id: 'CES0500000003', label: 'Average Hourly Earnings, Total Private', unit: 'USD/hour', frequency: 'Monthly', category: 'employment', url: 'https://fred.stlouisfed.org/series/CES0500000003', maxAgeDays: 50 },
  { id: 'GDPC1', label: 'Real Gross Domestic Product', unit: 'Billions of chained dollars', frequency: 'Quarterly', category: 'growth', url: 'https://fred.stlouisfed.org/series/GDPC1', maxAgeDays: 150 },
  { id: 'DGS2', label: '2-Year Treasury Constant Maturity Rate', unit: '%', frequency: 'Daily', category: 'yields', url: 'https://fred.stlouisfed.org/series/DGS2', maxAgeDays: 10 },
  { id: 'DGS10', label: '10-Year Treasury Constant Maturity Rate', unit: '%', frequency: 'Daily', category: 'yields', url: 'https://fred.stlouisfed.org/series/DGS10', maxAgeDays: 10 },
  { id: 'DFII10', label: '10-Year Treasury Inflation-Indexed Real Yield', unit: '%', frequency: 'Daily', category: 'yields', url: 'https://fred.stlouisfed.org/series/DFII10', maxAgeDays: 10 },
  { id: 'VIXCLS', label: 'CBOE Volatility Index (VIX)', unit: 'Index', frequency: 'Daily', category: 'risk', url: 'https://fred.stlouisfed.org/series/VIXCLS', maxAgeDays: 10 },
] as const;

const clamp = (value: number, min = -100, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const ageDays = (date: string) => Math.max(0, (Date.now() - Date.parse(date + 'T23:59:59Z')) / 86400000);

async function fetchSeries(id: string): Promise<{ points: Point[]; source: string }> {
  const key = (process.env.FRED_API_KEY || '').trim();
  if (key) {
    const url = new URL('https://api.stlouisfed.org/fred/series/observations');
    url.searchParams.set('series_id', id);
    url.searchParams.set('api_key', key);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', '48');
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const body = await response.json() as { observations?: Array<{ date: string; value: string }> };
      const points = (body.observations || [])
        .map((o) => ({ date: o.date, value: Number(o.value) }))
        .filter((p) => p.date && Number.isFinite(p.value))
        .sort((a, b) => b.date.localeCompare(a.date));
      if (points.length) return { points, source: 'FRED API' };
    }
  }
  // Public FRED graph CSV fallback. It contains observations, not consensus forecasts.
  const response = await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + encodeURIComponent(id), {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'text/csv' },
  });
  if (!response.ok) throw new Error('FRED returned HTTP ' + response.status);
  const csv = await response.text();
  const points = csv.split(/\r?\n/).slice(1).map((line) => {
    const split = line.indexOf(',');
    if (split < 0) return null;
    const date = line.slice(0, split).trim();
    const value = Number(line.slice(split + 1).trim());
    return date && Number.isFinite(value) ? { date, value } : null;
  }).filter((p): p is Point => Boolean(p)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 48);
  if (!points.length) throw new Error('No numeric observations returned');
  return { points, source: 'FRED public CSV' };
}

function pctChange(now: number, then: number): number | null {
  if (!Number.isFinite(now) || !Number.isFinite(then) || then === 0) return null;
  return ((now / then) - 1) * 100;
}
function difference(points: Point[], periods: number): number | null {
  if (points.length <= periods) return null;
  return points[0].value - points[periods].value;
}
function normalize(value: number | null, scale: number, direction = 1): number {
  if (value === null || !Number.isFinite(value)) return 0;
  return clamp((Math.atan((value * direction) / scale) / (Math.PI / 2)) * 100);
}
function annualizedQuarterlyGrowth(points: Point[]): number | null {
  if (points.length < 2 || points[1].value === 0) return null;
  return ((Math.pow(points[0].value / points[1].value, 4) - 1) * 100);
}
function yearOverYear(points: Point[]): number | null {
  if (points.length < 13 || points[12].value === 0) return null;
  return ((points[0].value / points[12].value) - 1) * 100;
}
function monthlyPercent(points: Point[]): number | null {
  if (points.length < 2 || points[1].value === 0) return null;
  return ((points[0].value / points[1].value) - 1) * 100;
}
function toIndicator(id: string, label: string, unit: string, frequency: string, url: string, points: Point[], maxAge: number, source: string): SeriesResult {
  const latest = points[0] || null;
  const previous = points[1] || null;
  const age = latest ? ageDays(latest.date) : Infinity;
  return { id, label, unit, frequency, url, points, latest, previous, status: !latest ? 'UNAVAILABLE' : age > maxAge ? 'STALE' : 'LIVE', ...(source ? { source } : {}) } as SeriesResult;
}

function scoreUsd(data: Record<string, SeriesResult>) {
  const s = (id: string) => data[id]?.points || [];
  const corePce = s('PCEPILFE');
  const headlinePce = s('PCEPI');
  const coreCpi = s('CPILFESL');
  const payrolls = s('PAYEMS');
  const unemployment = s('UNRATE');
  const earnings = s('CES0500000003');
  const gdp = s('GDPC1');
  const funds = s('DFF');
  const twoYear = s('DGS2');
  const tenYear = s('DGS10');
  const realYield = s('DFII10');
  const vix = s('VIXCLS');

  // Trend-only v1: official observations and their historical changes. No fabricated consensus.
  const corePceYoy = yearOverYear(corePce);
  const corePce3mMomentum = corePce.length >= 4 && corePce[3].value !== 0
    ? ((corePce[0].value / corePce[3].value) - 1) * 4 * 100
    : null;
  const coreCpiYoy = yearOverYear(coreCpi);
  const pceScore = normalize(corePce3mMomentum === null ? (corePceYoy === null ? null : corePceYoy - 2) : (corePce3mMomentum - 2), 1.2, 1);
  const cpiMomentum = coreCpi.length >= 4 && coreCpi[3].value !== 0 ? ((coreCpi[0].value / coreCpi[3].value) - 1) * 4 * 100 : null;
  const inflationScore = clamp((pceScore * 0.7) + (normalize(cpiMomentum === null ? (coreCpiYoy === null ? null : coreCpiYoy - 2) : cpiMomentum - 2, 1.2) * 0.3));

  const payrollChange = difference(payrolls, 1); // thousands of jobs, month-over-month
  const payroll3mChange = payrolls.length >= 4 ? (payrolls[0].value - payrolls[3].value) / 3 : null;
  const unemployment3m = difference(unemployment, 3);
  const earningsYoy = yearOverYear(earnings);
  const earningsMom = monthlyPercent(earnings);
  const employmentScore = clamp(
    normalize(payroll3mChange, 150) * 0.45 +
    normalize(unemployment3m, 0.25, -1) * 0.30 +
    normalize(earningsMom, 0.35) * 0.25
  );

  const gdpGrowth = annualizedQuarterlyGrowth(gdp);
  const previousGdpGrowth = gdp.length >= 3 ? ((Math.pow(gdp[1].value / gdp[2].value, 4) - 1) * 100) : null;
  const growthScore = normalize(gdpGrowth === null ? null : gdpGrowth - 2, 2.5) * 0.65 +
    normalize(gdpGrowth === null || previousGdpGrowth === null ? null : gdpGrowth - previousGdpGrowth, 2) * 0.35;

  const policyChange = difference(funds, 20); // 20 observations is roughly one trading month
  const policyScore = normalize(policyChange, 0.25) * 0.35 + normalize(difference(twoYear, 5), 0.35) * 0.65;

  const yieldsScore = clamp(
    normalize(difference(twoYear, 5), 0.35) * 0.45 +
    normalize(difference(tenYear, 5), 0.35) * 0.25 +
    normalize(difference(realYield, 5), 0.20) * 0.30
  );

  // VIX is only a context proxy. A rising VIX can support USD as a haven but can also
  // signal US-origin risk; therefore cap its contribution and label it contextual.
  const riskScore = clamp(normalize(difference(vix, 5), 5, 1) * 0.35);

  const categories = [
    { id: 'policy', label: 'Fed policy & market repricing', weight: 25, score: clamp(policyScore), details: 'Effective Fed funds rate and 2-year yield trend; this is a policy proxy, not a live FedWatch probability.' },
    { id: 'inflation', label: 'Inflation trend', weight: 20, score: inflationScore, details: 'Core PCE is primary; Core CPI is a secondary signal. Positive means inflation momentum may delay easing, not that inflation is always USD-bullish.' },
    { id: 'employment', label: 'Employment & wages', weight: 20, score: employmentScore, details: 'Payroll momentum, unemployment trend and monthly hourly earnings momentum.' },
    { id: 'growth', label: 'Real GDP growth', weight: 15, score: clamp(growthScore), details: 'Quarter-over-quarter real GDP growth annualized and change versus the prior quarter.' },
    { id: 'yields', label: 'Treasury & real yields', weight: 15, score: yieldsScore, details: '5-observation changes in 2Y, 10Y and 10Y real yield; not compared with foreign yields in this USD-only version.' },
    { id: 'risk', label: 'Risk sentiment context', weight: 5, score: riskScore, details: 'Capped VIX-based risk-off proxy; interpret cautiously and never as a standalone USD signal.' },
  ];
  const weightedScore = categories.reduce((sum, c) => sum + c.score * c.weight / 100, 0);
  const score = round(clamp(weightedScore), 1);
  const bullishIndex = round((100 + score) / 2, 1);
  const bearishIndex = round((100 - score) / 2, 1);
  const bullishLabel = score >= 60 ? 'STRONGLY BULLISH' : score >= 25 ? 'BULLISH' : score <= -60 ? 'STRONGLY BEARISH' : score <= -25 ? 'BEARISH' : 'NEUTRAL / MIXED';
  const requiredIds = ['DFF','PCEPILFE','CPILFESL','PAYEMS','UNRATE','GDPC1','DGS2','DGS10','DFII10','VIXCLS'];
  const available = requiredIds.filter((id) => data[id]?.latest && data[id].status !== 'UNAVAILABLE').length;
  const coverage = round((available / requiredIds.length) * 100, 0);
  const isStale = requiredIds.some((id) => !data[id]?.latest || data[id].status !== 'LIVE');
  const indicators = {
    corePceYoY: corePceYoy === null ? null : round(corePceYoy, 2),
    coreCpiYoY: coreCpiYoy === null ? null : round(coreCpiYoy, 2),
    headlinePceYoY: yearOverYear(headlinePce) === null ? null : round(yearOverYear(headlinePce)!, 2),
    nfpMonthlyChangeThousands: payrollChange === null ? null : round(payrollChange, 0),
    unemploymentRate: unemployment[0] ? round(unemployment[0].value, 2) : null,
    averageHourlyEarningsYoY: earningsYoy === null ? null : round(earningsYoy, 2),
    averageHourlyEarningsMoM: earningsMom === null ? null : round(earningsMom, 2),
    realGdpQoQAnnualized: gdpGrowth === null ? null : round(gdpGrowth, 2),
    effectiveFedFundsRate: funds[0] ? round(funds[0].value, 2) : null,
    treasury2Y: twoYear[0] ? round(twoYear[0].value, 2) : null,
    treasury10Y: tenYear[0] ? round(tenYear[0].value, 2) : null,
    realYield10Y: realYield[0] ? round(realYield[0].value, 2) : null,
    vix: vix[0] ? round(vix[0].value, 2) : null,
  };
  return { score, bullishIndex, bearishIndex, classification: bullishLabel, categories, indicators, coveragePercent: coverage, dataStatus: isStale ? 'PARTIAL_OR_STALE' : 'CURRENT', methodology: 'Trend-based v1; official observations only; no consensus forecast, no probability claim. Directional indices are not probabilities.' };
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const retrievedAt = new Date().toISOString();
  const results = await Promise.all(SERIES.map(async (definition) => {
    try {
      const fetched = await fetchSeries(definition.id);
      return { definition, fetched, error: null as string | null };
    } catch (error: any) {
      return { definition, fetched: null, error: String(error?.message || error) };
    }
  }));
  const series: Record<string, SeriesResult> = {};
  const errors: string[] = [];
  let liveCount = 0;
  for (const result of results) {
    const { definition, fetched, error } = result;
    if (!fetched) {
      series[definition.id] = { id: definition.id, label: definition.label, unit: definition.unit, frequency: definition.frequency, url: definition.url, points: [], latest: null, previous: null, status: 'UNAVAILABLE', error: error || 'Data unavailable' };
      errors.push(definition.id + ': ' + (error || 'Data unavailable'));
      continue;
    }
    const item = toIndicator(definition.id, definition.label, definition.unit, definition.frequency, definition.url, fetched.points, definition.maxAgeDays, fetched.source);
    series[definition.id] = item;
    if (item.status === 'LIVE') liveCount++;
    if (item.status !== 'LIVE') errors.push(definition.id + ': ' + item.status);
  }
  const dashboard = scoreUsd(series);
  return res.status(200).json({
    ok: true,
    retrievedAt,
    provider: 'FRED',
    providerMode: process.env.FRED_API_KEY ? 'FRED_API_KEY' : 'FRED_PUBLIC_CSV_FALLBACK',
    liveSeriesCount: liveCount,
    totalSeriesCount: SERIES.length,
    errors,
    dashboard,
    series,
    sourceNotes: [
      'Official statistical observations and historical trends only; consensus forecasts are not yet included.',
      'FRED series may be revised. The current endpoint returns the latest available values, not point-in-time vintages.',
      'A polling timestamp is not the same as the source publication timestamp.',
      'Bullish/bearish indices are transformed directional scores, not probabilities of price movement.',
    ],
  });
}
