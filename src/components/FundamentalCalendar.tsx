import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Activity,
  Bell,
  BellRing,
  CheckCircle2,
  Folder,
  FolderOpen,
  Globe,
  TrendingUp,
  TrendingDown,
  Info,
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
  Building2,
  Scale,
  Zap,
  BarChart2,
  Users,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarMeta,
  fetchWeekEvents,
  fetchMonthEvents,
  fetchYearEvents,
  syncCalendar,
  getCalendarMeta,
} from '../services/economicCalendarService';
import { RetailSentimentView } from './sentiment/RetailSentimentView';

// Classic Forex Factory Folder Icon SVG (Color-coded by impact)
const ForexFactoryFolderIcon: React.FC<{
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  isOpen?: boolean;
  size?: number;
}> = ({ importance, isOpen = false, size = 18 }) => {
  const colors = {
    HIGH: {
      tab: '#b91c1c',
      body: '#ef4444',
      highlight: '#fca5a5',
      border: '#7f1d1d',
      glow: 'rgba(239, 68, 68, 0.45)',
    },
    MEDIUM: {
      tab: '#c2410c',
      body: '#f97316',
      highlight: '#fdba74',
      border: '#7c2d12',
      glow: 'rgba(249, 115, 22, 0.4)',
    },
    LOW: {
      tab: '#a16207',
      body: '#eab308',
      highlight: '#fde047',
      border: '#713f12',
      glow: 'rgba(234, 179, 8, 0.35)',
    },
  }[importance];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-150"
      style={{ filter: `drop-shadow(0 1px 3px ${colors.glow})` }}
    >
      {/* Back Folder Tab */}
      <path
        d="M2 5C2 3.89543 2.89543 3 4 3H9.17157C9.70201 3 10.2107 3.21071 10.5858 3.58579L12.4142 5.41421C12.7893 5.78929 13.298 6 13.8284 6H20C21.1046 6 22 6.89543 22 8V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V5Z"
        fill={colors.tab}
        stroke={colors.border}
        strokeWidth="1.2"
      />
      {/* Inner Paper sheet when open */}
      {isOpen && (
        <rect
          x="4"
          y="5.5"
          width="16"
          height="12"
          rx="1"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}
      {/* Front Folder Flap */}
      <path
        d={
          isOpen
            ? 'M2 10.5C2 9.67157 2.67157 9 3.5 9H20.5C21.3284 9 22 9.67157 22 10.5L20.8 19.5C20.68 20.35 19.95 21 19.1 21H4.9C4.05 21 3.32 20.35 3.2 19.5L2 10.5Z'
            : 'M2 8.5C2 7.67157 2.67157 7 3.5 7H20.5C21.3284 7 22 7.67157 22 8.5V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V8.5Z'
        }
        fill={colors.body}
        stroke={colors.border}
        strokeWidth="1.2"
      />
      {/* Top Sheen Line */}
      <line
        x1="4"
        y1={isOpen ? '10.5' : '8.5'}
        x2="20"
        y2={isOpen ? '10.5' : '8.5'}
        stroke={colors.highlight}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
  CNY: '🇨🇳',
  INR: '🇮🇳',
  TRY: '🇹🇷',
  ZAR: '🇿🇦',
  BRL: '🇧🇷',
  MXN: '🇲🇽',
  SGD: '🇸🇬',
  HKD: '🇭🇰',
  KRW: '🇰🇷',
  SEK: '🇸🇪',
  NOK: '🇳🇴',
};

const MAJOR_CURRENCIES = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY'];

type PeriodPreset = 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK' | 'THIS_MONTH' | 'CUSTOM_WEEK';

function getPktNowParts(nowMs: number) {
  const d = new Date(nowMs);
  const pktDateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

  const pktTimeString = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);

  const pktFullDateString = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);

  return { pktDateKey, pktTimeString, pktFullDateString };
}

function getWeekBoundsInPkt(offsetWeeks = 0): { start: Date; end: Date; label: string } {
  // Calculate start of week (Sunday 00:00 PKT) to Saturday 23:59:59 PKT
  const now = new Date();
  const pktStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m, d] = pktStr.split('-').map(Number);
  // Create Date in UTC corresponding to 00:00 PKT
  const pktMidnightUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 5 * 3600_000);
  // Day of week in PKT
  const dayOfWeek = new Date(pktMidnightUtc.getTime() + 5 * 3600_000).getUTCDay();
  const startOfWeekUtc = new Date(
    pktMidnightUtc.getTime() - dayOfWeek * 86400_000 + offsetWeeks * 7 * 86400_000
  );
  const endOfWeekUtc = new Date(startOfWeekUtc.getTime() + 7 * 86400_000 - 1000);

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: 'numeric',
  });
  const yearFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
  });
  const label = `${fmt.format(startOfWeekUtc)} – ${fmt.format(endOfWeekUtc)}, ${yearFmt.format(endOfWeekUtc)}`;
  return { start: startOfWeekUtc, end: endOfWeekUtc, label };
}

