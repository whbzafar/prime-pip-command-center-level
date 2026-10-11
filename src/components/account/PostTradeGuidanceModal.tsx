import React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  X,
  Target,
  DollarSign,
  Activity,
  Compass,
} from 'lucide-react';
import { PostTradeImpactSummary, AccountSettings } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';

interface PostTradeGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PostTradeImpactSummary | null;
  account: AccountSettings;
  onOpenJournal?: () => void;
  onOpenRiskCommand?: () => void;
}

export const PostTradeGuidanceModal: React.FC<PostTradeGuidanceModalProps> = ({
  isOpen,
  onClose,
  summary,
  account,
  onOpenJournal,
  onOpenRiskCommand,
}) => {
  if (!isOpen || !summary) return null;

  const currency = account.currency || 'USD';
  const isLoss = summary.tradeResult === 'LOSS';
  const isWin = summary.tradeResult === 'WIN';

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 transition-all">
        {/* Header Banner */}
        <div
          className={`px-6 py-5 border-b flex items-start justify-between ${
            summary.isBreached
              ? 'bg-rose-950/40 border-rose-500/40'
              : summary.isApproachingLimit
              ? 'bg-amber-950/40 border-amber-500/40'
              : isWin
              ? 'bg-emerald-950/40 border-emerald-500/40'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                summary.isBreached
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : summary.isApproachingLimit
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : isWin
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              }`}
            >
              {summary.isBreached ? (
                <AlertOctagon className="w-5 h-5" />
              ) : summary.isApproachingLimit ? (
                <AlertTriangle className="w-5 h-5" />
              ) : isWin ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Trade Recorded Successfully
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {summary.isManuallyReported ? 'Manually Reported' : 'Synchronized'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight mt-0.5">
                Account Risk Assessment Updated
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Net Result Strip */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[11px]">Trade Result</span>
              <span
                className={`text-base font-bold font-mono block mt-0.5 ${
                  isWin
                    ? 'text-emerald-400'
                    : isLoss
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {summary.netProfitLoss >= 0 ? '+' : ''}
                {formatCurrency(summary.netProfitLoss, currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Updated Balance</span>
              <span className="text-base font-bold text-slate-100 font-mono block mt-0.5">
                {formatCurrency(summary.updatedBalance, currency)}
              </span>
            </div>
          </div>

          {/* Drawdown & Capacity Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Daily Drawdown Capacity</span>
              <span
                className={`text-sm font-bold font-mono mt-1 block ${
                  summary.updatedDailyDdCapacity <= 0
                    ? 'text-rose-400'
                    : summary.isApproachingLimit
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {formatCurrency(summary.updatedDailyDdCapacity, currency)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {summary.updatedDailyDdCapacity < summary.previousDailyDdCapacity
                  ? `Reduced by ${formatCurrency(summary.previousDailyDdCapacity - summary.updatedDailyDdCapacity, currency)}`
                  : 'Unchanged'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Overall Drawdown Capacity</span>
              <span
                className={`text-sm font-bold font-mono mt-1 block ${
                  summary.updatedOverallDdCapacity <= 0
                    ? 'text-rose-400'
                    : 'text-slate-200'
                }`}
              >
                {formatCurrency(summary.updatedOverallDdCapacity, currency)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Liquidation cushion remaining
              </span>
            </div>
          </div>

          {/* Profit Target Progress (Funded) */}
          {summary.remainingProfitTarget > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Profit Target Progress</span>
                <span className="font-semibold text-purple-300 font-mono">
                  {summary.targetProgressPercent}% ({formatCurrency(summary.remainingProfitTarget, currency)} remaining)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, summary.targetProgressPercent))}%` }}
                />
              </div>
            </div>
          )}

          {/* Engine Explanation & Next Action */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-xs">
                Risk Engine Guidance
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  summary.decisionState === 'TAKE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : summary.decisionState === 'REDUCE'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                DECISION: {summary.decisionState}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {summary.explanation}
            </p>

            <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Recommended Next Risk Budget:</span>
              <span className="font-bold text-cyan-400 font-mono">
                {formatCurrency(summary.updatedPersonalRiskBudget, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            Dismiss
          </button>
          <div className="flex items-center gap-2">
            {onOpenRiskCommand && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRiskCommand();
                }}
                className="py-2 px-3 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Risk Command
              </button>
            )}
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1 shadow-md shadow-cyan-500/20"
            >
              Continue Trading
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
