import { SentimentProvider } from './types.js';
import { NormalizedSentimentItem, ProviderHealthStatus } from '../types.js';
import { validateSentimentItem, CircuitBreaker, fetchWithRetry } from '../validation.js';
import { normalizeSymbol, getAssetClass } from '../symbolMapping.js';

interface MyfxbookSymbolOutlook {
  name: string;
  shortPercentage?: number | string;
  longPercentage?: number | string;
  shortPositions?: number | string;
  longPositions?: number | string;
  shortVolume?: number | string;
  longVolume?: number | string;
}

interface MyfxbookOutlookResponse {
  error: boolean;
  message?: string;
  symbols?: MyfxbookSymbolOutlook[];
}

interface MyfxbookLoginResponse {
  error: boolean;
  message?: string;
  session?: string;
}

/**
 * Pure parser for Myfxbook Community Outlook response
 * Never invents, estimates, or hardcodes any number.
 */
export function parseMyfxbookOutlookResponse(raw: any, sourceUrl = 'https://www.myfxbook.com/api/get-community-outlook.json'): NormalizedSentimentItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const res: MyfxbookOutlookResponse = raw;
  if (res.error || !Array.isArray(res.symbols)) return [];

  const results: NormalizedSentimentItem[] = [];

  for (const s of res.symbols) {
    if (!s || !s.name) continue;
    const cleanSym = normalizeSymbol(s.name);
    if (!cleanSym) continue;

    let longPct: number | null = null;
    let shortPct: number | null = null;

    if (s.longPercentage !== undefined && s.shortPercentage !== undefined) {
      const l = parseFloat(String(s.longPercentage));
      const sh = parseFloat(String(s.shortPercentage));
      if (!Number.isNaN(l) && !Number.isNaN(sh)) {
        longPct = l;
        shortPct = sh;
      }
    } else if (s.longPositions !== undefined && s.shortPositions !== undefined) {
      const lp = parseFloat(String(s.longPositions));
      const sp = parseFloat(String(s.shortPositions));
      const total = lp + sp;
      if (total > 0) {
        longPct = Number(((lp / total) * 100).toFixed(1));
        shortPct = Number(((sp / total) * 100).toFixed(1));
      }
    }

    if (longPct === null || shortPct === null) continue;

    const assetClass = getAssetClass(cleanSym);
    const traderGroup =
      assetClass === 'FOREX'
        ? 'Myfxbook forex traders'
        : assetClass === 'COMMODITIES'
        ? 'Myfxbook commodity traders'
        : assetClass === 'INDICES'
        ? 'Myfxbook index traders'
        : 'Myfxbook community traders';

    const validated = validateSentimentItem({
      symbol: cleanSym,
      assetClass,
      longPct,
      shortPct,
      source: 'Myfxbook Community Outlook',
      traderGroup,
      disclaimer: 'Free data, may be delayed up to 60 minutes.',
      sourceUrl,
      fetchedAt: Date.now(),
      rawPayload: s,
      timestamp: Date.now(),
    });

    if (validated.isValid && validated.sanitized) {
      results.push(validated.sanitized);
    }
  }

  return results;
}

export class MyfxbookSentimentProvider implements SentimentProvider {
  public id = 'myfxbook-outlook';
  public name = 'Myfxbook Community Outlook';
  public refreshIntervalMs = 20 * 60 * 1000; // Strictly at most once every 20 minutes
  private maxDailyRequests = 90; // Strictly under 100 requests per 24 hours

  private sessionToken: string | null = null;
  private sessionCreatedAt: number = 0;
  private circuitBreaker = new CircuitBreaker(4, 5 * 60000);

  private lastSuccessTime: number | null = null;
  private lastAttemptTime: number | null = null;
  private lastError: string | null = null;
  private requestCountToday: number = 0;
  private lastResetDay: number = new Date().getUTCDate();

  public getStatus(): ProviderHealthStatus {
    const email = process.env.MYFXBOOK_EMAIL?.trim();
    const pass = process.env.MYFXBOOK_PASSWORD?.trim();
    const isConfigured = Boolean(email && pass);

    const now = Date.now();
    let status: ProviderHealthStatus['status'] = 'LIVE';

    if (!isConfigured) {
      status = 'DISCONNECTED';
    } else if (this.requestCountToday >= this.maxDailyRequests) {
      status = 'STALE';
    } else if (this.circuitBreaker.getState() === 'OPEN') {
      status = 'DOWN';
    } else if (!this.lastSuccessTime) {
      status = this.lastError ? 'DOWN' : 'STALE';
    } else if (now - this.lastSuccessTime > 2 * this.refreshIntervalMs) {
      status = 'STALE';
    }

    const notes = !isConfigured
      ? 'Forex, Commodities & Indices sentiment source not connected. Configure MYFXBOOK_EMAIL and MYFXBOOK_PASSWORD in .env. No mock/fabricated data is displayed.'
      : this.requestCountToday >= this.maxDailyRequests
      ? `Approached daily safety quota (${this.requestCountToday}/${this.maxDailyRequests} reqs). Serving cached real data.`
      : `Session active. Daily calls: ${this.requestCountToday}/${this.maxDailyRequests}. Refresh window: 20 min.`;

    return {
      id: this.id,
      name: this.name,
      assetClasses: ['FOREX', 'COMMODITIES', 'INDICES'],
      status,
      lastSuccessTime: this.lastSuccessTime,
      lastAttemptTime: this.lastAttemptTime,
      lastError: this.lastError,
      consecutiveFailures: this.circuitBreaker.getConsecutiveFailures(),
      requestCountToday: this.requestCountToday,
      refreshIntervalMs: this.refreshIntervalMs,
      notes,
    };
  }

