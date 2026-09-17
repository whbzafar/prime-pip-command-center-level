import { Trade, TraderPerformanceScores, TradingSession, StrategyType, TradeGrade, EmotionState, AccountSettings } from '../types';
import { getKarachiDate, getKarachiEpoch, countTradesForPakistanDate, getCurrentPakistanDate } from './time';
import { safeNumber } from './currencyFormatter';

export interface DashboardMetrics {
  accountBalance: number;
  currentEquity: number;
  totalProfitLoss: number;
  returnPercent: number;
  winRate: number;
  riskRewardRatio: number;
  profitFactor: number;
  avgWinTrade: number;
  avgLossTrade: number;
  avgWinR: number;
  avgLossR: number;
  maxDrawdownAmount: number;
  maxDrawdownPercent: number;
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  totalTrades: number;
  tradesToday: number;
  weeklyProfitLoss: number;
  monthlyProfitLoss: number;
  performanceScores: TraderPerformanceScores;
}

export interface StrategyMetric {
  strategy: StrategyType;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfitLoss: number;
  avgR: number;
  profitFactor: number;
}

export interface SessionMetric {
  session: TradingSession;
  name: string;
  trades: number;
  wins: number;
  winRate: number;
  totalProfitLoss: number;
  avgR: number;
}

export interface PairMetric {
  instrument: string;
  trades: number;
  wins: number;
  winRate: number;
  totalProfitLoss: number;
  avgR: number;
}

export interface TimeframeMetric {
  timeframe: string;
  trades: number;
  wins: number;
  winRate: number;
  totalProfitLoss: number;
  avgR: number;
}

export interface PsychologyMetric {
  state: EmotionState;
  emoji: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfitLoss: number;
  avgR: number;
}

export interface MistakeMetric {
  reason: string;
  count: number;
  percentage: number;
  percentOfLosses: number;
  totalLoss: number;
  totalLost: number;
}

export interface GradeMetric {
  grade: TradeGrade;
  count: number;
  percentage: number;
  winRate: number;
  totalProfitLoss: number;
  profitContributionPercent: number;
}

