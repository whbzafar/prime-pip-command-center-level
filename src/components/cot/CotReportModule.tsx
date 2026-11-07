import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CotErrorBoundary } from './CotErrorBoundary';
import { CotHeader } from './CotHeader';
import { CotMarketList } from './CotMarketList';
import { CotDetailView } from './CotDetailView';
import { CotPairScreener } from './CotPairScreener';
import { MarketCategory } from '../../config/cotConfig';
import { CotMarketSummary, CotReleaseStatus } from '../../types/cotTypes';
import { fetchCotMarketSummaries, checkCotReleaseStatus } from '../../services/cotService';
import { CheckCircle2, X, Scale, BarChart3 } from 'lucide-react';

export const CotReportModule: React.FC = () => {
  const [viewMode, setViewMode] = useState<'PAIRS' | 'MARKETS'>('PAIRS');
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('Currencies');
  const [selectedMarket, setSelectedMarket] = useState<CotMarketSummary | null>(null);

  const [summaries, setSummaries] = useState<CotMarketSummary[]>([]);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<CotReleaseStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [staleDate, setStaleDate] = useState<string | undefined>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastKnownDateRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backoffCountRef = useRef(0);

  // Load summaries
  const loadSummaries = useCallback(async (force = false) => {
    try {
      setIsSyncing(true);
      const res = await fetchCotMarketSummaries(force);
      setSummaries(res.data);
      setIsStale(res.isStale);
      setStaleDate(res.cachedAt);

      if (res.data.length > 0 && res.data[0]?.latest?.reportDate) {
        const newDate = res.data[0].latest.reportDate;
        // Check if new report appeared
        if (lastKnownDateRef.current && lastKnownDateRef.current !== newDate) {
          setToastMessage(`New COT report released – data as of ${newDate}`);
        }
        lastKnownDateRef.current = newDate;
        setLatestDate(newDate);

        // Check release status with the latest date
        const status = await checkCotReleaseStatus(newDate);
        setReleaseStatus(status);
      }
    } catch (err: any) {
      console.warn('[COT Module] Error loading summaries:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSummaries(false);
  }, [loadSummaries]);

  // Polling loop: every 60s when report is due, every 30m when not due
  useEffect(() => {
    const runPoll = async () => {
      try {
        const status = await checkCotReleaseStatus(lastKnownDateRef.current);
        setReleaseStatus(status);

        // If new report date detected
        if (
          status.latestReportDate &&
          lastKnownDateRef.current &&
          status.latestReportDate > lastKnownDateRef.current
        ) {
          setToastMessage(`New COT report released – data as of ${status.latestReportDate}`);
          loadSummaries(true);
        }
        backoffCountRef.current = 0;
      } catch {
        backoffCountRef.current = Math.min(5, backoffCountRef.current + 1);
      }

      // Compute next interval: 60s if due, 30m if not due, with exponential backoff on errors
      const isDue = releaseStatus?.isDue;
      const baseInterval = isDue ? 60 * 1000 : 30 * 60 * 1000;
      const backoffMultiplier = Math.pow(1.5, backoffCountRef.current);
      const interval = Math.round(baseInterval * backoffMultiplier);

      pollTimerRef.current = setTimeout(runPoll, interval);
    };

    const initialInterval = releaseStatus?.isDue ? 60 * 1000 : 30 * 60 * 1000;
    pollTimerRef.current = setTimeout(runPoll, initialInterval);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [releaseStatus?.isDue, loadSummaries]);

  return (
    <CotErrorBoundary>
      <div className="space-y-5">
        {/* Release Toast Notification */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs font-mono-code text-emerald-200 shadow-xl animate-bounce">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-emerald-500/30 rounded text-emerald-300 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Section Header */}
        <CotHeader
          latestDate={latestDate}
          releaseStatus={releaseStatus}
          isSyncing={isSyncing}
          onRefresh={() => loadSummaries(true)}
          isStale={isStale}
          staleDate={staleDate}
          onRetryStale={() => loadSummaries(true)}
        />

        {/* Top-Level Mode Selector: Pair Screener vs Individual Markets */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => {
              setViewMode('PAIRS');
              setSelectedMarket(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer ${
              viewMode === 'PAIRS'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>CROSS-ASSET PAIR SCREENER &amp; RELATIVE STRENGTH</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('MARKETS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer ${
              viewMode === 'MARKETS'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>INDIVIDUAL CONTRACTS &amp; MARKETS</span>
          </button>
        </div>

        {/* Main Content Area */}
        {viewMode === 'PAIRS' ? (
          <CotPairScreener summaries={summaries} isLoading={isLoading} />
        ) : selectedMarket ? (
          <CotDetailView
            summary={selectedMarket}
            onBack={() => setSelectedMarket(null)}
          />
        ) : (
          <CotMarketList
            summaries={summaries}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectMarket={setSelectedMarket}
            isLoading={isLoading}
          />
        )}
      </div>
    </CotErrorBoundary>
  );
};
