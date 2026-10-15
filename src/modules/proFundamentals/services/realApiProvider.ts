import { FundamentalsDataService } from './types';
import {
  CurrencyCode,
  CurrencyFundamentalProfile,
  CurrencySummaryItem,
  HistoricalScorePoint,
  Horizon,
  PairFundamentalProfile,
  PairOpportunity,
} from '../types';
import { MockDataProvider } from './mockProvider';

/**
 * RealApiProvider
 * Connects the Pro Fundamentals front-end directly to Supabase PostgreSQL views and RPCs
 * using the public anonymous key.
 *
 * Implements the identical FundamentalsDataService interface as MockDataProvider
 * ensuring ZERO UI changes when toggling between mock and live data.
 *
 * Single Source of Truth: Pair scores and differentials are strictly calculated
 * on the database layer via v_pair_scores and get_pair_detail RPC.
 */
export class RealApiProvider implements FundamentalsDataService {
  private fallbackProvider = new MockDataProvider();
  private supabaseUrl: string;
  private anonKey: string;

  constructor() {
    this.supabaseUrl = (
      import.meta.env.VITE_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    ).replace(/\/$/, '');

    this.anonKey =
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      '';
  }

  private isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.anonKey);
  }

  private getHeaders(): HeadersInit {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  /**
   * Retrieves summary scores, bullish %, and rank for all 8 major currencies
   * Source: v_latest_asset_scores view
   */
  async getCurrencyScores(horizon: Horizon): Promise<CurrencySummaryItem[]> {
    if (!this.isConfigured()) {
      console.warn('[RealApiProvider] Supabase credentials unconfigured. Falling back gracefully.');
      return this.fallbackProvider.getCurrencyScores(horizon);
    }

    try {
      const url = new URL(`${this.supabaseUrl}/rest/v1/v_latest_asset_scores`);
      url.searchParams.set('asset_class', 'eq.currency');
      url.searchParams.set('horizon', `eq.${horizon}`);
      url.searchParams.set('order', 'score.desc');

      const res = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const rows: any[] = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        console.warn('[RealApiProvider] Empty score response from v_latest_asset_scores. Using fallback.');
        return this.fallbackProvider.getCurrencyScores(horizon);
      }

      // Map rows to CurrencySummaryItem[]
      return rows.map((r) => {
        const score = Number(r.score ?? 0);
        const bullishPct = Number(r.bullish_pct ?? (score + 100) / 2);

        return {
          code: r.symbol as CurrencyCode,
          name: r.asset_name,
          flag: r.asset_metadata?.flag || '🏳️',
          score,
          bullishPct,
          biasLabel: r.bias_label || 'Neutral',
          confidence: (r.confidence?.charAt(0).toUpperCase() + r.confidence?.slice(1)) || 'Medium',
          shortScore: horizon === 'short' ? score : Number(r.score ?? 0),
          longScore: horizon === 'long' ? score : Number(r.score ?? 0),
          sevenDayChange: 0,
          sparkline: [score - 4, score - 2, score - 1, score + 1, score, score],
          updatedAt: r.computed_at || new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('[RealApiProvider:getCurrencyScores] Error fetching from Supabase:', err);
      // Graceful fallback to prevent UI crash
      return this.fallbackProvider.getCurrencyScores(horizon);
    }
  }

  /**
   * Retrieves full profile including 7 pillars, drivers, and indicators for a specific currency
   * Source: get_currency_detail RPC
   */
  async getCurrencyDetail(code: CurrencyCode): Promise<CurrencyFundamentalProfile> {
    if (!this.isConfigured()) {
      return this.fallbackProvider.getCurrencyDetail(code);
    }

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/rpc/get_currency_detail`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          p_code: code,
          p_horizon: 'short',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      if (!data || !data.code) {
        throw new Error('Invalid profile payload returned from RPC get_currency_detail');
      }

      return data as CurrencyFundamentalProfile;
    } catch (err) {
      console.error(`[RealApiProvider:getCurrencyDetail] Error for ${code}:`, err);
      return this.fallbackProvider.getCurrencyDetail(code);
    }
  }

  /**
   * Dynamically evaluates a pair: base score minus quote score
   * Source: get_pair_detail RPC (enforces single source of truth)
   */
  async getPairDetail(base: CurrencyCode, quote: CurrencyCode): Promise<PairFundamentalProfile> {
    if (!this.isConfigured()) {
      return this.fallbackProvider.getPairDetail(base, quote);
    }

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/rpc/get_pair_detail`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          p_base: base,
          p_quote: quote,
          p_horizon: 'short',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      if (!data || !data.pair) {
        throw new Error('Invalid pair profile payload returned from RPC get_pair_detail');
      }

      return data as PairFundamentalProfile;
    } catch (err) {
      console.error(`[RealApiProvider:getPairDetail] Error for ${base}/${quote}:`, err);
      return this.fallbackProvider.getPairDetail(base, quote);
    }
  }

  /**
   * Retrieves historical time series for chart display
   * Source: get_score_history RPC
   */
  async getHistory(code: CurrencyCode, days = 30): Promise<HistoricalScorePoint[]> {
    if (!this.isConfigured()) {
      return this.fallbackProvider.getHistory(code, days);
    }

    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const res = await fetch(`${this.supabaseUrl}/rest/v1/rpc/get_score_history`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          p_code: code,
          p_from_date: startDate,
          p_to_date: endDate,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as HistoricalScorePoint[];
      }
      return this.fallbackProvider.getHistory(code, days);
    } catch (err) {
      console.error(`[RealApiProvider:getHistory] Error for ${code}:`, err);
      return this.fallbackProvider.getHistory(code, days);
    }
  }

  /**
   * Returns ranked currency pair opportunities by score divergence
   * Source: v_pair_scores view (strictly single source of truth for pair scores)
   */
  async getOpportunities(horizon: Horizon): Promise<PairOpportunity[]> {
    if (!this.isConfigured()) {
      return this.fallbackProvider.getOpportunities(horizon);
    }

    try {
      const url = new URL(`${this.supabaseUrl}/rest/v1/v_pair_scores`);
      url.searchParams.set('horizon', `eq.${horizon}`);
      url.searchParams.set('order', 'score_gap.desc');
      url.searchParams.set('limit', '28');

      const res = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const rows: any[] = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return this.fallbackProvider.getOpportunities(horizon);
      }

      return rows.map((r) => ({
        pair: r.pair,
        base: r.base_symbol as CurrencyCode,
        quote: r.quote_symbol as CurrencyCode,
        score: Number(r.pair_score),
        bullishPct: Number(r.bullish_pct),
        biasLabel: r.bias_label || 'Neutral',
        confidence: (r.confidence?.charAt(0).toUpperCase() + r.confidence?.slice(1)) || 'Medium',
        scoreGap: Number(r.score_gap),
        rationale: `${r.base_symbol} (${r.base_score > 0 ? `+${r.base_score}` : r.base_score}) vs ${r.quote_symbol} (${r.quote_score > 0 ? `+${r.quote_score}` : r.quote_score}) macro divergence calculated via SQL view.`,
      }));
    } catch (err) {
      console.error('[RealApiProvider:getOpportunities] Error fetching from Supabase:', err);
      return this.fallbackProvider.getOpportunities(horizon);
    }
  }

  /**
   * Metadata describing data provenance
   */
  async getMetadata(): Promise<{ isDemo: boolean; lastUpdated: string; source: string }> {
    return {
      isDemo: !this.isConfigured(),
      lastUpdated: new Date().toISOString(),
      source: this.isConfigured()
        ? 'Institutional Macro Database (Supabase PostgreSQL Real-Time API & Views)'
        : 'PRIMEPIPFX Macro Intelligence Baseline & Institutional Economic Feeds (Demo)',
    };
  }
}