function parseNumeric(val?: string, raw?: number | null): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (!val || val === '—' || val === '-') return null;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function evaluateActualOutcome(event: CalendarEvent): 'BETTER' | 'WORSE' | 'INLINE' | 'NONE' {
  const actual = parseNumeric(event.actual, event.actualRaw);
  const compareBase =
    parseNumeric(event.forecast, event.forecastRaw) ??
    parseNumeric(event.previous, event.previousRaw);

  if (actual === null || compareBase === null) return 'NONE';
  const diff = actual - compareBase;
  if (Math.abs(diff) < 1e-6) return 'INLINE';

  const isHigherBetter = !event.isInverseIndicator;
  if (diff > 0) return isHigherBetter ? 'BETTER' : 'WORSE';
  return isHigherBetter ? 'WORSE' : 'BETTER';
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'LIVE / RELEASED';
  const totalSec = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function getWeeklyCotEvent(startDate: Date, endDate: Date, nowMs: number): CalendarEvent | null {
  const current = new Date(startDate.getTime());
  while (current <= endDate) {
    if (current.getUTCDay() === 5) {
      const releaseUtc = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), 19, 30, 0));
      const isReleased = nowMs >= releaseUtc.getTime();
      const pktDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(releaseUtc);
      const timePkt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true }).format(releaseUtc);
      const datePktFormatted = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', year: 'numeric' }).format(releaseUtc);
      const dayOfWeekPkt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', weekday: 'short' }).format(releaseUtc);

      return {
        id: `cftc-cot-release-${pktDateKey}`,
        utcTimestamp: releaseUtc.getTime(),
        date: releaseUtc.toISOString().slice(0, 10),
        pktDateKey,
        dayOfWeekPkt,
        timeShortPkt: timePkt,
        timeUtc: '19:30',
        timePkt,
        datePkt: datePktFormatted,
        year: releaseUtc.getUTCFullYear(),
        month: releaseUtc.getUTCMonth() + 1,
        country: 'United States',
        currency: 'USD',
        eventName: 'CFTC Commitments of Traders (COT) Weekly Release',
        indicator: 'COT Positioning Report',
        period: 'Weekly',
        category: 'SURVEY',
        importance: 'HIGH',
        forecast: '—',
        previous: '—',
        actual: isReleased ? 'Released' : 'Pending',
        source: 'Commodity Futures Trading Commission (CFTC)',
        sourceUrl: 'https://publicreporting.cftc.gov',
        whatItMeasures: 'Institutional commitments and open interest breakdown across Non-Commercial speculators and Commercial hedgers.',
        historicalReaction: 'High market sensitivity when large speculator net positioning reaches multi-year percentile extremes.',
        whyItImpactsVolatility: 'Institutional positioning extremes often lead to multi-week trend exhaustion or short-squeeze reversals.',
        recommendedPosture: 'Cross-reference current positioning in the COT Report tab with technical order flow.',
        marketRelevance: {
          usd: 'DXY speculator net positioning indicates macro USD dollar sentiment.',
          gold: 'Managed money positioning in COMEX gold futures signals smart money conviction.',
          forex: 'Currencies show institutional net long/short differential against the USD.',
          indices: 'Asset managers vs leveraged funds positioning on E-mini S&P 500.',
        },
      };
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return null;
}

