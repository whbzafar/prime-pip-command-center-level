import React, { useState, useMemo } from 'react';
import {
  Brain,
  Award,
  AlertTriangle,
  TrendingUp,
  Flame,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  HeartPulse,
  Sliders,
  Play,
  RotateCcw,
  ListTodo,
  Milestone,
  Target,
  Zap,
  Crosshair,
} from 'lucide-react';
import { AccountSettings, Trade, TradingRule } from '../types';
import {
  calculateAccountHealthScore,
  calculateTraderGrowthScore,
  checkStreakAndOverconfidence,
  generateImprovementInsights,
  generateDailyReviewCoach,
  generateWeeklyTraderReview,
  calculatePersonalizedDevelopmentPriority,
} from '../utils/traderImprovementEngine';
import {
  getAlertSettings,
  saveAlertSettings,
  playDisciplineAlert,
  requestNotificationPermission,
} from '../utils/audioAlerts';
import { getRandomMotivationalQuote, getRandomLossSupportMessage } from '../utils/motivationalQuotes';
import { getKarachiDate } from '../utils/time';
import { DailyDevelopmentPlan } from './DailyDevelopmentPlan';
import { TraderDevelopmentJourney } from './TraderDevelopmentJourney';
import { BacktestingTracker } from './BacktestingTracker';
import { StagedChallenges } from './StagedChallenges';

interface PersonalImprovementHubProps {
  account: AccountSettings;
  trades: Trade[];
  rules?: TradingRule[];
  metrics?: any;
  onOpenNewTrade?: () => void;
  onNavigateToTab?: (tab: any) => void;
  onAutoSaveNotify?: (timeStr: string) => void;
}

