import { Trade, AccountSettings, EmotionState, TradeIntention } from '../types';
import { getKarachiDate, getKarachiEpoch, normalizeTradeDateToPakistan } from './time';

export type ReadinessStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface TradeReadinessScoreBreakdown {
  riskAvailabilityScore: number; // max 20
  disciplineScore: number; // max 20
  psychologyScore: number; // max 20
  tradeLimitScore: number; // max 20
  strategyConfirmationScore: number; // max 20
  totalScore: number; // 0 to 100
  status:
    | 'READY TO TRADE ACCORDING TO YOUR CURRENT PLAN'
    | 'CAUTION - ELEVATED VIGILANCE'
    | 'NOT RECOMMENDED ACCORDING TO YOUR CURRENT RISK RULES';
}

export interface NextTradeReadiness {
  status: ReadinessStatus;
  headline: string;
  reasons: string[];
  recommendation: string;
  tradesToday: number;
  maxDailyTrades: number;
  tradesRemainingToday: number;
  dailyRiskUsed: number;
  dailyRiskLimitDollars: number;
  remainingDailyRiskDollars: number;
  dailyLossDollars: number;
  dailyLossLimitDollars: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
  accountBalance: number;
  currentDrawdownPercent: number;
  currentDrawdownDollars: number;
  dailyRiskUsedPercent: number;
  dailyRiskRemainingPercent: number;
  maxRiskPerTradePercent: number;
  maxRiskPerTradeDollars: number;
  recommendedRiskDollars: number;
  recommendedRiskPercent: number;
  riskStatus: 'WITHIN PLAN' | 'LIMIT REACHED';
  isTradeLimitReached: boolean;
  isDailyLossLimitReached: boolean;
  isConsecutiveLossReached: boolean;
  recentEmotion: EmotionState | null;
  ruleViolationsToday: number;
  isAdaptiveRiskActive: boolean;
  adaptiveRecommendedRiskPercent: number;
  adaptiveRiskGuidance: string;
  readinessScore: TradeReadinessScoreBreakdown;
}

