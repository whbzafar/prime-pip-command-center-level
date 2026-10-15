import { SupabaseClient } from '@supabase/supabase-js';
import { getDbClient } from '../shared/db.js';
import { ObservationRecord, DataQualityFlagRecord, IndicatorFrequency } from '../shared/types.js';
import { FREQUENCY_FRESHNESS_CONFIG, SCORING_MODEL_CONFIG } from './modelConfig.js';
import { logger } from '../shared/logger.js';

export interface PointInTimeObservation {
  periodDate: string;
  value: number;
  releasedAt: string;
  isRevision?: boolean;
}

export interface IndicatorPointInTimeResult {
  indicatorId: string;
  code?: string;
  series: PointInTimeObservation[];
  latestObservation: PointInTimeObservation | null;
  freshnessFactor: number; // 1.0 (fresh), 0.5 (stale), 0.0 (very_stale)
  hasSuspiciousJump: boolean;
  activeWeightMultiplier: number; // 1.0 or 0.5
  warningFlags: string[];
}

/**
 * Pure function: filters and reconstructs a point-in-time series as of a specified timestamp.
 * Guarantees zero look-ahead bias:
 * 1. Discards any observation released strictly after asOf.
 * 2. Resolves revisions: for each period_date, picks the latest vintage with released_at <= asOf.
 * 3. Filters out observations flagged as out_of_range or missing.
 * 4. Down-weights indicators with suspicious_jump flags.
 * 5. Calculates freshness factor according to release frequency.
 */
export function filterObservationsPointInTime(
  rawObservations: ObservationRecord[],
  asOf: string,
  qualityFlags: DataQualityFlagRecord[] = [],
  frequency: IndicatorFrequency = 'monthly'
): {
  series: PointInTimeObservation[];
  latestObservation: PointInTimeObservation | null;
  freshnessFactor: number;
  hasSuspiciousJump: boolean;
  activeWeightMultiplier: number;
  warningFlags: string[];
} {
  const asOfTime = new Date(asOf).getTime();
  const warningFlags: string[] = [];

  // Build lookup of bad observation IDs / dates
  const rejectedObservationIds = new Set<string>();
  const suspiciousJumpPeriods = new Set<string>();
  let hasSuspiciousJumpGlobal = false;

  for (const flag of qualityFlags) {
    const flagCreated = new Date(flag.created_at).getTime();
    if (flagCreated <= asOfTime) {
      if (flag.flag_type === 'out_of_range' || flag.flag_type === 'missing') {
        if (flag.observation_id) rejectedObservationIds.add(flag.observation_id);
        if (flag.details?.period_date) rejectedObservationIds.add(flag.details.period_date);
      }
      if (flag.flag_type === 'suspicious_jump') {
        hasSuspiciousJumpGlobal = true;
        if (flag.details?.period_date) suspiciousJumpPeriods.add(flag.details.period_date);
      }
    }
  }

  // 1. Filter: strictly released_at <= asOf
  const eligible = rawObservations.filter((obs) => {
    const relTime = new Date(obs.released_at).getTime();
    if (relTime > asOfTime) return false;
    if (obs.id && rejectedObservationIds.has(obs.id)) return false;
    if (rejectedObservationIds.has(obs.period_date)) return false;
    return true;
  });

  // 2. Resolve revisions: latest vintage per period_date
  const vintageMap = new Map<string, ObservationRecord>();
  for (const obs of eligible) {
    const existing = vintageMap.get(obs.period_date);
    if (!existing) {
      vintageMap.set(obs.period_date, obs);
    } else {
      const existingRel = new Date(existing.released_at).getTime();
      const currentRel = new Date(obs.released_at).getTime();
      if (currentRel > existingRel) {
        vintageMap.set(obs.period_date, obs);
      }
    }
  }

  // 3. Sort ascending by period_date
  const sorted: PointInTimeObservation[] = Array.from(vintageMap.values())
    .map((o) => ({
      periodDate: o.period_date,
      value: Number(o.value),
      releasedAt: o.released_at,
      isRevision: Boolean(o.is_revision),
    }))
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate));

  if (sorted.length === 0) {
    return {
      series: [],
      latestObservation: null,
      freshnessFactor: 0.0,
      hasSuspiciousJump: false,
      activeWeightMultiplier: 0.0,
      warningFlags: ['no_observations_as_of_date'],
    };
  }

  const latest = sorted[sorted.length - 1];

  // 4. Check for suspicious jump downweighting
  const latestHasJump = hasSuspiciousJumpGlobal || suspiciousJumpPeriods.has(latest.periodDate);
  const activeWeightMultiplier = latestHasJump ? SCORING_MODEL_CONFIG.jumpDownweightFactor : 1.0;
  if (latestHasJump) {
    warningFlags.push('suspicious_jump_downweighted');
  }

  // 5. Freshness calculation
  const asOfDateObj = new Date(asOf.slice(0, 10));
  const latestDateObj = new Date(latest.periodDate);
  const diffDays = Math.max(0, Math.floor((asOfDateObj.getTime() - latestDateObj.getTime()) / (1000 * 86400)));

  const tolerance = FREQUENCY_FRESHNESS_CONFIG[frequency] || FREQUENCY_FRESHNESS_CONFIG.monthly;
  let freshnessFactor = 1.0;

  if (diffDays <= tolerance.freshDays) {
    freshnessFactor = 1.0;
  } else if (diffDays <= tolerance.staleDays) {
    freshnessFactor = 0.5;
    warningFlags.push(`stale_observation_${diffDays}d_old`);
  } else {
    freshnessFactor = 0.0; // very_stale (excluded from aggregation)
    warningFlags.push(`very_stale_observation_${diffDays}d_old`);
  }

  return {
    series: sorted,
    latestObservation: latest,
    freshnessFactor,
    hasSuspiciousJump: latestHasJump,
    activeWeightMultiplier: freshnessFactor > 0 ? activeWeightMultiplier : 0.0,
    warningFlags,
  };
}

