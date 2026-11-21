/**
 * SUPPLEMENTAL INDICATORS — real published statistics that the TradingView calendar does not carry
 * (Swiss and New Zealand core inflation). Sourced from the OECD Main Economic Indicators via FRED's
 * keyless CSV download and injected as calendar-shaped events so the normal scoring path applies.
 * Nothing is estimated: if the download fails, the indicator simply stays "missing".
 */
import { fetchText, markFailure, markSuccess, registerSource, setSourceNote } from './http.js';
import type { TvEvent } from './tvCalendar.js';

export const SUPP_SOURCE_ID = 'oecd_supplemental';
registerSource(SUPP_SOURCE_ID, 'OECD supplemental inflation (via FRED)', 'https://fred.stlouisfed.org/',
  'OECD core inflation (CPI ex food & energy, YoY) for Switzerland and New Zealand, fills the gap the calendar leaves.');

interface Spec { id: string; country: string; currency: string; title: string; lagDays: number; period: 'M' | 'Q' }
const SPECS: Spec[] = [
  { id: 'CPGRLE01CHM659N', country: 'CH', currency: 'CHF', title: 'Core Inflation Rate YoY', lagDays: 12, period: 'M' },
  { id: 'CPGRLE01NZQ659N', country: 'NZ', currency: 'NZD', title: 'Core Inflation Rate YoY', lagDays: 20, period: 'Q' },
];

const store = new Map<string, TvEvent>();
export const getSupplementalEvents = (): TvEvent[] => [...store.values()];

export function parseCsv(csv: string): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (const l of csv.split(/\r?\n/)) {
    const [d, v] = l.split(',');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) continue;
    const n = Number(v);
    if (v && Number.isFinite(n) && Math.abs(n) < 60) out.push({ date: d, value: n });
  }
  return out;
}

export async function refreshSupplemental(): Promise<void> {
  const since = new Date(Date.now() - 900 * 86_400_000).toISOString().slice(0, 10);
  const notes: string[] = []; let ok = 0;
  await Promise.all(SPECS.map(async (s) => {
    try {
      const pts = parseCsv(await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.id}&cosd=${since}`, { timeoutMs: 15_000, retries: 1 }));
      if (pts.length < 3) throw new Error(`only ${pts.length} points`);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; const span = s.period === 'Q' ? 92 : 31;
        const ts = Math.min(Date.parse(p.date) + (span + s.lagDays) * 86_400_000, Date.now());
        const prev = i > 0 ? pts[i - 1].value : null;
        const id = `supp:${s.country}:core:${p.date}`;
        store.set(id, {
          id, title: s.title, indicator: 'CORE CPI YY', key: s.title.toLowerCase(), indicatorKey: 'core cpi yy', country: s.country, currency: s.currency,
          timestamp: ts, iso: new Date(ts).toISOString(), period: p.date.slice(0, 7), actual: p.value, forecast: null, previous: prev, unit: '%', scale: '',
          importance: 1, source: 'OECD MEI via FRED', sourceUrl: `https://fred.stlouisfed.org/series/${s.id}`, ticker: s.id,
        });
      }
      ok++; notes.push(`${s.currency} latest ${pts[pts.length - 1].date} = ${pts[pts.length - 1].value}%`);
    } catch (e: any) { notes.push(`${s.currency} failed: ${String(e?.message || e).slice(0, 80)}`); }
  }));
  setSourceNote(SUPP_SOURCE_ID, notes.join(' | '));
  if (ok) markSuccess(SUPP_SOURCE_ID, store.size); else markFailure(SUPP_SOURCE_ID, notes.join(' | '));
}
