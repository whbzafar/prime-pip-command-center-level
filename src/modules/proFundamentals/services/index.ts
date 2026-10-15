import { FundamentalsDataService } from './types';
import { MockDataProvider } from './mockProvider';
import { RealApiProvider } from './realApiProvider';

/**
 * Data Provider Configuration Flag
 *
 * Switch between mock data and real Supabase PostgreSQL backend with one flag:
 * - 'mock': Local deterministic baseline data (zero network required)
 * - 'real': Live Supabase PostgreSQL REST API, Views (v_pair_scores, v_latest_asset_scores) and RPCs
 *
 * Can also be configured at build/runtime via VITE_PRO_FUNDAMENTALS_PROVIDER='real' | 'mock'.
 */
export type ProviderMode = 'mock' | 'real';

const envMode = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_PRO_FUNDAMENTALS_PROVIDER
    ? String(import.meta.env.VITE_PRO_FUNDAMENTALS_PROVIDER).toLowerCase()
    : 'mock'
) as ProviderMode;

export const CURRENT_PROVIDER_MODE: ProviderMode = envMode === 'real' ? 'real' : 'mock';

class FundamentalsServiceProxy implements FundamentalsDataService {
  private activeProvider: FundamentalsDataService;
  private currentMode: ProviderMode;

  constructor(mode: ProviderMode = CURRENT_PROVIDER_MODE) {
    this.currentMode = mode;
    this.activeProvider = mode === 'real' ? new RealApiProvider() : new MockDataProvider();
  }

  setProviderMode(mode: ProviderMode): void {
    this.currentMode = mode;
    this.activeProvider = mode === 'real' ? new RealApiProvider() : new MockDataProvider();
  }

  getProviderMode(): ProviderMode {
    return this.currentMode;
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

export const fundamentalsService: FundamentalsDataService & {
  setProviderMode: (mode: ProviderMode) => void;
  getProviderMode: () => ProviderMode;
} = new FundamentalsServiceProxy();

export * from './types';
export * from './mockProvider';
export * from './realApiProvider';
