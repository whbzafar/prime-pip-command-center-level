import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Crosshair,
  Camera,
  AlertTriangle,
  Brain,
  Shield,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Info,
  Layers,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Trade,
  TradeDirection,
  AccountType,
  StrategyType,
  SBTStrategyModel,
  Timeframe,
  TrendDirection,
  MarketStructureElement,
  TradingSession,
  EmotionState,
  TradeGrade,
  RuleViolationLevel,
  MistakeReason,
  TradingRule,
  AccountSettings,
  PreTradeChecklist,
} from '../types';
import { InstrumentCombobox } from './InstrumentCombobox';
import { calculateTradeQualityScore, calculateNextTradeReadiness } from '../utils/readinessEngine';
import { formatCurrency } from '../utils/currencyFormatter';
import {
  getKarachiDate,
  getKarachiTime,
  getKarachiTime24,
  formatTo12Hour,
  getKarachiTimestamp,
  APP_TIMEZONE_LABEL,
  APP_TIMEZONE_FULL_LABEL,
} from '../utils/time';

interface TradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Trade) => void;
  rules: TradingRule[];
  account: AccountSettings;
  tradeCount: number;
  existingTrades?: Trade[];
  initialInstrument?: string;
  onInstrumentChange?: (instrument: string) => void;
  onOpenPreTradePlan?: () => void;
  onOpenAiScanner?: () => void;
  prefilledTradeData?: Partial<Trade> | null;
}

export const SBT_STRATEGY_MODELS: SBTStrategyModel[] = [
  'SBT Model 1',
  'SBT Model 2',
  'SBT Model 3',
  'SBT Model 4',
  'SBT Model 5',
  'SBT Model 6',
  'SBT Model 7',
  'SBT Model 8',
  'SBT Model 9',
  'SBT Model 10',
];

const EMOTIONS: { state: EmotionState; emoji: string; label: string }[] = [
  { state: 'CONFIDENT', emoji: '😎', label: 'Confident' },
  { state: 'NEUTRAL', emoji: '😐', label: 'Neutral' },
  { state: 'EXCITED', emoji: '🔥', label: 'Excited' },
  { state: 'FEARFUL', emoji: '😨', label: 'Fearful' },
  { state: 'ANGRY', emoji: '😤', label: 'Angry' },
  { state: 'GREEDY', emoji: '🤑', label: 'Greedy' },
  { state: 'STRESSED', emoji: '😓', label: 'Stressed' },
  { state: 'TIRED', emoji: '😴', label: 'Tired' },
];

const MISTAKES: MistakeReason[] = [
  'None (Flawless)',
  'Wrong Direction',
  'Early Entry',
  'Late Entry',
  'FOMO',
  'Revenge Trading',
  'No Confirmation',
  'High-Impact News',
  'Poor Risk Management',
  'Emotional Trade',
  'Overtrading',
  'Moved Stop Loss',
  'Closed Early',
];

