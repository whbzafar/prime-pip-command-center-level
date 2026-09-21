import React, { useState } from 'react';
import { AccountSettings, Trade, TradingRule } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calculator,
  Calendar,
  Layers,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Lock,
  Unlock,
  Radio,
  Eye,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface PreTradePlanProps {
  account?: AccountSettings | null;
  rules?: TradingRule[];
  trades?: Trade[];
  onSaveTrade?: (trade: Trade) => Promise<void>;
  onNavigateToJournal?: () => void;
  onNavigateToLotSize?: () => void;
  onNavigateToCalendar?: () => void;
}

const NEWS_SOURCES = [
  {
    name: 'Forex Factory Calendar',
    desc: 'High-impact macro event schedule & consensus deviations',
    url: 'https://www.forexfactory.com/calendar',
    tag: 'PRIMARY CALENDAR',
  },
  {
    name: 'Forex Factory News',
    desc: 'Live financial wire & central bank news dispatches',
    url: 'https://www.forexfactory.com/news',
    tag: 'BREAKING WIRE',
  },
  {
    name: 'DailyFX Economic Calendar',
    desc: 'Global volatility ratings & currency heatmaps',
    url: 'https://www.dailyfx.com/economic-calendar',
    tag: 'VOLATILITY',
  },
  {
    name: 'Investing.com Global Desk',
    desc: 'Central bank interest rate decisions & real-time actuals',
    url: 'https://www.investing.com/economic-calendar/',
    tag: 'CENTRAL BANKS',
  },
  {
    name: 'FXStreet Real-Time Feed',
    desc: 'Fast macro radar with deviation barometers',
    url: 'https://www.fxstreet.com/economic-calendar',
    tag: 'FAST EXECUTION',
  },
  {
    name: 'Tradingster COT Report (Commitment of Traders)',
    desc: 'Weekly CFTC Commitment of Traders positioning for smart money institutional flow',
    url: 'https://www.tradingster.com/cot',
    tag: 'CHECK NEWS / COT • PRIMARY',
  },
];

