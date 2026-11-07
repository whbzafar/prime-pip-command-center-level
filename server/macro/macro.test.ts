import { describe, it, expect, beforeEach } from 'vitest';
import { parseTvEvent, normalizeKey, __setEventsForTest, type TvEvent } from './sources/tvCalendar.js';
import { parseFredCsv, __setFredForTest } from './sources/fred.js';
import { parseYahooChart } from './sources/prices.js';
import { computeCotSignal } from './sources/cot.js';
import { extractFundamentals, quarterPair } from './sources/edgar.js';
import { findLatest, scoreCalendar, freshnessFactor, biasFromScore, type EngineContext, type CalSpec } from './scoring.js';
import { computeSnapshot, __resetForTest } from './macroService.js';
import { pearson, fxPairs } from './pairs.js';

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const iso = (daysAgo: number, h = 11) => new Date(NOW - daysAgo * 86_400_000 + (h - 12) * 3600_000).toISOString();

let n = 0;
function ev(country: string, title: string, daysAgo: number, actual: number | null, forecast: number | null, previous: number | null, extra: any = {}): TvEvent {
  return parseTvEvent({ id: String(++n), title, indicator: extra.indicator ?? title, country, currency: '', date: iso(daysAgo), actual, forecast, previous, importance: 1, ...extra })!;
}

function ctxWith(events: TvEvent[]): EngineContext {
  return { now: NOW, events, results: new Map(), policy: new Map() };
}

describe('TradingView calendar parsing', () => {
  it('parses raw rows and strips release-stage suffixes', () => {
    const e = parseTvEvent({ id: 9, title: 'GDP Growth Rate QoQ Adv', indicator: 'GDP Growth Rate QoQ Adv', country: 'us', date: '2026-10-30T12:30:00.000Z', actual: '2.8', forecast: 2.5, previous: '3.0' })!;
    expect(e.country).toBe('US');
    expect(e.actual).toBe(2.8);
    expect(e.key).toBe('gdp growth rate qoq');
    expect(normalizeKey('Inflation Rate YoY Flash')).toBe('inflation rate yoy');
    expect(normalizeKey('Consumer Confidence Final')).toBe('consumer confidence');
  });
  it('rejects rows without a valid date or title', () => {
    expect(parseTvEvent({ title: 'X' })).toBeNull();
    expect(parseTvEvent({ date: '2026-01-01' })).toBeNull();
  });
  it('treats empty / null figures as missing, never zero', () => {
    const e = parseTvEvent({ title: 'Non Farm Payrolls', country: 'US', date: '2026-11-06T13:30:00Z', actual: '', forecast: null, previous: 120 })!;
    expect(e.actual).toBeNull();
    expect(e.forecast).toBeNull();
  });
});

describe('Indicator matching', () => {
  const events = [
    ev('US', 'Core Inflation Rate YoY', 20, 3.0, 3.1, 3.1),
    ev('US', 'Inflation Rate YoY', 20, 2.9, 2.9, 2.7),
    ev('US', 'Inflation Rate YoY', 50, 2.7, 2.8, 2.6),
    ev('US', 'Fed Interest Rate Decision', 9, 4.0, 4.0, 4.25),
    ev('US', 'FOMC Minutes', 2, null, null, null),
    ev('EU', 'Deposit Facility Rate', 10, 2.0, 2.0, 2.0),
    ev('EU', 'ECB Interest Rate Decision', 10, 2.15, 2.15, 2.15),
    ev('US', 'ISM Manufacturing PMI', 6, 48.7, 49.0, 49.1),
    ev('US', 'S&P Global Manufacturing PMI', 6, 52.5, 52.2, 52.0),
    ev('US', 'Chicago PMI', 8, 45, 46, 44),
  ];
  it('picks the most recent print and ignores core when headline is requested', () => {
    const m = findLatest(events, 'cpi_yoy', 'US', NOW)!;
    expect(m.event.actual).toBe(2.9);
  });
  it('uses the deposit rate for the ECB (the policy-relevant rate)', () => {
    expect(findLatest(events, 'policy_rate', 'EU', NOW)!.event.actual).toBe(2.0);
  });
  it('prefers ISM for the US and never matches regional PMIs', () => {
    expect(findLatest(events, 'mfg_pmi', 'US', NOW)!.event.title).toBe('ISM Manufacturing PMI');
  });
  it('does not match minutes/speeches as rate decisions', () => {
    expect(findLatest(events, 'policy_rate', 'US', NOW)!.event.title).toBe('Fed Interest Rate Decision');
  });
  it('ignores events scheduled in the future', () => {
    const fut = [...events, ev('US', 'Inflation Rate YoY', -3, 3.5, 3.0, 2.9)];
    expect(findLatest(fut, 'cpi_yoy', 'US', NOW)!.event.actual).toBe(2.9);
  });
});

