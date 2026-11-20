/**
 * Government bond yields from the OFFICIAL publishers (no keys, no estimates).
 * Yield differentials versus US Treasuries are among the strongest short/medium-term FX drivers.
 *
 *   CAD  Bank of Canada Valet API (2Y / 10Y benchmark)
 *   EUR  ECB euro-area AAA government yield curve (2Y / 10Y spot)
 *   JPY  Japan Ministry of Finance JGB daily curve (2Y / 10Y)
 *   AUD  Reserve Bank of Australia table F2 (2Y / 10Y)
 *   CHF  Swiss National Bank data portal (2Y / 10Y Confederation)
 *   GBP  Bank of England nominal par yield (10Y)
 * NZD has no free machine-readable daily yield feed, so it is reported as unavailable instead of guessed.
 * Each country is fetched on its own: one publisher being down never affects the others.
 */
import { fetchText, fetchJson, fetchWithRetry, markFailure, markSuccess, registerSource, setSourceNote, toNum } from './http.js';
import type { SeriesPoint } from './fred.js';

export const YIELDS_SOURCE_ID = 'gov_yields';
registerSource(YIELDS_SOURCE_ID, 'Government bond yields (central banks / treasuries)', 'https://www.bankofcanada.ca/valet/',
  'Official daily 2Y / 10Y yields: Bank of Canada, ECB, Japan MoF, RBA, SNB, Bank of England.');

export type Tenor = '2Y' | '10Y';
let jpyInfo = '';
const store = new Map<string, SeriesPoint[]>(); // `${CCY}_${tenor}`
const origin = new Map<string, string>();
let lastRun = 0;
const TTL = 3 * 60 * 60 * 1000;
const DAYS = 200;

export const yieldSourceOf = (ccy: string): string => origin.get(ccy) || '';
export function getYield(ccy: string, tenor: Tenor): SeriesPoint[] { return store.get(`${ccy}_${tenor}`) || []; }
export function __setYieldForTest(ccy: string, tenor: Tenor, pts: SeriesPoint[]): void { store.set(`${ccy}_${tenor}`, pts); }

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
const sinceIso = () => new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
const plausible = (v: number | null): v is number => v !== null && v > -2 && v < 30;
const sorted = (m: Map<string, number>): SeriesPoint[] => [...m].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));

function put(ccy: string, tenor: Tenor, m: Map<string, number>, from: string): void {
  const pts = sorted(m);
  if (pts.length >= 10) { store.set(`${ccy}_${tenor}`, pts); origin.set(ccy, from); }
}

/** Split one CSV line honouring double quotes. */
function cells(line: string, sep = ','): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

