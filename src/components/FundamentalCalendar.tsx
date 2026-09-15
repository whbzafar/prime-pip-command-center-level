import React, { useState, useEffect, useMemo } from 'react';
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
  Clock4,
  ShieldAlert,
  Zap,
  ExternalLink,
  Globe,
  ArrowUpRight,
} from 'lucide-react';

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

export const FundamentalCalendar: React.FC = () => {
  // Navigation & View states
  const [viewMode, setViewMode] = useState<CalendarViewMode>('YEAR'); // Default is FULL YEAR
  const [selectedYear, setSelectedYear] = useState<number>(2026);
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

  // Load events based on viewMode and selected time range
  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'YEAR') {
        const res = await fetchYearEvents(selectedYear);
        setEvents(res.events);
      } else if (viewMode === 'MONTH') {
        const monthEvents = await fetchMonthEvents(selectedYear, selectedMonth);
        setEvents(monthEvents);
      } else if (viewMode === 'WEEK') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        const weekEvents = await fetchWeekEvents(startOfWeek.toISOString(), endOfWeek.toISOString());
        setEvents(weekEvents);
      } else if (viewMode === 'UPCOMING') {
        const upcoming = await fetchUpcomingEvents(40);
        setEvents(upcoming);
      } else if (viewMode === 'HISTORICAL') {
        const historical = await fetchHistoricalEvents(40);
        setEvents(historical);
      }

      const metaData = await getCalendarMeta();
      setMeta(metaData);
    } catch (err) {
      console.error('Failed to load economic calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [viewMode, selectedYear, selectedMonth]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncCalendar();
      await loadCalendarData();
    } finally {
      setIsSyncing(false);
    }
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Calendar className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-military font-bold tracking-wider text-slate-100 flex items-center gap-2">
              <span>PRIMEPIPFX INSTITUTIONAL ECONOMIC CALENDAR</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                YEAR {selectedYear}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Institutional Release Schedules & Timings • All times in Asia/Karachi (PKT, 12-hour AM/PM) • No Fabricated Numbers
            </p>
          </div>
        </div>

        {/* Sync & Online Status Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono-code uppercase">Timezone</div>
            <div className="text-xs font-bold font-mono-code text-sky-400">Asia/Karachi (PKT UTC+5)</div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono-code uppercase">Status</div>
            <div className="text-xs font-bold font-mono-code flex items-center justify-center gap-1.5">
              {meta?.isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">SYNCED</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">LOCAL CACHE</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono-code transition cursor-pointer"
            title="Synchronize institutional calendar schedule"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSyncing ? 'SYNCING...' : 'SYNC CALENDAR'}</span>
          </button>
        </div>
      </div>

      {/* Main View Grid: Calendar on Left, Real-Time Macro Hubs on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Views & Controls */}
        <div className="xl:col-span-9 space-y-6">
          {/* Main View Selector & Year Navigation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono-code flex-wrap">
          <button
            onClick={() => setViewMode('YEAR')}
            className={`px-3 py-1.5 rounded-md transition font-bold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'YEAR'
                ? 'bg-amber-500 text-slate-950 shadow-md'
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
                ? 'bg-amber-500 text-slate-950 shadow-md'
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
                ? 'bg-amber-500 text-slate-950 shadow-md'
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
                ? 'bg-amber-500 text-slate-950 shadow-md'
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
                ? 'bg-amber-500 text-slate-950 shadow-md'
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
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
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
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2026
            </button>
            <button
              onClick={() => setSelectedYear(2027)}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                selectedYear === 2027
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2027
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar: Month, Impact, Currency */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
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
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
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
                : 'bg-slate-950 text-rose-400 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>HIGH</span>
          </button>
          <button
            onClick={() => setFilterImportance('MEDIUM')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              filterImportance === 'MEDIUM'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-950 text-amber-400 border-slate-800 hover:bg-slate-900'
            }`}
          >
            MEDIUM
          </button>
          <button
            onClick={() => setFilterImportance('LOW')}
            className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              filterImportance === 'LOW'
                ? 'bg-slate-700 text-slate-200 border-slate-600 font-bold'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-900'
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
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
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
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
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
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400 font-mono-code text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-3" />
          <span>LOADING INSTITUTIONAL EVENT SCHEDULE...</span>
        </div>
      ) : viewMode === 'YEAR' && groupedByMonth ? (
        /* FULL YEAR GROUPED BY MONTH VIEW */
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthNum) => {
            const monthEvents = groupedByMonth[monthNum] || [];
            if (monthEvents.length === 0) return null;
            const mIndex = monthNum - 1;
            return (
              <div key={monthNum} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                {/* Month Banner */}
                <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-amber-400" />
                    <span className="font-military font-bold text-sm tracking-wider text-slate-200">
                      {monthNames[mIndex]?.toUpperCase()} {selectedYear}
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {monthEvents.length} INSTITUTIONAL RELEASES
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-code text-amber-400/80">
                    RELEASE TIMES IN ASIA/KARACHI (PKT)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono-code">
                    <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-800/60 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">DATE & TIME (PKT)</th>
                        <th className="py-2.5 px-3">CCY</th>
                        <th className="py-2.5 px-3">IMPACT</th>
                        <th className="py-2.5 px-4">EVENT NAME & ISSUER</th>
                        <th className="py-2.5 px-3">CATEGORY</th>
                        <th className="py-2.5 px-4 text-right">INSTITUTIONAL RADAR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {monthEvents.map((ev) => (
                        <tr
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          <td className="py-3 px-4">
                            <div className="text-slate-200 font-bold">{ev.datePkt}</div>
                            <div className="text-sky-400 text-[11px] flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-sky-400" />
                              <span>{ev.timePkt}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold text-[11px]">
                              {ev.currency}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                ev.importance === 'HIGH'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : ev.importance === 'MEDIUM'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {ev.importance === 'HIGH' && <Flame className="w-2.5 h-2.5" />}
                              {ev.importance}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-100 font-bold hover:text-amber-400 transition">
                              {ev.eventName}
                            </div>
                            <div className="text-slate-500 text-[10px] truncate max-w-xs sm:max-w-md">
                              {ev.source}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-400 text-[11px]">
                              {ev.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold">
                              <span>BREAKDOWN</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD TABLE VIEW (MONTH, WEEK, UPCOMING, HISTORICAL) */
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">DATE & TIME (PKT)</th>
                  <th className="py-3 px-3">CCY</th>
                  <th className="py-3 px-3">IMPACT</th>
                  <th className="py-3 px-4">EVENT NAME & ISSUER</th>
                  <th className="py-3 px-3">CATEGORY</th>
                  <th className="py-3 px-4 text-right">INSTITUTIONAL RADAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No economic releases matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-bold">{ev.datePkt}</div>
                        <div className="text-sky-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-sky-400" />
                          <span>{ev.timePkt}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold text-[11px]">
                          {ev.currency}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            ev.importance === 'HIGH'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : ev.importance === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {ev.importance === 'HIGH' && <Flame className="w-2.5 h-2.5" />}
                          {ev.importance}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-100 font-bold hover:text-amber-400 transition">
                          {ev.eventName}
                        </div>
                        <div className="text-slate-500 text-[10px] truncate max-w-xs sm:max-w-md">
                          {ev.source}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-400 text-[11px]">
                          {ev.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold">
                          <span>BREAKDOWN</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>

        {/* Right Column: Real-Time News & External Macro Hubs (Forex Factory, etc.) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 sticky top-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-military font-bold text-slate-100 tracking-wider">
                    REAL-TIME MACRO HUBS
                  </h3>
                  <p className="text-[10px] font-mono-code text-slate-400">
                    Live Feeds & Consensus News
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono-code text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE</span>
              </span>
            </div>

            {/* Advisory Note */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono-code text-slate-400 leading-relaxed">
              Use these verified institutional portals to monitor live release deviations, unexpected speeches, and geopolitical breaking news in real time.
            </div>

            {/* List of Functional Real-Time External Links */}
            <div className="space-y-2.5">
              {REAL_TIME_MACRO_HUBS.map((hub) => (
                <a
                  key={hub.name}
                  href={hub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-xl border transition group cursor-pointer ${
                    hub.highlight
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 hover:border-amber-400 shadow-sm shadow-amber-500/10'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-military font-bold text-slate-200 group-hover:text-amber-400 transition flex items-center gap-1.5">
                        {hub.name}
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded border ${
                        hub.highlight
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {hub.tag}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans mt-1.5 leading-snug">
                    {hub.desc}
                  </p>
                </a>
              ))}
            </div>

            {/* Trading Rule Reminder */}
            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-[11px] font-mono-code text-amber-400/90 leading-relaxed">
              <span className="font-bold text-amber-300">INSTITUTIONAL PROTOCOL:</span> Never enter a new position within 15 minutes before or after high-impact RED news releases. Verify live deviations on Forex Factory first.
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Event Breakdown Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[11px] font-mono-code font-bold">
                    {selectedEvent.currency}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                      selectedEvent.importance === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {selectedEvent.importance} IMPACT
                  </span>
                  <span className="text-slate-400 text-xs font-mono-code">
                    {selectedEvent.datePkt} • {selectedEvent.timePkt}
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

            <div className="mt-4 space-y-4 text-xs font-mono-code">
              {/* Section 1: What It Measures */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
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
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>TYPICAL ASSET IMPACT MATRIX</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold text-[11px]">US DOLLAR (DXY)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.usd}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold text-[11px]">GOLD (XAUUSD)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.gold}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold text-[11px]">MAJOR FOREX (EUR/GBP)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.forex}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold text-[11px]">EQUITY INDICES (US30 / NAS100)</div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      {selectedEvent.marketRelevance.indices}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <a
                href="https://www.forexfactory.com/calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono-code font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>CHECK LIVE DATA ON FOREX FACTORY</span>
              </a>

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
