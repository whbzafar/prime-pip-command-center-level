import React, { useState, useEffect } from 'react';
import { CotReportModule } from './cot/CotReportModule';
import { RetailSentimentView } from './sentiment/RetailSentimentView';
import { LiquidGlassThemeToggle } from './LiquidGlassThemeToggle';
import { ShieldAlert, Activity, Sparkles, Layers } from 'lucide-react';

export type FundamentalDashboardTab = 'SEVERITY_REPORT' | 'SENTIMENT' | 'COT_REPORT' | 'MARKET_SENTIMENT';

export interface FundamentalIndicatorsProps {
  currentUser?: any;
  isDemoMode?: boolean;
  onOpenSubscription?: () => void;
}

export const FundamentalIndicators: React.FC<FundamentalIndicatorsProps> = () => {
  const [activeTab, setActiveTab] = useState<'SEVERITY_REPORT' | 'SENTIMENT'>('SEVERITY_REPORT');

  // External tab navigation listener (e.g. from PreTradePlan or Dashboard shortcuts)
  useEffect(() => {
    const handleOpenTabEvent = (e: any) => {
      const targetTab = e?.detail?.tab;
      if (targetTab === 'COT_REPORT' || targetTab === 'SEVERITY_REPORT') {
        setActiveTab('SEVERITY_REPORT');
      } else if (targetTab === 'MARKET_SENTIMENT' || targetTab === 'SENTIMENT') {
        setActiveTab('SENTIMENT');
      }
    };

    window.addEventListener('primepipfx_open_fundamental_tab', handleOpenTabEvent);
    return () => {
      window.removeEventListener('primepipfx_open_fundamental_tab', handleOpenTabEvent);
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Category Command Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tracking-wider uppercase">
                  MARKET INTELLIGENCE
                </span>
                <span className="text-[10px] font-mono-code text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE FEEDS
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide mt-1 flex items-center gap-2">
                <span>FUNDAMENTAL INDICATORS</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LiquidGlassThemeToggle variant="compact" />
          </div>
        </div>

        {/* Exclusive Two-Tab Switcher: Severity Report & Sentiment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Tab 1: Severity Report */}
          <button
            type="button"
            onClick={() => setActiveTab('SEVERITY_REPORT')}
            className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              activeTab === 'SEVERITY_REPORT'
                ? 'bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent border-cyan-400/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeTab === 'SEVERITY_REPORT'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-military font-bold text-sm tracking-wide text-white">
                      Severity Report
                    </span>
                    <span className="text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                      CFTC COT
                    </span>
                  </div>
                  <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                    Institutional Commitment of Traders positioning &amp; extremity levels
                  </p>
                </div>
              </div>

              {activeTab === 'SEVERITY_REPORT' && (
                <span className="shrink-0 text-cyan-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </span>
              )}
            </div>
          </button>

          {/* Tab 2: Sentiment */}
          <button
            type="button"
            onClick={() => setActiveTab('SENTIMENT')}
            className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              activeTab === 'SENTIMENT'
                ? 'bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border-blue-400/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeTab === 'SENTIMENT'
                      ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-military font-bold text-sm tracking-wide text-white">
                      Sentiment
                    </span>
                    <span className="text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase">
                      Retail Gauges
                    </span>
                  </div>
                  <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                    Contrarian crowd positioning &amp; sentiment across 31 major assets
                  </p>
                </div>
              </div>

              {activeTab === 'SENTIMENT' && (
                <span className="shrink-0 text-blue-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeTab === 'SEVERITY_REPORT' && (
          <div className="animate-in fade-in duration-200">
            <CotReportModule />
          </div>
        )}

        {activeTab === 'SENTIMENT' && (
          <div className="animate-in fade-in duration-200">
            <RetailSentimentView />
          </div>
        )}
      </div>
    </div>
  );
};
