import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Award,
  AlertTriangle,
  Zap,
  Crosshair,
  Sparkles,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  DollarSign,
  ChevronRight,
  Info,
  Brain,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  DashboardMetrics,
  calculateStrategyMetrics,
  calculateSessionMetrics,
  calculatePairMetrics,
} from '../utils/tradeAnalytics';
import { Trade, AccountSettings, UserAccount } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { getKarachiEpoch } from '../utils/time';
import { calculateNextTradeReadiness } from '../utils/readinessEngine';
import { EvolutionStatusBadge } from './evolution/EvolutionStatusBadge';





interface MainDashboardProps {
  metrics: DashboardMetrics;
  account: AccountSettings;
  trades: Trade[];
  currentUser?: UserAccount | null;
  onOpenNewTrade: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenAccountModal?: () => void;
  onOpenTraderProfile?: () => void;
  onOpenEvolution?: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  metrics,
  account,
  trades,
  currentUser,
  onOpenNewTrade,
  onNavigateToTab,
  onOpenAccountModal,
  onOpenTraderProfile,
  onOpenEvolution,
}) => {
  const scores = metrics.performanceScores;
  const isProfitable = metrics.totalProfitLoss >= 0;

  // Radar/bars for performance scores
  const scoreCategories = [
    { key: 'riskManagement', label: 'Risk Management', score: scores.riskManagement, weight: '25%' },
    { key: 'psychology', label: 'Psychology', score: scores.psychology, weight: '15%' },
    { key: 'strategyExecution', label: 'Strategy Execution', score: scores.strategyExecution, weight: '20%' },
    { key: 'discipline', label: 'Discipline', score: scores.discipline, weight: '25%' },
    { key: 'consistency', label: 'Consistency', score: scores.consistency, weight: '15%' },
  ];
  type ScoreKey = (typeof scoreCategories)[number]['key'];
  const [selectedScoreKey, setSelectedScoreKey] = useState<ScoreKey | null>(null);
  const [adminWorkspaceOpen, setAdminWorkspaceOpen] = useState(false);
  const [adminWorkspace, setAdminWorkspace] = useState(currentUser?.adminData);
  const [studentWorkspace, setStudentWorkspace] = useState<{ funds?: number; allocation?: number; reward?: number }>(() => {
    try {
      const raw = localStorage.getItem(`primepipfx_optional_workspace_${currentUser?.id || 'student'}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [workspaceMode, setWorkspaceMode] = useState<'ADMIN_REWARD' | 'OPTIONAL'>('ADMIN_REWARD');

  useEffect(() => {
    setAdminWorkspace(currentUser?.adminData);
    if (currentUser?.adminData?.mode) setWorkspaceMode(currentUser.adminData.mode);
  }, [currentUser?.id, currentUser?.adminData]);

  useEffect(() => {
    if (!adminWorkspaceOpen || !currentUser?.id) return;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user?.adminData) {
          setAdminWorkspace(data.user.adminData);
          setWorkspaceMode(data.user.adminData.mode || 'ADMIN_REWARD');
        }
      })
      .catch(() => {});
  }, [adminWorkspaceOpen, currentUser?.id]);

  const saveOptionalWorkspace = (next: typeof studentWorkspace) => {
    setStudentWorkspace(next);
    try { localStorage.setItem(`primepipfx_optional_workspace_${currentUser?.id || 'student'}`, JSON.stringify(next)); } catch {}
  };

  const scoreEvidence = selectedScoreKey
    ? (() => {
        const orderedTrades = [...trades].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
        const matches = orderedTrades.filter((trade) => {
          if (selectedScoreKey === 'riskManagement') {
            return (trade.riskPercent ?? (account.initialBalance > 0 ? (trade.riskAmount / account.initialBalance) * 100 : 0)) > 1.5;
          }
          if (selectedScoreKey === 'psychology') {
            return ['FEARFUL', 'ANGRY', 'GREEDY', 'STRESSED'].includes(trade.preEmotion) ||
              Boolean(trade.postPsychology?.revengeTraded || trade.postPsychology?.overtraded || trade.postPsychology?.closedEarly);
          }
          if (selectedScoreKey === 'strategyExecution') return (trade.alignmentScore?.totalQuality ?? 75) < 70;
          if (selectedScoreKey === 'discipline') return trade.ruleViolation === 'MAJOR' || trade.ruleViolation === 'MINOR';
          return trade.profitLoss < 0;
        });
        const trade = matches[0];
        if (!trade) return null;
        const reason = selectedScoreKey === 'riskManagement'
          ? `Risk was ${((trade.riskPercent ?? (account.initialBalance > 0 ? (trade.riskAmount / account.initialBalance) * 100 : 0))).toFixed(2)}% of account size.`
          : selectedScoreKey === 'psychology'
          ? `The journal records ${trade.preEmotion || 'a psychological'} pressure${trade.postPsychology?.revengeTraded ? ' and revenge trading' : trade.postPsychology?.overtraded ? ' and overtrading' : trade.postPsychology?.closedEarly ? ' and an early close' : ''}.`
          : selectedScoreKey === 'strategyExecution'
          ? `Alignment quality was ${trade.alignmentScore?.totalQuality ?? 75}/100.`
          : selectedScoreKey === 'discipline'
          ? `Rule adherence was marked ${trade.ruleViolation}.`
          : `This losing entry reduced the recent win/loss consistency ratio (${formatCurrency(trade.profitLoss, account.currency, { showSign: true })}).`;
        const fix = selectedScoreKey === 'riskManagement'
          ? 'Keep risk at or below 1% and recalculate size before submitting the ticket.'
          : selectedScoreKey === 'psychology'
          ? 'Complete a pre-trade grounding check and pause after an emotional trigger.'
          : selectedScoreKey === 'strategyExecution'
          ? 'Require the full setup confirmation checklist before entry.'
          : selectedScoreKey === 'discipline'
          ? 'Write the invalidation rule in the plan and stop execution when it is breached.'
          : 'Review the setup quality, then take the next valid trade at standard risk rather than chasing recovery.';
        return { trade, reason, fix };
      })()
    : null;

  const recentTrades = [...trades]
    .sort(
      (a, b) => getKarachiEpoch(b.date, b.time) - getKarachiEpoch(a.date, a.time)
    )
    .slice(0, 5);

  const stratMetrics = calculateStrategyMetrics(trades);
  const sessMetrics = calculateSessionMetrics(trades);
  const pMetrics = calculatePairMetrics(trades);

  const topStrategy = stratMetrics[0];
  const topSession = sessMetrics[0];
  const topPair = pMetrics[0];

  const readiness = calculateNextTradeReadiness(trades, account);
  const isLimitReached = metrics.tradesToday >= account.maxDailyTrades;

  // Master 1% Risk Calculations (Strictly 1% per trade and 2% daily limit standard)
  const standardRiskPercent = 1.0;
  const master1PercentRiskDollars = (metrics.accountBalance * 1.0) / 100;
  const dailyRiskLimitPercent = 2.0;
  const dailyRiskLimitDollars = (metrics.accountBalance * 2.0) / 100;
  const dailyRiskUsed = readiness.dailyRiskUsed || 0;
  const remainingDailyRisk = Math.max(0, dailyRiskLimitDollars - dailyRiskUsed);
  const recommendedMaxRisk = (readiness.status === 'RED' || remainingDailyRisk <= 0)
    ? 0
    : Math.min(master1PercentRiskDollars, remainingDailyRisk);

  // Streak & Last trade detection
  const closedChronological = [...trades]
    .filter((t) => t.status === 'CLOSED' || typeof t.netProfitLoss === 'number')
    .sort((a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time));

  const lastClosedTrade = closedChronological[closedChronological.length - 1];

  let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let streakCount = 0;
  if (closedChronological.length > 0) {
    const rev = [...closedChronological].reverse();
    const firstIsWin = (rev[0].netProfitLoss ?? rev[0].profitLoss ?? 0) > 0;
    streakType = firstIsWin ? 'WIN' : 'LOSS';
    for (const t of rev) {
      const isWin = (t.netProfitLoss ?? t.profitLoss ?? 0) > 0;
      if (isWin === firstIsWin) streakCount++;
      else break;
    }
  }

  // Dynamic Suggestion based on trade history
  let dynamicRiskSuggestion = '';
  if (streakType === 'LOSS' && streakCount >= 2) {
    dynamicRiskSuggestion = `You have recorded ${streakCount} consecutive losses. Do not increase risk to recover. Review your recent setups and psychology before the next decision. Next standard risk is ${formatCurrency(master1PercentRiskDollars, account.currency)} (1%).`;
  } else if (streakType === 'WIN' && streakCount >= 3) {
    dynamicRiskSuggestion = `You are on a winning streak (${streakCount} wins). Avoid increasing risk because of recent profits. Continue following your 1% plan (${formatCurrency(master1PercentRiskDollars, account.currency)}).`;
  } else if (lastClosedTrade) {
    const lastPnl = lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0;
    if (lastPnl < 0) {
      dynamicRiskSuggestion = `Your next standard risk based on the current balance is ${formatCurrency(master1PercentRiskDollars, account.currency)} at 1%. Review whether the setup followed your strategy, whether the stop loss was respected, and whether the loss stayed within your risk plan. Do not increase risk to recover the loss.`;
    } else if (lastPnl > 0) {
      dynamicRiskSuggestion = `Your execution produced a winning result. Keep the same 1% risk discipline (${formatCurrency(master1PercentRiskDollars, account.currency)}) and review what made the setup valid. Do not increase risk simply because the previous trade won.`;
    } else {
      dynamicRiskSuggestion = `Trade closed at break-even. Capital preserved. Maintain 1% disciplined risk (${formatCurrency(master1PercentRiskDollars, account.currency)}) on valid setups.`;
    }
  } else {
    dynamicRiskSuggestion = `Account balance is ${formatCurrency(metrics.accountBalance, account.currency)}. Planned maximum risk on your next trade setup is 1% (${formatCurrency(master1PercentRiskDollars, account.currency)}). Standard daily risk limit is 2% (${formatCurrency(dailyRiskLimitDollars, account.currency)}).`;
  }

  const isLossToReview = lastClosedTrade && (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0;
  const isDailyRiskHit = readiness.riskStatus === 'LIMIT REACHED' || metrics.tradesToday >= account.maxDailyTrades;
  const riskStatusLabel = isDailyRiskHit
    ? 'DAILY LIMIT REACHED'
    : isLossToReview
    ? 'REVIEW BEFORE NEXT TRADE'
    : 'WITHIN PLAN';

  return (
    <div className="space-y-6">
      {/* Top Header Row: Profile / Account & Psychological Center */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0B0F19]/90 border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 flex-wrap">
          {onOpenTraderProfile && (
            <button
              onClick={onOpenTraderProfile}
              title="View & Edit Trader Profile"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-200 transition cursor-pointer group"
            >
              <div className="relative">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-blue-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition flex items-center gap-1">
                  <span>{currentUser?.name || currentUser?.username || 'Trader'}</span>
                  {currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper ? (
                    <ShieldCheck className="w-3 h-3 text-cyan-400 inline" />
                  ) : null}
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  <span>{account.accountName}</span>
                  <span className="text-cyan-400 font-bold ml-1.5">
                    {formatCurrency(metrics.accountBalance, account.currency)}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Dedicated Psychological Command Center Access Button Directly Beside Profile/Account */}
          <button
            id="dash-psychological-center-direct-btn"
            type="button"
            onClick={() => onNavigateToTab('PSYCHOLOGY')}
            title="Psychological Center — Train your mindset. Protect your discipline. Improve your execution."
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500/20 via-amber-600/15 to-transparent hover:from-blue-500/30 hover:via-amber-600/25 border border-blue-500/40 hover:border-cyan-400 text-slate-200 hover:text-amber-300 font-military font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-md group"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Brain className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-cyan-400 group-hover:text-amber-300 transition-colors">Psychological Center</span>
                <span className="text-[9px] font-mono-code px-1 py-0.2 rounded bg-blue-500/30 text-amber-300 uppercase font-bold">MINDSET</span>
              </div>
              <span className="text-[9px] text-slate-400 font-sans block leading-none">Discipline • Tilt Defense • Focus</span>
            </div>
          </button>

          {onOpenTraderProfile && (
            <button
              onClick={onOpenTraderProfile}
              title="Open Trader Experience Profile"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-mono-code transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trader Profile</span>
            </button>
          )}

          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper) && onOpenEvolution && (
            <button
              id="dash-evolution-engine-developer-btn"
              onClick={onOpenEvolution}
              title="Open Autonomous Evolution Engine"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 text-xs font-mono-code transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-military font-bold">EVOLUTION ENGINE</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Evolution Engine Status Badge */}
          <EvolutionStatusBadge onOpenEvolution={onOpenEvolution} />

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono-code text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">CENTRAL TRADING PROTOCOL ACTIVE</span>
            <span className="sm:hidden">ACTIVE</span>
          </div>
        </div>
      </div>

      {adminWorkspace?.editorAssigned && (
        <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/80 shadow-xl overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-military font-bold tracking-wider text-cyan-300 uppercase">Assigned Admin Workspace</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Editor: {adminWorkspace.editorName || 'Assigned Editor'} • Admin data is available when selected.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setWorkspaceMode('ADMIN_REWARD'); setAdminWorkspaceOpen(true); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-military font-bold border transition ${workspaceMode === 'ADMIN_REWARD' ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400'}`}
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => { setWorkspaceMode('OPTIONAL'); setAdminWorkspaceOpen(true); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-military font-bold border transition ${workspaceMode === 'OPTIONAL' ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'}`}
              >
                OPTIONAL
              </button>
            </div>
          </div>

          {adminWorkspaceOpen && (
            <div className="border-t border-slate-800 p-4">
              {workspaceMode === 'ADMIN_REWARD' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Funds</div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{adminWorkspace.funds ?? '—'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Allocation</div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{adminWorkspace.allocation ?? '—'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Reward</div>
                    <div className="text-lg font-bold text-slate-100 mt-1">{adminWorkspace.reward ?? '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['funds', 'allocation', 'reward'] as const).map((field) => (
                    <label key={field} className="block">
                      <span className="text-[10px] text-slate-500 uppercase">{field}</span>
                      <input
                        type="number"
                        step="any"
                        value={studentWorkspace[field] ?? ''}
                        onChange={(e) => saveOptionalWorkspace({
                          ...studentWorkspace,
                          [field]: e.target.value === '' ? undefined : Number(e.target.value),
                        })}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400"
                        placeholder="Enter value"
                      />
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-3 text-[10px] text-slate-500">
                {workspaceMode === 'ADMIN_REWARD'
                  ? 'Admin Reward is selected, so the values above are the active admin-provided values.'
                  : 'Optional is selected, so these values are managed independently by the student.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tactical Status Banner */}
      <div className={`border rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl transition ${
        readiness.status === 'RED'
          ? 'bg-rose-950/20 border-rose-500/40'
          : readiness.status === 'YELLOW'
          ? 'bg-amber-950/15 border-blue-500/40'
          : 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0B0F19] border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-inner ${
            readiness.status === 'RED'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : readiness.status === 'YELLOW'
              ? 'bg-blue-500/10 border-blue-500/30 text-cyan-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <Crosshair className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-military font-bold tracking-wider text-slate-100">
                COMMAND READINESS: {readiness.status === 'RED' ? 'DEFCON 5 (HALT)' : readiness.status === 'YELLOW' ? 'DEFCON 3 (CAUTION)' : 'DEFCON 1 (OPTIMAL)'}
              </h2>
              <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                readiness.status === 'RED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : readiness.status === 'YELLOW'
                  ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {readiness.headline}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              DAILY LIMIT: {metrics.tradesToday} / {account.maxDailyTrades} TRADES TAKEN TODAY • NEXT RISK: 1% ({formatCurrency(master1PercentRiskDollars, account.currency)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="dash-psych-center-btn"
            onClick={() => onNavigateToTab('PSYCHOLOGY')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-mono-code transition cursor-pointer"
            title="Open Psychological Center"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>PSYCHOLOGICAL CENTER</span>
          </button>

          <button
            onClick={() => onNavigateToTab('AI_COACH')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-mono-code transition cursor-pointer"
            title="Consult AI Trading Coach"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI TACTICAL BRIEFING</span>
          </button>

          <button
            id="dash-quick-log-btn"
            onClick={onOpenNewTrade}
            disabled={isLimitReached}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-military font-bold text-xs tracking-wider uppercase transition shadow-lg cursor-pointer ${
              isLimitReached
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-blue-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-blue-500/20 active:scale-95'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isLimitReached ? 'LIMIT LOCKED' : 'RECORD EXECUTION'}</span>
          </button>
        </div>
      </div>

      {/* Next Trade Readiness Check & Risk Guidance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Trade Readiness Check (7 cols) */}
        <div className={`lg:col-span-7 rounded-xl p-5 border shadow-xl flex flex-col justify-between ${
          readiness.status === 'RED'
            ? 'bg-rose-950/20 border-rose-500/40'
            : readiness.status === 'YELLOW'
            ? 'bg-amber-950/15 border-blue-500/40'
            : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${
                  readiness.status === 'RED'
                    ? 'text-rose-400'
                    : readiness.status === 'YELLOW'
                    ? 'text-cyan-400'
                    : 'text-emerald-400'
                }`} />
                <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                  NEXT TRADE READINESS CHECK
                </h3>
              </div>
              <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                readiness.status === 'RED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : readiness.status === 'YELLOW'
                  ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {readiness.status === 'RED'
                  ? 'RED: TRADE NOT RECOMMENDED'
                  : readiness.status === 'YELLOW'
                  ? 'YELLOW: CAUTION REQUIRED'
                  : 'GREEN: TRADE ALLOWED'}
              </span>
            </div>

            <div className="space-y-3 font-mono-code text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">CURRENT STATUS</span>
                <p className={`font-bold mt-0.5 text-sm ${
                  readiness.status === 'RED'
                    ? 'text-rose-400'
                    : readiness.status === 'YELLOW'
                    ? 'text-cyan-400'
                    : 'text-emerald-400'
                }`}>
                  {readiness.headline}
                </p>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase block">ANALYSIS & REASON</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {readiness.reasons.join(' ')}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] leading-relaxed">
                <span className="text-cyan-400 font-bold block mb-0.5 uppercase">
                  RULE-BASED RECOMMENDATION:
                </span>
                <span className="text-slate-300">
                  {readiness.recommendation}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-code text-slate-400">
            <span>DISCIPLINE PROTOCOL: ACTIVE</span>
            <span className={metrics.tradesToday >= account.maxDailyTrades ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {metrics.tradesToday} / {account.maxDailyTrades} TRADES TODAY
            </span>
          </div>
        </div>

        {/* Next Trade Risk Guidance (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                  NEXT TRADE RISK GUIDANCE
                </h3>
              </div>
              <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                riskStatusLabel === 'DAILY LIMIT REACHED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : riskStatusLabel === 'REVIEW BEFORE NEXT TRADE'
                  ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {riskStatusLabel}
              </span>
            </div>

            <div className="space-y-2.5 font-mono-code text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">ACCOUNT BALANCE:</span>
                <span className="font-bold text-slate-100">
                  {formatCurrency(metrics.accountBalance, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">MAX RISK PER TRADE:</span>
                <span className="font-bold text-cyan-400">
                  1% ({formatCurrency(master1PercentRiskDollars, account.currency)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">DAILY RISK LIMIT:</span>
                <span className="font-bold text-slate-200">
                  2% ({formatCurrency(dailyRiskLimitDollars, account.currency)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">DAILY RISK USED:</span>
                <span className={`font-bold ${dailyRiskUsed > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {formatCurrency(dailyRiskUsed, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">REMAINING DAILY RISK:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(remainingDailyRisk, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">RECOMMENDED MAX RISK:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(recommendedMaxRisk, account.currency)}
                </span>
              </div>
            </div>

            {/* Dynamic Contextual Suggestion Callout */}
            <div className={`mt-3.5 p-3 rounded-lg border text-xs font-mono-code leading-relaxed ${
              streakType === 'LOSS'
                ? 'bg-rose-950/25 border-rose-500/30 text-rose-300'
                : streakType === 'WIN'
                ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-cyan-400 font-military flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                TACTICAL GUIDANCE DIRECTIVE:
              </div>
              {dynamicRiskSuggestion}
            </div>
          </div>

          <div className="mt-3 text-[10px] font-mono-code text-slate-500 leading-tight">
            *Recommended risk is calculated dynamically from your Master Account Balance ({formatCurrency(metrics.accountBalance, account.currency)}) at 1% standard per trade.
          </div>
        </div>
      </div>

      {/* Trade Result Evaluation & Development Suggestions (Section 9) */}
      {lastClosedTrade && (
        <div className={`border rounded-xl p-5 shadow-xl transition ${
          (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0
            ? 'bg-rose-950/20 border-rose-500/30'
            : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                TRADE RESULT EVALUATION & DEVELOPMENT SUGGESTIONS
              </h3>
            </div>
            <span className={`text-[10px] font-mono-code font-bold uppercase px-3 py-1 rounded border ${
              (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0
                ? 'TRADE RESULT: LOSS'
                : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0
                ? 'TRADE RESULT: WIN'
                : 'TRADE RESULT: BREAK-EVEN'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono-code text-xs mb-4">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">
                {(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0 ? 'Loss Amount' : 'Profit / PnL'}
              </span>
              <span className={`font-bold text-sm ${
                (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {formatCurrency(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">New Account Balance</span>
              <span className="font-bold text-sm text-slate-100">
                {formatCurrency(metrics.accountBalance, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Next 1% Risk Amount</span>
              <span className="font-bold text-sm text-cyan-400">
                {formatCurrency(master1PercentRiskDollars, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Daily Risk Used</span>
              <span className="font-bold text-sm text-slate-300">
                {formatCurrency(dailyRiskUsed, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Remaining Daily Risk</span>
              <span className="font-bold text-sm text-emerald-400">
                {formatCurrency(remainingDailyRisk, account.currency)}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono-code leading-relaxed text-slate-300">
            <span className="text-cyan-400 font-bold block mb-1.5 text-[10px] uppercase font-military tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              PROFESSIONAL DEVELOPMENT SUGGESTION:
            </span>
            {(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0 ? (
              <span>
                Your next standard risk based on the current balance is <strong className="text-cyan-400">{formatCurrency(master1PercentRiskDollars, account.currency)}</strong> at 1%.
                Review whether the setup followed your strategy, whether the stop loss was respected, and whether the loss stayed within your risk plan.
                Do not increase risk to recover the loss.
              </span>
            ) : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0 ? (
              <span>
                Your execution produced a winning result. Keep the same 1% risk discipline (<strong className="text-emerald-400">{formatCurrency(master1PercentRiskDollars, account.currency)}</strong>) and review what made the setup valid.
                Do not increase risk simply because the previous trade won.
              </span>
            ) : (
              <span>
                Trade closed at break-even. Capital preserved. Maintain 1% disciplined risk (<strong className="text-slate-200">{formatCurrency(master1PercentRiskDollars, account.currency)}</strong>) on valid setups with clean confluence.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 1: The Core Account & Performance Score Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Capital Hud - Signature Animated Gradient Border */}
        <div className="prime-gradient-box p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
              <span className="font-bold tracking-wider uppercase text-slate-300">ACTIVE ACCOUNT</span>
              <span className="text-cyan-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase">
                {account.accountType.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="mt-2 text-xs font-military font-bold text-slate-100 flex items-center gap-1.5">
              <span className="text-slate-400 font-mono-code text-[11px] uppercase">Account:</span>
              <span className="text-amber-300 text-sm">{account.accountName}</span>
            </div>

            {/* Starting Balance & Current Balance Spotlight */}
            <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider font-semibold">
                  STARTING BALANCE
                </div>
                <div className="text-base font-mono-code font-bold text-slate-200 mt-0.5">
                  {formatCurrency(account.initialBalance, account.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider font-semibold">
                  CURRENT BALANCE
                </div>
                <div className="text-lg font-mono-code font-bold text-cyan-400 mt-0.5">
                  {formatCurrency(metrics.accountBalance, account.currency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 pt-2">
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 block uppercase">
                  CURRENT EQUITY
                </span>
                <span className="text-sm font-mono-code font-semibold text-slate-200">
                  {formatCurrency(metrics.currentEquity, account.currency)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 block uppercase">
                  NET P&L ($ / %)
                </span>
                <span
                  className={`text-sm font-mono-code font-bold flex items-center gap-1 ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isProfitable ? (
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {formatCurrency(metrics.totalProfitLoss, account.currency, { showSign: true })}
                  <span className="text-[11px] font-normal">
                    ({metrics.returnPercent >= 0 ? '+' : ''}
                    {metrics.returnPercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono-code truncate max-w-[150px]">Broker: {account.broker || 'Direct'}</span>
            <span className="font-mono-code text-cyan-400/80 font-bold">Currency: {account.currency}</span>
          </div>
        </div>

        {/* TRADER PERFORMANCE SCORE Spotlight */}
        <div className="lg:col-span-2 prime-premium-card border border-blue-500/30 rounded-xl p-5 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-[prime-pulse-slow_4s_ease-in-out_infinite] pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl animate-[prime-pulse-slow_4s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-military font-bold tracking-wider text-slate-200">
                TRADER PERFORMANCE SCORE (0–100)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono-code text-slate-400">
                WEIGHTED INSTITUTIONAL METRIC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4 items-center">
            {/* Big Score Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="relative flex items-center justify-center">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    className="stroke-slate-800/60"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="4 6"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                    className={`${
                      scores.overallTradingScore >= 80
                        ? 'stroke-emerald-400'
                        : scores.overallTradingScore >= 60
                        ? 'stroke-cyan-400'
                        : 'stroke-rose-400'
                    } transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={289}
                    strokeDashoffset={289 - (289 * scores.overallTradingScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-military font-bold text-slate-100">
                    {scores.overallTradingScore}
                  </span>
                  <span className="text-xs text-slate-400 block font-mono-code">/ 100</span>
                </div>
              </div>
              <span className="mt-2 text-xs font-military font-bold tracking-wider text-cyan-400">
                {scores.overallTradingScore >= 85
                  ? 'ELITE OPERATOR'
                  : scores.overallTradingScore >= 70
                  ? 'PROFESSIONAL'
                  : 'DISCIPLINE REQUIRED'}
              </span>
            </div>

            {/* Sub-scores breakdown */}
            <div className="sm:col-span-2 space-y-2.5">
              {scoreCategories.map((cat) => {
                const isHigh = cat.score >= 80;
                const isMed = cat.score >= 60 && cat.score < 80;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setSelectedScoreKey(cat.key)}
                    aria-pressed={selectedScoreKey === cat.key}
                    className={`w-full text-left text-xs rounded-lg p-1.5 transition ${
                      selectedScoreKey === cat.key ? 'bg-slate-800/70 ring-1 ring-cyan-400/50' : 'hover:bg-slate-800/30'
                    }`}
                    title={`Inspect journal evidence for ${cat.label}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 font-medium group-hover:text-cyan-300">{cat.label}</span>
                      <span className="font-mono-code font-bold text-slate-200">
                        <span
                          className={
                            isHigh
                              ? 'text-emerald-400'
                              : isMed
                              ? 'text-cyan-400'
                              : 'text-rose-400'
                          }
                        >
                          {cat.score}
                        </span>
                        <span className="text-slate-500 font-normal"> / 100</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 shadow-[0_0_10px_currentColor] ${
                          isHigh
                            ? 'bg-emerald-400'
                            : isMed
                            ? 'bg-cyan-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${cat.score}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })}
              {scoreEvidence && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed" aria-live="polite">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-military font-bold uppercase tracking-wider text-amber-300">Journal evidence</span>
                    <span className="font-mono-code text-slate-500">Entry #{scoreEvidence.trade.tradeNumber} · {scoreEvidence.trade.date}</span>
                  </div>
                  <p className="mt-1 text-slate-300">{scoreEvidence.reason}</p>
                  <p className="mt-1 text-cyan-300"><span className="font-bold">Practical fix:</span> {scoreEvidence.fix}</p>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('JOURNAL')}
                    className="mt-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 underline-offset-2 hover:text-amber-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    Open journal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      

      {/* Row 2: Comprehensive Key Performance Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-military tracking-wider font-bold text-slate-400 uppercase">
            PRIMARY COMBAT STATISTICS
          </h3>
          <span className="text-xs font-mono-code text-slate-400">
            TOTAL DATA SAMPLES: {metrics.totalTrades} EXECUTIONS
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Win Rate */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Win Rate
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1 flex items-center gap-1.5">
              <span>{metrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              {trades.filter((t) => t.profitLoss > 0).length}W -{' '}
              {trades.filter((t) => t.profitLoss < 0).length}L
            </div>
          </div>

          {/* Risk to Reward */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Risk-to-Reward
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1">
              1 : {metrics.riskRewardRatio.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-mono-code">
              Avg Win: {metrics.avgWinR.toFixed(1)}R
            </div>
          </div>

          {/* Profit Factor */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Profit Factor
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.profitFactor >= 2.0
                  ? 'text-emerald-400'
                  : metrics.profitFactor >= 1.2
                  ? 'text-slate-100'
                  : 'text-rose-400'
              }`}
            >
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              {metrics.profitFactor > 2 ? 'Super-Institutional' : 'Target > 1.8'}
            </div>
          </div>

          {/* Average Win Trade */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Avg Win Trade
            </span>
            <div className="text-xl font-mono-code font-bold text-emerald-400 mt-1">
              +{formatCurrency(metrics.avgWinTrade, account.currency)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              +{metrics.avgWinR.toFixed(1)}R mean gain
            </div>
          </div>

          {/* Average Loss Trade */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Avg Loss Trade
            </span>
            <div className="text-xl font-mono-code font-bold text-rose-400 mt-1">
              -{formatCurrency(metrics.avgLossTrade, account.currency)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              -{metrics.avgLossR.toFixed(1)}R controlled risk
            </div>
          </div>

          {/* Maximum Drawdown */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Max Drawdown
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.maxDrawdownPercent <= 3.0 ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              -{formatCurrency(metrics.maxDrawdownAmount, account.currency)} peak-to-trough
            </div>
          </div>

          {/* Current Win Streak */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Win Streak (Curr/Max)
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-cyan-400" />
              <span>
                {metrics.currentWinStreak} / {metrics.maxWinStreak}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Consecutive wins</div>
          </div>

          {/* Current Loss Streak */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Loss Streak (Curr/Max)
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1 flex items-center gap-1.5">
              <span
                className={metrics.currentLossStreak > 1 ? 'text-rose-400' : 'text-slate-100'}
              >
                {metrics.currentLossStreak} / {metrics.maxLossStreak}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Consecutive losses</div>
          </div>

          {/* Total Trades */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Total Trades
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1">
              {metrics.totalTrades}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Executed ops</div>
          </div>

          {/* Trades Today */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Trades Today
            </span>
            <div className="text-xl font-mono-code font-bold text-cyan-400 mt-1">
              {metrics.tradesToday} / {account.maxDailyTrades}
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-mono-code">
              {account.maxDailyTrades - metrics.tradesToday} slots remaining
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Weekly P&L
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.weeklyProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.weeklyProfitLoss, account.currency, { showSign: true })}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Last 7 calendar days</div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Monthly P&L
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.monthlyProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.monthlyProfitLoss, account.currency, { showSign: true })}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Rolling 30 days</div>
          </div>
        </div>
      </div>

      {/* Row 3: Live Quick Recon & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tactical Edge Insights */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs font-military font-bold tracking-wider text-slate-200">
                  SYSTEM INTELLIGENCE
                </h4>
              </div>
              <span className="text-[10px] font-mono-code text-slate-400">AUTOMATED AUDIT</span>
            </div>

            {trades.length === 0 ? (
              <div className="mt-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center font-mono-code space-y-1.5">
                <div className="text-cyan-400 font-bold text-xs">NO TRADING DATA AVAILABLE</div>
                <p className="text-[11px] text-slate-400">
                  CREATE YOUR FIRST JOURNAL AND ADD TRADES TO GENERATE PERFORMANCE ANALYTICS.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                {topStrategy && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1 font-mono-code">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PRIME SETUP IDENTIFIED
                    </div>
                    Your <strong className="text-white">{topStrategy.strategy}</strong> setups boast a{' '}
                    <strong className="text-white">{topStrategy.winRate}% win rate</strong> with an average return of{' '}
                    <strong className="text-white">+{topStrategy.avgR}R</strong> across {topStrategy.trades} trades.
                  </div>
                )}

                {topSession && (
                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1 font-mono-code">
                      <Crosshair className="w-3.5 h-3.5" />
                      OPTIMAL TRADING ENVIRONMENT
                    </div>
                    <strong className="text-white">{topSession.name}</strong> is your top producing session yielding{' '}
                    <strong className="text-white">{formatCurrency(topSession.totalProfitLoss, account.currency, { showSign: true })}</strong>.
                  </div>
                )}

                {topPair && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-amber-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1 font-mono-code">
                      <Sparkles className="w-3.5 h-3.5" />
                      TOP PAIR PERFORMANCE
                    </div>
                    Active volume is led by <strong className="text-white">{topPair.instrument}</strong> with{' '}
                    <strong className="text-white">{topPair.winRate}% accuracy</strong> and {topPair.trades} executions.
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            id="dash-explore-analytics-btn"
            onClick={() => onNavigateToTab('PERFORMANCE')}
            className="mt-4 w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-military font-bold tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <span>OPEN SETUP PERFORMANCE LABORATORY</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Executions Log */}
        <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-slate-200">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-military font-bold tracking-wider">
                  RECENT COMBAT EXECUTIONS
                </h4>
              </div>
              <button
                id="dash-view-all-journal-btn"
                onClick={() => onNavigateToTab('JOURNAL')}
                className="text-xs font-mono-code text-cyan-400 hover:text-amber-300 transition flex items-center gap-1"
              >
                <span>FULL JOURNAL ({trades.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-code">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80">
                    <th className="pb-2 font-medium">TRADE ID</th>
                    <th className="pb-2 font-medium">PAIR</th>
                    <th className="pb-2 font-medium">DIR</th>
                    <th className="pb-2 font-medium">STRATEGY</th>
                    <th className="pb-2 font-medium">GRADE</th>
                    <th className="pb-2 font-medium">QUALITY</th>
                    <th className="pb-2 font-medium text-right">R-MULT</th>
                    <th className="pb-2 font-medium text-right">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentTrades.map((t) => {
                    const isWin = t.profitLoss > 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 font-bold text-slate-200">{t.id}</td>
                        <td className="py-2.5 font-bold text-cyan-400">{t.instrument}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300">{t.strategy}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.grade === 'A+' || t.grade === 'A'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : t.grade === 'B'
                                ? 'bg-sky-500/20 text-sky-400'
                                : t.grade === 'C'
                                ? 'bg-blue-500/20 text-cyan-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {t.grade}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400">
                          {t.alignmentScore?.totalQuality || 85}/100
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            isWin ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isWin ? '+' : ''}
                          {t.rMultiple?.toFixed(1) || '0.0'}R
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            isWin ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatCurrency(t.profitLoss, account.currency, { showSign: true })}
                        </td>
                      </tr>
                    );
                  })}
                  {recentTrades.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-mono-code">
                        NO TRADES RECORDED FOR THIS ACCOUNT YET
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono-code">
            <span>SHOWING LAST 5 TRADES</span>
            <span className="text-emerald-400">
              DISCIPLINE PROTOCOL: 0 UNLOGGED POSITIONS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
