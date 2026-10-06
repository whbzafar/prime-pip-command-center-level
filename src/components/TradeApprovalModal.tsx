import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Shield,
  Calculator,
  HelpCircle,
  Copy,
  Check,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  AccountSettings,
  Trade,
  TradeEvaluationInput,
  TradeEvaluationResult,
} from '../types';
import {
  evaluateTrade,
  getEffectiveFundedConfig,
  isFundedAccount,
  calculateDailyDrawdown,
  calculateOverallDrawdown,
  calculateTrailingDrawdown,
  getInstrumentSpec,
  KNOWN_INSTRUMENTS,
} from '../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../utils/currencyFormatter';

interface TradeApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountSettings;
  trades: Trade[];
  onApplyTradeToJournal?: (prefill: Partial<Trade>) => void;
}

export const TradeApprovalModal: React.FC<TradeApprovalModalProps> = ({
  isOpen,
  onClose,
  account,
  trades,
  onApplyTradeToJournal,
}) => {
  const [symbol, setSymbol] = useState<string>('XAUUSD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('2650.00');
  const [stopLossPrice, setStopLossPrice] = useState<string>('2645.00');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('2662.50');
  const [useCustomRisk, setUseCustomRisk] = useState<boolean>(false);
  const [customRiskDollars, setCustomRiskDollars] = useState<string>('');
  const [commission, setCommission] = useState<string>('0');
  const [spreadPips, setSpreadPips] = useState<string>('0');
  const [swap, setSwap] = useState<string>('0');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const currency = account.currency || 'USD';
  const config = useMemo(() => getEffectiveFundedConfig(account), [account]);
  const isFunded = isFundedAccount(account);

  // Live Drawdown Baselines
  const trailingRes = useMemo(
    () => calculateTrailingDrawdown(account, trades, config),
    [account, trades, config]
  );
  const dailyRes = useMemo(
    () => calculateDailyDrawdown(account, trades, config),
    [account, trades, config]
  );
  const overallRes = useMemo(
    () =>
      calculateOverallDrawdown(
        account,
        trades,
        config,
        trailingRes.activeLiquidationThreshold
      ),
    [account, trades, config, trailingRes.activeLiquidationThreshold]
  );

  // Parse numeric values
  const numEntry = parseFloat(entryPrice) || 0;
  const numSL = parseFloat(stopLossPrice) || 0;
  const numTP = parseFloat(takeProfitPrice) || 0;
  const numCustomRisk = useCustomRisk ? parseFloat(customRiskDollars) || undefined : undefined;
  const numCommission = parseFloat(commission) || 0;
  const numSpread = parseFloat(spreadPips) || 0;
  const numSwap = parseFloat(swap) || 0;

  // Run Deterministic Evaluation
  const evaluation: TradeEvaluationResult = useMemo(() => {
    const input: TradeEvaluationInput = {
      symbol,
      direction,
      entryPrice: numEntry,
      stopLossPrice: numSL,
      takeProfitPrice: numTP,
      proposedRiskDollars: numCustomRisk,
      commission: numCommission,
      spreadPips: numSpread,
      swap: numSwap,
    };
    return evaluateTrade(input, account, trades, config);
  }, [
    symbol,
    direction,
    numEntry,
    numSL,
    numTP,
    numCustomRisk,
    numCommission,
    numSpread,
    numSwap,
    account,
    trades,
    config,
  ]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const text = `PRIMEPIPFX TRADE VERDICT: ${evaluation.status}
Symbol: ${evaluation.symbol} (${evaluation.direction})
Entry: ${evaluation.entryPrice} | SL: ${evaluation.stopLossPrice} | TP: ${evaluation.takeProfitPrice}
Recommended Lot: ${evaluation.recommendedLotSize}
Proposed Risk: $${evaluation.riskAmountDollars} (${evaluation.riskPercent}%)
R:R: 1:${evaluation.riskRewardRatio}
Daily DD Remaining After SL: $${evaluation.remainingDailyDdAfterStopLoss}
Verdict: ${evaluation.verdictBadge}
Explanation: ${evaluation.explanation}`;
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApply = () => {
    onApplyTradeToJournal?.({
      instrument: symbol,
      direction,
      entryPrice: numEntry,
      stopLoss: numSL,
      takeProfit: numTP,
      lotSize: evaluation.recommendedLotSize,
      riskAmount: evaluation.riskAmountDollars,
      riskPercent: evaluation.riskPercent,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#080D1A] border border-cyan-500/40 p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wider">
                  CAN I TAKE THIS TRADE? — APPROVAL ENGINE
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {isFunded ? `${config.firmName} RULES ENFORCED` : 'PERSONAL ACCOUNT'}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Deterministic rule evaluation • Lot sizing • Post-Stop-Loss drawdown simulations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Account Drawdown State Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono-code">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Account Balance</span>
            <span className="font-bold text-slate-200 mt-0.5 block">
              {formatCurrency(account.currentBalance, currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Daily DD Limit</span>
            <span className="font-bold text-cyan-400 mt-0.5 block">
              {formatCurrency(dailyRes.dailyDrawdownLimitDollars, currency)} (Rem: {formatCurrency(dailyRes.remainingDailyDrawdown, currency)})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Overall DD Limit</span>
            <span className="font-bold text-amber-400 mt-0.5 block">
              {formatCurrency(overallRes.overallDrawdownLimitDollars, currency)} (Rem: {formatCurrency(overallRes.remainingOverallDrawdown, currency)})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Safety Buffer</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">
              {config.safetyBufferPercent ?? 20}% Applied
            </span>
          </div>
        </div>

        {/* Main 2-Column Grid: Inputs on Left, Evaluation & Decision on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 5 Cols: Proposed Trade Inputs */}
          <div className="lg:col-span-5 space-y-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 font-mono-code text-xs">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span>1. Enter Proposed Trade Details</span>
            </h4>

            {/* Symbol & Direction */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-bold"
                >
                  {Object.keys(KNOWN_INSTRUMENTS).map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setDirection('BUY')}
                    className={`py-1.5 rounded-lg text-xs font-military font-bold tracking-wider transition cursor-pointer ${
                      direction === 'BUY'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SELL')}
                    className={`py-1.5 rounded-lg text-xs font-military font-bold tracking-wider transition cursor-pointer ${
                      direction === 'SELL'
                        ? 'bg-rose-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>
            </div>

            {/* Entry, SL, TP */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="2650.00"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  placeholder="2645.00"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-rose-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(e.target.value)}
                  placeholder="2662.50"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-bold"
                />
              </div>
            </div>

            {/* Optional Custom Dollar Risk Override */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-300 uppercase font-semibold">
                  Custom Risk Dollar Amount (Optional)
                </span>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomRisk}
                    onChange={(e) => setUseCustomRisk(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>Manual Override</span>
                </label>
              </div>
              {useCustomRisk ? (
                <input
                  type="number"
                  step="any"
                  value={customRiskDollars}
                  onChange={(e) => setCustomRiskDollars(e.target.value)}
                  placeholder="e.g. 25.00"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-bold"
                />
              ) : (
                <div className="p-2 rounded bg-slate-900/50 text-[10px] text-slate-400 border border-slate-800">
                  Auto-calculated using Prime FX recommended safe risk.
                </div>
              )}
            </div>

            {/* Advanced: Commission, Spread, Swap */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
              <div>
                <label className="block text-[9px] text-slate-400 uppercase">Comm ($)</label>
                <input
                  type="number"
                  step="any"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 uppercase">Spread (Pips)</label>
                <input
                  type="number"
                  step="any"
                  value={spreadPips}
                  onChange={(e) => setSpreadPips(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 uppercase">Swap ($)</label>
                <input
                  type="number"
                  step="any"
                  value={swap}
                  onChange={(e) => setSwap(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Live Evaluation, Drawdown Impacts & Decision Verdict */}
          <div className="lg:col-span-7 space-y-4">
            {/* Decision Status Card (GREEN / YELLOW / RED) */}
            <div
              className={`p-4 rounded-xl border shadow-xl ${
                evaluation.status === 'APPROVED'
                  ? 'bg-emerald-950/30 border-emerald-500/50'
                  : evaluation.status === 'REDUCE_RISK'
                  ? 'bg-amber-950/30 border-amber-500/50'
                  : 'bg-rose-950/35 border-rose-500/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {evaluation.status === 'APPROVED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : evaluation.status === 'REDUCE_RISK' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm sm:text-base font-military font-black tracking-wider uppercase ${
                          evaluation.status === 'APPROVED'
                            ? 'text-emerald-300'
                            : evaluation.status === 'REDUCE_RISK'
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {evaluation.verdictBadge}
                      </span>
                    </div>
                    <p className="text-xs font-mono-code text-slate-200 mt-1.5 leading-relaxed">
                      {evaluation.explanation}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-lg text-xs font-military font-bold uppercase tracking-wider shrink-0 ${
                    evaluation.status === 'APPROVED'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : evaluation.status === 'REDUCE_RISK'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-rose-500 text-slate-950 font-black'
                  }`}
                >
                  {evaluation.status}
                </span>
              </div>
            </div>

            {/* Mathematical Calculations Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-code text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30">
                <span className="text-[10px] text-cyan-300 uppercase block font-semibold">
                  Recommended Lot
                </span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  {evaluation.recommendedLotSize > 0 ? `${evaluation.recommendedLotSize} Lots` : '0.00'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Stop: {evaluation.stopDistancePips} Pips
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Proposed Risk
                </span>
                <span className="text-lg font-bold text-slate-100 mt-0.5 block">
                  {formatCurrency(evaluation.riskAmountDollars, currency)}
                </span>
                <span className="text-[10px] text-cyan-400 block mt-0.5">
                  {evaluation.riskPercent}% of Balance
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Potential Profit
                </span>
                <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                  {formatCurrency(evaluation.potentialProfitDollars, currency)}
                </span>
                <span className="text-[10px] text-emerald-300 block mt-0.5">
                  R:R = 1:{evaluation.riskRewardRatio}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Max Allowed Firm Risk
                </span>
                <span className="text-lg font-bold text-amber-300 mt-0.5 block">
                  {formatCurrency(
                    (account.initialBalance * (config.maxRiskPerTradePercent || 1)) / 100,
                    currency
                  )}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Hard Limit
                </span>
              </div>
            </div>

            {/* Drawdown Simulation Impact Table (Section 17 Exact Requirement) */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono-code text-xs space-y-2.5">
              <div className="text-[11px] font-military font-bold text-slate-300 uppercase tracking-wider">
                POST-STOP-LOSS DRAWDOWN IMPACT SIMULATION
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">Current Daily DD</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">
                    {formatCurrency(dailyRes.currentDailyDrawdown, currency)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">DD After Stop Loss</span>
                  <span className="font-bold text-amber-300 mt-0.5 block">
                    {formatCurrency(evaluation.dailyDdAfterStopLoss, currency)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">Daily DD Remaining</span>
                  <span
                    className={`font-black mt-0.5 block ${
                      evaluation.remainingDailyDdAfterStopLoss >= 0 ? 'text-cyan-300' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(evaluation.remainingDailyDdAfterStopLoss, currency)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">Overall DD Remaining</span>
                  <span
                    className={`font-black mt-0.5 block ${
                      evaluation.remainingOverallDdAfterStopLoss >= 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(evaluation.remainingOverallDdAfterStopLoss, currency)}
                  </span>
                </div>
              </div>

              {evaluation.remainingDailyDdAfterStopLoss < 0 && (
                <div className="p-2 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px]">
                  ⚠️ BREACH HAZARD: If stopped out, this trade would exceed your remaining daily drawdown limit by{' '}
                  {formatCurrency(Math.abs(evaluation.remainingDailyDdAfterStopLoss), currency)}.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'COPIED TO CLIPBOARD' : 'COPY VERDICT'}</span>
              </button>

              {onApplyTradeToJournal && (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!evaluation.isAllowed}
                  className={`px-4 py-2 rounded-xl text-xs font-military font-bold tracking-wider uppercase flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                    evaluation.isAllowed
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>TRANSFER SIZING TO NEW TRADE ENTRY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