export function calculateDashboardMetrics(
  trades: Trade[],
  initialBalanceOrAccount: number | AccountSettings = 100000
): DashboardMetrics {
  let startingBalance = 100000;
  if (typeof initialBalanceOrAccount === 'number') {
    startingBalance = safeNumber(initialBalanceOrAccount, 100000);
  } else if (initialBalanceOrAccount && typeof initialBalanceOrAccount === 'object') {
    startingBalance = safeNumber(initialBalanceOrAccount.initialBalance, 100000);
  }

  const totalTrades = trades.length;
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const openTrades = trades.filter((t) => t.status === 'OPEN');

  const totalClosedProfitLoss = closedTrades.reduce(
    (acc, t) => acc + safeNumber(t.profitLoss, 0),
    0
  );
  const floatingPnL = openTrades.reduce(
    (acc, t) => acc + safeNumber(t.floatingPnL ?? t.profitLoss, 0),
    0
  );

  const accountBalance = startingBalance + totalClosedProfitLoss;
  const currentEquity = accountBalance + floatingPnL;
  const totalProfitLoss = totalClosedProfitLoss;
  const returnPercent = startingBalance > 0 ? (totalProfitLoss / startingBalance) * 100 : 0;

  if (totalTrades === 0) {
    return {
      accountBalance: startingBalance,
      currentEquity: startingBalance,
      totalProfitLoss: 0,
      returnPercent: 0,
      winRate: 0,
      riskRewardRatio: 0,
      profitFactor: 0,
      avgWinTrade: 0,
      avgLossTrade: 0,
      avgWinR: 0,
      avgLossR: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      currentWinStreak: 0,
      currentLossStreak: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      totalTrades: 0,
      tradesToday: 0,
      weeklyProfitLoss: 0,
      monthlyProfitLoss: 0,
      performanceScores: {
        riskManagement: 100,
        psychology: 100,
        strategyExecution: 100,
        discipline: 100,
        consistency: 100,
        overallTradingScore: 100,
      },
    };
  }

  const sorted = [...trades].sort(
    (a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time)
  );

  const winningTrades = closedTrades.filter((t) => safeNumber(t.profitLoss, 0) > 0);
  const losingTrades = closedTrades.filter((t) => safeNumber(t.profitLoss, 0) < 0);

  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  const grossProfit = winningTrades.reduce((acc, t) => acc + safeNumber(t.profitLoss, 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + safeNumber(t.profitLoss, 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgWinTrade = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLossTrade = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

  const avgWinR =
    winningTrades.length > 0
      ? winningTrades.reduce((acc, t) => acc + safeNumber(t.rMultiple, 0), 0) / winningTrades.length
      : 0;
  const avgLossR =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce((acc, t) => acc + safeNumber(t.rMultiple, 0), 0) / losingTrades.length
        )
      : 1;
  const riskRewardRatio = avgLossR > 0 ? avgWinR / avgLossR : avgWinR;

  let peakBalance = startingBalance;
  let runningBalance = startingBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  let tempWin = 0;
  let tempLoss = 0;

  for (const trade of sorted) {
    runningBalance += trade.profitLoss;
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    const dd = peakBalance - runningBalance;
    const ddPct = peakBalance > 0 ? (dd / peakBalance) * 100 : 0;
    if (dd > maxDrawdownAmount) maxDrawdownAmount = dd;
    if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;

    if (trade.profitLoss > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > maxWinStreak) maxWinStreak = tempWin;
    } else if (trade.profitLoss < 0) {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
    }
  }

  const lastTrades = [...sorted].reverse();
  if (lastTrades.length > 0) {
    if (lastTrades[0].profitLoss > 0) {
      for (const t of lastTrades) {
        if (t.profitLoss > 0) currentWinStreak++;
        else break;
      }
    } else if (lastTrades[0].profitLoss < 0) {
      for (const t of lastTrades) {
        if (t.profitLoss < 0) currentLossStreak++;
        else break;
      }
    }
  }

  // Trades today based strictly on Pakistan Date (Asia/Karachi, UTC+5) — Issue #1
  const tradesToday = countTradesForPakistanDate(trades, getCurrentPakistanDate());

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const weeklyProfitLoss = trades
    .filter((t) => getKarachiEpoch(t.date, t.time) >= weekAgo)
    .reduce((acc, t) => acc + t.profitLoss, 0);

  const monthlyProfitLoss = trades
    .filter((t) => getKarachiEpoch(t.date, t.time) >= monthAgo)
    .reduce((acc, t) => acc + t.profitLoss, 0);

  const maxRiskViolations = trades.filter((t) => (t.riskAmount / startingBalance) > 0.015).length;
  const ddPenalty = Math.min(40, maxDrawdownPercent * 5);
  const rrBonus = Math.min(30, (riskRewardRatio / 2) * 30);
  const riskScore = Math.max(10, Math.min(100, Math.round(90 - maxRiskViolations * 15 - ddPenalty + rrBonus * 0.3)));

  let disciplinePoints = 100;
  const majorViolations = trades.filter((t) => t.ruleViolation === 'MAJOR').length;
  const minorViolations = trades.filter((t) => t.ruleViolation === 'MINOR').length;
  disciplinePoints -= majorViolations * 20 + minorViolations * 8;
  const disciplineScore = Math.max(15, Math.min(100, Math.round(disciplinePoints)));

  const avgAlignment =
    trades.reduce((acc, t) => acc + (t.alignmentScore?.totalQuality || 75), 0) / totalTrades;
  const strategyScore = Math.max(20, Math.min(100, Math.round(avgAlignment)));

  let psychScore = 90;
  const badEmotions = trades.filter((t) => ['FEARFUL', 'ANGRY', 'GREEDY', 'STRESSED'].includes(t.preEmotion)).length;
  const revengeCount = trades.filter((t) => t.postPsychology?.revengeTraded || t.postPsychology?.overtraded).length;
  const earlyExits = trades.filter((t) => t.postPsychology?.closedEarly).length;
  psychScore -= (badEmotions / totalTrades) * 30 + revengeCount * 15 + earlyExits * 5;
  const psychologyScore = Math.max(20, Math.min(100, Math.round(psychScore)));

  const consistencyScore = Math.max(
    25,
    Math.min(
      100,
      Math.round(
        (winRate > 40 ? 40 : winRate) +
          Math.min(30, profitFactor * 10) +
          (maxLossStreak <= 2 ? 30 : Math.max(5, 30 - (maxLossStreak - 2) * 10))
      )
    )
  );

  const overallTradingScore = Math.round(
    riskScore * 0.25 +
      disciplineScore * 0.25 +
      strategyScore * 0.20 +
      psychologyScore * 0.15 +
      consistencyScore * 0.15
  );

  return {
    accountBalance,
    currentEquity,
    totalProfitLoss,
    returnPercent,
    winRate,
    riskRewardRatio,
    profitFactor,
    avgWinTrade,
    avgLossTrade,
    avgWinR,
    avgLossR,
    maxDrawdownAmount,
    maxDrawdownPercent,
    currentWinStreak,
    currentLossStreak,
    maxWinStreak,
    maxLossStreak,
    totalTrades,
    tradesToday,
    weeklyProfitLoss,
    monthlyProfitLoss,
    performanceScores: {
      riskManagement: riskScore,
      psychology: psychologyScore,
      strategyExecution: strategyScore,
      discipline: disciplineScore,
      consistency: consistencyScore,
      overallTradingScore,
    },
  };
}

export function calculateStrategyMetrics(trades: Trade[]): StrategyMetric[] {
  const map: Record<string, { trades: number; wins: number; losses: number; pnl: number; rSum: number; grossProfit: number; grossLoss: number }> = {};

  for (const t of trades) {
    const s = t.strategy;
    if (!map[s]) {
      map[s] = { trades: 0, wins: 0, losses: 0, pnl: 0, rSum: 0, grossProfit: 0, grossLoss: 0 };
    }
    map[s].trades++;
    map[s].pnl += t.profitLoss;
    map[s].rSum += t.rMultiple || 0;
    if (t.profitLoss > 0) {
      map[s].wins++;
      map[s].grossProfit += t.profitLoss;
    } else if (t.profitLoss < 0) {
      map[s].losses++;
      map[s].grossLoss += Math.abs(t.profitLoss);
    }
  }

  return Object.keys(map).map((k) => {
    const item = map[k];
    const winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
    const avgR = item.trades > 0 ? item.rSum / item.trades : 0;
    const pf = item.grossLoss > 0 ? item.grossProfit / item.grossLoss : item.grossProfit > 0 ? 99 : 0;
    return {
      strategy: k as StrategyType,
      trades: item.trades,
      wins: item.wins,
      losses: item.losses,
      winRate: Math.round(winRate),
      totalProfitLoss: item.pnl,
      avgR: Number(avgR.toFixed(1)),
      profitFactor: Number(pf.toFixed(2)),
    };
  }).sort((a, b) => b.totalProfitLoss - a.totalProfitLoss);
}

export function calculateSessionMetrics(trades: Trade[]): SessionMetric[] {
  if (trades.length === 0) return [];

  const sessions: Record<TradingSession, { name: string; trades: number; wins: number; pnl: number; rSum: number }> = {
    LONDON: { name: 'London Session (07:00 - 15:00 GMT)', trades: 0, wins: 0, pnl: 0, rSum: 0 },
    NEW_YORK: { name: 'New York Session (13:00 - 21:00 GMT)', trades: 0, wins: 0, pnl: 0, rSum: 0 },
    ASIAN: { name: 'Asian Session (00:00 - 08:00 GMT)', trades: 0, wins: 0, pnl: 0, rSum: 0 },
    LONDON_NY_OVERLAP: { name: 'London/NY Overlap (13:00 - 16:00 GMT)', trades: 0, wins: 0, pnl: 0, rSum: 0 },
  };

  for (const t of trades) {
    const s = t.session || 'LONDON';
    if (sessions[s]) {
      sessions[s].trades++;
      sessions[s].pnl += t.profitLoss;
      sessions[s].rSum += t.rMultiple || 0;
      if (t.profitLoss > 0) sessions[s].wins++;
    }
  }

  return (Object.keys(sessions) as TradingSession[])
    .map((key) => {
      const s = sessions[key];
      const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
      const avgR = s.trades > 0 ? s.rSum / s.trades : 0;
      return {
        session: key,
        name: s.name,
        trades: s.trades,
        wins: s.wins,
        winRate: Math.round(winRate),
        totalProfitLoss: s.pnl,
        avgR: Number(avgR.toFixed(1)),
      };
    })
    .filter((s) => s.trades > 0)
    .sort((a, b) => b.totalProfitLoss - a.totalProfitLoss);
}

export function calculatePairMetrics(trades: Trade[]): PairMetric[] {
  if (trades.length === 0) return [];
  const map: Record<string, { trades: number; wins: number; pnl: number; rSum: number }> = {};
  for (const t of trades) {
    const p = t.instrument;
    if (!map[p]) map[p] = { trades: 0, wins: 0, pnl: 0, rSum: 0 };
    map[p].trades++;
    map[p].pnl += t.profitLoss;
    map[p].rSum += t.rMultiple || 0;
    if (t.profitLoss > 0) map[p].wins++;
  }

  return Object.keys(map).map((p) => {
    const item = map[p];
    const winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
    const avgR = item.trades > 0 ? item.rSum / item.trades : 0;
    return {
      instrument: p,
      trades: item.trades,
      wins: item.wins,
      winRate: Math.round(winRate),
      totalProfitLoss: item.pnl,
      avgR: Number(avgR.toFixed(1)),
    };
  }).sort((a, b) => b.totalProfitLoss - a.totalProfitLoss);
}

export function calculateTimeframeMetrics(trades: Trade[]): TimeframeMetric[] {
  if (trades.length === 0) return [];
  const map: Record<string, { trades: number; wins: number; pnl: number; rSum: number }> = {};
  for (const t of trades) {
    const tf = t.timeframe;
    if (!map[tf]) map[tf] = { trades: 0, wins: 0, pnl: 0, rSum: 0 };
    map[tf].trades++;
    map[tf].pnl += t.profitLoss;
    map[tf].rSum += t.rMultiple || 0;
    if (t.profitLoss > 0) map[tf].wins++;
  }

  return Object.keys(map).map((tf) => {
    const item = map[tf];
    const winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
    const avgR = item.trades > 0 ? item.rSum / item.trades : 0;
    return {
      timeframe: tf,
      trades: item.trades,
      wins: item.wins,
      winRate: Math.round(winRate),
      totalProfitLoss: item.pnl,
      avgR: Number(avgR.toFixed(1)),
    };
  }).sort((a, b) => b.totalProfitLoss - a.totalProfitLoss);
}

export function calculatePsychologyMetrics(trades: Trade[]): PsychologyMetric[] {
  if (trades.length === 0) return [];
  const emotionConfig: { state: EmotionState; emoji: string; label: string }[] = [
    { state: 'CALM', emoji: '😌', label: 'Calm' },
    { state: 'DISCIPLINED', emoji: '🎯', label: 'Disciplined' },
    { state: 'CONFIDENT', emoji: '😎', label: 'Confident' },
    { state: 'NEUTRAL', emoji: '😐', label: 'Neutral' },
    { state: 'EXCITED', emoji: '🔥', label: 'Excited' },
    { state: 'HESITANT', emoji: '🤔', label: 'Hesitant' },
    { state: 'TIRED', emoji: '😴', label: 'Tired' },
    { state: 'FEARFUL', emoji: '😨', label: 'Fearful' },
    { state: 'ANXIOUS', emoji: '😰', label: 'Anxious' },
    { state: 'STRESSED', emoji: '😓', label: 'Stressed' },
    { state: 'FRUSTRATED', emoji: '😖', label: 'Frustrated' },
    { state: 'GREEDY', emoji: '🤑', label: 'Greedy' },
    { state: 'ANGRY', emoji: '😤', label: 'Angry' },
    { state: 'FOMO', emoji: '⚡', label: 'FOMO' },
    { state: 'REVENGE', emoji: '💀', label: 'Revenge' },
  ];

  return emotionConfig
    .map((cfg) => {
      const emoTrades = trades.filter((t) => t.preEmotion === cfg.state);
      const count = emoTrades.length;
      const wins = emoTrades.filter((t) => t.profitLoss > 0).length;
      const losses = emoTrades.filter((t) => t.profitLoss < 0).length;
      const winRate = count > 0 ? Math.round((wins / count) * 100) : 0;
      const totalProfitLoss = emoTrades.reduce((acc, t) => acc + t.profitLoss, 0);
      const rSum = emoTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);
      const avgR = count > 0 ? Number((rSum / count).toFixed(1)) : 0;

      return {
        state: cfg.state,
        emoji: cfg.emoji,
        label: cfg.label,
        trades: count,
        wins,
        losses,
        winRate,
        totalProfitLoss,
        avgR,
      };
    })
    .filter((e) => e.trades > 0);
}

