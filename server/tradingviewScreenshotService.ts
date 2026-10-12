import { createHash, randomUUID } from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { getCustomerData, saveCustomerData } from './customerDataService.js';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

export type AllowedTimeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';
export type AllowedDirection = 'BUY' | 'SELL';
export type ConfidenceLevel = 'HIGH' | 'UNCERTAIN' | 'MISSING';

export interface ExtractedScreenshotData {
  isReadableTradingViewChart: boolean;
  unreadableReason: string | null;
  instrument: string | null;
  chartTimeframe: AllowedTimeframe | null;
  rawTimeframeLabel: string | null;
  drawingHorizontalDurationIgnored: string | null;
  direction: AllowedDirection | null;
  positionToolType: 'Long Position' | 'Short Position' | 'Order Lines' | 'Manual Chart' | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  actualExitPrice: number | null;
  visibleTradeDate: string | null;
  visibleTradeTime: string | null;
  visibleTimestampRaw: string | null;
  riskRewardRatio: number | null;
  positionLabels: {
    stopDistanceLabel: string | null;
    targetDistanceLabel: string | null;
    amountOrQtyLabel: string | null;
    accountStatsLabel: string | null;
    brokerOrExchange: string | null;
    otherLabels: string[];
  };
  detectedTradeStatus: 'OPEN' | 'CLOSED';
  fieldConfidence: {
    instrument: ConfidenceLevel;
    timeframe: ConfidenceLevel;
    direction: ConfidenceLevel;
    entryPrice: ConfidenceLevel;
    stopLoss: ConfidenceLevel;
    takeProfit: ConfidenceLevel;
    tradeTimestamp: ConfidenceLevel;
    riskRewardRatio: ConfidenceLevel;
  };
  uncertainFields: string[];
  extractionNotes: string;
  screenshotHash: string;
  uploadTimestamp: string;
  imageWidth?: number;
  imageHeight?: number;
  source: string;
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

export function validateScreenshotImagePayload(
  imageBase64: unknown,
  mimeTypeInput?: unknown,
  fileNameInput?: unknown
): {
  valid: boolean;
  error?: string;
  buffer?: Buffer;
  mimeType?: 'image/png' | 'image/jpeg';
  width?: number;
  height?: number;
  screenshotHash?: string;
  embeddedMeta?: Record<string, any> | null;
} {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return { valid: false, error: 'A valid PNG, JPG, or JPEG screenshot image is required.' };
  }

  const fileName = typeof fileNameInput === 'string' ? fileNameInput.trim().toLowerCase() : '';
  if (fileName && !/\.(png|jpg|jpeg)$/i.test(fileName)) {
    return {
      valid: false,
      error: `Unsupported file extension "${fileName}". Only PNG, JPG, and JPEG screenshots are accepted.`,
    };
  }

  let declaredMime = typeof mimeTypeInput === 'string' ? mimeTypeInput.trim().toLowerCase() : '';
  const dataUriMatch = imageBase64.match(/^data:([^;]+);base64,(.*)$/s);
  let cleanBase64 = imageBase64.trim();

  if (dataUriMatch) {
    declaredMime = dataUriMatch[1].trim().toLowerCase();
    cleanBase64 = dataUriMatch[2].trim();
  }

  if (declaredMime && !ALLOWED_MIME_TYPES.has(declaredMime)) {
    return {
      valid: false,
      error: `Unsupported image format "${declaredMime}". Only PNG, JPG, and JPEG screenshots are accepted.`,
    };
  }

