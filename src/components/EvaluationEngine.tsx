import React, { useMemo } from 'react';
import {
  ShieldCheck,
  Award,
  AlertTriangle,
  TrendingUp,
  Target,
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart3,
  Calendar,
  Clock,
  Compass,
} from 'lucide-react';
import { Trade, AccountSettings } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';

interface EvaluationEngineProps {
  trades: Trade[];
  account?: AccountSettings;
  onNavigateToTab?: (tab: string) => void;
}

export interface EvaluationMetrics {
  compositeScore: number; // 0 - 100
  tier: 'ELITE_OPERATOR' | 'CONSISTENT_TRADER' | 'DEVELOPING_TRADER';
  tierLabel: string;
  tierBadgeColor: string;
  riskDisciplineScore: number; // 0 - 25
  frequencyDisciplineScore: number; // 0 - 20
  strategyConsistencyScore: number; // 0 - 20
  emotionalStabilityScore: number; // 0 - 15
  expectancyScore: number; // 0 - 20
  riskCompliancePercent: number;
  frequencyCompliancePercent: number;
  planAdherencePercent: number;
  emotionalStabilityPercent: number;
  winRate: number;
  profitFactor: number;
  avgRMultiple: number;
  recommendations: Array<{
    title: string;
    description: string;
    targetTab: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'RISK' | 'PSYCHOLOGY' | 'STRATEGY' | 'DISCIPLINE';
  }>;
}

