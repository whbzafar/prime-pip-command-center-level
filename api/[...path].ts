import http from 'node:http';
import type { RequestHandler } from 'express';

let appPromise: Promise<RequestHandler> | null = null;

async function getApp(): Promise<RequestHandler> {
  if (!appPromise) {
    const originalListen = http.Server.prototype.listen;
    (http.Server.prototype as any).listen = function () {
      return this;
    };

    appPromise = import('../server.ts')
      .then(({ app }) => app as RequestHandler)
      .finally(() => {
        (http.Server.prototype as any).listen = originalListen;
      });
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
