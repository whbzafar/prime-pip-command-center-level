/**
 * DAILY BRIEFING — one page for the trading day, assembled only from live engines already in the app:
 *   • strongest / weakest pairs by the fundamentals engine (confidence ≥ 50)
 *   • the best technical + fundamental set-ups from the Market Regime Radar
 *   • high-impact releases in the next 24 h (what to avoid / be ready for), in Pakistan time
 * Nothing is invented: a section is empty when its source has nothing to say. Educational — not financial advice.
 */
import { Router, type Request, type Response } from 'express';
import { getSnapshot } from '../macro/macroService.js';
import { getRadarBody } from './radarRoutes.js';

export const briefingRouter = Router();

export function buildBriefing(snap: any, radar: any, now = Date.now()) {
  const pairs = (snap?.pairs || []).filter((p: any) => p.score !== null && p.confidence >= 50 && (p.assetClass === 'FOREX' || p.assetClass === 'COMMODITIES' || p.assetClass === 'INDICES' || p.assetClass === 'CRYPTO'));
  const slim = (p: any) => ({ symbol: p.symbol, display: p.display, score: Math.round(p.score), confidence: Math.round(p.confidence), bias: p.bias, why: String(p.explanation || '').slice(0, 220) });
  const bullish = [...pairs].filter((p: any) => p.score >= 15).sort((a: any, b: any) => b.score - a.score).slice(0, 4).map(slim);
  const bearish = [...pairs].filter((p: any) => p.score <= -15).sort((a: any, b: any) => a.score - b.score).slice(0, 4).map(slim);
  const events = (snap?.upcoming || [])
    .filter((u: any) => String(u.importance).toUpperCase() === 'HIGH')
    .map((u: any) => ({ currency: u.asset, title: u.title, at: u.scheduledAt, inHours: Number(((Date.parse(u.scheduledAt) - now) / 3_600_000).toFixed(1)), forecast: u.forecast ?? null, previous: u.previous ?? null }))
    .filter((u: any) => u.inHours > -1 && u.inHours <= 24)
    .sort((a: any, b: any) => a.inHours - b.inHours).slice(0, 10);
  const newsSoon = new Set(events.filter((e: any) => e.inHours <= 6).map((e: any) => String(e.currency).toUpperCase()));
  const setups = (radar?.rows || []).filter((r: any) => r.side !== 'NEUTRAL' && r.score >= 35).slice(0, 5).map((r: any) => ({
    symbol: r.symbol, side: r.side, regime: r.regime, score: r.score, alignment: r.alignment, fundamentals: r.fundamentals, setup: r.setup, nextNewsHours: r.events?.[0]?.inHours ?? null,
  }));
  const avoid = (radar?.rows || []).filter((r: any) => (r.events || []).some((e: any) => e.inHours <= 3 && e.inHours > -1)).map((r: any) => r.symbol).slice(0, 12);
  const lines: string[] = [];
  if (bullish[0]) lines.push(`Strongest fundamentals: ${bullish.slice(0, 2).map((p: any) => `${p.display} (${p.score > 0 ? '+' : ''}${p.score})`).join(', ')}.`);
  if (bearish[0]) lines.push(`Weakest: ${bearish.slice(0, 2).map((p: any) => `${p.display} (${p.score})`).join(', ')}.`);
  if (setups[0]) lines.push(`Best live set-up: ${setups[0].side.toLowerCase()} ${setups[0].symbol} — ${setups[0].regime.toLowerCase()}${setups[0].alignment === 'aligned' ? ', backed by fundamentals' : ''}.`);
  if (events[0]) lines.push(`Next high-impact release: ${events[0].currency} ${events[0].title} in ${events[0].inHours < 1 ? 'under an hour' : `${events[0].inHours} h`}.`);
  else lines.push('No high-impact releases in the next 24 hours for the tracked currencies.');
  return { bullish, bearish, events, setups, avoid, newsSoonCurrencies: [...newsSoon], headline: lines };
}

briefingRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const [snap, radar] = await Promise.all([getSnapshot().catch(() => null), getRadarBody()]);
    if (!snap && !radar) return res.status(503).json({ ok: false, error: 'Market engines are warming up — try again in a minute.' });
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ ok: true, generatedAt: new Date().toISOString(), snapshotAt: snap?.generatedAt ?? null, radarAt: radar?.generatedAt ?? null, ...buildBriefing(snap, radar),
      disclaimer: 'Educational analysis from live data. Not financial advice.' });
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Briefing unavailable.') }); }
});
