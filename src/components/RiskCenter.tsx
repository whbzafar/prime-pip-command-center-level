import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Percent,
  DollarSign,
  AlertOctagon,
  X,
  Crosshair,
  Info,
  Calculator,
  ArrowRight,
  TrendingDown,
  Gauge,
  Check,
  RotateCcw,
} from 'lucide-react';
import { AccountSettings, TradingRule, Trade } from '../types';
import { DashboardMetrics } from '../utils/tradeAnalytics';
import { formatCurrency } from '../utils/currencyFormatter';
import { calculateNextTradeReadiness } from '../utils/readinessEngine';
import { getKarachiDate } from '../utils/time';

interface RiskCenterProps {
  account: AccountSettings;
  onUpdateAccount: (updated: AccountSettings) => void;
  rules: TradingRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule?: (
    title: string,
    category: 'RISK' | 'EXECUTION' | 'PSYCHOLOGY',
    isHardRule: boolean,
    description?: string,
    severity?: 'MAJOR' | 'MINOR'
  ) => void;
  onSaveRule?: (rule: TradingRule) => void;
  onDeleteRule: (ruleId: string) => void;
  metrics: DashboardMetrics;
  trades: Trade[];
  defaultInstrument?: string;
  onInstrumentChange?: (instrument: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const RiskCenter: React.FC<RiskCenterProps> = ({
  account,
  onUpdateAccount,
  rules,
  onToggleRule,
  onAddRule,
  onDeleteRule,
  metrics,
  trades,
  defaultInstrument = 'XAUUSD',
  onNavigateToTab,
}) => {
  // Active Account Balances
  const activeBalance = account.currentBalance > 0 ? account.currentBalance : account.initialBalance;
  const readiness = calculateNextTradeReadiness(trades, account);

  // Core Standard Risk Benchmarks
  const riskPerTradePercent = account.maxRiskPerTradePercent || 1.0;
  const riskPerTradeDollars = (activeBalance * riskPerTradePercent) / 100;
  const dailyLossLimitPercent = account.maxDailyLossPercent || 2.0;
  const dailyLossLimitDollars = (activeBalance * dailyLossLimitPercent) / 100;

  // Real-time Daily Loss Tracking
  const todayDate = getKarachiDate();
  const todayTrades = (trades || []).filter((t) => t.date === todayDate);
  const todayPnL = todayTrades.reduce(
    (acc, t) => acc + (typeof t.profitLoss === 'number' ? t.profitLoss : 0),
    0
  );
  const dailyRiskUsedDollars = Math.max(0, -todayPnL);
  const remainingDailyRiskDollars = Math.max(0, dailyLossLimitDollars - dailyRiskUsedDollars);

  // Safe Execution Status
  const isDailyTradeLimitHit = account.maxDailyTrades > 0 && metrics.tradesToday >= account.maxDailyTrades;
  const isDailyLossLimitHit = dailyRiskUsedDollars >= dailyLossLimitDollars;
  const isDrawdownNearing = metrics.maxDrawdownPercent >= account.maxDrawdownPercent * 0.75;
  const isDrawdownBreached = metrics.maxDrawdownPercent >= account.maxDrawdownPercent;

  const circuitBreakerActive = isDailyTradeLimitHit || isDailyLossLimitHit || isDrawdownBreached;

  // Interactive Position Sizing Calculator State
  const [calcPair, setCalcPair] = useState<string>(defaultInstrument);
  const [calcStopLossPips, setCalcStopLossPips] = useState<number>(30);
  const [calcRiskMode, setCalcRiskMode] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [calcRiskValue, setCalcRiskValue] = useState<number>(1.0);
  const [copiedLot, setCopiedLot] = useState<boolean>(false);

  // Quick Lot Size Calculation
  const calculatedRiskDollars =
    calcRiskMode === 'PERCENT'
      ? (activeBalance * calcRiskValue) / 100
      : calcRiskValue;

  const pipValuePerStandardLot = calcPair.includes('XAU')
    ? 10.0 // $10 per pip on 1.00 lot for Gold
    : calcPair.includes('JPY')
    ? 9.0
    : 10.0;

  const calculatedLotSize = Math.max(
    0.01,
    Math.round(
      (calculatedRiskDollars / (Math.max(1, calcStopLossPips) * pipValuePerStandardLot)) * 100
    ) / 100
  );

  // New Rule Simple Modal State
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim()) return;
    if (onAddRule) {
      onAddRule(newRuleTitle.trim(), 'RISK', true, newRuleDesc.trim(), 'MAJOR');
    }
    setNewRuleTitle('');
    setNewRuleDesc('');
    setIsAddRuleOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER: ESSENTIAL RISK COMMAND                                  */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-military font-bold text-base sm:text-lg text-white tracking-wider uppercase">
                RISK MANAGEMENT COMMAND
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono-code font-bold text-cyan-300">
                ESSENTIAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Capital Preservation • 1% Trade Cap • 2% Daily Stop • Instant Position Sizer
            </p>
          </div>
        </div>

        {/* Circuit Breaker Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono-code font-bold shadow-md ${
              circuitBreakerActive
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                circuitBreakerActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span>
              {circuitBreakerActive
                ? 'CIRCUIT BREAKER: TRADING HALTED'
                : 'RISK STATUS: SAFE TO EXECUTE'}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Circuit Breaker Banner if Breached */}
      {circuitBreakerActive && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-3 shadow-xl">
          <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-military font-bold text-sm tracking-wide text-rose-300 uppercase">
              DEFENSE SYSTEM ACTIVE: PRESERVE CAPITAL
            </h4>
            <p className="leading-relaxed">
              {isDailyLossLimitHit
                ? `You have reached your 2.0% daily loss limit (${formatCurrency(
                    dailyLossLimitDollars,
                    account.currency
                  )}). Stop trading immediately for this 24-hour cycle to avoid revenge trading.`
                : isDailyTradeLimitHit
                ? `Daily trade limit reached (${metrics.tradesToday}/${account.maxDailyTrades} trades). Step away from the charts to protect your edge.`
                : `Maximum drawdown threshold reached. Mandatory review required before executing new trades.`}
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. THE 4 ESSENTIAL PILLARS OF RISK (EASY-TO-UNDERSTAND DASHBOARD)      */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Account Balance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono-code font-bold uppercase text-slate-400">
              Account Master Balance
            </span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
              {formatCurrency(activeBalance, account.currency)}
            </div>
            <div className="text-[11px] font-mono-code text-slate-400 mt-1">
              Base Equity Driving All Sizing
            </div>
          </div>
        </div>

        {/* Card 2: Max Risk Per Trade */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono-code font-bold uppercase text-slate-400">
              Max Risk Per Trade (1%)
            </span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 tracking-tight">
              {formatCurrency(riskPerTradeDollars, account.currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 mt-1">
              <span>Standard: {riskPerTradePercent}%</span>
              <span className="text-emerald-400">Single Trade Cap</span>
            </div>
          </div>
        </div>

        {/* Card 3: Daily Loss Limit (2%) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono-code font-bold uppercase text-slate-400">
              Daily Loss Limit (2%)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300 tracking-tight">
              {formatCurrency(dailyLossLimitDollars, account.currency)}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono-code mt-1">
              <span className="text-slate-400">Remaining Today:</span>
              <span
                className={`font-bold ${
                  remainingDailyRiskDollars > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(remainingDailyRiskDollars, account.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Drawdown Guard */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono-code font-bold uppercase text-slate-400">
              Max Drawdown Guard
            </span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300">
                {metrics.maxDrawdownPercent.toFixed(1)}%
              </span>
              <span className="text-xs font-mono-code text-slate-500">
                / {account.maxDrawdownPercent || 5.0}% Max
              </span>
            </div>
            {/* Drawdown progress bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isDrawdownBreached
                    ? 'bg-rose-500'
                    : isDrawdownNearing
                    ? 'bg-amber-400'
                    : 'bg-cyan-400'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (metrics.maxDrawdownPercent / (account.maxDrawdownPercent || 5.0)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. ESSENTIAL TOOL: INSTANT POSITION & LOT SIZE CALCULATOR             */}
      {/* ===================================================================== */}
      <div className="p-5 sm:p-7 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-military font-bold text-white uppercase tracking-wider">
                INSTANT POSITION SIZING CALCULATOR
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                Calculate exact lot size in seconds — never risk more than your plan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code text-slate-400">Risk Mode:</span>
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono-code">
              <button
                type="button"
                onClick={() => {
                  setCalcRiskMode('PERCENT');
                  setCalcRiskValue(1.0);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  calcRiskMode === 'PERCENT'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                % Percent (1%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcRiskMode('DOLLARS');
                  setCalcRiskValue(riskPerTradeDollars);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  calcRiskMode === 'DOLLARS'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                $ Cash Amount
              </button>
            </div>
          </div>
        </div>

        {/* Calculator Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Input 1: Instrument */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-code text-slate-400 uppercase font-bold">
              Instrument / Asset
            </label>
            <select
              value={calcPair}
              onChange={(e) => setCalcPair(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono-code text-sm font-bold outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="XAUUSD">Gold (XAUUSD)</option>
              <option value="EURUSD">EURUSD</option>
              <option value="GBPUSD">GBPUSD</option>
              <option value="USDJPY">USDJPY</option>
              <option value="US30">US30 (Dow Jones)</option>
              <option value="NAS100">NAS100 (Nasdaq)</option>
              <option value="BTCUSDT">BTCUSDT</option>
            </select>
          </div>

          {/* Input 2: Stop Loss Pips */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-code text-slate-400 uppercase font-bold flex items-center justify-between">
              <span>Stop Loss Distance</span>
              <span className="text-cyan-400">{calcStopLossPips} Pips</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1000"
                value={calcStopLossPips}
                onChange={(e) => setCalcStopLossPips(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono-code text-sm font-bold outline-none focus:border-cyan-400"
              />
              <span className="text-xs font-mono-code text-slate-500 font-bold">PIPS</span>
            </div>
          </div>

          {/* Input 3: Risk Parameter */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-code text-slate-400 uppercase font-bold flex items-center justify-between">
              <span>{calcRiskMode === 'PERCENT' ? 'Risk Percentage' : 'Dollar Risk'}</span>
              <span className="text-emerald-400">
                {formatCurrency(calculatedRiskDollars, account.currency)}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={calcRiskMode === 'PERCENT' ? '0.1' : '10'}
                min="0.1"
                max={calcRiskMode === 'PERCENT' ? '5.0' : activeBalance}
                value={calcRiskValue}
                onChange={(e) => setCalcRiskValue(parseFloat(e.target.value) || 1.0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono-code text-sm font-bold outline-none focus:border-emerald-400"
              />
              <span className="text-xs font-mono-code text-slate-500 font-bold">
                {calcRiskMode === 'PERCENT' ? '%' : account.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Calculated Result Output Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-cyan-400">
              RECOMMENDED POSITION SIZE (EXACT EXECUTION)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                {calculatedLotSize.toFixed(2)}{' '}
                <span className="text-base font-normal text-slate-400">Lots</span>
              </span>
              <span className="text-xs font-mono-code text-emerald-400">
                Risk: {formatCurrency(calculatedRiskDollars, account.currency)} (
                {((calculatedRiskDollars / activeBalance) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(calculatedLotSize.toFixed(2));
                setCopiedLot(true);
                setTimeout(() => setCopiedLot(false), 2000);
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-code text-xs font-bold transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLot ? <Check className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
              <span>{copiedLot ? 'Copied Lot Size!' : 'Copy Lot Size'}</span>
            </button>

            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('PRO_TRADING')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Go to Chart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. ESSENTIAL RULES OF CAPITAL PRESERVATION (DECLUTTERED & SIMPLE)      */}
      {/* ===================================================================== */}
      <div className="p-5 sm:p-7 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-military font-bold text-white uppercase tracking-wider">
                CORE RULES OF CAPITAL PRESERVATION
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                Toggle your active rules on or off — simple, clear, non-negotiable guidelines
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddRuleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white text-xs font-mono-code font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Custom Rule</span>
          </button>
        </div>

        {/* Clean, Non-Cluttered Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.slice(0, 6).map((rule) => {
            const isActive = rule.isActive ?? rule.active ?? true;
            return (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                  isActive
                    ? 'bg-slate-900/80 border-slate-700/80 shadow-md'
                    : 'bg-slate-950/40 border-slate-900 opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleRule(rule.id)}
                    className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition cursor-pointer shrink-0"
                    title={isActive ? 'Click to deactivate rule' : 'Click to activate rule'}
                  >
                    {isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <h5
                      className={`text-xs sm:text-sm font-semibold ${
                        isActive ? 'text-white' : 'text-slate-400 line-through'
                      }`}
                    >
                      {rule.title}
                    </h5>
                    {rule.description && (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {rule.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  className="p-1 rounded text-slate-600 hover:text-rose-400 transition cursor-pointer shrink-0"
                  title="Remove Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simple Add Rule Modal */}
      {isAddRuleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setIsAddRuleOpen(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-military font-bold text-sm text-white uppercase tracking-wider">
                Add Risk Rule
              </h4>
              <button
                type="button"
                onClick={() => setIsAddRuleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs font-mono-code">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">Rule Title</label>
                <input
                  type="text"
                  placeholder="e.g., No trades during High-Impact NFP news"
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">Description (Optional)</label>
                <textarea
                  placeholder="e.g., Close open positions 15 minutes prior to release"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-400 resize-none h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export interface TradeLimitAlertSystemProps {
  account: any;
  metrics: any;
  trades: Trade[];
  onNavigateToTab?: (tab: string) => void;
}

export const TradeLimitAlertSystem: React.FC<TradeLimitAlertSystemProps> = ({
  account,
  metrics,
  trades: _trades,
  onNavigateToTab,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const dailyLossLimit = account?.dailyLossLimit || 0;
  const currentDrawdown = metrics?.currentDrawdown || 0;
  const maxDrawdownLimit = account?.maxDrawdownLimit || 10;
  const isLossBreached =
    dailyLossLimit > 0 && Math.abs(metrics?.dailyPnl || 0) >= dailyLossLimit && (metrics?.dailyPnl || 0) < 0;
  const isDrawdownBreached = currentDrawdown >= maxDrawdownLimit;

  if (dismissed || (!isLossBreached && !isDrawdownBreached)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="p-4 rounded-2xl bg-rose-950/95 border-2 border-rose-500 shadow-2xl backdrop-blur-md text-white font-sans space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300 font-mono-code uppercase">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <span>Risk Threshold Breached</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-rose-100 font-mono-code leading-relaxed">
          {isLossBreached
            ? `Daily loss limit of ${account?.currency || '$'}${dailyLossLimit.toFixed(2)} reached. Capital preservation active.`
            : `Max account drawdown reached (${currentDrawdown.toFixed(1)}%). Circuit breaker guard active.`}
        </p>
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('risk')}
            className="w-full mt-2 py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono-code text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>Review Risk Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