export const FundamentalCalendar: React.FC = () => {
  const [activeCalendarTab, setActiveCalendarTab] = useState<'CALENDAR' | 'SENTIMENT'>('CALENDAR');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [meta, setMeta] = useState<CalendarMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Navigation & Filters (Forex Factory style)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_WEEK');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const pktMonth = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', month: 'numeric' }).format(
        new Date()
      )
    );
    return pktMonth || new Date().getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const pktYear = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', year: 'numeric' }).format(
        new Date()
      )
    );
    return pktYear || new Date().getFullYear();
  });

  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [impactFilters, setImpactFilters] = useState<{
    HIGH: boolean;
    MEDIUM: boolean;
    LOW: boolean;
  }>({
    HIGH: true,
    MEDIUM: true,
    LOW: true,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyWithActual, setOnlyWithActual] = useState<boolean>(false);

  // Expanded Folder IDs (clicking a folder or row toggles its Forex Factory folder details drawer)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [soundAlerts, setSoundAlerts] = useState<boolean>(false);

  // Live 1-second Pakistan Standard Time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pktNow = useMemo(() => getPktNowParts(nowMs), [nowMs]);

  const activeWeekBounds = useMemo(() => {
    if (periodPreset === 'TODAY') return getWeekBoundsInPkt(0);
    if (periodPreset === 'THIS_WEEK') return getWeekBoundsInPkt(0);
    if (periodPreset === 'NEXT_WEEK') return getWeekBoundsInPkt(1);
    return getWeekBoundsInPkt(weekOffset);
  }, [periodPreset, weekOffset]);

  const loadCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      let fetched: CalendarEvent[] = [];
      if (periodPreset === 'THIS_MONTH') {
        fetched = await fetchMonthEvents(selectedYear, selectedMonth);
      } else {
        fetched = await fetchWeekEvents(
          activeWeekBounds.start.toISOString(),
          activeWeekBounds.end.toISOString()
        );
      }
      const cotEv = getWeeklyCotEvent(activeWeekBounds.start, activeWeekBounds.end, Date.now());
      if (cotEv && !fetched.some((e) => e.id === cotEv.id)) {
        fetched.push(cotEv);
        fetched.sort((a, b) => a.utcTimestamp - b.utcTimestamp);
      }
      setEvents(fetched);
      const latestMeta = await getCalendarMeta();
      setMeta(latestMeta);
    } catch {
      // handled gracefully in service
    } finally {
      setIsLoading(false);
    }
  }, [periodPreset, selectedYear, selectedMonth, activeWeekBounds]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Auto-refresh live TradingView figures every 60 seconds
  useEffect(() => {
    const refreshTimer = setInterval(async () => {
      try {
        let fetched: CalendarEvent[] = [];
        if (periodPreset === 'THIS_MONTH') {
          fetched = await fetchMonthEvents(selectedYear, selectedMonth);
        } else {
          fetched = await fetchWeekEvents(
            activeWeekBounds.start.toISOString(),
            activeWeekBounds.end.toISOString()
          );
        }
        if (fetched.length > 0) {
          const cotEv = getWeeklyCotEvent(activeWeekBounds.start, activeWeekBounds.end, Date.now());
          if (cotEv && !fetched.some((e) => e.id === cotEv.id)) {
            fetched.push(cotEv);
            fetched.sort((a, b) => a.utcTimestamp - b.utcTimestamp);
          }
          setEvents(fetched);
        }
      } catch {}
    }, 60_000);
    return () => clearInterval(refreshTimer);
  }, [periodPreset, selectedYear, selectedMonth, activeWeekBounds]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncCalendar();
      await loadCalendarData();
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleImpactFilter = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    setImpactFilters((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        if (periodPreset === 'TODAY') {
          const evKey =
            ev.pktDateKey ||
            new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Karachi',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(new Date(ev.utcTimestamp));
          if (evKey !== pktNow.pktDateKey) return false;
        }
        if (selectedCurrency !== 'ALL' && ev.currency !== selectedCurrency) return false;
        if (!impactFilters[ev.importance]) return false;
        if (onlyWithActual && (!ev.actual || ev.actual === '—')) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = ev.eventName.toLowerCase().includes(q);
          const matchCur = ev.currency.toLowerCase().includes(q);
          const matchCountry = ev.country.toLowerCase().includes(q);
          const matchSource = (ev.source || '').toLowerCase().includes(q);
          const matchInd = (ev.indicator || '').toLowerCase().includes(q);
          if (!matchName && !matchCur && !matchCountry && !matchSource && !matchInd) return false;
        }
        return true;
      })
      .sort((a, b) => a.utcTimestamp - b.utcTimestamp);
  }, [events, periodPreset, pktNow.pktDateKey, selectedCurrency, impactFilters, onlyWithActual, searchQuery]);

  // Group events by PKT Date Key for Forex Factory Day-Grouped Table
  const groupedByPktDay = useMemo(() => {
    const groups: {
      pktDateKey: string;
      dayOfWeekPkt: string;
      datePkt: string;
      events: CalendarEvent[];
    }[] = [];
    const map = new Map<string, typeof groups[number]>();

    for (const ev of filteredEvents) {
      const key =
        ev.pktDateKey ||
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(ev.utcTimestamp));

      let grp = map.get(key);
      if (!grp) {
        const d = new Date(ev.utcTimestamp);
        const dayOfWeekPkt =
          ev.dayOfWeekPkt ||
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Karachi',
            weekday: 'short',
          }).format(d);
        const datePkt =
          ev.datePkt ||
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Karachi',
            month: 'short',
            day: 'numeric',
          }).format(d);
        grp = { pktDateKey: key, dayOfWeekPkt, datePkt, events: [] };
        map.set(key, grp);
        groups.push(grp);
      }
      grp.events.push(ev);
    }
    return groups;
  }, [filteredEvents]);

  // Next Upcoming Event (for the "Up Next" radar banner & row marker)
  const nextUpcomingEvent = useMemo(() => {
    const upcoming = filteredEvents.filter((e) => e.utcTimestamp >= nowMs - 60_000);
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [filteredEvents, nowMs]);

  const highImpactUpcoming = useMemo(() => {
    const upcomingHigh = events
      .filter((e) => e.importance === 'HIGH' && e.utcTimestamp >= nowMs)
      .sort((a, b) => a.utcTimestamp - b.utcTimestamp);
    return upcomingHigh.length > 0 ? upcomingHigh[0] : null;
  }, [events, nowMs]);

  const allExpanded = useMemo(() => {
    if (filteredEvents.length === 0) return false;
    return filteredEvents.every((e) => expandedFolderIds[e.id]);
  }, [filteredEvents, expandedFolderIds]);

  const handleToggleExpandAll = () => {
    if (allExpanded) {
      setExpandedFolderIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const e of filteredEvents) next[e.id] = true;
      setExpandedFolderIds(next);
    }
  };

  const scrollToUpNext = () => {
    if (!nextUpcomingEvent) return;
    const el = document.getElementById(`ff-row-${nextUpcomingEvent.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpandedFolderIds((prev) => ({ ...prev, [nextUpcomingEvent.id]: true }));
    }
  };

  // Summary counts
  const counts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let released = 0;
    for (const e of filteredEvents) {
      if (e.importance === 'HIGH') high++;
      else if (e.importance === 'MEDIUM') medium++;
      else low++;
      if (e.actual && e.actual !== '—') released++;
    }
    return { high, medium, low, released, total: filteredEvents.length };
  }, [filteredEvents]);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 pb-16">
      {/* TOP COMMAND HEADER: Forex Factory Layout + TradingView Live Data Engine + PKT Clock */}
      <div className="border-b border-slate-800/90 bg-gradient-to-b from-[#0d1421] to-[#090e17] sticky top-0 z-30 shadow-2xl">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left Brand & Live Status */}
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600/25 via-orange-500/20 to-amber-500/25 border border-red-500/40 flex items-center justify-center shrink-0 shadow-inner">
                <ForexFactoryFolderIcon importance="HIGH" isOpen={true} size={22} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white uppercase">
                    Live News Calendar
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    100% Live TradingView Data
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-[10px] font-bold text-amber-300 tracking-wider uppercase">
                    Forex Factory Interface
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any color-coded impact folder to inspect topic, official source, potential market impact, and Previous / Forecast / Actual figures.
                </p>
              </div>
            </div>

            {/* Right Live Pakistan Standard Time (PKT) Clock & Sync Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Live PKT Clock Box */}
              <div className="flex items-center gap-2.5 bg-[#05080f] border border-cyan-500/35 rounded-lg px-3 py-1.5 shadow-inner">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-mono font-bold text-white tracking-wider">
                      {pktNow.pktTimeString}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      PKT (UTC+5)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Pakistan Standard Time • {pktNow.pktFullDateString}
                  </div>
                </div>
              </div>

              {/* Jump to Up Next Button */}
              {nextUpcomingEvent && (
                <button
                  onClick={scrollToUpNext}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
                  title="Scroll to next upcoming economic release"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Up Next: {nextUpcomingEvent.currency}</span>
                </button>
              )}

              {/* Live Refresh Button */}
              <button
                onClick={handleManualSync}
                disabled={isSyncing || isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Refresh live data directly from TradingView Economic Calendar"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-400 ${
                    isSyncing || isLoading ? 'animate-spin' : ''
                  }`}
                />
                <span>{isSyncing ? 'Syncing Live...' : 'Sync Live'}</span>
              </button>
            </div>
          </div>

          {/* SECTION TABS: Economic Calendar vs COT Report */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
            <button
              onClick={() => setActiveCalendarTab('CALENDAR')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-code font-bold transition flex items-center gap-2 cursor-pointer ${
                activeCalendarTab === 'CALENDAR'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-900/50 border border-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Economic Calendar</span>
            </button>
            <button
              onClick={() => setActiveCalendarTab('SENTIMENT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-code font-bold transition flex items-center gap-2 cursor-pointer ${
                activeCalendarTab === 'SENTIMENT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                  : 'text-slate-400 hover:text-white bg-slate-900/50 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sentiment</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Retail
              </span>
            </button>
          </div>

          {activeCalendarTab === 'CALENDAR' && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
            {/* Period & Week Navigation */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center bg-[#060a10] border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    setPeriodPreset('TODAY');
                    setWeekOffset(0);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    periodPreset === 'TODAY'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today (PKT)
                </button>
                <button
                  onClick={() => {
                    setPeriodPreset('THIS_WEEK');
                    setWeekOffset(0);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    periodPreset === 'THIS_WEEK'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => {
                    setPeriodPreset('NEXT_WEEK');
                    setWeekOffset(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    periodPreset === 'NEXT_WEEK'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Next Week
                </button>
                <button
                  onClick={() => setPeriodPreset('THIS_MONTH')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    periodPreset === 'THIS_MONTH'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Month View
                </button>
              </div>

              {/* Prev / Next Week Stepper */}
              {periodPreset !== 'THIS_MONTH' ? (
                <div className="inline-flex items-center gap-1 bg-[#060a10] border border-slate-800 rounded-lg px-2 py-1">
                  <button
                    onClick={() => {
                      const nextOff =
                        periodPreset === 'NEXT_WEEK' ? 0 : weekOffset - 1;
                      setPeriodPreset('CUSTOM_WEEK');
                      setWeekOffset(nextOff);
                    }}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-semibold text-slate-200 px-1.5">
                    {activeWeekBounds.label}
                  </span>
                  <button
                    onClick={() => {
                      const nextOff =
                        periodPreset === 'NEXT_WEEK' ? 2 : weekOffset + 1;
                      setPeriodPreset('CUSTOM_WEEK');
                      setWeekOffset(nextOff);
                    }}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Next Week"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-[#060a10] border border-slate-800 rounded-lg px-2 py-1">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {[
                      'January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December',
                    ].map((mName, idx) => (
                      <option key={mName} value={idx + 1} className="bg-slate-900 text-white">
                        {mName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer"
                  >
                    {[2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr} className="bg-slate-900 text-white">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* FOREX FACTORY FOLDER IMPACT LEGEND & TOGGLES */}
              <div className="inline-flex items-center gap-1.5 bg-[#060a10] border border-slate-800 rounded-lg px-2.5 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Folders:
                </span>
                <button
                  onClick={() => toggleImpactFilter('HIGH')}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer border ${
                    impactFilters.HIGH
                      ? 'bg-red-500/15 border-red-500/50 text-red-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-50'
                  }`}
                  title="Toggle High Impact Red Folders"
                >
                  <ForexFactoryFolderIcon importance="HIGH" size={14} />
                  <span>High ({counts.high})</span>
                </button>
                <button
                  onClick={() => toggleImpactFilter('MEDIUM')}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer border ${
                    impactFilters.MEDIUM
                      ? 'bg-orange-500/15 border-orange-500/50 text-orange-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-50'
                  }`}
                  title="Toggle Medium Impact Orange Folders"
                >
                  <ForexFactoryFolderIcon importance="MEDIUM" size={14} />
                  <span>Medium ({counts.medium})</span>
                </button>
                <button
                  onClick={() => toggleImpactFilter('LOW')}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer border ${
                    impactFilters.LOW
                      ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-50'
                  }`}
                  title="Toggle Low Impact Yellow Folders"
                >
                  <ForexFactoryFolderIcon importance="LOW" size={14} />
                  <span>Low ({counts.low})</span>
                </button>
              </div>
            </div>

            {/* Right: Currency Pills + Search + Expand All Folders */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Currency Selector */}
              <div className="inline-flex items-center gap-1 bg-[#060a10] border border-slate-800 rounded-lg p-0.5 overflow-x-auto max-w-full">
                {MAJOR_CURRENCIES.map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setSelectedCurrency(cur)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      selectedCurrency === cur
                        ? 'bg-slate-700 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cur !== 'ALL' && <span>{CURRENCY_FLAGS[cur] || '🌐'}</span>}
                    <span>{cur}</span>
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news, CPI, NFP, Fed..."
                  className="bg-[#060a10] border border-slate-800 focus:border-cyan-500/60 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none w-44 sm:w-52"
                />
              </div>

              {/* Expand / Collapse All Folders */}
              <button
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#060a10] hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer"
                title="Expand or Collapse all news folder details"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>{allExpanded ? 'Collapse Folders' : 'Expand All Folders'}</span>
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {activeCalendarTab === 'SENTIMENT' ? (
        <RetailSentimentView />
      ) : (
        <>
          {/* HIGH-IMPACT LIVE RADAR BANNER */}
          <div className="max-w-[1440px] mx-auto px-3 sm:px-6 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {/* Card 1: Next Immediate Release Countdown */}
          <div className="bg-[#0c121e] border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                <Activity className="w-3.5 h-3.5" />
                <span>Next Scheduled Release (PKT)</span>
              </div>
              {nextUpcomingEvent ? (
                <>
                  <div className="mt-1 flex items-center gap-2">
                    <ForexFactoryFolderIcon importance={nextUpcomingEvent.importance} size={16} />
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-slate-800 text-white">
                      {CURRENCY_FLAGS[nextUpcomingEvent.currency] || ''}{' '}
                      {nextUpcomingEvent.currency}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {nextUpcomingEvent.eventName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {nextUpcomingEvent.datePkt} • {nextUpcomingEvent.timeShortPkt || nextUpcomingEvent.timePkt} PKT
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 mt-1">
                  All events in current filter window have been released.
                </div>
              )}
            </div>
            {nextUpcomingEvent && (
              <div className="text-right shrink-0 bg-[#070b12] border border-cyan-500/30 rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Countdown
                </div>
                <div className="text-sm font-mono font-extrabold text-cyan-300">
                  {formatCountdown(nextUpcomingEvent.utcTimestamp - nowMs)}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Next High Impact Red Folder Alert */}
          <div className="bg-[#0c121e] border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Next High-Impact Red Folder</span>
              </div>
              {highImpactUpcoming ? (
                <>
                  <div className="mt-1 flex items-center gap-2">
                    <ForexFactoryFolderIcon importance="HIGH" size={16} />
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-200 border border-red-500/30">
                      {CURRENCY_FLAGS[highImpactUpcoming.currency] || ''}{' '}
                      {highImpactUpcoming.currency}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {highImpactUpcoming.eventName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {highImpactUpcoming.datePkt} • {highImpactUpcoming.timeShortPkt || highImpactUpcoming.timePkt} PKT
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 mt-1">
                  No pending high-impact red folders in this window.
                </div>
              )}
            </div>
            {highImpactUpcoming && (
              <div className="text-right shrink-0 bg-[#070b12] border border-red-500/35 rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-red-300/80 font-semibold">
                  Red Folder In
                </div>
                <div className="text-sm font-mono font-extrabold text-red-400">
                  {formatCountdown(highImpactUpcoming.utcTimestamp - nowMs)}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Live Feed Telemetry */}
          <div className="bg-[#0c121e] border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <Globe className="w-3.5 h-3.5" />
                <span>Data Provider & Timezone Standard</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                TradingView Live Economic Feed
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Showing <span className="text-white font-semibold">{counts.total}</span> events (
                <span className="text-emerald-400 font-semibold">{counts.released}</span> actuals printed)
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none bg-[#070b12] border border-slate-800 px-2.5 py-1.5 rounded-lg">
                <input
                  type="checkbox"
                  checked={onlyWithActual}
                  onChange={(e) => setOnlyWithActual(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Released Actuals Only</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                PKT = Asia/Karachi (UTC+05:00)
              </span>
            </div>
          </div>
        </div>

        {/* FOREX FACTORY CLASSIC TABLE */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Table Header Bar */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#11192a] border-b border-slate-700/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  <th className="py-2.5 px-3 w-[115px] border-r border-slate-800/80">
                    Date (PKT)
                  </th>
                  <th className="py-2.5 px-3 w-[95px] border-r border-slate-800/80">
                    Time (PKT)
                  </th>
                  <th className="py-2.5 px-3 w-[78px] text-center border-r border-slate-800/80">
                    Currency
                  </th>
                  <th className="py-2.5 px-3 w-[92px] text-center border-r border-slate-800/80">
                    Impact
                  </th>
                  <th className="py-2.5 px-3.5 min-w-[260px] border-r border-slate-800/80">
                    News Event / Topic (Click Folder to Open)
                  </th>
                  <th className="py-2.5 px-2.5 w-[68px] text-center border-r border-slate-800/80">
                    Detail
                  </th>
                  <th className="py-2.5 px-3 w-[105px] text-right border-r border-slate-800/80">
                    Actual
                  </th>
                  <th className="py-2.5 px-3 w-[105px] text-right border-r border-slate-800/80">
                    Forecast
                  </th>
                  <th className="py-2.5 px-3 w-[105px] text-right">
                    Previous
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/70 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                        <div className="text-sm font-bold text-slate-200">
                          Fetching 100% Live TradingView Economic Calendar...
                        </div>
                        <div className="text-xs text-slate-400">
                          Synchronizing event timestamps to Pakistan Standard Time (PKT)
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : groupedByPktDay.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-2 max-w-md mx-auto">
                        <ForexFactoryFolderIcon importance="MEDIUM" size={28} />
                        <div className="text-sm font-bold text-slate-200">
                          No Economic News Events Match Your Current Filter
                        </div>
                        <div className="text-xs text-slate-400">
                          Try enabling High/Medium/Low folders, selecting "ALL" currencies, or switching to "This Week".
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groupedByPktDay.map((dayGroup) => {
                    const isTodayPkt = dayGroup.pktDateKey === pktNow.pktDateKey;
                    let lastPrintedTime = '';

                    return (
                      <React.Fragment key={dayGroup.pktDateKey}>
                        {/* Forex Factory Day Subheader Banner */}
                        <tr
                          className={`${
                            isTodayPkt
                              ? 'bg-gradient-to-r from-cyan-950/70 via-[#101c30] to-[#0d1524] border-y border-cyan-500/40'
                              : 'bg-[#0e1625] border-y border-slate-800'
                          }`}
                        >
                          <td colSpan={9} className="py-2 px-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar
                                  className={`w-3.5 h-3.5 ${
                                    isTodayPkt ? 'text-cyan-400' : 'text-slate-400'
                                  }`}
                                />
                                <span className="font-extrabold text-xs tracking-wide uppercase text-white">
                                  {dayGroup.dayOfWeekPkt} — {dayGroup.datePkt}
                                </span>
                                {isTodayPkt && (
                                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-extrabold uppercase">
                                    Today (PKT)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {dayGroup.events.length} scheduled releases
                              </span>
                            </div>
                          </td>
                        </tr>

                        {dayGroup.events.map((ev, idx) => {
                          const isFolderOpen = Boolean(expandedFolderIds[ev.id]);
                          const isUpNext = nextUpcomingEvent?.id === ev.id;
                          const isPast = ev.utcTimestamp <= nowMs;
                          const outcome = evaluateActualOutcome(ev);
                          const displayTime =
                            ev.timeShortPkt ||
                            ev.timePkt.replace(' PKT', '');
                          const showTimeCell = displayTime !== lastPrintedTime;
                          lastPrintedTime = displayTime;

                          // Surprise deviation calculation when both actual & forecast exist
                          const actualNum = parseNumeric(ev.actual, ev.actualRaw);
                          const forecastNum = parseNumeric(ev.forecast, ev.forecastRaw);
                          const previousNum = parseNumeric(ev.previous, ev.previousRaw);
                          const deviationVal =
                            actualNum !== null && forecastNum !== null
                              ? Number((actualNum - forecastNum).toFixed(2))
                              : null;

                          return (
                            <React.Fragment key={ev.id}>
                              {/* MAIN FOREX FACTORY EVENT ROW */}
                              <tr
                                id={`ff-row-${ev.id}`}
                                onClick={() => toggleFolder(ev.id)}
                                className={`transition-colors cursor-pointer select-none ${
                                  isFolderOpen
                                    ? 'bg-[#162238] hover:bg-[#192740]'
                                    : isUpNext
                                    ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.14]'
                                    : idx % 2 === 0
                                    ? 'bg-[#0b101b] hover:bg-[#121b2d]'
                                    : 'bg-[#0d1320] hover:bg-[#121b2d]'
                                }`}
                              >
                                {/* Date column (shown on first row of day like Forex Factory) */}
                                <td className="py-2.5 px-3 border-r border-slate-800/60 font-mono text-[11px] whitespace-nowrap align-middle">
                                  {idx === 0 ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-200">
                                        {dayGroup.dayOfWeekPkt}
                                      </span>
                                      <span className="text-slate-400">{dayGroup.datePkt}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 text-[10px]">↳</span>
                                  )}
                                </td>

                                {/* Time (PKT) column */}
                                <td className="py-2.5 px-3 border-r border-slate-800/60 font-mono text-[11px] whitespace-nowrap align-middle">
                                  <div className="flex items-center gap-1.5">
                                    {isUpNext && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"
                                        title="Up Next in PKT"
                                      />
                                    )}
                                    <span
                                      className={`${
                                        showTimeCell
                                          ? isUpNext
                                            ? 'text-amber-300 font-bold'
                                            : isPast
                                            ? 'text-slate-300'
                                            : 'text-cyan-300 font-semibold'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {displayTime}
                                    </span>
                                  </div>
                                </td>

                                {/* Currency column */}
                                <td className="py-2.5 px-3 border-r border-slate-800/60 text-center whitespace-nowrap align-middle">
                                  <span className="inline-flex items-center gap-1 font-extrabold text-slate-100">
                                    <span>{CURRENCY_FLAGS[ev.currency] || '🌐'}</span>
                                    <span>{ev.currency}</span>
                                  </span>
                                </td>

                                {/* Forex Factory Color-Coded Impact Folder column */}
                                <td className="py-2.5 px-3 border-r border-slate-800/60 text-center whitespace-nowrap align-middle">
                                  <div
                                    className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800/80 transition"
                                    title={`${ev.importance} Impact Folder — Click to open details`}
                                  >
                                    <ForexFactoryFolderIcon
                                      importance={ev.importance}
                                      isOpen={isFolderOpen}
                                      size={18}
                                    />
                                  </div>
                                </td>

                                {/* News Topic / Event Title */}
                                <td className="py-2.5 px-3.5 border-r border-slate-800/60 align-middle">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`font-semibold truncate ${
                                          ev.importance === 'HIGH'
                                            ? 'text-white font-bold'
                                            : 'text-slate-200'
                                        }`}
                                      >
                                        {ev.eventName}
                                      </span>
                                      {ev.period && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-400 border border-slate-700/70 shrink-0">
                                          {ev.period}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 hidden sm:inline shrink-0">
                                      {ev.source}
                                    </span>
                                  </div>
                                </td>

                                {/* Detail Folder Action Icon (Classic Forex Factory folder button) */}
                                <td className="py-2.5 px-2.5 border-r border-slate-800/60 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFolder(ev.id);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer ${
                                      isFolderOpen
                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                                        : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                                    }`}
                                    title="Open Forex Factory Folder Specs"
                                  >
                                    <ForexFactoryFolderIcon
                                      importance={ev.importance}
                                      isOpen={isFolderOpen}
                                      size={13}
                                    />
                                    {isFolderOpen ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                </td>

                                {/* Actual Figure (Green for Better, Red for Worse, like Forex Factory) */}
                                <td className="py-2.5 px-3 border-r border-slate-800/60 text-right font-mono font-bold whitespace-nowrap align-middle">
                                  {ev.actual && ev.actual !== '—' ? (
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded ${
                                        outcome === 'BETTER'
                                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                          : outcome === 'WORSE'
                                          ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                                          : 'text-slate-100 bg-slate-800/70'
                                      }`}
                                    >
                                      {ev.actual}
                                    </span>
                                  ) : isUpNext ? (
                                    <span className="text-[10px] font-sans font-bold text-amber-400 uppercase">
                                      Pending
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>

                                {/* Forecast Figure */}
                                <td className="py-2.5 px-3 border-r border-slate-800/60 text-right font-mono text-slate-300 whitespace-nowrap align-middle">
                                  {ev.forecast && ev.forecast !== '—' ? (
                                    ev.forecast
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>

                                {/* Previous Figure */}
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400 whitespace-nowrap align-middle">
                                  {ev.previous && ev.previous !== '—' ? (
                                    ev.previous
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                              </tr>

                              {/* EXPANDED FOREX FACTORY FOLDER DETAIL PANEL */}
                              {isFolderOpen && (
                                <tr className="bg-[#09111f] border-b-2 border-cyan-500/30">
                                  <td colSpan={9} className="p-0">
                                    <div className="p-4 sm:p-5 bg-gradient-to-b from-[#101c31] to-[#09101d] border-l-4 border-l-cyan-400">
                                      {/* Folder Header Strip */}
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3.5 mb-4 border-b border-slate-800">
                                        <div className="flex items-start sm:items-center gap-3">
                                          <ForexFactoryFolderIcon
                                            importance={ev.importance}
                                            isOpen={true}
                                            size={28}
                                          />
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-slate-800 text-white">
                                                {CURRENCY_FLAGS[ev.currency] || '🌐'} {ev.currency} •{' '}
                                                {ev.country}
                                              </span>
                                              <span
                                                className={`text-[11px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                                  ev.importance === 'HIGH'
                                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                                    : ev.importance === 'MEDIUM'
                                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                                                }`}
                                              >
                                                {ev.importance} Impact Folder
                                              </span>
                                              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                                                {ev.datePkt} • {ev.timePkt}
                                              </span>
                                            </div>
                                            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                                              {ev.eventName}
                                              {ev.indicator &&
                                              ev.indicator !== ev.eventName ? (
                                                <span className="text-slate-400 font-normal text-sm ml-2">
                                                  ({ev.indicator})
                                                </span>
                                              ) : null}
                                            </h3>
                                          </div>
                                        </div>

                                        {/* Official Source Link + Close Folder */}
                                        <div className="flex items-center gap-2 self-start md:self-center">
                                          {ev.sourceUrl && (
                                            <a
                                              href={ev.sourceUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition"
                                            >
                                              <Building2 className="w-3.5 h-3.5" />
                                              <span>Official Source: {ev.source}</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => toggleFolder(ev.id)}
                                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                                          >
                                            Close Folder
                                          </button>
                                        </div>
                                      </div>

                                      {/* 4-COLUMN FOREX FACTORY DATA & FIGURES COMPARISON */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                        {/* Actual Card */}
                                        <div className="bg-[#070c16] border border-slate-800 rounded-lg p-3">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Actual Figure
                                          </div>
                                          <div
                                            className={`text-lg font-mono font-extrabold mt-1 ${
                                              outcome === 'BETTER'
                                                ? 'text-emerald-400'
                                                : outcome === 'WORSE'
                                                ? 'text-red-400'
                                                : 'text-white'
                                            }`}
                                          >
                                            {ev.actual && ev.actual !== '—'
                                              ? ev.actual
                                              : 'Awaiting Release'}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            {outcome === 'BETTER'
                                              ? 'Bullish / Better than expected'
                                              : outcome === 'WORSE'
                                              ? 'Bearish / Worse than expected'
                                              : outcome === 'INLINE'
                                              ? 'In-line with consensus'
                                              : 'Live TradingView print'}
                                          </div>
                                        </div>

                                        {/* Forecast Card */}
                                        <div className="bg-[#070c16] border border-slate-800 rounded-lg p-3">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Consensus Forecast
                                          </div>
                                          <div className="text-lg font-mono font-extrabold text-cyan-300 mt-1">
                                            {ev.forecast && ev.forecast !== '—'
                                              ? ev.forecast
                                              : 'No Consensus'}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            Economist median estimate
                                          </div>
                                        </div>

                                        {/* Previous Card */}
                                        <div className="bg-[#070c16] border border-slate-800 rounded-lg p-3">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Previous Release
                                          </div>
                                          <div className="text-lg font-mono font-extrabold text-slate-200 mt-1">
                                            {ev.previous && ev.previous !== '—'
                                              ? ev.previous
                                              : '—'}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            Prior period benchmark
                                          </div>
                                        </div>

                                        {/* Surprise / Deviation Card */}
                                        <div className="bg-[#070c16] border border-slate-800 rounded-lg p-3">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Surprise Deviation
                                          </div>
                                          <div
                                            className={`text-lg font-mono font-extrabold mt-1 ${
                                              deviationVal !== null && deviationVal > 0
                                                ? 'text-emerald-400'
                                                : deviationVal !== null && deviationVal < 0
                                                ? 'text-red-400'
                                                : 'text-slate-300'
                                            }`}
                                          >
                                            {deviationVal !== null
                                              ? `${deviationVal > 0 ? '+' : ''}${deviationVal}${
                                                  ev.scale || ''
                                                }${ev.unit && ev.unit !== '%' ? ` ${ev.unit}` : ev.unit || ''}`
                                              : previousNum !== null && actualNum !== null
                                              ? `${
                                                  actualNum - previousNum > 0 ? '+' : ''
                                                }${Number((actualNum - previousNum).toFixed(2))} vs Prev`
                                              : '—'}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            Actual minus Forecast delta
                                          </div>
                                        </div>
                                      </div>

                                      {/* FOREX FACTORY SPECS BOX: Topic, Source, Usual Effect, Potential Impact */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Left Column: Forex Factory Classic Event Specs */}
                                        <div className="bg-[#070c16] border border-slate-800/90 rounded-lg p-3.5 space-y-2.5">
                                          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            <span>Forex Factory Folder Specifications</span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2 text-xs py-1 border-b border-slate-800/60">
                                            <span className="text-slate-400 font-semibold">
                                              News Topic:
                                            </span>
                                            <span className="col-span-2 text-white font-bold">
                                              {ev.eventName}{' '}
                                              <span className="text-cyan-400 font-mono text-[11px]">
                                                [{ev.category}]
                                              </span>
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2 text-xs py-1 border-b border-slate-800/60">
                                            <span className="text-slate-400 font-semibold">
                                              Issuing Source:
                                            </span>
                                            <span className="col-span-2 text-slate-200 font-medium">
                                              {ev.source || 'Central Bank / National Statistics Office'}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2 text-xs py-1 border-b border-slate-800/60">
                                            <span className="text-slate-400 font-semibold">
                                              Usual Effect:
                                            </span>
                                            <span className="col-span-2 text-emerald-300 font-semibold">
                                              {ev.usualEffect ||
                                                (ev.isInverseIndicator
                                                  ? "'Actual' less than 'Forecast' is good for currency"
                                                  : "'Actual' greater than 'Forecast' is good for currency")}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2 text-xs py-1">
                                            <span className="text-slate-400 font-semibold">
                                              What It Measures:
                                            </span>
                                            <span className="col-span-2 text-slate-300 leading-relaxed">
                                              {ev.whatItMeasures}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Right Column: Potential Impact & Asset Playbook */}
                                        <div className="bg-[#070c16] border border-slate-800/90 rounded-lg p-3.5 space-y-2.5">
                                          <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                            <Scale className="w-3.5 h-3.5" />
                                            <span>Potential Market Impact & Volatility Playbook</span>
                                          </div>

                                          <div className="text-xs text-slate-300 leading-relaxed">
                                            <span className="text-slate-400 font-semibold">
                                              Why Traders Care:{' '}
                                            </span>
                                            {ev.whyItImpactsVolatility}
                                          </div>

                                          <div className="text-xs text-slate-300 leading-relaxed">
                                            <span className="text-slate-400 font-semibold">
                                              Recommended Desk Posture:{' '}
                                            </span>
                                            <span className="text-amber-300 font-medium">
                                              {ev.recommendedPosture}
                                            </span>
                                          </div>

                                          {/* Cross-Asset Matrix */}
                                          {ev.marketRelevance && (
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                              <div className="bg-slate-900/90 border border-slate-800 rounded p-2">
                                                <span className="text-[10px] font-bold uppercase text-cyan-400 block">
                                                  {ev.currency} / Forex Impact
                                                </span>
                                                <span className="text-[11px] text-slate-300">
                                                  {ev.marketRelevance.forex}
                                                </span>
                                              </div>
                                              <div className="bg-slate-900/90 border border-slate-800 rounded p-2">
                                                <span className="text-[10px] font-bold uppercase text-amber-400 block">
                                                  Gold (XAUUSD) Impact
                                                </span>
                                                <span className="text-[11px] text-slate-300">
                                                  {ev.marketRelevance.gold}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
export default FundamentalCalendar;
