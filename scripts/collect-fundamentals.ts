/**
 * Collects company fundamentals for the whole stock universe and writes one JSON snapshot.
 *
 *   npx tsx scripts/collect-fundamentals.ts out/fundamentals.json
 *
 * Sources (free, no keys):
 *  - Yahoo Finance quoteSummary (financialData, defaultKeyStatistics, summaryDetail) — where Yahoo has it
 *  - Yahoo Finance fundamentals-timeseries (reported quarterly/annual statements) — covers PSX too
 *  - SEC EDGAR companyfacts for the 14 core US names (official 10-Q/10-K numbers)
 * A symbol Yahoo returns nothing for is written to `unavailable` — never scored, never guessed.
 */
import fs from 'fs';
import { UNIVERSE } from '../server/macro/universe.js';
import { STOCKS, extractFundamentals } from '../server/macro/sources/edgar.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const out = process.argv[2] || 'fundamentals.json';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, headers: Record<string, string> = {}, timeoutMs = 25_000): Promise<{ status: number; text: string; headers: Headers }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(timeoutMs) });
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      return { status: r.status, text: await r.text(), headers: r.headers };
    } catch { await sleep(800 * (attempt + 1)); }
  }
  return { status: 0, text: '', headers: new Headers() };
}

let cookie = '';
let crumb = '';
async function yahooSession(): Promise<void> {
  const fc = await get('https://fc.yahoo.com');
  cookie = ((fc.headers as any).getSetCookie?.() || []).map((c: string) => c.split(';')[0]).join('; ');
  const c = await get('https://query1.finance.yahoo.com/v1/test/getcrumb', { Cookie: cookie });
  crumb = c.status === 200 ? c.text.trim() : '';
  console.log('yahoo crumb', crumb ? 'ok' : 'MISSING');
}

const raw = (o: any) => (o && typeof o === 'object' && 'raw' in o ? (Number.isFinite(o.raw) ? o.raw : null) : typeof o === 'number' ? o : null);

const TS_TYPES = [
  'quarterlyTotalRevenue', 'quarterlyNetIncome', 'quarterlyDilutedEPS', 'quarterlyOperatingIncome',
  'annualTotalRevenue', 'annualNetIncome', 'annualOperatingIncome', 'annualOperatingCashFlow', 'annualCapitalExpenditure',
  'annualStockholdersEquity', 'annualTotalDebt', 'annualDilutedEPS',
  'trailingTotalRevenue', 'trailingNetIncome', 'trailingDilutedEPS',
];

type Series = Array<[string, number]>;

async function timeseries(y: string): Promise<Record<string, Series>> {
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(y)}?type=${TS_TYPES.join(',')}&period1=1451606400&period2=${Math.floor(Date.now() / 1000) + 86400 * 400}`;
  const r = await get(url);
  const res: Record<string, Series> = {};
  try {
    const j = JSON.parse(r.text);
    for (const row of j.timeseries?.result || []) {
      const k = row.meta?.type?.[0];
      if (!k || !row[k]) continue;
      const s: Series = row[k].map((p: any) => [p.asOfDate as string, raw(p.reportedValue)] as [string, number]).filter((p: [string, number]) => p[1] !== null && Number.isFinite(p[1]));
      if (s.length) res[k] = s.sort((a, b) => a[0].localeCompare(b[0]));
    }
  } catch { /* leave empty */ }
  return res;
}

async function summary(y: string): Promise<any | null> {
  if (!crumb) return null;
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(y)}?modules=financialData,defaultKeyStatistics,summaryDetail,price&crumb=${encodeURIComponent(crumb)}`;
  const r = await get(url, { Cookie: cookie });
  if (r.status !== 200) return null;
  try { return JSON.parse(r.text).quoteSummary?.result?.[0] || null; } catch { return null; }
}

