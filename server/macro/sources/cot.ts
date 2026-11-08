/**
 * CFTC Commitments of Traders — Legacy Futures Only (Socrata, free, no key).
 * Institutional positioning for every asset that has a CFTC-regulated futures market.
 *
 * Groups (CFTC definitions):
 *  - Non-commercial = large speculators (hedge funds, CTAs, asset managers trading for profit)
 *  - Commercial     = hedgers (banks, producers, corporates offsetting business risk)
 *  - Non-reportable = small traders below reporting thresholds
 * Data is as of Tuesday and published Friday 15:30 ET; this module refreshes automatically and
 * polls every 10 minutes during the Friday release window.
 */
import { CFTC_API_CONFIG, COT_COLUMN_MAPPINGS } from '../../../src/config/cotConfig.js';
import { processCotHistory } from '../../../src/utils/cotCalculations.js';
import type { CotRecord, RawCotRow } from '../../../src/types/cotTypes.js';
import { fetchJson, markFailure, markSuccess, registerSource } from './http.js';

export const COT_SOURCE_ID = 'cftc_cot';
registerSource(COT_SOURCE_ID, 'CFTC Commitments of Traders', 'https://publicreporting.cftc.gov/',
  'Institutional positioning (speculators, hedgers, small traders). As of Tuesday, released Friday 15:30 ET.');

/** Asset → CFTC contract market code (every code verified against the live CFTC dataset). */
export const COT_CODES: Record<string, { code: string; name: string }> = {
  EUR: { code: '099741', name: 'Euro FX (CME)' },
  GBP: { code: '096742', name: 'British Pound (CME)' },
  JPY: { code: '097741', name: 'Japanese Yen (CME)' },
  CHF: { code: '092741', name: 'Swiss Franc (CME)' },
  CAD: { code: '090741', name: 'Canadian Dollar (CME)' },
  AUD: { code: '232741', name: 'Australian Dollar (CME)' },
  NZD: { code: '112741', name: 'New Zealand Dollar (CME)' },
  USD: { code: '098662', name: 'U.S. Dollar Index (ICE)' },
  XAU: { code: '088691', name: 'Gold (COMEX)' },
  XAG: { code: '084691', name: 'Silver (COMEX)' },
  XCU: { code: '085692', name: 'Copper (COMEX)' },
  XPT: { code: '076651', name: 'Platinum (NYMEX)' },
  XPD: { code: '075651', name: 'Palladium (NYMEX)' },
  WTI: { code: '067651', name: 'Crude Oil WTI (NYMEX)' },
  NATGAS: { code: '023651', name: 'Natural Gas (NYMEX)' },
  US500: { code: '13874A', name: 'E-mini S&P 500 (CME)' },
  US100: { code: '209742', name: 'Nasdaq-100 Mini (CME)' },
  US30: { code: '124603', name: 'Dow Jones $5 Mini (CBOT)' },
  JP225: { code: '240743', name: 'Nikkei Stock Average Yen (CME)' },
  BTC: { code: '133741', name: 'Bitcoin (CME)' },
  ETH: { code: '146021', name: 'Ether Cash Settled (CME)' },
  XRP: { code: '176740', name: 'XRP (CME)' },
};

export interface CotSignal {
  asset: string;
  market: string;
  reportDate: string;
  net: number;
  netChange: number;
  openInterest: number;
  cotIndex52w: number | null;
  /** -1..+1 trend-following positioning value. */
  value: number;
  history: number;
}

export interface PositionGroup {
  long: number;
  short: number;
  net: number;
  netChange: number;
  longChange: number;
  shortChange: number;
  longPct: number;         // long / (long + short) × 100
  netPctOi: number;        // net as % of open interest
  cotIndex26w: number | null;
  cotIndex52w: number | null;
  cotIndex3y: number | null;
  netChange4w: number | null;
  zScore52w: number | null;
}

export interface InstitutionalPosition {
  asset: string;
  market: string;
  code: string;
  reportDate: string;      // Tuesday "as of" date
  releasedAt: string;      // Friday 15:30 ET publication
  nextReleaseAt: string;
  openInterest: number;
  openInterestChange: number;
  openInterestChangePct: number;
  speculators: PositionGroup;
  commercials: PositionGroup;
  smallTraders: { long: number; short: number; net: number; longPct: number } | null;
  extremes: string[];
  interpretation: string;
  history: Array<{ date: string; specNet: number; commNet: number; oi: number }>;
  weeks: number;
  sourceUrl: string;
}

let signals = new Map<string, CotSignal>();
let positions = new Map<string, InstitutionalPosition>();
let lastLoad = 0;
const TTL = 3 * 60 * 60 * 1000;

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function cotIndex(values: number[], window: number): number | null {
  const w = values.slice(-window);
  if (w.length < Math.min(window, 8)) return null;
  const min = Math.min(...w), max = Math.max(...w);
  return max > min ? round(((w[w.length - 1] - min) / (max - min)) * 100) : null;
}

