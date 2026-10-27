import {
  AccountSettings,
  FundedAccountConfig,
  FundedDrawdownType,
  FundedPhase,
  FundedRiskMode,
  FundedRuleViolation,
  FundedRulesProfile,
  Trade,
  TradeEvaluationInput,
  TradeEvaluationResult,
  AccountHealthEvaluation,
  TrailingBasis,
  FundedTrailingConfig,
  RiskDecisionState,
  DeterministicRiskAssessment,
  GoalPlannerScenario,
  GoalScenarioMetrics,
  PostTradeImpactSummary,
} from '../types';
import { getKarachiDate, getKarachiEpoch, getKarachiTime } from './time';
import { formatCurrency, safeNumber } from './currencyFormatter';

export interface PropFirmPreset {
  id: string;
  name: string;
  firmName: string;
  description: string;
  accountSize: number;
  phase1TargetPct: number;
  phase2TargetPct: number;
  dailyDrawdownPct: number;
  overallDrawdownPct: number;
  drawdownType: FundedDrawdownType;
  trailingBasis: TrailingBasis;
  unrealizedProfitAffectsTrailing: boolean;
  lockAtStartingBalance: boolean;
  safetyBufferPct?: number;
  maxRiskPerTradePct?: number;
  newsRestriction?: boolean;
  weekendRestriction?: boolean;
}

