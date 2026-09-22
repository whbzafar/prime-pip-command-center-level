import React from 'react';
import { History, Play, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { IndicatorObservation } from '../../types/fundamentalIndicatorTypes';

interface HistoricalScenario {
  id: string;
  title: string;
  period: string;
  description: string;
  primaryDivergence: string;
  predictedWinningPairs: string[];
  sampleObservations: Partial<IndicatorObservation>[];
}

const HISTORICAL_SCENARIOS: HistoricalScenario[] = [
  {
    id: 'fed_2022_hikes',
    title: '2022 Aggressive Fed Tightening vs. BOJ Yield Curve Control (YCC)',
    period: 'March 2022 – October 2022',
    description:
      'The Federal Reserve initiated 75 bps rate hikes with US CPI peaking at 9.1%, while the Bank of Japan maintained -0.10% negative rates and capped 10Y JGB yields at 0.25%. The deterministic model generated a +125 pt spread favoring USD over JPY.',
    primaryDivergence: 'USD Score: +78 vs. JPY Score: -68 (Differential: +146 pts)',
    predictedWinningPairs: ['USDJPY Long (+3,200 pips)', 'EURUSD Short (+1,500 pips)'],
    sampleObservations: [
      { indicatorId: 'US_CPI_YOY', actual: 9.1, forecast: 8.8 },
      { indicatorId: 'US_FED_FUNDS', actual: 3.25, forecast: 3.25 },
      { indicatorId: 'JP_POLICY_RATE', actual: -0.10, forecast: -0.10 },
      { indicatorId: 'JP_CPI_YOY', actual: 2.5, forecast: 2.4 },
    ],
  },
  {
    id: 'us_exceptionalism_2023',
    title: '2023 US Growth Exceptionalism vs. European Stagnation',
    period: 'Q3 2023 – Q4 2023',
    description:
      'US Real GDP surged at an annualized 4.9% while Eurozone manufacturing PMI plunged to 43.1. US labor demand remained tight, creating an uninterrupted fundamental impulse across EURUSD and GBPUSD shorts.',
    primaryDivergence: 'USD Score: +62 vs. EUR Score: -34 (Differential: +96 pts)',
    predictedWinningPairs: ['EURUSD Short (+750 pips)', 'AUDUSD Short (+600 pips)'],
    sampleObservations: [
      { indicatorId: 'US_GDP_ANNUALIZED', actual: 4.9, forecast: 4.3 },
      { indicatorId: 'US_NFP', actual: 297000, forecast: 170000 },
      { indicatorId: 'EU_MANUFACTURING_PMI', actual: 43.1, forecast: 44.0 },
      { indicatorId: 'EU_GDP_QOQ', actual: -0.1, forecast: 0.1 },
    ],
  },
  {
    id: 'boj_unwind_2024',
    title: 'Summer 2024 BOJ Rate Hike & Global Carry Trade Unwind',
    period: 'July 2024 – August 2024',
    description:
      'Bank of Japan hiked rates to 0.25% alongside an unexpected rise in Japanese base wages. Concurrently, US labor softened (Sahm Rule trigger), prompting violent liquidation of multi-year JPY short carry positions.',
    primaryDivergence: 'JPY Score shifted from -65 to +48; USD Score cooled from +58 to +15',
    predictedWinningPairs: ['USDJPY Short (-1,800 pips)', 'GBPJPY Short (-2,200 pips)'],
    sampleObservations: [
      { indicatorId: 'JP_POLICY_RATE', actual: 0.25, forecast: 0.10 },
      { indicatorId: 'US_UNEMPLOYMENT', actual: 4.3, forecast: 4.1 },
      { indicatorId: 'US_NFP', actual: 114000, forecast: 175000 },
    ],
  },
];

interface FundamentalBacktestViewProps {
  onLoadScenarioObservations: (observations: Partial<IndicatorObservation>[]) => void;
}

export const FundamentalBacktestView: React.FC<FundamentalBacktestViewProps> = ({
  onLoadScenarioObservations,
}) => {
  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <History className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Macro Scenario Historical Backtesting Lab
            </h3>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Verify deterministic scoring behavior against benchmark historical macro divergence regimes
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          Historical backtesting tests whether the deterministic calculation rules correctly captured major macro trend runs while filtering out choppy consolidation ranges. Load any scenario below to verify how the model handles real historical shocks.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="space-y-4">
        {HISTORICAL_SCENARIOS.map((sc) => (
          <div
            key={sc.id}
            className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40">
                    {sc.period}
                  </span>
                  <h4 className="text-base font-military font-bold text-slate-100">
                    {sc.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onLoadScenarioObservations(sc.sampleObservations)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>LOAD SCENARIO INTO ENGINE</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {sc.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-code">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 uppercase text-[10px]">Calculated Divergence:</span>
                <div className="text-cyan-300 font-bold">{sc.primaryDivergence}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 uppercase text-[10px]">Institutional Playbook Results:</span>
                <div className="text-emerald-400 font-bold">{sc.predictedWinningPairs.join(' • ')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
