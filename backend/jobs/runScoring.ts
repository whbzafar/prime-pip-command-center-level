import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { Horizon, IngestionRunRecord, CurrencyCode } from '../shared/types.js';
import {
  INDICATOR_TRANSFORM_REGISTRY,
  SCORING_MODEL_CONFIG,
  CALIBRATION_SCALE_BY_CURRENCY,
  verifyModelVersionInDb,
} from '../scoring/modelConfig.js';
import { getSeriesAsOf, PointInTimeObservation } from '../scoring/data.js';
import { applyTransform, computeDerivedSeries } from '../scoring/transform.js';
import { computeDetailedRobustZScore, computePercentileRank } from '../scoring/normalize.js';
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
  assetScoresWritten: number;
  modelVersion: string;
  configHash: string;
}> {
  const startedAt = new Date().toISOString();
  const asOf = options.asOf || startedAt;
  const jobName = 'runScoring';
  const modelVersion = config.model.activeVersion || SCORING_MODEL_CONFIG.modelVersion;

  logger.info(`[Job:${jobName}] Starting Pro Fundamentals scoring engine (Model: ${modelVersion}, AsOf: ${asOf})...`);

  let rowsWritten = 0;
  let assetsProcessed = 0;
  let assetScoresWritten = 0;
  const db = getDbClient();

  try {
    // 0. Verify model configuration hash against database model_versions table
    const { hash: configHash } = await verifyModelVersionInDb(db, modelVersion);
    logger.info(`[Job:${jobName}] Verified model version ${modelVersion} (hash: ${configHash.slice(0, 12)}).`);

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

    // 3. Fetch pillar weights for active model version
    // Check for exact modelVersion or fallback to v0.1-initial
    let { data: pillarWeights, error: weightErr } = await db
      .from('pillar_weights')
      .select('*')
      .eq('model_version_id', modelVersion);

    if (weightErr || !pillarWeights || pillarWeights.length === 0) {
      const { data: fallbackWeights } = await db
        .from('pillar_weights')
        .select('*')
        .eq('model_version_id', 'v0.1-initial');
      pillarWeights = fallbackWeights || [];
    }

    const horizons: Horizon[] = ['short', 'long'];

    // Regime indicators cache (USD 10Y-2Y and VIX) for confidence regime stability factor
    let cachedYieldCurve10y2y: number | null = null;
    let cachedVixLevel: number | null = null;

    // 4. Score each asset
    for (const asset of assets || []) {
      const symbol = asset.symbol as CurrencyCode;
      logger.info(`[Scoring] Processing asset ${symbol} (${asset.id})...`);

      // Fetch indicators for this asset
      const { data: indicators, error: indErr } = await db
        .from('indicators')
        .select('*')
        .eq('asset_id', asset.id)
        .eq('is_active', true);

      if (indErr) throw new Error(`Failed to fetch indicators for ${symbol}: ${indErr.message}`);

      // Map raw series for primary indicators
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

      // Extract regime indicators for USD if present
      if (symbol === 'USD') {
        const vixSeries = rawSeriesMap.get('USD_CBOE_VIX') || [];
        if (vixSeries.length > 0) {
          cachedVixLevel = vixSeries[vixSeries.length - 1].value;
        }
        const curveSeries = rawSeriesMap.get('USD_YIELD_CURVE_SLOPE') || [];
        if (curveSeries.length > 0) {
          cachedYieldCurve10y2y = curveSeries[curveSeries.length - 1].value;
        }
      }

      // Process both horizons: short & long
      for (const horizon of horizons) {
        const horizonPillarInputs: WeightedPillarScore[] = [];
        const horizonContributors: IndicatorContributionItem[] = [];
        const allFreshnessFactors: number[] = [];
        let totalConfiguredIndicatorWeight = 0;
        let availableIndicatorWeight = 0;
        let anySuspiciousJump = false;

        const pillarScoreMap = new Map<string, {
          score: number | null;
          pillarRes: any;
          configuredWeight: number;
        }>();

        for (const pillar of pillars || []) {
          // Find weight configured for this pillar and horizon
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

            // Robust z-score computation
            const zResult = transformedVals.length >= 2
              ? computeDetailedRobustZScore(latestVal, transformedVals)
              : { isAvailable: false, zScore: 0, baseScore: 0, method: 'unavailable', median: 0, mad: 0 };

            // Compute percentile rank in rolling window for contrarian_extreme polarity
            const pRank = transformedVals.length > 0 ? computePercentileRank(latestVal, transformedVals) : 0.5;

            // Directional score with risk-sentiment adjustment
            const indScore = zResult.isAvailable
              ? applyPolarity(zResult.zScore, polarity, {
                  percentileRank: pRank,
                  currency: symbol,
                  isRiskIndicator: modelConf?.isRiskIndicator,
                  riskAssetType: modelConf?.riskAssetType,
                })
              : 0;

            const baseWeight = Number(ind.weight_in_pillar || modelConf?.weightInPillar || 1.0);
            const freshness = pit?.freshnessFactor ?? (transformed.length > 0 ? 1.0 : 0.0);
            const hasJump = pit?.hasSuspiciousJump ?? false;

            if (hasJump) anySuspiciousJump = true;
            if (freshness > 0) allFreshnessFactors.push(freshness);
            totalConfiguredIndicatorWeight += baseWeight;

            const isAvailable = zResult.isAvailable && freshness > 0;
            if (isAvailable) {
              const jumpMult = hasJump ? SCORING_MODEL_CONFIG.jumpDownweightFactor : 1.0;
              availableIndicatorWeight += baseWeight * freshness * jumpMult;
            }

            // Write indicator_scores (upsert with idempotency)
            if (!options.dryRun && zResult.isAvailable) {
              await db.from('indicator_scores').upsert(
                {
                  indicator_id: ind.id,
                  computed_at: asOf,
                  model_version_id: modelVersion,
                  raw_value: latestVal,
                  z_score: Number(zResult.zScore.toFixed(4)),
                  score: Number(indScore.toFixed(2)),
                },
                { onConflict: 'indicator_id,computed_at,model_version_id' }
              );
              rowsWritten++;
            }

            scoredIndInputs.push({
              indicatorId: ind.id,
              code: ind.code,
              name: ind.name,
              score: indScore,
              baseWeight,
              freshnessFactor: freshness,
              hasSuspiciousJump: hasJump,
              isAvailable: zResult.isAvailable,
            });

            // Intermediate item for driver attribution
            horizonContributors.push({
              indicatorId: ind.id,
              code: ind.code,
              name: ind.name,
              pillarId: pillar.id,
              pillarName: pillar.name,
              rawValue: latestVal,
              zScore: zResult.zScore,
              score: indScore,
              effectiveWeightInPillar: 0,
              sumEffectiveWeightsInPillar: 0,
              effectivePillarWeightInAsset: 0,
              effectiveWeightInAsset: 0,
              contribution: 0,
              unit: ind.unit,
              periodDate: pit?.latestObservation?.periodDate,
            });
          }

          // Aggregate pillar
          const pillarRes = aggregatePillarScore(scoredIndInputs);
          pillarScoreMap.set(pillar.id, {
            score: pillarRes.score,
            pillarRes,
            configuredWeight: pillarBaseWeight,
          });

          horizonPillarInputs.push({
            pillarId: pillar.id,
            pillarCode: pillar.code,
            score: pillarRes.score,
            weight: pillarBaseWeight,
          });

          // Write pillar_scores if non-null (upsert with idempotency)
          if (!options.dryRun && pillarRes.score !== null) {
            await db.from('pillar_scores').upsert(
              {
                asset_id: asset.id,
                pillar_id: pillar.id,
                horizon,
                computed_at: asOf,
                model_version_id: modelVersion,
                score: Number(pillarRes.score.toFixed(2)),
              },
              { onConflict: 'asset_id,pillar_id,horizon,computed_at,model_version_id' }
            );
            rowsWritten++;
          }
        }

        // Aggregate asset score across non-null pillars
        const calibrationScale = CALIBRATION_SCALE_BY_CURRENCY[symbol] ?? 1.0;
        const assetRes = aggregateAssetScore(horizonPillarInputs, calibrationScale);

        if (!assetRes.isSufficient || assetRes.score === null) {
          logger.info(`[Scoring] Skipping asset_scores for ${symbol} (${horizon}): ${assetRes.insufficientReason}`);
          continue;
        }

        // Compute exact driver contributions using the mathematical invariant:
        // effective_weight_in_asset = (effective_weight_in_pillar / sum(effective_weight_in_pillar)) * effective_pillar_weight_in_asset * calibrationScale
        // contribution = effective_weight_in_asset * indicator_score
        // sum(contributions) == asset_score
        const nonNullPillarScores: number[] = [];

        for (const cont of horizonContributors) {
          const pData = pillarScoreMap.get(cont.pillarId);
          if (!pData || pData.score === null) {
            cont.effectiveWeightInAsset = 0;
            cont.contribution = 0;
            continue;
          }

          const effPillarWeightInAsset = assetRes.effectivePillarWeights.get(cont.pillarId) || 0;
          const normalizedWeightInPillar = pData.pillarRes.indicatorWeightsInPillar.get(cont.indicatorId) || 0;

          cont.effectivePillarWeightInAsset = effPillarWeightInAsset;
          cont.effectiveWeightInPillar = normalizedWeightInPillar;
          cont.sumEffectiveWeightsInPillar = pData.pillarRes.activeWeightSum;

          // Exact formula
          cont.effectiveWeightInAsset = normalizedWeightInPillar * effPillarWeightInAsset * calibrationScale;
          cont.contribution = cont.effectiveWeightInAsset * cont.score;
        }

        for (const pInput of horizonPillarInputs) {
          if (pInput.score !== null) {
            nonNullPillarScores.push(pInput.score);
          }
        }

        // Attribution: top 3 bullish, top 3 bearish
        const attribution = computeDriverAttribution(symbol, horizon, horizonContributors);

        // Calculate confidence
        const conf = calculateConfidence({
          totalConfiguredIndicatorWeight,
          availableIndicatorWeight,
          availableFreshnessFactors: allFreshnessFactors,
          nonNullPillarScores,
          yieldCurve10y2y: cachedYieldCurve10y2y,
          vixLevel: cachedVixLevel,
          hasSuspiciousJumpFlag: anySuspiciousJump,
        });

        // Store drivers: clean replace for this asset/horizon/asOf/model to avoid orphan rows
        if (!options.dryRun) {
          await db
            .from('drivers')
            .delete()
            .eq('asset_id', asset.id)
            .eq('horizon', horizon)
            .eq('computed_at', asOf)
            .eq('model_version_id', modelVersion);

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

          // Store asset_scores (upsert with idempotency)
          await db.from('asset_scores').upsert(
            {
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
                available_pillars: assetRes.nonNullPillarCount,
                total_pillars: assetRes.totalPillarCount,
                driver_contribution_sum: attribution.totalContributionSum,
              },
            },
            { onConflict: 'asset_id,horizon,computed_at,model_version_id' }
          );
          rowsWritten++;
          assetScoresWritten++;
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

    logger.info(
      `[Job:${jobName}] Scoring complete: ${assetsProcessed} assets processed, ${assetScoresWritten} asset scores written, ${rowsWritten} total rows.`
    );

    return {
      rowsWritten,
      assetsProcessed,
      assetScoresWritten,
      modelVersion,
      configHash,
    };
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
  runScoring().catch((err) => {
    logger.error(`runScoring execution error: ${err?.message || err}`);
    process.exitCode = 1;
  });
}
