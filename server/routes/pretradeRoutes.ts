/**
 * PRE-TRADE CHECKLIST — one pass before you click Buy/Sell, built only from live engines:
 *   1. News risk      — high-impact release for either currency leg within the next 4 h (or in the last 30 min)
 *   2. Correlation    — is the new trade the same bet as one you already hold (90-day correlation)?
 *   3. Portfolio risk — correlation-adjusted risk before vs after, and the size of this single trade
 *   4. Fundamentals   — does the live fundamentals score agree with your direction?
 * Each check is pass / warn / fail, or "skip" when its data source has nothing — never a guess. Educational, not advice.
 */
import { Router, type Request, type Response } from 'express';
import { getSnapshot } from '../macro/macroService.js';
import { analyseExposure, getCorrFn, legsOf, type Position } from './correlationRoutes.js';

export const pretradeRouter = Router();
export type Status = 'pass' | 'warn' | 'fail' | 'skip';
export interface Check { id: string; title: string; status: Status; detail: string }
export interface Ctx { corr: ((a: string, b: string) => number | null) | null; snap: any | null; now?: number }

export function buildChecklist(trade: Position, open: Position[], ctx: Ctx) {
  const now = ctx.now ?? Date.now();
  const checks: Check[] = [];

  // 1 — news
  if (!ctx.snap) checks.push({ id: 'news', title: 'News risk', status: 'skip', detail: 'Economic calendar is not available right now — check it manually.' });
  else {
    const ccys = new Set(legsOf(trade.symbol, trade.side).map(([c]) => c));
    const hits = (ctx.snap.upcoming || [])
      .filter((u: any) => String(u.importance).toUpperCase() === 'HIGH' && ccys.has(String(u.asset).toUpperCase()))
      .map((u: any) => ({ ...u, h: (Date.parse(u.scheduledAt) - now) / 3_600_000 }))
      .filter((u: any) => u.h > -0.5 && u.h <= 4).sort((a: any, b: any) => a.h - b.h);
    if (!hits.length) checks.push({ id: 'news', title: 'News risk', status: 'pass', detail: 'No high-impact release for these currencies in the next 4 hours.' });
    else {
      const e = hits[0]; const when = e.h < 0 ? 'just released' : e.h < 1 ? `in ${Math.max(1, Math.round(e.h * 60))} min` : `in ${e.h.toFixed(1)} h`;
      checks.push({ id: 'news', title: 'News risk', status: e.h <= 1 ? 'fail' : 'warn', detail: `${e.asset} ${e.title} ${when}. Spreads and slippage spike around it.` });
    }
  }

  // 2 — correlation with open trades
  if (!open.length) checks.push({ id: 'corr', title: 'Correlation with open trades', status: 'pass', detail: 'You have no other open trades to overlap with.' });
  else if (!ctx.corr) checks.push({ id: 'corr', title: 'Correlation with open trades', status: 'skip', detail: 'Live correlation data is not available right now.' });
  else {
    const dup: string[] = []; const unknown: string[] = [];
    for (const p of open) {
      const c = ctx.corr(trade.symbol, p.symbol);
      if (c === null) { unknown.push(p.symbol); continue; }
      if (Math.abs(c) >= 0.6 && ((trade.side === p.side) === (c > 0))) dup.push(`${p.side === 'LONG' ? 'long' : 'short'} ${p.symbol} (${c.toFixed(2)})`);
    }
    if (dup.length) checks.push({ id: 'corr', title: 'Correlation with open trades', status: 'warn', detail: `Same bet as ${dup.join(', ')} — you would be doubling the risk.` });
    else checks.push({ id: 'corr', title: 'Correlation with open trades', status: 'pass', detail: unknown.length ? `No overlap found (no data for ${unknown.join(', ')}).` : 'Not strongly correlated with anything you already hold.' });
  }

  // 3 — risk size
  const single = trade.riskPct;
  if (ctx.corr) {
    const before = analyseExposure(open, ctx.corr).adjustedRiskPct, after = analyseExposure([...open, trade], ctx.corr).adjustedRiskPct;
    const st: Status = after > 5 || single > 3 ? 'fail' : after > 3 || single > 2 ? 'warn' : 'pass';
    checks.push({ id: 'risk', title: 'Risk size', status: st, detail: `This trade risks ${single}%. Real portfolio risk (correlation-adjusted) goes from ${before}% to ${after}%.` });
  } else {
    const total = single + open.reduce((a, p) => a + p.riskPct, 0);
    checks.push({ id: 'risk', title: 'Risk size', status: total > 5 || single > 3 ? 'fail' : total > 3 || single > 2 ? 'warn' : 'pass', detail: `This trade risks ${single}%; ${total.toFixed(2)}% in total if all stops hit (correlation not factored — data unavailable).` });
  }

  // 4 — fundamentals
  const row = (ctx.snap?.pairs || []).find((p: any) => String(p.symbol).toUpperCase() === trade.symbol);
  if (!row || row.score === null || row.score === undefined || row.confidence < 50) checks.push({ id: 'fund', title: 'Fundamentals', status: 'skip', detail: 'No confident fundamental read on this instrument right now.' });
  else {
    const dir = trade.side === 'LONG' ? 1 : -1, agree = row.score * dir;
    const s = Math.round(row.score);
    checks.push(agree >= 15 ? { id: 'fund', title: 'Fundamentals', status: 'pass', detail: `Fundamental score ${s > 0 ? '+' : ''}${s} supports a ${trade.side.toLowerCase()}.` }
      : agree <= -15 ? { id: 'fund', title: 'Fundamentals', status: 'warn', detail: `Fundamental score ${s > 0 ? '+' : ''}${s} points the other way — you would be trading against the macro picture.` }
      : { id: 'fund', title: 'Fundamentals', status: 'pass', detail: `Fundamentals are neutral (${s > 0 ? '+' : ''}${s}); the trade rests on your technical set-up.` });
  }

  const fails = checks.filter((c) => c.status === 'fail').length, warns = checks.filter((c) => c.status === 'warn').length;
  const verdict = fails ? 'stop' : warns ? 'caution' : 'clear';
  const headline = verdict === 'stop' ? 'Not now — fix the red items first.' : verdict === 'caution' ? 'Proceed carefully — review the amber items.' : 'No red flags from the live data.';
  return { verdict, headline, checks };
}

pretradeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const clean = (p: any): Position => ({ symbol: String(p?.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), side: p?.side === 'SHORT' ? 'SHORT' : 'LONG', riskPct: Number(p?.riskPct) });
    const trade = clean(req.body?.trade);
    if (!trade.symbol || !Number.isFinite(trade.riskPct) || trade.riskPct <= 0) return res.status(400).json({ ok: false, error: 'Enter the instrument and the % you are risking.' });
    const open = (Array.isArray(req.body?.open) ? req.body.open.slice(0, 20) : []).map(clean).filter((p: Position) => p.symbol && Number.isFinite(p.riskPct) && p.riskPct > 0);
    const [snap, corr] = await Promise.all([getSnapshot().catch(() => null), getCorrFn().catch(() => null)]);
    res.json({ ok: true, generatedAt: new Date().toISOString(), ...buildChecklist(trade, open, { snap, corr }), disclaimer: 'Educational checklist from live data. Not financial advice.' });
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Checklist unavailable.') }); }
});
