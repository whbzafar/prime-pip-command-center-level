import type { Request, Response } from 'express';
import { app } from '../server';

export default function handler(req: Request, res: Response) {
  try {
    const route = typeof req.query?.__route === 'string' ? req.query.__route : '';
    if (route) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query || {})) {
        if (key === '__route') continue;
        if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
        else if (value !== undefined) query.set(key, String(value));
      }
      req.url = '/api' + route + (query.toString() ? '?' + query.toString() : '');
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[API] Handler failure:', err);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: err?.message || 'Server initialization error' });
  }
}
