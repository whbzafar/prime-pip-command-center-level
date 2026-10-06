import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { CORE_MARKET_UNIVERSE, getAssetsByClass } from '../../data/marketUniverseData';
import { formatCurrency } from '../../utils/currencyFormatter';

interface IndexMacroMetrics {
  symbol: string;
  name: string;
  peRatio?: number;
  forwardPe?: number;
  dividendYieldPct?: number;
  earningsYieldPct?: number;
  realYieldDiscountRate10Y?: number;
  creditSpreadOasBps?: number;
  valuationStatus: 'OVERVALUED' | 'FAIR_VALUE' | 'UNDERVALUED' | 'DATA_UNAVAILABLE';
  primaryDrivers: { label: string; impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; note: string }[];
  authoritativeSources: string[];
}

const INDICES_BASELINE_DATA: Record<string, IndexMacroMetrics> = {
  US30: {
    symbol: 'US30',
    name: 'Dow Jones Industrial Average (DJIA)',
    forwardPe: 19.8,
    dividendYieldPct: 1.85,
    earningsYieldPct: 5.05,
    creditSpreadOasBps: 115,
    valuationStatus: 'FAIR_VALUE',
    primaryDrivers: [
      { label: 'U.S. Industrial Capex Growth', impact: 'BULLISH', note: 'Factory orders and equipment spending sustained at positive expansion levels.' },
      { label: 'Fed Policy Restrictiveness', impact: 'BEARISH', note: 'Higher interest rate plateau creates elevated debt refinancing costs for industrials.' },
      { label: 'Financials Net Interest Margins', impact: 'BULLISH', note: 'Deposit betas stabilizing across commercial banking majors.' },
    ],
    authoritativeSources: ['S&P Dow Jones Indices', 'Federal Reserve H.15', 'CBOT / CME Group'],
  },
  NAS100: {
    symbol: 'NAS100',
    name: 'Nasdaq 100 Index',
    forwardPe: 27.4,
    dividendYieldPct: 0.65,
    earningsYieldPct: 3.65,
    realYieldDiscountRate10Y: 1.82,
    valuationStatus: 'OVERVALUED',
    primaryDrivers: [
      { label: '10Y U.S. Real Yields (TIPS)', impact: 'BEARISH', note: 'Elevated real discount rates reduce present value of long-duration terminal cash flows.' },
      { label: 'Hyperscaler AI Infrastructure Capex', impact: 'BULLISH', note: 'Record data center capital investments support sustained semiconductor bookings.' },
      { label: 'Operating Free Cash Flow Margins', impact: 'BULLISH', note: 'Mega-cap software and cloud providers maintaining 30%+ free cash flow conversion.' },
    ],
    authoritativeSources: ['Nasdaq Global Index', 'U.S. Treasury', 'U.S. SEC EDGAR Database'],
  },
  SPX500: {
    symbol: 'SPX500',
    name: 'S&P 500 Index',
    forwardPe: 22.1,
    dividendYieldPct: 1.35,
    earningsYieldPct: 4.52,
    creditSpreadOasBps: 110,
    valuationStatus: 'FAIR_VALUE',
    primaryDrivers: [
      { label: 'Aggregate Operating Margin Resiliency', impact: 'BULLISH', note: 'Q3/Q4 blended earnings growth tracking above historical median.' },
      { label: 'High Yield Credit Spreads (OAS)', impact: 'BULLISH', note: 'Option-Adjusted Spreads tight at 110 bps signaling zero corporate liquidity distress.' },
      { label: 'Equity Risk Premium (ERP)', impact: 'BEARISH', note: 'ERP compressed below 15-year average against 10Y sovereign risk-free rate.' },
    ],
    authoritativeSources: ['S&P Dow Jones Indices', 'Bureau of Economic Analysis (BEA)', 'CME Group'],
  },
};

export const IndicesIntelligenceView: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NAS100');
  const indexAssets = getAssetsByClass('INDEX');
  const activeMetrics = INDICES_BASELINE_DATA[selectedSymbol] || INDICES_BASELINE_DATA.NAS100;

  return (
    <div className="space-y-6 font-mono-code text-xs">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-blue-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
              MODULE 06
            </span>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wider">
              INDICES MACRO INTELLIGENCE
            </h2>
          </div>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Equity market macro valuation, real yield discount rate modeling, forward earnings yields, and credit spread liquidity diagnostics.
          </p>
        </div>

        {/* Index Selector Buttons */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          {indexAssets.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                selectedSymbol === asset.symbol
                  ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {asset.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 3 Major Indices Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indexAssets.map((asset) => {
          const metrics = INDICES_BASELINE_DATA[asset.symbol];
          const isSelected = selectedSymbol === asset.symbol;
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`p-4 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-blue-950/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-military font-bold text-slate-100 text-sm">
                  {asset.symbol}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    metrics?.valuationStatus === 'OVERVALUED'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : metrics?.valuationStatus === 'UNDERVALUED'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {metrics?.valuationStatus || 'DATA_UNAVAILABLE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mb-3">{asset.displayName}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">Forward P/E:</span>
                  <span className="font-bold text-slate-200">{metrics?.forwardPe ? `${metrics.forwardPe}x` : 'DATA UNAVAILABLE'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Earnings Yield:</span>
                  <span className="font-bold text-cyan-400">{metrics?.earningsYieldPct ? `${metrics.earningsYieldPct}%` : 'DATA UNAVAILABLE'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Index Detailed Intelligence HUD */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-military font-bold text-slate-100 text-base">
              {activeMetrics.name} ({activeMetrics.symbol}) — VALUATION & LIQUIDITY MATRIX
            </h3>
            <span className="text-slate-500 text-[11px]">
              Benchmark sources: {activeMetrics.authoritativeSources.join(' • ')}
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-slate-900 border border-slate-700 text-slate-300">
            Valuation: <strong className="text-blue-400">{activeMetrics.valuationStatus}</strong>
          </span>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Forward P/E Multiple</span>
            <span className="text-base font-bold text-slate-100 mt-0.5 block">{activeMetrics.forwardPe ?? '—'}x</span>
            <span className="text-[9px] text-slate-500">Historical Median: ~18.5x</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Earnings Yield (1/PE)</span>
            <span className="text-base font-bold text-cyan-300 mt-0.5 block">{activeMetrics.earningsYieldPct ?? '—'}%</span>
            <span className="text-[9px] text-slate-500">Capital Return Equivalent</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Dividend Yield</span>
            <span className="text-base font-bold text-emerald-300 mt-0.5 block">{activeMetrics.dividendYieldPct ?? '—'}%</span>
            <span className="text-[9px] text-slate-500">Cash Return Component</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">
              {activeMetrics.realYieldDiscountRate10Y ? '10Y Real Yield (TIPS)' : 'HY Credit Spread (OAS)'}
            </span>
            <span className="text-base font-bold text-amber-300 mt-0.5 block">
              {activeMetrics.realYieldDiscountRate10Y ? `${activeMetrics.realYieldDiscountRate10Y}%` : `${activeMetrics.creditSpreadOasBps} bps`}
            </span>
            <span className="text-[9px] text-slate-500">Macro Discount Barrier</span>
          </div>
        </div>

        {/* Primary Macro Drivers Breakdown */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Deterministic Macro Catalysts & Weighting</span>
          </h4>

          <div className="space-y-2">
            {activeMetrics.primaryDrivers.map((driver, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-200 block">{driver.label}</span>
                  <span className="text-[11px] text-slate-400">{driver.note}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase self-start sm:self-auto shrink-0 border ${
                    driver.impact === 'BULLISH'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : driver.impact === 'BEARISH'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {driver.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
