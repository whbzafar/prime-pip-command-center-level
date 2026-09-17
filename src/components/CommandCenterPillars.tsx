import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  ShieldCheck,
  Brain,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
  Moon,
  AlertTriangle,
  Zap,
  Activity,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { AccountSettings, Trade } from '../types';
import { DashboardMetrics } from '../utils/tradeAnalytics';
import { formatCurrency } from '../utils/currencyFormatter';
import { getAppLiveClock, getMarketSessions, APP_TIMEZONE_LABEL } from '../utils/time';
import { getGlobalPrayerSchedule, getTodayPrayerRecord, getPrayerSettings } from '../utils/prayerTimes';

interface CommandCenterPillarsProps {
  metrics: DashboardMetrics;
  account: AccountSettings;
  trades: Trade[];
  onOpenNewTrade: () => void;
  onNavigateToTab: (tab: string) => void;
  onOpenTimeModal?: () => void;
}

export type PillarTab = 'TRADE' | 'RISK' | 'MINDSET' | 'WORLD';

export const CommandCenterPillars: React.FC<CommandCenterPillarsProps> = ({
  metrics,
  account,
  trades,
  onOpenNewTrade,
  onNavigateToTab,
  onOpenTimeModal,
}) => {
  const [activeMobilePillar, setActiveMobilePillar] = useState<PillarTab>('TRADE');
  const [showAllMobile, setShowAllMobile] = useState<boolean>(false);
  const [liveClock, setLiveClock] = useState<string>('');
  const [activeSessions, setActiveSessions] = useState<string[]>([]);
  const [isPeak, setIsPeak] = useState<boolean>(false);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<string>('');

  // Live timer tick
  useEffect(() => {
    const updateTime = () => {
      const clock = getAppLiveClock();
      setLiveClock(`${clock.time} ${clock.badge}`);
      const marketData = getMarketSessions();
      const openNames = marketData.sessions.filter((s) => s.isOpen).map((s) => s.name);
      setActiveSessions(openNames);
      setIsPeak(marketData.isPeakLiquidityActive);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Prayer tracker summary
    const fetchPrayer = async () => {
      try {
        const settings = getPrayerSettings();
        const sched = await getGlobalPrayerSchedule(settings);
        if (sched.nextPrayer) {
          setNextPrayerInfo(`${sched.nextPrayer.name} in ${sched.nextPrayer.timeRemainingStr}`);
        }
      } catch {
        setNextPrayerInfo('Standard Schedule');
      }
    };
    fetchPrayer();

    return () => clearInterval(interval);
  }, []);

  // Mathematical Risk calculations
  const master1Percent = metrics.accountBalance * 0.01;
  const dailyLossLimit = metrics.accountBalance * ((account.maxDailyLossPercent || 2) / 100);
  
  // Calculate today's loss
  const todayStartEpoch = new Date();
  todayStartEpoch.setHours(0, 0, 0, 0);
  const todayTrades = trades.filter((t) => {
    try {
      const tradeDate = new Date(t.date);
      return tradeDate >= todayStartEpoch;
    } catch {
      return false;
    }
  });

  const todayLosses = todayTrades
    .filter((t) => (t.profitLoss || 0) < 0)
    .reduce((acc, t) => acc + Math.abs(t.profitLoss || 0), 0);

  const remainingDailyRisk = Math.max(0, dailyLossLimit - todayLosses);
  const isDailyRiskHit = todayLosses >= dailyLossLimit;
  const isTradeQuotaHit = metrics.tradesToday >= account.maxDailyTrades;

  // Discipline metric (adherence to rules)
  const cleanTradesCount = trades.filter((t) => !t.ruleViolation || t.ruleViolation === 'NONE').length;
  const disciplineScore = trades.length > 0 ? Math.round((cleanTradesCount / trades.length) * 100) : 100;

  return (
    <div className="w-full space-y-3">
      {/* Mobile Segmented Pillar Switcher (< md screens) */}
      <div className="md:hidden flex items-center justify-between gap-1 bg-[#090D17] p-1 rounded-xl border border-slate-800/80 shadow-lg">
        {(['TRADE', 'RISK', 'MINDSET', 'WORLD'] as PillarTab[]).map((tab) => {
          const isActive = activeMobilePillar === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveMobilePillar(tab);
                setShowAllMobile(false);
              }}
              className={`flex-1 py-2 px-1 text-center font-military font-bold text-xs tracking-wider rounded-lg transition-all duration-150 relative prime-ios-touch ${
                isActive
                  ? tab === 'TRADE'
                    ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                    : tab === 'RISK'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : tab === 'MINDSET'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab}</span>
              {tab === 'RISK' && isDailyRiskHit && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              )}
            </button>
          );
        })}
        <button
          onClick={() => setShowAllMobile(!showAllMobile)}
          title="Toggle view of all command pillars"
          className={`px-2 py-2 text-[10px] font-mono-code rounded-lg border transition ${
            showAllMobile
              ? 'bg-slate-800 text-cyan-400 border-blue-500/30'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          {showAllMobile ? 'COLLAPSE' : 'ALL 4'}
        </button>
      </div>

      {/* Pillars Grid Layout */}
      {/* On mobile: shows either single active pillar or all 4 if expanded. On md+: shows 2x2 grid. On lg+: shows 4 columns */}
      <div
        className={`grid gap-3 sm:gap-4 ${
          showAllMobile
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {/* ============================================================ */}
        {/* PILLAR 1: TRADE                                              */}
        {/* ============================================================ */}
        <div
          className={`${
            !showAllMobile && activeMobilePillar !== 'TRADE' ? 'hidden md:flex' : 'flex'
          } flex-col justify-between prime-glass-card rounded-xl p-4 sm:p-5 border-l-4 border-l-cyan-400/80 relative overflow-hidden transition-all duration-200 hover:border-cyan-400/50 group`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-military font-bold text-xs tracking-wider text-slate-100 flex items-center gap-1.5">
                    <span>TRADE</span>
                    <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/20 font-bold">
                      EXECUTION
                    </span>
                  </h4>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                  isTradeQuotaHit
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isTradeQuotaHit ? 'QUOTA FULL' : 'READY TO TRADE'}
              </span>
            </div>

            <div className="mt-3 space-y-2 font-mono-code">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">ACTIVE BALANCE:</span>
                <span className="font-bold text-slate-100 text-sm">
                  {formatCurrency(metrics.accountBalance, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">CURRENT EQUITY:</span>
                <span className="font-semibold text-slate-200">
                  {formatCurrency(metrics.currentEquity, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400 text-[11px]">TODAY'S TRADES:</span>
                <span
                  className={`font-bold ${
                    isTradeQuotaHit ? 'text-rose-400' : 'text-cyan-400'
                  }`}
                >
                  {metrics.tradesToday} / {account.maxDailyTrades} SLOTS
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <button
              onClick={onOpenNewTrade}
              className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-blue-500 to-amber-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-[11px] tracking-wider rounded-lg transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 prime-ios-touch prime-light-sweep cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>NEW TRADE</span>
            </button>
            <button
              onClick={() => onNavigateToTab('JOURNAL')}
              className="py-1.5 px-2 bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 rounded-lg text-[10px] font-mono-code transition cursor-pointer"
              title="Open Trade Journal"
            >
              VAULT
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PILLAR 2: RISK                                               */}
        {/* ============================================================ */}
        <div
          className={`${
            !showAllMobile && activeMobilePillar !== 'RISK' ? 'hidden md:flex' : 'flex'
          } flex-col justify-between prime-glass-card rounded-xl p-4 sm:p-5 border-l-4 border-l-emerald-400/80 relative overflow-hidden transition-all duration-200 hover:border-emerald-400/50 group`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-military font-bold text-xs tracking-wider text-slate-100 flex items-center gap-1.5">
                    <span>RISK</span>
                    <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      DEFENSE
                    </span>
                  </h4>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                  isDailyRiskHit
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                    : todayLosses > 0
                    ? 'bg-blue-500/20 text-cyan-400 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isDailyRiskHit ? 'DEFCON 1: STOP' : 'DEFCON 5: GUARDED'}
              </span>
            </div>

            <div className="mt-3 space-y-2 font-mono-code">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">1% PER TRADE:</span>
                <span className="font-bold text-cyan-400 text-sm">
                  {formatCurrency(master1Percent, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">2% DAILY CAP:</span>
                <span className="font-semibold text-slate-200">
                  {formatCurrency(dailyLossLimit, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400 text-[11px]">RISK REMAINING:</span>
                <span
                  className={`font-bold ${
                    isDailyRiskHit ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(remainingDailyRisk, account.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('LOT_SIZE')}
              className="flex-1 py-1.5 px-2.5 bg-slate-800/90 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 font-military font-bold text-[11px] tracking-wider rounded-lg transition-all border border-emerald-500/30 flex items-center justify-center gap-1.5 prime-ios-touch cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>LOT CALCULATOR</span>
            </button>
            <button
              onClick={() => onNavigateToTab('RISK')}
              className="py-1.5 px-2 bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 rounded-lg text-[10px] font-mono-code transition cursor-pointer"
              title="Open Risk Management Center"
            >
              RULES
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PILLAR 3: MINDSET                                            */}
        {/* ============================================================ */}
        <div
          className={`${
            !showAllMobile && activeMobilePillar !== 'MINDSET' ? 'hidden md:flex' : 'flex'
          } flex-col justify-between prime-glass-card rounded-xl p-4 sm:p-5 border-l-4 border-l-indigo-400/80 relative overflow-hidden transition-all duration-200 hover:border-indigo-400/50 group`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Brain className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-military font-bold text-xs tracking-wider text-slate-100 flex items-center gap-1.5">
                    <span>MINDSET</span>
                    <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                      PSYCH
                    </span>
                  </h4>
                </div>
              </div>

              <span className="text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                STATE: CALM
              </span>
            </div>

            <div className="mt-3 space-y-2 font-mono-code">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">DISCIPLINE SCORE:</span>
                <span className="font-bold text-indigo-300 text-sm">
                  {disciplineScore}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">PLAN ADHERENCE:</span>
                <span className="font-semibold text-slate-200">
                  {cleanTradesCount} / {trades.length || 1} CLEAN
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400 text-[11px]">PRE-TRADE CHECK:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  STABLE & FOCUSED
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('PSYCHOLOGY')}
              className="flex-1 py-1.5 px-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 font-military font-bold text-[11px] tracking-wider rounded-lg transition-all border border-indigo-500/40 flex items-center justify-center gap-1.5 prime-ios-touch cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>COMMAND CENTER</span>
            </button>
            <button
              onClick={() => onNavigateToTab('DAILY_DEV')}
              className="py-1.5 px-2 bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-indigo-400 border border-slate-800 rounded-lg text-[10px] font-mono-code transition cursor-pointer"
              title="Daily Growth & Meditation"
            >
              DRILLS
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PILLAR 4: WORLD                                              */}
        {/* ============================================================ */}
        <div
          className={`${
            !showAllMobile && activeMobilePillar !== 'WORLD' ? 'hidden md:flex' : 'flex'
          } flex-col justify-between prime-glass-card rounded-xl p-4 sm:p-5 border-l-4 border-l-sky-400/80 relative overflow-hidden transition-all duration-200 hover:border-sky-400/50 group`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-military font-bold text-xs tracking-wider text-slate-100 flex items-center gap-1.5">
                    <span>WORLD</span>
                    <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                      MACRO
                    </span>
                  </h4>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                  isPeak
                    ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isPeak ? 'PEAK LIQUIDITY' : 'ACTIVE SESSIONS'}
              </span>
            </div>

            <div className="mt-3 space-y-2 font-mono-code">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">{APP_TIMEZONE_LABEL} TIME:</span>
                <span className="font-bold text-sky-300 text-sm">
                  {liveClock || '17:00:00'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">SESSIONS:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[140px] text-right">
                  {activeSessions.length > 0 ? activeSessions.join(', ') : 'Inter-bank Quiet'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Moon className="w-3 h-3 text-cyan-400" />
                  PRAYER:
                </span>
                <span className="font-semibold text-amber-300 truncate max-w-[140px] text-right text-[11px]">
                  {nextPrayerInfo || 'Tracked in Bar'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <button
              onClick={() => onOpenTimeModal ? onOpenTimeModal() : onNavigateToTab('FUNDAMENTAL_CALENDAR')}
              className="flex-1 py-1.5 px-2.5 bg-slate-800/90 hover:bg-slate-700 text-sky-300 hover:text-sky-200 font-military font-bold text-[11px] tracking-wider rounded-lg transition-all border border-sky-500/30 flex items-center justify-center gap-1.5 prime-ios-touch cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>MARKET CLOCK</span>
            </button>
            <button
              onClick={() => onNavigateToTab('FUNDAMENTAL_CALENDAR')}
              className="py-1.5 px-2 bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-sky-400 border border-slate-800 rounded-lg text-[10px] font-mono-code transition cursor-pointer"
              title="Fundamental News Calendar"
            >
              NEWS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
