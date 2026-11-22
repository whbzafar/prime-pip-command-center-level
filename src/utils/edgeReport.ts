/**
 * PERSONAL EDGE REPORT — what the trader's OWN journal says about where they make and lose money.
 * Pure, deterministic, from the user's closed trades only. Every finding carries its sample size; groups with fewer than
 * MIN_N trades are never called an edge or a leak. Nothing here is projected or invented.
 */
import type { Trade } from '../types';

export const MIN_N = 6;

export interface Group { key: string; n: number; wins: number; winRate: number; avgR: number; totalR: number; pnl: number }
export interface Finding { kind: 'edge' | 'leak' | 'info'; dimension: string; text: string; n: number }
export interface EdgeReport {
  closed: number; avgR: number; totalR: number; winRate: number; profitFactor: number | null;
  dimensions: Record<string, Group[]>; findings: Finding[]; enough: boolean;
}

const closedOf = (trades: Trade[]) => trades.filter((t) => t.status !== 'OPEN' && Number.isFinite(t.profitLoss) && Number.isFinite(t.rMultiple));
const r2 = (x: number) => Number(x.toFixed(2));

export function groupBy(trades: Trade[], keyOf: (t: Trade) => string | null): Group[] {
  const m = new Map<string, Trade[]>();
  for (const t of trades) { const k = keyOf(t); if (k) m.set(k, [...(m.get(k) || []), t]); }
  return [...m.entries()].map(([key, ts]) => {
    const wins = ts.filter((t) => t.profitLoss > 0).length;
    const totalR = ts.reduce((a, t) => a + t.rMultiple, 0);
    return { key, n: ts.length, wins, winRate: Math.round((wins / ts.length) * 100), avgR: r2(totalR / ts.length), totalR: r2(totalR), pnl: r2(ts.reduce((a, t) => a + t.profitLoss, 0)) };
  }).sort((a, b) => b.avgR - a.avgR);
}

const ts = (t: Trade) => Date.parse(`${t.date}T${t.time || '00:00'}:00+05:00`);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hourBlock = (t: Trade) => { const h = Number((t.time || '').slice(0, 2)); if (!Number.isFinite(h)) return null; const a = Math.floor(h / 4) * 4; return `${String(a).padStart(2, '0')}:00–${String((a + 4) % 24).padStart(2, '0')}:00 PKT`; };
const dow = (t: Trade) => { const d = new Date(`${t.date}T12:00:00Z`); return Number.isNaN(d.getTime()) ? null : DAYS[d.getUTCDay()]; };

export function buildEdgeReport(all: Trade[]): EdgeReport {
  const c = closedOf(all).sort((a, b) => ts(a) - ts(b));
  const totalR = c.reduce((a, t) => a + t.rMultiple, 0);
  const wins = c.filter((t) => t.profitLoss > 0), losses = c.filter((t) => t.profitLoss < 0);
  const gp = wins.reduce((a, t) => a + t.profitLoss, 0), gl = Math.abs(losses.reduce((a, t) => a + t.profitLoss, 0));

  // trades taken within 60 minutes of a losing trade closing
  const afterLoss = new Set<string>();
  for (let i = 1; i < c.length; i++) if (c[i - 1].profitLoss < 0 && ts(c[i]) - ts(c[i - 1]) <= 60 * 60_000 && ts(c[i]) >= ts(c[i - 1])) afterLoss.add(c[i].id);

  const dimensions: Record<string, Group[]> = {
    'Instrument': groupBy(c, (t) => t.instrument || null),
    'Session': groupBy(c, (t) => String(t.session || '').replace(/_/g, ' ') || null),
    'Time of day': groupBy(c, hourBlock),
    'Day of week': groupBy(c, dow),
    'Direction': groupBy(c, (t) => t.direction || null),
    'Strategy': groupBy(c, (t) => (t.strategy ? String(t.strategy) : null)),
    'Mood before the trade': groupBy(c, (t) => (t.preEmotion ? String(t.preEmotion).replace(/_/g, ' ') : null)),
    'Rule discipline': groupBy(c, (t) => (t.ruleViolation === 'NONE' ? 'Followed the rules' : t.ruleViolation ? 'Broke a rule' : null)),
    'Right after a loss': groupBy(c, (t) => (afterLoss.has(t.id) ? 'Within 1 h of a loss' : 'Normal timing')),
  };

  const findings: Finding[] = [];
  for (const [dim, groups] of Object.entries(dimensions)) {
    if (dim === 'Rule discipline' || dim === 'Right after a loss') continue; // covered by dedicated findings below
    const ok = groups.filter((g) => g.n >= MIN_N);
    if (ok.length < 2) continue;
    const best = ok[0], worst = ok[ok.length - 1];
    if (best.avgR > 0.15 && best.avgR - worst.avgR >= 0.3) findings.push({ kind: 'edge', dimension: dim, n: best.n, text: `${dim}: your best is ${best.key} — ${best.avgR > 0 ? '+' : ''}${best.avgR}R per trade, ${best.winRate}% wins (${best.n} trades).` });
    if (worst.avgR < -0.15 && best.avgR - worst.avgR >= 0.3) findings.push({ kind: 'leak', dimension: dim, n: worst.n, text: `${dim}: ${worst.key} is losing you money — ${worst.avgR}R per trade, ${worst.winRate}% wins (${worst.n} trades, ${worst.pnl >= 0 ? '+' : ''}${worst.pnl} total).` });
  }
  const rule = dimensions['Rule discipline'].find((g) => g.key === 'Broke a rule'), clean = dimensions['Rule discipline'].find((g) => g.key === 'Followed the rules');
  if (rule && clean && rule.n >= MIN_N && clean.n >= MIN_N) findings.push({ kind: rule.avgR < clean.avgR ? 'leak' : 'info', dimension: 'Rule discipline', n: rule.n, text: `Breaking your rules averages ${rule.avgR}R versus ${clean.avgR}R when you follow them — ${rule.n} rule-breaking trades cost ${r2(rule.n * (clean.avgR - rule.avgR))}R compared with trading them cleanly.` });
  const rev = dimensions['Right after a loss'].find((g) => g.key === 'Within 1 h of a loss'), norm = dimensions['Right after a loss'].find((g) => g.key === 'Normal timing');
  if (rev && norm && rev.n >= MIN_N && norm.n >= MIN_N && rev.avgR + 0.2 < norm.avgR) findings.push({ kind: 'leak', dimension: 'Right after a loss', n: rev.n, text: `Trades taken within an hour of a loss average ${rev.avgR}R versus ${norm.avgR}R otherwise (${rev.n} trades) — a pause after a loss is protecting you.` });

  return {
    closed: c.length, avgR: c.length ? r2(totalR / c.length) : 0, totalR: r2(totalR),
    winRate: c.length ? Math.round((wins.length / c.length) * 100) : 0, profitFactor: gl > 0 ? r2(gp / gl) : null,
    dimensions, findings, enough: c.length >= 20,
  };
}
