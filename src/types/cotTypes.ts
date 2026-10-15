import { MarketCategory, MarketDefinition } from '../config/cotConfig';

export interface RawCotRow {
  market_and_exchange_names?: string;
  cftc_contract_market_code?: string;
  contract_market_name?: string;
  commodity_name?: string;
  report_date_as_yyyy_mm_dd?: string;
  open_interest_all?: string | number;
  noncomm_positions_long_all?: string | number;
  noncomm_positions_short_all?: string | number;
  noncomm_postions_spread_all?: string | number;
  comm_positions_long_all?: string | number;
  comm_positions_short_all?: string | number;
  change_in_noncomm_long_all?: string | number;
  change_in_noncomm_short_all?: string | number;
  change_in_comm_long_all?: string | number;
  change_in_comm_short_all?: string | number;
  change_in_open_interest_all?: string | number;
  [key: string]: any;
}

export interface CotRecord {
  marketCode: string;
  marketName: string;
  reportDate: string; // ISO date 'YYYY-MM-DD'
  timestamp: number; // Unix ms
  openInterest: number;

  // Non-Commercial (Large Speculators / Hedge Funds)
  nonCommLong: number;
  nonCommShort: number;
  nonCommNet: number;

  // Commercial (Hedgers / Producers / Institutional Users)
  commLong: number;
  commShort: number;
  commNet: number;

  // Weekly Changes (Computed from consecutive rows)
  changeNonCommLong: number;
  changeNonCommShort: number;
  changeNonCommNet: number;

  changeCommLong: number;
  changeCommShort: number;
  changeCommNet: number;

  changeOpenInterest: number;

  // Discrepancy & Validation flags
  hasDiscrepancy?: boolean;
  discrepancyDetails?: string;
  hasGap?: boolean; // More than 10 days between records
  dataWarning?: string;
}

export interface CotMarketSummary {
  market: MarketDefinition;
  latest: CotRecord;
  previous?: CotRecord;
  hasData: boolean;
  historyCount: number;
  cotIndexNonComm1Y?: number | null;
  cotIndexNonComm3Y?: number | null;
  cotIndexNonComm5Y?: number | null;
}

export type CotLookbackPeriod = '1Y' | '3Y' | '5Y' | 'MAX';

export interface CotIndexResult {
  index: number | null;
  minNet: number;
  maxNet: number;
  currentNet: number;
  lookbackCount: number;
  status: 'VALID' | 'FLAT_RANGE' | 'INSUFFICIENT_DATA';
  zone: 'EXTREME_LONG' | 'NEUTRAL' | 'EXTREME_SHORT' | 'UNKNOWN';
}

export interface CotReleaseStatus {
  latestReportDate: string | null; // e.g. "2026-10-06"
  latestTuesdayDate: string; // e.g. "2026-10-13"
  isDue: boolean;
  lastReleaseTimestamp: number;
  nextExpectedReleaseUtc: string;
  nextExpectedReleaseLocalFormatted: string;
  statusText: string;
  isPollingFast: boolean;
}
