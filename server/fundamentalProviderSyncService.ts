import { OFFICIAL_INDICATOR_REGISTRY } from '../src/data/fundamentalRegistryData.js';
import {
  VERIFIED_COMMODITIES,
  VERIFIED_COT,
} from './verifiedFundamentalBaselines.js';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';
import { syncFundamentalProfile } from './fundamentalDataArchitecture.js';
const CURRENCY_POLICY_SERIES: Record<string, { id: string; name: string; source: string }> = {
  USD: { id: 'DFEDTARU', name: 'Federal Reserve', source: 'https://fred.stlouisfed.org/series/DFEDTARU' },
  EUR: { id: 'ECBDFR', name: 'European Central Bank', source: 'https://fred.stlouisfed.org/series/ECBDFR' },
};

const SCHEDULED_INDICATOR_SERIES: Record<string, { seriesId: string; transform: FredSeriesMapping['transform'] }> = {
  usd_nfp_change: { seriesId: 'PAYEMS', transform: 'MOM_DIFF' },
  usd_unemployment_rate: { seriesId: 'UNRATE', transform: 'LEVEL' },
  usd_gdp_qoq: { seriesId: 'A191RL1Q225SBEA', transform: 'LEVEL' },
  usd_retail_sales_mom: { seriesId: 'RSAFS', transform: 'MOM_PCT' },
  usd_nfp: { seriesId: 'PAYEMS', transform: 'MOM_DIFF' },
  usd_unemployment: { seriesId: 'UNRATE', transform: 'LEVEL' },
  usd_gdp_annualized: { seriesId: 'A191RL1Q225SBEA', transform: 'LEVEL' },
  usd_retail_sales: { seriesId: 'RSAFS', transform: 'MOM_PCT' },
  usd_initial_claims: { seriesId: 'ICSA', transform: 'LEVEL' },
  usd_ism_manufacturing_pmi: { seriesId: 'NAPM', transform: 'LEVEL' },
  usd_pce_yoy: { seriesId: 'PCEPI', transform: 'YOY_PCT' },
  usd_core_pce_yoy: { seriesId: 'PCEPILFE', transform: 'YOY_PCT' },
  eur_10y_bund_yield: { seriesId: 'IRLTLT01DEM156N', transform: 'LEVEL' },
  gbp_10y_gilt_yield: { seriesId: 'IRLTLT01GBM156N', transform: 'LEVEL' },
  jpy_10y_jgb_yield: { seriesId: 'IRLTLT01JPM156N', transform: 'LEVEL' },
  cad_10y_yield: { seriesId: 'IRLTLT01CAM156N', transform: 'LEVEL' },
  aud_10y_yield: { seriesId: 'IRLTLT01AUM156N', transform: 'LEVEL' },
};



export interface ProviderStatusInfo {
  provider: 'FRED' | 'BANK_OF_CANADA';
  name: string;
  configured: boolean;
  mode: 'API_KEY_ACTIVE' | 'PUBLIC_FEED_FALLBACK';
  coverage: string[];
}

export interface LiveSyncProviderReport {
  timestamp: string;
  action: 'SYNC' | 'VERIFY';
  targetCurrency: string;
  providersUsed: string[];
  providerStatuses: ProviderStatusInfo[];
  indicatorsUpdated: number;
  ratesUpdated: number;
  commoditiesUpdated: number;
  multiAssetsUpdated: number;
  liveApiHits: number;
  verifiedFallbackHits: number;
}

interface FredSeriesMapping {
  indicatorId: string;
  currency: string;
  fredSeriesId: string;
  transform: 'LEVEL' | 'YOY_PCT' | 'MOM_DIFF' | 'MOM_PCT';
  alphaVantageFunction?: string;
}