export function calculateNextTradeReadiness(
  trades: Trade[],
  account: AccountSettings,
  currentEmotion?: EmotionState,
  currentIntention?: TradeIntention
): NextTradeReadiness {
  const pakistanTodayStr = getKarachiDate();
  const balance = account.currentBalance > 0 ? account.currentBalance : account.initialBalance;
  const initialBal = Math.max(1, account.initialBalance);

  // Drawdown calculations
  const currentDrawdownDollars = Math.max(0, initialBal - balance);
  const currentDrawdownPercent = Number(((currentDrawdownDollars / initialBal) * 100).toFixed(2));
  const maxDrawdownLimit = account.maxDrawdownPercent || 5.0;

  // Filter trades for today (Pakistan Time)
  const tradesTodayList = trades.filter((t) => normalizeTradeDateToPakistan(t.date) === pakistanTodayStr);
  const tradesToday = tradesTodayList.length;
  const maxDailyTrades = account.maxDailyTrades || 2;
  const tradesRemainingToday = Math.max(0, maxDailyTrades - tradesToday);

  // Daily Loss calculations (Standard daily loss limit is 2%)
  const dailyLossLimitPct = account.maxDailyLossPercent || 2;
  const dailyLossLimitDollars = (balance * dailyLossLimitPct) / 100;
  const dailyPnl = tradesTodayList.reduce((acc, t) => acc + (t.profitLoss || 0), 0);
  const dailyLossDollars = dailyPnl < 0 ? Math.abs(dailyPnl) : 0;
  const isDailyLossLimitReached = dailyLossDollars >= dailyLossLimitDollars;

  // Daily Risk calculations: Strictly 2% maximum daily risk standard
  const maxDailyRiskPct = account.maxDailyRiskPercent && account.maxDailyRiskPercent <= 5
    ? account.maxDailyRiskPercent
    : 2.0;
  const dailyRiskLimitDollars = (balance * maxDailyRiskPct) / 100;
  const dailyRiskUsed = tradesTodayList.reduce((acc, t) => acc + (t.riskAmount || 0), 0);
  const remainingDailyRiskDollars = Math.max(0, dailyRiskLimitDollars - dailyRiskUsed);
  const dailyRiskUsedPercent = Number(((dailyRiskUsed / balance) * 100).toFixed(2));
  const dailyRiskRemainingPercent = Number(((remainingDailyRiskDollars / balance) * 100).toFixed(2));

  // Max Risk per single trade: Strictly 1% standard per trade
  const maxRiskPerTradePct = account.maxRiskPerTradePercent && account.maxRiskPerTradePercent <= 2
    ? account.maxRiskPerTradePercent
    : 1.0;
  const maxRiskPerTradeDollars = (balance * maxRiskPerTradePct) / 100;

  // Consecutive losses calculation
  const sorted = [...trades].sort(
    (a, b) => getKarachiEpoch(b.date, b.time) - getKarachiEpoch(a.date, a.time)
  );
  let consecutiveLosses = 0;
  for (const t of sorted) {
    if (t.status === 'OPEN') continue;
    if (t.profitLoss < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  const maxConsecutiveLosses = account.maxConsecutiveLosses || 2;
  const isConsecutiveLossReached = consecutiveLosses >= maxConsecutiveLosses;
  const isTradeLimitReached = tradesToday >= maxDailyTrades;

  // Rule violations today
  const ruleViolationsToday = tradesTodayList.filter(
    (t) => t.ruleViolation === 'MAJOR' || t.ruleViolation === 'MINOR'
  ).length;

  // Most recent trade's emotion or the current session emotion
  const lastTrade = sorted[0];
  const recentEmotion = currentEmotion || lastTrade?.preEmotion || null;

  // Determine readiness status & factual reasons (Items 10, 11)
  const reasons: string[] = [];
  let status: ReadinessStatus = 'GREEN';
  let headline = 'ALLOWED BY YOUR CURRENT TRADING RULES';
  let recommendation =
    'Follow your trading plan, execute your entry checklist, and strictly honor your stop loss.';

  // Check RED conditions (Hard boundaries)
  if (isTradeLimitReached) {
    status = 'RED';
    headline = 'DAILY TRADE LIMIT REACHED';
    reasons.push(
      `You have completed ${tradesToday} of ${maxDailyTrades} maximum allowed trades for today.`
    );
    recommendation = `STOP TRADING: Daily trade limit reached (${tradesToday}/${maxDailyTrades}). Review your trades and preserve capital until tomorrow.`;
  }

  if (isDailyLossLimitReached) {
    status = 'RED';
    headline = 'DAILY LOSS LIMIT REACHED';
    reasons.push(
      `Realized loss today is -$${dailyLossDollars.toLocaleString()} against your maximum threshold of -$${dailyLossLimitDollars.toLocaleString()}.`
    );
    recommendation =
      'NOT RECOMMENDED: Daily loss limit reached. Step away from the screens to protect account equity.';
  }

  if (isConsecutiveLossReached) {
    status = 'RED';
    headline = 'CONSECUTIVE LOSS LIMIT REACHED';
    reasons.push(
      `You have logged ${consecutiveLosses} consecutive losses (your configured limit is ${maxConsecutiveLosses}).`
    );
    recommendation = `STOP TRADING: Circuit breaker triggered after ${consecutiveLosses} consecutive losses. Avoid revenge trading and review setups tomorrow.`;
  }

  if (
    currentIntention === 'REVENGE' ||
    currentIntention === 'FOMO' ||
    currentIntention === 'IMPULSIVE'
  ) {
    status = 'RED';
    headline = 'HIGH-RISK INTENTION DETECTED';
    reasons.push(
      `Trade intention marked as ${currentIntention}. Impulsive or revenge executions violate core discipline.`
    );
    recommendation =
      'HALT EXECUTION: Never enter a trade based on FOMO or revenge. Reset emotionally and wait for a valid, planned setup.';
  }

  // Check YELLOW conditions (Cautions) if not already RED
  if (status !== 'RED') {
    if (tradesRemainingToday === 1 && tradesToday > 0) {
      status = 'YELLOW';
      headline = 'CAUTION - REVIEW YOUR PLAN';
      reasons.push(
        `Trade 1 of ${maxDailyTrades} completed. You have exactly 1 trade execution remaining today.`
      );
      recommendation =
        'Be extremely selective. Only enter an A+ grade setup that strictly complies with all criteria.';
    }

    if (consecutiveLosses === 1 && maxConsecutiveLosses > 1) {
      status = 'YELLOW';
      headline = 'CAUTION - REVIEW YOUR PLAN';
      reasons.push(
        'Previous trade closed at a loss. Ensure this trade is fully planned and not an impulsive reaction.'
      );
      recommendation =
        'Verify that your risk does not exceed 1% and take a pause before pulling the trigger.';
    }

    if (
      recentEmotion &&
      ['FEARFUL', 'ANGRY', 'GREEDY', 'STRESSED', 'TIRED'].includes(recentEmotion)
    ) {
      status = 'YELLOW';
      headline = 'CAUTION - ELEVATED EMOTIONAL STATE';
      reasons.push(`Current psychological check-in is logged as ${recentEmotion}.`);
      recommendation =
        'REDUCE RISK: Psychological state is elevated. Consider trading at 0.5% risk or stepping away.';
    }

    if (ruleViolationsToday > 0) {
      status = 'YELLOW';
      headline = 'CAUTION - RULE VIOLATION LOGGED TODAY';
      reasons.push(`${ruleViolationsToday} rule breach(es) detected in today\'s sessions.`);
      recommendation = 'Re-read your trading rules before placing any new order.';
    }

    if (currentDrawdownPercent >= maxDrawdownLimit * 0.75) {
      status = 'YELLOW';
      headline = 'CAUTION - DRAWDOWN APPROACHING GUARDRAIL';
      reasons.push(
        `Current drawdown is ${currentDrawdownPercent}% (${(
          (currentDrawdownPercent / maxDrawdownLimit) *
          100
        ).toFixed(0)}% of your ${maxDrawdownLimit}% limit).`
      );
      recommendation =
        'DEFENSIVE POSTURE: Approaching maximum allowable drawdown. Reduce trade risk to protect capital.';
    }
  }

  // ---------------------------------------------------------------------------
  // ADAPTIVE RISK GUIDANCE (Item 13)
  // Recommends reducing risk under specific pressure conditions
  // ---------------------------------------------------------------------------
  let isAdaptiveRiskActive = false;
  let adaptiveRecommendedRiskPercent = maxRiskPerTradePct;
  let adaptiveRiskGuidance = `Risk allocation standard: ${maxRiskPerTradePct}% of account equity.`;

  if (consecutiveLosses >= 2 && status !== 'RED') {
    isAdaptiveRiskActive = true;
    adaptiveRecommendedRiskPercent = Math.min(0.5, maxRiskPerTradePct * 0.5);
    adaptiveRiskGuidance = `RISK CAUTION: You have experienced 2 consecutive losses. Your current rules allow another trade, but consider reducing risk to ${adaptiveRecommendedRiskPercent}%. (Risk-management suggestion • Not a market prediction)`;
  } else if (currentDrawdownPercent >= maxDrawdownLimit * 0.75 && status !== 'RED') {
    isAdaptiveRiskActive = true;
    adaptiveRecommendedRiskPercent = Math.min(0.5, maxRiskPerTradePct * 0.5);
    adaptiveRiskGuidance = `DRAWDOWN CAUTION: Drawdown is at ${currentDrawdownPercent}%. Reduce risk to ${adaptiveRecommendedRiskPercent}% to protect account equity. (Risk-management suggestion)`;
  } else if (ruleViolationsToday >= 1 && status !== 'RED') {
    isAdaptiveRiskActive = true;
    adaptiveRecommendedRiskPercent = Math.min(0.5, maxRiskPerTradePct * 0.75);
    adaptiveRiskGuidance = `DISCIPLINE CAUTION: Rule breach logged today. Consider sizing down to ${adaptiveRecommendedRiskPercent}% until execution discipline stabilizes.`;
  }

  // Base recommended risk dollars
  let recommendedRiskDollars = (balance * adaptiveRecommendedRiskPercent) / 100;
  let recommendedRiskPercent = adaptiveRecommendedRiskPercent;

  if (status === 'RED') {
    recommendedRiskDollars = 0;
    recommendedRiskPercent = 0;
  } else {
    recommendedRiskDollars = Math.min(recommendedRiskDollars, remainingDailyRiskDollars);
    recommendedRiskPercent = Number(((recommendedRiskDollars / balance) * 100).toFixed(2));
  }

  const riskStatus =
    status === 'RED' || remainingDailyRiskDollars <= 0 ? 'LIMIT REACHED' : 'WITHIN PLAN';

  // ---------------------------------------------------------------------------
  // TRADE READINESS SCORE (Item 14) (0 - 100)
  // 5 Components: Risk Availability, Discipline, Psychology, Trade Limit, Strategy Confirmation
  // ---------------------------------------------------------------------------
  // 1. Risk Availability (0 to 20)
  let riskAvailabilityScore = 20;
  if (remainingDailyRiskDollars <= 0 || status === 'RED') {
    riskAvailabilityScore = 0;
  } else if (remainingDailyRiskDollars < maxRiskPerTradeDollars) {
    riskAvailabilityScore = 10;
  } else if (isAdaptiveRiskActive) {
    riskAvailabilityScore = 15;
  }

  // 2. Trade Limit (0 to 20)
  let tradeLimitScore = 20;
  if (tradesToday >= maxDailyTrades) {
    tradeLimitScore = 0;
  } else if (tradesRemainingToday === 1) {
    tradeLimitScore = 14;
  }

  // 3. Discipline / Rules (0 to 20)
  let disciplineScore = 20;
  if (ruleViolationsToday >= 2) {
    disciplineScore = 4;
  } else if (ruleViolationsToday === 1) {
    disciplineScore = 10;
  } else if (lastTrade && lastTrade.ruleViolation && lastTrade.ruleViolation !== 'NONE') {
    disciplineScore = 14;
  }

  // 4. Psychology (0 to 20)
  let psychologyScore = 15;
  if (recentEmotion === 'CALM' || recentEmotion === 'CONFIDENT') {
    psychologyScore = 20;
  } else if (recentEmotion === 'NEUTRAL' || !recentEmotion) {
    psychologyScore = 16;
  } else if (['FEARFUL', 'GREEDY', 'STRESSED'].includes(recentEmotion)) {
    psychologyScore = 8;
  } else if (['ANGRY', 'TIRED', 'IMPULSIVE'].includes(recentEmotion)) {
    psychologyScore = 4;
  }

  // 5. Strategy Confirmation (0 to 20)
  let strategyConfirmationScore = 18;
  if (currentIntention === 'PLANNED') {
    strategyConfirmationScore = 20;
  } else if (currentIntention === 'REVENGE' || currentIntention === 'FOMO' || currentIntention === 'IMPULSIVE') {
    strategyConfirmationScore = 0;
  }

  const totalScore = Math.min(
    100,
    riskAvailabilityScore + tradeLimitScore + disciplineScore + psychologyScore + strategyConfirmationScore
  );

  let readinessScoreStatus:
    | 'READY TO TRADE ACCORDING TO YOUR CURRENT PLAN'
    | 'CAUTION - ELEVATED VIGILANCE'
    | 'NOT RECOMMENDED ACCORDING TO YOUR CURRENT RISK RULES' =
    'READY TO TRADE ACCORDING TO YOUR CURRENT PLAN';

  if (status === 'RED' || totalScore < 60) {
    readinessScoreStatus = 'NOT RECOMMENDED ACCORDING TO YOUR CURRENT RISK RULES';
  } else if (status === 'YELLOW' || totalScore < 80) {
    readinessScoreStatus = 'CAUTION - ELEVATED VIGILANCE';
  }

  const readinessScore: TradeReadinessScoreBreakdown = {
    riskAvailabilityScore,
    disciplineScore,
    psychologyScore,
    tradeLimitScore,
    strategyConfirmationScore,
    totalScore,
    status: readinessScoreStatus,
  };

  return {
    status,
    headline,
    reasons:
      reasons.length > 0
        ? reasons
        : ['All discipline, risk, and session parameters are within optimal limits.'],
    recommendation,
    tradesToday,
    maxDailyTrades,
    tradesRemainingToday,
    dailyRiskUsed,
    dailyRiskLimitDollars,
    remainingDailyRiskDollars,
    dailyLossDollars,
    dailyLossLimitDollars,
    consecutiveLosses,
    maxConsecutiveLosses,
    accountBalance: balance,
    currentDrawdownPercent,
    currentDrawdownDollars,
    dailyRiskUsedPercent,
    dailyRiskRemainingPercent,
    maxRiskPerTradePercent: maxRiskPerTradePct,
    maxRiskPerTradeDollars,
    recommendedRiskDollars: Number(recommendedRiskDollars.toFixed(2)),
    recommendedRiskPercent,
    riskStatus,
    isTradeLimitReached,
    isDailyLossLimitReached,
    isConsecutiveLossReached,
    recentEmotion,
    ruleViolationsToday,
    isAdaptiveRiskActive,
    adaptiveRecommendedRiskPercent,
    adaptiveRiskGuidance,
    readinessScore,
  };
}

// Calculate Trade Quality Score (0 to 100) strictly from input parameters
export function calculateTradeQualityScore(params: {
  htfAlignment: boolean | string;
  entryModel: string;
  riskRewardRatio: number;
  riskPercent: number;
  maxAllowedRiskPercent: number;
  preEmotion: EmotionState;
  followedPlan?: boolean;
}): {
  htfAlignmentScore: number;
  entryModelScore: number;
  riskRewardScore: number;
  riskComplianceScore: number;
  psychologyScore: number;
  totalQuality: number;
} {
  // 1. HTF Alignment (0 to 20)
  const isHtfAligned =
    typeof params.htfAlignment === 'boolean'
      ? params.htfAlignment
      : ['ALIGNED', 'BULLISH', 'BEARISH', 'TRENDING', 'STRONG'].includes(
          String(params.htfAlignment).toUpperCase()
        );
  const htfAlignmentScore = isHtfAligned ? 20 : 5;

  // 2. Entry Model (0 to 20)
  const entryModelScore = params.entryModel && params.entryModel !== 'None' ? 20 : 5;

  // 3. Risk-to-Reward (0 to 20)
  let riskRewardScore = 5;
  if (params.riskRewardRatio >= 3.0) {
    riskRewardScore = 20;
  } else if (params.riskRewardRatio >= 2.0) {
    riskRewardScore = 17;
  } else if (params.riskRewardRatio >= 1.5) {
    riskRewardScore = 14;
  } else if (params.riskRewardRatio >= 1.0) {
    riskRewardScore = 10;
  }

  // 4. Risk Limit Compliance (0 to 20)
  let riskComplianceScore = 20;
  if (params.riskPercent > params.maxAllowedRiskPercent * 1.5) {
    riskComplianceScore = 0;
  } else if (params.riskPercent > params.maxAllowedRiskPercent) {
    riskComplianceScore = 8;
  } else if (params.riskPercent <= params.maxAllowedRiskPercent) {
    riskComplianceScore = 20;
  }

  // 5. Psychology Score (0 to 20)
  let psychologyScore = 15;
  if (['CALM', 'CONFIDENT'].includes(params.preEmotion)) {
    psychologyScore = 20;
  } else if (params.preEmotion === 'NEUTRAL') {
    psychologyScore = 16;
  } else if (['FEARFUL', 'GREEDY', 'STRESSED'].includes(params.preEmotion)) {
    psychologyScore = 8;
  } else if (['ANGRY', 'TIRED'].includes(params.preEmotion)) {
    psychologyScore = 4;
  }

  const totalQuality = Math.min(
    100,
    htfAlignmentScore + entryModelScore + riskRewardScore + riskComplianceScore + psychologyScore
  );

  return {
    htfAlignmentScore,
    entryModelScore,
    riskRewardScore,
    riskComplianceScore,
    psychologyScore,
    totalQuality,
  };
}
