/**
 * Company-fundamentals snapshot (Pakistan, Asia, global + core US filings).
 *
 * A scheduled GitHub Action (.github/workflows/fundamentals-data.yml) collects the numbers from Yahoo
 * Finance statements and SEC EDGAR every 6 hours and publishes ONE json file. The app downloads that
 * file (a single small request) instead of making ~180 slow calls on every cold start. A copy shipped
 * with the app (data/fundamentals_seed.json) is the fallback if the download is unavailable.
 */
import fs from 'fs';
import path from 'path';
import { fetchJson, markFailure, markSuccess, registerSource } from './http.js';
import type { StockFundamentals } from './edgar.js';

export const SNAPSHOT_ID = 'fund_snapshot';
const DEFAULT_URL = 'https://raw.githubusercontent.com/whbzafar/prime-pip-command-center-level/fundamentals-data/fundamentals.json';
registerSource(SNAPSHOT_ID, 'Company fundamentals (Yahoo Finance statements + SEC EDGAR, refreshed every 6h)', 'https://finance.yahoo.com/',
  'Reported revenue, earnings, margins, cash flow, debt and analyst outlook for Pakistani, Asian and global companies.');

export type Series = Array<[string, number]>;

export interface YahooRec {
  y: string; price: number | null; currency: string | null; change1y: number | null; mcap: number | null;
  fd: Partial<Record<'revenueGrowth' | 'earningsGrowth' | 'profitMargins' | 'operatingMargins' | 'grossMargins' | 'returnOnEquity' | 'debtToEquity' | 'currentRatio'
    | 'freeCashflow' | 'totalRevenue' | 'recommendationMean' | 'analysts' | 'targetMeanPrice' | 'currentPrice', number | null>>;
  sd: Partial<Record<'trailingPE' | 'forwardPE' | 'dividendYield' | 'payoutRatio' | 'beta', number | null>>;
  ks: Partial<Record<'pegRatio' | 'priceToBook' | 'forwardEps' | 'trailingEps', number | null>>;
  ts: Record<string, Series>;
}

export interface FundSnapshot {
  generatedAt: string; version: number; count: number;
  stocks: Record<string, YahooRec>;
  edgar: Record<string, StockFundamentals>;
  unavailable: string[];
}

let snap: FundSnapshot | null = null;
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const TTL = 30 * 60_000;

function valid(j: any): j is FundSnapshot {
  return j && typeof j === 'object' && j.stocks && typeof j.stocks === 'object' && Object.keys(j.stocks).length >= 10;
}

function loadSeed(): void {
  if (snap) return;
  for (const p of [path.join(process.cwd(), 'data', 'fundamentals_seed.json'), path.join(process.cwd(), 'dist', 'fundamentals_seed.json')]) {
    try {
      if (!fs.existsSync(p)) continue;
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (valid(j)) { snap = j; return; }
    } catch { /* try next */ }
  }
}

export function refreshSnapshot(force = false): Promise<void> {
  loadSeed();
  if (!force && snap && Date.now() - loadedAt < TTL) return Promise.resolve();
  if (inflight) return inflight;
  const url = process.env.PPFX_FUND_SNAPSHOT_URL || DEFAULT_URL;
  inflight = (async () => {
    try {
      const j = await fetchJson<any>(url, { timeoutMs: 15_000, retries: 1, headers: { Accept: 'application/json' } });
      if (!valid(j)) throw new Error('Snapshot file malformed');
      snap = j; loadedAt = Date.now();
      markSuccess(SNAPSHOT_ID, Object.keys(j.stocks).length);
    } catch (err) {
      loadedAt = Date.now() - TTL + 60_000; // retry in a minute
      if (snap) { markFailure(SNAPSHOT_ID, err); } else markFailure(SNAPSHOT_ID, err);
    } finally { inflight = null; }
  })();
  return inflight;
}

export const getYahoo = (symbol: string): YahooRec | null => snap?.stocks[symbol] || null;
export const getSnapshotEdgar = (ticker: string): StockFundamentals | null => snap?.edgar?.[ticker] || null;
export const snapshotMeta = () => snap ? { generatedAt: snap.generatedAt, count: snap.count, unavailable: snap.unavailable || [] } : null;
export function __setSnapshotForTest(s: FundSnapshot | null) { snap = s; loadedAt = Date.now(); }
