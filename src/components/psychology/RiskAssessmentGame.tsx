import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, TrendingDown, DollarSign, Award, HelpCircle } from 'lucide-react';

interface Scenario {
  id: number;
  balance: number;
  drawdownNotice: string;
  pair: string;
  stopLossPips: number;
  pipValuePerLot: number;
  question: string;
  correctLots: number;
  options: Array<{ lots: number; riskPercent: number; label: string; isCorrect: boolean; explanation: string }>;
}

export const RiskAssessmentGame: React.FC = () => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  const scenarios: Scenario[] = [
    {
      id: 1,
      balance: 10000,
      drawdownNotice: 'You just suffered 2 consecutive losses. Current balance is $9,800. You feel an urge to make back the $200.',
      pair: 'EUR/USD',
      stopLossPips: 20,
      pipValuePerLot: 10, // $10 per pip per 1.0 lot
      question: 'To strictly risk exactly 1.0% ($98.00) of current capital, what lot size must you trade?',
      correctLots: 0.49,
      options: [
        {
          lots: 1.0,
          riskPercent: 2.04,
          label: '1.00 Lot ($200 Risk)',
          isCorrect: false,
          explanation: 'Violates 1% limit. Doubles risk to recover losses in one trade (classic revenge trading trap).',
        },
        {
          lots: 0.49,
          riskPercent: 1.0,
          label: '0.49 Lots ($98 Risk)',
          isCorrect: true,
          explanation: 'Mathematically perfect. Strict 1.0% preservation protects account life expectancy and keeps tilt at zero.',
        },
        {
          lots: 2.0,
          riskPercent: 4.08,
          label: '2.00 Lots ($400 Risk)',
          isCorrect: false,
          explanation: 'Severe over-leveraging. A single loss pushes drawdown past 5%, escalating anxiety to dangerous levels.',
        },
        {
          lots: 0.25,
          riskPercent: 0.51,
          label: '0.25 Lots ($50 Risk)',
          isCorrect: false,
          explanation: 'Conservatively viable, but under-utilizes the standard 1% model rule for this specific calculation question.',
        },
      ],
    },
    {
      id: 2,
      balance: 50000,
      drawdownNotice: 'Prop firm challenge Phase 1. Maximum daily drawdown permitted is $2,500 (5%). You are currently down -$1,000 for today.',
      pair: 'XAU/USD (Gold)',
      stopLossPips: 30,
      pipValuePerLot: 10,
      question: 'What is the maximum responsible risk allocation for your next trade to guarantee you never breach the daily loss limit?',
      correctLots: 0.5,
      options: [
        {
          lots: 2.0,
          riskPercent: 3.0,
          label: '2.00 Lots ($600 Risk)',
          isCorrect: false,
          explanation: 'High danger! Another loss puts you at -$1,600, just $900 away from permanent prop firm failure.',
        },
        {
          lots: 0.5,
          riskPercent: 0.5,
          label: '0.50 Lots ($150 Risk / 0.3%)',
          isCorrect: true,
          explanation: 'Masterclass drawdown preservation! Slicing risk in half during drawdown ensures survival through bad variance.',
        },
        {
          lots: 3.0,
          riskPercent: 4.5,
          label: '3.00 Lots ($900 Risk)',
          isCorrect: false,
          explanation: 'All-or-nothing gambling. One wick sweeps your stop and fails the prop account instantly.',
        },
      ],
    },
  ];

  const current = scenarios[currentScenarioIndex];

  const handleSelect = (index: number) => {
    if (hasAnswered) return;
    setSelectedOption(index);
    setHasAnswered(true);
    if (current.options[index].isCorrect) {
      setScore((s) => s + 50);
    }
  };

  const handleNext = () => {
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex((c) => c + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    } else {
      // Finished
      setCurrentScenarioIndex(0);
      setSelectedOption(null);
      setHasAnswered(false);
      setScore(0);
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-military font-bold text-cyan-400 uppercase tracking-widest">
            QUANTITATIVE RISK DISCIPLINE
          </span>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Drawdown Position Sizing Mini-Game
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Test your mathematical discipline under acute drawdown pressure. Sizing errors are the #1 killer of trading accounts.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Risk Score</span>
          <span className="text-lg font-mono-code font-bold text-cyan-400">{score} PTS</span>
        </div>
      </div>

      {/* Scenario Details Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
          <span className="text-cyan-400 font-bold">SCENARIO {current.id} OF {scenarios.length}</span>
          <span>Instrument: <strong className="text-slate-200">{current.pair}</strong></span>
          <span>Stop Loss: <strong className="text-slate-200">{current.stopLossPips} pips</strong></span>
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs font-mono-code text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>{current.drawdownNotice}</span>
        </div>

        <h4 className="text-sm font-military font-bold text-slate-100">
          {current.question}
        </h4>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          {current.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={hasAnswered}
                className={`p-3.5 rounded-xl border text-left transition font-mono-code text-xs flex items-center justify-between cursor-pointer ${
                  hasAnswered
                    ? opt.isCorrect
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                      : isSelected
                      ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800/80'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>{opt.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {opt.riskPercent}% Risk
                    </span>
                  </div>
                  {hasAnswered && (
                    <p className="text-[11px] text-slate-300 font-sans mt-1">
                      {opt.explanation}
                    </p>
                  )}
                </div>

                {hasAnswered && (
                  <div>
                    {opt.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : isSelected ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    ) : null}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {hasAnswered && (
          <div className="flex justify-end pt-3">
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition"
            >
              {currentScenarioIndex < scenarios.length - 1 ? 'NEXT SCENARIO ➔' : 'RESTART CHALLENGE'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
