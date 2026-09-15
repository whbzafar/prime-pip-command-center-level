import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, ShieldCheck, RefreshCw, HelpCircle, Sparkles } from 'lucide-react';
import { calmAudio } from '../calmAudio';

export interface ThoughtCardItem {
  text: string;
  isControl: boolean;
  explanation: string;
}

interface ThoughtSorterProps {
  cards?: ThoughtCardItem[];
  title?: string;
  onComplete?: (score: number) => void;
}

const DEFAULT_CARDS: ThoughtCardItem[] = [
  {
    text: 'Whether the upcoming Fed interest rate decision spikes GBP/USD 80 pips',
    isControl: false,
    explanation: 'Macroeconomic news and central bank decisions are 100% external. You cannot control or predict them with certainty.',
  },
  {
    text: 'Calculating my exact lot size so that my maximum risk is strictly $150 (1.0% of equity)',
    isControl: true,
    explanation: 'Position sizing is entirely under your executive command before submitting an order.',
  },
  {
    text: 'Whether this specific trade hits Take Profit 2 within the next 45 minutes',
    isControl: false,
    explanation: 'Individual trade outcome and time-to-target are probabilistic market variables, not personal performance metrics.',
  },
  {
    text: 'Setting a hard stop loss at the structural invalidation point prior to clicking Buy',
    isControl: true,
    explanation: 'Defining and executing your risk boundary is the non-negotiable core of institutional risk management.',
  },
  {
    text: 'What other traders in the Discord chat room are saying about Gold being bullish',
    isControl: false,
    explanation: 'Social chatter is external noise that compromises your personal conviction and creates herd panic.',
  },
  {
    text: 'Walking away from my desk after reaching my predefined daily max loss limit',
    isControl: true,
    explanation: 'Stopping trading when capital or cognitive limits are reached is 100% your personal choice.',
  },
];

export const ThoughtSorter: React.FC<ThoughtSorterProps> = ({
  cards = DEFAULT_CARDS,
  title = 'Cognitive Locus of Control Separation',
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userDecisions, setUserDecisions] = useState<
    { card: ThoughtCardItem; chosenControl: boolean; isCorrect: boolean }[]
  >([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const currentCard = cards[currentIndex];

  const handleClassify = (chosenAsControl: boolean) => {
    if (!currentCard) return;

    const isCorrect = chosenAsControl === currentCard.isControl;
    if (isCorrect) {
      calmAudio.playSingingBowlChime(528);
    } else {
      calmAudio.playSingingBowlChime(320);
    }

    const updated = [
      ...userDecisions,
      {
        card: currentCard,
        chosenControl: chosenAsControl,
        isCorrect,
      },
    ];
    setUserDecisions(updated);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
      const correctCount = updated.filter((d) => d.isCorrect).length;
      if (onComplete) {
        onComplete(Math.round((correctCount / cards.length) * 100));
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserDecisions([]);
    setIsFinished(false);
  };

  const correctAnswersCount = userDecisions.filter((d) => d.isCorrect).length;

  return (
    <div className="bg-[#0b101e] border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
        <div>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
            COGNITIVE CLARITY EXERCISE
          </span>
          <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase mt-0.5">
            {title}
          </h4>
        </div>
        <div className="text-xs font-mono-code text-indigo-300">
          Card {isFinished ? cards.length : currentIndex + 1} of {cards.length}
        </div>
      </div>

      {!isFinished && currentCard && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400 font-sans">
            Sort this trading reality: Is this factor{' '}
            <strong className="text-teal-300">Within Your Direct Process Control</strong> or is it{' '}
            <strong className="text-rose-300">Market Behavior Outside Your Control</strong>?
          </p>

          {/* Active Card Container */}
          <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/30 shadow-2xl text-center min-h-[160px] flex items-center justify-center">
            <p className="text-base sm:text-lg font-mono-code font-bold text-slate-100 leading-relaxed max-w-xl">
              "{currentCard.text}"
            </p>
          </div>

          {/* Two Sorting Decision Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleClassify(true)}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-950/40 hover:bg-teal-900/50 border border-teal-500/40 hover:border-teal-400 text-teal-200 transition-all active:scale-95 shadow-lg shadow-teal-500/10 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-military font-bold tracking-wider uppercase">
                  Within My Control
                </div>
                <div className="text-[10px] font-mono-code text-teal-400/80">
                  My execution, sizing & discipline
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleClassify(false)}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 hover:border-rose-400 text-rose-200 transition-all active:scale-95 shadow-lg shadow-rose-500/10 cursor-pointer"
            >
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-military font-bold tracking-wider uppercase">
                  Outside My Control
                </div>
                <div className="text-[10px] font-mono-code text-rose-400/80">
                  Market price, news & randomness
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Finished Summary View */}
      {isFinished && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  Cognitive Clarity Score
                </div>
                <div className="text-xs font-mono-code text-slate-400">
                  {correctAnswersCount} of {cards.length} factors correctly identified
                </div>
              </div>
            </div>
            <div className="text-2xl font-military font-black text-teal-400">
              {Math.round((correctAnswersCount / cards.length) * 100)}%
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {userDecisions.map((decision, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs font-mono-code space-y-1.5 ${
                  decision.isCorrect
                    ? 'bg-slate-900/70 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-200 font-bold">"{decision.card.text}"</span>
                  {decision.isCorrect ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 shrink-0">
                      <XCircle className="w-3.5 h-3.5" /> Misclassified
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-sans text-slate-400">
                  <strong className={decision.card.isControl ? 'text-teal-400' : 'text-rose-400'}>
                    {decision.card.isControl ? 'Within Control' : 'Outside Control'}:
                  </strong>{' '}
                  {decision.card.explanation}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Exercise</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
