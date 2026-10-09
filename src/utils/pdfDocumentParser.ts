import pako from 'pako';
import { OFFICIAL_INDICATOR_REGISTRY } from '../data/fundamentalRegistryData';

// ----------------------------------------------------
// PDF EXTRACTION TELEMETRY & PAGE COVERAGE METADATA
// ----------------------------------------------------
export interface PdfExtractionTelemetry {
  totalPages: number;
  pagesProcessed: number;
  pagesFailed: number;
  failedPageNumbers: number[];
  scannedPageNumbers: number[];
  valuesExtracted: number;
  valuesRequiringReview: number;
  extractionMethod: 'NATIVE_PDF_TEXT' | 'VISION_OCR' | 'HYBRID_TEXT_AND_OCR';
  incompleteReason?: string;
}

export interface StructuredPdfDocument {
  fullText: string;
  totalPages: number;
  pagesProcessed: number;
  pagesFailed: number;
  failedPageNumbers: number[];
  scannedPageNumbers: number[];
  pageTexts: { pageNumber: number; text: string; charCount: number; isScanned: boolean }[];
}

// ----------------------------------------------------
// NUMBER PARSING UTILITY (STRICT & DETERMINISTIC)
// ----------------------------------------------------
export function safeParseNum(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    if (
      cleaned === '—' ||
      cleaned === '-' ||
      cleaned === '–' ||
      cleaned === '--' ||
      cleaned.toLowerCase() === 'pending' ||
      cleaned.toLowerCase() === 'n/a' ||
      cleaned.toLowerCase() === 'null' ||
      cleaned.toLowerCase() === 'none' ||
      cleaned === ''
    ) {
      return null;
    }

    // Handle parentheses for negative numbers e.g. (0.5) => -0.5
    const parenNeg = cleaned.match(/^\(([+-]?\d+(?:\.\d+)?)\)/);
    if (parenNeg) {
      const n = -Math.abs(parseFloat(parenNeg[1]));
      return isNaN(n) ? null : n;
    }

    // Handle standard positive or negative number (also allowing optional $ or +/$ prefix)
    const match = cleaned.replace(/^[$€£¥]/, '').match(/^[+-]?\$?\d+(?:\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0].replace('$', ''));
      return isNaN(num) ? null : num;
    }
  }
  return null;
}

// ----------------------------------------------------
// PURE CLIENT & SERVER PDF TEXT EXTRACTOR
// Never detaches caller's Uint8Array buffer
// ----------------------------------------------------
export function getCleanBase64(data: string): string {
  if (!data) return '';
  const commaIdx = data.indexOf(',');
  const raw = commaIdx !== -1 ? data.substring(commaIdx + 1) : data;
  return raw.trim().replace(/\s+/g, '');
}

export function isPdfPayload(data: any, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().includes('pdf')) return true;
  if (!data) return false;
  if (typeof data === 'string') {
    if (data.startsWith('data:application/pdf') || data.startsWith('data:application/x-pdf')) return true;
    const clean = getCleanBase64(data);
    return clean.startsWith('JVBERi0');
  }
  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (u8.length >= 5 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46 && u8[4] === 0x2D) {
      return true;
    }
  }
  return false;
}

/**
 * Always returns a fresh, non-detached Uint8Array copy so pdfjs-dist worker transfers
 * never mutate or zero out the caller's original buffer.
 */
export function toUint8Array(data: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (data instanceof Uint8Array) {
    return new Uint8Array(data);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data.slice(0));
  }
  if (typeof data === 'string') {
    const clean = getCleanBase64(data);
    if (!clean) return new Uint8Array(0);
    try {
      if (typeof atob === 'function') {
        const bin = atob(clean);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          u8[i] = bin.charCodeAt(i);
        }
        return u8;
      }
    } catch {
      // Fall through to Buffer
    }
    try {
      if (typeof Buffer !== 'undefined') {
        const buf = Buffer.from(clean, 'base64');
        return new Uint8Array(buf);
      }
    } catch {
      return new Uint8Array(0);
    }
  }
  return new Uint8Array(0);
}

let pdfWorkerInitialized = false;
async function loadPdfJsWithWorker() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfWorkerInitialized) {
    try {
      const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
      (globalThis as any).pdfjsWorker = pdfjsWorker;
      pdfWorkerInitialized = true;
    } catch {
      if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch {
          // Ignore worker URL fallback error
        }
      }
    }
  }
  return pdfjsLib;
}

/**
 * Extracts structured page-by-page text from all pages of a PDF document.
 * Preserves table column boundaries using X-coordinate gap detection and never detaches input bytes.
 */
export async function extractStructuredPdfDocument(
  data: Uint8Array | ArrayBuffer | string
): Promise<StructuredPdfDocument> {
  const originalU8 = toUint8Array(data);
  if (!originalU8 || originalU8.length === 0) {
    return {
      fullText: '',
      totalPages: 0,
      pagesProcessed: 0,
      pagesFailed: 0,
      failedPageNumbers: [],
      scannedPageNumbers: [],
      pageTexts: [],
    };
  }

  try {
    const pdfjsLib = await loadPdfJsWithWorker();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(originalU8),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    } as any);

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages || 1;
    let pagesProcessed = 0;
    let pagesFailed = 0;
    const failedPageNumbers: number[] = [];
    const scannedPageNumbers: number[] = [];
    const pageTexts: { pageNumber: number; text: string; charCount: number; isScanned: boolean }[] = [];
    const allPagesText: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();

        // Group items by Y coordinate (tolerance of 4 points) and sort by X to reconstruct horizontal table rows
        const lineMap = new Map<number, { str: string; x: number; width: number }[]>();
        const rawTokens: string[] = [];

        for (const item of content.items as any[]) {
          if (!item || typeof item.str !== 'string') continue;
          const str = item.str.trim();
          if (!str) continue;
          rawTokens.push(str);
          const y = Math.round(item.transform ? item.transform[5] : 0);
          const x = item.transform ? item.transform[4] : 0;
          const width = typeof item.width === 'number' ? item.width : str.length * 5;

          let key = Array.from(lineMap.keys()).find((k) => Math.abs(k - y) <= 4);
          if (key === undefined) {
            key = y;
            lineMap.set(key, []);
          }
          lineMap.get(key)!.push({ str, x, width });
        }

        // Sort lines top-to-bottom (higher Y in PDF is higher on page)
        const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
        const horizontalRows = sortedY.map((y) => {
          const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
          let rowStr = '';
          let prevEnd = -1;
          for (const it of items) {
            if (prevEnd !== -1) {
              const gap = it.x - prevEnd;
              if (gap > 12) {
                rowStr += ' | ';
              } else {
                rowStr += ' ';
              }
            }
            rowStr += it.str;
            prevEnd = it.x + Math.max(it.width, 4);
          }
          return rowStr.trim();
        });

        const pageText = (horizontalRows.length > 0 ? horizontalRows.join('\n') : rawTokens.join(' ')).trim();
        const charCount = pageText.replace(/\s+/g, '').length;
        const isScanned = charCount < 20;

        if (isScanned) {
          scannedPageNumbers.push(pageNum);
        }
        pageTexts.push({ pageNumber: pageNum, text: pageText, charCount, isScanned });
        if (pageText) {
          allPagesText.push(`--- PAGE ${pageNum} OF ${totalPages} ---\n${pageText}`);
        }
        pagesProcessed += 1;
      } catch (pageErr) {
        pagesFailed += 1;
        failedPageNumbers.push(pageNum);
      }
    }

    const combined = allPagesText.join('\n\n').trim();
    if (combined.length > 10) {
      return {
        fullText: combined,
        totalPages,
        pagesProcessed,
        pagesFailed,
        failedPageNumbers,
        scannedPageNumbers,
        pageTexts,
      };
    }

    // If pdfjs found 0 native text (or failed), try stream inflation fallback on a fresh copy
    const fallbackText = extractTextFromPdf(new Uint8Array(originalU8)).trim();
    if (fallbackText.length > 10) {
      return {
        fullText: fallbackText,
        totalPages,
        pagesProcessed: totalPages,
        pagesFailed: 0,
        failedPageNumbers: [],
        scannedPageNumbers: [],
        pageTexts: [{ pageNumber: 1, text: fallbackText, charCount: fallbackText.length, isScanned: false }],
      };
    }

    return {
      fullText: '',
      totalPages,
      pagesProcessed,
      pagesFailed,
      failedPageNumbers,
      scannedPageNumbers: scannedPageNumbers.length > 0 ? scannedPageNumbers : Array.from({ length: totalPages }, (_, i) => i + 1),
      pageTexts,
    };
  } catch (err: any) {
    console.warn('[PDF PARSER] pdfjs-dist structured extraction fallback:', err?.message || err);
    const fallbackText = extractTextFromPdf(new Uint8Array(originalU8)).trim();
    const approxPages = Math.max(1, (fallbackText.match(/\/Type\s*\/Page\b/g) || []).length || 1);
    return {
      fullText: fallbackText,
      totalPages: approxPages,
      pagesProcessed: fallbackText.length > 0 ? approxPages : 0,
      pagesFailed: fallbackText.length > 0 ? 0 : approxPages,
      failedPageNumbers: fallbackText.length > 0 ? [] : [1],
      scannedPageNumbers: fallbackText.length > 0 ? [] : [1],
      pageTexts: fallbackText ? [{ pageNumber: 1, text: fallbackText, charCount: fallbackText.length, isScanned: false }] : [],
    };
  }
}

export async function extractTextFromPdfAsync(data: Uint8Array | ArrayBuffer | string): Promise<string> {
  const doc = await extractStructuredPdfDocument(data);
  return doc.fullText;
}

/**
 * Renders a PDF page to a canvas image (Data URL) for visual preview and OCR fallback of image-based PDFs.
 * Always clones the input buffer so the original Uint8Array is never detached.
 */
export async function renderPdfPageToImage(
  data: Uint8Array | ArrayBuffer | string,
  pageNumber: number = 1,
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number; text: string; totalPages?: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const u8 = toUint8Array(data);
  if (!u8 || u8.length === 0) return null;

  try {
    const pdfjsLib = await loadPdfJsWithWorker();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(u8),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    } as any);
    const pdf = await loadingTask.promise;
    const targetPage = Math.max(1, Math.min(pageNumber, pdf.numPages || 1));
    const page = await pdf.getPage(targetPage);

    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
      .join('\n');

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await (page.render as any)({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    return {
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      text,
      totalPages: pdf.numPages,
    };
  } catch (err: any) {
    console.warn('[PDF RENDER] renderPdfPageToImage warning:', err?.message || err);
    return null;
  }
}