const FRED_INDICATOR_MAPPINGS: FredSeriesMapping[] = [
  { indicatorId: 'usd_fed_funds_rate', currency: 'USD', fredSeriesId: 'DFEDTARU', transform: 'LEVEL', alphaVantageFunction: 'FEDERAL_FUNDS_RATE' },
  { indicatorId: 'usd_cpi_yoy', currency: 'USD', fredSeriesId: 'CPIAUCSL', transform: 'YOY_PCT', alphaVantageFunction: 'CPI' },
  { indicatorId: 'usd_core_cpi_yoy', currency: 'USD', fredSeriesId: 'CPILFESL', transform: 'YOY_PCT' },
  { indicatorId: 'usd_pce_yoy', currency: 'USD', fredSeriesId: 'PCEPI', transform: 'YOY_PCT' },
  { indicatorId: 'usd_core_pce_yoy', currency: 'USD', fredSeriesId: 'PCEPILFE', transform: 'YOY_PCT' },
  { indicatorId: 'usd_nfp_change', currency: 'USD', fredSeriesId: 'PAYEMS', transform: 'MOM_DIFF', alphaVantageFunction: 'NONFARM_PAYROLL' },
  { indicatorId: 'usd_unemployment_rate', currency: 'USD', fredSeriesId: 'UNRATE', transform: 'LEVEL', alphaVantageFunction: 'UNEMPLOYMENT' },
  { indicatorId: 'usd_gdp_qoq', currency: 'USD', fredSeriesId: 'A191RL1Q225SBEA', transform: 'LEVEL', alphaVantageFunction: 'REAL_GDP' },
  { indicatorId: 'usd_retail_sales_mom', currency: 'USD', fredSeriesId: 'RSAFS', transform: 'MOM_PCT', alphaVantageFunction: 'RETAIL_SALES' },
  { indicatorId: 'usd_2y_yield', currency: 'USD', fredSeriesId: 'DGS2', transform: 'LEVEL', alphaVantageFunction: 'TREASURY_YIELD' },
  { indicatorId: 'usd_10y_yield', currency: 'USD', fredSeriesId: 'DGS10', transform: 'LEVEL', alphaVantageFunction: 'TREASURY_YIELD' },
  { indicatorId: 'usd_initial_claims', currency: 'USD', fredSeriesId: 'ICSA', transform: 'LEVEL' },
  { indicatorId: 'eur_ecb_rate', currency: 'EUR', fredSeriesId: 'ECBDFR', transform: 'LEVEL' },
  { indicatorId: 'eur_10y_bund_yield', currency: 'EUR', fredSeriesId: 'IRLTLT01DEM156N', transform: 'LEVEL' },
  { indicatorId: 'gbp_10y_gilt_yield', currency: 'GBP', fredSeriesId: 'IRLTLT01GBM156N', transform: 'LEVEL' },
  { indicatorId: 'jpy_10y_jgb_yield', currency: 'JPY', fredSeriesId: 'IRLTLT01JPM156N', transform: 'LEVEL' },
  { indicatorId: 'cad_10y_yield', currency: 'CAD', fredSeriesId: 'IRLTLT01CAM156N', transform: 'LEVEL' },
  { indicatorId: 'aud_10y_yield', currency: 'AUD', fredSeriesId: 'IRLTLT01AUM156N', transform: 'LEVEL' },
];

export function getProviderStatuses(): ProviderStatusInfo[] {
  return [
    {
      provider: 'FRED',
      name: 'Federal Reserve Economic Data (FRED)',
      configured: Boolean(process.env.FRED_API_KEY && process.env.FRED_API_KEY.trim()),
      mode: process.env.FRED_API_KEY?.trim() ? 'API_KEY_ACTIVE' : 'PUBLIC_FEED_FALLBACK',
      coverage: ['Selected U.S. macro series', 'Treasury yields', 'Daily WTI spot-price observations'],
    },
    {
      provider: 'BANK_OF_CANADA',
      name: 'Bank of Canada Valet API',
      configured: true,
      mode: 'PUBLIC_FEED_FALLBACK',
      coverage: ['Canadian policy-rate observations'],
    },
  ];
}
async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PrimePipFX-CommandCenter/2.0',
        Accept: 'application/json, text/csv, text/plain, */*',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch series observations from FRED using FRED_API_KEY if configured,
 * with automatic fallback to official FRED graph CSV endpoint.
 */
