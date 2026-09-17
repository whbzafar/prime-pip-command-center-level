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
  Sparkles,
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
  | 'SBT_MODELS'
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
  onOpenNotifications?: () => void;
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
  onOpenNotifications,
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

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  // Dynamic header collapse on scroll

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Use hysteresis (different thresholds) to prevent layout thrashing and blinking!
      // The collapsible header is around 250px tall. 
      // If we collapse it at 50px, scrollY drops below 0 and it instantly expands again (blinking).
      // By waiting until scrollY > 400 to collapse, and expanding only when scrollY < 50, we eliminate the loop.
      if (currentScrollY > 400 && !isHeaderCollapsed) {
        setIsHeaderCollapsed(true);
      } else if (currentScrollY < 50 && isHeaderCollapsed) {
        setIsHeaderCollapsed(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeaderCollapsed]);

  

  const checkScrollState = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
      const max = scrollWidth - clientWidth;
      setScrollProgress(max > 0 ? (scrollLeft / max) * 100 : 0);
    }
  };

  useEffect(() => {
    checkScrollState();
    const el = navScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollState, { passive: true });
      window.addEventListener('resize', checkScrollState);
      return () => {
        el.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
  }, []);

  const handleScrollLeft = () => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
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
    { id: 'SIGNALS' as MainNavTab, label: '08. PREMIUM SIGNALS', icon: Radio, highlight: true, comingSoon: true, locked: true },
    { id: 'COMPOUNDING' as MainNavTab, label: '09. COMPOUNDING TOOLS', icon: Calculator },
    { id: 'PERFORMANCE' as MainNavTab, label: '10. PERFORMANCE REPORT', icon: BarChart3 },
    { id: 'DAILY_DEV' as MainNavTab, label: '11. DAILY DEVELOPMENT', icon: Award },
    { id: 'PSYCHOLOGY' as MainNavTab, label: '12. PSYCHOLOGICAL CENTER', icon: Brain, highlight: true },
    { id: 'CALMING_TOOLS' as MainNavTab, label: '13. TRADING TOOL SUITE', icon: Wind, highlight: true },
    { id: 'RESEARCH' as MainNavTab, label: '14. ACADEMIC RESEARCH', icon: Compass, highlight: true },
    { id: 'FREEHAND_WORKSPACE' as MainNavTab, label: '15. FREEHAND CANVAS', icon: PenTool },
    { id: 'COMMUNITY' as MainNavTab, label: '16. TRADER COMMUNITY FEED', icon: Users },
    { id: 'BOOK_SESSION' as MainNavTab, label: '17. BOOK A SESSION', icon: MessageSquare, highlight: true },
    { id: 'SETTINGS' as MainNavTab, label: '18. DATA EXPORT & BACKUP', icon: Settings2 },
    { id: 'ADMIN' as MainNavTab, label: '19. ADMIN PANEL (OWNER)', icon: ShieldCheck, highlight: currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' },
    { id: 'EVOLUTION' as MainNavTab, label: '20. EVALUATION ENGINE', icon: Cpu, highlight: true },
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
      {/* Persistent Slim Top Bar: Active Category, Notification Bell & Manual Chevron Toggle */}
      <div className="w-full h-12 shrink-0 sticky top-0 px-3 sm:px-4 bg-[#080C14]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono-code text-slate-300 z-[1000]">
        {/* Left: Active Category / Section */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            {React.createElement(
              allNavCategories.find((c) => c.id === activeTab)?.icon || Activity,
              { className: 'w-3.5 h-3.5' }
            )}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-military font-bold text-slate-100 tracking-wider truncate text-[11px] sm:text-xs">
              {allNavCategories.find((c) => c.id === activeTab)?.label || 'COMMAND CENTER'}
            </span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-400/90 font-mono-code hidden sm:inline">
              LIVE
            </span>
          </div>
        </div>

        {/* Right: Quick Actions, Notification Bell & Manual Chevron Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Trade Button when header is collapsed */}
          {!!isHeaderCollapsed && (
            <button
              onClick={onOpenNewTrade}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-[10px] tracking-wider transition shadow-sm cursor-pointer"
              title="Enter New Trade"
            >
              <PlusCircle className="w-3 h-3 stroke-[2.5]" />
              <span className="hidden xs:inline">TRADE</span>
            </button>
          )}

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
            className="relative p-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span
              className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                alertSettings.soundEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </button>

          
        </div>
      </div>

      
      {/* Collapsible Upper Header Block (Status, Prayer Bar, Logo & Profile) */}
      <div
        className={`w-full bg-[#0B0F19] relative z-[100] header-collapsible transition-all duration-300 ease-in-out overflow-hidden ${
          !isHeaderCollapsed
            ? 'max-h-[900px] opacity-100'
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
        
      >
        {/* Daily Astronomical Islamic Prayer Tracker Bar */}
        <DailyPrayerBar />

      {/* Top Tactical Status Bar */}
      <div className="px-3 sm:px-4 py-1.5 border-b border-slate-800/60 bg-[#020617] flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[10px] sm:text-xs font-mono-code text-slate-400">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Offline/Online Status */}
          <OfflineIndicator />

          {/* Autonomous Evolution Engine Status Badge */}
          <EvolutionStatusBadge onOpenEvolution={onOpenEvolution} />

          {/* Demo Mode Badge */}
          {isDemoMode && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-amber-300 border border-blue-500/40 font-bold text-[10px] tracking-wide animate-pulse">
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
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/15 text-cyan-400 border border-blue-500/30 font-bold text-[11px]">
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
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-slate-200 transition cursor-pointer group text-[11px]"
            title="Click to change timezone, switch 12h/24h format, and view global market sessions"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="font-bold">{liveClockStr || 'WORLD CLOCK'}</span>
            {activeSessionSummary && (
              <span
                className={`hidden xl:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold tracking-tight ${
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

          <div className="flex items-center gap-1 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
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
              className="flex items-center gap-1 p-1 rounded text-slate-400 hover:text-cyan-400 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          {onOpenBackupModal && (
            <button
              id="header-backup-data-btn"
              onClick={onOpenBackupModal}
              title="Backup & Restore Journal Data"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 text-[11px] font-mono-code transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
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
      <div className="px-4 lg:px-6 py-1.5 lg:py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <button 
          onClick={() => {
            if (onSelectTab) onSelectTab('DASHBOARD');
            else if (setActiveTab) setActiveTab('DASHBOARD');
          }}
          className="flex items-center gap-2 text-left group cursor-pointer transition-all duration-300 hover:opacity-90"
          title="Return to Dashboard"
        >
          <div className="flex items-center justify-center w-10 h-10 shrink-0 group-hover:animate-prime-logo-pulse drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]">
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 transition-colors leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                PrimePips<span className="text-sky-400">FX</span>
              </h1>
              <span className="text-[8px] uppercase tracking-widest font-mono-code px-1.5 py-[1px] rounded bg-blue-500/10 text-cyan-400 border border-blue-500/30 font-bold group-hover:bg-blue-500/20">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-sans group-hover:text-slate-300 transition-colors mt-0.5">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>
        </button>

        {/* Account Quick Badge & Switcher Trigger */}
        {account && (
          <button
            onClick={onOpenAccountManager}
            title="Manage or Switch Accounts"
            className="hidden lg:flex items-center gap-3 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 px-3.5 py-1.5 rounded-lg transition text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono-code text-slate-400 flex items-center gap-1">
                <span>{account.accountName}</span>
                <span className="text-cyan-400/80 text-[9px] font-bold">[{account.accountType.replace(/_/g, ' ')}]</span>
              </div>
              <div className="text-sm font-bold font-mono-code text-slate-100 flex items-center gap-2">
                <span>
                  {formatCurrency(account.currentBalance, account.currency)}
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-1 rounded">
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
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 text-xs font-mono-code transition cursor-pointer group"
              >
                <div className="relative">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover border border-blue-500/50"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {/* Online status indicator dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
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
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 transition flex items-center gap-1">
                    <span>{currentUser.name || currentUser.username}</span>
                    {currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.isDeveloper ? (
                      <ShieldCheck className="w-3 h-3 text-cyan-400 inline" />
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
                    ? 'bg-gradient-to-r from-blue-500 to-amber-600 text-slate-950 border-cyan-400 shadow-blue-500/25 ring-1 ring-cyan-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform group-hover:scale-110 ${
                  activeTab === 'PSYCHOLOGY' ? 'bg-slate-950/20 text-slate-950' : 'text-cyan-400'
                }`}>
                  <Brain className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-left flex flex-col justify-center leading-tight">
                  <span className="whitespace-nowrap">Psychological Center</span>
                  <span className={`text-[9px] font-mono-code hidden md:inline uppercase tracking-normal ${
                    activeTab === 'PSYCHOLOGY' ? 'text-slate-950 font-semibold' : 'text-slate-400 group-hover:text-cyan-400/80'
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
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-blue-500/50 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-military font-bold text-xs tracking-wider transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
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
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-md shadow-blue-500/20 cursor-pointer"
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
                    ? 'bg-gradient-to-r from-blue-500 to-amber-600 text-slate-950 border-cyan-400 shadow-blue-500/25 ring-1 ring-cyan-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${
                  activeTab === 'PSYCHOLOGY' ? 'bg-slate-950/20 text-slate-950' : 'text-cyan-400'
                }`}>
                  <Brain className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-left flex flex-col justify-center leading-tight">
                  <span className="whitespace-nowrap hidden sm:inline">Psychological Center</span>
                  <span className="sm:hidden font-mono-code text-[11px]">MINDSET</span>
                  <span className={`text-[9px] font-mono-code hidden md:inline uppercase tracking-normal ${
                    activeTab === 'PSYCHOLOGY' ? 'text-slate-950 font-semibold' : 'text-slate-400 group-hover:text-cyan-400/80'
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
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-cyan-400 font-military text-xs font-bold prime-ios-touch cursor-pointer"
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
            className="prime-btn-primary prime-light-sweep flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-xl shadow-blue-500/20 cursor-pointer prime-ios-touch"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="hidden sm:inline">ENTER NEW TRADE</span>
            <span className="sm:hidden">TRADE</span>
          </button>
        </div>
      </div>

      {/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}
      <div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden sticky top-12 z-[990] min-h-[44px] flex flex-col justify-center shadow-md shadow-slate-900/50">
        {/* Overflow Gradient Shadows for Visual Cue */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#090D15] to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#090D15] to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={navScrollRef}
          onWheel={handleNavWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-center gap-1.5 px-3 sm:px-6 overflow-x-auto overflow-y-hidden select-none whitespace-nowrap cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
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
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-military tracking-wider font-semibold transition-all duration-200 select-none whitespace-nowrap active:scale-95 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-500/15 text-amber-300 shadow-sm shadow-blue-500/15 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/70 border border-transparent'
                } ${item.highlight && !isActive ? 'text-amber-300/80 font-bold' : ''}`}
              >
                {/* Animated Logo Container */}
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'bg-blue-500/20 text-amber-300'
                      : 'text-slate-400 group-hover:text-amber-300 group-hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:rotate-6 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                </div>
                <span className="truncate">{item.label}</span>

                {isComingSoon && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-blue-500/10 text-cyan-400/90 border border-blue-500/30">
                    <Lock className="w-2.5 h-2.5" />
                    <span>SOON</span>
                  </span>
                )}

                {item.highlight && !isComingSoon && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PC & Laptop Scroll Control & Discovery Indicator Strip */}
      <div className="w-full bg-[#060A12]/95 backdrop-blur border-t border-b border-slate-800/60 px-3 sm:px-4 py-1 flex items-center justify-between gap-2 sm:gap-4 text-[10px] font-mono-code text-slate-400 select-none overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          type="button"
          onClick={handleScrollLeft}
          disabled={!canScrollLeft}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            canScrollLeft
              ? 'bg-slate-950/90 hover:bg-slate-800 text-amber-300 border-slate-700 hover:border-blue-500/50 shadow-sm shadow-blue-500/10 active:scale-95'
              : 'opacity-30 text-slate-600 border-transparent cursor-not-allowed'
          }`}
          title="Scroll Left — See previous categories"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-bold">PREV</span>
        </button>

        <div className="flex-1 min-w-[200px] max-w-md mx-auto flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0 uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>EXPLORE ALL CATEGORIES</span>
          </div>
          <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-amber-300 rounded-full transition-all duration-200"
              style={{ width: `${Math.max(12, scrollProgress)}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-cyan-400/90 shrink-0 font-semibold">
            <span className="hidden md:inline">SCROLL FOR MORE</span>
            <ChevronRight className={`w-3.5 h-3.5 text-cyan-400 ${canScrollRight ? 'animate-bounce' : ''}`} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleScrollRight}
          disabled={!canScrollRight}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            canScrollRight
              ? 'bg-slate-950/90 hover:bg-slate-800 text-amber-300 border-slate-700 hover:border-blue-500/50 shadow-sm shadow-blue-500/15 ring-1 ring-blue-500/40 active:scale-95 animate-pulse'
              : 'opacity-30 text-slate-600 border-transparent cursor-not-allowed'
          }`}
          title="Scroll Right — More categories ahead"
        >
          <span className="hidden sm:inline font-bold">MORE CATEGORIES</span>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
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
