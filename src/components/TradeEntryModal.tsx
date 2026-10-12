import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Info,
  ExternalLink,
  ShieldAlert,
  Upload,
  RefreshCw,
  Edit3,
  Clock,
  FileImage,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  TrendingUp,
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
  TradingViewExtractionResult,
} from '../types';
import { InstrumentCombobox } from './InstrumentCombobox';
import { calculateTradeQualityScore, calculateNextTradeReadiness } from '../utils/readinessEngine';
import {
  evaluateFundedAccountRisk,
  isFundedAccount,
  calculateLotSize as calculateFundedLotSize,
  getInstrumentSpec,
} from '../utils/fundedRiskEngine';
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
import { AtomicSaveScreenshotTradeResult } from '../utils/db';

interface TradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Trade) => void;
  onSaveScreenshotTrade?: (
    trade: Trade,
    options?: { allowDuplicateOverride?: boolean }
  ) => Promise<AtomicSaveScreenshotTradeResult>;
  rules: TradingRule[];
  account: AccountSettings;
  tradeCount: number;
  existingTrades?: Trade[];
  initialInstrument?: string;
  onInstrumentChange?: (instrument: string) => void;
  onOpenPreTradePlan?: () => void;
  prefilledTradeData?: Partial<Trade> | null;
  authToken?: string | null;
  autoFocusScreenshotUpload?: boolean;
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

export const MARKET_OPTIONS = [
  'Forex (Currencies)',
  'Metals & Commodities',
  'Indices',
  'Crypto / Digital Assets',
  'Equities / Stocks',
];

export const SECTOR_OPTIONS = [
  'Major Currency Pairs (G8)',
  'Minor / Cross Currency Pairs',
  'Exotic Currency Pairs',
  'Precious Metals (Gold / Silver)',
  'Energy & Commodities (Oil / Gas)',
  'US Tech & Equity Indices (NAS100 / US30 / SPX)',
  'Global Equity Indices (DAX / FTSE / NIKKEI)',
  'Layer-1 Crypto Assets (BTC / ETH / SOL)',
  'Technology & Growth Stocks',
  'Financials & Industrial Equities',
];

const TIMEFRAMES: Timeframe[] = ['M1', 'M3', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  M1: 'M1 (1-Minute)',
  M3: 'M3 (3-Minute)',
  M5: 'M5 (5-Minute)',
  M15: 'M15 (15-Minute)',
  M30: 'M30 (30-Minute)',
  H1: 'H1 (1-Hour)',
  H4: 'H4 (4-Hour)',
  D1: 'D1 (Daily)',
};

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

function inferMarketAndSector(pair: string): { market: string; sector: string } {
  const upper = (pair || '').toUpperCase();
  if (upper.includes('XAU') || upper.includes('XAG') || upper.includes('GOLD') || upper.includes('SILVER')) {
    return {
      market: 'Metals & Commodities',
      sector: 'Precious Metals (Gold / Silver)',
    };
  }
  if (upper.includes('OIL') || upper.includes('WTI') || upper.includes('BRENT') || upper.includes('NGAS')) {
    return {
      market: 'Metals & Commodities',
      sector: 'Energy & Commodities (Oil / Gas)',
    };
  }
  if (
    upper.includes('NAS') ||
    upper.includes('US30') ||
    upper.includes('SPX') ||
    upper.includes('US500') ||
    upper.includes('US100') ||
    upper.includes('DJI')
  ) {
    return {
      market: 'Indices',
      sector: 'US Tech & Equity Indices (NAS100 / US30 / SPX)',
    };
  }
  if (upper.includes('GER') || upper.includes('DAX') || upper.includes('UK100') || upper.includes('JP225')) {
    return {
      market: 'Indices',
      sector: 'Global Equity Indices (DAX / FTSE / NIKKEI)',
    };
  }
  if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('SOL') || upper.includes('XRP')) {
    return {
      market: 'Crypto / Digital Assets',
      sector: 'Layer-1 Crypto Assets (BTC / ETH / SOL)',
    };
  }
  const majors = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
  if (majors.includes(upper.replace(/[^A-Z]/g, ''))) {
    return {
      market: 'Forex (Currencies)',
      sector: 'Major Currency Pairs (G8)',
    };
  }
  return {
    market: 'Forex (Currencies)',
    sector: 'Minor / Cross Currency Pairs',
  };
}

