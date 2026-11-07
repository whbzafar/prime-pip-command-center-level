import type { Request, Response } from 'express';
// Vercel runs this file as native ES modules, which reject the extension-less relative imports
// used across the server code (e.g. '../server', './config/cotConfig'). `npm run build` already
// produces dist/server.cjs — the whole server bundled by esbuild with every import resolved — so
// the function loads that single file instead. (Local `npm run dev` still runs server.ts directly.)
// @ts-ignore — generated at build time
import serverBundle from '../dist/server.cjs';

const app = (serverBundle as any).app || (serverBundle as any).default;

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
    if (req.body && typeof req.body === 'object') {
      (req as any)._body = true;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[API] Handler failure:', err);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: err?.message || 'Server initialization error' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
    responseLimit: '25mb',
  },
  maxDuration: 60,
};
