import React, { useState } from 'react';
import { Brain, CheckCircle2, RotateCcw, ShieldCheck, Sparkles, Award } from 'lucide-react';

interface Question {
  id: number;
  scenario: string;
  options: Array<{
    text: string;
    biasType: 'REVENGE' | 'LOSS_AVERSION' | 'OVERCONFIDENCE' | 'DISCIPLINED';
    scoreContribution: number;
  }>;
}

export const EmotionalBiasQuiz: React.FC = () => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const questions: Question[] = [
    {
      id: 1,
      scenario: 'You close a trade at target for +$150. Ten minutes later, price accelerates another 80 pips without you. How do you feel and react?',
      options: [
        {
          text: 'Frustrated and cheated. I quickly jump back in with market order so I don\'t miss out.',
          biasType: 'REVENGE',
          scoreContribution: 1,
        },
        {
          text: 'Neutral and satisfied. My plan was executed and target hit. What happens after is irrelevant.',
          biasType: 'DISCIPLINED',
          scoreContribution: 0,
        },
        {
          text: 'I regret taking profit and mentally vow to never set a take-profit target again.',
          biasType: 'OVERCONFIDENCE',
          scoreContribution: 2,
        },
      ],
    },
    {
      id: 2,
      scenario: 'A trade drops into drawdown and is 3 pips away from hitting your stop loss. What is your reaction?',
      options: [
        {
          text: 'I widen the stop loss 15 more pips. "I know it\'s going to turn around right here."',
          biasType: 'LOSS_AVERSION',
          scoreContribution: 1,
        },
        {
          text: 'I let the stop loss trigger automatically. Taking a calculated loss is part of the business.',
          biasType: 'DISCIPLINED',
          scoreContribution: 0,
        },
        {
          text: 'I panic, close it manually at market, and immediately reverse my position to short.',
          biasType: 'REVENGE',
          scoreContribution: 2,
        },
      ],
    },
    {
      id: 3,
      scenario: 'You have won 5 consecutive trades this week and feel invincible. What do you do for trade #6?',
      options: [
        {
          text: 'Increase lot size by 3x. I am reading the algorithm like a book and want to maximize this streak.',
          biasType: 'OVERCONFIDENCE',
          scoreContribution: 2,
        },
        {
          text: 'Keep the exact same 1.0% risk sizing. Probability distributes wins and losses independently.',
          biasType: 'DISCIPLINED',
          scoreContribution: 0,
        },
        {
          text: 'Stop trading for the week to protect my paper gains out of intense fear of losing.',
          biasType: 'LOSS_AVERSION',
          scoreContribution: 1,
        },
      ],
    },
    {
      id: 4,
      scenario: 'You sit at your screen for 2.5 hours and no HTF setup triggers according to your rules. The session is closing.',
      options: [
        {
          text: 'I force a 1-minute scalping entry because I feel my time was wasted sitting without action.',
          biasType: 'REVENGE',
          scoreContribution: 2,
        },
        {
          text: 'I close my terminal and log zero trades. Preserving capital on no-setup days is a win.',
          biasType: 'DISCIPLINED',
          scoreContribution: 0,
        },
      ],
    },
  ];

  const handleSelect = (qId: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const calculateResult = () => {
    let revengeCount = 0;
    let lossAversionCount = 0;
    let overconfidenceCount = 0;
    let disciplinedCount = 0;

    Object.entries(answers).forEach(([qId, optIdx]) => {
      const q = questions.find((item) => item.id === Number(qId));
      if (!q) return;
      const idx = Number(optIdx);
      const opt = q.options[idx];
      if (!opt) return;
      if (opt.biasType === 'REVENGE') revengeCount++;
      else if (opt.biasType === 'LOSS_AVERSION') lossAversionCount++;
      else if (opt.biasType === 'OVERCONFIDENCE') overconfidenceCount++;
      else if (opt.biasType === 'DISCIPLINED') disciplinedCount++;
    });

    return {
      revengeCount,
      lossAversionCount,
      overconfidenceCount,
      disciplinedCount,
      totalAnswered: Object.keys(answers).length,
    };
  };

  const res = calculateResult();

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-military font-bold text-cyan-400 uppercase tracking-widest">
            COGNITIVE DISTORTION DIAGNOSIS
          </span>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Trader Emotional Bias Quiz
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Identify your primary subconscious psychological vulnerabilities: Revenge Trading, Loss Aversion, or Overconfidence.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Progress</span>
          <span className="text-sm font-mono-code font-bold text-cyan-400">
            {Object.keys(answers).length} / {questions.length}
          </span>
        </div>
      </div>

      {!isSubmitted ? (
        <div className="space-y-5">
          {questions.map((q) => {
            const selected = answers[q.id];
            return (
              <div key={q.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-slate-800 text-cyan-400 font-bold font-mono-code text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {q.id}
                  </span>
                  <p className="text-xs font-mono-code text-slate-200 font-medium leading-relaxed">
                    {q.scenario}
                  </p>
                </div>

                <div className="space-y-2 pl-7">
                  {q.options.map((opt, idx) => {
                    const isChecked = selected === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(q.id, idx)}
                        className={`w-full p-3 rounded-lg border text-left text-xs font-mono-code transition flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-blue-500/10 border-blue-500 text-amber-300 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsSubmitted(true)}
              disabled={Object.keys(answers).length < questions.length}
              className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-military font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition"
            >
              GENERATE PSYCHOLOGICAL PROFILE
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-military font-bold text-slate-100 uppercase">
                Diagnostic Bias Assessment
              </h4>
              <p className="text-xs text-slate-400 font-mono-code">
                Summary of your subconscious trading psychology tendencies:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono-code uppercase block">Revenge Vulnerability</span>
              <div className={`text-base font-bold font-mono-code ${res.revengeCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {res.revengeCount > 0 ? 'ACTIVE HAZARD' : 'CONTROLLED'}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                {res.revengeCount > 0
                  ? 'Urge to immediately trade back market movement after an exit.'
                  : 'Displays high emotional detachment from market continuation.'}
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono-code uppercase block">Loss Aversion</span>
              <div className={`text-base font-bold font-mono-code ${res.lossAversionCount > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {res.lossAversionCount > 0 ? 'MODERATE BIAS' : 'HEALTHY'}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                {res.lossAversionCount > 0
                  ? 'Fear of realization of loss causing stop manipulation.'
                  : 'Accepts predefined stop losses as standard cost of doing business.'}
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono-code uppercase block">Discipline Index</span>
              <div className="text-base font-bold font-mono-code text-emerald-400">
                {Math.round((res.disciplinedCount / questions.length) * 100)}%
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                Adherence to systematic rule execution over visceral emotions.
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs font-mono-code text-amber-300 space-y-1.5">
            <span className="font-military font-bold uppercase tracking-wider block text-cyan-400">
              Prescription For Next 10 Trades:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Never take a trade within 15 minutes of closing a winning or losing position.</li>
              <li>Always set hard stop-loss at order placement; hands off the mouse once executed.</li>
              <li>Log pre-trade emotional check-in before any live market order.</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setIsSubmitted(false);
                setAnswers({});
              }}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETAKE QUIZ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
