import {
  AccountSettings,
  FundedAccountConfig,
  FundedDrawdownType,
  FundedPhase,
  FundedRiskMode,
  Trade,
} from '../types';
import { getKarachiDate, getKarachiEpoch } from './time';
import { formatCurrency, safeNumber } from './currencyFormatter';

export interface PropFirmPreset {
  id: string;
  name: string;
  firmName: string;
  description: string;
  phase1TargetPct: number;
  phase2TargetPct: number;
  dailyDrawdownPct: number;
  overallDrawdownPct: number;
  drawdownType: FundedDrawdownType;
  trailingBasis: 'BALANCE' | 'EQUITY' | 'END_OF_DAY_BALANCE';
  unrealizedProfitAffectsTrailing: boolean;
  lockAtStartingBalance: boolean;
}

export const PROP_FIRM_PRESETS: PropFirmPreset[] = [
  {
    id: 'my_prop_firm_standard',
    name: 'My Prop Firm (Prompt Standard)',
    firmName: 'My Prop Firm',
    description: '10% Phase 1 ($500 on $5K), 5% Phase 2 ($250 on $5K), 4% Daily DD ($200), 10% Max DD ($500)',
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
  },
  {
    id: 'ftmo_standard',
    name: 'FTMO 2-Step Evaluation',
    firmName: 'FTMO',
    description: '10% Phase 1, 5% Phase 2, 5% Equity Daily DD, 10% Static Max DD',
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    overallDrawdownPct: 10,
    drawdownType: 'STATIC',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
  },
  {
    id: 'fundednext_stellar',
    name: 'FundedNext Stellar',
    firmName: 'FundedNext',
    description: '8% Phase 1, 5% Phase 2, 5% Balance Daily DD, 10% Overall DD',
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    overallDrawdownPct: 10,
    drawdownType: 'BALANCE_BASED',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
  },
  {
    id: 'eod_trailing_prop',
    name: 'Trailing EOD Prop Firm',
    firmName: 'Topstep / EOD Prop',
    description: '8% Target, 4% Daily DD, 8% End-of-Day Trailing DD (Locks at Starting Balance)',
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 4,
    overallDrawdownPct: 8,
    drawdownType: 'TRAILING',
    trailingBasis: 'END_OF_DAY_BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
  },
  {
    id: 'intraday_equity_trailing',
    name: 'High-Water Intraday Trailing',
    firmName: 'Apex / Maven Trailing',
    description: '8% Target, 3% Daily DD, 6% Live Equity Trailing DD (Unrealized P&L Trails)',
    phase1TargetPct: 8,
    phase2TargetPct: 4,
    dailyDrawdownPct: 3,
    overallDrawdownPct: 6,
    drawdownType: 'TRAILING',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: true,
    lockAtStartingBalance: true,
  },
  {
    id: 'the5ers_high_stakes',
    name: 'The5ers High Stakes',
    firmName: 'The5ers',
    description: '8% Phase 1, 5% Phase 2, 5% Daily DD, 10% Max Overall DD',
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
  },
];

