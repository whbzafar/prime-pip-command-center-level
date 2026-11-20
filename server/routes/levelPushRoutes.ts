/**
 * H1 LEVELS DELIVERY
 *   GET  /api/sbt/levels        latest hourly result (all pairs + events) — read by every app
 *   POST /api/sbt/ingest        the hourly job finished: load its result, push new events to phones / PCs
 *   POST /api/sbt/source        strategy source for the verified hourly GitHub job only (OIDC)
 *   GET  /api/push/key          public Web Push key
 *   POST /api/push/subscribe    save this device for push alerts   ·   POST /api/push/unsubscribe
 *   POST /api/push/test         send a test push to this device
 * Web Push (VAPID) keys are created by the server once and kept in the private store.
 */
import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import webpush from 'web-push';
import { redisCmd } from '../durableStore.js';
import { rawStrategySource } from '../sbt/sbtScanner.js';
import { verifyGithubOidc } from '../sbt/githubOidc.js';

export const levelPushRouter = Router();
const REPO = 'whbzafar/prime-pip-command-center-level';
const LEVELS_URL = `https://github.com/${REPO}/releases/download/sbt-levels/levels.json`;
const K_LEVELS = 'ppfx:sbt:levels:v2', K_SUBS = 'ppfx:push:subs', K_SENT = 'ppfx:push:sent', K_VAPID = 'ppfx:push:vapid';

// ───────── levels
let mem: { at: number; body: any } | null = null;
async function loadLevels(force = false): Promise<any | null> {
  if (!force && mem && Date.now() - mem.at < 60_000) return mem.body;
  let body: any = null;
  if (!force) { const r = await redisCmd(['GET', K_LEVELS]).catch(() => null); if (r) body = JSON.parse(r); }
  if (!body || force || Date.now() - Date.parse(body.generatedAt) > 75 * 60_000) {
    const fresh = await fetch(LEVELS_URL, { redirect: 'follow', signal: AbortSignal.timeout(10_000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (fresh && (!body || Date.parse(fresh.generatedAt) > Date.parse(body.generatedAt))) { body = fresh; await redisCmd(['SET', K_LEVELS, JSON.stringify(fresh), 'EX', 7 * 86400]).catch(() => null); }
  }
  if (body) mem = { at: Date.now(), body };
  return body;
}
levelPushRouter.get('/sbt/levels', async (_req: Request, res: Response) => {
  const b = await loadLevels();
  if (!b) return res.status(503).json({ ok: false, error: 'The hourly level scan has not published a result yet.' });
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.json({ ok: true, ...b, ageMin: Math.round((Date.now() - Date.parse(b.generatedAt)) / 60_000) });
});

// ───────── Web Push
let vapid: { publicKey: string; privateKey: string } | null = null;
async function getVapid() {
  if (vapid) return vapid;
  const stored = await redisCmd(['GET', K_VAPID]).catch(() => null);
  if (stored) vapid = JSON.parse(stored);
  else {
    const k = webpush.generateVAPIDKeys();
    // NX: if two servers race, both end up using the same stored pair.
    await redisCmd(['SET', K_VAPID, JSON.stringify(k), 'NX']).catch(() => null);
    const again = await redisCmd(['GET', K_VAPID]).catch(() => null);
    vapid = again ? JSON.parse(again) : k;
  }
  webpush.setVapidDetails('https://www.primepipfx.site', vapid!.publicKey, vapid!.privateKey);
  return vapid!;
}
const subId = (endpoint: string) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

levelPushRouter.get('/push/key', async (_req, res) => { try { res.json({ ok: true, key: (await getVapid()).publicKey }); } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || e) }); } });
levelPushRouter.post('/push/subscribe', async (req, res) => {
  const sub = req.body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth || !/^https:\/\//.test(sub.endpoint)) return res.status(400).json({ ok: false, error: 'Invalid subscription' });
  await redisCmd(['HSET', K_SUBS, subId(sub.endpoint), JSON.stringify({ sub, at: Date.now(), ua: String(req.headers['user-agent'] || '').slice(0, 120) })]);
  res.json({ ok: true });
});
levelPushRouter.post('/push/unsubscribe', async (req, res) => { const ep = String(req.body?.endpoint || ''); if (ep) await redisCmd(['HDEL', K_SUBS, subId(ep)]).catch(() => null); res.json({ ok: true }); });

async function sendTo(sub: any, payload: any): Promise<'ok' | 'gone' | 'fail'> {
  try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: 'high' }); return 'ok'; }
  catch (e: any) { return e?.statusCode === 404 || e?.statusCode === 410 ? 'gone' : 'fail'; }
}
levelPushRouter.post('/push/test', async (req, res) => {
  await getVapid();
  const sub = req.body?.subscription;
  if (!sub?.endpoint) return res.status(400).json({ ok: false, error: 'No subscription' });
  const r = await sendTo(sub, { title: 'PrimePipFX alerts are on', body: 'You will get a push like this when a pair reaches its H1 Level 1 or Level 2, when a level is deactivated and when the market opens or closes.', tag: 'ppfx-test', url: '/' });
  res.json({ ok: r === 'ok', result: r });
});

async function pushEvents(events: any[]) {
  if (!events.length) return { sent: 0, devices: 0 };
  await getVapid();
  const all: Record<string, string> = {};
  const raw = await redisCmd(['HGETALL', K_SUBS]).catch(() => null);
  if (Array.isArray(raw)) for (let i = 0; i < raw.length; i += 2) all[raw[i]] = raw[i + 1];
  else if (raw && typeof raw === 'object') Object.assign(all, raw);
  let sent = 0;
  for (const ev of events.slice(0, 12)) {
    const first = await redisCmd(['SADD', K_SENT, ev.id]).catch(() => 1);
    if (Number(first) === 0) continue; // already pushed (another run / instance)
    const payload = { title: ev.title, body: ev.text, tag: `ppfx-${ev.symbol}-${ev.kind}`, url: '/?tab=FUNDAMENTALS', kind: ev.kind, speech: ev.speech, renotify: true };
    await Promise.all(Object.entries(all).map(async ([id, v]) => {
      const r = await sendTo(JSON.parse(v).sub, payload);
      if (r === 'ok') sent++;
      if (r === 'gone') await redisCmd(['HDEL', K_SUBS, id]).catch(() => null);
    }));
  }
  await redisCmd(['EXPIRE', K_SENT, 14 * 86400]).catch(() => null);
  return { sent, devices: Object.keys(all).length };
}

levelPushRouter.post('/sbt/ingest', async (_req: Request, res: Response) => {
  try {
    const b = await loadLevels(true);
    if (!b) return res.status(503).json({ ok: false, error: 'No published result found.' });
    const fresh = (b.events || []).filter((e: any) => (b.fresh || []).includes(e.id) && Date.now() - e.time < 3 * 3_600_000);
    const r = await pushEvents(fresh);
    res.json({ ok: true, generatedAt: b.generatedAt, pairs: b.pairs?.length, fresh: fresh.length, ...r });
  } catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }); }
});

// ───────── strategy source for the hourly job (GitHub OIDC proof, no shared secret)
levelPushRouter.post('/sbt/source', async (req: Request, res: Response) => {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const v = await verifyGithubOidc(tok, { audience: 'primepipfx-sbt', repository: REPO, workflowFile: 'sbt-levels.yml', ref: 'refs/heads/main' });
  if (v.ok === false) return res.status(401).json({ ok: false, error: v.error });
  const src = await rawStrategySource();
  if (!src) return res.status(503).json({ ok: false, error: 'Strategy not loaded' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, source: src });
});