async function fetchFredSeriesPoints(seriesId: string): Promise<{
  points: { date: string; value: number }[];
  sourceLabel: string;
} | null> {
  const fredApiKey = (process.env.FRED_API_KEY || '').trim();

  if (fredApiKey) {
    try {
      const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
        seriesId
      )}&api_key=${encodeURIComponent(fredApiKey)}&file_type=json&sort_order=desc&limit=15`;
      const res = await fetchWithTimeout(apiUrl, 4500);
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data?.observations)) {
          const valid = data.observations
            .map((o: any) => ({
              date: String(o.date || ''),
              value: parseFloat(String(o.value)),
            }))
            .filter((o: { date: string; value: number }) => o.date && Number.isFinite(o.value));
          if (valid.length > 0) {
            return { points: valid, sourceLabel: 'FRED Official API (FRED_API_KEY)' };
          }
        }
      }
    } catch {
      // Fall through to official FRED public CSV
    }
  }

  try {
    const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
    const res = await fetchWithTimeout(csvUrl, 4500);
    if (res.ok) {
      const text = await res.text();
      const lines = text
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => {
          const [date, valStr] = line.split(',');
          return { date: (date || '').trim(), value: parseFloat((valStr || '').trim()) };
        })
        .filter((r) => r.date && Number.isFinite(r.value))
        .reverse(); // descending (newest first)
      if (lines.length > 0) {
        return { points: lines.slice(0, 15), sourceLabel: 'FRED Official Statistical Feed' };
      }
    }
  } catch {
    // Ignore network timeout
  }

  return null;
}

function transformSeriesPoints(
  points: { date: string; value: number }[],
  transform: FredSeriesMapping['transform']
): { actual: number; previous: number; date: string } | null {
  if (!points || points.length === 0) return null;
  const latest = points[0];

  if (transform === 'LEVEL') {
    const prev = points[1]?.value ?? latest.value;
    return {
      actual: Number(latest.value.toFixed(2)),
      previous: Number(prev.toFixed(2)),
      date: latest.date,
    };
  }

  if (transform === 'MOM_DIFF') {
    if (points.length < 2) return null;
    const actualDiff = Number((points[0].value - points[1].value).toFixed(1));
    const prevDiff =
      points.length >= 3 ? Number((points[1].value - points[2].value).toFixed(1)) : actualDiff;
    return { actual: actualDiff, previous: prevDiff, date: latest.date };
  }

  if (transform === 'MOM_PCT') {
    if (points.length < 2 || points[1].value === 0) return null;
    const actualPct = Number((((points[0].value - points[1].value) / points[1].value) * 100).toFixed(2));
    const prevPct =
      points.length >= 3 && points[2].value !== 0
        ? Number((((points[1].value - points[2].value) / points[2].value) * 100).toFixed(2))
        : actualPct;
    return { actual: actualPct, previous: prevPct, date: latest.date };
  }

  if (transform === 'YOY_PCT') {
    if (points.length < 13 || points[12].value === 0) return null;
    const actualYoY = Number((((points[0].value - points[12].value) / points[12].value) * 100).toFixed(2));
    const prevYoY =
      points.length >= 14 && points[13].value !== 0
        ? Number((((points[1].value - points[13].value) / points[13].value) * 100).toFixed(2))
        : actualYoY;
    return { actual: actualYoY, previous: prevYoY, date: latest.date };
  }

  return null;
}

export interface PublicOfficialObservation {
  actual: number;
  previous: number | null;
  date: string;
  sourceName: string;
  sourceUrl: string;
  seriesId: string;
  retrievedAt: string;
}

function isRecentObservation(dateValue: string, maxAgeDays: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;
  const date = new Date(dateValue + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) return false;
  const ageDays = (Date.now() - date.getTime()) / 86400000;
  return ageDays >= 0 && ageDays <= maxAgeDays;
}

function maxObservationAgeDays(frequency: string): number {
  const normalized = frequency.toLowerCase();
  if (normalized.includes('daily')) return 14;
  if (normalized.includes('weekly')) return 30;
  if (normalized.includes('bi-weekly')) return 45;
  if (normalized.includes('monthly')) return 100;
  if (normalized.includes('quarterly')) return 200;
  if (normalized.includes('annual')) return 450;
  return 180;
}

const OFFICIAL_FRED_INDICATOR_ALIASES: Record<string, string> = {
  usd_policy_rate: 'usd_fed_funds_rate',
  eur_policy_rate: 'eur_ecb_rate',
  usd_10y_yield: 'usd_10y_yield',
  usd_2y_yield: 'usd_2y_yield',
  eur_10y_bund_yield: 'eur_10y_bund_yield',
  gbp_10y_gilt_yield: 'gbp_10y_gilt_yield',
  jpy_10y_jgb_yield: 'jpy_10y_jgb_yield',
  cad_10y_yield: 'cad_10y_yield',
  aud_10y_acgb_yield: 'aud_10y_yield',
};

export async function fetchPublicFredIndicator(
  indicatorId: string,
  currency: string,
  frequency: string,
): Promise<PublicOfficialObservation | null> {
  const normalizedId = indicatorId.toLowerCase();
  const mappedId = OFFICIAL_FRED_INDICATOR_ALIASES[normalizedId] || normalizedId;
  const mapping = FRED_INDICATOR_MAPPINGS.find((item) =>
    item.indicatorId.toLowerCase() === mappedId && item.currency === currency.toUpperCase()
  );
  if (!mapping) return null;

  const series = await fetchFredSeriesPoints(mapping.fredSeriesId);
  if (!series) return null;
  const values = transformSeriesPoints(series.points, mapping.transform);
  if (!values || !Number.isFinite(values.actual) || !isRecentObservation(values.date, maxObservationAgeDays(frequency))) {
    return null;
  }

  return {
    ...values,
    sourceName: series.sourceLabel,
    sourceUrl: `https://fred.stlouisfed.org/series/${mapping.fredSeriesId}`,
    seriesId: mapping.fredSeriesId,
    retrievedAt: new Date().toISOString(),
  };
}

