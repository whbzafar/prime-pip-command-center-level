/**
 * Core Types for Pro Fundamentals Module
 */

export type CurrencyCode = 'USD' | 'EUR' | 'JPY' | 'GBP' | 'CHF' | 'AUD' | 'CAD' | 'NZD';

export type AssetClass = 'forex' | 'commodities' | 'crypto' | 'indices' | 'stocks';

export type Horizon = 'short' | 'long'; // short = 1-4 weeks, long = 6+ months

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export type BiasLabel = 'Strong Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Strong Bullish';

export type IndicatorPolarity = 'higher_bullish' | 'higher_bearish' | 'neutral';

export interface PillarWeight {
  short: number;
  long: number;
}

export interface FundamentalPillar {
  id: string;
  name: string;
  score: number; // -100 to +100
  weight: PillarWeight;
  description?: string;
}

export interface FactorDriver {
  factor: string;
  pillarId: string;
  contribution: number; // -100 to +100 contribution impact
  detail: string;
  source: string;
  updatedAt: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface MacroIndicator {
  name: string;
  value: number;
  previous: number;
  unit: string;
  zScore: number;
  polarity: IndicatorPolarity;
  source: string;
  updatedAt: string;
  pillarId?: string;
}

export interface CatalystEvent {
  name: string;
  date: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface FundamentalExplanation {
  summary: string;
  invalidation: string[];
  upcomingEvents: CatalystEvent[];
}

export interface HistoricalScorePoint {
  date: string;
  short: number;
  long: number;
}

export interface CurrencyFundamentalProfile {
  code: CurrencyCode;
  name: string;
  flag: string;
  centralBank: string;
  status?: 'active' | 'insufficient_data' | 'error';
  insufficientReason?: string;
  scores: {
    short: number | null; // -100 to +100 or null if insufficient
    long: number | null;
  };
  confidence: {
    short: ConfidenceLevel;
    long: ConfidenceLevel;
  };
  pillars: FundamentalPillar[];
  drivers: FactorDriver[];
  indicators: MacroIndicator[];
  explanation: FundamentalExplanation;
  history: HistoricalScorePoint[];
  updatedAt: string;
}

export interface PairFundamentalProfile {
  pair: string; // e.g. "EUR/USD"
  base: CurrencyCode;
  quote: CurrencyCode;
  status?: 'active' | 'insufficient_data' | 'error';
  insufficientReason?: string;
  scores: {
    short: number | null; // baseScore - quoteScore clamped -100..+100 or null if insufficient
    long: number | null;
  };
  confidence: {
    short: ConfidenceLevel;
    long: ConfidenceLevel;
  };
  baseProfile: CurrencyFundamentalProfile;
  quoteProfile: CurrencyFundamentalProfile;
  pillarGaps: {
    pillarId: string;
    pillarName: string;
    baseScore: number;
    quoteScore: number;
    gap: number; // baseScore - quoteScore
    favors: 'base' | 'quote' | 'neutral';
    weight: PillarWeight;
  }[];
  explanation: FundamentalExplanation;
  drivers: FactorDriver[];
  updatedAt: string;
}

export interface CurrencySummaryItem {
  code: CurrencyCode;
  name: string;
  flag: string;
  score: number; // current horizon score
  bullishPct: number; // 0-100%
  biasLabel: BiasLabel;
  confidence: ConfidenceLevel;
  shortScore: number;
  longScore: number;
  sevenDayChange: number;
  sparkline: number[];
  updatedAt: string;
}

export interface PairOpportunity {
  pair: string;
  base: CurrencyCode;
  quote: CurrencyCode;
  score: number;
  bullishPct: number;
  biasLabel: BiasLabel;
  confidence: ConfidenceLevel;
  scoreGap: number;
  rationale: string;
}