export const TradeEntryModal: React.FC<TradeEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveTrade,
  rules,
  account,
  tradeCount,
  existingTrades,
  initialInstrument,
  onInstrumentChange,
  onOpenPreTradePlan,
  onOpenAiScanner,
  prefilledTradeData,
}) => {
  const nextTradeNumber = tradeCount + 1;
  const defaultId = `TRD-${110 + tradeCount}`;

  // Form State
  const [tradeId, setTradeId] = useState(defaultId);
  const [date, setDate] = useState(() => getKarachiDate());
  const [time, setTime] = useState(() => getKarachiTime24());
  const [broker, setBroker] = useState(account.broker || 'Eightcap (RAW)');
  const [accountType, setAccountType] = useState<AccountType>(account.accountType);
  const [instrument, setInstrument] = useState(initialInstrument || 'XAUUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [timeframe, setTimeframe] = useState<Timeframe>('M15');
  const [session, setSession] = useState<TradingSession>('LONDON');

  // Sync with initialInstrument if provided
  React.useEffect(() => {
    if (initialInstrument && initialInstrument !== instrument) {
      setInstrument(initialInstrument);
    }
  }, [initialInstrument]);

  React.useEffect(() => {
    if (!prefilledTradeData) return;
    if (prefilledTradeData.instrument) {
      setInstrument(prefilledTradeData.instrument);
      onInstrumentChange?.(prefilledTradeData.instrument);
    }
    if (prefilledTradeData.direction) setDirection(prefilledTradeData.direction);
    if (typeof prefilledTradeData.entryPrice === 'number') setEntryPrice(prefilledTradeData.entryPrice);
    if (typeof prefilledTradeData.stopLoss === 'number') setStopLoss(prefilledTradeData.stopLoss);
    if (typeof prefilledTradeData.takeProfit === 'number') setTakeProfit(prefilledTradeData.takeProfit);
    if (prefilledTradeData.timeframe && ['M1','M5','M15','M30','H1','H4','D1'].includes(prefilledTradeData.timeframe)) {
      setTimeframe(prefilledTradeData.timeframe as Timeframe);
    }
    if (prefilledTradeData.notes) setNotes(prefilledTradeData.notes);
    if (prefilledTradeData.screenshots?.entry) setEntryUrl(prefilledTradeData.screenshots.entry);
  }, [prefilledTradeData, onInstrumentChange]);

  // Execution
  const [entryPrice, setEntryPrice] = useState<number>(2485.5);
  const [stopLoss, setStopLoss] = useState<number>(2481.0);
  const [takeProfit, setTakeProfit] = useState<number>(2499.0);
  const [exitPrice, setExitPrice] = useState<number>(2499.0);
  const [lotSize, setLotSize] = useState<number>(2.2);
  const [tradeResult, setTradeResult] = useState<'WIN' | 'LOSS' | 'BREAKEVEN'>('WIN');

  // Strategy & Structure
  const [strategy, setStrategy] = useState<StrategyType>('SBT Model 1');
  const [htfTrend, setHtfTrend] = useState<TrendDirection>('BULLISH');
  const [ltfTrend, setLtfTrend] = useState<TrendDirection>('BULLISH');
  const [marketStructure, setMarketStructure] = useState<MarketStructureElement>('Liquidity Sweep');

  // Trade Alignment Score components
  const [scoreHtf, setScoreHtf] = useState(25); // max 25
  const [scoreMs, setScoreMs] = useState(20); // max 20
  const [scoreEm, setScoreEm] = useState(20); // max 20
  const [scoreRm, setScoreRm] = useState(20); // max 20
  const [scoreNews, setScoreNews] = useState(15); // max 15

  // Psychology
  const [preEmotion, setPreEmotion] = useState<EmotionState>('CONFIDENT');
  const [followedPlan, setFollowedPlan] = useState(true);
  const [movedStopLoss, setMovedStopLoss] = useState(false);
  const [closedEarly, setClosedEarly] = useState(false);
  const [overtraded, setOvertraded] = useState(false);
  const [revengeTraded, setRevengeTraded] = useState(false);
  const [increasedLotSize, setIncreasedLotSize] = useState(false);

  // Rules & Mistakes
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [mistakeReason, setMistakeReason] = useState<MistakeReason>('None (Flawless)');
  const [grade, setGrade] = useState<TradeGrade>('A+');
  const [notes, setNotes] = useState('');

  // Screenshots
  const [beforeEntryUrl, setBeforeEntryUrl] = useState('');
  const [entryUrl, setEntryUrl] = useState('');
  const [afterTradeUrl, setAfterTradeUrl] = useState('');
  const [htfAnalysisUrl, setHtfAnalysisUrl] = useState('');

  // AI Vision audit states
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<{
    qualityScore: number;
    verdict: string;
    critique: string;
  } | null>(null);

  const [aiTradeScan, setAiTradeScan] = useState<{
    instrument?: string;
    direction?: TradeDirection;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    timeframe?: Timeframe;
    confidence?: number;
    notes?: string;
  } | null>(null);
  const [aiTradeScanning, setAiTradeScanning] = useState(false);
  const [aiTradeScanError, setAiTradeScanError] = useState<string | null>(null);

  // Optional Pre-Trade Checklist State
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Loss / Win Analysis System State (Master Prompt Section 12)
  const [lossPrimaryReason, setLossPrimaryReason] = useState<string>('Strategy mistake');
  const [lossSecondaryReasons, setLossSecondaryReasons] = useState<string[]>([]);
  const [winPrimaryReason, setWinPrimaryReason] = useState<string>('Valid strategy');
  const [winSecondaryReasons, setWinSecondaryReasons] = useState<string[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState<string>('');

  const [checklist, setChecklist] = useState<Omit<PreTradeChecklist, 'completedCount'>>({
    htfTrendAligned: false,
    marketStructureBreak: false,
    liquiditySwept: false,
    properRiskReward: false,
    noHighImpactNews: false,
    calmPsychology: false,
    positionSizeCalculated: false,
    stopLossAtLogicalLevel: false,
  });

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const totalChecklistItems = 8;

  const preReadiness = calculateNextTradeReadiness(existingTrades || [], account);

  // Auto Calculations
  const riskAmount = Math.max(1, Math.abs(entryPrice - stopLoss) * lotSize * (instrument.includes('XAU') ? 100 : 1000));
  const profitLoss = direction === 'BUY'
    ? (exitPrice - entryPrice) * lotSize * (instrument.includes('XAU') ? 100 : 1000)
    : (entryPrice - exitPrice) * lotSize * (instrument.includes('XAU') ? 100 : 1000);
  const rMultiple = riskAmount > 0 ? Number((profitLoss / riskAmount).toFixed(1)) : 0;
  const pips = direction === 'BUY' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);

  const calculatedRiskPercent = account.initialBalance > 0
    ? Number(((riskAmount / account.initialBalance) * 100).toFixed(2))
    : account.maxRiskPerTrade;

  const tradeEntryDate = date || getKarachiDate();
  const todayTradesCount = (existingTrades || []).filter((t) => t.date === tradeEntryDate).length;
  const isRiskExceeded = calculatedRiskPercent > 1.001;
  const isDailyLimitReached = todayTradesCount >= 2;

  const qualityScoreResult = calculateTradeQualityScore({
    htfAlignment: (htfTrend === 'BULLISH' && direction === 'BUY') || (htfTrend === 'BEARISH' && direction === 'SELL'),
    entryModel: strategy,
    riskRewardRatio: Math.max(0, rMultiple),
    riskPercent: calculatedRiskPercent,
    maxAllowedRiskPercent: account.maxRiskPerTrade || 1,
    preEmotion,
    followedPlan,
  });

  const totalQualityScore = qualityScoreResult.totalQuality;
  const suggestedGrade: TradeGrade =
    totalQualityScore >= 90 ? 'A+' : totalQualityScore >= 80 ? 'A' : totalQualityScore >= 65 ? 'B' : totalQualityScore >= 50 ? 'C' : 'F';

  const qualityFeedback: string[] = [];
  if (qualityScoreResult.htfAlignmentScore >= 18) qualityFeedback.push('HTF Trend aligned with market structure');
  else qualityFeedback.push('HTF Trend counter to execution direction');
  if (qualityScoreResult.riskComplianceScore >= 18) qualityFeedback.push('Risk strictly within account allocation');
  else qualityFeedback.push('Risk exceeds recommended threshold');
  if (qualityScoreResult.psychologyScore >= 16) qualityFeedback.push('Optimal composed psychological state');
  else qualityFeedback.push('Elevated emotional state detected');

  // Auto derive violation level
  let ruleViolationLevel: RuleViolationLevel = 'NONE';
  if (selectedViolations.length > 0 || revengeTraded || overtraded || movedStopLoss) {
    ruleViolationLevel = revengeTraded || movedStopLoss || selectedViolations.some(v => v.includes('Major') || v.includes('Cap')) ? 'MAJOR' : 'MINOR';
  }

  // Handle image upload helper
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setter(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Optional AI trade extraction from the uploaded screenshot.
  // The AI returns detected values only; the trader must verify before saving.
  const runAiTradeScanner = async (imageUrl: string) => {
    if (!imageUrl) return;
    setAiTradeScanning(true);
    setAiTradeScanError(null);
    try {
      const res = await fetch('/api/gemini/scan-trade-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.analysis) {
        throw new Error(data.error || 'AI scanner could not analyze this image.');
      }
      const a = data.analysis;
      const detected: typeof aiTradeScan = {
        instrument: typeof a.instrument === 'string' ? a.instrument.toUpperCase().replace(/\//g, '') : undefined,
        direction: a.direction === 'BUY' || a.direction === 'SELL' ? a.direction : undefined,
        entryPrice: typeof a.entryPrice === 'number' ? a.entryPrice : undefined,
        stopLoss: typeof a.stopLoss === 'number' ? a.stopLoss : undefined,
        takeProfit: typeof a.takeProfit === 'number' ? a.takeProfit : undefined,
        timeframe: ['M1','M5','M15','M30','H1','H4','D1'].includes(a.timeframe) ? a.timeframe : undefined,
        confidence: typeof a.confidence === 'number' ? a.confidence : undefined,
        notes: typeof a.notes === 'string' ? a.notes : undefined,
      };
      setAiTradeScan(detected);
      if (detected.instrument) {
        setInstrument(detected.instrument);
        onInstrumentChange?.(detected.instrument);
      }
      if (detected.direction) setDirection(detected.direction);
      if (detected.entryPrice !== undefined) setEntryPrice(detected.entryPrice);
      if (detected.stopLoss !== undefined) setStopLoss(detected.stopLoss);
      if (detected.takeProfit !== undefined) setTakeProfit(detected.takeProfit);
      if (detected.timeframe) setTimeframe(detected.timeframe);
      if (detected.notes) setNotes((prev) => prev ? `${prev}\n\n[AI SCANNER] ${detected.notes}` : `[AI SCANNER] ${detected.notes}`);
    } catch (err) {
      setAiTradeScan(null);
      setAiTradeScanError(err instanceof Error ? err.message : 'AI scanner failed. Please try again.');
    } finally {
      setAiTradeScanning(false);
    }
  };

  // Run AI Vision Chart audit
  const runAiScreenshotAudit = async (imageUrl: string) => {
    if (!imageUrl) return;
    setAiAuditing(true);
    try {
      const res = await fetch('/api/gemini/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageUrl,
          stage: 'entry_audit',
          tradeData: {
            pair: instrument,
            direction,
            strategy,
            entryPrice,
            stopLoss,
            takeProfit,
            htfTrend,
            ltfTrend,
            structure: marketStructure,
          },
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAiAuditResult({
          qualityScore: data.analysis.qualityScore || totalQualityScore,
          verdict: data.analysis.verdict || 'Analysis Complete',
          critique: typeof data.analysis.critique === 'string'
            ? data.analysis.critique
            : JSON.stringify(data.analysis.critique),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiAuditing(false);
    }
  };

  const handleSave = () => {
    // Risk validation and daily limit checks are logged as warnings and do NOT block journal entry creation
    setSubmissionError(null);

    const formattedTime = formatTo12Hour(time) || getKarachiTime();

    // Map loss/win analysis reason to mistakeReason if applicable
    let finalMistakeReason: MistakeReason = mistakeReason;
    if (tradeResult === 'LOSS') {
      if (lossPrimaryReason === 'Strategy mistake') finalMistakeReason = 'Strategy Mistake';
      else if (lossPrimaryReason === 'Poor entry') finalMistakeReason = 'Poor Entry';
      else if (lossPrimaryReason === 'Poor exit') finalMistakeReason = 'Poor Exit';
      else if (lossPrimaryReason === 'Risk management mistake') finalMistakeReason = 'Poor Risk Management';
      else if (lossPrimaryReason === 'Stop-loss mistake') finalMistakeReason = 'Stop Loss Mistake';
      else if (lossPrimaryReason === 'Fear') finalMistakeReason = 'Fear';
      else if (lossPrimaryReason === 'Greed') finalMistakeReason = 'Greed';
      else if (lossPrimaryReason === 'FOMO') finalMistakeReason = 'FOMO';
      else if (lossPrimaryReason === 'Revenge trading') finalMistakeReason = 'Revenge Trading';
      else if (lossPrimaryReason === 'Overtrading') finalMistakeReason = 'Overtrading';
      else if (lossPrimaryReason === 'News') finalMistakeReason = 'High-Impact News';
      else if (lossPrimaryReason === 'Poor market analysis') finalMistakeReason = 'Poor Market Analysis';
      else if (lossPrimaryReason === 'Failure to follow plan') finalMistakeReason = 'Failure to Follow Plan';
      else finalMistakeReason = 'Other';
    } else if (tradeResult === 'WIN') {
      finalMistakeReason = 'None (Flawless)';
    }

    const postTradeAnalysis = {
      tradeOutcome: tradeResult,
      primaryReason: tradeResult === 'LOSS' ? lossPrimaryReason : tradeResult === 'WIN' ? winPrimaryReason : 'Breakeven execution',
      secondaryReasons: tradeResult === 'LOSS' ? lossSecondaryReasons : tradeResult === 'WIN' ? winSecondaryReasons : [],
      notes: analysisNotes,
      actionableTakeaway: tradeResult === 'LOSS'
        ? `Primary factor: ${lossPrimaryReason}. Strict execution focus required for next session.`
        : `Key success factor: ${winPrimaryReason}. Maintain this institutional discipline.`,
      recommendedModule: tradeResult === 'LOSS' && (
        lossPrimaryReason === 'Fear' ||
        lossPrimaryReason === 'Greed' ||
        lossPrimaryReason === 'FOMO' ||
        lossPrimaryReason === 'Revenge trading' ||
        lossPrimaryReason === 'Psychology' ||
        lossPrimaryReason === 'Overtrading'
      ) ? 'PSYCHOLOGY' : 'PRE_TRADE_PLAN',
    };

    const newTrade: Trade = {
      id: tradeId,
      accountId: account.id,
      tradeNumber: nextTradeNumber,
      date: date || getKarachiDate(),
      time: formattedTime,
      broker,
      accountType,
      accountSize: account.initialBalance,
      instrument,
      direction,
      timeframe,
      session,
      entryPrice,
      stopLoss,
      takeProfit,
      exitPrice,
      lotSize,
      result: tradeResult,
      riskAmount: Math.round(riskAmount),
      profitLoss: Math.round(profitLoss),
      rMultiple,
      pips: Number(pips.toFixed(1)),
      strategy,
      htfTrend,
      ltfTrend,
      marketStructure,
      alignmentScore: {
        htfDirection: scoreHtf,
        marketStructure: scoreMs,
        entryModel: scoreEm,
        riskManagement: scoreRm,
        newsCondition: scoreNews,
        totalQuality: totalQualityScore,
      },
      preEmotion,
      postPsychology: {
        followedPlan,
        movedStopLoss,
        closedEarly,
        overtraded,
        revengeTraded,
        increasedLotSizeEmotionally: increasedLotSize,
      },
      ruleViolation: ruleViolationLevel,
      violatedRules: selectedViolations,
      mistakeReason: finalMistakeReason,
      grade,
      postTradeAnalysis,
      screenshots: {
        beforeEntry: beforeEntryUrl || undefined,
        entry: entryUrl || undefined,
        afterTrade: afterTradeUrl || undefined,
        htfAnalysis: htfAnalysisUrl || undefined,
      },
      notes: analysisNotes ? `${notes ? notes + '\n\n' : ''}[Post-Trade Analysis: ${postTradeAnalysis.primaryReason}] ${analysisNotes}` : notes,
      preTradeChecklist: completedChecklistCount > 0
        ? {
            ...checklist,
            completedCount: completedChecklistCount,
          }
        : undefined,
      aiAudit: aiAuditResult
        ? {
            ...aiAuditResult,
            timestamp: getKarachiTimestamp(),
          }
        : undefined,
    };

    onSaveTrade(newTrade);
    onClose();
  };

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 bg-[#020617] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Crosshair className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-military font-bold tracking-wider text-slate-100">
                  PROFESSIONAL TRADE ENTRY SYSTEM
                </h3>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/30">
                  MISSION LOG #{nextTradeNumber}
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {APP_TIMEZONE_FULL_LABEL}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Record execution, market structure, psychology parameters, and screenshots in Asia/Karachi (UTC+5).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition shrink-0 cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body with Scrollable Sections */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-200 flex-1">
          {/* Pre-Execution Protocol & Readiness Guidance Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            preReadiness.status === 'RED'
              ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
              : preReadiness.status === 'YELLOW'
              ? 'bg-amber-950/20 border-blue-500/40 text-amber-300'
              : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-lg border ${
                preReadiness.status === 'RED'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : preReadiness.status === 'YELLOW'
                  ? 'bg-blue-500/20 border-blue-500/40 text-cyan-400'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                    preReadiness.status === 'RED'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : preReadiness.status === 'YELLOW'
                      ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {preReadiness.status === 'RED' ? 'DEFCON 5: LOCKOUT' : preReadiness.status === 'YELLOW' ? 'DEFCON 3: CAUTION' : 'DEFCON 1: GREEN'}
                  </span>
                  <span className="font-military font-bold text-xs tracking-wider text-slate-100">
                    {preReadiness.headline}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 font-mono-code">
                  {preReadiness.reasons.join(' ')}
                </p>
                <p className="text-[11px] text-amber-300/90 mt-0.5 font-mono-code">
                  → {preReadiness.recommendation}
                </p>
              </div>
            </div>

            <div className="sm:text-right font-mono-code text-[11px] space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 w-full sm:w-auto">
              <div className="text-slate-400">
                Max Allowed Risk:{' '}
                <span className="font-bold text-slate-200">
                  {formatCurrency(preReadiness.recommendedRiskDollars, account.currency)}
                </span>
              </div>
              <div className="text-slate-400">
                Daily Remaining:{' '}
                <span className="font-bold text-emerald-400">
                  {formatCurrency(preReadiness.remainingDailyRiskDollars, account.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Pre-Trade Discipline Checklist */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-military font-bold text-cyan-400">
                      PRE-TRADE EXECUTION CHECKLIST
                    </span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      OPTIONAL PROTOCOL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono-code">
                    Verify high-probability confluence before pulling the trigger.
                  </p>
                  {onOpenPreTradePlan && (
                    <button type="button" onClick={onOpenPreTradePlan} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono-code font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer">
                      OPEN PRE-TRADE PLAN ↗
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono-code font-bold px-2.5 py-1 rounded border ${
                    completedChecklistCount === totalChecklistItems
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : completedChecklistCount >= 5
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : completedChecklistCount > 0
                      ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {completedChecklistCount}/{totalChecklistItems} VERIFIED
                </span>

                <button
                  type="button"
                  onClick={() => setChecklistOpen(!checklistOpen)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs font-mono-code flex items-center gap-1 transition"
                >
                  {checklistOpen ? (
                    <>
                      <span>Collapse</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>{completedChecklistCount > 0 ? 'Edit' : 'Open Checklist'}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {checklistOpen && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                  <span>Confluence Checklist Items:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setChecklist({
                          htfTrendAligned: true,
                          marketStructureBreak: true,
                          liquiditySwept: true,
                          properRiskReward: true,
                          noHighImpactNews: true,
                          calmPsychology: true,
                          positionSizeCalculated: true,
                          stopLossAtLogicalLevel: true,
                        })
                      }
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] underline"
                    >
                      Check All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setChecklist({
                          htfTrendAligned: false,
                          marketStructureBreak: false,
                          liquiditySwept: false,
                          properRiskReward: false,
                          noHighImpactNews: false,
                          calmPsychology: false,
                          positionSizeCalculated: false,
                          stopLossAtLogicalLevel: false,
                        })
                      }
                      className="text-slate-400 hover:text-slate-200 text-[10px] underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: 'htfTrendAligned' as const,
                      label: 'HTF Trend Alignment',
                      desc: 'Execution aligns with higher timeframe market bias (Daily/H4)',
                    },
                    {
                      key: 'marketStructureBreak' as const,
                      label: 'Structure Shift / BOS',
                      desc: 'Clear Market Structure Shift or Break confirmed on entry timeframe',
                    },
                    {
                      key: 'liquiditySwept' as const,
                      label: 'Liquidity Purged / Swept',
                      desc: 'Key swing high/low or session liquidity was grabbed before entry',
                    },
                    {
                      key: 'properRiskReward' as const,
                      label: 'Risk:Reward Ratio >= 1:2',
                      desc: 'Clear target offering minimum 2R mathematically favorable expectancy',
                    },
                    {
                      key: 'noHighImpactNews' as const,
                      label: 'No High-Impact News',
                      desc: 'No major red-folder events scheduled within the execution window',
                    },
                    {
                      key: 'calmPsychology' as const,
                      label: 'Composed Psychological State',
                      desc: 'Free of emotional FOMO, revenge urge, or hesitation',
                    },
                    {
                      key: 'positionSizeCalculated' as const,
                      label: 'Exact Position Sizing',
                      desc: 'Lot size calculated precisely to prevent exceeding max risk %',
                    },
                    {
                      key: 'stopLossAtLogicalLevel' as const,
                      label: 'Structural Invalidation Stop',
                      desc: 'Stop loss anchored behind invalidation point, not arbitrary pips',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                        checklist[item.key]
                          ? 'bg-cyan-950/30 border-cyan-500/50 text-slate-100'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.key]}
                        onChange={(e) =>
                          setChecklist((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                      />
                      <div className="flex-1">
                        <div className="font-mono-code font-bold text-xs flex items-center justify-between">
                          <span>{item.label}</span>
                          {checklist[item.key] && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 inline ml-1" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono-code mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Basic Information */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
              <span>1. BASIC MISSION PARAMETERS</span>
              <span className="text-slate-500 font-mono-code">{APP_TIMEZONE_FULL_LABEL} ENFORCED</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Trade ID</label>
                <input
                  type="text"
                  value={tradeId}
                  onChange={(e) => setTradeId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-mono-code">Date</label>
                  <span className="text-[10px] text-cyan-400 font-mono-code font-bold">
                    {APP_TIMEZONE_LABEL}
                  </span>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-mono-code flex items-center gap-1.5">
                    <span>Time</span>
                    <span className="text-cyan-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]">
                      {formatTo12Hour(time) || '12-HR PKT'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDate(getKarachiDate());
                      setTime(getKarachiTime24());
                    }}
                    title="Reset to current Asia/Karachi (UTC+5) time"
                    className="text-[10px] text-cyan-400 hover:text-amber-300 font-mono-code underline cursor-pointer"
                  >
                    NOW (PKT)
                  </button>
                </div>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Broker</label>
                <input
                  type="text"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Instrument / Pair</label>
                <InstrumentCombobox
                  id="trade-entry-instrument-input"
                  value={instrument}
                  onChange={(val) => {
                    setInstrument(val);
                    onInstrumentChange?.(val);
                  }}
                  placeholder="Type or select pair (e.g. XAUUSD)..."
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Direction</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setDirection('BUY')}
                    className={`py-1.5 rounded font-mono-code font-bold text-center transition ${
                      direction === 'BUY'
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SELL')}
                    className={`py-1.5 rounded font-mono-code font-bold text-center transition ${
                      direction === 'SELL'
                        ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 outline-none"
                >
                  <option value="M1">M1</option>
                  <option value="M5">M5</option>
                  <option value="M15">M15</option>
                  <option value="M30">M30</option>
                  <option value="H1">H1</option>
                  <option value="H4">H4</option>
                  <option value="D1">D1</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Trading Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value as TradingSession)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 outline-none"
                >
                  <option value="LONDON">London (07:00 - 15:00)</option>
                  <option value="NEW_YORK">New York (13:00 - 21:00)</option>
                  <option value="ASIAN">Asian (00:00 - 08:00)</option>
                  <option value="LONDON_NY_OVERLAP">London/NY Overlap</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Execution & Risk-to-Reward Calculator */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
              <span>2. EXECUTION & R-MULTIPLE AUDIT</span>
              <span className="text-slate-400 font-mono-code">
                RISK: ${Math.round(riskAmount).toLocaleString()} | P&L: ${Math.round(profitLoss).toLocaleString()} ({rMultiple > 0 ? '+' : ''}{rMultiple}R)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-rose-500/40 font-mono-code text-rose-300 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-emerald-500/40 font-mono-code text-emerald-300 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Lot Size</label>
                <input
                  type="number"
                  step="0.01"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-cyan-400 font-bold outline-none"
                />
              </div>
            </div>

            {/* Visual R-Multiple Indicator & Manual Result Selector */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono-code font-bold text-cyan-400 uppercase tracking-wider">
                    RESULT AUDIT STATUS:
                  </span>
                  <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 gap-1">
                    {(['WIN', 'LOSS', 'BREAKEVEN'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => {
                          setTradeResult(res);
                          if (res === 'WIN') {
                            if (takeProfit && ((direction === 'BUY' && takeProfit > entryPrice) || (direction === 'SELL' && takeProfit < entryPrice))) {
                              setExitPrice(takeProfit);
                            }
                          } else if (res === 'LOSS') {
                            if (stopLoss) setExitPrice(stopLoss);
                          } else if (res === 'BREAKEVEN') {
                            setExitPrice(entryPrice);
                          }
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-mono-code font-bold transition ${
                          tradeResult === res
                            ? res === 'WIN'
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : res === 'LOSS'
                              ? 'bg-rose-500 text-slate-100 shadow-md shadow-rose-500/20'
                              : 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        {res === 'WIN' ? '✓ WIN' : res === 'LOSS' ? '✗ LOSS' : '— BREAKEVEN'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono-code text-xs">
                  <span className="text-rose-400">Risk: -1.0R</span>
                  <span className="text-slate-500">→</span>
                  <span className={rMultiple >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    Outcome: {rMultiple >= 0 ? '+' : ''}{rMultiple}R
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className={profitLoss >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    Net: {profitLoss >= 0 ? '+' : ''}${Math.round(profitLoss).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Strategy Tracking & Market Structure Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategy & HTF/LTF */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="text-xs font-military font-bold text-cyan-400">
                3. STRATEGY & MARKET STRUCTURE
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Strategy Model</label>
                <select
                  id="trade-entry-strategy-select"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as StrategyType)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-cyan-400 font-semibold outline-none focus:border-cyan-400"
                >
                  {SBT_STRATEGY_MODELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono-code">Market Structure</label>
                <select
                  value={marketStructure}
                  onChange={(e) => setMarketStructure(e.target.value as MarketStructureElement)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100"
                >
                  <option value="Liquidity Sweep">Liquidity Sweep (BSL / SSL)</option>
                  <option value="BOS">BOS (Break of Structure)</option>
                  <option value="MSS">MSS (Market Structure Shift)</option>
                  <option value="CHOCH">CHOCH (Change of Character)</option>
                  <option value="Consolidation">Consolidation / Range</option>
                </select>
              </div>
            </div>

            {/* Section 4: Optional AI Screenshot Scanner */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                <span>4. OPTIONAL AI TRADE SCANNER</span>
                <span className="text-slate-500 font-mono-code text-[10px]">IMAGE → PAIR • ENTRY • SL</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-code">
                Upload the trade screenshot and optionally run AI extraction. Detected values are suggestions only and should be verified before saving.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-[11px] font-bold cursor-pointer transition">
                  UPLOAD TRADE SCREENSHOT
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setEntryUrl)}
                    className="hidden"
                  />
                </label>
                {onOpenAiScanner && (
                  <button
                    type="button"
                    onClick={onOpenAiScanner}
                    className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-bold font-military flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    OPEN AI SCANNER
                  </button>
                )}
                {entryUrl && (
                  <button
                    type="button"
                    disabled={aiTradeScanning}
                    onClick={() => runAiTradeScanner(entryUrl)}
                    className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    {aiTradeScanning ? 'SCANNING IMAGE…' : 'AI SCAN THIS IMAGE'}
                  </button>
                )}
              </div>

              {entryUrl && (
                <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                  <img src={entryUrl} alt="Trade screenshot" className="w-24 h-16 object-cover rounded-lg border border-slate-800" referrerPolicy="no-referrer" />
                  <div className="text-[10px] text-slate-500 font-mono-code">
                    Screenshot attached to Entry Execution and available for the journal audit.
                  </div>
                </div>
              )}

              {aiTradeScanError && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-[10px] font-mono-code">
                  {aiTradeScanError}
                </div>
              )}

              {aiTradeScan && (
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-300">AI DETECTED — VERIFY BEFORE SAVE</span>
                    {aiTradeScan.confidence !== undefined && <span className="text-[10px] text-slate-400">{Math.round(aiTradeScan.confidence)}% confidence</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code">
                    <div><span className="text-slate-500">Pair:</span> <strong>{aiTradeScan.instrument || 'Not detected'}</strong></div>
                    <div><span className="text-slate-500">Direction:</span> <strong>{aiTradeScan.direction || 'Not detected'}</strong></div>
                    <div><span className="text-slate-500">Entry:</span> <strong>{aiTradeScan.entryPrice ?? 'Not detected'}</strong></div>
                    <div><span className="text-slate-500">Stop Loss:</span> <strong className="text-rose-300">{aiTradeScan.stopLoss ?? 'Not detected'}</strong></div>
                    <div><span className="text-slate-500">Take Profit:</span> <strong className="text-emerald-300">{aiTradeScan.takeProfit ?? 'Not detected'}</strong></div>
                    <div><span className="text-slate-500">Timeframe:</span> <strong>{aiTradeScan.timeframe || 'Not detected'}</strong></div>
                  </div>
                  <p className="text-[10px] text-slate-400">AI is optional. Nothing is saved automatically; the detected values have only been loaded into the editable trade fields.</p>
                </div>
              )}
            </div>

          </div>

          {/* Section 5: Screenshot System */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>5. SCREENSHOT AUDIT SYSTEM</span>
              </div>
              <span className="text-slate-400 font-mono-code text-[11px]">
                UPLOAD OR PASTES (BEFORE, ENTRY, AFTER, HTF)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Before Entry */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 font-mono-code block mb-1">Before-Entry Chart</span>
                {beforeEntryUrl ? (
                  <div className="relative group rounded overflow-hidden mb-2">
                    <img
                      src={beforeEntryUrl}
                      alt="Before Entry"
                      className="w-full h-20 object-cover rounded"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => setBeforeEntryUrl('')}
                      className="absolute top-1 right-1 bg-black/70 p-1 rounded text-rose-400 hover:text-rose-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700 rounded h-20 flex flex-col items-center justify-center text-slate-500 mb-2">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">No image attached</span>
                  </div>
                )}
                <label className="text-center py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer font-mono-code text-[11px] block transition">
                  Upload Chart
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setBeforeEntryUrl)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Entry */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 font-mono-code block mb-1">Entry Execution</span>
                {entryUrl ? (
                  <div className="relative group rounded overflow-hidden mb-2">
                    <img
                      src={entryUrl}
                      alt="Entry Execution"
                      className="w-full h-20 object-cover rounded"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => setEntryUrl('')}
                      className="absolute top-1 right-1 bg-black/70 p-1 rounded text-rose-400 hover:text-rose-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700 rounded h-20 flex flex-col items-center justify-center text-slate-500 mb-2">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">No image attached</span>
                  </div>
                )}
                <div className="flex gap-1">
                  <label className="flex-1 text-center py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer font-mono-code text-[11px] transition">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setEntryUrl)}
                      className="hidden"
                    />
                  </label>
                  {entryUrl && (
                    <button
                      type="button"
                      disabled={aiAuditing}
                      onClick={() => runAiScreenshotAudit(entryUrl)}
                      className="px-2 py-1 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[10px] font-military flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiAuditing ? 'Auditing...' : 'AI Audit'}
                    </button>
                  )}
                </div>
              </div>

              {/* After Trade */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 font-mono-code block mb-1">After-Trade Outcome</span>
                {afterTradeUrl ? (
                  <div className="relative group rounded overflow-hidden mb-2">
                    <img
                      src={afterTradeUrl}
                      alt="After Trade"
                      className="w-full h-20 object-cover rounded"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => setAfterTradeUrl('')}
                      className="absolute top-1 right-1 bg-black/70 p-1 rounded text-rose-400 hover:text-rose-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700 rounded h-20 flex flex-col items-center justify-center text-slate-500 mb-2">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">No image attached</span>
                  </div>
                )}
                <label className="text-center py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer font-mono-code text-[11px] block transition">
                  Upload Chart
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setAfterTradeUrl)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Higher Timeframe */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 font-mono-code block mb-1">HTF Structure Analysis</span>
                {htfAnalysisUrl ? (
                  <div className="relative group rounded overflow-hidden mb-2">
                    <img
                      src={htfAnalysisUrl}
                      alt="HTF Analysis"
                      className="w-full h-20 object-cover rounded"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => setHtfAnalysisUrl('')}
                      className="absolute top-1 right-1 bg-black/70 p-1 rounded text-rose-400 hover:text-rose-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700 rounded h-20 flex flex-col items-center justify-center text-slate-500 mb-2">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">No image attached</span>
                  </div>
                )}
                <label className="text-center py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer font-mono-code text-[11px] block transition">
                  Upload Chart
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setHtfAnalysisUrl)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* AI Vision Audit Feedback if available */}
            {aiAuditResult && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-amber-300 space-y-1">
                <div className="font-bold font-military flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI VISION AUDITOR: {aiAuditResult.verdict}
                  </span>
                  <span className="font-mono-code">SCORE: {aiAuditResult.qualityScore}/100</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {aiAuditResult.critique}
                </p>
              </div>
            )}
          </div>

          {/* Section 6: Trading Psychology Journal */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>6. TRADING PSYCHOLOGY JOURNAL</span>
              </div>
              <span className="text-slate-400 font-mono-code">PRE & POST EXECUTION MINDSET</span>
            </div>

            {/* Pre Emotion Picker */}
            <div>
              <label className="text-slate-400 block mb-1 font-mono-code">
                Before entering this trade: How did you feel?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {EMOTIONS.map((emo) => {
                  const isSelected = preEmotion === emo.state;
                  return (
                    <button
                      key={emo.state}
                      type="button"
                      onClick={() => setPreEmotion(emo.state)}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                        isSelected
                          ? 'border-cyan-400 bg-blue-500/15 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl">{emo.emoji}</span>
                      <span className="text-[10px] font-mono-code">{emo.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Trade Psychology Questions */}
            <div className="pt-2">
              <label className="text-slate-400 block mb-2 font-mono-code">
                After the trade: Self-Audit Questionnaire
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followedPlan}
                    onChange={(e) => setFollowedPlan(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Did you follow the plan?</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={movedStopLoss}
                    onChange={(e) => setMovedStopLoss(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span className={movedStopLoss ? 'text-rose-400 font-bold' : ''}>
                    Did you move the stop loss?
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closedEarly}
                    onChange={(e) => setClosedEarly(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Did you close early out of fear?</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overtraded}
                    onChange={(e) => setOvertraded(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span className={overtraded ? 'text-rose-400 font-bold' : ''}>
                    Did you overtrade today?
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revengeTraded}
                    onChange={(e) => setRevengeTraded(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span className={revengeTraded ? 'text-rose-400 font-bold' : ''}>
                    Did you revenge trade?
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={increasedLotSize}
                    onChange={(e) => setIncreasedLotSize(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span className={increasedLotSize ? 'text-rose-400 font-bold' : ''}>
                    Emotionally increased lot size?
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 7 & 12 & 13: Rule Violations, Mistakes, and Trade Grade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rule Violations */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                <span>7. RULE VIOLATIONS</span>
                <span
                  className={`font-mono-code px-2 py-0.5 rounded text-[10px] font-bold ${
                    ruleViolationLevel === 'NONE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : ruleViolationLevel === 'MINOR'
                      ? 'bg-blue-500/20 text-cyan-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {ruleViolationLevel === 'NONE'
                    ? '🟢 NO VIOLATIONS'
                    : ruleViolationLevel === 'MINOR'
                    ? '🟡 MINOR VIOLATION'
                    : '🔴 MAJOR VIOLATION'}
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {rules.map((rule) => {
                  const isChecked = selectedViolations.includes(rule.title);
                  return (
                    <label
                      key={rule.id}
                      className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-950 cursor-pointer text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedViolations([...selectedViolations, rule.title]);
                          } else {
                            setSelectedViolations(selectedViolations.filter((v) => v !== rule.title));
                          }
                        }}
                        className="mt-0.5 accent-rose-500 rounded"
                      />
                      <span className={isChecked ? 'text-rose-300 font-bold' : 'text-slate-300'}>
                        {rule.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Mistake Database */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-xs font-military font-bold text-cyan-400">
                12. MISTAKE CLASSIFICATION
              </div>
              <label className="text-slate-400 block text-[11px] font-mono-code">
                Root Cause (For Losing / Imperfect Trades):
              </label>
              <select
                value={mistakeReason}
                onChange={(e) => setMistakeReason(e.target.value as MistakeReason)}
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-100"
              >
                {MISTAKES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <div className="text-[11px] text-slate-400 mt-2">
                Classifying mistakes powers your AI Trading Coach to pinpoint your top 3 leakages.
              </div>
            </div>

            {/* Trade Grade & Live Trade Quality Score */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                <span>13. TRADE QUALITY SCORE</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono-code font-bold ${
                  totalQualityScore >= 85
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : totalQualityScore >= 70
                    ? 'bg-blue-500/20 text-cyan-400 border border-blue-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {totalQualityScore} / 100
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono-code flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Suggested Grade:</span>{' '}
                  <span className="font-bold text-cyan-400">{suggestedGrade}</span>
                </div>
                {grade !== suggestedGrade && (
                  <button
                    type="button"
                    onClick={() => setGrade(suggestedGrade)}
                    className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-amber-300 font-bold"
                  >
                    Apply {suggestedGrade}
                  </button>
                )}
              </div>

              <label className="text-slate-400 block text-[11px] font-mono-code">
                Assign Quality Grade:
              </label>
              <div className="grid grid-cols-5 gap-1">
                {(['A+', 'A', 'B', 'C', 'F'] as TradeGrade[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`py-2 rounded font-mono-code font-bold text-sm transition ${
                      grade === g
                        ? g === 'A+' || g === 'A'
                          ? 'bg-emerald-500 text-slate-950'
                          : g === 'B'
                          ? 'bg-sky-500 text-slate-950'
                          : g === 'C'
                          ? 'bg-blue-500 text-slate-950'
                          : 'bg-rose-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {qualityFeedback.length > 0 && (
                <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                  {qualityFeedback.slice(0, 3).map((fb, idx) => (
                    <div key={idx} className="text-amber-300/80">• {fb}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 14: LOSS / WIN ANALYSIS SYSTEM (Master Prompt Requirement 12) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-cyan-400">
                14. POST-TRADE REFLECTION & ANALYSIS
              </span>
              <span className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded ${
                tradeResult === 'WIN'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : tradeResult === 'LOSS'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {tradeResult === 'WIN' ? 'WIN ANALYSIS' : tradeResult === 'LOSS' ? 'LOSS ANALYSIS' : 'BREAKEVEN AUDIT'}
              </span>
            </div>

            {tradeResult === 'LOSS' && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-rose-300">
                  You incurred a loss on this trade. What was the primary root issue?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    'Strategy mistake',
                    'Poor entry',
                    'Poor exit',
                    'Risk management mistake',
                    'Stop-loss mistake',
                    'Psychology',
                    'Fear',
                    'Greed',
                    'FOMO',
                    'Revenge trading',
                    'Overtrading',
                    'News',
                    'Poor market analysis',
                    'Failure to follow plan',
                    'Other',
                  ].map((r) => {
                    const isSelected = lossPrimaryReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLossPrimaryReason(r)}
                        className={`text-left px-2.5 py-1.5 rounded text-[11px] font-mono-code transition border ${
                          isSelected
                            ? 'bg-rose-500/25 text-rose-200 border-rose-500/60 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{r}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tradeResult === 'WIN' && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-emerald-300">
                  What contributed most to this successful trade?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    'Valid strategy',
                    'Correct market structure',
                    'Good risk management',
                    'Good execution',
                    'Good psychology',
                    'Patience',
                    'Proper pre-trade plan',
                    'Good timing',
                    'Other',
                  ].map((r) => {
                    const isSelected = winPrimaryReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setWinPrimaryReason(r)}
                        className={`text-left px-2.5 py-1.5 rounded text-[11px] font-mono-code transition border ${
                          isSelected
                            ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/60 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{r}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tradeResult === 'BREAKEVEN' && (
              <div className="p-2.5 bg-slate-950 rounded-lg text-[11px] text-slate-400 font-mono-code">
                Breakeven stop loss preserved capital. Valid trade execution without negative financial drawdown.
              </div>
            )}

            <div>
              <label className="text-slate-400 block mb-1 font-mono-code text-[11px]">
                Post-Analysis Reflection / Lesson Learned:
              </label>
              <input
                type="text"
                value={analysisNotes}
                onChange={(e) => setAnalysisNotes(e.target.value)}
                placeholder="What single rule or tweak will you remember for next time?"
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono-code text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-400 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-400 block mb-1 font-mono-code">Tactical Notes & Observations</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clean London Open sweep of Asian low into H1 bullish order block. Waited for M5 MSS then entered on SBT retest..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          {/* Risk Guidance & Advisory Notifications (Non-blocking as required by Master Prompt) */}
          {(isRiskExceeded || isDailyLimitReached || submissionError) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/40 rounded-xl text-cyan-200 font-mono-code text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-cyan-400">
                <AlertTriangle className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>RISK COMPLIANCE & DISCIPLINE ADVISORY</span>
              </div>
              {isRiskExceeded && (
                <p className="text-[11px] text-slate-300 pl-6">
                  • <strong className="text-amber-300">Risk Notice:</strong> Planned risk is {calculatedRiskPercent}% (exceeds recommended 1.0% limit). Trade entry is permitted to document actual/historical execution.
                </p>
              )}
              {isDailyLimitReached && (
                <p className="text-[11px] text-slate-300 pl-6">
                  • <strong className="text-amber-300">Execution Frequency Notice:</strong> {todayTradesCount} trades are already recorded for this date (recommended maximum: 2 trades/day). Journaling is allowed.
                </p>
              )}
              {submissionError && (
                <p className="text-[11px] text-rose-300 pl-6 font-bold">
                  • {submissionError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-800 bg-[#020617] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-mono-code text-xs transition cursor-pointer"
          >
            CANCEL
          </button>

          <button
            id="save-trade-submit-btn"
            onClick={handleSave}
            className="px-4 sm:px-6 py-2 rounded-lg font-military font-bold text-xs tracking-wider shadow-lg bg-gradient-to-r from-blue-500 to-amber-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-blue-500/20 cursor-pointer transition transform active:scale-95 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>
              {isRiskExceeded || isDailyLimitReached
                ? 'COMMIT TRADE (WITH RISK WARNING)'
                : 'COMMIT TRADE TO DATA VAULT'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
