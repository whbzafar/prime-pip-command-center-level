/**
 * CFTC Commitments of Traders — Legacy Futures Only (Socrata, free, no key).
 * Reuses the app's existing column mapping and row parser so numbers match the
 * Severity Report tab exactly.
 */
import { CFTC_API_CONFIG, COT_COLUMN_MAPPINGS } from '../../../src/config/cotConfig.js';
import { processCotHistory } from '../../../src/utils/cotCalculations.js';
import type { CotRecord, RawCotRow } from '../../../src/types/cotTypes.js';
import { fetchJson, markFailure, markSuccess, registerSource } from './http.js';

export const COT_SOURCE_ID = 'cftc_cot';
registerSource(COT_SOURCE_ID, 'CFTC Commitments of Traders', 'https://publicreporting.cftc.gov/',
  'Large-speculator (non-commercial) net positioning. Data as of Tuesday, released Friday 15:30 ET.');

/** Asset → CFTC contract market code. */
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
  BTC: { code: '133741', name: 'Bitcoin (CME)' },
  ETH: { code: '146021', name: 'Ether (CME)' },
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

let signals = new Map<string, CotSignal>();
let lastLoad = 0;
const TTL = 3 * 60 * 60 * 1000;

export function computeCotSignal(asset: string, market: string, records: CotRecord[]): CotSignal | null {
  if (records.length < 2) return null;
  const latest = records[records.length - 1];
  const window = records.slice(-52).map((r) => r.nonCommNet);
  const min = Math.min(...window);
  const max = Math.max(...window);
  const idx = max > min ? ((latest.nonCommNet - min) / (max - min)) * 100 : null;
  const oi = latest.openInterest || 1;
  const chgPctOi = latest.changeNonCommNet / oi;
  const idxPart = idx === null ? 0 : (idx - 50) / 50;
  const value = Math.max(-1, Math.min(1, 0.6 * idxPart + 0.4 * Math.tanh(chgPctOi / 0.02)));
  return {
    asset,
    market,
    reportDate: latest.reportDate,
    net: latest.nonCommNet,
    netChange: latest.changeNonCommNet,
    openInterest: latest.openInterest,
    cotIndex52w: idx === null ? null : Math.round(idx * 10) / 10,
    value,
    history: records.length,
  };
}

export async function refreshCot(force = false): Promise<void> {
  if (!force && signals.size && Date.now() - lastLoad < TTL) return;
  try {
    const codes = Object.values(COT_CODES).map((c) => `'${c.code}'`).join(',');
    const since = new Date(Date.now() - 420 * 86_400_000).toISOString().slice(0, 10);
    const where = `${COT_COLUMN_MAPPINGS.contractMarketCode} in (${codes}) AND ${COT_COLUMN_MAPPINGS.reportDate} >= '${since}'`;
    const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$where=${encodeURIComponent(where)}&$order=${COT_COLUMN_MAPPINGS.reportDate}%20DESC&$limit=5000`;
    const token = process.env.CFTC_APP_TOKEN || process.env.SOCRATA_APP_TOKEN;
    const rows = await fetchJson<RawCotRow[]>(url, { timeoutMs: 20_000, headers: token ? { 'X-App-Token': token } : {} });
    if (!Array.isArray(rows)) throw new Error('CFTC returned a non-array payload');
    const byCode = new Map<string, RawCotRow[]>();
    for (const r of rows) {
      const c = String(r.cftc_contract_market_code || '').trim();
      if (!byCode.has(c)) byCode.set(c, []);
      byCode.get(c)!.push(r);
    }
    const next = new Map<string, CotSignal>();
    for (const [asset, def] of Object.entries(COT_CODES)) {
      const recs = processCotHistory(byCode.get(def.code) || []);
      const sig = computeCotSignal(asset, def.name, recs);
      if (sig) next.set(asset, sig);
    }
    if (next.size) { signals = next; lastLoad = Date.now(); }
    markSuccess(COT_SOURCE_ID, next.size);
  } catch (err) {
    markFailure(COT_SOURCE_ID, err);
  }
}

export function getCotSignal(asset: string): CotSignal | null {
  return signals.get(asset) || null;
}

export function __setCotForTest(sig: CotSignal): void {
  signals.set(sig.asset, sig);
}
