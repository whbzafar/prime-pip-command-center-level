import React from 'react';
import {
  Building2,
  Target,
  ShieldAlert,
  TrendingDown,
  Sliders,
  Sparkles,
  Check,
  Lock,
  Layers,
} from 'lucide-react';
import {
  FundedAccountConfig,
  FundedDrawdownType,
  FundedPhase,
  FundedRiskMode,
  TrailingBasis,
} from '../types';
import {
  PROP_FIRM_PRESETS,
  PropFirmPreset,
  getDrawdownTypeLabel,
} from '../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../utils/currencyFormatter';

interface FundedAccountConfigPanelProps {
  config: FundedAccountConfig;
  currency: string;
  onChange: (updated: FundedAccountConfig) => void;
  onSyncStartingBalance?: (balance: number) => void;
  onSyncBroker?: (firmName: string) => void;
  compact?: boolean;
}

const ACCOUNT_SIZE_PRESETS = [5000, 10000, 25000, 50000, 100000, 200000];

const PHASE_OPTIONS: { id: FundedPhase; label: string; badge: string }[] = [
  { id: 'PHASE_1', label: 'Phase 1', badge: 'Eval Stage 1' },
  { id: 'PHASE_2', label: 'Phase 2', badge: 'Eval Stage 2' },
  { id: 'PHASE_3', label: 'Phase 3', badge: 'Eval Stage 3' },
  { id: 'FUNDED_LIVE', label: 'Funded / Master', badge: 'Live Payouts' },
  { id: 'INSTANT_FUNDED', label: 'Instant Funded', badge: 'Direct Funded' },
];

const DRAWDOWN_TYPES: { id: FundedDrawdownType; label: string; desc: string }[] = [
  { id: 'STATIC', label: 'Static', desc: 'Fixed floor from initial starting balance' },
  { id: 'TRAILING', label: 'Trailing', desc: 'Floor trails up with high-water mark' },
  { id: 'EQUITY_BASED', label: 'Equity Based', desc: 'Includes open floating P&L against floor' },
  { id: 'BALANCE_BASED', label: 'Balance Based', desc: 'Calculated strictly from closed balance' },
  { id: 'END_OF_DAY', label: 'End-of-Day', desc: 'Trails only on EOD closed balance' },
  { id: 'INTRADAY', label: 'Intraday', desc: 'Trails live intraday peak equity' },
  { id: 'CUSTOM', label: 'Custom', desc: 'Custom hybrid prop firm parameters' },
];