describe('Real TradingView titles (captured from the live feed, Nov 2026)', () => {
  const real = (country: string, title: string, indicator: string, a: number, f: number | null, p: number | null, d = 5) =>
    parseTvEvent({ id: `${country}${title}${indicator}`, title, indicator, country, date: iso(d), actual: a, forecast: f, previous: p })!;
  const events = [
    real('US', 'Interest Rate', 'FOMC Decision Fed Funds Tgt Rate', 4, null, 3.75),
    real('US', 'Interest Rate Projection - Current', 'FFR Projection-Current', 4.1, null, 3.8),
    real('US', 'Interest Rate on Reserve Balances', 'Fed Int On Excess Reserves', 3.9, null, 3.65),
    real('US', 'Non Farm Payrolls', 'Non-Farm Payrolls', 60, 90, 186),
    real('US', 'Nonfarm Payrolls Private', 'Private Payrolls', 78, 85, 142),
    real('US', 'Inflation Rate YoY', 'CPI YY, NSA', 3.7, 3.6, 3.4),
    real('US', 'ISM Services PMI', 'ISM N-Mfg PMI', 54.9, 55.2, 55.4),
    real('US', 'Michigan Consumer Sentiment Prel', 'U Mich Sentiment Prelim', 46.3, 47.8, 47.8),
    real('US', 'GDP Growth Rate QoQ Final', 'GDP Final', 2.2, 1.5, 2.1),
    real('EU', 'Inflation Rate YoY Flash', 'HICP Flash YY *', 3.8, 3.6, 3.3),
    real('EU', 'Deposit Facility Rate', 'ECB Deposit Rate *', 2.5, 2.5, 2.25),
    real('EU', 'ECB Interest Rate Decision', 'ECB Refinancing Rate *', 2.65, 2.65, 2.4),
    real('GB', 'Consumer Confidence Index', 'GfK/NIM Consumer Confidence', -13, -16, -14),
    real('CA', 'Ivey PMI s.a', 'Ivey PMI SA', 58.2, null, 64.3),
    real('CA', 'Monthly GDP MoM', 'GDP MM', 0, 0, 0.4),
    real('AU', 'RBA Trimmed Mean CPI YoY', 'Trimmed Mean CPI YY SA *', 3.5, 3.6, 3.6),
    real('JP', 'Interest Rate', 'JP BOJ Rate Decision*', 1.25, null, 1),
    real('NZ', 'Westpac Consumer Confidence', 'Westpac Consumer Survey*', 89.5, null, 80.4),
  ];
  const t = (concept: string, c: string) => findLatest(events, concept, c, NOW)?.event.title;
  it('maps every central bank decision title and ignores projections / IORB', () => {
    expect(t('policy_rate', 'US')).toBe('Interest Rate');
    expect(t('policy_rate', 'JP')).toBe('Interest Rate');
    expect(t('policy_rate', 'EU')).toBe('Deposit Facility Rate');
  });
  it('maps headline data and keeps EU HICP as headline inflation', () => {
    expect(t('nfp', 'US')).toBe('Non Farm Payrolls');
    expect(t('cpi_yoy', 'US')).toBe('Inflation Rate YoY');
    expect(t('cpi_yoy', 'EU')).toBe('Inflation Rate YoY Flash');
    expect(t('services_pmi', 'US')).toBe('ISM Services PMI');
    expect(t('consumer_conf', 'US')).toBe('Michigan Consumer Sentiment Prel');
    expect(t('gdp', 'US')).toBe('GDP Growth Rate QoQ Final');
  });
  it('maps country-specific titles', () => {
    expect(t('consumer_conf', 'GB')).toBe('Consumer Confidence Index');
    expect(t('business_conf', 'CA')).toBe('Ivey PMI s.a');
    expect(t('gdp_mom', 'CA')).toBe('Monthly GDP MoM');
    expect(t('core_cpi_yoy', 'AU')).toBe('RBA Trimmed Mean CPI YoY');
    expect(t('consumer_conf', 'NZ')).toBe('Westpac Consumer Confidence');
  });
  it('infers % units from titles when the feed has no unit field', () => {
    expect(events.find((e) => e.title === 'Inflation Rate YoY')!.unit).toBe('%');
    expect(events.find((e) => e.title === 'ISM Services PMI')!.unit).toBe('');
  });
});

