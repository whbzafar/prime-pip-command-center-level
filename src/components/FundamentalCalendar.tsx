import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarEvent,
  CalendarMeta,
  fetchYearEvents,
  fetchMonthEvents,
  fetchWeekEvents,
  fetchUpcomingEvents,
  fetchHistoricalEvents,
  syncCalendar,
  getCalendarMeta,
  getCachedCalendar,
} from '../services/economicCalendarService';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Filter,
  Layers,
  Flame,
  RefreshCw,
  Wifi,
  WifiOff,
  CalendarDays,
  History,
  Folder,
  BarChart2,
  Clock4,
  ShieldAlert,
  Zap,
  ExternalLink,
  Globe,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  BellOff,
  Maximize2,
  Minimize2,
  CheckCircle2,
} from 'lucide-react';
import { playDisciplineAlert, getAlertSettings, saveAlertSettings } from '../utils/audioAlerts';

const REAL_TIME_MACRO_HUBS = [
  {
    name: 'Forex Factory Calendar',
    tag: 'PRIMARY CALENDAR',
    url: 'https://www.forexfactory.com/calendar',
    highlight: true,
    desc: 'Real-time release updates, consensus forecast numbers & live volatility deviation impact.',
  },
  {
    name: 'Forex Factory News Wire',
    tag: 'LIVE BREAKING NEWS',
    url: 'https://www.forexfactory.com/news',
    highlight: true,
    desc: 'High-speed headline dispatches on central banks, currencies & macro shocks.',
  },
  {
    name: 'DailyFX Economic Calendar',
    tag: 'ANALYST FORECASTS',
    url: 'https://www.dailyfx.com/economic-calendar',
    highlight: false,
    desc: 'Live macroeconomic calendar with volatility ratings and technical market analysis.',
  },
  {
    name: 'Investing.com Global Desk',
    tag: 'CENTRAL BANKS',
    url: 'https://www.investing.com/economic-calendar/',
    highlight: false,
    desc: 'Multi-nation event schedules, Fed rate monitors & actual vs prior data.',
  },
  {
    name: 'TradingView Macro Calendar',
    tag: 'CHART SYNC',
    url: 'https://www.tradingview.com/economic-calendar/',
    highlight: false,
    desc: 'Live economic events synced directly with historical chart price action.',
  },
  {
    name: 'Federal Reserve FOMC Calendar',
    tag: 'FED OFFICIAL',
    url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    highlight: false,
    desc: 'Official US rate decision dates, press conference webcasts & SEP projections.',
  },
  {
    name: 'FXStreet Real-Time Calendar',
    tag: 'FAST EXECUTION',
    url: 'https://www.fxstreet.com/economic-calendar',
    highlight: false,
    desc: 'Ultra-low latency calendar feed with deviation barometers and central bank radar.',
  },
];

type CalendarViewMode = 'YEAR' | 'MONTH' | 'WEEK' | 'UPCOMING' | 'HISTORICAL';

interface ActiveAudioAlert {
  event: CalendarEvent;
  minutesRemaining: number;
  id: string;
}