export const PROP_FIRM_PRESETS: PropFirmPreset[] = [
  {
    id: 'my_prop_firm_5k',
    name: 'My Prop Firm ($5K Standard Challenge)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($500), 5% Phase 2 ($250), 4% Daily DD ($200), 10% Overall DD ($500)',
    accountSize: 5000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
    newsRestriction: false,
    weekendRestriction: false,
  },
  {
    id: 'my_prop_firm_10k',
    name: 'My Prop Firm ($10K Challenge)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($1,000), 5% Phase 2 ($500), 4% Daily DD ($400), 10% Max DD ($1,000)',
    accountSize: 10000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'my_prop_firm_25k',
    name: 'My Prop Firm ($25K Challenge)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($2,500), 5% Phase 2 ($1,250), 4% Daily DD ($1,000), 10% Max DD ($2,500)',
    accountSize: 25000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'my_prop_firm_50k',
    name: 'My Prop Firm ($50K Challenge)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($5,000), 5% Phase 2 ($2,500), 4% Daily DD ($2,000), 10% Max DD ($5,000)',
    accountSize: 50000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'my_prop_firm_100k',
    name: 'My Prop Firm ($100K Institutional Challenge)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($10,000), 5% Phase 2 ($5,000), 4% Daily DD ($4,000), 10% Max DD ($10,000)',
    accountSize: 100000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'my_prop_firm_200k',
    name: 'My Prop Firm ($200K Master Challenge)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($20,000), 5% Phase 2 ($10,000), 4% Daily DD ($8,000), 10% Max DD ($20,000)',
    accountSize: 200000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'ftmo_100k',
    name: 'FTMO Standard ($100K 2-Step)',
    firmName: 'FTMO',
    description: '10% Phase 1, 5% Phase 2, 5% Equity Daily DD ($5,000), 10% Static Max DD ($10,000)',
    accountSize: 100000,
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'fundednext_stellar_100k',
    name: 'FundedNext Stellar ($100K 2-Step)',
    firmName: 'FundedNext',
    description: '8% Phase 1 ($8K), 5% Phase 2 ($5K), 5% Balance Daily DD ($5,000), 10% Overall DD ($10,000)',
    accountSize: 100000,
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    overallDrawdownPct: 10,
    drawdownType: 'BALANCE_BASED',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
  {
    id: 'topstep_50k_eod',
    name: 'Topstep / EOD Prop ($50K Trailing)',
    firmName: 'Topstep',
    description: '6% Target ($3,000), 4% Daily DD ($2,000), 6% EOD Trailing DD ($3,000) (Locks at Starting Balance)',
    accountSize: 50000,
    phase1TargetPct: 6,
    phase2TargetPct: 4,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 6,
    drawdownType: 'TRAILING',
    trailingBasis: 'END_OF_DAY_BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    safetyBufferPct: 25,
    maxRiskPerTradePct: 0.75,
  },
  {
    id: 'apex_100k_intraday',
    name: 'Apex / Live Trailing ($100K High-Water)',
    firmName: 'Apex Trader',
    description: '6% Target ($6,000), 3% Daily DD ($3,000), 5% Live Equity Trailing DD ($5,000) (Unrealized Trails)',
    accountSize: 100000,
    phase1TargetPct: 6,
    phase2TargetPct: 4,
    dailyDrawdownPct: 3,
    overallDrawdownPct: 5,
    drawdownType: 'INTRADAY',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: true,
    lockAtStartingBalance: true,
    safetyBufferPct: 25,
    maxRiskPerTradePct: 0.5,
  },
  {
    id: 'the5ers_100k',
    name: 'The5ers High Stakes ($100K)',
    firmName: 'The5ers',
    description: '8% Phase 1 ($8K), 5% Phase 2 ($5K), 5% Daily DD ($5K), 10% Max Overall DD ($10K)',
    accountSize: 100000,
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    safetyBufferPct: 20,
    maxRiskPerTradePct: 1.0,
  },
];

export function createDefaultFundedConfig(
  startingBalance = 100000,
  firmName = 'Custom Evaluation',
  phase: FundedPhase = 'PHASE_1'
): FundedAccountConfig {
  const safeStart = Math.max(100, safeNumber(startingBalance, 100000));
  const phase1TargetPct = 10;
  const phase2TargetPct = 5;
  const dailyDdPct = 5; // $5,000 on $100,000 (5%)
  const overallDdPct = 10; // $10,000 on $100,000 (10%)

  return {
    enabled: true,
    firmName: firmName || 'Custom Evaluation',
    accountName: `${firmName || 'Prop'} $${Math.round(safeStart / 1000)}K`,
    accountSize: safeStart,
    phase,
    startingBalance: safeStart,
    profitTargets: {
      phase1TargetDollars: Math.round((safeStart * phase1TargetPct) / 100),
      phase1TargetPercent: phase1TargetPct,
      phase2TargetDollars: Math.round((safeStart * phase2TargetPct) / 100),
      phase2TargetPercent: phase2TargetPct,
      phase3TargetDollars: Math.round((safeStart * 5) / 100),
      phase3TargetPercent: 5,
      fundedMilestoneTargetDollars: Math.round((safeStart * 10) / 100),
    },
    dailyDrawdownDollars: Math.round((safeStart * dailyDdPct) / 100),
    dailyDrawdownPercent: dailyDdPct,
    overallDrawdownDollars: Math.round((safeStart * overallDdPct) / 100),
    overallDrawdownPercent: overallDdPct,
    drawdownType: 'STATIC',
    trailingConfig: {
      trailingBasis: 'EQUITY',
      activationLevelProfitDollars: 0,
      unrealizedProfitAffectsTrailing: false,
      lockAtStartingBalance: false,
      customLockBalanceLevel: null,
      manualHighWaterMark: null,
    },
    preferredRiskPercent: 0.5,
    maxRiskPerTradePercent: 1.0,
    maxRiskPerTradeDollars: Math.round((safeStart * 1.0) / 100),
    riskMode: 'BALANCED',
    safetyBufferPercent: 20,
    maxConsecutiveLossesThreshold: 3,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    minimumTradingDays: 4,
    dailyResetTime: '00:00 Europe/Prague',
    todayStartingBalanceOverride: null,
    todayStartingEquityOverride: null,
    openFloatingPnL: 0,
  };
}

export function isFundedAccount(account?: AccountSettings | null): boolean {
  if (!account) return false;
  if (account.accountCategory === 'FUNDED') return true;
  if (account.fundedConfig?.enabled) return true;
  if (
    account.accountType === 'PROP_FIRM_EVALUATION' ||
    account.accountType === 'PROP_FIRM_FUNDED' ||
    String(account.accountType).toLowerCase().includes('funded') ||
    String(account.accountType).toLowerCase().includes('prop')
  ) {
    return true;
  }
  return false;
}

export function getEffectiveFundedConfig(account: AccountSettings): FundedAccountConfig {
  const startBal = Math.max(1, safeNumber(account.initialBalance, 5000));
  if (account.fundedConfig) {
    return {
      ...createDefaultFundedConfig(startBal, account.broker || 'My Prop Firm'),
      ...account.fundedConfig,
      accountSize: account.fundedConfig.accountSize || startBal,
      startingBalance: account.fundedConfig.startingBalance || startBal,
      profitTargets: {
        ...createDefaultFundedConfig(startBal).profitTargets,
        ...(account.fundedConfig.profitTargets || {}),
      },
      trailingConfig: {
        ...createDefaultFundedConfig(startBal).trailingConfig,
        ...(account.fundedConfig.trailingConfig || {}),
      },
      safetyBufferPercent:
        typeof account.fundedConfig.safetyBufferPercent === 'number'
          ? account.fundedConfig.safetyBufferPercent
          : 20,
      maxConsecutiveLossesThreshold:
        typeof account.fundedConfig.maxConsecutiveLossesThreshold === 'number'
          ? account.fundedConfig.maxConsecutiveLossesThreshold
          : 3,
    };
  }

  const defaultPhase: FundedPhase =
    account.accountType === 'PROP_FIRM_FUNDED' ? 'FUNDED_LIVE' : 'PHASE_1';
  const def = createDefaultFundedConfig(startBal, account.broker || 'My Prop Firm', defaultPhase);
  if (account.maxDailyLossPercent > 0) {
    def.dailyDrawdownPercent = account.maxDailyLossPercent;
    def.dailyDrawdownDollars = Number(((startBal * account.maxDailyLossPercent) / 100).toFixed(2));
  }
  if (account.maxDrawdownPercent > 0) {
    def.overallDrawdownPercent = account.maxDrawdownPercent;
    def.overallDrawdownDollars = Number(((startBal * account.maxDrawdownPercent) / 100).toFixed(2));
  }
  if (account.maxRiskPerTradePercent > 0) {
    def.maxRiskPerTradePercent = account.maxRiskPerTradePercent;
    def.preferredRiskPercent = account.targetRiskPerTradePercent || account.maxRiskPerTradePercent;
  }
  return def;
}

export type FundedDecisionVerdict =
  | 'TAKE_TRADE'
  | 'REDUCE_RISK'
  | 'STOP_TRADING'
  | 'TARGET_PASSED';

export type TradingStatusState = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface DailyDrawdownResult {
  todayStartingBalance: number;
  todayStartingEquity: number;
  todayRealizedPnL: number;
  todayUnrealizedPnL: number;
  dailyDrawdownLimitDollars: number;
  dailyDrawdownLimitPercent: number;
  dailyBreachFloor: number;
  currentDailyDrawdown: number;
  remainingDailyDrawdown: number;
  dailyDrawdownUsedPercent: number;
  dailyDrawdownAccountPercent: number;
  isDailyDrawdownBreached: boolean;
}

export interface OverallDrawdownResult {
  startingBalance: number;
  overallDrawdownLimitDollars: number;
  overallDrawdownLimitPercent: number;
  overallBreachFloor: number;
  currentOverallDrawdown: number;
  remainingOverallDrawdown: number;
  overallDrawdownUsedPercent: number;
  overallDrawdownAccountPercent: number;
  isOverallDrawdownBreached: boolean;
}

export interface TrailingDrawdownResult {
  isTrailing: boolean;
  initialLiquidationThreshold: number;
  highWaterMark: number;
  activeLiquidationThreshold: number;
  trailingFloorMovedDollars: number;
  isTrailingLocked: boolean;
  trailingExplanation: string;
}

export interface PhaseProgressResult {
  phase: FundedPhase;
  phaseLabel: string;
  activeProfitTargetDollars: number;
  activeProfitTargetPercent: number;
  currentProfitLoss: number;
  remainingProfitTarget: number;
  profitProgressPercent: number;
  amountRequiredToPass: number;
  passingBalanceTarget: number;
  isTargetPassed: boolean;
}

export interface RecommendedRiskResult {
  riskMode: FundedRiskMode;
  preferredRiskPercent: number;
  preferredRiskDollars: number;
  maxRiskPerTradePercent: number;
  maxRiskPerTradeDollars: number;
  recommendedRiskDollars: number;
  recommendedRiskPercent: number;
  hardCeilingRiskDollars: number;
  safetyBufferPercent: number;
  usableDailyDrawdown: number;
  limitingFactor: string;
  reasons: string[];
  explanation: string;
}

export interface FundedAccountRiskEvaluation {
  isFunded: boolean;
  config: FundedAccountConfig;

  // Basic Information
  firmName: string;
  accountName: string;
  accountSize: number;
  currency: string;
  phase: FundedPhase;
  phaseLabel: string;
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;

  // Profit Target & Progress
  activeProfitTargetDollars: number;
  activeProfitTargetPercent: number;
  currentProfitLoss: number;
  remainingProfitTarget: number;
  profitProgressPercent: number;
  amountRequiredToPass: number;
  passingBalanceTarget: number;
  isTargetPassed: boolean;

  // Drawdown Configuration & Trailing
  drawdownType: FundedDrawdownType;
  drawdownTypeLabel: string;
  isTrailing: boolean;
  initialLiquidationThreshold: number;
  highWaterMark: number;
  activeLiquidationThreshold: number;
  trailingFloorMovedDollars: number;
  isTrailingLocked: boolean;
  trailingExplanation: string;

  // Daily Drawdown Tracking
  todayStartingBalance: number;
  todayStartingEquity: number;
  todayRealizedPnL: number;
  todayUnrealizedPnL: number;
  dailyDrawdownLimitDollars: number;
  dailyDrawdownLimitPercent: number;
  dailyBreachFloor: number;
  currentDailyDrawdown: number;
  remainingDailyDrawdown: number;
  dailyDrawdownUsedPercent: number;
  dailyDrawdownAccountPercent: number;
  isDailyDrawdownBreached: boolean;

  // Overall Drawdown Tracking
  overallDrawdownLimitDollars: number;
  overallDrawdownLimitPercent: number;
  overallBreachFloor: number;
  currentOverallDrawdown: number;
  remainingOverallDrawdown: number;
  overallDrawdownUsedPercent: number;
  overallDrawdownAccountPercent: number;
  isOverallDrawdownBreached: boolean;

  // Next Trade Risk Engine & Decision Logic
  riskMode: FundedRiskMode;
  safetyBufferPercent: number;
  usableDailyDrawdown: number;
  preferredRiskPercent: number;
  preferredRiskDollars: number;
  maxRiskPerTradePercent: number;
  maxRiskPerTradeDollars: number;
  recommendedRiskDollars: number;
  recommendedRiskPercent: number;
  hardCeilingRiskDollars: number;
  limitingFactor: string;
  verdict: FundedDecisionVerdict;
  verdictBadge: string;
  verdictColor: 'EMERALD' | 'AMBER' | 'ROSE' | 'CYAN';
  tradingStatus: TradingStatusState;
  nextTradeRiskQuestionAnswer: string;
  shouldTakeTradeQuestionAnswer: string;
  reasons: string[];
  explanation: string;

  // Trade Streak & Survival Analytics
  tradesToday: number;
  maxDailyTrades: number;
  consecutiveLosses: number;
  consecutiveWins: number;
  lastTradePnL: number | null;
  tradesToDailyBreachAtRecommended: number;
  tradesToOverallBreachAtRecommended: number;
  tradesToPassAt2R: number;

  // Health Score & Violations
  healthScore: AccountHealthEvaluation;
  violations: FundedRuleViolation[];
}

export function getPhaseLabel(phase: FundedPhase): string {
  switch (phase) {
    case 'PHASE_1':
      return 'Phase 1 (Evaluation)';
    case 'PHASE_2':
      return 'Phase 2 (Verification)';
    case 'PHASE_3':
      return 'Phase 3 (Final Stage)';
    case 'FUNDED_LIVE':
      return 'Live Funded Account';
    case 'INSTANT_FUNDED':
      return 'Instant Funded Account';
    default:
      return 'Phase 1';
  }
}

export function getDrawdownTypeLabel(type: FundedDrawdownType): string {
  switch (type) {
    case 'STATIC':
      return 'Static Drawdown';
    case 'TRAILING':
      return 'Trailing Drawdown';
    case 'EQUITY_BASED':
      return 'Equity-Based Drawdown';
    case 'BALANCE_BASED':
      return 'Balance-Based Drawdown';
    case 'END_OF_DAY':
      return 'End-of-Day (EOD) Drawdown';
    case 'INTRADAY':
      return 'Intraday High-Water Drawdown';
    case 'CUSTOM':
      return 'Custom Rule Drawdown';
    default:
      return 'Static Drawdown';
  }
}

// ----------------------------------------------------------------------------
// 33. REUSABLE DETERMINISTIC ENGINE FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Calculates Trailing / High-Water Mark Drawdown Floor
 */
export function calculateTrailingDrawdown(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig
): TrailingDrawdownResult {
  const currency = account.currency || 'USD';
  const startingBalance = Math.max(1, safeNumber(config.startingBalance, 5000));
  const overallLimit = Math.max(1, safeNumber(config.overallDrawdownDollars, startingBalance * 0.1));
  const initialFloor = Number((startingBalance - overallLimit).toFixed(2));

  const sortedClosed = [...trades]
    .filter((t) => t.status !== 'OPEN')
    .sort((a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time));

  let runningBal = startingBalance;
  let peakRealized = startingBalance;
  const eodByDate: Record<string, number> = {};

  for (const t of sortedClosed) {
    runningBal += safeNumber(t.profitLoss, 0);
    if (runningBal > peakRealized) peakRealized = runningBal;
    eodByDate[t.date] = runningBal;
  }
  const currentBal = Math.max(0, safeNumber(account.currentBalance, runningBal));
  if (currentBal > peakRealized) peakRealized = currentBal;

  const todayStr = getKarachiDate();
  let peakEod = startingBalance;
  for (const [d, b] of Object.entries(eodByDate)) {
    if (d !== todayStr && b > peakEod) peakEod = b;
  }

  const tc: FundedTrailingConfig = config.trailingConfig || { trailingBasis: 'BALANCE' };
  const currentEq = Math.max(0, safeNumber(account.currentEquity, currentBal + safeNumber(config.openFloatingPnL, 0)));

  let rawHwm = peakRealized;
  if (tc.trailingBasis === 'END_OF_DAY_BALANCE') {
    rawHwm = peakEod;
  } else if (tc.trailingBasis === 'EQUITY' || tc.unrealizedProfitAffectsTrailing) {
    rawHwm = Math.max(peakRealized, currentEq);
  }
  if (tc.manualHighWaterMark && tc.manualHighWaterMark > rawHwm) {
    rawHwm = tc.manualHighWaterMark;
  }

  const highWaterMark = Number(Math.max(startingBalance, rawHwm).toFixed(2));
  const isTrailing =
    config.drawdownType === 'TRAILING' ||
    config.drawdownType === 'INTRADAY' ||
    config.drawdownType === 'END_OF_DAY';

  let activeFloor = initialFloor;
  let isTrailingLocked = false;

  if (isTrailing) {
    const hwmGain = Math.max(0, highWaterMark - startingBalance);
    const activationLevel = Math.max(0, safeNumber(tc.activationLevelProfitDollars, 0));

    if (hwmGain >= activationLevel) {
      let trailedFloor = highWaterMark - overallLimit;
      if (tc.lockAtStartingBalance && trailedFloor >= startingBalance) {
        trailedFloor = startingBalance;
        isTrailingLocked = true;
      }
      if (
        typeof tc.customLockBalanceLevel === 'number' &&
        tc.customLockBalanceLevel > 0 &&
        trailedFloor >= tc.customLockBalanceLevel
      ) {
        trailedFloor = tc.customLockBalanceLevel;
        isTrailingLocked = true;
      }
      activeFloor = Number(Math.max(initialFloor, trailedFloor).toFixed(2));
    }
  }

  const trailingFloorMovedDollars = Number(Math.max(0, activeFloor - initialFloor).toFixed(2));
  const trailingExplanation = isTrailing
    ? `Trailing on ${
        tc.trailingBasis === 'EQUITY'
          ? 'Live Equity'
          : tc.trailingBasis === 'END_OF_DAY_BALANCE'
          ? 'End-of-Day Balance'
          : 'Closed Balance'
      } • High-Water Mark: ${formatCurrency(highWaterMark, currency)} • Active Floor: ${formatCurrency(
        activeFloor,
        currency
      )}${isTrailingLocked ? ' (LOCKED AT STARTING BALANCE / TARGET LEVEL)' : ''}`
    : `Static Floor fixed at ${formatCurrency(initialFloor, currency)} (${formatCurrency(
        overallLimit,
        currency
      )} below ${formatCurrency(startingBalance, currency)})`;

  return {
    isTrailing,
    initialLiquidationThreshold: initialFloor,
    highWaterMark,
    activeLiquidationThreshold: activeFloor,
    trailingFloorMovedDollars,
    isTrailingLocked,
    trailingExplanation,
  };
}

/**
 * Calculates Today's Daily Drawdown Status
 */
export function calculateDailyDrawdown(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig
): DailyDrawdownResult {
  const startingBalance = Math.max(1, safeNumber(config.startingBalance, 5000));
  const dailyLimitDollars = Math.max(1, safeNumber(config.dailyDrawdownDollars, startingBalance * 0.04));
  const dailyLimitPercent = Number(((dailyLimitDollars / startingBalance) * 100).toFixed(2));

  const todayStr = getKarachiDate();
  const todayTrades = trades.filter((t) => t.date === todayStr);
  const todayClosedTrades = todayTrades.filter((t) => t.status !== 'OPEN');
  const todayRealizedPnL = todayClosedTrades.reduce((acc, t) => acc + safeNumber(t.profitLoss, 0), 0);

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const openFloatingPnL = openTrades.reduce(
    (acc, t) => acc + safeNumber(t.floatingPnL ?? t.profitLoss, 0),
    0
  );
  const accountEq = safeNumber(account.currentEquity, 0);
  const accountBal = safeNumber(account.currentBalance, 0);
  const derivedFloating = accountEq > 0 && accountBal > 0 ? accountEq - accountBal : 0;
  const todayUnrealizedPnL =
    openFloatingPnL +
    (typeof config.openFloatingPnL === 'number'
      ? config.openFloatingPnL
      : derivedFloating);

  const currentBal = Math.max(0, safeNumber(account.currentBalance, startingBalance + todayRealizedPnL));
  const currentEq = Math.max(
    0,
    safeNumber(account.currentEquity, currentBal + todayUnrealizedPnL)
  );

  const derivedTodayStartBal = currentBal - todayRealizedPnL;
  const todayStartBal =
    config.todayStartingBalanceOverride && config.todayStartingBalanceOverride > 0
      ? config.todayStartingBalanceOverride
      : derivedTodayStartBal;
  const todayStartEq =
    config.todayStartingEquityOverride && config.todayStartingEquityOverride > 0
      ? config.todayStartingEquityOverride
      : todayStartBal;

  const dailyRefBase =
    config.drawdownType === 'BALANCE_BASED'
      ? todayStartBal
      : Math.max(todayStartBal, todayStartEq);

  const dailyBreachFloor = Number((dailyRefBase - dailyLimitDollars).toFixed(2));

  const effectiveCurrent =
    config.drawdownType === 'BALANCE_BASED'
      ? currentBal
      : Math.min(currentBal, currentEq);

  const remainingDailyDrawdown = Number(Math.max(0, effectiveCurrent - dailyBreachFloor).toFixed(2));
  const currentDailyDrawdown = Number(Math.max(0, dailyLimitDollars - remainingDailyDrawdown).toFixed(2));
  const dailyDrawdownUsedPercent = Number(
    Math.min(100, (currentDailyDrawdown / dailyLimitDollars) * 100).toFixed(1)
  );
  const dailyDrawdownAccountPercent =
    dailyRefBase > 0 ? Number(((currentDailyDrawdown / dailyRefBase) * 100).toFixed(2)) : 0;
  const isDailyDrawdownBreached = remainingDailyDrawdown <= 0;

  return {
    todayStartingBalance: todayStartBal,
    todayStartingEquity: todayStartEq,
    todayRealizedPnL,
    todayUnrealizedPnL,
    dailyDrawdownLimitDollars: dailyLimitDollars,
    dailyDrawdownLimitPercent: dailyLimitPercent,
    dailyBreachFloor,
    currentDailyDrawdown,
    remainingDailyDrawdown,
    dailyDrawdownUsedPercent,
    dailyDrawdownAccountPercent,
    isDailyDrawdownBreached,
  };
}

/**
 * Calculates Overall Drawdown Status Against Active Floor
 */
export function calculateOverallDrawdown(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig,
  activeFloor: number
): OverallDrawdownResult {
  const startingBalance = Math.max(1, safeNumber(config.startingBalance, 5000));
  const overallLimitDollars = Math.max(1, safeNumber(config.overallDrawdownDollars, startingBalance * 0.1));
  const overallLimitPercent = Number(((overallLimitDollars / startingBalance) * 100).toFixed(2));

  const currentBal = Math.max(0, safeNumber(account.currentBalance, startingBalance));
  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const openFloatingPnL = openTrades.reduce(
    (acc, t) => acc + safeNumber(t.floatingPnL ?? t.profitLoss, 0),
    0
  );
  const currentEq = Math.max(0, currentBal + openFloatingPnL + safeNumber(config.openFloatingPnL, 0));

  const effectiveCurrent =
    config.drawdownType === 'BALANCE_BASED'
      ? currentBal
      : Math.min(currentBal, currentEq);

  const remainingOverallDrawdown = Number(Math.max(0, effectiveCurrent - activeFloor).toFixed(2));
  const currentOverallDrawdown = Number(Math.max(0, overallLimitDollars - remainingOverallDrawdown).toFixed(2));
  const overallDrawdownUsedPercent = Number(
    Math.min(100, (currentOverallDrawdown / overallLimitDollars) * 100).toFixed(1)
  );
  const overallDrawdownAccountPercent =
    startingBalance > 0 ? Number(((currentOverallDrawdown / startingBalance) * 100).toFixed(2)) : 0;
  const isOverallDrawdownBreached = remainingOverallDrawdown <= 0;

  return {
    startingBalance,
    overallDrawdownLimitDollars: overallLimitDollars,
    overallDrawdownLimitPercent: overallLimitPercent,
    overallBreachFloor: activeFloor,
    currentOverallDrawdown,
    remainingOverallDrawdown,
    overallDrawdownUsedPercent,
    overallDrawdownAccountPercent,
    isOverallDrawdownBreached,
  };
}

/**
 * Calculates Phase Target, P&L, Remaining and Progress %
 */
export function calculatePhaseProgress(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig
): PhaseProgressResult {
  const startingBalance = Math.max(1, safeNumber(config.startingBalance, 5000));
  const currentBal = Math.max(0, safeNumber(account.currentBalance, startingBalance));
  const currentProfitLoss = Number((currentBal - startingBalance).toFixed(2));

  let activeTargetDollars = config.profitTargets.phase1TargetDollars;
  if (config.phase === 'PHASE_2') {
    activeTargetDollars = config.profitTargets.phase2TargetDollars;
  } else if (config.phase === 'PHASE_3') {
    activeTargetDollars = config.profitTargets.phase3TargetDollars ?? config.profitTargets.phase2TargetDollars;
  } else if (config.phase === 'FUNDED_LIVE' || config.phase === 'INSTANT_FUNDED') {
    activeTargetDollars =
      config.profitTargets.fundedMilestoneTargetDollars ?? config.profitTargets.phase1TargetDollars;
  }
  activeTargetDollars = Math.max(0, safeNumber(activeTargetDollars, startingBalance * 0.1));
  const activeTargetPercent =
    startingBalance > 0 ? Number(((activeTargetDollars / startingBalance) * 100).toFixed(2)) : 10;

  const remainingProfitTarget = calculateRemainingTarget(startingBalance, currentBal, activeTargetDollars);
  const profitProgressPercent =
    activeTargetDollars > 0
      ? Number(Math.min(100, Math.max(0, (currentProfitLoss / activeTargetDollars) * 100)).toFixed(1))
      : 0;
  const passingBalanceTarget = Number((startingBalance + activeTargetDollars).toFixed(2));
  const amountRequiredToPass = Number(Math.max(0, passingBalanceTarget - currentBal).toFixed(2));
  const isTargetPassed = activeTargetDollars > 0 && currentProfitLoss >= activeTargetDollars;

  return {
    phase: config.phase,
    phaseLabel: getPhaseLabel(config.phase),
    activeProfitTargetDollars: activeTargetDollars,
    activeProfitTargetPercent: activeTargetPercent,
    currentProfitLoss,
    remainingProfitTarget,
    profitProgressPercent,
    amountRequiredToPass,
    passingBalanceTarget,
    isTargetPassed,
  };
}

/**
 * Calculates exact remaining dollar amount to reach target
 */
export function calculateRemainingTarget(
  startingBalance: number,
  currentBalance: number,
  targetDollars: number
): number {
  const profit = currentBalance - startingBalance;
  return Number(Math.max(0, targetDollars - profit).toFixed(2));
}

/**
 * Hard Limit: Maximum permitted risk per trade by firm rules
 */
export function calculateMaximumPermittedRisk(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig,
  remainingDailyDd: number,
  remainingOverallDd: number
): number {
  const currentBal = Math.max(0, safeNumber(account.currentBalance, config.startingBalance || 5000));
  const firmMaxPercent = Math.max(0.1, safeNumber(config.maxRiskPerTradePercent, 1.0));
  let firmMaxDollars = Number(((currentBal * firmMaxPercent) / 100).toFixed(2));
  if (config.maxRiskPerTradeDollars && config.maxRiskPerTradeDollars > 0) {
    firmMaxDollars = Math.min(firmMaxDollars, config.maxRiskPerTradeDollars);
  }

  // Firm limits: never more than remaining daily or overall DD (with 5% slippage cushion)
  const dailyCeiling = Math.max(0, remainingDailyDd * 0.95);
  const overallCeiling = Math.max(0, remainingOverallDd * 0.95);

  return Number(Math.min(firmMaxDollars, dailyCeiling, overallCeiling).toFixed(2));
}

/**
 * Recommended Risk: Core algorithmic allocation using safety buffer and risk modes
 */
export function calculateRecommendedRisk(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig,
  remainingDailyDd: number,
  remainingOverallDd: number,
  consecutiveLosses: number,
  isTargetPassed: boolean,
  profitProgressPercent: number,
  remainingProfitTarget: number
): RecommendedRiskResult {
  const currency = account.currency || 'USD';
  const currentBal = Math.max(0, safeNumber(account.currentBalance, config.startingBalance || 5000));
  const startingBal = Math.max(1, safeNumber(config.startingBalance, 5000));
  const riskMode: FundedRiskMode = config.riskMode || 'BALANCED';

  const preferredRiskPercent = Math.max(0.1, safeNumber(config.preferredRiskPercent, 0.5));
  const preferredRiskDollars = Number(((currentBal * preferredRiskPercent) / 100).toFixed(2));

  const maxRiskPerTradePercent = Math.max(
    preferredRiskPercent,
    safeNumber(config.maxRiskPerTradePercent, 1.0)
  );
  const maxRiskPerTradeDollars = Number(((currentBal * maxRiskPerTradePercent) / 100).toFixed(2));

  const hardCeiling = calculateMaximumPermittedRisk(
    account,
    trades,
    config,
    remainingDailyDd,
    remainingOverallDd
  );

  // Section 12: Drawdown Safety Buffer (default 20%, configurable)
  const safetyBufferPercent = Math.max(0, Math.min(90, safeNumber(config.safetyBufferPercent, 20)));
  const usableDailyDrawdown = Number((remainingDailyDd * (1 - safetyBufferPercent / 100)).toFixed(2));
  const usableOverallDrawdown = Number((remainingOverallDd * (1 - safetyBufferPercent / 100)).toFixed(2));

  // Risk Mode Multipliers
  const modeSettings = {
    CONSERVATIVE: {
      baseScale: 0.65,
      usableDailyDdCapFraction: 0.35, // Risk at most 35% of usable daily DD on next trade
      usableOverallDdCapFraction: 0.20,
      streakMultiplier: [1.0, 0.70, 0.50, 0.30],
    },
    BALANCED: {
      baseScale: 1.0,
      usableDailyDdCapFraction: 0.50, // Risk at most 50% of usable daily DD on next trade
      usableOverallDdCapFraction: 0.30,
      streakMultiplier: [1.0, 0.80, 0.55, 0.35],
    },
    AGGRESSIVE: {
      baseScale: 1.0,
      usableDailyDdCapFraction: 0.70, // Risk at most 70% of usable daily DD on next trade
      usableOverallDdCapFraction: 0.40,
      streakMultiplier: [1.0, 0.90, 0.70, 0.50],
    },
  }[riskMode];

  let candidate = preferredRiskDollars * modeSettings.baseScale;
  let limitingFactor =
    riskMode === 'CONSERVATIVE'
      ? 'Conservative Mode Baseline (65% of Preferred)'
      : 'User Preferred Risk Setting';

  const reasons: string[] = [];

  // 1. Consecutive Loss Protection
  if (consecutiveLosses > 0) {
    const idx = Math.min(consecutiveLosses, 3);
    const streakMult = modeSettings.streakMultiplier[idx];
    const streakRisk = candidate * streakMult;
    if (streakRisk < candidate) {
      candidate = streakRisk;
      limitingFactor = `Consecutive Loss Dampener (${consecutiveLosses} Loss${consecutiveLosses > 1 ? 'es' : ''})`;
      reasons.push(
        `Consecutive Loss Protection: Risk dialed down to ${(streakMult * 100).toFixed(0)}% after ${consecutiveLosses} loss${consecutiveLosses > 1 ? 'es' : ''} to prevent drawdown acceleration.`
      );
    }
  }

  // 2. Usable Daily Drawdown Cap (Respecting Safety Buffer)
  const dailyCap = usableDailyDrawdown * modeSettings.usableDailyDdCapFraction;
  if (dailyCap < candidate) {
    candidate = dailyCap;
    limitingFactor = `Usable Daily DD Cap (${safetyBufferPercent}% buffer applied)`;
    reasons.push(
      `Daily Drawdown Safety: ${safetyBufferPercent}% buffer leaves ${formatCurrency(
        usableDailyDrawdown,
        currency
      )} usable DD. Risk capped at ${(modeSettings.usableDailyDdCapFraction * 100).toFixed(
        0
      )}% of usable allowance (${formatCurrency(dailyCap, currency)}).`
    );
  }

  // 3. Usable Overall Drawdown Cap
  const overallCap = usableOverallDrawdown * modeSettings.usableOverallDdCapFraction;
  if (overallCap < candidate) {
    candidate = overallCap;
    limitingFactor = `Overall Drawdown Floor Preservation`;
    reasons.push(
      `Overall Drawdown Preservation: Risk throttled to ${formatCurrency(
        overallCap,
        currency
      )} to preserve capital above liquidation threshold.`
    );
  }

  // 4. Near Target Pass Protection
  if (!isTargetPassed && profitProgressPercent >= 80 && remainingProfitTarget > 0) {
    const targetLockCap = Math.max(startingBal * 0.002, remainingProfitTarget * 0.60);
    if (targetLockCap < candidate) {
      candidate = targetLockCap;
      limitingFactor = `Phase Target Pass Lock-In (${profitProgressPercent}% completed)`;
      reasons.push(
        `Target Proximity Lock-In: You need only ${formatCurrency(
          remainingProfitTarget,
          currency
        )} to pass. Risk reduced to ${formatCurrency(
          targetLockCap,
          currency
        )} so a standard winner secures the phase without risking your accumulated gains.`
      );
    }
  }

  // Cap at hard ceiling
  candidate = Math.min(candidate, hardCeiling);

  // If drawdown breached or buffer exhausted
  if (remainingDailyDd <= 0 || remainingOverallDd <= 0) {
    candidate = 0;
    limitingFactor = 'Drawdown Limit Breached';
  } else if (candidate < startingBal * 0.001) {
    // Below 0.1% minimum viable trade
    candidate = 0;
    limitingFactor = 'Drawdown Buffer Insufficient for Viable Position';
  }

  const finalRiskDollars = Number(Math.max(0, candidate).toFixed(2));
  const finalRiskPercent =
    currentBal > 0 ? Number(((finalRiskDollars / currentBal) * 100).toFixed(2)) : 0;

  const explanation = `Recommended Risk: ${formatCurrency(finalRiskDollars, currency)} (${finalRiskPercent}% of current balance). Controlling constraint: ${limitingFactor}. Inputs: Account Size ${formatCurrency(startingBal, currency)}, Daily DD Remaining ${formatCurrency(remainingDailyDd, currency)}, Overall DD Remaining ${formatCurrency(remainingOverallDd, currency)}, Safety Buffer ${safetyBufferPercent}%, User Preferred ${preferredRiskPercent}%, Firm Max ${maxRiskPerTradePercent}%.`;

  return {
    riskMode,
    preferredRiskPercent,
    preferredRiskDollars,
    maxRiskPerTradePercent,
    maxRiskPerTradeDollars,
    recommendedRiskDollars: finalRiskDollars,
    recommendedRiskPercent: finalRiskPercent,
    hardCeilingRiskDollars: hardCeiling,
    safetyBufferPercent,
    usableDailyDrawdown,
    limitingFactor,
    reasons,
    explanation,
  };
}

// ----------------------------------------------------------------------------
// 18. LOT SIZE CALCULATION ENGINE
// ----------------------------------------------------------------------------

export interface InstrumentSpec {
  symbol: string;
  category: 'FOREX' | 'METALS' | 'INDICES' | 'CRYPTO';
  pipValuePerStandardLot: number;
  pipSize: number;
  contractSize: number;
}

export const KNOWN_INSTRUMENTS: Record<string, InstrumentSpec> = {
  XAUUSD: { symbol: 'XAUUSD', category: 'METALS', pipValuePerStandardLot: 10, pipSize: 0.1, contractSize: 100 },
  GOLD: { symbol: 'GOLD', category: 'METALS', pipValuePerStandardLot: 10, pipSize: 0.1, contractSize: 100 },
  XAGUSD: { symbol: 'XAGUSD', category: 'METALS', pipValuePerStandardLot: 50, pipSize: 0.01, contractSize: 5000 },
  EURUSD: { symbol: 'EURUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000 },
  GBPUSD: { symbol: 'GBPUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000 },
  AUDUSD: { symbol: 'AUDUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000 },
  NZDUSD: { symbol: 'NZDUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000 },
  USDCAD: { symbol: 'USDCAD', category: 'FOREX', pipValuePerStandardLot: 7.5, pipSize: 0.0001, contractSize: 100000 },
  USDCHF: { symbol: 'USDCHF', category: 'FOREX', pipValuePerStandardLot: 11, pipSize: 0.0001, contractSize: 100000 },
  USDJPY: { symbol: 'USDJPY', category: 'FOREX', pipValuePerStandardLot: 6.8, pipSize: 0.01, contractSize: 100000 },
  GBPJPY: { symbol: 'GBPJPY', category: 'FOREX', pipValuePerStandardLot: 6.8, pipSize: 0.01, contractSize: 100000 },
  EURJPY: { symbol: 'EURJPY', category: 'FOREX', pipValuePerStandardLot: 6.8, pipSize: 0.01, contractSize: 100000 },
  US30: { symbol: 'US30', category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 },
  NAS100: { symbol: 'NAS100', category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 },
  SPX500: { symbol: 'SPX500', category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 },
  GER30: { symbol: 'GER30', category: 'INDICES', pipValuePerStandardLot: 1.1, pipSize: 1.0, contractSize: 1 },
  BTCUSD: { symbol: 'BTCUSD', category: 'CRYPTO', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 },
  ETHUSD: { symbol: 'ETHUSD', category: 'CRYPTO', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 },
};

export function getInstrumentSpec(rawSymbol: string): InstrumentSpec {
  const clean = (rawSymbol || 'XAUUSD').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (KNOWN_INSTRUMENTS[clean]) return KNOWN_INSTRUMENTS[clean];

  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return { symbol: clean, category: 'METALS', pipValuePerStandardLot: 10, pipSize: 0.1, contractSize: 100 };
  }
  if (clean.includes('US30') || clean.includes('NAS100') || clean.includes('SPX500')) {
    return { symbol: clean, category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 };
  }
  if (clean.includes('BTC') || clean.includes('ETH')) {
    return { symbol: clean, category: 'CRYPTO', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1 };
  }

  const isJpy = clean.endsWith('JPY');
  return {
    symbol: clean,
    category: 'FOREX',
    pipValuePerStandardLot: isJpy ? 6.8 : 10,
    pipSize: isJpy ? 0.01 : 0.0001,
    contractSize: 100000,
  };
}

export function calculateLotSize(
  instrument: string,
  entryPrice: number,
  stopLossPrice: number,
  riskDollars: number,
  accountCurrency = 'USD'
): {
  lotSize: number;
  stopDistancePips: number;
  stopDistancePrice: number;
  pipValuePerLot: number;
} {
  const spec = getInstrumentSpec(instrument);
  const stopDistancePrice = Math.abs(entryPrice - stopLossPrice);
  const pipSize = spec.pipSize || 0.0001;
  const stopDistancePips = stopDistancePrice > 0 ? Number((stopDistancePrice / pipSize).toFixed(1)) : 0;

  if (stopDistancePips <= 0 || riskDollars <= 0) {
    return { lotSize: 0, stopDistancePips: 0, stopDistancePrice: 0, pipValuePerLot: spec.pipValuePerStandardLot };
  }

  // In standard account: risk is in USD, 1 standard lot pip value is in USD (e.g. $10).
  // In cent account: risk is in Cents, 1 cent lot pip value is in Cents (e.g. 10¢).
  // Both have identical numerical pip values in their native base currencies.
  const pipValue = spec.pipValuePerStandardLot;

  const rawLot = riskDollars / (stopDistancePips * pipValue);
  const lotSize = Math.max(0.01, Math.floor(rawLot * 100) / 100);

  return {
    lotSize,
    stopDistancePips,
    stopDistancePrice,
    pipValuePerLot: pipValue,
  };
}

// ----------------------------------------------------------------------------
// 16 & 17. TRADE APPROVAL CALCULATOR ("CAN I TAKE THIS TRADE?")
// ----------------------------------------------------------------------------

export function evaluateTrade(
  input: TradeEvaluationInput,
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig
): TradeEvaluationResult {
  const currency = account.currency || 'USD';
  const entryPrice = Math.max(0, safeNumber(input.entryPrice, 0));
  const stopLossPrice = Math.max(0, safeNumber(input.stopLossPrice, 0));
  const takeProfitPrice = Math.max(0, safeNumber(input.takeProfitPrice, 0));

  const spec = getInstrumentSpec(input.symbol);
  const stopDistancePrice = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePips =
    stopDistancePrice > 0 ? Number((stopDistancePrice / spec.pipSize).toFixed(1)) : 0;

  const currentBal = Math.max(1, safeNumber(account.currentBalance, config.startingBalance || 5000));
  const dailyRes = calculateDailyDrawdown(account, trades, config);
  const trailingRes = calculateTrailingDrawdown(account, trades, config);
  const overallRes = calculateOverallDrawdown(
    account,
    trades,
    config,
    trailingRes.activeLiquidationThreshold
  );

  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const reverseClosed = [...closedTrades].reverse();
  let consecutiveLosses = 0;
  for (const t of reverseClosed) {
    if (safeNumber(t.profitLoss, 0) < 0) consecutiveLosses++;
    else break;
  }

  const phaseRes = calculatePhaseProgress(account, trades, config);
  const riskRes = calculateRecommendedRisk(
    account,
    trades,
    config,
    dailyRes.remainingDailyDrawdown,
    overallRes.remainingOverallDrawdown,
    consecutiveLosses,
    phaseRes.isTargetPassed,
    phaseRes.profitProgressPercent,
    phaseRes.remainingProfitTarget
  );

  let lotSize = 0;
  let riskAmountDollars = 0;

  if (typeof input.proposedRiskDollars === 'number' && input.proposedRiskDollars > 0) {
    riskAmountDollars = input.proposedRiskDollars;
    const calc = calculateLotSize(input.symbol, entryPrice, stopLossPrice, riskAmountDollars, currency);
    lotSize = calc.lotSize;
  } else if (typeof input.lotSizeOverride === 'number' && input.lotSizeOverride > 0) {
    lotSize = input.lotSizeOverride;
    const pipVal = spec.pipValuePerStandardLot;
    riskAmountDollars = Number((lotSize * stopDistancePips * pipVal).toFixed(2));
  } else {
    riskAmountDollars = riskRes.recommendedRiskDollars;
    const calc = calculateLotSize(input.symbol, entryPrice, stopLossPrice, riskAmountDollars, currency);
    lotSize = calc.lotSize;
  }

  // Add optional commission / spread / swap
  const commission = safeNumber(input.commission, 0);
  const swap = safeNumber(input.swap, 0);
  const spreadCost = (safeNumber(input.spreadPips, 0) * spec.pipValuePerStandardLot * lotSize);
  riskAmountDollars = Number((riskAmountDollars + commission + swap + spreadCost).toFixed(2));

  const riskPercent = Number(((riskAmountDollars / currentBal) * 100).toFixed(2));

  // Potential Profit & R:R
  let potentialProfitDollars = 0;
  let riskRewardRatio = 0;
  if (takeProfitPrice > 0) {
    const tpDistancePrice = Math.abs(takeProfitPrice - entryPrice);
    const tpDistancePips = tpDistancePrice / spec.pipSize;
    potentialProfitDollars = Number((tpDistancePips * spec.pipValuePerStandardLot * lotSize).toFixed(2));
    if (riskAmountDollars > 0) {
      riskRewardRatio = Number((potentialProfitDollars / riskAmountDollars).toFixed(2));
    }
  }

  // Drawdown Impact After Stop-Loss
  const dailyDdAfterStopLoss = Number((dailyRes.currentDailyDrawdown + riskAmountDollars).toFixed(2));
  const remainingDailyDdAfterStopLoss = Number(
    (dailyRes.remainingDailyDrawdown - riskAmountDollars).toFixed(2)
  );

  const overallDdAfterStopLoss = Number((overallRes.currentOverallDrawdown + riskAmountDollars).toFixed(2));
  const remainingOverallDdAfterStopLoss = Number(
    (overallRes.remainingOverallDrawdown - riskAmountDollars).toFixed(2)
  );

  // Compliance & Violations Checks
  const violations: string[] = [];
  const warnings: string[] = [];

  if (stopDistancePips <= 0) {
    violations.push('Invalid Stop Loss: Stop loss cannot equal entry price.');
  }

  if (remainingDailyDdAfterStopLoss < 0) {
    violations.push(
      `Exceeds Daily Drawdown: Stop-out loss of ${formatCurrency(
        riskAmountDollars,
        currency
      )} breaches today's remaining DD of ${formatCurrency(
        dailyRes.remainingDailyDrawdown,
        currency
      )}.`
    );
  }

  if (remainingOverallDdAfterStopLoss < 0) {
    violations.push(
      `Exceeds Overall Drawdown Floor: Stop-out loss breaches ${formatCurrency(
        overallRes.overallBreachFloor,
        currency
      )} liquidation floor.`
    );
  }

  if (riskAmountDollars > riskRes.hardCeilingRiskDollars) {
    violations.push(
      `Exceeds Firm Maximum Risk Per Trade: Proposed risk of ${formatCurrency(
        riskAmountDollars,
        currency
      )} exceeds firm ceiling of ${formatCurrency(riskRes.hardCeilingRiskDollars, currency)}.`
    );
  }

  const todayStr = getKarachiDate();
  const tradesTodayCount = trades.filter((t) => t.date === todayStr).length;
  if (tradesTodayCount >= safeNumber(account.maxDailyTrades, 2)) {
    violations.push(
      `Daily Trade Limit Reached: You have logged ${tradesTodayCount} of ${account.maxDailyTrades} allowed trades today.`
    );
  }

  if (consecutiveLosses >= safeNumber(config.maxConsecutiveLossesThreshold, 3)) {
    warnings.push(
      `Loss Streak Circuit Breaker: You have recorded ${consecutiveLosses} consecutive losses. Capital preservation protocol recommends cooling down.`
    );
  }

  if (riskAmountDollars > riskRes.recommendedRiskDollars * 1.05) {
    warnings.push(
      `Risk Above Recommended: Proposed risk (${formatCurrency(
        riskAmountDollars,
        currency
      )}) is higher than safe recommended risk (${formatCurrency(
        riskRes.recommendedRiskDollars,
        currency
      )}). Consider down-sizing lot.`
    );
  }

  let status: TradeEvaluationResult['status'] = 'APPROVED';
  let verdictBadge = 'TRADE APPROVED — FULLY COMPLIANT';
  let verdictColor: TradeEvaluationResult['verdictColor'] = 'GREEN';

  if (violations.length > 0 || remainingDailyDdAfterStopLoss < 0 || remainingOverallDdAfterStopLoss < 0) {
    status = 'REJECTED';
    verdictBadge = 'TRADE REJECTED — RULE VIOLATION';
    verdictColor = 'RED';
  } else if (warnings.length > 0) {
    status = 'REDUCE_RISK';
    verdictBadge = 'REDUCE RISK — EXCEEDS SAFE RECOMMENDATION';
    verdictColor = 'YELLOW';
  }

  const isAllowed = status !== 'REJECTED';
  const explanation =
    status === 'APPROVED'
      ? `🟢 Trade Approved: Proposed risk of ${formatCurrency(
          riskAmountDollars,
          currency
        )} (${riskPercent}%) on ${lotSize} lot leaves ${formatCurrency(
          remainingDailyDdAfterStopLoss,
          currency
        )} remaining Daily DD and ${formatCurrency(
          remainingOverallDdAfterStopLoss,
          currency
        )} remaining Overall DD.`
      : status === 'REDUCE_RISK'
      ? `🟡 Reduce Risk: Trade is technically within hard limits, but exceeds Prime FX recommended safe risk (${formatCurrency(
          riskRes.recommendedRiskDollars,
          currency
        )}). Downsize lot to protect drawdown cushion.`
      : `🔴 Trade Rejected: ${violations.join(' ')}`;

  return {
    symbol: input.symbol,
    direction: input.direction,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    stopDistancePips,
    stopDistancePrice,
    recommendedLotSize: lotSize,
    riskAmountDollars,
    riskPercent,
    potentialProfitDollars,
    riskRewardRatio,
    dailyDdAfterStopLoss,
    remainingDailyDdAfterStopLoss,
    overallDdAfterStopLoss,
    remainingOverallDdAfterStopLoss,
    status,
    verdictBadge,
    verdictColor,
    isAllowed,
    violations,
    warnings,
    explanation,
  };
}

// ----------------------------------------------------------------------------
// 21. ACCOUNT HEALTH SCORE ENGINE (0 - 100)
// ----------------------------------------------------------------------------

export function evaluateAccountHealth(
  account: AccountSettings,
  trades: Trade[] = [],
  dailyRes: DailyDrawdownResult,
  overallRes: OverallDrawdownResult,
  consecutiveLosses: number,
  violations: FundedRuleViolation[] = []
): AccountHealthEvaluation {
  // 1. Daily DD Distance (0 - 25 points)
  const dailyRemainingPct = dailyRes.dailyDrawdownLimitDollars > 0
    ? (dailyRes.remainingDailyDrawdown / dailyRes.dailyDrawdownLimitDollars) * 100
    : 100;
  const dailyScore = Math.round((Math.max(0, Math.min(100, dailyRemainingPct)) * 25) / 100);

  // 2. Overall DD Distance (0 - 25 points)
  const overallRemainingPct = overallRes.overallDrawdownLimitDollars > 0
    ? (overallRes.remainingOverallDrawdown / overallRes.overallDrawdownLimitDollars) * 100
    : 100;
  const overallScore = Math.round((Math.max(0, Math.min(100, overallRemainingPct)) * 25) / 100);

  // 3. Consecutive Losses Penalty (0 - 20 points base)
  let streakScore = 20;
  if (consecutiveLosses === 1) streakScore = 15;
  else if (consecutiveLosses === 2) streakScore = 10;
  else if (consecutiveLosses >= 3) streakScore = 0;

  // 4. Risk Compliance (0 - 15 points)
  const recentClosed = [...trades].filter((t) => t.status !== 'OPEN').slice(-5);
  const oversizedCount = recentClosed.filter(
    (t) => (safeNumber(t.riskPercent, 1) > 1.2)
  ).length;
  const riskComplianceScore = Math.max(0, 15 - oversizedCount * 5);

  // 5. Phase Progress / Profit Cushion (0 - 15 points)
  const startingBal = Math.max(1, safeNumber(account.initialBalance, 5000));
  const currentBal = Math.max(0, safeNumber(account.currentBalance, startingBal));
  const profit = currentBal - startingBal;
  let progressBonus = 8;
  if (profit > 0) {
    progressBonus = Math.min(15, 8 + Math.round((profit / (startingBal * 0.1)) * 7));
  } else if (profit < 0) {
    progressBonus = Math.max(0, 8 - Math.round((Math.abs(profit) / (startingBal * 0.05)) * 8));
  }

  // 6. Violations Penalty
  const criticalViolations = violations.filter((v) => v.severity === 'CRITICAL').length;
  const violationPenalty = criticalViolations * 25;

  let totalScore = dailyScore + overallScore + streakScore + riskComplianceScore + progressBonus - violationPenalty;
  totalScore = Math.max(0, Math.min(100, totalScore));

  // Proximity hard cap: If overall DD or daily DD is dangerously exhausted (< 25% left), health is strictly capped
  if (overallRemainingPct < 25 || dailyRemainingPct < 25) {
    const minRemainingPct = Math.min(overallRemainingPct, dailyRemainingPct);
    const cappedMax = Math.round(Math.max(15, minRemainingPct * 2.0));
    if (totalScore > cappedMax) {
      totalScore = cappedMax;
    }
  }

  let status: AccountHealthEvaluation['status'] = 'HEALTHY';
  let color: AccountHealthEvaluation['color'] = 'EMERALD';

  if (totalScore >= 80) {
    status = 'HEALTHY';
    color = 'EMERALD';
  } else if (totalScore >= 65) {
    status = 'GOOD';
    color = 'BLUE';
  } else if (totalScore >= 50) {
    status = 'CAUTION';
    color = 'AMBER';
  } else if (totalScore >= 35) {
    status = 'DEFENSIVE';
    color = 'ORANGE';
  } else {
    status = 'CRITICAL';
    color = 'ROSE';
  }

  const summary = `Account Health: ${totalScore}/100 (${status}). Daily DD Buffer: ${dailyScore}/25, Overall DD Buffer: ${overallScore}/25, Loss Streak Discipline: ${streakScore}/20, Risk Compliance: ${riskComplianceScore}/15.`;

  return {
    score: totalScore,
    status,
    color,
    factors: {
      dailyDrawdownDistanceScore: dailyScore,
      overallDrawdownDistanceScore: overallScore,
      consecutiveLossPenalty: streakScore,
      riskComplianceScore,
      phaseProgressBonus: progressBonus,
      ruleViolationPenalty: violationPenalty,
    },
    summary,
  };
}

// ----------------------------------------------------------------------------
// 22. RULE VIOLATION AUDIT & DETECTION ENGINE
// ----------------------------------------------------------------------------

export function evaluateRuleViolations(
  account: AccountSettings,
  trades: Trade[] = [],
  config: FundedAccountConfig
): FundedRuleViolation[] {
  const violations: FundedRuleViolation[] = [];
  const todayStr = getKarachiDate();
  const timeStr = getKarachiTime();

  const dailyRes = calculateDailyDrawdown(account, trades, config);
  if (dailyRes.isDailyDrawdownBreached) {
    violations.push({
      id: `viol-daily-${Date.now()}`,
      accountId: account.id,
      timestamp: Date.now(),
      date: todayStr,
      time: timeStr,
      ruleType: 'DAILY_DRAWDOWN',
      severity: 'CRITICAL',
      title: 'Daily Drawdown Breached',
      description: `Today's loss exceeded the configured daily drawdown limit of ${formatCurrency(
        dailyRes.dailyDrawdownLimitDollars,
        account.currency
      )}.`,
    });
  }

  const trailingRes = calculateTrailingDrawdown(account, trades, config);
  const overallRes = calculateOverallDrawdown(
    account,
    trades,
    config,
    trailingRes.activeLiquidationThreshold
  );
  if (overallRes.isOverallDrawdownBreached) {
    violations.push({
      id: `viol-overall-${Date.now()}`,
      accountId: account.id,
      timestamp: Date.now(),
      date: todayStr,
      time: timeStr,
      ruleType: 'OVERALL_DRAWDOWN',
      severity: 'CRITICAL',
      title: 'Overall Max Drawdown Breached',
      description: `Account equity breached liquidation threshold of ${formatCurrency(
        overallRes.overallBreachFloor,
        account.currency
      )}.`,
    });
  }

  // Check trade-level violations from trade history
  const firmMaxRisk = config.maxRiskPerTradeDollars || (config.startingBalance * config.maxRiskPerTradePercent) / 100;
  for (const t of trades) {
    if (t.riskAmount && t.riskAmount > firmMaxRisk * 1.05) {
      violations.push({
        id: `viol-risk-${t.id}`,
        accountId: account.id,
        timestamp: getKarachiEpoch(t.date, t.time),
        date: t.date,
        time: t.time,
        ruleType: 'MAX_RISK_PER_TRADE',
        severity: 'WARNING',
        title: 'Max Risk Per Trade Exceeded',
        description: `Trade #${t.tradeNumber || t.id} risked ${formatCurrency(
          t.riskAmount,
          account.currency
        )}, exceeding firm cap of ${formatCurrency(firmMaxRisk, account.currency)}.`,
      });
    }
  }

  return violations;
}

// ----------------------------------------------------------------------------
// 14. TRADING STATUS DETERMINATION (GREEN / YELLOW / ORANGE / RED)
// ----------------------------------------------------------------------------

export function determineTradingStatus(
  dailyRes: DailyDrawdownResult,
  overallRes: OverallDrawdownResult,
  consecutiveLosses: number,
  violations: FundedRuleViolation[],
  tradesToday: number,
  maxDailyTrades: number
): TradingStatusState {
  if (
    dailyRes.isDailyDrawdownBreached ||
    overallRes.isOverallDrawdownBreached ||
    tradesToday >= maxDailyTrades ||
    consecutiveLosses >= 4 ||
    violations.some((v) => v.severity === 'CRITICAL')
  ) {
    return 'RED';
  }

  if (dailyRes.dailyDrawdownUsedPercent >= 75 || overallRes.overallDrawdownUsedPercent >= 75 || consecutiveLosses >= 3) {
    return 'ORANGE';
  }

  if (dailyRes.dailyDrawdownUsedPercent >= 40 || overallRes.overallDrawdownUsedPercent >= 40 || consecutiveLosses >= 1) {
    return 'YELLOW';
  }

  return 'GREEN';
}

// ----------------------------------------------------------------------------
// MASTER AUDIT & EVALUATION HOOK
// ----------------------------------------------------------------------------

export function evaluateFundedAccountRisk(
  account: AccountSettings,
  trades: Trade[] = []
): FundedAccountRiskEvaluation {
  const config = getEffectiveFundedConfig(account);
  const fundedActive = isFundedAccount(account);
  const currency = account.currency || 'USD';

  const startingBalance = Math.max(1, safeNumber(config.startingBalance, 5000));
  const accountSize = Math.max(1, safeNumber(config.accountSize, startingBalance));

  // Trailing Drawdown
  const trailingRes = calculateTrailingDrawdown(account, trades, config);

  // Daily Drawdown
  const dailyRes = calculateDailyDrawdown(account, trades, config);

  // Overall Drawdown
  const overallRes = calculateOverallDrawdown(
    account,
    trades,
    config,
    trailingRes.activeLiquidationThreshold
  );

  // Phase Progress
  const phaseRes = calculatePhaseProgress(account, trades, config);

  // Streaks & Count
  const sortedTrades = [...trades].sort(
    (a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time)
  );
  const closedTrades = sortedTrades.filter((t) => t.status !== 'OPEN');
  const reverseClosed = [...closedTrades].reverse();

  let consecutiveLosses = 0;
  let consecutiveWins = 0;
  for (const t of reverseClosed) {
    const pnl = safeNumber(t.profitLoss, 0);
    if (pnl < 0) {
      if (consecutiveWins === 0) consecutiveLosses++;
      else break;
    } else if (pnl > 0) {
      if (consecutiveLosses === 0) consecutiveWins++;
      else break;
    }
  }

  const todayStr = getKarachiDate();
  const tradesToday = sortedTrades.filter((t) => t.date === todayStr).length;
  const maxDailyTrades = Math.max(1, safeNumber(account.maxDailyTrades, 2));
  const lastClosedTrade = reverseClosed.length > 0 ? reverseClosed[0] : null;
  const lastTradePnL = lastClosedTrade ? safeNumber(lastClosedTrade.profitLoss, 0) : null;

  // Recommended Risk
  const riskRes = calculateRecommendedRisk(
    account,
    trades,
    config,
    dailyRes.remainingDailyDrawdown,
    overallRes.remainingOverallDrawdown,
    consecutiveLosses,
    phaseRes.isTargetPassed,
    phaseRes.profitProgressPercent,
    phaseRes.remainingProfitTarget
  );

  // Violations
  const violations = evaluateRuleViolations(account, trades, config);

  // Trading Status (GREEN / YELLOW / ORANGE / RED)
  const tradingStatus = determineTradingStatus(
    dailyRes,
    overallRes,
    consecutiveLosses,
    violations,
    tradesToday,
    maxDailyTrades
  );

  // Health Score
  const healthScore = evaluateAccountHealth(
    account,
    trades,
    dailyRes,
    overallRes,
    consecutiveLosses,
    violations
  );

  // Verdict Logic
  let verdict: FundedDecisionVerdict = 'TAKE_TRADE';
  let verdictBadge = 'TRADE APPROVED — SAFE WITHIN FUNDED RULES';
  let verdictColor: FundedAccountRiskEvaluation['verdictColor'] = 'EMERALD';

  if (dailyRes.isDailyDrawdownBreached || overallRes.isOverallDrawdownBreached) {
    verdict = 'STOP_TRADING';
    verdictBadge = 'STOP TRADING — DRAWDOWN LIMIT BREACHED';
    verdictColor = 'ROSE';
  } else if (
    config.phase !== 'FUNDED_LIVE' &&
    config.phase !== 'INSTANT_FUNDED' &&
    phaseRes.isTargetPassed
  ) {
    verdict = 'TARGET_PASSED';
    verdictBadge = 'PHASE TARGET PASSED — STOP & LOCK EVALUATION';
    verdictColor = 'CYAN';
  } else if (tradingStatus === 'RED') {
    verdict = 'STOP_TRADING';
    verdictBadge = 'STOP TRADING — RISK CIRCUIT BREAKER ACTIVE';
    verdictColor = 'ROSE';
  } else if (tradingStatus === 'ORANGE' || tradingStatus === 'YELLOW') {
    verdict = 'REDUCE_RISK';
    verdictBadge = 'REDUCE RISK — DEFENSIVE PROP SIZING ACTIVE';
    verdictColor = 'AMBER';
  }

  const tradesToDailyBreachAtRecommended =
    riskRes.recommendedRiskDollars > 0
      ? Math.max(1, Math.floor(dailyRes.remainingDailyDrawdown / riskRes.recommendedRiskDollars))
      : 0;

  const tradesToOverallBreachAtRecommended =
    riskRes.recommendedRiskDollars > 0
      ? Math.max(1, Math.floor(overallRes.remainingOverallDrawdown / riskRes.recommendedRiskDollars))
      : 0;

  const tradesToPassAt2R =
    riskRes.recommendedRiskDollars > 0 && phaseRes.remainingProfitTarget > 0
      ? Math.max(1, Math.ceil(phaseRes.remainingProfitTarget / (riskRes.recommendedRiskDollars * 2)))
      : 0;

  const currentBal = Math.max(0, safeNumber(account.currentBalance, startingBalance));
  const currentEq = Math.max(0, safeNumber(account.currentEquity, currentBal + dailyRes.todayUnrealizedPnL));

  const lastTradeContextLabel = lastClosedTrade
    ? `${lastClosedTrade.instrument} ${lastClosedTrade.direction} (${lastClosedTrade.lotSize} Lots, Risk ${lastClosedTrade.riskPercent || 1}%)`
    : null;

  const nextTradeRiskQuestionAnswer =
    riskRes.recommendedRiskDollars > 0
      ? lastTradePnL !== null && lastTradePnL < 0
        ? `Since you incurred a loss of -${formatCurrency(
            Math.abs(lastTradePnL),
            currency
          )} on your last trade (${lastTradeContextLabel}), you should now take your NEXT trade at a reduced risk of ${
            riskRes.recommendedRiskPercent
          }% (${formatCurrency(
            riskRes.recommendedRiskDollars,
            currency
          )}). This protects your remaining Daily Drawdown (${formatCurrency(
            dailyRes.remainingDailyDrawdown,
            currency
          )}) and keeps ${tradesToDailyBreachAtRecommended} full loss buffer(s).`
        : lastTradePnL !== null && lastTradePnL > 0
        ? `Since you secured a win of +${formatCurrency(
            lastTradePnL,
            currency
          )} on your last trade (${lastTradeContextLabel}), lock in your profit cushion and take your NEXT trade at ${
            riskRes.recommendedRiskPercent
          }% (${formatCurrency(
            riskRes.recommendedRiskDollars,
            currency
          )}). Avoid post-win over-sizing while maintaining ${tradesToDailyBreachAtRecommended} daily loss buffer(s).`
        : `Based on your General Settings (${riskRes.riskMode} Mode, ${riskRes.preferredRiskPercent}% preferred risk), take your NEXT trade at ${
            riskRes.recommendedRiskPercent
          }% (${formatCurrency(
            riskRes.recommendedRiskDollars,
            currency
          )}). This leaves ${tradesToDailyBreachAtRecommended} full loss buffer(s) before Today's Daily Drawdown (${formatCurrency(
            dailyRes.remainingDailyDrawdown,
            currency
          )} left).`
      : `Your safe risk for the NEXT trade is ${formatCurrency(
          0,
          currency
        )} (0.00%). Do not open new positions right now (${riskRes.limitingFactor}).`;

  const shouldTakeTradeQuestionAnswer =
    verdict === 'TAKE_TRADE'
      ? lastTradePnL !== null && lastTradePnL > 0
        ? `PROCEED AT ${riskRes.recommendedRiskPercent}% (${formatCurrency(
            riskRes.recommendedRiskDollars,
            currency
          )}) RISK: You secured +${formatCurrency(
            lastTradePnL,
            currency
          )} on ${lastClosedTrade?.instrument || 'your last trade'}. Keep sizing steady at ${
            riskRes.recommendedRiskPercent
          }% per your ${config.firmName} settings.`
        : `TAKE THIS TRADE AT ${riskRes.recommendedRiskPercent}% (${formatCurrency(
            riskRes.recommendedRiskDollars,
            currency
          )}) RISK: Your daily and overall drawdown buffers are healthy within all ${
            config.firmName
          } rules.`
      : verdict === 'REDUCE_RISK'
      ? `SCALE DOWN TO ${riskRes.recommendedRiskPercent}% (${formatCurrency(
          riskRes.recommendedRiskDollars,
          currency
        )}) ON YOUR NEXT TRADE: ${
          lastTradePnL !== null && lastTradePnL < 0
            ? `Following your -${formatCurrency(Math.abs(lastTradePnL), currency)} loss on ${
                lastClosedTrade?.instrument || 'the previous trade'
              }, reduce risk to ${riskRes.recommendedRiskPercent}%`
            : `Down-size due to ${riskRes.limitingFactor.toLowerCase()}`
        }. Execute only an A+ setup.`
      : verdict === 'TARGET_PASSED'
      ? `STOP TRADING & LOCK IN PASS: You have already reached the ${formatCurrency(
          phaseRes.activeProfitTargetDollars,
          currency
        )} profit target for ${phaseRes.phaseLabel}.`
      : `STOP TRADING IMMEDIATELY: Do not take another trade today. Reason: ${riskRes.limitingFactor}. Protect your funded account from rule breach.`;

  return {
    isFunded: fundedActive,
    config,
    firmName: config.firmName || account.broker || 'My Prop Firm',
    accountName: account.accountName,
    accountSize,
    currency,
    phase: config.phase,
    phaseLabel: phaseRes.phaseLabel,
    startingBalance,
    currentBalance: currentBal,
    currentEquity: currentEq,

    activeProfitTargetDollars: phaseRes.activeProfitTargetDollars,
    activeProfitTargetPercent: phaseRes.activeProfitTargetPercent,
    currentProfitLoss: phaseRes.currentProfitLoss,
    remainingProfitTarget: phaseRes.remainingProfitTarget,
    profitProgressPercent: phaseRes.profitProgressPercent,
    amountRequiredToPass: phaseRes.amountRequiredToPass,
    passingBalanceTarget: phaseRes.passingBalanceTarget,
    isTargetPassed: phaseRes.isTargetPassed,

    drawdownType: config.drawdownType,
    drawdownTypeLabel: getDrawdownTypeLabel(config.drawdownType),
    isTrailing: trailingRes.isTrailing,
    initialLiquidationThreshold: trailingRes.initialLiquidationThreshold,
    highWaterMark: trailingRes.highWaterMark,
    activeLiquidationThreshold: trailingRes.activeLiquidationThreshold,
    trailingFloorMovedDollars: trailingRes.trailingFloorMovedDollars,
    isTrailingLocked: trailingRes.isTrailingLocked,
    trailingExplanation: trailingRes.trailingExplanation,

    todayStartingBalance: dailyRes.todayStartingBalance,
    todayStartingEquity: dailyRes.todayStartingEquity,
    todayRealizedPnL: dailyRes.todayRealizedPnL,
    todayUnrealizedPnL: dailyRes.todayUnrealizedPnL,
    dailyDrawdownLimitDollars: dailyRes.dailyDrawdownLimitDollars,
    dailyDrawdownLimitPercent: dailyRes.dailyDrawdownLimitPercent,
    dailyBreachFloor: dailyRes.dailyBreachFloor,
    currentDailyDrawdown: dailyRes.currentDailyDrawdown,
    remainingDailyDrawdown: dailyRes.remainingDailyDrawdown,
    dailyDrawdownUsedPercent: dailyRes.dailyDrawdownUsedPercent,
    dailyDrawdownAccountPercent: dailyRes.dailyDrawdownAccountPercent,
    isDailyDrawdownBreached: dailyRes.isDailyDrawdownBreached,

    overallDrawdownLimitDollars: overallRes.overallDrawdownLimitDollars,
    overallDrawdownLimitPercent: overallRes.overallDrawdownLimitPercent,
    overallBreachFloor: overallRes.overallBreachFloor,
    currentOverallDrawdown: overallRes.currentOverallDrawdown,
    remainingOverallDrawdown: overallRes.remainingOverallDrawdown,
    overallDrawdownUsedPercent: overallRes.overallDrawdownUsedPercent,
    overallDrawdownAccountPercent: overallRes.overallDrawdownAccountPercent,
    isOverallDrawdownBreached: overallRes.isOverallDrawdownBreached,

    riskMode: riskRes.riskMode,
    safetyBufferPercent: riskRes.safetyBufferPercent,
    usableDailyDrawdown: riskRes.usableDailyDrawdown,
    preferredRiskPercent: riskRes.preferredRiskPercent,
    preferredRiskDollars: riskRes.preferredRiskDollars,
    maxRiskPerTradePercent: riskRes.maxRiskPerTradePercent,
    maxRiskPerTradeDollars: riskRes.maxRiskPerTradeDollars,
    recommendedRiskDollars: riskRes.recommendedRiskDollars,
    recommendedRiskPercent: riskRes.recommendedRiskPercent,
    hardCeilingRiskDollars: riskRes.hardCeilingRiskDollars,
    limitingFactor: riskRes.limitingFactor,
    verdict,
    verdictBadge,
    verdictColor,
    tradingStatus,
    nextTradeRiskQuestionAnswer,
    shouldTakeTradeQuestionAnswer,
    reasons: riskRes.reasons,
    explanation: riskRes.explanation,

    tradesToday,
    maxDailyTrades,
    consecutiveLosses,
    consecutiveWins,
    lastTradePnL,
    tradesToDailyBreachAtRecommended,
    tradesToOverallBreachAtRecommended,
    tradesToPassAt2R,

    healthScore,
    violations,
  };
}

// ----------------------------------------------------------------------------
// 23 & 40. RULES PROFILES & PERSISTENCE HELPERS
// ----------------------------------------------------------------------------

const PROFILES_STORAGE_KEY = 'primepipfx_funded_profiles_v1';
const VIOLATIONS_STORAGE_KEY = 'primepipfx_funded_violations_v1';

export function getStoredRulesProfiles(): FundedRulesProfile[] {
  const baseProfiles: FundedRulesProfile[] = PROP_FIRM_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    firmName: p.firmName,
    accountSize: p.accountSize,
    dailyDrawdownPercent: p.dailyDrawdownPct,
    overallDrawdownPercent: p.overallDrawdownPct,
    phase1TargetPercent: p.phase1TargetPct,
    phase2TargetPercent: p.phase2TargetPct,
    drawdownType: p.drawdownType,
    trailingBasis: p.trailingBasis,
    maxRiskPerTradePercent: p.maxRiskPerTradePct || 1.0,
    safetyBufferPercent: p.safetyBufferPct || 20,
    maxConsecutiveLosses: 3,
    minimumTradingDays: 5,
    newsRestriction: Boolean(p.newsRestriction),
    weekendHoldingRestriction: Boolean(p.weekendRestriction),
    description: p.description,
    isCustom: false,
  }));

  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const custom: FundedRulesProfile[] = JSON.parse(raw);
      return [...custom, ...baseProfiles];
    }
  } catch (e) {
    console.warn('Could not read custom funded profiles:', e);
  }
  return baseProfiles;
}

