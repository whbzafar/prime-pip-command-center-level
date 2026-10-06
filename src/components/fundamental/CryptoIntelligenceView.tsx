import React, { useState } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { getAssetsByClass, MarketAssetDefinition } from '../../data/marketUniverseData';

interface CryptoMacroMetrics {
  symbol: string;
  name: string;
  spotEtfFlowsWeekly?: string;
  globalM2Correlation?: number;
  stakingYieldPct?: number;
  stablecoinLiquidityStatus: 'EXPANDING' | 'STABLE' | 'CONTRACTING' | 'DATA_UNAVAILABLE';
  macroBias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH';
  primaryDrivers: { label: string; impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; note: string }[];
  authoritativeSources: string[];
}

const CRYPTO_BASELINE_DATA: Record<string, CryptoMacroMetrics> = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    name: 'Bitcoin / USDT',
    spotEtfFlowsWeekly: '+$1.42B Net Inflow',
    globalM2Correlation: 0.74,
    stablecoinLiquidityStatus: 'EXPANDING',
    macroBias: 'BULLISH',
    primaryDrivers: [
      { label: 'Global Central Bank M2 Expansion', impact: 'BULLISH', note: 'Global money supply aggregates rising, providing macro liquidity tailwinds.' },
      { label: 'U.S. Spot ETF Institutional Absorption', impact: 'BULLISH', note: 'Weekly institutional buying exceeds new block subsidy issuance rate.' },
      { label: 'DXY Dollar Strength Resistance', impact: 'NEUTRAL', note: 'Consolidation in USD index near key resistance dampens speculative velocity.' },
    ],
    authoritativeSources: ['On-Chain Blockchain Node', 'CFTC Regulatory Disclosures', 'Spot ETF Custodian Filings'],
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    name: 'Ethereum / USDT',
    spotEtfFlowsWeekly: '+$210M Net Inflow',
    stakingYieldPct: 3.25,
    stablecoinLiquidityStatus: 'EXPANDING',
    macroBias: 'BULLISH',
    primaryDrivers: [
      { label: 'Consensus Layer Staking Yield', impact: 'BULLISH', note: 'Base staking yield of ~3.25% provides structural cash-flow floor.' },
      { label: 'Layer-2 Settlement Activity', impact: 'BULLISH', note: 'Base, Arbitrum & Optimism driving consistent L1 blob gas consumption.' },
      { label: 'BTC/ETH Dominance Ratio Pressure', impact: 'NEUTRAL', note: 'Capital concentration in Bitcoin dominant during early liquidity cycles.' },
    ],
    authoritativeSources: ['Ethereum Consensus Layer', 'On-Chain Smart Contract State'],
  },
  BNBUSDT: {
    symbol: 'BNBUSDT',
    name: 'BNB / USDT',
    stablecoinLiquidityStatus: 'STABLE',
    macroBias: 'NEUTRAL',
    primaryDrivers: [
      { label: 'BNB Chain Transaction Velocity', impact: 'BULLISH', note: 'DEX swap volume maintaining consistent on-chain gas usage.' },
      { label: 'Auto-Burn Supply Deflation', impact: 'BULLISH', note: 'Quarterly programmatic supply burns permanently reducing circulating tokens.' },
      { label: 'Regulatory Scrutiny Risk', impact: 'NEUTRAL', note: 'Exchange ecosystem legal oversight stable in key international jurisdictions.' },
    ],
    authoritativeSources: ['BNB Chain Node Network'],
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    name: 'Solana / USDT',
    stakingYieldPct: 6.80,
    stablecoinLiquidityStatus: 'EXPANDING',
    macroBias: 'BULLISH',
    primaryDrivers: [
      { label: 'DEX Volume & Retail Flow Leadership', impact: 'BULLISH', note: 'Monolithic throughput driving peak decentralized exchange market share.' },
      { label: 'High Nominal Staking Return', impact: 'BULLISH', note: 'Nominal staking yield of ~6.8% attracting institutional delegators.' },
      { label: 'Network Outage Risk Monitoring', impact: 'NEUTRAL', note: 'Firedancer validator client rollout improving client diversity.' },
    ],
    authoritativeSources: ['Solana Cluster RPC State'],
  },
  XRPUSDT: {
    symbol: 'XRPUSDT',
    name: 'XRP / USDT',
    stablecoinLiquidityStatus: 'STABLE',
    macroBias: 'NEUTRAL',
    primaryDrivers: [
      { label: 'Cross-Border Institutional Remittance', impact: 'BULLISH', note: 'Banking partner pilots expanding in Asia-Pacific cross-currency corridors.' },
      { label: 'Regulatory Clarity Status', impact: 'BULLISH', note: 'Secondary market programmatic sales cleared from securities classification.' },
      { label: 'Escrow Release Absorption', impact: 'NEUTRAL', note: 'Monthly 1B token programmatic escrow unlocks managed predictably.' },
    ],
    authoritativeSources: ['XRP Ledger Consensus Protocol'],
  },
};