// ───────────────────────────────────────── Canada
export function parseBoc(json: any): { two: Map<string, number>; ten: Map<string, number> } {
  const two = new Map<string, number>(); const ten = new Map<string, number>();
  for (const o of json?.observations || []) {
    const d = String(o.d || '');
    const a = toNum(o['BD.CDN.2YR.DQ.YLD']?.v); const b = toNum(o['BD.CDN.10YR.DQ.YLD']?.v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { if (plausible(a)) two.set(d, a); if (plausible(b)) ten.set(d, b); }
  }
  return { two, ten };
}
async function loadCad(): Promise<void> {
  const j = await fetchJson<any>(`https://www.bankofcanada.ca/valet/observations/BD.CDN.2YR.DQ.YLD,BD.CDN.10YR.DQ.YLD/json?start_date=${sinceIso()}`, { timeoutMs: 15_000, retries: 1 });
  const { two, ten } = parseBoc(j);
  put('CAD', '2Y', two, 'Bank of Canada Valet API'); put('CAD', '10Y', ten, 'Bank of Canada Valet API');
}

// ───────────────────────────────────────── Euro area
export function parseEcb(csv: string): Map<string, number> {
  const lines = csv.trim().split(/\r?\n/);
  const head = cells(lines[0]);
  const iD = head.indexOf('TIME_PERIOD'); const iV = head.indexOf('OBS_VALUE');
  const out = new Map<string, number>();
  if (iD < 0 || iV < 0) return out;
  for (const l of lines.slice(1)) { const c = cells(l); const v = toNum(c[iV]); if (/^\d{4}-\d{2}-\d{2}$/.test(c[iD] || '') && plausible(v)) out.set(c[iD], v); }
  return out;
}
async function loadEur(): Promise<void> {
  for (const t of ['2Y', '10Y'] as Tenor[]) {
    const csv = await fetchText(`https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_${t}?startPeriod=${sinceIso()}&format=csvdata`, { timeoutMs: 15_000, retries: 1 });
    put('EUR', t, parseEcb(csv), 'ECB euro-area AAA government yield curve');
  }
}

// ───────────────────────────────────────── Japan
export function parseMof(csv: string): { two: Map<string, number>; ten: Map<string, number> } {
  const lines = csv.split(/\r?\n/);
  const hi = lines.findIndex((l) => /^"?(date|基準日)"?\s*,/i.test(l.trim()));
  const two = new Map<string, number>(); const ten = new Map<string, number>();
  if (hi < 0) return { two, ten };
  const head = cells(lines[hi]).map((h) => h.toUpperCase().replace('年', 'Y'));
  const i2 = head.indexOf('2Y'); const i10 = head.indexOf('10Y');
  for (const l of lines.slice(hi + 1)) {
    const c = cells(l);
    let d = '';
    const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(c[0] || '');
    const r = /^R(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/i.exec(c[0] || ''); // Reiwa era, e.g. R8.11.18
    if (m) d = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    else if (r) d = `${2018 + Number(r[1])}-${r[2].padStart(2, '0')}-${r[3].padStart(2, '0')}`;
    if (!d) continue;
    const a = toNum(c[i2]); const b = toNum(c[i10]);
    if (i2 >= 0 && plausible(a)) two.set(d, a);
    if (i10 >= 0 && plausible(b)) ten.set(d, b);
  }
  return { two, ten };
}
/** MoF publishes Shift-JIS files: decode the bytes properly (UTF-8 turns them into garbage). */
async function bytesText(url: string, headers?: Record<string, string>): Promise<string> {
  const res = await fetchWithRetry(url, { timeoutMs: 25_000, retries: 1, headers });
  const buf = await res.arrayBuffer();
  try { return new TextDecoder('shift_jis').decode(buf); } catch { return new TextDecoder().decode(buf); }
}
const BROWSER_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'text/csv,text/plain,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' };
async function loadJpy(): Promise<void> {
  // Full history first (needed for the 21-day comparison), then the current-month file for the latest days.
  const urls = [
    'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcm_all.csv',
    'https://www.mof.go.jp/jgbs/reference/interest_rate/historical/jgbcm_all.csv',
    'https://www.mof.go.jp/english/jgbs/reference/interest_rate/historical/jgbcm_all.csv',
    'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcm.csv',
    'https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv',
    'https://www.mof.go.jp/english/jgbs/reference/interest_rate/jgbcm.csv',
  ];
  const two = new Map<string, number>(); const ten = new Map<string, number>();
  const errs: string[] = []; let got = 0;
  // The ministry moves its files around: also read the links straight from its publication page.
  for (const page of ['https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/index.htm', 'https://www.mof.go.jp/english/jgbs/reference/interest_rate/index.htm']) {
    try {
      const html = await bytesText(page, BROWSER_HEADERS);
      const found = [...html.matchAll(/href="([^"]*jgbcm[^"]*\.csv)"/gi)].map((m) => new URL(m[1], page).toString());
      for (const f of found) if (!urls.includes(f)) urls.unshift(f);
      if (found.length) break;
    } catch (e: any) { errs.push(`page: ${String(e?.message || e).slice(0, 30)}`); }
  }
  for (const u of urls) {
    try {
      const r = parseMof(await bytesText(u, BROWSER_HEADERS));
      if (r.two.size || r.ten.size) { got++; r.two.forEach((v, k) => two.set(k, v)); r.ten.forEach((v, k) => ten.set(k, v)); }
      else errs.push(`${u.slice(-34)}: 0 rows`);
    } catch (e: any) { errs.push(`${u.slice(-28)}: ${String(e?.message || e).slice(0, 30)}`); }
  }
  const cut = sinceIso();
  const trim = (m: Map<string, number>) => new Map([...m].filter(([d]) => d >= cut));
  jpyInfo = `JPY: ${got} files, ${ten.size} daily rows, ${errs.length} issues (${errs.join('; ').slice(0, 160)})`;
  put('JPY', '2Y', trim(two), 'Japan Ministry of Finance JGB curve'); put('JPY', '10Y', trim(ten), 'Japan Ministry of Finance JGB curve');
  if (!store.has('JPY_10Y') && !store.has('JPY_2Y')) throw new Error(`MoF: ${got} files parsed, ${two.size}/${ten.size} rows; ${errs.join('; ')}`);
}

// ───────────────────────────────────────── Australia
export function parseRba(csv: string): { two: Map<string, number>; ten: Map<string, number> } {
  const lines = csv.split(/\r?\n/);
  const two = new Map<string, number>(); const ten = new Map<string, number>();
  const titleRow = lines.map((l) => cells(l)).find((c) => /^title$/i.test(c[0] || '')) || [];
  const idRow = lines.map((l) => cells(l)).find((c) => /^series id$/i.test(c[0] || '')) || [];
  const find = (re: RegExp, id: RegExp) => { for (let i = 1; i < Math.max(titleRow.length, idRow.length); i++) if (re.test(titleRow[i] || '') || id.test(idRow[i] || '')) return i; return -1; };
  const i2 = find(/\b2[- ]year\b.*government|government.*\b2[- ]year\b/i, /FCMYGBAG2(?!\d)/i);
  const i10 = find(/\b10[- ]year\b.*government|government.*\b10[- ]year\b/i, /FCMYGBAG10(?!\d)/i);
  for (const l of lines) {
    const c = cells(l);
    let d = '';
    const a = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(c[0] || '');
    const b = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(c[0] || '');
    if (a) d = `${a[3]}-${MONTHS[a[2].toLowerCase()]}-${a[1].padStart(2, '0')}`;
    else if (b) d = `${b[3]}-${b[2].padStart(2, '0')}-${b[1].padStart(2, '0')}`;
    if (!d) continue;
    const v2 = i2 > 0 ? toNum(c[i2]) : null; const v10 = i10 > 0 ? toNum(c[i10]) : null;
    if (plausible(v2)) two.set(d, v2);
    if (plausible(v10)) ten.set(d, v10);
  }
  return { two, ten };
}
export async function loadAud(): Promise<void> {
  const csv = await fetchText('https://www.rba.gov.au/statistics/tables/csv/f2-data.csv', { timeoutMs: 20_000, retries: 1, headers: BROWSER_HEADERS });
  const { two, ten } = parseRba(csv);
  const cut = sinceIso();
  const trim = (m: Map<string, number>) => new Map([...m].filter(([d]) => d >= cut));
  if (!two.size && !ten.size) throw new Error(`RBA CSV parsed 0 rows (len ${csv.length}, head: ${JSON.stringify(csv.slice(0, 80))})`);
  put('AUD', '2Y', trim(two), 'Reserve Bank of Australia table F2'); put('AUD', '10Y', trim(ten), 'Reserve Bank of Australia table F2');
}

// ───────────────────────────────────────── Switzerland
export function parseSnb(csv: string): { two: Map<string, number>; ten: Map<string, number> } {
  const two = new Map<string, number>(); const ten = new Map<string, number>();
  for (const l of csv.split(/\r?\n/)) {
    const c = cells(l, ';');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0] || '')) continue;
    const v = toNum(c[c.length - 1]);
    if (!plausible(v)) continue;
    const k = (c[1] || '').toUpperCase();
    if (k === '2J' || k === '2Y') two.set(c[0], v);
    if (k === '10J' || k === '10Y') ten.set(c[0], v);
  }
  return { two, ten };
}
export async function loadChf(): Promise<void> {
  const csv = await fetchText(`https://data.snb.ch/api/cube/rendoblid/data/csv/en?fromDate=${sinceIso().slice(0, 7)}`, { timeoutMs: 20_000, retries: 1 });
  const { two, ten } = parseSnb(csv);
  if (!two.size && !ten.size) throw new Error(`SNB CSV parsed 0 rows (len ${csv.length}, head: ${JSON.stringify(csv.slice(0, 120))})`);
  put('CHF', '2Y', two, 'Swiss National Bank data portal'); put('CHF', '10Y', ten, 'Swiss National Bank data portal');
  if (!store.has('CHF_10Y') && !store.has('CHF_2Y')) throw new Error(`SNB returned too few daily points (2Y ${two.size}, 10Y ${ten.size}; sample ${JSON.stringify(csv.split(/\r?\n/).filter((l) => /^"?\d{4}-/.test(l)).slice(0, 2))})`);
}