function inferTradingSessionFromTime(timeStr: string): TradingSession {
  const match = (timeStr || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 'LONDON';
  const hour = Number(match[1]);
  if (hour >= 17 && hour <= 20) return 'LONDON_NY_OVERLAP';
  if (hour >= 12 && hour < 17) return 'LONDON';
  if (hour > 20 || hour < 2) return 'NEW_YORK';
  return 'ASIAN';
}

export const TradeEntryModal: React.FC<TradeEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveTrade,
  onSaveScreenshotTrade,
  rules,
  account,
  tradeCount,
  existingTrades,
  initialInstrument,
  onInstrumentChange,
  onOpenPreTradePlan,
  prefilledTradeData,
  authToken,
  autoFocusScreenshotUpload,
}) => {
  const nextTradeNumber = tradeCount + 1;
  const defaultId = useMemo(() => {
    const maxNumeric = (existingTrades || []).reduce((max, t) => {
      const m = String(t.id || '').match(/^TRD-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) return n;
      }
      return max;
    }, 109 + tradeCount);
    return `TRD-${maxNumeric + 1}`;
  }, [existingTrades, tradeCount]);

  const tvFileInputRef = useRef<HTMLInputElement | null>(null);
  const setupSectionRef = useRef<HTMLDivElement | null>(null);
  const mindsetSectionRef = useRef<HTMLDivElement | null>(null);

  // Core Form State
  const [tradeId, setTradeId] = useState(defaultId);
  const [date, setDate] = useState(() => getKarachiDate());
  const [time, setTime] = useState(() => getKarachiTime24());
  const [broker, setBroker] = useState(account.broker || 'Eightcap (RAW)');
  const [accountType, setAccountType] = useState<AccountType>(account.accountType);
  const [instrument, setInstrument] = useState(initialInstrument || 'XAUUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [timeframe, setTimeframe] = useState<Timeframe>('M15');
  const [session, setSession] = useState<TradingSession>('LONDON');

  // Market & Sector
  const initialMarketSector = inferMarketAndSector(initialInstrument || 'XAUUSD');
  const [market, setMarket] = useState<string>(initialMarketSector.market);
  const [sector, setSector] = useState<string>(initialMarketSector.sector);

  // Execution & Status
  const [tradeStatus, setTradeStatus] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [entryPrice, setEntryPrice] = useState<string>('2485.5');
  const [stopLoss, setStopLoss] = useState<string>('2481.0');
  const [takeProfit, setTakeProfit] = useState<string>('2499.0');
  const [exitPrice, setExitPrice] = useState<string>('2499.0');
  const [lotSize, setLotSize] = useState<string>('1.0');
  const [riskPercentage, setRiskPercentage] = useState<string>(() =>
    String(
      account?.maxRiskPerTradePercent && account.maxRiskPerTradePercent > 0
        ? account.maxRiskPerTradePercent
        : 1.0
    )
  );
  const [visibleRrRatio, setVisibleRrRatio] = useState<string>('');
  const [tradeResult, setTradeResult] = useState<'WIN' | 'LOSS' | 'BREAKEVEN'>('WIN');

  // Strategy & Structure
  const [strategy, setStrategy] = useState<StrategyType>('SBT Model 1');
  const [htfTrend, setHtfTrend] = useState<TrendDirection>('BULLISH');
  const [ltfTrend, setLtfTrend] = useState<TrendDirection>('BULLISH');
  const [marketStructure, setMarketStructure] = useState<MarketStructureElement>('Liquidity Sweep');

  // Trade Alignment Score components
  const [scoreHtf] = useState(25);
  const [scoreMs] = useState(20);
  const [scoreEm] = useState(20);
  const [scoreRm] = useState(20);
  const [scoreNews] = useState(15);

  // Pre & Post Trade Mindset & Analysis (Before & After Taking the Trade)
  const [preEmotion, setPreEmotion] = useState<EmotionState>('CONFIDENT');
  const [preTradeMindsetNotes, setPreTradeMindsetNotes] = useState<string>('');
  const [postTradeMindsetNotes, setPostTradeMindsetNotes] = useState<string>('');
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

  // TradingView Chart Screenshot Auto-Extraction State
  const [tvImageDataUrl, setTvImageDataUrl] = useState<string>('');
  const [tvFileName, setTvFileName] = useState<string>('');
  const [tvMimeType, setTvMimeType] = useState<string>('');
  const [tvExtracting, setTvExtracting] = useState<boolean>(false);
  const [tvExtractionError, setTvExtractionError] = useState<string | null>(null);
  const [tvExtraction, setTvExtraction] = useState<TradingViewExtractionResult | null>(null);
  const [tvUploadTimestamp, setTvUploadTimestamp] = useState<string>('');
  const [tvTradeTimeVerified, setTvTradeTimeVerified] = useState<boolean>(true);
  const [tvAutoExtractedFields, setTvAutoExtractedFields] = useState<Set<string>>(new Set());
  const [tvEditedFields, setTvEditedFields] = useState<Set<string>>(new Set());
  const [advancedSetupConfirmed, setAdvancedSetupConfirmed] = useState<boolean>(false);
  const [duplicateConflictTradeId, setDuplicateConflictTradeId] = useState<string | null>(null);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState<boolean>(false);
  const [isSavingTrade, setIsSavingTrade] = useState<boolean>(false);
  const [savedSuccessInfo, setSavedSuccessInfo] = useState<{
    tradeId: string;
    dbUuid?: string;
    trade: Trade;
  } | null>(null);

  // AI Vision audit states
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<{
    qualityScore: number;
    verdict: string;
    critique: string;
  } | null>(null);

  // Pre-Trade Checklist State
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Loss / Win Analysis System State
  const [lossPrimaryReason, setLossPrimaryReason] = useState<string>('Strategy mistake');
  const [lossSecondaryReasons] = useState<string[]>([]);
  const [winPrimaryReason, setWinPrimaryReason] = useState<string>('Valid strategy');
  const [winSecondaryReasons] = useState<string[]>([]);
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

  useEffect(() => {
    setTradeId(defaultId);
  }, [defaultId]);

  // Sync with initialInstrument if provided
  useEffect(() => {
    if (initialInstrument && initialInstrument !== instrument && !tvExtraction) {
      setInstrument(initialInstrument);
      const ms = inferMarketAndSector(initialInstrument);
      setMarket(ms.market);
      setSector(ms.sector);
    }
  }, [initialInstrument]);

  useEffect(() => {
    if (!prefilledTradeData) return;
    if (prefilledTradeData.instrument) {
      setInstrument(prefilledTradeData.instrument);
      const ms = inferMarketAndSector(prefilledTradeData.instrument);
      setMarket(ms.market);
      setSector(ms.sector);
      onInstrumentChange?.(prefilledTradeData.instrument);
    }
    if (prefilledTradeData.direction) setDirection(prefilledTradeData.direction);
    if (typeof prefilledTradeData.entryPrice === 'number') setEntryPrice(String(prefilledTradeData.entryPrice));
    if (typeof prefilledTradeData.stopLoss === 'number') setStopLoss(String(prefilledTradeData.stopLoss));
    if (typeof prefilledTradeData.takeProfit === 'number') setTakeProfit(String(prefilledTradeData.takeProfit));
    if (
      prefilledTradeData.timeframe &&
      ['M1', 'M3', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'].includes(prefilledTradeData.timeframe)
    ) {
      setTimeframe(prefilledTradeData.timeframe as Timeframe);
    }
    if (prefilledTradeData.notes) setNotes(prefilledTradeData.notes);
    if (prefilledTradeData.screenshots?.entry) setEntryUrl(prefilledTradeData.screenshots.entry);
  }, [prefilledTradeData, onInstrumentChange]);

  const markFieldUserEdited = (fieldKey: string) => {
    setTvEditedFields((prev) => {
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
  };

  // Validate and process TradingView Screenshot Upload & Auto-Extraction
  const handleTradingViewFileSelect = async (file: File) => {
    setTvExtractionError(null);
    setSubmissionError(null);
    setDuplicateConflictTradeId(null);
    setAllowDuplicateOverride(false);
    setSavedSuccessInfo(null);

    const ext = file.name.toLowerCase().split('.').pop() || '';
    const allowedMime = ['image/png', 'image/jpeg', 'image/jpg'];
    const allowedExt = ['png', 'jpg', 'jpeg'];

    if (!allowedMime.includes(file.type.toLowerCase()) && !allowedExt.includes(ext)) {
      setTvExtractionError(
        `Unsupported file format (${file.name}). Please upload a PNG, JPG, or JPEG TradingView screenshot.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setTvExtractionError('Failed to read image file.');
        return;
      }

      const nowIso = new Date().toISOString();
      setTvImageDataUrl(dataUrl);
      setEntryUrl(dataUrl); // Also attach as the Entry chart screenshot
      setTvFileName(file.name);
      setTvMimeType(file.type || (ext === 'png' ? 'image/png' : 'image/jpeg'));
      setTvUploadTimestamp(nowIso);
      setTvExtracting(true);

      try {
        const res = await fetch('/api/journal/extract-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Demo-Mode': 'true',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            imageBase64: dataUrl,
            fileName: file.name,
            mimeType: file.type || (ext === 'png' ? 'image/png' : 'image/jpeg'),
          }),
        });

        const payload = await res.json();
        if (!res.ok || !payload.ok) {
          setTvExtractionError(payload.error || 'Could not extract data from screenshot.');
          setTvExtracting(false);
          return;
        }

        const result: TradingViewExtractionResult = payload.extraction;
        setTvExtraction(result);
        setTvEditedFields(new Set());

        const autoFields = new Set<string>();

        // 1. Instrument / Currency Pair (Never invent if missing)
        const resolvedInst = result.instrument || instrument || 'XAUUSD';
        if (result.instrument) {
          setInstrument(result.instrument);
          const ms = inferMarketAndSector(result.instrument);
          setMarket(ms.market);
          setSector(ms.sector);
          onInstrumentChange?.(result.instrument);
          autoFields.add('instrument');
        } else {
          setInstrument('');
        }

        // 2. Chart Timeframe (selected chart timeframe, never horizontal drawing bars)
        if (result.chartTimeframe && TIMEFRAMES.includes(result.chartTimeframe)) {
          setTimeframe(result.chartTimeframe);
          autoFields.add('timeframe');
        }

        // 3. Trade Direction (Long/Buy or Short/Sell)
        let resolvedDir: Direction = direction;
        if (result.direction === 'BUY' || result.direction === 'SELL') {
          resolvedDir = result.direction;
          setDirection(result.direction);
          setHtfTrend(result.direction === 'BUY' ? 'BULLISH' : 'BEARISH');
          setLtfTrend(result.direction === 'BUY' ? 'BULLISH' : 'BEARISH');
          autoFields.add('direction');
        } else if (
          result.entryPrice !== null &&
          Number.isFinite(result.entryPrice) &&
          result.stopLoss !== null &&
          Number.isFinite(result.stopLoss) &&
          result.entryPrice !== result.stopLoss
        ) {
          // Fallback direction inference from Entry vs SL if OCR direction was omitted
          resolvedDir = result.stopLoss > result.entryPrice ? 'SELL' : 'BUY';
          setDirection(resolvedDir);
          setHtfTrend(resolvedDir === 'BUY' ? 'BULLISH' : 'BEARISH');
          setLtfTrend(resolvedDir === 'BUY' ? 'BULLISH' : 'BEARISH');
          autoFields.add('direction');
        }

        // 4. Entry Price, Stop-Loss, Take-Profit (Planned Target), Actual Exit Price
        if (result.entryPrice !== null && Number.isFinite(result.entryPrice)) {
          setEntryPrice(String(result.entryPrice));
          autoFields.add('entryPrice');
        } else {
          setEntryPrice('');
        }

        if (result.stopLoss !== null && Number.isFinite(result.stopLoss)) {
          setStopLoss(String(result.stopLoss));
          autoFields.add('stopLoss');
        } else {
          setStopLoss('');
        }

        if (result.takeProfit !== null && Number.isFinite(result.takeProfit)) {
          setTakeProfit(String(result.takeProfit));
          autoFields.add('takeProfit');
        } else {
          setTakeProfit('');
        }

        // Automatically compute Lot Size from current Risk % if Entry and SL were extracted
        if (
          result.entryPrice !== null &&
          Number.isFinite(result.entryPrice) &&
          result.stopLoss !== null &&
          Number.isFinite(result.stopLoss) &&
          result.entryPrice > 0 &&
          result.stopLoss > 0 &&
          result.entryPrice !== result.stopLoss
        ) {
          const currentRiskPct = Number(riskPercentage);
          const effectiveRiskPct = Number.isFinite(currentRiskPct) && currentRiskPct > 0 ? currentRiskPct : 1;
          const acctBal = account.currentBalance || account.initialBalance || 10000;
          const targetRiskDollars = acctBal * (effectiveRiskPct / 100);
          const lotCalc = calculateFundedLotSize(
            resolvedInst,
            result.entryPrice,
            result.stopLoss,
            targetRiskDollars,
            account.currency
          );
          if (lotCalc.lotSize > 0) {
            setLotSize(String(lotCalc.lotSize));
          }
        }

        // Distinguish Planned Target Price from Actual Exit Price
        if (result.actualExitPrice !== null && result.actualExitPrice !== undefined && Number.isFinite(result.actualExitPrice)) {
          setExitPrice(String(result.actualExitPrice));
          autoFields.add('exitPrice');
        } else {
          setExitPrice('');
        }

        // 5. Default status to OPEN unless confirmed CLOSED or reliable broker data establishes outcome
        setTradeStatus(result.detectedTradeStatus === 'CLOSED' ? 'CLOSED' : 'OPEN');

        // 6. Visible R:R Ratio
        if (result.riskRewardRatio !== null && Number.isFinite(result.riskRewardRatio)) {
          setVisibleRrRatio(String(result.riskRewardRatio));
          autoFields.add('riskRewardRatio');
        } else {
          setVisibleRrRatio('');
        }

        // 7. Visible Trade Timestamp vs Unverified Fallback
        if (result.visibleTradeDate || result.visibleTradeTime) {
          if (result.visibleTradeDate) setDate(result.visibleTradeDate);
          if (result.visibleTradeTime) {
            setTime(result.visibleTradeTime);
            setSession(inferTradingSessionFromTime(result.visibleTradeTime));
          }
          setTvTradeTimeVerified(true);
          autoFields.add('tradeTimestamp');
        } else {
          setDate(getKarachiDate());
          setTime(getKarachiTime24());
          setTvTradeTimeVerified(false);
        }

        // 8. Auto-calculate safe Lot Size from Next Trade Guidance Risk % if entry & SL are known, or parse qty label
        const extractedPair = result.instrument || instrument || 'XAUUSD';
        const acctBal = account.currentBalance > 0 ? account.currentBalance : account.initialBalance || 10000;
        const guidanceRiskPct = preReadiness.recommendedRiskPercent > 0 ? preReadiness.recommendedRiskPercent : 0.5;
        const targetRiskDollars = (acctBal * guidanceRiskPct) / 100;

        let parsedLabelLot = 0;
        if (result.positionLabels?.amountOrQtyLabel) {
          const m = result.positionLabels.amountOrQtyLabel.match(/(\d+(?:\.\d+)?)/);
          if (m) {
            const v = Number(m[1]);
            if (v > 0 && v <= 100) parsedLabelLot = v;
          }
        }

        if (parsedLabelLot > 0) {
          setLotSize(String(parsedLabelLot));
          autoFields.add('lotSize');
        } else if (
          result.entryPrice !== null &&
          Number.isFinite(result.entryPrice) &&
          result.stopLoss !== null &&
          Number.isFinite(result.stopLoss) &&
          result.entryPrice !== result.stopLoss
        ) {
          const calc = calculateFundedLotSize(
            extractedPair,
            result.entryPrice,
            result.stopLoss,
            targetRiskDollars,
            account.currency
          );
          setLotSize(calc.lotSize > 0 ? String(calc.lotSize) : '0.10');
        } else {
          setLotSize('');
        }

        setTvAutoExtractedFields(autoFields);
      } catch (err: any) {
        setTvExtractionError(err?.message || 'Network error while analyzing TradingView screenshot.');
      } finally {
        setTvExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const totalChecklistItems = 8;

  const preReadiness = calculateNextTradeReadiness(existingTrades || [], account);

  // Parsed Numeric Execution Values
  const parsedEntry = Number(entryPrice);
  const parsedSl = Number(stopLoss);
  const parsedTp = takeProfit.trim() !== '' ? Number(takeProfit) : NaN;
  const parsedExit = exitPrice.trim() !== '' ? Number(exitPrice) : NaN;
  const parsedLot = Number(lotSize);

  const effectiveEntry = Number.isFinite(parsedEntry) && parsedEntry > 0 ? parsedEntry : 0;
  const effectiveSl = Number.isFinite(parsedSl) && parsedSl > 0 ? parsedSl : 0;
  const effectiveTp = Number.isFinite(parsedTp) && parsedTp > 0 ? parsedTp : 0;
  const effectiveExit =
    tradeStatus === 'CLOSED' && Number.isFinite(parsedExit) && parsedExit > 0
      ? parsedExit
      : effectiveTp > 0
      ? effectiveTp
      : effectiveEntry;
  const effectiveLot = Number.isFinite(parsedLot) && parsedLot > 0 ? parsedLot : 0;

  // Auto Calculations (Instrument-aware Pip & Dollar Risk/Reward Engine)
  const activeAccountBalance =
    account.currentBalance && account.currentBalance > 0
      ? account.currentBalance
      : account.initialBalance || 10000;

  const instrumentSpec = useMemo(() => getInstrumentSpec(instrument || 'XAUUSD'), [instrument]);

  const pipValuePerStandardLot = useMemo(() => {
    let pv = instrumentSpec.pipValuePerStandardLot || 10;
    if (account.currency === 'Cent' || account.currency === 'USC') {
      pv *= 100;
    }
    return pv;
  }, [instrumentSpec, account.currency]);

  const stopDistancePips = useMemo(() => {
    if (effectiveEntry <= 0 || effectiveSl <= 0) return 0;
    const distPrice = Math.abs(effectiveEntry - effectiveSl);
    return Number((distPrice / (instrumentSpec.pipSize || 0.0001)).toFixed(1));
  }, [effectiveEntry, effectiveSl, instrumentSpec]);

  const targetDistancePips = useMemo(() => {
    if (effectiveEntry <= 0 || effectiveTp <= 0) return 0;
    const distPrice = Math.abs(effectiveTp - effectiveEntry);
    return Number((distPrice / (instrumentSpec.pipSize || 0.0001)).toFixed(1));
  }, [effectiveEntry, effectiveTp, instrumentSpec]);

  // Potential Dollar Loss if Stop-Loss is hit
  const riskAmount = useMemo(() => {
    if (effectiveEntry <= 0 || effectiveSl <= 0 || effectiveLot <= 0) return 0;
    const rawRisk = stopDistancePips * pipValuePerStandardLot * effectiveLot;
    return Number(Math.max(0.5, rawRisk).toFixed(2));
  }, [effectiveEntry, effectiveSl, effectiveLot, stopDistancePips, pipValuePerStandardLot]);

  // Potential Dollar Profit if Take-Profit is hit
  const potentialProfitDollars = useMemo(() => {
    if (effectiveEntry <= 0 || effectiveTp <= 0 || effectiveLot <= 0) return 0;
    const rawReward = targetDistancePips * pipValuePerStandardLot * effectiveLot;
    return Number(Math.max(0, rawReward).toFixed(2));
  }, [effectiveEntry, effectiveTp, effectiveLot, targetDistancePips, pipValuePerStandardLot]);

  const projectedOrRealizedProfitLoss = useMemo(() => {
    if (effectiveEntry <= 0 || effectiveExit <= 0 || effectiveLot <= 0) return 0;
    const exitDistPrice =
      direction === 'BUY' ? effectiveExit - effectiveEntry : effectiveEntry - effectiveExit;
    const exitDistPips = exitDistPrice / (instrumentSpec.pipSize || 0.0001);
    return Number((exitDistPips * pipValuePerStandardLot * effectiveLot).toFixed(2));
  }, [effectiveEntry, effectiveExit, effectiveLot, direction, instrumentSpec, pipValuePerStandardLot]);

  const profitLoss = tradeStatus === 'OPEN' ? 0 : projectedOrRealizedProfitLoss;

  const computedRr = useMemo(() => {
    if (visibleRrRatio.trim() !== '' && Number.isFinite(Number(visibleRrRatio)) && Number(visibleRrRatio) > 0) {
      return Number(visibleRrRatio);
    }
    if (effectiveEntry > 0 && effectiveSl > 0 && effectiveTp > 0 && effectiveEntry !== effectiveSl) {
      const riskDist = Math.abs(effectiveEntry - effectiveSl);
      const rewardDist = Math.abs(effectiveTp - effectiveEntry);
      return Number((rewardDist / riskDist).toFixed(2));
    }
    return riskAmount > 0 ? Number((projectedOrRealizedProfitLoss / riskAmount).toFixed(2)) : 0;
  }, [visibleRrRatio, effectiveEntry, effectiveSl, effectiveTp, riskAmount, projectedOrRealizedProfitLoss]);

  const rMultiple =
    tradeStatus === 'OPEN'
      ? computedRr
      : riskAmount > 0
      ? Number((profitLoss / riskAmount).toFixed(2))
      : 0;

  const pips =
    effectiveEntry > 0 && effectiveExit > 0
      ? Number(
          (
            (direction === 'BUY' ? effectiveExit - effectiveEntry : effectiveEntry - effectiveExit) /
            (instrumentSpec.pipSize || 0.0001)
          ).toFixed(1)
        )
      : 0;

  const calculatedRiskPercent =
    activeAccountBalance > 0 && riskAmount > 0
      ? Number(((riskAmount / activeAccountBalance) * 100).toFixed(2))
      : 0;

  // Helper to set Lot Size from a desired Risk Percentage (%)
  const applyRiskPercentToLotSize = (targetRiskPct: number, customEntry?: number, customSl?: number) => {
    setRiskPercentage(String(targetRiskPct));
    const entryVal = customEntry !== undefined ? customEntry : effectiveEntry;
    const slVal = customSl !== undefined ? customSl : effectiveSl;
    if (entryVal <= 0 || slVal <= 0 || entryVal === slVal || targetRiskPct <= 0) {
      return;
    }
    const targetDollars = (activeAccountBalance * targetRiskPct) / 100;
    const calc = calculateFundedLotSize(
      instrument || 'XAUUSD',
      entryVal,
      slVal,
      targetDollars,
      account.currency
    );
    if (calc.lotSize > 0) {
      setLotSize(String(calc.lotSize));
      markFieldUserEdited('lotSize');
    }
  };

  // Helper to adjust Lot Size and dynamically sync Risk Percentage (%)
  const handleLotSizeChange = (newLotStr: string) => {
    setLotSize(newLotStr);
    markFieldUserEdited('lotSize');
    const numericLot = Number(newLotStr);
    if (Number.isFinite(numericLot) && numericLot > 0 && stopDistancePips > 0 && activeAccountBalance > 0) {
      const newRiskDollars = stopDistancePips * pipValuePerStandardLot * numericLot;
      const newRiskPct = Number(((newRiskDollars / activeAccountBalance) * 100).toFixed(2));
      setRiskPercentage(String(newRiskPct));
    }
  };

  const stepLotSize = (delta: number) => {
    const current = Number(lotSize) || 0;
    const next = Math.max(0.01, Number((current + delta).toFixed(2)));
    handleLotSizeChange(String(next));
  };

  // Helper to calculate Take-Profit price from a target R:R multiple based on Entry Price and Stop-Loss
  const applyRrTargetPrice = (rrMultiple: number) => {
    if (effectiveEntry <= 0 || effectiveSl <= 0 || effectiveEntry === effectiveSl || rrMultiple <= 0) return;
    const riskDist = Math.abs(effectiveEntry - effectiveSl);
    const rewardDist = riskDist * rrMultiple;
    const rawTp = direction === 'BUY' ? effectiveEntry + rewardDist : effectiveEntry - rewardDist;
    const decimals =
      entryPrice.includes('.') ? Math.max(2, entryPrice.split('.')[1]?.length || 2) : instrumentSpec.pipSize < 0.001 ? 5 : 2;
    const formattedTp = Number(rawTp.toFixed(decimals));
    if (formattedTp > 0) {
      setTakeProfit(String(formattedTp));
      markFieldUserEdited('takeProfit');
    }
  };

  // Price Relationship & Setup Validation
  const priceValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresAdvancedConfirmation = false;

    if (!instrument.trim()) {
      errors.push('Currency Pair / Instrument is required.');
    }
    if (!Number.isFinite(parsedEntry) || parsedEntry <= 0) {
      errors.push('Valid Entry Price (> 0) is required.');
    }
    if (!Number.isFinite(parsedSl) || parsedSl <= 0) {
      errors.push('Valid Stop-Loss Price (> 0) is required.');
    }
    if (!Number.isFinite(parsedLot) || parsedLot <= 0) {
      errors.push('Valid Lot Size (> 0) is required.');
    }

    if (Number.isFinite(parsedEntry) && parsedEntry > 0 && Number.isFinite(parsedSl) && parsedSl > 0) {
      if (direction === 'BUY') {
        if (parsedSl >= parsedEntry) {
          requiresAdvancedConfirmation = true;
          warnings.push(
            `BUY / LONG Setup Note: Stop-Loss (${parsedSl}) is at or above Entry (${parsedEntry}). Confirm below if this is a trailed / break-even stop.`
          );
        }
        if (Number.isFinite(parsedTp) && parsedTp > 0 && parsedTp <= parsedEntry) {
          errors.push(
            `Invalid BUY / LONG Target: Take-Profit (${parsedTp}) must be above Entry Price (${parsedEntry}).`
          );
        }
      } else {
        if (parsedSl <= parsedEntry) {
          requiresAdvancedConfirmation = true;
          warnings.push(
            `SELL / SHORT Setup Note: Stop-Loss (${parsedSl}) is at or below Entry (${parsedEntry}). Confirm below if this is a trailed / break-even stop.`
          );
        }
        if (Number.isFinite(parsedTp) && parsedTp > 0 && parsedTp >= parsedEntry) {
          errors.push(
            `Invalid SELL / SHORT Target: Take-Profit (${parsedTp}) must be below Entry Price (${parsedEntry}).`
          );
        }
      }
    }

    if (!Number.isFinite(parsedTp) || parsedTp <= 0) {
      warnings.push('Take-Profit target is empty — trade will be recorded with an open / unfixed target.');
    }

    if (tradeStatus === 'CLOSED' && (!Number.isFinite(parsedExit) || parsedExit <= 0)) {
      errors.push('Closed trades require a valid Actual Exit Price (> 0).');
    }

    return { errors, warnings, requiresAdvancedConfirmation };
  }, [instrument, parsedEntry, parsedSl, parsedTp, parsedExit, parsedLot, direction, tradeStatus]);

  const tradeEntryDate = date || getKarachiDate();
  const todayTradesCount = (existingTrades || []).filter((t) => t.date === tradeEntryDate).length;
  const isRiskExceeded = calculatedRiskPercent > 1.001;
  const isDailyLimitReached = todayTradesCount >= 2;

  // Funded Risk Engine integration
  const isFunded = isFundedAccount(account);
  const fundedRiskEval = useMemo(() => {
    if (!isFunded) return null;
    return evaluateFundedAccountRisk(account, existingTrades || []);
  }, [isFunded, account, existingTrades]);

  const safeFundedLot = useMemo(() => {
    if (!fundedRiskEval || effectiveEntry <= 0 || effectiveSl <= 0 || effectiveEntry === effectiveSl) return 0;
    const res = calculateFundedLotSize(
      instrument || 'XAUUSD',
      effectiveEntry,
      effectiveSl,
      fundedRiskEval.recommendedRiskDollars,
      account.currency
    );
    return res.lotSize;
  }, [fundedRiskEval, instrument, effectiveEntry, effectiveSl, account.currency]);

  // Standard 1% Safe Lot Calculator for any account
  const standardSafeLot = useMemo(() => {
    if (effectiveEntry <= 0 || effectiveSl <= 0 || effectiveEntry === effectiveSl) return 0;
    const onePercentDollars = (account.currentBalance || account.initialBalance || 10000) * 0.01;
    const res = calculateFundedLotSize(
      instrument || 'XAUUSD',
      effectiveEntry,
      effectiveSl,
      onePercentDollars,
      account.currency
    );
    return res.lotSize;
  }, [instrument, effectiveEntry, effectiveSl, account.currentBalance, account.initialBalance, account.currency]);

  const isFundedDailyBreachRisk =
    isFunded && fundedRiskEval && riskAmount > fundedRiskEval.remainingDailyDrawdown;
  const isFundedOverallBreachRisk =
    isFunded && fundedRiskEval && riskAmount > fundedRiskEval.remainingOverallDrawdown;
  const isFundedLocked =
    isFunded && fundedRiskEval && fundedRiskEval.tradingStatus === 'LOCKED';

  const qualityScoreResult = calculateTradeQualityScore({
    htfAlignment:
      (htfTrend === 'BULLISH' && direction === 'BUY') || (htfTrend === 'BEARISH' && direction === 'SELL'),
    entryModel: strategy,
    riskRewardRatio: Math.max(0, rMultiple),
    riskPercent: calculatedRiskPercent,
    maxAllowedRiskPercent: 1,
    preEmotion,
    followedPlan,
  });

  const totalQualityScore = qualityScoreResult.totalQuality;
  const suggestedGrade: TradeGrade =
    totalQualityScore >= 90
      ? 'A+'
      : totalQualityScore >= 80
      ? 'A'
      : totalQualityScore >= 65
      ? 'B'
      : totalQualityScore >= 50
      ? 'C'
      : 'F';

  const qualityFeedback: string[] = [];
  if (qualityScoreResult.htfAlignmentScore >= 18)
    qualityFeedback.push('HTF Trend aligned with market structure');
  else qualityFeedback.push('HTF Trend counter to execution direction');
  if (qualityScoreResult.riskComplianceScore >= 18)
    qualityFeedback.push('Risk strictly within account allocation');
  else qualityFeedback.push('Risk exceeds recommended threshold');
  if (qualityScoreResult.psychologyScore >= 16)
    qualityFeedback.push('Optimal composed psychological state');
  else qualityFeedback.push('Elevated emotional state detected');

  // Auto derive violation level
  let ruleViolationLevel: RuleViolationLevel = 'NONE';
  if (selectedViolations.length > 0 || revengeTraded || overtraded || movedStopLoss) {
    ruleViolationLevel =
      revengeTraded ||
      movedStopLoss ||
      selectedViolations.some((v) => v.includes('Major') || v.includes('Cap'))
        ? 'MAJOR'
        : 'MINOR';
  }

  // Handle secondary image upload helper
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
            entryPrice: effectiveEntry,
            stopLoss: effectiveSl,
            takeProfit: effectiveTp,
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
          critique:
            typeof data.analysis.critique === 'string'
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

  const renderFieldExtractionBadge = (fieldKey: string, isRequired = false) => {
    if (!tvExtraction && !tvImageDataUrl) {
      return isRequired ? <span className="text-[10px] text-cyan-400 font-mono-code">REQUIRED</span> : null;
    }
    const wasAuto = tvAutoExtractedFields.has(fieldKey);
    const wasEdited = tvEditedFields.has(fieldKey);
    const isUncertain = tvExtraction?.uncertainFields?.includes(fieldKey);

    if (wasEdited) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          ✎ EDITED
        </span>
      );
    }
    if (wasAuto && !isUncertain) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          ✓ AUTO-EXTRACTED
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
        ⚠ {isRequired ? 'ENTER / CONFIRM' : 'CONFIRM'}
      </span>
    );
  };

  const resetForAnotherTrade = () => {
    setSavedSuccessInfo(null);
    setTvImageDataUrl('');
    setTvFileName('');
    setTvMimeType('');
    setTvExtraction(null);
    setTvExtractionError(null);
    setTvAutoExtractedFields(new Set());
    setTvEditedFields(new Set());
    setDuplicateConflictTradeId(null);
    setAllowDuplicateOverride(false);
    setPreTradeMindsetNotes('');
    setPostTradeMindsetNotes('');
    setAnalysisNotes('');
    setNotes('');
    setBeforeEntryUrl('');
    setEntryUrl('');
    setAfterTradeUrl('');
    setHtfAnalysisUrl('');
  };

  const handleSave = async () => {
    setSubmissionError(null);

    if (priceValidation.errors.length > 0) {
      setSubmissionError(priceValidation.errors[0]);
      return;
    }

    if (priceValidation.requiresAdvancedConfirmation && !advancedSetupConfirmed) {
      setSubmissionError(
        'Please check the confirmation box to verify your advanced stop-loss setup (break-even or trailed stop).'
      );
      return;
    }

    const formattedTime = formatTo12Hour(time) || getKarachiTime();
    const journalCreatedNowIso = new Date().toISOString();

    // Map loss/win analysis reason to mistakeReason if applicable
    let finalMistakeReason: MistakeReason = mistakeReason;
    if (tradeStatus === 'CLOSED' && tradeResult === 'LOSS') {
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
    } else if (tradeStatus === 'CLOSED' && tradeResult === 'WIN') {
      finalMistakeReason = 'None (Flawless)';
    }

    const postTradeAnalysis = {
      tradeOutcome: tradeResult,
      primaryReason:
        tradeResult === 'LOSS'
          ? lossPrimaryReason
          : tradeResult === 'WIN'
          ? winPrimaryReason
          : 'Breakeven execution',
      secondaryReasons:
        tradeResult === 'LOSS'
          ? lossSecondaryReasons
          : tradeResult === 'WIN'
          ? winSecondaryReasons
          : [],
      notes: postTradeMindsetNotes || analysisNotes,
      actionableTakeaway:
        tradeResult === 'LOSS'
          ? `Primary factor: ${lossPrimaryReason}. Strict execution focus required for next session.`
          : `Key success factor: ${winPrimaryReason}. Maintain this institutional discipline.`,
      recommendedModule:
        tradeResult === 'LOSS' &&
        (lossPrimaryReason === 'Fear' ||
          lossPrimaryReason === 'Greed' ||
          lossPrimaryReason === 'FOMO' ||
          lossPrimaryReason === 'Revenge trading' ||
          lossPrimaryReason === 'Psychology' ||
          lossPrimaryReason === 'Overtrading')
          ? 'PSYCHOLOGY'
          : 'PRE_TRADE_PLAN',
    };

    // Compose unified notes including Pre-Trade Mindset, Post-Trade Mindset, and Tactical Notes
    const combinedNotesParts: string[] = [];
    if (preTradeMindsetNotes.trim()) {
      combinedNotesParts.push(`[BEFORE TRADE — MINDSET & ANALYSIS]: ${preTradeMindsetNotes.trim()}`);
    }
    if (postTradeMindsetNotes.trim()) {
      combinedNotesParts.push(`[AFTER TRADE — MINDSET & REVIEW]: ${postTradeMindsetNotes.trim()}`);
    }
    if (analysisNotes.trim()) {
      combinedNotesParts.push(`[POST-TRADE LESSON (${postTradeAnalysis.primaryReason})]: ${analysisNotes.trim()}`);
    }
    if (notes.trim()) {
      combinedNotesParts.push(notes.trim());
    }

    const screenshotTradeTimestamp =
      tvExtraction && tvTradeTimeVerified ? `${date}T${time}:00+05:00` : null;

    const newTrade: Trade = {
      id: tradeId,
      accountId: account.id,
      tradeNumber: nextTradeNumber,
      date: date || getKarachiDate(),
      time: formattedTime,
      broker,
      accountType,
      accountSize: account.initialBalance,
      instrument: instrument.trim().toUpperCase(),
      direction,
      timeframe,
      session,
      status: tradeStatus,
      result: tradeResult,
      entryPrice: effectiveEntry,
      stopLoss: effectiveSl,
      takeProfit: effectiveTp,
      exitPrice: tradeStatus === 'CLOSED' ? effectiveExit : effectiveTp || effectiveEntry,
      plannedTargetPrice: effectiveTp > 0 ? effectiveTp : null,
      actualExitPrice: tradeStatus === 'CLOSED' && Number.isFinite(parsedExit) && parsedExit > 0 ? parsedExit : null,
      lotSize: effectiveLot,
      riskAmount: Math.round(riskAmount * 100) / 100,
      riskPercent: calculatedRiskPercent,
      potentialProfitDollars: potentialProfitDollars > 0 ? Math.round(potentialProfitDollars * 100) / 100 : undefined,
      profitLoss: Math.round(profitLoss * 100) / 100,
      rMultiple,
      pips: Number(pips.toFixed(1)),
      market,
      sector,
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
      preTradeMindsetNotes: preTradeMindsetNotes.trim() || undefined,
      postTradeMindsetNotes: postTradeMindsetNotes.trim() || undefined,
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
        entry: entryUrl || tvImageDataUrl || undefined,
        afterTrade: afterTradeUrl || undefined,
        htfAnalysis: htfAnalysisUrl || undefined,
      },
      notes: combinedNotesParts.join('\n\n'),
      preTradeChecklist:
        completedChecklistCount > 0
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
      // Screenshot-to-Journal Data Integrity Fields
      screenshotHash: tvExtraction?.screenshotHash || undefined,
      idempotencyKey: tvExtraction?.screenshotHash
        ? `${account.id}:${tvExtraction.screenshotHash}:${instrument.trim().toUpperCase()}:${direction}:${effectiveEntry}:${effectiveSl}`
        : undefined,
      screenshotTradeTimestamp,
      screenshotUploadTimestamp: tvUploadTimestamp || undefined,
      journalCreatedAt: journalCreatedNowIso,
      tradeTimeVerified: tvExtraction ? tvTradeTimeVerified : true,
      visibleRiskRewardRatio: computedRr > 0 ? computedRr : null,
      screenshotImportMeta: tvExtraction
        ? {
            importedFromScreenshot: true,
            fileName: tvFileName,
            mimeType: tvMimeType,
            positionToolType: tvExtraction.positionToolType,
            rawTimeframeLabel: tvExtraction.rawTimeframeLabel,
            drawingHorizontalDurationIgnored: tvExtraction.drawingHorizontalDurationIgnored,
            visibleTimestampRaw: tvExtraction.visibleTimestampRaw,
            positionLabels: tvExtraction.positionLabels,
            uncertainFields: tvExtraction.uncertainFields,
            userEditedFields: Array.from(tvEditedFields),
            advancedSetupConfirmed,
            extractionSource: tvExtraction.source,
          }
        : undefined,
    };

    // If a TradingView screenshot was uploaded or atomic save handler is provided, use atomic save
    if (onSaveScreenshotTrade && (tvImageDataUrl || tvExtraction)) {
      setIsSavingTrade(true);
      try {
        const result = await onSaveScreenshotTrade(newTrade, {
          allowDuplicateOverride,
        });
        if (!result.ok || !result.saved || !result.trade) {
          if (result.duplicate && result.existingTradeId) {
            setDuplicateConflictTradeId(result.existingTradeId);
          }
          setSubmissionError(
            result.error ||
              (result.errors && result.errors[0]) ||
              'Database could not confirm trade persistence.'
          );
          return;
        }
        setSavedSuccessInfo({
          tradeId: result.tradeId || result.trade.id,
          dbUuid: result.dbUuid || result.trade.dbUuid,
          trade: result.trade,
        });
      } finally {
        setIsSavingTrade(false);
      }
      return;
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#020617] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-military font-bold tracking-wider text-slate-100">
                  RECORD NEW TRADE & TRADINGVIEW CHART IMPORT
                </h3>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  TRADE #{nextTradeNumber} ({tradeId})
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {APP_TIMEZONE_FULL_LABEL}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Upload your TradingView chart screenshot to auto-extract pair, prices & timeframe — then complete Strategy, Market, Sector, and Pre/Post-Trade Mindset.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Confirmation View after Screenshot Trade Commit */}
        {savedSuccessInfo ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-slate-200 flex-1">
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono-code uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    DATABASE PERSISTENCE CONFIRMED
                  </span>
                  <h4 className="text-lg font-military font-bold text-white mt-1">
                    TRADE SUCCESSFULLY RECORDED IN JOURNAL
                  </h4>
                  <p className="text-xs text-slate-400">
                    Your TradingView chart data, strategy setup, and pre/post-trade mindset analysis have been saved.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 font-mono-code">
                <div>
                  <span className="text-[10px] text-slate-400 block">GENERATED TRADE ID</span>
                  <span className="text-sm font-bold text-cyan-400">{savedSuccessInfo.tradeId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">INSTRUMENT & SIDE</span>
                  <span className="text-sm font-bold text-white">
                    {savedSuccessInfo.trade.instrument} ({savedSuccessInfo.trade.direction})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">TIMEFRAME & STATUS</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {savedSuccessInfo.trade.timeframe} • {savedSuccessInfo.trade.status || 'OPEN'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LOT SIZE & R:R</span>
                  <span className="text-sm font-bold text-amber-300">
                    {savedSuccessInfo.trade.lotSize} Lots • 1:{savedSuccessInfo.trade.rMultiple}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono-code">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">CHART TRADE TIMESTAMP</span>
                  <span className="text-slate-200 font-semibold">
                    {savedSuccessInfo.trade.tradeTimeVerified
                      ? `${savedSuccessInfo.trade.date} ${savedSuccessInfo.trade.time} (Verified)`
                      : 'Unverified on Chart (Marked Unverified)'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">SCREENSHOT UPLOAD TIME</span>
                  <span className="text-slate-200 font-semibold">
                    {savedSuccessInfo.trade.screenshotUploadTimestamp
                      ? new Date(savedSuccessInfo.trade.screenshotUploadTimestamp).toLocaleTimeString()
                      : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">JOURNAL CREATED TIME</span>
                  <span className="text-slate-200 font-semibold">
                    {savedSuccessInfo.trade.journalCreatedAt
                      ? new Date(savedSuccessInfo.trade.journalCreatedAt).toLocaleTimeString()
                      : 'Just now'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    resetForAnotherTrade();
                    setTimeout(() => tvFileInputRef.current?.click(), 100);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-military font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>UPLOAD ANOTHER SCREENSHOT</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer transition shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>DONE — VIEW IN JOURNAL</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Unified Form Body */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-200 flex-1">
            {/* STEP 1: UPLOAD TRADINGVIEW CHART SCREENSHOT (AUTO-EXTRACT DATA) */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition ${
                autoFocusScreenshotUpload || tvImageDataUrl
                  ? 'bg-gradient-to-br from-emerald-950/30 via-slate-950/90 to-cyan-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                  : 'bg-gradient-to-r from-slate-950 via-slate-900/90 to-cyan-950/25 border-cyan-500/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-military font-bold text-emerald-300 tracking-wider uppercase">
                        STEP 1: UPLOAD TRADINGVIEW CHART SCREENSHOT (AUTO-EXTRACT TRADE DATA)
                      </span>
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        PNG • JPG • JPEG
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Upload your TradingView chart to automatically extract Pair, Timeframe, Buy/Sell Direction, Entry, Stop-Loss, Take-Profit & R:R — then fill in your Strategy, Market, Sector, and Pre/Post-Trade Mindset below.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={tvFileInputRef}
                    id="trade-entry-tv-screenshot-input"
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTradingViewFileSelect(file);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => tvFileInputRef.current?.click()}
                    disabled={tvExtracting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition shrink-0"
                  >
                    {tvExtracting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>EXTRACTING CHART DATA...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>{tvImageDataUrl ? 'REPLACE TRADINGVIEW CHART' : 'UPLOAD TRADINGVIEW CHART'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {tvExtractionError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 font-mono-code text-xs flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{tvExtractionError}</span>
                </div>
              )}

              {!tvImageDataUrl ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleTradingViewFileSelect(file);
                  }}
                  onClick={() => tvFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-400/60 rounded-xl p-5 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 group-hover:border-emerald-500/50 flex items-center justify-center text-emerald-400 transition shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-mono-code font-bold text-slate-200 group-hover:text-emerald-300 transition">
                        Click or Drag & Drop your TradingView Screenshot here (.PNG, .JPG, .JPEG)
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                        Supports Long Position & Short Position drawings, order lines, and multi-timeframe TradingView charts.
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono-code text-[11px] shrink-0">
                    Select Chart Image →
                  </span>
                </div>
              ) : (
                /* Side-by-Side Uploaded TradingView Screenshot + Extraction Summary */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800/80">
                  {/* Left: Uploaded Screenshot Preview */}
                  <div className="lg:col-span-5 bg-slate-950 rounded-xl border border-slate-800 p-2.5 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                      <span className="truncate max-w-[220px] text-slate-200 font-bold">{tvFileName || 'TradingView Chart'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTvImageDataUrl('');
                          setTvExtraction(null);
                          setTvAutoExtractedFields(new Set());
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] underline cursor-pointer"
                      >
                        Remove Chart
                      </button>
                    </div>
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-52">
                      <img
                        src={tvImageDataUrl}
                        alt="Uploaded TradingView Screenshot"
                        className="w-full h-48 object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                      <span>
                        Upload Time: {tvUploadTimestamp ? new Date(tvUploadTimestamp).toLocaleTimeString() : 'Just now'}
                      </span>
                      {entryUrl && (
                        <button
                          type="button"
                          disabled={aiAuditing}
                          onClick={() => runAiScreenshotAudit(entryUrl)}
                          className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-cyan-300 font-bold rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{aiAuditing ? 'Auditing...' : 'Run AI Chart Audit'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Extracted Data & Status Banner */}
                  <div className="lg:col-span-7 bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 flex flex-col justify-between space-y-3">
                    {tvExtracting ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                        <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
                        <div className="font-military font-bold text-sm text-slate-100">
                          ANALYZING TRADINGVIEW SCREENSHOT & POSITION TOOL...
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono-code">
                          Extracting Instrument, Chart Timeframe, Buy/Sell Direction, Entry, Stop-Loss, Target & R:R...
                        </p>
                      </div>
                    ) : tvExtraction ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border ${
                                tvExtraction.isReadableTradingViewChart
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {tvExtraction.isReadableTradingViewChart
                                ? `✓ ${tvExtraction.positionToolType || 'TRADINGVIEW CHART'} EXTRACTED`
                                : '⚠ PARTIAL / UNCERTAIN EXTRACTION — CONFIRM BELOW'}
                            </span>
                            {tvExtraction.drawingHorizontalDurationIgnored && (
                              <span className="text-[10px] font-mono-code text-slate-400">
                                (Ignored drawing duration: {tvExtraction.drawingHorizontalDurationIgnored})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono-code text-cyan-400">
                            Trade Time: {tvTradeTimeVerified ? '✓ Verified from Chart' : '⚠ Unverified (Using Current PKT)'}
                          </span>
                        </div>

                         {/* Compact Extracted Values Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-code text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">PAIR & TIMEFRAME</span>
                            <span className="font-bold text-slate-100">
                              {instrument || 'Needs Input'} • {timeframe}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">DIRECTION</span>
                            <span
                              className={`font-bold ${
                                direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {direction === 'BUY' ? 'LONG / BUY' : 'SHORT / SELL'}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">ENTRY / SL / TP</span>
                            <span className="font-bold text-cyan-300">
                              {entryPrice || '?'} / {stopLoss || '?'} / {takeProfit || 'Open'}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">VISIBLE R:R RATIO</span>
                            <span className="font-bold text-amber-300">
                              {computedRr > 0 ? `1 : ${computedRr}` : 'Auto'}
                            </span>
                          </div>
                        </div>

                        {/* Live Risk %, Lot Size & Potential Dollar Outcome Indicator right in Screenshot Card */}
                        <div className="p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-military font-bold text-cyan-300 uppercase tracking-wider">
                              LIVE RISK %, LOT SIZE & POTENTIAL DOLLAR OUTCOME INDICATOR
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[0.25, 0.5, 1.0].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => applyRiskPercentToLotSize(pct)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border transition cursor-pointer ${
                                    Math.abs(calculatedRiskPercent - pct) < 0.05
                                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-cyan-500/50'
                                  }`}
                                >
                                  {pct}% Risk
                                </button>
                              ))}
                              {preReadiness.recommendedRiskPercent > 0 && (
                                <button
                                  type="button"
                                  onClick={() => applyRiskPercentToLotSize(preReadiness.recommendedRiskPercent)}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                                >
                                  Guidance: {preReadiness.recommendedRiskPercent}%
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-code">
                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[9px] text-slate-400 block">LOT SIZE (EDITABLE)</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={lotSize}
                                  onChange={(e) => handleLotSizeChange(e.target.value)}
                                  placeholder="0.10"
                                  className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-500/40 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400"
                                />
                                <span className="text-[10px] text-slate-400">Lots</span>
                              </div>
                              <span className="text-[9px] text-amber-300 font-semibold block mt-0.5">
                                SL Distance: {stopDistancePips} pips
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[9px] text-slate-400 block">RISK % (EDITABLE)</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.05"
                                  max="100"
                                  value={riskPercentage}
                                  onChange={(e) => {
                                    setRiskPercentage(e.target.value);
                                    const v = Number(e.target.value);
                                    if (Number.isFinite(v) && v > 0) {
                                      applyRiskPercentToLotSize(v);
                                    }
                                  }}
                                  className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-400"
                                />
                                <span className="text-xs font-bold text-emerald-300">
                                  ({calculatedRiskPercent}%)
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 block mt-0.5">
                                of {formatCurrency(activeAccountBalance, account.currency)}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/40">
                              <span className="text-[9px] text-rose-300 block">POTENTIAL DOLLAR LOSS</span>
                              <span className="text-sm font-bold text-rose-400">
                                -{formatCurrency(riskAmount, account.currency)}
                              </span>
                              <span className="text-[9px] text-rose-300/80 block">
                                SL: {stopLoss || '?'} ({stopDistancePips} pips)
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/40">
                              <span className="text-[9px] text-emerald-300 block">POTENTIAL TP VALUE</span>
                              <span className="text-sm font-bold text-emerald-400">
                                {potentialProfitDollars > 0
                                  ? `+${formatCurrency(potentialProfitDollars, account.currency)}`
                                  : 'Set TP Price'}
                              </span>
                              <span className="text-[9px] text-emerald-300/80 block">
                                TP: {takeProfit || 'Open'} ({targetDistancePips} pips)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Position Labels if present */}
                        {tvExtraction.positionLabels &&
                          (tvExtraction.positionLabels.stopDistanceLabel ||
                            tvExtraction.positionLabels.targetDistanceLabel ||
                            tvExtraction.positionLabels.amountOrQtyLabel) && (
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-code text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 font-bold">Chart Labels:</span>
                              {tvExtraction.positionLabels.targetDistanceLabel && (
                                <span className="text-emerald-300">
                                  Target: {tvExtraction.positionLabels.targetDistanceLabel}
                                </span>
                              )}
                              {tvExtraction.positionLabels.stopDistanceLabel && (
                                <span className="text-rose-300">
                                  Stop: {tvExtraction.positionLabels.stopDistanceLabel}
                                </span>
                              )}
                              {tvExtraction.positionLabels.amountOrQtyLabel && (
                                <span className="text-cyan-300">
                                  Qty/Amt: {tvExtraction.positionLabels.amountOrQtyLabel}
                                </span>
                              )}
                            </div>
                          )}

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-code text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                          <span>
                            👉 <strong>Next Step:</strong> Verify extracted fields, adjust <strong>Risk % & Lot Size</strong>, select <strong>Strategy</strong>, and add your <strong>Before & After Trade Mindset</strong> below!
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Pre-Execution Protocol & Readiness Guidance Banner */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                preReadiness.status === 'RED'
                  ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                  : preReadiness.status === 'YELLOW'
                  ? 'bg-amber-950/20 border-blue-500/40 text-amber-300'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-2 rounded-lg border ${
                    preReadiness.status === 'RED'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : preReadiness.status === 'YELLOW'
                      ? 'bg-blue-500/20 border-blue-500/40 text-cyan-400'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                        preReadiness.status === 'RED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : preReadiness.status === 'YELLOW'
                          ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {preReadiness.status === 'RED'
                        ? 'DEFCON 5: LOCKOUT'
                        : preReadiness.status === 'YELLOW'
                        ? 'DEFCON 3: CAUTION'
                        : 'DEFCON 1: GREEN'}
                    </span>
                    <span className="font-military font-bold text-xs tracking-wider text-slate-100">
                      {preReadiness.headline}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 font-mono-code">
                    Max Allowed Risk: <strong>{formatCurrency(preReadiness.recommendedRiskDollars, account.currency)}</strong> • Daily Remaining: <strong className="text-emerald-400">{formatCurrency(preReadiness.remainingDailyRiskDollars, account.currency)}</strong>
                  </p>
                </div>
              </div>

              {onOpenPreTradePlan && (
                <button
                  type="button"
                  onClick={onOpenPreTradePlan}
                  className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-lg font-military font-bold text-[11px] tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <span>PRE-TRADE PLAN</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* STEP 2: GENERAL SETUP, PAIR, TIMEFRAME & STRATEGY */}
            <div
              ref={setupSectionRef}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>STEP 2: TRADE IDENTIFICATION, PAIR, TIMEFRAME & STRATEGY</span>
                </div>
                <span className="text-slate-400 font-mono-code text-[11px]">
                  {APP_TIMEZONE_FULL_LABEL}
                </span>
              </div>

              {/* Row 1: Trade ID, Currency Pair, Direction, Timeframe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-mono-code font-semibold">Trade ID</label>
                    <span className="text-[9px] font-mono-code text-cyan-400">AUTO UNIQUE ID</span>
                  </div>
                  <input
                    type="text"
                    value={tradeId}
                    onChange={(e) => setTradeId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-cyan-300 font-bold focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-mono-code font-semibold">Currency Pair / Instrument</label>
                    {renderFieldExtractionBadge('instrument', true)}
                  </div>
                  <InstrumentCombobox
                    id="trade-entry-instrument-input"
                    value={instrument}
                    onChange={(val) => {
                      setInstrument(val);
                      markFieldUserEdited('instrument');
                      const ms = inferMarketAndSector(val);
                      setMarket(ms.market);
                      setSector(ms.sector);
                      onInstrumentChange?.(val);
                    }}
                    placeholder="Type or select pair (e.g. XAUUSD)..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-mono-code font-semibold">Trade Direction</label>
                    {renderFieldExtractionBadge('direction', true)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDirection('BUY');
                        markFieldUserEdited('direction');
                      }}
                      className={`py-1.5 rounded-lg font-mono-code font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                        direction === 'BUY'
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>BUY / LONG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDirection('SELL');
                        markFieldUserEdited('direction');
                      }}
                      className={`py-1.5 rounded-lg font-mono-code font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                        direction === 'SELL'
                          ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>SELL / SHORT</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-mono-code font-semibold">Chart Timeframe</label>
                    {renderFieldExtractionBadge('timeframe', true)}
                  </div>
                  <select
                    value={timeframe}
                    onChange={(e) => {
                      setTimeframe(e.target.value as Timeframe);
                      markFieldUserEdited('timeframe');
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-slate-100 outline-none focus:border-cyan-400"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>
                        {TIMEFRAME_LABELS[tf] || tf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Strategy Model, Date, Time, Session & Broker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/60">
                <div>
                  <label className="text-slate-300 block mb-1 font-mono-code font-semibold">
                    Strategy Model
                  </label>
                  <select
                    id="trade-entry-strategy-select"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as StrategyType)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-cyan-400 font-semibold outline-none focus:border-cyan-400"
                  >
                    {SBT_STRATEGY_MODELS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-mono-code">Trade Date</label>
                    {renderFieldExtractionBadge('tradeTimestamp')}
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      markFieldUserEdited('tradeTimestamp');
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-mono-code">Trade Time</label>
                    <button
                      type="button"
                      onClick={() => {
                        setDate(getKarachiDate());
                        setTime(getKarachiTime24());
                        markFieldUserEdited('tradeTimestamp');
                      }}
                      className="text-[10px] text-cyan-400 hover:underline font-mono-code cursor-pointer"
                    >
                      NOW (PKT)
                    </button>
                  </div>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      markFieldUserEdited('tradeTimestamp');
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-mono-code">Trading Session</label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value as TradingSession)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-slate-100 outline-none"
                  >
                    <option value="LONDON">London (07:00 - 15:00)</option>
                    <option value="NEW_YORK">New York (13:00 - 21:00)</option>
                    <option value="ASIAN">Asian (00:00 - 08:00)</option>
                    <option value="LONDON_NY_OVERLAP">London/NY Overlap</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-mono-code">Broker</label>
                  <input
                    type="text"
                    value={broker}
                    onChange={(e) => setBroker(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* STEP 3: EXECUTION PRICES, RISK %, LOT SIZE, SL DISTANCE IN PIPS & POTENTIAL DOLLAR OUTCOMES */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-military font-bold text-cyan-400 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>STEP 3: ENTRY PRICE, STOP-LOSS (PIPS), TAKE-PROFIT, RISK % & LOT SIZE</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono-code text-[11px]">
                  <span className="text-amber-300">
                    SL DISTANCE: <strong>{stopDistancePips} PIPS</strong>
                  </span>
                  <span>|</span>
                  <span className="text-slate-300">
                    POTENTIAL LOSS: <strong className="text-rose-400">-{formatCurrency(riskAmount, account.currency)} ({calculatedRiskPercent}%)</strong>
                  </span>
                  <span>|</span>
                  <span className="text-slate-300">
                    POTENTIAL TP: <strong className="text-emerald-400">+{formatCurrency(potentialProfitDollars, account.currency)} (1:{computedRr})</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Entry Price */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-mono-code font-semibold">Entry Price *</label>
                    {renderFieldExtractionBadge('entryPrice', true)}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntryPrice(val);
                      markFieldUserEdited('entryPrice');
                      const numEntry = Number(val);
                      const numRiskPct = Number(riskPercentage);
                      if (
                        !tvEditedFields.has('lotSize') &&
                        Number.isFinite(numEntry) &&
                        numEntry > 0 &&
                        effectiveSl > 0 &&
                        numEntry !== effectiveSl &&
                        Number.isFinite(numRiskPct) &&
                        numRiskPct > 0
                      ) {
                        const targetDollars = (activeAccountBalance * numRiskPct) / 100;
                        const calc = calculateFundedLotSize(
                          instrument || 'XAUUSD',
                          numEntry,
                          effectiveSl,
                          targetDollars,
                          account.currency
                        );
                        if (calc.lotSize > 0) setLotSize(String(calc.lotSize));
                      }
                    }}
                    placeholder="e.g. 2485.50"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono-code text-slate-100 focus:border-cyan-400 outline-none"
                  />
                  <span className="text-[10px] font-mono-code text-slate-400 mt-1 block">
                    {direction === 'BUY' ? 'Long / Buy Execution' : 'Short / Sell Execution'}
                  </span>
                </div>

                {/* Stop-Loss Price & SL Distance in Pips */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-rose-300 font-mono-code font-semibold">Stop-Loss Price *</label>
                    {renderFieldExtractionBadge('stopLoss', true)}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStopLoss(val);
                      markFieldUserEdited('stopLoss');
                      const numSl = Number(val);
                      const numRiskPct = Number(riskPercentage);
                      if (
                        !tvEditedFields.has('lotSize') &&
                        effectiveEntry > 0 &&
                        Number.isFinite(numSl) &&
                        numSl > 0 &&
                        effectiveEntry !== numSl &&
                        Number.isFinite(numRiskPct) &&
                        numRiskPct > 0
                      ) {
                        const targetDollars = (activeAccountBalance * numRiskPct) / 100;
                        const calc = calculateFundedLotSize(
                          instrument || 'XAUUSD',
                          effectiveEntry,
                          numSl,
                          targetDollars,
                          account.currency
                        );
                        if (calc.lotSize > 0) setLotSize(String(calc.lotSize));
                      }
                    }}
                    placeholder="e.g. 2481.00"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-rose-500/40 font-mono-code text-rose-300 focus:border-rose-400 outline-none"
                  />
                  <div className="flex items-center justify-between mt-1 font-mono-code text-[10px]">
                    <span className="text-amber-300 font-bold">
                      SL Distance: {stopDistancePips} pips
                    </span>
                    <span className="text-rose-400 font-bold">
                      Loss: -{formatCurrency(riskAmount, account.currency)}
                    </span>
                  </div>
                </div>

                {/* Take-Profit (Target) & Potential TP Value */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-emerald-300 font-mono-code font-semibold">Take-Profit (TP)</label>
                    {renderFieldExtractionBadge('takeProfit')}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => {
                      setTakeProfit(e.target.value);
                      markFieldUserEdited('takeProfit');
                    }}
                    placeholder="Planned Target Price"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-emerald-500/40 font-mono-code text-emerald-300 focus:border-emerald-400 outline-none"
                  />
                  <div className="flex items-center justify-between mt-1 font-mono-code text-[10px]">
                    <span className="text-emerald-300 font-bold">
                      TP Dist: {targetDistancePips} pips
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((rr) => (
                        <button
                          key={rr}
                          type="button"
                          onClick={() => applyRrTargetPrice(rr)}
                          title={`Set Take-Profit to 1:${rr} R:R based on Entry & Stop-Loss`}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold text-[9px] cursor-pointer transition"
                        >
                          1:{rr}R
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trade Status & Actual Exit Price (if Closed) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-mono-code font-semibold">
                      Trade Status {tradeStatus === 'CLOSED' ? '& Exit' : ''}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setTradeStatus('OPEN')}
                      className={`py-1.5 rounded-lg font-mono-code font-bold text-[11px] transition cursor-pointer ${
                        tradeStatus === 'OPEN'
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      OPEN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTradeStatus('CLOSED');
                        if (!exitPrice && takeProfit) setExitPrice(takeProfit);
                      }}
                      className={`py-1.5 rounded-lg font-mono-code font-bold text-[11px] transition cursor-pointer ${
                        tradeStatus === 'CLOSED'
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      CLOSED
                    </button>
                  </div>
                  {tradeStatus === 'CLOSED' && (
                    <input
                      type="number"
                      step="any"
                      value={exitPrice}
                      onChange={(e) => {
                        setExitPrice(e.target.value);
                        markFieldUserEdited('exitPrice');
                      }}
                      placeholder="Actual Exit Price"
                      className="mt-1.5 w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono-code text-xs text-slate-100 focus:border-cyan-400 outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Interactive Risk %, Editable Lot Size, SL Pips & Dynamic Potential Loss / TP Calculator Panel */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border border-cyan-500/40 space-y-3.5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span className="font-military font-bold text-xs text-cyan-300 tracking-wider uppercase">
                      DYNAMIC RISK %, LOT SIZE, SL PIPS & POTENTIAL LOSS / TP CALCULATOR
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono-code text-slate-400 mr-1">Preset Risk %:</span>
                    {[0.25, 0.5, 0.75, 1.0, 2.0].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyRiskPercentToLotSize(pct)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono-code font-bold border transition cursor-pointer ${
                          Math.abs(calculatedRiskPercent - pct) < 0.05
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400/60'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                    {preReadiness.recommendedRiskPercent > 0 && (
                      <button
                        type="button"
                        onClick={() => applyRiskPercentToLotSize(preReadiness.recommendedRiskPercent)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-mono-code font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                      >
                        Guidance ({preReadiness.recommendedRiskPercent}%)
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono-code">
                  {/* Card 1: Editable Risk Percentage (%) */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-cyan-300 font-bold uppercase">
                        1. RISK PERCENTAGE (%)
                      </label>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          calculatedRiskPercent > (account.maxRiskPerTradePercent || 1)
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {calculatedRiskPercent > (account.maxRiskPerTradePercent || 1)
                          ? 'HIGH RISK'
                          : 'OPTIMAL'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 my-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        max="100"
                        value={riskPercentage}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setRiskPercentage(raw);
                          const val = Number(raw);
                          if (Number.isFinite(val) && val > 0) {
                            applyRiskPercentToLotSize(val);
                          }
                        }}
                        placeholder="e.g. 1.0"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/50 text-cyan-300 text-sm font-bold outline-none focus:border-cyan-400"
                      />
                      <span className="text-sm font-bold text-cyan-400">%</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Actual Risk: <strong className="text-slate-200">{calculatedRiskPercent}%</strong> of{' '}
                      {formatCurrency(activeAccountBalance, account.currency)}
                    </div>
                  </div>

                  {/* Card 2: Editable Lot Size (Dynamically Recalculates Loss & TP) */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="trade-entry-lot-size-input" className="text-[10px] text-cyan-300 font-bold uppercase">
                        2. LOT SIZE (EDITABLE) *
                      </label>
                      {renderFieldExtractionBadge('lotSize', true)}
                    </div>
                    <div className="flex items-center gap-1 my-1">
                      <button
                        type="button"
                        onClick={() => stepLotSize(-0.01)}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                        title="Decrease Lot Size by 0.01"
                      >
                        -
                      </button>
                      <input
                        id="trade-entry-lot-size-input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={lotSize}
                        onChange={(e) => handleLotSizeChange(e.target.value)}
                        placeholder="0.10"
                        className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-900 font-mono-code text-sm font-bold text-center outline-none ${
                          !lotSize || Number(lotSize) <= 0
                            ? 'border-2 border-amber-400 text-amber-300'
                            : 'border border-cyan-400 text-white focus:border-cyan-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => stepLotSize(0.01)}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                        title="Increase Lot Size by 0.01"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      {[0.01, 0.1, 0.5, 1.0].map((presetLot) => (
                        <button
                          key={presetLot}
                          type="button"
                          onClick={() => handleLotSizeChange(String(presetLot))}
                          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 cursor-pointer"
                        >
                          {presetLot}
                        </button>
                      ))}
                      {standardSafeLot > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleLotSizeChange(String(safeFundedLot > 0 ? safeFundedLot : standardSafeLot))
                          }
                          className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold cursor-pointer"
                        >
                          1% ({safeFundedLot > 0 ? safeFundedLot : standardSafeLot})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Stop-Loss (SL) Distance in Pips */}
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-300 font-bold uppercase">
                        3. SL DISTANCE IN PIPS
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">{instrument || 'PAIR'}</span>
                    </div>
                    <div className="text-xl font-bold text-amber-300 my-1">
                      {stopDistancePips} <span className="text-xs font-normal text-amber-200">pips</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      TP Distance: <strong className="text-emerald-300">{targetDistancePips} pips</strong> • R:R:{' '}
                      <strong className="text-cyan-300">1:{computedRr}</strong>
                    </div>
                  </div>

                  {/* Card 4: Potential Dollar Loss (Recalculates with Entry, SL & Lot Size) */}
                  <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-500/40 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-rose-300 font-bold uppercase">
                        4. POTENTIAL DOLLAR LOSS
                      </span>
                      <span className="text-[10px] font-bold text-rose-400">-1.0R</span>
                    </div>
                    <div className="text-xl font-bold text-rose-400 my-1">
                      -{formatCurrency(riskAmount, account.currency)}
                    </div>
                    <div className="text-[10px] text-rose-200/80">
                      Balance if SL Hit:{' '}
                      <strong>
                        {formatCurrency(Math.max(0, activeAccountBalance - riskAmount), account.currency)}
                      </strong>
                    </div>
                  </div>

                  {/* Card 5: Potential Take-Profit (TP) Dollar Value (Recalculates with Entry, TP & Lot Size) */}
                  <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-300 font-bold uppercase">
                        5. POTENTIAL TP VALUE
                      </span>
                      <span className="text-[10px] font-bold text-amber-300">
                        {computedRr > 0 ? `+${computedRr}R` : 'Set TP'}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-emerald-400 my-1">
                      {potentialProfitDollars > 0
                        ? `+${formatCurrency(potentialProfitDollars, account.currency)}`
                        : effectiveEntry > 0 && effectiveSl > 0 && effectiveLot > 0
                        ? `+${formatCurrency(riskAmount * 2, account.currency)} (at 1:2R)`
                        : '$0.00'}
                    </div>
                    <div className="text-[10px] text-emerald-200/80">
                      {potentialProfitDollars > 0 ? (
                        <>
                          TP @ <strong>{takeProfit}</strong> → Bal:{' '}
                          <strong>
                            {formatCurrency(activeAccountBalance + potentialProfitDollars, account.currency)}
                          </strong>
                        </>
                      ) : (
                        'Enter TP or click 1:1R / 1:2R / 1:3R above'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Setup Confirmation Checkbox (Break-even / Trailed SL) */}
              {priceValidation.requiresAdvancedConfirmation && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 font-mono-code text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedSetupConfirmed}
                    onChange={(e) => setAdvancedSetupConfirmed(e.target.checked)}
                    className="accent-amber-400 w-4 h-4 rounded"
                  />
                  <span>
                    <strong>Confirm Advanced Stop-Loss Setup:</strong> Stop-Loss ({stopLoss}) is at or beyond Entry ({entryPrice}) because this position has been trailed into profit or moved to break-even.
                  </span>
                </label>
              )}

              {/* Outcome Selector when Trade Status is CLOSED */}
              {tradeStatus === 'CLOSED' && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-code font-bold text-cyan-400 uppercase tracking-wider">
                      CLOSED TRADE OUTCOME:
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 gap-1">
                      {(['WIN', 'LOSS', 'BREAKEVEN'] as const).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => {
                            setTradeResult(res);
                            if (res === 'WIN' && takeProfit) setExitPrice(takeProfit);
                            else if (res === 'LOSS' && stopLoss) setExitPrice(stopLoss);
                            else if (res === 'BREAKEVEN' && entryPrice) setExitPrice(entryPrice);
                          }}
                          className={`px-3 py-1 rounded-md text-xs font-mono-code font-bold transition cursor-pointer ${
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
              )}
            </div>

            {/* STEP 4: BEFORE & AFTER TRADE MINDSET AND ANALYSIS (MANUAL THOUGHT PROCESS) */}
            <div
              ref={mindsetSectionRef}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900/90 to-blue-950/25 border border-cyan-500/40 space-y-4 shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Brain className="w-4.5 h-4.5 text-cyan-400" />
                  <span className="text-xs sm:text-sm font-military font-bold text-cyan-300 tracking-wider uppercase">
                    STEP 4: MINDSET & ANALYSIS — BEFORE AND AFTER TAKING THE TRADE
                  </span>
                </div>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  MANUAL THOUGHT PROCESS & SELF-AUDIT
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT COLUMN: BEFORE TAKING THE TRADE */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-military font-bold text-cyan-400 uppercase tracking-wider">
                      A. BEFORE TAKING THE TRADE (PRE-TRADE MINDSET & ANALYSIS)
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">PRE-EXECUTION</span>
                  </div>

                  {/* Pre-Trade Emotion Selector */}
                  <div>
                    <label className="text-slate-300 block mb-1.5 font-mono-code text-[11px]">
                      1. How did you feel right before entering this trade?
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {EMOTIONS.map((emo) => {
                        const isSelected = preEmotion === emo.state;
                        return (
                          <button
                            key={emo.state}
                            type="button"
                            onClick={() => setPreEmotion(emo.state)}
                            className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-500/15 text-white font-bold'
                                : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-base">{emo.emoji}</span>
                            <span className="text-[10px] font-mono-code">{emo.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Before-Trade Analysis & Thought Process Textarea */}
                  <div>
                    <label className="text-cyan-300 block mb-1 font-mono-code font-semibold text-[11px]">
                      2. Pre-Trade Thought Process, Technical Confluence & Mindset (Before Entry):
                    </label>
                    <textarea
                      id="pre-trade-mindset-notes"
                      rows={4}
                      value={preTradeMindsetNotes}
                      onChange={(e) => setPreTradeMindsetNotes(e.target.value)}
                      placeholder="Write your analysis & mindset BEFORE entering the trade: What higher-timeframe bias, liquidity sweep, order block, or fundamental catalyst did you see? Were you calm and following your trading plan?"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono-code text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400 text-xs leading-relaxed"
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: AFTER TAKING THE TRADE */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-military font-bold text-emerald-400 uppercase tracking-wider">
                      B. AFTER TAKING THE TRADE (POST-TRADE MINDSET & REVIEW)
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">POST-EXECUTION</span>
                  </div>

                  {/* Post-Trade Self-Audit Checkboxes */}
                  <div>
                    <label className="text-slate-300 block mb-1.5 font-mono-code text-[11px]">
                      1. Execution & Discipline Self-Audit During/After the Trade:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <label className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={followedPlan}
                          onChange={(e) => setFollowedPlan(e.target.checked)}
                          className="accent-emerald-400 rounded"
                        />
                        <span>Followed pre-trade plan</span>
                      </label>

                      <label className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={movedStopLoss}
                          onChange={(e) => setMovedStopLoss(e.target.checked)}
                          className="accent-rose-500 rounded"
                        />
                        <span className={movedStopLoss ? 'text-rose-400 font-bold' : ''}>
                          Moved stop-loss emotionally
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={closedEarly}
                          onChange={(e) => setClosedEarly(e.target.checked)}
                          className="accent-amber-400 rounded"
                        />
                        <span>Closed early out of fear</span>
                      </label>

                      <label className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={revengeTraded}
                          onChange={(e) => setRevengeTraded(e.target.checked)}
                          className="accent-rose-500 rounded"
                        />
                        <span className={revengeTraded ? 'text-rose-400 font-bold' : ''}>
                          Entered out of FOMO / Revenge
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* After-Trade Analysis & Mindset Textarea */}
                  <div>
                    <label className="text-emerald-300 block mb-1 font-mono-code font-semibold text-[11px]">
                      2. Post-Trade Thought Process, Outcome Review & Mindset (After Trade):
                    </label>
                    <textarea
                      id="post-trade-mindset-notes"
                      rows={4}
                      value={postTradeMindsetNotes}
                      onChange={(e) => setPostTradeMindsetNotes(e.target.value)}
                      placeholder="Write your analysis & mindset AFTER taking the trade: How did price react? How did you manage your emotions while the trade was running or after exit? What is your #1 lesson from this trade?"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono-code text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400 text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 5: QUALITY GRADE, MISTAKE CLASSIFICATION & ADDITIONAL SCREENSHOTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rule Violations */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                  <span>RULE COMPLIANCE</span>
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

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
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
                              setSelectedViolations(
                                selectedViolations.filter((v) => v !== rule.title)
                              );
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

              {/* Mistake Classification */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-military font-bold text-cyan-400">
                  MISTAKE / EXECUTION AUDIT
                </div>
                <label className="text-slate-400 block text-[11px] font-mono-code">
                  Primary Execution Classification:
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
                <div className="text-[11px] text-slate-400 mt-1">
                  Powers your Performance Report & Psychology Center analytics.
                </div>
              </div>

              {/* Trade Grade */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                  <span>SETUP QUALITY GRADE</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono-code font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    SCORE: {totalQualityScore}/100
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(['A+', 'A', 'B', 'C', 'F'] as TradeGrade[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`py-2 rounded font-mono-code font-bold text-sm transition cursor-pointer ${
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
              </div>
            </div>

            {/* Additional Before / After Chart Screenshots */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>ADDITIONAL CHART SCREENSHOTS (BEFORE ENTRY / AFTER OUTCOME)</span>
                </div>
                <span className="text-slate-400 font-mono-code text-[10px]">OPTIONAL</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Before Entry */}
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-300 font-mono-code text-[11px]">
                    {beforeEntryUrl ? '✓ Before-Entry Attached' : 'Before-Entry Chart'}
                  </span>
                  <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer font-mono-code text-[10px] transition">
                    {beforeEntryUrl ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setBeforeEntryUrl)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* After Trade */}
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-300 font-mono-code text-[11px]">
                    {afterTradeUrl ? '✓ After-Trade Attached' : 'After-Trade Outcome Chart'}
                  </span>
                  <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer font-mono-code text-[10px] transition">
                    {afterTradeUrl ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setAfterTradeUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {aiAuditResult && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-amber-300 space-y-1">
                  <div className="font-bold font-military flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI VISION AUDITOR: {aiAuditResult.verdict}
                    </span>
                    <span className="font-mono-code">SCORE: {aiAuditResult.qualityScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{aiAuditResult.critique}</p>
                </div>
              )}
            </div>

            {/* Duplicate Import Protection Banner */}
            {duplicateConflictTradeId && (
              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 font-mono-code text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>DUPLICATE SCREENSHOT IMPORT DETECTED (Matches {duplicateConflictTradeId})</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={allowDuplicateOverride}
                    onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>
                    I confirm this is a separate trade execution and want to save it as a new journal record ({tradeId}) without overwriting {duplicateConflictTradeId}.
                  </span>
                </label>
              </div>
            )}

            {/* Risk Guidance & Validation Errors */}
            {(isRiskExceeded || isDailyLimitReached || submissionError) && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/40 rounded-xl text-cyan-200 font-mono-code text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-cyan-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>VALIDATION & RISK COMPLIANCE NOTICE</span>
                </div>
                {submissionError && (
                  <p className="text-[11px] text-rose-300 pl-6 font-bold">• {submissionError}</p>
                )}
                {isRiskExceeded && (
                  <p className="text-[11px] text-slate-300 pl-6">
                    • <strong className="text-amber-300">Risk Notice:</strong> Planned risk is {calculatedRiskPercent}% (recommended threshold is 1.0%).
                  </p>
                )}
                {isDailyLimitReached && (
                  <p className="text-[11px] text-slate-300 pl-6">
                    • <strong className="text-amber-300">Execution Frequency Notice:</strong> {todayTradesCount} trades are already recorded for this date.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer with Cancel, Edit Details, and Confirm & Save */}
        {!savedSuccessInfo && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-[#020617] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-mono-code text-xs transition cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={() => {
                  setupSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-3.5 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono-code text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>EDIT DETAILS</span>
              </button>
            </div>

            <button
              id="save-trade-submit-btn"
              type="button"
              disabled={isSavingTrade || tvExtracting}
              onClick={handleSave}
              className="px-5 sm:px-6 py-2.5 rounded-xl font-military font-bold text-xs tracking-wider shadow-lg bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-cyan-500/20 cursor-pointer transition transform active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>
                {isSavingTrade
                  ? 'SAVING TO JOURNAL...'
                  : 'CONFIRM & SAVE TRADE TO JOURNAL'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
