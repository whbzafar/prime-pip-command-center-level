import { runScoring } from './runScoring.js';
import { logger } from '../shared/logger.js';
import { formatUtcDate, subtractDaysUtc } from '../shared/dateUtils.js';

export interface BackfillScoringOptions {
  weeks?: number;
  stepDays?: number;
  endDate?: string;
}

/**
 * Historical Backfill Job: runs point-in-time scoring for historical checkpoints.
 * Default: weekly checkpoints (every 7 days) over the past 52 weeks (1 year).
 * Populates historical tables and views for chart history (get_score_history RPC).
 */
export async function runBackfillScoring(options: BackfillScoringOptions = {}): Promise<void> {
  const weeks = options.weeks ?? 52;
  const stepDays = options.stepDays ?? 7;
  const endDate = options.endDate ? new Date(options.endDate) : new Date();

  logger.info(`[BackfillScoring] Starting historical scoring backfill over ${weeks} weeks (${stepDays}-day step)...`);

  const totalRuns = Math.floor((weeks * 7) / stepDays);
  let completedRuns = 0;
  let totalRows = 0;

  for (let i = totalRuns; i >= 0; i--) {
    const daysAgo = i * stepDays;
    const checkpointDateStr = subtractDaysUtc(daysAgo, endDate);
    const asOfTimestamp = `${checkpointDateStr}T23:59:59Z`;

    logger.info(`[BackfillScoring] (${completedRuns + 1}/${totalRuns + 1}) Scoring as of ${checkpointDateStr}...`);

    try {
      const res = await runScoring({ asOf: asOfTimestamp });
      totalRows += res.rowsWritten;
      completedRuns++;
    } catch (err: any) {
      logger.error(`[BackfillScoring] Failed for checkpoint ${checkpointDateStr}: ${err?.message || err}`);
      // Continue next checkpoint to achieve maximum historical coverage
    }
  }

  logger.info(`[BackfillScoring] Backfill complete. Finished ${completedRuns}/${totalRuns + 1} checkpoints, wrote ${totalRows} historical rows.`);
}

if (process.argv[1]?.endsWith('runBackfillScoring.ts') || process.argv[1]?.endsWith('runBackfillScoring.js')) {
  runBackfillScoring().catch(() => {
    process.exitCode = 1;
  });
}
