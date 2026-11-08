/**
 * Standalone entry for the Fundamental Analysis API (bundled to dist/macro.cjs).
 * Vercel loads it if the main server bundle fails to start, so this category never depends on
 * unrelated server features (auth stores, AI keys, etc.).
 */
import express from 'express';
import { macroRouter } from '../routes/macroRoutes.js';

export const macroApp = express();
macroApp.use('/api/macro', macroRouter);
export { macroRouter };
