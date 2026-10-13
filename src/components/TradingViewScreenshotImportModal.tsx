import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit3,
  ShieldCheck,
  Clock,
  FileImage,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Layers,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  AccountSettings,
  Timeframe,
  Trade,
  TradeDirection,
  TradingSession,
  TradingViewExtractionResult,
  ExtractionConfidenceLevel,
} from '../types';
import { getKarachiDate, getKarachiTime24 } from '../utils/time';

function calculatePips(
  instrument: string,
  entryPrice: number,
  targetOrExitPrice: number,
  direction?: TradeDirection
): number {
  const upper = instrument.toUpperCase();
  const pipSize = upper.includes('JPY')
    ? 0.01
    : upper.includes('XAU')
    ? 0.1
    : upper.includes('NAS') || upper.includes('US30') || upper.includes('SPX')
    ? 1
    : 0.0001;
  const dist = Number((Math.abs(targetOrExitPrice - entryPrice) / pipSize).toFixed(1));
  if (!direction) return dist;
  const isPositive =
    direction === 'BUY' ? targetOrExitPrice >= entryPrice : targetOrExitPrice <= entryPrice;
  return isPositive ? dist : -dist;
}

function inferTradingSessionFromTime(timeStr: string): TradingSession {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 'LONDON';
  const hour = Number(match[1]);
  if (hour >= 18 || hour < 3) return 'NEW_YORK';
  if (hour >= 12 && hour < 18) return 'LONDON';
  return 'ASIAN';
}

interface TradingViewScreenshotImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: AccountSettings;
  onSaveImportedTrade: (
    trade: Trade,
    options?: { allowDuplicateOverride?: boolean }
  ) => Promise<{
    ok: boolean;
    saved: boolean;
    duplicate?: boolean;
    existingTradeId?: string;
    error?: string;
    trade?: Trade;
  }>;
  isDemoMode?: boolean;
  authToken?: string | null;
}

const TIMEFRAMES: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

/**
 * Generates a real PNG data URL with embedded TradingView chart visuals AND
 * a PNG tEXt metadata chunk (`TV_CHART_META:`) so users/testers can also test
 * deterministic Long, Short, Missing-Target, Closed, or Unreadable screenshots with one click.
 */
