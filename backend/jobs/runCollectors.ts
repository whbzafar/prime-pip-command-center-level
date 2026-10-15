import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { getCollectorForSource } from '../collectors/index.js';
import { IndicatorRecord, IngestionRunRecord, DataQualityFlagRecord } from '../shared/types.js';
import { subtractDaysUtc } from '../shared/dateUtils.js';

export interface IncrementalCollectorOptions {
  source?: 'fred' | 'cftc' | 'all';
  indicatorCode?: string;
  since?: string;
  dryRun?: boolean;
}

/**
 * Parses CLI command-line arguments for incremental collector run.
 */
export function parseCollectorCliArgs(args: string[] = process.argv.slice(2)): IncrementalCollectorOptions {
  const options: IncrementalCollectorOptions = {
    source: 'all',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) {
      const s = args[++i].toLowerCase();
      if (s === 'fred' || s === 'cftc' || s === 'all') options.source = s;
    } else if (arg === '--indicator' && args[i + 1]) {
      options.indicatorCode = args[++i];
    } else if (arg === '--since' && args[i + 1]) {
      options.since = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

/**
 * Job: runCollectors (Incremental)
 * Ingests recent prints and catches revisions for active indicators.
 */
export async function runCollectors(customOptions?: IncrementalCollectorOptions): Promise<void> {
  const options = customOptions || parseCollectorCliArgs();
  const startedAt = new Date().toISOString();
  const jobName = `runCollectors:${options.source}`;

  logger.info(`[Job:${jobName}] Starting incremental collector update. DryRun=${options.dryRun}`);

  let totalRowsWritten = 0;
  let hasErrors = false;
  let lastErrorMessage: string | null = null;
  const db = getDbClient();

  try {
    // 1. Query active indicators
    let query = db.from('indicators').select('*').eq('is_active', true);

    if (options.source && options.source !== 'all') {
      query = query.eq('source_id', options.source);
    }
    if (options.indicatorCode) {
      query = query.eq('code', options.indicatorCode);
    }

    const { data: indicators, error: indError } = await query;
    if (indError) throw new Error(`Failed to query indicators: ${indError.message}`);

    const activeList = (indicators as IndicatorRecord[]) || [];
    logger.info(`[Job:${jobName}] Found ${activeList.length} indicators for incremental poll.`);

    // 2. Process each indicator
    for (const ind of activeList) {
      const collector = getCollectorForSource(ind.source_id);
      if (!collector) {
        continue;
      }

      // Determine starting date:
      // If user supplied --since, use it.
      // Otherwise, query the latest stored observation period for this indicator and apply lookback window:
      // 90 days lookback for monthly/quarterly to catch revisions; 14 days for daily/weekly.
      let effectiveSince = options.since;

      if (!effectiveSince) {
        const { data: latestObs } = await db
          .from('observations')
          .select('period_date')
          .eq('indicator_id', ind.id)
          .order('period_date', { ascending: false })
          .limit(1);

        if (latestObs && latestObs.length > 0) {
          const latestPeriod = latestObs[0].period_date;
          // Apply revision catch-up window
          const lookbackDays = ind.frequency === 'monthly' || ind.frequency === 'quarterly' ? 90 : 14;
          effectiveSince = subtractDaysUtc(lookbackDays, new Date(latestPeriod));
        } else {
          // If no observations exist, default to 1 year for incremental catch-up
          effectiveSince = subtractDaysUtc(365);
        }
      }

      logger.info(`[Job:${jobName}] Polling ${ind.code} (since ${effectiveSince})...`);

      try {
        const result = await collector.fetch(ind, {
          since: effectiveSince,
          fullHistory: false,
          dryRun: options.dryRun,
        });

        if (result.errorMessage) {
          hasErrors = true;
          lastErrorMessage = result.errorMessage;
        }

        const observations = result.observations || [];
        logger.info(`[Job:${jobName}] Retrieved ${observations.length} observations for ${ind.code}.`);

        if (options.dryRun) {
          logger.info(`[Job:${jobName} (DRY-RUN)] Would upsert ${observations.length} rows for ${ind.code}.`);
          totalRowsWritten += observations.length;
          continue;
        }

        if (observations.length > 0) {
          const rowsToInsert = observations.map((o) => ({
            indicator_id: o.indicatorId,
            period_date: o.periodDate,
            value: o.value,
            released_at: o.releasedAt,
            is_revision: o.isRevision,
          }));

          const { error: upsertErr } = await db
            .from('observations')
            .upsert(rowsToInsert, {
              onConflict: 'indicator_id,period_date,released_at',
              ignoreDuplicates: true,
            });

          if (upsertErr) {
            logger.error(`[Job:${jobName}] Upsert error on ${ind.code}: ${upsertErr.message}`);
            hasErrors = true;
            lastErrorMessage = upsertErr.message;
          } else {
            totalRowsWritten += rowsToInsert.length;
          }

          // Flags
          const flagsToInsert: DataQualityFlagRecord[] = observations
            .filter((o) => o.qualityFlag)
            .map((o) => ({
              indicator_id: o.indicatorId,
              flag_type: o.qualityFlag!.flagType,
              details: o.qualityFlag!.details,
              created_at: new Date().toISOString(),
            }));

          if (flagsToInsert.length > 0) {
            await db.from('data_quality_flags').insert(flagsToInsert);
          }
        }
      } catch (colErr: any) {
        logger.error(`[Job:${jobName}] Collector error on ${ind.code}: ${colErr?.message || colErr}`);
        hasErrors = true;
        lastErrorMessage = colErr?.message || String(colErr);
      }
    }

    // 3. Operational run log
    const status = hasErrors ? (totalRowsWritten > 0 ? 'partial' : 'failed') : 'success';

    if (!options.dryRun) {
      const runRecord: IngestionRunRecord = {
        job_name: jobName,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status,
        rows_written: totalRowsWritten,
        error_message: lastErrorMessage,
      };
      await db.from('ingestion_runs').insert(runRecord);
    }

    logger.info(`[Job:${jobName}] Completed incremental run. Status: ${status}, Rows written: ${totalRowsWritten}`);
  } catch (fatalErr: any) {
    logger.error(`[Job:${jobName}] Fatal error in incremental run: ${fatalErr?.message || fatalErr}`);
    if (!options.dryRun) {
      try {
        await db.from('ingestion_runs').insert({
          job_name: jobName,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          status: 'failed',
          rows_written: totalRowsWritten,
          error_message: fatalErr?.message || String(fatalErr),
        });
      } catch {}
    }
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('runCollectors.ts') || process.argv[1]?.endsWith('runCollectors.js')) {
  runCollectors();
}
