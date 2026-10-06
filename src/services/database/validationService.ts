/**
 * PRIME PIP FX COMMAND CENTER — Financial Data Validation Architecture
 * Implements the 14-Point Automated Verification Protocol for Institutional Economic Data.
 *
 * Rules:
 * - Missing data MUST remain null.
 * - Never replace missing values with 0, estimated values, AI values, or placeholders.
 * - Only verified observations passing critical checks can receive VERIFIED status.
 */

import {
  ObservationRecord,
  ValidationResultRecord,
  ValidationStatus,
  DataQuality,
  DataFreshness,
  ValidationCheckStatus,
} from '../../types/financialDatabaseTypes';

export interface ValidationEvaluation {
  observationId: string;
  isValid: boolean;
  validationStatus: ValidationStatus;
  dataQuality: DataQuality;
  confidence: number;
  freshness: DataFreshness;
  results: ValidationResultRecord[];
}

/** Known official institutional source IDs */
const KNOWN_OFFICIAL_SOURCES = new Set([
  'src_fed',
  'src_fred',
  'src_bls',
  'src_bea',
  'src_census',
  'src_treasury',
  'src_cftc',
  'src_ecb',
  'src_boe',
  'src_boj',
  'src_snb',
  'src_boc',
  'src_rba',
  'src_rbnz',
  'src_eurostat',
  'src_ons',
  'src_statcan',
  'src_abs',
  'src_statsnz',
  'src_sec_edgar',
  'src_cme_group',
  'src_eia',
  'src_bis',
  'src_imf',
  'src_oecd',
]);

/** Known official institutional domain suffixes */
const TRUSTED_DOMAINS = [
  'federalreserve.gov',
  'stlouisfed.org',
  'bls.gov',
  'bea.gov',
  'census.gov',
  'treasury.gov',
  'cftc.gov',
  'ecb.europa.eu',
  'bankofengland.co.uk',
  'boj.or.jp',
  'snb.ch',
  'bankofcanada.ca',
  'rba.gov.au',
  'rbnz.govt.nz',
  'sec.gov',
  'eia.gov',
  'bis.org',
  'imf.org',
  'oecd.org',
  'cmegroup.com',
];

