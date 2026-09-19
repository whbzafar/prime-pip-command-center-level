import http from 'node:http';
import type { RequestHandler } from 'express';

let appPromise: Promise<RequestHandler> | null = null;

async function getApp(): Promise<RequestHandler> {
  if (!appPromise) {
    process.env.VERCEL = '1';
    const originalListen = http.Server.prototype.listen;
    (http.Server.prototype as any).listen = function () {
      return this;
    };

    appPromise = (async () => {
      try {
        const mod: any = await import('../server.js');
        return (mod.app || mod.default) as RequestHandler;
      } catch (err1) {
        try {
          const mod: any = await import('../server.ts');
          return (mod.app || mod.default) as RequestHandler;
        } catch (err2) {
          console.error('[API] Failed to import server:', err1, err2);
          throw err2 || err1;
        }
      }
    })().finally(() => {
      (http.Server.prototype as any).listen = originalListen;
    });
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    // Ensure the URL path begins with /api so Express routes match correctly
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    const app = await getApp();
    return app(req, res, (err?: any) => {
      if (err) {
        console.error('API middleware unhandled error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: err?.message || 'Internal Server Error' });
        }
      }
    });
  } catch (err: any) {
    console.error('Vercel API handler failure:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Server initialization error' });
    }
  }
}
