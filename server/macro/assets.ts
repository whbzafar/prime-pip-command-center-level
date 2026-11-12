/**
 * ASSET CATALOG — what drives each instrument, and in which direction.
 *
 * Currencies use the framework used by macro desks: Monetary Policy, Inflation, Labour,
 * Growth, Confidence/External and Institutional Positioning (CFTC COT).
 * USD-priced assets (metals, energy, crypto) are scored on their OWN drivers plus a
 * "US Dollar (inverse)" pillar of equal weight, so XAU/USD = (Gold drivers − USD)/2 — the
 * same arithmetic as any currency pair.
 */
import { CENTRAL_BANK, CURRENCY_COUNTRY, GDP_ANCHOR, INFLATION_TARGET, EMPLOYMENT_SCALE } from './concepts.js';
import type { AssetSpec, CalSpec, CustomOut, CustomSpec, EngineContext, IndicatorSpec, PillarSpec } from './scoring.js';
import type { ScoreComponent } from './types.js';
import { squash, clamp, findLatest } from './scoring.js';
import { getCachedFred, latest, valueDaysAgo, zScore, type FredId } from './sources/fred.js';
import { getPrices, getPriceVia } from './sources/prices.js';
import { getCotSignal } from './sources/cot.js';
import { getDeriv, getFng, getHashrate, getStables } from './sources/crypto.js';
import { STOCKS, getStockFundamentals } from './sources/edgar.js';
import { coreStockMeta, valuationPillarFor } from './globalStocks.js';
import { sentimentStorage } from '../sentiment/storage.js';

const DAY = 86_400_000;
const r2 = (v: number) => Math.round(v * 100) / 100;

// ───────────────────────────────────────── builders

let seq = 0;
function cal(concept: string, country: string, polarity: 1 | -1, weight: number, polarityNote: string, extra: Partial<CalSpec> = {}): CalSpec {
  return { kind: 'cal', id: `${country}_${concept}_${++seq}`, concept, country, polarity, weight, polarityNote, ...extra };
}

function ageOf(dateIso: string, now: number) {
  return Math.max(0, (now - new Date(dateIso).getTime()) / DAY);
}

/** Market-series indicator from FRED: change over `days` (+ optional z-score level). */
function fredInd(o: {
  id: string; name: string; desc: string; series: FredId; days: number; changeScale: number;
  pct?: boolean; zWeight?: number; polarity: 1 | -1; weight: number; polarityNote: string; unit?: string; interval?: number;
}): CustomSpec {
  return {
    kind: 'custom', id: o.id, name: o.name, desc: o.desc, freq: o.interval && o.interval >= 7 ? 'Weekly' : 'Daily',
    polarity: o.polarity, weight: o.weight, polarityNote: o.polarityNote,
    compute: (ctx) => {
      const pts = getCachedFred(o.series);
      const last = latest(pts);
      const prev = valueDaysAgo(pts, o.days);
      if (!last || !prev) return null;
      const chg = o.pct ? ((last.value - prev.value) / prev.value) * 100 : last.value - prev.value;
      const comps: ScoreComponent[] = [{ key: 'trend', label: `${o.days}-day change`, value: squash(chg / o.changeScale), weight: 1,
        detail: `${r2(prev.value)} → ${r2(last.value)} (${chg >= 0 ? '+' : ''}${r2(chg)}${o.pct ? '%' : o.unit === '%' ? 'pp' : ''})` }];
      const z = o.zWeight ? zScore(pts) : null;
      if (o.zWeight && z !== null) comps.push({ key: 'level', label: '1-year z-score', value: squash(z / 1.2), weight: o.zWeight, detail: `z = ${r2(z)} vs trailing year` });
      return {
        observation: {
          actual: last.value, forecast: null, previous: prev.value, releasedAt: new Date(last.date).toISOString(),
          period: last.date, unit: o.unit, sourceTitle: `FRED ${o.series}`, sourceName: 'FRED — Federal Reserve Bank of St. Louis',
          sourceUrl: `https://fred.stlouisfed.org/series/${o.series}`, extra: { change: r2(chg), zScore: z === null ? null : r2(z) },
        },
        components: comps,
        reasoning: `${o.name} moved from ${r2(prev.value)} to ${r2(last.value)} over ~${o.days} days (${chg >= 0 ? '+' : ''}${r2(chg)}${o.pct ? '%' : ''})${z !== null && o.zWeight ? `; 1-year z-score ${r2(z)}` : ''}.`,
        ageDays: ageOf(last.date, ctx.now) - 1, intervalDays: o.interval ?? 4,
      } satisfies CustomOut;
    },
  };
}

/** Market-price indicator from the daily price feed (Yahoo → FRED fallback): % change over `days`. */
function priceInd(o: { id: string; name: string; desc: string; symbol: string; days: number; changeScale: number; polarity: 1 | -1; weight: number; polarityNote: string }): CustomSpec {
  return {
    kind: 'custom', id: o.id, name: o.name, desc: o.desc, freq: 'Daily', polarity: o.polarity, weight: o.weight, polarityNote: o.polarityNote,
    compute: (ctx) => {
      const pts = getPrices(o.symbol);
      const last = latest(pts);
      const prev = valueDaysAgo(pts, o.days);
      if (!last || !prev || !prev.value) return null;
      const chg = ((last.value - prev.value) / prev.value) * 100;
      return {
        observation: { actual: last.value, forecast: null, previous: prev.value, releasedAt: new Date(last.date).toISOString(), period: last.date,
          sourceTitle: o.name, sourceName: `Daily closes (${getPriceVia(o.symbol) || 'Yahoo Finance'})`, sourceUrl: 'https://finance.yahoo.com/', extra: { changePct: r2(chg) } },
        components: [{ key: 'trend', label: `${o.days}-day change`, value: squash(chg / o.changeScale), weight: 1, detail: `${r2(prev.value)} → ${r2(last.value)} (${chg >= 0 ? '+' : ''}${r2(chg)}%)` }],
        reasoning: `${o.name} moved ${chg >= 0 ? '+' : ''}${r2(chg)}% over ~${o.days} days (${r2(prev.value)} → ${r2(last.value)}).`,
        ageDays: ageOf(last.date, ctx.now) - 1, intervalDays: 4,
      } satisfies CustomOut;
    },
  };
}
const us10y = (pol: 1 | -1, w: number, note: string, id: string) => fredInd({ id, name: 'US 10-Year Treasury Yield', desc: 'The world’s benchmark long-term interest rate.',
  series: 'DGS10', days: 21, changeScale: 0.2, polarity: pol, weight: w, unit: '%', polarityNote: note });
const copperPx = (w: number, note: string, id: string) => priceInd({ id, name: 'Copper Price Trend', desc: 'COMEX copper — the bellwether of global industrial demand.', symbol: 'XCUUSD', days: 21, changeScale: 6, polarity: 1, weight: w, polarityNote: note });
const ironOrePx = (w: number, note: string, id: string) => priceInd({ id, name: 'Iron Ore Price Trend', desc: 'SGX 62% Fe iron ore futures — Australia’s largest export.', symbol: 'IRONORE', days: 21, changeScale: 7, polarity: 1, weight: w, polarityNote: note });