function createSampleTradingViewPngDataUrl(
  preset: 'LONG_XAUUSD_M15' | 'SHORT_EURUSD_H4' | 'MISSING_TP_GBPUSD_H1' | 'CLOSED_NAS100_M5' | 'UNREADABLE_BLUR'
): { dataUrl: string; fileName: string } {
  const canvas = document.createElement('canvas');
  if (preset === 'UNREADABLE_BLUR') {
    canvas.width = 24;
    canvas.height = 24;
  } else {
    canvas.width = 960;
    canvas.height = 540;
  }
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // TradingView dark background
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (preset !== 'UNREADABLE_BLUR') {
      // Grid lines
      ctx.strokeStyle = '#1e222d';
      ctx.lineWidth = 1;
      for (let x = 80; x < 860; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 45);
        ctx.lineTo(x, 490);
        ctx.stroke();
      }
      for (let y = 80; y < 490; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(860, y);
        ctx.stroke();
      }

      // Top toolbar
      ctx.fillStyle = '#1e222d';
      ctx.fillRect(0, 0, 960, 42);

      const headerText =
        preset === 'LONG_XAUUSD_M15'
          ? 'OANDA:XAUUSD · 15m · TradingView'
          : preset === 'SHORT_EURUSD_H4'
          ? 'FXCM:EURUSD · 4h · TradingView'
          : preset === 'MISSING_TP_GBPUSD_H1'
          ? 'PEPPERSTONE:GBPUSD · 1h · TradingView'
          : 'OANDA:NAS100 · 5m · TradingView (CLOSED EXECUTION)';

      ctx.fillStyle = '#d1d4dc';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(headerText, 18, 26);

      // Position tool visualization
      const isLong = preset !== 'SHORT_EURUSD_H4';
      const entryY = 270;
      const tpY = isLong ? 130 : 410;
      const slY = isLong ? 370 : 160;

      if (preset !== 'MISSING_TP_GBPUSD_H1') {
        ctx.fillStyle = 'rgba(8, 153, 129, 0.24)';
        ctx.fillRect(240, Math.min(entryY, tpY), 420, Math.abs(tpY - entryY));
      }
      ctx.fillStyle = 'rgba(242, 54, 69, 0.24)';
      ctx.fillRect(240, Math.min(entryY, slY), 420, Math.abs(slY - entryY));

      // Entry line
      ctx.strokeStyle = '#787b86';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(240, entryY);
      ctx.lineTo(660, entryY);
      ctx.stroke();

      // Labels on chart
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      if (preset === 'LONG_XAUUSD_M15') {
        ctx.fillText('Long Position · Entry: 2652.40 · SL: 2644.40 · TP: 2672.40 · R/R: 2.50', 245, entryY - 8);
        ctx.fillText('Target: 20.00 (2000 ticks) | Stop: 8.00 (800 ticks) | 18 bars, 4h 30m', 245, entryY + 18);
        ctx.fillText('2026-10-12 14:30 PKT', 245, 518);
      } else if (preset === 'SHORT_EURUSD_H4') {
        ctx.fillText('Short Position · Entry: 1.09450 · SL: 1.09850 · TP: 1.08250 · R/R: 3.00', 245, entryY - 8);
        ctx.fillText('Target: 120.0 pips | Stop: 40.0 pips | 12 bars, 2d', 245, entryY + 18);
        ctx.fillText('2026-10-11 18:00 PKT', 245, 518);
      } else if (preset === 'MISSING_TP_GBPUSD_H1') {
        ctx.fillText('Order Lines · BUY GBPUSD @ 1.30820 · SL: 1.30420 · Open Target (No TP)', 245, entryY - 8);
        ctx.fillText('Timestamp Not Visible on Cropped Axis', 245, 518);
      } else if (preset === 'CLOSED_NAS100_M5') {
        ctx.fillText('Long Position (CLOSED) · Entry: 20150.0 · SL: 20100.0 · TP: 20300.0 · Filled Exit: 20285.0', 210, entryY - 8);
        ctx.fillText('2026-10-12 16:45 PKT · R/R: 3.00', 245, 518);
      }
    }
  }

  const baseDataUrl = canvas.toDataURL('image/png');
  if (preset === 'UNREADABLE_BLUR') {
    return { dataUrl: baseDataUrl, fileName: 'unreadable_lowres_capture.png' };
  }

  const metaPayload =
    preset === 'LONG_XAUUSD_M15'
      ? {
          isReadableTradingViewChart: true,
          instrument: 'OANDA:XAUUSD',
          chartTimeframe: '15m',
          rawTimeframeLabel: '15m',
          drawingHorizontalDurationIgnored: '18 bars, 4h 30m',
          direction: 'BUY',
          positionToolType: 'Long Position',
          entryPrice: 2652.4,
          stopLoss: 2644.4,
          takeProfit: 2672.4,
          actualExitPrice: null,
          visibleTradeDate: '2026-10-12',
          visibleTradeTime: '14:30',
          visibleTimestampRaw: '2026-10-12 14:30',
          riskRewardRatio: 2.5,
          positionLabels: {
            stopDistanceLabel: '8.00 (800 ticks)',
            targetDistanceLabel: '20.00 (2000 ticks)',
            amountOrQtyLabel: null,
            accountStatsLabel: 'Risk/Reward Ratio: 2.50',
            brokerOrExchange: 'OANDA',
            otherLabels: ['Long Position Tool'],
          },
          detectedTradeStatus: 'OPEN',
          fieldConfidence: {
            instrument: 'HIGH',
            timeframe: 'HIGH',
            direction: 'HIGH',
            entryPrice: 'HIGH',
            stopLoss: 'HIGH',
            takeProfit: 'HIGH',
            tradeTimestamp: 'HIGH',
            riskRewardRatio: 'HIGH',
          },
          uncertainFields: [],
          extractionNotes:
            'Extracted OANDA:XAUUSD Long Position on 15m chart (ignored horizontal drawing duration "18 bars, 4h 30m").',
        }
      : preset === 'SHORT_EURUSD_H4'
      ? {
          isReadableTradingViewChart: true,
          instrument: 'FXCM:EURUSD',
          chartTimeframe: '4h',
          rawTimeframeLabel: '4h',
          drawingHorizontalDurationIgnored: '12 bars, 2d',
          direction: 'SELL',
          positionToolType: 'Short Position',
          entryPrice: 1.0945,
          stopLoss: 1.0985,
          takeProfit: 1.0825,
          actualExitPrice: null,
          visibleTradeDate: '2026-10-11',
          visibleTradeTime: '18:00',
          visibleTimestampRaw: '2026-10-11 18:00',
          riskRewardRatio: 3.0,
          positionLabels: {
            stopDistanceLabel: '40.0 pips',
            targetDistanceLabel: '120.0 pips',
            amountOrQtyLabel: null,
            accountStatsLabel: 'Risk/Reward Ratio: 3.00',
            brokerOrExchange: 'FXCM',
            otherLabels: ['Short Position Tool'],
          },
          detectedTradeStatus: 'OPEN',
          fieldConfidence: {
            instrument: 'HIGH',
            timeframe: 'HIGH',
            direction: 'HIGH',
            entryPrice: 'HIGH',
            stopLoss: 'HIGH',
            takeProfit: 'HIGH',
            tradeTimestamp: 'HIGH',
            riskRewardRatio: 'HIGH',
          },
          uncertainFields: [],
          extractionNotes:
            'Extracted FXCM:EURUSD Short Position on 4h chart (ignored horizontal drawing span "12 bars, 2d").',
        }
      : preset === 'MISSING_TP_GBPUSD_H1'
      ? {
          isReadableTradingViewChart: true,
          instrument: 'PEPPERSTONE:GBPUSD',
          chartTimeframe: '1h',
          rawTimeframeLabel: '1h',
          drawingHorizontalDurationIgnored: null,
          direction: 'BUY',
          positionToolType: 'Order Lines',
          entryPrice: 1.3082,
          stopLoss: 1.3042,
          takeProfit: null,
          actualExitPrice: null,
          visibleTradeDate: null,
          visibleTradeTime: null,
          visibleTimestampRaw: null,
          riskRewardRatio: null,
          positionLabels: {
            stopDistanceLabel: '40.0 pips',
            targetDistanceLabel: null,
            amountOrQtyLabel: null,
            accountStatsLabel: null,
            brokerOrExchange: 'PEPPERSTONE',
            otherLabels: ['Open Runner (No TP Visible)'],
          },
          detectedTradeStatus: 'OPEN',
          fieldConfidence: {
            instrument: 'HIGH',
            timeframe: 'HIGH',
            direction: 'HIGH',
            entryPrice: 'HIGH',
            stopLoss: 'HIGH',
            takeProfit: 'MISSING',
            tradeTimestamp: 'MISSING',
            riskRewardRatio: 'MISSING',
          },
          uncertainFields: ['takeProfit', 'tradeTimestamp'],
          extractionNotes:
            'Target price and chart timestamp were not visible on the screenshot and were left blank for user confirmation.',
        }
      : {
          isReadableTradingViewChart: true,
          instrument: 'OANDA:NAS100',
          chartTimeframe: '5m',
          rawTimeframeLabel: '5m',
          drawingHorizontalDurationIgnored: '9 bars, 45m',
          direction: 'BUY',
          positionToolType: 'Long Position',
          entryPrice: 20150.0,
          stopLoss: 20100.0,
          takeProfit: 20300.0,
          actualExitPrice: 20285.0,
          visibleTradeDate: '2026-10-12',
          visibleTradeTime: '16:45',
          visibleTimestampRaw: '2026-10-12 16:45',
          riskRewardRatio: 3.0,
          positionLabels: {
            stopDistanceLabel: '50.0 pts',
            targetDistanceLabel: '150.0 pts',
            amountOrQtyLabel: null,
            accountStatsLabel: 'Closed Execution Fill @ 20285.0',
            brokerOrExchange: 'OANDA',
            otherLabels: ['Broker Fill Confirmed'],
          },
          detectedTradeStatus: 'CLOSED',
          fieldConfidence: {
            instrument: 'HIGH',
            timeframe: 'HIGH',
            direction: 'HIGH',
            entryPrice: 'HIGH',
            stopLoss: 'HIGH',
            takeProfit: 'HIGH',
            tradeTimestamp: 'HIGH',
            riskRewardRatio: 'HIGH',
          },
          uncertainFields: [],
          extractionNotes:
            'Detected closed Long Position on NAS100 5m chart with planned target 20300.0 and actual broker exit fill at 20285.0.',
        };

  // Inject PNG tEXt chunk before IEND so server binary parser extracts it deterministically
  const base64Raw = baseDataUrl.split(',')[1];
  const binaryStr = atob(base64Raw);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const textPayload = `Comment\0TV_CHART_META:${JSON.stringify(metaPayload)}`;
  const textBytes = new TextEncoder().encode(textPayload);
  const chunkLen = textBytes.length;
  const chunk = new Uint8Array(4 + 4 + chunkLen + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, chunkLen, false);
  chunk[4] = 0x74; // 't'
  chunk[5] = 0x45; // 'E'
  chunk[6] = 0x58; // 'X'
  chunk[7] = 0x74; // 't'
  chunk.set(textBytes, 8);
  view.setUint32(8 + chunkLen, 0, false); // CRC placeholder

  // Insert right before IEND (last 12 bytes of PNG)
  const iendOffset = bytes.length - 12;
  const combined = new Uint8Array(bytes.length + chunk.length);
  combined.set(bytes.subarray(0, iendOffset), 0);
  combined.set(chunk, iendOffset);
  combined.set(bytes.subarray(iendOffset), iendOffset + chunk.length);

  let outBinary = '';
  for (let i = 0; i < combined.length; i++) {
    outBinary += String.fromCharCode(combined[i]);
  }

  const fileNameMap = {
    LONG_XAUUSD_M15: 'tradingview_xauusd_long_m15.png',
    SHORT_EURUSD_H4: 'tradingview_eurusd_short_h4.png',
    MISSING_TP_GBPUSD_H1: 'tradingview_gbpusd_open_runner_h1.png',
    CLOSED_NAS100_M5: 'tradingview_nas100_closed_m5.png',
    UNREADABLE_BLUR: 'unreadable_lowres_capture.png',
  };

  return {
    dataUrl: `data:image/png;base64,${btoa(outBinary)}`,
    fileName: fileNameMap[preset],
  };
}

