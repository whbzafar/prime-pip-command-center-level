import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Shield,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  AccountSettings,
  Trade,
  TradeEvaluationInput,
  RiskDecisionState,
} from '../../types';
import {
  evaluateTradeRiskDeterministic,
  KNOWN_INSTRUMENTS,
  getInstrumentSpec,
} from '../../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../../utils/currencyFormatter';

interface PreTradePositionCalculatorProps {
  account: AccountSettings;
  trades?: Trade[];
  onApplyToJournal?: (prefill: Partial<Trade>) => void;
  defaultInstrument?: string;
}

export const PreTradePositionCalculator: React.FC<PreTradePositionCalculatorProps> = ({
  account,
  trades = [],
  onApplyToJournal,
  defaultInstrument = 'XAUUSD',
}) => {
  const currency = account.currency || 'USD';
  const [symbol, setSymbol] = useState<string>(defaultInstrument);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('2650.00');
  const [stopLossPrice, setStopLossPrice] = useState<string>('2645.00');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('2662.50');
  const [useCustomRisk, setUseCustomRisk] = useState<boolean>(false);
  const [customRiskDollars, setCustomRiskDollars] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const numEntry = parseFloat(entryPrice) || 0;
  const numSL = parseFloat(stopLossPrice) || 0;
  const numTP = parseFloat(takeProfitPrice) || 0;
  const numCustomRisk = useCustomRisk ? parseFloat(customRiskDollars) || undefined : undefined;

  const evaluation = useMemo(() => {
    const input: TradeEvaluationInput = {
      symbol,
      direction,
      entryPrice: numEntry,
      stopLossPrice: numSL,
      takeProfitPrice: numTP,
      proposedRiskDollars: numCustomRisk,
    };
    return evaluateTradeRiskDeterministic(input, account, trades);
  }, [symbol, direction, numEntry, numSL, numTP, numCustomRisk, account, trades]);

  const handleCopySummary = () => {
    const text = `PRIME PIP FX PRE-TRADE ASSESSMENT\nInstrument: ${symbol} (${direction})\nEntry: ${entryPrice} | SL: ${stopLossPrice} | TP: ${takeProfitPrice}\nCalculated Lots: ${evaluation.lotSize} lots\nRisk: ${formatCurrency(evaluation.proposedRisk, currency)}\nDecision: ${evaluation.decisionState}\nReason: ${evaluation.exactReason}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDecisionBadge = (state: RiskDecisionState) => {
    switch (state) {
      case 'TAKE':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          label: 'TAKE TRADE — FULLY COMPLIANT',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      case 'REDUCE':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          label: 'REDUCE RISK — DOWNSIZE POSITION',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case 'STOP':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          label: 'STOP TRADING — BREACH RISK / RESTRICTED',
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
        };
      case 'REVIEW':
      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          label: 'REVIEW INPUTS — INCOMPLETE DATA',
          icon: <Info className="w-4 h-4 text-slate-400" />,
        };
    }
  };

  const badge = getDecisionBadge(evaluation.decisionState);

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Pre-Trade Position & Risk Calculator
            </h3>
            <span className="text-[11px] text-slate-400">
              Account: {account.accountName} ({account.currency}) · Deterministic Sizing
            </span>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${badge.bg}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Instrument</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          >
            {Object.keys(KNOWN_INSTRUMENTS).map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Direction</label>
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setDirection('BUY')}
              className={`py-1.5 text-xs font-bold rounded transition ${
                direction === 'BUY'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setDirection('SELL')}
              className={`py-1.5 text-xs font-bold rounded transition ${
                direction === 'SELL'
                  ? 'bg-rose-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Entry Price</label>
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Stop-Loss Price</label>
          <input
            type="number"
            step="any"
            value={stopLossPrice}
            onChange={(e) => setStopLossPrice(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          />
        </div>
      </div>

      {/* Advanced Target & Custom Risk Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
        <div>
          <label className="block text-slate-400 mb-1">Take-Profit Price (Optional R:R)</label>
          <input
            type="number"
            step="any"
            value={takeProfitPrice}
            onChange={(e) => setTakeProfitPrice(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400">Custom Risk Allocation ({currency})</label>
            <button
              onClick={() => setUseCustomRisk(!useCustomRisk)}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              {useCustomRisk ? 'Use Recommended Risk' : 'Override Risk Dollars'}
            </button>
          </div>
          {useCustomRisk ? (
            <input
              type="number"
              value={customRiskDollars}
              onChange={(e) => setCustomRiskDollars(e.target.value)}
              placeholder={`Default: $${evaluation.recommendedRiskBudget}`}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
            />
          ) : (
            <div className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 font-mono flex items-center justify-between">
              <span>Engine Recommended:</span>
              <span className="font-bold text-cyan-400">{formatCurrency(evaluation.recommendedRiskBudget, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Calculated Position Results Strip */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-500 block font-sans">Calculated Position</span>
          <span className="text-xl font-bold text-slate-100 mt-0.5 block">
            {evaluation.lotSize > 0 ? `${evaluation.lotSize} Lots` : '—'}
          </span>
          <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">
            Pip Value: ${evaluation.pipValuePerLot}/pip
          </span>
        </div>

        <div>
          <span className="text-slate-500 block font-sans">Monetary Risk</span>
          <span className="text-xl font-bold text-amber-400 mt-0.5 block">
            {formatCurrency(evaluation.proposedRisk, currency)}
          </span>
          <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">
            Distance: {evaluation.stopDistancePips} pips
          </span>
        </div>

        <div>
          <span className="text-slate-500 block font-sans">Potential Profit (TP)</span>
          <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
            {evaluation.potentialProfitDollars > 0
              ? formatCurrency(evaluation.potentialProfitDollars, currency)
              : '—'}
          </span>
          <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">
            Risk:Reward: {evaluation.riskRewardRatio > 0 ? `1:${evaluation.riskRewardRatio}` : '—'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block font-sans">Remaining Daily Buffer</span>
          <span
            className={`text-xl font-bold mt-0.5 block ${
              evaluation.dailyLossCapacityRemaining <= 0 ? 'text-rose-400' : 'text-cyan-400'
            }`}
          >
            {formatCurrency(evaluation.dailyLossCapacityRemaining, currency)}
          </span>
          <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">
            After proposed trade SL
          </span>
        </div>
      </div>

      {/* Rationale & Action Note */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
        <span className="font-semibold text-slate-300 block">Assessment Rationale:</span>
        <p className="text-slate-400 leading-relaxed">
          {evaluation.exactReason}
        </p>
        <div className="pt-1 text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Next Action: {evaluation.nextAction}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleCopySummary}
          className="py-2 px-3 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Assessment' : 'Copy Assessment'}</span>
        </button>

        {onApplyToJournal && evaluation.isAllowed && (
          <button
            onClick={() =>
              onApplyToJournal({
                instrument: symbol,
                direction,
                entryPrice: numEntry,
                stopLoss: numSL,
                takeProfit: numTP,
                lotSize: evaluation.lotSize,
                riskAmount: evaluation.proposedRisk,
              })
            }
            className="py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <span>Apply to Trade Journal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
