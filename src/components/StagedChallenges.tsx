import React, { useState, useMemo } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Milestone,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Zap,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { AccountSettings, Trade } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { playDisciplineAlert } from '../utils/audioAlerts';

interface StagedChallengesProps {
  account: AccountSettings | null;
  trades: Trade[];
  onOpenNewTrade?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface ChallengeDefinition {
  id: 'FOUNDATION_10' | 'FORTITUDE_20' | 'MASTERY_30';
  level: number;
  title: string;
  tagline: string;
  description: string;
  targetTradesCount: number;
  rules: {
    title: string;
    description: string;
    metric: string;
  }[];
  badgeTitle: string;
  badgeDescription: string;
}

const CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'FOUNDATION_10',
    level: 1,
    title: '10-Trade Foundation Challenge',
    tagline: 'Institutional Mechanical Execution & Capital Defense',
    description:
      'Execute 10 consecutive trades adhering strictly to institutional risk and preparation standards. Profit is irrelevant—only mechanical discipline counts.',
    targetTradesCount: 10,
    rules: [
      {
        title: 'Strict 1% Maximum Risk',
        description: 'Never risk more than 1.0% of account balance on any single execution.',
        metric: 'Risk <= 1.0%',
      },
      {
        title: 'Non-Negotiable Stop Loss',
        description: 'Every trade must have a protective stop loss entered at inception that is NEVER moved or widened.',
        metric: 'SL Placed & Respected',
      },
      {
        title: 'Max 2 Trades Per Day',
        description: 'Strictly respect the daily lockout. No more than 2 trades in a single calendar day.',
        metric: '<= 2 Trades/Day',
      },
      {
        title: 'Pre-Trade Plan Required',
        description: 'Market preparation, higher timeframe bias, and economic news verification before entry.',
        metric: 'Pre-Trade Check Completed',
      },
      {
        title: 'Post-Trade Diagnostic Review',
        description: 'Record actual outcome and diagnose whether execution followed the rulebook.',
        metric: 'Review Logged',
      },
    ],
    badgeTitle: 'Foundation Certified Trader',
    badgeDescription: 'Successfully executed 10 consecutive trades with institutional mechanical discipline.',
  },
  {
    id: 'FORTITUDE_20',
    level: 2,
    title: '20-Trade Risk Fortitude Challenge',
    tagline: 'Drawdown Resilience & Zero-Tilt Mastery',
    description:
      'Maintain composure, prevent revenge trading, and respect asymmetric risk-to-reward ratios across 20 consecutive trades.',
    targetTradesCount: 20,
    rules: [
      {
        title: 'Zero Tilt / Revenge Trades',
        description: 'Never re-enter within 15 minutes of a losing trade. Completely eliminate emotional retaliation.',
        metric: 'No Revenge Entries',
      },
      {
        title: 'Minimum 1:1.5 Risk-to-Reward on Wins',
        description: 'Winning trades must hit at least 1.5R to maintain mathematical positive expected value.',
        metric: 'R:R >= 1:1.5',
      },
      {
        title: 'Max Daily Drawdown Respected',
        description: 'Never hit or breach the account max daily loss limit (3%).',
        metric: 'Max 3% Daily DD',
      },
      {
        title: 'News Window Protection',
        description: 'No new orders within 15 minutes before or after high-impact economic calendar events.',
        metric: 'Red News Avoided',
      },
    ],
    badgeTitle: 'Fortitude Master',
    badgeDescription: 'Demonstrated emotional neutrality and positive mathematical expectancy across 20 trades.',
  },
  {
    id: 'MASTERY_30',
    level: 3,
    title: '30-Trade Execution Consistency Mastery',
    tagline: 'Elite Playbook Alignment & Statistical Edge',
    description:
      'Execute 30 trades with flawless playbook alignment, disciplined position sizing, and complete psychological equilibrium.',
    targetTradesCount: 30,
    rules: [
      {
        title: 'Higher Timeframe Directional Confluence',
        description: 'Every trade must align with 4H or Daily structural order flow.',
        metric: 'HTF Trend Aligned',
      },
      {
        title: 'Institutional Entry Model',
        description: 'Strictly enter on confirmed Liquidity Sweeps, Order Blocks, or Fair Value Gaps.',
        metric: 'SBT Model Entry',
      },
      {
        title: 'Exact Mathematical Position Sizing',
        description: 'Lot size calculated precisely using the calculator—no guessing or arbitrary numbers.',
        metric: 'Formulaic Lots',
      },
      {
        title: 'Discipline Score >= 85/100',
        description: 'Maintain an average discipline score of 85 or above throughout the 30-trade series.',
        metric: 'Discipline Score >= 85',
      },
    ],
    badgeTitle: 'PRIMEPIPFX Master Trader',
    badgeDescription: 'Mastered institutional trading standards across 30 consecutive flawless executions.',
  },
];