function cotInd(asset: string, weight: number, label: string): CustomSpec {
  return {
    kind: 'custom', id: `cot_${asset}`, name: `CFTC COT — ${label}`, freq: 'Weekly', weight, polarity: 1,
    desc: 'Large speculators’ (non-commercial) net futures position: where it sits in its 52-week range (COT Index) and this week’s change as % of open interest.',
    polarityNote: 'Speculators adding longs / near top of range = bullish (trend-following read; ≥90 or ≤10 flags crowding risk)',
    compute: (ctx) => {
      const s = getCotSignal(asset);
      if (!s) return null;
      const idxPart = s.cotIndex52w === null ? 0 : (s.cotIndex52w - 50) / 50;
      const chgPart = Math.tanh(s.netChange / (s.openInterest || 1) / 0.02);
      const crowd = s.cotIndex52w !== null && (s.cotIndex52w >= 90 || s.cotIndex52w <= 10);
      return {
        observation: {
          actual: s.net, forecast: null, previous: s.net - s.netChange, releasedAt: new Date(s.reportDate + 'T00:00:00Z').toISOString(),
          period: `Week of ${s.reportDate}`, unit: 'contracts', sourceTitle: s.market, sourceName: 'CFTC Commitments of Traders (Legacy)',
          sourceUrl: 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
          extra: { cotIndex52w: s.cotIndex52w, netChange: s.netChange, openInterest: s.openInterest },
        },
        components: [
          { key: 'positioning', label: 'COT Index (52w)', value: idxPart, weight: 0.6, detail: `COT Index ${s.cotIndex52w ?? '—'} / 100` },
          { key: 'momentum', label: 'Weekly net change', value: chgPart, weight: 0.4, detail: `${s.netChange >= 0 ? '+' : ''}${s.netChange.toLocaleString()} contracts (${r2((s.netChange / (s.openInterest || 1)) * 100)}% of OI)` },
        ],
        reasoning: `Net speculative position ${s.net.toLocaleString()} contracts (${s.netChange >= 0 ? '+' : ''}${s.netChange.toLocaleString()} w/w), COT Index ${s.cotIndex52w ?? '—'}.${crowd ? ' Positioning is at a 52-week extreme — crowded trades are prone to sharp reversals.' : ''}`,
        ageDays: ageOf(s.reportDate, ctx.now) - 3, intervalDays: 7,
      };
    },
  };
}

function vixInd(polarity: 1 | -1, weight: number, note: string, id = 'vix'): CustomSpec {
  return fredInd({ id: `${id}_${polarity}_${++seq}`, name: 'Risk Sentiment (VIX)', desc: 'CBOE Volatility Index — the market’s fear gauge. Spikes drive safe-haven flows.',
    series: 'VIXCLS', days: 21, changeScale: 4, zWeight: 1, polarity, weight, polarityNote: note });
}

function policyDiffInd(country: string, ccy: string, real: boolean): CustomSpec {
  return {
    kind: 'custom', id: `${real ? 'real' : 'nominal'}_diff_${country}`, freq: 'Per meeting', polarity: 1,
    weight: real ? 2.5 : 3,
    name: real ? 'Real Rate Differential' : 'Rate Differential vs G8',
    desc: real
      ? 'Policy rate minus headline CPI, compared with the G8 average. Capital flows to the highest real yield.'
      : 'This central bank’s policy rate minus the average of the other G8 central banks — the carry a currency offers.',
    polarityNote: 'Higher (real) rate than peers = bullish carry',
    compute: (ctx) => {
      const me = ctx.policy.get(country);
      if (!me || me.rate === null || (real && me.cpi === null)) return null;
      const peers = Array.from(ctx.policy.entries()).filter(([c, v]) => c !== country && v.rate !== null && (!real || v.cpi !== null));
      if (peers.length < 4) return null;
      const val = (v: { rate: number | null; cpi: number | null }) => (real ? (v.rate as number) - (v.cpi as number) : (v.rate as number));
      const mine = val(me);
      const avg = peers.reduce((s, [, v]) => s + val(v), 0) / peers.length;
      const diff = mine - avg;
      const when = (real ? [me.rateEvent, me.cpiEvent] : [me.rateEvent]).filter(Boolean).map((e) => e!.timestamp);
      return {
        observation: {
          actual: r2(mine), forecast: null, previous: null, releasedAt: new Date(Math.max(...when)).toISOString(),
          unit: '%', sourceTitle: real ? `${ccy} policy rate − CPI YoY` : `${ccy} policy rate`,
          sourceName: 'Derived from TradingView calendar prints', sourceUrl: 'https://www.tradingview.com/economic-calendar/',
          extra: { peerAverage: r2(avg), differential: r2(diff), peers: peers.length },
        },
        components: [{ key: 'differential', label: 'Spread vs peers', value: squash(diff / 1.5), weight: 1,
          detail: `${r2(mine)}% vs G8 avg ${r2(avg)}% (${diff >= 0 ? '+' : ''}${r2(diff)}pp)` }],
        reasoning: real
          ? `${ccy} real policy rate is ${r2(mine)}% (rate ${me.rate}% − CPI ${me.cpi}%) vs a peer average of ${r2(avg)}% → ${diff >= 0 ? '+' : ''}${r2(diff)}pp.`
          : `${CENTRAL_BANK[ccy]} rate ${me.rate}% vs peer average ${r2(avg)}% → ${diff >= 0 ? '+' : ''}${r2(diff)}pp carry.`,
        ageDays: 0, intervalDays: 60,
      };
    },
  };
}

// ───────────────────────────────────────── currencies

const HAWK = (ccy: string) => `Higher reading pushes the ${CENTRAL_BANK[ccy]} hawkish = bullish ${ccy}`;
const GROW = (ccy: string) => `Stronger growth supports higher rates = bullish ${ccy}`;
const JOBS_INV = (ccy: string) => `Higher reading = weaker labour market = bearish ${ccy}`;