async function chartPrice(y: string): Promise<{ price: number | null; currency: string | null; change1y: number | null }> {
  const r = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?range=1y&interval=1d`);
  try {
    const res = JSON.parse(r.text).chart?.result?.[0];
    const closes: number[] = (res?.indicators?.quote?.[0]?.close || []).filter((v: any) => Number.isFinite(v));
    const price = res?.meta?.regularMarketPrice ?? closes[closes.length - 1] ?? null;
    const first = closes[0];
    return { price, currency: res?.meta?.currency ?? null, change1y: price && first ? Math.round(((price / first - 1) * 100) * 10) / 10 : null };
  } catch { return { price: null, currency: null, change1y: null }; }
}

async function mapLimit<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]; await fn(x); } }));
}

async function main() {
  await yahooSession();
  const stocks: Record<string, any> = {};
  const unavailable: string[] = [];
  await mapLimit(UNIVERSE, 5, async (u) => {
    const [ts, sum, ch] = await Promise.all([timeseries(u.y), summary(u.y), chartPrice(u.y)]);
    const fd = sum?.financialData || {};
    const sd = sum?.summaryDetail || {};
    const ks = sum?.defaultKeyStatistics || {};
    const hasTs = Object.keys(ts).length > 0;
    const hasFd = raw(fd.revenueGrowth) !== null || raw(fd.profitMargins) !== null || raw(fd.returnOnEquity) !== null;
    if (!hasTs && !hasFd) { unavailable.push(u.s); console.log('UNAVAILABLE', u.s, u.y); return; }
    stocks[u.s] = {
      y: u.y, price: ch.price, currency: ch.currency ?? sum?.price?.currency ?? null, change1y: ch.change1y,
      mcap: raw(sum?.price?.marketCap) ?? raw(sd.marketCap),
      fd: {
        revenueGrowth: raw(fd.revenueGrowth), earningsGrowth: raw(fd.earningsGrowth), profitMargins: raw(fd.profitMargins),
        operatingMargins: raw(fd.operatingMargins), grossMargins: raw(fd.grossMargins), returnOnEquity: raw(fd.returnOnEquity),
        debtToEquity: raw(fd.debtToEquity), currentRatio: raw(fd.currentRatio), freeCashflow: raw(fd.freeCashflow), totalRevenue: raw(fd.totalRevenue),
        recommendationMean: raw(fd.recommendationMean), analysts: raw(fd.numberOfAnalystOpinions), targetMeanPrice: raw(fd.targetMeanPrice),
        currentPrice: raw(fd.currentPrice),
      },
      sd: { trailingPE: raw(sd.trailingPE), forwardPE: raw(sd.forwardPE), dividendYield: raw(sd.dividendYield), payoutRatio: raw(sd.payoutRatio), beta: raw(sd.beta) },
      ks: { pegRatio: raw(ks.pegRatio), priceToBook: raw(ks.priceToBook), forwardEps: raw(ks.forwardEps), trailingEps: raw(ks.trailingEps) },
      ts,
    };
    console.log('OK', u.s, hasTs ? `ts:${Object.keys(ts).length}` : '', hasFd ? 'fd' : '');
  });

  // SEC EDGAR — official filings for the 14 core US names
  const edgar: Record<string, any> = {};
  const secUa = process.env.SEC_USER_AGENT || 'PrimePipFX-CommandCenter/1.0 fundamentals-collector (contact: primepipfx13@gmail.com)';
  await mapLimit(STOCKS, 2, async (s) => {
    const r = await get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(s.cik).padStart(10, '0')}.json`, { 'User-Agent': secUa, Accept: 'application/json' }, 40_000);
    if (r.status === 200) {
      try { edgar[s.ticker] = extractFundamentals(s.ticker, JSON.parse(r.text)); console.log('EDGAR ok', s.ticker); } catch { console.log('EDGAR parse fail', s.ticker); }
    } else console.log('EDGAR fail', s.ticker, r.status);
    await sleep(200);
  });

  // Yahoo valuation/outlook for the 14 core names too (EDGAR has no valuation data)
  await mapLimit(STOCKS, 4, async (s) => {
    const [sum, ch] = await Promise.all([summary(s.ticker), chartPrice(s.ticker)]);
    if (!sum) return;
    const fd = sum.financialData || {}; const sd = sum.summaryDetail || {}; const ks = sum.defaultKeyStatistics || {};
    stocks[s.ticker] = {
      y: s.ticker, price: ch.price, currency: ch.currency, change1y: ch.change1y, mcap: raw(sum.price?.marketCap) ?? raw(sd.marketCap),
      fd: { recommendationMean: raw(fd.recommendationMean), analysts: raw(fd.numberOfAnalystOpinions), targetMeanPrice: raw(fd.targetMeanPrice), currentPrice: raw(fd.currentPrice),
        revenueGrowth: raw(fd.revenueGrowth), earningsGrowth: raw(fd.earningsGrowth), profitMargins: raw(fd.profitMargins), operatingMargins: raw(fd.operatingMargins),
        returnOnEquity: raw(fd.returnOnEquity), debtToEquity: raw(fd.debtToEquity), freeCashflow: raw(fd.freeCashflow), totalRevenue: raw(fd.totalRevenue) },
      sd: { trailingPE: raw(sd.trailingPE), forwardPE: raw(sd.forwardPE), dividendYield: raw(sd.dividendYield), payoutRatio: raw(sd.payoutRatio), beta: raw(sd.beta) },
      ks: { pegRatio: raw(ks.pegRatio), priceToBook: raw(ks.priceToBook), forwardEps: raw(ks.forwardEps), trailingEps: raw(ks.trailingEps) },
      ts: {},
    };
  });

  const snapshot = { generatedAt: new Date().toISOString(), version: 1, count: Object.keys(stocks).length, stocks, edgar, unavailable };
  fs.mkdirSync(out.includes('/') ? out.slice(0, out.lastIndexOf('/')) : '.', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(snapshot));
  console.log(`DONE ${snapshot.count} stocks, ${Object.keys(edgar).length} EDGAR, ${unavailable.length} unavailable → ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
  if (snapshot.count < 20) { console.error('Too few stocks collected; refusing to publish.'); process.exit(2); }
}

main().catch((e) => { console.error(e); process.exit(1); });