  private checkDailyReset(): void {
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastResetDay) {
      this.requestCountToday = 0;
      this.lastResetDay = currentDay;
    }
  }

  /**
   * Log into Myfxbook API and obtain session token
   */
  private async login(): Promise<string> {
    const email = process.env.MYFXBOOK_EMAIL?.trim();
    const password = process.env.MYFXBOOK_PASSWORD?.trim();

    if (!email || !password) {
      throw new Error('MYFXBOOK_CREDENTIALS_MISSING');
    }

    const loginUrl = `https://www.myfxbook.com/api/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    this.requestCountToday++;

    const loginRes: MyfxbookLoginResponse = await fetchWithRetry(async (signal) => {
      const res = await fetch(loginUrl, {
        signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PrimePipFX-Sentiment-Engine/1.0',
        },
      });
      if (!res.ok) {
        throw new Error(`Myfxbook login HTTP error: ${res.status}`);
      }
      return await res.json();
    }, 2, 8000);

    if (loginRes.error || !loginRes.session) {
      throw new Error(loginRes.message || 'Invalid Myfxbook credentials or login failed');
    }

    this.sessionToken = loginRes.session;
    this.sessionCreatedAt = Date.now();
    return this.sessionToken;
  }

  /**
   * Fetch outlook with session reuse
   */
  public async fetch(): Promise<NormalizedSentimentItem[]> {
    this.checkDailyReset();
    const email = process.env.MYFXBOOK_EMAIL?.trim();
    const pass = process.env.MYFXBOOK_PASSWORD?.trim();

    if (!email || !pass) {
      this.lastError = 'MYFXBOOK_CREDENTIALS_MISSING';
      // Return empty array - never invent or hardcode data!
      return [];
    }

    if (this.requestCountToday >= this.maxDailyRequests) {
      console.warn(`[MyfxbookSentimentProvider] Reached daily request limit (${this.requestCountToday}/${this.maxDailyRequests}). Serving cache.`);
      throw new Error('DAILY_REQUEST_LIMIT_REACHED');
    }

    if (!this.circuitBreaker.canExecute()) {
      throw new Error('Circuit breaker open due to consecutive failures');
    }

    this.lastAttemptTime = Date.now();

    // Ensure session token exists
    if (!this.sessionToken) {
      await this.login();
    }

    // Try fetching with current session
    try {
      return await this.fetchOutlookWithSession(this.sessionToken!);
    } catch (err: any) {
      const msg = String(err?.message || err);
      // If session expired or invalid, re-login once and retry
      if (msg.includes('Invalid session') || msg.includes('session')) {
        console.warn(`[MyfxbookSentimentProvider] Session invalid, attempting fresh login...`);
        this.sessionToken = null;
        await this.login();
        return await this.fetchOutlookWithSession(this.sessionToken!);
      }
      throw err;
    }
  }

  private async fetchOutlookWithSession(session: string): Promise<NormalizedSentimentItem[]> {
    const outlookUrl = `https://www.myfxbook.com/api/get-community-outlook.json?session=${encodeURIComponent(session)}`;
    this.requestCountToday++;

    const rawData = await fetchWithRetry(async (signal) => {
      const res = await fetch(outlookUrl, {
        signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PrimePipFX-Sentiment-Engine/1.0',
        },
      });
      if (!res.ok) {
        throw new Error(`Myfxbook HTTP error: ${res.status}`);
      }
      return await res.json();
    }, 2, 8000);

    if (rawData.error) {
      throw new Error(rawData.message || 'Myfxbook API returned error');
    }

    const items = parseMyfxbookOutlookResponse(rawData, 'https://www.myfxbook.com/api/get-community-outlook.json');
    if (!items || items.length === 0) {
      throw new Error('Empty community outlook returned by Myfxbook');
    }

    this.circuitBreaker.recordSuccess();
    this.lastSuccessTime = Date.now();
    this.lastError = null;
    return items;
  }
}
