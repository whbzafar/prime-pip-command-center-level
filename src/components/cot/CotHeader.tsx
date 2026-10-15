import React from 'react';
import { Calendar, Clock, RefreshCw, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { CotReleaseStatus } from '../../types/cotTypes';

interface CotHeaderProps {
  latestDate: string | null;
  releaseStatus: CotReleaseStatus | null;
  isSyncing: boolean;
  onRefresh: () => void;
  isStale: boolean;
  staleDate?: string;
  onRetryStale?: () => void;
}

export const CotHeader: React.FC<CotHeaderProps> = ({
  latestDate,
  releaseStatus,
  isSyncing,
  onRefresh,
  isStale,
  staleDate,
  onRetryStale,
}) => {
  // Format Tuesday date with user's locale
  const formattedTuesday = React.useMemo(() => {
    if (!latestDate) return 'Loading...';
    try {
      const d = new Date(latestDate + 'T12:00:00Z');
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return latestDate;
    }
  }, [latestDate]);

  return (
    <div className="space-y-3">
      {/* Offline / Stale Data Banner */}
      {isStale && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Showing last available data from{' '}
              <strong className="text-white">
                {staleDate ? new Date(staleDate).toLocaleDateString() : 'cached snapshot'}
              </strong>
              . Offline or network reconnecting.
            </span>
          </div>
          {onRetryStale && (
            <button
              onClick={onRetryStale}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-mono-code font-bold cursor-pointer transition"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* Main Header Container */}
      <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Title & Status */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>CFTC Commitments of Traders (COT)</span>
              </h2>

              {/* Status Badge */}
              {releaseStatus?.isDue ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-[11px] font-mono-code font-bold text-amber-300 animate-pulse">
                  <Clock className="w-3 h-3" />
                  <span>Pending release</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono-code font-bold text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Official Release Verified</span>
                </span>
              )}

              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 font-mono-code text-cyan-300">
                Legacy – Futures Only (Dataset: 6dca-aqww)
              </span>
            </div>

            {/* Timestamps Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 font-mono-code pt-1">
              <div className="flex items-center gap-1.5 text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Data as of <strong className="text-white font-bold">{formattedTuesday}</strong>
                </span>
              </div>

              <span className="text-slate-600 hidden sm:inline">·</span>

              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Next expected release:{' '}
                  <strong className="text-cyan-300 font-bold">
                    {releaseStatus?.nextExpectedReleaseLocalFormatted || 'Friday 3:30 PM ET'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Refresh Button */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-xs font-mono-code text-slate-200 font-bold transition cursor-pointer disabled:opacity-50"
              title="Refresh latest COT releases directly from CFTC SODA API"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Refreshing...' : 'Sync CFTC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