describe('Indicator scoring', () => {
  const spec = (concept: string, polarity: 1 | -1, extra: Partial<CalSpec> = {}): CalSpec =>
    ({ kind: 'cal', id: concept, concept, country: 'US', polarity, weight: 1, polarityNote: 'test', ...extra });

  it('NFP beat is bullish, miss is bearish, symmetric', () => {
    const beat = scoreCalendar(spec('nfp', 1), ctxWith([ev('US', 'Non Farm Payrolls', 1, 254, 150, 159)]));
    const miss = scoreCalendar(spec('nfp', 1), ctxWith([ev('US', 'Non Farm Payrolls', 1, 46, 150, 141)]));
    expect(beat.score!).toBeGreaterThan(50);
    expect(miss.score!).toBeLessThan(-50);
    expect(beat.status).toBe('live');
    expect(beat.observation!.actual).toBe(254);
    expect(beat.reasoning).toContain('Above forecast');
  });
  it('auto-detects raw counts vs thousands so scale stays consistent', () => {
    const k = scoreCalendar(spec('nfp', 1), ctxWith([ev('US', 'Non Farm Payrolls', 1, 254, 150, 159)]));
    const raw = scoreCalendar(spec('nfp', 1), ctxWith([ev('US', 'Non Farm Payrolls', 1, 254000, 150000, 159000)]));
    expect(raw.score).toBe(k.score);
  });
  it('unemployment rising is bearish for the currency (inverse polarity)', () => {
    const r = scoreCalendar(spec('unemployment', -1), ctxWith([ev('US', 'Unemployment Rate', 1, 4.4, 4.2, 4.2)]));
    expect(r.score!).toBeLessThan(-50);
  });
  it('a rate hike is strongly bullish, an expected hold is neutral', () => {
    const hike = scoreCalendar(spec('policy_rate', 1), ctxWith([ev('US', 'Fed Interest Rate Decision', 1, 4.5, 4.25, 4.25)]));
    const hold = scoreCalendar(spec('policy_rate', 1), ctxWith([ev('US', 'Fed Interest Rate Decision', 1, 4.25, 4.25, 4.25)]));
    expect(hike.score!).toBeGreaterThan(60);
    expect(hold.score).toBe(0);
  });
  it('rejects implausible prints instead of scoring them', () => {
    const r = scoreCalendar(spec('mfg_pmi', 1), ctxWith([ev('US', 'ISM Manufacturing PMI', 1, 480, 49, 48)]));
    expect(r.score).toBeNull();
    expect(r.reasoning).toMatch(/implausible/i);
  });
  it('missing data is excluded (null score, zero weight) — never invented', () => {
    const r = scoreCalendar(spec('jolts', 1), ctxWith([]));
    expect(r.score).toBeNull();
    expect(r.effectiveWeight).toBe(0);
    expect(r.status).toBe('missing');
  });
  it('freshness decays old prints but never below 25%', () => {
    expect(freshnessFactor(10, 31)).toBe(1);
    expect(freshnessFactor(90, 31)).toBeLessThan(1);
    expect(freshnessFactor(1000, 31)).toBe(0.25);
  });
  it('bias bands', () => {
    expect(biasFromScore(65)).toBe('STRONG_BULLISH');
    expect(biasFromScore(0)).toBe('NEUTRAL');
    expect(biasFromScore(-35)).toBe('BEARISH');
  });
});