export function calculateMistakeMetrics(trades: Trade[]): MistakeMetric[] {
  if (trades.length === 0) return [];
  const losingTrades = trades.filter((t) => t.profitLoss < 0 || t.mistakeReason !== 'None (Flawless)');
  const map: Record<string, { count: number; loss: number }> = {};

  for (const t of losingTrades) {
    const r = t.mistakeReason || 'Unclassified';
    if (r === 'None (Flawless)') continue;
    if (!map[r]) map[r] = { count: 0, loss: 0 };
    map[r].count++;
    map[r].loss += Math.abs(t.profitLoss);
  }

  const totalCount = Object.values(map).reduce((acc, v) => acc + v.count, 0);

  return Object.keys(map).map((reason) => {
    const c = map[reason].count;
    const pct = totalCount > 0 ? Math.round((c / totalCount) * 100) : 0;
    const loss = map[reason].loss;
    return {
      reason,
      count: c,
      percentage: pct,
      percentOfLosses: pct,
      totalLoss: loss,
      totalLost: loss,
    };
  }).sort((a, b) => b.count - a.count);
}

export function calculateGradeMetrics(trades: Trade[]): GradeMetric[] {
  if (trades.length === 0) return [];
  const grades: TradeGrade[] = ['A+', 'A', 'B', 'C', 'F'];
  const totalTrades = trades.length;
  const netProfit = trades.reduce((acc, t) => acc + Math.max(0, t.profitLoss), 0);

  return grades.map((g) => {
    const gTrades = trades.filter((t) => t.grade === g);
    const count = gTrades.length;
    const wins = gTrades.filter((t) => t.profitLoss > 0).length;
    const pnl = gTrades.reduce((acc, t) => acc + t.profitLoss, 0);
    const winRate = count > 0 ? (wins / count) * 100 : 0;
    const grossPnl = gTrades.filter((t) => t.profitLoss > 0).reduce((acc, t) => acc + t.profitLoss, 0);
    const profitContribution = netProfit > 0 ? (grossPnl / netProfit) * 100 : 0;

    return {
      grade: g,
      count,
      percentage: totalTrades > 0 ? Math.round((count / totalTrades) * 100) : 0,
      winRate: Math.round(winRate),
      totalProfitLoss: pnl,
      profitContributionPercent: Math.round(profitContribution),
    };
  }).filter((gm) => gm.count > 0);
}
