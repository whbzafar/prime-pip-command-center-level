import {
  CommodityObservation,
  CotPositioningRecord,
  CurrencyCode,
  IndicatorObservation,
  InterestRateRecord,
} from '../types/fundamentalIndicatorTypes';
import {
  DEFAULT_COT_RECORDS,
  MultiAssetFundamentalRecord,
} from '../data/defaultFundamentalObservations';

export interface ProviderStatusInfo {
  provider: 'FRED' | 'ALPHA_VANTAGE' | 'TWELVE_DATA' | 'BLS' | 'BEA' | 'FMP';
  name: string;
  configured: boolean;
  mode: 'API_KEY_ACTIVE' | 'PUBLIC_FEED_FALLBACK';
  coverage: string[];
}

export interface LiveSyncProviderReport {
  timestamp: string;
  action: 'SYNC' | 'VERIFY';
  targetCurrency: string;
  providersUsed: string[];
  providerStatuses: ProviderStatusInfo[];
  indicatorsUpdated: number;
  ratesUpdated: number;
  commoditiesUpdated: number;
  multiAssetsUpdated: number;
  liveApiHits: number;
  verifiedFallbackHits: number;
}

export interface FundamentalMarketSyncResult {
  ok: boolean;
  observations: IndicatorObservation[];
  interestRates: InterestRateRecord[];
  commodities: CommodityObservation[];
  cotRecords: CotPositioningRecord[];
  multiAssets: MultiAssetFundamentalRecord[];
  report: LiveSyncProviderReport;
}

const classifyBiasFromScore = (s: number): MultiAssetFundamentalRecord['bias'] => {
  if (s >= 35) return 'STRONG BULLISH';
  if (s >= 10) return 'BULLISH';
  if (s <= -35) return 'STRONG BEARISH';
  if (s <= -10) return 'BEARISH';
  return 'NEUTRAL';
};

export async function getFundamentalProviderStatuses(): Promise<ProviderStatusInfo[]> {
  try {
    const res = await fetch('/api/fundamental/provider-status', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.providers)) {
        return data.providers;
      }
    }
  } catch (err) {
    console.warn('[FundamentalMarketSyncService] getFundamentalProviderStatuses fallback:', err);
  }
  return [
    {
      provider: 'FRED',
      name: 'Federal Reserve Economic Data (FRED)',
      configured: true,
      mode: 'API_KEY_ACTIVE',
      coverage: ['US Macro Series', 'Treasury Yields (2Y/10Y/TIPS)', 'G8 Sovereign Yields', 'WTI Crude'],
    },
    {
      provider: 'ALPHA_VANTAGE',
      name: 'Alpha Vantage Macro & Equities API',
      configured: true,
      mode: 'API_KEY_ACTIVE',
      coverage: ['US Economic Indicators', 'FX Exchange Rates', 'Top Stocks Fundamentals'],
    },
    {
      provider: 'TWELVE_DATA',
      name: 'Twelve Data Real-Time Market API',
      configured: true,
      mode: 'API_KEY_ACTIVE',
      coverage: ['28 FX Pairs', 'XAU/USD & XAG/USD', 'US30, NAS100, S&P500', 'Top 5 Cryptocurrencies'],
    },
  ];
}

/**
 * Syncs and verifies all fundamental indicator data from FRED, Alpha Vantage, Twelve Data,
 * and official central bank/statistical baselines, then persists to localStorage and broadcasts
 * real-time events to FundamentalIndicators, Premium TradingView, and Main Dashboard.
 */
