import { SBTStrategyModel, TradingSession, TradeDirection } from '../types';

export type SituationDirection = 'BULLISH' | 'BEARISH' | 'RANGING';

export type SituationOutcome =
  | 'SAVED_SETUP'
  | 'WIN_FULL_TP'
  | 'PARTIAL_WIN'
  | 'BREAKEVEN'
  | 'LOSS_STOPPED'
  | 'INVALIDATED_MISSED';

export type SituationTimeframe =
  | '12 months'
  | '6 months'
  | '3 months'
  | '1 month'
  | '1 week'
  | 'Daily'
  | 'H4'
  | 'H1'
  | 'M30'
  | 'M15'
  | 'M5';

export interface TimeframeScenarioConfig {
  timeframe: SituationTimeframe | string;
  bias: 'Bullish' | 'Bearish' | 'None';
  fibonacciRetracements?: string[]; // e.g. ['0.238', '0.38', '0.50']
  customRetracement?: string;
  fibonacciTargets?: string[]; // e.g. ['1.414', '1.618']
  customTarget?: string;
  fibonacciLevels?: string[]; // e.g. ['0.23', '0.38', '0.5', '1.618']
  finalTarget: string; // e.g. '1.618' or custom price level
  customValues?: Record<string, string>;
  notes?: string;
}

export type HTFTimeframe = 'MN' | 'W1' | 'D1' | 'H4';
export type MTFTimeframe = 'H1' | 'M30' | 'M15';
export type LTFTimeframe = 'M15' | 'M5' | 'M1';

export type StructureElement =
  | 'BOS'
  | 'MSS'
  | 'CHOCH'
  | 'LIQUIDITY_SWEEP'
  | 'INDUCEMENT'
  | 'FAIR_VALUE_GAP'
  | 'ORDER_BLOCK'
  | 'TURTLE_SOUP'
  | 'MITIGATION_BLOCK';

export type FibonacciLevel =
  | '0.382'
  | '0.500 (Equilibrium)'
  | '0.618 (OTE Golden Pocket)'
  | '0.705 (OTE Institutional)'
  | '0.786 (Deep Discount/Premium)'
  | '0.886 (Extreme Invalidation Edge)'
  | '1.272 (Target Extension)'
  | '1.618 (Deep Target Extension)'
  | 'None';

export interface MarketSituation {
  id: string;
  title: string;
  pair: string; // e.g. EUR/USD, GBP/JPY, XAU/USD
  direction: SituationDirection;
  sbtModel: string; // e.g. SBT Model 1 through Model 10 or custom
  session: TradingSession;
  
  // Multi-Timeframe Alignment
  htfTimeframe: HTFTimeframe;
  htfTrend: SituationDirection;
  htfContext: string; // Higher timeframe trend, key Order Block, Premium vs Discount
  
  mtfTimeframe: MTFTimeframe;
  mtfStructure: StructureElement;
  mtfNotes: string; // Structure shift, inducement location, BOS details
  
  ltfTimeframe: LTFTimeframe;
  ltfTrigger: StructureElement | string;
  ltfNotes: string; // Exact trigger candle, turtle soup, CISD, sweep confirmation
  
  // Numerical Price & Fibonacci Configuration
  fibonacciLevel: FibonacciLevel;
  entryPrice: number;
  stopLossPrice: number;
  takeProfit1: number;
  takeProfit2?: number;
  plannedRiskReward: number; // e.g. 3.5 for 1:3.5
  
  // Custom Timeframes & Fibonacci Targets
  timeframeConfigs?: Record<string, TimeframeScenarioConfig>;
  selectedTimeframe?: SituationTimeframe | string;
  finalTarget?: string; // e.g. 1.618 or custom price level
  notes?: string; // Manual comments or trade notes
  
  // Market Environment & Fundamental Context
  marketConditions: string[]; // ['High Volatility', 'Post-News Reaction', 'Asian Range Sweep']
  fundamentalConfluence?: string; // Fundamental posture, yield divergence, rate carry
  chartImageUrl?: string; // Chart screenshot or uploaded image
  
  // Historical Outcome & Lessons Learned
  outcome: SituationOutcome;
  realizedRiskReward?: number; // e.g. +3.5, -1.0, 0
  executionScore?: number; // 1 to 5 stars
  psychologyState?: string; // 'Disciplined', 'Calm', 'Hesitant', 'FOMO', 'Chased Price'
  whatWentRight?: string; // Observations on what confluence held
  whatWentWrong?: string; // Flaws, early entry, wide stop
  lessonsLearned: string; // Golden institutional rule learned for next repetition
  
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SituationFilterOptions {
  searchQuery: string;
  pair: string;
  direction: string;
  sbtModel: string;
  outcome: string;
  fibonacciLevel: string;
  session: string;
}

export interface SimilarityMatchResult {
  situation: MarketSituation;
  similarityScore: number; // 0 - 100%
  matchingFactors: string[];
}
