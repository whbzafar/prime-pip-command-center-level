// PRIMEPIP FX COMMAND CENTER — PSYCHOLOGY CORE 2090
// Interactive Simulation & Scenario Engine Types

export interface ScenarioCandle {
  index: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  isUp: boolean;
  annotation?: string;
}

export type DecisionCategory =
  | 'PLAN_ALIGNED'       // Follows predefined plan and invalidation rules
  | 'IMPULSIVE_EXIT'     // Premature exit out of fear/anxiety before plan invalidation
  | 'RISK_ESCALATION'    // Doubling down, moving stop wider, chasing
  | 'HESITATION'         // Freezing despite valid criteria
  | 'IMPULSE_CHASE'      // Entering without confirmation out of FOMO/greed
  | 'PAUSE_AND_REGULATE';// Deliberate operational pause to review criteria

export interface ScenarioDecisionOption {
  id: string;
  label: string;
  actionText: string;
  decisionCategory: DecisionCategory;
  isPlanAligned: boolean;
  shortDescription: string;
  detailedFeedback: {
    processVerdict: string;
    behavioralMechanism: string;
    probabilisticReality: string;
    practicalTakeaway: string;
  };
  reflectionFollowUp: string;
}

export interface TradingScenario {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  symbol: string;
  timeframe: string;
  tradeDirection: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  riskR: number; // typically 1.0 = 1R
  accountBalance: number;
  plannedDollarRisk: number; // e.g., $100 for a 1R loss
  invalidationCriteria: string[];
  candles: ScenarioCandle[];
  pressureCandleIndex: number;
  pressureEventTitle: string;
  pressureEventDescription: string;
  floatingRAtPressure: number; // e.g. -0.6R
  options: ScenarioDecisionOption[];
  learningObjective: string;
}

export interface SimulationState {
  currentCandleIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // 1 = 1x, 2 = 2x
  hasReachedPressure: boolean;
  selectedOptionId: string | null;
  hasConfirmedDecision: boolean;
  decisionTimeSeconds?: number;
}