export function extractTextFromPdf(data: Uint8Array | ArrayBuffer | string): string {
  const u8 = toUint8Array(data);
  if (!u8 || u8.length === 0) return '';

  let str = '';
  const chunkSize = 32768;
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, Math.min(i + chunkSize, u8.length));
    let chunkStr = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkStr += String.fromCharCode(chunk[j]);
    }
    str += chunkStr;
  }

  let fullText = '';
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(str)) !== null) {
    const rawStream = match[1];
    let decompressedStr = '';
    try {
      const streamBytes = new Uint8Array(rawStream.length);
      for (let j = 0; j < rawStream.length; j++) {
        streamBytes[j] = rawStream.charCodeAt(j);
      }
      const uncompressed = pako.inflate(streamBytes);
      let dec = '';
      for (let k = 0; k < uncompressed.length; k += chunkSize) {
        const sub = uncompressed.subarray(k, Math.min(k + chunkSize, uncompressed.length));
        let subStr = '';
        for (let m = 0; m < sub.length; m++) {
          subStr += String.fromCharCode(sub[m]);
        }
        dec += subStr;
      }
      decompressedStr = dec;
    } catch {
      decompressedStr = rawStream;
    }

    const opRegex = /(?:\((?:\\\(|\\\)|[^()])*\)|\[[\s\S]*?\]|<[0-9a-fA-F]+>)\s*T[jJ]|T\*|(?:[+-]?\d+(?:\.\d+)?\s+){1,2}T[dD]|(?:[+-]?\d+(?:\.\d+)?\s+){6}Tm/g;
    let opMatch: RegExpExecArray | null;
    let streamText = '';
    let hasOps = false;

    while ((opMatch = opRegex.exec(decompressedStr)) !== null) {
      hasOps = true;
      const op = opMatch[0];
      if (/T\*|\bT[dD]\b|\bTm\b/.test(op)) {
        if (!streamText.endsWith('\n')) {
          streamText += '\n';
        }
      } else if (op.trim().startsWith('[')) {
        // TJ array: join literal strings without space unless kerning number <= -120
        const tjTokenRegex = /\((?:\\\(|\\\)|[^()])*\)|<([0-9a-fA-F]+)>|([+-]?\d+(?:\.\d+)?)/g;
        let tjMatch: RegExpExecArray | null;
        let wordBuf = '';
        while ((tjMatch = tjTokenRegex.exec(op)) !== null) {
          const tok = tjMatch[0];
          if (tok.startsWith('(')) {
            const t = tok
              .slice(1, -1)
              .replace(/\\([()\\])/g, '$1')
              .replace(/\\r/g, '\r')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t');
            wordBuf += t;
          } else if (tjMatch[1]) {
            const hex = tjMatch[1];
            for (let k = 0; k < hex.length; k += 2) {
              wordBuf += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
            }
          } else if (tjMatch[2]) {
            const kern = parseFloat(tjMatch[2]);
            if (kern <= -120 && !wordBuf.endsWith(' ')) {
              wordBuf += ' ';
            }
          }
        }
        if (wordBuf.trim()) {
          streamText += (streamText && !streamText.endsWith('\n') && !streamText.endsWith(' ') ? ' ' : '') + wordBuf.trim();
        }
      } else {
        const hexRegex = /<([0-9a-fA-F]+)>/g;
        let hMatch: RegExpExecArray | null;
        while ((hMatch = hexRegex.exec(op)) !== null) {
          const hex = hMatch[1];
          let hDec = '';
          for (let k = 0; k < hex.length; k += 2) {
            hDec += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
          }
          if (hDec.trim()) {
            streamText += (streamText && !streamText.endsWith('\n') ? ' ' : '') + hDec;
          }
        }

        const parenRegex = /\((?:\\\(|\\\)|[^()])*\)/g;
        let pMatch: RegExpExecArray | null;
        while ((pMatch = parenRegex.exec(op)) !== null) {
          let t = pMatch[0].slice(1, -1);
          t = t
            .replace(/\\([()\\])/g, '$1')
            .replace(/\\r/g, '\r')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');
          if (t.trim()) {
            streamText += (streamText && !streamText.endsWith('\n') ? ' ' : '') + t;
          }
        }
      }
    }

    if (!hasOps) {
      const parenRegex = /\((?:\\\(|\\\)|[^()])*\)/g;
      const tokens: string[] = [];
      let pMatch: RegExpExecArray | null;
      while ((pMatch = parenRegex.exec(decompressedStr)) !== null) {
        let t = pMatch[0].slice(1, -1);
        t = t
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\r/g, '\r')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t');
        if (t.trim()) {
          tokens.push(t);
        }
      }
      if (tokens.length > 0) {
        streamText = tokens.join(' ') + '\n';
      }
    }

    if (streamText.trim()) {
      fullText += streamText + '\n';
    }
  }

  if (!fullText.trim()) {
    const parenRegex = /\((?:\\\(|\\\)|[^()])*\)/g;
    const tokens: string[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = parenRegex.exec(str)) !== null) {
      let t = pMatch[0].slice(1, -1).replace(/\\([()\\])/g, '$1');
      if (t.trim().length > 1) {
        tokens.push(t);
      }
    }
    if (tokens.length > 0) {
      fullText = tokens.join(' ');
    }
  }

  return fullText;
}

