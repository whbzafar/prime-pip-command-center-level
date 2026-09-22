/**
 * Intent Router for Community Chat Intelligence
 * Classifies trader messages into closed capabilities, applies privacy redaction,
 * escalates emotional distress, and extracts parameters.
 */

import { CapabilityId } from './types.js';
import { recordGap } from './gapLedger.js';
import { GoogleGenAI } from '@google/genai';

export interface ClassificationResult {
  capability: CapabilityId;
  confidence: number;
  entities: Record<string, string>;
  isDistressed?: boolean;
}

// Regex for Redacting Private Information
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const LONG_DIGITS_REGEX = /\b\d{7,}\b/g;
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

export function redactSensitiveData(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(LONG_DIGITS_REGEX, '[REDACTED_NUMBER]')
    .replace(URL_REGEX, '[REDACTED_LINK]');
}

// Severe Emotional Distress & Crisis Expressions
const CRISIS_PATTERNS = [
  /kill myself/i,
  /want to die/i,
  /end my life/i,
  /lost everything/i,
  /can('t| not) take this anymore/i,
  /suicid(e|al)/i,
  /ruined my (whole )?life/i,
  /blown my entire (savings|life savings|account)/i,
  /i have nothing left/i,
];

export function isDistressSignal(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

/**
 * Deterministic Lexicon Rule Matching
 */
export function matchDeterministicLexicon(text: string): ClassificationResult | null {
  const normalized = text.toLowerCase();

  // 1. Emergency Wellbeing Check
  if (isDistressSignal(normalized)) {
    return {
      capability: 'CRISIS_RESOURCE',
      confidence: 1.0,
      entities: {},
      isDistressed: true,
    };
  }

  // 2. Economic Calendar & News Events
  if (
    normalized.includes('calendar') ||
    normalized.includes('economic news') ||
    normalized.includes('forex factory') ||
    normalized.includes('high impact news') ||
    normalized.includes('nfp') ||
    normalized.includes('fomc') ||
    normalized.includes('cpi release') ||
    normalized.includes('news today') ||
    normalized.includes('what news is coming')
  ) {
    let currency = 'ALL';
    if (normalized.includes('usd') || normalized.includes('dollar')) currency = 'USD';
    else if (normalized.includes('eur') || normalized.includes('euro')) currency = 'EUR';
    else if (normalized.includes('gbp') || normalized.includes('pound')) currency = 'GBP';
    else if (normalized.includes('jpy') || normalized.includes('yen')) currency = 'JPY';
    else if (normalized.includes('aud') || normalized.includes('aussie')) currency = 'AUD';
    else if (normalized.includes('cad')) currency = 'CAD';

    return {
      capability: 'ECONOMIC_CALENDAR',
      confidence: 0.93,
      entities: { currency },
    };
  }

  // 4. Session Clock & Market Hours
  if (
    normalized.includes('session clock') ||
    normalized.includes('market open') ||
    normalized.includes('market close') ||
    normalized.includes('london session') ||
    normalized.includes('new york session') ||
    normalized.includes('tokyo session') ||
    normalized.includes('sydney session') ||
    normalized.includes('session overlap') ||
    normalized.includes('is london open') ||
    normalized.includes('is new york open') ||
    normalized.includes('what market is open')
  ) {
    return {
      capability: 'SESSION_CLOCK',
      confidence: 0.96,
      entities: {},
    };
  }

  // 5. Lot Size Calculator
  if (
    normalized.includes('lot size') ||
    normalized.includes('how many lots') ||
    normalized.includes('calculate lot') ||
    normalized.includes('position size') ||
    normalized.includes('risk 1%') ||
    normalized.includes('stop loss pips')
  ) {
    // Extract pair if mentioned
    let pair = 'EUR/USD';
    const pairMatch = normalized.match(/(eur\/usd|gbp\/usd|usd\/jpy|xau\/usd|gold|aud\/usd|usd\/cad)/i);
    if (pairMatch) {
      pair = pairMatch[0].toUpperCase();
    }

    // Extract balance if mentioned
    let balance = '10000';
    const balanceMatch = normalized.match(/(\$|usd\s*)?(\d{3,6})(\s*k)?/i);
    if (balanceMatch && balanceMatch[2]) {
      let val = parseInt(balanceMatch[2], 10);
      if (balanceMatch[3]) val *= 1000;
      if (val >= 100) balance = String(val);
    }

    // Extract pips if mentioned
    let pips = '20';
    const pipsMatch = normalized.match(/(\d{1,3})\s*(pip|pips|sl)/i);
    if (pipsMatch && pipsMatch[1]) {
      pips = pipsMatch[1];
    }

    return {
      capability: 'LOT_SIZE',
      confidence: 0.91,
      entities: { pair, balance, pips, riskPercent: '1.0' },
    };
  }

  return null;
}

/**
 * Main Intent Router Analysis function
 */
export async function analyzeIntent(
  rawText: string,
  userId: string,
  geminiClient?: GoogleGenAI | null
): Promise<ClassificationResult> {
  const safeText = redactSensitiveData(rawText);

  // 1. First run deterministic lexicon (ultra-fast, zero latency, 100% predictable)
  const directMatch = matchDeterministicLexicon(safeText);
  if (directMatch && directMatch.confidence >= 0.75) {
    return directMatch;
  }

  // 2. If Gemini client is provided and deterministic match failed, run closed LLM classification
  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are a financial community chat classifier for PrimePipFX.
Classify the user's message into EXACTLY ONE of these closed capabilities:
- COT_REPORT: User asking about Commitments of Traders, institutional futures positioning, commercial/non-commercial data.
- ECONOMIC_CALENDAR: User asking about macroeconomic calendar releases, NFP, CPI, interest rate decisions, or Forex Factory news.
- SESSION_CLOCK: User asking about Forex trading sessions (London, New York, Tokyo, Sydney), market opening/closing times, or session overlaps.
- LOT_SIZE: User asking how to calculate lot sizes, position sizing, or risk-to-stop pips.
- UNKNOWN: Anything else, chit chat, technical questions, general greetings.

USER MESSAGE: "${safeText}"

Respond ONLY in strict JSON format:
{
  "capability": "COT_REPORT" | "ECONOMIC_CALENDAR" | "SESSION_CLOCK" | "LOT_SIZE" | "UNKNOWN",
  "confidence": number between 0.0 and 1.0,
  "entities": {
    "asset": string (if applicable),
    "currency": string (if applicable),
    "pair": string (if applicable)
  }
}`;

      const response = await geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.capability && parsed.confidence !== undefined) {
        if (parsed.confidence < 0.75 || parsed.capability === 'UNKNOWN') {
          recordGap(rawText);
        }
        return {
          capability: parsed.capability,
          confidence: parsed.confidence,
          entities: parsed.entities || {},
        };
      }
    } catch {
      // Fallback
    }
  }

  // Record gap for unhandled queries
  recordGap(rawText);

  return {
    capability: 'UNKNOWN',
    confidence: 0.2,
    entities: {},
  };
}
