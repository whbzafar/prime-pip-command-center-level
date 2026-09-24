import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Moon,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Settings,
  ShieldAlert,
  Volume2,
  Sparkles,
  ChevronUp,
  X,
  Clock,
  Compass,
} from 'lucide-react';
import {
  PrayerTimeSchedule,
  getGlobalPrayerSchedule,
  getTodayPrayerRecord,
  savePrayerRecord,
  DailyPrayerRecord,
  getPrayerSettings,
  savePrayerSettings,
  PrayerSettings,
  playPrayerChime,
} from '../utils/prayerTimes';
import { PrayerSettingsModal } from './PrayerSettingsModal';

export const DailyPrayerBar: React.FC = () => {
  const [settings, setSettings] = useState<PrayerSettings>(() => getPrayerSettings());
  const [schedule, setSchedule] = useState<PrayerTimeSchedule | null>(null);
  const [prayerRecord, setPrayerRecord] = useState<DailyPrayerRecord>(() => getTodayPrayerRecord());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('primepipfx_prayer_collapsed') === 'true';
  });
  const [activeAlert, setActiveAlert] = useState<{
    prayerName: string;
    message: string;
    isImminentWarning: boolean;
    alertCount: number;
  } | null>(null);

  // Track dispatched notifications to strictly enforce sending exactly twice per prayer
  const notificationsSentRef = useRef<Record<string, { date: string; imminent: boolean; arrived: boolean }>>(
    (() => {
      try {
        const raw = localStorage.getItem('primepipfx_prayer_notif_tracking');
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })()
  );

  // Refresh schedule whenever settings change
  useEffect(() => {
    let mounted = true;
    const fetchSchedule = () => {
      getGlobalPrayerSchedule(settings).then((s) => {
        if (mounted) {
          setSchedule(s);

          // Check if next prayer alert should fire (strictly capped at twice per prayer)
          if (s.nextPrayer && settings.remindersEnabled) {
            const todayStr = new Date().toISOString().split('T')[0];
            const prayerKey = s.nextPrayer.key;
            const tracking = notificationsSentRef.current;
            const prayerTrack = tracking[prayerKey]?.date === todayStr 
              ? tracking[prayerKey] 
              : { date: todayStr, imminent: false, arrived: false };

            // Notification 1 of 2: Pre-prayer imminent warning (e.g. 15 minutes before)
            if (s.nextPrayer.isImminentWarning && s.nextPrayer.timeRemainingMins > 0) {
              if (!prayerTrack.imminent) {
                prayerTrack.imminent = true;
                tracking[prayerKey] = prayerTrack;
                try {
                  localStorage.setItem('primepipfx_prayer_notif_tracking', JSON.stringify(tracking));
                } catch {}

                setActiveAlert({
                  prayerName: s.nextPrayer.name,
                  message: `${s.nextPrayer.name} prayer time in ${s.nextPrayer.timeRemainingStr}. Inspect active trades and set stop-loss before stepping away. (Notification 1 of 2)`,
                  isImminentWarning: true,
                  alertCount: 1,
                });

                if (settings.soundEnabled) {
                  playPrayerChime();
                }
              }
            } else if (s.nextPrayer.timeRemainingMins === 0) {
              // Notification 2 of 2: At prayer time
              if (!prayerTrack.arrived) {
                prayerTrack.arrived = true;
                tracking[prayerKey] = prayerTrack;
                try {
                  localStorage.setItem('primepipfx_prayer_notif_tracking', JSON.stringify(tracking));
                } catch {}

                setActiveAlert({
                  prayerName: s.nextPrayer.name,
                  message: `${s.nextPrayer.name} prayer time has arrived. Step away from the charts and offer your prayer. (Notification 2 of 2)`,
                  isImminentWarning: false,
                  alertCount: 2,
                });

                if (settings.soundEnabled) {
                  playPrayerChime();
                }
              }
            }
          }
        }
      });
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30000); // refresh every 30s

    const handleSettingsChanged = () => {
      setSettings(getPrayerSettings());
      fetchSchedule();
    };

    window.addEventListener('primepipfx_prayer_settings_changed', handleSettingsChanged);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('primepipfx_prayer_settings_changed', handleSettingsChanged);
    };
  }, [settings]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('primepipfx_prayer_collapsed', String(next));
  };

  const toggleReminders = () => {
    const updated = { ...settings, remindersEnabled: !settings.remindersEnabled };
    setSettings(updated);
    savePrayerSettings(updated);
  };

  const handleTogglePrayer = (prayerKey: keyof DailyPrayerRecord['prayed']) => {
    const updated = {
      ...prayerRecord,
      prayed: {
        ...prayerRecord.prayed,
        [prayerKey]: !prayerRecord.prayed[prayerKey],
      },
    };
    setPrayerRecord(updated);
    savePrayerRecord(updated);
    if (activeAlert?.prayerName.toLowerCase().includes(prayerKey)) {
      setActiveAlert(null);
    }
  };

  const prayersList: Array<{ key: keyof DailyPrayerRecord['prayed']; name: string; time: string }> = [
    { key: 'fajr', name: 'Fajr', time: schedule?.fajr || '05:00 AM' },
    { key: 'dhuhr', name: 'Dhuhr', time: schedule?.dhuhr || '12:30 PM' },
    { key: 'asr', name: 'Asr', time: schedule?.asr || '04:45 PM' },
    { key: 'maghrib', name: 'Maghrib', time: schedule?.maghrib || '06:30 PM' },
    { key: 'isha', name: 'Isha', time: schedule?.isha || '08:00 PM' },
  ];

  const totalPrayedToday = Object.values(prayerRecord.prayed).filter(Boolean).length;

  if (isCollapsed) {
    return (
      <div className="bg-[#050811] border-b border-slate-800/80 px-2.5 sm:px-3 py-0.5 sm:py-1 flex items-center justify-between text-[10px] sm:text-[11px] font-mono-code text-slate-400 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
          <Moon className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="font-bold text-slate-300 shrink-0 text-[10px]">PRAYER:</span>
          <span className="text-amber-300 truncate text-[10px]">
            {schedule?.nextPrayer ? `Next: ${schedule.nextPrayer.name} in ${schedule.nextPrayer.timeRemainingStr}` : `${settings.cityName}`}
          </span>
          <span className="text-emerald-400 shrink-0 text-[10px]">({totalPrayedToday}/5)</span>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition cursor-pointer shrink-0 text-[10px] ml-2"
        >
          <span className="hidden xs:inline">Expand</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#050811] border-b border-slate-800/80 text-[10px] sm:text-[11px] font-mono-code px-2.5 sm:px-3 py-1 flex flex-wrap items-center justify-between gap-y-1 gap-x-2 text-slate-300">
      {/* City selector & Category badge */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 text-cyan-400 font-bold tracking-wider">
          <Moon className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
          <span className="hidden sm:inline text-[10px]">DAILY PRAYER</span>
          <span className="sm:hidden text-[10px]">PRAYER</span>
        </div>

        {/* City and Method trigger */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1 bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 px-1.5 py-0.5 rounded text-[10px] text-slate-200 transition cursor-pointer group"
          title="Click to change city, GPS location, and calculation method"
        >
          <span className="font-bold group-hover:text-cyan-400">{settings.cityName}</span>
          <span className="text-slate-400 text-[9px]">({settings.juristicSchool === 'HANAFI' ? 'Han' : 'Std'})</span>
          <Settings className="w-2.5 h-2.5 text-slate-400 group-hover:rotate-45 transition-transform" />
        </button>

        {/* Next Prayer Countdown Chip */}
        {schedule?.nextPrayer && (
          <div
            className={`hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${
              schedule.nextPrayer.isImminentWarning
                ? 'bg-blue-500/20 text-amber-300 border-blue-500/40 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>
              Next: <strong>{schedule.nextPrayer.name}</strong> in {schedule.nextPrayer.timeRemainingStr}
            </span>
          </div>
        )}
      </div>

      {/* 5 Prayers with time & personal completion check */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        {prayersList.map((p) => {
          const isDone = prayerRecord.prayed[p.key];
          const isNext = schedule?.nextPrayer?.key === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => handleTogglePrayer(p.key)}
              title={`Click to toggle ${p.name} prayer offered (${p.time})`}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer transition text-[10px] ${
                isDone
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : isNext
                  ? 'bg-blue-500/15 border-blue-500/50 text-cyan-200'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className={`font-semibold text-[10px] ${isDone ? 'text-emerald-400' : isNext ? 'text-cyan-400' : 'text-slate-300'}`}>
                {p.name}
              </span>
              <span className="text-slate-400 text-[9px]">{p.time}</span>
              {isDone ? (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full border border-slate-600 inline-block" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right controls: Daily count, Mute toggle, Collapse button */}
      <div className="flex items-center gap-1.5">
        <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400">
          <span>Today:</span>
          <span className="text-emerald-400 font-bold">{totalPrayedToday}/5</span>
        </div>

        <button
          type="button"
          onClick={toggleReminders}
          title={settings.remindersEnabled ? 'Prayer reminders ACTIVE' : 'Prayer reminders MUTED'}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border transition cursor-pointer ${
            settings.remindersEnabled
              ? 'bg-blue-500/10 border-blue-500/30 text-amber-300 hover:bg-blue-500/20'
              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
        >
          {settings.remindersEnabled ? <Bell className="w-2.5 h-2.5 text-cyan-400" /> : <BellOff className="w-2.5 h-2.5" />}
          <span className="hidden sm:inline">{settings.remindersEnabled ? 'ALERTS' : 'MUTED'}</span>
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          title="Minimize prayer bar"
          className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>

      {/* Pre-Prayer Trading Discipline Warning Banner */}
      {activeAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-950/95 border border-blue-500/60 shadow-2xl p-4 rounded-2xl backdrop-blur flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-military font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>{activeAlert.isImminentWarning ? 'PRE-PRAYER POSITION DISCIPLINE' : 'PRAYER TIME ALERT'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Notice {activeAlert.alertCount}/2
              </span>
              <button
                onClick={() => setActiveAlert(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-mono-code">
            {activeAlert.message}
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono-code">
            <button
              type="button"
              onClick={() => {
                const key = activeAlert.prayerName.toLowerCase() as keyof DailyPrayerRecord['prayed'];
                if (key in prayerRecord.prayed) {
                  handleTogglePrayer(key);
                }
                setActiveAlert(null);
              }}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              ✓ Mark Offered
            </button>
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Global Prayer Settings Modal */}
      <PrayerSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
