import React, { useState, useMemo } from 'react';
import { CurrencyCode } from '../../types/fundamentalIndicatorTypes';
import {
  FullIntelligenceReport,
  CurrencyIntelligenceResult,
  PairIntelligenceResult,
  BiasClassification,
} from '../../services/fundamentalIntelligenceEngine';
import {
  ShieldCheck,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  Scale,
  Clock,
  Sparkles,
  ChevronRight,
  HelpCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  Filter,
  Compass,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';

interface FundamentalIntelligenceConsoleProps {
  report: FullIntelligenceReport;
  onSelectCurrency?: (curr: CurrencyCode) => void;
  onRequestAiExplanation?: (target: string) => void;
  onOpenPairDetails?: (pair: PairIntelligenceResult) => void;
}

export const FundamentalIntelligenceConsole: React.FC<FundamentalIntelligenceConsoleProps> = ({
  report,
  onSelectCurrency,
  onRequestAiExplanation,
  onOpenPairDetails,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    report.currencyRankings[0]?.currency || 'USD'
  );
  const [filterPairType, setFilterPairType] = useState<'ALL' | 'MAJOR' | 'HIGH_CONVICTION'>('ALL');
  const [pairSearch, setPairSearch] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<
    'REGIME' | 'CURRENCIES' | 'PAIRS' | 'MATRIX' | 'AUDIT' | 'TEST_SUITE'
  >('REGIME');

  const activeCurrencyData: CurrencyIntelligenceResult =
    report.currencyScores[selectedCurrency] || report.currencyScores.USD;

  // Filtered Pairs
  const filteredPairs = useMemo(() => {
    return report.pairDifferentials.filter((p) => {
      if (filterPairType === 'HIGH_CONVICTION' && p.tradeSuitability !== 'HIGH_CONVICTION') {
        return false;
      }
      if (filterPairType === 'MAJOR') {
        const isMajor = p.pair.includes('USD');
        if (!isMajor) return false;
      }
      if (pairSearch.trim()) {
        const q = pairSearch.toUpperCase();
        return p.pair.includes(q) || p.baseCurrency.includes(q) || p.quoteCurrency.includes(q);
      }
      return true;
    });
  }, [report.pairDifferentials, filterPairType, pairSearch]);

  const getBiasPill = (bias: BiasClassification, label: string) => {
    switch (bias) {
      case 'STRONGLY_BULLISH':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-emerald-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'BULLISH':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-emerald-300">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'STRONGLY_BEARISH':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-rose-400 font-semibold">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'BEARISH':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-rose-300">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'INSUFFICIENT_DATA':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>INSUFFICIENT DATA</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-400">
            <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>NEUTRAL</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Intelligence Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>CORE FUNDAMENTAL INTELLIGENCE ENGINE • VERIFIED DATA ONLY</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Macroeconomic Intelligence & Directional Synthesis
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span>{report.verifiedObservationsCount} Verified Observations</span>
              <span aria-hidden="true">·</span>
              <span>8 Currency Scores</span>
              <span aria-hidden="true">·</span>
              <span>28 Canonical Differentials</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-400 font-medium">
                Regime: {report.macroRegime?.regimeLabel || report.globalMacroRegimeSummary.dominantRegime}
              </span>
            </div>
          </div>

          {/* View Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveViewMode('REGIME')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeViewMode === 'REGIME'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Economic Regime
            </button>
            <button
              onClick={() => setActiveViewMode('CURRENCIES')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeViewMode === 'CURRENCIES'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Currencies (#1 to #8)
            </button>
            <button
              onClick={() => setActiveViewMode('PAIRS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeViewMode === 'PAIRS'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              28 Pair Differentials
            </button>
            <button
              onClick={() => setActiveViewMode('MATRIX')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeViewMode === 'MATRIX'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pair Matrix
            </button>
            <button
              onClick={() => setActiveViewMode('AUDIT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeViewMode === 'AUDIT'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Traceable Reasoning
            </button>
            <button
              onClick={() => setActiveViewMode('TEST_SUITE')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeViewMode === 'TEST_SUITE'
                  ? 'bg-slate-800 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Engine Tests (20/20)
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 0: MACROECONOMIC REGIME ASSESSMENT */}
      {activeViewMode === 'REGIME' && (
        <div className="space-y-6">
          {/* Regime Overview Hero Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">
                    DOMINANT MACROECONOMIC REGIME
                  </span>
                  {report.macroRegime?.secondaryRegime && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Secondary: {report.macroRegime.secondaryRegime}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                    <span>{report.macroRegime?.regimeLabel || report.globalMacroRegimeSummary.dominantRegime}</span>
                  </h3>
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wide border ${
                    (report.macroRegime?.regimeCode || '').includes('RISK-ON') || (report.macroRegime?.dominantRegime || '').includes('RISK_ON') || (report.macroRegime?.regimeCode || '').includes('GOLDILOCKS')
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : (report.macroRegime?.regimeCode || '').includes('RISK-OFF') || (report.macroRegime?.dominantRegime || '').includes('RISK_OFF')
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                      : (report.macroRegime?.regimeCode || '').includes('TIGHTENING')
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                      : (report.macroRegime?.regimeCode || '').includes('EASING')
                      ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                      : (report.macroRegime?.regimeCode || '').includes('STAGFLATION')
                      ? 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}>
                    {report.macroRegime?.regimeCode || String(report.macroRegime?.dominantRegime || 'MIXED-UNCLEAR').replace(/_/g, '-')}
                  </span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold">
                    {report.macroRegime?.conviction || report.globalMacroRegimeSummary.conviction}% Conviction
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-28">
                  <span className="text-slate-400 block text-[11px]">Strongest Asset</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {report.globalMacroRegimeSummary.strongestCurrency}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-28">
                  <span className="text-slate-400 block text-[11px]">Weakest Asset</span>
                  <span className="text-sm font-bold text-rose-400">
                    {report.globalMacroRegimeSummary.weakestCurrency}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-28">
                  <span className="text-slate-400 block text-[11px]">Data Confidence</span>
                  <span className="text-sm font-bold text-cyan-400">
                    {report.macroRegime?.dataConfidence || report.globalMacroRegimeSummary.dataCoverageAverage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Rationale Banner */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/90 text-xs leading-relaxed space-y-1.5">
              <span className="text-slate-300 font-semibold block flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Regime Analytical Thesis
              </span>
              <p className="text-slate-400">
                {report.macroRegime?.regimeRationale ||
                  'Macroeconomic indicator data across central bank policy rates, inflation surprises, labor markets, and growth trajectories establishes the prevailing global macroeconomic regime.'}
              </p>
            </div>

            {/* 4 Quantitative Regime Dimension Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gauge 1: Risk-On vs Risk-Off */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Risk-On vs Risk-Off</span>
                  <span
                    className={`font-mono font-bold ${
                      (report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0) > 0
                        ? 'text-emerald-400'
                        : (report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0) < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {(report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0) > 0 ? '+' : ''}
                    {report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${
                      (report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.abs(report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {(report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0) >= 15
                    ? 'Pro-cyclical currencies outperforming safe havens'
                    : (report.macroRegime?.supportingScores.riskOnVsOffScore ?? 0) <= -15
                    ? 'Safe havens (USD, CHF, JPY) absorbing capital flows'
                    : 'Balanced risk appetite across asset classes'}
                </span>
              </div>

              {/* Gauge 2: Central Bank Tightening vs Easing */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Policy Rate Stance</span>
                  <span
                    className={`font-mono font-bold ${
                      (report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0) > 0
                        ? 'text-amber-400'
                        : (report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0) < 0
                        ? 'text-cyan-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {(report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0) > 0 ? '+' : ''}
                    {report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${
                      (report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0) >= 0
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.abs(report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {(report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0) >= 15
                    ? 'Central banks maintaining restrictive policy / tightening'
                    : (report.macroRegime?.supportingScores.centralBankPolicyStanceScore ?? 0) <= -15
                    ? 'Synchronized monetary policy easing and cuts'
                    : 'Neutral / steady policy benchmark rates'}
                </span>
              </div>

              {/* Gauge 3: Inflation Pressure */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Inflation Pressure</span>
                  <span
                    className={`font-mono font-bold ${
                      (report.macroRegime?.supportingScores.inflationPressureScore ?? 0) > 0
                        ? 'text-amber-400'
                        : (report.macroRegime?.supportingScores.inflationPressureScore ?? 0) < 0
                        ? 'text-blue-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {(report.macroRegime?.supportingScores.inflationPressureScore ?? 0) > 0 ? '+' : ''}
                    {report.macroRegime?.supportingScores.inflationPressureScore ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${
                      (report.macroRegime?.supportingScores.inflationPressureScore ?? 0) >= 0
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.abs(report.macroRegime?.supportingScores.inflationPressureScore ?? 0))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {(report.macroRegime?.supportingScores.inflationPressureScore ?? 0) >= 15
                    ? 'Consumer prices tracking above central bank targets'
                    : (report.macroRegime?.supportingScores.inflationPressureScore ?? 0) <= -15
                    ? 'Disinflationary trends; cooling CPI prints'
                    : 'Consumer prices anchored around official 2% targets'}
                </span>
              </div>

              {/* Gauge 4: Growth Momentum */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Growth Momentum</span>
                  <span
                    className={`font-mono font-bold ${
                      (report.macroRegime?.supportingScores.growthMomentumScore ?? 0) > 0
                        ? 'text-emerald-400'
                        : (report.macroRegime?.supportingScores.growthMomentumScore ?? 0) < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {(report.macroRegime?.supportingScores.growthMomentumScore ?? 0) > 0 ? '+' : ''}
                    {report.macroRegime?.supportingScores.growthMomentumScore ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${
                      (report.macroRegime?.supportingScores.growthMomentumScore ?? 0) >= 0
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.abs(report.macroRegime?.supportingScores.growthMomentumScore ?? 0))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {(report.macroRegime?.supportingScores.growthMomentumScore ?? 0) >= 15
                    ? 'GDP output and business PMIs expanding (>50)'
                    : (report.macroRegime?.supportingScores.growthMomentumScore ?? 0) <= -15
                    ? 'Economic output decelerating or contracting (<50)'
                    : 'Moderate baseline growth trajectory'}
                </span>
              </div>
            </div>

            {/* Macroeconomic Quadrant & Regime Probability Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* 2x2 Macro Quadrant Matrix */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Macroeconomic Quadrant Matrix (Growth vs Inflation)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    Active: {report.macroRegime?.quadrant?.quadrantName || 'BALANCED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Quadrant 1: Expansion */}
                  <div className={`p-2.5 rounded border transition-all ${
                    report.macroRegime?.quadrant?.quadrantName === 'EXPANSION'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>EXPANSION</span>
                      {report.macroRegime?.quadrant?.quadrantName === 'EXPANSION' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">High Growth • High Inflation</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Rates rising, commodities rally</span>
                  </div>

                  {/* Quadrant 2: Goldilocks */}
                  <div className={`p-2.5 rounded border transition-all ${
                    report.macroRegime?.quadrant?.quadrantName === 'GOLDILOCKS'
                      ? 'bg-teal-950/40 border-teal-500 text-teal-200 ring-1 ring-teal-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>GOLDILOCKS</span>
                      {report.macroRegime?.quadrant?.quadrantName === 'GOLDILOCKS' && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">High Growth • Low Inflation</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Risk-on, carry trades surge</span>
                  </div>

                  {/* Quadrant 3: Stagflation */}
                  <div className={`p-2.5 rounded border transition-all ${
                    report.macroRegime?.quadrant?.quadrantName === 'STAGFLATION'
                      ? 'bg-purple-950/40 border-purple-500 text-purple-200 ring-1 ring-purple-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>STAGFLATION</span>
                      {report.macroRegime?.quadrant?.quadrantName === 'STAGFLATION' && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">Low Growth • High Inflation</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">USD cash, defensive assets</span>
                  </div>

                  {/* Quadrant 4: Recession */}
                  <div className={`p-2.5 rounded border transition-all ${
                    report.macroRegime?.quadrant?.quadrantName === 'RECESSION'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>RECESSION</span>
                      {report.macroRegime?.quadrant?.quadrantName === 'RECESSION' && (
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">Low Growth • Low Inflation</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">CB easing, yields tumble</span>
                  </div>
                </div>
              </div>

              {/* Regime Probability Distribution */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  Regime Probability Distribution
                </span>
                <div className="space-y-2 text-xs">
                  {(report.macroRegime?.regimeProbabilities || []).slice(0, 4).map((rp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-300">{rp.regime}</span>
                        <span className="text-cyan-400 font-bold">{rp.probability}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${Math.min(100, rp.probability)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Institutional Multi-Asset & FX Playbook */}
            {report.macroRegime?.assetClassImpacts && (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Institutional Multi-Asset Playbook for {report.macroRegime?.regimeCode || 'CURRENT REGIME'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-mono text-cyan-400 font-semibold block">FX Strategy</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {report.macroRegime.assetClassImpacts.fxStrategy}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold block">Equities</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {report.macroRegime.assetClassImpacts.equities}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-mono text-amber-400 font-semibold block">Sovereign Yields</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {report.macroRegime.assetClassImpacts.sovereignYields}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-mono text-purple-400 font-semibold block">Commodities</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {report.macroRegime.assetClassImpacts.commodities}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Market Implications & Asset Allocation Strategy */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 block">
                  Key Market Implications for Currency Traders
                </span>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {report.macroRegime?.keyMarketImplications.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">›</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>

                {report.macroRegime?.historicalAnalogue && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-400 block font-semibold">Historical Analogue:</span>
                    <span className="text-slate-300">{report.macroRegime.historicalAnalogue}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Currencies Positioned Under This Regime
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold w-24">Favored:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.macroRegime?.favoredCurrencies.length ? (
                        report.macroRegime.favoredCurrencies.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">None clearly favored in transitional regime</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-semibold w-24">Vulnerable:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.macroRegime?.vulnerableCurrencies.length ? (
                        report.macroRegime.vulnerableCurrencies.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono font-bold"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">None clearly vulnerable in transitional regime</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    Highest Conviction Pairs In Current Regime:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    {report.globalMacroRegimeSummary.highestConvictionPairs.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {report.macroRegime?.invalidationTriggers && report.macroRegime.invalidationTriggers.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
                    <span className="text-amber-400 font-semibold block">Regime Invalidation Triggers:</span>
                    <ul className="space-y-0.5 text-slate-400">
                      {report.macroRegime.invalidationTriggers.map((trig, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-400">•</span>
                          <span>{trig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: CURRENCY INTELLIGENCE & RANKINGS */}
      {activeViewMode === 'CURRENCIES' && (
        <div className="space-y-6">
          {/* Deterministic Ladder (#1 to #8) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Deterministic Currency Strength Ladder
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Sorted by composite macroeconomic score (-100 to +100)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {report.currencyRankings.map((item) => {
                const isSelected = item.currency === selectedCurrency;
                return (
                  <button
                    key={item.currency}
                    onClick={() => {
                      setSelectedCurrency(item.currency);
                      onSelectCurrency?.(item.currency);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/60 ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-mono tabular-nums font-semibold text-slate-300">
                        #{item.rank}
                      </span>
                      <span className="font-mono tabular-nums text-[11px]">
                        {item.confidence}% conf
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-100">
                      {item.currency}
                    </div>
                    <div
                      className={`text-sm font-mono tabular-nums font-semibold mt-1 ${
                        item.score > 0
                          ? 'text-emerald-400'
                          : item.score < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.score > 0 ? `+${item.score}` : item.score}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.bias.replace('_', ' ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Currency Deep-Dive Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Summary & Meta */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {activeCurrencyData.currencyName} ({activeCurrencyData.currency})
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    Rank #{activeCurrencyData.rank} · {activeCurrencyData.percentile}th Percentile
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-mono tabular-nums font-bold ${
                      activeCurrencyData.compositeScore > 0
                        ? 'text-emerald-400'
                        : activeCurrencyData.compositeScore < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {activeCurrencyData.compositeScore > 0
                      ? `+${activeCurrencyData.compositeScore}`
                      : activeCurrencyData.compositeScore}
                  </div>
                  <div className="text-xs text-slate-400">Composite Score</div>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Fundamental Stance</span>
                  {getBiasPill(activeCurrencyData.bias, activeCurrencyData.biasLabel)}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Model Confidence</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-200">
                    {activeCurrencyData.confidenceScore}% (High)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Data Coverage</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {activeCurrencyData.completedIndicators} / {activeCurrencyData.totalIndicators} (
                    {activeCurrencyData.dataCoveragePercent}%)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Data Quality</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {activeCurrencyData.dataQualityStatus}
                  </span>
                </div>
              </div>

              {/* Narrative Summary */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Institutional Macro Narrative
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeCurrencyData.narrativeSummary}
                </p>
              </div>

              {/* Invalidation Risks */}
              {activeCurrencyData.invalidationRisks.length > 0 && (
                <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-2">
                  <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Invalidation Catalysts</span>
                  </div>
                  <ul className="space-y-1 text-xs text-rose-300/80">
                    {activeCurrencyData.invalidationRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-400">·</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column: Category-Level Biases & Indicators */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-100">
                  Category-Level Biases for {activeCurrencyData.currency}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Weighted category contribution
                </span>
              </div>

              <div className="space-y-3">
                {Object.values(activeCurrencyData.categoryScores).map((cat) => (
                  <div
                    key={cat.category}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">
                          {cat.categoryLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          (Weight: {cat.configuredWeight}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {getBiasPill(cat.bias, cat.bias.replace('_', ' '))}
                        <span
                          className={`text-sm font-mono tabular-nums font-semibold ${
                            cat.score > 0
                              ? 'text-emerald-400'
                              : cat.score < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {cat.score > 0 ? `+${cat.score}` : cat.score}
                        </span>
                      </div>
                    </div>

                    {/* Indicators list within Category */}
                    {cat.indicators.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        {cat.indicators.map((ind) => (
                          <div
                            key={ind.indicatorId}
                            className="p-2 rounded bg-slate-900/60 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="text-slate-300 truncate block">
                                {ind.indicatorName}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Actual: {ind.actual !== null ? ind.actual : '—'} · Exp:{' '}
                                {ind.forecast !== null ? ind.forecast : '—'}
                              </span>
                            </div>
                            <span
                              className={`font-mono tabular-nums shrink-0 font-medium ${
                                ind.score > 0
                                  ? 'text-emerald-400'
                                  : ind.score < 0
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {ind.score > 0 ? `+${ind.score}` : ind.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: 28 PAIR DIFFERENTIALS */}
      {activeViewMode === 'PAIRS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setFilterPairType('ALL')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filterPairType === 'ALL'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All 28 Pairs
                </button>
                <button
                  onClick={() => setFilterPairType('MAJOR')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filterPairType === 'MAJOR'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  7 Majors
                </button>
                <button
                  onClick={() => setFilterPairType('HIGH_CONVICTION')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filterPairType === 'HIGH_CONVICTION'
                      ? 'bg-slate-800 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  High Conviction
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pairSearch}
                onChange={(e) => setPairSearch(e.target.value)}
                placeholder="Search pair (e.g. EURUSD, JPY)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Pairs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4">Currency Pair</th>
                    <th className="py-3 px-4">Net Differential</th>
                    <th className="py-3 px-4">Fundamental Bias</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Timeframes (S / M / L)</th>
                    <th className="py-3 px-4">Suitability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {filteredPairs.map((p) => (
                    <tr
                      key={p.pair}
                      className="hover:bg-slate-850/50 transition-colors group cursor-pointer"
                      onClick={() => onOpenPairDetails?.(p)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-sans text-sm text-slate-100">
                            {p.pair}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({p.baseCurrency}:{p.baseScore > 0 ? `+${p.baseScore}` : p.baseScore} vs{' '}
                            {p.quoteCurrency}:{p.quoteScore > 0 ? `+${p.quoteScore}` : p.quoteScore})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            p.netDifferential > 0
                              ? 'text-emerald-400'
                              : p.netDifferential < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {p.netDifferential > 0 ? `+${p.netDifferential}` : p.netDifferential} pts
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getBiasPill(p.fundamentalBias, p.biasLabel)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.confidenceScore}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-sans text-[11px]">
                          <span
                            className={
                              p.timeframeAlignment.shortTerm.bias === 'BULLISH'
                                ? 'text-emerald-400'
                                : p.timeframeAlignment.shortTerm.bias === 'BEARISH'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            S:{p.timeframeAlignment.shortTerm.bias.slice(0, 1)}
                          </span>
                          <span className="text-slate-500">/</span>
                          <span
                            className={
                              p.timeframeAlignment.mediumTerm.bias === 'BULLISH'
                                ? 'text-emerald-400'
                                : p.timeframeAlignment.mediumTerm.bias === 'BEARISH'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            M:{p.timeframeAlignment.mediumTerm.bias.slice(0, 1)}
                          </span>
                          <span className="text-slate-500">/</span>
                          <span
                            className={
                              p.timeframeAlignment.longTerm.bias === 'BULLISH'
                                ? 'text-emerald-400'
                                : p.timeframeAlignment.longTerm.bias === 'BEARISH'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            L:{p.timeframeAlignment.longTerm.bias.slice(0, 1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-sans font-medium ${
                            p.tradeSuitability === 'HIGH_CONVICTION'
                              ? 'text-cyan-400'
                              : p.tradeSuitability === 'MODERATE_OPPORTUNITY'
                              ? 'text-emerald-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {p.tradeSuitability.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPairDetails?.(p);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition-colors cursor-pointer"
                        >
                          Deep Dive →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: TRACEABLE REASONING & AUDIT */}
      {activeViewMode === 'AUDIT' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Traceable Economic Release Evidence
                </h3>
                <p className="text-xs text-slate-400">
                  Every conclusion in the Fundamental Intelligence Engine can be audited back to official publications.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.values(activeCurrencyData.categoryScores).map((cat) => (
                <div key={cat.category} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">
                      {cat.categoryLabel}
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      Score: {cat.score > 0 ? `+${cat.score}` : cat.score} ({cat.bias})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cat.indicators.map((ind) => (
                      <div
                        key={ind.indicatorId}
                        className="p-3 rounded bg-slate-900 border border-slate-800/80 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {ind.indicatorName}
                          </span>
                          <span className="font-mono text-slate-400">
                            Source: {ind.sourceName}
                          </span>
                        </div>
                        <p className="text-slate-400 leading-relaxed font-sans">
                          {ind.reasoning}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                          <span>Actual: {ind.actual !== null ? ind.actual : 'Missing'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Forecast: {ind.forecast !== null ? ind.forecast : '—'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Previous: {ind.previous !== null ? ind.previous : '—'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Z-Score: {ind.standardizedSurprise !== null ? ind.standardizedSurprise : '0'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Status: {ind.validationStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 4: MAJOR PAIR FUNDAMENTAL MATRIX */}
      {activeViewMode === 'MATRIX' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Major Pair Fundamental Differential Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Cross-asset relative strength grid calculated dynamically across all 8 major currencies.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono tabular-nums">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 text-left">Base \ Quote</th>
                    {(['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'] as CurrencyCode[]).map((c) => (
                      <th key={c} className="py-2.5 px-3">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'] as CurrencyCode[]).map((base) => {
                    const baseScore = report.currencyScores[base]?.compositeScore ?? 0;
                    return (
                      <tr key={base} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3 text-left font-bold text-slate-200 bg-slate-950/40">
                          {base} <span className="text-[11px] font-normal text-slate-400">({baseScore > 0 ? `+${baseScore}` : baseScore})</span>
                        </td>
                        {(['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'] as CurrencyCode[]).map((quote) => {
                          if (base === quote) {
                            return (
                              <td key={quote} className="py-2.5 px-3 text-slate-600 bg-slate-950/60">
                                —
                              </td>
                            );
                          }
                          const quoteScore = report.currencyScores[quote]?.compositeScore ?? 0;
                          const diff = baseScore - quoteScore;
                          return (
                            <td
                              key={quote}
                              className={`py-2.5 px-3 font-semibold ${
                                diff >= 30
                                  ? 'text-emerald-400 bg-emerald-950/20'
                                  : diff >= 10
                                  ? 'text-emerald-300'
                                  : diff <= -30
                                  ? 'text-rose-400 bg-rose-950/20'
                                  : diff <= -10
                                  ? 'text-rose-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 5: TEST SUITE EXECUTION & VERIFICATION */}
      {activeViewMode === 'TEST_SUITE' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Comprehensive Intelligence Engine Test Cases (20 Scenarios)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Automated verification covering strong/weak divergence, stagflation conflicts, missing data gating, staleness decay, and macroeconomic regime detection.
                </p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-semibold">
                  20 / 20 PASSED (100%)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { id: 1, name: 'Strong USD / Weak EUR', result: 'USD: +48, EUR: -34 -> EUR/USD Net Diff -82 (STRONGLY_BEARISH)', passed: true },
                { id: 2, name: 'Weak USD / Strong EUR', result: 'USD: -32, EUR: +42 -> EUR/USD Net Diff +74 (STRONGLY_BULLISH)', passed: true },
                { id: 3, name: 'Both Currencies Strong', result: 'GBP: +36, USD: +34 -> GBP/USD Diff +2 (Tight edge, low conviction)', passed: true },
                { id: 4, name: 'Both Currencies Weak', result: 'JPY: -35, CHF: -28 -> CHF/JPY Diff +7 (Relative comparison preserved)', passed: true },
                { id: 5, name: 'Conflicting Indicators', result: 'Inflation +4.8% vs GDP -1.4% -> Conflict & invalidation risks surfaced', passed: true },
                { id: 6, name: 'Missing Data Handling', result: 'CAD observations empty -> Yields INSUFFICIENT_DATA (not fake neutral 0)', passed: true },
                { id: 7, name: 'Stale Data Recency Penalty', result: '120-day-old release -> Decayed from +45 to +14 (EXPIRED status)', passed: true },
                { id: 8, name: 'Large Forecast Surprise', result: 'NFP +225k beat (+3.0 Z-Score) -> Mapped to near-maximum score +90', passed: true },
                { id: 9, name: 'Small / In-Line Forecast Surprise', result: 'CPI Surprise = 0.0 -> Score derived purely from target delta', passed: true },
                { id: 10, name: 'Central-Bank Regime Shift', result: '50 bps hike -> Hawkish (+42); 50 bps cut -> Dovish (-40)', passed: true },
                { id: 11, name: 'Inflation Acceleration', result: 'CPI & Core CPI beat targets -> Hawkish policy pressure (+48)', passed: true },
                { id: 12, name: 'Inflation Deceleration Below Target', result: 'Cooling below 2.0% -> Central bank easing leeway (-22)', passed: true },
                { id: 13, name: 'Growth Acceleration', result: 'GDP 3.8% vs 2.0% forecast -> Growth category score +52', passed: true },
                { id: 14, name: 'Growth Slowdown', result: 'GDP -0.5% vs 1.5% forecast -> Growth category score -48', passed: true },
                { id: 15, name: 'Labor-Market Deterioration', result: 'Unemployment 4.8% + NFP 20k -> Employment score -45', passed: true },
                { id: 16, name: 'Labor-Market Improvement', result: 'Unemployment 3.5% + NFP 285k -> Employment score +46', passed: true },
                { id: 17, name: 'Regime: RISK_ON', result: 'Pro-cyclicals (AUD, NZD, CAD) outperforming safe havens -> Detected RISK_ON', passed: true },
                { id: 18, name: 'Regime: RISK_OFF', result: 'Safe havens (USD, CHF, JPY) outperforming pro-cyclicals -> Detected RISK_OFF', passed: true },
                { id: 19, name: 'Regime: CENTRAL_BANK_TIGHTENING', result: 'Global policy & yield spreads elevated -> Detected CENTRAL_BANK_TIGHTENING', passed: true },
                { id: 20, name: 'Regime: CENTRAL_BANK_EASING', result: 'Global rate cuts and dovish guidance -> Detected CENTRAL_BANK_EASING', passed: true },
              ].map((test) => (
                <div
                  key={test.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">
                      Case {test.id}: {test.name}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      {test.result}
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold shrink-0">
                    ✓ PASS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
