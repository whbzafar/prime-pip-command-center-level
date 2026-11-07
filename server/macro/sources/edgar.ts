/**
 * U.S. SEC EDGAR XBRL "companyfacts" — official numbers straight from 10-Q / 10-K filings.
 * Free, no key. SEC asks every client to send a descriptive User-Agent with a contact
 * address: set SEC_USER_AGENT="YourApp your-email@domain.com" in .env.
 */
import { fetchJson, mapLimit, markFailure, markNotConfigured, markSuccess, registerSource } from './http.js';

export const EDGAR_ID = 'sec_edgar';
registerSource(EDGAR_ID, 'SEC EDGAR company filings (XBRL)', 'https://www.sec.gov/edgar/search/',
  'Quarterly revenue, EPS, margins, cash flow and leverage from official 10-Q/10-K filings.');

export const STOCKS: Array<{ ticker: string; name: string; cik: number; sector: string }> = [
  { ticker: 'AAPL', name: 'Apple', cik: 320193, sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft', cik: 789019, sector: 'Technology' },
  { ticker: 'NVDA', name: 'NVIDIA', cik: 1045810, sector: 'Semiconductors' },
  { ticker: 'AMZN', name: 'Amazon', cik: 1018724, sector: 'Consumer / Cloud' },
  { ticker: 'GOOGL', name: 'Alphabet', cik: 1652044, sector: 'Communication' },
  { ticker: 'META', name: 'Meta Platforms', cik: 1326801, sector: 'Communication' },
  { ticker: 'TSLA', name: 'Tesla', cik: 1318605, sector: 'Autos / Energy' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', cik: 2488, sector: 'Semiconductors' },
  { ticker: 'NFLX', name: 'Netflix', cik: 1065280, sector: 'Communication' },
  { ticker: 'JPM', name: 'JPMorgan Chase', cik: 19617, sector: 'Financials' },
  { ticker: 'V', name: 'Visa', cik: 1403161, sector: 'Financials' },
  { ticker: 'XOM', name: 'Exxon Mobil', cik: 34088, sector: 'Energy' },
  { ticker: 'WMT', name: 'Walmart', cik: 104169, sector: 'Consumer Staples' },
  { ticker: 'LLY', name: 'Eli Lilly', cik: 59478, sector: 'Healthcare' },
];

export interface FactPoint { frame: string; end: string; val: number; filed: string; form: string }

export interface StockFundamentals {
  ticker: string;
  revenue: { concept: string; latest: FactPoint; yearAgo: FactPoint | null } | null;
  eps: { latest: FactPoint; yearAgo: FactPoint | null } | null;
  opIncome: { latest: FactPoint; yearAgo: FactPoint | null } | null;
  netIncome: { latest: FactPoint; yearAgo: FactPoint | null } | null;
  ocfAnnual: FactPoint | null;
  capexAnnual: FactPoint | null;
  revenueAnnual: FactPoint | null;
  longTermDebt: FactPoint | null;
  equity: FactPoint | null;
  fetchedAt: string;
}

const data = new Map<string, StockFundamentals>();
let lastLoad = 0;
const TTL = 12 * 60 * 60 * 1000;

const REVENUE_CONCEPTS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'SalesRevenueNet',
  'RevenuesNetOfInterestExpense',
];

function units(facts: any, concept: string, unit = 'USD'): any[] {
  return facts?.facts?.['us-gaap']?.[concept]?.units?.[unit] || [];
}

const QFRAME = /^CY(\d{4})Q([1-4])$/;
const AFRAME = /^CY(\d{4})$/;
const IFRAME = /^CY(\d{4})Q([1-4])I$/;

function toPoint(u: any): FactPoint {
  return { frame: u.frame, end: u.end, val: Number(u.val), filed: u.filed, form: u.form };
}

/** Latest single-quarter value and the same quarter one year earlier. */
export function quarterPair(rows: any[]): { latest: FactPoint; yearAgo: FactPoint | null } | null {
  const q = rows.filter((u) => QFRAME.test(u.frame || '') && Number.isFinite(Number(u.val)));
  if (!q.length) return null;
  q.sort((a, b) => String(a.frame).localeCompare(String(b.frame)));
  const latest = q[q.length - 1];
  const [, y, n] = String(latest.frame).match(QFRAME)!;
  const prevFrame = `CY${Number(y) - 1}Q${n}`;
  const yearAgo = q.find((u) => u.frame === prevFrame) || null;
  return { latest: toPoint(latest), yearAgo: yearAgo ? toPoint(yearAgo) : null };
}

function latestFrame(rows: any[], re: RegExp): FactPoint | null {
  const f = rows.filter((u) => re.test(u.frame || '') && Number.isFinite(Number(u.val)));
  if (!f.length) return null;
  f.sort((a, b) => String(a.frame).localeCompare(String(b.frame)));
  return toPoint(f[f.length - 1]);
}

export function extractFundamentals(ticker: string, facts: any): StockFundamentals {
  let revenue: StockFundamentals['revenue'] = null;
  for (const c of REVENUE_CONCEPTS) {
    const p = quarterPair(units(facts, c));
    if (p && (!revenue || p.latest.frame > revenue.latest.frame)) revenue = { concept: c, ...p };
  }
  const epsRows = units(facts, 'EarningsPerShareDiluted', 'USD/shares');
  let revenueAnnual: FactPoint | null = null;
  if (revenue) revenueAnnual = latestFrame(units(facts, revenue.concept), AFRAME);
  return {
    ticker,
    revenue,
    eps: quarterPair(epsRows),
    opIncome: quarterPair(units(facts, 'OperatingIncomeLoss')),
    netIncome: quarterPair(units(facts, 'NetIncomeLoss')),
    ocfAnnual: latestFrame(units(facts, 'NetCashProvidedByUsedInOperatingActivities'), AFRAME),
    capexAnnual: latestFrame(units(facts, 'PaymentsToAcquirePropertyPlantAndEquipment'), AFRAME),
    revenueAnnual,
    longTermDebt: latestFrame(units(facts, 'LongTermDebtNoncurrent'), IFRAME) || latestFrame(units(facts, 'LongTermDebt'), IFRAME),
    equity: latestFrame(units(facts, 'StockholdersEquity'), IFRAME),
    fetchedAt: new Date().toISOString(),
  };
}

export async function refreshEdgar(force = false): Promise<void> {
  if (!force && data.size && Date.now() - lastLoad < TTL) return;
  const ua = process.env.SEC_USER_AGENT;
  if (!ua) markNotConfigured(EDGAR_ID, 'Optional: set SEC_USER_AGENT="AppName contact@email" (SEC fair-access policy). Using a generic agent until then.');
  const headers = { 'User-Agent': ua || 'PrimePipFX-CommandCenter/1.0 fundamentals-module', Accept: 'application/json' };
  let ok = 0;
  let lastErr: unknown = null;
  await mapLimit(STOCKS, 2, async (s) => {
    try {
      const cik = String(s.cik).padStart(10, '0');
      const facts = await fetchJson<any>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers, timeoutMs: 25_000 });
      data.set(s.ticker, extractFundamentals(s.ticker, facts));
      ok++;
    } catch (err) { lastErr = err; }
    await new Promise((r) => setTimeout(r, 150)); // SEC limit is 10 req/s; stay far below
  });
  if (ok) { lastLoad = Date.now(); markSuccess(EDGAR_ID, ok); }
  else markFailure(EDGAR_ID, lastErr || new Error('No filings loaded'));
}

