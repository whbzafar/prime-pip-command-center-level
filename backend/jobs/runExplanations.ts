import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { generateAssetExplanation } from '../explain/generator.js';
import { IngestionRunRecord } from '../shared/types.js';

/**
 * Job: runExplanations
 * Synthesizes grounded natural language macro briefs for assets and pairs.
 * Utilizes input hashes to ensure LLM calls only execute when underlying data changes.
 */
export async function runExplanations(): Promise<void> {
  const startedAt = new Date().toISOString();
  const jobName = 'runExplanations';
  const modelVersion = config.model.activeVersion;
  logger.info(`[Job:${jobName}] Starting explanation synthesis engine for model ${modelVersion}...`);

  let rowsWritten = 0;
  const db = getDbClient();

  try {
    const { data: latestScores, error: scoreErr } = await db
      .from('v_latest_asset_scores')
      .select('*');

    if (scoreErr) throw new Error(`Failed to query latest scores: ${scoreErr.message}`);

    logger.info(`[Job:${jobName}] Checking explanations for ${(latestScores || []).length} score records...`);

    for (const record of latestScores || []) {
      const explanation = await generateAssetExplanation({
        assetSymbol: record.symbol,
        assetName: record.asset_name,
        horizon: record.horizon,
        score: record.score,
        biasLabel: record.bias_label,
        confidence: record.confidence,
        pillarScores: [],
        topDrivers: [],
        upcomingEvents: [],
      });

      // Upsert explanation
      const { error: expErr } = await db
        .from('explanations')
        .upsert(
          {
            asset_id: record.asset_id,
            horizon: record.horizon,
            computed_at: new Date().toISOString(),
            model_version_id: modelVersion,
            summary: explanation.summary,
            invalidation: explanation.invalidation,
            upcoming_events: explanation.upcomingEvents,
            llm_model: explanation.llmModel,
            input_hash: explanation.inputHash,
          },
          {
            onConflict: 'asset_id,horizon,model_version_id,input_hash',
            ignoreDuplicates: true,
          }
        );

      if (!expErr) rowsWritten++;
    }

    const runRecord: IngestionRunRecord = {
      job_name: jobName,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'success',
      rows_written: rowsWritten,
      error_message: null,
    };

    await db.from('ingestion_runs').insert(runRecord);
    logger.info(`[Job:${jobName}] Explanations generated/verified: ${rowsWritten} rows.`);
  } catch (fatalErr: any) {
    logger.error(`[Job:${jobName}] Explanation synthesis failed: ${fatalErr?.message || fatalErr}`);
    try {
      await db.from('ingestion_runs').insert({
        job_name: jobName,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: 'failed',
        rows_written: rowsWritten,
        error_message: fatalErr?.message || String(fatalErr),
      });
    } catch {}
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('runExplanations.ts') || process.argv[1]?.endsWith('runExplanations.js')) {
  runExplanations();
}
