import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock3, ExternalLink, Radio, RefreshCw, WifiOff } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  currency?: string;
  country?: string;
  impact?: string;
  timestamp?: string | number;
  source?: string;
  url?: string;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
}

interface RadarResponse {
  ok: boolean;
  sourceConfigured: boolean;
  fetchedAt?: string;
  items: NewsItem[];
  error?: string;
}

function impactClass(impact?: string) {
  const value = String(impact || 'UNKNOWN').toUpperCase();
  if (value.includes('HIGH') || value.includes('RED')) return 'border-red-500/40 bg-red-500/10 text-red-300';
  if (value.includes('MEDIUM') || value.includes('ORANGE')) return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (value.includes('LOW') || value.includes('YELLOW')) return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  return 'border-slate-700 bg-slate-900/60 text-slate-400';
}

function formatTimestamp(value?: string | number) {
  if (value === undefined || value === null || value === '') return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date) + ' PKT';
}

export const DashboardLiveNewsRadar: React.FC = () => {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/live-economic-news/status', {
        cache: 'no-store',
        credentials: 'include',
      });
      const payload = await response.json();
      setData(payload);
    } catch {
      setData({
        ok: false,
        sourceConfigured: false,
        items: [],
        error: 'Live news service is unreachable.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const items = (data?.items || []).slice(0, 6);

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-[#0A0F18]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Radio className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100">LIVE ECONOMIC NEWS RADAR</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Provider data only • no synthetic market values</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="prime-btn-secondary text-[10px] py-1.5 px-2.5"
          title="Refresh live news"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!data?.sourceConfigured ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-amber-300 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">Live provider not configured</p>
            <p className="text-xs text-slate-400 mt-1">
              Configure ECONOMIC_NEWS_RADAR_URL on the server to activate real-time calendar/news data. The Command Center will not invent events.
            </p>
          </div>
        </div>
      ) : !data?.ok && items.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Radar temporarily unavailable</p>
            <p className="text-xs text-slate-500 mt-1">{data?.error || 'Provider did not return valid data.'}</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-500">
          No events returned by the live provider.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-3 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded border ${impactClass(item.impact)}`}>
                      {String(item.impact || 'UNKNOWN').toUpperCase()}
                    </span>
                    {item.currency && <span className="text-[9px] font-mono text-slate-500">{item.currency}</span>}
                    {item.country && <span className="text-[9px] text-slate-600">{item.country}</span>}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug">{item.title}</h3>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan-300 shrink-0" title="Open source">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[9px] text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{formatTimestamp(item.timestamp)}</span>
                {item.forecast !== null && item.forecast !== undefined && <span>Forecast: {String(item.forecast)}</span>}
                {item.previous !== null && item.previous !== undefined && <span>Previous: {String(item.previous)}</span>}
                {item.actual !== null && item.actual !== undefined && <span>Actual: {String(item.actual)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
