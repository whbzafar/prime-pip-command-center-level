import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, RotateCw, CheckCircle2, Sparkles, BookOpen, ShieldAlert } from 'lucide-react';
import { calmAudio } from '../calmAudio';

export interface ReframeCardItem {
  distortedThought: string;
  cognitiveBias: string;
  rationalPerspective: string;
}

interface CognitiveReframerProps {
  cards?: ReframeCardItem[];
  title?: string;
  onComplete?: () => void;
}

const DEFAULT_REFRAME_CARDS: ReframeCardItem[] = [
  {
    distortedThought: 'If this trade hits my stop loss, it proves my analysis is worthless and I\'ll never be profitable.',
    cognitiveBias: 'Catastrophizing & Outcome Bias',
    rationalPerspective: 'A 60% win-rate trading edge has 40% losses randomly distributed across time. A stop-out is simply paying the wholesale cost of discovering if this individual trade works.',
  },
  {
    distortedThought: 'I must close this winning position right now with +$50 before it reverses and takes it all back.',
    cognitiveBias: 'Myopic Loss Aversion',
    rationalPerspective: 'Cutting winning trades early destroys the mathematical positive expectancy needed to offset normal stop-outs. Allow trades to reach predetermined liquidity pools.',
  },
  {
    distortedThought: 'I missed the 60-pip morning rally, so I need to market-buy right now so I don\'t miss the rest of the move.',
    cognitiveBias: 'FOMO & Scarcity Illusion',
    rationalPerspective: 'Markets provide an infinite stream of opportunities. A move without your defined setup is not your move. Chasing extended candles is merely donating liquidity to smart money.',
  },
];

export const CognitiveReframer: React.FC<CognitiveReframerProps> = ({
  cards = DEFAULT_REFRAME_CARDS,
  title = 'Cognitive Reframe: Trading Bias Inversion',
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [internalizedCards, setInternalizedCards] = useState<Record<number, boolean>>({});

  const currentCard = cards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    calmAudio.playSingingBowlChime(isFlipped ? 440 : 528);
  };

  const handleToggleInternalize = () => {
    const updated = { ...internalizedCards, [currentIndex]: !internalizedCards[currentIndex] };
    setInternalizedCards(updated);
    if (!internalizedCards[currentIndex]) {
      calmAudio.playSingingBowlChime(640);
    }
    // Check if all cards internalized
    if (Object.keys(updated).length === cards.length && Object.values(updated).every(Boolean)) {
      if (onComplete) onComplete();
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  return (
    <div className="bg-[#0b101e] border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
        <div>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
            NEUROLOGICAL RE-ANCHORING
          </span>
          <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase mt-0.5">
            {title}
          </h4>
        </div>
        <div className="text-xs font-mono-code text-indigo-300">
          Card {currentIndex + 1} of {cards.length}
        </div>
      </div>

      <p className="text-xs text-slate-400 font-sans">
        Click the card to flip between the{' '}
        <strong className="text-rose-400">Impulsive Emotional Narrative</strong> and the{' '}
        <strong className="text-teal-400">Disciplined Institutional Reality</strong>.
      </p>

      {/* Main Interactive Flip Card Container */}
      <div
        onClick={handleFlip}
        className="relative min-h-[220px] sm:min-h-[200px] rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-300 select-none shadow-2xl flex flex-col justify-between border-2 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900"
        style={{
          borderColor: isFlipped ? 'rgba(20, 184, 166, 0.4)' : 'rgba(244, 63, 94, 0.35)',
        }}
      >
        {/* Card Header & Bias Tag */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full border ${
              isFlipped
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {isFlipped ? '✓ RATIONAL AXIOM' : `⚠ DISTORTION: ${currentCard.cognitiveBias}`}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono-code text-slate-400">
            <RotateCw className="w-3 h-3 text-indigo-400 animate-spin-slow" />
            <span>Click to Flip</span>
          </div>
        </div>

        {/* Card Body Text */}
        <div className="my-4">
          {!isFlipped ? (
            <div>
              <div className="text-xs font-mono-code text-rose-400/90 uppercase mb-1 font-bold">
                Emotional Thought Trap:
              </div>
              <p className="text-base sm:text-lg font-mono-code font-bold text-slate-100 leading-snug">
                "{currentCard.distortedThought}"
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs font-mono-code text-teal-400 uppercase mb-1 font-bold">
                Institutional Probabilistic Reality:
              </div>
              <p className="text-base sm:text-lg font-mono-code font-bold text-teal-100 leading-snug">
                "{currentCard.rationalPerspective}"
              </p>
            </div>
          )}
        </div>

        {/* Flip Hint */}
        <div className="text-[10px] font-mono-code text-slate-500 text-right">
          {isFlipped ? 'Showing Rational Perspective' : 'Showing Impulsive Thought'}
        </div>
      </div>

      {/* Internalize Toggle & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleToggleInternalize}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono-code font-bold border transition active:scale-95 cursor-pointer ${
            internalizedCards[currentIndex]
              ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 ${
              internalizedCards[currentIndex] ? 'text-teal-400' : 'text-slate-600'
            }`}
          />
          <span>
            {internalizedCards[currentIndex]
              ? 'Internalized in Mind'
              : 'I Commit to This Perspective'}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/50 disabled:opacity-40 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
