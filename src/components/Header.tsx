import React, { useState, useEffect } from 'react';
import {
  Activity,
  BookOpen,
  BarChart3,
  Crosshair,
  Award,
  Calculator,
  FileText,
  Settings2,
  PlusCircle,
  Database,
  Download,
  Upload,
  Clock,
  ShieldAlert,
  Wallet,
  Brain,
  Terminal,
  Compass,
  Volume2,
  VolumeX,
  Bell,
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  Calendar,
  PenTool,
  MessageSquare,
  BarChart2,
  Users,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Cpu,
  Wind,
  Radio,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { AccountSettings, TraderPerformanceScores, UserAccount } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { getAppLiveClock, getMarketSessions, getTimezoneLabel, getUserTimezone } from '../utils/time';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { playDisciplineAlert, getAlertSettings, toggleSoundEnabled, AlertSettings } from '../utils/audioAlerts';
import { DailyPrayerBar } from './DailyPrayerBar';
import { EvolutionStatusBadge } from './evolution/EvolutionStatusBadge';
import { GlobalTimeSessionModal } from './GlobalTimeSessionModal';

export type MainNavTab =
  | 'DASHBOARD'
  | 'JOURNAL'
  | 'PERFORMANCE'
  | 'RESEARCH'
  | 'SIGNALS'
  | 'RISK'
  | 'LOT_SIZE'
  | 'DAILY_DEV'
  | 'COMPOUNDING'
  | 'REPORTS'
  | 'PSYCHOLOGY'
  | 'CALMING_TOOLS'
  | 'FUNDAMENTAL_CALENDAR'
  | 'FREEHAND_WORKSPACE'
  | 'PRE_TRADE_PLAN'
  | 'COMMUNITY'
  | 'BOOK_SESSION'
  | 'ACCOUNTS'
  | 'SETTINGS'
  | 'ADMIN'
  | 'EVOLUTION';

interface HeaderProps {
  activeTab: MainNavTab;
  setActiveTab?: (tab: MainNavTab) => void;
  onSelectTab?: (tab: MainNavTab) => void;
  account?: AccountSettings;
  scores?: TraderPerformanceScores;
  tradesToday?: number;
  maxDailyTrades?: number;
  overallScore?: number;
  lastSavedTime?: string;
  isDemoMode?: boolean;
  onOpenNewTrade: () => void;
  onResetData?: () => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAccountManager?: () => void;
  onOpenBackupModal?: () => void;
  currentUser?: UserAccount | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenSubscription?: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  onOpenHelpImprove?: () => void;
  onOpenTraderProfile?: () => void;
  onOpenEvolution?: () => void;
}

interface NavItem {
  id: MainNavTab;
  label: string;
  icon: any;
  highlight?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  account,
  scores,
  tradesToday = 1,
  maxDailyTrades = 2,
  overallScore,
  lastSavedTime,
  isDemoMode = false,
  onOpenNewTrade,
  onResetData,
  onExportData,
  onImportData,
  onOpenAccountManager,
  onOpenBackupModal,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenSubscription,
  onOpenAdmin,
  onOpenProfile,
  onOpenHelpImprove,
  onOpenTraderProfile,
  onOpenEvolution,
}) => {
  const switchTab = onSelectTab || setActiveTab || (() => {});
  const displayScore = overallScore ?? scores?.overallTradingScore ?? 76;
  const [isTimeModalOpen, setIsTimeModalOpen] = React.useState<boolean>(false);
  const [liveClockStr, setLiveClockStr] = React.useState<string>('');
  const [activeSessionSummary, setActiveSessionSummary] = React.useState<string>('');
  const [isPeakLiquidity, setIsPeakLiquidity] = React.useState<boolean>(false);
  const [soundTested, setSoundTested] = React.useState<boolean>(false);
  const [alertSettings, setAlertSettings] = React.useState<AlertSettings>(() => getAlertSettings());

  React.useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<AlertSettings>;
      if (customEvent.detail) {
        setAlertSettings(customEvent.detail);
      } else {
        setAlertSettings(getAlertSettings());
      }
    };
    window.addEventListener('primepipfx_alert_settings_changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('primepipfx_alert_settings_changed', handleSettingsChanged);
    };
  }, []);

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      const clock = getAppLiveClock(now);
      setLiveClockStr(clock.full);
      const sessionData = getMarketSessions(now);
      setActiveSessionSummary(sessionData.activeSessionSummary);
      setIsPeakLiquidity(sessionData.isPeakLiquidityActive);
    };
    update();
    const interval = setInterval(update, 1000);

    const handleTzChange = () => update();
    window.addEventListener('primepipfx_timezone_changed', handleTzChange);

    const handleOpenTimeModal = () => setIsTimeModalOpen(true);
    window.addEventListener('primepipfx_open_time_modal', handleOpenTimeModal);

    return () => {
      clearInterval(interval);
      window.removeEventListener('primepipfx_timezone_changed', handleTzChange);
      window.removeEventListener('primepipfx_open_time_modal', handleOpenTimeModal);
    };
  }, []);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState<boolean>(false);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  const handleTestSound = () => {
    if (!alertSettings.soundEnabled) {
      // Toggle sound on
      const newEnabled = toggleSoundEnabled();
      setAlertSettings(getAlertSettings());
      if (newEnabled) {
        playDisciplineAlert('CHIME');
      }
    } else {
      playDisciplineAlert('CHIME');
      setSoundTested(true);
      setTimeout(() => setSoundTested(false), 2000);
    }
  };

  const isLimitReached = tradesToday >= maxDailyTrades;
  const isOneTradeRemaining = tradesToday === 1 && maxDailyTrades === 2;

  // 5-7 Clean Primary Tabs
  const primaryNavItems = [
    { id: 'DASHBOARD' as MainNavTab, label: 'DASHBOARD', icon: Activity },
    { id: 'JOURNAL' as MainNavTab, label: 'TRADE JOURNAL', icon: BookOpen },
    { id: 'PERFORMANCE' as MainNavTab, label: 'PERFORMANCE', icon: BarChart3 },
    { id: 'RESEARCH' as MainNavTab, label: 'TRADING RESEARCH', icon: Compass },
    { id: 'SIGNALS' as MainNavTab, label: 'PREMIUM SIGNALS', icon: Radio, highlight: true },
    { id: 'RISK' as MainNavTab, label: 'RISK MANAGEMENT', icon: Crosshair },
  ];

  // Secondary Tools Categorized under "More..."
  const secondaryCategories = [
    {
      title: 'ANALYTICAL & CALCULATORS',
      items: [
        { id: 'LOT_SIZE' as MainNavTab, label: 'Lot Size Calculator', subtext: 'Exact 1% lot sizing', icon: Calculator },
        { id: 'COMPOUNDING' as MainNavTab, label: 'Compounding Tool', subtext: 'Growth projection engine', icon: Calculator },
        { id: 'REPORTS' as MainNavTab, label: 'Performance Reports', subtext: 'Statistical PDF/audits', icon: FileText },
      ],
    },
    {
      title: 'DISCIPLINE & MINDSET',
      items: [
        { id: 'PRE_TRADE_PLAN' as MainNavTab, label: 'Pre-Trade Plan', subtext: 'Validate & calculate setups', icon: ShieldAlert, highlight: true },
        { id: 'DAILY_DEV' as MainNavTab, label: 'Daily Development', subtext: 'Habits & daily routine', icon: Award },
        { id: 'PSYCHOLOGY' as MainNavTab, label: 'Psychology Center', subtext: 'Discipline masterclass', icon: Brain, highlight: true },
        { id: 'CALMING_TOOLS' as MainNavTab, label: 'Calming Tools Suite', subtext: 'Box breathing & reset', icon: Wind, highlight: true },
      ],
    },
    {
      title: 'WORKSPACE & RESEARCH',
      items: [
        { id: 'FUNDAMENTAL_CALENDAR' as MainNavTab, label: 'Fundamental Calendar', subtext: 'High-impact macro events', icon: Calendar, highlight: true },
        { id: 'FREEHAND_WORKSPACE' as MainNavTab, label: 'Freehand Canvas', subtext: 'Interactive chart sketching', icon: PenTool },
        { id: 'COMMUNITY' as MainNavTab, label: 'Trader Community Feed', subtext: 'Peer discussions & ideas', icon: Users },
        { id: 'BOOK_SESSION' as MainNavTab, label: 'Book A Session', subtext: '1-on-1 strategy coaching', icon: MessageSquare, highlight: true },
      ],
    },
    {
      title: 'SYSTEM & VAULT',
      items: [
        { id: 'SETTINGS' as MainNavTab, label: 'Data Export & Backup', subtext: 'Authoritative data backup', icon: Settings2 },
        ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper || currentUser?.username === 'primepipfx-admin'
          ? [
              { id: 'ADMIN' as MainNavTab, label: 'Admin Panel — Owner', subtext: 'Access master controls', icon: ShieldCheck, highlight: true },
              { id: 'EVOLUTION' as MainNavTab, label: 'Evolution Engine', subtext: 'Autonomous AI engine', icon: Cpu, highlight: true },
            ]
          : []),
      ],
    },
  ];

  // Check if current active tab is inside "More..."
  const allSecondaryItems = secondaryCategories.flatMap((c) => c.items);
  const activeSecondaryItem = allSecondaryItems.find((item) => item.id === activeTab);
  const isSecondaryActive = Boolean(activeSecondaryItem);

  const handleNavClick = (id: MainNavTab) => {
    setIsMoreMenuOpen(false);
    if (id === 'ACCOUNTS') {
      if (onOpenAccountManager) {
        onOpenAccountManager();
      } else {
        switchTab(id);
      }
    } else if (id === 'SETTINGS') {
      if (onOpenBackupModal) {
        onOpenBackupModal();
      } else {
        switchTab(id);
      }
    } else if (id === 'ADMIN') {
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper || currentUser?.username === 'primepipfx-admin') {
        switchTab('ADMIN');
      } else if (onOpenLogin) {
        onOpenLogin();
      }
    } else if (id === 'EVOLUTION') {
      if (onOpenEvolution) {
        onOpenEvolution();
      } else {
        switchTab('EVOLUTION');
      }
    } else {
      switchTab(id);
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur sticky top-0 z-40">
      {/* Daily Astronomical Islamic Prayer Tracker Bar */}
      <DailyPrayerBar />

      {/* Top Tactical Status Bar */}
      <div className="px-3 sm:px-4 py-1.5 border-b border-slate-800/60 bg-[#070A11] flex items-center justify-between gap-2 text-xs font-mono-code text-slate-400 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Offline/Online Status */}
          <OfflineIndicator />

          {/* Autonomous Evolution Engine Status Badge */}
          <EvolutionStatusBadge onOpenEvolution={onOpenEvolution} />

          {/* Demo Mode Badge */}
          {isDemoMode && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] tracking-wide animate-pulse">
              <span>● DEMO</span>
            </div>
          )}

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Dynamic Trade Limit Protocol Status */}
          {isLimitReached ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold animate-pulse text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>STOP TRADING ({tradesToday}/{maxDailyTrades})</span>
            </div>
          ) : isOneTradeRemaining ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TRADE 1 OF {maxDailyTrades} COMPLETED • 1 REMAINING</span>
              <span className="sm:hidden">1 REMAINING</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>DISCIPLINE READY ({tradesToday}/{maxDailyTrades})</span>
            </div>
          )}

          <span className="text-slate-700 hidden md:inline">|</span>

          {/* Global Time & Market Session Tactical Chip */}
          <button
            type="button"
            onClick={() => setIsTimeModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-slate-200 transition cursor-pointer group text-[11px]"
            title="Click to change timezone, switch 12h/24h format, and view global market sessions"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="font-bold">{liveClockStr || 'WORLD CLOCK'}</span>
            {activeSessionSummary && (
              <span
                className={`hidden xl:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold tracking-tight ${
                  isPeakLiquidity
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {activeSessionSummary}
              </span>
            )}
          </button>

          {/* Last Saved Indicator */}
          {lastSavedTime && (
            <>
              <span className="text-slate-700 hidden lg:inline">|</span>
              <div className="hidden lg:flex items-center gap-1 text-slate-400 text-[11px]">
                <span className="text-emerald-400">●</span>
                <span>SAVED: {lastSavedTime}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Discipline Audio Alert Status & Tester */}
          <button
            id="header-sound-status-btn"
            type="button"
            onClick={handleTestSound}
            title={
              alertSettings.soundEnabled
                ? `Tactical Audio Alerts: ACTIVE (${Math.round(alertSettings.volume * 100)}% volume). Click to test chime.`
                : 'Tactical Audio Alerts: MUTED. Click to enable sound.'
            }
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-code transition border cursor-pointer ${
              alertSettings.soundEnabled
                ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border-slate-800'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {alertSettings.soundEnabled ? (
              <>
                <Volume2 className={`w-3 h-3 ${soundTested ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                <span className="hidden sm:inline">{soundTested ? 'OK' : 'SOUND'}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline">MUTED</span>
              </>
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
            <span className="text-slate-400 font-normal hidden sm:inline">SCORE:</span>
            <span
              className={`font-bold ${
                displayScore >= 80
                  ? 'text-emerald-400'
                  : displayScore >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {displayScore}
            </span>
          </div>

          {/* Backup & Restore modal trigger */}
          {onOpenBackupModal && (
            <button
              id="header-backup-data-btn"
              onClick={onOpenBackupModal}
              title="Backup & Restore Journal Data"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 text-[11px] font-mono-code transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">BACKUP</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            {onExportData && (
              <button
                id="export-journal-btn"
                onClick={onExportData}
                title="Export Journal (JSON)"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            {onImportData && (
              <label
                title="Import Journal (JSON)"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportData}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Main Branding & Navigation Row */}
      <div className="px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
            <Crosshair className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-military font-bold tracking-wider text-slate-100">
                PRIMEPIPFX
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-sans">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>
        </div>

        {/* Account Quick Badge & Switcher Trigger */}
        {account && (
          <button
            onClick={onOpenAccountManager}
            title="Manage or Switch Accounts"
            className="hidden lg:flex items-center gap-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 px-3.5 py-1.5 rounded-lg transition text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono-code text-slate-400 flex items-center gap-1">
                <span>{account.accountName}</span>
                <span className="text-amber-400/80 text-[9px] font-bold">[{account.accountType.replace(/_/g, ' ')}]</span>
              </div>
              <div className="text-sm font-bold font-mono-code text-slate-100 flex items-center gap-2">
                <span>
                  {formatCurrency(account.currentBalance, account.currency)}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-1 rounded">
                  SWITCH ▾
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Action Buttons & User Auth Control */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                title="Edit Your Profile & Status"
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-300 text-xs font-mono-code transition cursor-pointer group"
              >
                <div className="relative">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/50"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {/* Online status indicator dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                      currentUser.onlineStatus === 'AWAY'
                        ? 'bg-amber-400'
                        : currentUser.onlineStatus === 'OFFLINE'
                        ? 'bg-slate-500'
                        : 'bg-emerald-400'
                    }`}
                    title={`Status: ${currentUser.onlineStatus || 'ONLINE'}`}
                  />
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 transition flex items-center gap-1">
                    <span>{currentUser.name || currentUser.username}</span>
                    {currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.isDeveloper ? (
                      <ShieldCheck className="w-3 h-3 text-amber-400 inline" />
                    ) : null}
                  </div>
                  <span className="text-[9px] text-slate-500 block -mt-0.5">
                    @{currentUser.username}
                  </span>
                </div>
              </button>

              {/* Dedicated Psychological Command Center Access Button Immediately Beside Profile */}
              <button
                id="header-psychological-center-btn"
                type="button"
                onClick={() => switchTab('PSYCHOLOGY')}
                title="Psychological Center — Train your mindset. Protect your discipline. Improve your execution."
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border font-military font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-sm group ${
                  activeTab === 'PSYCHOLOGY'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-amber-500/25 ring-1 ring-amber-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform group-hover:scale-110 ${
                  activeTab === 'PSYCHOLOGY' ? 'bg-slate-950/20 text-slate-950' : 'text-amber-400'
                }`}>
                  <Brain className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-left flex flex-col justify-center leading-tight">
                  <span className="whitespace-nowrap">Psychological Center</span>
                  <span className={`text-[9px] font-mono-code hidden md:inline uppercase tracking-normal ${
                    activeTab === 'PSYCHOLOGY' ? 'text-slate-950 font-semibold' : 'text-slate-400 group-hover:text-amber-400/80'
                  }`}>
                    Command Center
                  </span>
                </div>
              </button>

              {/* Help PRIMEPIPFX Improve Button */}
              {onOpenHelpImprove && (
                <button
                  id="header-help-improve-btn"
                  type="button"
                  onClick={onOpenHelpImprove}
                  title="Help PRIMEPIPFX Improve — Suggest features, report workflow friction, or request educational drills."
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-amber-500/50 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-military font-bold text-xs tracking-wider transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>HELP IMPROVE</span>
                </button>
              )}

              {/* Evolution Engine Owner Shortcut */}
              {(currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.isDeveloper || currentUser.username === 'primepipfx-admin') && (
                <button
                  id="header-evolution-engine-btn"
                  type="button"
                  onClick={() => switchTab('EVOLUTION')}
                  title="PrimePipFX Self-Evolving Intelligence Engine"
                  className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-military font-bold text-xs tracking-wider transition cursor-pointer ${
                    activeTab === 'EVOLUTION'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>EVOLUTION</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  title={`Logout (${currentUser.username})`}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>LOGIN</span>
                </button>
              )}

              {/* Dedicated Psychological Center Button in Demo/Pre-Login Mode */}
              <button
                id="header-psychological-center-guest-btn"
                type="button"
                onClick={() => switchTab('PSYCHOLOGY')}
                title="Psychological Center — Train your mindset. Protect your discipline. Improve your execution."
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border font-military font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-sm group prime-ios-touch ${
                  activeTab === 'PSYCHOLOGY'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-amber-500/25 ring-1 ring-amber-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${
                  activeTab === 'PSYCHOLOGY' ? 'bg-slate-950/20 text-slate-950' : 'text-amber-400'
                }`}>
                  <Brain className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-left flex flex-col justify-center leading-tight">
                  <span className="whitespace-nowrap hidden sm:inline">Psychological Center</span>
                  <span className="sm:hidden font-mono-code text-[11px]">MINDSET</span>
                  <span className={`text-[9px] font-mono-code hidden md:inline uppercase tracking-normal ${
                    activeTab === 'PSYCHOLOGY' ? 'text-slate-950 font-semibold' : 'text-slate-400 group-hover:text-amber-400/80'
                  }`}>
                    Command Center
                  </span>
                </div>
              </button>
            </div>
          )}

          {onOpenAccountManager && (
            <button
              id="mobile-account-manage-btn"
              onClick={onOpenAccountManager}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-400 font-military text-xs font-bold prime-ios-touch cursor-pointer"
              title="Accounts & Balance"
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">ACCOUNTS</span>
              <span className="sm:hidden text-[10px] font-mono-code">
                {account ? formatCurrency(account.currentBalance, account.currency).split('.')[0] : 'ACC'}
              </span>
            </button>
          )}

          <button
            id="open-new-trade-btn"
            onClick={onOpenNewTrade}
            className="prime-btn-primary prime-light-sweep flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-xl shadow-amber-500/20 cursor-pointer prime-ios-touch"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="hidden sm:inline">ENTER NEW TRADE</span>
            <span className="sm:hidden">TRADE</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs with Smooth Micro-interactions (Desktop & Tablet Navigation) */}
      <div className="hidden md:flex px-3 sm:px-6 items-center justify-between border-t border-slate-800/60 py-1.5 bg-[#090D15]/90 relative z-30">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id.toLowerCase()}`}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-military tracking-wider font-semibold transition-all duration-180 select-none whitespace-nowrap active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 shadow-sm shadow-amber-500/15 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/70 border border-transparent'
                } ${item.highlight && !isActive ? 'text-amber-300/80 font-bold' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>
            );
          })}

          {/* More... Dropdown Trigger */}
          <div className="relative" ref={moreMenuRef}>
            <button
              id="nav-tab-more"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-military tracking-wider font-semibold transition-all duration-180 select-none whitespace-nowrap active:scale-95 cursor-pointer ${
                isSecondaryActive || isMoreMenuOpen
                  ? 'bg-amber-500/15 text-amber-300 shadow-sm shadow-amber-500/15 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/70 border border-transparent'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-amber-400/90" />
              <span>MORE</span>
              {activeSecondaryItem && (
                <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-normal">
                  {activeSecondaryItem.label}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180 text-amber-400' : ''}`} />
            </button>

            {/* Structured Categorized Secondary Modules Dropdown */}
            {isMoreMenuOpen && (
              <div className="absolute left-0 mt-2 w-[760px] max-w-[90vw] p-4 bg-[#080C14]/98 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-180">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/90">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm"></span>
                    <span className="font-military font-bold text-xs tracking-wider text-slate-200 uppercase">
                      SECONDARY STRATEGIC & OPERATIONAL TOOLS
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-500">
                    PRESS ANY MODULE TO ACTIVATE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {secondaryCategories.map((category) => (
                    <div key={category.title} className="space-y-2">
                      <div className="text-[10px] font-mono-code font-bold tracking-wider text-amber-400/90 uppercase border-b border-slate-800/80 pb-1 flex items-center justify-between">
                        <span>{category.title}</span>
                      </div>
                      <div className="space-y-1">
                        {category.items.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = activeTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              id={`secondary-nav-${subItem.id.toLowerCase()}`}
                              onClick={() => handleNavClick(subItem.id)}
                              className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-2.5 cursor-pointer group ${
                                isSubActive
                                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                                  : 'hover:bg-slate-900/90 border border-transparent text-slate-300'
                              }`}
                            >
                              <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                                isSubActive
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-900 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-800'
                              }`}>
                                <SubIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-military font-bold tracking-wider flex items-center gap-1.5">
                                  <span className="truncate">{subItem.label}</span>
                                  {subItem.highlight && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                  )}
                                </div>
                                <div className="text-[10px] font-mono-code text-slate-400 truncate mt-0.5">
                                  {subItem.subtext}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Global Time & Market Session Modal */}
      <GlobalTimeSessionModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
      />
    </header>
  );
};
