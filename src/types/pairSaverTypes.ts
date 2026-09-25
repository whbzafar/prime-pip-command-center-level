import { CurrencyCode } from './fundamentalIndicatorTypes';
import { SBTStrategyModel, TradingSession } from '../types';

export type PairAssetType = 'MAJOR_FOREX' | 'MINOR_FOREX' | 'COMMODITY';

export type VolatilityRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export type LiquidityTier = 'TIER_1_TIGHTEST' | 'TIER_2_MODERATE' | 'TIER_3_WIDE';

export type WatchlistStatus = 'ACTIVE_FOCUS' | 'MONITORING' | 'NEUTRAL' | 'AVOID_CHOP';

export type PairMacroStance =
  | 'STRONG_BULLISH'
  | 'MODERATE_BULLISH'
  | 'NEUTRAL'
  | 'MODERATE_BEARISH'
  | 'STRONG_BEARISH';

export interface PairPlaybookConfig {
  watchlistStatus: WatchlistStatus;
  preferredModels: string[]; // e.g. ['SBT Model 1', 'SBT Model 3', 'SBT Model 9']
  optimalSessions: TradingSession[];
  keySupportLevel?: number;
  keyResistanceLevel?: number;
  htfOrderBlockZone?: string;
  targetRiskReward: number; // e.g. 3.0
  traderPlaybookNotes: string;
  customRules: string[];
  lastUpdated: string;
}

export interface PairProfile {
  symbol: string; // e.g. EUR/USD, GBP/JPY, XAU/USD
  displayName: string; // e.g. Euro / US Dollar
  baseCurrency: CurrencyCode | string;
  quoteCurrency: CurrencyCode | string;
  type: PairAssetType;
  nickname?: string; // e.g. Fiber, Cable, The Beast, Gold
  flagBase: string;
  flagQuote: string;
  
  // Statistical & Technical Characteristics
  averageDailyRangePips: number; // ADR (e.g. 75, 140, 350)
  pipValuePerStandardLotUsd: number; // Pip value for 1.00 lot
  volatilityRating: VolatilityRating;
  liquidityTier: LiquidityTier;
  spreadPipsTypical: number;
  
  // Market Personality & Institutional Quirks
  bestSessions: TradingSession[];
  intermarketCorrelations: {
    correlatedAsset: string;
    correlationType: 'POSITIVE' | 'INVERSE';
    description: string;
  }[];
  personalityTraits: string[];
  institutionalTrapsToAvoid: string[];
  
  // Saved Playbook & Strategy Configuration
  playbook: PairPlaybookConfig;
}

export type PairSaverTimeframe =
  | 'Weekly'
  | 'Daily'
  | 'H4'
  | 'H1'
  | 'M30'
  | 'M15'
  | 'M5'
  | 'M3'
  | 'M1';

export interface SavedPairScenario {
  id: string;
  pair: string; // e.g. EUR/USD, GBP/JPY, XAU/USD
  timeframeBiases: Record<PairSaverTimeframe, 'Bullish' | 'Bearish' | null>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