function currencySpec(ccy: string): AssetSpec {
  const c = CURRENCY_COUNTRY[ccy];
  const tgt = INFLATION_TARGET[c];
  const gdp = GDP_ANCHOR[c];
  const inflLevel = { neutral: tgt, scale: 1.2, label: `${tgt}% ${CENTRAL_BANK[ccy]} target` };

  const monetary: IndicatorSpec[] = [
    cal('policy_rate', c, 1, 3, `A hike / hawkish surprise by the ${CENTRAL_BANK[ccy]} = bullish ${ccy}`, { name: `${CENTRAL_BANK[ccy]} Rate Decision` }),
    policyDiffInd(c, ccy, false),
    policyDiffInd(c, ccy, true),
  ];
  if (ccy === 'USD') {
    monetary.push(fredInd({ id: 'us2y', name: '2-Year Treasury Yield', desc: 'The market’s pricing of the Fed path over the next two years.',
      series: 'DGS2', days: 21, changeScale: 0.2, polarity: 1, weight: 2.5, unit: '%', polarityNote: 'Rising 2Y yield (fewer cuts priced) = bullish USD' }));
    monetary.push(us10y(1, 1.5, 'Rising US long-term yields attract foreign capital = bullish USD', 'usd_us10y'));
  }
  // The yen is the classic funding currency: USD/JPY tracks US yields more closely than any Japanese data release.
  if (ccy === 'JPY') monetary.push(us10y(-1, 2.5, 'Rising US yields widen the gap with Japan = bearish JPY; falling US yields = bullish JPY', 'jpy_us10y'));
  if (ccy === 'CHF') monetary.push(us10y(-1, 1, 'Rising US yields pull capital out of the low-yielding franc = bearish CHF', 'chf_us10y'));

  const inflation: IndicatorSpec[] = [
    cal('cpi_yoy', c, 1, 3, HAWK(ccy), { level: inflLevel }),
    cal('core_cpi_yoy', c, 1, 3, HAWK(ccy), { level: inflLevel }),
    cal('cpi_mom', c, 1, 1.5, HAWK(ccy)),
    cal('core_cpi_mom', c, 1, 1.5, HAWK(ccy)),
    cal('ppi', c, 1, 1, HAWK(ccy)),
    cal('wages', c, 1, 2, HAWK(ccy)),
  ];
  if (ccy === 'JPY') inflation.push(cal('tokyo_cpi', c, 1, 2, 'Tokyo CPI leads the national figure by three weeks — a hotter print pushes the BoJ toward hikes = bullish JPY', { level: inflLevel }));
  if (ccy === 'USD') {
    inflation.push(cal('pce_core_yoy', c, 1, 2.5, HAWK(ccy), { level: { neutral: 2, scale: 1, label: '2% Fed target' } }));
    inflation.push(cal('pce_core_mom', c, 1, 1.5, HAWK(ccy)));
    inflation.push(cal('infl_expect', c, 1, 1.5, 'Rising consumer inflation expectations keep the Fed hawkish = bullish USD'));
  }

  const labour: IndicatorSpec[] = [cal('unemployment', c, -1, 3, JOBS_INV(ccy))];
  if (ccy === 'JPY') labour.push(cal('job_ratio', c, 1, 2, 'More openings per applicant = tighter labour market = BoJ hikes = bullish JPY'));
  if (ccy === 'USD') {
    labour.push(cal('nfp', c, 1, 3, 'More jobs than expected = bullish USD'));
    labour.push(cal('claims', c, -1, 1.5, JOBS_INV(ccy)));
    labour.push(cal('jolts', c, 1, 1, 'More openings = tighter labour market = bullish USD'));
    labour.push(cal('adp', c, 1, 0.75, 'Stronger private hiring = bullish USD'));
  } else if (ccy === 'GBP') {
    labour.push(cal('claimant_count', c, -1, 2, JOBS_INV(ccy)));
    labour.push(cal('employment_change', c, 1, 2, `More jobs = bullish ${ccy}`, { scale: EMPLOYMENT_SCALE.GB }));
  } else if (['CAD', 'AUD', 'NZD', 'EUR'].includes(ccy)) {
    labour.push(cal('employment_change', c, 1, 3, `More jobs = bullish ${ccy}`, EMPLOYMENT_SCALE[c] ? { scale: EMPLOYMENT_SCALE[c] } : {}));
  }

  const growth: IndicatorSpec[] = [
    cal('gdp', c, 1, 3, GROW(ccy), { scale: gdp.surprise, level: { neutral: gdp.neutral, scale: gdp.scale, label: `trend growth ≈ ${gdp.neutral}%${c === 'US' ? ' annualized' : ' q/q'}` } }),
    cal('mfg_pmi', c, 1, 2, GROW(ccy)),
    cal('services_pmi', c, 1, 2.5, GROW(ccy)),
    cal('retail_sales', c, 1, 2, GROW(ccy)),
    cal('industrial_production', c, 1, 1, GROW(ccy)),
  ];
  if (ccy === 'GBP' || ccy === 'CAD') growth.push(cal('gdp_mom', c, 1, 1.5, GROW(ccy)));
  // Free business-survey read: stands in for the licensed S&P Global / HCOB PMIs so every currency has a live activity gauge.
  if (['EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CHF'].includes(ccy)) growth.push(cal('activity_survey', c, 1, 2, `Stronger business conditions = stronger growth = bullish ${ccy}`));
  if (ccy === 'USD') {
    growth.push(cal('regional_mfg', c, 1, 1.5, 'Strong Empire/Philly manufacturing surveys point to a firm ISM = bullish USD'));
    growth.push(cal('durable_goods', c, 1, 1, 'Rising durable-goods orders = capex and demand strength = bullish USD'));
  }
  if (ccy === 'USD') growth.push(cal('housing', c, 1, 0.5, GROW(ccy)));

  const external: IndicatorSpec[] = [
    cal('consumer_conf', c, 1, 2, `Confident households spend more = bullish ${ccy}`),
    cal('business_conf', ccy === 'EUR' ? 'DE' : c, 1, 2, `Stronger business sentiment = bullish ${ccy}`),
    cal('trade_balance', c, 1, 1, `Improving trade balance = structural demand for ${ccy}`),
  ];
  if (['USD', 'JPY', 'CHF'].includes(ccy)) external.push(vixInd(1, ccy === 'USD' ? 1 : 2.5, `Rising fear drives safe-haven demand = bullish ${ccy}`));
  if (['AUD', 'NZD', 'CAD'].includes(ccy)) external.push(vixInd(-1, 2, `Rising fear hurts risk-sensitive ${ccy}`));
  if (ccy === 'AUD' || ccy === 'NZD') external.push(cal('mfg_pmi', 'CN', 1, 2.5, `China is the largest export market — stronger Chinese factories = bullish ${ccy}`, { name: 'China Manufacturing PMI (terms of trade)' }));
  if (ccy === 'AUD') {
    external.push(ironOrePx(2.5, 'Iron ore is Australia’s largest export — rising prices = bullish AUD', 'aud_iron'));
    external.push(copperPx(1.5, 'Rising industrial-metal prices improve Australia’s terms of trade = bullish AUD', 'aud_copper'));
    external.push(cal('retail_sales', 'CN', 1, 1, 'Stronger Chinese demand = bullish AUD', { name: 'China Retail Sales' }));
  }
  if (ccy === 'NZD') external.push(cal('dairy_auction', 'NZ', 1, 2.5, 'Dairy is New Zealand’s largest export — rising auction prices = bullish NZD'));
  if (ccy === 'JPY') external.push(fredInd({ id: 'jpy_wti', name: 'Crude Oil (import bill)', desc: 'Japan imports almost all of its energy; dearer oil worsens its trade balance.',
    series: 'DCOILWTICO', days: 21, changeScale: 6, pct: true, polarity: -1, weight: 1.5, polarityNote: 'Rising oil = larger import bill = bearish JPY' }));
  if (ccy === 'EUR') {
    external.push(cal('industrial_production', 'DE', 1, 1, 'Germany is the euro area’s largest economy — stronger output = bullish EUR', { name: 'German Industrial Production' }));
    external.push(priceInd({ id: 'eur_gas', name: 'Natural Gas Price (energy import bill)', desc: 'Europe is a large net energy importer; gas-price spikes hit its trade balance and growth.', symbol: 'NATGAS', days: 21, changeScale: 12, polarity: -1, weight: 0.75, polarityNote: 'Rising gas prices = bearish EUR' }));
  }
  if (ccy === 'CAD') external.push(cal('mfg_pmi', 'US', 1, 1.5, 'About three-quarters of Canada’s exports go to the US — stronger US industry = bullish CAD', { name: 'US ISM Manufacturing PMI (main export market)' }));
  if (ccy === 'CAD') external.push(fredInd({ id: 'cad_wti', name: 'Crude Oil (terms of trade)', desc: 'Oil is Canada’s largest export; WTI strength improves Canada’s terms of trade.',
    series: 'DCOILWTICO', days: 21, changeScale: 6, pct: true, polarity: 1, weight: 2.5, polarityNote: 'Rising oil = bullish CAD' }));

  return {
    symbol: ccy,
    name: { USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', CHF: 'Swiss Franc', CAD: 'Canadian Dollar', AUD: 'Australian Dollar', NZD: 'New Zealand Dollar' }[ccy]!,
    assetClass: 'FOREX',
    meta: { centralBank: CENTRAL_BANK[ccy], country: c, inflationTarget: tgt },
    pillars: [
      { id: 'monetary', name: 'Monetary Policy', desc: 'Policy rate path, rate & real-rate differentials — the #1 driver of currency value.', weight: 30, indicators: monetary },
      { id: 'inflation', name: 'Inflation', desc: 'Price pressure determines how hawkish the central bank must be.', weight: 20, indicators: inflation },
      { id: 'labour', name: 'Labour Market', desc: 'Jobs and unemployment — the second half of most central-bank mandates.', weight: 18, indicators: labour },
      { id: 'growth', name: 'Economic Growth', desc: 'Output, activity surveys and consumer spending.', weight: 17, indicators: growth },
      { id: 'external', name: 'Confidence, Trade & Risk', desc: 'Sentiment surveys, trade flows, terms of trade and global risk appetite.', weight: 7, indicators: external },
      { id: 'positioning', name: 'Institutional Positioning', desc: 'CFTC COT: how hedge funds and large speculators are positioned.', weight: 8, indicators: [cotInd(ccy, 1, ccy === 'USD' ? 'US Dollar Index' : `${ccy} futures`)] },
    ],
  };
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

// ───────────────────────────────────────── shared macro blocks for USD-priced assets

const realYield = (pol: 1 | -1, w: number) => fredInd({ id: `ry_${pol}_${++seq}`, name: 'US 10Y Real Yield (TIPS)', desc: 'Inflation-adjusted Treasury yield — the opportunity cost of holding non-yielding assets.',
  series: 'DFII10', days: 21, changeScale: 0.15, zWeight: 0.6, polarity: pol, weight: w, unit: '%', polarityNote: pol < 0 ? 'Falling real yields = bullish' : 'Rising real yields = bullish' });
const fedPath = (pol: 1 | -1, w: number) => fredInd({ id: `fp_${pol}_${++seq}`, name: 'Fed Path (2Y Treasury)', desc: '2-year yield change — market pricing of Fed hikes/cuts.',
  series: 'DGS2', days: 21, changeScale: 0.2, polarity: pol, weight: w, unit: '%', polarityNote: pol < 0 ? 'Falling 2Y (more cuts priced) = bullish' : 'Rising 2Y = bullish' });
const breakevens = (w: number) => fredInd({ id: `be_${++seq}`, name: '10Y Breakeven Inflation', desc: 'Market-implied inflation expectations.',
  series: 'T10YIE', days: 21, changeScale: 0.1, polarity: 1, weight: w, unit: '%', polarityNote: 'Rising inflation expectations = bullish for hard assets' });
const hyOas = (pol: 1 | -1, w: number) => fredInd({ id: `hy_${pol}_${++seq}`, name: 'High-Yield Credit Spread', desc: 'Extra yield on junk bonds over Treasuries — widens in stress.',
  series: 'BAMLH0A0HYM2', days: 21, changeScale: 0.3, zWeight: 0.5, polarity: pol, weight: w, unit: '%', polarityNote: pol > 0 ? 'Widening spreads (stress) = bullish safe haven' : 'Widening spreads (stress) = bearish' });
const nfci = (pol: 1 | -1, w: number) => fredInd({ id: `nf_${pol}_${++seq}`, name: 'Financial Conditions (NFCI)', desc: 'Chicago Fed index — positive = tighter-than-average conditions.',
  series: 'NFCI', days: 28, changeScale: 0.1, polarity: pol, weight: w, interval: 7, polarityNote: pol > 0 ? 'Tightening conditions = bullish safe haven' : 'Tightening conditions = bearish' });
const fedBs = (w: number) => fredInd({ id: `bs_${++seq}`, name: 'Fed Balance Sheet (Liquidity)', desc: 'Total Fed assets — expansion adds liquidity to markets.',
  series: 'WALCL', days: 28, changeScale: 0.8, pct: true, polarity: 1, weight: w, interval: 7, polarityNote: 'Expanding balance sheet = more liquidity = bullish' });

const usdInverse = (weight: number): PillarSpec => ({
  id: 'usd', name: 'US Dollar Fundamentals (inverse)', desc: 'Priced in dollars: a fundamentally stronger USD is a headwind, a weaker USD a tailwind.',
  weight, indicators: [], mirror: { asset: 'USD', sign: -1 },
});

// ───────────────────────────────────────── commodities

function commodity(symbol: string, name: string, own: PillarSpec[]): AssetSpec {
  const ownW = own.reduce((s, p) => s + p.weight, 0);
  return { symbol, name, assetClass: 'COMMODITIES', pillars: [...own, usdInverse(ownW)], meta: { quote: 'USD' } };
}

const chinaPmi = (w: number) => cal('mfg_pmi', 'CN', 1, w, 'Stronger Chinese manufacturing = more metal demand = bullish', { name: 'China Manufacturing PMI' });
const usIsm = (w: number) => cal('mfg_pmi', 'US', 1, w, 'Stronger US industry = more demand = bullish', { name: 'US ISM Manufacturing PMI' });
const euPmi = (w: number) => cal('mfg_pmi', 'EU', 1, w, 'Stronger European industry = more demand = bullish', { name: 'Euro Area Manufacturing PMI' });

export const COMMODITY_SPECS: AssetSpec[] = [
  commodity('XAU', 'Gold', [
    { id: 'rates', name: 'Real Rates & Fed Path', desc: 'Gold pays no yield; falling real rates cut the cost of holding it. (Breakevens sit in the inflation pillar so inflation expectations are not counted twice.)', weight: 30,
      indicators: [realYield(-1, 4), fedPath(-1, 2)] },
    { id: 'dollar', name: 'Dollar Momentum', desc: 'Market-based trend of the broad trade-weighted dollar (FRED, daily) — gold is priced in dollars, so a falling dollar lifts it independent of the fundamental USD score.', weight: 12,
      indicators: [fredInd({ id: 'gold_broad_usd', name: 'Broad Dollar Index Trend', desc: 'Nominal Broad US Dollar Index (Fed, trade-weighted), 21-day change.',
        series: 'DTWEXBGS', days: 21, changeScale: 1.2, pct: true, zWeight: 0.5, polarity: -1, weight: 3, polarityNote: 'Falling dollar = bullish gold; rising dollar = bearish gold' })] },
    { id: 'risk', name: 'Safe-Haven Demand', desc: 'Stress in equity, credit and gold-volatility markets drives haven buying.', weight: 16,
      indicators: [vixInd(1, 2, 'Rising fear = safe-haven demand = bullish gold'), hyOas(1, 2), nfci(1, 1),
        fredInd({ id: 'gold_gvz', name: 'Gold Volatility (GVZ)', desc: 'CBOE Gold ETF Volatility Index — the market’s measure of uncertainty specifically in gold.',
          series: 'GVZCLS', days: 21, changeScale: 3, zWeight: 0.8, polarity: 1, weight: 1, polarityNote: 'Rising gold volatility = rising uncertainty and haven demand = mildly bullish gold' })] },
    { id: 'inflation', name: 'Inflation Hedge', desc: 'Sticky inflation and rising inflation expectations increase demand for real assets.', weight: 12,
      indicators: [cal('core_cpi_yoy', 'US', 1, 2, 'Hotter US core inflation = inflation-hedge demand = bullish gold', { level: { neutral: 2, scale: 1, label: '2% target' } }),
        breakevens(1.5),
        fredInd({ id: 'gold_5y5y', name: '5Y5Y Forward Inflation', desc: 'Long-run inflation expectations.', series: 'T5YIFR', days: 21, changeScale: 0.1, polarity: 1, weight: 0.75, unit: '%', polarityNote: 'Rising long-run expectations = bullish gold' }),
        cal('infl_expect', 'US', 1, 1, 'Rising consumer inflation expectations = bullish gold')] },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'Managed-money positioning in COMEX gold futures.', weight: 20, indicators: [cotInd('XAU', 1, 'Gold')] },
  ]),
  commodity('XAG', 'Silver', [
    { id: 'rates', name: 'Real Rates & Fed Path', desc: 'Monetary-metal component.', weight: 25, indicators: [realYield(-1, 3), fedPath(-1, 2)] },
    { id: 'industrial', name: 'Industrial Demand', desc: '~55% of silver demand is industrial (solar, electronics).', weight: 25, indicators: [usIsm(2), chinaPmi(2.5), euPmi(1.5)] },
    { id: 'risk', name: 'Safe-Haven Demand', desc: 'Haven flows (weaker than gold).', weight: 10, indicators: [vixInd(1, 1, 'Rising fear = mild haven demand')] },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'COMEX silver speculators.', weight: 20, indicators: [cotInd('XAG', 1, 'Silver')] },
  ]),
  commodity('XPT', 'Platinum', [
    { id: 'industrial', name: 'Industrial & Auto Demand', desc: 'Autocatalysts and industry dominate platinum demand.', weight: 40, indicators: [chinaPmi(2.5), euPmi(2), usIsm(1.5)] },
    { id: 'rates', name: 'Real Rates', desc: 'Precious-metal component.', weight: 15, indicators: [realYield(-1, 1)] },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'NYMEX platinum speculators.', weight: 25, indicators: [cotInd('XPT', 1, 'Platinum')] },
  ]),
  commodity('XCU', 'Copper', [
    { id: 'china', name: 'China Demand', desc: 'China consumes over half the world’s copper.', weight: 35,
      indicators: [chinaPmi(3), cal('industrial_production', 'CN', 1, 2, 'Stronger Chinese output = bullish copper', { name: 'China Industrial Production' }),
        cal('retail_sales', 'CN', 1, 1, 'Stronger Chinese consumption = bullish copper', { name: 'China Retail Sales' })] },
    { id: 'global', name: 'Global Manufacturing', desc: 'Copper is the bellwether of global industry.', weight: 20, indicators: [usIsm(2), euPmi(2)] },
    { id: 'risk', name: 'Risk Appetite', desc: 'Cyclical asset — suffers when stress rises.', weight: 15, indicators: [vixInd(-1, 1, 'Rising fear = bearish cyclical metals'), hyOas(-1, 1)] },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'COMEX copper speculators.', weight: 20, indicators: [cotInd('XCU', 1, 'Copper')] },
  ]),
  commodity('WTI', 'WTI Crude Oil', [
    { id: 'supply', name: 'Supply & Inventories', desc: 'Weekly US inventory and drilling data from EIA, API and Baker Hughes.', weight: 35,
      indicators: [cal('eia_crude', 'US', -1, 3, 'Inventory build (more supply) = bearish oil; a draw = bullish'),
        cal('api_crude', 'US', -1, 1.5, 'Inventory build = bearish oil'),
        cal('eia_gasoline', 'US', -1, 1.5, 'Gasoline build = weaker demand = bearish oil'),
        cal('rig_count', 'US', -1, 1, 'More rigs = more future supply = bearish oil', { use: ['momentum'] })] },
    { id: 'demand', name: 'Global Demand', desc: 'Industrial activity in the three largest economies.', weight: 25, indicators: [usIsm(2), chinaPmi(2.5), euPmi(1.5)] },
    { id: 'risk', name: 'Risk Appetite', desc: 'Oil trades as a growth asset.', weight: 10, indicators: [hyOas(-1, 1), vixInd(-1, 1, 'Rising fear = bearish oil')] },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'NYMEX crude speculators.', weight: 20, indicators: [cotInd('WTI', 1, 'Crude Oil')] },
  ]),
  commodity('NATGAS', 'Natural Gas', [
    { id: 'storage', name: 'Storage', desc: 'EIA weekly storage vs. expectations is the key fundamental driver.', weight: 60,
      indicators: [cal('eia_natgas', 'US', -1, 1, 'Larger injection / smaller draw than expected = bearish gas')] },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'NYMEX natural gas speculators.', weight: 40, indicators: [cotInd('NATGAS', 1, 'Natural Gas')] },
  ]),
];