export function saveCustomRulesProfile(profile: FundedRulesProfile): void {
  try {
    const current = getStoredRulesProfiles().filter((p) => p.isCustom);
    const updated = [profile, ...current.filter((p) => p.id !== profile.id)];
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save custom funded profile:', e);
  }
}

export function deleteCustomRulesProfile(profileId: string): void {
  try {
    const current = getStoredRulesProfiles().filter((p) => p.isCustom);
    const updated = current.filter((p) => p.id !== profileId);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not delete custom funded profile:', e);
  }
}

export function getStoredViolations(accountId: string): FundedRuleViolation[] {
  try {
    const raw = localStorage.getItem(`${VIOLATIONS_STORAGE_KEY}_${accountId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function recordViolation(violation: FundedRuleViolation): void {
  try {
    const current = getStoredViolations(violation.accountId);
    const updated = [violation, ...current].slice(0, 50);
    localStorage.setItem(
      `${VIOLATIONS_STORAGE_KEY}_${violation.accountId}`,
      JSON.stringify(updated)
    );
  } catch {}
}

export function clearViolations(accountId: string): void {
  try {
    localStorage.removeItem(`${VIOLATIONS_STORAGE_KEY}_${accountId}`);
  } catch {}
}

// ----------------------------------------------------------------------------
// 41. STANDARDIZED 4-STATE DETERMINISTIC RISK EVALUATION ENGINE
// ----------------------------------------------------------------------------

export interface DeterministicEvaluationOutput extends DeterministicRiskAssessment {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLossPrice: number;
  stopDistancePips: number;
  stopDistancePrice: number;
  lotSize: number;
  pipValuePerLot: number;
  potentialProfitDollars: number;
  riskRewardRatio: number;
  isAllowed: boolean;
  warnings: string[];
}

/**
 * Evaluates trade risk against official provider rules, personal preferences, and latest account state.
 * Emits strictly one of 4 states: TAKE, REDUCE, STOP, or REVIEW.
 */
export function evaluateTradeRiskDeterministic(
  input: TradeEvaluationInput,
  account: AccountSettings,
  trades: Trade[] = [],
  customConfig?: FundedAccountConfig
): DeterministicEvaluationOutput {
  const currency = account.currency || 'USD';
  const config = customConfig || getEffectiveFundedConfig(account);
  const startingBal = Math.max(1, safeNumber(account.initialBalance, config.startingBalance || 5000));
  const currentBal = safeNumber(account.currentBalance, startingBal);
  const currentEq = safeNumber(account.currentEquity, currentBal);
  const isManuallyReported = account.isManual !== false;
  const ruleProfileVersion = account.ruleProfileVersion || config.rulesProfileName || 'PPFX-DETERMINISTIC-v2.6';

  const missingOrStaleInputs: string[] = [];

  // 1. DATA HEALTH & INTEGRITY CHECK (Downgrades to REVIEW if missing / stale)
  if (!input.symbol || typeof input.symbol !== 'string' || input.symbol.trim() === '') {
    missingOrStaleInputs.push('Missing trading instrument / symbol.');
  }
  const entryPrice = safeNumber(input.entryPrice, 0);
  const stopLossPrice = safeNumber(input.stopLossPrice, 0);
  if (entryPrice <= 0) {
    missingOrStaleInputs.push('Entry price must be greater than zero.');
  }
  if (stopLossPrice <= 0) {
    missingOrStaleInputs.push('Stop-loss price must be specified and greater than zero.');
  }
  if (entryPrice > 0 && stopLossPrice > 0 && Math.abs(entryPrice - stopLossPrice) < 0.000001) {
    missingOrStaleInputs.push('Stop-loss cannot equal entry price.');
  }
  if (currentBal <= 0) {
    missingOrStaleInputs.push('Account balance must be positive.');
  }

  const spec = getInstrumentSpec(input.symbol || 'XAUUSD');
  const stopDistancePrice = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePips =
    stopDistancePrice > 0 && spec.pipSize > 0
      ? Number((stopDistancePrice / spec.pipSize).toFixed(1))
      : 0;

  const ruleWarnings: string[] = [];
  // Informative draft notice for custom unverified accounts (does not block calculation)
  if (account.accountCategory === 'FUNDED' && account.ruleVerificationStatus === 'UNVERIFIED') {
    ruleWarnings.push('Custom draft settings: These parameters are draft settings, not official rules of any proprietary trading firm.');
  }

  if (missingOrStaleInputs.length > 0) {
    return {
      decisionState: 'REVIEW',
      maxPermissiblePlannedLoss: 0,
      recommendedRiskBudget: 0,
      proposedRisk: 0,
      positionSize: 0,
      dailyLossCapacityRemaining: 0,
      overallLossCapacityRemaining: 0,
      personalLimitsRemaining: 0,
      safetyBuffer: config.safetyBufferPercent || 20,
      exactReason: `Calculation cannot proceed with incomplete trade parameters: ${missingOrStaleInputs.join(' ')}`,
      missingOrStaleInputs,
      nextAction: 'Verify and supply required trade entry inputs (symbol, entry price, stop-loss price, and valid balance).',
      ruleProfileVersion,
      assessmentTimestamp: Date.now(),
      isManuallyReported,
      symbol: input.symbol || 'XAUUSD',
      direction: input.direction || 'BUY',
      entryPrice,
      stopLossPrice,
      stopDistancePips,
      stopDistancePrice,
      lotSize: 0,
      pipValuePerLot: spec.pipValuePerStandardLot,
      potentialProfitDollars: 0,
      riskRewardRatio: 0,
      isAllowed: false,
      warnings: [...missingOrStaleInputs, ...ruleWarnings],
    };
  }

  // 2. DRAWDOWN CAPACITY BASELINES
  const dailyRes = calculateDailyDrawdown(account, trades, config);
  const trailingRes = calculateTrailingDrawdown(account, trades, config);
  const overallRes = calculateOverallDrawdown(
    account,
    trades,
    config,
    trailingRes.activeLiquidationThreshold
  );

  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const reverseClosed = [...closedTrades].reverse();
  let consecutiveLosses = 0;
  for (const t of reverseClosed) {
    if (safeNumber(t.profitLoss, 0) < 0) consecutiveLosses++;
    else break;
  }

  const phaseRes = calculatePhaseProgress(account, trades, config);
  const riskRes = calculateRecommendedRisk(
    account,
    trades,
    config,
    dailyRes.remainingDailyDrawdown,
    overallRes.remainingOverallDrawdown,
    consecutiveLosses,
    phaseRes.isTargetPassed,
    phaseRes.profitProgressPercent,
    phaseRes.remainingProfitTarget
  );

  const hardCeiling = riskRes.hardCeilingRiskDollars;
  const recommendedRiskBudget = riskRes.recommendedRiskDollars;

  // 3. DETERMINE PROPOSED RISK & LOT SIZE
  let lotSize = 0;
  let proposedRisk = 0;

  if (typeof input.proposedRiskDollars === 'number' && input.proposedRiskDollars > 0) {
    proposedRisk = input.proposedRiskDollars;
    const calc = calculateLotSize(input.symbol, entryPrice, stopLossPrice, proposedRisk, currency);
    lotSize = calc.lotSize;
  } else if (typeof input.lotSizeOverride === 'number' && input.lotSizeOverride > 0) {
    lotSize = input.lotSizeOverride;
    proposedRisk = Number((lotSize * stopDistancePips * spec.pipValuePerStandardLot).toFixed(2));
  } else {
    proposedRisk = recommendedRiskBudget;
    const calc = calculateLotSize(input.symbol, entryPrice, stopLossPrice, proposedRisk, currency);
    lotSize = calc.lotSize;
  }

  // Factor in costs
  const commission = safeNumber(input.commission, 0);
  const swap = safeNumber(input.swap, 0);
  const spreadCost = (safeNumber(input.spreadPips, 0) * spec.pipValuePerStandardLot * lotSize);
  proposedRisk = Number((proposedRisk + commission + swap + spreadCost).toFixed(2));

  // Potential profit & R:R
  let potentialProfitDollars = 0;
  let riskRewardRatio = 0;
  const takeProfitPrice = safeNumber(input.takeProfitPrice, 0);
  if (takeProfitPrice > 0) {
    const tpDistancePrice = Math.abs(takeProfitPrice - entryPrice);
    const tpDistancePips = tpDistancePrice / spec.pipSize;
    potentialProfitDollars = Number((tpDistancePips * spec.pipValuePerStandardLot * lotSize).toFixed(2));
    if (proposedRisk > 0) {
      riskRewardRatio = Number((potentialProfitDollars / proposedRisk).toFixed(2));
    }
  }

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const existingOpenExposure = openTrades.reduce(
    (acc, t) => acc + safeNumber(t.riskAmount, safeNumber(t.riskDollars, 0)),
    0
  );

  const dailyRemainingAfterTrade = Number(
    (dailyRes.remainingDailyDrawdown - proposedRisk - existingOpenExposure).toFixed(2)
  );
  const overallRemainingAfterTrade = Number(
    (overallRes.remainingOverallDrawdown - proposedRisk - existingOpenExposure).toFixed(2)
  );

  // 4. CHECK DECISION STATES: STOP, REDUCE, TAKE
  const warnings: string[] = [...ruleWarnings];

  // STATE A: STOP
  // Account is breached, trading restricted, daily limit hit, or proposed risk breaks boundary
  if (dailyRes.isDailyDrawdownBreached) {
    return {
      decisionState: 'STOP',
      maxPermissiblePlannedLoss: 0,
      recommendedRiskBudget: 0,
      proposedRisk,
      positionSize: lotSize,
      dailyLossCapacityRemaining: 0,
      overallLossCapacityRemaining: overallRes.remainingOverallDrawdown,
      personalLimitsRemaining: 0,
      safetyBuffer: config.safetyBufferPercent || 20,
      exactReason: `Account has breached today's daily drawdown limit (${formatCurrency(dailyRes.dailyDrawdownLimitDollars, currency)}).`,
      missingOrStaleInputs: [],
      nextAction: 'Stop trading for the day. Wait for the provider midnight reset to resume trading.',
      ruleProfileVersion,
      assessmentTimestamp: Date.now(),
      isManuallyReported,
      symbol: input.symbol,
      direction: input.direction,
      entryPrice,
      stopLossPrice,
      stopDistancePips,
      stopDistancePrice,
      lotSize: 0,
      pipValuePerLot: spec.pipValuePerStandardLot,
      potentialProfitDollars,
      riskRewardRatio,
      isAllowed: false,
      warnings: ['Daily drawdown breached.'],
    };
  }

  if (overallRes.isOverallDrawdownBreached) {
    return {
      decisionState: 'STOP',
      maxPermissiblePlannedLoss: 0,
      recommendedRiskBudget: 0,
      proposedRisk,
      positionSize: lotSize,
      dailyLossCapacityRemaining: 0,
      overallLossCapacityRemaining: 0,
      personalLimitsRemaining: 0,
      safetyBuffer: config.safetyBufferPercent || 20,
      exactReason: `Account has reached or breached the maximum overall loss boundary (${formatCurrency(overallRes.overallBreachFloor, currency)}).`,
      missingOrStaleInputs: [],
      nextAction: 'Trading halted. Account eligibility has ended per firm liquidation boundary.',
      ruleProfileVersion,
      assessmentTimestamp: Date.now(),
      isManuallyReported,
      symbol: input.symbol,
      direction: input.direction,
      entryPrice,
      stopLossPrice,
      stopDistancePips,
      stopDistancePrice,
      lotSize: 0,
      pipValuePerLot: spec.pipValuePerStandardLot,
      potentialProfitDollars,
      riskRewardRatio,
      isAllowed: false,
      warnings: ['Maximum overall drawdown breached.'],
    };
  }

  const todayStr = getKarachiDate();
  const tradesTodayCount = trades.filter((t) => t.date === todayStr).length;
  if (tradesTodayCount >= safeNumber(account.maxDailyTrades, 2)) {
    return {
      decisionState: 'STOP',
      maxPermissiblePlannedLoss: hardCeiling,
      recommendedRiskBudget: 0,
      proposedRisk,
      positionSize: lotSize,
      dailyLossCapacityRemaining: dailyRes.remainingDailyDrawdown,
      overallLossCapacityRemaining: overallRes.remainingOverallDrawdown,
      personalLimitsRemaining: 0,
      safetyBuffer: config.safetyBufferPercent || 20,
      exactReason: `Daily trade limit reached: ${tradesTodayCount} of ${account.maxDailyTrades} permitted trades logged today.`,
      missingOrStaleInputs: [],
      nextAction: 'Wait for next trading day to preserve psychological capital and discipline.',
      ruleProfileVersion,
      assessmentTimestamp: Date.now(),
      isManuallyReported,
      symbol: input.symbol,
      direction: input.direction,
      entryPrice,
      stopLossPrice,
      stopDistancePips,
      stopDistancePrice,
      lotSize: 0,
      pipValuePerLot: spec.pipValuePerStandardLot,
      potentialProfitDollars,
      riskRewardRatio,
      isAllowed: false,
      warnings: ['Daily trade limit reached.'],
    };
  }

  if (dailyRemainingAfterTrade < 0 || overallRemainingAfterTrade < 0 || proposedRisk > hardCeiling) {
    return {
      decisionState: 'STOP',
      maxPermissiblePlannedLoss: hardCeiling,
      recommendedRiskBudget,
      proposedRisk,
      positionSize: lotSize,
      dailyLossCapacityRemaining: dailyRes.remainingDailyDrawdown,
      overallLossCapacityRemaining: overallRes.remainingOverallDrawdown,
      personalLimitsRemaining: Math.max(0, hardCeiling - proposedRisk),
      safetyBuffer: config.safetyBufferPercent || 20,
      exactReason: `Proposed risk of ${formatCurrency(proposedRisk, currency)} exceeds maximum allowable boundary. If stopped out, this trade would trigger a hard breach.`,
      missingOrStaleInputs: [],
      nextAction: 'Do not place this trade. Reduce position size significantly or cancel trade.',
      ruleProfileVersion,
      assessmentTimestamp: Date.now(),
      isManuallyReported,
      symbol: input.symbol,
      direction: input.direction,
      entryPrice,
      stopLossPrice,
      stopDistancePips,
      stopDistancePrice,
      lotSize,
      pipValuePerLot: spec.pipValuePerStandardLot,
      potentialProfitDollars,
      riskRewardRatio,
      isAllowed: false,
      warnings: ['Trade risks breaching account limits.'],
    };
  }

  // STATE B: REDUCE
  // Trade fits within hard boundaries, but exceeds Prime Pip FX recommended risk budget
  if (proposedRisk > recommendedRiskBudget * 1.05 && recommendedRiskBudget > 0) {
    const downsizedLotCalc = calculateLotSize(input.symbol, entryPrice, stopLossPrice, recommendedRiskBudget, currency);
    const downsizedLots = downsizedLotCalc.lotSize;

    return {
      decisionState: 'REDUCE',
      maxPermissiblePlannedLoss: hardCeiling,
      recommendedRiskBudget,
      proposedRisk,
      positionSize: lotSize,
      dailyLossCapacityRemaining: dailyRes.remainingDailyDrawdown,
      overallLossCapacityRemaining: overallRes.remainingOverallDrawdown,
      personalLimitsRemaining: Math.max(0, recommendedRiskBudget),
      safetyBuffer: config.safetyBufferPercent || 20,
      exactReason: `Proposed risk (${formatCurrency(proposedRisk, currency)}) exceeds Prime Pip FX safe risk budget of ${formatCurrency(recommendedRiskBudget, currency)} (${riskRes.limitingFactor}).`,
      missingOrStaleInputs: [],
      nextAction: `Reduce position size to ${downsizedLots} lots to align with recommended risk budget of ${formatCurrency(recommendedRiskBudget, currency)}.`,
      ruleProfileVersion,
      assessmentTimestamp: Date.now(),
      isManuallyReported,
      symbol: input.symbol,
      direction: input.direction,
      entryPrice,
      stopLossPrice,
      stopDistancePips,
      stopDistancePrice,
      lotSize: downsizedLots,
      pipValuePerLot: spec.pipValuePerStandardLot,
      potentialProfitDollars,
      riskRewardRatio,
      isAllowed: true,
      warnings: [`Downsize from ${lotSize} to ${downsizedLots} lots to comply with risk guidelines.`],
    };
  }

  // STATE C: TAKE
  // Proposed trade complies with all rules, buffers, and sizing guidelines
  return {
    decisionState: 'TAKE',
    maxPermissiblePlannedLoss: hardCeiling,
    recommendedRiskBudget,
    proposedRisk,
    positionSize: lotSize,
    dailyLossCapacityRemaining: dailyRes.remainingDailyDrawdown,
    overallLossCapacityRemaining: overallRes.remainingOverallDrawdown,
    personalLimitsRemaining: Math.max(0, dailyRes.remainingDailyDrawdown - proposedRisk),
    safetyBuffer: config.safetyBufferPercent || 20,
    exactReason: `Trade fully complies with ${config.firmName} rules and personal risk guidelines. Risk of ${formatCurrency(proposedRisk, currency)} leaves healthy drawdown buffer.`,
    missingOrStaleInputs: [],
    nextAction: 'Execute trade with discipline according to plan.',
    ruleProfileVersion,
    assessmentTimestamp: Date.now(),
    isManuallyReported,
    symbol: input.symbol,
    direction: input.direction,
    entryPrice,
    stopLossPrice,
    stopDistancePips,
    stopDistancePrice,
    lotSize,
    pipValuePerLot: spec.pipValuePerStandardLot,
    potentialProfitDollars,
    riskRewardRatio,
    isAllowed: true,
    warnings: [],
  };
}