export const FundamentalCalendar: React.FC = () => {
  // Navigation & View states
  const [viewMode, setViewMode] = useState<CalendarViewMode>('UPCOMING'); // Default is FULL YEAR
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [meta, setMeta] = useState<CalendarMeta | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Filters: Month, Impact, Currency
  const [filterImportance, setFilterImportance] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' }));

  // Internet connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // UI state: Fullscreen & Auto Refresh
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  // Audio Alerts System state
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_calendar_sound_alerts');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [alertLeadTimeMinutes, setAlertLeadTimeMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_calendar_alert_lead_time');
      return saved !== null ? Number(saved) : 15; // default 15 minutes before
    } catch {
      return 15;
    }
  });

  // Specific event alert subscriptions (event IDs user subscribed to, or ALL high-impact by default)
  const [customAlertEventIds, setCustomAlertEventIds] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('primepipfx_custom_calendar_alerts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Active triggered alert toast for HUD
  const [activeAlerts, setActiveAlerts] = useState<ActiveAudioAlert[]>([]);
  const triggeredAlertsRef = useRef<Set<string>>(new Set());
  const [soundTested, setSoundTested] = useState<boolean>(false);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadCalendarData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save audio alert settings
  const toggleSoundAlerts = () => {
    const next = !soundAlertsEnabled;
    setSoundAlertsEnabled(next);
    try {
      localStorage.setItem('primepipfx_calendar_sound_alerts', JSON.stringify(next));
      saveAlertSettings({ economicNewsAlert: next, soundEnabled: next ? true : getAlertSettings().soundEnabled });
    } catch {}
    if (next) {
      playDisciplineAlert('ECONOMIC_NEWS_ALERT');
    }
  };

  const handleLeadTimeChange = (minutes: number) => {
    setAlertLeadTimeMinutes(minutes);
    try {
      localStorage.setItem('primepipfx_calendar_alert_lead_time', minutes.toString());
    } catch {}
  };

  const toggleEventAlertSubscription = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustomAlertEventIds((prev) => {
      const next = { ...prev, [eventId]: !prev[eventId] };
      try {
        localStorage.setItem('primepipfx_custom_calendar_alerts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Test sound alert button
  const handleTestSoundAlert = () => {
    playDisciplineAlert('ECONOMIC_NEWS_ALERT');
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  // Load events based on viewMode and selected time range
  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      if (!navigator.onLine) {
        setIsOnline(false);
        // Load from local storage cache
        const cached = getCachedCalendar();
        if (cached && cached.length > 0) {
          setEvents(cached);
        }
        setIsLoading(false);
        return;
      }

      setIsOnline(true);
      let loaded: CalendarEvent[] = [];

      if (viewMode === 'YEAR') {
        const res = await fetchYearEvents(selectedYear);
        loaded = res.events;
      } else if (viewMode === 'MONTH') {
        loaded = await fetchMonthEvents(selectedYear, selectedMonth);
      } else if (viewMode === 'WEEK') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        loaded = await fetchWeekEvents(startOfWeek.toISOString(), endOfWeek.toISOString());
      } else if (viewMode === 'UPCOMING') {
        loaded = await fetchUpcomingEvents(50);
      } else if (viewMode === 'HISTORICAL') {
        loaded = await fetchHistoricalEvents(50);
      }

      setEvents(loaded);
      const metaData = await getCalendarMeta();
      setMeta(metaData);
      setLastRefreshedTime(new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' }));
    } catch (err) {
      console.warn('Failed to load economic calendar from network, loading cached data:', err);
      const cached = getCachedCalendar();
      if (cached && cached.length > 0) {
        setEvents(cached);
      }
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [viewMode, selectedYear, selectedMonth]);

  // Auto-refresh interval (every 60 seconds)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadCalendarData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, viewMode, selectedYear, selectedMonth]);

  // Background Audio Alert Monitor
  useEffect(() => {
    const alertInterval = setInterval(() => {
      if (!soundAlertsEnabled) return;
      const now = Date.now();
      const leadTimeMs = alertLeadTimeMinutes * 60 * 1000;

      // Check upcoming events in our dataset
      events.forEach((ev) => {
        const isHighImpact = ev.importance === 'HIGH';
        const isExplicitlySubscribed = customAlertEventIds[ev.id] === true;
        const isExplicitlyMuted = customAlertEventIds[ev.id] === false;

        // Monitor if high-impact or custom subscribed, unless explicitly muted
        if ((isHighImpact || isExplicitlySubscribed) && !isExplicitlyMuted) {
          const timeUntilEvent = ev.utcTimestamp - now;
          const alertTriggerKey = `${ev.id}-${alertLeadTimeMinutes}`;

          // If within lead time window (e.g. within 15 min and has not passed more than 2 minutes ago)
          if (timeUntilEvent > -120000 && timeUntilEvent <= leadTimeMs) {
            if (!triggeredAlertsRef.current.has(alertTriggerKey)) {
              triggeredAlertsRef.current.add(alertTriggerKey);

              // Play synthesized audio dispatch alert
              playDisciplineAlert('ECONOMIC_NEWS_ALERT');

              // Add to visible active alerts HUD
              const mins = Math.max(0, Math.round(timeUntilEvent / 60000));
              setActiveAlerts((prev) => [
                ...prev.filter((a) => a.id !== ev.id),
                { event: ev, minutesRemaining: mins, id: ev.id },
              ]);
            }
          }
        }
      });
    }, 10000);

    return () => clearInterval(alertInterval);
  }, [events, soundAlertsEnabled, alertLeadTimeMinutes, customAlertEventIds]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncCalendar();
      await loadCalendarData();
    } finally {
      setIsSyncing(false);
    }
  };

  const dismissActiveAlert = (id: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterImportance !== 'ALL' && ev.importance !== filterImportance) return false;
      if (filterCurrency !== 'ALL' && ev.currency !== filterCurrency) return false;
      if (filterMonth !== 'ALL' && ev.month !== filterMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ev.eventName.toLowerCase().includes(q);
        const matchDesc = ev.whatItMeasures?.toLowerCase().includes(q);
        const matchSource = ev.source.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchSource) return false;
      }
      return true;
    });
  }, [events, filterImportance, filterCurrency, filterMonth, searchQuery]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group events by Month for the Full Year view
  const groupedByMonth = useMemo(() => {
    if (viewMode !== 'YEAR') return null;
    const groups: { [key: number]: CalendarEvent[] } = {};
    for (let m = 1; m <= 12; m++) {
      groups[m] = [];
    }
    for (const ev of filteredEvents) {
      if (groups[ev.month]) {
        groups[ev.month].push(ev);
      }
    }
    return groups;
  }, [filteredEvents, viewMode]);

  return (
    <div className={`space-y-6 max-w-7xl mx-auto ${isFullscreen ? 'fixed inset-0 z-50 bg-[#020617] p-6 overflow-y-auto max-w-none' : ''}`}>
      {/* Offline Alert Notification Banner */}
      {!isOnline && (
        <div className="bg-rose-950/70 border-2 border-rose-500/80 rounded-xl p-4 text-rose-200 flex items-center justify-between gap-3 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-xs font-mono-code font-bold">
              No internet connection — cannot fetch live economic events. Showing last cached data.
            </div>
          </div>
          <button
            onClick={() => {
              if (navigator.onLine) {
                setIsOnline(true);
                loadCalendarData();
              }
            }}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-400 rounded-lg text-xs font-mono-code text-white transition shrink-0 cursor-pointer"
          >
            RETRY CONNECTION
          </button>
        </div>
      )}

      {/* Triggered Audio Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-amber-950/90 border-2 border-blue-500 rounded-xl p-4 text-cyan-200 flex items-center justify-between gap-4 shadow-2xl animate-bounce"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500 text-slate-950 font-bold">
                  <BellRing className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="text-xs font-mono-code font-bold text-cyan-400 flex items-center gap-2">
                    <span>🚨 AUDIO ALERT: HIGH-IMPACT RELEASE IMMINENT</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-[10px]">
                      {alert.minutesRemaining === 0 ? 'RELEASING NOW' : `IN ~${alert.minutesRemaining} MIN`}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-military mt-0.5">
                    {alert.event.eventName} ({alert.event.currency}) • {alert.event.timePkt}
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                    {alert.event.recommendedPosture}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEvent(alert.event)}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs font-mono-code transition cursor-pointer"
                >
                  VIEW BREAKDOWN
                </button>
                <button
                  onClick={() => dismissActiveAlert(alert.id)}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-cyan-400">
            <Calendar className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-military font-bold tracking-wider text-slate-100 flex items-center gap-2">
              <span>PRIMEPIPFX LIVE ECONOMIC CALENDAR</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-500/15 text-cyan-400 border border-blue-500/30 font-bold">
                YEAR {selectedYear}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Live Macro Releases • Actual vs Forecast vs Previous • Audio Alerts System • Asia/Karachi (PKT UTC+5)
            </p>
          </div>
        </div>

        {/* Action Controls: Sound Alerts, Fullscreen, Auto Refresh, Sync */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Audio Alerts Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 gap-2 text-xs font-mono-code">
            <button
              onClick={toggleSoundAlerts}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition cursor-pointer font-bold ${
                soundAlertsEnabled
                  ? 'bg-blue-500/20 text-cyan-400 border border-blue-500/40'
                  : 'bg-slate-950 text-slate-500 border border-slate-800'
              }`}
              title="Toggle Audio News Alerts"
            >
              {soundAlertsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundAlertsEnabled ? 'AUDIO ALERTS: ON' : 'AUDIO: OFF'}</span>
            </button>

            {/* Lead Time Selector */}
            {soundAlertsEnabled && (
              <select
                value={alertLeadTimeMinutes}
                onChange={(e) => handleLeadTimeChange(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
                title="Alert timing before release"
              >
                <option value={0}>At Event Time (0m)</option>
                <option value={5}>5m Before</option>
                <option value={15}>15m Before</option>
                <option value={30}>30m Before</option>
              </select>
            )}

            <button
              onClick={handleTestSoundAlert}
              className="p-1 rounded text-slate-400 hover:text-cyan-400 transition cursor-pointer"
              title="Test Audio Alert Sound"
            >
              <Bell className={`w-3.5 h-3.5 ${soundTested ? 'text-cyan-400 animate-spin' : ''}`} />
            </button>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono-code transition cursor-pointer flex items-center gap-1.5 ${
              autoRefreshEnabled
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="Auto-refresh every 60 seconds"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{autoRefreshEnabled ? 'AUTO (60s)' : 'AUTO: OFF'}</span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono-code transition cursor-pointer"
            title={`Refreshed at ${lastRefreshedTime}. Click to fetch latest data.`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isSyncing ? 'REFRESHING...' : 'REFRESH LIVE DATA'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main View Grid: Calendar on Left, Real-Time Macro Hubs on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Views & Controls */}
        <div className="xl:col-span-9 space-y-6">
          {/* Main View Selector & Year Navigation */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono-code flex-wrap">
              <button
                onClick={() => setViewMode('YEAR')}
                className={`px-3 py-1.5 rounded-md transition font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'YEAR'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>FULL YEAR</span>
              </button>

              <button
                onClick={() => setViewMode('MONTH')}
                className={`px-3 py-1.5 rounded-md transition font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'MONTH'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>MONTH VIEW</span>
              </button>

              <button
                onClick={() => setViewMode('WEEK')}
                className={`px-3 py-1.5 rounded-md transition font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'WEEK'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock4 className="w-3.5 h-3.5" />
                <span>THIS WEEK</span>
              </button>

              <button
                onClick={() => setViewMode('UPCOMING')}
                className={`px-3 py-1.5 rounded-md transition font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'UPCOMING'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>UPCOMING</span>
              </button>

              <button
                onClick={() => setViewMode('HISTORICAL')}
                className={`px-3 py-1.5 rounded-md transition font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'HISTORICAL'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>HISTORICAL</span>
              </button>
            </div>

            {/* Year & Month Selectors (2026 & 2027) */}
            <div className="flex items-center gap-2 text-xs font-mono-code">
              {viewMode === 'MONTH' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              )}

              {/* Year Navigation: 2026 and 2027 */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setSelectedYear(2026)}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    selectedYear === 2026
                      ? 'bg-blue-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2026
                </button>
                <button
                  onClick={() => setSelectedYear(2027)}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    selectedYear === 2027
                      ? 'bg-blue-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2027
                </button>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar: Month, Impact, Currency */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Impact Filter */}
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>IMPACT:</span>
              </span>
              <button
                onClick={() => setFilterImportance('ALL')}
                className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  filterImportance === 'ALL'
                    ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilterImportance('HIGH')}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                  filterImportance === 'HIGH'
                    ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold'
                    : 'bg-slate-950 text-rose-400 border-slate-800 hover:bg-slate-950'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>HIGH</span>
              </button>
              <button
                onClick={() => setFilterImportance('MEDIUM')}
                className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  filterImportance === 'MEDIUM'
                    ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-slate-950 text-cyan-400 border-slate-800 hover:bg-slate-950'
                }`}
              >
                MEDIUM
              </button>
              <button
                onClick={() => setFilterImportance('LOW')}
                className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  filterImportance === 'LOW'
                    ? 'bg-slate-700 text-slate-200 border-slate-600 font-bold'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-950'
                }`}
              >
                LOW
              </button>

              <span className="text-slate-700 mx-1">|</span>

              {/* Currency Filter */}
              <span className="text-slate-400 text-[11px]">CCY:</span>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">ALL CURRENCIES</option>
                <option value="USD">USD (United States)</option>
                <option value="EUR">EUR (Eurozone)</option>
                <option value="GBP">GBP (United Kingdom)</option>
                <option value="JPY">JPY (Japan)</option>
                <option value="CAD">CAD (Canada)</option>
                <option value="AUD">AUD (Australia)</option>
                <option value="CHF">CHF (Switzerland)</option>
              </select>

              {/* Month Filter */}
              <span className="text-slate-400 text-[11px] ml-1">MONTH:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">ALL MONTHS (JAN - DEC)</option>
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search FOMC, CPI, NFP, ECB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Main Table Content */}
          {isLoading ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400 font-mono-code text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-3" />
              <span>LOADING INSTITUTIONAL EVENT SCHEDULE & NUMBERS...</span>
            </div>
          ) : viewMode === 'YEAR' && groupedByMonth ? (
            /* FULL YEAR GROUPED BY MONTH VIEW */
            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthNum) => {
                const monthEvents = groupedByMonth[monthNum] || [];
                if (monthEvents.length === 0) return null;
                const mIndex = monthNum - 1;
                return (
                  <div key={monthNum} className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    {/* Month Banner */}
                    <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-cyan-400" />
                        <span className="font-military font-bold text-sm tracking-wider text-slate-200">
                          {monthNames[mIndex]?.toUpperCase()} {selectedYear}
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {monthEvents.length} INSTITUTIONAL RELEASES
                        </span>
                      </div>
                      <span className="text-[11px] font-mono-code text-cyan-400/80">
                        RELEASE TIMES IN ASIA/KARACHI (PKT)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono-code">
                        <thead className="bg-[#E6E6E6] text-slate-800 border-b border-slate-300 text-[11px] font-sans">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-16">Date</th>
                      <th className="py-2 px-3 font-semibold">Time (PST)</th>
                      <th className="py-2 px-3 font-semibold text-center">Cur.</th>
                      <th className="py-2 px-3 font-semibold text-center">Imp.</th>
                      <th className="py-2 px-3 font-semibold">Event</th>
                      <th className="py-2 px-2 font-semibold text-center">Detail</th>
                      <th className="py-2 px-3 font-semibold text-center">Actual</th>
                      <th className="py-2 px-3 font-semibold text-center">Forecast</th>
                      <th className="py-2 px-3 font-semibold text-center">Previous</th>
                      <th className="py-2 px-2 font-semibold text-center">Graph</th>
                    </tr>
                  </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {monthEvents.map((ev) => {
                            const isAlertActive = customAlertEventIds[ev.id] !== false && (ev.importance === 'HIGH' || customAlertEventIds[ev.id] === true);
                            return (
                              <tr
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="bg-white hover:bg-slate-50 cursor-pointer transition border-b border-slate-200 font-sans text-[12px] text-slate-800"
                          >
                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap border-r border-slate-100">
                              {ev.datePkt.split(',')[1]?.trim() || ev.datePkt}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-slate-700 border-r border-slate-100">
                              {ev.timePkt}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-600 border-r border-slate-100">
                              {ev.currency}
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-100">
                              <div className="flex justify-center">
                                <Folder 
                                  className={`w-4 h-4 ${
                                    ev.importance === 'HIGH' ? 'fill-rose-500 text-rose-500' : 
                                    ev.importance === 'MEDIUM' ? 'fill-orange-400 text-orange-400' : 
                                    'fill-yellow-400 text-yellow-400'
                                  }`} 
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-100">
                              {ev.eventName}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-100">
                              <div className="flex justify-center text-slate-400 hover:text-blue-500 transition">
                                <Folder className="w-4 h-4" />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-100">
                              {ev.actual ? (
                                <span className={`font-bold ${parseFloat(ev.actual) > parseFloat(ev.forecast || '0') ? 'text-emerald-600' : parseFloat(ev.actual) < parseFloat(ev.forecast || '0') ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {ev.actual}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-100">
                              {ev.forecast || '—'}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-100">
                              {ev.previous || '—'}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex justify-center text-slate-400 hover:text-blue-500 transition">
                                <BarChart2 className="w-4 h-4" />
                              </div>
                            </td>
                          </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* STANDARD TABLE VIEW (MONTH, WEEK, UPCOMING, HISTORICAL) */
            <div className="bg-white border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-code">
                  <thead className="bg-[#E6E6E6] text-slate-800 border-b border-slate-300 text-[11px] font-sans">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-16">Date</th>
                      <th className="py-2 px-3 font-semibold">Time (PST)</th>
                      <th className="py-2 px-3 font-semibold text-center">Cur.</th>
                      <th className="py-2 px-3 font-semibold text-center">Imp.</th>
                      <th className="py-2 px-3 font-semibold">Event</th>
                      <th className="py-2 px-2 font-semibold text-center">Detail</th>
                      <th className="py-2 px-3 font-semibold text-center">Actual</th>
                      <th className="py-2 px-3 font-semibold text-center">Forecast</th>
                      <th className="py-2 px-3 font-semibold text-center">Previous</th>
                      <th className="py-2 px-2 font-semibold text-center">Graph</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No economic releases matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((ev) => {
                        const isAlertActive = customAlertEventIds[ev.id] !== false && (ev.importance === 'HIGH' || customAlertEventIds[ev.id] === true);
                        return (
                          <tr
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="bg-white hover:bg-slate-50 cursor-pointer transition border-b border-slate-200 font-sans text-[12px] text-slate-800"
                          >
                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap border-r border-slate-100">
                              {ev.datePkt.split(',')[1]?.trim() || ev.datePkt}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-slate-700 border-r border-slate-100">
                              {ev.timePkt}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-600 border-r border-slate-100">
                              {ev.currency}
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-100">
                              <div className="flex justify-center">
                                <Folder 
                                  className={`w-4 h-4 ${
                                    ev.importance === 'HIGH' ? 'fill-rose-500 text-rose-500' : 
                                    ev.importance === 'MEDIUM' ? 'fill-orange-400 text-orange-400' : 
                                    'fill-yellow-400 text-yellow-400'
                                  }`} 
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-100">
                              {ev.eventName}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-100">
                              <div className="flex justify-center text-slate-400 hover:text-blue-500 transition">
                                <Folder className="w-4 h-4" />
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-100">
                              {ev.actual ? (
                                <span className={`font-bold ${parseFloat(ev.actual) > parseFloat(ev.forecast || '0') ? 'text-emerald-600' : parseFloat(ev.actual) < parseFloat(ev.forecast || '0') ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {ev.actual}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-100">
                              {ev.forecast || '—'}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-100">
                              {ev.previous || '—'}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex justify-center text-slate-400 hover:text-blue-500 transition">
                                <BarChart2 className="w-4 h-4" />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-Time News & External Macro Hubs (Forex Factory, etc.) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="font-military font-bold text-xs tracking-wider text-slate-200">
                LIVE MARKET HUBS & WIRES
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Instant live feeds, consensus deviation trackers, and central bank monitors.
            </p>

            <div className="space-y-2 pt-1">
              {REAL_TIME_MACRO_HUBS.map((hub, idx) => (
                <a
                  key={idx}
                  href={hub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-xl border transition group ${
                    hub.highlight
                      ? 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/30'
                      : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code font-bold text-cyan-400/90 tracking-wider">
                      {hub.tag}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <div className="font-military font-bold text-xs text-slate-200 mt-1">
                    {hub.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
                    {hub.desc}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Institutional Volatility Protocols Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs font-mono-code">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>DISCIPLINE PROTOCOL</span>
            </div>
            <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
              PrimePipFx rules dictate standing down 15 minutes before and after Tier-1 high impact releases (CPI, NFP, FOMC). Spreads widen and algorithmic stop-runs are severe.
            </p>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <div className="text-cyan-400 font-bold mb-1">RECOMMENDED POSTURE:</div>
              Wait for the 15-minute post-news candle to close. Trade continuation only after liquidity is swept.
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Dive Modal Breakdown */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-bold text-xs font-mono-code">
                    {selectedEvent.currency}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold font-mono-code ${
                      selectedEvent.importance === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : selectedEvent.importance === 'MEDIUM'
                        ? 'bg-blue-500/20 text-cyan-400 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {selectedEvent.importance} IMPACT
                  </span>
                  <span className="text-sky-400 text-xs font-mono-code flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{selectedEvent.timePkt}</span>
                  </span>
                </div>
                <h3 className="text-lg font-military font-bold text-slate-100 mt-2">
                  {selectedEvent.eventName}
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Issuing Source: {selectedEvent.source}
                </p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Actual, Forecast, Previous Stat Badges */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 font-mono-code uppercase font-bold">Actual</div>
                <div className={`text-base font-bold font-mono-code mt-0.5 ${selectedEvent.actual ? 'text-emerald-400' : 'text-slate-400 italic'}`}>
                  {selectedEvent.actual || 'Pending'}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 font-mono-code uppercase font-bold">Forecast</div>
                <div className="text-base font-bold font-mono-code text-slate-200 mt-0.5">
                  {selectedEvent.forecast || '—'}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 font-mono-code uppercase font-bold">Previous</div>
                <div className="text-base font-bold font-mono-code text-slate-400 mt-0.5">
                  {selectedEvent.previous || '—'}
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono-code">
              {/* Section 1: What It Measures */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>WHAT IT MEASURES</span>
                </div>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {selectedEvent.whatItMeasures}
                </p>
              </div>

              {/* Section 2: Historical Institutional Reaction */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>HISTORICAL INSTITUTIONAL REACTION</span>
                </div>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {selectedEvent.historicalReaction}
                </p>
              </div>

              {/* Section 3: Why It Impacts Volatility */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>WHY IT IMPACTS VOLATILITY</span>
                </div>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {selectedEvent.whyItImpactsVolatility}
                </p>
              </div>

              {/* Section 4: Recommended Trading Posture (Highlighted) */}
              <div className="p-3.5 bg-rose-950/20 rounded-xl border border-rose-500/40 space-y-1">
                <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>RECOMMENDED TRADING POSTURE</span>
                </div>
                <p className="text-slate-200 font-sans leading-relaxed text-xs font-medium">
                  {selectedEvent.recommendedPosture}
                </p>
              </div>

              {/* Asset Correlation Matrix */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TYPICAL ASSET IMPACT MATRIX</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold text-[11px]">US DOLLAR (DXY)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.usd}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold text-[11px]">GOLD (XAUUSD)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.gold}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold text-[11px]">MAJOR FOREX (EUR/GBP)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.forex}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold text-[11px]">EQUITY INDICES (US30 / NAS100)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.indices}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleEventAlertSubscription(selectedEvent.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    customAlertEventIds[selectedEvent.id] !== false && (selectedEvent.importance === 'HIGH' || customAlertEventIds[selectedEvent.id] === true)
                      ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>
                    {customAlertEventIds[selectedEvent.id] !== false && (selectedEvent.importance === 'HIGH' || customAlertEventIds[selectedEvent.id] === true)
                      ? 'AUDIO ALERT: ACTIVE'
                      : 'ENABLE AUDIO ALERT'}
                  </span>
                </button>

                <a
                  href="https://www.forexfactory.com/calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono-code font-bold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>CHECK FOREX FACTORY</span>
                </a>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono-code transition cursor-pointer"
              >
                CLOSE BREAKDOWN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