// ───────────────────────────────────────── indices

const EQ_GROW = 'Stronger activity = higher earnings = bullish equities';
const EQ_HAWK = 'Higher inflation / rates = tighter policy = bearish equities';

function usIndex(symbol: string, name: string, cotKey: string, rateSensitivity: number): AssetSpec {
  return {
    symbol, name, assetClass: 'INDICES', meta: { region: 'United States' },
    pillars: [
      { id: 'growth', name: 'Growth & Earnings Backdrop', desc: 'US activity data that drives corporate revenue.', weight: 25, indicators: [
        cal('mfg_pmi', 'US', 1, 2, EQ_GROW, { name: 'ISM Manufacturing PMI' }), cal('services_pmi', 'US', 1, 2.5, EQ_GROW, { name: 'ISM Services PMI' }),
        cal('retail_sales', 'US', 1, 2, EQ_GROW), cal('nfp', 'US', 1, 1.5, 'Solid job growth supports spending = bullish'), cal('gdp', 'US', 1, 1.5, EQ_GROW, { scale: 0.5, level: { neutral: 2, scale: 1.5, label: 'trend ≈ 2% annualized' } }),
        cal('claims', 'US', -1, 1, 'Rising layoffs = bearish equities')] },
      { id: 'policy', name: 'Rates & Fed Policy', desc: 'Discount rates and the Fed path drive valuations.', weight: 20 * rateSensitivity, indicators: [
        cal('policy_rate', 'US', -1, 2, 'A Fed hike = bearish equities; a cut = bullish'), fedPath(-1, 2), realYield(-1, 2.5)] },
      { id: 'inflation', name: 'Inflation', desc: 'Inflation surprises move rate expectations.', weight: 10, indicators: [
        cal('core_cpi_yoy', 'US', -1, 2, EQ_HAWK, { use: ['surprise', 'momentum'] }), cal('pce_core_mom', 'US', -1, 1, EQ_HAWK, { use: ['surprise', 'momentum'] })] },
      { id: 'risk', name: 'Risk & Credit', desc: 'Volatility and credit spreads lead equity drawdowns.', weight: 20, indicators: [
        vixInd(-1, 2, 'Rising volatility = bearish equities'), hyOas(-1, 2), nfci(-1, 1)] },
      { id: 'consumer', name: 'Consumer', desc: 'Household spending is about two-thirds of the US economy.', weight: 7, indicators: [
        cal('consumer_conf', 'US', 1, 1, 'Confident consumers spend more = bullish equities')] },
      { id: 'liquidity', name: 'Liquidity', desc: 'Central-bank balance-sheet liquidity.', weight: 8, indicators: [fedBs(1)] },
      { id: 'positioning', name: 'Institutional Positioning', desc: 'CFTC COT in index futures.', weight: 10, indicators: [cotInd(cotKey, 1, name)] },
    ],
  };
}

