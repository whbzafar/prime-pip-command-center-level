import type { Request, Response } from 'express';
import { clearAuthenticatedUser, logoutToken } from '../../server/authService.js';

function readCookie(req: Request, name: string): string {
  const raw = req.headers.cookie || '';
  const part = raw.split(';').map((v) => v.trim()).find((v) => v.startsWith(name + '='));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = readCookie(req, 'primepipfx_session');
  if (session) {
    clearAuthenticatedUser(session);
    logoutToken(session);
  }

  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.setHeader('Set-Cookie', [
    `primepipfx_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
    `primepipfx_refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
  ]);
  return res.json({ ok: true });
}
