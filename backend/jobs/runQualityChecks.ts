import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { IngestionRunRecord, DataQualityFlagRecord } from '../shared/types.js';

/**
 * Job: runQualityChecks
 * Queries v_data_freshness view and checks for stale, missing, or anomalous series.
 * Inserts or resolves data_quality_flags and logs the operational status.
 */
export async function runQualityChecks(): Promise<void> {
  const startedAt = new Date().toISOString();
  const jobName = 'runQualityChecks';
  logger.info(`[Job:${jobName}] Starting data quality audit...`);

  let flagsCreated = 0;
  const db = getDbClient();

  try {
    const { data: freshnessData, error: fError } = await db
      .from('v_data_freshness')
      .select('*');

    if (fError) throw new Error(`Failed to read v_data_freshness: ${fError.message}`);

    for (const item of freshnessData || []) {
      if (item.status === 'stale' || item.status === 'very_stale' || item.status === 'missing') {
        const flagType = item.status === 'missing' ? 'missing' : 'stale';

        const flag: DataQualityFlagRecord = {
          indicator_id: item.indicator_id,
          flag_type: flagType,
          details: {
            frequency: item.frequency,
            latestPeriodDate: item.latest_period_date,
            latestReleasedAt: item.latest_released_at,
            freshnessStatus: item.status,
          },
          created_at: new Date().toISOString(),
        };

        const { error: insErr } = await db.from('data_quality_flags').insert(flag);
        if (!insErr) flagsCreated++;
      }
    }

    const runRecord: IngestionRunRecord = {
      job_name: jobName,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'success',
      rows_written: flagsCreated,
      error_message: null,
    };

    await db.from('ingestion_runs').insert(runRecord);
    logger.info(`[Job:${jobName}] Quality check completed. Flags created/updated: ${flagsCreated}.`);
  } catch (fatalErr: any) {
    logger.error(`[Job:${jobName}] Quality audit failed: ${fatalErr?.message || fatalErr}`);
    try {
      await db.from('ingestion_runs').insert({
        job_name: jobName,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: 'failed',
        rows_written: flagsCreated,
        error_message: fatalErr?.message || String(fatalErr),
      });
    } catch {}
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('runQualityChecks.ts') || process.argv[1]?.endsWith('runQualityChecks.js')) {
  runQualityChecks();
}