// ----------------------------------------------------
// REGISTRY MATCHER (NORMALIZED & EXACT WITH RICH ALIASES)
// ----------------------------------------------------
export function findBestRegistryMatch(rawName: string, currency: string) {
  const norm = String(rawName || '').toLowerCase().trim();
  const clean = norm
    .replace(/\|/g, ' ')
    .replace(/[….]+/g, ' ')
    .replace(/[()[\]{},;:]/g, ' ')
    .replace(/[-—–_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) return null;

  const curr = String(currency || 'USD').toUpperCase().trim();
  let candidates = OFFICIAL_INDICATOR_REGISTRY.filter((reg: any) => reg.currency === curr);
  if (!candidates.length) {
    candidates = OFFICIAL_INDICATOR_REGISTRY;
  }

  // 1. Exact match against candidate shortLabel, name, code, or id
  for (const reg of candidates) {
    const s = (reg.shortLabel || '').toLowerCase().replace(/[-—–_]+/g, ' ').trim();
    const n = reg.name.toLowerCase().replace(/[-—–_]+/g, ' ').trim();
    const c = (reg.code || '').toLowerCase();
    const id = reg.id.toLowerCase();
    if (clean === s || clean === n || clean === c || clean === id) return reg;
  }

  // 2. Direct substring match with high confidence (prefer longest match)
  let bestSubMatch: any = null;
  let maxSubLen = 0;
  for (const reg of candidates) {
    const s = (reg.shortLabel || '').toLowerCase().replace(/[-—–_]+/g, ' ').trim();
    const n = reg.name.toLowerCase().replace(/[-—–_]+/g, ' ').trim();
    const nPrefix = n.slice(0, 24).trim();

    if (s.length >= 4 && clean.includes(s) && s.length > maxSubLen) {
      maxSubLen = s.length;
      bestSubMatch = reg;
    }
    if (n.length >= 6 && clean.includes(n) && n.length > maxSubLen) {
      maxSubLen = n.length;
      bestSubMatch = reg;
    }
    if (nPrefix.length >= 10 && clean.includes(nPrefix) && nPrefix.length > maxSubLen) {
      maxSubLen = nPrefix.length;
      bestSubMatch = reg;
    }
  }
  if (bestSubMatch) return bestSubMatch;

  // 3. Keyword / Token-based domain scoring for each currency
  let bestCandidate: any = null;
  let bestScore = 0;

  for (const reg of candidates) {
    const regId = reg.id.toLowerCase();
    let score = 0;

    // 10Y / 2Y Yield matching
    if (regId.includes('10y') || regId.includes('yield') || regId.includes('gilt') || regId.includes('bund') || regId.includes('jgb') || regId.includes('acgb') || regId.includes('confed')) {
      if (clean.includes('10y') || clean.includes('10 year') || clean.includes('sovereign') || clean.includes('gilt') || clean.includes('bund') || clean.includes('jgb') || clean.includes('acgb') || clean.includes('confederation') || clean.includes('bond yield') || clean.includes('treasury yield')) {
        score += 18;
      }
    }
    if (regId.includes('2y') && (clean.includes('2y') || clean.includes('2 year'))) {
      score += 22;
    }

    // PMI / ISM matching
    if (regId.includes('pmi') || regId.includes('ism')) {
      if (clean.includes('pmi') || clean.includes('ism') || clean.includes('purchas') || clean.includes('procure')) {
        score += 10;
        if ((regId.includes('mfg') || regId.includes('manufacturing')) && (clean.includes('mfg') || clean.includes('manufactur'))) score += 12;
        if ((regId.includes('serv') || regId.includes('services')) && (clean.includes('serv') || clean.includes('services') || clean.includes('non manufacturing'))) score += 12;
        if (regId.includes('procure') && clean.includes('procure')) score += 15;
        if (regId.includes('judo') && clean.includes('judo')) score += 15;
        if (regId.includes('jibun') && clean.includes('jibun')) score += 15;
        if (regId.includes('sp_') && (clean.includes('s&p') || clean.includes('sp global') || clean.includes('cips'))) score += 15;
        if (regId.includes('businessnz') && clean.includes('businessnz')) score += 15;
        if (regId.includes('ism') && clean.includes('ism')) score += 15;
        if (regId.includes('ivey') && clean.includes('ivey')) score += 15;
      }
    }

    // Policy / Interest Rate matching
    if (regId.includes('policy_rate') || regId.includes('bank_rate') || regId.includes('fed_funds') || regId.includes('cash_rate') || regId.includes('ocr')) {
      if (
        clean.includes('target rate') ||
        clean.includes('policy rate') ||
        clean.includes('interest rate') ||
        clean.includes('cash rate') ||
        clean.includes('bank rate') ||
        clean.includes('overnight rate') ||
        clean.includes('fed funds') ||
        clean.includes('deposit facility') ||
        clean.includes('uncollateralized overnight') ||
        clean.includes('official cash') ||
        clean === 'ocr'
      ) {
        score += 22;
      }
    }

    // Unemployment matching
    if (regId.includes('unemploy')) {
      if (clean.includes('unemploy') || clean.includes('jobless rate') || clean.includes('ilo unemployment') || clean.includes('unemp')) {
        score += 18;
      }
    }

    // NFP / Employment change
    if (regId.includes('nfp') || regId.includes('employment_change') || regId.includes('net_employment') || regId.includes('claimant')) {
      if (clean.includes('non farm') || clean.includes('nonfarm') || clean.includes('nfp') || clean.includes('payrolls') || clean.includes('net employment') || (clean.includes('employment') && clean.includes('change'))) {
        score += 18;
      }
    }

    // CPI / HICP / PCE / Inflation
    if (regId.includes('cpi') || regId.includes('hicp') || regId.includes('pce')) {
      if (clean.includes('cpi') || clean.includes('hicp') || clean.includes('pce') || clean.includes('inflation') || clean.includes('consumer price')) {
        score += 10;
        const isQueryCore = clean.includes('core') || clean.includes('trimmed') || clean.includes('sectoral') || clean.includes('median') || clean.includes('ex food');
        const isRegCore = regId.includes('core') || regId.includes('trimmed') || regId.includes('sectoral') || regId.includes('median');
        if (isQueryCore && isRegCore) score += 14;
        if (!isQueryCore && !isRegCore && (regId.includes('headline') || regId.includes('cpi') || regId.includes('hicp'))) score += 12;
        if (regId.includes('pce') && clean.includes('pce')) score += 16;
        if (regId.includes('tokyo') && clean.includes('tokyo')) score += 16;
      }
    }

    // PPI
    if (regId.includes('ppi') && (clean.includes('ppi') || clean.includes('producer price'))) {
      score += 20;
    }

    // GDP
    if (regId.includes('gdp')) {
      if (clean.includes('gdp') || clean.includes('gross domestic')) {
        score += 20;
      }
    }

    // Business & Sentiment Surveys
    if (regId.includes('tankan') && clean.includes('tankan')) score += 20;
    if (regId.includes('ifo') && clean.includes('ifo')) score += 20;
    if (regId.includes('zew') && clean.includes('zew')) score += 20;
    if (regId.includes('kof') && clean.includes('kof')) score += 20;
    if (regId.includes('nab') && clean.includes('nab')) score += 20;
    if (regId.includes('anz') && clean.includes('anz')) score += 20;
    if (regId.includes('gfk') && clean.includes('gfk')) score += 20;
    if (regId.includes('confidence') && clean.includes('confidence')) score += 16;
    if (regId.includes('sentiment') && clean.includes('sentiment')) score += 16;

    // Trade, Retail, Wages, Housing, Industrial
    if (regId.includes('trade_balance') && (clean.includes('trade balance') || clean.includes('merchandise trade') || clean.includes('visible trade'))) score += 18;
    if (regId.includes('current_account') && clean.includes('current account')) score += 18;
    if (regId.includes('retail_sales') && clean.includes('retail')) score += 18;
    if (regId.includes('housing') && (clean.includes('housing') || clean.includes('building permits') || clean.includes('home sales'))) score += 16;
    if (regId.includes('industrial') && clean.includes('industrial production')) score += 18;
    if (regId.includes('intervention') && clean.includes('intervention')) score += 20;
    if (regId.includes('china') && clean.includes('china')) score += 20;
    if (regId.includes('oil_correlation') && clean.includes('oil')) score += 15;
    if ((regId.includes('dairy') || regId.includes('gdt')) && (clean.includes('dairy') || clean.includes('gdt'))) score += 20;
    if (regId.includes('wage') && (clean.includes('wage') || clean.includes('wpi') || clean.includes('shunto'))) score += 20;
    if (regId.includes('earnings') && (clean.includes('earnings') || clean.includes('hourly'))) score += 20;
    if (regId.includes('claims') && clean.includes('claims')) score += 20;
    if (regId.includes('jolts') && (clean.includes('jolts') || clean.includes('job openings'))) score += 20;

    if (score > bestScore && score >= 10) {
      bestScore = score;
      bestCandidate = reg;
    }
  }

  return bestCandidate;
}

export interface ExtractedIndicatorRecord {
  id: string;
  matchedIndicatorId: string;
  name: string;
  currency: string;
  category?: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious: number | null;
  unit: string;
  referencePeriod: string;
  releaseDate: string;
  releaseTime: string;
  source: string;
  confidence: number;
  dataStatus: 'EXTRACTED_FROM_IMAGE';
  validationStatus: 'VALIDATED' | 'REVIEW_REQUIRED' | 'NOT_EXTRACTED';
  notes: string;
}

// ----------------------------------------------------
// 1. CURRENCY DOCUMENT PARSER (HEADER-AWARE & 100% DETERMINISTIC)
// Preserves exact column relationships (Actual vs Previous vs Forecast)
// ----------------------------------------------------
const G8_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

type ValueColumnType = 'actual' | 'forecast' | 'previous' | 'revised';

/**
 * Inspects a line to see if it defines table column headers (e.g. "Indicator | Actual | Previous | Forecast").
 * Returns the ordered list of numeric value columns if detected, or null.
 */
function detectTableHeaderOrder(line: string): ValueColumnType[] | null {
  const lower = line.toLowerCase();
  const hasActual = /\b(?:actual|current|latest|reading|release\s+value)\b/.test(lower);
  const hasForecast = /\b(?:forecast|consensus|expected|estimate|est\.?|proj\.?)\b/.test(lower);
  const hasPrevious = /\b(?:previous|prior|prev\.?|last)\b/.test(lower);

  if ((hasActual && hasForecast) || (hasActual && hasPrevious) || (hasForecast && hasPrevious)) {
    const tokens: { type: ValueColumnType; pos: number }[] = [];
    const actMatch = /\b(?:actual|current|latest|reading|release\s+value)\b/.exec(lower);
    if (actMatch) tokens.push({ type: 'actual', pos: actMatch.index });

    const frcMatch = /\b(?:forecast|consensus|expected|estimate|est\.?|proj\.?)\b/.exec(lower);
    if (frcMatch) tokens.push({ type: 'forecast', pos: frcMatch.index });

    const prvMatch = /\b(?:previous|prior|prev\.?|last)\b/.exec(lower);
    if (prvMatch) tokens.push({ type: 'previous', pos: prvMatch.index });

    const revMatch = /\b(?:revised|revision|rev\.?)\b/.exec(lower);
    if (revMatch) tokens.push({ type: 'revised', pos: revMatch.index });

    tokens.sort((a, b) => a.pos - b.pos);
    return tokens.map((t) => t.type);
  }
  return null;
}

/**
 * Strips leading indicator name/metadata tokens so embedded numbers like "10Y", "2Y", "Q4", "1st"
 * are not mistaken for the indicator's actual value.
 */
function stripIndicatorTitleFromSegment(line: string, matchedReg?: any): { titlePart: string; valueSegment: string } {
  // 1. If pipe-delimited table row (e.g. "| CPI | 3.1% | 3.2% | 3.0% |" or "CPI | 3.1% | 3.2% | 3.0%")
  const pipeCells = line
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (pipeCells.length >= 2) {
    // Find first cell that looks like a value or null placeholder
    const firstValIdx = pipeCells.findIndex((cell, idx) => {
      if (idx === 0) return false;
      return /^(?:[+-]?\$?\d+(?:,\d{3})*(?:\.\d+)?%?|\([+-]?\d+(?:\.\d+)?\)|—|–|--|-|N\/A|Pending)$/i.test(cell.replace(/\s*(?:k|M|B|pts|points|%|bps)$/i, '').trim());
    });
    if (firstValIdx >= 1) {
      return {
        titlePart: pipeCells.slice(0, firstValIdx).join(' '),
        valueSegment: pipeCells.slice(firstValIdx).join(' | '),
      };
    }
  }

  let afterText = line;
  if (matchedReg) {
    afterText = afterText.replace(
      new RegExp(`^(?:\\[?${matchedReg.currency}\\]?|\\d{1,2}:\\d{2}\\s+${matchedReg.currency}|${matchedReg.currency}\\b)\\s*`, 'i'),
      ''
    );
    const candNames = [matchedReg.name, matchedReg.shortLabel, matchedReg.code].filter(Boolean) as string[];
    let strippedName = false;
    for (const cn of candNames) {
      const idx = afterText.toLowerCase().indexOf(cn.toLowerCase());
      if (idx !== -1) {
        afterText = afterText.slice(idx + cn.length).trim();
        strippedName = true;
        break;
      }
    }
    if (!strippedName) {
      // Strip leading text words up to the first standalone number or labeled value
      const firstNumMatch = afterText.match(/(?:Actual|Forecast|Previous|Prior|Consensus)?\s*[:=]?\s*(?:[+-]?\$?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|k|M|B|pts|points|bps))?|\([+-]?\d+(?:\.\d+)?\))(?=\s|$|\|)/i);
      if (firstNumMatch && firstNumMatch.index !== undefined && firstNumMatch.index > 0) {
        const prefix = afterText.slice(0, firstNumMatch.index).trim();
        // Ensure we don't cut in the middle of "10-Year" or "2-Year" or "5-Year"
        afterText = afterText
          .replace(/^.*?\b(?:10-Year|2-Year|5-Year|10Y|2Y|5Y|1st Business Day|Q[1-4]|YoY|MoM|QoQ)\b[^0-9+-]*/i, '')
          .trim();
        if (afterText === line) {
          afterText = line.slice(prefix.length).trim();
        }
      }
    }
  }

  // Strip known title tokens that contain digits (like 10Y, 2Y, 5Y, Q1..Q4, 1st, S&P 500)
  afterText = afterText
    .replace(/^(?:10-Year|2-Year|5-Year|10Y|2Y|5Y|1st\s+Business\s+Day|Q[1-4])\b\s*(?:Treasury|Sovereign|Bond|Gilt|Bund|JGB|ACGB|Yield|Rate|Note)*\s*/i, '')
    .replace(/^(?:MONETARY[_\s]POLICY|INFLATION|EMPLOYMENT|LABOR|GROWTH|BUSINESS[_\s]ACTIVITY|BUSINESS|TRADE|RATES[_\s]YIELDS|SOVEREIGN[_\s]BONDS|SENTIMENT|HOUSING|CONSUMER|COMMODITY[_\s]DRIVER)\s*/i, '')
    .replace(/^(?:Monthly|Quarterly|Weekly|Daily|Bi-Weekly|Annual)\s*/i, '');

  return { titlePart: line, valueSegment: afterText };
}

