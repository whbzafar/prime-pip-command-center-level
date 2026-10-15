import { IndicatorRecord } from '../shared/types.js';

export interface NormalizedObservation {
  indicatorId: string;
  periodDate: string; // YYYY-MM-DD
  value: number;
  releasedAt: string; // ISO 8601
  isRevision: boolean;
  qualityFlag?: {
    flagType: 'out_of_range' | 'suspicious_jump';
    details: Record<string, any>;
  };
}

export interface CollectorFetchOptions {
  since?: string; // YYYY-MM-DD
  fullHistory?: boolean;
  lookbackDays?: number;
  dryRun?: boolean;
}

export interface SeriesVerificationResult {
  seriesId: string;
  isValid: boolean;
  title?: string;
  frequency?: string;
  units?: string;
  lastUpdated?: string;
  warningMessage?: string;
}

export interface CollectorResult {
  indicatorId: string;
  observations: NormalizedObservation[];
  latestObservationDate?: string;
  sourceStatus: 'OK' | 'RATE_LIMITED' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'NO_DATA' | 'MISMATCH_WARNING';
  errorMessage?: string;
  warningMessage?: string;
}

export interface DataCollector {
  readonly sourceId: string;
  readonly name: string;
  verifySeries?(seriesId: string): Promise<SeriesVerificationResult>;
  fetch(indicator: IndicatorRecord, options?: CollectorFetchOptions): Promise<CollectorResult>;
}
