/**
 * TRADER DNA — finds a trader's real edge and costly habits from their own closed trades, and
 * produces live discipline warnings. Pure functions over the journal; no invented numbers.
 */
import type { Trade } from '../types';

export interface Group { key: string; n: number; winRate: number; expR: number; pnl: number }
export interface Habit { id: string; title: string; n: number; expR: number; otherExpR: number; pnl: number; detail: string }
export interface DnaReport {
  closed: number; winRate: number; expR: number; profitFactor: number | null; pnl: number; avgWinR: number; avgLossR: number;
  edges: Array<Group & { dim: string }>; leaks: Array<Group & { dim: string }>;
  habits: Habit[]; rules: string[]; enoughData: boolean;
}

const isClosed = (t: Trade) => t.status !== 'OPEN' && (t.result != null || Number.isFinite(t.profitLoss));
const r = (t: Trade) => {
  if (Number.isFinite(t.rMultiple) && t.rMultiple !== 0) return t.rMultiple;
  const risk = t.riskAmount || t.riskDollars || 0;
  return risk > 0 && Number.isFinite(t.profitLoss) ? t.profitLoss / risk : t.profitLoss > 0 ? 1 : t.profitLoss < 0 ? -1 : 0;
};
const won = (t: Trade) => (t.result ? t.result === 'WIN' : t.profitLoss > 0);
const tsOf = (t: Trade) => { const d = Date.parse(`${t.date}T${(t.time || '00:00').slice(0, 5)}:00+05:00`); return Number.isFinite(d) ? d : 0; };
const stats = (ts: Trade[]) => ({ n: ts.length, winRate: ts.length ? Math.round((ts.filter(won).length / ts.length) * 100) : 0, expR: ts.length ? Number((ts.reduce((s, t) => s + r(t), 0) / ts.length).toFixed(2)) : 0, pnl: Number(ts.reduce((s, t) => s + (t.profitLoss || 0), 0).toFixed(2)) });
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hourBucket = (t: Trade) => { const h = Number((t.time || '').slice(0, 2)); if (!Number.isFinite(h)) return null; const a = Math.floor(h / 2) * 2; return `${String(a).padStart(2, '0')}:00–${String(a + 2).padStart(2, '0')}:00 PKT`; };
const SESSION: Record<string, string> = { ASIAN: 'Asian session', LONDON: 'London session', NEW_YORK: 'New York session', LONDON_NY_OVERLAP: 'London/NY overlap' };

const DIMS: Array<{ dim: string; of: (t: Trade) => string | null | undefined }> = [
  { dim: 'Instrument', of: (t) => t.instrument },
  { dim: 'Session', of: (t) => SESSION[t.session] || t.session },
  { dim: 'Setup', of: (t) => t.strategyModel || t.sbtModel || t.strategy },
  { dim: 'Direction', of: (t) => t.direction },
  { dim: 'Time of day', of: hourBucket },
  { dim: 'Weekday', of: (t) => { const d = tsOf(t); return d ? WD[new Date(d + 5 * 3_600_000).getUTCDay()] : null; } },
  { dim: 'Timeframe', of: (t) => t.timeframe },
  { dim: 'Mood before entry', of: (t) => t.preEmotion },
];