function intlIndex(symbol: string, name: string, country: string, region: string, extra: PillarSpec[] = [], bizCountry = country): AssetSpec {
  return {
    symbol, name, assetClass: 'INDICES', meta: { region },
    pillars: [
      { id: 'growth', name: 'Domestic Growth', desc: `${region} activity data.`, weight: 28, indicators: [
        cal('mfg_pmi', country, 1, 2, EQ_GROW), cal('services_pmi', country, 1, 2, EQ_GROW), cal('gdp', country, 1, 1.5, EQ_GROW, { level: null }),
        cal('retail_sales', country, 1, 1, EQ_GROW), cal('business_conf', bizCountry, 1, 2, 'Stronger business sentiment = bullish equities'), cal('unemployment', country, -1, 1, 'Rising unemployment = bearish equities')] },
      { id: 'policy', name: 'Central Bank Policy', desc: 'Domestic policy rate path.', weight: 18, indicators: [
        cal('policy_rate', country, -1, 2, 'A hike = bearish equities; a cut = bullish'), cal('core_cpi_yoy', country, -1, 1.5, EQ_HAWK, { use: ['surprise', 'momentum'] })] },
      { id: 'global', name: 'Global Demand & Risk', desc: 'US cycle and global risk appetite.', weight: 22, indicators: [
        cal('mfg_pmi', 'US', 1, 1.5, 'Stronger US industry = stronger export demand', { name: 'US ISM Manufacturing PMI' }), vixInd(-1, 2, 'Rising volatility = bearish equities'), hyOas(-1, 1)] },
      ...extra,
    ],
  };
}