export const PersonalImprovementHub: React.FC<PersonalImprovementHubProps> = ({
  account,
  trades,
  rules = [],
  metrics,
  onOpenNewTrade,
  onNavigateToTab,
  onAutoSaveNotify,
}) => {
  const [hubTab, setHubTab] = useState<
    'DAILY_PLAN' | 'CHALLENGES' | 'BACKTESTING' | 'PRIORITY' | 'JOURNEY' | 'HEALTH_GROWTH' | 'DAILY_REVIEW' | 'WEEKLY_REPORT' | 'PATTERNS' | 'AUDIO_SYSTEM'
  >('DAILY_PLAN');

  // Audio Alerts State
  const [audioSettings, setAudioSettings] = useState(() => getAlertSettings());
  const [testSoundType, setTestSoundType] = useState<string>('LIMIT_REACHED');

  const handleUpdateAudioSetting = (key: keyof typeof audioSettings, value: unknown) => {
    const updated = saveAlertSettings({ [key]: value });
    setAudioSettings(updated);
  };

  const handleTestSound = () => {
    playDisciplineAlert(testSoundType as any);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setAudioSettings(getAlertSettings());
    }
  };

  // Engine Calculations
  const accountHealth = useMemo(
    () => calculateAccountHealthScore(trades, account),
    [trades, account]
  );
  const traderGrowth = useMemo(() => calculateTraderGrowthScore(trades), [trades]);
  const streakStatus = useMemo(
    () => checkStreakAndOverconfidence(trades, account.maxConsecutiveLosses || 2),
    [trades, account.maxConsecutiveLosses]
  );
  const patterns = useMemo(() => generateImprovementInsights(trades, account), [trades, account]);
  const dailyCoach = useMemo(
    () => generateDailyReviewCoach(trades, account, getKarachiDate()),
    [trades, account]
  );
  const weeklyReview = useMemo(() => generateWeeklyTraderReview(trades, account), [trades, account]);
  const personalizedPriority = useMemo(
    () => calculatePersonalizedDevelopmentPriority(trades, account),
    [trades, account]
  );

  // Daily Mindset Reminder
  const dailyQuote = useMemo(() => getRandomMotivationalQuote(), []);
  const lossSupport = useMemo(() => getRandomLossSupportMessage(), []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Daily Mindset */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-cyan-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
              PERSONAL IMPROVEMENT ENGINE & REVIEW COACH
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Rule-based trading psychology, discipline metrics, streak protection, and post-session audits.
            </p>
          </div>
        </div>

        {/* Motivational Card */}
        <div className="max-w-md p-3 rounded-lg bg-slate-950/80 border border-blue-500/20 text-xs font-mono-code text-slate-300">
          <span className="text-[10px] text-cyan-400 font-bold block uppercase mb-0.5">
            DAILY DISCIPLINE FOCUS
          </span>
          <p className="italic text-slate-200">"{dailyQuote.text}"</p>
        </div>
      </div>

      {/* Hub Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs font-mono-code">
        {[
          { id: 'DAILY_PLAN', label: "TODAY'S HABIT PLAN", icon: ListTodo },
          { id: 'CHALLENGES', label: '10-TRADE CHALLENGE', icon: Award },
          { id: 'BACKTESTING', label: 'BACKTESTING & FORWARD TESTING', icon: TrendingUp },
          { id: 'PRIORITY', label: 'WHAT TO IMPROVE NEXT', icon: Target },
          { id: 'JOURNEY', label: 'TRADER JOURNEY', icon: Milestone },
          { id: 'HEALTH_GROWTH', label: 'ACCOUNT HEALTH', icon: HeartPulse },
          { id: 'DAILY_REVIEW', label: 'DAILY REVIEW', icon: Calendar },
          { id: 'WEEKLY_REPORT', label: 'WEEKLY AUDIT', icon: Award },
          { id: 'PATTERNS', label: 'BEHAVIOR PATTERNS', icon: Sparkles },
          { id: 'AUDIO_SYSTEM', label: 'AUDIO ALERTS', icon: Volume2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setHubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg border flex items-center gap-2 transition ${
                hubTab === tab.id
                  ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold shadow'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 0: DAILY TRADER DEVELOPMENT PLAN (Requirement 8) */}
      {hubTab === 'DAILY_PLAN' && (
        <DailyDevelopmentPlan
          account={account}
          trades={trades}
          rules={rules}
          onAutoSaveNotify={onAutoSaveNotify}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* TAB 0.02: STAGED CHALLENGES (10-Trade Foundation Challenge) */}
      {hubTab === 'CHALLENGES' && (
        <StagedChallenges
          account={account}
          trades={trades}
          onOpenNewTrade={onOpenNewTrade}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* TAB 0.05: BACKTESTING & FORWARD TESTING TRACKER */}
      {hubTab === 'BACKTESTING' && (
        <BacktestingTracker
          account={account}
          onAutoSaveNotify={onAutoSaveNotify}
        />
      )}

      {/* TAB 0.1: TRADER DEVELOPMENT JOURNEY (Requirement 23) */}
      {hubTab === 'JOURNEY' && (
        <TraderDevelopmentJourney
          account={account}
          trades={trades}
          scores={metrics?.performanceScores}
        />
      )}

      {/* TAB 0.2: TRADER IMPROVEMENT ENGINE: WHAT SHOULD I IMPROVE NEXT? (Requirement 17) */}
      {hubTab === 'PRIORITY' && (
        <div className="space-y-6">
          <div className="bg-slate-950/90 border border-blue-500/30 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-amber-300 border border-blue-500/30 uppercase tracking-wider">
                  ACTIONABLE DIAGNOSTIC
                </span>
                <h3 className="text-base font-military font-bold text-slate-100 tracking-wide mt-1">
                  WHAT SHOULD I IMPROVE NEXT?
                </h3>
                <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                  Synthesizing real execution logs, psychology check-ins, rule violations, and risk consistency.
                </p>
              </div>

              <span
                className={`text-xs font-mono-code font-bold px-3 py-1 rounded border ${
                  personalizedPriority.priorityLevel === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : personalizedPriority.priorityLevel === 'HIGH'
                    ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                    : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                }`}
              >
                LEVEL: {personalizedPriority.priorityLevel} PRIORITY
              </span>
            </div>

            {/* Current Priority Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-xs font-mono-code text-slate-400 uppercase">
                YOUR CURRENT DEVELOPMENT PRIORITY:
              </div>
              <div className="text-xl font-military font-bold text-cyan-400 tracking-wide">
                {personalizedPriority.currentPriority}
              </div>
              <div className="pt-2">
                <span className="text-xs font-military font-bold text-slate-300 block mb-1">
                  WHY:
                </span>
                <p className="text-xs font-mono-code text-slate-200 leading-relaxed bg-slate-950/90 p-3 rounded border border-slate-800">
                  {personalizedPriority.whyReason}
                </p>
              </div>
            </div>

            {/* Supporting Data Bullets */}
            <div className="space-y-2">
              <span className="text-xs font-military font-bold text-slate-300 block">
                SUPPORTING EVIDENCE (DATA-DRIVEN):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personalizedPriority.supportingData.map((dataItem, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono-code text-slate-300 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{dataItem}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Development Plan & Challenge */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-slate-900 to-slate-950 border border-blue-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-military font-bold text-cyan-400 tracking-wider">
                    NEXT DEVELOPMENT PLAN ({personalizedPriority.nextDevelopmentPlan.challengeTitle})
                  </h4>
                </div>
                <span className="text-[10px] font-mono-code text-slate-400">
                  TARGET: {personalizedPriority.nextDevelopmentPlan.targetTradesCount} TRADES
                </span>
              </div>

              <div className="space-y-2">
                {personalizedPriority.nextDevelopmentPlan.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono-code text-slate-200 flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] text-cyan-400 font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ACCOUNT HEALTH & GROWTH SCORES */}
      {hubTab === 'HEALTH_GROWTH' && (
        <div className="space-y-6">
          {/* Overconfidence / Streak Alerts (Items 23, 24) */}
          {streakStatus.isOverconfidenceDetected && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs font-mono-code space-y-1">
                <span className="font-bold text-cyan-400 block tracking-wide">
                  OVERCONFIDENCE DETECTION SYSTEM ALERT
                </span>
                <p className="text-slate-200">{streakStatus.overconfidenceReason}</p>
              </div>
            </div>
          )}

          {streakStatus.streakProtectionLevel === 'STOP_AND_REVIEW' && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs font-mono-code space-y-1">
                <span className="font-bold text-rose-400 block tracking-wide">
                  STREAK PROTECTION CIRCUIT BREAKER: {streakStatus.consecutiveLosses} CONSECUTIVE LOSSES
                </span>
                <p className="text-slate-200">{streakStatus.streakProtectionAction}</p>
                <p className="text-rose-300 italic pt-1">"{lossSupport.text}"</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Account Health Score (Item 26) */}
            <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-emerald-400" />
                    ACCOUNT HEALTH SCORE
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono-code">OVERALL DEFENSE RATING (0-100)</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded font-military font-bold text-xs ${
                    accountHealth.category === 'ELITE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : accountHealth.category === 'HEALTHY'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : accountHealth.category === 'CAUTION'
                      ? 'bg-blue-500/20 text-cyan-400 border border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {accountHealth.category} ({accountHealth.score}/100)
                </span>
              </div>

              {/* Visual Health Gauge */}
              <div className="flex items-center gap-4">
                <div className="text-4xl font-military font-bold text-slate-100">
                  {accountHealth.score}
                  <span className="text-xs text-slate-500 font-mono-code"> / 100</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        accountHealth.score >= 85
                          ? 'bg-emerald-400'
                          : accountHealth.score >= 70
                          ? 'bg-cyan-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${accountHealth.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-mono-code text-slate-400">{accountHealth.summary}</p>
                </div>
              </div>

              {/* 5 Component Pillars */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs font-mono-code">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Capital Drawdown Defense</span>
                  <span className="text-slate-200 font-bold">{accountHealth.drawdownScore} / 25 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Risk Consistency (Variance)</span>
                  <span className="text-slate-200 font-bold">{accountHealth.riskConsistencyScore} / 20 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Discipline & Rule Adherence</span>
                  <span className="text-slate-200 font-bold">{accountHealth.disciplineScore} / 25 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Trade Frequency & Limit Defense</span>
                  <span className="text-slate-200 font-bold">{accountHealth.frequencyScore} / 15 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Psychology & Emotional Control</span>
                  <span className="text-slate-200 font-bold">{accountHealth.psychologyScore} / 15 pts</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-cyan-400 font-mono-code uppercase block font-bold">
                  HEALTH ADVISORY
                </span>
                <ul className="text-xs font-mono-code text-slate-300 space-y-1 list-disc list-inside">
                  {accountHealth.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Trader Growth Score (Item 27) */}
            <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    TRADER GROWTH SCORE
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono-code">PERIOD-OVER-PERIOD EVOLUTION</span>
                </div>
                {traderGrowth.hasEnoughData ? (
                  <span
                    className={`px-2.5 py-1 rounded font-military font-bold text-xs flex items-center gap-1 ${
                      traderGrowth.growthDelta >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {traderGrowth.growthDelta >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {traderGrowth.growthDelta >= 0 ? `+${traderGrowth.growthDelta}%` : `${traderGrowth.growthDelta}%`}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono-code">
                    INITIALIZING
                  </span>
                )}
              </div>

              {/* Growth Metrics */}
              <div className="flex items-center gap-4">
                <div className="text-4xl font-military font-bold text-cyan-400">
                  {traderGrowth.growthScore}
                  <span className="text-xs text-slate-500 font-mono-code"> / 100</span>
                </div>
                <div className="flex-1 space-y-1 text-xs font-mono-code">
                  <p className="text-slate-300">{traderGrowth.message}</p>
                </div>
              </div>

              {/* Discipline Trend Indicators */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-center text-xs font-mono-code">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">DISCIPLINE</span>
                  <strong
                    className={
                      traderGrowth.disciplineTrend === 'IMPROVING'
                        ? 'text-emerald-400'
                        : traderGrowth.disciplineTrend === 'DECLINING'
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }
                  >
                    {traderGrowth.disciplineTrend}
                  </strong>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">RISK STABILITY</span>
                  <strong
                    className={
                      traderGrowth.riskConsistencyTrend === 'IMPROVING'
                        ? 'text-emerald-400'
                        : traderGrowth.riskConsistencyTrend === 'DECLINING'
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }
                  >
                    {traderGrowth.riskConsistencyTrend}
                  </strong>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">PSYCHOLOGY</span>
                  <strong
                    className={
                      traderGrowth.psychologyTrend === 'IMPROVING'
                        ? 'text-emerald-400'
                        : traderGrowth.psychologyTrend === 'DECLINING'
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }
                  >
                    {traderGrowth.psychologyTrend}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono-code text-slate-400">
                <span className="text-slate-300 font-bold block mb-1">Streak Protection Protocol:</span>
                <p>{streakStatus.streakProtectionAction}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY REVIEW COACH (Item 19) */}
      {hubTab === 'DAILY_REVIEW' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider">
                DAILY REVIEW COACH • SESSION AUDIT
              </h4>
              <span className="text-xs text-slate-400 font-mono-code">
                DATE: {dailyCoach.date} (KARACHI / PKT TIME)
              </span>
            </div>
            <span
              className={`px-3 py-1 rounded font-military font-bold text-xs border ${
                dailyCoach.riskManagementRating === 'EXCELLENT'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : dailyCoach.riskManagementRating === 'ACCEPTABLE'
                  ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
            >
              RISK RATING: {dailyCoach.riskManagementRating}
            </span>
          </div>

          {/* Session Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">TRADES TAKEN</span>
              <strong className="text-lg text-slate-100 font-military">{dailyCoach.tradesTaken}</strong>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">WIN / LOSS</span>
              <strong className="text-lg text-slate-100 font-military">
                {dailyCoach.wins}W - {dailyCoach.losses}L
              </strong>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">NET DAILY P&L</span>
              <strong
                className={`text-lg font-military ${
                  dailyCoach.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {dailyCoach.netPnl >= 0 ? `+$${dailyCoach.netPnl}` : `-$${Math.abs(dailyCoach.netPnl)}`}
              </strong>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">RULES RESPECTED</span>
              <strong className="text-lg text-slate-100 font-military">
                {dailyCoach.rulesFollowedCount} / {dailyCoach.rulesFollowedCount + dailyCoach.rulesViolatedCount}
              </strong>
            </div>
          </div>

          {/* Detailed Coaching Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-code">
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                BEST DECISION TODAY
              </span>
              <p className="text-slate-200">{dailyCoach.bestDecision}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-1.5">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                MAIN MISTAKE OR IMPEDIMENT
              </span>
              <p className="text-slate-200">{dailyCoach.mainMistake}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-1.5">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                TOMORROW'S REFINEMENT FOCUS
              </span>
              <p className="text-slate-200">{dailyCoach.tomorrowImprovementFocus}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY REPORT (Item 20) */}
      {hubTab === 'WEEKLY_REPORT' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider">
                WEEKLY TRADER IMPROVEMENT REPORT
              </h4>
              <span className="text-xs text-slate-400 font-mono-code">
                PERFORMANCE & DISCIPLINE AUDIT
              </span>
            </div>
            <span className="text-xs font-mono-code text-cyan-400 font-bold">
              TOTAL EXECUTIONS: {weeklyReview.tradesCount}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono-code">
            <div className="p-3.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">WIN RATE</span>
              <strong className="text-xl font-military text-slate-100">{weeklyReview.winRate}%</strong>
            </div>

            <div className="p-3.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">NET P&L</span>
              <strong
                className={`text-xl font-military ${
                  weeklyReview.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {weeklyReview.netPnl >= 0 ? `+$${weeklyReview.netPnl}` : `-$${Math.abs(weeklyReview.netPnl)}`}
              </strong>
            </div>

            <div className="p-3.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">DISCIPLINE COMPLIANCE</span>
              <strong className="text-xl font-military text-cyan-400">{weeklyReview.disciplineScore}%</strong>
            </div>

            <div className="p-3.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">EMOTIONAL NEUTRALITY</span>
              <strong className="text-xl font-military text-slate-100">{weeklyReview.psychologyScore}%</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-code">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>STRONGEST AREA</span>
              </div>
              <p className="text-slate-200">{weeklyReview.strongestArea}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>KEY AREA FOR IMPROVEMENT</span>
              </div>
              <p className="text-slate-200">{weeklyReview.areaForImprovement}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono-code space-y-1">
            <span className="text-cyan-400 font-bold block uppercase tracking-wider">
              WEEKLY PROCESS RECOMMENDATION
            </span>
            <p className="text-slate-200">{weeklyReview.weeklyRecommendation}</p>
          </div>
        </div>
      )}

      {/* TAB 4: BEHAVIOR PATTERNS (Item 18) */}
      {hubTab === 'PATTERNS' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider">
                EMPIRICAL BEHAVIOR & PATTERN RECOGNITION
              </h4>
              <span className="text-xs text-slate-400 font-mono-code">
                STRICT DATA INTEGRITY: ONLY REAL TRADE RECORDS
              </span>
            </div>
            <span className="text-[10px] font-mono-code text-slate-400">
              {patterns.statusMessage}
            </span>
          </div>

          {!patterns.hasEnoughData ? (
            <div className="p-8 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
              <div className="p-3 rounded-full bg-slate-950 border border-slate-800 w-12 h-12 mx-auto flex items-center justify-center text-cyan-400">
                <Brain className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-military font-bold text-slate-200">
                INSUFFICIENT DATA FOR PATTERN RECOGNITION
              </h5>
              <p className="text-xs text-slate-400 font-mono-code max-w-md mx-auto">
                {patterns.statusMessage}
              </p>
              <p className="text-[11px] text-slate-500 font-sans">
                PrimePipFX adheres strictly to empirical data integrity and will never invent fake patterns or speculative insights.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-xl border text-xs font-mono-code space-y-2 ${
                    insight.type === 'POSITIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : insight.type === 'WARNING'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold tracking-wider ${
                        insight.type === 'POSITIVE'
                          ? 'text-emerald-400'
                          : insight.type === 'WARNING'
                          ? 'text-rose-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {insight.title}
                    </span>
                  </div>
                  <p className="text-slate-200">{insight.message}</p>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    Data proof: <strong className="text-slate-300">{insight.supportingData}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIO ALERT SYSTEM (Item 16) */}
      {hubTab === 'AUDIO_SYSTEM' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                DISCIPLINE AUDIO ALERT & NOTIFICATION SYSTEM
              </h4>
              <span className="text-xs text-slate-400 font-mono-code">
                WEB AUDIO SYNTHESIZER • ZERO EXTERNAL ASSETS • 100% OFFLINE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audio Settings */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs font-mono-code">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">MASTER AUDIO ENABLED</span>
                <button
                  type="button"
                  id="toggle-master-audio"
                  onClick={() => handleUpdateAudioSetting('soundEnabled', !audioSettings.soundEnabled)}
                  className={`px-3 py-1 rounded font-bold transition ${
                    audioSettings.soundEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {audioSettings.soundEnabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">ALERT VOLUME</span>
                  <span className="text-cyan-400 font-bold">{Math.round(audioSettings.volume * 100)}%</span>
                </div>
                <input
                  id="audio-volume-slider"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={audioSettings.volume}
                  onChange={(e) => handleUpdateAudioSetting('volume', parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Individual Trigger Switches */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Daily Trade Limit Warning</span>
                  <input
                    type="checkbox"
                    checked={audioSettings.tradeLimitAlert}
                    onChange={(e) => handleUpdateAudioSetting('tradeLimitAlert', e.target.checked)}
                    className="accent-blue-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Daily Loss Limit Siren</span>
                  <input
                    type="checkbox"
                    checked={audioSettings.dailyLossAlert}
                    onChange={(e) => handleUpdateAudioSetting('dailyLossAlert', e.target.checked)}
                    className="accent-blue-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Drawdown Guardrail Alert</span>
                  <input
                    type="checkbox"
                    checked={audioSettings.drawdownAlert}
                    onChange={(e) => handleUpdateAudioSetting('drawdownAlert', e.target.checked)}
                    className="accent-blue-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Consecutive Loss Warning</span>
                  <input
                    type="checkbox"
                    checked={audioSettings.consecutiveLossAlert}
                    onChange={(e) => handleUpdateAudioSetting('consecutiveLossAlert', e.target.checked)}
                    className="accent-blue-500 w-4 h-4"
                  />
                </label>
              </div>
            </div>

            {/* Sound Tester & Browser Notifications */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs font-mono-code">
              <span className="text-slate-300 font-bold block">TEST SYNTHESIZED SOUND PATTERNS</span>

              <div className="space-y-2">
                <select
                  value={testSoundType}
                  onChange={(e) => setTestSoundType(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                >
                  <option value="LIMIT_REACHED">TRIPLE BUZZER (Limit Reached / Siren)</option>
                  <option value="CONSECUTIVE_LOSS">DOUBLE PULSE (Consecutive Loss Caution)</option>
                  <option value="WARNING">ATTENTION CHIME (Warning / Caution)</option>
                  <option value="CHIME">COMPLETION CHIME (Success / Confirmation)</option>
                </select>

                <button
                  type="button"
                  id="btn-play-test-sound"
                  onClick={handleTestSound}
                  className="w-full py-2.5 rounded bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition"
                >
                  <Play className="w-4 h-4" />
                  <span>PLAY TEST ALERT</span>
                </button>
              </div>

              {/* Browser Notification Switch */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    DESKTOP NOTIFICATIONS
                  </span>
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-cyan-400 text-[11px] font-bold hover:bg-slate-800"
                  >
                    {audioSettings.notificationsEnabled ? 'ENABLED' : 'REQUEST PERMISSION'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Allows PrimePipFX to send desktop push alerts when hard trade or loss limits are reached.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
