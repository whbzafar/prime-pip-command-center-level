/**
 * Learning hub back-end:
 *   POST /api/bot/reservations        reserve a place for the SBT trading bot (public)
 *   POST /api/insights/feedback       "what is missing / how does this feel" (public)
 *   POST /api/insights/error          automatic error reports from the app (public, rate-limited)
 *   POST /api/insights/usage          which sections people open (counts only, no personal data)
 *   GET  /api/admin/hub               everything above, for the owner (mounted with requireDeveloper)
 * Stored privately (Redis, or the encrypted backup store) — never in the public bucket in readable form.
 */
import { Router, type Request, type Response, type RequestHandler } from 'express';
import crypto from 'crypto';
import { privateListGet, privateListUpdate } from '../durableStore.js';

const clip = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const hits = new Map<string, number[]>();
/** At most `max` requests per `windowMs` per visitor (in-memory, per server). */
function limited(req: Request, bucket: string, max: number, windowMs: number): boolean {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const k = `${bucket}:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)}`;
  const now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(k, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

const TIERS = new Set(['starter', 'pro', 'institutional']);

export function createHubRouter(requireDeveloper: RequestHandler) {
  const r = Router();

  r.post('/bot/reservations', async (req: Request, res: Response) => {
    if (limited(req, 'resv', 5, 3_600_000)) return res.status(429).json({ ok: false, error: 'Too many reservations from this connection. Please try again later.' });
    const b = req.body || {};
    const name = clip(b.name, 80);
    const contact = clip(b.contact, 120);
    const tier = clip(b.tier, 20);
    if (name.length < 2) return res.status(400).json({ ok: false, error: 'Please enter your name.' });
    if (contact.length < 5) return res.status(400).json({ ok: false, error: 'Please enter a WhatsApp number or email so we can reach you.' });
    if (!TIERS.has(tier)) return res.status(400).json({ ok: false, error: 'Please choose a plan.' });
    const rec = {
      id: 'R-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      createdAt: new Date().toISOString(), name, contact, tier,
      country: clip(b.country, 60), capital: clip(b.capital, 40), note: clip(b.note, 500), username: clip(b.username, 60),
      status: 'reserved',
    };
    try {
      await privateListUpdate('bot_reservations', (l) => [rec, ...l].slice(0, 2000));
      return res.json({ ok: true, reservation: { id: rec.id, tier: rec.tier, createdAt: rec.createdAt } });
    } catch (e: any) {
      return res.status(503).json({ ok: false, error: 'Reservations are temporarily unavailable. Please try again in a minute.' });
    }
  });

  r.post('/insights/feedback', async (req: Request, res: Response) => {
    if (limited(req, 'fb', 10, 3_600_000)) return res.status(429).json({ ok: false, error: 'Thank you — you have sent a lot already. Please try again later.' });
    const b = req.body || {};
    const text = clip(b.text, 2000);
    if (text.length < 3) return res.status(400).json({ ok: false, error: 'Please write a few words.' });
    const rec = { id: crypto.randomBytes(4).toString('hex'), at: new Date().toISOString(), kind: clip(b.kind, 20) || 'idea', section: clip(b.section, 60), text, username: clip(b.username, 60), status: 'new' };
    try { await privateListUpdate('hub_feedback', (l) => [rec, ...l].slice(0, 1000)); return res.json({ ok: true }); }
    catch { return res.status(503).json({ ok: false, error: 'Could not save right now. Please try again.' }); }
  });

  r.post('/insights/error', async (req: Request, res: Response) => {
    if (limited(req, 'err', 20, 3_600_000)) return res.json({ ok: true });
    const b = req.body || {};
    const message = clip(b.message, 300);
    if (!message) return res.json({ ok: true });
    const where = clip(b.where, 120);
    const key = crypto.createHash('sha1').update(message + '|' + clip(b.stack, 200)).digest('hex').slice(0, 12);
    const now = new Date().toISOString();
    try {
      await privateListUpdate('hub_errors', (l) => {
        const i = l.findIndex((x) => x.key === key);
        if (i >= 0) { const x = { ...l[i], count: (l[i].count || 1) + 1, lastAt: now, where: where || l[i].where }; return [x, ...l.slice(0, i), ...l.slice(i + 1)]; }
        return [{ key, message, stack: clip(b.stack, 800), where, ua: clip(req.headers['user-agent'], 140), count: 1, firstAt: now, lastAt: now }, ...l].slice(0, 300);
      });
    } catch { /* best effort */ }
    return res.json({ ok: true });
  });

  r.post('/insights/usage', async (req: Request, res: Response) => {
    if (limited(req, 'use', 30, 3_600_000)) return res.json({ ok: true });
    const counts = req.body?.counts && typeof req.body.counts === 'object' ? req.body.counts : {};
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts).slice(0, 40)) { const n = Math.min(200, Math.max(0, Math.floor(Number(v)))); if (n) clean[clip(k, 50)] = n; }
    if (!Object.keys(clean).length) return res.json({ ok: true });
    const day = new Date().toISOString().slice(0, 10);
    try {
      await privateListUpdate('hub_usage', (l) => {
        const out = [...l];
        let row = out.find((x) => x.day === day);
        if (!row) { row = { day, sections: {} }; out.unshift(row); }
        for (const [k, n] of Object.entries(clean)) row.sections[k] = (row.sections[k] || 0) + n;
        return out.slice(0, 60);
      });
    } catch { /* best effort */ }
    return res.json({ ok: true });
  });

  r.get('/admin/hub', requireDeveloper, async (_req: Request, res: Response) => {
    const [reservations, feedback, errors, usage] = await Promise.all(['bot_reservations', 'hub_feedback', 'hub_errors', 'hub_usage'].map((k) => privateListGet(k)));
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, reservations: reservations || [], feedback: feedback || [], errors: errors || [], usage: usage || [], available: [reservations, feedback, errors, usage].every((x) => x !== null) });
  });

  return r;
}