const inflight = new Map<string, Promise<void>>();
const perTickerAt = new Map<string, number>();

/** Load a single company's filings (used on serverless to stay within memory/time limits). */
export function loadEdgarTicker(ticker: string): Promise<void> {
  const s = STOCKS.find((x) => x.ticker === ticker);
  if (!s) return Promise.resolve();
  if (data.has(ticker) && Date.now() - (perTickerAt.get(ticker) || 0) < TTL) return Promise.resolve();
  if (inflight.has(ticker)) return inflight.get(ticker)!;
  const ua = process.env.SEC_USER_AGENT;
  if (!ua && data.size === 0) markNotConfigured(EDGAR_ID, 'Optional: set SEC_USER_AGENT="AppName contact@email" (SEC fair-access policy). Using a generic agent until then.');
  const headers = { 'User-Agent': ua || 'PrimePipFX-CommandCenter/1.0 fundamentals-module', Accept: 'application/json' };
  const p = (async () => {
    try {
      const cik = String(s.cik).padStart(10, '0');
      const facts = await fetchJson<any>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers, timeoutMs: 15_000, retries: 1 });
      data.set(ticker, extractFundamentals(ticker, facts));
      perTickerAt.set(ticker, Date.now());
      markSuccess(EDGAR_ID, data.size);
    } catch (err) {
      markFailure(EDGAR_ID, err);
    } finally {
      inflight.delete(ticker);
    }
  })();
  inflight.set(ticker, p);
  return p;
}

/** Next tickers without data (for gradual background loading). */
export function missingTickers(n: number): string[] {
  return STOCKS.filter((s) => !data.has(s.ticker) && !inflight.has(s.ticker)).slice(0, n).map((s) => s.ticker);
}

export const getStockFundamentals = (ticker: string) => data.get(ticker) || null;
export function __setEdgarForTest(f: StockFundamentals) { data.set(f.ticker, f); }
