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

    appPromise = import('../server.ts')
      .then((mod: any) => ((mod.app || mod.default) as RequestHandler))
      .finally(() => {
        (http.Server.prototype as any).listen = originalListen;
      });
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res, (err?: any) => {
      if (err) {
        console.error('API middleware unhandled error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }
    });
  } catch (err) {
    console.error('Vercel API handler failure:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server initialization error' });
    }
  }
}
