import type { Request, Response } from 'express';
/**
 * Vercel entry for every /api/* request.
 *
 * Vercel runs this file as native ES modules, which reject the extension-less relative imports
 * used across the server code, so it loads the esbuild bundles produced by `npm run build`:
 *   dist/server.cjs — the whole server
 *   dist/macro.cjs  — the Fundamental Analysis API on its own
 * If the main server fails to start (any reason: a missing env var, a dependency, a read-only
 * path…), /api/macro/* keeps working from its standalone bundle and the exact startup error is
 * reported at /api/__health instead of Vercel's generic "A server error has occurred" page.
 */

type Handler = (req: any, res: any) => any;

let mainApp: Handler | null = null;
let mainError: string | null = null;
let macroApp: Handler | null = null;
let macroError: string | null = null;

const ready: Promise<void> = (async () => {
  try {
    // @ts-ignore — generated at build time
    const mod: any = await import('../dist/server.cjs');
    const m = mod?.default ?? mod;
    mainApp = m?.app ?? m?.default?.app ?? null;
    if (!mainApp) mainError = 'dist/server.cjs loaded but did not export `app`';
  } catch (err: any) {
    mainError = `${err?.name || 'Error'}: ${err?.message || String(err)}\n${String(err?.stack || '').split('\n').slice(1, 6).join('\n')}`;
    console.error('[API] Main server failed to load:', err);
  }
  try {
    // @ts-ignore — generated at build time
    const mod: any = await import('../dist/macro.cjs');
    const m = mod?.default ?? mod;
    macroApp = m?.macroApp ?? null;
  } catch (err: any) {
    macroError = `${err?.name || 'Error'}: ${err?.message || String(err)}`;
    console.error('[API] Fundamentals bundle failed to load:', err);
  }
})();

function sendJson(res: Response, status: number, body: unknown) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: Request, res: Response) {
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

    await ready;
    const path = (req.url || '').split('?')[0];

    if (path === '/api/__health') {
      return sendJson(res, mainError ? 500 : 200, {
        ok: !mainError,
        mainServer: mainError ? { loaded: false, error: mainError } : { loaded: true },
        fundamentals: macroError ? { loaded: false, error: macroError } : { loaded: !!macroApp },
        node: process.version,
        region: process.env.VERCEL_REGION || null,
        time: new Date().toISOString(),
      });
    }

    // Fundamentals is served by its standalone bundle whenever the main server is unavailable.
    if (path.startsWith('/api/macro/') && (!mainApp || mainError) && macroApp) return macroApp(req, res);

    if (mainApp) return mainApp(req, res);
    if (path.startsWith('/api/macro/') && macroApp) return macroApp(req, res);
    return sendJson(res, 503, { ok: false, error: 'Server failed to start', detail: mainError });
  } catch (err: any) {
    console.error('[API] Handler failure:', err);
    return sendJson(res, 500, { ok: false, error: err?.message || 'Server initialization error' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
  maxDuration: 60,
};
