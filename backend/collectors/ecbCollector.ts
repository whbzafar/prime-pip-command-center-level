import { DataCollector, CollectorResult } from './types.js';
import { IndicatorRecord, ObservationRecord } from '../shared/types.js';
import { logger } from '../shared/logger.js';
import { withRetry } from '../shared/retry.js';

/**
 * European Central Bank (ECB) Data Portal SDMX Collector
 */
export class EcbCollector implements DataCollector {
  readonly sourceId = 'ecb';
  readonly name = 'European Central Bank (ECB)';

  async fetch(indicator: IndicatorRecord): Promise<CollectorResult> {
    logger.info(`[EcbCollector] Processing Eurozone indicator: ${indicator.code} (${indicator.source_series_id})`);

    return withRetry(async () => {
      // TODO: Connect to ECB SDMX 2.1 REST API:
      // https://data-api.ecb.europa.eu/service/data/{flowRef}/{key}
      // Parse SDMX-JSON response and extract observations
      const observations: ObservationRecord[] = [];
      return {
        indicatorId: indicator.id,
        observations,
        sourceStatus: 'OK',
      };
    }, `EcbCollector:${indicator.code}`);
  }
}
