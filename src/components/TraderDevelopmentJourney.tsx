import React from 'react';
import {
  Award,
  TrendingUp,
  ShieldCheck,
  Brain,
  Crosshair,
  FlaskConical,
  Sparkles,
  CheckCircle2,
  Layers,
  Milestone,
  ArrowRight,
  Shield,
  BarChart2,
} from 'lucide-react';
import { Trade, AccountSettings, TraderPerformanceScores } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';

interface TraderDevelopmentJourneyProps {
  account: AccountSettings | null;
  trades: Trade[];
  scores?: TraderPerformanceScores;
}

interface JourneyPhase {
  phase: number;
  title: string;
  subtitle: string;
  focus: string;
  isUnlocked: boolean;
  isCurrent: boolean;
  completionRate: number; // 0-100%
  criteria: string;
}

export const TraderDevelopmentJourney: React.FC<TraderDevelopmentJourneyProps> = ({
  account,
  trades = [],
  scores,
}) => {
  const tradeCount = trades.length;
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const disciplineScore = scores?.discipline ?? 75;
  const riskScore = scores?.riskManagement ?? 80;
  const psychScore = scores?.psychology ?? 70;
  const consistencyScore = scores?.consistency ?? 65;
  const strategyScore = scores?.strategyExecution ?? 78;

  // Determine current phase based on data
  // Phase 1: Learning Rules (First 5 trades logged & rules established)
  // Phase 2: Consistent Risk Management (Risk per trade within limits across 10 trades)
  // Phase 3: Emotional Control (No revenge trades, post-psychology completed)
  // Phase 4: Execution Consistency (20+ disciplined trades, win/loss handled calmly)
  // Phase 5: Long-Term Edge (Consistent process score > 80 across all dimensions)

  const isPhase1Done = tradeCount >= 5;
  const isPhase2Done = isPhase1Done && riskScore >= 75 && tradeCount >= 10;
  const isPhase3Done = isPhase2Done && psychScore >= 75 && tradeCount >= 15;
  const isPhase4Done = isPhase3Done && consistencyScore >= 75 && tradeCount >= 20;
  const isPhase5Done = isPhase4Done && disciplineScore >= 80;

  const phases: JourneyPhase[] = [
    {
      phase: 1,
      title: 'Phase 1: Foundation & Playbook Rules',
      subtitle: 'Learning Rules & Mechanical Journaling',
      focus: 'Record every trade, understand invalidation levels, and follow pre-trade checklist.',
      isUnlocked: true,
      isCurrent: !isPhase1Done,
      completionRate: Math.min(100, Math.round((tradeCount / 5) * 100)),
      criteria: 'Log first 5 verified trades with strict Stop Loss & Playbook tagging.',
    },
    {
      phase: 2,
      title: 'Phase 2: Capital Defense & Sizing',
      subtitle: 'Consistent Risk Management',
      focus: 'Eliminate over-leveraging. Ensure risk never exceeds 1% of account capital.',
      isUnlocked: isPhase1Done,
      isCurrent: isPhase1Done && !isPhase2Done,
      completionRate: isPhase1Done ? Math.min(100, Math.round((riskScore / 80) * 100)) : 0,
      criteria: 'Maintain Risk Score >= 75% and zero max daily loss breaches.',
    },
    {
      phase: 3,
      title: 'Phase 3: Psychological Fortitude',
      subtitle: 'Emotional Control & Neutrality',
      focus: 'Accept losses as business expenses. Completely eliminate revenge trading and FOMO.',
      isUnlocked: isPhase2Done,
      isCurrent: isPhase2Done && !isPhase3Done,
      completionRate: isPhase2Done ? Math.min(100, Math.round((psychScore / 80) * 100)) : 0,
      criteria: 'Complete Pre & Post-Trade psychology reviews on at least 15 trades.',
    },
    {
      phase: 4,
      title: 'Phase 4: Flawless Execution',
      subtitle: 'Execution Consistency',
      focus: 'Execute without hesitation when setup appears; stay completely out when it does not.',
      isUnlocked: isPhase3Done,
      isCurrent: isPhase3Done && !isPhase4Done,
      completionRate: isPhase3Done ? Math.min(100, Math.round((consistencyScore / 80) * 100)) : 0,
      criteria: 'Execute 20+ trades with identical position sizing and patience.',
    },
    {
      phase: 5,
      title: 'Phase 5: Mastery & Compounding',
      subtitle: 'Long-Term Statistical Edge',
      focus: 'Sustain process mastery over hundreds of sample trades. Compound capital systematically.',
      isUnlocked: isPhase4Done,
      isCurrent: isPhase4Done,
      completionRate: isPhase4Done ? Math.min(100, Math.round((disciplineScore / 85) * 100)) : 0,
      criteria: 'Overall Discipline Score sustained above 80/100 across 30+ trades.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
            <Milestone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-amber-300 border border-blue-500/30 uppercase tracking-wider">
                LONG-TERM MASTERY ARCHITECTURE
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                PROFIT FLUCTUATES • MASTERY ACCUMULATES
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
              MY TRADER DEVELOPMENT JOURNEY
            </h2>
            <p className="text-xs text-slate-400">
              Tracking real evolutionary growth in discipline, risk defense, and emotional control over time.
            </p>
          </div>
        </div>

        <div className="text-right font-mono-code text-xs">
          <span className="text-slate-400">CURRENT STATUS:</span>
          <div className="text-cyan-400 font-bold font-military text-sm mt-0.5">
            {phases.find((p) => p.isCurrent)?.title || 'Phase 1: Foundation'}
          </div>
        </div>
      </div>

      {/* Core Pillar Scores (Not just profit!) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Discipline</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-military text-emerald-400">{disciplineScore}%</div>
          <p className="text-[10px] text-slate-500">Playbook & limit adherence</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Risk Defense</span>
            <Crosshair className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-military text-cyan-400">{riskScore}%</div>
          <p className="text-[10px] text-slate-500">Position sizing consistency</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Psychology</span>
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-military text-purple-400">{psychScore}%</div>
          <p className="text-[10px] text-slate-500">Emotional neutrality & check-ins</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Consistency</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-military text-sky-400">{consistencyScore}%</div>
          <p className="text-[10px] text-slate-500">Repeatable execution habits</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Strategy Setup</span>
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-military text-slate-100">{strategyScore}%</div>
          <p className="text-[10px] text-slate-500">Confirmation & edge patience</p>
        </div>
      </div>

      {/* 5-Phase Evolutionary Roadmap */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-military font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>THE 5 PHASES OF TRADER DEVELOPMENT</span>
          </h3>
          <span className="text-[11px] font-mono-code text-slate-400">STAGE PROGRESSION</span>
        </div>

        <div className="space-y-3">
          {phases.map((phase) => (
            <div
              key={phase.phase}
              className={`p-4 rounded-xl border transition ${
                phase.isCurrent
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-lg'
                  : phase.isUnlocked
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-slate-950/30 border-slate-900 opacity-50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-military font-bold text-sm shrink-0 mt-0.5 ${
                      phase.isCurrent
                        ? 'bg-blue-500 text-slate-950 shadow-md'
                        : phase.isUnlocked
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {phase.phase}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-military font-bold text-slate-100">
                        {phase.title}
                      </h4>
                      {phase.isCurrent && (
                        <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500 text-slate-950 animate-pulse">
                          ACTIVE FOCUS
                        </span>
                      )}
                      {phase.isUnlocked && !phase.isCurrent && (
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono-code text-slate-300 mt-1">
                      {phase.focus}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono-code">
                      Milestone Requirement: <span className="text-slate-200">{phase.criteria}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-48 text-right font-mono-code">
                  <div className="text-xs text-slate-400 flex justify-between sm:justify-end gap-2 mb-1">
                    <span>Progress:</span>
                    <span className="font-bold text-slate-200">{phase.completionRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        phase.isCurrent
                          ? 'bg-cyan-400'
                          : phase.isUnlocked
                          ? 'bg-emerald-400'
                          : 'bg-slate-700'
                      }`}
                      style={{ width: `${phase.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Process Reinforcement Callout */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-cyan-400 shrink-0" />
        <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
          <strong>Process Over Outcome:</strong> A losing trade with perfect risk and textbook setup execution
          moves you <em>closer</em> to long-term profitability than an impulsive winning trade. Trust your process
          and review your discipline scores daily.
        </p>
      </div>
    </div>
  );
};