// ───────────────────────────────────────── United Kingdom
export function parseBoe(csv: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of csv.split(/\r?\n/)) {
    const c = cells(l);
    const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(c[0] || '');
    if (!m) continue;
    const v = toNum(c[1]);
    if (plausible(v)) out.set(`${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`, v);
  }
  return out;
}
async function loadGbp(): Promise<void> {
  const from = new Date(Date.now() - DAYS * 86_400_000);
  const f = `${String(from.getUTCDate()).padStart(2, '0')}/${Object.keys(MONTHS)[from.getUTCMonth()].replace(/^./, (x) => x.toUpperCase())}/${from.getUTCFullYear()}`;
  const csv = await fetchText(`https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?csv.x=yes&Datefrom=${f}&Dateto=now&SeriesCodes=IUDMNPY&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`, { timeoutMs: 20_000, retries: 1 });
  put('GBP', '10Y', parseBoe(csv), 'Bank of England nominal par yield (10Y)');
}

const LOADERS: Array<[string, () => Promise<void>]> = [['CAD', loadCad], ['EUR', loadEur], ['JPY', loadJpy], ['GBP', loadGbp]];

export async function refreshYields(force = false): Promise<void> {
  if (!force && Date.now() - lastRun < TTL && store.size) return;
  lastRun = Date.now();
  const failed: string[] = [];
  await Promise.all(LOADERS.map(async ([ccy, fn]) => { try { await fn(); } catch (e: any) { failed.push(`${ccy}: ${e?.message || e}`); } }));
  const have = new Set([...store.keys()].map((k) => k.split('_')[0]));
  const missing = LOADERS.map(([c]) => c).filter((c) => !have.has(c));
  setSourceNote(YIELDS_SOURCE_ID, `Live for ${[...have].sort().join(', ') || 'none'}${missing.length ? `; unavailable right now: ${missing.join(', ')}` : ''}${failed.length ? ` [${failed.map((f) => f.slice(0, 90)).join(' | ')}]` : ''}. AUD/CHF/NZD: no free daily feed reachable (RBA blocks cloud servers, SNB is monthly). ${jpyInfo}`);
  if (have.size) markSuccess(YIELDS_SOURCE_ID, store.size);
  else markFailure(YIELDS_SOURCE_ID, failed.join(' | ') || 'no data');
}
