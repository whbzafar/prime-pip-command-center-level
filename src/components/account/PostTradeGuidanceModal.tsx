import React, { useState } from 'react';
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
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  Sparkles,
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
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);

  if (!isOpen || !summary) return null;

  const currency = account.currency || 'USD';
  const isLoss = summary.tradeResult === 'LOSS';
  const isWin = summary.tradeResult === 'WIN';
  const audit = summary.eightPointAudit;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-auto">
        {/* Header Banner */}
        <div
          className={`px-5 py-4 border-b flex items-start justify-between ${
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
                  Trade Analysis & Guidance
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-mono">
                  {account.accountName}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight mt-0.5">
                Post-Trade Risk &amp; Compliance Review
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* STRUCTURED TRADE REVIEW CARD (Prompt Requirement) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Evaluation Trade Review
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  summary.isBreached
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : summary.isApproachingLimit
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {summary.tradeStatusLabel || 'Within Configured Limits'}
              </span>
            </div>

            {/* Trade status */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Trade Status
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {summary.tradeStatusLabel || 'Within configured risk limits'}
              </div>
            </div>

            {/* What went well */}
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>What Went Well</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                {summary.whatWentWell || 'The recorded trade stayed within the configured risk allowance and included a stop-loss.'}
              </p>
            </div>

            {/* Account impact */}
            <div>
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Account Impact</span>
              </div>
              <p className="text-xs text-slate-200 font-mono mt-0.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                {summary.accountImpactText ||
                  `P/L: ${summary.netProfitLoss >= 0 ? '+' : ''}${formatCurrency(summary.netProfitLoss, currency)} | Equity: ${formatCurrency(summary.updatedEquity, currency)} | Daily Loss Room: ${formatCurrency(summary.updatedDailyDdCapacity, currency)} | Overall Drawdown Room: ${formatCurrency(summary.updatedOverallDdCapacity, currency)}`}
              </p>
            </div>

            {/* What needs attention */}
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>What Needs Attention</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                {summary.whatNeedsAttention || 'All risk parameters currently in optimal health.'}
              </p>
            </div>

            {/* Recommended next step */}
            <div className="pt-1 border-t border-slate-900">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1">
                <Compass className="w-3 h-3 text-purple-400" />
                <span>Recommended Next Step</span>
              </div>
              <p className="text-xs text-purple-200 font-medium leading-relaxed mt-0.5">
                {summary.recommendedNextStepText || summary.recommendedNextAction}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Net Result</span>
              <span className={`text-sm font-bold font-mono mt-0.5 block ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                {summary.netProfitLoss >= 0 ? '+' : ''}{formatCurrency(summary.netProfitLoss, currency)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Balance</span>
              <span className="text-sm font-bold font-mono text-slate-100 mt-0.5 block">
                {formatCurrency(summary.updatedBalance, currency)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Daily DD Room</span>
              <span className={`text-sm font-bold font-mono mt-0.5 block ${summary.updatedDailyDdCapacity <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(summary.updatedDailyDdCapacity, currency)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Target Left</span>
              <span className="text-sm font-bold font-mono text-purple-300 mt-0.5 block">
                {formatCurrency(summary.remainingProfitTarget, currency)}
              </span>
            </div>
          </div>

          {/* Collapsible 8-Point Detailed Compliance Questions */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <button
              type="button"
              onClick={() => setShowDetailedAudit((prev) => !prev)}
              className="w-full px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>8-Point Prop Compliance Breakdown</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{showDetailedAudit ? 'Hide' : 'Show Details'}</span>
                {showDetailedAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showDetailedAudit && (
              <div className="p-4 space-y-3 divide-y divide-slate-900 text-xs font-sans">
                {/* 1 */}
                <div className="pt-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-300 block">1. Within Configured Risk Limits?</span>
                    <span className="text-slate-400 text-[11px]">
                      {audit?.isWithinRiskLimits ? 'Yes, planned risk remained below maximum trade threshold.' : 'No, planned risk exceeded configured trade risk limit.'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${audit?.isWithinRiskLimits ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {audit?.isWithinRiskLimits ? 'YES' : 'NO'}
                  </span>
                </div>

                {/* 2 */}
                <div className="pt-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-300 block">2. Complied with Account Rules?</span>
                    <span className="text-slate-400 text-[11px]">
                      {audit?.isCompliantWithRules ? 'All configured prop rules respected.' : audit?.complianceIssues?.join(' ') || 'Violations detected.'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${audit?.isCompliantWithRules ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {audit?.isCompliantWithRules ? 'PASS' : 'FLAG'}
                  </span>
                </div>

                {/* 3 */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-300 block">3. Effect on Balance, Equity &amp; Drawdown</span>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] font-mono text-slate-400">
                    <div>Balance: {formatCurrency(summary.previousBalance, currency)} → <strong className="text-white">{formatCurrency(summary.updatedBalance, currency)}</strong></div>
                    <div>Equity: {formatCurrency(summary.previousEquity, currency)} → <strong className="text-white">{formatCurrency(summary.updatedEquity, currency)}</strong></div>
                  </div>
                </div>

                {/* 4 */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-300 block">4. Remaining Daily &amp; Overall Loss Room</span>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] font-mono text-slate-400">
                    <div>Daily Room: <strong className="text-emerald-400">{formatCurrency(summary.updatedDailyDdCapacity, currency)}</strong></div>
                    <div>Overall Room: <strong className="text-cyan-400">{formatCurrency(summary.updatedOverallDdCapacity, currency)}</strong></div>
                  </div>
                </div>

                {/* 5 */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-300 block">5. Eligible Profit Remaining to Target</span>
                  <span className="text-purple-300 font-mono text-[11px] block mt-0.5">
                    {formatCurrency(summary.remainingProfitTarget, currency)} remaining ({summary.targetProgressPercent}% achieved)
                  </span>
                </div>

                {/* 6 */}
                <div className="pt-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-300 block">6. Minimum Trading Days Satisfied?</span>
                    <span className="text-slate-400 text-[11px]">
                      {audit?.tradingDaysCompleted || 0} of {audit?.tradingDaysRequired || 0} qualifying days logged.
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${audit?.areTradingDaysSatisfied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {audit?.areTradingDaysSatisfied ? 'MET' : `${(audit?.tradingDaysRequired || 0) - (audit?.tradingDaysCompleted || 0)} LEFT`}
                  </span>
                </div>

                {/* 7 */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-300 block">7. Rule, Data, or Compliance Issues</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    {audit?.complianceIssues && audit.complianceIssues.length > 0 ? audit.complianceIssues.join(', ') : 'None. All verified inputs aligned with configured prop boundaries.'}
                  </span>
                </div>

                {/* 8 */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-300 block">8. What Should the Trader Do Next?</span>
                  <p className="text-purple-200 text-xs mt-0.5 leading-relaxed font-medium">
                    {summary.recommendedNextStepText || summary.recommendedNextAction}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Dismiss
          </button>
          <div className="flex items-center gap-2">
            {onOpenJournal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenJournal();
                }}
                className="py-1.5 px-3 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                View in Journal
              </button>
            )}
            {onOpenRiskCommand && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRiskCommand();
                }}
                className="py-1.5 px-3 rounded-lg border border-cyan-800/60 bg-cyan-950/30 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition cursor-pointer"
              >
                Pass Tracker
              </button>
            )}
            <button
              onClick={onClose}
              className="py-1.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              Continue
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