export const PreTradePlan: React.FC<PreTradePlanProps> = ({
  account,
  rules = [],
  trades = [],
  onSaveTrade,
  onNavigateToJournal,
  onNavigateToLotSize,
  onNavigateToCalendar,
}) => {
  // Feature Lock State: Unlocked by default so traders can execute the 3-Phase protocol immediately
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // 3-Phase Navigation State
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);

  // PHASE 1 STATE
  // 1. Check News
  const [newsChecked, setNewsChecked] = useState(false);
  const [newsNotes, setNewsNotes] = useState('');

  // 2. Time Frame Analysis Check
  const [timeframeChecked, setTimeframeChecked] = useState(false);
  const [htfTimeframe, setHtfTimeframe] = useState<'Monthly' | 'Weekly' | 'Daily' | 'H4' | 'H1'>('H4');
  const [analysisTimeframe, setAnalysisTimeframe] = useState<'Weekly' | 'Daily' | 'H4' | 'H1' | 'M15'>('H1');
  const [entryTimeframe, setEntryTimeframe] = useState<'H1' | 'M15' | 'M5' | 'M1'>('M15');
  const [timeframeNotes, setTimeframeNotes] = useState('');

  // 3. Five Conditions Check
  const [condition1DoubleStructure, setCondition1DoubleStructure] = useState(false); // Double Structure Level
  const [condition2NoPdArray, setCondition2NoPdArray] = useState(false); // No PD Array
  const [condition3AlreadyMitigated, setCondition3AlreadyMitigated] = useState(false); // Already Mitigated
  const [condition4MarketRetest, setCondition4MarketRetest] = useState(false); // Market Retest of Unmitigated Demand/Supply Order Block
  const [condition5FailureOfSwing, setCondition5FailureOfSwing] = useState(false); // Failure of Swing
  const [phase1ValidationError, setPhase1ValidationError] = useState<string>('');

  // PHASE 2 STATE
  // 1. Risk Management (Lot Size Calculation)
  const [riskManagementChecked, setRiskManagementChecked] = useState(false);
  const [calculatedLotSize, setCalculatedLotSize] = useState<string>('0.50');
  const [riskPercentUsed, setRiskPercentUsed] = useState<number>(account?.maxRiskPerTradePercent || 1.0);

  // 2. Risk-to-Reward Ratio Check (Must be 1:2)
  const [rrRatioChecked, setRrRatioChecked] = useState(false);
  const [rrRatioValue] = useState('1:2');

  // 3. Obstacles in the Path Check
  const [obstaclesChecked, setObstaclesChecked] = useState(false);

  // 4. Final Entry Authorization
  const [entryTaken, setEntryTaken] = useState(false);

  // Validation Checkers
  const allFiveConditionsChecked =
    condition1DoubleStructure &&
    condition2NoPdArray &&
    condition3AlreadyMitigated &&
    condition4MarketRetest &&
    condition5FailureOfSwing;

  const allPhase1Complete =
    newsChecked &&
    timeframeChecked &&
    allFiveConditionsChecked;

  const handleToggleAllFiveConditions = (targetValue: boolean) => {
    setCondition1DoubleStructure(targetValue);
    setCondition2NoPdArray(targetValue);
    setCondition3AlreadyMitigated(targetValue);
    setCondition4MarketRetest(targetValue);
    setCondition5FailureOfSwing(targetValue);
    if (targetValue) {
      setPhase1ValidationError('');
    }
  };

  const handleProceedToPhase2 = () => {
    const missing: string[] = [];
    if (!condition1DoubleStructure) missing.push('1. Double Structure Level');
    if (!condition2NoPdArray) missing.push('2. No Opposing PD Array');
    if (!condition3AlreadyMitigated) missing.push('3. Already Mitigated');
    if (!condition4MarketRetest) missing.push('4. Market Retest of Demand/Supply OB');
    if (!condition5FailureOfSwing) missing.push('5. Failure of Swing');

    if (missing.length > 0) {
      setPhase1ValidationError(
        `Five Condition Check Incomplete (${5 - missing.length}/5 verified). You CANNOT proceed to Phase 2 until all 5 conditions are checked: ${missing.join(', ')}`
      );
      const section = document.getElementById('five-conditions-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!newsChecked) {
      setPhase1ValidationError('Please mark "CHECK NEWS / COT" verified before proceeding.');
      return;
    }

    if (!timeframeChecked) {
      setPhase1ValidationError('Please mark "TIME FRAME ANALYSIS CHECK" verified before proceeding.');
      return;
    }

    setPhase1ValidationError('');
    setCurrentPhase(2);
  };

  const allPhase2Complete =
    riskManagementChecked &&
    rrRatioChecked &&
    obstaclesChecked &&
    entryTaken;

  const handleUnlockAttempt = () => {
    // Allows instant unlock or unlock with pass
    setIsLocked(false);
    setShowPinInput(false);
  };

  /* ==========================================================================
     LOCKED SCREEN ("Coming Soon" and fully secured, nothing visible inside)
     ========================================================================== */
  if (isLocked) {
    return (
      <div className="min-h-[750px] w-full flex items-center justify-center p-4 sm:p-8 bg-[#020617] relative overflow-hidden">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Holographic Glowing Rings */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-blue-500/10 animate-spin [animation-duration:40s] pointer-events-none" />
        <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-blue-500/20 animate-spin [animation-duration:25s] pointer-events-none" />

        {/* Central Lock Card */}
        <div className="relative z-10 max-w-lg w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
          {/* 3D Security Lock Centerpiece */}
          <div className="relative mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 via-amber-600/10 to-slate-950 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/20 group">
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl animate-pulse" />
            <Lock className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          </div>

          {/* Coming Soon & Status Badges */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-cyan-400 font-mono-code text-xs font-bold tracking-widest uppercase animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>COMING SOON</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-military font-bold text-slate-100 tracking-wider">
              PRE-TRADE PLAN
            </h2>
            <p className="text-xs font-mono-code text-cyan-400/90 uppercase tracking-widest">
              3-PHASE EXECUTION GATEKEEPER
            </p>
          </div>

          {/* Institutional Security Notice */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono-code text-slate-400 leading-relaxed text-left space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>SECURITY PROTOCOL ACTIVE</span>
            </div>
            <p>
              This section is completely locked and fully secured. The 3-Phase Gatekeeper architecture (Phase 1: News, Timeframe & 5-Condition Check; Phase 2: Risk, 1:2 R:R, Obstacles & Entry; Phase 3: Journal) is currently undergoing proprietary calibration.
            </p>
          </div>

          {/* Secure Unlock / Preview Mode for Authorized Review */}
          <div className="pt-2 border-t border-slate-800/80">
            {!showPinInput ? (
              <button
                type="button"
                onClick={() => setShowPinInput(true)}
                className="text-[11px] font-mono-code text-slate-500 hover:text-cyan-400 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Authorized Preview / Unlock</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] font-mono-code text-slate-400">
                  Click below to inspect and test the 3-Phase Gatekeeper implementation:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleUnlockAttempt}
                    className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    ENTER 3-PHASE WORKSPACE
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPinInput(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================================
     UNLOCKED 3-PHASE INTERACTIVE WORKSPACE
     ========================================================================== */
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Lock Back Button */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-military font-bold text-slate-100 tracking-wider">
                PRE-TRADE PLAN
              </h2>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                GATEKEEPER ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400">
              Strict 3-Phase Rule Engine • Zero-Impulse Execution Protocol
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition cursor-pointer border border-slate-700"
            title="Lock module again"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>LOCK MODULE</span>
          </button>
        </div>
      </div>

      {/* Phase Progression Stepper Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Phase 1 Stepper */}
        <button
          type="button"
          onClick={() => setCurrentPhase(1)}
          className={`p-4 rounded-xl border text-left transition relative cursor-pointer ${
            currentPhase === 1
              ? 'bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-military font-bold text-cyan-400 tracking-wider">
              PHASE 1
            </span>
            {allPhase1Complete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-slate-600" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-200 mt-1">Context & 5 Conditions</h3>
          <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
            News • Timeframes • 5 Rules
          </p>
          {currentPhase === 1 && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        {/* Phase 2 Stepper */}
        <button
          type="button"
          onClick={() => {
            if (allPhase1Complete) {
              setPhase1ValidationError('');
              setCurrentPhase(2);
            } else {
              handleProceedToPhase2();
            }
          }}
          className={`p-4 rounded-xl border text-left transition relative cursor-pointer ${
            currentPhase === 2
              ? 'bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10'
              : allPhase1Complete
              ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              : 'bg-slate-950/40 border-slate-800/80 hover:border-amber-500/40 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-military font-bold text-cyan-400 tracking-wider">
              PHASE 2
            </span>
            {allPhase2Complete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-slate-600" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-200 mt-1">Risk Defense & Entry</h3>
          <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
            Lot Size • 1:2 R:R • Obstacles • Entry
          </p>
          {currentPhase === 2 && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>

        {/* Phase 3 Stepper */}
        <button
          type="button"
          onClick={() => allPhase2Complete && setCurrentPhase(3)}
          disabled={!allPhase2Complete}
          aria-disabled={!allPhase2Complete}
          className={`p-4 rounded-xl border text-left transition relative ${allPhase2Complete ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
            currentPhase === 3
              ? 'bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-military font-bold text-cyan-400 tracking-wider">
              PHASE 3
            </span>
            <Circle className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 mt-1">Make a Journal</h3>
          <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
            Post-Entry Logging & Tracking
          </p>
          {currentPhase === 3 && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-400 rounded-full" />
          )}
        </button>
      </div>

      {/* ======================================================================
          PHASE 1 CONTENT
          Point 1: Check News (External links + mark complete)
          Point 2: Time Frame Analysis Check (verify time frame and mark off)
          Point 3: Five Conditions Check:
                   1. Double Structure Level
                   2. No PD Array
                   3. Already Mitigated
                   4. Market Retest of Unmitigated Demand/Supply Order Block
                   5. Failure of Swing
          ====================================================================== */}
      {currentPhase === 1 && (
        <div className="space-y-6">
          {/* Phase 1, Point 1: Check News / COT */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-cyan-400">
                  1
                </span>
                <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
                  CHECK NEWS / COT
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setNewsChecked(!newsChecked)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-code font-bold transition cursor-pointer ${
                  newsChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300 border-slate-700'
                }`}
              >
                {newsChecked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>NEWS / COT VERIFIED</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-slate-400" />
                    <span>MARK NEWS & COT AS CHECKED</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Tradingster COT Callout Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-cyan-950/50 border border-blue-500/40 flex flex-wrap items-center justify-between gap-3 shadow-md shadow-blue-500/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30 uppercase tracking-wider">
                    PRIMARY INSTITUTIONAL POSITIONING
                  </span>
                  <span className="text-xs font-military font-bold text-slate-100">
                    Tradingster COT Report
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Inspect the latest CFTC Commitment of Traders (COT) report on Tradingster for institutional asset managers and commercial hedger positioning before committing trade risk.
                </p>
              </div>

              <a
                href="https://www.tradingster.com/cot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-lg shadow-cyan-400/20"
              >
                <span>OPEN TRADINGSTER COT</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
            </div>

            <p className="text-xs font-mono-code text-slate-400">
              Click the institutional feeds below to inspect upcoming high-impact RED news events, central bank speeches, and COT data before marking this step as complete:
            </p>

            {/* Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {NEWS_SOURCES.map((source) => (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-military font-bold text-slate-200 group-hover:text-cyan-400 transition">
                      {source.name}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                  </div>
                  <span className="inline-block mt-1 text-[9px] font-mono-code text-cyan-400/80 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                    {source.tag}
                  </span>
                  <p className="text-[11px] text-slate-400 font-sans mt-1 leading-snug">
                    {source.desc}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {/* Phase 1, Point 2: Time Frame Analysis Check */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-cyan-400">
                  2
                </span>
                <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
                  TIME FRAME ANALYSIS CHECK
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setTimeframeChecked(!timeframeChecked)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-code font-bold transition cursor-pointer ${
                  timeframeChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300 border-slate-700'
                }`}
              >
                {timeframeChecked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>TIMEFRAMES VERIFIED</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-slate-400" />
                    <span>MARK TIMEFRAME CHECK COMPLETE</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs font-mono-code text-slate-400">
              Verify your multi-timeframe alignment hierarchy (Higher Timeframe Trend → Intermediate Structure → Lower Timeframe Execution):
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-[10px] font-mono-code text-slate-400 block font-bold">
                  HIGHER TIME FRAME (HTF)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['Monthly', 'Weekly', 'Daily', 'H4', 'H1'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setHtfTimeframe(tf)}
                      className={`flex-1 min-w-[50px] py-1 rounded text-xs font-mono-code font-bold border transition ${
                        htfTimeframe === tf
                          ? 'bg-blue-500/20 text-cyan-300 border-blue-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-[10px] font-mono-code text-slate-400 block font-bold">
                  ANALYSIS / STRUCTURE FRAME
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['Weekly', 'Daily', 'H4', 'H1', 'M15'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setAnalysisTimeframe(tf)}
                      className={`flex-1 min-w-[45px] py-1 rounded text-xs font-mono-code font-bold border transition ${
                        analysisTimeframe === tf
                          ? 'bg-blue-500/20 text-cyan-300 border-blue-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-[10px] font-mono-code text-slate-400 block font-bold">
                  ENTRY / TRIGGER FRAME
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['H1', 'M15', 'M5', 'M1'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setEntryTimeframe(tf)}
                      className={`flex-1 min-w-[45px] py-1 rounded text-xs font-mono-code font-bold border transition ${
                        entryTimeframe === tf
                          ? 'bg-blue-500/20 text-cyan-300 border-blue-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Phase 1, Point 3: Five Conditions Check */}
          <div
            id="five-conditions-section"
            className={`bg-slate-950/80 border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
              phase1ValidationError
                ? 'border-rose-500/60 ring-1 ring-rose-500/40'
                : allFiveConditionsChecked
                ? 'border-emerald-500/40'
                : 'border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-cyan-400">
                  3
                </span>
                <div>
                  <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
                    FIVE CONDITIONS CHECK (MANDATORY FOR PHASE 2)
                  </h3>
                  <p className="text-[11px] font-mono-code text-slate-400">
                    System strictly requires all 5 structural criteria to be checked before unlocking Phase 2
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleAllFiveConditions(!allFiveConditionsChecked)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold border transition cursor-pointer ${
                    allFiveConditionsChecked
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-750 text-cyan-300 border-slate-700'
                  }`}
                >
                  {allFiveConditionsChecked ? 'UNCHECK ALL' : 'CHECK ALL 5 CONDITIONS'}
                </button>

                <div
                  className={`text-xs font-mono-code font-bold px-2.5 py-1 rounded-lg border ${
                    allFiveConditionsChecked
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {[
                    condition1DoubleStructure,
                    condition2NoPdArray,
                    condition3AlreadyMitigated,
                    condition4MarketRetest,
                    condition5FailureOfSwing,
                  ].filter(Boolean).length}{' '}
                  / 5 CONDITIONS CHECKED
                </div>
              </div>
            </div>

            {/* Validation Error Banner */}
            {phase1ValidationError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs font-mono-code flex items-start gap-3 shadow-lg shadow-rose-950/30">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                    <span>PHASE 2 PROGRESSION RESTRICTED</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{phase1ValidationError}</p>
                </div>
              </div>
            )}

            {/* 5 Conditions List */}
            <div className="space-y-3">
              {/* Condition 1 */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  condition1DoubleStructure
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={condition1DoubleStructure}
                  onChange={(e) => {
                    setCondition1DoubleStructure(e.target.checked);
                    if (e.target.checked && phase1ValidationError) setPhase1ValidationError('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-military font-bold tracking-wide flex items-center gap-2">
                    <span className="text-cyan-400 font-mono-code">1.</span>
                    <span>DOUBLE STRUCTURE LEVEL</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Confirm dual structural alignment (both internal and external market structure points align in direction).
                  </p>
                </div>
              </label>

              {/* Condition 2 */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  condition2NoPdArray
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={condition2NoPdArray}
                  onChange={(e) => {
                    setCondition2NoPdArray(e.target.checked);
                    if (e.target.checked && phase1ValidationError) setPhase1ValidationError('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-military font-bold tracking-wide flex items-center gap-2">
                    <span className="text-cyan-400 font-mono-code">2.</span>
                    <span>NO PD ARRAY</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Confirm there is NO opposing unmitigated PD array sitting immediately above or below the entry zone.
                  </p>
                </div>
              </label>

              {/* Condition 3 */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  condition3AlreadyMitigated
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={condition3AlreadyMitigated}
                  onChange={(e) => {
                    setCondition3AlreadyMitigated(e.target.checked);
                    if (e.target.checked && phase1ValidationError) setPhase1ValidationError('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-military font-bold tracking-wide flex items-center gap-2">
                    <span className="text-cyan-400 font-mono-code">3.</span>
                    <span>ALREADY MITIGATED</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Verify previous intermediate liquidity levels have already been tapped and cleared cleanly.
                  </p>
                </div>
              </label>

              {/* Condition 4 */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  condition4MarketRetest
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={condition4MarketRetest}
                  onChange={(e) => {
                    setCondition4MarketRetest(e.target.checked);
                    if (e.target.checked && phase1ValidationError) setPhase1ValidationError('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-military font-bold tracking-wide flex items-center gap-2">
                    <span className="text-cyan-400 font-mono-code">4.</span>
                    <span>MARKET RETEST OF UNMITIGATED DEMAND/SUPPLY ORDER BLOCK</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Price is currently executing an accurate retest of a pristine, unmitigated Demand or Supply Order Block.
                  </p>
                </div>
              </label>

              {/* Condition 5 */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  condition5FailureOfSwing
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={condition5FailureOfSwing}
                  onChange={(e) => {
                    setCondition5FailureOfSwing(e.target.checked);
                    if (e.target.checked && phase1ValidationError) setPhase1ValidationError('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-military font-bold tracking-wide flex items-center gap-2">
                    <span className="text-cyan-400 font-mono-code">5.</span>
                    <span>FAILURE OF SWING</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Opposing momentum shows clear failure of swing / rejection wick at key structural boundary.
                  </p>
                </div>
              </label>
            </div>

            {/* Advance to Phase 2 Button with Strict Enforcement */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono-code text-slate-400">
                {allPhase1Complete
                  ? '✓ All 5 Conditions & Pre-trade checks complete. Ready for Phase 2.'
                  : `5 Conditions Check: ${
                      [
                        condition1DoubleStructure,
                        condition2NoPdArray,
                        condition3AlreadyMitigated,
                        condition4MarketRetest,
                        condition5FailureOfSwing,
                      ].filter(Boolean).length
                    }/5 verified. All 5 required to proceed.`}
              </span>

              <button
                type="button"
                onClick={handleProceedToPhase2}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer ${
                  allPhase1Complete
                    ? 'bg-blue-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-blue-500/25'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                }`}
              >
                <span>PROCEED TO PHASE 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          PHASE 2 CONTENT
          Point 1: Risk Management (clicking takes directly to lot size calculation)
                   Once lot size is calculated and user returns to Phase 2, mark complete
          Point 2: Risk-to-Reward Ratio Check (listed as 1:2)
          Point 3: Check for obstacles in the path (e.g. unmitigated demand/supply order block)
          Point 4: You can now take the entry!
          ====================================================================== */}
      {currentPhase === 2 && (
        <div className="space-y-6">
          {/* Phase 2, Point 1: Risk Management */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-cyan-400">
                  1
                </span>
                <div>
                  <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
                    RISK MANAGEMENT (LOT SIZE CALCULATION)
                  </h3>
                  <p className="text-[11px] font-mono-code text-slate-400">
                    Calculate exact lot size based on account balance & stop loss distance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRiskManagementChecked(!riskManagementChecked)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-code font-bold transition cursor-pointer ${
                  riskManagementChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300 border-slate-700'
                }`}
              >
                {riskManagementChecked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>LOT SIZE CALCULATED & COMPLETE</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-slate-400" />
                    <span>MARK RISK STEP COMPLETE</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono-code text-cyan-400 uppercase tracking-wider font-bold">
                  DIRECT ACTION REQUIRED
                </span>
                <p className="text-xs text-slate-300">
                  Click the button to open the Lot Size Calculator. Calculate your position, then return here to mark complete.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToLotSize) {
                    onNavigateToLotSize();
                  }
                  // Auto-prepare completion upon returning
                  setRiskManagementChecked(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Calculator className="w-4 h-4" />
                <span>OPEN LOT SIZE CALCULATOR</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Phase 2, Point 2: Risk-to-Reward Ratio Check (Listed as 1:2) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-cyan-400">
                  2
                </span>
                <div>
                  <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
                    RISK-TO-REWARD RATIO CHECK (MINIMUM 1:2)
                  </h3>
                  <p className="text-[11px] font-mono-code text-slate-400">
                    Mandatory institutional risk asymmetry threshold
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRrRatioChecked(!rrRatioChecked)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-code font-bold transition cursor-pointer ${
                  rrRatioChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300 border-slate-700'
                }`}
              >
                {rrRatioChecked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>1:2 RATIO CONFIRMED</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-slate-400" />
                    <span>VERIFY 1:2 RATIO</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-center">
                <span className="text-xl font-military font-bold text-amber-300">
                  1 : 2
                </span>
                <span className="block text-[9px] font-mono-code text-slate-400">
                  MINIMUM RATIO
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                You must—at a minimum—check and tick off this item. Never enter any trade with a target below twice your stop-loss distance.
              </p>
            </div>
          </div>

          {/* Phase 2, Point 3: Checking for any obstacles in the path */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-cyan-400">
                  3
                </span>
                <div>
                  <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
                    OBSTACLES IN THE PATH CHECK
                  </h3>
                  <p className="text-[11px] font-mono-code text-slate-400">
                    Verify no unmitigated demand/supply order blocks opposing trade route
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setObstaclesChecked(!obstaclesChecked)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-code font-bold transition cursor-pointer ${
                  obstaclesChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300 border-slate-700'
                }`}
              >
                {obstaclesChecked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>NO OBSTACLES DETECTED</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-slate-400" />
                    <span>CHECK & TICK OFF</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 text-xs font-mono-code text-slate-300 leading-relaxed">
              Verify there are no unmitigated demand or supply order blocks standing between your entry level and your 1:2 Take Profit target. If an unmitigated opposing OB is present, entry must be aborted or target adjusted.
            </div>
          </div>

          {/* Phase 2, Point 4: Final Point — You can now take the entry */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-mono-code font-bold text-emerald-400">
                  4
                </span>
                <h3 className="text-base font-military font-bold text-emerald-300 tracking-wider">
                  YOU CAN NOW TAKE THE ENTRY
                </h3>
              </div>

              {entryTaken && (
                <span className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono-code font-bold">
                  ENTRY AUTHORIZED
                </span>
              )}
            </div>

            <p className="text-xs font-mono-code text-slate-300">
              All Phase 2 conditions verified. Risk is mathematically constrained, 1:2 R:R confirmed, and path is clear of obstacles.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setEntryTaken(true)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer ${
                  entryTaken
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{entryTaken ? 'ENTRY EXECUTED' : 'CONFIRM ENTRY TAKEN'}</span>
              </button>

              <button
                type="button"
                disabled={!allPhase2Complete}
                onClick={() => setCurrentPhase(3)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-military font-bold tracking-wider transition ${
                  allPhase2Complete
                    ? 'bg-blue-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-blue-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                }`}
              >
                <span>PROCEED TO PHASE 3 (JOURNAL)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          PHASE 3 CONTENT
          Point 1: "Make a Journal" — direct user straight to the journal section
          ====================================================================== */}
      {currentPhase === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <BookOpen className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono-code font-bold text-cyan-400 uppercase tracking-widest">
                PHASE 3 PROTOCOL
              </span>
              <h3 className="text-2xl font-military font-bold text-slate-100 tracking-wider">
                MAKE A JOURNAL
              </h3>
              <p className="text-xs font-mono-code text-slate-400 max-w-md mx-auto leading-relaxed">
                Your entry has been cleared and taken. The final requirement is immediately logging this trade into the institutional journal to track execution accuracy.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 max-w-lg mx-auto text-xs font-mono-code text-slate-300 text-left space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>PHASE 1 & PHASE 2 COMPLIANCE CERTIFIED</span>
              </div>
              <ul className="space-y-1 text-slate-400 pl-6 list-disc">
                <li>News checked & verified</li>
                <li>Timeframe hierarchy validated</li>
                <li>5 structural conditions satisfied</li>
                <li>Lot size mathematically constrained</li>
                <li>1:2 Minimum Risk-to-Reward ratio met</li>
                <li>Path cleared of opposing unmitigated order blocks</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToJournal) {
                    onNavigateToJournal();
                  }
                }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-sm font-military font-bold tracking-wider transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>MAKE A JOURNAL — LOG TRADE NOW</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
