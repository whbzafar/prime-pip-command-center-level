import { Router, Request, Response } from 'express';
import { sentimentService } from '../sentiment/sentimentService.js';

export const sentimentRouter = Router();

// GET /api/sentiment - all instruments + provider health + lastUpdated
sentimentRouter.get('/', (_req: Request, res: Response) => {
  try {
    const data = sentimentService.getSentimentData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve sentiment data', message: err?.message });
  }
});

// GET /api/sentiment/status - provider health details
sentimentRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const providers = sentimentService.getProviderStatuses();
    res.json({ providers });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve provider status', message: err?.message });
  }
});

// GET /api/sentiment/:symbol/history - historical snapshots for symbol
sentimentRouter.get('/:symbol/history', (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    const timeframe = (req.query.timeframe as '24h' | '7d' | '30d') || '24h';
    const data = sentimentService.getSymbolHistory(symbol, timeframe);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve symbol history', message: err?.message });
  }
});