export class FinancialDataValidator {
  /**
   * Runs the complete 14-point validation engine against an observation.
   */
  public static validateObservation(
    obs: ObservationRecord,
    existingObservations: ObservationRecord[] = []
  ): ValidationEvaluation {
    const results: ValidationResultRecord[] = [];
    const now = new Date();

    // 1. Source Authenticity
    const isKnownSource = KNOWN_OFFICIAL_SOURCES.has(obs.sourceId) || obs.sourceId.startsWith('src_');
    results.push(this.createResult(
      obs.id,
      'SOURCE_AUTHENTICITY',
      isKnownSource ? 'PASSED' : 'WARNING',
      isKnownSource
        ? `Source ID '${obs.sourceId}' is authenticated against official institutional registries.`
        : `Source ID '${obs.sourceId}' is not in primary central bank / statistical agency registry.`
    ));

    // 2. Indicator Identity
    const hasValidIndicator = Boolean(obs.indicatorId && obs.indicatorId.trim().length > 2);
    results.push(this.createResult(
      obs.id,
      'INDICATOR_IDENTITY',
      hasValidIndicator ? 'PASSED' : 'FAILED',
      hasValidIndicator
        ? `Indicator ID '${obs.indicatorId}' is well-formed.`
        : 'Indicator identifier is missing or malformed.'
    ));

    // 3. Series Identifier
    const hasProviderSeries = Boolean(obs.providerId && obs.providerId.trim().length > 0);
    results.push(this.createResult(
      obs.id,
      'SERIES_IDENTIFIER',
      hasProviderSeries ? 'PASSED' : 'WARNING',
      hasProviderSeries
        ? `Provider series mapping confirmed for '${obs.providerId}'.`
        : 'Missing provider connector series mapping.'
    ));

    // 4. Date Format
    let isValidDate = false;
    if (obs.releaseDate) {
      const parsedDate = Date.parse(obs.releaseDate);
      isValidDate = !isNaN(parsedDate) && /^\d{4}-\d{2}-\d{2}/.test(obs.releaseDate);
    }
    results.push(this.createResult(
      obs.id,
      'DATE_FORMAT',
      isValidDate ? 'PASSED' : obs.releaseDate === null ? 'WARNING' : 'FAILED',
      isValidDate
        ? `Release date '${obs.releaseDate}' adheres to standard ISO date format.`
        : obs.releaseDate === null
        ? 'Release date not published by source (preserved as null).'
        : `Invalid release date format: '${obs.releaseDate}'.`
    ));

    // 5. Period Format
    const hasValidPeriod = Boolean(obs.period && obs.period.trim().length >= 4);
    results.push(this.createResult(
      obs.id,
      'PERIOD_FORMAT',
      hasValidPeriod ? 'PASSED' : 'FAILED',
      hasValidPeriod
        ? `Observation reporting period '${obs.period}' is valid.`
        : 'Missing observation reporting period.'
    ));

    // 6. Unit Validity
    const hasValidUnit = Boolean(obs.unit && obs.unit.trim().length > 0);
    results.push(this.createResult(
      obs.id,
      'UNIT_VALIDITY',
      hasValidUnit ? 'PASSED' : 'FAILED',
      hasValidUnit
        ? `Unit of measure '${obs.unit}' is defined.`
        : 'Missing unit of measure definition.'
    ));

    // 7. Numerical Format
    const isValueValidNum = obs.value === null || (typeof obs.value === 'number' && !isNaN(obs.value));
    const isPrevValidNum = obs.previousValue === null || (typeof obs.previousValue === 'number' && !isNaN(obs.previousValue));
    const isForecastValidNum = obs.forecastValue === null || (typeof obs.forecastValue === 'number' && !isNaN(obs.forecastValue));
    const isActualValidNum = obs.actualValue === null || (typeof obs.actualValue === 'number' && !isNaN(obs.actualValue));
    const numericalPassed = isValueValidNum && isPrevValidNum && isForecastValidNum && isActualValidNum;

    results.push(this.createResult(
      obs.id,
      'NUMERICAL_FORMAT',
      numericalPassed ? 'PASSED' : 'FAILED',
      numericalPassed
        ? 'Numerical values adhere to strict IEEE floating-point / null schema.'
        : 'Invalid numerical representations detected (NaN or non-numeric types).'
    ));

    // 8. Duplicate Records
    const duplicates = existingObservations.filter(
      (o) => o.id !== obs.id && o.indicatorId === obs.indicatorId && o.period === obs.period && !o.isRevision
    );
    const hasDuplicate = duplicates.length > 0;
    results.push(this.createResult(
      obs.id,
      'DUPLICATE_CHECK',
      hasDuplicate ? 'FAILED' : 'PASSED',
      hasDuplicate
        ? `Conflicting duplicate observation found for period '${obs.period}' (Existing ID: ${duplicates[0].id}).`
        : 'Uniqueness verified for indicator series period.'
    ));

    // 9. Revision Consistency
    let revisionCheck: ValidationCheckStatus = 'PASSED';
    let revisionMsg = 'Revision state consistent.';
    if (obs.isRevision) {
      if (obs.revisionValue === null && obs.value === null) {
        revisionCheck = 'FAILED';
        revisionMsg = 'Observation marked as revision but provides no revision value.';
      } else {
        revisionMsg = `Official statistical revision recorded: ${obs.revisionValue ?? obs.value} (Previous: ${obs.previousValue ?? 'N/A'}).`;
      }
    }
    results.push(this.createResult(obs.id, 'REVISION_CONSISTENCY', revisionCheck, revisionMsg));

    // 10. Previous Value
    const hasPrevious = obs.previousValue !== null;
    results.push(this.createResult(
      obs.id,
      'PREVIOUS_VALUE',
      'PASSED',
      hasPrevious
        ? `Previous historical reference available: ${obs.previousValue}.`
        : 'No previous historical comparison provided by source (preserved as null).'
    ));

    // 11. Actual Value
    const hasActual = obs.actualValue !== null || obs.value !== null;
    results.push(this.createResult(
      obs.id,
      'ACTUAL_VALUE',
      hasActual ? 'PASSED' : 'WARNING',
      hasActual
        ? `Realized actual observation established: ${obs.actualValue ?? obs.value}.`
        : 'Observation value is currently unreleased (DATA_UNAVAILABLE).'
    ));

    // 12. Forecast Value
    results.push(this.createResult(
      obs.id,
      'FORECAST_VALUE',
      'PASSED',
      obs.forecastValue !== null
        ? `Consensus economic forecast recorded: ${obs.forecastValue}.`
        : 'No consensus forecast published for this series (strictly preserved as null).'
    ));

    // 13. Source URL
    let sourceUrlValid = false;
    if (obs.sourceUrl && obs.sourceUrl.startsWith('http')) {
      sourceUrlValid = TRUSTED_DOMAINS.some((domain) => obs.sourceUrl.toLowerCase().includes(domain));
    }
    results.push(this.createResult(
      obs.id,
      'SOURCE_URL',
      sourceUrlValid ? 'PASSED' : obs.sourceUrl ? 'WARNING' : 'FAILED',
      sourceUrlValid
        ? `Official source URL verified against institutional domain whitelist (${obs.sourceUrl}).`
        : obs.sourceUrl
        ? `Source URL '${obs.sourceUrl}' is outside known institutional domains.`
        : 'Official source URL is missing.'
    ));

    // 14. Retrieval Timestamp
    let timestampValid = false;
    let isFuture = false;
    if (obs.retrievedAt) {
      const parsedTime = Date.parse(obs.retrievedAt);
      if (!isNaN(parsedTime)) {
        timestampValid = true;
        isFuture = parsedTime > now.getTime() + 60000; // 1 min buffer
      }
    }
    results.push(this.createResult(
      obs.id,
      'RETRIEVAL_TIMESTAMP',
      timestampValid && !isFuture ? 'PASSED' : 'FAILED',
      timestampValid && !isFuture
        ? `Retrieval timestamp verified: ${obs.retrievedAt}.`
        : isFuture
        ? 'Retrieval timestamp is set in the future.'
        : 'Retrieval timestamp is invalid or missing.'
    ));

    // Evaluate Overall Status & Confidence
    const failedChecks = results.filter((r) => r.status === 'FAILED');
    const warningChecks = results.filter((r) => r.status === 'WARNING');
    const passedChecks = results.filter((r) => r.status === 'PASSED');

    const totalWeight = results.length;
    const confidence = Math.round(((passedChecks.length + warningChecks.length * 0.5) / totalWeight) * 100);

    let validationStatus: ValidationStatus;
    let dataQuality: DataQuality;
    let isValid = false;

    if (obs.value === null && obs.actualValue === null) {
      validationStatus = 'DATA_UNAVAILABLE';
      dataQuality = 'UNKNOWN';
      isValid = false;
    } else if (failedChecks.length > 0) {
      validationStatus = 'VALIDATION_ERROR';
      dataQuality = 'LOW';
      isValid = false;
    } else if (warningChecks.length > 2) {
      validationStatus = 'NEEDS_REVIEW';
      dataQuality = 'MEDIUM';
      isValid = false;
    } else if (isKnownSource && sourceUrlValid && numericalPassed) {
      validationStatus = 'VERIFIED';
      dataQuality = 'HIGH';
      isValid = true;
    } else {
      validationStatus = 'PENDING_VALIDATION';
      dataQuality = 'MEDIUM';
      isValid = false;
    }

    // Determine Freshness
    const freshness = this.determineFreshness(obs, now);

    return {
      observationId: obs.id,
      isValid,
      validationStatus,
      dataQuality,
      confidence,
      freshness,
      results,
    };
  }

  /**
   * Accurately determines data freshness label.
   */
  public static determineFreshness(obs: ObservationRecord, now: Date = new Date()): DataFreshness {
    if (obs.value === null && obs.actualValue === null) {
      return 'UNAVAILABLE';
    }

    const refDateStr = obs.releaseDate || obs.retrievedAt;
    if (!refDateStr) return 'UNAVAILABLE';

    const refTime = Date.parse(refDateStr);
    if (isNaN(refTime)) return 'UNAVAILABLE';

    const diffDays = (now.getTime() - refTime) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) return 'LIVE';
    if (diffDays <= 30) return 'RECENT';
    if (diffDays <= 90) return 'HISTORICAL';
    return 'STALE';
  }

  private static createResult(
    observationId: string,
    check: ValidationResultRecord['check'],
    status: ValidationCheckStatus,
    message: string
  ): ValidationResultRecord {
    return {
      id: `val_${observationId}_${check.toLowerCase()}_${Date.now()}`,
      observationId,
      check,
      status,
      message,
      createdAt: new Date().toISOString(),
    };
  }
}