export const INDEX_SPECS: AssetSpec[] = [
  usIndex('US500', 'S&P 500', 'US500', 1),
  usIndex('US100', 'Nasdaq 100', 'US100', 1.4),
  usIndex('US30', 'Dow Jones 30', 'US30', 0.8),
  intlIndex('GER40', 'DAX 40', 'EU', 'Germany / Euro Area', [
    { id: 'china', name: 'China Exposure', desc: 'German exporters are highly exposed to Chinese demand.', weight: 8, indicators: [chinaPmi(1)] },
    { id: 'euro', name: 'Euro (inverse)', desc: 'DAX companies earn most of their revenue outside Germany; a weaker euro lifts those earnings.', weight: 6, indicators: [], mirror: { asset: 'EUR', sign: -1 } },
  ], 'DE'),
  intlIndex('UK100', 'FTSE 100', 'GB', 'United Kingdom', [
    { id: 'commodities', name: 'Commodity Earnings', desc: 'Energy and mining are a large share of FTSE earnings.', weight: 10, indicators: [
      fredInd({ id: 'ftse_wti', name: 'Crude Oil Trend', desc: 'Oil majors’ earnings track crude.', series: 'DCOILWTICO', days: 21, changeScale: 6, pct: true, polarity: 1, weight: 1, polarityNote: 'Rising oil = higher energy earnings = bullish FTSE' }), chinaPmi(1),
      copperPx(1, 'Rising metal prices = higher mining earnings = bullish FTSE', 'ftse_copper')] },
    { id: 'pound', name: 'Pound (inverse)', desc: 'About three-quarters of FTSE 100 revenue is earned abroad; a weaker pound inflates it in sterling terms.', weight: 10, indicators: [], mirror: { asset: 'GBP', sign: -1 } },
  ]),
  intlIndex('JP225', 'Nikkei 225', 'JP', 'Japan', [
    { id: 'yen', name: 'Yen (inverse)', desc: 'A weaker yen boosts Japanese exporters’ earnings.', weight: 12, indicators: [], mirror: { asset: 'JPY', sign: -1 } },
    { id: 'positioning', name: 'Institutional Positioning', desc: 'CFTC COT in CME Nikkei 225 (yen) futures.', weight: 10, indicators: [cotInd('JP225', 1, 'Nikkei 225')] },
  ]),
  intlIndex('AUS200', 'ASX 200', 'AU', 'Australia', [
    { id: 'china', name: 'China & Resources', desc: 'Miners dominate the ASX; China is the key customer.', weight: 14, indicators: [chinaPmi(1.5),
      ironOrePx(2, 'Rising iron ore = higher miner earnings (BHP, Rio, Fortescue) = bullish ASX', 'asx_iron'), copperPx(1, 'Rising copper = higher miner earnings = bullish ASX', 'asx_copper')] },
  ]),
];

// ───────────────────────────────────────── crypto

function retailContrarian(symbol: string, weight: number): CustomSpec {
  return {
    kind: 'custom', id: `retail_${symbol}`, name: 'Retail Long/Short Ratio', freq: 'Live', polarity: 1, weight,
    desc: 'Share of retail futures accounts long vs short. Crowds are usually wrong at extremes, so this is read contrarian.',
    polarityNote: 'Crowd heavily long = bearish (contrarian); crowd short = bullish',
    compute: (ctx) => {
      const item = sentimentStorage.getAllItems().items.find((i) => i.symbol === symbol && !i.isUnavailable);
      if (!item) return null;
      const v = (item.shortPct - item.longPct) / 100; // −1..1
      return {
        observation: { actual: item.longPct, forecast: null, previous: null, releasedAt: new Date(item.timestamp).toISOString(), unit: '% long',
          sourceTitle: item.traderGroup, sourceName: item.source, sourceUrl: item.sourceUrl, extra: { shortPct: item.shortPct } },
        components: [{ key: 'positioning', label: 'Contrarian crowd read', value: clamp(v * 1.6), weight: 1, detail: `${item.longPct}% long / ${item.shortPct}% short` }],
        reasoning: `${item.longPct}% of ${item.traderGroup} are long, ${item.shortPct}% short.`,
        ageDays: (ctx.now - item.timestamp) / DAY, intervalDays: 0.1,
      };
    },
  };
}