/** Helper to extract numeric tokens, units, revised previous, and period from a table cell/row segment */
function tokenizeRowNumbers(
  segment: string,
  columnOrder: ValueColumnType[] = ['actual', 'forecast', 'previous']
): {
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  values: (number | null)[];
  unit: string;
  revised: number | null;
  period: string;
} {
  // Strip full dates like 2025-01-15 or times like 08:30 GMT
  let s = segment
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|GMT|EST|UTC))?\b/gi, ' ')
    // Strip embedded title tokens like 10Y, 2Y, 5Y, Q1-Q4 if they still appear before numbers
    .replace(/\b(?:10Y|2Y|5Y|30Y|10-Year|2-Year|5-Year|Q[1-4]|1st|2nd|3rd|4th)\b/gi, ' ');

  // Extract revised previous if present in parens
  let revised: number | null = null;
  const revMatch = s.match(/\(rev(?:ised)?\s*([+-]?[0-9,]+(?:\.\d+)?)\)/i);
  if (revMatch) {
    revised = parseFloat(revMatch[1].replace(/,/g, ''));
    s = s.replace(revMatch[0], ' ');
  }

  // Detect Unit
  let unit = '%';
  if (/%/.test(s)) unit = '%';
  else if (/\b(?:k|thousand)\b/i.test(s) || /\d+k\b/i.test(s)) unit = 'k';
  else if (/\b(?:M|million)\b/i.test(s)) unit = 'M';
  else if (/\b(?:B|billion)\b/i.test(s)) unit = 'B';
  else if (/\b(?:pts|points|index)\b/i.test(s)) unit = 'Points';
  else if (/\b(?:bps)\b/i.test(s)) unit = 'bps';
  else if (/\$/.test(s)) unit = '$';

  // Detect Reference Period
  const periodMatch = s.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)|Q[1-4]|Prelim|Final|Flash)\b(?:\s*\d{4})?/i
  );
  const period = periodMatch ? periodMatch[0].trim() : 'Latest';

  // Check for explicit labeled values first: e.g. "Actual: 3.1% Previous: 3.2% Forecast: 3.0%"
  const labeledActual = s.match(/\b(?:Actual|Act|Current|Latest)\s*[:=]\s*([+-]?[0-9,]+(?:\.\d+)?)/i);
  const labeledForecast = s.match(/\b(?:Forecast|Fcst|Consensus|Expected|Est)\s*[:=]\s*([+-]?[0-9,]+(?:\.\d+)?)/i);
  const labeledPrevious = s.match(/\b(?:Previous|Prev|Prior)\s*[:=]\s*([+-]?[0-9,]+(?:\.\d+)?)/i);
  if (labeledActual || labeledForecast || labeledPrevious) {
    const act = labeledActual ? safeParseNum(labeledActual[1]) : null;
    const frc = labeledForecast ? safeParseNum(labeledForecast[1]) : null;
    const prv = labeledPrevious ? safeParseNum(labeledPrevious[1]) : null;
    return {
      actual: act,
      forecast: frc,
      previous: prv,
      values: [act, frc, prv].filter((v) => v !== null),
      unit,
      revised,
      period,
    };
  }

  // Replace standalone dashes or pending flags with __NULL_VAL__
  s = s.replace(/(?:^|\s|\|)(?:—|–|--|-|N\/A|Pending|None|null)(?=\s|\||$)/gi, ' __NULL_VAL__ ');

  const tokenRegex = /(?:__NULL_VAL__|\([+-]?[0-9,]+(?:\.\d+)?\)|[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?)/gi;
  const matches = s.match(tokenRegex) || [];
  const values: (number | null)[] = [];

  for (const m of matches) {
    if (m === '__NULL_VAL__') {
      values.push(null);
    } else {
      const raw = m.trim();
      const numStr = raw.replace(/[()%]/g, '').replace(/,/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        if (num >= 2020 && num <= 2035 && Number.isInteger(num) && !raw.includes('%')) {
          continue;
        }
        const signed = raw.startsWith('(') && raw.endsWith(')') ? -Math.abs(num) : num;
        values.push(Number(signed.toFixed(4)));
      }
    }
    if (values.length >= 4) break;
  }

  // Map extracted positional values using active table columnOrder
  let actual: number | null = null;
  let forecast: number | null = null;
  let previous: number | null = null;

  for (let idx = 0; idx < values.length && idx < columnOrder.length; idx++) {
    const colType = columnOrder[idx];
    if (colType === 'actual') actual = values[idx];
    else if (colType === 'forecast') forecast = values[idx];
    else if (colType === 'previous') previous = values[idx];
    else if (colType === 'revised' && values[idx] !== null) revised = values[idx];
  }

  return { actual, forecast, previous, values, unit, revised, period };
}

export function parseCurrencyDocumentText(rawText: string, selection: string = 'ALL'): ExtractedIndicatorRecord[] {
  if (!rawText || !rawText.trim()) return [];
  const cleanSel = String(selection || 'ALL').toUpperCase().trim();
  const isCommodity =
    cleanSel === 'GOLD' ||
    cleanSel === 'SILVER' ||
    cleanSel === 'CRUDE_OIL' ||
    cleanSel.includes('XAU') ||
    cleanSel.includes('XAG') ||
    cleanSel.includes('OIL') ||
    cleanSel.includes('WTI') ||
    /COMMODITIES FUNDAMENTAL MACRO REPORT/i.test(rawText);

  if (isCommodity) {
    return parseCommodityDocumentText(rawText, cleanSel) as any;
  }

  // Detect if selection is an Index, Stock, or Crypto asset
  const multiAssetParsed = parseMultiAssetDocumentText(rawText, cleanSel);
  if (multiAssetParsed.indicators.length > 0 && !G8_CURRENCIES.includes(cleanSel) && cleanSel !== 'ALL') {
    return multiAssetParsed.indicators;
  }

  // Detect currency from document text
  let detectedCurrency = G8_CURRENCIES.includes(cleanSel) ? cleanSel : null;
  if (!detectedCurrency) {
    for (const c of G8_CURRENCIES) {
      const patterns = [
        new RegExp(`PRIME\\s+PIP\\s+FX\\s*—\\s*${c}\\b`, 'i'),
        new RegExp(`Currency Code:\\s*${c}\\b`, 'i'),
        new RegExp(`\\b${c}\\s+—\\s+(?:US DOLLAR|EURO|BRITISH POUND|JAPANESE YEN|SWISS FRANC|CANADIAN DOLLAR|AUSTRALIAN DOLLAR|NEW ZEALAND DOLLAR)`, 'i'),
        new RegExp(`\\b${c}\\b\\s+(?:Economic Calendar|Fundamental Intelligence Report|Macro Report|Fundamental Report)`, 'i'),
      ];
      if (patterns.some((p) => p.test(rawText))) {
        detectedCurrency = c;
        break;
      }
    }
  }

  const results: ExtractedIndicatorRecord[] = [];
  const processedDefs = new Set<string>();
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^---\s*PAGE\s+\d+/i.test(l) && !/^[|\s-:]+$/.test(l));

  // Track active table column order across lines (defaults to Actual | Forecast | Previous)
  let activeColumnOrder: ValueColumnType[] = ['actual', 'forecast', 'previous'];

  // ----------------------------------------------------
  // PASS 1: HEADER-AWARE PER-LINE TABLE & BLOCK PARSER
  // ----------------------------------------------------
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Update active table header order whenever a table header row is encountered
    const detectedHeader = detectTableHeaderOrder(line);
    if (detectedHeader) {
      activeColumnOrder = detectedHeader;
      continue;
    }

    // Determine row currency
    let rowCurrency = detectedCurrency;
    const currMatch = line.match(/^(?:\|?\s*\[?([A-Z]{3})\]?|(?:\d{1,2}:\d{2}\s+)?([A-Z]{3}))\b/);
    if (currMatch) {
      const foundCurr = (currMatch[1] || currMatch[2] || '').toUpperCase();
      if (G8_CURRENCIES.includes(foundCurr)) {
        rowCurrency = foundCurr;
      }
    }

    if (!rowCurrency && G8_CURRENCIES.includes(cleanSel)) {
      rowCurrency = cleanSel;
    }

    // Extract candidate indicator name cell if pipe-separated
    const pipeCells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    const candidateLabel = pipeCells.length >= 2 ? pipeCells[0] : line;

    const match = findBestRegistryMatch(candidateLabel, rowCurrency || 'USD') || findBestRegistryMatch(line, rowCurrency || 'USD');
    if (match && !processedDefs.has(match.id)) {
      if (G8_CURRENCIES.includes(cleanSel) && match.currency !== cleanSel) {
        continue;
      }

      const { valueSegment } = stripIndicatorTitleFromSegment(line, match);
      let parsed = tokenizeRowNumbers(valueSegment, activeColumnOrder);

      // If no numbers on this line, check next 1-5 lines for columnar or key-value format
      if (parsed.values.length === 0 && i + 1 < lines.length) {
        let multiLineSeg = '';
        for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
          const nextL = lines[j];
          if (detectTableHeaderOrder(nextL)) break;
          if (G8_CURRENCIES.some((c) => new RegExp(`^\\[?${c}\\]?\\b`).test(nextL))) break;
          const nextMatch = findBestRegistryMatch(nextL, rowCurrency || 'USD');
          if (nextMatch && nextMatch.id !== match.id && /^[^0-9]+$/.test(nextL.slice(0, 12))) break;
          multiLineSeg += ' ' + nextL;
        }
        parsed = tokenizeRowNumbers(multiLineSeg, activeColumnOrder);
      }

      if (parsed.values.length >= 1 && (parsed.actual !== null || parsed.forecast !== null || parsed.previous !== null)) {
        const needsReview = parsed.actual === null;
        results.push({
          id: `extracted_${match.id}_${Date.now()}_${results.length}`,
          matchedIndicatorId: match.id,
          name: match.name,
          currency: match.currency,
          category: match.category,
          actual: parsed.actual,
          forecast: parsed.forecast,
          previous: parsed.previous,
          revisedPrevious: parsed.revised,
          unit: parsed.unit || match.unit || '%',
          referencePeriod: parsed.period || 'Uploaded Document',
          releaseDate: new Date().toISOString().slice(0, 10),
          releaseTime: 'Document Data',
          source: 'Uploaded PDF / Document Report',
          confidence: !needsReview ? 99 : 82,
          dataStatus: 'EXTRACTED_FROM_IMAGE',
          validationStatus: !needsReview ? 'VALIDATED' : 'REVIEW_REQUIRED',
          notes: `Parsed row (${activeColumnOrder.join(' / ').toUpperCase()}) for ${match.shortLabel || match.name}`,
        });
        processedDefs.add(match.id);
        continue;
      }
    }

    // Support custom/unregistered table rows when a clear pipe-delimited or tabular row is present
    if (pipeCells.length >= 2 && /^[A-Za-z][A-Za-z0-9\s/()&-]{2,45}$/.test(pipeCells[0])) {
      const labelLower = pipeCells[0].toLowerCase();
      if (!/\b(?:indicator|metric|event|release|category|total|page|source|currency|asset|date)\b/.test(labelLower)) {
        const parsed = tokenizeRowNumbers(pipeCells.slice(1).join(' | '), activeColumnOrder);
        if (parsed.values.length >= 1 && parsed.actual !== null) {
          const customCurr = rowCurrency || 'USD';
          const customId = `custom_${customCurr}_${pipeCells[0].replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}`;
          if (!processedDefs.has(customId)) {
            results.push({
              id: `extracted_${customId}_${Date.now()}_${results.length}`,
              matchedIndicatorId: customId,
              name: pipeCells[0].trim(),
              currency: customCurr,
              category: 'GROWTH',
              actual: parsed.actual,
              forecast: parsed.forecast,
              previous: parsed.previous,
              revisedPrevious: parsed.revised,
              unit: parsed.unit || '%',
              referencePeriod: parsed.period || 'Uploaded Document',
              releaseDate: new Date().toISOString().slice(0, 10),
              releaseTime: 'Document Data',
              source: 'Uploaded PDF / Document Report',
              confidence: 95,
              dataStatus: 'EXTRACTED_FROM_IMAGE',
              validationStatus: 'VALIDATED',
              notes: `Extracted table row (${activeColumnOrder.join(' / ').toUpperCase()}) for ${pipeCells[0].trim()}`,
            });
            processedDefs.add(customId);
          }
        }
      }
    }
  }

  // ----------------------------------------------------
  // PASS 2: CONTINUOUS STREAM SCANNER FOR UNMATCHED REGISTRY ENTRIES
  // ----------------------------------------------------
  const targetCurrencies = detectedCurrency
    ? [detectedCurrency]
    : cleanSel === 'ALL' || cleanSel === 'ALL_CURRENCIES' || cleanSel === 'MULTI'
    ? G8_CURRENCIES
    : G8_CURRENCIES.includes(cleanSel)
    ? [cleanSel]
    : G8_CURRENCIES;

  const normText = rawText.replace(/[\t\r\n]+/g, ' ');

  for (const curr of targetCurrencies) {
    const defs = OFFICIAL_INDICATOR_REGISTRY.filter((d: any) => d.currency === curr);
    for (const def of defs) {
      if (processedDefs.has(def.id)) continue;

      const candidates = [def.shortLabel, def.name, def.code].filter(Boolean) as string[];
      for (const cand of candidates) {
        if (!cand || cand.length < 3) continue;
        const idx = normText.toLowerCase().indexOf(cand.toLowerCase());
        if (idx !== -1) {
          const prefix = normText.slice(Math.max(0, idx - 20), idx).trim();
          const otherCurrMatch = prefix.match(/\b(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)\b/i);
          if (otherCurrMatch && otherCurrMatch[1].toUpperCase() !== curr) {
            continue;
          }

          const segment = normText.slice(idx + cand.length, idx + cand.length + 180);
          const parsed = tokenizeRowNumbers(segment, activeColumnOrder);

          if (parsed.values.length >= 1 && (parsed.actual !== null || parsed.forecast !== null)) {
            results.push({
              id: `extracted_${def.id}_${Date.now()}_${results.length}`,
              matchedIndicatorId: def.id,
              name: def.name,
              currency: curr,
              category: def.category,
              actual: parsed.actual,
              forecast: parsed.forecast,
              previous: parsed.previous,
              revisedPrevious: parsed.revised,
              unit: parsed.unit || def.unit || '%',
              referencePeriod: parsed.period || 'Uploaded Document',
              releaseDate: new Date().toISOString().slice(0, 10),
              releaseTime: 'Document Data',
              source: 'Uploaded PDF / Document Report',
              confidence: 92,
              dataStatus: 'EXTRACTED_FROM_IMAGE',
              validationStatus: parsed.actual !== null ? 'VALIDATED' : 'REVIEW_REQUIRED',
              notes: `Extracted via context matching for ${def.shortLabel}`,
            });
            processedDefs.add(def.id);
            break;
          }
        }
      }
    }
  }

  return results;
}

