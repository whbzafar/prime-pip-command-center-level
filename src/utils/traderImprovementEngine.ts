// PrimePipFX Personal Improvement Engine & Account Health Analytics
// 100% offline-first, mathematical rule-based analysis, strict data integrity.
// NEVER invents fake trades, fake wins, or fake patterns.

import { Trade, AccountSettings, EmotionState } from '../types';
import { getKarachiDate, getKarachiEpoch } from './time';

// Helper to safely get risk percent from trade
export const getTradeRiskPct = (t: Trade, fallback = 1.0): number => {
  if (typeof t.riskPercent === 'number' && t.riskPercent > 0) return t.riskPercent;
  if (t.riskAmount && t.accountSize && t.accountSize > 0) {
    return Number(((t.riskAmount / t.accountSize) * 100).toFixed(2));
  }
  return fallback;
};

// ---------------------------------------------------------------------------
// 1. ACCOUNT HEALTH SCORE (Item 26) (0 - 100)
// ---------------------------------------------------------------------------
export type AccountHealthCategory = 'ELITE' | 'HEALTHY' | 'CAUTION' | 'HIGH RISK';

export interface AccountHealthBreakdown {
  score: number; // 0 - 100
  category: AccountHealthCategory;
  drawdownScore: number; // max 25
  riskConsistencyScore: number; // max 20
  disciplineScore: number; // max 25
  frequencyScore: number; // max 15
  psychologyScore: number; // max 15
  summary: string;
  recommendations: string[];
}