export const FundedAccountConfigPanel: React.FC<FundedAccountConfigPanelProps> = ({
  config,
  currency,
  onChange,
  onSyncStartingBalance,
  onSyncBroker,
  compact = false,
}) => {
  const startBal = Math.max(1, safeNumber(config.startingBalance, 5000));

  const handleApplyPreset = (preset: PropFirmPreset) => {
    const p1Dollars = Number(((startBal * preset.phase1TargetPct) / 100).toFixed(2));
    const p2Dollars = Number(((startBal * preset.phase2TargetPct) / 100).toFixed(2));
    const dailyDollars = Number(((startBal * preset.dailyDrawdownPct) / 100).toFixed(2));
    const overallDollars = Number(((startBal * preset.overallDrawdownPct) / 100).toFixed(2));

    const next: FundedAccountConfig = {
      ...config,
      enabled: true,
      firmName: preset.firmName,
      profitTargets: {
        ...config.profitTargets,
        phase1TargetDollars: p1Dollars,
        phase1TargetPercent: preset.phase1TargetPct,
        phase2TargetDollars: p2Dollars,
        phase2TargetPercent: preset.phase2TargetPct,
      },
      dailyDrawdownDollars: dailyDollars,
      dailyDrawdownPercent: preset.dailyDrawdownPct,
      overallDrawdownDollars: overallDollars,
      overallDrawdownPercent: preset.overallDrawdownPct,
      drawdownType: preset.drawdownType,
      trailingConfig: {
        ...config.trailingConfig,
        trailingBasis: preset.trailingBasis,
        unrealizedProfitAffectsTrailing: preset.unrealizedProfitAffectsTrailing,
        lockAtStartingBalance: preset.lockAtStartingBalance,
      },
    };
    onChange(next);
    onSyncBroker?.(preset.firmName);
  };

  const handleAccountSizeChange = (newSize: number) => {
    const safeSize = Math.max(100, safeNumber(newSize, 5000));
    const p1Pct = config.profitTargets.phase1TargetPercent || 10;
    const p2Pct = config.profitTargets.phase2TargetPercent || 5;
    const dPct = config.dailyDrawdownPercent || 4;
    const oPct = config.overallDrawdownPercent || 10;

    const next: FundedAccountConfig = {
      ...config,
      accountSize: safeSize,
      startingBalance: safeSize,
      profitTargets: {
        ...config.profitTargets,
        phase1TargetDollars: Number(((safeSize * p1Pct) / 100).toFixed(2)),
        phase2TargetDollars: Number(((safeSize * p2Pct) / 100).toFixed(2)),
      },
      dailyDrawdownDollars: Number(((safeSize * dPct) / 100).toFixed(2)),
      overallDrawdownDollars: Number(((safeSize * oPct) / 100).toFixed(2)),
    };
    onChange(next);
    onSyncStartingBalance?.(safeSize);
  };

  const showTrailingControls =
    config.drawdownType === 'TRAILING' ||
    config.drawdownType === 'END_OF_DAY' ||
    config.drawdownType === 'INTRADAY' ||
    config.drawdownType === 'CUSTOM';

  const initialLiquidationFloor = Math.max(0, startBal - (config.overallDrawdownDollars || 0));

  return (
    <div className="space-y-4 rounded-2xl bg-slate-900/75 border border-cyan-500/30 p-4 sm:p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              FUNDED ACCOUNT CONFIGURATION & PROP RULES
            </h4>
            <p className="text-[11px] font-mono-code text-slate-400">
              Configure your prop firm parameters to power the Funded Account Risk Engine
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono-code font-bold uppercase">
          FUNDED RISK ENGINE ACTIVE
        </span>
      </div>

      {/* Quick Prop Firm Presets */}
      <div>
        <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1.5 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Prop Firm Rule Presets (Optional 1-Click Auto-Fill)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROP_FIRM_PRESETS.map((preset) => {
            const isSelected = config.firmName === preset.firmName && config.drawdownType === preset.drawdownType;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400 text-slate-100'
                    : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-military font-bold text-cyan-300 flex items-center justify-between">
                  <span className="truncate">{preset.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                </div>
                <div className="text-[10px] font-mono-code text-slate-400 mt-0.5 line-clamp-1">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 4: Basic Information */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="text-[11px] font-military font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>1. Basic Funded Account Information</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-mono-code text-slate-300 mb-1 uppercase">
              Prop Firm Name
            </label>
            <input
              type="text"
              value={config.firmName}
              onChange={(e) => {
                onChange({ ...config, firmName: e.target.value });
                onSyncBroker?.(e.target.value);
              }}
              placeholder="e.g. My Prop Firm, FTMO"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono-code text-slate-300 mb-1 uppercase">
              Account Size ({currency})
            </label>
            <input
              type="number"
              min="100"
              step="any"
              value={config.accountSize}
              onChange={(e) => handleAccountSizeChange(parseFloat(e.target.value) || 5000)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono-code text-slate-300 mb-1 uppercase">
              Starting Balance ({currency})
            </label>
            <input
              type="number"
              min="100"
              step="any"
              value={config.startingBalance}
              onChange={(e) => {
                const val = Math.max(100, parseFloat(e.target.value) || 5000);
                onChange({ ...config, startingBalance: val });
                onSyncStartingBalance?.(val);
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-bold text-xs font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>
        </div>

        {/* Quick Account Size Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono-code text-slate-400 mr-1">Account Sizes:</span>
          {ACCOUNT_SIZE_PRESETS.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => handleAccountSizeChange(sz)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold border transition cursor-pointer ${
                config.accountSize === sz
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {formatCurrency(sz, currency)}
            </button>
          ))}
        </div>

        {/* Phase Selection */}
        <div>
          <label className="block text-[11px] font-mono-code text-slate-300 mb-1.5 uppercase">
            Current Evaluation / Funded Phase
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PHASE_OPTIONS.map((ph) => {
              const active = config.phase === ph.id;
              return (
                <button
                  key={ph.id}
                  type="button"
                  onClick={() => onChange({ ...config, phase: ph.id })}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    active
                      ? 'bg-blue-500/20 border-cyan-400 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-military font-bold text-cyan-300">{ph.label}</div>
                  <div className="text-[10px] font-mono-code text-slate-400">{ph.badge}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 5: Profit Target Configuration */}
      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        <div className="text-[11px] font-military font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          <span>2. Profit Target Configuration (Phase 1 & Phase 2)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phase 1 Target */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-slate-200">
                PHASE 1 PROFIT TARGET
              </span>
              <span className="text-[11px] font-mono-code text-emerald-400 font-bold">
                {config.profitTargets.phase1TargetPercent}% of {formatCurrency(startBal, currency)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Target Amount ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={config.profitTargets.phase1TargetDollars}
                  onChange={(e) => {
                    const dollars = Math.max(0, parseFloat(e.target.value) || 0);
                    const pct = startBal > 0 ? Number(((dollars / startBal) * 100).toFixed(2)) : 0;
                    onChange({
                      ...config,
                      profitTargets: {
                        ...config.profitTargets,
                        phase1TargetDollars: dollars,
                        phase1TargetPercent: pct,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-xs font-mono-code"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Target (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.profitTargets.phase1TargetPercent}
                  onChange={(e) => {
                    const pct = Math.max(0, parseFloat(e.target.value) || 0);
                    const dollars = Number(((startBal * pct) / 100).toFixed(2));
                    onChange({
                      ...config,
                      profitTargets: {
                        ...config.profitTargets,
                        phase1TargetPercent: pct,
                        phase1TargetDollars: dollars,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs font-mono-code"
                />
              </div>
            </div>
          </div>

          {/* Phase 2 Target */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-slate-200">
                PHASE 2 PROFIT TARGET
              </span>
              <span className="text-[11px] font-mono-code text-cyan-400 font-bold">
                {config.profitTargets.phase2TargetPercent}% of {formatCurrency(startBal, currency)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Target Amount ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={config.profitTargets.phase2TargetDollars}
                  onChange={(e) => {
                    const dollars = Math.max(0, parseFloat(e.target.value) || 0);
                    const pct = startBal > 0 ? Number(((dollars / startBal) * 100).toFixed(2)) : 0;
                    onChange({
                      ...config,
                      profitTargets: {
                        ...config.profitTargets,
                        phase2TargetDollars: dollars,
                        phase2TargetPercent: pct,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold text-xs font-mono-code"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Target (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.profitTargets.phase2TargetPercent}
                  onChange={(e) => {
                    const pct = Math.max(0, parseFloat(e.target.value) || 0);
                    const dollars = Number(((startBal * pct) / 100).toFixed(2));
                    onChange({
                      ...config,
                      profitTargets: {
                        ...config.profitTargets,
                        phase2TargetPercent: pct,
                        phase2TargetDollars: dollars,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs font-mono-code"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Drawdown Configuration */}
      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        <div className="text-[11px] font-military font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>3. Daily & Overall Maximum Drawdown Configuration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Daily Drawdown */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-slate-200">
                DAILY DRAWDOWN LIMIT
              </span>
              <span className="text-[11px] font-mono-code text-rose-400 font-bold">
                {formatCurrency(config.dailyDrawdownDollars, currency)} ({config.dailyDrawdownPercent}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Daily Max Loss ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={config.dailyDrawdownDollars}
                  onChange={(e) => {
                    const dollars = Math.max(1, parseFloat(e.target.value) || 0);
                    const pct = startBal > 0 ? Number(((dollars / startBal) * 100).toFixed(2)) : 4;
                    onChange({
                      ...config,
                      dailyDrawdownDollars: dollars,
                      dailyDrawdownPercent: pct,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-rose-400 font-bold text-xs font-mono-code"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Daily Drawdown (%)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={config.dailyDrawdownPercent}
                  onChange={(e) => {
                    const pct = Math.max(0.5, parseFloat(e.target.value) || 4);
                    const dollars = Number(((startBal * pct) / 100).toFixed(2));
                    onChange({
                      ...config,
                      dailyDrawdownPercent: pct,
                      dailyDrawdownDollars: dollars,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs font-mono-code"
                />
              </div>
            </div>
          </div>

          {/* Overall Maximum Drawdown */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-slate-200">
                OVERALL MAX DRAWDOWN
              </span>
              <span className="text-[11px] font-mono-code text-rose-400 font-bold">
                {formatCurrency(config.overallDrawdownDollars, currency)} ({config.overallDrawdownPercent}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Overall Max Loss ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={config.overallDrawdownDollars}
                  onChange={(e) => {
                    const dollars = Math.max(1, parseFloat(e.target.value) || 0);
                    const pct = startBal > 0 ? Number(((dollars / startBal) * 100).toFixed(2)) : 10;
                    onChange({
                      ...config,
                      overallDrawdownDollars: dollars,
                      overallDrawdownPercent: pct,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-rose-400 font-bold text-xs font-mono-code"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono-code text-slate-400 mb-0.5">
                  Overall Drawdown (%)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={config.overallDrawdownPercent}
                  onChange={(e) => {
                    const pct = Math.max(1, parseFloat(e.target.value) || 10);
                    const dollars = Number(((startBal * pct) / 100).toFixed(2));
                    onChange({
                      ...config,
                      overallDrawdownPercent: pct,
                      overallDrawdownDollars: dollars,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs font-mono-code"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Drawdown Type Selector */}
        <div>
          <label className="block text-[11px] font-mono-code text-slate-300 mb-1.5 uppercase">
            Drawdown Calculation Methodology ({getDrawdownTypeLabel(config.drawdownType)})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DRAWDOWN_TYPES.map((dt) => {
              const isSelected = config.drawdownType === dt.id;
              return (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => onChange({ ...config, drawdownType: dt.id })}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/15 border-rose-400 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-military font-bold text-slate-200 flex items-center justify-between">
                    <span>{dt.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-rose-400" />}
                  </div>
                  <div className="text-[10px] font-mono-code text-slate-400 mt-0.5 line-clamp-1">
                    {dt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 7: Trailing Drawdown Support */}
      {showTrailingControls && (
        <div className="space-y-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-military font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Trailing Drawdown Engine Configuration</span>
            </div>
            <span className="text-[11px] font-mono-code text-amber-200 font-bold">
              Initial Liquidation Threshold: {formatCurrency(initialLiquidationFloor, currency)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-mono-code text-slate-300 mb-1 uppercase">
                Trailing Basis
              </label>
              <select
                value={config.trailingConfig.trailingBasis}
                onChange={(e) =>
                  onChange({
                    ...config,
                    trailingConfig: {
                      ...config.trailingConfig,
                      trailingBasis: e.target.value as TrailingBasis,
                    },
                  })
                }
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code"
              >
                <option value="BALANCE">Trailing Based on Closed Balance</option>
                <option value="EQUITY">Trailing Based on High-Water Equity</option>
                <option value="END_OF_DAY_BALANCE">Trailing Based on End-of-Day Balance</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-code text-slate-300 mb-1 uppercase">
                Trailing Activation Profit ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={config.trailingConfig.activationLevelProfitDollars}
                onChange={(e) =>
                  onChange({
                    ...config,
                    trailingConfig: {
                      ...config.trailingConfig,
                      activationLevelProfitDollars: Math.max(0, parseFloat(e.target.value) || 0),
                    },
                  })
                }
                placeholder="0 (Immediate)"
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono-code text-slate-300 mb-1 uppercase">
                Custom High-Water Mark ({currency}, Optional)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={config.trailingConfig.manualHighWaterMark || ''}
                onChange={(e) =>
                  onChange({
                    ...config,
                    trailingConfig: {
                      ...config.trailingConfig,
                      manualHighWaterMark: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                placeholder={`Auto (${formatCurrency(startBal, currency)})`}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 text-xs font-mono-code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 cursor-pointer">
              <div>
                <span className="text-xs font-mono-code font-bold text-slate-200 block">
                  Unrealized Floating Profit Trails Floor
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  Open trade peak equity raises liquidation threshold
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.trailingConfig.unrealizedProfitAffectsTrailing}
                onChange={(e) =>
                  onChange({
                    ...config,
                    trailingConfig: {
                      ...config.trailingConfig,
                      unrealizedProfitAffectsTrailing: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-amber-400"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 cursor-pointer">
              <div>
                <span className="text-xs font-mono-code font-bold text-slate-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Lock Floor at Starting Balance ({formatCurrency(startBal, currency)})</span>
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  Stops trailing once threshold reaches initial balance
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.trailingConfig.lockAtStartingBalance}
                onChange={(e) =>
                  onChange({
                    ...config,
                    trailingConfig: {
                      ...config.trailingConfig,
                      lockAtStartingBalance: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-emerald-400"
              />
            </label>
          </div>
        </div>
      )}

      {/* Section 10: Next Trade Risk Engine Preferences */}
      {!compact && (
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] font-military font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>4. Funded Risk Engine Mode & Per-Trade Risk Limits</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-mono-code text-slate-300 mb-1 uppercase">
                Preferred Risk Per Trade (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={config.preferredRiskPercent}
                onChange={(e) =>
                  onChange({
                    ...config,
                    preferredRiskPercent: Math.max(0.1, parseFloat(e.target.value) || 1.0),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs font-mono-code"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono-code text-slate-300 mb-1 uppercase">
                Max Allowed Risk Per Trade (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={config.maxRiskPerTradePercent}
                onChange={(e) =>
                  onChange({
                    ...config,
                    maxRiskPerTradePercent: Math.max(0.1, parseFloat(e.target.value) || 1.0),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-bold text-xs font-mono-code"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono-code text-slate-300 mb-1 uppercase">
                Funded Risk Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as FundedRiskMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ ...config, riskMode: mode })}
                    className={`py-2 px-1 rounded-lg text-[10px] font-mono-code font-bold border transition cursor-pointer ${
                      config.riskMode === mode
                        ? mode === 'CONSERVATIVE'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : mode === 'BALANCED'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
