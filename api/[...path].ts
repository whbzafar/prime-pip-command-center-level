import type { Request, Response } from 'express';
import { app } from '../server';

export default function handler(req: Request, res: Response) {
  try {
    // Import server.ts statically so Vercel bundles the complete backend
    // instead of trying to load a .ts source file at runtime.
    return app(req, res);
  } catch (err: any) {
    console.error('[API] Handler failure:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: err?.message || 'Server initialization error',
      });
    }
  }
}
