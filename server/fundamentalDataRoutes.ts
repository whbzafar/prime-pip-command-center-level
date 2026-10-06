import type { Request, Response } from 'express';
import { getUserByToken } from './authService.js';
import { getFundamentalDataStatus, syncFundamentalData } from './fundamentalDataService.js';

function adminUser(req: Request) {
  const token = req.cookies?.primepipfx_session;
  if (!token) return null;
  const user = getUserByToken(token);
  if (!user) return null;
  return user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.isDeveloper ? user : null;
}

export async function fundamentalDataStatusRoute(req: Request, res: Response) {
  try {
    const scope = typeof req.query.scope === 'string' ? req.query.scope.toUpperCase() : 'USD';
    return res.json(await getFundamentalDataStatus(scope));
  } catch (error) {
    console.error('[FUNDAMENTAL DATA] status failed:', error);
    return res.status(502).json({ ok: false, error: 'Verified fundamental data status is temporarily unavailable.' });
  }
}

export async function fundamentalDataSyncRoute(req: Request, res: Response) {
  if (!adminUser(req)) {
    return res.status(403).json({ ok: false, error: 'Administrator access is required to synchronize verified market data.' });
  }
  try {
    const scope = typeof req.body?.scope === 'string' ? req.body.scope.toUpperCase() : 'USD';
    return res.json(await syncFundamentalData(scope));
  } catch (error) {
    console.error('[FUNDAMENTAL DATA] sync failed:', error);
    return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : 'Data synchronization failed.' });
  }
}