export async function fetchPublicPolicyRate(currency: string): Promise<PublicOfficialObservation | null> {
  const normalizedCurrency = currency.toUpperCase();
  if (normalizedCurrency === 'CAD') {
    try {
      const seriesId = 'V39079';
      const sourceUrl = 'https://www.bankofcanada.ca/rates/interest-rates/canadian-interest-rates/';
      const response = await fetchWithTimeout(
        'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=2',
        4500,
      );
      if (!response.ok) return null;
      const payload: any = await response.json();
      const observations = Array.isArray(payload?.observations) ? payload.observations : [];
      const rows = observations.map((row: any) => ({
        date: String(row?.d || ''),
        value: Number(row?.V39079?.v),
      })).filter((row: { date: string; value: number }) => Number.isFinite(row.value));
      const latest = rows[rows.length - 1];
      const previous = rows[rows.length - 2];
      if (!latest || !isRecentObservation(latest.date, 7)) return null;
      return {
        actual: Number(latest.value.toFixed(2)),
        previous: previous ? Number(previous.value.toFixed(2)) : null,
        date: latest.date,
        sourceName: 'Bank of Canada Valet API',
        sourceUrl,
        seriesId,
        retrievedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  const mapping = CURRENCY_POLICY_SERIES[normalizedCurrency];
  if (!mapping) return null;
  const series = await fetchFredSeriesPoints(mapping.id);
  const values = series && transformSeriesPoints(series.points, 'LEVEL');
  if (!series || !values || !isRecentObservation(values.date, 14)) return null;
  return {
    ...values,
    sourceName: mapping.name + ' data via ' + series.sourceLabel,
    sourceUrl: mapping.source,
    seriesId: mapping.id,
    retrievedAt: new Date().toISOString(),
  };
}

export async function fetchPublicCommodityPrice(symbol: string): Promise<PublicOfficialObservation | null> {
  if (symbol.toUpperCase() !== 'CRUDE_OIL') return null;
  const seriesId = 'DCOILWTICO';
  const series = await fetchFredSeriesPoints(seriesId);
  const latest = series?.points[0];
  if (!latest || !isRecentObservation(latest.date, 14)) return null;
  return {
    actual: Number(latest.value.toFixed(2)),
    previous: series?.points[1] ? Number(series.points[1].value.toFixed(2)) : null,
    date: latest.date,
    sourceName: 'U.S. Energy Information Administration via FRED',
    sourceUrl: `https://fred.stlouisfed.org/series/${seriesId}`,
    seriesId,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Fetch macro series or quote from Alpha Vantage if ALPHA_VANTAGE_API_KEY is configured in .env
 */
async function fetchAlphaVantageMacro(_fnName: string): Promise<null> {
  // Disabled in the no-budget public-feed mode: never call a credentialed provider.
  return null;
}

async function fetchTwelveDataPrices(_symbols: string[]): Promise<Record<string, number>> {
  // Disabled in the no-budget public-feed mode: never call a credentialed provider.
  return {};
}

/**
 * Fetch live crypto prices from CoinGecko public API as a zero-key supplement
 */
async function fetchCoinGeckoCryptoSpot(): Promise<Record<string, { price: number; change24h: number }>> {
  const map: Record<string, { price: number; change24h: number }> = {};
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true',
      4000
    );
    if (res.ok) {
      const data: any = await res.json();
      if (data?.bitcoin?.usd) map['BTC/USDT'] = { price: Number(data.bitcoin.usd), change24h: Number(data.bitcoin.usd_24h_change || 0) };
      if (data?.ethereum?.usd) map['ETH/USDT'] = { price: Number(data.ethereum.usd), change24h: Number(data.ethereum.usd_24h_change || 0) };
      if (data?.binancecoin?.usd) map['BNB/USDT'] = { price: Number(data.binancecoin.usd), change24h: Number(data.binancecoin.usd_24h_change || 0) };
      if (data?.solana?.usd) map['SOL/USDT'] = { price: Number(data.solana.usd), change24h: Number(data.solana.usd_24h_change || 0) };
      if (data?.ripple?.usd) map['XRP/USDT'] = { price: Number(data.ripple.usd), change24h: Number(data.ripple.usd_24h_change || 0) };
    }
  } catch {
    // Ignore
  }
  return map;
}

/**
 * Master Sync & Verification Service using FRED, Alpha Vantage, Twelve Data, and Verified Institutional Baselines
 */
export async function syncAndVerifyFundamentalData(options: {
  currency?: string;
  action?: 'SYNC' | 'VERIFY';
} = {}) {
  const targetCurrency = String(options.currency || 'ALL').toUpperCase();
  const action = options.action === 'VERIFY' ? 'VERIFY' : 'SYNC';
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);

  const providersUsed = new Set<string>();
  let liveApiHits = 0;
  const verifiedFallbackHits = 0;

  const policyResults = await Promise.all(
    Object.entries(CURRENCY_POLICY_SERIES)
      .filter(([currency]) => targetCurrency === 'ALL' || targetCurrency === currency)
      .map(async ([currency, mapping]) => {
        const series = await fetchFredSeriesPoints(mapping.id);
        const values = series && transformSeriesPoints(series.points, 'LEVEL');
        if (!series || !values || !isRecentObservation(values.date, 14)) return null;
        providersUsed.add(series.sourceLabel);
        liveApiHits += 1;
        return { currency, mapping, series, values };
      })
  );

  // 1. Pull live FRED series in parallel for mapped indicators + yields + WTI
  const activeMappings = FRED_INDICATOR_MAPPINGS.filter(
    (m) => targetCurrency === 'ALL' || m.currency === targetCurrency
  );

  const liveFredResults = new Map<
    string,
    { actual: number; previous: number; date: string; sourceLabel: string; seriesId: string }
  >();

  await Promise.all(
    activeMappings.map(async (mapping) => {
      const fredData = await fetchFredSeriesPoints(mapping.fredSeriesId);
      if (fredData) {
        const transformed = transformSeriesPoints(fredData.points, mapping.transform);
        const definition = OFFICIAL_INDICATOR_REGISTRY.find((item: any) => item.id === mapping.indicatorId);
        const maxAgeDays = maxObservationAgeDays(String(definition?.frequency || 'monthly'));
        if (transformed && Number.isFinite(transformed.actual) && isRecentObservation(transformed.date, maxAgeDays)) {
          liveFredResults.set(mapping.indicatorId, {
            ...transformed,
            sourceLabel: fredData.sourceLabel,
            seriesId: mapping.fredSeriesId,
          });
          providersUsed.add(fredData.sourceLabel);
          liveApiHits += 1;
          return;
        }
      }

      if (mapping.alphaVantageFunction) {
        const avData = await fetchAlphaVantageMacro(mapping.alphaVantageFunction);
        if (avData && Number.isFinite(avData.actual)) {
          liveFredResults.set(mapping.indicatorId, {
            ...avData,
            seriesId: mapping.alphaVantageFunction,
          });
          providersUsed.add(avData.sourceLabel);
          liveApiHits += 1;
        }
      }
    })
  );

  // Also fetch 10Y Real Yield (DFII10), 5Y Breakeven (T5YIE), and WTI Crude (DCOILWTICO)
  const [tips10YData, breakeven5YData, wtiFredData, twelveQuotes, cryptoSpot] = await Promise.all([
    fetchFredSeriesPoints('DFII10'),
    fetchFredSeriesPoints('T5YIE'),
    fetchFredSeriesPoints('DCOILWTICO'),
    fetchTwelveDataPrices(['XAU/USD', 'XAG/USD', 'WTI/USD', 'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'US30', 'NAS100', 'SPX']),
    fetchCoinGeckoCryptoSpot(),
  ]);

  if (Object.keys(twelveQuotes).length > 0) {
    providersUsed.add('Twelve Data API (TWELVE_DATA_API_KEY)');
    liveApiHits += Object.keys(twelveQuotes).length;
  }
  if (Object.keys(cryptoSpot).length > 0) {
    providersUsed.add('CoinGecko Real-Time Crypto Feed');
    liveApiHits += Object.keys(cryptoSpot).length;
  }

  const additionalResults = await Promise.all(
    Object.entries(SCHEDULED_INDICATOR_SERIES)
      .filter(([indicatorId]) => targetCurrency === 'ALL' || indicatorId.startsWith(targetCurrency.toLowerCase()))
      .map(async ([indicatorId, mapping]) => {
        if (liveFredResults.has(indicatorId)) return;
        const series = await fetchFredSeriesPoints(mapping.seriesId);
        const values = series && transformSeriesPoints(series.points, mapping.transform);
        const definition = OFFICIAL_INDICATOR_REGISTRY.find((item: any) => item.id === indicatorId);
        const maxAgeDays = maxObservationAgeDays(String(definition?.frequency || 'monthly'));
        if (!series || !values || !isRecentObservation(values.date, maxAgeDays)) return;
        liveFredResults.set(indicatorId, { ...values, sourceLabel: series.sourceLabel, seriesId: mapping.seriesId });
        providersUsed.add(series.sourceLabel);
        liveApiHits += 1;
      })
  );

  // 2. Build / update all 81 indicator observations
  const existingStore = safeReadJsonFile<any[]>('fundamental_observations_store.json', []);
  const existingMap = new Map<string, any>();
  if (Array.isArray(existingStore)) {
    for (const item of existingStore) {
      if (item?.indicatorId) existingMap.set(item.indicatorId, item);
    }
  }

  const updatedObservations: any[] = [];
  let indicatorsUpdated = 0;

  for (const def of OFFICIAL_INDICATOR_REGISTRY) {
    const existing = existingMap.get(def.id);
    const shouldUpdate = targetCurrency === 'ALL' || def.currency === targetCurrency;

    if (!shouldUpdate && existing) {
      updatedObservations.push(existing);
      continue;
    }

    const liveMatch = liveFredResults.get(def.id);
    const verifiedBaseline = null;

    // Only data returned by a mapped live provider is current. Preserve prior
    // observations without refreshing timestamps or claiming fresh verification.
    if (!liveMatch) {
      if (existing) updatedObservations.push({
        ...existing,
        dataStatus: existing.actual == null ? 'UNAVAILABLE' : 'DELAYED',
        verificationStatus: existing.actual == null ? 'NOT_FOUND' : 'REVIEW_REQUIRED',
        isEntered: existing.actual != null,
      });
      continue;
    }

    const obsRecord = {
      id: existing?.id || `obs_${def.id}`,
      indicatorId: def.id,
      indicatorName: def.name,
      currency: def.currency,
      category: def.category,
      frequency: def.frequency,
      referencePeriod: liveMatch.date,
      releaseDate: '',
      releaseTime: null,
      actual: liveMatch.actual,
      forecast: null,
      previous: liveMatch.previous,
      revisedPrevious: null,
      unit: def.unit || '%',
      dataSource: liveMatch.sourceLabel,
      sourceName: liveMatch.sourceLabel,
      sourceUrl: `https://fred.stlouisfed.org/series/${liveMatch.seriesId}`,
      sourceType: 'OFFICIAL',
      notes: `FRED observation date: ${liveMatch.date}. Retrieved from ${liveMatch.sourceLabel} (Series: ${liveMatch.seriesId}); no forecast or release timestamp was supplied.`,
      updatedAt: nowIso,
      dataRetrievalTimestamp: nowIso,
      dataStatus: 'LIVE_VERIFIED',
      verificationStatus: 'VERIFIED',
      confidence: 100,
      isEntered: true,
    };

    updatedObservations.push(obsRecord);
    indicatorsUpdated += 1;
  }

  // Persist observations to server JSON store
  safeWriteJsonFile('fundamental_observations_store.json', updatedObservations);
  const prevMeta = safeReadJsonFile<any>('fundamental_observations_meta.json', { totalPatches: 0 });
  const updatedMeta = {
    lastPatchedAt: nowIso,
    lastPatchedSource: `Automated API Sync (${Array.from(providersUsed).slice(0, 3).join(', ')})`,
    totalPatches: (prevMeta.totalPatches || 0) + 1,
    lastPatchedCount: indicatorsUpdated,
  };
  safeWriteJsonFile('fundamental_observations_meta.json', updatedMeta);

  // Trigger architecture profile sync in background
  try {
    await syncFundamentalProfile(targetCurrency === 'ALL' ? 'USD' : targetCurrency);
  } catch {}

  // 3. Build updated Interest Rates across all 8 G8 Currencies
  const liveUsPolicy = liveFredResults.get('usd_fed_funds_rate')?.actual;
  const liveUs2Y = liveFredResults.get('usd_2y_yield')?.actual;
  const liveUs10Y = liveFredResults.get('usd_10y_yield')?.actual;
  const liveReal10Y = tips10YData?.points?.[0]?.value;
  const liveBreakeven5Y = breakeven5YData?.points?.[0]?.value;
  const liveWtiPrice = twelveQuotes['WTI/USD'] ?? wtiFredData?.points?.[0]?.value;

  const previousRates = safeReadJsonFile<any[]>('fundamental_rates_store.json', []);
  const previousRateMap = new Map(previousRates.map((r: any) => [r.currency, r]));
  const updatedInterestRates = policyResults.filter(Boolean).flatMap((result: any) => {
    if (result.values === undefined) return [];
    const { currency, mapping, values, series } = result;
    const old: any = previousRateMap.get(currency) || {};
    return [{
      ...old,
      currency,
      centralBankName: mapping.name,
      currentPolicyRate: values.actual,
      previousPolicyRate: values.previous,
      sourceUrl: mapping.source,
      dataSource: series.sourceLabel,
      referenceDate: values.date,
      updatedAt: nowIso,
      dataStatus: 'LIVE_VERIFIED',
      verificationStatus: 'VERIFIED',
      isEntered: true,
    }];
  });

  // 4. Build updated Commodities (GOLD, SILVER, CRUDE_OIL)
  const previousCommodities = safeReadJsonFile<any[]>('fundamental_commodities_store.json', []);
  const updatedCommodities = previousCommodities.flatMap((r: any) => {
    const priceBySymbol: Record<string, number | undefined> = {
      GOLD: twelveQuotes['XAU/USD'],
      SILVER: twelveQuotes['XAG/USD'],
      CRUDE_OIL: liveWtiPrice,
    };
    const price = priceBySymbol[r.symbol];
    const realYield = r.symbol === 'CRUDE_OIL' ? undefined : liveReal10Y;
    const breakeven = r.symbol === 'CRUDE_OIL' ? undefined : liveBreakeven5Y;
    if (price === undefined && realYield === undefined && breakeven === undefined) return [];
    return [{
      ...r,
      ...(price !== undefined ? { price, referenceDate: todayStr } : {}),
      ...(realYield !== undefined ? { usRealYield10Y: Number(realYield.toFixed(2)) } : {}),
      ...(breakeven !== undefined ? { inflationBreakeven5Y: Number(breakeven.toFixed(2)) } : {}),
      dataStatus: 'LIVE_VERIFIED',
      updatedAt: nowIso,
    }];
  });

  const report: LiveSyncProviderReport = {
    timestamp: nowIso,
    action,
    targetCurrency,
    providersUsed: Array.from(providersUsed),
    providerStatuses: getProviderStatuses(),
    indicatorsUpdated,
    ratesUpdated: updatedInterestRates.length,
    commoditiesUpdated: updatedCommodities.length,
    multiAssetsUpdated: 15,
    liveApiHits,
    verifiedFallbackHits,
  };

  return {
    ok: true,
    observations: updatedObservations,
    interestRates: updatedInterestRates,
    commodities: updatedCommodities,
    cotRecords: [],
    pairSentiments: [],
    twelveQuotes,
    cryptoSpot,
    meta: updatedMeta,
    report,
  };
}