export function createDefaultFundedConfig(
  startingBalance = 5000,
  firmName = 'My Prop Firm',
  phase: FundedPhase = 'PHASE_1'
): FundedAccountConfig {
  const safeStart = Math.max(100, safeNumber(startingBalance, 5000));
  const phase1TargetPct = 10;
  const phase2TargetPct = 5;
  const dailyDdPct = 4; // $200 on $5,000
  const overallDdPct = 10; // $500 on $5,000

  return {
    enabled: true,
    firmName: firmName || 'My Prop Firm',
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
      trailingBasis: 'BALANCE',
      activationLevelProfitDollars: 0,
      unrealizedProfitAffectsTrailing: false,
      lockAtStartingBalance: true,
      customLockBalanceLevel: null,
      manualHighWaterMark: null,
    },
    preferredRiskPercent: 1.0,
    maxRiskPerTradePercent: 1.0,
    riskMode: 'BALANCED',
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
      profitTargets: {
        ...createDefaultFundedConfig(startBal).profitTargets,
        ...(account.fundedConfig.profitTargets || {}),
      },
      trailingConfig: {
        ...createDefaultFundedConfig(startBal).trailingConfig,
        ...(account.fundedConfig.trailingConfig || {}),
      },
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

export interface FundedAccountRiskEvaluation {
  isFunded: boolean;
  config: FundedAccountConfig;

  // Section 4: Basic Information
  firmName: string;
  accountName: string;
  accountSize: number;
  currency: string;
  phase: FundedPhase;
  phaseLabel: string;
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;

  // Section 5: Profit Target Configuration & Progress
  activeProfitTargetDollars: number;
  activeProfitTargetPercent: number;
  currentProfitLoss: number;
  remainingProfitTarget: number;
  profitProgressPercent: number;
  amountRequiredToPass: number;
  passingBalanceTarget: number;
  isTargetPassed: boolean;

  // Section 6 & 7: Drawdown Configuration & Trailing Support
  drawdownType: FundedDrawdownType;
  drawdownTypeLabel: string;
  isTrailing: boolean;
  initialLiquidationThreshold: number;
  highWaterMark: number;
  activeLiquidationThreshold: number;
  trailingFloorMovedDollars: number;
  isTrailingLocked: boolean;
  trailingExplanation: string;

  // Section 8: Daily Drawdown Tracking
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

  // Section 9: Overall Drawdown Tracking
  overallDrawdownLimitDollars: number;
  overallDrawdownLimitPercent: number;
  overallBreachFloor: number;
  currentOverallDrawdown: number;
  remainingOverallDrawdown: number;
  overallDrawdownUsedPercent: number;
  overallDrawdownAccountPercent: number;
  isOverallDrawdownBreached: boolean;

  // Section 10 & 11: Next Trade Risk Engine & Decision Logic
  riskMode: FundedRiskMode;
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
  nextTradeRiskQuestionAnswer: string;
  shouldTakeTradeQuestionAnswer: string;
  reasons: string[];

  // Trade Streak & Survival Analytics
  tradesToday: number;
  maxDailyTrades: number;
  consecutiveLosses: number;
  consecutiveWins: number;
  lastTradePnL: number | null;
  tradesToDailyBreachAtRecommended: number;
  tradesToOverallBreachAtRecommended: number;
  tradesToPassAt2R: number;
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

export function evaluateFundedAccountRisk(
  account: AccountSettings,
  trades: Trade[] = []
): FundedAccountRiskEvaluation {
  const config = getEffectiveFundedConfig(account);
  const fundedActive = isFundedAccount(account);
  const currency = account.currency || 'USD';

  const startingBalance = Math.max(
    1,
    safeNumber(config.startingBalance || account.initialBalance, 5000)
  );
  const accountSize = Math.max(1, safeNumber(config.accountSize || startingBalance, startingBalance));

  // Chronological closed & open trades
  const sortedTrades = [...(trades || [])].sort(
    (a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time)
  );
  const closedTrades = sortedTrades.filter((t) => t.status !== 'OPEN');
  const openTrades = sortedTrades.filter((t) => t.status === 'OPEN');

  const totalRealizedPnL = closedTrades.reduce((acc, t) => acc + safeNumber(t.profitLoss, 0), 0);
  const openTradesFloatingPnL = openTrades.reduce(
    (acc, t) => acc + safeNumber(t.floatingPnL ?? t.profitLoss, 0),
    0
  );
  const simulatedFloatingPnL = safeNumber(config.openFloatingPnL, 0);
  const todayUnrealizedPnL = openTradesFloatingPnL + simulatedFloatingPnL;

  // Current Balance & Equity
  const computedBalance =
    closedTrades.length > 0
      ? startingBalance + totalRealizedPnL
      : safeNumber(account.currentBalance, startingBalance);
  const currentBalance = Math.max(0, computedBalance);
  const currentEquity = Math.max(0, currentBalance + todayUnrealizedPnL);

  // Today's trades & Today's Starting Balance/Equity
  const todayDateStr = getKarachiDate();
  const todayClosedTrades = closedTrades.filter((t) => t.date === todayDateStr);
  const todayRealizedPnL = todayClosedTrades.reduce(
    (acc, t) => acc + safeNumber(t.profitLoss, 0),
    0
  );

  const derivedTodayStartBalance = currentBalance - todayRealizedPnL;
  const todayStartingBalance =
    config.todayStartingBalanceOverride && config.todayStartingBalanceOverride > 0
      ? config.todayStartingBalanceOverride
      : derivedTodayStartBalance;
  const todayStartingEquity =
    config.todayStartingEquityOverride && config.todayStartingEquityOverride > 0
      ? config.todayStartingEquityOverride
      : todayStartingBalance;

  // Section 5: Profit Target Calculations
  let activeProfitTargetDollars = config.profitTargets.phase1TargetDollars;
  if (config.phase === 'PHASE_2') {
    activeProfitTargetDollars = config.profitTargets.phase2TargetDollars;
  } else if (config.phase === 'PHASE_3') {
    activeProfitTargetDollars =
      config.profitTargets.phase3TargetDollars ?? config.profitTargets.phase2TargetDollars;
  } else if (config.phase === 'FUNDED_LIVE' || config.phase === 'INSTANT_FUNDED') {
    activeProfitTargetDollars =
      config.profitTargets.fundedMilestoneTargetDollars ??
      config.profitTargets.phase1TargetDollars;
  }
  activeProfitTargetDollars = Math.max(0, safeNumber(activeProfitTargetDollars, startingBalance * 0.1));
  const activeProfitTargetPercent =
    startingBalance > 0
      ? Number(((activeProfitTargetDollars / startingBalance) * 100).toFixed(2))
      : 10;

  const currentProfitLoss = Number((currentBalance - startingBalance).toFixed(2));
  const remainingProfitTarget =
    activeProfitTargetDollars > 0
      ? Number(Math.max(0, activeProfitTargetDollars - currentProfitLoss).toFixed(2))
      : 0;
  const profitProgressPercent =
    activeProfitTargetDollars > 0
      ? Number(
          Math.min(100, Math.max(0, (currentProfitLoss / activeProfitTargetDollars) * 100)).toFixed(
            1
          )
        )
      : 0;
  const passingBalanceTarget = Number((startingBalance + activeProfitTargetDollars).toFixed(2));
  const amountRequiredToPass = Number(Math.max(0, passingBalanceTarget - currentBalance).toFixed(2));
  const isTargetPassed =
    activeProfitTargetDollars > 0 && currentProfitLoss >= activeProfitTargetDollars;

  // Section 6 & 7: Overall & Trailing Drawdown Calculations
  const overallDrawdownLimitDollars = Math.max(
    1,
    safeNumber(config.overallDrawdownDollars, startingBalance * 0.1)
  );
  const overallDrawdownLimitPercent =
    startingBalance > 0
      ? Number(((overallDrawdownLimitDollars / startingBalance) * 100).toFixed(2))
      : config.overallDrawdownPercent;

  const initialLiquidationThreshold = Number(
    (startingBalance - overallDrawdownLimitDollars).toFixed(2)
  );

  // Compute historical High-Water Mark from trade progression
  let runningBal = startingBalance;
  let peakRealizedBalance = startingBalance;
  const eodBalancesByDate: Record<string, number> = {};

  for (const t of closedTrades) {
    runningBal += safeNumber(t.profitLoss, 0);
    if (runningBal > peakRealizedBalance) {
      peakRealizedBalance = runningBal;
    }
    eodBalancesByDate[t.date] = runningBal;
  }
  if (currentBalance > peakRealizedBalance) {
    peakRealizedBalance = currentBalance;
  }

  let peakEodBalance = startingBalance;
  for (const [d, bal] of Object.entries(eodBalancesByDate)) {
    if (d !== todayDateStr && bal > peakEodBalance) {
      peakEodBalance = bal;
    }
  }
  if (todayStartingBalance > peakEodBalance) {
    peakEodBalance = todayStartingBalance;
  }

  const tc = config.trailingConfig;
  let rawHighWaterMark = peakRealizedBalance;
  if (tc.trailingBasis === 'END_OF_DAY_BALANCE') {
    rawHighWaterMark = peakEodBalance;
  } else if (tc.trailingBasis === 'EQUITY' || tc.unrealizedProfitAffectsTrailing) {
    rawHighWaterMark = Math.max(peakRealizedBalance, currentEquity);
  }
  if (tc.manualHighWaterMark && tc.manualHighWaterMark > rawHighWaterMark) {
    rawHighWaterMark = tc.manualHighWaterMark;
  }

  const highWaterMark = Number(Math.max(startingBalance, rawHighWaterMark).toFixed(2));
  const isTrailing =
    config.drawdownType === 'TRAILING' || config.drawdownType === 'INTRADAY' || config.drawdownType === 'END_OF_DAY';

  let activeLiquidationThreshold = initialLiquidationThreshold;
  let isTrailingLocked = false;

  if (isTrailing) {
    const hwmGain = Math.max(0, highWaterMark - startingBalance);
    const activationProfit = Math.max(0, safeNumber(tc.activationLevelProfitDollars, 0));

    if (hwmGain >= activationProfit) {
      let trailedFloor = highWaterMark - overallDrawdownLimitDollars;
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
      activeLiquidationThreshold = Number(
        Math.max(initialLiquidationThreshold, trailedFloor).toFixed(2)
      );
    }
  }

  const trailingFloorMovedDollars = Number(
    Math.max(0, activeLiquidationThreshold - initialLiquidationThreshold).toFixed(2)
  );

  const trailingExplanation = isTrailing
    ? `Trailing on ${
        tc.trailingBasis === 'EQUITY'
          ? 'Live Equity'
          : tc.trailingBasis === 'END_OF_DAY_BALANCE'
          ? 'End-of-Day Balance'
          : 'Closed Balance'
      } • High-Water Mark: ${formatCurrency(highWaterMark, currency)} • Active Floor: ${formatCurrency(
        activeLiquidationThreshold,
        currency
      )}${isTrailingLocked ? ' (LOCKED AT PROFIT PROTECTION LEVEL)' : ''}`
    : `Static Floor fixed at ${formatCurrency(initialLiquidationThreshold, currency)} (${formatCurrency(
        overallDrawdownLimitDollars,
        currency
      )} below ${formatCurrency(startingBalance, currency)})`;

  // Section 8: Daily Drawdown Calculations
  const dailyDrawdownLimitDollars = Math.max(
    1,
    safeNumber(config.dailyDrawdownDollars, startingBalance * 0.04)
  );
  const dailyDrawdownLimitPercent =
    startingBalance > 0
      ? Number(((dailyDrawdownLimitDollars / startingBalance) * 100).toFixed(2))
      : config.dailyDrawdownPercent;

  // Reference baseline for today's daily drawdown (most firms use higher of Today's Starting Balance or Starting Equity)
  const dailyReferenceBase =
    config.drawdownType === 'BALANCE_BASED'
      ? todayStartingBalance
      : Math.max(todayStartingBalance, todayStartingEquity);

  const dailyBreachFloor = Number((dailyReferenceBase - dailyDrawdownLimitDollars).toFixed(2));

  // Effective current value checked against daily breach floor
  const effectiveCurrentForDaily =
    config.drawdownType === 'BALANCE_BASED'
      ? currentBalance
      : Math.min(currentBalance, currentEquity);

  const remainingDailyDrawdown = Number(
    Math.max(0, effectiveCurrentForDaily - dailyBreachFloor).toFixed(2)
  );
  const currentDailyDrawdown = Number(
    Math.max(0, dailyDrawdownLimitDollars - remainingDailyDrawdown).toFixed(2)
  );
  const dailyDrawdownUsedPercent = Number(
    Math.min(100, (currentDailyDrawdown / dailyDrawdownLimitDollars) * 100).toFixed(1)
  );
  const dailyDrawdownAccountPercent =
    dailyReferenceBase > 0
      ? Number(((currentDailyDrawdown / dailyReferenceBase) * 100).toFixed(2))
      : 0;
  const isDailyDrawdownBreached = remainingDailyDrawdown <= 0;

  // Section 9: Overall Drawdown Calculations
  const overallBreachFloor = activeLiquidationThreshold;
  const effectiveCurrentForOverall =
    config.drawdownType === 'BALANCE_BASED'
      ? currentBalance
      : Math.min(currentBalance, currentEquity);

  const remainingOverallDrawdown = Number(
    Math.max(0, effectiveCurrentForOverall - overallBreachFloor).toFixed(2)
  );
  const currentOverallDrawdown = Number(
    Math.max(0, overallDrawdownLimitDollars - remainingOverallDrawdown).toFixed(2)
  );
  const overallDrawdownUsedPercent = Number(
    Math.min(100, (currentOverallDrawdown / overallDrawdownLimitDollars) * 100).toFixed(1)
  );
  const overallDrawdownAccountPercent =
    startingBalance > 0
      ? Number(((currentOverallDrawdown / startingBalance) * 100).toFixed(2))
      : 0;
  const isOverallDrawdownBreached = remainingOverallDrawdown <= 0;

  // Consecutive Wins / Losses & Today's Trade Count
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
  const lastTradePnL = reverseClosed.length > 0 ? safeNumber(reverseClosed[0].profitLoss, 0) : null;
  const tradesToday = sortedTrades.filter((t) => t.date === todayDateStr).length;
  const maxDailyTrades = Math.max(1, safeNumber(account.maxDailyTrades, 2));
  const maxConsecutiveLosses = Math.max(1, safeNumber(account.maxConsecutiveLosses, 3));

  // =========================================================================
  // SECTION 10 & 11: NEXT TRADE RISK ENGINE (RECOMMENDATION & DECISION LOGIC)
  // =========================================================================
  const riskMode: FundedRiskMode = config.riskMode || 'BALANCED';
  const maxRiskPerTradePercent = Math.max(
    0.1,
    safeNumber(config.maxRiskPerTradePercent || account.maxRiskPerTradePercent, 1.0)
  );
  const preferredRiskPercent = Math.min(
    maxRiskPerTradePercent,
    Math.max(0.1, safeNumber(config.preferredRiskPercent, 1.0))
  );

  const preferredRiskDollars = Number(((currentBalance * preferredRiskPercent) / 100).toFixed(2));
  const maxRiskPerTradeDollars = Number(
    ((currentBalance * maxRiskPerTradePercent) / 100).toFixed(2)
  );

  // Safety buffers so a single trade NEVER consumes the entire remaining drawdown
  // Leaving a mandatory execution cushion for slippage/spread and multi-trade survival
  const modeConfig = {
    CONSERVATIVE: {
      baseScale: 0.65, // e.g. 0.65% if preferred is 1%
      maxDailyDdFraction: 0.3, // Never risk > 30% of remaining daily DD on one trade
      maxOverallDdFraction: 0.2, // Never risk > 20% of remaining overall DD on one trade
      lossStreakMultiplier: [1.0, 0.7, 0.5, 0.35],
    },
    BALANCED: {
      baseScale: 1.0, // 100% of preferred risk when healthy
      maxDailyDdFraction: 0.45, // Never risk > 45% of remaining daily DD on one trade
      maxOverallDdFraction: 0.28, // Never risk > 28% of remaining overall DD on one trade
      lossStreakMultiplier: [1.0, 0.8, 0.55, 0.4],
    },
    AGGRESSIVE: {
      baseScale: 1.0,
      maxDailyDdFraction: 0.6, // Never risk > 60% of remaining daily DD on one trade
      maxOverallDdFraction: 0.35, // Never risk > 35% of remaining overall DD on one trade
      lossStreakMultiplier: [1.0, 0.9, 0.7, 0.5],
    },
  }[riskMode];

  // Hard ceiling that strictly respects the prop firm's remaining drawdowns (with 5% spread/slippage guard)
  const safeDailyCeiling = Math.max(0, remainingDailyDrawdown * 0.9);
  const safeOverallCeiling = Math.max(0, remainingOverallDrawdown * 0.9);
  const hardCeilingRiskDollars = Number(
    Math.min(maxRiskPerTradeDollars, safeDailyCeiling, safeOverallCeiling).toFixed(2)
  );

  const reasons: string[] = [];
  let candidateRiskDollars = preferredRiskDollars * modeConfig.baseScale;
  let limitingFactor =
    riskMode === 'CONSERVATIVE'
      ? 'Conservative Mode Base Sizing (65% of Preferred)'
      : 'Preferred Risk Plan';

  if (riskMode === 'CONSERVATIVE') {
    reasons.push(
      `Conservative Risk Mode active: Base risk scaled to ${(
        preferredRiskPercent * modeConfig.baseScale
      ).toFixed(2)}% (${formatCurrency(candidateRiskDollars, currency)}) for maximum prop firm longevity.`
    );
  }

  // 1. Consecutive Loss Scaling
  if (consecutiveLosses > 0) {
    const streakIdx = Math.min(consecutiveLosses, 3);
    const mult = modeConfig.lossStreakMultiplier[streakIdx];
    const scaledByStreak = candidateRiskDollars * mult;
    if (scaledByStreak < candidateRiskDollars) {
      candidateRiskDollars = scaledByStreak;
      limitingFactor = `Consecutive Loss Dampener (${consecutiveLosses} Loss${
        consecutiveLosses > 1 ? 'es' : ''
      })`;
      reasons.push(
        `Logged ${consecutiveLosses} consecutive loss${
          consecutiveLosses > 1 ? 'es' : ''
        }: Risk automatically dampened to ${(mult * 100).toFixed(0)}% of base allocation to prevent drawdown acceleration.`
      );
    }
  }

  // 2. Daily Drawdown Cushion Cap
  const dailyCushionCap = remainingDailyDrawdown * modeConfig.maxDailyDdFraction;
  if (dailyCushionCap < candidateRiskDollars) {
    candidateRiskDollars = dailyCushionCap;
    limitingFactor = `Remaining Daily Drawdown Cushion (${formatCurrency(
      remainingDailyDrawdown,
      currency
    )} left)`;
    reasons.push(
      `Daily drawdown is ${dailyDrawdownUsedPercent}% used (${formatCurrency(
        remainingDailyDrawdown,
        currency
      )} remaining). Risk capped at ${(modeConfig.maxDailyDdFraction * 100).toFixed(
        0
      )}% of remaining daily buffer so a single stop-out cannot breach today's limit.`
    );
  }

  // 3. Overall / Trailing Drawdown Cushion Cap
  const overallCushionCap = remainingOverallDrawdown * modeConfig.maxOverallDdFraction;
  if (overallCushionCap < candidateRiskDollars) {
    candidateRiskDollars = overallCushionCap;
    limitingFactor = `Remaining Overall Drawdown Cushion (${formatCurrency(
      remainingOverallDrawdown,
      currency
    )} left)`;
    reasons.push(
      `Overall drawdown is ${overallDrawdownUsedPercent}% used (${formatCurrency(
        remainingOverallDrawdown,
        currency
      )} above ${formatCurrency(overallBreachFloor, currency)} liquidation floor). Risk compressed to preserve account survival.`
    );
  }

  // 4. Near Profit Target Lock-In Protection
  if (
    !isTargetPassed &&
    activeProfitTargetDollars > 0 &&
    profitProgressPercent >= 80 &&
    remainingProfitTarget > 0
  ) {
    // If trader only needs e.g. $50 to pass, don't risk $100! Risk at most 65% of remaining target
    const targetLockCap = Math.max(startingBalance * 0.0025, remainingProfitTarget * 0.65);
    if (targetLockCap < candidateRiskDollars) {
      candidateRiskDollars = targetLockCap;
      limitingFactor = `Phase Pass Lock-In Protection (${profitProgressPercent}% of Target Reached)`;
      reasons.push(
        `You are ${profitProgressPercent}% toward passing (${formatCurrency(
          remainingProfitTarget,
          currency
        )} remaining). Risk reduced to ${formatCurrency(
          targetLockCap,
          currency
        )} so a 1:1.5+ winner passes the phase without risking your accumulated profit cushion.`
      );
    }
  }

  // Enforce Hard Ceiling
  candidateRiskDollars = Math.min(candidateRiskDollars, hardCeilingRiskDollars);

  // Determine STOP_TRADING / TARGET_PASSED / REDUCE_RISK / TAKE_TRADE Verdict
  let verdict: FundedDecisionVerdict = 'TAKE_TRADE';
  let verdictBadge = 'TAKE TRADE — SAFE WITHIN FUNDED RULES';
  let verdictColor: FundedAccountRiskEvaluation['verdictColor'] = 'EMERALD';

  const minViableTradeRisk = startingBalance * 0.0015; // 0.15% minimum viable trade

  if (isDailyDrawdownBreached || isOverallDrawdownBreached) {
    verdict = 'STOP_TRADING';
    verdictBadge = 'STOP TRADING — DRAWDOWN LIMIT BREACHED';
    verdictColor = 'ROSE';
    candidateRiskDollars = 0;
    limitingFactor = isDailyDrawdownBreached
      ? 'Daily Drawdown Limit Breached'
      : 'Overall Max Drawdown Breached';
    reasons.unshift(
      isDailyDrawdownBreached
        ? `CRITICAL: Daily Drawdown limit (${formatCurrency(
            dailyDrawdownLimitDollars,
            currency
          )}) has been reached. Any additional loss violates firm rules.`
        : `CRITICAL: Overall Liquidation Threshold (${formatCurrency(
            overallBreachFloor,
            currency
          )}) has been breached.`
    );
  } else if (
    config.phase !== 'FUNDED_LIVE' &&
    config.phase !== 'INSTANT_FUNDED' &&
    isTargetPassed
  ) {
    verdict = 'TARGET_PASSED';
    verdictBadge = 'PHASE TARGET PASSED — STOP & LOCK EVALUATION';
    verdictColor = 'CYAN';
    candidateRiskDollars = 0;
    limitingFactor = 'Phase Profit Target Achieved';
    reasons.unshift(
      `CONGRATULATIONS: Current profit (${formatCurrency(
        currentProfitLoss,
        currency
      )}) meets or exceeds the ${getPhaseLabel(config.phase)} target of ${formatCurrency(
        activeProfitTargetDollars,
        currency
      )}. Do not place unnecessary trades that could jeopardize your pass.`
    );
  } else if (dailyDrawdownUsedPercent >= 85 || overallDrawdownUsedPercent >= 85) {
    verdict = 'STOP_TRADING';
    verdictBadge = 'STOP TRADING — CRITICAL DRAWDOWN PROXIMITY (>85% USED)';
    verdictColor = 'ROSE';
    candidateRiskDollars = 0;
    limitingFactor = 'Critical Drawdown Proximity Guard (>85% Consumed)';
    reasons.unshift(
      `DANGER ZONE: ${
        dailyDrawdownUsedPercent >= 85
          ? `Daily drawdown is ${dailyDrawdownUsedPercent}% exhausted (${formatCurrency(
              remainingDailyDrawdown,
              currency
            )} left).`
          : `Overall drawdown is ${overallDrawdownUsedPercent}% exhausted (${formatCurrency(
              remainingOverallDrawdown,
              currency
            )} left).`
      } Halt trading to prevent spread/slippage liquidation.`
    );
  } else if (tradesToday >= maxDailyTrades) {
    verdict = 'STOP_TRADING';
    verdictBadge = `STOP TRADING — DAILY TRADE CAP REACHED (${tradesToday}/${maxDailyTrades})`;
    verdictColor = 'ROSE';
    candidateRiskDollars = 0;
    limitingFactor = `Daily Trade Cap (${tradesToday}/${maxDailyTrades})`;
    reasons.unshift(
      `You have executed ${tradesToday} of ${maxDailyTrades} allowed trades today. Stop trading for the session and protect your funded equity.`
    );
  } else if (consecutiveLosses >= maxConsecutiveLosses) {
    verdict = 'STOP_TRADING';
    verdictBadge = `STOP TRADING — ${consecutiveLosses} CONSECUTIVE LOSSES CIRCUIT BREAKER`;
    verdictColor = 'ROSE';
    candidateRiskDollars = 0;
    limitingFactor = `Loss Streak Circuit Breaker (${consecutiveLosses} Losses)`;
    reasons.unshift(
      `Circuit breaker active after ${consecutiveLosses} consecutive losses. Step away from the terminal to prevent tilt and preserve funded drawdown.`
    );
  } else if (candidateRiskDollars < minViableTradeRisk) {
    verdict = 'STOP_TRADING';
    verdictBadge = 'STOP TRADING — INSUFFICIENT DRAWDOWN BUFFER';
    verdictColor = 'ROSE';
    candidateRiskDollars = 0;
    limitingFactor = 'Insufficient Remaining Drawdown Buffer';
    reasons.unshift(
      `Remaining drawdown buffer is too narrow to safely execute a trade without risking rule violation.`
    );
  } else if (candidateRiskDollars < preferredRiskDollars * 0.92 || consecutiveLosses >= 1 || dailyDrawdownUsedPercent >= 40 || overallDrawdownUsedPercent >= 40) {
    verdict = 'REDUCE_RISK';
    verdictBadge = 'REDUCE RISK — DEFENSIVE PROP SIZING ACTIVE';
    verdictColor = 'AMBER';
    if (reasons.length === 0) {
      reasons.push(
        `Drawdown utilization or recent trade results require reduced position risk (${formatCurrency(
          candidateRiskDollars,
          currency
        )} instead of ${formatCurrency(preferredRiskDollars, currency)}).`
      );
    }
  } else {
    verdict = 'TAKE_TRADE';
    verdictBadge = 'TAKE TRADE — FULL PLANNED RISK ALLOWED';
    verdictColor = 'EMERALD';
    if (reasons.length === 0) {
      reasons.push(
        `Account health is optimal. Daily DD remaining is ${formatCurrency(
          remainingDailyDrawdown,
          currency
        )} and Overall DD remaining is ${formatCurrency(
          remainingOverallDrawdown,
          currency
        )}. You may execute your next A+ setup at ${formatCurrency(
          candidateRiskDollars,
          currency
        )} risk.`
      );
    }
  }

  const recommendedRiskDollars = Number(Math.max(0, candidateRiskDollars).toFixed(2));
  const recommendedRiskPercent =
    currentBalance > 0
      ? Number(((recommendedRiskDollars / currentBalance) * 100).toFixed(2))
      : 0;

  const tradesToDailyBreachAtRecommended =
    recommendedRiskDollars > 0
      ? Math.max(1, Math.floor(remainingDailyDrawdown / recommendedRiskDollars))
      : 0;
  const tradesToOverallBreachAtRecommended =
    recommendedRiskDollars > 0
      ? Math.max(1, Math.floor(remainingOverallDrawdown / recommendedRiskDollars))
      : 0;
  const tradesToPassAt2R =
    recommendedRiskDollars > 0 && remainingProfitTarget > 0
      ? Math.max(1, Math.ceil(remainingProfitTarget / (recommendedRiskDollars * 2)))
      : 0;

  const nextTradeRiskQuestionAnswer =
    recommendedRiskDollars > 0
      ? `You can safely risk ${formatCurrency(
          recommendedRiskDollars,
          currency
        )} (${recommendedRiskPercent}% of current balance) on your NEXT trade. This leaves ${tradesToDailyBreachAtRecommended} full loss buffer(s) before Today's Daily Drawdown (${formatCurrency(
          remainingDailyDrawdown,
          currency
        )} left) and ${tradesToOverallBreachAtRecommended} loss buffer(s) before your ${
          isTrailing ? 'Trailing' : 'Overall'
        } Liquidation Threshold (${formatCurrency(overallBreachFloor, currency)}).`
      : `Your safe risk for the NEXT trade is ${formatCurrency(
          0,
          currency
        )} (0.00%). Do not open new positions right now (${limitingFactor}).`;

  const shouldTakeTradeQuestionAnswer =
    verdict === 'TAKE_TRADE'
      ? `TAKE THIS TRADE AT STANDARD RISK (${formatCurrency(
          recommendedRiskDollars,
          currency
        )} / ${recommendedRiskPercent}%): Your daily and overall drawdown buffers are healthy and within all ${
          config.firmName
        } rules.`
      : verdict === 'REDUCE_RISK'
      ? `REDUCE YOUR RISK TO ${formatCurrency(
          recommendedRiskDollars,
          currency
        )} (${recommendedRiskPercent}%) BEFORE TAKING THIS TRADE: Down-size from your ${preferredRiskPercent}% baseline due to ${limitingFactor.toLowerCase()}. Only execute an A+ setup.`
      : verdict === 'TARGET_PASSED'
      ? `STOP TRADING & LOCK IN PASS: You have already reached the ${formatCurrency(
          activeProfitTargetDollars,
          currency
        )} profit target for ${getPhaseLabel(config.phase)}.`
      : `STOP TRADING IMMEDIATELY: Do not take another trade today. Reason: ${limitingFactor}. Protect your funded account from rule breach.`;

  return {
    isFunded: fundedActive,
    config,
    firmName: config.firmName || account.broker || 'My Prop Firm',
    accountName: account.accountName,
    accountSize,
    currency,
    phase: config.phase,
    phaseLabel: getPhaseLabel(config.phase),
    startingBalance,
    currentBalance,
    currentEquity,

    activeProfitTargetDollars,
    activeProfitTargetPercent,
    currentProfitLoss,
    remainingProfitTarget,
    profitProgressPercent,
    amountRequiredToPass,
    passingBalanceTarget,
    isTargetPassed,

    drawdownType: config.drawdownType,
    drawdownTypeLabel: getDrawdownTypeLabel(config.drawdownType),
    isTrailing,
    initialLiquidationThreshold,
    highWaterMark,
    activeLiquidationThreshold,
    trailingFloorMovedDollars,
    isTrailingLocked,
    trailingExplanation,

    todayStartingBalance,
    todayStartingEquity,
    todayRealizedPnL,
    todayUnrealizedPnL,
    dailyDrawdownLimitDollars,
    dailyDrawdownLimitPercent,
    dailyBreachFloor,
    currentDailyDrawdown,
    remainingDailyDrawdown,
    dailyDrawdownUsedPercent,
    dailyDrawdownAccountPercent,
    isDailyDrawdownBreached,

    overallDrawdownLimitDollars,
    overallDrawdownLimitPercent,
    overallBreachFloor,
    currentOverallDrawdown,
    remainingOverallDrawdown,
    overallDrawdownUsedPercent,
    overallDrawdownAccountPercent,
    isOverallDrawdownBreached,

    riskMode,
    preferredRiskPercent,
    preferredRiskDollars,
    maxRiskPerTradePercent,
    maxRiskPerTradeDollars,
    recommendedRiskDollars,
    recommendedRiskPercent,
    hardCeilingRiskDollars,
    limitingFactor,
    verdict,
    verdictBadge,
    verdictColor,
    nextTradeRiskQuestionAnswer,
    shouldTakeTradeQuestionAnswer,
    reasons,

    tradesToday,
    maxDailyTrades,
    consecutiveLosses,
    consecutiveWins,
    lastTradePnL,
    tradesToDailyBreachAtRecommended,
    tradesToOverallBreachAtRecommended,
    tradesToPassAt2R,
  };
}
