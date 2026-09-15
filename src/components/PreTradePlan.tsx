import React, { useState } from 'react';
import { AccountSettings, Trade, TradingRule } from '../types';
import { formatCurrency, safeNumber } from '../utils/currencyFormatter';
import { calculateForexLotSize } from '../utils/lotSize';
import { getAppDate, getAppTime, formatTo12Hour } from '../utils/time';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Info,
  X,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface PreTradePlanProps {
  account: AccountSettings;
  rules: TradingRule[];
  trades?: Trade[];
  onSaveTrade: (trade: Trade) => Promise<void>;
  onNavigateToJournal?: () => void;
  onNavigateToCalendar?: () => void;
}

export const PreTradePlan: React.FC<PreTradePlanProps> = ({
  account,
  rules,
  trades = [],
  onSaveTrade,
  onNavigateToJournal,
  onNavigateToCalendar,
}) => {
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);

  // Daily trade limit enforcement
  const todayDate = getAppDate();
  const todayTrades = trades.filter((t) => t.date === todayDate);
  const maxDailyTrades = account.maxDailyTrades || 2;
  const isDailyLimitReached = todayTrades.length >= maxDailyTrades;

  // Phase 1 State: Step 1 News
  const [instrument, setInstrument] = useState('XAUUSD');
  const [checkedNews, setCheckedNews] = useState(false);
  const [newsNotes, setNewsNotes] = useState('');

  // Phase 1 State: Step 2 Timeframe
  const [htfTimeframe, setHtfTimeframe] = useState<'Daily' | 'H4' | 'H1'>('H4');
  const [analysisTimeframe, setAnalysisTimeframe] = useState<'H4' | 'H1' | 'M15'>('H1');
  const [entryTimeframe, setEntryTimeframe] = useState<'M15' | 'M5' | 'M1'>('M15');
  const [checkedTimeframe, setCheckedTimeframe] = useState(false);
  const [timeframeNotes, setTimeframeNotes] = useState('');

  // Phase 1 State: Step 3 Five Conditions
  const [condition1, setCondition1] = useState(false); // HTF Direction Confirmed
  const [condition2, setCondition2] = useState(false); // Market Structure Confirmed (BOS/MSS)
  const [condition3, setCondition3] = useState(false); // Entry Model / Setup Confirmed
  const [condition4, setCondition4] = useState(false); // Liquidity / Level Condition Confirmed
  const [condition5, setCondition5] = useState(false); // R:R Acceptable (min 1:2)
  const [tradeReasonNotes, setTradeReasonNotes] = useState('');

  // Phase 2 State: Execution & Risk Math
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('2650.00');
  const [stopLoss, setStopLoss] = useState<string>('2642.00');
  const [takeProfit, setTakeProfit] = useState<string>('2666.00');
  const [riskPercent, setRiskPercent] = useState<number>(account.maxRiskPerTradePercent || 1.0);
  const [isCustomRisk, setIsCustomRisk] = useState(false);
  const [feesCommission, setFeesCommission] = useState<string>('0.00');

  // Phase 3 State: Outcome & Logging
  const [outcome, setOutcome] = useState<'WIN' | 'LOSS' | 'BREAKEVEN'>('WIN');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [actualPnL, setActualPnL] = useState<string>('');
  const [executionQuality, setExecutionQuality] = useState<'A+' | 'A' | 'B' | 'C'>('A');
  const [emotionState, setEmotionState] = useState('DISCIPLINED');
  const [mistakeReason, setMistakeReason] = useState('NONE');
  const [lessonLearned, setLessonLearned] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Mathematical Calculations
  const entryNum = safeNumber(entryPrice, 0);
  const slNum = safeNumber(stopLoss, 0);
  const tpNum = safeNumber(takeProfit, 0);
  const feesNum = safeNumber(feesCommission, 0);

  const activeBalance = account.currentBalance || account.initialBalance || 10000;
  const riskAmountDollars = (activeBalance * (riskPercent || 1.0)) / 100;

  const slDistance = entryNum > 0 && slNum > 0 ? Math.abs(entryNum - slNum) : 0;
  const tpDistance = entryNum > 0 && tpNum > 0 ? Math.abs(tpNum - entryNum) : 0;
  const riskRewardRatio = slDistance > 0 ? tpDistance / slDistance : 0;
  const potentialRewardDollars = riskAmountDollars * (riskRewardRatio || 1);
  const netPotentialReward = potentialRewardDollars - feesNum;

  // Lot Size calculation using unified calculation engine
  const calculatedLots = calculateForexLotSize(
    activeBalance,
    riskPercent,
    slDistance,
    instrument,
    account.currency
  );

  // Automated TP Calculation based on Desired R:R
  const applyAutoTP = (targetRR: number) => {
    if (entryNum <= 0 || slNum <= 0) return;
    const distance = Math.abs(entryNum - slNum);
    if (distance <= 0) return;
    const calculatedTp =
      direction === 'BUY'
        ? entryNum + distance * targetRR
        : entryNum - distance * targetRR;
    setTakeProfit(calculatedTp.toFixed(2));
  };

  // Phase 1 Strict Completion Requirements
  const isPhase1Complete =
    checkedNews &&
    checkedTimeframe &&
    condition1 &&
    condition2 &&
    condition3 &&
    condition4 &&
    condition5 &&
    tradeReasonNotes.trim().length >= 10;

  const isPhase2Valid =
    entryNum > 0 &&
    slNum > 0 &&
    tpNum > 0 &&
    (direction === 'BUY' ? slNum < entryNum && tpNum > entryNum : slNum > entryNum && tpNum < entryNum);

  const handleCompletePhase1 = () => {
    if (!isPhase1Complete) return;
    setCurrentPhase(2);
  };

  const handleCompletePhase2 = () => {
    if (!isPhase2Valid) return;
    setCurrentPhase(3);
    // Suggest default exit and PnL based on outcome selection
    if (!exitPrice) {
      setExitPrice(outcome === 'WIN' ? takeProfit : outcome === 'LOSS' ? stopLoss : entryPrice);
    }
    if (!actualPnL) {
      setActualPnL(
        outcome === 'WIN'
          ? potentialRewardDollars.toFixed(2)
          : outcome === 'LOSS'
          ? (-riskAmountDollars).toFixed(2)
          : '0.00'
      );
    }
  };

  const handleFinalSubmit = async () => {
    if (isDailyLimitReached) {
      alert(`Daily trade limit reached (${todayTrades.length}/${maxDailyTrades} trades). Further executions are locked out for today.`);
      return;
    }
    if (riskPercent > 1.001) {
      alert('Risk exceeds maximum allowed 1.0% per trade ceiling.');
      return;
    }
    setIsSubmitting(true);
    try {
      const pnlNum = safeNumber(actualPnL, outcome === 'WIN' ? potentialRewardDollars : outcome === 'LOSS' ? -riskAmountDollars : 0);
      const exitNum = safeNumber(exitPrice, entryNum);
      const rMultiple = riskAmountDollars > 0 ? pnlNum / riskAmountDollars : 0;

      const newTradeData: Trade = {
        id: `trade-plan-${Date.now()}`,
        accountId: account.id,
        tradeNumber: Date.now(),
        date: todayDate,
        time: getAppTime(),
        broker: account.broker || 'Live Broker',
        accountType: account.accountType || 'LIVE',
        accountSize: account.initialBalance || 10000,
        instrument,
        direction,
        entryPrice: entryNum,
        exitPrice: exitNum,
        stopLoss: slNum,
        takeProfit: tpNum,
        lotSize: calculatedLots.lotSize || 0.1,
        riskAmount: riskAmountDollars,
        riskPercent: riskPercent,
        profitLoss: pnlNum,
        pips: Number((slDistance * 10).toFixed(1)),
        rMultiple: Number(rMultiple.toFixed(2)),
        status: 'CLOSED',
        result: outcome,
        strategy: 'SBT_MODEL',
        htfTrend: direction === 'BUY' ? 'BULLISH' : 'BEARISH',
        ltfTrend: direction === 'BUY' ? 'BULLISH' : 'BEARISH',
        marketStructure: 'BOS',
        alignmentScore: {
          htfDirection: 25,
          marketStructure: 20,
          entryModel: 20,
          riskManagement: 20,
          newsCondition: 15,
          totalQuality: 100,
        },
        preEmotion: (emotionState as any) || 'DISCIPLINED',
        postPsychology: {
          followedPlan: true,
          movedStopLoss: false,
          closedEarly: false,
          overtraded: false,
          revengeTraded: false,
          increasedLotSizeEmotionally: false,
        },
        session: 'LONDON',
        timeframe: (entryTimeframe === 'M15' ? 'M15' : entryTimeframe === 'M5' ? 'M5' : 'M1') as any,
        grade: (executionQuality as any) || 'A',
        notes: `PRE-TRADE PLAN:\nReason: ${tradeReasonNotes}\nNews Notes: ${newsNotes}\nTimeframe Notes: ${timeframeNotes}\n\nPOST-TRADE LESSON: ${lessonLearned}`,
        screenshots: {
          beforeEntry: screenshotUrl || '',
          entry: '',
          afterTrade: '',
        },
        ruleViolation: mistakeReason !== 'NONE' ? 'MINOR' : 'NONE',
        violatedRules: mistakeReason !== 'NONE' ? [mistakeReason] : [],
        mistakeReason: (mistakeReason !== 'NONE' ? mistakeReason : 'None (Flawless)') as any,
      };

      await onSaveTrade(newTradeData);
      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Failed to save planned trade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-military font-bold text-slate-100 tracking-wider">
                PRE-TRADE PLAN & THREE-PHASE SYSTEM
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Phase 1: Verification Checklist • Phase 2: Execution & Risk Engine • Phase 3: Outcome Review & Journal
              </p>
            </div>
          </div>
        </div>

        {/* Active Account Authoritative Balance */}
        <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl font-mono-code text-xs">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Account Authoritative Balance</div>
          <div className="text-sm font-bold text-emerald-400">
            {formatCurrency(activeBalance, account.currency)} <span className="text-xs text-slate-400 font-normal">({account.accountName})</span>
          </div>
        </div>
      </div>

      {/* Daily Trade Limit Lockout Banner */}
      {isDailyLimitReached && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-military font-bold text-rose-400 uppercase tracking-wider">
              DAILY TRADE LIMIT REACHED ({todayTrades.length}/{maxDailyTrades} EXECUTIONS TODAY)
            </h4>
            <p className="text-[11px] text-rose-300/80 font-mono-code leading-relaxed">
              Institutional risk management rule enforced: You have completed the maximum allowed {maxDailyTrades} trades for today's session. In accordance with capital preservation discipline, new live journal entries are restricted until the next trading day.
            </p>
          </div>
        </div>
      )}

      {/* Phase Navigation Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: 1, title: 'PHASE 1: PRE-TRADE PLAN', desc: 'News • Timeframe • 5 Conditions' },
          { num: 2, title: 'PHASE 2: EXECUTION', desc: 'Risk Engine • Auto-TP • Lot Size' },
          { num: 3, title: 'PHASE 3: OUTCOME & REVIEW', desc: 'Result • Exit • Direct Journal Save' },
        ].map((p) => {
          const isActive = currentPhase === p.num;
          const isDone = currentPhase > p.num;
          const canClick = p.num === 1 || (p.num === 2 && isPhase1Complete) || (p.num === 3 && isPhase2Valid);
          return (
            <button
              key={p.num}
              type="button"
              disabled={!canClick}
              onClick={() => {
                if (canClick) setCurrentPhase(p.num as any);
              }}
              className={`p-3.5 rounded-xl border transition text-left ${
                isActive
                  ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10'
                  : isDone
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                  : canClick
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/60 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-military font-bold">
                <span className={isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-slate-400'}>
                  {p.title}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-mono-code text-slate-500">PHASE 0{p.num}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono-code mt-0.5">{p.desc}</div>
            </button>
          );
        })}
      </div>

      {/* SUCCESS CONFIRMATION STATE */}
      {submittedSuccess ? (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-military font-bold text-slate-100">
            TRADE LOGGED WITH COMPLETE THREE-PHASE PRE-TRADE DISCIPLINE
          </h3>
          <p className="text-xs text-slate-300 font-mono-code max-w-md mx-auto leading-relaxed">
            Your trade plan, risk metrics, and post-trade review have been safely persisted into your authoritative account journal. It is immediately visible in Trade Journal, Performance Lab, and Dashboard.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setCurrentPhase(1);
                setCheckedNews(false);
                setCheckedTimeframe(false);
                setCondition1(false);
                setCondition2(false);
                setCondition3(false);
                setCondition4(false);
                setCondition5(false);
                setTradeReasonNotes('');
                setLessonLearned('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-military font-bold text-xs transition"
            >
              PLAN NEXT TRADE
            </button>
            {onNavigateToJournal && (
              <button
                onClick={onNavigateToJournal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs transition shadow-lg shadow-amber-500/20"
              >
                VIEW IN TRADE JOURNAL ➔
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ==================================================== */}
          {/* PHASE 1: PRE-TRADE PLAN — 3 SEQUENTIAL STEPS         */}
          {/* ==================================================== */}
          {currentPhase === 1 && (
            <div className="space-y-5">
              {/* Instrument Selection Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-military font-bold text-slate-300 uppercase">Target Instrument:</span>
                  <select
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono-code font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="XAUUSD">XAUUSD (Gold / USD)</option>
                    <option value="EURUSD">EURUSD (Euro / USD)</option>
                    <option value="GBPUSD">GBPUSD (Pound / USD)</option>
                    <option value="US30">US30 (Dow Jones)</option>
                    <option value="NAS100">NAS100 (Nasdaq 100)</option>
                    <option value="USDJPY">USDJPY (USD / Yen)</option>
                    <option value="BTCUSD">BTCUSD (Bitcoin)</option>
                  </select>
                </div>

                {isPhase1Complete ? (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-military font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PHASE 1 COMPLETE</span>
                  </div>
                ) : (
                  <div className="text-xs font-mono-code text-amber-400/80">
                    * Complete all 3 sequential steps below to unlock Phase 2
                  </div>
                )}
              </div>

              {/* STEP 1: CHECK ECONOMIC CALENDAR FOR HIGH-IMPACT NEWS */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span>STEP 1: CHECK ECONOMIC CALENDAR FOR HIGH-IMPACT NEWS</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono-code text-[10px] border border-rose-500/30">
                          MANDATORY FILTER
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono-code">
                        Institutional Directive: Never trade into unpredictable high-impact volatility spikes without explicit strategy rules.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/40 cursor-pointer text-xs font-mono-code font-bold text-amber-300 hover:bg-amber-500/15 transition">
                    <input
                      type="checkbox"
                      checked={checkedNews}
                      onChange={(e) => setCheckedNews(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950 cursor-pointer"
                    />
                    <span>[✓] I have verified the economic calendar and confirmed no conflicting high-impact news</span>
                  </label>
                </div>

                {/* Professional Guidance & Rules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-bold font-military mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>1. RED-FOLDER IMPACT EVENTS</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Check for upcoming <strong className="text-slate-200">USD, EUR, GBP, JPY</strong> high-impact catalysts (CPI, Non-Farm Payrolls, FOMC interest rates, GDP, PMI) that directly affect <strong className="text-amber-400">{instrument}</strong>.
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-mono-code text-slate-500 border-t border-slate-900 pt-1.5">
                      Rule: Minimum 30m execution buffer before/after release
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-military mb-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>2. TIME & SPREAD EXPANSION</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Broker spreads widen dramatically (often 5x to 20x) during data releases. Slippage can bypass stop losses and invalidate risk limits.
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-mono-code text-slate-500 border-t border-slate-900 pt-1.5">
                      Check: Exact release time in your local timezone
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sky-400 text-xs font-bold font-military mb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>3. STRATEGY INVALIDATION</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        If a high-impact release falls inside your trade's expected duration, either delay entry until volatility settles or reduce risk by 50%+.
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-mono-code text-slate-500 border-t border-slate-900 pt-1.5">
                      Discipline: Protect capital before chasing moves
                    </div>
                  </div>
                </div>

                {/* Calendar Access & Quick Links */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-mono-code">
                      Real-Time Live Calendar Verification:
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onNavigateToCalendar && (
                      <button
                        type="button"
                        onClick={onNavigateToCalendar}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>OPEN ECONOMIC CALENDAR TAB</span>
                      </button>
                    )}

                    <a
                      href="https://www.forexfactory.com/calendar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono-code flex items-center gap-1 transition"
                      title="Forex Factory Live Calendar"
                    >
                      <span>Forex Factory</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <a
                      href="https://www.investing.com/economic-calendar/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono-code flex items-center gap-1 transition"
                      title="Investing.com Live Economic Calendar"
                    >
                      <span>Investing.com</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <a
                      href="https://www.dailyfx.com/economic-calendar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono-code flex items-center gap-1 transition"
                      title="DailyFX Calendar"
                    >
                      <span>DailyFX</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase block mb-1">
                    News & Economic Context Verification Log (Optional)
                  </label>
                  <input
                    type="text"
                    value={newsNotes}
                    onChange={(e) => setNewsNotes(e.target.value)}
                    placeholder={`e.g. Checked economic calendar — no high-impact red events scheduled for ${instrument} during the session.`}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* STEP 2: CHECK TIMEFRAME */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                        STEP 2: CHECK MULTI-TIMEFRAME ALIGNMENT
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono-code">
                        Higher Timeframe (HTF) • Intermediate Analysis • Lower Timeframe (LTF) Execution
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 cursor-pointer text-xs font-mono-code font-bold text-sky-300">
                    <input
                      type="checkbox"
                      checked={checkedTimeframe}
                      onChange={(e) => setCheckedTimeframe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-400 bg-slate-950 cursor-pointer"
                    />
                    <span>[✓] Timeframe Alignment Checked</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <label className="text-[10px] font-mono-code text-slate-400 uppercase block mb-1">
                      1. Higher Timeframe (HTF Bias)
                    </label>
                    <select
                      value={htfTimeframe}
                      onChange={(e) => setHtfTimeframe(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono-code font-bold"
                    >
                      <option value="Daily">Daily (Major Trend & Liquidity)</option>
                      <option value="H4">H4 (Institutional Order Flow)</option>
                      <option value="H1">H1 (Intermediate Structure)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <label className="text-[10px] font-mono-code text-slate-400 uppercase block mb-1">
                      2. Analysis Timeframe (POI / Setup)
                    </label>
                    <select
                      value={analysisTimeframe}
                      onChange={(e) => setAnalysisTimeframe(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono-code font-bold"
                    >
                      <option value="H4">H4 (Key Supply/Demand)</option>
                      <option value="H1">H1 (PD Array / FVG Zone)</option>
                      <option value="M15">M15 (Structure Shift / Liquidity)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <label className="text-[10px] font-mono-code text-slate-400 uppercase block mb-1">
                      3. Entry Timeframe (Precision Trigger)
                    </label>
                    <select
                      value={entryTimeframe}
                      onChange={(e) => setEntryTimeframe(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono-code font-bold"
                    >
                      <option value="M15">M15 (Conservative Entry)</option>
                      <option value="M5">M5 (Standard Trigger)</option>
                      <option value="M1">M1 (Sniper Invalidation Entry)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase block mb-1">
                    Timeframe Analysis Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={timeframeNotes}
                    onChange={(e) => setTimeframeNotes(e.target.value)}
                    placeholder="e.g. Daily is bullish; H4 pulled back to equilibrium; M15 created MSS to upside."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono-code focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* STEP 3: CHECK FIVE CONDITIONS */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                      STEP 3: CHECK FIVE MANDATORY CONDITIONS
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono-code">
                      All five conditions must be individually confirmed before proceeding to execution
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 font-mono-code text-xs">
                  {[
                    {
                      num: 1,
                      state: condition1,
                      set: setCondition1,
                      label: '1. HTF Direction Confirmed',
                      desc: 'Bullish or bearish alignment between Higher Timeframe bias and trade direction.',
                    },
                    {
                      num: 2,
                      state: condition2,
                      set: setCondition2,
                      label: '2. Market Structure Confirmed',
                      desc: 'Clear Break of Structure (BOS), Market Structure Shift (MSS), or confirmed trend continuation.',
                    },
                    {
                      num: 3,
                      state: condition3,
                      set: setCondition3,
                      label: '3. Entry Model / Setup Confirmed',
                      desc: 'Clear institutional setup model identified (Fair Value Gap, Order Block, SBT Model, or Liquidity sweep).',
                    },
                    {
                      num: 4,
                      state: condition4,
                      set: setCondition4,
                      label: '4. Liquidity / Level Condition Confirmed',
                      desc: 'Key Asian high/low, session high/low, or previous day high/low swept, and POI reached.',
                    },
                    {
                      num: 5,
                      state: condition5,
                      set: setCondition5,
                      label: '5. R:R Acceptable',
                      desc: 'Planned setup offers minimum 1:2 (or higher) risk-to-reward ratio with logical target.',
                    },
                  ].map((cond) => (
                    <label
                      key={cond.num}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        cond.state
                          ? 'bg-emerald-950/25 border-emerald-500/50 text-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={cond.state}
                        onChange={(e) => cond.set(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 bg-slate-900 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span className={cond.state ? 'text-emerald-400' : 'text-slate-200'}>
                            {cond.label}
                          </span>
                          {cond.state && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{cond.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Question: "Why am I taking this trade?" */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-military font-bold text-amber-400 uppercase flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>MANDATORY REASONING: "WHY AM I TAKING THIS TRADE?"</span>
                  </label>
                  <textarea
                    value={tradeReasonNotes}
                    onChange={(e) => setTradeReasonNotes(e.target.value)}
                    placeholder="Articulate the exact setup thesis: Which liquidity pool was taken? What is the institutional draw on liquidity? Why is your stop loss anchored where it is?"
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono-code focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] font-mono-code text-slate-500 text-right">
                    {tradeReasonNotes.trim().length >= 10 ? (
                      <span className="text-emerald-400">✓ Thesis verified</span>
                    ) : (
                      <span>Minimum 10 characters required ({tradeReasonNotes.trim().length}/10)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Phase 1 Completion & Advance Button */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-mono-code">
                  {isPhase1Complete ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      PHASE 1 COMPLETE — Ready for Phase 2 Execution & Risk Engine
                    </span>
                  ) : (
                    <span className="text-amber-400/80">
                      Gated: News, Timeframe, all 5 Conditions, and Thesis must be confirmed
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!isPhase1Complete}
                  onClick={handleCompletePhase1}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-military font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <span>ADVANCE TO PHASE 2 (EXECUTION)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* PHASE 2: EXECUTION & UNIFIED RISK ENGINE              */}
          {/* ==================================================== */}
          {currentPhase === 2 && (
            <div className="space-y-5">
              {/* Order Direction Selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-military font-bold text-slate-300 uppercase">
                    ORDER DIRECTION:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('BUY')}
                      className={`px-4 py-2 rounded-lg font-military font-bold text-xs flex items-center gap-1.5 transition ${
                        direction === 'BUY'
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>BUY / LONG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SELL')}
                      className={`px-4 py-2 rounded-lg font-military font-bold text-xs flex items-center gap-1.5 transition ${
                        direction === 'SELL'
                          ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      <span>SELL / SHORT</span>
                    </button>
                  </div>
                </div>

                {/* Instrument Confirmation */}
                <div className="font-mono-code text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                  Target: <span className="text-amber-400 font-bold">{instrument}</span> • Timeframe: <span className="text-sky-400 font-bold">{entryTimeframe}</span>
                </div>
              </div>

              {/* Price Entry & Auto-TP Matrix */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-code">
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase block mb-1 font-bold">
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-rose-400 uppercase block mb-1 font-bold">
                      Stop Loss (SL)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-rose-500/50 rounded-lg text-rose-300 text-sm font-bold focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-emerald-400 uppercase font-bold">
                        Take Profit (TP)
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono-code">Auto-Calculate:</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* TP Quick R:R Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono-code text-xs">
                  <span className="text-slate-400">TP Auto-Calculation Presets:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '1:1 R:R', rr: 1 },
                      { label: '1:2 R:R', rr: 2 },
                      { label: '1:2.5 R:R', rr: 2.5 },
                      { label: '1:3 R:R', rr: 3 },
                      { label: '1:4 R:R', rr: 4 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyAutoTP(p.rr)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 text-slate-300 text-xs transition cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk % Selector (Quick Presets) */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 uppercase font-mono-code block font-bold">
                        Risk Percentage Allocation (Max 1.0% Rule)
                      </label>
                      <p className="text-[10px] text-slate-500 font-mono-code">
                        Strict 1% max capital protection rule per trade (Calculated on active balance)
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setRiskPercent(pct);
                            setIsCustomRisk(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold transition ${
                            riskPercent === pct && !isCustomRisk
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsCustomRisk(true)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold transition ${
                          isCustomRisk
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {isCustomRisk && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <label className="text-xs font-mono-code text-slate-400">Custom Risk % (Max 1.0%):</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="1.0"
                        value={riskPercent}
                        onChange={(e) => {
                          const val = safeNumber(e.target.value, 1.0);
                          setRiskPercent(Math.min(1.0, Math.max(0.05, val)));
                        }}
                        className="w-24 px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono-code font-bold text-xs"
                      />
                    </div>
                  )}

                  {/* Fees & Commission (Optional) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-mono-code text-xs">
                    <span className="text-slate-400">Estimated Fees / Commission ($):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={feesCommission}
                      onChange={(e) => setFeesCommission(e.target.value)}
                      className="w-24 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-right font-mono-code"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Mathematical Engine Authoritative Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 font-mono-code space-y-2.5">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Authoritative Risk Amount:</span>
                    <span className="text-sm font-bold text-rose-400">
                      {formatCurrency(riskAmountDollars, account.currency)} ({riskPercent}% of balance)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Calculated Recommended Position Size:</span>
                    <span className="text-sm font-bold text-amber-400">
                      {calculatedLots.lotSize.toFixed(2)} Lots
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Risk / Reward Ratio:</span>
                    <span className="text-sm font-bold text-sky-400">
                      1:{riskRewardRatio.toFixed(2)} R
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">
                      {feesNum > 0 ? 'Potential Net Reward (After Fees):' : 'Potential Reward Target (Before Fees):'}
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formatCurrency(feesNum > 0 ? netPotentialReward : potentialRewardDollars, account.currency)}
                    </span>
                  </div>

                  {/* Summary Statement */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-mono-code leading-relaxed">
                    <strong>CALCULATED DISCIPLINE DIRECTIVE: </strong>
                    You are risking {riskPercent}% ({formatCurrency(riskAmountDollars, account.currency)}). At 1:{riskRewardRatio.toFixed(1)} R:R, your potential reward is {formatCurrency(potentialRewardDollars, account.currency)}.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCurrentPhase(1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-military font-bold cursor-pointer"
                >
                  ← BACK TO PHASE 1
                </button>

                <button
                  type="button"
                  disabled={!isPhase2Valid}
                  onClick={handleCompletePhase2}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-military font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <span>ADVANCE TO PHASE 3 (OUTCOME & REVIEW)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* PHASE 3: OUTCOME, REVIEW & JOURNAL PERSISTENCE        */}
          {/* ==================================================== */}
          {currentPhase === 3 && (
            <div className="space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                    PHASE 3: OUTCOME AUDIT & POST-TRADE REVIEW
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono-code">
                    Record final outcome and execution discipline for authoritative storage
                  </p>
                </div>

                {/* Outcome Toggle: WIN / LOSS / BREAKEVEN */}
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase block mb-2 font-bold">
                    Trade Result Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'WIN', label: '✓ WIN (+)', color: 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20' },
                      { id: 'LOSS', label: '✗ LOSS (-)', color: 'bg-rose-500 text-slate-100 border-rose-400 shadow-rose-500/20' },
                      { id: 'BREAKEVEN', label: '— BREAKEVEN (0)', color: 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setOutcome(o.id as any);
                          if (o.id === 'WIN') {
                            setExitPrice(takeProfit);
                            setActualPnL(potentialRewardDollars.toFixed(2));
                          } else if (o.id === 'LOSS') {
                            setExitPrice(stopLoss);
                            setActualPnL((-riskAmountDollars).toFixed(2));
                          } else {
                            setExitPrice(entryPrice);
                            setActualPnL('0.00');
                          }
                        }}
                        className={`py-2.5 rounded-xl font-military font-bold text-xs border transition cursor-pointer ${
                          outcome === o.id
                            ? `${o.color} shadow-lg font-extrabold`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actual Exit & P/L */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-code">
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase block mb-1">
                      Actual Exit Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 uppercase block mb-1">
                      Actual Realized P/L ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={actualPnL}
                      onChange={(e) => setActualPnL(e.target.value)}
                      className={`w-full px-3 py-2 bg-slate-950 border rounded-lg text-sm font-bold focus:outline-none ${
                        outcome === 'WIN'
                          ? 'border-emerald-500/50 text-emerald-300'
                          : outcome === 'LOSS'
                          ? 'border-rose-500/50 text-rose-300'
                          : 'border-slate-700 text-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Execution Grade & Emotional State & Rule Violations */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono-code text-slate-400 uppercase block mb-1">
                      Execution Quality Grade
                    </label>
                    <select
                      value={executionQuality}
                      onChange={(e) => setExecutionQuality(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono-code"
                    >
                      <option value="A+">A+ (Flawless plan adherence)</option>
                      <option value="A">A (Followed all rules)</option>
                      <option value="B">B (Minor hesitation/delay)</option>
                      <option value="C">C (Rule violation / premature exit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono-code text-slate-400 uppercase block mb-1">
                      Emotional State During Trade
                    </label>
                    <select
                      value={emotionState}
                      onChange={(e) => setEmotionState(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono-code"
                    >
                      <option value="DISCIPLINED">Disciplined</option>
                      <option value="CALM">Calm</option>
                      <option value="ANXIOUS">Anxious</option>
                      <option value="FOMO">FOMO</option>
                      <option value="IMPATIENT">Impatient</option>
                      <option value="REVENGE">Revenge urge</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono-code text-slate-400 uppercase block mb-1">
                      Mistake / Violation (If Any)
                    </label>
                    <select
                      value={mistakeReason}
                      onChange={(e) => setMistakeReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono-code"
                    >
                      <option value="NONE">None (Flawless Execution)</option>
                      <option value="WRONG_DIRECTION">Wrong market direction</option>
                      <option value="MOVED_STOP_LOSS">Moved stop loss</option>
                      <option value="EARLY_EXIT">Exited prematurely</option>
                      <option value="NEWS_VOLATILITY">News spike caught position</option>
                      <option value="LATE_ENTRY">Late entry / Chased</option>
                    </select>
                  </div>
                </div>

                {/* Key Lesson Learned */}
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase block mb-1">
                    Key Lesson Learned From This Trade
                  </label>
                  <input
                    type="text"
                    value={lessonLearned}
                    onChange={(e) => setLessonLearned(e.target.value)}
                    placeholder="e.g. Setting TP at the 4H liquidity pool allowed the full trade to play out smoothly."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono-code focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Screenshot URL (Optional) */}
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase block mb-1">
                    Screenshot URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://example.com/screenshot.png"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono-code focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCurrentPhase(2)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-military font-bold cursor-pointer"
                >
                  ← BACK TO PHASE 2
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'SAVING TO JOURNAL...' : 'SAVE TO TRADE JOURNAL'}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
