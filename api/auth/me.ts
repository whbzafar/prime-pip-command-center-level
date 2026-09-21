import type { Request, Response } from 'express';
import { getUserByToken, sanitizeUser } from '../../server/authService.js';
import {
  getUserFromSupabaseAccessToken,
  isSupabaseAuthEnabled,
  refreshSupabaseSession,
} from '../../server/supabaseAuthService.js';

function readCookie(req: Request, name: string): string {
  const raw = req.headers.cookie || '';
  const part = raw.split(';').map((v) => v.trim()).find((v) => v.startsWith(name + '='));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let token = readCookie(req, 'primepipfx_session');
    const refreshToken = readCookie(req, 'primepipfx_refresh');

    if (isSupabaseAuthEnabled && token) {
      const user = await getUserFromSupabaseAccessToken(token);
      if (user) return res.json({ ok: true, user: sanitizeUser(user) });

      if (refreshToken) {
        const refreshed = await refreshSupabaseSession(refreshToken);
        if (refreshed?.access_token) {
          const refreshedUser = await getUserFromSupabaseAccessToken(refreshed.access_token);
          if (refreshedUser) {
            const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
            const maxAge = 30 * 24 * 60 * 60;
            res.setHeader('Set-Cookie', [
              `primepipfx_session=${encodeURIComponent(refreshed.access_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
              `primepipfx_refresh=${encodeURIComponent(refreshed.refresh_token || refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
            ]);
            return res.json({ ok: true, user: sanitizeUser(refreshedUser) });
          }
        }
      }
    }

    if (!token) {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
    }

    const user = token ? getUserByToken(token) : null;
    if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
    return res.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error('[AUTH/VERCEL] Session lookup failed:', error);
    return res.status(500).json({ ok: false, error: 'Authentication service error' });
  }
}
