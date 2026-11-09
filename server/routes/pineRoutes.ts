/**
 * /api/pine — private Pine Script indicators.
 *
 *   GET    /api/pine/scripts          admin: every script WITH source · others: published scripts, NO source
 *   PUT    /api/pine/scripts          admin only — create / update { id?, source, name?, published? }
 *   DELETE /api/pine/scripts/:id      admin only
 *   POST   /api/pine/prepare          { id } → inputs schema + metadata (never the source)
 *   POST   /api/pine/run              { id, market, bars, inputs?, props?, series? } → drawn output only
 *
 * Every route needs a signed-in user. Only administrators ever receive script source.
 */
import { Router, type Request, type Response } from 'express';
import { deleteScript, getScript, pineStoreBackend, readScripts, toPublic, upsertScript } from '../pine/pineStore.js';
import { prepareScript, runScript } from '../pine/pineRunner.js';

type UserLike = { id: string; username?: string; role?: string; isDeveloper?: boolean } | null;

export const isPineAdmin = (u: UserLike) => Boolean(u && (u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER'));

/** Error text a student may see: first line only, no code excerpts. */
const studentError = (msg: string) => String(msg || 'The indicator could not run.').split('\n')[0].slice(0, 160);

export function createPineRouter(getUser: (req: Request) => Promise<UserLike>) {
  const r = Router();

  const auth = async (req: Request, res: Response) => {
    const user = await getUser(req).catch(() => null);
    if (!user) { res.status(401).json({ ok: false, error: 'Please sign in to use indicators.' }); return null; }
    return user;
  };

  r.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  r.get('/scripts', async (req, res) => {
    const user = await auth(req, res); if (!user) return;
    try {
      const rows = await readScripts();
      if (isPineAdmin(user)) return res.json({ ok: true, isAdmin: true, backend: pineStoreBackend(), scripts: rows });
      return res.json({ ok: true, isAdmin: false, scripts: rows.filter((s) => s.published).map(toPublic) });
    } catch (err: any) {
      return res.status(503).json({ ok: false, error: 'Indicator library is temporarily unavailable.', detail: isPineAdmin(user) ? err?.message : undefined });
    }
  });

  r.put('/scripts', async (req, res) => {
    const user = await auth(req, res); if (!user) return;
    if (!isPineAdmin(user)) return res.status(403).json({ ok: false, error: 'Only the administrator can add or change indicator code.' });
    try {
      const rec = await upsertScript(req.body || {}, user.username || user.id);
      return res.json({ ok: true, script: rec });
    } catch (err: any) {
      return res.status(400).json({ ok: false, error: err?.message || 'Could not save the script.' });
    }
  });

  r.delete('/scripts/:id', async (req, res) => {
    const user = await auth(req, res); if (!user) return;
    if (!isPineAdmin(user)) return res.status(403).json({ ok: false, error: 'Only the administrator can delete indicators.' });
    try { await deleteScript(req.params.id); return res.json({ ok: true }); }
    catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
  });

  const loadAllowed = async (user: UserLike, id: string) => {
    const s = await getScript(String(id || ''));
    if (!s) return null;
    if (!s.published && !isPineAdmin(user)) return null;
    return s;
  };

  r.post('/prepare', async (req, res) => {
    const user = await auth(req, res); if (!user) return;
    const s = await loadAllowed(user, req.body?.id).catch(() => null);
    if (!s) return res.status(404).json({ ok: false, error: 'Indicator not found.' });
    try {
      const prepared = await prepareScript(s.source, String(req.body?.instanceId || s.id));
      return res.json({ ok: true, prepared, name: s.name, updatedAt: s.updatedAt });
    } catch (err: any) {
      return res.status(422).json({ ok: false, error: isPineAdmin(user) ? err?.message : studentError(err?.message) });
    }
  });

  r.post('/run', async (req, res) => {
    const user = await auth(req, res); if (!user) return;
    const s = await loadAllowed(user, req.body?.id).catch(() => null);
    if (!s) return res.status(404).json({ ok: false, error: 'Indicator not found.' });
    const b = req.body || {};
    const out = await runScript({
      source: s.source,
      market: { symbol: String(b.market?.symbol || '').replace(/^[A-Z]+:/i, ''), timeframe: String(b.market?.timeframe || '60'), symbolInfo: b.market?.symbolInfo },
      bars: b.bars,
      inputs: b.inputs,
      props: b.props,
      series: b.series,
    });
    if (!out.ok && !isPineAdmin(user)) { out.error = studentError(out.error || ''); out.line = null; }
    return res.status(out.ok ? 200 : 422).json(out);
  });

  return r;
}
