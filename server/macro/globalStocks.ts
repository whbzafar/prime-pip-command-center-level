/**
 * GLOBAL STOCKS (Pakistan, Asia, Europe, US, other) and BASKET INDICES.
 *
 * Same method as the US filings model: growth, profitability, balance sheet, valuation/outlook and a
 * country macro backdrop where one exists. Every input is a number a company reported (or an analyst
 * consensus). Missing inputs are excluded — never estimated — and lower the confidence figure.
 */
import { squash, type AssetSpec, type CustomOut, type CustomSpec, type EngineContext, type PillarSpec } from './scoring.js';
import { BASKETS, COUNTRY_MACRO, UNIVERSE, type UniverseStock } from './universe.js';
import { STOCKS } from './sources/edgar.js';
import { getYahoo, snapshotMeta, type Series, type YahooRec } from './sources/snapshot.js';

const DAY = 86_400_000;
const r2 = (v: number) => Math.round(v * 100) / 100;
const T = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const ageOf = (d: string, now: number) => Math.max(0, (now - T(d)) / DAY);

const NO_BALANCE_SECTOR = /bank|insurance|financial/i;

function pct(a: number, b: number): number | null { return b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null; }

interface Yoy { latest: number; prior: number; latestDate: string; priorDate: string; kind: 'quarter' | 'year' }
/** Latest value vs the value ~one year earlier (quarterly series first, then annual). */
export function yoy(q?: Series, a?: Series): Yoy | null {
  for (const [ser, kind] of [[q, 'quarter'], [a, 'year']] as const) {
    if (!ser || ser.length < 2) continue;
    const [ld, lv] = ser[ser.length - 1];
    for (let i = ser.length - 2; i >= 0; i--) {
      const diff = (T(ld) - T(ser[i][0])) / DAY;
      if (diff >= 345 && diff <= 385) return { latest: lv, prior: ser[i][1], latestDate: ld, priorDate: ser[i][0], kind };
      if (diff > 385) break;
    }
  }
  return null;
}

const last = (s?: Series) => (s && s.length ? s[s.length - 1] : null);
const sameDate = (a: Series | undefined, d: string) => a?.find((p) => p[0] === d)?.[1] ?? null;

interface Out { value: number; detail: string; reasoning: string; actual: number; previous: number | null; unit: string; asOf: string; interval?: number }

