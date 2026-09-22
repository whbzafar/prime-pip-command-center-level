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
  Bell,
  Wallet,
  Brain,
  Terminal,
  Compass,
  Volume2,
  VolumeX,
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
  Cpu,
  Wind,
  Radio,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Lock,
  Layers,
  Globe,
  Palette,
  GraduationCap,
} from 'lucide-react';
import { AccountSettings, TraderPerformanceScores, UserAccount } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { getAppLiveClock, getMarketSessions, getTimezoneLabel, getUserTimezone, MarketSession } from '../utils/time';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { playDisciplineAlert, getAlertSettings, toggleSoundEnabled, AlertSettings } from '../utils/audioAlerts';
import { DailyPrayerBar } from './DailyPrayerBar';
import { EvolutionStatusBadge } from './evolution/EvolutionStatusBadge';
import { GlobalTimeSessionModal } from './GlobalTimeSessionModal';
import { GlobalSearch } from './GlobalSearch';

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
  | 'FUNDAMENTAL_INDICATORS'
  | 'FREEHAND_WORKSPACE'
  | 'PRE_TRADE_PLAN'
  | 'SBT_MODELS'
  | 'COMMUNITY'
  | 'BOOK_SESSION'
  | 'ACCOUNTS'
  | 'SETTINGS'
  | 'ADMIN'
  | 'EVOLUTION'
  | 'PRO_LEARNING';

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
  onOpenTraderProfile?: () => void;
  onOpenEvolution?: () => void;
  onOpenNotifications?: () => void;
  onOpenAppearance?: () => void;
  onOpenAllCategories?: () => void;
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
  onOpenTraderProfile,
  onOpenEvolution,
  onOpenNotifications,
  onOpenAppearance,
  onOpenAllCategories,
}) => {
  const switchTab = onSelectTab || setActiveTab || (() => {});
  const displayScore = overallScore ?? scores?.overallTradingScore ?? 76;
  const [isTimeModalOpen, setIsTimeModalOpen] = React.useState<boolean>(false);
  const [liveClockStr, setLiveClockStr] = React.useState<string>('');
  const [activeSessionSummary, setActiveSessionSummary] = React.useState<string>('');
  const [isPeakLiquidity, setIsPeakLiquidity] = React.useState<boolean>(false);
  const [marketSessions, setMarketSessions] = React.useState<MarketSession[]>([]);
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
      setMarketSessions(sessionData.sessions);
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

  const navScrollRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef<boolean>(false);
  const startXRef = React.useRef<number>(0);
  const scrollLeftRef = React.useRef<number>(0);
  const dragDistanceRef = React.useRef<number>(0);

  // Wheel horizontal scrolling (convert vertical scroll wheel to horizontal scroll)
  const handleNavWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (navScrollRef.current && e.deltaY !== 0 && e.deltaX === 0) {
      navScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Mouse drag support for desktop & laptop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navScrollRef.current) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - navScrollRef.current.offsetLeft;
    scrollLeftRef.current = navScrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !navScrollRef.current) return;
    const x = e.pageX - navScrollRef.current.offsetLeft;
    const walk = x - startXRef.current;
    dragDistanceRef.current = Math.abs(walk);
    navScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  

  const checkScrollState = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
      const max = scrollWidth - clientWidth;
      setScrollProgress(max > 0 ? (scrollLeft / max) * 100 : 0);
    }
  };

  useEffect(() => {
    checkScrollState();
    const t1 = setTimeout(checkScrollState, 80);
    const t2 = setTimeout(checkScrollState, 400);
    const el = navScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollState, { passive: true });
      window.addEventListener('resize', checkScrollState);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        el.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleScrollLeft = () => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({ left: -360, behavior: 'smooth' });
      setTimeout(checkScrollState, 150);
      setTimeout(checkScrollState, 380);
    }
  };

  const handleScrollRight = () => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({ left: 360, behavior: 'smooth' });
      setTimeout(checkScrollState, 150);
      setTimeout(checkScrollState, 380);
    }
  };

  // Auto-scroll active item into view
  React.useEffect(() => {
    if (navScrollRef.current) {
      const activeEl = navScrollRef.current.querySelector<HTMLElement>('[data-active-nav="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      checkScrollState();
    }
  }, [activeTab]);

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

  // Complete List of All 20 Navigation Categories in STRICT Order (01-20)
  const allNavCategories = [
    { id: 'DASHBOARD' as MainNavTab, label: '01. DASHBOARD', icon: Activity },
    { id: 'JOURNAL' as MainNavTab, label: '02. TRADE JOURNAL', icon: BookOpen },
    { id: 'SBT_MODELS' as MainNavTab, label: '03. SBT MODELS', icon: Layers, highlight: true },
    { id: 'LOT_SIZE' as MainNavTab, label: '04. LOT SIZE CALCULATOR', icon: Calculator },
    { id: 'RISK' as MainNavTab, label: '05. RISK MANAGEMENT', icon: Crosshair },
    { id: 'PRE_TRADE_PLAN' as MainNavTab, label: '06. PRE-TRADE PLAN', icon: ShieldAlert, highlight: true },
    { id: 'FUNDAMENTAL_CALENDAR' as MainNavTab, label: '07. LIVE NEWS CALENDAR', icon: Calendar, highlight: true },
    { id: 'FUNDAMENTAL_INDICATORS' as MainNavTab, label: '08. FUNDAMENTAL INDICATORS', icon: Globe, highlight: true },
    { id: 'SIGNALS' as MainNavTab, label: '09. PREMIUM SIGNALS', icon: Radio, highlight: true, comingSoon: true, locked: true },
    { id: 'COMPOUNDING' as MainNavTab, label: '10. COMPOUNDING TOOLS', icon: Calculator },
    { id: 'PERFORMANCE' as MainNavTab, label: '11. PERFORMANCE REPORT', icon: BarChart3 },
    { id: 'DAILY_DEV' as MainNavTab, label: '12. DAILY DEVELOPMENT', icon: Award },
    { id: 'PSYCHOLOGY' as MainNavTab, label: '13. PSYCHOLOGICAL CENTER', icon: Brain, highlight: true },
    { id: 'CALMING_TOOLS' as MainNavTab, label: '14. TRADING TOOL SUITE', icon: Wind, highlight: true },
    { id: 'RESEARCH' as MainNavTab, label: '15. ACADEMIC RESEARCH', icon: Compass, highlight: true },
    { id: 'FREEHAND_WORKSPACE' as MainNavTab, label: '16. FREEHAND CANVAS', icon: PenTool },
    { id: 'COMMUNITY' as MainNavTab, label: '17. TRADER COMMUNITY FEED', icon: Users },
    { id: 'BOOK_SESSION' as MainNavTab, label: '18. BOOK A SESSION', icon: MessageSquare, highlight: true },
    { id: 'SETTINGS' as MainNavTab, label: '19. DATA EXPORT & BACKUP', icon: Settings2 },
    { id: 'ADMIN' as MainNavTab, label: '20. ADMIN PANEL (OWNER)', icon: ShieldCheck, highlight: currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' },
    { id: 'EVOLUTION' as MainNavTab, label: '21. EVALUATION ENGINE', icon: Cpu, highlight: true },
    { id: 'PRO_LEARNING' as MainNavTab, label: '22. PRO LEARNING TRADING', icon: GraduationCap, highlight: true, comingSoon: true, locked: false },
  ];

  const handleNavClick = (id: MainNavTab) => {
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
    <header className="contents">
      {/* Slim Top Bar: Active Category & Notification Bell */}
      <div className="w-full h-9 sm:h-10 shrink-0 relative px-2.5 sm:px-4 bg-[#080C14]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between gap-2 text-[11px] sm:text-xs font-mono-code text-slate-300 z-10 select-none">
        {/* Left: Active Category / Section */}
        <button
          type="button"
          onClick={() => {
            if (onOpenAllCategories) onOpenAllCategories();
          }}
          className="flex items-center gap-1.5 sm:gap-2 min-w-0 hover:opacity-85 transition cursor-pointer text-left group"
          title="Click to explore all 22 categories & modules"
        >
          <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:border-cyan-400/50">
            {React.createElement(
              allNavCategories.find((c) => c.id === activeTab)?.icon || Activity,
              { className: 'w-3 h-3' }
            )}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-military font-bold text-slate-100 tracking-wider truncate text-[10px] sm:text-xs group-hover:text-cyan-300 transition">
              {allNavCategories.find((c) => c.id === activeTab)?.label || 'COMMAND CENTER'}
            </span>
            <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-slate-800/80 text-cyan-400/90 font-mono-code hidden sm:inline">
              EXPLORE ALL
            </span>
          </div>
        </button>

        {/* Right: Quick Actions & Notification Bell */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Tactical Notification Bell */}
          <button
            type="button"
            onClick={handleTestSound}
            id="persistent-notification-bell-btn"
            title={
              alertSettings.soundEnabled
                ? 'Notifications & Audio Alerts: ACTIVE (Click to test chime)'
                : 'Notifications & Audio Alerts: MUTED (Click to activate)'
            }
            className="relative p-1 rounded-md bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span
              className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                alertSettings.soundEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Header Block (Status, Prayer Bar, Logo, Sessions, & Category Bar) */}
      <div className="w-full bg-[#0B0F19] relative z-10">
        {/* Daily Astronomical Islamic Prayer Tracker Bar */}
        <DailyPrayerBar />

      {/* Top Tactical Status Bar */}
      <div className="px-2.5 sm:px-4 py-1 border-b border-slate-800/60 bg-[#020617] flex flex-wrap items-center justify-between gap-y-1 gap-x-1.5 text-[10px] font-mono-code text-slate-400">
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap">
          {/* Offline/Online Status */}
          <OfflineIndicator />

          {/* Autonomous Evolution Engine Status Badge */}
          <EvolutionStatusBadge onOpenEvolution={onOpenEvolution} />

          {/* Demo Mode Badge */}
          {isDemoMode && (
            <div className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-blue-500/20 text-amber-300 border border-blue-500/40 font-bold text-[9px] tracking-wide animate-pulse">
              <span>● DEMO</span>
            </div>
          )}

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Dynamic Trade Limit Protocol Status */}
          {isLimitReached ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold animate-pulse text-[10px]">
              <ShieldAlert className="w-3 h-3" />
              <span>STOP TRADING ({tradesToday}/{maxDailyTrades})</span>
            </div>
          ) : isOneTradeRemaining ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-cyan-400 border border-blue-500/30 font-bold text-[10px]">
              <ShieldAlert className="w-3 h-3" />
              <span className="hidden sm:inline">TRADE 1 OF {maxDailyTrades} • 1 REMAINING</span>
              <span className="sm:hidden">1 LEFT</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 text-emerald-400 text-[10px]">
              <ShieldAlert className="w-3 h-3" />
              <span>DISCIPLINE READY ({tradesToday}/{maxDailyTrades})</span>
            </div>
          )}

          <span className="text-slate-700 hidden md:inline">|</span>

          {/* Global Time & Market Session Tactical Chip */}
          <button
            type="button"
            onClick={() => setIsTimeModalOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-slate-200 transition cursor-pointer group text-[10px]"
            title="Click to change timezone, switch 12h/24h format, and view global market sessions"
          >
            <Clock className="w-3 h-3 text-sky-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="font-bold">{liveClockStr || 'WORLD CLOCK'}</span>
            {activeSessionSummary && (
              <span
                  className={`inline-block max-w-[42vw] truncate px-1 py-0.2 rounded text-[9px] font-bold tracking-tight ${
                  isPeakLiquidity
                    ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40 animate-pulse'
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
              <div className="hidden lg:flex items-center gap-1 text-slate-400 text-[10px]">
                <span className="text-emerald-400">●</span>
                <span>SAVED: {lastSavedTime}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-code transition border cursor-pointer ${
              alertSettings.soundEnabled
                ? 'bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border-slate-800'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {alertSettings.soundEnabled ? (
              <>
                <Volume2 className={`w-3 h-3 ${soundTested ? 'text-cyan-400 animate-pulse' : 'text-emerald-400'}`} />
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

          <div className="flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 text-[10px]">
            <span className="text-slate-400 font-normal hidden sm:inline">SCORE:</span>
            <span
              className={`font-bold ${
                displayScore >= 80
                  ? 'text-emerald-400'
                  : displayScore >= 60
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}
            >
              {displayScore}
            </span>
          </div>

          {currentUser && onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="flex items-center gap-1 p-0.5 rounded text-slate-400 hover:text-cyan-400 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenBackupModal && (
            <button
              id="header-backup-data-btn"
              onClick={onOpenBackupModal}
              title="Backup & Restore Journal Data"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 text-[10px] font-mono-code transition cursor-pointer"
            >
              <Database className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">BACKUP</span>
            </button>
          )}

          {onOpenAppearance && (
            <button
              type="button"
              onClick={onOpenAppearance}
              title="Brightness and theme"
              aria-label="Open appearance controls"
              className="flex items-center gap-1 rounded border border-slate-800 bg-slate-950/90 px-1.5 py-0.5 text-[10px] text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              <Palette className="h-3 w-3" />
              <span className="hidden sm:inline">THEME</span>
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
                <Download className="w-3 h-3" />
              </button>
            )}
            {onImportData && (
              <label
                title="Import Journal (JSON)"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <Upload className="w-3 h-3" />
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
      <div className="px-2.5 sm:px-4 lg:px-6 py-1 sm:py-1.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Brand */}
        <button 
          onClick={() => {
            if (onSelectTab) onSelectTab('DASHBOARD');
            else if (setActiveTab) setActiveTab('DASHBOARD');
          }}
          className="flex items-center gap-2 text-left group cursor-pointer transition-all duration-300 hover:opacity-90"
          title="Return to Dashboard"
        >
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 shrink-0 group-hover:animate-prime-logo-pulse drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Ascending Chart Bars */}
              <rect x="10" y="55" width="15" height="35" rx="1.5" fill="url(#barGrad)"/>
              <rect x="30" y="40" width="15" height="50" rx="1.5" fill="url(#barGrad)"/>
              <rect x="50" y="25" width="15" height="65" rx="1.5" fill="url(#barGrad)"/>
              <rect x="70" y="10" width="15" height="80" rx="1.5" fill="url(#barGrad)"/>
              
              {/* Sweeping Arrow */}
              <path d="M 2 55 Q 40 45 68 15 L 65 2 L 98 2 L 98 35 L 85 32 Q 50 65 5 65 Z" fill="#38bdf8"/>
              
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0ea5e9"/>
                  <stop offset="1" stopColor="#0369a1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="group-hover:animate-prime-logo-pulse transition-opacity duration-700">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 transition-colors leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                PrimePips<span className="text-sky-400">FX</span>
              </h1>
              <span className="text-[7px] sm:text-[8px] uppercase tracking-wider font-mono-code px-1 py-0.2 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/30 font-bold group-hover:bg-blue-500/20">
                COMMAND
              </span>
            </div>
            <p className="text-[9px] text-slate-400 tracking-wide font-sans group-hover:text-slate-300 transition-colors hidden sm:block mt-0.5">
              Tactical Journal • Psychology Intelligence • Risk Defense
            </p>
          </div>
        </button>

        {/* Account Quick Badge & Switcher Trigger */}
        {account && (
          <button
            onClick={onOpenAccountManager}
            title="Manage or Switch Accounts"
            className="hidden lg:flex items-center gap-2 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 px-2.5 py-1 rounded-md transition text-left cursor-pointer group"
          >
            <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
              <Wallet className="w-3 h-3" />
            </div>
            <div>
              <div className="text-[9px] uppercase font-mono-code text-slate-400 flex items-center gap-1">
                <span>{account.accountName}</span>
                <span className="text-cyan-400/80 text-[8px] font-bold">[{account.accountType.replace(/_/g, ' ')}]</span>
              </div>
              <div className="text-xs font-bold font-mono-code text-slate-100 flex items-center gap-1.5">
                <span>
                  {formatCurrency(account.currentBalance, account.currency)}
                </span>
                <span className="text-[9px] text-cyan-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-1 rounded">
                  SWITCH ▾
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Global discovery and account actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <GlobalSearch onNavigate={switchTab} />
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={onOpenProfile}
                title="Edit Your Profile & Status"
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 text-[11px] font-mono-code transition cursor-pointer group"
              >
                <div className="relative">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-5 h-5 rounded-full object-cover border border-blue-500/50"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                  {/* Online status indicator dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-slate-900 ${
                      currentUser.onlineStatus === 'AWAY'
                        ? 'bg-cyan-400'
                        : currentUser.onlineStatus === 'OFFLINE'
                        ? 'bg-slate-500'
                        : 'bg-emerald-400'
                    }`}
                    title={`Status: ${currentUser.onlineStatus || 'ONLINE'}`}
                  />
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-[10px] font-bold text-slate-200 group-hover:text-amber-300 transition flex items-center gap-1 leading-tight">
                    <span>{currentUser.name || currentUser.username}</span>
                    {currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.isDeveloper ? (
                      <ShieldCheck className="w-2.5 h-2.5 text-cyan-400 inline" />
                    ) : null}
                  </div>
                  <span className="text-[8px] text-slate-500 block leading-none">
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
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border font-military font-bold text-[11px] tracking-wider transition-all duration-200 cursor-pointer shadow-sm group ${
                  activeTab === 'PSYCHOLOGY'
                    ? 'bg-gradient-to-r from-blue-500 to-amber-600 text-slate-950 border-cyan-400 shadow-blue-500/25 ring-1 ring-cyan-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${
                  activeTab === 'PSYCHOLOGY' ? 'bg-slate-950/20 text-slate-950' : 'text-cyan-400'
                }`}>
                  <Brain className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-left flex flex-col justify-center leading-tight">
                  <span className="whitespace-nowrap">Psych Center</span>
                </div>
              </button>

              {/* Evolution Engine Owner Shortcut */}
              {(currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.isDeveloper || currentUser.username === 'primepipfx-admin') && (
                <button
                  id="header-evolution-engine-btn"
                  type="button"
                  onClick={() => switchTab('EVOLUTION')}
                  title="PrimePipFX Self-Evolving Intelligence Engine"
                  className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-md border font-military font-bold text-[11px] tracking-wider transition cursor-pointer ${
                    activeTab === 'EVOLUTION'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50'
                  }`}
                >
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  <span>EVOLUTION</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  title={`Logout (${currentUser.username})`}
                  className="p-1 rounded-md bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-military font-bold tracking-wider transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>LOGIN</span>
                </button>
              )}

              {/* Dedicated Psychological Center Button in Demo/Pre-Login Mode */}
              <button
                id="header-psychological-center-guest-btn"
                type="button"
                onClick={() => switchTab('PSYCHOLOGY')}
                title="Psychological Center — Train your mindset. Protect your discipline. Improve your execution."
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md border font-military font-bold text-[11px] tracking-wider transition-all duration-200 cursor-pointer shadow-sm group prime-ios-touch ${
                  activeTab === 'PSYCHOLOGY'
                    ? 'bg-gradient-to-r from-blue-500 to-amber-600 text-slate-950 border-cyan-400 shadow-blue-500/25 ring-1 ring-cyan-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${
                  activeTab === 'PSYCHOLOGY' ? 'bg-slate-950/20 text-slate-950' : 'text-cyan-400'
                }`}>
                  <Brain className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-left flex flex-col justify-center leading-tight">
                  <span className="whitespace-nowrap hidden sm:inline">Psych Center</span>
                  <span className="sm:hidden font-mono-code text-[10px]">MINDSET</span>
                </div>
              </button>
            </div>
          )}

          {onOpenAccountManager && (
            <button
              id="mobile-account-manage-btn"
              onClick={onOpenAccountManager}
              className="lg:hidden flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-cyan-400 font-military text-[11px] font-bold prime-ios-touch cursor-pointer"
              title="Accounts & Balance"
            >
              <Wallet className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">ACCOUNTS</span>
              <span className="sm:hidden text-[9px] font-mono-code">
                {account ? formatCurrency(account.currentBalance, account.currency).split('.')[0] : 'ACC'}
              </span>
            </button>
          )}

          <button
            id="open-new-trade-btn"
            onClick={onOpenNewTrade}
            className="prime-btn-primary prime-light-sweep flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs shadow-md shadow-blue-500/20 cursor-pointer prime-ios-touch"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="hidden sm:inline">ENTER NEW TRADE</span>
            <span className="sm:hidden">TRADE</span>
          </button>
        </div>
      </div>

      {/* Responsive current-session indicator */}
      <div className="flex w-full items-center gap-1.5 overflow-x-auto border-t border-slate-800/60 bg-[#070C16]/95 px-2.5 py-1 no-scrollbar sm:px-4">
        <span className="shrink-0 text-[9px] font-mono-code font-bold uppercase tracking-wider text-slate-500">Market now</span>
        {marketSessions.filter((session) => session.isOpen).map((session) => (
          <span key={session.id} className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-mono-code ${session.isPeakLiquidity ? 'border-amber-400/50 bg-amber-400/10 text-amber-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
            <span>{session.flag}</span>
            <span>{session.name.replace(' Session', '')}</span>
            <span className="text-slate-500">{session.timeRemainingStr}</span>
          </span>
        ))}
        {!marketSessions.some((session) => session.isOpen) && <span className="shrink-0 text-[9px] font-mono-code text-slate-400">Global sessions closed</span>}
      </div>

      {/* Horizontally Scrollable Full Navigation Bar with 4-Side Animated Perimeter Beams & Prominent Scroll Markers */}
      <div id="category-navigation-bar" className="w-full border-y border-slate-800/80 py-1 px-1 sm:px-2 bg-[#0b1122]/95 backdrop-blur relative z-10 min-h-[40px] sm:min-h-[44px] flex items-center gap-1 sm:gap-2 shadow-lg shadow-slate-950/60 select-none overflow-hidden">
        {/* Category 4-Side Animated Perimeter Hyper-Laser Conduits with Multi-Color Quantum Orbit */}
        {/* 1. Top beam: Electric Violet to Neon Rose with White-Hot Core */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800/40 overflow-hidden pointer-events-none z-20">
          <div className="w-full h-full relative">
            <div className="absolute inset-y-0 w-1/3 flex items-center animate-category-beam-top">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-violet-400 via-fuchsia-400 to-rose-400 shadow-[0_0_12px_#c084fc,0_0_24px_#f43f5e]" />
              <div className="w-1.5 h-1.5 -ml-0.5 rounded-full bg-white shadow-[0_0_6px_#ffffff,0_0_12px_#c084fc] shrink-0" />
            </div>
          </div>
        </div>

        {/* 2. Right beam: Neon Rose to Solar Amber with White-Hot Core */}
        <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-slate-800/40 overflow-hidden pointer-events-none z-20">
          <div className="w-full h-full relative">
            <div className="absolute inset-x-0 h-1/3 flex flex-col items-center animate-category-beam-right">
              <div className="w-full h-full bg-gradient-to-b from-transparent via-rose-400 via-pink-400 to-amber-300 shadow-[0_0_12px_#f43f5e,0_0_24px_#f59e0b]" />
              <div className="w-1.5 h-1.5 -mt-0.5 rounded-full bg-white shadow-[0_0_6px_#ffffff,0_0_12px_#f43f5e] shrink-0" />
            </div>
          </div>
        </div>

        {/* 3. Bottom beam: Solar Amber to Matrix Emerald with White-Hot Core */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800/40 overflow-hidden pointer-events-none z-20">
          <div className="w-full h-full relative">
            <div className="absolute inset-y-0 w-1/3 flex items-center justify-end animate-category-beam-bottom">
              <div className="w-1.5 h-1.5 -mr-0.5 rounded-full bg-white shadow-[0_0_6px_#ffffff,0_0_12px_#10b981] shrink-0" />
              <div className="w-full h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-transparent shadow-[0_0_12px_#f59e0b,0_0_24px_#10b981]" />
            </div>
          </div>
        </div>

        {/* 4. Left beam: Matrix Emerald to Electric Violet with White-Hot Core */}
        <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-slate-800/40 overflow-hidden pointer-events-none z-20">
          <div className="w-full h-full relative">
            <div className="absolute inset-x-0 h-1/3 flex flex-col items-center justify-end animate-category-beam-left">
              <div className="w-1.5 h-1.5 -mb-0.5 rounded-full bg-white shadow-[0_0_6px_#ffffff,0_0_12px_#a855f7] shrink-0" />
              <div className="w-full h-full bg-gradient-to-b from-violet-400 via-emerald-400 to-transparent shadow-[0_0_12px_#10b981,0_0_24px_#a855f7]" />
            </div>
          </div>
        </div>

        {/* Left Scroll Marker Button — Prominent, bidirectional indicator */}
        <button
          type="button"
          id="category-scroll-left-marker"
          onClick={handleScrollLeft}
          title="Scroll Left — Reveal Previous Categories"
          aria-label="Scroll Categories Left"
          className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md relative z-30 ${
            canScrollLeft
              ? 'bg-slate-900/90 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-400/60 hover:border-cyan-300 shadow-cyan-500/20 active:scale-90 hover:scale-105'
              : 'bg-slate-950/60 text-slate-600 border border-slate-800/80 hover:text-cyan-400 hover:border-slate-700 active:scale-95'
          }`}
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>

        {/* Categories Horizontal Scroll Track with Overflow Edge Fades */}
        <div className="relative flex-1 min-w-0 overflow-hidden z-10">
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r from-[#0e162b] to-transparent pointer-events-none z-10" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-l from-[#0e162b] to-transparent pointer-events-none z-10" />
          )}

          <div
            ref={navScrollRef}
            onWheel={handleNavWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap cursor-grab active:cursor-grabbing touch-pan-x scroll-smooth py-0.5 px-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {allNavCategories.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isComingSoon = (item as any).comingSoon;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id.toLowerCase()}`}
                  data-active-nav={isActive ? 'true' : 'false'}
                  onClick={(e) => {
                    if (dragDistanceRef.current > 6) {
                      e.preventDefault();
                      return;
                    }
                    handleNavClick(item.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-md shadow-cyan-500/30'
                      : 'bg-[#131f38] hover:bg-[#1a2b4c] text-slate-200 hover:text-cyan-300 border-slate-700/80 hover:border-cyan-500/50'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : item.highlight ? 'text-cyan-400' : 'text-slate-300'}`} />
                  <span className="text-[11px] font-mono-code font-bold tracking-tight uppercase">{item.label}</span>
                  {isComingSoon && (
                    <span className="text-[8px] bg-blue-500/20 text-cyan-300 border border-blue-500/40 px-1 rounded uppercase">
                      SOON
                    </span>
                  )}
                </button>
              );
            })}

            {/* Dedicated Explore All Categories button right at end of tabs */}
            {onOpenAllCategories && (
              <button
                id="nav-explore-all-btn"
                type="button"
                onClick={onOpenAllCategories}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-mono-code text-[11px] font-bold tracking-wider transition cursor-pointer shrink-0 ml-1 shadow-sm"
                title="Explore all 21 categories"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-300" />
                <span>EXPLORE ALL (21)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Scroll Marker Button — Prominent, bidirectional indicator */}
        <button
          type="button"
          id="category-scroll-right-marker"
          onClick={handleScrollRight}
          title="Scroll Right — Reveal More Categories"
          aria-label="Scroll Categories Right"
          className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md relative z-30 ${
            canScrollRight
              ? 'bg-slate-900/90 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-400/60 hover:border-cyan-300 shadow-cyan-500/20 active:scale-90 hover:scale-105'
              : 'bg-slate-950/60 text-slate-600 border border-slate-800/80 hover:text-cyan-400 hover:border-slate-700 active:scale-95'
          }`}
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
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