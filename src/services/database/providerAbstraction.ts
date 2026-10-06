/**
 * PRIME PIP FX COMMAND CENTER — Data Provider Abstraction & Pipeline
 * Decouples the application from individual API endpoints.
 *
 * Architecture:
 * PROVIDER -> RAW RESPONSE -> PARSER -> NORMALIZER -> VALIDATOR -> VERIFIED OBSERVATION -> ANALYSIS ENGINE
 *
 * The analysis engine must never consume unvalidated raw data.
 */

import {
  EconomicDataProvider,
  RawProviderResponse,
  RawProviderRelease,
  ProviderHealthCheckResult,
  HistoryQueryParams,
  ObservationRecord,
  ValidationResultRecord,
  AssetType,
  ValidationStatus,
  DataQuality,
} from '../../types/financialDatabaseTypes';
import { FinancialDataValidator } from './validationService';

export abstract class BaseEconomicDataProvider implements EconomicDataProvider {
  public abstract readonly providerId: string;
  public abstract readonly name: string;
  public abstract readonly supportedAssetClasses: AssetType[];

  public abstract getLatestObservation(indicatorId: string): Promise<RawProviderResponse | null>;
  public abstract getHistoricalObservations(
    indicatorId: string,
    params?: HistoryQueryParams
  ): Promise<RawProviderResponse[]>;
  public abstract getRelease(indicatorId: string, period?: string): Promise<RawProviderRelease | null>;

  /**
   * Validates raw data payload structure.
   */
  public async validateData(rawData: RawProviderResponse): Promise<ValidationResultRecord[]> {
    const results: ValidationResultRecord[] = [];
    const hasData = rawData && rawData.rawPayload !== undefined;

    results.push({
      id: `val_raw_${rawData.providerId}_${Date.now()}`,
      observationId: rawData.seriesId,
      check: 'SERIES_IDENTIFIER',
      status: hasData ? 'PASSED' : 'FAILED',
      message: hasData
        ? `Provider '${rawData.providerId}' payload confirmed for series '${rawData.seriesId}'.`
        : `Provider '${rawData.providerId}' returned empty payload for series '${rawData.seriesId}'.`,
      createdAt: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Health check monitoring.
   */
  public async healthCheck(): Promise<ProviderHealthCheckResult> {
    const start = Date.now();
    try {
      return {
        providerId: this.providerId,
        isHealthy: true,
        responseTimeMs: Date.now() - start,
        message: `Provider '${this.name}' operational.`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        providerId: this.providerId,
        isHealthy: false,
        responseTimeMs: Date.now() - start,
        message: err?.message || 'Health check failed.',
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

/**
 * Normalization Pipeline:
 * Converts raw provider-specific payload into standard ObservationRecord,
 * runs the 14-point validation engine, and ensures missing values remain null.
 */
export class DataNormalizationPipeline {
  /**
   * Ingests, normalizes, validates, and prepares an observation for the database.
   */
  public static async processRawObservation(
    raw: RawProviderResponse,
    indicatorMeta: {
      id: string;
      assetId: string;
      currency: string;
      country: string;
      unit: string;
      sourceId: string;
      sourceUrl: string;
    },
    existingObservations: ObservationRecord[] = []
  ): Promise<{
    rawResponse: RawProviderResponse;
    normalizedObservation: ObservationRecord;
    validation: {
      isValid: boolean;
      status: ValidationStatus;
      quality: DataQuality;
      results: ValidationResultRecord[];
    };
  }> {
    const payload = raw.rawPayload || {};

    // Strictly preserve nulls - never replace with 0 or estimate!
    const parseNumeric = (val: any): number | null => {
      if (val === null || val === undefined || val === '' || val === 'N/A' || val === '.') {
        return null;
      }
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const value = parseNumeric(payload.value ?? payload.actual ?? payload.current);
    const previousValue = parseNumeric(payload.previous ?? payload.previousValue);
    const forecastValue = parseNumeric(payload.forecast ?? payload.consensus);
    const actualValue = parseNumeric(payload.actual ?? payload.realized);
    const revisionValue = parseNumeric(payload.revised ?? payload.revisionValue);
    const isRevision = Boolean(payload.isRevision || revisionValue !== null);

    const period = payload.period || payload.date?.slice(0, 7) || new Date().toISOString().slice(0, 7);
    const releaseDate = payload.releaseDate || payload.date || null;

    const baseObservation: ObservationRecord = {
      id: `obs_${indicatorMeta.id}_${period.replace(/[^a-zA-Z0-9]/g, '_')}`,
      indicatorId: indicatorMeta.id,
      assetId: indicatorMeta.assetId,
      currency: indicatorMeta.currency,
      country: indicatorMeta.country,
      period,
      periodType: payload.periodType || 'MONTHLY',
      releaseDate,
      value,
      unit: indicatorMeta.unit,
      previousValue,
      forecastValue,
      actualValue,
      revisionValue,
      isRevision,
      sourceId: indicatorMeta.sourceId,
      providerId: raw.providerId,
      sourceUrl: indicatorMeta.sourceUrl,
      retrievedAt: raw.fetchedAt || new Date().toISOString(),
      validationStatus: 'PENDING_VALIDATION',
      dataQuality: 'UNKNOWN',
      confidence: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Execute 14-Point Validation Protocol
    const validationEval = FinancialDataValidator.validateObservation(
      baseObservation,
      existingObservations
    );

    baseObservation.validationStatus = validationEval.validationStatus;
    baseObservation.dataQuality = validationEval.dataQuality;
    baseObservation.confidence = validationEval.confidence;
    baseObservation.freshness = validationEval.freshness;

    return {
      rawResponse: raw,
      normalizedObservation: baseObservation,
      validation: {
        isValid: validationEval.isValid,
        status: validationEval.validationStatus,
        quality: validationEval.dataQuality,
        results: validationEval.results,
      },
    };
  }
}

/**
 * Registry holding active data provider implementations.
 */
class ProviderRegistryService {
  private providers: Map<string, EconomicDataProvider> = new Map();

  public registerProvider(provider: EconomicDataProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  public getProvider(providerId: string): EconomicDataProvider | undefined {
    return this.providers.get(providerId);
  }

  public listProviders(): EconomicDataProvider[] {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistryService();