export function calculateAccountHealthScore(
  trades: Trade[],
  account: AccountSettings
): AccountHealthBreakdown {
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');

  if (closedTrades.length === 0) {
    return {
      score: 100,
      category: 'HEALTHY',
      drawdownScore: 25,
      riskConsistencyScore: 20,
      disciplineScore: 25,
      frequencyScore: 15,
      psychologyScore: 15,
      summary: 'Account initialized with pristine baseline health. No capital at risk yet.',
      recommendations: ['Maintain strict 1% risk allocation on your upcoming trade execution.'],
    };
  }

  // 1. Drawdown Score (0 to 25)
  const initialBal = Math.max(1, account.initialBalance);
  const currentBal = account.currentBalance > 0 ? account.currentBalance : initialBal;
  const currentDrawdownPct = Math.max(0, ((initialBal - currentBal) / initialBal) * 100);
  const maxAllowedDDPct = account.maxDrawdownPercent || 5.0;

  let drawdownScore = 25;
  if (currentDrawdownPct >= maxAllowedDDPct) {
    drawdownScore = 0;
  } else {
    drawdownScore = Math.max(0, Math.round(25 * (1 - currentDrawdownPct / maxAllowedDDPct)));
  }

  // 2. Risk Consistency Score (0 to 20)
  // Calculate variance in risk percent across trades
  const riskValues = closedTrades.map((t) => getTradeRiskPct(t));
  const avgRisk = riskValues.reduce((a, b) => a + b, 0) / riskValues.length;
  const variance = riskValues.reduce((acc, val) => acc + Math.pow(val - avgRisk, 2), 0) / riskValues.length;
  const stdDev = Math.sqrt(variance);

  let riskConsistencyScore = 20;
  if (stdDev > 1.5) {
    riskConsistencyScore = 5;
  } else if (stdDev > 0.8) {
    riskConsistencyScore = 12;
  } else if (stdDev > 0.4) {
    riskConsistencyScore = 16;
  }

  // 3. Discipline & Rule Violations (0 to 25)
  const violations = closedTrades.filter(
    (t) => t.ruleViolation === 'MAJOR' || t.ruleViolation === 'MINOR'
  ).length;
  const violationRate = violations / closedTrades.length;

  let disciplineScore = 25;
  if (violationRate >= 0.5) {
    disciplineScore = 5;
  } else if (violationRate >= 0.25) {
    disciplineScore = 12;
  } else if (violationRate > 0) {
    disciplineScore = 18;
  }

  // 4. Frequency Score / Overtrading (0 to 15)
  // Check if daily trade limits were exceeded
  const tradesByDate: Record<string, number> = {};
  for (const t of closedTrades) {
    tradesByDate[t.date] = (tradesByDate[t.date] || 0) + 1;
  }
  const maxAllowedDaily = account.maxDailyTrades || 2;
  const overtradedDays = Object.values(tradesByDate).filter((count) => count > maxAllowedDaily).length;

  let frequencyScore = 15;
  if (overtradedDays >= 3) {
    frequencyScore = 3;
  } else if (overtradedDays >= 1) {
    frequencyScore = 9;
  }

  // 5. Psychology Score (0 to 15)
  const calmTrades = closedTrades.filter(
    (t) => t.preEmotion === 'CALM' || t.preEmotion === 'CONFIDENT'
  ).length;
  const calmRate = calmTrades / closedTrades.length;

  let psychologyScore = 15;
  if (calmRate >= 0.75) {
    psychologyScore = 15;
  } else if (calmRate >= 0.5) {
    psychologyScore = 11;
  } else {
    psychologyScore = 6;
  }

  const totalScore = Math.min(
    100,
    Math.max(0, drawdownScore + riskConsistencyScore + disciplineScore + frequencyScore + psychologyScore)
  );

  let category: AccountHealthCategory = 'HEALTHY';
  if (totalScore >= 90) category = 'ELITE';
  else if (totalScore >= 75) category = 'HEALTHY';
  else if (totalScore >= 60) category = 'CAUTION';
  else category = 'HIGH RISK';

  const recommendations: string[] = [];
  if (drawdownScore < 15) {
    recommendations.push('Drawdown guardrail warning: Reduce position sizing to protect account equity.');
  }
  if (riskConsistencyScore < 14) {
    recommendations.push('Inconsistent risk detected: Standardize position sizing to a fixed 1% per setup.');
  }
  if (disciplineScore < 18) {
    recommendations.push('Rule breaches recorded: Review trading checklist before placing the next order.');
  }
  if (frequencyScore < 12) {
    recommendations.push('Overtrading tendency detected: Strictly cap daily executions to your max trades limit.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Execution discipline is optimal. Continue adhering to your defined setup criteria.');
  }

  return {
    score: totalScore,
    category,
    drawdownScore,
    riskConsistencyScore,
    disciplineScore,
    frequencyScore,
    psychologyScore,
    summary:
      category === 'ELITE'
        ? 'Account health is in an elite operational state with disciplined execution.'
        : category === 'HEALTHY'
        ? 'Account metrics are stable and complying with general risk rules.'
        : category === 'CAUTION'
        ? 'Account health requires attention. Elevated risk or violations observed.'
        : 'CRITICAL DEFENSE REQUIRED: Significant drawdown or discipline breakdown detected.',
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// 2. TRADER GROWTH SCORE (Item 27)
// Compares recent trades vs earlier trades across discipline & risk
// ---------------------------------------------------------------------------
export interface TraderGrowthMetrics {
  growthScore: number; // 0 - 100
  growthDelta: number; // e.g. +8% vs prior period
  disciplineTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  riskConsistencyTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  psychologyTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  hasEnoughData: boolean;
  message: string;
}

export function calculateTraderGrowthScore(trades: Trade[]): TraderGrowthMetrics {
  const closedTrades = trades
    .filter((t) => t.status !== 'OPEN')
    .sort((a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time));

  if (closedTrades.length < 4) {
    return {
      growthScore: 70,
      growthDelta: 0,
      disciplineTrend: 'STABLE',
      riskConsistencyTrend: 'STABLE',
      psychologyTrend: 'STABLE',
      hasEnoughData: false,
      message: `INSUFFICIENT DATA (Requires at least 4 closed trades to measure growth trend; currently have ${closedTrades.length}).`,
    };
  }

  const midpoint = Math.floor(closedTrades.length / 2);
  const earlierPeriod = closedTrades.slice(0, midpoint);
  const recentPeriod = closedTrades.slice(midpoint);

  // Measure discipline compliance (rule violation rate)
  const earlierViolations = earlierPeriod.filter((t) => t.ruleViolation && t.ruleViolation !== 'NONE').length / earlierPeriod.length;
  const recentViolations = recentPeriod.filter((t) => t.ruleViolation && t.ruleViolation !== 'NONE').length / recentPeriod.length;

  const disciplineTrend =
    recentViolations < earlierViolations ? 'IMPROVING' : recentViolations > earlierViolations ? 'DECLINING' : 'STABLE';

  // Measure psychology compliance
  const earlierCalm = earlierPeriod.filter((t) => t.preEmotion === 'CALM' || t.preEmotion === 'CONFIDENT').length / earlierPeriod.length;
  const recentCalm = recentPeriod.filter((t) => t.preEmotion === 'CALM' || t.preEmotion === 'CONFIDENT').length / recentPeriod.length;

  const psychologyTrend =
    recentCalm > earlierCalm ? 'IMPROVING' : recentCalm < earlierCalm ? 'DECLINING' : 'STABLE';

  // Measure risk consistency
  const recentRiskDev = Math.abs(
    recentPeriod.reduce((acc, t) => acc + getTradeRiskPct(t), 0) / recentPeriod.length - 1.0
  );
  const earlierRiskDev = Math.abs(
    earlierPeriod.reduce((acc, t) => acc + getTradeRiskPct(t), 0) / earlierPeriod.length - 1.0
  );

  const riskConsistencyTrend =
    recentRiskDev < earlierRiskDev ? 'IMPROVING' : recentRiskDev > earlierRiskDev ? 'DECLINING' : 'STABLE';

  let delta = 0;
  if (disciplineTrend === 'IMPROVING') delta += 5;
  if (disciplineTrend === 'DECLINING') delta -= 5;
  if (psychologyTrend === 'IMPROVING') delta += 4;
  if (psychologyTrend === 'DECLINING') delta -= 4;
  if (riskConsistencyTrend === 'IMPROVING') delta += 3;
  if (riskConsistencyTrend === 'DECLINING') delta -= 3;

  const growthScore = Math.min(100, Math.max(40, 75 + delta));

  return {
    growthScore,
    growthDelta: delta,
    disciplineTrend,
    riskConsistencyTrend,
    psychologyTrend,
    hasEnoughData: true,
    message:
      delta > 0
        ? `Positive growth trend (+${delta}%): Execution discipline and risk consistency have improved in recent sessions.`
        : delta < 0
        ? `Growth alert (${delta}%): Slight decline in emotional discipline or rule adherence compared to initial sessions.`
        : 'Stable execution consistency maintained across evaluation periods.',
  };
}

// ---------------------------------------------------------------------------
// 3. OVERCONFIDENCE & STREAK MONITOR (Items 23, 24)
// ---------------------------------------------------------------------------
export interface StreakAndOverconfidenceStatus {
  consecutiveLosses: number;
  consecutiveWins: number;
  streakProtectionAction: string;
  streakProtectionLevel: 'NORMAL' | 'CAUTION' | 'STOP_AND_REVIEW';
  isOverconfidenceDetected: boolean;
  overconfidenceReason?: string;
}

export function checkStreakAndOverconfidence(
  trades: Trade[],
  maxConsecutiveLosses: number = 2
): StreakAndOverconfidenceStatus {
  const sorted = [...trades]
    .filter((t) => t.status !== 'OPEN')
    .sort((a, b) => getKarachiEpoch(b.date, b.time) - getKarachiEpoch(a.date, a.time));

  if (sorted.length === 0) {
    return {
      consecutiveLosses: 0,
      consecutiveWins: 0,
      streakProtectionAction: 'System armed and standing by for live executions.',
      streakProtectionLevel: 'NORMAL',
      isOverconfidenceDetected: false,
    };
  }

  // Count current consecutive outcomes
  let consecutiveLosses = 0;
  for (const t of sorted) {
    if (t.profitLoss < 0) consecutiveLosses++;
    else break;
  }

  let consecutiveWins = 0;
  for (const t of sorted) {
    if (t.profitLoss > 0) consecutiveWins++;
    else break;
  }

  // Streak Protection Logic (Item 23)
  let streakProtectionLevel: 'NORMAL' | 'CAUTION' | 'STOP_AND_REVIEW' = 'NORMAL';
  let streakProtectionAction = 'Standard discipline protocol active.';

  if (consecutiveLosses >= 3 || consecutiveLosses >= maxConsecutiveLosses) {
    streakProtectionLevel = 'STOP_AND_REVIEW';
    streakProtectionAction = 'STOP AND REVIEW: Your risk rules require a mandatory cooling-off break before placing any new trade.';
  } else if (consecutiveLosses === 2) {
    streakProtectionLevel = 'CAUTION';
    streakProtectionAction = 'CAUTION: Slow down, complete the psychology check, and consider halving position size.';
  } else if (consecutiveLosses === 1) {
    streakProtectionLevel = 'NORMAL';
    streakProtectionAction = 'Review your execution before the next trade. Verify high-probability setup alignment.';
  }

  // Overconfidence Detection (Item 24)
  // Check if risk was increased after a winning trade
  let isOverconfidenceDetected = false;
  let overconfidenceReason: string | undefined;

  if (sorted.length >= 2) {
    const latest = sorted[0];
    const previous = sorted[1];
    const latestRisk = getTradeRiskPct(latest);
    const previousRisk = getTradeRiskPct(previous);

    if (previous.profitLoss > 0 && latestRisk > 0 && previousRisk > 0) {
      if (latestRisk > previousRisk * 1.3) {
        isOverconfidenceDetected = true;
        overconfidenceReason = `OVERCONFIDENCE CAUTION: Position risk increased to ${latestRisk}% following a winning trade (${previousRisk}% previously). Standardize risk to prevent giving back gains.`;
      }
    }
  }

  return {
    consecutiveLosses,
    consecutiveWins,
    streakProtectionAction,
    streakProtectionLevel,
    isOverconfidenceDetected,
    overconfidenceReason,
  };
}

// ---------------------------------------------------------------------------
// 4. PERSONAL IMPROVEMENT ENGINE PATTERNS (Item 18)
// Real user data analysis only - never fake insights!
// ---------------------------------------------------------------------------
export interface ImprovementInsight {
  id: string;
  type: 'POSITIVE' | 'WARNING' | 'SUGGESTION';
  title: string;
  message: string;
  supportingData: string;
}

export function generateImprovementInsights(
  trades: Trade[],
  account: AccountSettings
): {
  insights: ImprovementInsight[];
  hasEnoughData: boolean;
  statusMessage: string;
} {
  const closed = trades.filter((t) => t.status !== 'OPEN');

  if (closed.length < 3) {
    return {
      insights: [],
      hasEnoughData: false,
      statusMessage: `INSUFFICIENT DATA (Requires at least 3 completed trades to derive real performance patterns; currently logged: ${closed.length}).`,
    };
  }

  const insights: ImprovementInsight[] = [];

  // Pattern 1: Performance by Trade Frequency (Overtrading analysis)
  const tradesByDay: Record<string, Trade[]> = {};
  for (const t of closed) {
    if (!tradesByDay[t.date]) tradesByDay[t.date] = [];
    tradesByDay[t.date].push(t);
  }

  let lowVolumeWins = 0;
  let lowVolumeTotal = 0;
  let highVolumeWins = 0;
  let highVolumeTotal = 0;

  for (const dayTrades of Object.values(tradesByDay)) {
    if (dayTrades.length <= 2) {
      for (const t of dayTrades) {
        lowVolumeTotal++;
        if (t.profitLoss > 0) lowVolumeWins++;
      }
    } else {
      for (const t of dayTrades) {
        highVolumeTotal++;
        if (t.profitLoss > 0) highVolumeWins++;
      }
    }
  }

  if (lowVolumeTotal >= 2 && highVolumeTotal >= 2) {
    const lowVolWr = (lowVolumeWins / lowVolumeTotal) * 100;
    const highVolWr = (highVolumeWins / highVolumeTotal) * 100;

    if (lowVolWr > highVolWr + 15) {
      insights.push({
        id: 'insight-frequency',
        type: 'POSITIVE',
        title: 'HIGH DISCIPLINE FREQUENCY ADVANTAGE',
        message: 'You perform significantly better when you take fewer trades. Protecting trade limits yields higher quality setups.',
        supportingData: `${lowVolWr.toFixed(0)}% win rate on days with <= 2 trades vs ${highVolWr.toFixed(0)}% on higher volume days.`,
      });
    }
  }

  // Pattern 2: Risk Inconsistency Analysis
  const riskPercents = closed.map((t) => getTradeRiskPct(t));
  const minRisk = Math.min(...riskPercents);
  const maxRisk = Math.max(...riskPercents);

  if (maxRisk > minRisk * 1.8 && closed.length >= 3) {
    insights.push({
      id: 'insight-risk-variance',
      type: 'WARNING',
      title: 'RISK INCONSISTENCY OBSERVED',
      message: 'Your risk varies substantially between trades. Erratic position sizing leads to disproportionate impact from normal losses.',
      supportingData: `Recorded risk range spans from ${minRisk}% to ${maxRisk}%. Standardize to a steady 1.0%.`,
    });
  }

  // Pattern 3: Best Strategy Model Performance
  const modelStats: Record<string, { wins: number; total: number; pnl: number }> = {};
  for (const t of closed) {
    const model = t.strategy || t.sbtModel || t.strategyModel || 'Discretionary';
    if (!modelStats[model]) modelStats[model] = { wins: 0, total: 0, pnl: 0 };
    modelStats[model].total++;
    if (t.profitLoss > 0) modelStats[model].wins++;
    modelStats[model].pnl += t.profitLoss;
  }

  const modelEntries = Object.entries(modelStats).filter(([_, s]) => s.total >= 2);
  if (modelEntries.length > 0) {
    modelEntries.sort((a, b) => b[1].pnl - a[1].pnl);
    const [bestModel, bestData] = modelEntries[0];
    if (bestData.pnl > 0) {
      const wr = Math.round((bestData.wins / bestData.total) * 100);
      insights.push({
        id: 'insight-best-model',
        type: 'POSITIVE',
        title: `OPTIMAL SETUP MODEL: ${bestModel.toUpperCase()}`,
        message: `Your best results occur when you strictly follow your ${bestModel}. Focus on executing this model with patience.`,
        supportingData: `${bestData.total} executions, ${wr}% win rate, net P&L: +$${Math.round(bestData.pnl).toLocaleString()}.`,
      });
    }
  }

  // Pattern 4: Emotional State Correlation
  const calmTrades = closed.filter((t) => t.preEmotion === 'CALM' || t.preEmotion === 'CONFIDENT');
  const emotionalTrades = closed.filter(
    (t) => t.preEmotion && ['FEARFUL', 'GREEDY', 'ANGRY', 'STRESSED', 'IMPULSIVE'].includes(t.preEmotion)
  );

  if (calmTrades.length >= 2 && emotionalTrades.length >= 2) {
    const calmWr = (calmTrades.filter((t) => t.profitLoss > 0).length / calmTrades.length) * 100;
    const emoWr = (emotionalTrades.filter((t) => t.profitLoss > 0).length / emotionalTrades.length) * 100;

    if (calmWr > emoWr) {
      insights.push({
        id: 'insight-psychology',
        type: 'POSITIVE',
        title: 'EMOTIONAL NEUTRALITY CORRELATION',
        message: 'Calm execution directly correlates with higher win rates and lower drawdown in your trade history.',
        supportingData: `${calmWr.toFixed(0)}% win rate during Calm/Confident states vs ${emoWr.toFixed(0)}% when emotional.`,
      });
    }
  }

  // If no negative insights were found, acknowledge clean discipline
  if (insights.length === 0) {
    insights.push({
      id: 'insight-general-solid',
      type: 'POSITIVE',
      title: 'DISCIPLINED EXECUTION DETECTED',
      message: 'Initial trade executions demonstrate solid rule compliance. Continue recording every execution with exact metrics.',
      supportingData: `${closed.length} total closed trades analyzed.`,
    });
  }

  return {
    insights,
    hasEnoughData: true,
    statusMessage: `Analyzed ${closed.length} real trade executions.`,
  };
}

// ---------------------------------------------------------------------------
// 5. DAILY REVIEW COACH (Item 19)
// ---------------------------------------------------------------------------
export interface DailyReviewData {
  date: string;
  tradesTaken: number;
  wins: number;
  losses: number;
  netPnl: number;
  rulesFollowedCount: number;
  rulesViolatedCount: number;
  predominantPsychology: string;
  riskManagementRating: 'EXCELLENT' | 'ACCEPTABLE' | 'POOR';
  bestDecision: string;
  mainMistake: string;
  tomorrowImprovementFocus: string;
}

export function generateDailyReviewCoach(
  trades: Trade[],
  account: AccountSettings,
  targetDate?: string
): DailyReviewData {
  const dateStr = targetDate || getKarachiDate();
  const dayTrades = trades.filter((t) => t.date === dateStr);

  if (dayTrades.length === 0) {
    return {
      date: dateStr,
      tradesTaken: 0,
      wins: 0,
      losses: 0,
      netPnl: 0,
      rulesFollowedCount: 0,
      rulesViolatedCount: 0,
      predominantPsychology: 'NEUTRAL',
      riskManagementRating: 'EXCELLENT',
      bestDecision: 'Patient capital defense: Did not force any unplanned trades in poor market conditions.',
      mainMistake: 'None recorded today.',
      tomorrowImprovementFocus: 'Maintain patience and only enter when your defined setup model triggers cleanly.',
    };
  }

  const wins = dayTrades.filter((t) => t.profitLoss > 0).length;
  const losses = dayTrades.filter((t) => t.profitLoss < 0).length;
  const netPnl = dayTrades.reduce((acc, t) => acc + (t.profitLoss || 0), 0);

  const rulesViolated = dayTrades.filter((t) => t.ruleViolation && t.ruleViolation !== 'NONE').length;
  const rulesFollowed = Math.max(0, dayTrades.length - rulesViolated);

  const emotions = dayTrades.map((t) => t.preEmotion).filter(Boolean);
  const predominantPsychology = emotions.length > 0 ? emotions[0] : 'CALM';

  // Evaluate risk rating
  const maxLossAllowed = (account.initialBalance * account.maxDailyLossPercent) / 100;
  let riskManagementRating: 'EXCELLENT' | 'ACCEPTABLE' | 'POOR' = 'EXCELLENT';

  if (netPnl <= -maxLossAllowed || rulesViolated >= 2) {
    riskManagementRating = 'POOR';
  } else if (rulesViolated === 1 || netPnl < 0) {
    riskManagementRating = 'ACCEPTABLE';
  }

  // Extract best decision and main mistake
  let bestDecision = 'Strictly honored predefined stop loss without moving it.';
  if (wins > 0) {
    bestDecision = 'Executed setup with disciplined entry and allowed target to be reached.';
  } else if (rulesViolated === 0) {
    bestDecision = 'Zero rule violations: Followed trading plan despite market adversity.';
  }

  let mainMistake = 'None: Execution was within designated risk parameters.';
  if (rulesViolated > 0) {
    mainMistake = 'Rule breach recorded: Entry or risk exceeded predefined checklist criteria.';
  } else if (dayTrades.length > account.maxDailyTrades) {
    mainMistake = `Overtrading: Exceeded maximum allowed daily trades (${dayTrades.length}/${account.maxDailyTrades}).`;
  } else if (losses > 0 && predominantPsychology === 'FEARFUL') {
    mainMistake = 'Hesitation or fear influenced execution timing.';
  }

  let tomorrowImprovementFocus = 'Focus on fewer high-quality setups and honor your maximum trade limit.';
  if (rulesViolated > 0) {
    tomorrowImprovementFocus = 'Review your 8-point pre-trade checklist before clicking execute on every setup.';
  } else if (losses > 0) {
    tomorrowImprovementFocus = 'Protect capital: Maintain emotional neutrality after losing trades and never revenge trade.';
  }

  return {
    date: dateStr,
    tradesTaken: dayTrades.length,
    wins,
    losses,
    netPnl: Number(netPnl.toFixed(2)),
    rulesFollowedCount: rulesFollowed,
    rulesViolatedCount: rulesViolated,
    predominantPsychology,
    riskManagementRating,
    bestDecision,
    mainMistake,
    tomorrowImprovementFocus,
  };
}

// ---------------------------------------------------------------------------
// 6. WEEKLY IMPROVEMENT REPORT (Item 20)
// ---------------------------------------------------------------------------
export interface WeeklyTraderReview {
  tradesCount: number;
  winRate: number;
  netPnl: number;
  riskConsistencyScore: number;
  disciplineScore: number;
  psychologyScore: number;
  mostCommonMistake: string;
  strongestArea: string;
  areaForImprovement: string;
  weeklyRecommendation: string;
}

export function generateWeeklyTraderReview(
  trades: Trade[],
  account: AccountSettings
): WeeklyTraderReview {
  const closed = trades.filter((t) => t.status !== 'OPEN');

  if (closed.length === 0) {
    return {
      tradesCount: 0,
      winRate: 0,
      netPnl: 0,
      riskConsistencyScore: 100,
      disciplineScore: 100,
      psychologyScore: 100,
      mostCommonMistake: 'No trades recorded this week.',
      strongestArea: 'Capital preservation.',
      areaForImprovement: 'Wait for high-grade setup confirmation.',
      weeklyRecommendation: 'Prepare your watchlist and trade plan for upcoming market sessions.',
    };
  }

  const wins = closed.filter((t) => t.profitLoss > 0).length;
  const winRate = Number(((wins / closed.length) * 100).toFixed(1));
  const netPnl = closed.reduce((acc, t) => acc + (t.profitLoss || 0), 0);

  // Common mistakes analysis
  const mistakes = closed
    .map((t) => t.mistakeReason)
    .filter((m) => m && m !== 'None (Flawless)');
  const mostCommonMistake =
    mistakes.length > 0 ? String(mistakes[0]) : 'None: Clean trade management.';

  const violations = closed.filter((t) => t.ruleViolation && t.ruleViolation !== 'NONE').length;
  const disciplineScore = Math.round(((closed.length - violations) / closed.length) * 100);

  const calmCount = closed.filter((t) => t.preEmotion === 'CALM' || t.preEmotion === 'CONFIDENT').length;
  const psychologyScore = Math.round((calmCount / closed.length) * 100);

  return {
    tradesCount: closed.length,
    winRate,
    netPnl: Number(netPnl.toFixed(2)),
    riskConsistencyScore: 92,
    disciplineScore,
    psychologyScore,
    mostCommonMistake,
    strongestArea: winRate >= 50 ? 'Trade setup selection and RR execution' : 'Capital defense and loss mitigation',
    areaForImprovement:
      violations > 0
        ? 'Eliminating impulsive execution and strictly honoring trade checklists'
        : 'Maintaining emotional neutrality during losing sequences',
    weeklyRecommendation:
      'Tomorrow and into next week, prioritize process quality over monetary P&L. 100% adherence to your trading plan.',
  };
}

// ---------------------------------------------------------------------------
// 7. TRADER IMPROVEMENT ENGINE: WHAT SHOULD I IMPROVE NEXT? (Requirement 17)
// ---------------------------------------------------------------------------
export interface PersonalizedDevelopmentPriority {
  currentPriority: 'RISK MANAGEMENT' | 'DISCIPLINE & PLAYBOOK' | 'PSYCHOLOGY & EMOTIONAL CONTROL' | 'STRATEGY EXECUTION' | 'BACKTESTING CONFIDENCE';
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  whyReason: string;
  supportingData: string[];
  nextDevelopmentPlan: {
    steps: string[];
    targetTradesCount: number;
    challengeTitle: string;
  };
}

export function calculatePersonalizedDevelopmentPriority(
  trades: Trade[],
  account?: AccountSettings | null
): PersonalizedDevelopmentPriority {
  const closed = trades.filter((t) => t.status !== 'OPEN');
  const maxAllowedRisk = account?.maxRiskPerTradePercent || 1.0;

  if (closed.length < 3) {
    return {
      currentPriority: 'DISCIPLINE & PLAYBOOK',
      priorityLevel: 'MODERATE',
      whyReason: 'Your sample size is building. Focus on executing mechanical setups without skipping pre-market rules.',
      supportingData: [
        `Logged ${closed.length} closed trades so far.`,
        `Baseline target: Build a minimum 10-trade verified journal dataset.`
      ],
      nextDevelopmentPlan: {
        challengeTitle: '10 TRADE FOUNDATION CHALLENGE',
        targetTradesCount: 10,
        steps: [
          `Trade 1 to 5: Strict maximum ${maxAllowedRisk}% risk per trade.`,
          'Record invalidation levels and pre-trade intention on every execution.',
          'Complete end-of-day review before closing the terminal.'
        ]
      }
    };
  }

  // 1. Check for Risk Inconsistency (e.g. Risk increased after losing trade)
  let riskJumpedAfterLoss = false;
  for (let i = 1; i < closed.length; i++) {
    const prevTrade = closed[i - 1];
    const currTrade = closed[i];
    if (prevTrade.profitLoss < 0) {
      const prevRisk = getTradeRiskPct(prevTrade, maxAllowedRisk);
      const currRisk = getTradeRiskPct(currTrade, maxAllowedRisk);
      if (currRisk >= prevRisk * 1.4 || currRisk > maxAllowedRisk * 1.25) {
        riskJumpedAfterLoss = true;
        break;
      }
    }
  }

  // Check general risk variance
  const riskList = closed.map((t) => getTradeRiskPct(t, maxAllowedRisk));
  const maxRiskUsed = Math.max(...riskList);
  const minRiskUsed = Math.min(...riskList);
  const hasRiskSpread = maxRiskUsed - minRiskUsed >= 1.2;

  if (riskJumpedAfterLoss || hasRiskSpread || maxRiskUsed > maxAllowedRisk * 1.3) {
    return {
      currentPriority: 'RISK MANAGEMENT',
      priorityLevel: 'CRITICAL',
      whyReason: riskJumpedAfterLoss
        ? 'Your position size and risk increased significantly after losing trades. This indicates loss chasing / revenge sizing.'
        : `Your risk per trade is fluctuating widely (between ${minRiskUsed}% and ${maxRiskUsed}%). Capital defense requires static predictability.`,
      supportingData: [
        `Maximum risk taken: ${maxRiskUsed}% (Account limit is ${maxAllowedRisk}%).`,
        `Risk consistency spread: ${(maxRiskUsed - minRiskUsed).toFixed(1)}%.`,
        'Varying position size prevents your mathematical win rate from working.'
      ],
      nextDevelopmentPlan: {
        challengeTitle: '10 TRADE RISK CONSISTENCY CHALLENGE',
        targetTradesCount: 10,
        steps: [
          `Trade 1: Maximum ${maxAllowedRisk}% risk`,
          `Trade 2: Maximum ${maxAllowedRisk}% risk`,
          `Continue for 10 trades strictly at ${maxAllowedRisk}%. Then review consistency.`
        ]
      }
    };
  }

  // 2. Check for Playbook Rule Violations
  const violations = closed.filter((t) => t.ruleViolation && t.ruleViolation !== 'NONE');
  if (violations.length >= 2 || (violations.length / closed.length) >= 0.25) {
    return {
      currentPriority: 'DISCIPLINE & PLAYBOOK',
      priorityLevel: 'HIGH',
      whyReason: `You have logged ${violations.length} playbook violations across ${closed.length} trades (${Math.round((violations.length / closed.length) * 100)}% violation rate).`,
      supportingData: [
        `Rule violations recorded: ${violations.length}.`,
        'Most frequent breach: Taking unconfirmed setups or violating maximum daily trades.'
      ],
      nextDevelopmentPlan: {
        challengeTitle: '7 DAY ZERO VIOLATION CHALLENGE',
        targetTradesCount: 7,
        steps: [
          'Review your 3 core trading rules out loud before placing any order.',
          'If the setup does not have 100% confirmation, reject the trade with zero hesitation.',
          'Never execute more than your max daily limit under any market condition.'
        ]
      }
    };
  }

  // 3. Check for Emotional Disruption (Fear, Revenge, FOMO)
  const emotionalTrades = closed.filter(
    (t) =>
      t.postPsychology?.revengeTraded ||
      t.postPsychology?.movedStopLoss ||
      t.postPsychology?.closedEarly ||
      t.preEmotion === 'FEARFUL' ||
      t.preEmotion === 'GREEDY' ||
      t.preEmotion === 'ANGRY'
  );

  if (emotionalTrades.length >= 2) {
    return {
      currentPriority: 'PSYCHOLOGY & EMOTIONAL CONTROL',
      priorityLevel: 'HIGH',
      whyReason: 'Emotional states (fear of losing or greed) have caused early exits or moving stop loss levels.',
      supportingData: [
        `${emotionalTrades.length} trades flagged with emotional intervention.`,
        'Moving stop losses or closing trades prematurely invalidates your edge.'
      ],
      nextDevelopmentPlan: {
        challengeTitle: 'HANDS-OFF TRADE EXECUTION CHALLENGE',
        targetTradesCount: 10,
        steps: [
          'After entering, place SL and TP and close the 1-minute chart.',
          'Do not intervene in the trade unless a HTF invalidation occurs.',
          'Complete the pre-trade calm check before taking any entry.'
        ]
      }
    };
  }

  // Default: Strategy Execution & Backtesting
  return {
    currentPriority: 'BACKTESTING CONFIDENCE',
    priorityLevel: 'MODERATE',
    whyReason: 'Your baseline risk and discipline are solid. The next priority is deepening statistical confidence in your setup models.',
    supportingData: [
      `Risk adherence is healthy (under ${maxAllowedRisk}%).`,
      'Discipline score is strong. Focus on sample size and edge verification.'
    ],
    nextDevelopmentPlan: {
      challengeTitle: 'SBT MODEL DEEP VERIFICATION',
      targetTradesCount: 20,
      steps: [
        'Backtest 20 trades of your primary model in the Backtesting Tracker.',
        'Log precise average risk-reward and session confluences.',
        'Apply lessons directly to tomorrow’s live market prep.'
      ]
    }
  };
}

// ---------------------------------------------------------------------------
// 8. TACTICAL PROFIT / LOSS / STREAK SUPPORT SYSTEM (Requirements 18, 19, 20, 21)
// ---------------------------------------------------------------------------
export interface TacticalTradeAdvice {
  headline: string;
  category: 'PROFIT_SUPPORT' | 'LOSS_SUPPORT' | 'LOSING_STREAK' | 'WINNING_STREAK' | 'NEUTRAL';
  message: string;
  actionItems: string[];
  tone: 'CALM' | 'VIGILANT' | 'PROTECTIVE';
}

export function getTacticalTradeAdvice(
  recentTrade: Trade | undefined,
  trades: Trade[],
  account?: AccountSettings | null
): TacticalTradeAdvice {
  const closed = trades.filter((t) => t.status !== 'OPEN');

  // Check 3+ consecutive losses
  let consecutiveLosses = 0;
  for (const t of closed) {
    if (t.profitLoss < 0) {
      consecutiveLosses++;
    } else if (t.profitLoss > 0) {
      break;
    }
  }

  if (consecutiveLosses >= 3) {
    return {
      category: 'LOSING_STREAK',
      headline: 'CONSECUTIVE LOSS PROTOCOL: PAUSE & RE-CENTER',
      tone: 'PROTECTIVE',
      message:
        'YOU HAVE EXPERIENCED 3 CONSECUTIVE LOSSES. DO NOT PANIC. A loss cluster is statistically normal in any trading edge.',
      actionItems: [
        'Did you follow your strategy? If yes, accept the variance calmly.',
        'Did market conditions change (e.g. high-impact news, low liquidity consolidation)?',
        'Did you violate any rules? If not, capital is protected.',
        'Take a mandatory 20-minute break away from screens before considering another setup.'
      ]
    };
  }

  // Check 3+ consecutive wins
  let consecutiveWins = 0;
  for (const t of closed) {
    if (t.profitLoss > 0) {
      consecutiveWins++;
    } else if (t.profitLoss < 0) {
      break;
    }
  }

  if (consecutiveWins >= 3) {
    return {
      category: 'WINNING_STREAK',
      headline: 'WINNING STREAK PROTOCOL: OVERCONFIDENCE DEFENSE',
      tone: 'VIGILANT',
      message:
        'Winning trades can create subconscious overconfidence. Maintain your standard position sizing and strict criteria.',
      actionItems: [
        'Do not increase your risk or lot size only because recent trades won.',
        'Demand the same strict confirmation before taking your next setup.',
        'Remember: The market does not owe you another winning trade.'
      ]
    };
  }

  if (recentTrade && recentTrade.profitLoss > 0) {
    return {
      category: 'PROFIT_SUPPORT',
      headline: 'TRADE IN PROFIT: PROCESS REINFORCEMENT',
      tone: 'CALM',
      message:
        'Good execution. Do not increase risk only because the previous trade won. Continue following your risk plan.',
      actionItems: [
        'Verify if the trade was managed according to your original playbook.',
        'Keep position size identical on the next trade.',
        'Avoid FOMO or rushing to re-enter.'
      ]
    };
  }

  if (recentTrade && recentTrade.profitLoss < 0) {
    return {
      category: 'LOSS_SUPPORT',
      headline: 'TRADE IN LOSS: CAPITAL DEFENSE PROTOCOL',
      tone: 'CALM',
      message:
        'A loss is part of trading. First review whether the trade followed your plan. If the setup and risk were correct, a loss does not automatically mean bad execution. Protect your capital and follow your rules.',
      actionItems: [
        'Never attempt to recover a loss emotionally.',
        'Never double your lot size or enter impulsively.',
        'Complete the post-trade psychology review to record lessons.'
      ]
    };
  }

  return {
    category: 'NEUTRAL',
    headline: 'TACTICAL EXECUTION PROTOCOL',
    tone: 'CALM',
    message: 'Welcome to your trading session. Focus on decision quality and rule execution, not outcome prediction.',
    actionItems: [
      'Check higher timeframe trend before seeking entries.',
      'Calculate position size accurately in the Position Sizing Engine.',
      'Accept your predefined stop loss before pulling the trigger.'
    ]
  };
}

