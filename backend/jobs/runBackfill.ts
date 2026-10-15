import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { getCollectorForSource } from '../collectors/index.js';
import { IndicatorRecord, IngestionRunRecord, DataQualityFlagRecord } from '../shared/types.js';
import { subtractYearsUtc } from '../shared/dateUtils.js';

export interface BackfillOptions {
  source?: 'fred' | 'cftc' | 'all';
  indicatorCode?: string;
  years?: number;
  dryRun?: boolean;
}

/**
 * Parses CLI command-line arguments.
 */
export function parseBackfillCliArgs(args: string[] = process.argv.slice(2)): BackfillOptions {
  const options: BackfillOptions = {
    source: 'all',
    years: 15,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) {
      const s = args[++i].toLowerCase();
      if (s === 'fred' || s === 'cftc' || s === 'all') options.source = s;
    } else if (arg === '--indicator' && args[i + 1]) {
      options.indicatorCode = args[++i];
    } else if (arg === '--years' && args[i + 1]) {
      const y = parseInt(args[++i], 10);
      if (!isNaN(y) && y > 0) options.years = y;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

/**
 * Job: runBackfill
 * Executes deep historical data ingestion for active indicators.
 * Resumable, idempotent, and records operational run summaries.
 */
export async function runBackfill(customOptions?: BackfillOptions): Promise<void> {
  const options = customOptions || parseBackfillCliArgs();
  const startedAt = new Date().toISOString();
  const jobName = `runBackfill:${options.source}`;
  const sinceDate = subtractYearsUtc(options.years || 15);

  logger.info(`[Job:${jobName}] Starting historical backfill (${options.years || 15} years, since ${sinceDate}). DryRun=${options.dryRun}`);

  let totalRowsWritten = 0;
  let hasErrors = false;
  let lastErrorMessage: string | null = null;
  const db = getDbClient();

  try {
    // 1. Query indicators
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
    logger.info(`[Job:${jobName}] Found ${activeList.length} indicators for backfill.`);

    // 2. Process each indicator
    for (const ind of activeList) {
      const collector = getCollectorForSource(ind.source_id);
      if (!collector) {
        logger.debug(`[Job:${jobName}] No collector for source '${ind.source_id}', skipping ${ind.code}.`);
        continue;
      }

      logger.info(`[Job:${jobName}] Ingesting history for ${ind.code} (${ind.source_id}:${ind.source_series_id})...`);

      try {
        const result = await collector.fetch(ind, {
          since: sinceDate,
          fullHistory: true,
          dryRun: options.dryRun,
        });

        if (result.errorMessage) {
          hasErrors = true;
          lastErrorMessage = result.errorMessage;
        }

        const observations = result.observations || [];
        logger.info(`[Job:${jobName}] Collected ${observations.length} observations for ${ind.code}.`);

        if (options.dryRun) {
          logger.info(`[Job:${jobName} (DRY-RUN)] Would upsert ${observations.length} rows for ${ind.code}.`);
          totalRowsWritten += observations.length;
          continue;
        }

        if (observations.length > 0) {
          // Ingest in chunks of 500 to keep network packets bounded
          const chunkSize = 500;
          for (let i = 0; i < observations.length; i += chunkSize) {
            const chunk = observations.slice(i, i + chunkSize);

            const rowsToInsert = chunk.map((o) => ({
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
              logger.error(`[Job:${jobName}] Upsert error on chunk for ${ind.code}: ${upsertErr.message}`);
              hasErrors = true;
              lastErrorMessage = upsertErr.message;
            } else {
              totalRowsWritten += rowsToInsert.length;
            }

            // Quality flags
            const flagsToInsert: DataQualityFlagRecord[] = chunk
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
        }
      } catch (colErr: any) {
        logger.error(`[Job:${jobName}] Collector error on ${ind.code}: ${colErr?.message || colErr}`);
        hasErrors = true;
        lastErrorMessage = colErr?.message || String(colErr);
      }
    }

    // 3. Log ingestion_runs record
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

    logger.info(`[Job:${jobName}] Completed backfill. Status: ${status}, Total rows written: ${totalRowsWritten}`);
  } catch (fatalErr: any) {
    logger.error(`[Job:${jobName}] Fatal failure: ${fatalErr?.message || fatalErr}`);
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

if (process.argv[1]?.endsWith('runBackfill.ts') || process.argv[1]?.endsWith('runBackfill.js')) {
  runBackfill();
}