// ----------------------------------------------------------------------------
// 42. GOAL SETTING & TARGET SCENARIO PLANNER
// ----------------------------------------------------------------------------

export function calculateGoalScenarios(
  account: AccountSettings,
  trades: Trade[] = [],
  customTargetDollars?: number,
  customDaysDeadline?: number
): GoalPlannerScenario {
  const currency = account.currency || 'USD';
  const config = getEffectiveFundedConfig(account);
  const startingBal = Math.max(1, safeNumber(account.initialBalance, config.startingBalance || 5000));
  const currentBal = Math.max(0, safeNumber(account.currentBalance, startingBal));
  const currentProfit = Number((currentBal - startingBal).toFixed(2));

  let targetDollars = safeNumber(customTargetDollars, 0);
  if (targetDollars <= 0) {
    if (account.accountCategory === 'FUNDED') {
      const phaseRes = calculatePhaseProgress(account, trades, config);
      targetDollars = phaseRes.activeProfitTargetDollars;
    } else {
      targetDollars = Math.round(startingBal * 0.1); // Default 10% milestone
    }
  }

  const remainingTarget = Number(Math.max(0, targetDollars - currentProfit).toFixed(2));
  const progressPercent = targetDollars > 0 ? Number(Math.min(100, Math.max(0, (currentProfit / targetDollars) * 100)).toFixed(1)) : 0;

  const dailyRes = calculateDailyDrawdown(account, trades, config);
  const trailingRes = calculateTrailingDrawdown(account, trades, config);
  const overallRes = calculateOverallDrawdown(account, trades, config, trailingRes.activeLiquidationThreshold);
  const drawdownCapacityRemaining = Math.min(dailyRes.remainingDailyDrawdown, overallRes.remainingOverallDrawdown);

  const baseRiskDollars = Math.max(10, Math.round(startingBal * 0.005)); // 0.5% standard

  // Helper to project completion
  const projectScenario = (winRate: number, riskReward: number, riskDollars: number): GoalScenarioMetrics => {
    // Expected Value per trade: (WinRate * RR * Risk) - ((1 - WinRate) * 1 * Risk)
    const winProfit = winRate * (riskReward * riskDollars);
    const lossCost = (1 - winRate) * riskDollars;
    const expectedValue = winProfit - lossCost;

    if (expectedValue <= 0 || remainingTarget <= 0) {
      return {
        daysRequired: remainingTarget <= 0 ? 0 : 999,
        targetDate: remainingTarget <= 0 ? 'Goal Reached' : 'Indeterminate (Negative EV)',
        winRate: Number((winRate * 100).toFixed(0)),
        riskReward,
        riskPerTradePercent: Number(((riskDollars / startingBal) * 100).toFixed(2)),
        expectedTradesCount: 0,
        assumptions: 'Negative expected return under selected parameters.',
      };
    }

    const expectedTrades = Math.max(1, Math.ceil(remainingTarget / expectedValue));
    const tradesPerDay = 1.5;
    const daysRequired = Math.ceil(expectedTrades / tradesPerDay);

    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysRequired * 1.4)); // Skip weekends roughly
    const targetDateStr = projectedDate.toISOString().slice(0, 10);

    return {
      daysRequired,
      targetDate: targetDateStr,
      winRate: Number((winRate * 100).toFixed(0)),
      riskReward,
      riskPerTradePercent: Number(((riskDollars / startingBal) * 100).toFixed(2)),
      expectedTradesCount: expectedTrades,
      assumptions: `Assumes ~${tradesPerDay} trades/day, ${Number((winRate * 100).toFixed(0))}% win rate at 1:${riskReward} R:R, risking $${riskDollars} (${Number(((riskDollars / startingBal) * 100).toFixed(2))}%) per trade. Trading costs excluded.`,
    };
  };

  const conservative = projectScenario(0.45, 1.5, baseRiskDollars * 0.7);
  const baseline = projectScenario(0.50, 2.0, baseRiskDollars);
  const optimistic = projectScenario(0.58, 2.5, baseRiskDollars * 1.5);

  // CONFLICT DETECTION
  let hasConflict = false;
  let conflictExplanation: string | undefined;
  const suggestedAlternatives: string[] = [];

  if (typeof customDaysDeadline === 'number' && customDaysDeadline > 0 && remainingTarget > 0) {
    if (customDaysDeadline < baseline.daysRequired * 0.5) {
      hasConflict = true;
      conflictExplanation = `Target deadline of ${customDaysDeadline} trading days requires aggressive risk that conflicts with your 0.5% risk limit and daily drawdown buffer (${formatCurrency(dailyRes.remainingDailyDrawdown, currency)}).`;
      suggestedAlternatives.push('Extend the target timeline to allow statistical edge to play out without forcing setups.');
      suggestedAlternatives.push('Focus on process consistency and execution quality over arbitrary completion deadlines.');
      suggestedAlternatives.push('Prioritize preserving account eligibility over rapid phase passage.');
    }
  }

  return {
    startingBalance: startingBal,
    currentBalance: currentBal,
    profitTargetDollars: targetDollars,
    remainingTargetDollars: remainingTarget,
    drawdownCapacityRemaining,
    progressPercent,
    conservative,
    baseline,
    optimistic,
    hasConflict,
    conflictExplanation,
    suggestedAlternatives,
  };
}