export function analyseDna(all: Trade[]): DnaReport {
  const tr = all.filter(isClosed).sort((a, b) => tsOf(a) - tsOf(b));
  const base = stats(tr);
  const wins = tr.filter(won), losses = tr.filter((t) => !won(t) && (t.profitLoss || 0) < 0);
  const gw = wins.reduce((s, t) => s + Math.max(0, t.profitLoss || 0), 0), gl = Math.abs(losses.reduce((s, t) => s + Math.min(0, t.profitLoss || 0), 0));
  const minN = tr.length >= 40 ? 5 : 3;

  const groups: Array<Group & { dim: string }> = [];
  for (const d of DIMS) {
    const m = new Map<string, Trade[]>();
    for (const t of tr) { const k = d.of(t); if (k == null || k === '') continue; const key = String(k); if (!m.has(key)) m.set(key, []); m.get(key)!.push(t); }
    if (m.size < 2) continue;
    for (const [key, ts] of m) if (ts.length >= minN) groups.push({ dim: d.dim, key, ...stats(ts) });
  }
  const edges = groups.filter((g) => g.expR > Math.max(0.2, base.expR)).sort((a, b) => b.expR * Math.sqrt(b.n) - a.expR * Math.sqrt(a.n)).slice(0, 5);
  const leaks = groups.filter((g) => g.expR < Math.min(0, base.expR - 0.2)).sort((a, b) => a.expR * Math.sqrt(a.n) - b.expR * Math.sqrt(b.n)).slice(0, 5);

  // Habits: compare the trades that match a behaviour with all the others.
  const habits: Habit[] = [];
  const habit = (id: string, title: string, pick: (t: Trade, i: number) => boolean, detail: (s: ReturnType<typeof stats>, o: ReturnType<typeof stats>) => string) => {
    const yes = tr.filter(pick), no = tr.filter((t, i) => !pick(t, i));
    if (yes.length < Math.max(2, Math.ceil(minN / 2)) || !no.length) return;
    const s = stats(yes), o = stats(no);
    if (s.expR >= o.expR) return; // only report behaviours that actually cost money
    habits.push({ id, title, n: s.n, expR: s.expR, otherExpR: o.expR, pnl: s.pnl, detail: detail(s, o) });
  };
  habit('revenge', 'Revenge trading', (t, i) => { const prev = tr[i - 1]; return !!prev && prev.date === t.date && !won(prev) && (prev.profitLoss || 0) < 0 && tsOf(t) - tsOf(prev) <= 60 * 60_000; },
    (s, o) => `${s.n} trades opened within an hour of a loss averaged ${s.expR}R, versus ${o.expR}R for the rest.`);
  const perDay = new Map<string, number>();
  const nthOfDay = tr.map((t) => { const c = (perDay.get(t.date) || 0) + 1; perDay.set(t.date, c); return c; });
  habit('overtrading', 'Overtrading', (_t, i) => nthOfDay[i] > 3, (s, o) => `Your 4th and later trades of a day averaged ${s.expR}R (${s.n} trades); the first three averaged ${o.expR}R.`);
  const risks = tr.map((t) => t.riskPercent || 0).filter((x) => x > 0).sort((a, b) => a - b);
  const medRisk = risks.length ? risks[Math.floor(risks.length / 2)] : 0;
  if (medRisk > 0) habit('oversize', 'Oversizing', (t) => (t.riskPercent || 0) > medRisk * 1.5, (s, o) => `${s.n} trades risked over ${(medRisk * 1.5).toFixed(1)}% (1.5× your usual ${medRisk.toFixed(1)}%) and averaged ${s.expR}R, versus ${o.expR}R.`);
  habit('rules', 'Breaking your own rules', (t) => !!t.ruleViolation && t.ruleViolation !== 'NONE', (s, o) => `${s.n} trades with a rule break averaged ${s.expR}R and cost $${Math.abs(s.pnl).toFixed(2)} in total; rule-following trades averaged ${o.expR}R.`);
  habit('emotion', 'Trading in a bad state of mind', (t) => !!t.preEmotion && !['CALM', 'FOCUSED', 'CONFIDENT', 'NEUTRAL', 'DISCIPLINED'].includes(String(t.preEmotion)), (s, o) => `${s.n} trades entered while not calm or focused averaged ${s.expR}R, versus ${o.expR}R.`);
  habit('lowgrade', 'Taking low-quality setups', (t) => t.grade === 'C' || t.grade === 'F', (s, o) => `${s.n} trades you graded C or F averaged ${s.expR}R, versus ${o.expR}R for A/B setups.`);
  habits.sort((a, b) => a.pnl - b.pnl);

  // Personal rules, written from the measured results.
  const rules: string[] = [];
  for (const h of habits.slice(0, 3)) {
    if (h.id === 'revenge') rules.push('After a losing trade, wait at least 60 minutes before the next entry.');
    if (h.id === 'overtrading') rules.push('Stop after 3 trades a day.');
    if (h.id === 'oversize') rules.push(`Never risk more than ${(medRisk * 1.2).toFixed(1)}% on one trade.`);
    if (h.id === 'rules') rules.push('If a setup breaks one of your rules, skip it — no exceptions.');
    if (h.id === 'emotion') rules.push('Only trade when you mark yourself calm, focused or confident.');
    if (h.id === 'lowgrade') rules.push('Only take setups you would grade A or B.');
  }
  for (const l of leaks.slice(0, 2)) rules.push(`Avoid ${l.dim.toLowerCase()} "${l.key}" — ${l.n} trades averaged ${l.expR}R.`);
  if (edges[0]) rules.push(`Focus on ${edges[0].dim.toLowerCase()} "${edges[0].key}" — ${edges[0].n} trades averaged +${edges[0].expR}R.`);

  return {
    closed: tr.length, winRate: base.winRate, expR: base.expR, pnl: base.pnl,
    profitFactor: gl > 0 ? Number((gw / gl).toFixed(2)) : null,
    avgWinR: wins.length ? Number((wins.reduce((s, t) => s + r(t), 0) / wins.length).toFixed(2)) : 0,
    avgLossR: losses.length ? Number((losses.reduce((s, t) => s + r(t), 0) / losses.length).toFixed(2)) : 0,
    edges, leaks, habits, rules, enoughData: tr.length >= 10,
  };
}