export const TradingViewScreenshotImportModal: React.FC<TradingViewScreenshotImportModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  onSaveImportedTrade,
  isDemoMode = false,
  authToken = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Workflow Stage: 'UPLOAD' | 'CONFIRM' | 'SUCCESS'
  const [stage, setStage] = useState<'UPLOAD' | 'CONFIRM' | 'SUCCESS'>('UPLOAD');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState<{
    existingTradeId?: string;
    message: string;
  } | null>(null);

  // Uploaded file state
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [extraction, setExtraction] = useState<TradingViewExtractionResult | null>(null);

  // Editable confirmation form state
  const [isEditDetailsExpanded, setIsEditDetailsExpanded] = useState(false);
  const [instrument, setInstrument] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe | ''>('');
  const [direction, setDirection] = useState<TradeDirection | ''>('');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [plannedTargetPrice, setPlannedTargetPrice] = useState<string>('');
  const [hasNoTarget, setHasNoTarget] = useState<boolean>(false);

  // Required user input: Lot size
  const [lotSize, setLotSize] = useState<string>('');

  // Status & Exit Price distinction
  const [tradeStatus, setTradeStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [actualExitPrice, setActualExitPrice] = useState<string>('');

  // Timestamps (distinct trade time vs upload time vs journal creation time)
  const [tradeDate, setTradeDate] = useState<string>('');
  const [tradeTime, setTradeTime] = useState<string>('');
  const [tradeTimeVerified, setTradeTimeVerified] = useState<boolean>(false);
  const [uploadTimestamp, setUploadTimestamp] = useState<string>('');

  // Visible R:R & Advanced setup confirmation
  const [visibleRiskReward, setVisibleRiskReward] = useState<string>('');
  const [advancedSetupConfirmed, setAdvancedSetupConfirmed] = useState<boolean>(false);
  const [strategyNotes, setStrategyNotes] = useState<string>('');
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  // Saved trade confirmation state
  const [savedTradeRecord, setSavedTradeRecord] = useState<Trade | null>(null);

  if (!isOpen) return null;

  const markFieldEdited = (fieldName: string) => {
    setEditedFields((prev) => {
      const next = new Set(prev);
      next.add(fieldName);
      return next;
    });
    setSaveError(null);
    setDuplicateConflict(null);
  };

  const resetForAnotherUpload = () => {
    setStage('UPLOAD');
    setIsExtracting(false);
    setIsSaving(false);
    setUploadError(null);
    setSaveError(null);
    setDuplicateConflict(null);
    setScreenshotDataUrl('');
    setFileName('');
    setExtraction(null);
    setIsEditDetailsExpanded(false);
    setInstrument('');
    setTimeframe('');
    setDirection('');
    setEntryPrice('');
    setStopLoss('');
    setPlannedTargetPrice('');
    setHasNoTarget(false);
    setLotSize('');
    setTradeStatus('OPEN');
    setActualExitPrice('');
    setTradeDate('');
    setTradeTime('');
    setTradeTimeVerified(false);
    setUploadTimestamp('');
    setVisibleRiskReward('');
    setAdvancedSetupConfirmed(false);
    setStrategyNotes('');
    setEditedFields(new Set());
    setSavedTradeRecord(null);
  };

  const populateFormFromExtraction = (ext: TradingViewExtractionResult) => {
    setExtraction(ext);
    setInstrument(ext.instrument || '');
    setTimeframe(ext.chartTimeframe || '');
    setDirection(ext.direction || '');
    setEntryPrice(ext.entryPrice !== null && ext.entryPrice !== undefined ? String(ext.entryPrice) : '');
    setStopLoss(ext.stopLoss !== null && ext.stopLoss !== undefined ? String(ext.stopLoss) : '');

    if (ext.takeProfit !== null && ext.takeProfit !== undefined) {
      setPlannedTargetPrice(String(ext.takeProfit));
      setHasNoTarget(false);
    } else {
      setPlannedTargetPrice('');
      setHasNoTarget(false);
    }

    // Default trade status to OPEN unless reliable broker data establishes CLOSED
    const initialStatus = ext.detectedTradeStatus === 'CLOSED' ? 'CLOSED' : 'OPEN';
    setTradeStatus(initialStatus);
    setActualExitPrice(
      initialStatus === 'CLOSED' && ext.actualExitPrice !== null && ext.actualExitPrice !== undefined
        ? String(ext.actualExitPrice)
        : ''
    );

    // Timestamp distinction: if absent on screenshot, use current date/time for journal creation & mark unverified
    const hasVisibleTimestamp = Boolean(ext.visibleTradeDate && ext.visibleTradeTime);
    setTradeDate(ext.visibleTradeDate || getKarachiDate());
    setTradeTime(ext.visibleTradeTime || getKarachiTime24());
    setTradeTimeVerified(hasVisibleTimestamp);
    setUploadTimestamp(ext.uploadTimestamp || new Date().toISOString());

    setVisibleRiskReward(
      ext.riskRewardRatio !== null && ext.riskRewardRatio !== undefined ? String(ext.riskRewardRatio) : ''
    );
    setAdvancedSetupConfirmed(false);
    setEditedFields(new Set());

    // Automatically expand Edit Details if screenshot was unreadable or missing core fields
    if (
      !ext.isReadableTradingViewChart ||
      !ext.instrument ||
      !ext.chartTimeframe ||
      !ext.direction ||
      ext.entryPrice === null ||
      ext.stopLoss === null
    ) {
      setIsEditDetailsExpanded(true);
    }
  };

  const processScreenshotDataUrl = async (dataUrl: string, name: string, mime: string) => {
    setUploadError(null);
    setSaveError(null);
    setDuplicateConflict(null);

    // Validate PNG, JPG, JPEG on client first
    const lowerName = name.toLowerCase();
    const validExt = /\.(png|jpg|jpeg)$/i.test(lowerName);
    const validMime = ['image/png', 'image/jpeg', 'image/jpg'].includes(mime.toLowerCase());

    if (!validExt || !validMime) {
      setUploadError('Invalid file format. Only PNG, JPG, and JPEG TradingView screenshots are accepted.');
      return;
    }

    setScreenshotDataUrl(dataUrl);
    setFileName(name);
    setMimeType(mime === 'image/jpg' ? 'image/jpeg' : mime);
    setIsExtracting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      if (isDemoMode || !authToken) {
        headers['x-demo-mode'] = 'true';
      }

      const response = await fetch('/api/journal/extract-screenshot', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
          fileName: name,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.extraction) {
        setUploadError(data.error || 'Failed to analyze screenshot. Please verify the file is a valid PNG/JPG/JPEG.');
        setIsExtracting(false);
        return;
      }

      populateFormFromExtraction(data.extraction);
      setStage('CONFIRM');
    } catch (err: any) {
      setUploadError(err?.message || 'Network error while analyzing screenshot.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extOk = /\.(png|jpg|jpeg)$/i.test(file.name);
    const mimeOk = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type.toLowerCase());
    if (!extOk || !mimeOk) {
      setUploadError(`Unsupported file "${file.name}". Please upload a PNG, JPG, or JPEG screenshot.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void processScreenshotDataUrl(reader.result, file.name, file.type || 'image/png');
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read the selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const extOk = /\.(png|jpg|jpeg)$/i.test(file.name);
    const mimeOk = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type.toLowerCase());
    if (!extOk || !mimeOk) {
      setUploadError(`Unsupported file "${file.name}". Please drop a PNG, JPG, or JPEG screenshot.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void processScreenshotDataUrl(reader.result, file.name, file.type || 'image/png');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSamplePreset = (
    preset: 'LONG_XAUUSD_M15' | 'SHORT_EURUSD_H4' | 'MISSING_TP_GBPUSD_H1' | 'CLOSED_NAS100_M5' | 'UNREADABLE_BLUR'
  ) => {
    const sample = createSampleTradingViewPngDataUrl(preset);
    void processScreenshotDataUrl(sample.dataUrl, sample.fileName, 'image/png');
  };

  // Real-time price & setup validation
  const validationState = useMemo(() => {
    const hardErrors: string[] = [];
    const warnings: string[] = [];
    let requiresAdvancedConfirmation = false;

    const cleanInst = instrument.trim().toUpperCase();
    if (!cleanInst) hardErrors.push('Instrument / currency pair is required.');
    if (!timeframe) hardErrors.push('Chart timeframe is required.');
    if (!direction) hardErrors.push('Trade direction (Long/BUY or Short/SELL) is required.');

    const entryNum = Number(entryPrice);
    const slNum = Number(stopLoss);
    const tpNum = !hasNoTarget && plannedTargetPrice.trim() !== '' ? Number(plannedTargetPrice) : null;
    const lotNum = Number(lotSize);
    const exitNum = tradeStatus === 'CLOSED' && actualExitPrice.trim() !== '' ? Number(actualExitPrice) : null;

    if (!entryPrice.trim() || !Number.isFinite(entryNum) || entryNum <= 0) {
      hardErrors.push('Valid Entry Price is required.');
    }
    if (!stopLoss.trim() || !Number.isFinite(slNum) || slNum <= 0) {
      hardErrors.push('Valid Stop-Loss Price is required.');
    }
    if (!lotSize.trim() || !Number.isFinite(lotNum) || lotNum < 0.01) {
      hardErrors.push('Lot Size is required (minimum 0.01).');
    }
    if (tradeStatus === 'CLOSED' && (exitNum === null || !Number.isFinite(exitNum) || exitNum <= 0)) {
      hardErrors.push('Actual Exit Price is required when Trade Status is CLOSED.');
    }

    let calculatedRR: number | null = null;

    if (Number.isFinite(entryNum) && entryNum > 0 && Number.isFinite(slNum) && slNum > 0 && direction) {
      const stopDist = Math.abs(entryNum - slNum);
      if (stopDist === 0) {
        requiresAdvancedConfirmation = true;
        warnings.push('Stop-Loss equals Entry Price (Break-Even setup).');
      }

      if (direction === 'BUY') {
        const slAbove = slNum > entryNum;
        const tpBelow = tpNum !== null && Number.isFinite(tpNum) && tpNum > 0 && tpNum < entryNum;
        if (slAbove && tpBelow) {
          hardErrors.push(
            `Inverted LONG prices: Stop-Loss (${slNum}) is above Entry (${entryNum}) and Target (${tpNum}) is below Entry. Switch direction to SHORT (SELL) or correct prices.`
          );
        } else if (slAbove) {
          requiresAdvancedConfirmation = true;
          warnings.push(
            `Stop-Loss (${slNum}) is above Entry (${entryNum}) on a LONG trade (valid only for trailed in-profit stop).`
          );
        } else if (tpBelow) {
          hardErrors.push(`Planned Target (${tpNum}) cannot be below Entry (${entryNum}) on a LONG trade.`);
        }
      } else if (direction === 'SELL') {
        const slBelow = slNum < entryNum;
        const tpAbove = tpNum !== null && Number.isFinite(tpNum) && tpNum > 0 && tpNum > entryNum;
        if (slBelow && tpAbove) {
          hardErrors.push(
            `Inverted SHORT prices: Stop-Loss (${slNum}) is below Entry (${entryNum}) and Target (${tpNum}) is above Entry. Switch direction to LONG (BUY) or correct prices.`
          );
        } else if (slBelow) {
          requiresAdvancedConfirmation = true;
          warnings.push(
            `Stop-Loss (${slNum}) is below Entry (${entryNum}) on a SHORT trade (valid only for trailed in-profit stop).`
          );
        } else if (tpAbove) {
          hardErrors.push(`Planned Target (${tpNum}) cannot be above Entry (${entryNum}) on a SHORT trade.`);
        }
      }

      if (tpNum === null || tpNum === 0) {
        warnings.push('No Planned Take-Profit target specified (Open Target / Runner setup).');
      } else if (stopDist > 0) {
        const rewardDist = direction === 'BUY' ? tpNum - entryNum : entryNum - tpNum;
        if (rewardDist > 0) {
          calculatedRR = Number((rewardDist / stopDist).toFixed(2));
        }
      }
    }

    if (requiresAdvancedConfirmation && !advancedSetupConfirmed) {
      hardErrors.push('Please check the confirmation box for the advanced / trailed Stop-Loss setup.');
    }

    return {
      isValid: hardErrors.length === 0,
      hardErrors,
      warnings,
      requiresAdvancedConfirmation,
      calculatedRR,
    };
  }, [
    instrument,
    timeframe,
    direction,
    entryPrice,
    stopLoss,
    plannedTargetPrice,
    hasNoTarget,
    lotSize,
    tradeStatus,
    actualExitPrice,
    advancedSetupConfirmed,
  ]);

  const getFieldBadge = (
    fieldKey: keyof TradingViewExtractionResult['fieldConfidence'] | string,
    currentVal: string
  ) => {
    if (editedFields.has(fieldKey)) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded">
          User Confirmed
        </span>
      );
    }
    const conf: ExtractionConfidenceLevel | undefined =
      extraction?.fieldConfidence?.[fieldKey as keyof TradingViewExtractionResult['fieldConfidence']];

    if (conf === 'HIGH' && currentVal.trim() !== '') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> Auto-Extracted
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" /> Needs Confirmation
      </span>
    );
  };

  const handleConfirmAndSave = async (allowDuplicateOverride = false) => {
    setSaveError(null);
    setDuplicateConflict(null);

    if (!validationState.isValid) {
      setSaveError(validationState.hardErrors[0] || 'Please complete all required fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanInstrument = instrument.trim().toUpperCase().replace(/[\s/\-_]/g, '');
      const entryNum = Number(entryPrice);
      const slNum = Number(stopLoss);
      const tpNum =
        !hasNoTarget && plannedTargetPrice.trim() !== '' && Number(plannedTargetPrice) > 0
          ? Number(plannedTargetPrice)
          : null;
      const lotNum = Number(lotSize);
      const exitNum =
        tradeStatus === 'CLOSED' && actualExitPrice.trim() !== '' ? Number(actualExitPrice) : null;

      const journalCreatedAt = new Date().toISOString();
      const effectiveDate = tradeDate || getKarachiDate();
      const effectiveTime = tradeTime || getKarachiTime24();
      const detectedSession: TradingSession = inferTradingSessionFromTime(effectiveTime);

      // Estimate risk and realized PnL
      const stopPips = Math.abs(calculatePips(cleanInstrument, entryNum, slNum));
      const pipMultiplier = cleanInstrument.includes('XAU') ? 10 : 10;
      const estimatedRisk = Math.max(1, Math.round(stopPips * lotNum * pipMultiplier));

      let profitLoss = 0;
      let pips = 0;
      let result: 'WIN' | 'LOSS' | 'BREAKEVEN' | undefined = undefined;
      const effectiveRR =
        validationState.calculatedRR ??
        (visibleRiskReward.trim() !== '' && Number.isFinite(Number(visibleRiskReward))
          ? Number(visibleRiskReward)
          : 0);

      let rMultiple = effectiveRR;

      if (tradeStatus === 'CLOSED' && exitNum !== null) {
        const signedPips = calculatePips(
          cleanInstrument,
          entryNum,
          exitNum,
          direction as TradeDirection
        );
        pips = signedPips;
        profitLoss = Math.round(signedPips * lotNum * pipMultiplier);
        rMultiple = estimatedRisk > 0 ? Number((profitLoss / estimatedRisk).toFixed(2)) : 0;
        result = profitLoss > 0 ? 'WIN' : profitLoss < 0 ? 'LOSS' : 'BREAKEVEN';
      }

      const idempotencyKey = `tv-${extraction?.screenshotHash || Date.now()}-${cleanInstrument}-${direction}-${entryNum}-${slNum}`;

      const draftTrade: Trade = {
        id: '', // Generated safely & atomically by database persistence layer
        accountId: activeAccount.id,
        tradeNumber: 0,
        date: effectiveDate,
        time: effectiveTime,
        broker:
          extraction?.positionLabels?.brokerOrExchange ||
          activeAccount.brokerName ||
          'TradingView',
        accountType: activeAccount.accountType,
        accountSize: activeAccount.initialBalance,
        instrument: cleanInstrument,
        direction: direction as TradeDirection,
        timeframe: timeframe as Timeframe,
        session: detectedSession,
        status: tradeStatus,
        result,
        entryPrice: entryNum,
        stopLoss: slNum,
        takeProfit: tpNum ?? 0,
        plannedTargetPrice: tpNum,
        exitPrice: tradeStatus === 'CLOSED' && exitNum !== null ? exitNum : 0,
        actualExitPrice: tradeStatus === 'CLOSED' ? exitNum : null,
        lotSize: lotNum,
        riskAmount: estimatedRisk,
        riskPercent:
          activeAccount.initialBalance > 0
            ? Number(((estimatedRisk / activeAccount.initialBalance) * 100).toFixed(2))
            : 1,
        profitLoss,
        rMultiple,
        pips,
        strategy: 'SMC / ICT',
        strategyModel: extraction?.positionToolType || 'TradingView Screenshot Import',
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
        preEmotion: 'CALM',
        postPsychology: {
          followedPlan: true,
          movedStopLoss: false,
          closedEarly: false,
          overtraded: false,
          revengeTraded: false,
          increasedLotSizeEmotionally: false,
        },
        ruleViolation: 'NONE',
        violatedRules: [],
        mistakeReason: 'None (Flawless)',
        grade: effectiveRR >= 2.5 ? 'A+' : effectiveRR >= 1.8 ? 'A' : 'B',
        screenshots: {
          entry: screenshotDataUrl,
        },
        notes:
          strategyNotes.trim() ||
          `Imported from TradingView screenshot (${fileName || 'chart.png'}). ${
            tradeTimeVerified
              ? `Verified chart timestamp: ${effectiveDate} ${effectiveTime}.`
              : 'Chart timestamp was absent; marked unverified.'
          }`,
        idempotencyKey,
        screenshotHash: extraction?.screenshotHash,
        screenshotTradeTimestamp: tradeTimeVerified ? `${effectiveDate}T${effectiveTime}:00` : null,
        screenshotUploadTimestamp: uploadTimestamp || journalCreatedAt,
        journalCreatedAt,
        tradeTimeVerified,
        visibleRiskRewardRatio:
          visibleRiskReward.trim() !== '' && Number.isFinite(Number(visibleRiskReward))
            ? Number(visibleRiskReward)
            : validationState.calculatedRR,
        screenshotImportMeta: {
          importedFromScreenshot: true,
          fileName,
          mimeType,
          positionToolType: extraction?.positionToolType || null,
          rawTimeframeLabel: extraction?.rawTimeframeLabel || timeframe,
          drawingHorizontalDurationIgnored: extraction?.drawingHorizontalDurationIgnored || null,
          visibleTimestampRaw: extraction?.visibleTimestampRaw || null,
          positionLabels: extraction?.positionLabels,
          uncertainFields: extraction?.uncertainFields || [],
          userEditedFields: Array.from(editedFields),
          advancedSetupConfirmed,
          extractionSource: extraction?.source || 'vision_ocr',
        },
      };

      const saveResponse = await onSaveImportedTrade(draftTrade, { allowDuplicateOverride });

      if (!saveResponse.ok || !saveResponse.saved || !saveResponse.trade) {
        if (saveResponse.duplicate) {
          setDuplicateConflict({
            existingTradeId: saveResponse.existingTradeId,
            message:
              saveResponse.error ||
              'Duplicate screenshot import detected. This setup is already saved in your journal.',
          });
        } else {
          setSaveError(
            saveResponse.error || 'Database did not confirm saving this record. Please try again.'
          );
        }
        return;
      }

      // Only transition to SUCCESS after database confirms persistence!
      setSavedTradeRecord(saveResponse.trade);
      setStage('SUCCESS');
    } catch (err: any) {
      setSaveError(err?.message || 'Unexpected error while saving trade record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      data-testid="tv-screenshot-import-modal"
    >
      <div className="relative w-full max-w-6xl bg-[#0B0E14] border border-slate-800 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Top Command Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#111622] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  TradingView Screenshot-to-Journal Import
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">
                  OCR Vision Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zero-fabrication chart extraction · Preserves planned target vs actual exit &amp; verified timestamps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STAGE 1: UPLOAD SCREENSHOT */}
        {stage === 'UPLOAD' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !isExtracting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isExtracting
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : 'border-slate-700 hover:border-emerald-500/60 bg-[#111622]/70 hover:bg-[#111622]'
              }`}
              data-testid="tv-screenshot-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
                data-testid="tv-screenshot-file-input"
              />

              {isExtracting ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                  <div className="text-sm font-semibold text-white">
                    Scanning TradingView Chart &amp; Position Labels...
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Extracting instrument, selected chart timeframe, Long/Short position levels, R:R ratio, and visible timestamps without fabricating missing values.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Click to upload or drag &amp; drop a TradingView Screenshot
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Accepted formats: <span className="text-slate-200 font-mono">PNG, JPG, JPEG</span> · Supports Long Position, Short Position &amp; Order Line setups
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Select TradingView Screenshot
                    </span>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div
                className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs"
                data-testid="tv-upload-error"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Quick Interactive Test Presets for Instant Verification */}
            <div className="bg-[#111622] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Instant TradingView Chart Test Samples (Real PNG Binary + OCR Metadata)
                </span>
                <span className="text-[11px] text-slate-400">Click to test extraction scenarios</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleLoadSamplePreset('LONG_XAUUSD_M15')}
                  data-testid="preset-long-xauusd"
                  className="px-3 py-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-emerald-400 font-mono">LONG · XAUUSD</div>
                  <div className="text-[11px] text-slate-400">M15 · R:R 2.5 · Open</div>
                </button>
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleLoadSamplePreset('SHORT_EURUSD_H4')}
                  data-testid="preset-short-eurusd"
                  className="px-3 py-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-rose-400 font-mono">SHORT · EURUSD</div>
                  <div className="text-[11px] text-slate-400">H4 · R:R 3.0 · Open</div>
                </button>
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleLoadSamplePreset('MISSING_TP_GBPUSD_H1')}
                  data-testid="preset-missing-tp"
                  className="px-3 py-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-amber-300 font-mono">NO TARGET · GBPUSD</div>
                  <div className="text-[11px] text-slate-400">H1 · Missing TP &amp; Time</div>
                </button>
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleLoadSamplePreset('CLOSED_NAS100_M5')}
                  data-testid="preset-closed-nas100"
                  className="px-3 py-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/40 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-sky-400 font-mono">CLOSED · NAS100</div>
                  <div className="text-[11px] text-slate-400">M5 · Planned TP vs Fill</div>
                </button>
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleLoadSamplePreset('UNREADABLE_BLUR')}
                  data-testid="preset-unreadable"
                  className="px-3 py-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 text-left transition-colors"
                >
                  <div className="text-xs font-bold text-slate-300 font-mono">UNREADABLE IMAGE</div>
                  <div className="text-[11px] text-slate-400">Zero-Fabrication Guard</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: COMPACT CONFIRMATION SCREEN ALONGSIDE UPLOADED SCREENSHOT */}
        {stage === 'CONFIRM' && extraction && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column (5 cols): Uploaded Screenshot Preview + Position Labels + Timestamp Audit */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#111622] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[230px]">
                      {fileName || 'tradingview_capture.png'}
                    </span>
                    <button
                      type="button"
                      onClick={resetForAnotherUpload}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Change Image
                    </button>
                  </div>
                  <div className="bg-black/60 p-2 flex items-center justify-center max-h-64 overflow-hidden">
                    <img
                      src={screenshotDataUrl}
                      alt="Uploaded TradingView Screenshot"
                      className="max-h-60 w-auto object-contain rounded border border-slate-800"
                    />
                  </div>
                  <div className="p-3 bg-[#0B0E14]/60 border-t border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{extraction.extractionNotes}</span>
                    </div>
                    {extraction.drawingHorizontalDurationIgnored && (
                      <div className="px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-300 font-mono">
                        Ignored drawing horizontal span &ldquo;{extraction.drawingHorizontalDurationIgnored}&rdquo; &rarr; Using chart timeframe{' '}
                        <strong>{timeframe || 'N/A'}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Position Tool Labels & R:R Card */}
                <div className="bg-[#111622] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Position Tool &amp; Risk-to-Reward Labels
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {validationState.calculatedRR !== null
                        ? `1 : ${validationState.calculatedRR}`
                        : visibleRiskReward
                        ? `1 : ${visibleRiskReward}`
                        : 'R:R Pending'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase">Drawing Type</div>
                      <div className="text-slate-200 mt-0.5">
                        {extraction.positionToolType || 'Manual / Unspecified'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase">Broker / Feed</div>
                      <div className="text-slate-200 mt-0.5">
                        {extraction.positionLabels?.brokerOrExchange || activeAccount.brokerName || 'N/A'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase">Target Label</div>
                      <div className="text-emerald-300 mt-0.5 truncate">
                        {extraction.positionLabels?.targetDistanceLabel || 'Not Printed'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase">Stop Label</div>
                      <div className="text-rose-300 mt-0.5 truncate">
                        {extraction.positionLabels?.stopDistanceLabel || 'Not Printed'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distinct Timestamp Integrity Ledger */}
                <div className="bg-[#111622] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" /> Timestamp Separation Audit
                    </span>
                    {tradeTimeVerified ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">
                        VERIFIED TRADE TIME
                      </span>
                    ) : (
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded"
                        data-testid="unverified-timestamp-badge"
                      >
                        UNVERIFIED TRADE TIME
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">1. Screenshot Trade Time:</span>
                      <span>
                        {tradeTimeVerified
                          ? `${tradeDate} ${tradeTime}`
                          : 'Absent on chart (Unverified)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">2. Screenshot Upload Time:</span>
                      <span>{uploadTimestamp ? uploadTimestamp.slice(0, 19).replace('T', ' ') : 'Now'}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">3. Journal Creation Time:</span>
                      <span>Assigned on DB Commit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (7 cols): Compact Editable Confirmation Form */}
              <div className="lg:col-span-7 space-y-4">
                {!extraction.isReadableTradingViewChart && (
                  <div
                    className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5"
                    data-testid="unreadable-screenshot-banner"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Unreadable or Incomplete Chart Detected — Zero Values Fabricated</div>
                      <p className="text-amber-300/90 mt-0.5">
                        {extraction.unreadableReason ||
                          'No prices, direction, or instrument names were invented. Please enter or confirm the required trade details below.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary Required Input Banner: Lot Size */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Required User Input: Lot Size
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                        REQUIRED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      TradingView position drawings do not know your executed broker lot size. Enter lots to calculate exact risk &amp; PnL.
                    </p>
                  </div>
                  <div className="w-full sm:w-44 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 1.00"
                      value={lotSize}
                      onChange={(e) => {
                        setLotSize(e.target.value);
                        markFieldEdited('lotSize');
                      }}
                      data-testid="tv-input-lotsize"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-emerald-500/50 focus:border-emerald-400 text-white font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Core Extracted Trade Fields Grid */}
                <div className="bg-[#111622] border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Instrument */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Instrument / Pair *</label>
                        {getFieldBadge('instrument', instrument)}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. XAUUSD"
                        value={instrument}
                        onChange={(e) => {
                          setInstrument(e.target.value.toUpperCase());
                          markFieldEdited('instrument');
                        }}
                        data-testid="tv-input-instrument"
                        className={`w-full px-3 py-2 rounded-lg bg-[#0B0E14] border text-white font-mono text-sm focus:outline-none ${
                          !instrument.trim()
                            ? 'border-amber-500/60'
                            : 'border-slate-700 focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    {/* Chart Timeframe */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Chart Timeframe *</label>
                        {getFieldBadge('timeframe', timeframe)}
                      </div>
                      <select
                        value={timeframe}
                        onChange={(e) => {
                          setTimeframe(e.target.value as Timeframe);
                          markFieldEdited('timeframe');
                        }}
                        data-testid="tv-select-timeframe"
                        className={`w-full px-3 py-2 rounded-lg bg-[#0B0E14] border text-white font-mono text-sm focus:outline-none ${
                          !timeframe
                            ? 'border-amber-500/60'
                            : 'border-slate-700 focus:border-emerald-500'
                        }`}
                      >
                        <option value="">Select Timeframe...</option>
                        {TIMEFRAMES.map((tf) => (
                          <option key={tf} value={tf}>
                            {tf}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Direction */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Direction *</label>
                        {getFieldBadge('direction', direction)}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDirection('BUY');
                            markFieldEdited('direction');
                          }}
                          data-testid="tv-btn-direction-buy"
                          className={`py-2 px-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1 border transition-colors ${
                            direction === 'BUY'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" /> LONG / BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirection('SELL');
                            markFieldEdited('direction');
                          }}
                          data-testid="tv-btn-direction-sell"
                          className={`py-2 px-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1 border transition-colors ${
                            direction === 'SELL'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" /> SHORT / SELL
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Prices Row: Entry, Stop-Loss, Planned Target Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Entry Price *</label>
                        {getFieldBadge('entryPrice', entryPrice)}
                      </div>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0000"
                        value={entryPrice}
                        onChange={(e) => {
                          setEntryPrice(e.target.value);
                          markFieldEdited('entryPrice');
                        }}
                        data-testid="tv-input-entry"
                        className={`w-full px-3 py-2 rounded-lg bg-[#0B0E14] border text-white font-mono text-sm focus:outline-none ${
                          !entryPrice.trim()
                            ? 'border-amber-500/60'
                            : 'border-slate-700 focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Stop-Loss Price *</label>
                        {getFieldBadge('stopLoss', stopLoss)}
                      </div>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0000"
                        value={stopLoss}
                        onChange={(e) => {
                          setStopLoss(e.target.value);
                          markFieldEdited('stopLoss');
                        }}
                        data-testid="tv-input-sl"
                        className={`w-full px-3 py-2 rounded-lg bg-[#0B0E14] border text-white font-mono text-sm focus:outline-none ${
                          !stopLoss.trim()
                            ? 'border-amber-500/60'
                            : 'border-slate-700 focus:border-rose-500'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Planned Target (TP)</label>
                        {getFieldBadge('takeProfit', plannedTargetPrice)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          disabled={hasNoTarget}
                          placeholder={hasNoTarget ? 'Open Runner (No TP)' : 'Optional TP'}
                          value={hasNoTarget ? '' : plannedTargetPrice}
                          onChange={(e) => {
                            setPlannedTargetPrice(e.target.value);
                            setHasNoTarget(false);
                            markFieldEdited('takeProfit');
                          }}
                          data-testid="tv-input-tp"
                          className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-slate-700 focus:border-emerald-500 text-white font-mono text-sm focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <label className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasNoTarget}
                          onChange={(e) => {
                            setHasNoTarget(e.target.checked);
                            if (e.target.checked) setPlannedTargetPrice('');
                            markFieldEdited('takeProfit');
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                        />
                        No Target / Open Runner
                      </label>
                    </div>
                  </div>

                  {/* Trade Status (Default OPEN) vs Actual Exit Price Distinction */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Trade Status (Defaults to OPEN unless confirmed Closed)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTradeStatus('OPEN');
                            markFieldEdited('status');
                          }}
                          data-testid="tv-status-open"
                          className={`py-2 px-3 rounded-lg font-mono text-xs font-bold border transition-colors ${
                            tradeStatus === 'OPEN'
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                              : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                          }`}
                        >
                          OPEN TRADE (ACTIVE)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTradeStatus('CLOSED');
                            markFieldEdited('status');
                          }}
                          data-testid="tv-status-closed"
                          className={`py-2 px-3 rounded-lg font-mono text-xs font-bold border transition-colors ${
                            tradeStatus === 'CLOSED'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                          }`}
                        >
                          CLOSED (EXECUTED EXIT)
                        </button>
                      </div>
                    </div>

                    {tradeStatus === 'CLOSED' ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-emerald-300">
                            Actual Exit Price * (Distinct from Planned Target)
                          </label>
                          {plannedTargetPrice && (
                            <button
                              type="button"
                              onClick={() => setActualExitPrice(plannedTargetPrice)}
                              className="text-[10px] font-mono text-sky-400 hover:underline"
                            >
                              Copy Planned TP
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="any"
                          placeholder="Enter actual broker exit price..."
                          value={actualExitPrice}
                          onChange={(e) => {
                            setActualExitPrice(e.target.value);
                            markFieldEdited('actualExitPrice');
                          }}
                          data-testid="tv-input-actual-exit"
                          className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-emerald-500/50 text-white font-mono text-sm focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-slate-800 text-[11px] text-slate-400">
                        <strong className="text-slate-200">Planned Target vs Exit Integrity:</strong> While status is{' '}
                        <span className="text-sky-300 font-mono">OPEN</span>, Planned Target is stored separately and Actual Exit Price remains unset (`null`).
                      </div>
                    )}
                  </div>

                  {/* Expanded Edit Details Section (Triggered by "Edit Details" button) */}
                  {isEditDetailsExpanded && (
                    <div
                      className="pt-3 border-t border-slate-800 space-y-3"
                      data-testid="tv-expanded-details"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Trade Date (PKT)
                          </label>
                          <input
                            type="date"
                            value={tradeDate}
                            onChange={(e) => {
                              setTradeDate(e.target.value);
                              setTradeTimeVerified(true);
                              markFieldEdited('tradeTimestamp');
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Trade Time (PKT)
                          </label>
                          <input
                            type="time"
                            value={tradeTime}
                            onChange={(e) => {
                              setTradeTime(e.target.value);
                              setTradeTimeVerified(true);
                              markFieldEdited('tradeTimestamp');
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Visible R:R Ratio
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 2.50"
                            value={visibleRiskReward}
                            onChange={(e) => {
                              setVisibleRiskReward(e.target.value);
                              markFieldEdited('riskRewardRatio');
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-700 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tradeTimeVerified}
                            onChange={(e) => setTradeTimeVerified(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                          />
                          Mark Trade Timestamp as Verified by Trader
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Execution &amp; Structure Notes
                        </label>
                        <textarea
                          rows={2}
                          value={strategyNotes}
                          onChange={(e) => setStrategyNotes(e.target.value)}
                          placeholder="Add optional confluence notes..."
                          className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-slate-700 text-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Advanced Setup Confirmation Toggle (when Stop-Loss is trailed past Entry) */}
                  {validationState.requiresAdvancedConfirmation && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 space-y-2">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Advanced Stop-Loss Placement Detected
                      </div>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-amber-100">
                        <input
                          type="checkbox"
                          checked={advancedSetupConfirmed}
                          onChange={(e) => setAdvancedSetupConfirmed(e.target.checked)}
                          data-testid="tv-confirm-advanced-setup"
                          className="rounded border-amber-500 bg-slate-900 text-emerald-500"
                        />
                        I confirm this is a legitimate break-even or trailed in-profit Stop-Loss setup.
                      </label>
                    </div>
                  )}

                  {/* Validation Warnings & Errors */}
                  {validationState.warnings.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      {validationState.warnings.map((w, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {saveError && (
                    <div
                      className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2"
                      data-testid="tv-save-error"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {duplicateConflict && (
                    <div
                      className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 space-y-2"
                      data-testid="tv-duplicate-warning"
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Duplicate Screenshot Import Prevented
                      </div>
                      <p>{duplicateConflict.message}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmAndSave(true)}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-semibold"
                        >
                          Save Anyway as Separate Trade ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* THREE REQUIRED ACTIONS: Confirm & Save, Edit Details, Cancel */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    data-testid="tv-action-cancel"
                    className="px-4 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditDetailsExpanded((prev) => !prev)}
                      data-testid="tv-action-edit-details"
                      className="px-4 py-2.5 rounded-lg bg-[#111622] hover:bg-slate-800 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {isEditDetailsExpanded ? 'Hide Extra Details' : 'Edit Details'}
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleConfirmAndSave(false)}
                      data-testid="tv-action-confirm-save"
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Confirming with Database...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Confirm &amp; Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: DATABASE-CONFIRMED SAVE SUCCESS SCREEN */}
        {stage === 'SUCCESS' && savedTradeRecord && (
          <div className="p-6 sm:p-8 text-center space-y-5 overflow-y-auto" data-testid="tv-save-success">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> DATABASE PERSISTENCE CONFIRMED
              </div>
              <h3 className="text-xl font-bold text-white pt-1">
                Screenshot Trade Logged Successfully
              </h3>
              <p className="text-xs text-slate-400">
                Your TradingView setup has been validated and saved without overwriting any existing journal records.
              </p>
            </div>

            <div className="max-w-lg mx-auto bg-[#111622] border border-slate-800 rounded-xl p-4 text-left space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Generated Trade ID:</span>
                <span
                  className="text-base font-bold text-emerald-400"
                  data-testid="tv-generated-trade-id"
                >
                  {savedTradeRecord.id}
                </span>
              </div>
              {savedTradeRecord.dbUuid && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Database Record UUID:</span>
                  <span className="text-slate-300">{savedTradeRecord.dbUuid}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Setup:</span>
                <span className="text-white font-bold">
                  {savedTradeRecord.instrument} · {savedTradeRecord.direction} · {savedTradeRecord.timeframe}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Entry / SL / Planned TP:</span>
                <span className="text-slate-200">
                  {savedTradeRecord.entryPrice} / {savedTradeRecord.stopLoss} /{' '}
                  {savedTradeRecord.plannedTargetPrice ?? 'Open Runner'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status &amp; Actual Exit:</span>
                <span className="text-sky-300">
                  {savedTradeRecord.status} (
                  {savedTradeRecord.status === 'CLOSED' && savedTradeRecord.actualExitPrice
                    ? `Exit @ ${savedTradeRecord.actualExitPrice}`
                    : 'No Exit Yet'}
                  )
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lot Size:</span>
                <span className="text-emerald-300">{savedTradeRecord.lotSize} Lots</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Trade Time Status:</span>
                <span className={savedTradeRecord.tradeTimeVerified ? 'text-emerald-300' : 'text-amber-300'}>
                  {savedTradeRecord.date} {savedTradeRecord.time} (
                  {savedTradeRecord.tradeTimeVerified ? 'Verified' : 'Unverified'})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetForAnotherUpload}
                data-testid="tv-action-upload-another"
                className="px-4 py-2.5 rounded-lg bg-[#111622] hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Another Screenshot
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="tv-action-done"
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Return to Trade Journal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
