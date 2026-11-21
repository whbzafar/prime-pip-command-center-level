import React, { useState, useEffect } from 'react';
import { CotReportModule } from './cot/CotReportModule';
import { SentimentBoard } from './fundamentalAnalysis/SentimentBoard';
import { LiquidGlassThemeToggle } from './LiquidGlassThemeToggle';
import { ShieldAlert, Activity, Layers, Gauge, Orbit, FlaskConical } from 'lucide-react';
import { ScenarioLab } from './ScenarioLab';
import { FinancialUniverse } from './FinancialUniverse';
import { FundamentalAnalysisView } from './fundamentalAnalysis/FundamentalAnalysisView';

export type FundamentalDashboardTab = 'ANALYSIS' | 'SEVERITY_REPORT' | 'SENTIMENT' | 'UNIVERSE' | 'SCENARIO';
type FiTab = 'ANALYSIS' | 'SEVERITY_REPORT' | 'SENTIMENT' | 'UNIVERSE' | 'SCENARIO';
export const FI_TAB_KEY = 'ppfx:fi-tab';

const SECTIONS: Array<{ id: FiTab; title: string; caption: string; icon: React.ComponentType<{ className?: string }>; activeBox: string; activeIcon: string; bar: string }> = [
  { id: 'ANALYSIS', title: 'Fundamentals', caption: 'Bullish / bearish scores for every market', icon: Gauge, activeBox: 'bg-gradient-to-br from-emerald-500/15 to-transparent border-emerald-400/60 shadow-emerald-500/10', activeIcon: 'bg-emerald-500 text-slate-950', bar: 'bg-emerald-400' },
  { id: 'SEVERITY_REPORT', title: 'CFTC COT Report', caption: 'What big institutions are holding', icon: ShieldAlert, activeBox: 'bg-gradient-to-br from-cyan-500/15 to-transparent border-cyan-400/60 shadow-cyan-500/10', activeIcon: 'bg-cyan-500 text-slate-950', bar: 'bg-cyan-400' },
  { id: 'SENTIMENT', title: 'Sentiment', caption: 'Where the retail crowd is positioned', icon: Activity, activeBox: 'bg-gradient-to-br from-blue-500/15 to-transparent border-blue-400/60 shadow-blue-500/10', activeIcon: 'bg-blue-500 text-slate-950', bar: 'bg-blue-400' },
  { id: 'UNIVERSE', title: 'Financial Universe', caption: 'Every asset on one live map', icon: Orbit, activeBox: 'bg-gradient-to-br from-amber-400/15 to-transparent border-amber-300/60 shadow-amber-400/10', activeIcon: 'bg-amber-400 text-slate-950', bar: 'bg-amber-300' },
  { id: 'SCENARIO', title: 'Scenario Lab', caption: 'What if the Fed cuts? See what flips', icon: FlaskConical, activeBox: 'bg-gradient-to-br from-fuchsia-500/15 to-transparent border-fuchsia-400/60 shadow-fuchsia-500/10', activeIcon: 'bg-fuchsia-500 text-slate-950', bar: 'bg-fuchsia-400' },
];
const readStart = (): FiTab => { try { const v = sessionStorage.getItem(FI_TAB_KEY); if (v) { sessionStorage.removeItem(FI_TAB_KEY); if (SECTIONS.some((x) => x.id === v)) return v as FiTab; } } catch { /* ignore */ } return 'ANALYSIS'; };

export interface FundamentalIndicatorsProps {
  currentUser?: any;
  isDemoMode?: boolean;
  onOpenSubscription?: () => void;
}

export const FundamentalIndicators: React.FC<FundamentalIndicatorsProps> = () => {
  const [activeTab, setActiveTab] = useState<FiTab>(readStart);

  // External tab navigation listener (e.g. from PreTradePlan or Dashboard shortcuts)
  useEffect(() => {
    const handleOpenTabEvent = (e: any) => {
      const targetTab = e?.detail?.tab;
      if (targetTab === 'ANALYSIS' || targetTab === 'FUNDAMENTAL_ANALYSIS') {
        setActiveTab('ANALYSIS');
      } else if (targetTab === 'COT_REPORT' || targetTab === 'SEVERITY_REPORT') {
        setActiveTab('SEVERITY_REPORT');
      } else if (targetTab === 'MARKET_SENTIMENT' || targetTab === 'SENTIMENT') {
        setActiveTab('SENTIMENT');
      } else if (targetTab === 'UNIVERSE') {
        setActiveTab('UNIVERSE');
      } else if (targetTab === 'SCENARIO') {
        setActiveTab('SCENARIO');
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

        {/* Four sub-categories */}
        <div role="tablist" aria-label="Fundamentals sections" className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {SECTIONS.map((t) => {
            const on = activeTab === t.id; const Icon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} data-testid={`fi-tab-${t.id}`} onClick={() => setActiveTab(t.id)}
                className={`group relative overflow-hidden text-left rounded-2xl border px-3.5 py-3 transition-all duration-200 cursor-pointer ${on ? `${t.activeBox} shadow-lg` : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-900/80'}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid place-items-center w-9 h-9 shrink-0 rounded-xl transition-colors ${on ? t.activeIcon : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}><Icon className="w-[18px] h-[18px]" /></span>
                  <span className="min-w-0">
                    <span className="block font-military font-bold text-[13px] sm:text-sm tracking-wide text-white truncate">{t.title}</span>
                    <span className="block text-[11px] text-slate-400 leading-snug line-clamp-2">{t.caption}</span>
                  </span>
                </div>
                <span className={`absolute inset-x-0 bottom-0 h-0.5 transition-opacity ${on ? 'opacity-100' : 'opacity-0'} ${t.bar}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeTab === 'ANALYSIS' && (
          <div className="animate-in fade-in duration-200">
            <FundamentalAnalysisView />
          </div>
        )}

        {activeTab === 'SEVERITY_REPORT' && (
          <div className="animate-in fade-in duration-200">
            <CotReportModule />
          </div>
        )}

        {activeTab === 'SENTIMENT' && (
          <div className="animate-in fade-in duration-200">
            <SentimentBoard />
          </div>
        )}

        {activeTab === 'UNIVERSE' && (
          <div className="animate-in fade-in duration-200">
            <FinancialUniverse onNavigate={() => setActiveTab('ANALYSIS')} />
          </div>
        )}

        {activeTab === 'SCENARIO' && (
          <div className="animate-in fade-in duration-200">
            <ScenarioLab />
          </div>
        )}
      </div>
    </div>
  );
};