function zScore(values: number[], window: number): number | null {
  const w = values.slice(-window);
  if (w.length < 12) return null;
  const mean = w.reduce((a, b) => a + b, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length);
  return sd ? round((w[w.length - 1] - mean) / sd, 2) : null;
}

function group(records: CotRecord[], key: 'nonComm' | 'comm'): PositionGroup {
  const latest = records[records.length - 1];
  const long = key === 'nonComm' ? latest.nonCommLong : latest.commLong;
  const short = key === 'nonComm' ? latest.nonCommShort : latest.commShort;
  const nets = records.map((r) => (key === 'nonComm' ? r.nonCommNet : r.commNet));
  const net = nets[nets.length - 1];
  const fourAgo = nets.length > 4 ? nets[nets.length - 5] : null;
  return {
    long, short, net,
    netChange: key === 'nonComm' ? latest.changeNonCommNet : latest.changeCommNet,
    longChange: key === 'nonComm' ? latest.changeNonCommLong : latest.changeCommLong,
    shortChange: key === 'nonComm' ? latest.changeNonCommShort : latest.changeCommShort,
    longPct: long + short > 0 ? round((long / (long + short)) * 100) : 0,
    netPctOi: latest.openInterest ? round((net / latest.openInterest) * 100) : 0,
    cotIndex26w: cotIndex(nets, 26),
    cotIndex52w: cotIndex(nets, 52),
    cotIndex3y: cotIndex(nets, 156),
    netChange4w: fourAgo === null ? null : net - fourAgo,
    zScore52w: zScore(nets, 52),
  };
}

/** Friday 15:30 America/New_York following a Tuesday report date, as an ISO timestamp. */
function releaseAfter(reportDate: string): Date {
  const d = new Date(reportDate + 'T00:00:00Z');
  const fri = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7)));
  // 15:30 ET = 19:30 UTC (EDT) or 20:30 UTC (EST); US DST: 2nd Sunday March → 1st Sunday November
  const y = fri.getUTCFullYear();
  const dstStart = Date.UTC(y, 2, 8 + ((7 - new Date(Date.UTC(y, 2, 8)).getUTCDay()) % 7), 7);
  const dstEnd = Date.UTC(y, 10, 1 + ((7 - new Date(Date.UTC(y, 10, 1)).getUTCDay()) % 7), 6);
  const edt = fri.getTime() >= dstStart && fri.getTime() < dstEnd;
  return new Date(fri.getTime() + (edt ? 19.5 : 20.5) * 3600_000);
}

export function computeCotSignal(asset: string, market: string, records: CotRecord[]): CotSignal | null {
  if (records.length < 2) return null;
  const latest = records[records.length - 1];
  const idx = cotIndex(records.map((r) => r.nonCommNet), 52);
  const oi = latest.openInterest || 1;
  const chgPctOi = latest.changeNonCommNet / oi;
  const idxPart = idx === null ? 0 : (idx - 50) / 50;
  const value = Math.max(-1, Math.min(1, 0.6 * idxPart + 0.4 * Math.tanh(chgPctOi / 0.02)));
  return {
    asset, market, reportDate: latest.reportDate, net: latest.nonCommNet, netChange: latest.changeNonCommNet,
    openInterest: latest.openInterest, cotIndex52w: idx, value, history: records.length,
  };
}