// ----------------------------------------------------------------------------
// 43. AUTOMATIC POST-TRADE IMPACT CALCULATOR
// ----------------------------------------------------------------------------

export function calculatePostTradeImpact(
  trade: Trade,
  account: AccountSettings,
  existingTrades: Trade[]
): PostTradeImpactSummary {
  const currency = account.currency || 'USD';
  const config = getEffectiveFundedConfig(account);
  const startingBal = Math.max(1, safeNumber(account.initialBalance, config.startingBalance || 5000));
  const pnl = safeNumber(trade.profitLoss, 0);

  const prevBal = safeNumber(account.currentBalance, startingBal);
  const prevEq = safeNumber(account.currentEquity, prevBal);
  const updatedBal = Number((prevBal + pnl).toFixed(2));
  const updatedEq = Number((prevEq + pnl).toFixed(2));

  // Temp account state to measure after-trade capacity
  const afterAcc: AccountSettings = {
    ...account,
    currentBalance: updatedBal,
    currentEquity: updatedEq,
  };

  const allTrades = [trade, ...existingTrades.filter((t) => t.id !== trade.id)];
  const dailyBefore = calculateDailyDrawdown(account, existingTrades, config);
  const dailyAfter = calculateDailyDrawdown(afterAcc, allTrades, config);

  const trailingAfter = calculateTrailingDrawdown(afterAcc, allTrades, config);
  const overallAfter = calculateOverallDrawdown(afterAcc, allTrades, config, trailingAfter.activeLiquidationThreshold);

  const overallBefore = calculateOverallDrawdown(
    account,
    existingTrades,
    config,
    calculateTrailingDrawdown(account, existingTrades, config).activeLiquidationThreshold
  );

  const phaseAfter = calculatePhaseProgress(afterAcc, allTrades, config);

  const isBreached = dailyAfter.isDailyDrawdownBreached || overallAfter.isOverallDrawdownBreached;
  const isApproachingLimit = dailyAfter.dailyDrawdownUsedPercent >= 75 || overallAfter.overallDrawdownUsedPercent >= 75;

  // 1. Risk limit analysis
  const maxAllowedRiskPct = account.maxRiskPerTradePercent || config.maxRiskPerTradePercent || 1.0;
  const plannedRiskAmount = trade.riskAmount || trade.riskDollars || (trade.entryPrice && trade.stopLoss && trade.lotSize ? Math.abs(trade.entryPrice - trade.stopLoss) * trade.lotSize * 100 : 0);
  const tradeRiskPct = startingBal > 0 ? (plannedRiskAmount / startingBal) * 100 : 0;
  const isRiskLimitCompliant = plannedRiskAmount > 0 ? tradeRiskPct <= (maxAllowedRiskPct * 1.05) : true;
  const hasStopLoss = typeof trade.stopLoss === 'number' && trade.stopLoss > 0;

  // 2. Rules compliance check
  const complianceIssues: string[] = [];
  if (!hasStopLoss) {
    complianceIssues.push('Trade executed without a predefined stop-loss.');
  }
  if (!isRiskLimitCompliant) {
    complianceIssues.push(`Planned risk of ${tradeRiskPct.toFixed(1)}% exceeded configured limit of ${maxAllowedRiskPct}%.`);
  }
  if (config.newsRestriction && trade.notes?.toLowerCase().includes('news')) {
    complianceIssues.push('Trade tagged during restricted high-impact news window.');
  }
  if (dailyAfter.isDailyDrawdownBreached) {
    complianceIssues.push('Daily drawdown limit breached.');
  }
  if (overallAfter.isOverallDrawdownBreached) {
    complianceIssues.push('Maximum overall drawdown limit breached.');
  }
  const isCompliantWithRules = complianceIssues.length === 0;

  // 6. Minimum trading days check
  const distinctDays = new Set(
    allTrades.filter((t) => t.status !== 'OPEN' && t.date).map((t) => t.date)
  ).size;
  const requiredDays = config.minimumTradingDays || (account.rulesConfig?.minimumTradingDays) || 0;
  const areTradingDaysSatisfied = requiredDays <= 0 || distinctDays >= requiredDays;

  let decisionState: RiskDecisionState = 'TAKE';
  let recommendedNextAction = 'Continue trading within your standard risk budget on verified setups.';
  let explanation = '';

  // Construct structured trade review answers
  let tradeStatusLabel = 'Within configured risk limits';
  if (isBreached) {
    tradeStatusLabel = 'Rule Breach Detected';
  } else if (!isCompliantWithRules) {
    tradeStatusLabel = 'Attention Required: Rule Non-Compliance';
  } else if (isApproachingLimit) {
    tradeStatusLabel = 'Caution: Approaching Drawdown Boundary';
  }

  let whatWentWell = '';
  if (hasStopLoss && isRiskLimitCompliant) {
    whatWentWell = `The trade stayed within the configured ${maxAllowedRiskPct}% risk allowance and included an active stop-loss at ${trade.stopLoss}.`;
  } else if (hasStopLoss) {
    whatWentWell = 'The trade maintained an explicit stop-loss order to protect capital from runaway market slippage.';
  } else if (pnl > 0) {
    whatWentWell = 'Trade captured profit toward the phase target, but discipline requires attaching a stop-loss on future entries.';
  } else {
    whatWentWell = 'Trade was logged to the journal for audit and performance review.';
  }

  const accountImpactText = `Verified P/L: ${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, currency)}. Updated Equity: ${formatCurrency(updatedEq, currency)}. Remaining Daily Loss: ${formatCurrency(dailyAfter.remainingDailyDrawdown, currency)}. Remaining Overall Drawdown: ${formatCurrency(overallAfter.remainingOverallDrawdown, currency)}.`;

  let whatNeedsAttention = '';
  if (isBreached) {
    whatNeedsAttention = 'DRAWDOWN LIMIT REACHED: Account has reached its permissible drawdown limit. Cease trading immediately to prevent permanent disqualification.';
  } else if (complianceIssues.length > 0) {
    whatNeedsAttention = complianceIssues.join(' ');
  } else if (isApproachingLimit) {
    whatNeedsAttention = `Daily drawdown capacity is ${dailyAfter.dailyDrawdownUsedPercent}% consumed. Only ${formatCurrency(dailyAfter.remainingDailyDrawdown, currency)} remaining today.`;
  } else if (!areTradingDaysSatisfied) {
    whatNeedsAttention = `${distinctDays} of ${requiredDays} qualifying trading days completed. ${requiredDays - distinctDays} days remaining before phase evaluation can pass.`;
  } else {
    whatNeedsAttention = 'All risk parameters currently in optimal health. No compliance issues detected.';
  }

  let recommendedNextStepText = '';
  if (isBreached) {
    decisionState = 'STOP';
    recommendedNextAction = 'Trading halted: Drawdown limit has been reached.';
    recommendedNextStepText = 'Trading halted: Review the trade log with your prop firm dashboard. Do not enter further positions.';
    explanation = `This trade triggered a drawdown breach. Account daily remaining is ${formatCurrency(dailyAfter.remainingDailyDrawdown, currency)} and overall remaining is ${formatCurrency(overallAfter.remainingOverallDrawdown, currency)}.`;
  } else if (isApproachingLimit) {
    decisionState = 'REDUCE';
    recommendedNextAction = 'Reduce risk on next trade or halt trading for the remainder of today.';
    recommendedNextStepText = 'Reduce risk on subsequent trades to preserve remaining daily drawdown room. Wait for high-conviction setups only.';
    explanation = `Today's drawdown buffer is ${dailyAfter.dailyDrawdownUsedPercent}% consumed (${formatCurrency(dailyAfter.remainingDailyDrawdown, currency)} left). Capital preservation protocol recommends reducing risk.`;
  } else if (phaseAfter.isTargetPassed && areTradingDaysSatisfied) {
    decisionState = 'STOP';
    recommendedNextAction = 'Target Passed! Stop trading and request phase verification.';
    recommendedNextStepText = 'Phase target reached and minimum trading days met! Stop trading and contact your prop firm for official evaluation verification.';
    explanation = `Profit target of ${formatCurrency(config.profitTargets.phase1TargetDollars, currency)} passed with all qualifying days satisfied. Protect the account.`;
  } else if (phaseAfter.isTargetPassed && !areTradingDaysSatisfied) {
    decisionState = 'TAKE';
    recommendedNextAction = 'Target reached! Fulfill remaining days with minimal lot size.';
    recommendedNextStepText = `Profit target reached! You still need ${requiredDays - distinctDays} more qualifying trading days. Use minimum risk (0.01 lot) to protect profits while fulfilling the days requirement.`;
    explanation = `Target achieved, but ${distinctDays}/${requiredDays} trading days completed. Do not risk accumulated profits.`;
  } else if (pnl < 0) {
    decisionState = 'TAKE';
    recommendedNextAction = 'Maintain standard risk sizing. Do not revenge trade.';
    recommendedNextStepText = 'Maintain strict discipline. Do not attempt to recover losses in a hurry; wait for high-probability setups.';
    explanation = `Loss of ${formatCurrency(Math.abs(pnl), currency)} leaves ${formatCurrency(dailyAfter.remainingDailyDrawdown, currency)} daily room. Follow your trading plan.`;
  } else {
    decisionState = 'TAKE';
    recommendedNextAction = 'Keep risk steady at calibrated baseline. Avoid overconfidence.';
    recommendedNextStepText = `Steady progress: ${formatCurrency(phaseAfter.remainingProfitTarget, currency)} remaining to reach target. Keep lot sizing consistent.`;
    explanation = `Trade closed in profit (+${formatCurrency(pnl, currency)}). Keep sizing consistent; never inflate risk after wins.`;
  }

  // Calculate updated personal risk budget for next trade
  const nextRisk = calculateRecommendedRisk(
    afterAcc,
    allTrades,
    config,
    dailyAfter.remainingDailyDrawdown,
    overallAfter.remainingOverallDrawdown,
    pnl < 0 ? 1 : 0,
    phaseAfter.isTargetPassed,
    phaseAfter.profitProgressPercent,
    phaseAfter.remainingProfitTarget
  );

  return {
    tradeId: trade.id,
    tradeResult: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
    netProfitLoss: pnl,
    previousBalance: prevBal,
    updatedBalance: updatedBal,
    previousEquity: prevEq,
    updatedEquity: updatedEq,
    previousDailyDdCapacity: dailyBefore.remainingDailyDrawdown,
    updatedDailyDdCapacity: dailyAfter.remainingDailyDrawdown,
    previousOverallDdCapacity: overallBefore.remainingOverallDrawdown,
    updatedOverallDdCapacity: overallAfter.remainingOverallDrawdown,
    targetProgressPercent: phaseAfter.profitProgressPercent,
    remainingProfitTarget: phaseAfter.remainingProfitTarget,
    updatedPersonalRiskBudget: nextRisk.recommendedRiskDollars,
    decisionState,
    recommendedNextAction,
    explanation,
    isApproachingLimit,
    isBreached,
    isManuallyReported: account.isManual !== false,
    tradeStatusLabel,
    whatWentWell,
    accountImpactText,
    whatNeedsAttention,
    recommendedNextStepText,
    eightPointAudit: {
      isWithinRiskLimits: isRiskLimitCompliant,
      isCompliantWithRules,
      balanceChange: pnl,
      equityChange: pnl,
      remainingDailyLoss: dailyAfter.remainingDailyDrawdown,
      remainingOverallLoss: overallAfter.remainingOverallDrawdown,
      remainingProfitTarget: phaseAfter.remainingProfitTarget,
      tradingDaysCompleted: distinctDays,
      tradingDaysRequired: requiredDays,
      areTradingDaysSatisfied,
      complianceIssues,
      whatToDoNext: recommendedNextStepText,
    },
  };
}

// ----------------------------------------------------------------------------
// 44. DEMO ACCOUNT RESET HELPER
// ----------------------------------------------------------------------------

export function resetDemoAccountState(account: AccountSettings): AccountSettings {
  const start = Math.max(100, safeNumber(account.initialBalance, 5000));
  return {
    ...account,
    currentBalance: start,
    currentEquity: start,
    updatedAt: new Date().toISOString(),
  };
}

