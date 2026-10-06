import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Building,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { getAssetsByClass } from '../../data/marketUniverseData';

interface StockMacroMetrics {
  symbol: string;
  name: string;
  forwardPe?: number;
  pegRatio?: number;
  operatingMarginPct?: number;
  fcfYieldPct?: number;
  valuationStatus: 'OVERVALUED' | 'FAIR_VALUE' | 'UNDERVALUED' | 'DATA_UNAVAILABLE';
  primaryDrivers: { label: string; impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; note: string }[];
  authoritativeSources: string[];
}

const STOCKS_BASELINE_DATA: Record<string, StockMacroMetrics> = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    forwardPe: 34.2,
    pegRatio: 1.15,
    operatingMarginPct: 62.1,
    fcfYieldPct: 2.85,
    valuationStatus: 'FAIR_VALUE',
    primaryDrivers: [
      { label: 'Hyperscaler AI Accelerators Demand', impact: 'BULLISH', note: 'Next-gen architecture bookings solid across Microsoft, Meta, Google, and Amazon.' },
      { label: 'Supply Chain & Packaging Capacity', impact: 'BULLISH', note: 'TSMC CoWoS advanced packaging capacity expansion meeting backlog.' },
      { label: 'Geopolitical Export Controls', impact: 'BEARISH', note: 'Restrictions on advanced AI silicon exports to restricted markets.' },
    ],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'NVIDIA Investor Relations'],
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    forwardPe: 30.5,
    pegRatio: 2.45,
    operatingMarginPct: 30.8,
    fcfYieldPct: 3.25,
    valuationStatus: 'OVERVALUED',
    primaryDrivers: [
      { label: 'Services High-Margin Expansion', impact: 'BULLISH', note: 'App Store, Cloud, and Subscriptions expanding above 70% gross margins.' },
      { label: 'China Hardware Sales Competition', impact: 'BEARISH', note: 'Domestic handset competition in Greater China compressing unit sales growth.' },
      { label: 'Aggressive Capital Allocation', impact: 'BULLISH', note: 'Massive programmatic share repurchase program reducing share count.' },
    ],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Apple Investor Relations'],
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    forwardPe: 31.8,
    pegRatio: 1.85,
    operatingMarginPct: 44.5,
    fcfYieldPct: 2.65,
    valuationStatus: 'FAIR_VALUE',
    primaryDrivers: [
      { label: 'Azure Cloud Infrastructure Revenue', impact: 'BULLISH', note: 'Quarterly cloud computing growth outpacing peers with enterprise AI integration.' },
      { label: 'Office 365 Copilot Enterprise ARPU', impact: 'BULLISH', note: 'Enterprise seat upselling driving recurring subscription expansion.' },
      { label: 'Heavy Data Center Capex Cycle', impact: 'NEUTRAL', note: 'Capital expenditures elevated at ~30% of operating cash flows.' },
    ],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Microsoft Investor Relations'],
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    forwardPe: 33.1,
    pegRatio: 1.30,
    operatingMarginPct: 9.8,
    fcfYieldPct: 3.40,
    valuationStatus: 'FAIR_VALUE',
    primaryDrivers: [
      { label: 'AWS Operating Income Reacceleration', impact: 'BULLISH', note: 'Cloud workloads migrating from cost-optimization to new AI deployment.' },
      { label: 'Digital Advertising High-Margin Mix', impact: 'BULLISH', note: 'Prime Video and sponsored product ad revenues expanding rapidly.' },
      { label: 'North America Retail Fulfillment Efficiency', impact: 'BULLISH', note: 'Regionalized warehouse model driving record retail operating margins.' },
    ],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Amazon Investor Relations'],
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    forwardPe: 20.4,
    pegRatio: 1.20,
    operatingMarginPct: 32.2,
    fcfYieldPct: 3.90,
    valuationStatus: 'UNDERVALUED',
    primaryDrivers: [
      { label: 'Core Search Monetization Resiliency', impact: 'BULLISH', note: 'Search revenue demonstrating sustained volume growth despite AI landscape changes.' },
      { label: 'Google Cloud Platform Operating Profits', impact: 'BULLISH', note: 'GCP maintaining positive operating profit margins with enterprise AI wins.' },
      { label: 'Antitrust Legal Overhang', impact: 'BEARISH', note: 'U.S. Department of Justice antitrust proceedings and remedies under evaluation.' },
    ],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Alphabet Investor Relations'],
  },
};

export const StockIntelligenceView: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NVDA');
  const stockAssets = getAssetsByClass('STOCK');
  const activeMetrics = STOCKS_BASELINE_DATA[selectedSymbol] || STOCKS_BASELINE_DATA.NVDA;

  return (
    <div className="space-y-6 font-mono-code text-xs">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-purple-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
              MODULE 08
            </span>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wider">
              MEGA-CAP EQUITIES INTELLIGENCE
            </h2>
          </div>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Corporate fundamental financial modeling, operating cash flow conversion, forward valuation multiples, and SEC disclosure verification.
          </p>
        </div>

        {/* Stock Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex-wrap">
          {stockAssets.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                selectedSymbol === asset.symbol
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {asset.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Stock Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stockAssets.map((asset) => {
          const metrics = STOCKS_BASELINE_DATA[asset.symbol];
          const isSelected = selectedSymbol === asset.symbol;
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-purple-950/20 border-purple-500/50 shadow-md shadow-purple-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-military font-bold text-slate-100 text-xs">
                  {asset.symbol}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border ${
                    metrics?.valuationStatus === 'UNDERVALUED'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : metrics?.valuationStatus === 'OVERVALUED'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {metrics?.valuationStatus || 'DATA_UNAVAILABLE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mb-2">{asset.shortName}</p>
              <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-800 flex justify-between">
                <span>Fwd P/E:</span>
                <strong className="text-slate-200">{metrics?.forwardPe ? `${metrics.forwardPe}x` : '—'}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Telemetry HUD */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-military font-bold text-slate-100 text-base">
              {activeMetrics.name} ({activeMetrics.symbol}) — SEC DISCLOSURE & VALUATION HUD
            </h3>
            <span className="text-slate-500 text-[11px]">
              Filing repositories: {activeMetrics.authoritativeSources.join(' • ')}
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-slate-900 border border-slate-700 text-purple-300">
            Status: {activeMetrics.valuationStatus}
          </span>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Forward P/E Multiple</span>
            <span className="text-base font-bold text-slate-100 mt-0.5 block">{activeMetrics.forwardPe ?? '—'}x</span>
            <span className="text-[9px] text-slate-500">Earnings Multiple Basis</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">PEG Ratio (P/E / Growth)</span>
            <span className="text-base font-bold text-cyan-300 mt-0.5 block">{activeMetrics.pegRatio ?? '—'}</span>
            <span className="text-[9px] text-slate-500">&lt; 1.5 indicates growth value</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Operating Margin</span>
            <span className="text-base font-bold text-emerald-300 mt-0.5 block">{activeMetrics.operatingMarginPct ?? '—'}%</span>
            <span className="text-[9px] text-slate-500">GAAP Operating Profitability</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Free Cash Flow Yield</span>
            <span className="text-base font-bold text-amber-300 mt-0.5 block">{activeMetrics.fcfYieldPct ?? '—'}%</span>
            <span className="text-[9px] text-slate-500">FCF / Market Capitalization</span>
          </div>
        </div>

        {/* Fundamental Drivers */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Deterministic Corporate Catalysts & SEC Filing Analysis</span>
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
