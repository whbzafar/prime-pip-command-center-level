import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    // Load the application inside the handler so startup failures can be caught
    // and reported as a safe diagnostic on preview health checks.
    const { app } = await import('../server');
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
    if (!res.headersSent) {
      const previewHealthCheck = process.env.VERCEL_ENV === 'preview' &&
        (req.query?.__route === '/health' || req.url?.startsWith('/api/health'));
      const response: Record<string, unknown> = {
        ok: false,
        error: 'Server initialization error',
      };
      if (previewHealthCheck) {
        const name = String(err?.name || 'Error').slice(0, 40);
        const message = String(err?.message || 'Unknown startup error')
          .replace(/\/var\/(?:task|runtime)\/[^\s:]+/g, '[path]')
          .replace(/https?:\/\/[^\s]+/g, '[url]')
          .slice(0, 240);
        response.diagnostic = name + ': ' + message;
      }
      return res.status(500).json(response);
    }
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
