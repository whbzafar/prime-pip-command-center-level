import { Router } from 'express';
import { fetchLiveEconomicNewsRadar } from './liveEconomicNewsRadarService.js';

export const liveEconomicNewsRadarRouter = Router();

liveEconomicNewsRadarRouter.get('/status', async (_req, res) => {
  const result = await fetchLiveEconomicNewsRadar();
  res.status(result.ok ? 200 : 503).json(result);
});