export const StagedChallenges: React.FC<StagedChallengesProps> = ({
  account,
  trades = [],
  onOpenNewTrade,
  onNavigateToTab,
}) => {
  const [selectedChallengeId, setSelectedChallengeId] = useState<'FOUNDATION_10' | 'FORTITUDE_20' | 'MASTERY_30'>(
    'FOUNDATION_10'
  );

  const activeChallenge = useMemo(
    () => CHALLENGES.find((c) => c.id === selectedChallengeId) || CHALLENGES[0],
    [selectedChallengeId]
  );

  // Storage key for manual/override slots or progress tracking
  const challengeStorageKey = `primepipfx_challenge_${account?.id || 'default'}_${selectedChallengeId}`;

  const [overrides, setOverrides] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(challengeStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read challenge state', e);
    }
    return {};
  });

  const handleToggleSlot = (slotNumber: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [slotNumber]: !prev[slotNumber] };
      localStorage.setItem(challengeStorageKey, JSON.stringify(next));
      if (next[slotNumber]) {
        playDisciplineAlert('CHIME');
      }
      return next;
    });
  };

  const handleResetChallenge = () => {
    if (window.confirm(`Reset progress for ${activeChallenge.title}?`)) {
      setOverrides({});
      localStorage.removeItem(challengeStorageKey);
    }
  };

  // Evaluate the recent closed trades for the challenge slots
  const closedTrades = useMemo(() => {
    return [...trades]
      .filter((t) => t.status !== 'OPEN')
      .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());
  }, [trades]);

  // Compute status for each slot (1 to targetTradesCount)
  const slotsData = useMemo(() => {
    const total = activeChallenge.targetTradesCount;
    return Array.from({ length: total }, (_, i) => {
      const slotNum = i + 1;
      const trade = closedTrades[i]; // Corresponding trade if available
      const isManuallyChecked = overrides[slotNum] === true;

      if (isManuallyChecked) {
        return {
          slotNumber: slotNum,
          status: 'COMPLETED',
          trade,
          reason: 'Verified clean execution by trader',
        };
      }

      if (!trade) {
        return {
          slotNumber: slotNum,
          status: 'PENDING',
          trade: undefined,
          reason: 'Awaiting execution',
        };
      }

      // Automated check on trade parameters
      const maxAllowedRisk = (account?.initialBalance || 10000) * 0.01;
      const tradeRisk = trade.riskAmount || 0;
      const isRiskCompliant = tradeRisk <= maxAllowedRisk * 1.05; // 5% tolerance
      const isRuleCompliant = !trade.ruleViolation || trade.ruleViolation === 'NONE';

      if (isRiskCompliant && isRuleCompliant) {
        return {
          slotNumber: slotNum,
          status: 'COMPLETED',
          trade,
          reason: `Passed: ${trade.instrument} (${trade.date}) — Risk & Rules respected`,
        };
      } else {
        return {
          slotNumber: slotNum,
          status: 'BREACHED',
          trade,
          reason: `Breach on ${trade.instrument}: ${!isRiskCompliant ? 'Risk exceeded 1%' : trade.ruleViolation}`,
        };
      }
    });
  }, [activeChallenge, closedTrades, overrides, account]);

  const completedCount = slotsData.filter((s) => s.status === 'COMPLETED').length;
  const breachedCount = slotsData.filter((s) => s.status === 'BREACHED').length;
  const progressPercent = Math.round((completedCount / activeChallenge.targetTradesCount) * 100);
  const isChallengeCompleted = completedCount >= activeChallenge.targetTradesCount;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                STAGED MASTERY CHALLENGES
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                LEVEL 0{activeChallenge.level}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
              {activeChallenge.title}
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              {activeChallenge.description}
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase block">
              PROGRESS
            </span>
            <span className="text-lg font-mono-code font-bold text-amber-400">
              {completedCount} / {activeChallenge.targetTradesCount}
            </span>
            <span className="text-[10px] font-mono-code text-slate-500 block">
              {progressPercent}% Complete
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetChallenge}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Reset Challenge Progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Challenge Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CHALLENGES.map((challenge) => {
          const isSelected = challenge.id === selectedChallengeId;
          return (
            <button
              key={challenge.id}
              onClick={() => setSelectedChallengeId(challenge.id)}
              className={`p-4 rounded-xl border text-left transition ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/80 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-military font-bold mb-1">
                <span className={isSelected ? 'text-amber-400' : 'text-slate-300'}>
                  LEVEL 0{challenge.level}: {challenge.title}
                </span>
                <span className="text-[10px] font-mono-code text-slate-500">
                  {challenge.targetTradesCount} Trades
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 line-clamp-2">
                {challenge.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Challenge Invariants & Rules */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>NON-NEGOTIABLE EXECUTION STANDARDS ({activeChallenge.rules.length} RULES)</span>
          </h3>
          <span className="text-[10px] font-mono-code text-slate-400">
            DISCIPLINE OVER PROFIT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeChallenge.rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-military font-bold text-slate-200">
                  {rule.title}
                </span>
                <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {rule.metric}
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive 10-Trade Execution Matrix */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Milestone className="w-4 h-4 text-amber-400" />
              <span>
                TRADE EXECUTION MATRIX ({completedCount}/{activeChallenge.targetTradesCount} VERIFIED CLEAN)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono-code mt-0.5">
              Click any trade slot to manually verify or unverify after inspecting your journal.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono-code">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Clean ({completedCount})
            </span>
            {breachedCount > 0 && (
              <span className="flex items-center gap-1.5 text-rose-400">
                <XCircle className="w-3.5 h-3.5" /> Breached ({breachedCount})
              </span>
            )}
            <span className="flex items-center gap-1.5 text-slate-500">
              ○ Pending ({activeChallenge.targetTradesCount - completedCount - breachedCount})
            </span>
          </div>
        </div>

        {/* Trade Slots Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {slotsData.map((slot) => {
            const isCompleted = slot.status === 'COMPLETED';
            const isBreached = slot.status === 'BREACHED';

            return (
              <div
                key={slot.slotNumber}
                onClick={() => handleToggleSlot(slot.slotNumber)}
                className={`p-3.5 rounded-xl border transition cursor-pointer select-none relative overflow-hidden ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                    : isBreached
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono-code font-bold text-slate-400">
                    TRADE #{slot.slotNumber}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isBreached ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-600">
                      ○
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono-code font-bold text-slate-200">
                  {slot.trade ? (
                    <div className="flex items-center justify-between">
                      <span>{slot.trade.instrument}</span>
                      <span
                        className={`text-[10px] ${
                          (slot.trade.profitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {(slot.trade.profitLoss || 0) >= 0 ? '+' : ''}
                        {formatCurrency(slot.trade.profitLoss || 0, account?.currency || 'USD')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Unexecuted</span>
                  )}
                </div>

                <div className="text-[10px] font-mono-code text-slate-400 mt-1 line-clamp-1">
                  {slot.reason}
                </div>

                {isCompleted && (
                  <div className="mt-2 pt-1 border-t border-emerald-500/20 flex items-center justify-between text-[9px] font-mono-code text-emerald-400">
                    <span>100% RULE ADHERENT</span>
                    <span>[✓]</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion Banner */}
        {isChallengeCompleted && (
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-4 animate-in fade-in">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-military font-bold text-amber-300 uppercase tracking-wider">
                CHALLENGE COMPLETED: {activeChallenge.badgeTitle}
              </h4>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                {activeChallenge.badgeDescription} You have proven that process takes precedence over emotional impulses.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code">
        <div className="flex items-center gap-2 text-slate-400">
          <Info className="w-4 h-4 text-amber-400" />
          <span>Every challenge adheres to the 1% risk ceiling and 2 trades/day rule.</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNewTrade && (
            <button
              onClick={onOpenNewTrade}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs uppercase cursor-pointer"
            >
              + LOG CHALLENGE TRADE
            </button>
          )}
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('PRE_TRADE_PLAN')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs uppercase cursor-pointer"
            >
              OPEN PRE-TRADE PLAN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