export const CryptoIntelligenceView: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const cryptoAssets = getAssetsByClass('CRYPTO');
  const activeMetrics = CRYPTO_BASELINE_DATA[selectedSymbol] || CRYPTO_BASELINE_DATA.BTCUSDT;

  return (
    <div className="space-y-6 font-mono-code text-xs">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              MODULE 07
            </span>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wider">
              CRYPTO MACRO & LIQUIDITY INTELLIGENCE
            </h2>
          </div>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Global M2 money supply correlation, Spot ETF institutional flows, stablecoin supply velocity, and on-chain fundamental drivers.
          </p>
        </div>

        {/* Crypto Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex-wrap">
          {cryptoAssets.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                selectedSymbol === asset.symbol
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {asset.shortName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Crypto Asset Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cryptoAssets.map((asset) => {
          const metrics = CRYPTO_BASELINE_DATA[asset.symbol];
          const isSelected = selectedSymbol === asset.symbol;
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-military font-bold text-slate-100 text-xs">
                  {asset.symbol}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border ${
                    metrics?.macroBias === 'BULLISH' || metrics?.macroBias === 'STRONGLY_BULLISH'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {metrics?.macroBias.replace('_', ' ') || 'NEUTRAL'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mb-2">{asset.displayName}</p>
              <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-800">
                Liquidity: <strong className="text-slate-300">{metrics?.stablecoinLiquidityStatus || 'DATA UNAVAILABLE'}</strong>
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
              {activeMetrics.name} ({activeMetrics.symbol}) — MACRO LIQUIDITY DEEP DIVE
            </h3>
            <span className="text-slate-500 text-[11px]">
              Authoritative nodes: {activeMetrics.authoritativeSources.join(' • ')}
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-slate-900 border border-slate-700 text-emerald-400">
            Macro Bias: {activeMetrics.macroBias.replace('_', ' ')}
          </span>
        </div>

        {/* 4 Macro Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Weekly Spot ETF Flow</span>
            <span className="text-sm sm:text-base font-bold text-emerald-300 mt-0.5 block">
              {activeMetrics.spotEtfFlowsWeekly ?? 'DATA UNAVAILABLE'}
            </span>
            <span className="text-[9px] text-slate-500">SEC Registered Custodians</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Global M2 Correlation</span>
            <span className="text-sm sm:text-base font-bold text-cyan-300 mt-0.5 block">
              {activeMetrics.globalM2Correlation ? `+${activeMetrics.globalM2Correlation}` : 'DATA UNAVAILABLE'}
            </span>
            <span className="text-[9px] text-slate-500">Liquidity Expansion Beta</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Staking Yield</span>
            <span className="text-sm sm:text-base font-bold text-amber-300 mt-0.5 block">
              {activeMetrics.stakingYieldPct ? `${activeMetrics.stakingYieldPct}%` : 'N/A (PoW)'}
            </span>
            <span className="text-[9px] text-slate-500">Native On-Chain Return</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Stablecoin Velocity</span>
            <span className="text-sm sm:text-base font-bold text-purple-300 mt-0.5 block">
              {activeMetrics.stablecoinLiquidityStatus}
            </span>
            <span className="text-[9px] text-slate-500">USDT / USDC Net Minting</span>
          </div>
        </div>

        {/* Fundamental Drivers */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Macro Catalysts & On-Chain State Drivers</span>
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