describe('Source parsers', () => {
  it('FRED CSV skips "." missing values', () => {
    const pts = parseFredCsv('observation_date,DGS2\n2026-11-03,3.55\n2026-11-04,.\n2026-11-05,3.60\n');
    expect(pts).toEqual([{ date: '2026-11-03', value: 3.55 }, { date: '2026-11-05', value: 3.6 }]);
  });
  it('Yahoo chart parser drops null closes', () => {
    const pts = parseYahooChart({ chart: { result: [{ timestamp: [1762300800, 1762387200, 1762473600], indicators: { quote: [{ close: [1.15, null, 1.16] }] } }] } });
    expect(pts.map((p) => p.value)).toEqual([1.15, 1.16]);
  });
  it('COT signal: top of range + adding longs = positive', () => {
    const recs = Array.from({ length: 52 }, (_, i) => ({ reportDate: `2026-${String(1 + Math.floor(i / 5)).padStart(2, '0')}-01`, nonCommNet: i * 1000, changeNonCommNet: 1000, openInterest: 200000 })) as any;
    const s = computeCotSignal('EUR', 'Euro FX', recs)!;
    expect(s.cotIndex52w).toBe(100);
    expect(s.value).toBeGreaterThan(0.6);
  });
  it('SEC quarter pairing finds the same quarter one year earlier', () => {
    const rows = [
      { frame: 'CY2025Q3', end: '2025-09-27', val: 100, filed: '2025-10-31', form: '10-K' },
      { frame: 'CY2026Q2', end: '2026-06-27', val: 90, filed: '2026-08-01', form: '10-Q' },
      { frame: 'CY2026Q3', end: '2026-09-26', val: 110, filed: '2026-10-31', form: '10-K' },
      { end: '2026-09-26', val: 400, filed: '2026-10-31', form: '10-K' }, // annual, no quarter frame
    ];
    const p = quarterPair(rows)!;
    expect(p.latest.val).toBe(110);
    expect(p.yearAgo!.val).toBe(100);
    const f = extractFundamentals('TEST', { facts: { 'us-gaap': { Revenues: { units: { USD: rows } } } } });
    expect(f.revenue!.concept).toBe('Revenues');
  });
});