function cryptoSpec(asset: string, name: string): AssetSpec {
  const own: PillarSpec[] = [
    { id: 'liquidity', name: 'Macro Liquidity', desc: 'Crypto is the most liquidity-sensitive asset class.', weight: 30, indicators: [
      realYield(-1, 2), fedBs(1.5), nfci(-1, 1),
      {
        kind: 'custom', id: `stables_${asset}`, name: 'Stablecoin Supply (30d)', freq: 'Daily', polarity: 1, weight: 2,
        desc: 'Total USD stablecoins in circulation — the “dry powder” on crypto exchanges.', polarityNote: 'Growing stablecoin supply = new capital = bullish',
        compute: (ctx) => {
          const s = getStables();
          if (s.length < 31) return null;
          const last = s[s.length - 1]; const prev = s[s.length - 31];
          const pct = ((last.value - prev.value) / prev.value) * 100;
          return {
            observation: { actual: last.value, forecast: null, previous: prev.value, releasedAt: new Date(last.date).toISOString(), unit: 'USD',
              sourceTitle: 'Total stablecoins circulating', sourceName: 'DefiLlama', sourceUrl: 'https://defillama.com/stablecoins', extra: { change30dPct: r2(pct) } },
            components: [{ key: 'trend', label: '30-day change', value: squash(pct / 3), weight: 1, detail: `${pct >= 0 ? '+' : ''}${r2(pct)}% in 30 days` }],
            reasoning: `Stablecoin supply $${(last.value / 1e9).toFixed(1)}B, ${pct >= 0 ? '+' : ''}${r2(pct)}% over 30 days.`,
            ageDays: ageOf(last.date, ctx.now), intervalDays: 2,
          };
        },
      } satisfies CustomSpec,
    ] },
    { id: 'derivatives', name: 'Derivatives & Positioning', desc: 'Perpetual-swap funding and institutional (CME) positioning.', weight: 25, indicators: [
      {
        kind: 'custom', id: `funding_${asset}`, name: 'Perpetual Funding Rate', freq: 'Live', polarity: 1, weight: 2,
        desc: 'What longs pay shorts every 8h. Neutral ≈ 0.01%. Very high funding = over-leveraged longs (squeeze risk down); negative = crowded shorts.',
        polarityNote: 'Funding far above neutral = bearish (contrarian); negative funding = bullish',
        compute: (ctx) => {
          const d = getDeriv(asset);
          if (!d || d.fundingRate === null) return null;
          const f = d.fundingRate;
          const oiChg = d.oiNow && d.oi7dAgo ? ((d.oiNow - d.oi7dAgo) / d.oi7dAgo) * 100 : null;
          return {
            observation: { actual: r2(f * 100 * 1000) / 1000, forecast: null, previous: null, releasedAt: d.at, unit: '% / 8h', sourceTitle: `${asset}USDT perpetual`,
              sourceName: d.via, sourceUrl: d.via === 'Bybit' ? 'https://www.bybit.com/en/announcement-info/fund-rate/' : d.via === 'Hyperliquid' ? 'https://app.hyperliquid.xyz/fundingComparison' : 'https://www.binance.com/en/futures/funding-history',
              extra: { openInterest7dChangePct: oiChg === null ? null : r2(oiChg) } },
            components: [{ key: 'positioning', label: 'Funding vs neutral', value: -squash((f - 0.0001) / 0.00025), weight: 1, detail: `${(f * 100).toFixed(4)}% per 8h (neutral 0.0100%)` }],
            reasoning: `Funding ${(f * 100).toFixed(4)}%/8h on ${d.via}${oiChg !== null ? `; open interest ${oiChg >= 0 ? '+' : ''}${r2(oiChg)}% in 7 days` : ''}.`,
            ageDays: (ctx.now - new Date(d.at).getTime()) / DAY, intervalDays: 0.1,
          };
        },
      } satisfies CustomSpec,
      ...(asset === 'BTC' || asset === 'ETH' || asset === 'XRP' ? [cotInd(asset, 1.5, `${name} (CME)`)] : []),
    ] },
    { id: 'sentiment', name: 'Crowd Sentiment', desc: 'Contrarian sentiment gauges.', weight: 20, indicators: [
      {
        kind: 'custom', id: `fng_${asset}`, name: 'Crypto Fear & Greed Index', freq: 'Daily', polarity: 1, weight: 2,
        desc: '0 = extreme fear, 100 = extreme greed. Read contrarian: “be greedy when others are fearful”.',
        polarityNote: 'Extreme fear = bullish (contrarian); extreme greed = bearish',
        compute: (ctx) => {
          const f = getFng();
          if (!f.length) return null;
          const last = f[f.length - 1]; const wk = f.length > 7 ? f[f.length - 8] : null;
          return {
            observation: { actual: last.value, forecast: null, previous: wk?.value ?? null, releasedAt: new Date(last.date).toISOString(), unit: '/100',
              sourceTitle: 'Fear & Greed Index', sourceName: 'alternative.me', sourceUrl: 'https://alternative.me/crypto/fear-and-greed-index/' },
            components: [{ key: 'level', label: 'Contrarian level', value: squash((50 - last.value) / 25), weight: 1, detail: `${last.value}/100 (${last.value <= 25 ? 'extreme fear' : last.value < 45 ? 'fear' : last.value <= 55 ? 'neutral' : last.value < 75 ? 'greed' : 'extreme greed'})` }],
            reasoning: `Fear & Greed at ${last.value}/100${wk ? ` (week ago ${wk.value})` : ''}.`,
            ageDays: ageOf(last.date, ctx.now), intervalDays: 1.5,
          };
        },
      } satisfies CustomSpec,
      retailContrarian(`${asset}USDT`, 1.5),
    ] },
    { id: 'risk', name: 'Risk Appetite', desc: 'Crypto trades with high-beta risk assets.', weight: 10, indicators: [vixInd(-1, 1, 'Rising fear = bearish crypto'), hyOas(-1, 1)] },
  ];
  if (asset === 'BTC') {
    own.push({ id: 'network', name: 'Network Fundamentals', desc: 'Miner investment and network security.', weight: 15, indicators: [{
      kind: 'custom', id: 'btc_hash', name: 'Hash Rate (30d)', freq: 'Daily', polarity: 1, weight: 1,
      desc: 'Total mining power securing Bitcoin — rising hash rate reflects miner conviction and investment.', polarityNote: 'Rising hash rate = bullish network health',
      compute: (ctx) => {
        const h = getHashrate();
        if (h.length < 35) return null;
        const avg = (a: typeof h) => a.reduce((s, p) => s + p.value, 0) / a.length;
        const now7 = avg(h.slice(-7)); const then7 = avg(h.slice(-37, -30));
        const pct = ((now7 - then7) / then7) * 100;
        const last = h[h.length - 1];
        return {
          observation: { actual: Math.round(now7), forecast: null, previous: Math.round(then7), releasedAt: new Date(last.date).toISOString(), unit: 'TH/s (7d avg)',
            sourceTitle: 'Hash rate', sourceName: 'blockchain.com', sourceUrl: 'https://www.blockchain.com/explorer/charts/hash-rate' },
          components: [{ key: 'trend', label: '30-day change (7d avg)', value: squash(pct / 5), weight: 1, detail: `${pct >= 0 ? '+' : ''}${r2(pct)}%` }],
          reasoning: `7-day average hash rate ${pct >= 0 ? 'up' : 'down'} ${Math.abs(r2(pct))}% vs a month ago.`,
          ageDays: ageOf(last.date, ctx.now), intervalDays: 2,
        };
      },
    }] });
  }
  const ownW = own.reduce((s, p) => s + p.weight, 0);
  return { symbol: asset, name, assetClass: 'CRYPTO', pillars: [...own, usdInverse(ownW * 0.5)], meta: { quote: 'USD' } };
}

export const CRYPTO_SPECS: AssetSpec[] = [
  cryptoSpec('BTC', 'Bitcoin'), cryptoSpec('ETH', 'Ethereum'), cryptoSpec('XRP', 'XRP'), cryptoSpec('SOL', 'Solana'),
  cryptoSpec('BNB', 'BNB'), cryptoSpec('DOGE', 'Dogecoin'), cryptoSpec('ADA', 'Cardano'), cryptoSpec('LINK', 'Chainlink'),
];

// ───────────────────────────────────────── stocks (SEC filings)

function pctChange(a: number, b: number) { return b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null; }

