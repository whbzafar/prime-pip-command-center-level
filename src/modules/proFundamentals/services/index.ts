import { FundamentalsDataService } from './types';
import { MockDataProvider } from './mockProvider';

/**
 * Data Provider Configuration Flag
 * To migrate to a live real-time API, implement `RealApiProvider implements FundamentalsDataService`
 * and set `CURRENT_PROVIDER_MODE = 'real'`.
 * The entire UI layer remains 100% unchanged!
 */
export type ProviderMode = 'mock' | 'real';

export const CURRENT_PROVIDER_MODE: ProviderMode = 'mock';

class FundamentalsServiceProxy implements FundamentalsDataService {
  private activeProvider: FundamentalsDataService;

  constructor(mode: ProviderMode = CURRENT_PROVIDER_MODE) {
    if (mode === 'mock') {
      this.activeProvider = new MockDataProvider();
    } else {
      // Stub for future RealApiProvider
      this.activeProvider = new MockDataProvider();
    }
  }

  getCurrencyScores(horizon: 'short' | 'long') {
    return this.activeProvider.getCurrencyScores(horizon);
  }

  getCurrencyDetail(code: any) {
    return this.activeProvider.getCurrencyDetail(code);
  }

  getPairDetail(base: any, quote: any) {
    return this.activeProvider.getPairDetail(base, quote);
  }

  getHistory(code: any, days?: number) {
    return this.activeProvider.getHistory(code, days);
  }

  getOpportunities(horizon: 'short' | 'long') {
    return this.activeProvider.getOpportunities(horizon);
  }

  getMetadata() {
    return this.activeProvider.getMetadata();
  }
}

export const fundamentalsService: FundamentalsDataService = new FundamentalsServiceProxy();
export * from './types';