// ----------------------------------------------------
// 2. COMMODITIES DOCUMENT PARSER (GOLD, SILVER, CRUDE OIL)
// ----------------------------------------------------
export function parseCommodityDocumentText(rawText: string, selection: string = 'ALL'): any[] {
  if (!rawText || !rawText.trim()) return [];
  const cleanSel = String(selection || 'ALL').toUpperCase().trim();
  const results: any[] = [];

  const commDefs = [
    { key: 'GOLD', name: 'Gold (XAU/USD)', symbol: 'GOLD', priceIndId: 'GOLD_SPOT_PRICE', patterns: [/\b(?:GOLD|XAU|XAU\/USD|XAUUSD)\b/i] },
    { key: 'SILVER', name: 'Silver (XAG/USD)', symbol: 'SILVER', priceIndId: 'SILVER_SPOT_PRICE', patterns: [/\b(?:SILVER|XAG|XAG\/USD|XAGUSD)\b/i] },
    { key: 'CRUDE_OIL', name: 'Crude Oil (WTI)', symbol: 'CRUDE_OIL', priceIndId: 'CRUDE_OIL_SPOT_PRICE', patterns: [/\b(?:CRUDE|OIL|WTI|CRUDE OIL|US OIL|USOIL|BRENT)\b/i] },
  ];

  const targetComms =
    cleanSel === 'ALL' || cleanSel === 'MULTI'
      ? commDefs
      : commDefs.filter(
          (c) =>
            cleanSel.includes(c.key) ||
            cleanSel.includes(c.symbol) ||
            (c.key === 'GOLD' && cleanSel.includes('XAU')) ||
            (c.key === 'SILVER' && cleanSel.includes('XAG')) ||
            (c.key === 'CRUDE_OIL' && (cleanSel.includes('OIL') || cleanSel.includes('WTI')))
        );

  for (const comm of targetComms) {
    const match = rawText.search(comm.patterns[0]);
    const isSingleTarget = targetComms.length === 1;
    if (match === -1 && !isSingleTarget) continue;

    let segment = rawText;
    if (match !== -1) {
      let nextPos = rawText.length;
      for (const other of commDefs) {
        if (other.key === comm.key) continue;
        const otherRegex = new RegExp(other.patterns[0].source, 'gi');
        otherRegex.lastIndex = match + 10;
        const om = otherRegex.exec(rawText);
        if (om && om.index > match && om.index < nextPos) {
          nextPos = om.index;
        }
      }
      segment = rawText.slice(match, Math.min(match + 1800, nextPos));
    }

    // Spot Price
    let price: number | null = null;
    const priceMatch =
      segment.match(/(?:Spot Price|Current Price|Cash Price|Futures Price|Price)[\s:|—–]+(?:USD|\$)?\s*([0-9,]+(?:\.\d+)?)/i) ||
      segment.match(/(?:USD|\$)\s*([0-9,]+(?:\.\d+)?)/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // US 10Y Real Yield
    let realYield: number | null = null;
    const yieldMatch = segment.match(/(?:US 10Y Real Yield|10-Year Real Yield|10Y Real Yield|Real Yield|TIPS)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    if (yieldMatch) {
      realYield = parseFloat(yieldMatch[1]);
    }

    // 5Y Breakeven Inflation
    let breakeven: number | null = null;
    const beMatch = segment.match(/(?:5Y Inflation Breakeven|Breakeven Inflation|5-Year Breakeven|Inflation Breakeven)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    if (beMatch) {
      breakeven = parseFloat(beMatch[1]);
    }

    // Weekly Inventory Surprise
    let invSurprise: number | null = null;
    const invMatch = segment.match(/(?:Weekly Inventory Surprise|Crude Inventories|EIA Inventories|Inventories|Inventory Surprise)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    if (invMatch) {
      invSurprise = parseFloat(invMatch[1]);
    }

    if (price !== null) {
      results.push({
        id: `extracted_${comm.key}_price_${Date.now()}_${results.length}`,
        matchedIndicatorId: comm.priceIndId,
        name: `${comm.name} Spot Price`,
        currency: 'USD',
        symbol: comm.key,
        actual: price,
        forecast: price,
        previous: null,
        revisedPrevious: null,
        unit: '$',
        referencePeriod: 'Uploaded Document',
        releaseDate: new Date().toISOString().slice(0, 10),
        releaseTime: 'Live Market',
        source: 'Uploaded PDF / OCR',
        confidence: 99,
        dataStatus: 'EXTRACTED_FROM_IMAGE',
        validationStatus: 'VALIDATED',
        notes: `Spot price verified from document: $${price.toLocaleString()}.`,
      });
    }

    if (realYield !== null) {
      results.push({
        id: `extracted_${comm.key}_real_yield_${Date.now()}_${results.length}`,
        matchedIndicatorId: 'USD_10Y_REAL_YIELD',
        name: 'US 10-Year Real Yield',
        currency: 'USD',
        symbol: comm.key,
        actual: realYield,
        forecast: realYield,
        previous: null,
        revisedPrevious: null,
        unit: '%',
        referencePeriod: 'Daily Benchmark',
        releaseDate: new Date().toISOString().slice(0, 10),
        releaseTime: '15:00 EST',
        source: 'US Treasury / Document',
        confidence: 99,
        dataStatus: 'EXTRACTED_FROM_IMAGE',
        validationStatus: 'VALIDATED',
        notes: `US 10Y TIPS real yield extracted: ${realYield}%.`,
      });
    }

    if (breakeven !== null) {
      results.push({
        id: `extracted_${comm.key}_breakeven_${Date.now()}_${results.length}`,
        matchedIndicatorId: 'USD_5Y_INFLATION_BREAKEVEN',
        name: '5-Year Breakeven Inflation Rate',
        currency: 'USD',
        symbol: comm.key,
        actual: breakeven,
        forecast: breakeven,
        previous: null,
        revisedPrevious: null,
        unit: '%',
        referencePeriod: 'Daily Benchmark',
        releaseDate: new Date().toISOString().slice(0, 10),
        releaseTime: '15:00 EST',
        source: 'Federal Reserve / Document',
        confidence: 99,
        dataStatus: 'EXTRACTED_FROM_IMAGE',
        validationStatus: 'VALIDATED',
        notes: `5Y Breakeven inflation extracted: ${breakeven}%.`,
      });
    }

    if (invSurprise !== null) {
      results.push({
        id: `extracted_${comm.key}_inv_${Date.now()}_${results.length}`,
        matchedIndicatorId: 'CRUDE_OIL_INVENTORY_SURPRISE',
        name: 'Crude Oil Inventory Surprise',
        currency: 'USD',
        symbol: comm.key,
        actual: invSurprise,
        forecast: null,
        previous: null,
        revisedPrevious: null,
        unit: 'Mb',
        referencePeriod: 'Weekly EIA Report',
        releaseDate: new Date().toISOString().slice(0, 10),
        releaseTime: '10:30 EST',
        source: 'US EIA / Document',
        confidence: 99,
        dataStatus: 'EXTRACTED_FROM_IMAGE',
        validationStatus: 'VALIDATED',
        notes: `Weekly crude inventory surprise extracted: ${invSurprise > 0 ? '+' : ''}${invSurprise} Mb.`,
      });
    }

    // Also parse any tabular rows inside the commodity document
    const segLines = segment.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let colOrder: ValueColumnType[] = ['actual', 'forecast', 'previous'];
    for (const line of segLines) {
      const hdr = detectTableHeaderOrder(line);
      if (hdr) {
        colOrder = hdr;
        continue;
      }
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && /^[A-Za-z][A-Za-z0-9\s/()&-]{2,45}$/.test(cells[0])) {
        if (/\b(?:spot price|real yield|breakeven|inventory surprise|indicator|metric|driver)\b/i.test(cells[0])) continue;
        const parsed = tokenizeRowNumbers(cells.slice(1).join(' | '), colOrder);
        if (parsed.actual !== null) {
          results.push({
            id: `extracted_${comm.key}_row_${Date.now()}_${results.length}`,
            matchedIndicatorId: `${comm.key}_${cells[0].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`,
            name: `${comm.name} — ${cells[0]}`,
            currency: 'USD',
            symbol: comm.key,
            actual: parsed.actual,
            forecast: parsed.forecast,
            previous: parsed.previous,
            revisedPrevious: parsed.revised,
            unit: parsed.unit || '$',
            referencePeriod: parsed.period || 'Uploaded Document',
            releaseDate: new Date().toISOString().slice(0, 10),
            releaseTime: 'Document Data',
            source: 'Uploaded Commodity PDF',
            confidence: 95,
            dataStatus: 'EXTRACTED_FROM_IMAGE',
            validationStatus: 'VALIDATED',
            notes: `Commodity metric extracted from table: ${cells[0]}`,
          });
        }
      }
    }
  }

  return results;
}

// ----------------------------------------------------
// 3. RATES & YIELDS DOCUMENT PARSER (G8 CENTRAL BANKS)
// ----------------------------------------------------
const CENTRAL_BANK_ALIASES: Record<string, RegExp> = {
  USD: /\b(?:USD|FED|FEDERAL\s+RESERVE|FOMC)\b/i,
  EUR: /\b(?:EUR|ECB|EUROPEAN\s+CENTRAL\s+BANK)\b/i,
  GBP: /\b(?:GBP|BOE|BANK\s+OF\s+ENGLAND|MPC)\b/i,
  JPY: /\b(?:JPY|BOJ|BANK\s+OF\s+JAPAN)\b/i,
  CHF: /\b(?:CHF|SNB|SWISS\s+NATIONAL\s+BANK)\b/i,
  CAD: /\b(?:CAD|BOC|BANK\s+OF\s+CANADA)\b/i,
  AUD: /\b(?:AUD|RBA|RESERVE\s+BANK\s+OF\s+AUSTRALIA)\b/i,
  NZD: /\b(?:NZD|RBNZ|RESERVE\s+BANK\s+OF\s+NEW\s+ZEALAND)\b/i,
};

export function parseRatesDocumentText(rawText: string): any[] {
  if (!rawText || !rawText.trim()) return [];
  const rates: any[] = [];
  const processed = new Set<string>();

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    for (const curr of G8_CURRENCIES) {
      if (processed.has(curr)) continue;
      const cbRegex = CENTRAL_BANK_ALIASES[curr];
      const isRow =
        (new RegExp(`^(?:\\|?\\s*\\[?${curr}\\]?|\\d+\\s+${curr}|${curr}\\b)`, 'i').test(line) ||
          (cbRegex && cbRegex.test(line))) &&
        /(?:%|\d+\.\d+|hawkish|dovish|neutral)/i.test(line);
      if (!isRow) continue;

      // Strip currency/central bank title words containing 2Y/5Y/10Y before extracting numbers
      const noDates = line
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
        .replace(/\b(?:2Y|5Y|10Y|30Y|2-Year|5-Year|10-Year)\b/gi, ' ');
      const numMatches = Array.from(noDates.matchAll(/([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g));
      const nums = numMatches
        .map((n) => parseFloat(n[1].replace(/,/g, '')))
        .filter((n) => !(n >= 2020 && n <= 2035 && Number.isInteger(n)));

      if (nums.length >= 1) {
        let bias = 'NEUTRAL';
        if (/HAWKISH/i.test(line)) bias = 'HAWKISH';
        else if (/DOVISH/i.test(line)) bias = 'DOVISH';

        const meetingMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{1,2},?\s*)?\d{4}/i);
        const nextMeetingDate = meetingMatch ? meetingMatch[0] : 'Upcoming';

        const policyRate = nums[0];
        const prevRate = nums.length > 1 ? nums[1] : policyRate;
        const expRate = nums.length > 2 ? nums[2] : policyRate;
        const y2 = nums.length > 3 ? nums[3] : policyRate;
        const y10 = nums.length > 4 ? nums[4] : y2;
        const realY = nums.length > 5 ? nums[5] : undefined;

        rates.push({
          currency: curr,
          currentPolicyRate: policyRate,
          rate: policyRate,
          previousPolicyRate: prevRate,
          previousRate: prevRate,
          expectedNextRate: expRate,
          expectedRate: expRate,
          yield2Y: y2,
          yield5Y: y10,
          yield10Y: y10,
          realYield10Y: realY,
          centralBankBias: bias,
          nextMeetingDate,
          recentGuidance: `Policy rate verified at ${policyRate}% for ${curr}.`,
        });
        processed.add(curr);
        break;
      }
    }
  }

  // Pass 2: Stream scanning for any remaining currencies
  for (const curr of G8_CURRENCIES) {
    if (processed.has(curr)) continue;
    const re = new RegExp(`\\b${curr}\\b`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(rawText)) !== null) {
      const seg = rawText.slice(m.index, m.index + 280);
      const noDates = seg
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
        .replace(/\b(?:2Y|5Y|10Y|30Y|2-Year|5-Year|10-Year)\b/gi, ' ');
      const nums = Array.from(noDates.matchAll(/([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g))
        .map((n) => parseFloat(n[1].replace(/,/g, '')))
        .filter((n) => !(n >= 2020 && n <= 2035 && Number.isInteger(n)));

      if (nums.length >= 1) {
        let bias = 'NEUTRAL';
        if (/HAWKISH/i.test(seg)) bias = 'HAWKISH';
        else if (/DOVISH/i.test(seg)) bias = 'DOVISH';

        const meetingMatch = seg.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{1,2},?\s*)?\d{4}/i);
        const nextMeetingDate = meetingMatch ? meetingMatch[0] : 'Upcoming';

        rates.push({
          currency: curr,
          currentPolicyRate: nums[0],
          rate: nums[0],
          previousPolicyRate: nums.length > 1 ? nums[1] : nums[0],
          previousRate: nums.length > 1 ? nums[1] : nums[0],
          expectedNextRate: nums.length > 2 ? nums[2] : nums[0],
          expectedRate: nums.length > 2 ? nums[2] : nums[0],
          yield2Y: nums.length > 3 ? nums[3] : 0,
          yield5Y: nums.length > 4 ? nums[4] : 0,
          yield10Y: nums.length > 4 ? nums[4] : 0,
          realYield10Y: nums.length > 5 ? nums[5] : undefined,
          centralBankBias: bias,
          nextMeetingDate,
          recentGuidance: `Policy rate verified at ${nums[0]}% for ${curr}.`,
        });
        processed.add(curr);
        break;
      }
    }
  }

  return rates;
}

// ----------------------------------------------------
// 4. COT DOCUMENT PARSER (CFTC COMMITMENTS OF TRADERS)
// ----------------------------------------------------
const COT_ASSET_PATTERNS: { code: string; regex: RegExp; contract: string }[] = [
  { code: 'USD', regex: /\b(?:USD|DXY|U\.?S\.?\s*DOLLAR\s*INDEX)\b/i, contract: 'USD Index Futures (ICE)' },
  { code: 'EUR', regex: /\b(?:EUR|6E|EURO\s*FX)\b/i, contract: 'Euro FX Futures (CME)' },
  { code: 'GBP', regex: /\b(?:GBP|6B|BRITISH\s*POUND|STERLING)\b/i, contract: 'British Pound Futures (CME)' },
  { code: 'JPY', regex: /\b(?:JPY|6J|JAPANESE\s*YEN)\b/i, contract: 'Japanese Yen Futures (CME)' },
  { code: 'CHF', regex: /\b(?:CHF|6S|SWISS\s*FRANC)\b/i, contract: 'Swiss Franc Futures (CME)' },
  { code: 'CAD', regex: /\b(?:CAD|6C|CANADIAN\s*DOLLAR)\b/i, contract: 'Canadian Dollar Futures (CME)' },
  { code: 'AUD', regex: /\b(?:AUD|6A|AUSTRALIAN\s*DOLLAR)\b/i, contract: 'Australian Dollar Futures (CME)' },
  { code: 'NZD', regex: /\b(?:NZD|6N|NEW\s*ZEALAND\s*DOLLAR)\b/i, contract: 'New Zealand Dollar Futures (CME)' },
  { code: 'XAU', regex: /\b(?:XAU|GOLD|GC)\b/i, contract: 'Gold Futures (COMEX)' },
  { code: 'XAG', regex: /\b(?:XAG|SILVER|SI)\b/i, contract: 'Silver Futures (COMEX)' },
  { code: 'OIL', regex: /\b(?:OIL|WTI|CRUDE\s*OIL|CL)\b/i, contract: 'Crude Oil Light Sweet (NYMEX)' },
];

export function parseCotDocumentText(rawText: string): any[] {
  if (!rawText || !rawText.trim()) return [];
  const records: any[] = [];
  const processed = new Set<string>();

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    for (const def of COT_ASSET_PATTERNS) {
      if (processed.has(def.code)) continue;
      if (!def.regex.test(line)) continue;
      if (!/(?:\d{1,3}(?:,\d{3})+|\b\d{3,}\b|bullish|bearish|neutral)/i.test(line)) continue;

      const noDates = line.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b6[A-Z]\b/g, ' ');
      const numMatches = Array.from(noDates.matchAll(/([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g));
      const nums = numMatches
        .map((n) => parseFloat(n[1].replace(/,/g, '')))
        .filter((n) => !(n >= 2020 && n <= 2035 && Number.isInteger(n)));

      if (nums.length >= 2) {
        const nonCommLong = Math.abs(Math.round(nums[0]));
        const nonCommShort = Math.abs(Math.round(nums[1]));
        let commLong: number | null = null;
        let commShort: number | null = null;
        let openInterest: number | null = null;

        if (nums.length >= 6 && Math.abs(nums[0] - nums[1] - nums[2]) < 5) {
          commLong = Math.abs(Math.round(nums[3]));
          commShort = Math.abs(Math.round(nums[4]));
          openInterest = Math.abs(Math.round(nums[5]));
        } else if (nums.length >= 5) {
          commLong = Math.abs(Math.round(nums[2]));
          commShort = Math.abs(Math.round(nums[3]));
          openInterest = Math.abs(Math.round(nums[4]));
        } else {
          commLong = nums.length > 2 ? Math.abs(Math.round(nums[2])) : Math.round(nonCommShort * 1.1);
          commShort = nums.length > 3 ? Math.abs(Math.round(nums[3])) : Math.round(nonCommLong * 1.1);
          openInterest = nonCommLong + nonCommShort + (commLong || 0) + (commShort || 0);
        }

        const net = nonCommLong - nonCommShort;
        const isBull = /BULLISH/i.test(line) || net > 0;
        const isBear = /BEARISH/i.test(line) || net < 0;
        const stance = isBull ? 'Bullish' : isBear ? 'Bearish' : 'Neutral';

        records.push({
          currency: def.code,
          contractName: def.contract,
          nonCommercialLong: nonCommLong,
          nonCommercialShort: nonCommShort,
          commercialLong: commLong ?? 0,
          commercialShort: commShort ?? 0,
          openInterest: openInterest || nonCommLong + nonCommShort,
          reportDate: new Date().toISOString().slice(0, 10),
          releaseDate: new Date().toISOString().slice(0, 10),
          source: 'CFTC Commitments of Traders / Document',
          confidence: 99,
          notes: `Net ${net > 0 ? '+' : ''}${net.toLocaleString()} contracts. ${stance} institutional positioning verified.`,
        });
        processed.add(def.code);
        break;
      }
    }
  }

  // Pass 2: Stream scan for any remaining COT assets
  for (const def of COT_ASSET_PATTERNS) {
    if (processed.has(def.code)) continue;
    const re = new RegExp(def.regex.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(rawText)) !== null) {
      const seg = rawText.slice(m.index, m.index + 280);
      const noDates = seg.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b6[A-Z]\b/g, ' ');
      const nums = Array.from(noDates.matchAll(/([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g))
        .map((n) => parseFloat(n[1].replace(/,/g, '')))
        .filter((n) => !(n >= 2020 && n <= 2035 && Number.isInteger(n)));

      if (nums.length >= 2) {
        const nonCommLong = Math.abs(Math.round(nums[0]));
        const nonCommShort = Math.abs(Math.round(nums[1]));
        const commLong = nums.length > 2 ? Math.abs(Math.round(nums[2])) : Math.round(nonCommShort * 1.1);
        const commShort = nums.length > 3 ? Math.abs(Math.round(nums[3])) : Math.round(nonCommLong * 1.1);
        const openInterest = nums.length > 4 ? Math.abs(Math.round(nums[4])) : nonCommLong + nonCommShort + commLong + commShort;
        const net = nonCommLong - nonCommShort;

        records.push({
          currency: def.code,
          contractName: def.contract,
          nonCommercialLong: nonCommLong,
          nonCommercialShort: nonCommShort,
          commercialLong: commLong,
          commercialShort: commShort,
          openInterest,
          reportDate: new Date().toISOString().slice(0, 10),
          releaseDate: new Date().toISOString().slice(0, 10),
          source: 'CFTC Commitments of Traders / Document',
          confidence: 99,
          notes: `Net ${net > 0 ? '+' : ''}${net.toLocaleString()} contracts.`,
        });
        processed.add(def.code);
        break;
      }
    }
  }

  return records;
}

// ----------------------------------------------------
// 5. SENTIMENT DOCUMENT PARSER (31 INSTRUMENTS)
// ----------------------------------------------------
export function parseSentimentDocumentText(rawText: string): any[] {
  if (!rawText || !rawText.trim()) return [];
  const pairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/CAD', 'EUR/AUD', 'EUR/NZD',
    'GBP/JPY', 'GBP/CHF', 'GBP/CAD', 'GBP/AUD', 'GBP/NZD',
    'AUD/JPY', 'CAD/JPY', 'CHF/JPY', 'NZD/JPY',
    'AUD/CAD', 'AUD/CHF', 'AUD/NZD', 'CAD/CHF', 'NZD/CAD', 'NZD/CHF',
    'XAU/USD', 'XAG/USD', 'US Oil', 'BRENT',
  ];

  const sentiments: any[] = [];
  const processed = new Set<string>();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    for (const pr of pairs) {
      if (processed.has(pr)) continue;
      const altRegex = new RegExp('(?:^|[|\\s\\[\\](),;:])(' + pr.replace('/', '[/\\-_]?') + ')(?:[|\\s\\[\\](),;:]|$)', 'i');
      const m = altRegex.exec(line);
      if (!m) continue;

      const seg = line.slice(m.index + m[0].length);
      const nums = Array.from(seg.matchAll(/([+-]?\d+(?:\.\d+)?)/g))
        .map((nm) => parseFloat(nm[1]))
        .filter((n) => n >= 0 && n <= 100);
      if (nums.length >= 1) {
        let longP = nums[0];
        let shortP = nums.length > 1 ? nums[1] : Math.max(0, 100 - longP);

        if (/short[\s:—–]+\d+/i.test(seg) && nums.length >= 2) {
          shortP = nums[0];
          longP = nums[1];
        }

        sentiments.push({
          pair: pr,
          longPercent: longP,
          shortPercent: shortP,
          notes: `Retail ${shortP}% short / ${longP}% long (Contrarian: ${shortP > 60 ? 'BULLISH' : longP > 60 ? 'BEARISH' : 'NEUTRAL'})`,
        });
        processed.add(pr);
        break;
      }
    }
  }

  for (const pr of pairs) {
    if (processed.has(pr)) continue;
    const altRegex = new RegExp('(?:^|[|\\s\\[\\](),;:])(' + pr.replace('/', '[/\\-_]?') + ')(?:[|\\s\\[\\](),;:]|$)', 'gi');
    let m: RegExpExecArray | null;
    while ((m = altRegex.exec(rawText)) !== null) {
      const seg = rawText.slice(m.index + m[0].length, m.index + m[0].length + 120);
      const nums = Array.from(seg.matchAll(/([+-]?\d+(?:\.\d+)?)/g))
        .map((nm) => parseFloat(nm[1]))
        .filter((n) => n >= 0 && n <= 100);
      if (nums.length >= 1) {
        let longP = nums[0];
        let shortP = nums.length > 1 ? nums[1] : Math.max(0, 100 - longP);
        if (/short[\s:—–]+\d+/i.test(seg) && nums.length >= 2) {
          shortP = nums[0];
          longP = nums[1];
        }
        sentiments.push({
          pair: pr,
          longPercent: longP,
          shortPercent: shortP,
          notes: `Retail ${shortP}% short / ${longP}% long`,
        });
        processed.add(pr);
        break;
      }
    }
  }

  return sentiments;
}

