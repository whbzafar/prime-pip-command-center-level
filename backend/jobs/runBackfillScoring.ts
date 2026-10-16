import { runScoring } from './runScoring.js';
import { logger } from '../shared/logger.js';
import { getDbClient } from '../shared/db.js';
import { SCORING_MODEL_CONFIG } from '../scoring/modelConfig.js';

export interface BackfillScoringOptions {
  startDate?: string; // default '2024-01-01'
  endDate?: string; // default current date
  skipExisting?: boolean; // if true, skips checkpoint if asset_scores already present for that date
  maxRetries?: number;
}

/**
 * Returns an array of ISO date strings (YYYY-MM-DD) for all Fridays between startDate and endDate.
 * Friday is the canonical weekly checkpoint matching the weekly CFTC Commitments of Traders release schedule.
 */
export function getHistoricalFridayDates(
  startDateStr = '2024-01-01',
  endDateStr = new Date().toISOString().slice(0, 10)
): string[] {
  const fridays: string[] = [];
  const current = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T23:59:59Z`);

  // Advance current to the first Friday (day 5 in UTC: 0=Sun, 1=Mon, ..., 5=Fri)
  while (current.getUTCDay() !== 5) {
    current.setUTCDate(current.getUTCDate() + 1);
  }

  while (current <= end) {
    fridays.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return fridays;
}

/**
 * Historical Backfill Job: runs point-in-time scoring for weekly Friday checkpoints
 * from 2024-01-01 to present.
 *
 * Guarantees:
 * - Deterministic point-in-time data access for each Friday checkpoint.
 * - Resumable: can skip already completed checkpoints or cleanly overwrite.
 * - Resilient: retries transient database failures with backoff.
 */
export async function runBackfillScoring(options: BackfillScoringOptions = {}): Promise<{
  totalCheckpoints: number;
  completedRuns: number;
  totalRows: number;
}> {
  const startDate = options.startDate || '2024-01-01';
  const endDate = options.endDate || new Date().toISOString().slice(0, 10);
  const skipExisting = options.skipExisting ?? false;
  const maxRetries = options.maxRetries ?? 3;

  const fridays = getHistoricalFridayDates(startDate, endDate);
  logger.info(`[BackfillScoring] Starting historical backfill across ${fridays.length} Friday checkpoints (${startDate} to ${endDate})...`);

  const db = getDbClient();
  const modelVersion = SCORING_MODEL_CONFIG.modelVersion;

  let completedRuns = 0;
  let totalRows = 0;

  for (let i = 0; i < fridays.length; i++) {
    const fridayStr = fridays[i];
    const asOfTimestamp = `${fridayStr}T23:59:59Z`;

    // Resumability check: if skipExisting is set, check if scores already exist
    if (skipExisting) {
      const { data: existing } = await db
        .from('asset_scores')
        .select('id')
        .eq('computed_at', asOfTimestamp)
        .eq('model_version_id', modelVersion)
        .limit(1);

      if (existing && existing.length > 0) {
        logger.info(`[BackfillScoring] (${i + 1}/${fridays.length}) Checkpoint ${fridayStr} already scored. Skipping.`);
        completedRuns++;
        continue;
      }
    }

    logger.info(`[BackfillScoring] (${i + 1}/${fridays.length}) Evaluating point-in-time score as of ${fridayStr}...`);

    let attempts = 0;
    let succeeded = false;

    while (attempts < maxRetries && !succeeded) {
      attempts++;
      try {
        const res = await runScoring({ asOf: asOfTimestamp });
        totalRows += res.rowsWritten;
        completedRuns++;
        succeeded = true;
      } catch (err: any) {
        logger.warn(
          `[BackfillScoring] Attempt ${attempts}/${maxRetries} failed for ${fridayStr}: ${err?.message || err}`
        );
        if (attempts < maxRetries) {
          const delayMs = attempts * 500;
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          logger.error(`[BackfillScoring] Checkpoint ${fridayStr} failed after ${maxRetries} attempts.`);
        }
      }
    }
  }

  logger.info(
    `[BackfillScoring] Historical backfill complete: ${completedRuns}/${fridays.length} Friday checkpoints evaluated, ${totalRows} historical rows recorded.`
  );

  return {
    totalCheckpoints: fridays.length,
    completedRuns,
    totalRows,
  };
}

if (process.argv[1]?.endsWith('runBackfillScoring.ts') || process.argv[1]?.endsWith('runBackfillScoring.js')) {
  runBackfillScoring().catch((err) => {
    logger.error(`runBackfillScoring execution error: ${err?.message || err}`);
    process.exitCode = 1;
  });
}