export const calculateEvaluationMetrics = (
  trades: Trade[],
  account?: AccountSettings
): EvaluationMetrics => {
  if (!trades || trades.length === 0) {
    return {
      compositeScore: 0,
      tier: 'DEVELOPING_TRADER',
      tierLabel: 'Awaiting Trade Executions',
      tierBadgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
      riskDisciplineScore: 0,
      frequencyDisciplineScore: 0,
      strategyConsistencyScore: 0,
      emotionalStabilityScore: 0,
      expectancyScore: 0,
      riskCompliancePercent: 100,
      frequencyCompliancePercent: 100,
      planAdherencePercent: 100,
      emotionalStabilityPercent: 100,
      winRate: 0,
      profitFactor: 0,
      avgRMultiple: 0,
      recommendations: [
        {
          title: 'Initiate Pre-Trade Workflow',
          description: 'Document your first planned execution using the 3-phase Pre-Trade Plan before entering the market.',
          targetTab: 'PRE_TRADE_PLAN',
          priority: 'HIGH',
          category: 'STRATEGY',
        },
      ],
    };
  }

  const totalTrades = trades.length;
  const initialBal = account?.initialBalance || 10000;
  const maxAllowedRisk = account?.maxRiskPerTradePercent || 1.0;

  // 1. Risk Discipline (25 max pts)
  let tradesWithinRisk = 0;
  let revengeOrOverleveragedCount = 0;

  trades.forEach((t) => {
    const riskPct = t.riskPercent ?? (t.riskAmount && initialBal > 0 ? (t.riskAmount / initialBal) * 100 : 1.0);
    if (riskPct <= maxAllowedRisk + 0.05) {
      tradesWithinRisk++;
    }
    if (t.postPsychology?.revengeTraded || t.postPsychology?.increasedLotSizeEmotionally || t.postPsychology?.movedStopLoss) {
      revengeOrOverleveragedCount++;
    }
  });

  const riskCompliancePercent = Math.round((tradesWithinRisk / totalTrades) * 100);
  const baseRiskScore = (tradesWithinRisk / totalTrades) * 20;
  const penalty = Math.min(5, (revengeOrOverleveragedCount / totalTrades) * 10);
  const riskDisciplineScore = Math.max(0, Math.min(25, Math.round(baseRiskScore + (5 - penalty))));

  // 2. Frequency Discipline - Max 2 Trades Per Day (20 max pts)
  const tradesByDate: Record<string, number> = {};
  trades.forEach((t) => {
    tradesByDate[t.date] = (tradesByDate[t.date] || 0) + 1;
  });

  const totalDays = Object.keys(tradesByDate).length || 1;
  let compliantDays = 0;
  Object.values(tradesByDate).forEach((count) => {
    if (count <= 2) compliantDays++;
  });

  const frequencyCompliancePercent = Math.round((compliantDays / totalDays) * 100);
  const frequencyDisciplineScore = Math.round((compliantDays / totalDays) * 20);

  // 3. Strategy Consistency (20 max pts)
  let followedPlanCount = 0;
  let highGradeCount = 0;

  trades.forEach((t) => {
    if (t.postPsychology?.followedPlan !== false) followedPlanCount++;
    if (t.grade === 'A+' || t.grade === 'A') highGradeCount++;
  });

  const planAdherencePercent = Math.round((followedPlanCount / totalTrades) * 100);
  const strategyConsistencyScore = Math.round(((followedPlanCount * 0.6 + highGradeCount * 0.4) / totalTrades) * 20);

  // 4. Emotional Stability (15 max pts)
  let calmEmotionalCount = 0;
  trades.forEach((t) => {
    const emotion = t.preEmotion;
    const isComposed = emotion === 'FOCUSED' || emotion === 'NEUTRAL';
    const noRuleViolations = !t.ruleViolation || t.ruleViolation === 'NONE';
    if (isComposed && noRuleViolations) calmEmotionalCount++;
  });

  const emotionalStabilityPercent = Math.round((calmEmotionalCount / totalTrades) * 100);
  const emotionalStabilityScore = Math.round((calmEmotionalCount / totalTrades) * 15);

  // 5. Expectancy & Edge Realism (20 max pts)
  const wins = trades.filter((t) => t.profitLoss > 0);
  const losses = trades.filter((t) => t.profitLoss < 0);
  const winRate = Math.round((wins.length / totalTrades) * 100);

  const grossProfit = wins.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.profitLoss, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 3.0 : 0.0;

  const totalR = trades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);
  const avgRMultiple = Number((totalR / totalTrades).toFixed(2));

  let expectancyScore = 0;
  if (profitFactor >= 2.0 && winRate >= 50) expectancyScore = 20;
  else if (profitFactor >= 1.5 && winRate >= 45) expectancyScore = 16;
  else if (profitFactor >= 1.2 && winRate >= 40) expectancyScore = 12;
  else if (profitFactor >= 1.0) expectancyScore = 8;
  else expectancyScore = 4;

  const compositeScore = Math.min(
    100,
    riskDisciplineScore + frequencyDisciplineScore + strategyConsistencyScore + emotionalStabilityScore + expectancyScore
  );

  let tier: EvaluationMetrics['tier'] = 'DEVELOPING_TRADER';
  let tierLabel = 'Developing Trader';
  let tierBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  if (compositeScore >= 80) {
    tier = 'ELITE_OPERATOR';
    tierLabel = 'Elite Institutional Operator';
    tierBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (compositeScore >= 60) {
    tier = 'CONSISTENT_TRADER';
    tierLabel = 'Consistent Disciplined Trader';
    tierBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  // Data-driven intelligent recommendations based on real journal flaws
  const recommendations: EvaluationMetrics['recommendations'] = [];

  if (riskCompliancePercent < 90) {
    recommendations.push({
      title: 'Enforce Strict 1% Max Risk Allocation',
      description: `${100 - riskCompliancePercent}% of trades exceeded the recommended 1% account risk. Use the Lot Size Calculator prior to entering.`,
      targetTab: 'LOT_SIZE',
      priority: 'HIGH',
      category: 'RISK',
    });
  }

  if (frequencyCompliancePercent < 85) {
    recommendations.push({
      title: 'Eliminate Overtrading: Cap at 2 Trades / Day',
      description: `Multiple days had 3 or more executed trades. Overtrading dilutes statistical edge. Engage Discipline Fatigue sessions.`,
      targetTab: 'PSYCHOLOGY',
      priority: 'HIGH',
      category: 'DISCIPLINE',
    });
  }

  if (emotionalStabilityPercent < 75 || revengeOrOverleveragedCount > 0) {
    recommendations.push({
      title: 'Revenge & Tilt Protection Protocol',
      description: `Detected ${revengeOrOverleveragedCount} instances of moved stop losses or emotional sizing. Review the Revenge Trading & Loss Aversion modules.`,
      targetTab: 'PSYCHOLOGY',
      priority: 'HIGH',
      category: 'PSYCHOLOGY',
    });
  }

  if (planAdherencePercent < 80) {
    recommendations.push({
      title: 'Complete Pre-Trade Plan Before Every Order',
      description: `Plan adherence is at ${planAdherencePercent}%. Completing Phase 1 (HTF Bias & Key Levels) eliminates impulsive entries.`,
      targetTab: 'PRE_TRADE_PLAN',
      priority: 'MEDIUM',
      category: 'STRATEGY',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Flawless Execution Routine Maintained',
      description: 'Your risk, frequency, and emotional metrics reflect institutional standards. Continue recording every setup.',
      targetTab: 'JOURNAL',
      priority: 'LOW',
      category: 'DISCIPLINE',
    });
  }

  return {
    compositeScore,
    tier,
    tierLabel,
    tierBadgeColor,
    riskDisciplineScore,
    frequencyDisciplineScore,
    strategyConsistencyScore,
    emotionalStabilityScore,
    expectancyScore,
    riskCompliancePercent,
    frequencyCompliancePercent,
    planAdherencePercent,
    emotionalStabilityPercent,
    winRate,
    profitFactor,
    avgRMultiple,
    recommendations,
  };
};

export const EvaluationEngine: React.FC<EvaluationEngineProps> = ({
  trades,
  account,
  onNavigateToTab,
}) => {
  const metrics = useMemo(() => calculateEvaluationMetrics(trades, account), [trades, account]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Elite Operator Composite Score */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Award className="w-6 h-6" />
              </span>
              <div>
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-amber-400">
                  INSTITUTIONAL AUDIT ENGINE
                </span>
                <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wider">
                  EVALUATION & COMPLIANCE SYSTEM
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Objective, data-driven evaluation computed strictly from your real journaled trades. Assesses risk discipline, 2-trade/day frequency, setup consistency, and psychological execution.
            </p>
          </div>

          {/* Composite Benchmark Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-5 shrink-0 shadow-inner">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    metrics.compositeScore >= 80
                      ? 'text-emerald-400'
                      : metrics.compositeScore >= 60
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }
                  strokeDasharray={`${metrics.compositeScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-military font-bold text-slate-100">
                  {metrics.compositeScore}
                </span>
                <span className="text-[9px] font-mono-code text-slate-400 uppercase">/ 100 PTS</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider">
                CURRENT OPERATOR STATUS
              </div>
              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-military font-bold border ${metrics.tierBadgeColor}`}>
                {metrics.tierLabel}
              </div>
              <div className="text-[11px] text-slate-400 font-mono-code">
                Based on {trades.length} recorded trade{trades.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Pillars Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Pillar 1: Risk Discipline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-code text-slate-400">1. RISK DISCIPLINE</span>
            <span className="font-bold text-amber-400 font-mono-code">{metrics.riskDisciplineScore} / 25</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${(metrics.riskDisciplineScore / 25) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-300 font-mono-code space-y-1">
            <div>Adherence: <strong>{metrics.riskCompliancePercent}%</strong></div>
            <div className="text-slate-400 text-[10px]">Rule: Max 1% per trade</div>
          </div>
        </div>

        {/* Pillar 2: Trading Frequency */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-code text-slate-400">2. FREQUENCY CAP</span>
            <span className="font-bold text-amber-400 font-mono-code">{metrics.frequencyDisciplineScore} / 20</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${(metrics.frequencyDisciplineScore / 20) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-300 font-mono-code space-y-1">
            <div>Compliant Days: <strong>{metrics.frequencyCompliancePercent}%</strong></div>
            <div className="text-slate-400 text-[10px]">Rule: Max 2 trades/day</div>
          </div>
        </div>

        {/* Pillar 3: Strategy Consistency */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-code text-slate-400">3. SETUP CONSISTENCY</span>
            <span className="font-bold text-amber-400 font-mono-code">{metrics.strategyConsistencyScore} / 20</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full"
              style={{ width: `${(metrics.strategyConsistencyScore / 20) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-300 font-mono-code space-y-1">
            <div>Plan Adherence: <strong>{metrics.planAdherencePercent}%</strong></div>
            <div className="text-slate-400 text-[10px]">Rule: Defined edge execution</div>
          </div>
        </div>

        {/* Pillar 4: Emotional Stability */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-code text-slate-400">4. EMOTIONAL STABILITY</span>
            <span className="font-bold text-amber-400 font-mono-code">{metrics.emotionalStabilityScore} / 15</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full"
              style={{ width: `${(metrics.emotionalStabilityScore / 15) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-300 font-mono-code space-y-1">
            <div>Composed State: <strong>{metrics.emotionalStabilityPercent}%</strong></div>
            <div className="text-slate-400 text-[10px]">Rule: Zero revenge or tilt</div>
          </div>
        </div>

        {/* Pillar 5: Expectancy */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-code text-slate-400">5. EXPECTANCY & EDGE</span>
            <span className="font-bold text-amber-400 font-mono-code">{metrics.expectancyScore} / 20</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${(metrics.expectancyScore / 20) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-300 font-mono-code space-y-1">
            <div>PF: <strong>{metrics.profitFactor}</strong> | WR: <strong>{metrics.winRate}%</strong></div>
            <div className="text-slate-400 text-[10px]">Avg R: {metrics.avgRMultiple}R</div>
          </div>
        </div>
      </div>

      {/* Intelligent Improvement Recommendations (Master Prompt Section 14) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-military font-bold text-slate-100 tracking-wider">
              INTELLIGENT IMPROVEMENT RECOMMENDATIONS
            </h2>
          </div>
          <span className="text-[11px] font-mono-code text-slate-400">
            Automated from real journal outcomes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/40 rounded-xl p-4 space-y-2 transition flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800">
                    {rec.category} • {rec.priority} PRIORITY
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{rec.title}</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {rec.description}
                </p>
              </div>

              {onNavigateToTab && (
                <div className="pt-2">
                  <button
                    onClick={() => onNavigateToTab(rec.targetTab)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono-code text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    <span>OPEN RECOMMENDED MODULE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
