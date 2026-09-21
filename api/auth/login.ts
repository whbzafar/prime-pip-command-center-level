import type { Request, Response } from 'express';
import {
  loginUser,
  sanitizeUser,
} from '../../server/authService.js';
import {
  isSupabaseAuthEnabled,
  authenticatePrimePipfx,
} from '../../server/supabaseAuthService.js';
import { syncLegacyStudentsToServer } from '../../server/legacyStudentSync.js';

function setSessionCookies(res: Response, accessToken: string, refreshToken?: string, rememberMe = true) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const cookies = [
    `primepipfx_session=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
  ];
  if (refreshToken) {
    cookies.push(
      `primepipfx_refresh=${encodeURIComponent(refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
    );
  }
  res.setHeader('Set-Cookie', cookies);
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    await syncLegacyStudentsToServer(true);
    const body = (req as Request & { body?: any }).body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';
    const rememberMe = body.rememberMe !== false;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Username and password are required' });
    }

    // This route intentionally avoids importing server.ts, whose boot-time
    // initialization can mutate the JSON auth store on every Vercel cold start.
    const localResult = loginUser(username, password, rememberMe);

    if (isSupabaseAuthEnabled) {
      try {
        const durable = await authenticatePrimePipfx(username, password, localResult?.user || null);
        if (durable) {
          setSessionCookies(res, durable.accessToken, durable.refreshToken, rememberMe);
          return res.json({ ok: true, user: sanitizeUser(durable.user) });
        }
      } catch (error) {
        console.error('[AUTH/VERCEL] Supabase login failed:', error instanceof Error ? error.message : error);
        if (!localResult) {
          return res.status(503).json({ ok: false, error: 'Authentication service is temporarily unavailable.' });
        }
      }
    }

    if (!localResult) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    setSessionCookies(res, localResult.token, undefined, rememberMe);
    return res.json({
      ok: true,
      user: sanitizeUser(localResult.user),
      authMode: 'legacy-compatibility',
    });
  } catch (error) {
    console.error('[AUTH/VERCEL] Login handler failed:', error);
    return res.status(500).json({ ok: false, error: 'Authentication service error' });
  }
}