export function computeInstitutional(asset: string, def: { code: string; name: string }, records: CotRecord[], raw: RawCotRow[]): InstitutionalPosition | null {
  if (records.length < 2) return null;
  const latest = records[records.length - 1];
  const spec = group(records, 'nonComm');
  const comm = group(records, 'comm');
  const latestRaw: any = raw.find((r: any) => String(r.report_date_as_yyyy_mm_dd || '').slice(0, 10) === latest.reportDate) || null;
  const sl = Number(latestRaw?.nonrept_positions_long_all), ss = Number(latestRaw?.nonrept_positions_short_all);
  const smallTraders = Number.isFinite(sl) && Number.isFinite(ss) ? { long: sl, short: ss, net: sl - ss, longPct: sl + ss > 0 ? round((sl / (sl + ss)) * 100) : 0 } : null;
  const released = releaseAfter(latest.reportDate);
  let next = releaseAfter(new Date(new Date(latest.reportDate + 'T00:00:00Z').getTime() + 7 * 86_400_000).toISOString().slice(0, 10));
  if (next.getTime() < Date.now()) next = releaseAfter(new Date(Date.now()).toISOString().slice(0, 10));

  const extremes: string[] = [];
  if (spec.cotIndex52w !== null && spec.cotIndex52w >= 90) extremes.push('Speculators near a 52-week net-long extreme (crowded long)');
  if (spec.cotIndex52w !== null && spec.cotIndex52w <= 10) extremes.push('Speculators near a 52-week net-short extreme (crowded short)');
  if (comm.cotIndex52w !== null && comm.cotIndex52w >= 90) extremes.push('Commercial hedgers at a 52-week net-long extreme (historically supportive)');
  if (comm.cotIndex52w !== null && comm.cotIndex52w <= 10) extremes.push('Commercial hedgers at a 52-week net-short extreme');
  if (spec.zScore52w !== null && Math.abs(spec.zScore52w) >= 2) extremes.push(`Speculative net position ${spec.zScore52w > 0 ? '+' : ''}${spec.zScore52w}σ from its 1-year mean`);

  const dir = spec.net >= 0 ? 'net long' : 'net short';
  const flow = spec.netChange > 0 ? 'added to longs / cut shorts' : spec.netChange < 0 ? 'cut longs / added shorts' : 'were unchanged';
  const oiChange = latest.changeOpenInterest;
  const oiPrev = latest.openInterest - oiChange;
  const interpretation =
    `Large speculators are ${dir} ${Math.abs(spec.net).toLocaleString()} contracts (${spec.longPct}% of their positions long, ${spec.netPctOi}% of open interest) and ${flow} by ${Math.abs(spec.netChange).toLocaleString()} this week. ` +
    `COT Index ${spec.cotIndex52w ?? '—'}/100 over 52 weeks${spec.cotIndex3y !== null ? `, ${spec.cotIndex3y}/100 over 3 years` : ''}. ` +
    `Commercial hedgers are ${comm.net >= 0 ? 'net long' : 'net short'} ${Math.abs(comm.net).toLocaleString()} — they usually take the other side of speculators. ` +
    `Open interest ${oiChange >= 0 ? 'rose' : 'fell'} ${Math.abs(oiChange).toLocaleString()} (${oiPrev ? round((oiChange / oiPrev) * 100) : 0}%)` +
    (oiChange > 0 && spec.netChange > 0 ? ': new money is entering on the long side.' : oiChange > 0 && spec.netChange < 0 ? ': new money is entering on the short side.' : oiChange < 0 ? ': positions are being closed (trend may be losing participation).' : '.');

  return {
    asset, market: def.name, code: def.code, reportDate: latest.reportDate,
    releasedAt: released.toISOString(), nextReleaseAt: next.toISOString(),
    openInterest: latest.openInterest, openInterestChange: oiChange, openInterestChangePct: oiPrev ? round((oiChange / oiPrev) * 100, 2) : 0,
    speculators: spec, commercials: comm, smallTraders, extremes, interpretation,
    history: records.slice(-52).map((r) => ({ date: r.reportDate, specNet: r.nonCommNet, commNet: r.commNet, oi: r.openInterest })),
    weeks: records.length,
    sourceUrl: `https://publicreporting.cftc.gov/resource/${CFTC_API_CONFIG.datasetId}.json?cftc_contract_market_code=${def.code}`,
  };
}

const SELECT = [...new Set([...Object.values(COT_COLUMN_MAPPINGS), 'nonrept_positions_long_all', 'nonrept_positions_short_all'])].join(',');

export async function refreshCot(force = false): Promise<void> {
  if (!force && signals.size && Date.now() - lastLoad < TTL) return;
  try {
    const codes = Object.values(COT_CODES).map((c) => `'${c.code}'`).join(',');
    const since = new Date(Date.now() - 3.3 * 365 * 86_400_000).toISOString().slice(0, 10); // 3+ years for the 3-year COT index
    const where = `${COT_COLUMN_MAPPINGS.contractMarketCode} in (${codes}) AND ${COT_COLUMN_MAPPINGS.reportDate} >= '${since}'`;
    const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=${encodeURIComponent(SELECT)}&$where=${encodeURIComponent(where)}&$order=${COT_COLUMN_MAPPINGS.reportDate}%20DESC&$limit=8000`;
    const token = process.env.CFTC_APP_TOKEN || process.env.SOCRATA_APP_TOKEN;
    const rows = await fetchJson<RawCotRow[]>(url, { timeoutMs: 25_000, headers: token ? { 'X-App-Token': token } : {} });
    if (!Array.isArray(rows)) throw new Error('CFTC returned a non-array payload');
    const byCode = new Map<string, RawCotRow[]>();
    for (const r of rows) {
      const c = String(r.cftc_contract_market_code || '').trim();
      if (!byCode.has(c)) byCode.set(c, []);
      byCode.get(c)!.push(r);
    }
    const nextSig = new Map<string, CotSignal>();
    const nextPos = new Map<string, InstitutionalPosition>();
    for (const [asset, def] of Object.entries(COT_CODES)) {
      const raw = byCode.get(def.code) || [];
      const recs = processCotHistory(raw);
      const sig = computeCotSignal(asset, def.name, recs);
      if (sig) nextSig.set(asset, sig);
      const pos = computeInstitutional(asset, def, recs, raw);
      if (pos) nextPos.set(asset, pos);
    }
    if (nextSig.size) { signals = nextSig; positions = nextPos; lastLoad = Date.now(); }
    markSuccess(COT_SOURCE_ID, nextSig.size);
  } catch (err) {
    markFailure(COT_SOURCE_ID, err);
  }
}

export function getCotSignal(asset: string): CotSignal | null {
  return signals.get(asset) || null;
}

export function getInstitutional(asset: string): InstitutionalPosition | null {
  return positions.get(asset) || null;
}

export function __setCotForTest(sig: CotSignal): void {
  signals.set(sig.asset, sig);
}