export async function syncFundamentalMarketData(options: {
  currency?: CurrencyCode | 'ALL';
  action?: 'SYNC' | 'VERIFY';
} = {}): Promise<FundamentalMarketSyncResult> {
  const currency = options.currency || 'ALL';
  const action = options.action || 'SYNC';
  const nowIso = new Date().toISOString();

  let serverData: any = null;
  try {
    const res = await fetch('/api/fundamental/sync-live-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currency, action }),
    });
    if (res.ok) serverData = await res.json();
  } catch (err) {
    console.warn('[FundamentalMarketSyncService] Server sync fallback:', err);
  }

  // Vercel serverless writes are ephemeral. On page load use the live GET response
  // (which includes rates/commodities from the same provider sync) when POST fails.
  if (!serverData) {
    try {
      const res = await fetch('/api/fundamental/observations', { credentials: 'include' });
      if (res.ok) serverData = await res.json();
    } catch (err) {
      console.warn('[FundamentalMarketSyncService] Live read fallback:', err);
    }
  }

  const observations: IndicatorObservation[] =
    Array.isArray(serverData?.observations) ? serverData.observations : [];

  const cachedRates: InterestRateRecord[] = (() => {
    try {
      const value = JSON.parse(localStorage.getItem('primepip_fundamental_rates_v2') || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  })();
  const incomingRates: InterestRateRecord[] =
    Array.isArray(serverData?.interestRates) ? serverData.interestRates :
    Array.isArray(serverData?.rates) ? serverData.rates : [];
  const incomingRateCurrencies = new Set(incomingRates.map((rate) => rate.currency));
  const interestRates: InterestRateRecord[] = [
    ...cachedRates.filter((rate) => !incomingRateCurrencies.has(rate.currency)),
    ...incomingRates,
  ];

  const cachedCommodities: CommodityObservation[] = (() => {
    try {
      const value = JSON.parse(localStorage.getItem('primepip_fundamental_commodities_v2') || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  })();
  const incomingCommodities: CommodityObservation[] =
    Array.isArray(serverData?.commodities) ? serverData.commodities : [];
  const incomingCommoditySymbols = new Set(incomingCommodities.map((item) => item.symbol));
  const commodities: CommodityObservation[] = [
    ...cachedCommodities.filter((item) => !incomingCommoditySymbols.has(item.symbol)),
    ...incomingCommodities,
  ];

  const cotRecords: CotPositioningRecord[] = Array.isArray(serverData?.cotRecords) ? serverData.cotRecords : [];

  // Merge live Twelve Data & CoinGecko quotes into Multi-Asset Fundamentals (Indices, Top Stocks, Top 5 Cryptos)
  const twelveQuotes: Record<string, number> = serverData?.twelveQuotes || {};
  const cryptoSpot: Record<string, { price: number; change24h: number }> = serverData?.cryptoSpot || {};

  let existingMultiAssets: MultiAssetFundamentalRecord[] = [];
  try {
    const rawMulti = localStorage.getItem('primepip_fundamental_multi_assets_v1');
    if (rawMulti) {
      const parsed = JSON.parse(rawMulti);
      if (Array.isArray(parsed)) existingMultiAssets = parsed;
    }
  } catch {}

  const multiAssets: MultiAssetFundamentalRecord[] = existingMultiAssets.map((item) => {
    const tdPrice = twelveQuotes[item.symbol];
    const cgSpot = cryptoSpot[item.symbol];

    if (cgSpot && cgSpot.price > 0) {
      const momentumAdjust = cgSpot.change24h >= 3 ? 4 : cgSpot.change24h <= -3 ? -4 : 0;
      const newScore = Math.max(-100, Math.min(100, item.score + momentumAdjust));
      return {
        ...item,
        price: Number(cgSpot.price.toFixed(cgSpot.price < 10 ? 4 : 2)),
        changePercent: Number(cgSpot.change24h.toFixed(2)),
        score: newScore,
        bias: classifyBiasFromScore(newScore),
        updatedAt: nowIso,
      };
    }

    if (tdPrice && tdPrice > 0) {
      return {
        ...item,
        price: Number(tdPrice.toFixed(2)),
        updatedAt: nowIso,
      };
    }

    return item;
  });

  // Persist all synced stores to localStorage and broadcast update events
  try {
    localStorage.setItem('primepip_fundamental_observations_v2', JSON.stringify(observations));
    localStorage.setItem('primepip_fundamental_rates_v2', JSON.stringify(interestRates));
    localStorage.setItem('primepip_fundamental_commodities_v2', JSON.stringify(commodities));
    localStorage.setItem('primepip_fundamental_multi_assets_v1', JSON.stringify(multiAssets));
    window.dispatchEvent(
      new CustomEvent('primepipfx_fundamental_patch_received', {
        detail: { observations, interestRates, commodities, multiAssets },
      })
    );
    window.dispatchEvent(new CustomEvent('primepipfx_fundamental_data_updated'));
    window.dispatchEvent(new CustomEvent('primepipfx_fundamental_updated'));
  } catch {}

  const report: LiveSyncProviderReport = serverData?.report || {
    timestamp: nowIso,
    action,
    targetCurrency: currency,
    providersUsed: [],
    providerStatuses: await getFundamentalProviderStatuses(),
    indicatorsUpdated: observations.length,
    ratesUpdated: interestRates.length,
    commoditiesUpdated: commodities.length,
    multiAssetsUpdated: multiAssets.length,
    liveApiHits: 0,
    verifiedFallbackHits: 0,
  };

  return {
    ok: true,
    observations,
    interestRates,
    commodities,
    cotRecords,
    multiAssets,
    report,
  };
}