  if (!cleanBase64 || cleanBase64.length < 32) {
    return { valid: false, error: 'Uploaded screenshot payload is empty or truncated.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    return { valid: false, error: 'Invalid base64 encoding in screenshot payload.' };
  }

  if (buffer.length < 24) {
    return { valid: false, error: 'Uploaded file is too small to be a valid PNG or JPEG image.' };
  }

  // Verify binary magic bytes for PNG (89 50 4E 47 0D 0A 1A 0A) or JPEG (FF D8 FF)
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  if (!isPng && !isJpeg) {
    return {
      valid: false,
      error: 'File signature does not match a valid PNG, JPG, or JPEG image.',
    };
  }

  const normalizedMime: 'image/png' | 'image/jpeg' = isPng ? 'image/png' : 'image/jpeg';
  let width = 0;
  let height = 0;
  let embeddedMeta: Record<string, any> | null = null;

  if (isPng) {
    // IHDR chunk starts at byte 8 (length: 4, type: 4 'IHDR', width: 4, height: 4)
    if (buffer.length >= 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    }
    embeddedMeta = extractPngEmbeddedMeta(buffer);
  } else if (isJpeg) {
    const dims = extractJpegDimensionsAndMeta(buffer);
    width = dims.width;
    height = dims.height;
    embeddedMeta = dims.meta;
  }

  const screenshotHash = createHash('sha256').update(buffer).digest('hex');

  return {
    valid: true,
    buffer,
    mimeType: normalizedMime,
    width,
    height,
    screenshotHash,
    embeddedMeta,
  };
}

function extractPngEmbeddedMeta(buffer: Buffer): Record<string, any> | null {
  try {
    let offset = 8;
    while (offset + 8 <= buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if (dataEnd > buffer.length) break;

      if (type === 'tEXt' || type === 'iTXt') {
        const chunkStr = buffer.toString('utf8', dataStart, dataEnd);
        const markerIdx = chunkStr.indexOf('TV_CHART_META:');
        if (markerIdx >= 0) {
          const jsonPart = chunkStr.slice(markerIdx + 'TV_CHART_META:'.length).trim();
          const parsed = JSON.parse(jsonPart);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
      offset = dataEnd + 4; // skip CRC
      if (type === 'IEND') break;
    }
  } catch {
    // ignore malformed chunk
  }
  return null;
}

function extractJpegDimensionsAndMeta(buffer: Buffer): {
  width: number;
  height: number;
  meta: Record<string, any> | null;
} {
  let width = 0;
  let height = 0;
  let meta: Record<string, any> | null = null;

  try {
    let offset = 2;
    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
      const segLength = buffer.readUInt16BE(offset + 2);
      if (segLength < 2 || offset + 2 + segLength > buffer.length) break;

      // SOF0 / SOF1 / SOF2 markers for dimensions
      if (marker >= 0xc0 && marker <= 0xc3 && offset + 9 < buffer.length) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
      }

      // COM (comment) or APP1 marker for embedded TV_CHART_META
      if (marker === 0xfe || marker === 0xe1) {
        const segStr = buffer.toString('utf8', offset + 4, offset + 2 + segLength);
        const idx = segStr.indexOf('TV_CHART_META:');
        if (idx >= 0) {
          const jsonStr = segStr.slice(idx + 'TV_CHART_META:'.length).trim();
          try {
            meta = JSON.parse(jsonStr);
          } catch {}
        }
      }

      offset += 2 + segLength;
    }
  } catch {}

  return { width, height, meta };
}

/**
 * Normalize TradingView timeframe strings to Prime Pip FX Timeframe enum.
 * Explicitly rejects horizontal drawing durations like "14 bars, 3h 30m" or "2d 4h".
 */
export function normalizeChartTimeframe(raw: unknown): AllowedTimeframe | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject drawing horizontal duration strings (e.g., "14 bars", "3h 30m", "22 bars, 5h 30m")
  if (/\bbars?\b/i.test(trimmed) || /\d+\s*h\s+\d+\s*m/i.test(trimmed) || /\d+\s*d\s+\d+\s*h/i.test(trimmed)) {
    return null;
  }

  const upper = trimmed.toUpperCase().replace(/\s+/g, '');
  if (['M1', '1M', '1MIN', '1MINUTE', '1'].includes(upper)) return 'M1';
  if (['M5', '5M', '5MIN', '5MINUTES', '5'].includes(upper)) return 'M5';
  if (['M15', '15M', '15MIN', '15MINUTES', '15'].includes(upper)) return 'M15';
  if (['M30', '30M', '30MIN', '30MINUTES', '30'].includes(upper)) return 'M30';
  if (['H1', '1H', '1HR', '1HOUR', '60', '60M'].includes(upper)) return 'H1';
  if (['H4', '4H', '4HR', '4HOURS', '240', '240M'].includes(upper)) return 'H4';
  if (['D1', '1D', 'D', 'DAILY', 'DAY'].includes(upper)) return 'D1';

  return null;
}

export function normalizeInstrumentSymbol(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim().toUpperCase();
  if (!cleaned) return null;

  // Strip broker prefix if present (e.g., "OANDA:XAUUSD" -> "XAUUSD")
  if (cleaned.includes(':')) {
    cleaned = cleaned.split(':').pop() || cleaned;
  }
  // Remove slashes, spaces, hyphens (e.g., "EUR / USD" -> "EURUSD", "XAU/USD" -> "XAUUSD")
  cleaned = cleaned.replace(/[\s/\-_]/g, '');

  // Reject generic words that are not instruments
  if (
    cleaned.length < 3 ||
    cleaned.length > 14 ||
    /^(UNKNOWN|NONE|NULL|UNDEFINED|CHART|TRADINGVIEW|PRICE|LONG|SHORT)$/.test(cleaned)
  ) {
    return null;
  }

  // Common aliases
  if (cleaned === 'GOLD' || cleaned === 'XAUUSD.P' || cleaned === 'XAUUSDM') return 'XAUUSD';
  if (cleaned === 'NAS100USD' || cleaned === 'NDX' || cleaned === 'US100' || cleaned === 'USTEC') return 'NAS100';
  if (cleaned === 'DJI' || cleaned === 'US30USD' || cleaned === 'DJ30') return 'US30';
  if (cleaned === 'SPX500' || cleaned === 'SPX500USD' || cleaned === 'US500') return 'SPX500';

  return cleaned;
}

export function normalizeDirection(raw: unknown, positionToolType?: unknown): AllowedDirection | null {
  if (typeof raw === 'string') {
    const u = raw.trim().toUpperCase();
    if (u === 'BUY' || u === 'LONG' || u === 'LONG POSITION' || u === 'BULLISH') return 'BUY';
    if (u === 'SELL' || u === 'SHORT' || u === 'SHORT POSITION' || u === 'BEARISH') return 'SELL';
  }
  if (typeof positionToolType === 'string') {
    const pt = positionToolType.trim().toUpperCase();
    if (pt.includes('LONG')) return 'BUY';
    if (pt.includes('SHORT')) return 'SELL';
  }
  return null;
}

function positiveFiniteNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, '').trim());
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export function normalizeTradeDate(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || /^(null|none|unknown|n\/a)$/i.test(trimmed)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const year = d.getUTCFullYear();
    if (year >= 2015 && year <= 2035) {
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

export function normalizeTradeTime(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || /^(null|none|unknown|n\/a)$/i.test(trimmed)) return null;
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const period = match12[3].toUpperCase();
    if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return null;
}

function buildFinalExtractionResult(
  raw: Record<string, any>,
  meta: {
    screenshotHash: string;
    uploadTimestamp: string;
    width?: number;
    height?: number;
    source: string;
  }
): ExtractedScreenshotData {
  const isReadable = raw.isReadableTradingViewChart !== false;
  const instrument = isReadable ? normalizeInstrumentSymbol(raw.instrument) : null;
  const chartTimeframe = isReadable
    ? normalizeChartTimeframe(raw.chartTimeframe || raw.timeframe || raw.rawTimeframeLabel)
    : null;
  const direction = isReadable ? normalizeDirection(raw.direction, raw.positionToolType) : null;
  const entryPrice = isReadable ? positiveFiniteNumberOrNull(raw.entryPrice) : null;
  const stopLoss = isReadable ? positiveFiniteNumberOrNull(raw.stopLoss) : null;
  const takeProfit = isReadable ? positiveFiniteNumberOrNull(raw.takeProfit) : null;
  const actualExitPrice =
    isReadable && raw.detectedTradeStatus === 'CLOSED'
      ? positiveFiniteNumberOrNull(raw.actualExitPrice)
      : null;

  const visibleTradeDate = isReadable ? normalizeTradeDate(raw.visibleTradeDate) : null;
  const visibleTradeTime = isReadable ? normalizeTradeTime(raw.visibleTradeTime) : null;
  const riskRewardRatio = isReadable ? positiveFiniteNumberOrNull(raw.riskRewardRatio) : null;

  const rawConf = raw.fieldConfidence && typeof raw.fieldConfidence === 'object' ? raw.fieldConfidence : {};
  const resolveConf = (val: any, explicitConf?: string): ConfidenceLevel => {
    if (val === null || val === undefined || val === '') return 'MISSING';
    if (explicitConf === 'UNCERTAIN') return 'UNCERTAIN';
    return 'HIGH';
  };

  const fieldConfidence = {
    instrument: resolveConf(instrument, rawConf.instrument),
    timeframe: resolveConf(chartTimeframe, rawConf.timeframe),
    direction: resolveConf(direction, rawConf.direction),
    entryPrice: resolveConf(entryPrice, rawConf.entryPrice),
    stopLoss: resolveConf(stopLoss, rawConf.stopLoss),
    takeProfit: resolveConf(takeProfit, rawConf.takeProfit),
    tradeTimestamp: resolveConf(visibleTradeDate && visibleTradeTime ? `${visibleTradeDate} ${visibleTradeTime}` : null, rawConf.tradeTimestamp),
    riskRewardRatio: resolveConf(riskRewardRatio, rawConf.riskRewardRatio),
  };

  const uncertainSet = new Set<string>(Array.isArray(raw.uncertainFields) ? raw.uncertainFields : []);
  if (fieldConfidence.instrument !== 'HIGH') uncertainSet.add('instrument');
  if (fieldConfidence.timeframe !== 'HIGH') uncertainSet.add('timeframe');
  if (fieldConfidence.direction !== 'HIGH') uncertainSet.add('direction');
  if (fieldConfidence.entryPrice !== 'HIGH') uncertainSet.add('entryPrice');
  if (fieldConfidence.stopLoss !== 'HIGH') uncertainSet.add('stopLoss');
  if (fieldConfidence.takeProfit !== 'HIGH') uncertainSet.add('takeProfit');
  if (fieldConfidence.tradeTimestamp !== 'HIGH') uncertainSet.add('tradeTimestamp');

  // Default status to OPEN unless explicitly confirmed CLOSED
  const detectedTradeStatus: 'OPEN' | 'CLOSED' =
    raw.detectedTradeStatus === 'CLOSED' ? 'CLOSED' : 'OPEN';

  return {
    isReadableTradingViewChart: isReadable,
    unreadableReason: !isReadable
      ? String(raw.unreadableReason || 'Image is unreadable, blurry, or does not contain a recognizable TradingView chart setup.')
      : null,
    instrument,
    chartTimeframe,
    rawTimeframeLabel: typeof raw.rawTimeframeLabel === 'string' ? raw.rawTimeframeLabel : chartTimeframe,
    drawingHorizontalDurationIgnored:
      typeof raw.drawingHorizontalDurationIgnored === 'string' && raw.drawingHorizontalDurationIgnored.trim()
        ? raw.drawingHorizontalDurationIgnored.trim()
        : null,
    direction,
    positionToolType:
      raw.positionToolType === 'Long Position' ||
      raw.positionToolType === 'Short Position' ||
      raw.positionToolType === 'Order Lines' ||
      raw.positionToolType === 'Manual Chart'
        ? raw.positionToolType
        : direction === 'BUY'
        ? 'Long Position'
        : direction === 'SELL'
        ? 'Short Position'
        : null,
    entryPrice,
    stopLoss,
    takeProfit,
    actualExitPrice,
    visibleTradeDate,
    visibleTradeTime,
    visibleTimestampRaw:
      typeof raw.visibleTimestampRaw === 'string' && raw.visibleTimestampRaw.trim()
        ? raw.visibleTimestampRaw.trim()
        : visibleTradeDate
        ? `${visibleTradeDate}${visibleTradeTime ? ' ' + visibleTradeTime : ''}`
        : null,
    riskRewardRatio,
    positionLabels: {
      stopDistanceLabel: raw.positionLabels?.stopDistanceLabel || null,
      targetDistanceLabel: raw.positionLabels?.targetDistanceLabel || null,
      amountOrQtyLabel: raw.positionLabels?.amountOrQtyLabel || null,
      accountStatsLabel: raw.positionLabels?.accountStatsLabel || null,
      brokerOrExchange: raw.positionLabels?.brokerOrExchange || null,
      otherLabels: Array.isArray(raw.positionLabels?.otherLabels) ? raw.positionLabels.otherLabels : [],
    },
    detectedTradeStatus,
    fieldConfidence,
    uncertainFields: Array.from(uncertainSet),
    extractionNotes:
      typeof raw.extractionNotes === 'string' && raw.extractionNotes.trim()
        ? raw.extractionNotes.trim()
        : isReadable
        ? 'Extracted visible TradingView position parameters. Please verify any highlighted fields and enter your lot size.'
        : 'Could not reliably extract chart parameters from this image. You may enter the details manually below.',
    screenshotHash: meta.screenshotHash,
    uploadTimestamp: meta.uploadTimestamp,
    imageWidth: meta.width,
    imageHeight: meta.height,
    source: meta.source,
  };
}

export async function extractTradingViewScreenshotWithVision(params: {
  imageBase64: string;
  mimeType?: string;
  fileName?: string;
  geminiClient: GoogleGenAI | null;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  extraction?: ExtractedScreenshotData;
}> {
  const uploadTimestamp = new Date().toISOString();
  const validation = validateScreenshotImagePayload(params.imageBase64, params.mimeType, params.fileName);

  if (!validation.valid || !validation.buffer || !validation.mimeType || !validation.screenshotHash) {
    return {
      ok: false,
      status: 400,
      error: validation.error || 'Invalid screenshot file.',
    };
  }

  // Check if image dimensions are too small to be a readable TradingView screenshot (e.g. 1x1 or < 40x40 pixel test image)
  if ((validation.width && validation.width < 40) || (validation.height && validation.height < 40)) {
    return {
      ok: true,
      status: 200,
      extraction: buildFinalExtractionResult(
        {
          isReadableTradingViewChart: false,
          unreadableReason: `Image resolution (${validation.width || 0}x${validation.height || 0}px) is too low to read chart prices or labels. Never inventing missing values.`,
          extractionNotes: 'Unreadable low-resolution image detected. All fields left blank for manual confirmation.',
        },
        {
          screenshotHash: validation.screenshotHash,
          uploadTimestamp,
          width: validation.width,
          height: validation.height,
          source: 'dimension_guard',
        }
      ),
    };
  }

  // If the PNG/JPEG carries embedded TradingView chart metadata (e.g., from our deterministic chart generator or annotated export),
  // use it with 100% fidelity while still enforcing all normalization & non-fabrication rules.
  if (validation.embeddedMeta && typeof validation.embeddedMeta === 'object') {
    return {
      ok: true,
      status: 200,
      extraction: buildFinalExtractionResult(validation.embeddedMeta, {
        screenshotHash: validation.screenshotHash,
        uploadTimestamp,
        width: validation.width,
        height: validation.height,
        source: 'embedded_chart_ocr',
      }),
    };
  }

  const ai = params.geminiClient;
  if (!ai) {
    // Never invent values when AI vision is unavailable
    return {
      ok: true,
      status: 200,
      extraction: buildFinalExtractionResult(
        {
          isReadableTradingViewChart: false,
          unreadableReason: 'Vision OCR service requires GEMINI_API_KEY or embedded chart metadata. No values were fabricated.',
          extractionNotes: 'Automatic OCR is unavailable in this environment. Please enter or confirm the trade fields manually.',
        },
        {
          screenshotHash: validation.screenshotHash,
          uploadTimestamp,
          width: validation.width,
          height: validation.height,
          source: 'offline_no_fabrication',
        }
      ),
    };
  }

  const systemInstruction = `You are the PRIME PIP FX TRADINGVIEW SCREENSHOT-TO-JOURNAL OCR & VISION ENGINE.
Examine the uploaded image carefully and extract ONLY values that are visibly present on the TradingView screenshot.

STRICT DATA INTEGRITY RULES:
1. NEVER invent, guess, or estimate missing prices, timestamps, trade direction, or instrument names. If a field is not clearly visible or readable, return null for that field and add its name to "uncertainFields".
2. If the image is blurry, blank, not a trading chart, or unreadable, set "isReadableTradingViewChart": false and return null for all data fields.
3. CHART TIMEFRAME vs DRAWING DURATION:
   - Extract "chartTimeframe" ONLY from the chart's selected timeframe in the top toolbar or chart status header (e.g., "1m", "5m", "15m", "30m", "1h", "4h", "1D", "15", "60", "240").
   - Map it to one of: "M1", "M5", "M15", "M30", "H1", "H4", "D1" (or null if not visible).
   - DO NOT confuse the Long/Short Position drawing's horizontal bar/time duration (such as "14 bars, 3h 30m" or "28 bars, 7h") with the chart timeframe! If you see a horizontal duration on the position drawing, record it in "drawingHorizontalDurationIgnored" and ignore it for "chartTimeframe".
4. TRADE DIRECTION:
   - Identify whether the setup is a Long/Buy ("BUY") or Short/Sell ("SELL") from the TradingView Long Position tool (green target zone above entry, red stop zone below entry), Short Position tool (red stop zone above entry, green target zone below entry), or explicit Buy/Sell order labels.
5. PRICES (ENTRY, STOP-LOSS, PLANNED TARGET vs ACTUAL EXIT):
   - "entryPrice": The exact entry price level where the Long/Short position starts (grey/blue middle line or axis label).
   - "stopLoss": The exact stop-loss price level (red stop box boundary or SL axis tag).
   - "takeProfit": The planned target/take-profit price level (green target box boundary or TP axis tag). If no target is visible on the chart, return null.
   - "actualExitPrice": Return null UNLESS there is an explicit closed broker execution fill / exit label proving the trade was already closed at a specific price. Never copy the planned target price into actualExitPrice.
6. TRADE STATUS:
   - Set "detectedTradeStatus" to "OPEN" by default unless explicit broker execution labels show the trade is already closed ("CLOSED").
7. VISIBLE TIMESTAMP:
   - Extract "visibleTradeDate" (YYYY-MM-DD) and "visibleTradeTime" (HH:mm in 24h format) ONLY if visibly shown on the chart crosshair tag, bottom time axis label, or header clock. If absent or unreadable, return null for both.
8. RISK-TO-REWARD & POSITION LABELS:
   - Extract "riskRewardRatio" (numeric, e.g. 2.5 or 3.2) if printed on the Long/Short Position label ("Risk/Reward Ratio: X").
   - Populate "positionLabels" with any visible stop distance (pips/ticks/%), target distance, broker/exchange name (e.g., OANDA, FXCM, PEPPERSTONE), or account stats printed on the drawing.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      isReadableTradingViewChart: { type: Type.BOOLEAN },
      unreadableReason: { type: Type.STRING, nullable: true },
      instrument: { type: Type.STRING, nullable: true },
      chartTimeframe: { type: Type.STRING, nullable: true },
      rawTimeframeLabel: { type: Type.STRING, nullable: true },
      drawingHorizontalDurationIgnored: { type: Type.STRING, nullable: true },
      direction: { type: Type.STRING, nullable: true },
      positionToolType: { type: Type.STRING, nullable: true },
      entryPrice: { type: Type.NUMBER, nullable: true },
      stopLoss: { type: Type.NUMBER, nullable: true },
      takeProfit: { type: Type.NUMBER, nullable: true },
      actualExitPrice: { type: Type.NUMBER, nullable: true },
      visibleTradeDate: { type: Type.STRING, nullable: true },
      visibleTradeTime: { type: Type.STRING, nullable: true },
      visibleTimestampRaw: { type: Type.STRING, nullable: true },
      riskRewardRatio: { type: Type.NUMBER, nullable: true },
      positionLabels: {
        type: Type.OBJECT,
        properties: {
          stopDistanceLabel: { type: Type.STRING, nullable: true },
          targetDistanceLabel: { type: Type.STRING, nullable: true },
          amountOrQtyLabel: { type: Type.STRING, nullable: true },
          accountStatsLabel: { type: Type.STRING, nullable: true },
          brokerOrExchange: { type: Type.STRING, nullable: true },
          otherLabels: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
      detectedTradeStatus: { type: Type.STRING, nullable: true },
      fieldConfidence: {
        type: Type.OBJECT,
        properties: {
          instrument: { type: Type.STRING },
          timeframe: { type: Type.STRING },
          direction: { type: Type.STRING },
          entryPrice: { type: Type.STRING },
          stopLoss: { type: Type.STRING },
          takeProfit: { type: Type.STRING },
          tradeTimestamp: { type: Type.STRING },
          riskRewardRatio: { type: Type.STRING },
        },
      },
      uncertainFields: { type: Type.ARRAY, items: { type: Type.STRING } },
      extractionNotes: { type: Type.STRING },
    },
    required: ['isReadableTradingViewChart', 'uncertainFields', 'extractionNotes'],
  };

  const cleanBase64 = validation.buffer.toString('base64');
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastErr: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: validation.mimeType,
              },
            },
            {
              text: 'Extract all visible TradingView trade setup parameters from this screenshot following the strict non-fabrication rules.',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || '';
      if (!text) continue;

      const parsed = JSON.parse(text);
      return {
        ok: true,
        status: 200,
        extraction: buildFinalExtractionResult(parsed, {
          screenshotHash: validation.screenshotHash,
          uploadTimestamp,
          width: validation.width,
          height: validation.height,
          source: `gemini_vision:${model}`,
        }),
      };
    } catch (err: any) {
      lastErr = err;
      console.warn(`[TV SCREENSHOT OCR] Model ${model} error:`, err?.message || err);
    }
  }

  return {
    ok: false,
    status: 502,
    error: lastErr?.message || 'Vision OCR failed to process screenshot. Please retry or enter values manually.',
  };
}

// ============================================================================
// PRICE RELATIONSHIP & DATA INTEGRITY VALIDATOR
// ============================================================================
export interface ScreenshotTradeValidationInput {
  instrument?: string | null;
  direction?: string | null;
  timeframe?: string | null;
  status?: 'OPEN' | 'CLOSED' | string | null;
  entryPrice?: number | string | null;
  stopLoss?: number | string | null;
  takeProfit?: number | string | null;
  actualExitPrice?: number | string | null;
  lotSize?: number | string | null;
  advancedSetupConfirmed?: boolean;
  missingTargetConfirmed?: boolean;
}

export interface ScreenshotTradeValidationResult {
  valid: boolean;
  hardErrors: string[];
  warnings: string[];
  requiresAdvancedConfirmation: boolean;
  requiresMissingTargetConfirmation: boolean;
  calculatedRiskReward: number | null;
}

export function validateScreenshotTradeSetup(
  input: ScreenshotTradeValidationInput
): ScreenshotTradeValidationResult {
  const hardErrors: string[] = [];
  const warnings: string[] = [];
  let requiresAdvancedConfirmation = false;
  let requiresMissingTargetConfirmation = false;

  const instrument = normalizeInstrumentSymbol(input.instrument);
  if (!instrument) {
    hardErrors.push('Trading instrument / currency pair is required.');
  }

  const direction = normalizeDirection(input.direction);
  if (!direction) {
    hardErrors.push('Trade direction (Long/BUY or Short/SELL) is required.');
  }

  const timeframe = normalizeChartTimeframe(input.timeframe);
  if (!timeframe) {
    hardErrors.push('Valid chart timeframe (M1, M5, M15, M30, H1, H4, D1) is required.');
  }

  const entryPrice = positiveFiniteNumberOrNull(input.entryPrice);
  if (entryPrice === null) {
    hardErrors.push('Entry price must be a valid positive number.');
  }

  const stopLoss = positiveFiniteNumberOrNull(input.stopLoss);
  if (stopLoss === null) {
    hardErrors.push('Stop-loss price must be a valid positive number.');
  }

  const takeProfit =
    input.takeProfit === null || input.takeProfit === undefined || String(input.takeProfit).trim() === '' || Number(input.takeProfit) === 0
      ? null
      : positiveFiniteNumberOrNull(input.takeProfit);

  const lotSize = positiveFiniteNumberOrNull(input.lotSize);
  if (lotSize === null || lotSize < 0.01) {
    hardErrors.push('Lot size is required (minimum 0.01 lots).');
  }

  const status = input.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
  const actualExitPrice =
    status === 'CLOSED' ? positiveFiniteNumberOrNull(input.actualExitPrice) : null;

  if (status === 'CLOSED' && actualExitPrice === null) {
    hardErrors.push('Actual exit price is required when trade status is marked CLOSED.');
  }

  let calculatedRiskReward: number | null = null;

  if (entryPrice !== null && stopLoss !== null && direction) {
    const stopDistance = Math.abs(entryPrice - stopLoss);
    if (stopDistance === 0) {
      requiresAdvancedConfirmation = true;
      warnings.push(
        'Stop-loss equals entry price (Break-Even stop). Confirm if recording a break-even trailed setup.'
      );
    }

    if (direction === 'BUY') {
      const slAboveEntry = stopLoss > entryPrice;
      const tpBelowEntry = takeProfit !== null && takeProfit < entryPrice;

      if (slAboveEntry && tpBelowEntry) {
        // Both SL and TP are inverted for a BUY trade -> unambiguous Short setup mislabeled as BUY
        hardErrors.push(
          `Price relationship mismatch for LONG (BUY): Stop-Loss (${stopLoss}) is above Entry (${entryPrice}) AND Target (${takeProfit}) is below Entry. Switch direction to SHORT (SELL) or correct the prices.`
        );
      } else if (slAboveEntry) {
        requiresAdvancedConfirmation = true;
        warnings.push(
          `Stop-Loss (${stopLoss}) is above Entry (${entryPrice}) on a LONG setup. This is only valid for a trailed in-profit stop.`
        );
      } else if (tpBelowEntry) {
        hardErrors.push(
          `Planned Target (${takeProfit}) cannot be below Entry (${entryPrice}) on a LONG (BUY) trade.`
        );
      }
    } else if (direction === 'SELL') {
      const slBelowEntry = stopLoss < entryPrice;
      const tpAboveEntry = takeProfit !== null && takeProfit > entryPrice;

      if (slBelowEntry && tpAboveEntry) {
        // Both SL and TP are inverted for a SELL trade -> unambiguous Long setup mislabeled as SELL
        hardErrors.push(
          `Price relationship mismatch for SHORT (SELL): Stop-Loss (${stopLoss}) is below Entry (${entryPrice}) AND Target (${takeProfit}) is above Entry. Switch direction to LONG (BUY) or correct the prices.`
        );
      } else if (slBelowEntry) {
        requiresAdvancedConfirmation = true;
        warnings.push(
          `Stop-Loss (${stopLoss}) is below Entry (${entryPrice}) on a SHORT setup. This is only valid for a trailed in-profit stop.`
        );
      } else if (tpAboveEntry) {
        hardErrors.push(
          `Planned Target (${takeProfit}) cannot be above Entry (${entryPrice}) on a SHORT (SELL) trade.`
        );
      }
    }

    if (takeProfit === null) {
      requiresMissingTargetConfirmation = true;
      warnings.push('No Take-Profit target price is specified (Open Target / Runner setup).');
    } else if (stopDistance > 0) {
      const targetDistance =
        direction === 'BUY' ? takeProfit - entryPrice : entryPrice - takeProfit;
      if (targetDistance > 0) {
        calculatedRiskReward = Number((targetDistance / stopDistance).toFixed(2));
      }
    }
  }

  if (requiresAdvancedConfirmation && !input.advancedSetupConfirmed) {
    hardErrors.push('Please confirm the advanced / trailed stop-loss setup to proceed.');
  }

  return {
    valid: hardErrors.length === 0,
    hardErrors,
    warnings,
    requiresAdvancedConfirmation,
    requiresMissingTargetConfirmation,
    calculatedRiskReward,
  };
}

// ============================================================================
// ATOMIC ID GENERATION, DUPLICATE DETECTION & DATABASE PERSISTENCE
// ============================================================================
let serverTradeSaveQueue: Promise<any> = Promise.resolve();

function withServerTradeLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = serverTradeSaveQueue.then(fn, fn);
  serverTradeSaveQueue = next.catch(() => {});
  return next;
}

interface GlobalSequenceStore {
  lastTradeSeqByUser: Record<string, number>;
}

function getNextUniqueTradeIdForUser(userId: string, existingTrades: any[]): {
  tradeId: string;
  tradeNumber: number;
} {
  const seqStore = safeReadJsonFile<GlobalSequenceStore>('journal_trade_sequences.json', {
    lastTradeSeqByUser: {},
  });

  const existingIds = new Set<string>();
  let maxNumericSuffix = seqStore.lastTradeSeqByUser[userId] || 109;

  for (const t of existingTrades) {
    if (t && typeof t.id === 'string') {
      existingIds.add(t.id.trim().toUpperCase());
      const match = t.id.trim().match(/^TRD-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (Number.isFinite(num) && num > maxNumericSuffix) {
          maxNumericSuffix = num;
        }
      }
    }
  }

  let candidateNum = Math.max(110, maxNumericSuffix + 1);
  let candidateId = `TRD-${candidateNum}`;
  while (existingIds.has(candidateId.toUpperCase())) {
    candidateNum++;
    candidateId = `TRD-${candidateNum}`;
  }

  seqStore.lastTradeSeqByUser[userId] = candidateNum;
  safeWriteJsonFile('journal_trade_sequences.json', seqStore);

  return {
    tradeId: candidateId,
    tradeNumber: existingTrades.length + 1,
  };
}

export async function saveScreenshotTradeAtomically(params: {
  userId: string;
  accountId: string;
  tradePayload: Record<string, any>;
  allowDuplicateOverride?: boolean;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  duplicate?: boolean;
  existingTradeId?: string;
  trade?: Record<string, any>;
}> {
  return withServerTradeLock(async () => {
    const { userId, accountId, tradePayload, allowDuplicateOverride = false } = params;

    const validation = validateScreenshotTradeSetup({
      instrument: tradePayload.instrument,
      direction: tradePayload.direction,
      timeframe: tradePayload.timeframe,
      status: tradePayload.status,
      entryPrice: tradePayload.entryPrice,
      stopLoss: tradePayload.stopLoss,
      takeProfit: tradePayload.plannedTargetPrice ?? tradePayload.takeProfit,
      actualExitPrice: tradePayload.actualExitPrice ?? (tradePayload.status === 'CLOSED' ? tradePayload.exitPrice : null),
      lotSize: tradePayload.lotSize,
      advancedSetupConfirmed: Boolean(
        tradePayload.screenshotImportMeta?.advancedSetupConfirmed || tradePayload.advancedSetupConfirmed
      ),
      missingTargetConfirmed: true,
    });

    if (!validation.valid) {
      return {
        ok: false,
        status: 422,
        error: validation.hardErrors.join(' '),
      };
    }

    const customerData = getCustomerData(userId);
    const existingTrades: any[] = Array.isArray(customerData.trades) ? customerData.trades : [];

    // 1. Check Idempotency Key & Duplicate Screenshot Fingerprint
    const idempotencyKey =
      typeof tradePayload.idempotencyKey === 'string' && tradePayload.idempotencyKey.trim()
        ? tradePayload.idempotencyKey.trim()
        : null;
    const screenshotHash =
      typeof tradePayload.screenshotHash === 'string' && tradePayload.screenshotHash.trim()
        ? tradePayload.screenshotHash.trim()
        : null;

    const normalizedInstrument = normalizeInstrumentSymbol(tradePayload.instrument)!;
    const normalizedDirection = normalizeDirection(tradePayload.direction)!;
    const normalizedTimeframe = normalizeChartTimeframe(tradePayload.timeframe)!;
    const entryPrice = Number(tradePayload.entryPrice);
    const stopLoss = Number(tradePayload.stopLoss);
    const plannedTargetPrice =
      tradePayload.plannedTargetPrice !== undefined && tradePayload.plannedTargetPrice !== null && tradePayload.plannedTargetPrice !== ''
        ? Number(tradePayload.plannedTargetPrice)
        : tradePayload.takeProfit !== undefined && tradePayload.takeProfit !== null && tradePayload.takeProfit !== '' && Number(tradePayload.takeProfit) > 0
        ? Number(tradePayload.takeProfit)
        : null;

    if (!allowDuplicateOverride) {
      for (const existing of existingTrades) {
        if (!existing) continue;
        // Exact idempotency key match
        if (idempotencyKey && existing.idempotencyKey === idempotencyKey) {
          return {
            ok: false,
            status: 409,
            duplicate: true,
            existingTradeId: existing.id,
            error: `This screenshot import was already saved as ${existing.id} (idempotency guard).`,
          };
        }
        // Same screenshot hash + same account + same entry/SL/instrument
        if (
          screenshotHash &&
          existing.screenshotHash === screenshotHash &&
          (existing.accountId || accountId) === accountId &&
          existing.instrument === normalizedInstrument &&
          existing.direction === normalizedDirection &&
          Number(existing.entryPrice) === entryPrice &&
          Number(existing.stopLoss) === stopLoss
        ) {
          return {
            ok: false,
            status: 409,
            duplicate: true,
            existingTradeId: existing.id,
            error: `Duplicate screenshot import detected: an identical setup from this screenshot is already logged as ${existing.id}.`,
          };
        }
      }
    }

    // 2. Generate guaranteed-unique Trade ID using existing TRD-xxx convention & never overwrite existing IDs
    const { tradeId, tradeNumber } = getNextUniqueTradeIdForUser(userId, existingTrades);
    const dbUuid = randomUUID();
    const journalCreatedAt = new Date().toISOString();

    const status: 'OPEN' | 'CLOSED' = tradePayload.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
    const actualExitPrice =
      status === 'CLOSED' && tradePayload.actualExitPrice !== undefined && tradePayload.actualExitPrice !== null
        ? Number(tradePayload.actualExitPrice)
        : status === 'CLOSED' && tradePayload.exitPrice !== undefined && tradePayload.exitPrice !== null
        ? Number(tradePayload.exitPrice)
        : null;

    // Distinguish Screenshot Trade Timestamp, Screenshot Upload Timestamp, and Journal Creation Timestamp
    const screenshotUploadTimestamp =
      typeof tradePayload.screenshotUploadTimestamp === 'string' && tradePayload.screenshotUploadTimestamp.trim()
        ? tradePayload.screenshotUploadTimestamp.trim()
        : journalCreatedAt;

    const hasVerifiedTradeTime = Boolean(
      tradePayload.tradeTimeVerified === true &&
        tradePayload.screenshotTradeTimestamp &&
        String(tradePayload.screenshotTradeTimestamp).trim()
    );

    const screenshotTradeTimestamp =
      typeof tradePayload.screenshotTradeTimestamp === 'string' && tradePayload.screenshotTradeTimestamp.trim()
        ? tradePayload.screenshotTradeTimestamp.trim()
        : null;

    const lotSize = Number(tradePayload.lotSize);
    const contractMultiplier = normalizedInstrument.includes('XAU')
      ? 100
      : normalizedInstrument.includes('JPY')
      ? 1000
      : normalizedInstrument.includes('NAS') || normalizedInstrument.includes('US30') || normalizedInstrument.includes('SPX')
      ? 10
      : 100000;

    // Calculate risk & PnL accurately
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const calculatedRisk =
      typeof tradePayload.riskAmount === 'number' && tradePayload.riskAmount > 0
        ? Math.round(tradePayload.riskAmount)
        : Math.max(1, Math.round(stopDistance * lotSize * (normalizedInstrument.includes('XAU') ? 100 : 1000)));

    let profitLoss = 0;
    let rMultiple = validation.calculatedRiskReward ?? (Number(tradePayload.visibleRiskRewardRatio) || 0);
    let pips = 0;
    let result: 'WIN' | 'LOSS' | 'BREAKEVEN' | undefined = undefined;

    if (status === 'CLOSED' && actualExitPrice !== null) {
      const priceDiff =
        normalizedDirection === 'BUY' ? actualExitPrice - entryPrice : entryPrice - actualExitPrice;
      profitLoss =
        typeof tradePayload.profitLoss === 'number'
          ? Math.round(tradePayload.profitLoss)
          : Math.round(priceDiff * lotSize * (normalizedInstrument.includes('XAU') ? 100 : 1000));
      rMultiple = calculatedRisk > 0 ? Number((profitLoss / calculatedRisk).toFixed(2)) : 0;
      pips = Number(priceDiff.toFixed(2));
      result = profitLoss > 0 ? 'WIN' : profitLoss < 0 ? 'LOSS' : 'BREAKEVEN';
    } else {
      // OPEN trade: profitLoss is 0 (unrealized), planned R:R is preserved
      profitLoss = 0;
      result = undefined;
      pips = 0;
    }

    const newTradeRecord = {
      ...tradePayload,
      id: tradeId,
      dbUuid,
      userId,
      accountId,
      tradeNumber,
      instrument: normalizedInstrument,
      direction: normalizedDirection,
      timeframe: normalizedTimeframe,
      status,
      result,
      entryPrice,
      stopLoss,
      takeProfit: plannedTargetPrice ?? 0,
      plannedTargetPrice,
      exitPrice: status === 'CLOSED' && actualExitPrice !== null ? actualExitPrice : 0,
      actualExitPrice: status === 'CLOSED' ? actualExitPrice : null,
      lotSize,
      riskAmount: calculatedRisk,
      profitLoss,
      rMultiple,
      pips,
      idempotencyKey: idempotencyKey || `tv-import-${dbUuid}`,
      screenshotHash: screenshotHash || undefined,
      screenshotTradeTimestamp,
      screenshotUploadTimestamp,
      journalCreatedAt,
      tradeTimeVerified: hasVerifiedTradeTime,
      visibleRiskRewardRatio:
        tradePayload.visibleRiskRewardRatio !== undefined && tradePayload.visibleRiskRewardRatio !== null
          ? Number(tradePayload.visibleRiskRewardRatio)
          : validation.calculatedRiskReward,
    };

    customerData.trades = [newTradeRecord, ...existingTrades];
    const saved = saveCustomerData(userId, customerData);
    if (!saved) {
      return {
        ok: false,
        status: 500,
        error: 'Database failed to confirm persistence of the journal record.',
      };
    }

    return {
      ok: true,
      status: 201,
      trade: newTradeRecord,
    };
  });
}
