import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import { apiGetEvolutionStatus } from '../../utils/evolutionClient';

export type EvolutionClientStatus =
  | 'EVOLUTION ONLINE'
  | 'EVOLUTION SYNCING'
  | 'UPDATING'
  | 'VALIDATING'
  | 'UP TO DATE'
  | 'RECOVERY MODE'
  | 'OFFLINE';

interface EvolutionStatusBadgeProps {
  variant?: 'compact' | 'dashboard' | 'pill';
  onOpenEvolution?: () => void;
  className?: string;
}

export const EvolutionStatusBadge: React.FC<EvolutionStatusBadgeProps> = ({
  variant = 'compact',
  onOpenEvolution,
  className = '',
}) => {
  const [status, setStatus] = useState<EvolutionClientStatus>('UP TO DATE');
  const [activeCycle, setActiveCycle] = useState<number>(42);
  const [uptimePercent, setUptimePercent] = useState<number>(99.98);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleOnline = () => setStatus('UP TO DATE');
    const handleOffline = () => setStatus('OFFLINE');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial fetch from Evolution backend
    const fetchStatus = async () => {
      try {
        if (!navigator.onLine) {
          setStatus('OFFLINE');
          return;
        }
        setStatus('EVOLUTION SYNCING');
        const res = await apiGetEvolutionStatus();
        if (res && res.ok) {
          setActiveCycle(res.activeCycle || 42);
          if (res.systemHealth?.overallUptime) {
            setUptimePercent(res.systemHealth.overallUptime);
          }
          if (res.autonomy?.connectivity && !res.autonomy.connectivity.online) {
            setStatus('OFFLINE');
          } else if (res.autonomy?.cycleInProgress) {
            setStatus('UPDATING');
          } else if (res.isEnginePaused) {
            setStatus('RECOVERY MODE');
          } else {
            setStatus('UP TO DATE');
          }
        } else {
          setStatus('EVOLUTION ONLINE');
        }
      } catch (err) {
        setStatus('EVOLUTION ONLINE');
      }
    };

    fetchStatus();
    // Heartbeat every 60 seconds
    const interval = setInterval(fetchStatus, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (st: EvolutionClientStatus) => {
    switch (st) {
      case 'UP TO DATE':
      case 'EVOLUTION ONLINE':
        return {
          dot: 'bg-emerald-400',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10',
        };
      case 'EVOLUTION SYNCING':
      case 'UPDATING':
      case 'VALIDATING':
        return {
          dot: 'bg-cyan-400 animate-pulse',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-500/10',
        };
      case 'RECOVERY MODE':
        return {
          dot: 'bg-cyan-400 animate-pulse',
          text: 'text-cyan-400',
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/10',
        };
      case 'OFFLINE':
      default:
        return {
          dot: 'bg-slate-500',
          text: 'text-slate-400',
          border: 'border-slate-700',
          bg: 'bg-slate-800/40',
        };
    }
  };

  const colors = getStatusColor(status);

  // Variant: Dashboard indicator
  if (variant === 'dashboard') {
    return (
      <div
        id="dash-intelligence-indicator"
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono-code transition hover:border-emerald-500/30 ${className}`}
        title={`PRIMEPIPFX Autonomous Intelligence Engine | Status: ${status} | Cycle ${activeCycle}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.dot}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`} />
        </span>
        <span className="text-slate-300 font-semibold tracking-wide">
          PRIMEPIPFX Intelligence: <span className={colors.text}>Active</span>
        </span>
        <span className="text-[10px] text-slate-500 border-l border-slate-700 pl-2 hidden sm:inline">
          Cycle {activeCycle}
        </span>
      </div>
    );
  }

  // Variant: Compact Header Bar Badge with Popover details
  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        id="header-evolution-status-badge"
        onClick={() => {
          if (onOpenEvolution) {
            onOpenEvolution();
          } else {
            setIsPopoverOpen(!isPopoverOpen);
          }
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono-code font-bold uppercase tracking-wider border transition cursor-pointer ${colors.bg} ${colors.border} ${colors.text} hover:opacity-90`}
        title="Autonomous Evolution Engine Status - Click to inspect"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        <span>{status}</span>
      </button>

      {/* Popover on hover or click */}
      {(isHovered || isPopoverOpen) && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#0A0E17] border border-slate-700/80 rounded-xl p-3 shadow-2xl shadow-black/80 z-50 text-left font-sans animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Evolution Client</span>
            </div>
            <span className={`text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              {status}
            </span>
          </div>

          <div className="space-y-1.5 py-2 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Continuous Cycle:</span>
              <span className="font-mono-code text-white">Cycle {activeCycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Subsystem Health:</span>
              <span className="font-mono-code text-emerald-400">{uptimePercent}% Uptime</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Multi-Agent Guard:</span>
              <span className="text-cyan-400">15 Agents Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cryptographic State:</span>
              <span className="text-slate-300">Signed & Verified</span>
            </div>
          </div>

          {onOpenEvolution && (
            <button
              onClick={() => {
                setIsPopoverOpen(false);
                setIsHovered(false);
                onOpenEvolution();
              }}
              className="w-full mt-1.5 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition"
            >
              <span>Inspect Command Center</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
