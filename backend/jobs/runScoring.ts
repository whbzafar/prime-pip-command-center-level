import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { Horizon, IngestionRunRecord } from '../shared/types.js';
import {
  INDICATOR_TRANSFORM_REGISTRY,
  SCORING_MODEL_CONFIG,
} from '../scoring/modelConfig.js';
import { getSeriesAsOf, PointInTimeObservation } from '../scoring/data.js';
import { applyTransform, computeDerivedSeries } from '../scoring/transform.js';
import { computeRobustZScore } from '../scoring/normalize.js';
import { applyPolarity } from '../scoring/polarity.js';
import { aggregatePillarScore, ScoredIndicatorInput } from '../scoring/pillars.js';
import { aggregateAssetScore, WeightedPillarScore } from '../scoring/aggregate.js';
import { calculateConfidence } from '../scoring/confidence.js';
import { computeDriverAttribution, IndicatorContributionItem } from '../scoring/drivers.js';

export interface RunScoringOptions {
  asOf?: string;
  assetIds?: string[];
  dryRun?: boolean;
}

export async function runScoring(options: RunScoringOptions = {}): Promise<{
  rowsWritten: number;
  assetsProcessed: number;
}> {
  const startedAt = new Date().toISOString();
  const asOf = options.asOf || startedAt;
  const jobName = 'runScoring';
  const modelVersion = config.model.activeVersion || SCORING_MODEL_CONFIG.modelVersion;

  logger.info(`[Job:${jobName}] Starting Pro Fundamentals scoring engine (Model: ${modelVersion}, AsOf: ${asOf})...`);

  let rowsWritten = 0;
  let assetsProcessed = 0;
  const db = getDbClient();

  try {
    // 1. Fetch active assets
    let assetQuery = db.from('assets').select('*').eq('is_active', true);
    if (options.assetIds && options.assetIds.length > 0) {
      assetQuery = assetQuery.in('id', options.assetIds);
    }
    const { data: assets, error: assetErr } = await assetQuery;
    if (assetErr) throw new Error(`Failed to query assets: ${assetErr.message}`);

    // 2. Fetch pillars
    const { data: pillars, error: pillarErr } = await db
      .from('pillars')
      .select('*')
      .order('sort_order', { ascending: true });
    if (pillarErr) throw new Error(`Failed to query pillars: ${pillarErr.message}`);

    // 3. Fetch pillar weights
    const { data: pillarWeights, error: weightErr } = await db
      .from('pillar_weights')
      .select('*')
      .eq('model_version_id', modelVersion);
    if (weightErr) throw new Error(`Failed to query pillar weights: ${weightErr.message}`);

    const horizons: Horizon[] = ['short', 'long'];

    // 4. Score each asset
    for (const asset of assets || []) {
      logger.info(`[Scoring] Processing asset ${asset.symbol} (${asset.id})...`);

      // Fetch indicators for this asset
      const { data: indicators, error: indErr } = await db
        .from('indicators')
        .select('*')
        .eq('asset_id', asset.id)
        .eq('is_active', true);

      if (indErr) throw new Error(`Failed to fetch indicators for ${asset.symbol}: ${indErr.message}`);

      // Map raw series for primary and derived indicators
      const rawSeriesMap = new Map<string, PointInTimeObservation[]>();
      const indicatorDataMap = new Map<string, any>();

      for (const ind of indicators || []) {
        const pitResult = await getSeriesAsOf(ind.id, asOf, db);
        rawSeriesMap.set(ind.code, pitResult.series);
        indicatorDataMap.set(ind.id, { indicator: ind, pitResult });
      }

      // Compute derived indicators if needed
      for (const ind of indicators || []) {
        const modelConf = INDICATOR_TRANSFORM_REGISTRY[ind.code];
        if (modelConf?.isDerived && modelConf.derivedFormula && modelConf.constituentCodes) {
          const [codeA, codeB] = modelConf.constituentCodes;
          const seriesA = rawSeriesMap.get(codeA) || [];
          const seriesB = rawSeriesMap.get(codeB) || [];
          const derived = computeDerivedSeries(modelConf.derivedFormula, seriesA, seriesB);
          rawSeriesMap.set(ind.code, derived);
          const currentData = indicatorDataMap.get(ind.id);
          if (currentData) {
            currentData.pitResult.series = derived;
            currentData.pitResult.latestObservation = derived.length > 0 ? derived[derived.length - 1] : null;
            currentData.pitResult.freshnessFactor = derived.length > 0 ? 1.0 : 0.0;
            currentData.pitResult.activeWeightMultiplier = derived.length > 0 ? 1.0 : 0.0;
          }
        }
      }

      // Process both horizons: short & long
      for (const horizon of horizons) {
        const horizonPillarInputs: WeightedPillarScore[] = [];
        const horizonContributors: IndicatorContributionItem[] = [];
        const allFreshnessFactors: number[] = [];
        let totalPossibleIndicatorWeight = 0;
        let activeIndicatorWeightSum = 0;
        let pillarsWithFreshData = 0;

        for (const pillar of pillars || []) {
          // Weight configured for this pillar and horizon
          const pWeightRecord = (pillarWeights || []).find(
            (pw) => pw.pillar_id === pillar.id && pw.horizon === horizon && pw.asset_class === asset.asset_class
          );
          const pillarBaseWeight = pWeightRecord ? Number(pWeightRecord.weight) : 0;

          // Indicators in this pillar
          const pillarIndicators = (indicators || []).filter((i) => i.pillar_id === pillar.id);
          const scoredIndInputs: ScoredIndicatorInput[] = [];

          for (const ind of pillarIndicators) {
            const indData = indicatorDataMap.get(ind.id);
            const pit = indData?.pitResult;
            const series: PointInTimeObservation[] = rawSeriesMap.get(ind.code) || [];

            const modelConf = INDICATOR_TRANSFORM_REGISTRY[ind.code];
            const transformSpec = horizon === 'short'
              ? (modelConf?.shortTransform || { type: 'level', description: 'Level' })
              : (modelConf?.longTransform || { type: 'level', description: 'Level' });

            const polarity = modelConf?.defaultPolarity || ind.polarity || 'higher_bullish';

            // Transform series
            const transformed = applyTransform(series, transformSpec);
            const transformedVals = transformed.map((t) => t.value);
            const latestVal = transformedVals.length > 0 ? transformedVals[transformedVals.length - 1] : 0;

            // Robust z-score
            const zScore = transformedVals.length >= 2
              ? computeRobustZScore(latestVal, transformedVals)
              : 0;

            // Directional score
            const indScore = applyPolarity(zScore, polarity);

            // Write indicator_scores
            if (!options.dryRun && transformed.length > 0) {
              await db.from('indicator_scores').insert({
                indicator_id: ind.id,
                computed_at: asOf,
                model_version_id: modelVersion,
                raw_value: latestVal,
                z_score: Number(zScore.toFixed(4)),
                score: Number(indScore.toFixed(2)),
              });
              rowsWritten++;
            }

            const baseWeight = Number(ind.weight_in_pillar || 1.0);
            const freshness = pit?.freshnessFactor ?? 1.0;
            const hasJump = pit?.hasSuspiciousJump ?? false;

            allFreshnessFactors.push(freshness);
            totalPossibleIndicatorWeight += baseWeight;
            activeIndicatorWeightSum += baseWeight * freshness * (hasJump ? SCORING_MODEL_CONFIG.jumpDownweightFactor : 1.0);

            scoredIndInputs.push({
              indicatorId: ind.id,
              code: ind.code,
              name: ind.name,
              score: indScore,
              baseWeight,
              freshnessFactor: freshness,
              hasSuspiciousJump: hasJump,
            });

            // Store for driver evaluation
            horizonContributors.push({
              indicatorId: ind.id,
              code: ind.code,
              name: ind.name,
              pillarId: pillar.id,
              pillarName: pillar.name,
              rawValue: latestVal,
              zScore,
              score: indScore,
              weightInAsset: 0, // will be computed after pillar normalization
              contribution: 0,
              unit: ind.unit,
              periodDate: pit?.latestObservation?.periodDate,
            });
          }

          // Aggregate pillar
          const pillarRes = aggregatePillarScore(scoredIndInputs);
          if (pillarRes.freshIndicatorCount > 0) {
            pillarsWithFreshData++;
          }

          horizonPillarInputs.push({
            pillarId: pillar.id,
            score: pillarRes.score,
            weight: pillarBaseWeight,
            isEmpty: pillarRes.isEmpty,
          });

          // Write pillar_scores
          if (!options.dryRun) {
            await db.from('pillar_scores').insert({
              asset_id: asset.id,
              pillar_id: pillar.id,
              horizon,
              computed_at: asOf,
              model_version_id: modelVersion,
              score: Number(pillarRes.score.toFixed(2)),
            });
            rowsWritten++;
          }
        }

        // Aggregate asset score across pillars with rescaling
        const assetRes = aggregateAssetScore(horizonPillarInputs);

        // Compute normalized asset weights for driver attribution
        for (const cont of horizonContributors) {
          const effPillarWeight = assetRes.effectivePillarWeights.get(cont.pillarId) || 0;
          // Count indicators in pillar to allocate weight evenly if not explicitly stored
          const countInPillar = horizonContributors.filter((c) => c.pillarId === cont.pillarId).length;
          cont.weightInAsset = countInPillar > 0 ? effPillarWeight / countInPillar : 0;
          cont.contribution = Number((cont.weightInAsset * cont.score).toFixed(2));
        }

        // Attribution: top 3 bullish, top 3 bearish
        const attribution = computeDriverAttribution(asset.symbol, horizon, horizonContributors);

        // Store drivers
        if (!options.dryRun) {
          for (const d of attribution.allDrivers) {
            await db.from('drivers').insert({
              asset_id: asset.id,
              horizon,
              computed_at: asOf,
              model_version_id: modelVersion,
              indicator_id: d.indicatorId,
              pillar_id: d.pillarId,
              contribution: d.contribution,
              rank: d.rank,
              detail_data: {
                ...d.detailData,
                explanation: d.explanation,
              },
            });
            rowsWritten++;
          }
        }

        // Calculate confidence
        const topBull = attribution.bullishDrivers[0]?.contribution || 0;
        const topBear = attribution.bearishDrivers[0]?.contribution || 0;

        const conf = calculateConfidence({
          totalPossibleIndicatorWeight,
          activeIndicatorWeight: activeIndicatorWeightSum,
          freshnessFactors: allFreshnessFactors,
          totalPillarsCount: (pillars || []).length,
          pillarsWithFreshDataCount: pillarsWithFreshData,
          topBullishContribution: topBull,
          topBearishContribution: topBear,
        });

        // Store asset_scores
        if (!options.dryRun) {
          await db.from('asset_scores').insert({
            asset_id: asset.id,
            horizon,
            computed_at: asOf,
            model_version_id: modelVersion,
            score: Number(assetRes.score.toFixed(2)),
            confidence: conf.confidence,
            confidence_detail: {
              ...conf.confidenceDetail,
              warning_flags: conf.warningFlags,
              is_rescaled: assetRes.isRescaled,
            },
          });
          rowsWritten++;
        }
      }

      assetsProcessed++;
    }

    // Ingestion run record
    if (!options.dryRun) {
      const runRecord: IngestionRunRecord = {
        job_name: jobName,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: 'success',
        rows_written: rowsWritten,
        error_message: null,
      };
      await db.from('ingestion_runs').insert(runRecord);
    }

    logger.info(`[Job:${jobName}] Scoring complete: ${assetsProcessed} assets processed, ${rowsWritten} rows written.`);
    return { rowsWritten, assetsProcessed };
  } catch (fatalErr: any) {
    logger.error(`[Job:${jobName}] Scoring failed: ${fatalErr?.message || fatalErr}`);
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
    throw fatalErr;
  }
}

if (process.argv[1]?.endsWith('runScoring.ts') || process.argv[1]?.endsWith('runScoring.js')) {
  runScoring().catch(() => {
    process.exitCode = 1;
  });
}