describe('Pairs & correlation math', () => {
  it('28 FX crosses in market convention', () => {
    const p = fxPairs().map(([a, b]) => a + b);
    expect(p.length).toBe(28);
    for (const s of ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCAD', 'USDCHF', 'EURJPY', 'GBPJPY', 'AUDNZD', 'CADJPY', 'CHFJPY']) expect(p).toContain(s);
  });
  it('pearson on perfectly (anti)correlated series', () => {
    const a = Array.from({ length: 30 }, (_, i) => Math.sin(i));
    expect(pearson(a, a)).toBeCloseTo(1, 6);
    expect(pearson(a, a.map((x) => -x))).toBeCloseTo(-1, 6);
  });
});

describe('End-to-end: live NFP release flows through USD, pairs and gold', () => {
  beforeEach(() => __resetForTest());

  const baseUS = () => [
    ev('US', 'Fed Interest Rate Decision', 9, 4.0, 4.0, 4.25),
    ev('US', 'Inflation Rate YoY', 24, 2.9, 2.9, 2.7),
    ev('US', 'Core Inflation Rate YoY', 24, 3.0, 3.1, 3.1),
    ev('US', 'Unemployment Rate', 35, 4.3, 4.3, 4.2),
    ev('US', 'ISM Manufacturing PMI', 6, 48.7, 49.0, 49.1),
    ev('US', 'ISM Services PMI', 4, 52.0, 51.0, 50.0),
    ev('EU', 'Deposit Facility Rate', 10, 2.0, 2.0, 2.0),
    ev('EU', 'Inflation Rate YoY', 6, 2.1, 2.1, 2.2),
    ev('GB', 'BoE Interest Rate Decision', 2, 3.75, 3.75, 4.0),
    ev('GB', 'Inflation Rate YoY', 20, 3.6, 3.7, 3.8),
    ev('JP', 'BoJ Interest Rate Decision', 8, 0.75, 0.75, 0.5),
    ev('JP', 'Inflation Rate YoY', 14, 2.9, 3.0, 2.7),
    ev('CA', 'BoC Interest Rate Decision', 10, 2.25, 2.25, 2.5),
    ev('CA', 'Inflation Rate YoY', 18, 2.4, 2.3, 1.9),
    ev('AU', 'RBA Interest Rate Decision', 4, 3.6, 3.6, 3.6),
    ev('AU', 'Monthly CPI Indicator', 10, 3.5, 3.1, 3.0),
    ev('NZ', 'RBNZ Interest Rate Decision', 30, 2.5, 2.5, 3.0),
    ev('NZ', 'Inflation Rate YoY', 18, 3.0, 2.9, 2.7),
    ev('CH', 'SNB Interest Rate Decision', 45, 0, 0, 0),
    ev('CH', 'Inflation Rate YoY', 5, 0.1, 0.2, 0.2),
  ];

  it('scores every major currency, links pairs, and records the NFP release with before/after', () => {
    __setEventsForTest(baseUS());
    __setFredForTest('DFII10', Array.from({ length: 300 }, (_, i) => ({ date: new Date(NOW - (300 - i) * 86_400_000).toISOString().slice(0, 10), value: 2.0 - i * 0.002 })));
    const before = computeSnapshot(NOW - 60_000);
    const usdBefore = before.assets.find((a) => a.symbol === 'USD')!;
    expect(usdBefore.score).not.toBeNull();

    // NFP lands: big beat
    __setEventsForTest([...baseUS(), ev('US', 'Non Farm Payrolls', 0.01, 254, 150, 159)]);
    const after = computeSnapshot(NOW);
    const usd = after.assets.find((a) => a.symbol === 'USD')!;
    expect(usd.score!).toBeGreaterThan(usdBefore.score!);

    const rel = after.releases.find((r) => r.sourceTitle === 'Non Farm Payrolls' && r.asset === 'USD')!;
    expect(rel).toBeTruthy();
    expect(rel.actual).toBe(254);
    expect(rel.forecast).toBe(150);
    expect(rel.previous).toBe(159);
    expect(rel.verdict).toMatch(/Above forecast → Bullish USD/);
    expect(rel.impacts.map((i) => i.asset)).toEqual(expect.arrayContaining(['USD', 'US500']));
    expect(after.releases.filter((r) => r.sourceTitle === 'Non Farm Payrolls').length).toBe(1);
    expect(rel.assetScoreBefore).toBe(usdBefore.score);

    // Pair arithmetic
    const eur = after.assets.find((a) => a.symbol === 'EUR')!;
    const eurusd = after.pairs.find((p) => p.symbol === 'EURUSD')!;
    expect(eurusd.score).toBeCloseTo(Math.round(((eur.score! - usd.score!) / 2) * 10) / 10, 1);

    // Gold: USD pillar mirrors USD with inverted sign
    const xau = after.assets.find((a) => a.symbol === 'XAU')!;
    const usdPillar = xau.pillars.find((p) => p.id === 'usd')!;
    expect(usdPillar.score).toBeCloseTo(-usd.score!, 5);
    expect(after.pairs.find((p) => p.symbol === 'XAUUSD')!.score).toBe(xau.score);

    // Nothing is invented: indicators without data are null and carry no weight
    for (const a of after.assets) for (const p of a.pillars) for (const i of p.indicators) {
      if (i.status === 'missing') { expect(i.score).toBeNull(); expect(i.effectiveWeight).toBe(0); }
      if (i.score !== null) { expect(i.observation).not.toBeNull(); expect(i.score).toBeGreaterThanOrEqual(-100); expect(i.score).toBeLessThanOrEqual(100); }
    }
    for (const a of after.assets) if (a.score !== null) expect(a.bullishPct! + a.bearishPct!).toBeCloseTo(100, 5);
  });

  it('rate differential: higher policy rate than peers is bullish carry', () => {
    __setEventsForTest(baseUS());
    const s = computeSnapshot(NOW);
    const aud = s.assets.find((a) => a.symbol === 'AUD')!;
    const chf = s.assets.find((a) => a.symbol === 'CHF')!;
    const diff = (a: typeof aud) => a.pillars.find((p) => p.id === 'monetary')!.indicators.find((i) => i.id.startsWith('nominal_diff'))!.score!;
    expect(diff(aud)).toBeGreaterThan(0);
    expect(diff(chf)).toBeLessThan(0);
  });
});
