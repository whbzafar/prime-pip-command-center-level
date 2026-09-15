import React, { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  ExternalLink,
  Radio,
  Flame,
  Moon,
  Compass,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { getAppLiveClock, getMarketSessions, APP_TIMEZONE_LABEL } from '../../utils/time';
import { getGlobalPrayerSchedule, getPrayerSettings } from '../../utils/prayerTimes';

interface DashboardMarketIntelligenceProps {
  onNavigateToTab: (tab: string) => void;
  onOpenTimeModal?: () => void;
}

export const DashboardMarketIntelligence: React.FC<DashboardMarketIntelligenceProps> = ({
  onNavigateToTab,
  onOpenTimeModal,
}) => {
  const [liveClock, setLiveClock] = useState<string>('');
  const [marketData, setMarketData] = useState(getMarketSessions());
  const [nextPrayerInfo, setNextPrayerInfo] = useState<string>('Tracking...');

  useEffect(() => {
    const updateTime = () => {
      const clock = getAppLiveClock();
      setLiveClock(`${clock.time} ${clock.badge}`);
      setMarketData(getMarketSessions());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    const fetchPrayer = async () => {
      try {
        const settings = getPrayerSettings();
        const sched = await getGlobalPrayerSchedule(settings);
        if (sched.nextPrayer) {
          setNextPrayerInfo(`${sched.nextPrayer.name} in ${sched.nextPrayer.timeRemainingStr}`);
        }
      } catch {
        setNextPrayerInfo('Active');
      }
    };
    fetchPrayer();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              MARKET INTELLIGENCE & SESSIONS
            </h3>
          </div>
          <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 uppercase">
            LIVE SYNC
          </span>
        </div>

        {/* World Clock & Liquidity status */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenTimeModal}
            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-left hover:border-sky-500/40 transition cursor-pointer group"
            title="Click to view full world clock & timezone manager"
          >
            <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400 group-hover:rotate-12 transition-transform" />
                WORLD CLOCK
              </span>
              <span className="text-sky-400 text-[9px] font-bold">{APP_TIMEZONE_LABEL}</span>
            </div>
            <div className="text-sm font-mono-code font-bold text-slate-100 mt-1">
              {liveClock || 'SYNCING...'}
            </div>
          </button>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
              <span className="flex items-center gap-1">
                <Moon className="w-3 h-3 text-amber-400" />
                PRAYER TRACKER
              </span>
              <span className="text-emerald-400 text-[9px] font-bold">SOLAR</span>
            </div>
            <div className="text-xs font-mono-code font-bold text-slate-200 mt-1 truncate">
              {nextPrayerInfo}
            </div>
          </div>
        </div>

        {/* Global Sessions Grid */}
        <div className="mt-3.5 space-y-2">
          <div className="text-[10px] font-military tracking-wider text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>INTERBANK SESSIONS</span>
            {marketData.isPeakLiquidityActive && (
              <span className="flex items-center gap-1 text-[10px] font-mono-code text-amber-400 font-bold animate-pulse">
                <Flame className="w-3 h-3 fill-current" />
                PEAK LIQUIDITY OVERLAP
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
            {marketData.sessions.map((sess) => (
              <div
                key={sess.name}
                className={`p-2.5 rounded-xl border transition ${
                  sess.isOpen
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{sess.name}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      sess.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{sess.isOpen ? 'OPEN' : 'CLOSED'}</span>
                  <span>{sess.hoursStr}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparent Live Data Notice (No Fake Prices) */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] font-mono-code text-slate-400 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Live pricing feed: <strong className="text-slate-300">Disconnected</strong>. Connect your broker or market API to view tick-by-tick prices. No synthetic prices are fabricated.
          </span>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigateToTab('RESEARCH')}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 text-sky-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>TRADING RESEARCH</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('FUNDAMENTAL_CALENDAR')}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>ECONOMIC NEWS</span>
        </button>
      </div>
    </div>
  );
};
