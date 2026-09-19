import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Clock,
  MapPin,
  Check,
  Search,
  Zap,
  Radio,
  Sliders,
  X,
  RefreshCw,
  Compass,
  Layers,
} from 'lucide-react';
import {
  GLOBAL_TRADING_HUBS,
  getUserTimezone,
  setUserTimezone,
  getUserTimeFormat,
  setUserTimeFormat,
  getAppTime,
  getMarketSessions,
  MarketSession,
  formatAppDisplayDate,
} from '../utils/time';

interface GlobalTimeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalTimeSessionModal: React.FC<GlobalTimeSessionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentTimezone, setCurrentTimezoneState] = useState<string>(() => getUserTimezone());
  const [timeFormat, setTimeFormatState] = useState<'12h' | '24h'>(() => getUserTimeFormat());
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState<Date>(new Date());

  // Live 1-second clock interval
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Listen for timezone changes from other tabs / windows
  useEffect(() => {
    const handleTzChange = () => {
      setCurrentTimezoneState(getUserTimezone());
      setTimeFormatState(getUserTimeFormat());
    };
    window.addEventListener('primepipfx_timezone_changed', handleTzChange);
    return () => window.removeEventListener('primepipfx_timezone_changed', handleTzChange);
  }, []);

  const marketData = useMemo(() => {
    return getMarketSessions(now, currentTimezone);
  }, [now, currentTimezone]);

  const filteredHubs = useMemo(() => {
    if (!searchQuery.trim()) return GLOBAL_TRADING_HUBS;
    const q = searchQuery.toLowerCase();
    return GLOBAL_TRADING_HUBS.filter(
      (h) =>
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q) ||
        h.label.toLowerCase().includes(q) ||
        h.value.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectTimezone = (tz: string) => {
    setUserTimezone(tz);
    setCurrentTimezoneState(tz);
  };

  const handleDetectBrowserTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setUserTimezone(detected);
        setCurrentTimezoneState(detected);
      }
    } catch {
      // Fallback
    }
  };

  const handleToggleFormat = (fmt: '12h' | '24h') => {
    setUserTimeFormat(fmt);
    setTimeFormatState(fmt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#0D121F] border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 sm:p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-military font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>GLOBAL TIME & MARKET SESSION HUB</span>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono-code text-[10px] sm:text-[11px] border border-sky-500/30">
                  INSTITUTIONAL PRECISION
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono-code mt-0.5">
                Configure your active trading timezone, 12h/24h format, and track real-time global market sessions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 font-mono-code text-xs">
          {/* Live World Clocks Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 font-mono-code">
          {[
            { label: 'MY LOCAL TIME', tz: currentTimezone, isLocal: true },
            { label: 'UTC / GMT', tz: 'UTC' },
            { label: 'NEW YORK (EST/EDT)', tz: 'America/New_York' },
            { label: 'LONDON (GMT/BST)', tz: 'Europe/London' },
            { label: 'TOKYO (JST)', tz: 'Asia/Tokyo' },
            { label: 'SYDNEY (AEST)', tz: 'Australia/Sydney' },
          ].map((item) => {
            const timeStr = getAppTime(now, true, item.tz, timeFormat);
            const dateStr = formatAppDisplayDate(now, 'short', item.tz);
            return (
              <div
                key={item.label}
                className={`p-3 rounded-xl border ${
                  item.isLocal
                    ? 'bg-blue-500/10 border-blue-500/40 text-amber-300 shadow-md shadow-blue-500/5'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-bold uppercase truncate mb-1">
                  {item.label}
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono-code">{timeStr}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{dateStr}</div>
              </div>
            );
          })}
        </div>

        {/* Market Sessions Monitor */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider uppercase">
                INSTITUTIONAL MARKET SESSIONS
              </h4>
            </div>
            <div className="text-xs font-mono-code font-bold">
              {marketData.isPeakLiquidityActive ? (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-amber-300 border border-blue-500/40 flex items-center gap-1.5 animate-pulse">
                  <Zap className="w-3.5 h-3.5" />
                  <span>LONDON • NY OVERLAP ACTIVE (PEAK VOLUME)</span>
                </span>
              ) : (
                <span className="text-slate-400">
                  Active Sessions: <strong className="text-emerald-400">{marketData.activeSessionsCount}</strong> Open
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono-code text-xs">
            {marketData.sessions.map((s) => {
              const isOverlap = s.id === 'london_ny_overlap';
              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    s.isOpen
                      ? isOverlap
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold font-military text-slate-100 flex items-center gap-1.5">
                        <span>{s.flag}</span>
                        <span>{s.name}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.isOpen
                            ? isOverlap
                              ? 'bg-blue-500 text-slate-950 font-extrabold'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.statusText}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Local Time:</span>
                        <span className="text-slate-200 font-bold">
                          {s.localOpenStr} – {s.localCloseStr}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">UTC Standard:</span>
                        <span className="text-slate-400">
                          {String(s.openUtcHour).padStart(2, '0')}:00 – {String(s.closeUtcHour).padStart(2, '0')}:00 UTC
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-400">{s.timeRemainingStr}</span>
                      {s.isOpen && <span className="text-slate-300 font-bold">{s.progressPercent}% Elapsed</span>}
                    </div>
                    {s.isOpen && (
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isOverlap ? 'bg-cyan-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${s.progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timezone Configuration Controls */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                TRADER TIMEZONE CONFIGURATION
              </h4>
              <p className="text-[11px] text-slate-400 font-mono-code">
                Active Timezone: <strong className="text-cyan-400">{currentTimezone}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* 12h vs 24h Toggle */}
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 text-xs font-mono-code">
                <button
                  type="button"
                  onClick={() => handleToggleFormat('12h')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFormat === '12h' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  12-HOUR (AM/PM)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFormat('24h')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFormat === '24h' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  24-HOUR
                </button>
              </div>

              {/* Auto Detect Button */}
              <button
                type="button"
                onClick={handleDetectBrowserTimezone}
                className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-mono-code font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Automatically detect timezone from browser"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>AUTO-DETECT BROWSER TIMEZONE</span>
              </button>
            </div>
          </div>

          {/* Search Trading Hubs */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, country, or timezone identifier (e.g., London, New York, Tokyo, Dubai, Karachi)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono-code focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Grid of Global Hubs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredHubs.map((hub) => {
              const isSelected = hub.value === currentTimezone;
              return (
                <button
                  key={hub.value}
                  type="button"
                  onClick={() => handleSelectTimezone(hub.value)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500/15 border-blue-500 text-amber-300'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-xs font-mono-code flex items-center gap-1.5 truncate">
                      <span>{hub.city}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({hub.utcOffsetStr})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{hub.country}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono-code text-slate-400 hidden sm:block">
            * All journal entries, trade plans, and countdowns dynamically synchronize with your chosen timezone.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs transition cursor-pointer"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