/**
 * Loads point-in-time observation history from Supabase for a given indicator as of a specific timestamp.
 */
export async function getSeriesAsOf(
  indicatorId: string,
  asOf: string,
  db?: SupabaseClient
): Promise<IndicatorPointInTimeResult> {
  const client = db || getDbClient();

  try {
    // 1. Fetch indicator metadata
    const { data: indicator, error: indErr } = await client
      .from('indicators')
      .select('id, code, frequency')
      .eq('id', indicatorId)
      .single();

    if (indErr) {
      throw new Error(`Failed to query indicator ${indicatorId}: ${indErr.message}`);
    }

    const frequency: IndicatorFrequency = indicator.frequency || 'monthly';

    // 2. Fetch observations with released_at <= asOf
    const { data: rawObs, error: obsErr } = await client
      .from('observations')
      .select('id, indicator_id, period_date, value, released_at, is_revision')
      .eq('indicator_id', indicatorId)
      .lte('released_at', asOf)
      .order('period_date', { ascending: true })
      .order('released_at', { ascending: false });

    if (obsErr) {
      throw new Error(`Failed to fetch observations for ${indicatorId}: ${obsErr.message}`);
    }

    // 3. Fetch data quality flags created <= asOf
    const { data: flags } = await client
      .from('data_quality_flags')
      .select('*')
      .eq('indicator_id', indicatorId)
      .lte('created_at', asOf);

    const filtered = filterObservationsPointInTime(rawObs || [], asOf, flags || [], frequency);

    return {
      indicatorId,
      code: indicator.code,
      ...filtered,
    };
  } catch (err: any) {
    logger.warn(`[PointInTimeData] getSeriesAsOf error for ${indicatorId}: ${err?.message || err}`);
    return {
      indicatorId,
      series: [],
      latestObservation: null,
      freshnessFactor: 0.0,
      hasSuspiciousJump: false,
      activeWeightMultiplier: 0.0,
      warningFlags: ['fetch_error'],
    };
  }
}