function filingInd(ticker: string, id: string, name: string, desc: string, weight: number, note: string,
  fn: (f: NonNullable<ReturnType<typeof getStockFundamentals>>) => { value: number; detail: string; reasoning: string; actual: number; previous: number | null; unit: string; asOf: string; form: string } | null): CustomSpec {
  return {
    kind: 'custom', id: `${ticker}_${id}`, name, desc, freq: 'Quarterly', polarity: 1, weight, polarityNote: note,
    compute: (ctx) => {
      const f = getStockFundamentals(ticker);
      if (!f) return null;
      const r = fn(f);
      if (!r) return null;
      return {
        observation: { actual: r.actual, forecast: null, previous: r.previous, releasedAt: new Date(r.asOf).toISOString(), unit: r.unit,
          sourceTitle: `${ticker} ${r.form}`, sourceName: 'SEC EDGAR (XBRL company facts)', sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-Q` },
        components: [{ key: 'trend', label: name, value: r.value, weight: 1, detail: r.detail }],
        reasoning: r.reasoning,
        ageDays: ageOf(r.asOf, ctx.now), intervalDays: 100,
      };
    },
  };
}

function stockSpec(s: (typeof STOCKS)[number]): AssetSpec {
  const t = s.ticker;
  return {
    symbol: t, name: s.name, assetClass: 'STOCKS', meta: coreStockMeta(s),
    pillars: [
      { id: 'growth', name: 'Revenue & Earnings Growth', desc: 'Year-over-year growth in the latest reported quarter.', weight: 35, indicators: [
        filingInd(t, 'rev', 'Revenue Growth (YoY)', 'Latest quarter revenue vs the same quarter a year earlier.', 3, 'Faster growth = bullish', (f) => {
          if (!f.revenue?.yearAgo) return null;
          const g = pctChange(f.revenue.latest.val, f.revenue.yearAgo.val); if (g === null) return null;
          return { value: squash((g - 5) / 10), detail: `${r2(g)}% YoY (${f.revenue.latest.frame})`, reasoning: `Revenue $${(f.revenue.latest.val / 1e9).toFixed(2)}B in ${f.revenue.latest.frame}, ${g >= 0 ? '+' : ''}${r2(g)}% YoY.`,
            actual: f.revenue.latest.val, previous: f.revenue.yearAgo.val, unit: 'USD', asOf: f.revenue.latest.filed, form: f.revenue.latest.form };
        }),
        filingInd(t, 'eps', 'Diluted EPS Growth (YoY)', 'Earnings per share vs the same quarter last year.', 3, 'Faster EPS growth = bullish', (f) => {
          if (!f.eps?.yearAgo) return null;
          const g = pctChange(f.eps.latest.val, f.eps.yearAgo.val); if (g === null) return null;
          return { value: squash((g - 8) / 15), detail: `$${f.eps.latest.val} vs $${f.eps.yearAgo.val}`, reasoning: `Diluted EPS $${f.eps.latest.val} vs $${f.eps.yearAgo.val} a year ago (${g >= 0 ? '+' : ''}${r2(g)}%).`,
            actual: f.eps.latest.val, previous: f.eps.yearAgo.val, unit: 'USD/share', asOf: f.eps.latest.filed, form: f.eps.latest.form };
        }),
        filingInd(t, 'op', 'Operating Income Growth (YoY)', 'Core profit growth before interest and taxes.', 2, 'Faster operating growth = bullish', (f) => {
          if (!f.opIncome?.yearAgo) return null;
          const g = pctChange(f.opIncome.latest.val, f.opIncome.yearAgo.val); if (g === null) return null;
          return { value: squash((g - 8) / 15), detail: `${r2(g)}% YoY`, reasoning: `Operating income ${g >= 0 ? '+' : ''}${r2(g)}% YoY in ${f.opIncome.latest.frame}.`,
            actual: f.opIncome.latest.val, previous: f.opIncome.yearAgo.val, unit: 'USD', asOf: f.opIncome.latest.filed, form: f.opIncome.latest.form };
        }),
      ] },
      { id: 'profitability', name: 'Profitability', desc: 'Margins and their direction.', weight: 25, indicators: [
        filingInd(t, 'nm', 'Net Margin', 'Net income as a share of revenue (latest quarter).', 2, 'Higher margin = higher quality = bullish', (f) => {
          if (!f.revenue || !f.netIncome || f.netIncome.latest.frame !== f.revenue.latest.frame) return null;
          const m = (f.netIncome.latest.val / f.revenue.latest.val) * 100;
          return { value: squash((m - 10) / 10), detail: `${r2(m)}%`, reasoning: `Net margin ${r2(m)}% in ${f.revenue.latest.frame}.`,
            actual: r2(m), previous: null, unit: '%', asOf: f.netIncome.latest.filed, form: f.netIncome.latest.form };
        }),
        filingInd(t, 'om', 'Operating Margin Trend', 'Change in operating margin vs a year ago (pp).', 2, 'Expanding margins = bullish', (f) => {
          if (!f.revenue?.yearAgo || !f.opIncome?.yearAgo || f.opIncome.latest.frame !== f.revenue.latest.frame) return null;
          const now = (f.opIncome.latest.val / f.revenue.latest.val) * 100; const then = (f.opIncome.yearAgo.val / f.revenue.yearAgo.val) * 100;
          return { value: squash((now - then) / 3), detail: `${r2(then)}% → ${r2(now)}%`, reasoning: `Operating margin ${r2(then)}% → ${r2(now)}% (${now - then >= 0 ? '+' : ''}${r2(now - then)}pp).`,
            actual: r2(now), previous: r2(then), unit: '%', asOf: f.opIncome.latest.filed, form: f.opIncome.latest.form };
        }),
      ] },
      { id: 'balance', name: 'Cash Flow & Balance Sheet', desc: 'Free cash flow and leverage from the latest annual/quarterly filings.', weight: 20, indicators: [
        filingInd(t, 'fcf', 'Free Cash Flow Margin', 'Operating cash flow minus capex, as % of revenue (latest fiscal year).', 2, 'Higher FCF margin = bullish', (f) => {
          if (!f.ocfAnnual || !f.revenueAnnual || f.ocfAnnual.frame !== f.revenueAnnual.frame) return null;
          const capex = f.capexAnnual && f.capexAnnual.frame === f.ocfAnnual.frame ? f.capexAnnual.val : 0;
          const m = ((f.ocfAnnual.val - capex) / f.revenueAnnual.val) * 100;
          return { value: squash((m - 8) / 10), detail: `${r2(m)}% (${f.ocfAnnual.frame})`, reasoning: `FCF margin ${r2(m)}% in ${f.ocfAnnual.frame}.`,
            actual: r2(m), previous: null, unit: '%', asOf: f.ocfAnnual.filed, form: f.ocfAnnual.form };
        }),
        filingInd(t, 'de', 'Debt to Equity', 'Long-term debt divided by shareholders’ equity.', 1.5, 'Lower leverage = bullish', (f) => {
          if (!f.longTermDebt || !f.equity || f.equity.val <= 0) return null;
          const de = f.longTermDebt.val / f.equity.val;
          return { value: -squash((de - 0.8) / 0.8), detail: `${r2(de)}×`, reasoning: `Long-term debt / equity = ${r2(de)}×.`,
            actual: r2(de), previous: null, unit: '×', asOf: f.equity.filed, form: f.equity.form };
        }),
      ] },
      valuationPillarFor(t, s.sector),
      { id: 'macro', name: 'US Macro Backdrop', desc: 'The S&P 500 fundamental score (growth, Fed, credit, liquidity).', weight: 15, indicators: [], mirror: { asset: 'US500', sign: 1 } },
    ],
  };
}

export const STOCK_SPECS: AssetSpec[] = STOCKS.map(stockSpec);
export const CURRENCY_SPECS: AssetSpec[] = CURRENCIES.map(currencySpec);

/** Cross-sectional inputs (policy rate & CPI per G8 country) computed before scoring currencies. */
export function buildPolicyMap(ctx: EngineContext): EngineContext['policy'] {
  const m: EngineContext['policy'] = new Map();
  for (const ccy of CURRENCIES) {
    const c = CURRENCY_COUNTRY[ccy];
    const rate = findLatest(ctx.events, 'policy_rate', c, ctx.now);
    const cpi = findLatest(ctx.events, 'cpi_yoy', c, ctx.now);
    m.set(c, { rate: rate?.event.actual ?? null, cpi: cpi?.event.actual ?? null, rateEvent: rate?.event ?? null, cpiEvent: cpi?.event ?? null });
  }
  return m;
}
