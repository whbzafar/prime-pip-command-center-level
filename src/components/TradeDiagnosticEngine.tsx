import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  Brain,
  TrendingUp,
  RotateCcw,
  Zap,
  Info,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { Trade, TradeDiagnosticRecord } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { playDisciplineAlert } from '../utils/audioAlerts';
import { getKarachiDate, getKarachiTime12 } from '../utils/time';

interface TradeDiagnosticEngineProps {
  trade: Trade;
  onUpdateTrade?: (updatedTrade: Trade) => void;
  onClose?: () => void;
  currency?: string;
}

export const TradeDiagnosticEngine: React.FC<TradeDiagnosticEngineProps> = ({
  trade,
  onUpdateTrade,
  onClose,
  currency = 'USD',
}) => {
  const isWin = (trade.profitLoss || 0) > 0;
  const isLoss = (trade.profitLoss || 0) < 0;
  const isBE = (trade.profitLoss || 0) === 0;

  // Questions tailored for Win vs Loss
  const initialAnswers = useMemo(() => {
    if (trade.tradeDiagnostic?.questions && trade.tradeDiagnostic.questions.length > 0) {
      const map: Record<number, boolean> = {};
      trade.tradeDiagnostic.questions.forEach((q, idx) => {
        map[idx] = q.answer;
      });
      return map;
    }

    // Default answers based on existing trade metadata
    if (isWin) {
      return {
        0: trade.ruleViolation === 'NONE', // Setup followed
        1: !trade.postPsychology?.closedEarly, // Held to TP
        2: !trade.postPsychology?.movedStopLoss, // SL respected
        3: trade.preEmotion !== 'GREEDY' && trade.preEmotion !== 'FOMO', // Calm state
      };
    } else {
      return {
        0: trade.ruleViolation === 'NONE', // Setup followed
        1: (trade.riskPercent || 1) <= 1.05 && (trade.riskAmount || 0) > 0, // Risk <= 1%
        2: !trade.postPsychology?.movedStopLoss, // SL left alone
        3: !trade.postPsychology?.revengeTraded, // No revenge
      };
    }
  }, [trade, isWin]);

  const [answers, setAnswers] = useState<Record<number, boolean>>(initialAnswers);
  const [traderNote, setTraderNote] = useState<string>(
    trade.tradeDiagnostic?.actionableTakeaway || ''
  );
  const [isSaved, setIsSaved] = useState(false);

  const questionsList = useMemo(() => {
    if (isWin) {
      return [
        {
          id: 0,
          prompt: 'Did the setup meet 100% of your pre-defined Playbook entry criteria (HTF bias, liquidity sweep, FVG)?',
          affirmativeMeaning: 'Yes — Setup was fully valid according to the trading playbook.',
          negativeMeaning: 'No — Chased price or entered prematurely without verified confirmation.',
        },
        {
          id: 1,
          prompt: 'Did you hold the trade to your predetermined Take Profit target, without cutting early out of anxiety?',
          affirmativeMeaning: 'Yes — Trusted the statistical edge and let target hit.',
          negativeMeaning: 'No — Closed prematurely due to fear of giving back unrealized profits.',
        },
        {
          id: 2,
          prompt: 'Was your Stop Loss placed at a logical structural level and NEVER moved or widened during the trade?',
          affirmativeMeaning: 'Yes — Risk was rigidly bounded at all times.',
          negativeMeaning: 'No — Tampered with or moved stop loss while the trade was active.',
        },
        {
          id: 3,
          prompt: 'Did you maintain emotional neutrality without celebratory overconfidence or an immediate urge to re-enter?',
          affirmativeMeaning: 'Yes — Stayed grounded and recognized that one win is just a data point.',
          negativeMeaning: 'No — Felt euphoria or impulse to immediately open another position.',
        },
      ];
    } else {
      return [
        {
          id: 0,
          prompt: 'Did the trade strictly follow your Playbook entry model with a confirmed structural invalidation level?',
          affirmativeMeaning: 'Yes — A+ setup parameters were verified prior to order placement.',
          negativeMeaning: 'No — Forced entry, FOMO impulse, or traded out of boredom.',
        },
        {
          id: 1,
          prompt: 'Did you accept 100% of the risk BEFORE clicking execute, keeping total risk strictly <= 1.0%?',
          affirmativeMeaning: 'Yes — Risk was mathematically sized and accepted as a potential loss.',
          negativeMeaning: 'No — Overleveraged or took an oversized position risking capital safety.',
        },
        {
          id: 2,
          prompt: 'Did you let your Stop Loss execute without canceling, dragging, or widening it?',
          affirmativeMeaning: 'Yes — Respected the invalidation level and accepted the loss cleanly.',
          negativeMeaning: 'No — Widened stop loss or delayed exit hoping market would turn around.',
        },
        {
          id: 3,
          prompt: 'Did you completely avoid retaliatory revenge trading and take a mandatory 15-minute breather?',
          affirmativeMeaning: 'Yes — Processed the loss neutrally with zero emotional retaliation.',
          negativeMeaning: 'No — Felt anger/frustration and felt compelled to "make the money back".',
        },
      ];
    }
  }, [isWin]);

  // Evaluate the diagnostic verdict based on answers
  const diagnosticResult = useMemo((): TradeDiagnosticRecord => {
    const q0 = answers[0] ?? true;
    const q1 = answers[1] ?? true;
    const q2 = answers[2] ?? true;
    const q3 = answers[3] ?? true;

    const affirmativeCount = [q0, q1, q2, q3].filter(Boolean).length;
    const adherenceScore = Math.round((affirmativeCount / 4) * 100);

    const questionsFormatted = questionsList.map((q) => ({
      question: q.prompt,
      answer: !!answers[q.id],
      explanation: answers[q.id] ? q.affirmativeMeaning : q.negativeMeaning,
    }));

    if (isWin) {
      if (q0 && q1 && q2 && q3) {
        return {
          classification: 'A_PLUS_EDGE_WIN',
          headline: 'A+ INSTITUTIONAL EDGE WIN',
          verdict:
            'Textbook execution. The profit was a natural byproduct of strict rule adherence and mechanical execution. This reinforces long-term positive expectancy.',
          adherenceScore,
          questions: questionsFormatted,
          actionableTakeaway:
            traderNote ||
            'Maintain this exact standard of patience. Do not allow winning to breed overconfidence or loosen entry criteria on the next trade.',
          reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
        };
      } else if (!q1 && q0 && q2) {
        return {
          classification: 'SUBOPTIMAL_EARLY_EXIT_WIN',
          headline: 'SUBOPTIMAL EARLY EXIT WIN',
          verdict:
            'You captured profit, but cut the trade prematurely due to anxiety or impatience. You left planned R-multiples on the table, which harms your long-term mathematical edge.',
          adherenceScore,
          questions: questionsFormatted,
          actionableTakeaway:
            traderNote ||
            'Practice letting winning trades reach predefined targets. Place the order, set TP/SL, and step away from lower-timeframe candle watching.',
          reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
        };
      } else {
        return {
          classification: 'LUCKY_BAD_WIN',
          headline: 'DANGEROUS LUCKY WIN (EXECUTION BREACH)',
          verdict:
            'WARNING: You violated core rules (setup validity, risk limits, or stop tampering) yet made money due to market randomness. Lucky wins are the most dangerous trades in speculation because they condition the brain to repeat fatal mistakes.',
          adherenceScore,
          questions: questionsFormatted,
          actionableTakeaway:
            traderNote ||
            'Treat this trade as a loss in your mental audit. Return to strict playbook criteria immediately before market variance wipes out accumulated gains.',
          reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
        };
      }
    } else if (isLoss) {
      if (q0 && q1 && q2 && q3) {
        return {
          classification: 'GOOD_BUSINESS_LOSS',
          headline: 'TEXTBOOK GOOD BUSINESS LOSS',
          verdict:
            'EXEMPLARY EXECUTION: You followed all rules, respected your 1% risk limit, and took the loss cleanly. In trading, a disciplined loss on an A+ setup is a complete success. Edge expresses itself across large sample sizes.',
          adherenceScore,
          questions: questionsFormatted,
          actionableTakeaway:
            traderNote ||
            'Zero self-criticism needed. The trade was mathematically valid. Log the trade, close charts if daily limit is reached, and remain completely objective.',
          reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
        };
      } else if (!q3 || !q1) {
        return {
          classification: 'DISCIPLINE_BREACH_LOSS',
          headline: 'CRITICAL DISCIPLINE BREACH LOSS',
          verdict:
            'EMOTIONAL FAILURE: This loss was caused or compounded by emotional impulse (oversized risk, revenge trading, or moving stop loss). This was an unforced error that damages equity.',
          adherenceScore,
          questions: questionsFormatted,
          actionableTakeaway:
            traderNote ||
            'Mandatory lockout: Take an immediate 30-minute break away from screens. Do not attempt to recover losses today. Review playbook rules.',
          reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
        };
      } else {
        return {
          classification: 'EXECUTION_ERROR_LOSS',
          headline: 'TECHNICAL EXECUTION ERROR LOSS',
          verdict:
            'The trade lacked complete HTF confirmation or entered at an unverified level. Analyze the HTF chart to diagnose what the market was truly telegraphing before entry.',
          adherenceScore,
          questions: questionsFormatted,
          actionableTakeaway:
            traderNote ||
            'Review higher timeframe order flow before tomorrow’s session. Wait for complete candle close before pulling the trigger.',
          reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
        };
      }
    } else {
      return {
        classification: 'NEUTRAL_BREAKEVEN',
        headline: 'BREAKEVEN PRESERVATION',
        verdict: 'Capital defended at zero net gain or loss. Invalidation handled cleanly.',
        adherenceScore,
        questions: questionsFormatted,
        actionableTakeaway: traderNote || 'Capital preservation is the foundation of longevity.',
        reviewedAt: `${getKarachiDate()} ${getKarachiTime12()}`,
      };
    }
  }, [answers, isWin, isLoss, questionsList, traderNote]);

  const handleToggleAnswer = (id: number) => {
    setAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
    setIsSaved(false);
  };

  const handleSave = () => {
    const updatedTrade: Trade = {
      ...trade,
      tradeDiagnostic: diagnosticResult,
    };
    onUpdateTrade?.(updatedTrade);
    setIsSaved(true);
    playDisciplineAlert('CHIME');
  };

  const isEdgeWin = diagnosticResult.classification === 'A_PLUS_EDGE_WIN';
  const isGoodLoss = diagnosticResult.classification === 'GOOD_BUSINESS_LOSS';
  const isLuckyWin = diagnosticResult.classification === 'LUCKY_BAD_WIN';
  const isDisciplineLoss = diagnosticResult.classification === 'DISCIPLINE_BREACH_LOSS';

  return (
    <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 font-mono-code">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-military border ${
              isWin
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isLoss
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {isWin ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-military font-bold text-cyan-400 uppercase tracking-wider">
                TRADE OUTCOME INTELLIGENCE DIAGNOSTIC
              </span>
              <span className="text-[10px] text-slate-400">
                TRADE #{trade.id} • {trade.instrument}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              Outcome: {formatCurrency(trade.profitLoss || 0, currency, { showSign: true })} (
              {trade.rMultiple > 0 ? '+' : ''}
              {trade.rMultiple?.toFixed(1) || '0.0'}R)
            </h3>
          </div>
        </div>

        {/* Process Score Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase block">DECISION QUALITY</span>
            <span
              className={`text-base font-bold ${
                diagnosticResult.adherenceScore >= 75
                  ? 'text-emerald-400'
                  : diagnosticResult.adherenceScore >= 50
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}
            >
              {diagnosticResult.adherenceScore}%
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Core Diagnostic Classification Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3.5 transition ${
          isEdgeWin
            ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300'
            : isGoodLoss
            ? 'bg-sky-950/25 border-sky-500/40 text-sky-300'
            : isLuckyWin
            ? 'bg-amber-950/30 border-blue-500/50 text-amber-300'
            : isDisciplineLoss
            ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isEdgeWin ? (
            <Award className="w-5 h-5 text-emerald-400" />
          ) : isGoodLoss ? (
            <ShieldCheck className="w-5 h-5 text-sky-400" />
          ) : isLuckyWin ? (
            <AlertTriangle className="w-5 h-5 text-cyan-400" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400" />
          )}
        </div>

        <div className="space-y-1">
          <div className="text-xs font-military font-bold tracking-wider flex items-center gap-2">
            <span>{diagnosticResult.headline}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase font-mono-code">
              {diagnosticResult.classification.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            {diagnosticResult.verdict}
          </p>
        </div>
      </div>

      {/* Diagnostic Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-military font-bold text-slate-300">
          <span>FOUR-POINT DIAGNOSTIC INQUIRY:</span>
          <span className="text-[10px] text-slate-400 font-mono-code">
            CLICK ANY ITEM TO TOGGLE YOUR SELF-AUDIT
          </span>
        </div>

        <div className="space-y-2.5">
          {questionsList.map((q) => {
            const isAffirmative = answers[q.id] ?? true;
            return (
              <div
                key={q.id}
                onClick={() => handleToggleAnswer(q.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                  isAffirmative
                    ? 'bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-400'
                    : 'bg-rose-950/15 border-rose-500/30 hover:border-rose-400'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isAffirmative ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="text-xs font-semibold text-slate-100 flex items-center justify-between">
                    <span>{q.prompt}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isAffirmative
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isAffirmative ? 'YES [✓]' : 'NO [✗]'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isAffirmative ? q.affirmativeMeaning : q.negativeMeaning}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Trader Takeaway Input */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <label className="block text-xs font-military font-bold text-cyan-400 uppercase">
          ACTIONABLE TAKEAWAY FOR FUTURE EXECUTIONS:
        </label>
        <textarea
          rows={2}
          value={traderNote}
          onChange={(e) => {
            setTraderNote(e.target.value);
            setIsSaved(false);
          }}
          placeholder={diagnosticResult.actionableTakeaway}
          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-400 placeholder:text-slate-600 resize-none font-sans"
        />
        <p className="text-[10px] text-slate-400">
          This key lesson will be permanently indexed into your psychological development records.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-400">
          {trade.tradeDiagnostic?.reviewedAt && (
            <span>Last reviewed: {trade.tradeDiagnostic.reviewedAt}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs transition cursor-pointer"
            >
              CLOSE
            </button>
          )}

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-military font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-blue-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaved ? 'DIAGNOSTIC AUDIT SAVED' : 'SAVE DIAGNOSTIC AUDIT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