function ind(sym: string, rec: () => YahooRec | null, id: string, name: string, desc: string, weight: number, note: string, fn: (r: YahooRec, snapDate: string) => Out | null): CustomSpec {
  return {
    kind: 'custom', id: `${sym}_${id}`, name, desc, freq: 'Quarterly', polarity: 1, weight, polarityNote: note,
    compute: (ctx: EngineContext): CustomOut | null => {
      const r = rec();
      if (!r) return null;
      const snapDate = snapshotMeta()?.generatedAt || new Date(ctx.now).toISOString();
      const o = fn(r, snapDate);
      if (!o) return null;
      // Statements older than ~18 months say little about the company today; exclude rather than score them.
      if (ageOf(o.asOf.slice(0, 10), ctx.now) > 548) return null;
      return {
        observation: { actual: o.actual, forecast: null, previous: o.previous, releasedAt: new Date(o.asOf).toISOString(), unit: o.unit, sourceTitle: `${sym} ${name}`,
          sourceName: 'Yahoo Finance (reported company statements)', sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(r.y)}/financials/` },
        components: [{ key: 'trend', label: name, value: o.value, weight: 1, detail: o.detail }],
        reasoning: o.reasoning, ageDays: ageOf(o.asOf.slice(0, 10), ctx.now), intervalDays: o.interval ?? 110,
      };
    },
  };
}

const money = (v: number, cur: string | null) => {
  const a = Math.abs(v);
  const s = a >= 1e12 ? `${(v / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : String(r2(v));
  return `${cur || ''} ${s}`.trim();
};

/** Growth indicator from reported statements, with Yahoo's own trailing growth figure as the fallback. */
function growthInd(sym: string, rec: () => YahooRec | null, o: { id: string; name: string; desc: string; weight: number; q: string; a: string; fdKey?: 'revenueGrowth' | 'earningsGrowth'; centre: number; scale: number; money?: boolean }): CustomSpec {
  return ind(sym, rec, o.id, o.name, o.desc, o.weight, 'Faster growth = bullish', (r, snap) => {
    const p = yoy(r.ts[o.q], r.ts[o.a]);
    if (p) {
      const g = pct(p.latest, p.prior);
      if (g === null) return null;
      // A swing from loss to profit is capped by the squash; a swing into loss is bearish.
      const cap = Math.max(-150, Math.min(150, g));
      return { value: squash((cap - o.centre) / o.scale), detail: `${g >= 0 ? '+' : ''}${r2(g)}% YoY (${p.latestDate})`,
        reasoning: `${o.name}: ${o.money ? money(p.latest, r.currency) : r2(p.latest)} (${p.latestDate}) vs ${o.money ? money(p.prior, r.currency) : r2(p.prior)} (${p.priorDate}) → ${g >= 0 ? '+' : ''}${r2(g)}% ${p.kind === 'year' ? 'annual' : 'quarterly'} YoY.`,
        actual: p.latest, previous: p.prior, unit: o.money ? (r.currency || '') : '', asOf: p.latestDate, interval: p.kind === 'year' ? 380 : 110 };
    }
    const fdv = o.fdKey ? r.fd[o.fdKey] : null;
    if (fdv !== null && fdv !== undefined) {
      const g = fdv * 100;
      return { value: squash((Math.max(-150, Math.min(150, g)) - o.centre) / o.scale), detail: `${g >= 0 ? '+' : ''}${r2(g)}% YoY (latest quarter)`,
        reasoning: `${o.name}: ${g >= 0 ? '+' : ''}${r2(g)}% year-over-year in the latest reported quarter.`, actual: r2(g), previous: null, unit: '%', asOf: snap, interval: 110 };
    }
    return null;
  });
}

function buildPillars(sym: string, sector: string, rec: () => YahooRec | null): PillarSpec[] {
  const growth: PillarSpec = { id: 'growth', name: 'Revenue & Earnings Growth', desc: 'Year-over-year growth in the latest reported period.', weight: 35, indicators: [
    growthInd(sym, rec, { id: 'rev', name: 'Revenue Growth (YoY)', desc: 'Latest revenue vs the same period a year earlier.', weight: 3, q: 'quarterlyTotalRevenue', a: 'annualTotalRevenue', fdKey: 'revenueGrowth', centre: 6, scale: 10, money: true }),
    growthInd(sym, rec, { id: 'ni', name: 'Net Income Growth (YoY)', desc: 'Profit after tax vs the same period a year earlier.', weight: 3, q: 'quarterlyNetIncome', a: 'annualNetIncome', fdKey: 'earningsGrowth', centre: 8, scale: 18, money: true }),
    growthInd(sym, rec, { id: 'op', name: 'Operating Income Growth (YoY)', desc: 'Core profit before interest and tax.', weight: 1.5, q: 'quarterlyOperatingIncome', a: 'annualOperatingIncome', centre: 8, scale: 18, money: true }),
  ] };

  const profitability: PillarSpec = { id: 'profitability', name: 'Profitability & Returns', desc: 'Margins, their direction and return on shareholders’ capital.', weight: 25, indicators: [
    ind(sym, rec, 'nm', 'Net Margin', 'Net income as a share of revenue (trailing twelve months where reported).', 2, 'Higher margin = higher quality = bullish', (r, snap) => {
      const tr = last(r.ts.trailingTotalRevenue), tn = last(r.ts.trailingNetIncome);
      let m: number | null = null, asOf = snap, label = 'trailing 12 months';
      if (tr && tn && tr[0] === tn[0] && tr[1] > 0) { m = (tn[1] / tr[1]) * 100; asOf = tr[0]; }
      else {
        const ar = last(r.ts.annualTotalRevenue), an = last(r.ts.annualNetIncome);
        if (ar && an && ar[0] === an[0] && ar[1] > 0) { m = (an[1] / ar[1]) * 100; asOf = ar[0]; label = 'latest fiscal year'; }
        else if (r.fd.profitMargins !== null && r.fd.profitMargins !== undefined) { m = r.fd.profitMargins * 100; label = 'trailing'; }
      }
      if (m === null) return null;
      return { value: squash((m - 8) / 10), detail: `${r2(m)}%`, reasoning: `Net margin ${r2(m)}% (${label}).`, actual: r2(m), previous: null, unit: '%', asOf, interval: 200 };
    }),
    ind(sym, rec, 'om', 'Operating Margin Trend', 'Change in operating margin vs a year ago (percentage points).', 2, 'Expanding margins = bullish', (r) => {
      const o = yoy(r.ts.quarterlyOperatingIncome, r.ts.annualOperatingIncome);
      if (!o) return null;
      const rv = o.kind === 'quarter' ? yoy(r.ts.quarterlyTotalRevenue, undefined) : yoy(undefined, r.ts.annualTotalRevenue);
      if (!rv || rv.latestDate !== o.latestDate || rv.priorDate !== o.priorDate || rv.latest <= 0 || rv.prior <= 0) return null;
      const now = (o.latest / rv.latest) * 100, then = (o.prior / rv.prior) * 100;
      return { value: squash((now - then) / 3), detail: `${r2(then)}% → ${r2(now)}%`, reasoning: `Operating margin ${r2(then)}% → ${r2(now)}% (${now - then >= 0 ? '+' : ''}${r2(now - then)}pp).`,
        actual: r2(now), previous: r2(then), unit: '%', asOf: o.latestDate, interval: o.kind === 'year' ? 380 : 110 };
    }),
    ind(sym, rec, 'roe', 'Return on Equity', 'Profit earned per unit of shareholders’ equity.', 2, 'Higher ROE = bullish', (r, snap) => {
      let roe: number | null = null, asOf = snap, basis = 'trailing';
      if (r.fd.returnOnEquity !== null && r.fd.returnOnEquity !== undefined) roe = r.fd.returnOnEquity * 100;
      else {
        const an = last(r.ts.annualNetIncome), eq = last(r.ts.annualStockholdersEquity);
        if (an && eq && an[0] === eq[0] && eq[1] > 0) { roe = (an[1] / eq[1]) * 100; asOf = an[0]; basis = 'latest fiscal year'; }
      }
      if (roe === null) return null;
      return { value: squash((roe - 12) / 10), detail: `${r2(roe)}%`, reasoning: `Return on equity ${r2(roe)}% (${basis}).`, actual: r2(roe), previous: null, unit: '%', asOf, interval: 200 };
    }),
  ] };

  const noBal = NO_BALANCE_SECTOR.test(sector);
  const balance: PillarSpec = { id: 'balance', name: 'Cash Flow & Balance Sheet', desc: 'Free cash flow and leverage (not applicable to banks and insurers).', weight: 20, indicators: [
    ind(sym, rec, 'fcf', 'Free Cash Flow Margin', 'Operating cash flow minus capex as % of revenue (latest fiscal year).', 2, 'Higher FCF margin = bullish', (r, snap) => {
      const ocf = last(r.ts.annualOperatingCashFlow), rev = last(r.ts.annualTotalRevenue);
      if (ocf && rev && ocf[0] === rev[0] && rev[1] > 0) {
        const cx = sameDate(r.ts.annualCapitalExpenditure, ocf[0]);
        const m = ((ocf[1] - (cx === null ? 0 : Math.abs(cx))) / rev[1]) * 100;
        return { value: squash((m - 8) / 10), detail: `${r2(m)}% (${ocf[0]})`, reasoning: `Free cash flow margin ${r2(m)}% in fiscal year ending ${ocf[0]}.`, actual: r2(m), previous: null, unit: '%', asOf: ocf[0], interval: 380 };
      }
      if (r.fd.freeCashflow !== null && r.fd.freeCashflow !== undefined && r.fd.totalRevenue) {
        const m = (r.fd.freeCashflow / r.fd.totalRevenue) * 100;
        return { value: squash((m - 8) / 10), detail: `${r2(m)}% (trailing)`, reasoning: `Free cash flow margin ${r2(m)}% (trailing twelve months).`, actual: r2(m), previous: null, unit: '%', asOf: snap, interval: 200 };
      }
      return null;
    }),
    ind(sym, rec, 'de', 'Debt to Equity', 'Total debt divided by shareholders’ equity.', 1.5, 'Lower leverage = bullish', (r, snap) => {
      let de: number | null = null, asOf = snap;
      const d = last(r.ts.annualTotalDebt), e = last(r.ts.annualStockholdersEquity);
      if (d && e && e[1] > 0) { de = d[1] / e[1]; asOf = e[0]; }
      else if (r.fd.debtToEquity !== null && r.fd.debtToEquity !== undefined) de = r.fd.debtToEquity / 100;
      if (de === null) return null;
      return { value: -squash((de - 0.8) / 0.8), detail: `${r2(de)}×`, reasoning: `Debt / equity = ${r2(de)}×.`, actual: r2(de), previous: null, unit: '×', asOf, interval: 380 };
    }),
  ] };

  const valuation: PillarSpec = { id: 'valuation', name: 'Valuation & Analyst Outlook', desc: 'What the market and analysts expect from here (where published).', weight: 20, indicators: [
    ind(sym, rec, 'rec', 'Analyst Consensus', 'Mean analyst rating (1 = strong buy … 5 = sell).', 2, 'Stronger buy consensus = bullish', (r, snap) => {
      const m = r.fd.recommendationMean, n = r.fd.analysts ?? 0;
      if (m === null || m === undefined || n < 3) return null;
      return { value: Math.max(-1, Math.min(1, (3 - m) / 1.5)), detail: `${r2(m)} / 5 (${n} analysts)`, reasoning: `Analyst consensus ${r2(m)} on a 1 (strong buy)–5 (sell) scale from ${n} analysts.`, actual: r2(m), previous: null, unit: '/5', asOf: snap, interval: 40 };
    }),
    ind(sym, rec, 'tgt', 'Upside to Analyst Target', 'Mean analyst price target vs the current price.', 2, 'More upside = bullish', (r, snap) => {
      const t = r.fd.targetMeanPrice, p = r.fd.currentPrice ?? r.price, n = r.fd.analysts ?? 0;
      if (!t || !p || n < 3) return null;
      const up = (t / p - 1) * 100;
      return { value: squash((up - 8) / 15), detail: `${up >= 0 ? '+' : ''}${r2(up)}%`, reasoning: `Mean analyst target ${r2(t)} vs price ${r2(p)} → ${up >= 0 ? '+' : ''}${r2(up)}% implied.`, actual: r2(up), previous: null, unit: '%', asOf: snap, interval: 40 };
    }),
    ind(sym, rec, 'fwd', 'Earnings Outlook (forward vs trailing P/E)', 'Implied next-year EPS growth from forward vs trailing P/E.', 1.5, 'Higher expected earnings growth = bullish', (r, snap) => {
      const tp = r.sd.trailingPE, fp = r.sd.forwardPE;
      if (!tp || !fp || tp <= 0 || fp <= 0) return null;
      const g = (tp / fp - 1) * 100;
      return { value: squash((Math.max(-80, Math.min(80, g)) - 8) / 15), detail: `P/E ${r2(tp)} → ${r2(fp)}`, reasoning: `Trailing P/E ${r2(tp)} vs forward ${r2(fp)} → analysts expect ${g >= 0 ? '+' : ''}${r2(g)}% EPS growth.`, actual: r2(fp), previous: r2(tp), unit: '× P/E', asOf: snap, interval: 40 };
    }),
    ind(sym, rec, 'peg', 'Growth-Adjusted Valuation (PEG)', 'P/E relative to expected earnings growth; ~1 is fair, higher is expensive.', 1, 'Lower PEG = cheaper for its growth = bullish', (r, snap) => {
      const p = r.ks.pegRatio;
      if (!p || p <= 0 || p > 20) return null;
      return { value: -squash((p - 1.5) / 1), detail: `PEG ${r2(p)}`, reasoning: `PEG ratio ${r2(p)} (≈1 fair; above 2 expensive for its growth).`, actual: r2(p), previous: null, unit: '×', asOf: snap, interval: 40 };
    }),
  ] };

  return noBal ? [growth, profitability, valuation] : [growth, profitability, balance, valuation];
}

function metaFor(u: UniverseStock | { s: string; name: string; region: string; c: string; sector: string }, rec: () => YahooRec | null) {
  return {
    get region() { return u.region; }, get country() { return u.c; }, get sector() { return u.sector; },
    get macroAsset() { return COUNTRY_MACRO[u.c]?.asset ?? null; },
    get price() { return rec()?.price ?? null; }, get currency() { return rec()?.currency ?? null; },
    get change1y() { return rec()?.change1y ?? null; }, get pe() { const v = rec()?.sd.trailingPE; return v ? r2(v) : null; },
    get fwdPe() { const v = rec()?.sd.forwardPE; return v ? r2(v) : null; },
    get divYield() { const v = rec()?.sd.dividendYield; return v ? r2(v * 100) : null; },
    get yahoo() { return rec()?.y ?? (u as any).y ?? null; },
  } as Record<string, string | number | null>;
}

function globalSpec(u: UniverseStock): AssetSpec {
  const rec = () => getYahoo(u.s);
  const pillars = buildPillars(u.s, u.sector, rec);
  const macro = COUNTRY_MACRO[u.c];
  if (macro) pillars.push({ id: 'macro', name: macro.label.split(' (')[0], desc: `The ${macro.asset} fundamental score (growth, policy, inflation, risk).`, weight: 15, indicators: [], mirror: { asset: macro.asset, sign: 1 } });
  return { symbol: u.s, name: u.name, assetClass: 'STOCKS', pillars, meta: metaFor(u, rec) };
}

export const GLOBAL_STOCK_SPECS: AssetSpec[] = UNIVERSE.map(globalSpec);

/** Valuation & analyst-outlook pillar for the 14 core US names (their other pillars come from SEC filings). */
export function valuationPillarFor(ticker: string, sector: string): PillarSpec {
  const v = buildPillars(ticker, sector, () => getYahoo(ticker)).find((p) => p.id === 'valuation')!;
  return { ...v, weight: 15 };
}
export const coreStockMeta = (t: { ticker: string; name: string; sector: string }) =>
  metaFor({ s: t.ticker, name: t.name, region: 'US', c: 'US', sector: t.sector }, () => getYahoo(t.ticker));

// ───────────────────────────────────────── basket indices

function members(b: (typeof BASKETS)[number]): string[] {
  const list = UNIVERSE.filter(b.pick).map((s) => s.s);
  if (b.withSecUs) list.push(...STOCKS.map((s) => s.ticker));
  return list;
}

function basketSpec(b: (typeof BASKETS)[number]): AssetSpec {
  const mem = members(b);
  const scored = (ctx: EngineContext) => mem.map((s) => ({ s, r: ctx.results.get(s) })).filter((x) => x.r && x.r.score !== null && x.r.confidence >= 40) as Array<{ s: string; r: NonNullable<ReturnType<EngineContext['results']['get']>> }>;
  const need = Math.max(2, Math.min(3, mem.length), Math.ceil(mem.length * 0.4));
  const mk = (id: string, name: string, desc: string, weight: number, note: string, fn: (rows: ReturnType<typeof scored>, ctx: EngineContext) => { value: number; detail: string; reasoning: string; actual: number } | null): CustomSpec => ({
    kind: 'custom', id: `${b.symbol}_${id}`, name, desc, freq: 'Quarterly', polarity: 1, weight, polarityNote: note,
    compute: (ctx) => {
      const rows = scored(ctx);
      if (rows.length < need) return null;
      const o = fn(rows, ctx);
      if (!o) return null;
      const asOf = snapshotMeta()?.generatedAt || new Date(ctx.now).toISOString();
      return { observation: { actual: o.actual, forecast: null, previous: null, releasedAt: asOf, unit: '', sourceTitle: `${b.symbol} ${name}`, sourceName: 'Constituent fundamentals (Yahoo Finance statements + SEC EDGAR)', sourceUrl: 'https://finance.yahoo.com/' },
        components: [{ key: 'trend', label: name, value: o.value, weight: 1, detail: o.detail }], reasoning: o.reasoning, ageDays: 0, intervalDays: 30 };
    },
  });
  const spec: PillarSpec = { id: 'constituents', name: 'Constituent Fundamentals', desc: 'Aggregated from the fundamental scores of the companies inside the basket.', weight: 100, indicators: [
    mk('avg', 'Average constituent score', 'Equal-weighted average fundamental score of constituents with enough data.', 3, 'Healthier constituents = bullish', (rows) => {
      const avg = rows.reduce((a, x) => a + (x.r.score as number), 0) / rows.length;
      const top = [...rows].sort((a, b2) => (b2.r.score as number) - (a.r.score as number));
      return { value: avg / 100, detail: `${avg >= 0 ? '+' : ''}${r2(avg)} avg of ${rows.length}/${mem.length}`, actual: r2(avg),
        reasoning: `Equal-weighted average of ${rows.length} of ${mem.length} constituents is ${avg >= 0 ? '+' : ''}${r2(avg)}. Strongest: ${top.slice(0, 3).map((x) => x.s).join(', ')}; weakest: ${top.slice(-3).reverse().map((x) => x.s).join(', ')}.` };
    }),
    mk('breadth', 'Breadth (bullish minus bearish share)', 'Share of constituents with a bullish score minus the share with a bearish score.', 2, 'More bullish companies than bearish = bullish', (rows) => {
      const bull = rows.filter((x) => (x.r.score as number) >= 10).length, bear = rows.filter((x) => (x.r.score as number) <= -10).length;
      const net = ((bull - bear) / rows.length) * 100;
      return { value: net / 100, detail: `${bull} bullish · ${bear} bearish · ${rows.length - bull - bear} neutral`, actual: r2(net),
        reasoning: `${bull} of ${rows.length} constituents are bullish and ${bear} bearish → net breadth ${net >= 0 ? '+' : ''}${r2(net)}%.` };
    }),
  ] };
  return { symbol: b.symbol, name: b.name, assetClass: 'INDICES', pillars: [spec], meta: { region: b.region, kind: 'basket', desc: b.desc, members: mem.length, sector: 'Basket index' } };
}

export const BASKET_SPECS: AssetSpec[] = BASKETS.map(basketSpec);
export const basketMembers = (symbol: string): string[] => { const b = BASKETS.find((x) => x.symbol === symbol); return b ? members(b) : []; };

/** Basket confidence = share of members with a score × their average confidence (not the 100% of a single pillar). */
export function applyBasketConfidence(results: Map<string, { confidence: number; score: number | null; summary: string; meta?: any }>): void {
  for (const b of BASKETS) {
    const r = results.get(b.symbol);
    if (!r) continue;
    const mem = members(b);
    const rows = mem.map((m) => results.get(m)).filter((x) => x && x.score !== null && x.confidence >= 40) as Array<{ confidence: number }>;
    const cov = mem.length ? rows.length / mem.length : 0;
    const avg = rows.length ? rows.reduce((a, x) => a + x.confidence, 0) / rows.length : 0;
    r.confidence = Math.round(cov * avg);
    if (r.meta) (r.meta as any).covered = rows.length;
  }
}