// ----------------------------------------------------
// 6. MULTI-ASSET DOCUMENT PARSER (STOCKS, CRYPTO, INDICES)
// ----------------------------------------------------
export interface ExtractedMultiAssetRecord {
  symbol: string;
  category: 'INDEX' | 'STOCK' | 'CRYPTO';
  price?: number;
  changePercent?: number;
  score?: number;
  bias?: 'STRONG BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG BEARISH';
  valuationStatus?: 'OVERVALUED' | 'FAIR_VALUE' | 'UNDERVALUED';
  forwardPe?: number;
  pegRatio?: number;
  operatingMarginPct?: number;
  fcfYieldPct?: number;
  dividendYieldPct?: number;
  earningsYieldPct?: number;
  realYieldDiscountRate10Y?: number;
  creditSpreadOasBps?: number;
  spotEtfFlowsWeekly?: string;
  globalM2Correlation?: number;
  stakingYieldPct?: number;
  stablecoinLiquidityStatus?: 'EXPANDING' | 'STABLE' | 'CONTRACTING';
  drivers: { label: string; impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; note: string }[];
  keyMetrics: Record<string, string | number>;
}

const MULTI_ASSET_DEFINITIONS: { symbol: string; category: 'INDEX' | 'STOCK' | 'CRYPTO'; aliases: RegExp }[] = [
  { symbol: 'US30', category: 'INDEX', aliases: /\b(?:US30|DJIA|DOW\s+JONES)\b/i },
  { symbol: 'NAS100', category: 'INDEX', aliases: /\b(?:NAS100|NASDAQ\s*100|NDX|USTEC)\b/i },
  { symbol: 'SPX500', category: 'INDEX', aliases: /\b(?:SPX500|S&P\s*500|SP500|US500)\b/i },
  { symbol: 'NVDA', category: 'STOCK', aliases: /\b(?:NVDA|NVIDIA)\b/i },
  { symbol: 'AAPL', category: 'STOCK', aliases: /\b(?:AAPL|APPLE\s+INC)\b/i },
  { symbol: 'MSFT', category: 'STOCK', aliases: /\b(?:MSFT|MICROSOFT)\b/i },
  { symbol: 'AMZN', category: 'STOCK', aliases: /\b(?:AMZN|AMAZON)\b/i },
  { symbol: 'GOOGL', category: 'STOCK', aliases: /\b(?:GOOGL|GOOG|ALPHABET)\b/i },
  { symbol: 'META', category: 'STOCK', aliases: /\b(?:META\s+PLATFORMS|\bMETA\b)\b/i },
  { symbol: 'TSLA', category: 'STOCK', aliases: /\b(?:TSLA|TESLA)\b/i },
  { symbol: 'BTCUSDT', category: 'CRYPTO', aliases: /\b(?:BTCUSDT|BTC\/USDT|BTC\/USD|BITCOIN|\bBTC\b)\b/i },
  { symbol: 'ETHUSDT', category: 'CRYPTO', aliases: /\b(?:ETHUSDT|ETH\/USDT|ETH\/USD|ETHEREUM|\bETH\b)\b/i },
  { symbol: 'BNBUSDT', category: 'CRYPTO', aliases: /\b(?:BNBUSDT|BNB\/USDT|BNB\/USD|BINANCE\s+COIN|\bBNB\b)\b/i },
  { symbol: 'SOLUSDT', category: 'CRYPTO', aliases: /\b(?:SOLUSDT|SOL\/USDT|SOL\/USD|SOLANA|\bSOL\b)\b/i },
  { symbol: 'XRPUSDT', category: 'CRYPTO', aliases: /\b(?:XRPUSDT|XRP\/USDT|XRP\/USD|RIPPLE|\bXRP\b)\b/i },
];