export interface LiveWarning { level: 'high' | 'medium'; text: string }
/** Warnings for right now, from today's trades and the trader's measured weak spots. */
export function liveWarnings(all: Trade[], report: DnaReport, now = Date.now()): LiveWarning[] {
  const out: LiveWarning[] = [];
  const pk = new Date(now + 5 * 3_600_000);
  const today = pk.toISOString().slice(0, 10);
  const todays = all.filter((t) => t.date === today).sort((a, b) => tsOf(a) - tsOf(b));
  const closedToday = todays.filter(isClosed);
  const lossesToday = closedToday.filter((t) => (t.profitLoss || 0) < 0);
  const last = closedToday[closedToday.length - 1];
  if (last && (last.profitLoss || 0) < 0 && now - tsOf(last) < 60 * 60_000) out.push({ level: 'high', text: `Your last trade was a loss ${Math.max(1, Math.round((now - tsOf(last)) / 60_000))} min ago. Wait before the next entry — revenge trades are where traders give it back.` });
  if (lossesToday.length >= 2) out.push({ level: 'high', text: `${lossesToday.length} losses today. Consider stopping for the day — protect your account and your head.` });
  if (todays.length >= 3 && report.habits.some((h) => h.id === 'overtrading')) out.push({ level: 'medium', text: `You have already taken ${todays.length} trades today, and your trades after the 3rd lose money on average.` });
  const hb = `${String(Math.floor(pk.getUTCHours() / 2) * 2).padStart(2, '0')}:00–${String(Math.floor(pk.getUTCHours() / 2) * 2 + 2).padStart(2, '0')}:00 PKT`;
  const badHour = report.leaks.find((l) => l.dim === 'Time of day' && l.key === hb);
  if (badHour) out.push({ level: 'medium', text: `${hb} is one of your weakest times: ${badHour.n} trades averaged ${badHour.expR}R.` });
  const badDay = report.leaks.find((l) => l.dim === 'Weekday' && l.key === WD[pk.getUTCDay()]);
  if (badDay) out.push({ level: 'medium', text: `${badDay.key}s are weak for you: ${badDay.n} trades averaged ${badDay.expR}R.` });
  return out;
}