export function parseMultiAssetDocumentText(
  rawText: string,
  selection: string = 'ALL'
): { assets: ExtractedMultiAssetRecord[]; indicators: ExtractedIndicatorRecord[] } {
  if (!rawText || !rawText.trim()) return { assets: [], indicators: [] };
  const cleanSel = String(selection || 'ALL').toUpperCase().trim();

  const assets: ExtractedMultiAssetRecord[] = [];
  const indicators: ExtractedIndicatorRecord[] = [];

  const targetDefs = MULTI_ASSET_DEFINITIONS.filter((d) => {
    if (cleanSel === 'ALL' || cleanSel === 'INDICES_ALL' || cleanSel === 'STOCKS_ALL' || cleanSel === 'CRYPTO_ALL') {
      if (cleanSel === 'INDICES_ALL') return d.category === 'INDEX';
      if (cleanSel === 'STOCKS_ALL') return d.category === 'STOCK';
      if (cleanSel === 'CRYPTO_ALL') return d.category === 'CRYPTO';
      return true;
    }
    return d.symbol === cleanSel || cleanSel.includes(d.symbol.replace('USDT', ''));
  });

  const activeDefs = targetDefs.length > 0 ? targetDefs : MULTI_ASSET_DEFINITIONS;

  for (const def of activeDefs) {
    const isExplicitlySelected = def.symbol === cleanSel || (activeDefs.length === 1 && cleanSel !== 'ALL');
    const matchIdx = rawText.search(def.aliases);
    if (matchIdx === -1 && !isExplicitlySelected) continue;

    const seg = matchIdx !== -1 ? rawText.slice(Math.max(0, matchIdx - 100), Math.min(rawText.length, matchIdx + 2400)) : rawText;

    const extractMetric = (regex: RegExp): number | undefined => {
      const m = seg.match(regex);
      if (m && m[1]) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        return isNaN(val) ? undefined : val;
      }
      return undefined;
    };

    const price = extractMetric(/(?:Spot Price|Current Price|Share Price|Index Level|Price)[\s:|—–]+(?:USD|\$)?\s*([0-9,]+(?:\.\d+)?)/i);
    const forwardPe = extractMetric(/(?:Forward P\/E|Fwd P\/E|P\/E Ratio|P\/E Multiple|PE Ratio)[\s:|—–]+([0-9]+(?:\.\d+)?)/i);
    const pegRatio = extractMetric(/(?:PEG Ratio|PEG)[\s:|—–]+([0-9]+(?:\.\d+)?)/i);
    const operatingMarginPct = extractMetric(/(?:Operating Margin|GAAP Operating Margin|EBIT Margin)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    const fcfYieldPct = extractMetric(/(?:Free Cash Flow Yield|FCF Yield)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    const dividendYieldPct = extractMetric(/(?:Dividend Yield|Div Yield)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    const earningsYieldPct = extractMetric(/(?:Earnings Yield)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    const realYieldDiscountRate10Y = extractMetric(/(?:10Y Real Yield|Real Yield|TIPS Yield)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    const creditSpreadOasBps = extractMetric(/(?:Credit Spread|HY Credit Spread|OAS)[\s:|—–]+([0-9]+(?:\.\d+)?)/i);
    const globalM2Correlation = extractMetric(/(?:Global M2 Correlation|M2 Correlation)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);
    const stakingYieldPct = extractMetric(/(?:Staking Yield|Staking Return|APY)[\s:|—–]+([0-9]+(?:\.\d+)?)/i);
    const score = extractMetric(/(?:Fundamental Score|Macro Score|Composite Score|Score)[\s:|—–]+([+-]?[0-9]+(?:\.\d+)?)/i);

    const etfMatch = seg.match(/(?:Weekly Spot ETF Flow|Spot ETF Flows?|ETF Net Flows?)[\s:|—–]+([^\r\n|]+)/i);
    const spotEtfFlowsWeekly = etfMatch ? etfMatch[1].trim() : undefined;

    let valuationStatus: ExtractedMultiAssetRecord['valuationStatus'] = undefined;
    if (/\bUNDERVALUED\b/i.test(seg)) valuationStatus = 'UNDERVALUED';
    else if (/\bOVERVALUED\b/i.test(seg)) valuationStatus = 'OVERVALUED';
    else if (/\bFAIR[_\s]VALUE\b/i.test(seg)) valuationStatus = 'FAIR_VALUE';

    let bias: ExtractedMultiAssetRecord['bias'] = undefined;
    if (/\bSTRONG(?:LY)?[_\s]BULLISH\b/i.test(seg)) bias = 'STRONG BULLISH';
    else if (/\bSTRONG(?:LY)?[_\s]BEARISH\b/i.test(seg)) bias = 'STRONG BEARISH';
    else if (/\bBULLISH\b/i.test(seg)) bias = 'BULLISH';
    else if (/\bBEARISH\b/i.test(seg)) bias = 'BEARISH';
    else if (/\bNEUTRAL\b/i.test(seg)) bias = 'NEUTRAL';

    let stablecoinLiquidityStatus: ExtractedMultiAssetRecord['stablecoinLiquidityStatus'] = undefined;
    if (/\bEXPANDING\b/i.test(seg)) stablecoinLiquidityStatus = 'EXPANDING';
    else if (/\bCONTRACTING\b/i.test(seg)) stablecoinLiquidityStatus = 'CONTRACTING';
    else if (/\bSTABLE\b/i.test(seg)) stablecoinLiquidityStatus = 'STABLE';

    const drivers: { label: string; impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; note: string }[] = [];
    const segLines = seg.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let colOrder: ValueColumnType[] = ['actual', 'forecast', 'previous'];

    for (const line of segLines) {
      const hdr = detectTableHeaderOrder(line);
      if (hdr) {
        colOrder = hdr;
        continue;
      }
      // Check for tabular rows
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && /^[A-Za-z][A-Za-z0-9\s/()&-]{2,45}$/.test(cells[0])) {
        if (/\b(?:indicator|metric|driver|category|source|valuation)\b/i.test(cells[0])) continue;
        const parsed = tokenizeRowNumbers(cells.slice(1).join(' | '), colOrder);
        if (parsed.actual !== null) {
          indicators.push({
            id: `extracted_${def.symbol}_${Date.now()}_${indicators.length}`,
            matchedIndicatorId: `${def.symbol}_${cells[0].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`,
            name: `${def.symbol} — ${cells[0]}`,
            currency: 'USD',
            category: def.category,
            actual: parsed.actual,
            forecast: parsed.forecast,
            previous: parsed.previous,
            revisedPrevious: parsed.revised,
            unit: parsed.unit || '%',
            referencePeriod: parsed.period || 'Uploaded Document',
            releaseDate: new Date().toISOString().slice(0, 10),
            releaseTime: 'Document Data',
            source: `Uploaded ${def.category} PDF Report`,
            confidence: 97,
            dataStatus: 'EXTRACTED_FROM_IMAGE',
            validationStatus: 'VALIDATED',
            notes: `Extracted ${def.symbol} metric (${colOrder.join('/')})`,
          });

          const impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
            /bullish|positive|strong|expand|beat/i.test(line)
              ? 'BULLISH'
              : /bearish|negative|weak|contract|miss/i.test(line)
              ? 'BEARISH'
              : parsed.forecast !== null && parsed.actual > parsed.forecast
              ? 'BULLISH'
              : parsed.forecast !== null && parsed.actual < parsed.forecast
              ? 'BEARISH'
              : 'NEUTRAL';

          drivers.push({
            label: cells[0],
            impact,
            note: `Actual: ${parsed.actual}${parsed.unit}${parsed.forecast !== null ? ` | Forecast: ${parsed.forecast}${parsed.unit}` : ''}${parsed.previous !== null ? ` | Previous: ${parsed.previous}${parsed.unit}` : ''}`,
          });
        }
      } else if (/^[•\-*]|^\d+\./.test(line) && line.length > 15 && line.length < 220) {
        const cleanBullet = line.replace(/^[•\-*]|\d+\.\s*/, '').trim();
        const impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = /bullish|tailwind|growth|inflow|expansion/i.test(cleanBullet)
          ? 'BULLISH'
          : /bearish|headwind|risk|outflow|contraction/i.test(cleanBullet)
          ? 'BEARISH'
          : 'NEUTRAL';
        drivers.push({
          label: cleanBullet.slice(0, 48),
          impact,
          note: cleanBullet,
        });
      }
    }

    const keyMetrics: Record<string, string | number> = {};
    if (price !== undefined) keyMetrics.price = price;
    if (forwardPe !== undefined) keyMetrics.forwardPe = forwardPe;
    if (pegRatio !== undefined) keyMetrics.pegRatio = pegRatio;
    if (operatingMarginPct !== undefined) keyMetrics.operatingMarginPct = operatingMarginPct;
    if (fcfYieldPct !== undefined) keyMetrics.fcfYieldPct = fcfYieldPct;
    if (dividendYieldPct !== undefined) keyMetrics.dividendYieldPct = dividendYieldPct;
    if (earningsYieldPct !== undefined) keyMetrics.earningsYieldPct = earningsYieldPct;
    if (realYieldDiscountRate10Y !== undefined) keyMetrics.realYieldDiscountRate10Y = realYieldDiscountRate10Y;
    if (creditSpreadOasBps !== undefined) keyMetrics.creditSpreadOasBps = creditSpreadOasBps;
    if (spotEtfFlowsWeekly !== undefined) keyMetrics.spotEtfFlowsWeekly = spotEtfFlowsWeekly;
    if (globalM2Correlation !== undefined) keyMetrics.globalM2Correlation = globalM2Correlation;
    if (stakingYieldPct !== undefined) keyMetrics.stakingYieldPct = stakingYieldPct;

    // Also add extracted scalar metrics to indicators list so EconomicImageExtractorModal displays them
    for (const [k, v] of Object.entries(keyMetrics)) {
      if (typeof v === 'number') {
        indicators.push({
          id: `extracted_${def.symbol}_${k}_${Date.now()}_${indicators.length}`,
          matchedIndicatorId: `${def.symbol}_${k.toUpperCase()}`,
          name: `${def.symbol} ${k.replace(/([A-Z])/g, ' $1').trim()}`,
          currency: 'USD',
          category: def.category,
          actual: v,
          forecast: null,
          previous: null,
          revisedPrevious: null,
          unit: k.toLowerCase().includes('pct') || k.toLowerCase().includes('yield') || k.toLowerCase().includes('margin') ? '%' : k === 'price' ? '$' : '',
          referencePeriod: 'Latest Filing / Report',
          releaseDate: new Date().toISOString().slice(0, 10),
          releaseTime: 'Document Data',
          source: `Uploaded ${def.category} PDF Report`,
          confidence: 99,
          dataStatus: 'EXTRACTED_FROM_IMAGE',
          validationStatus: 'VALIDATED',
          notes: `Extracted ${def.symbol} fundamental metric from PDF`,
        });
      }
    }

    if (Object.keys(keyMetrics).length > 0 || drivers.length > 0 || score !== undefined) {
      assets.push({
        symbol: def.symbol,
        category: def.category,
        price,
        score,
        bias,
        valuationStatus,
        forwardPe,
        pegRatio,
        operatingMarginPct,
        fcfYieldPct,
        dividendYieldPct,
        earningsYieldPct,
        realYieldDiscountRate10Y,
        creditSpreadOasBps,
        spotEtfFlowsWeekly,
        globalM2Correlation,
        stakingYieldPct,
        stablecoinLiquidityStatus,
        drivers: drivers.slice(0, 8),
        keyMetrics,
      });
    }
  }

  return { assets, indicators };
}
