import { describe, it, expect } from 'vitest';
import { parseBinanceCryptoItem, parseBybitCryptoItem } from '../server/sentiment/providers/cryptoProvider.js';
import { parseMyfxbookOutlookResponse } from '../server/sentiment/providers/myfxbookProvider.js';
import { validateSentimentItem, validateSentimentBatch, CircuitBreaker } from '../server/sentiment/validation.js';
import { normalizeSymbol, getAssetClass, formatDisplaySymbol } from '../server/sentiment/symbolMapping.js';

describe('Retail Sentiment: Symbol Normalization & Classification', () => {
  it('normalizes currency pairs and aliases properly', () => {
    expect(normalizeSymbol('eur/usd')).toBe('EURUSD');
    expect(normalizeSymbol('gbp_usd')).toBe('GBPUSD');
    expect(normalizeSymbol('GOLD')).toBe('XAUUSD');
    expect(normalizeSymbol('SILVER')).toBe('XAGUSD');
    expect(normalizeSymbol('WTI')).toBe('USOIL');
    expect(normalizeSymbol('OIL')).toBe('USOIL');
    expect(normalizeSymbol('DAX')).toBe('GER40');
    expect(normalizeSymbol('DJIA')).toBe('US30');
    expect(normalizeSymbol('btcusdt')).toBe('BTCUSDT');
  });

  it('correctly categorizes asset classes', () => {
    expect(getAssetClass('EURUSD')).toBe('FOREX');
    expect(getAssetClass('XAUUSD')).toBe('COMMODITIES');
    expect(getAssetClass('USOIL')).toBe('COMMODITIES');
    expect(getAssetClass('US30')).toBe('INDICES');
    expect(getAssetClass('NAS100')).toBe('INDICES');
    expect(getAssetClass('BTCUSDT')).toBe('CRYPTO');
    expect(getAssetClass('SOLUSDT')).toBe('CRYPTO');
  });

  it('formats display symbols nicely', () => {
    expect(formatDisplaySymbol('EURUSD')).toBe('EUR/USD');
    expect(formatDisplaySymbol('BTCUSDT')).toBe('BTC/USDT');
    expect(formatDisplaySymbol('XAUUSD')).toBe('XAU/USD (Gold)');
    expect(formatDisplaySymbol('US30')).toBe('US30 (Dow Jones)');
  });
});

describe('Retail Sentiment: Validation Logic', () => {
  it('accepts valid percentages that sum to ~100% within 1% tolerance', () => {
    const valid = validateSentimentItem({
      symbol: 'BTCUSDT',
      assetClass: 'CRYPTO',
      longPct: 61.31,
      shortPct: 38.69,
      source: 'Binance Futures',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.sanitized).toBeDefined();
    expect(valid.sanitized!.longPct).toBe(61.3);
    expect(valid.sanitized!.shortPct).toBe(38.7);
    expect(valid.sanitized!.longPct + valid.sanitized!.shortPct).toBe(100);
  });

  it('rejects items with NaN or null percentages', () => {
    const res1 = validateSentimentItem({
      symbol: 'EURUSD',
      longPct: NaN,
      shortPct: 50,
    });
    expect(res1.isValid).toBe(false);

    const res2 = validateSentimentItem({
      symbol: 'EURUSD',
      longPct: 50,
      shortPct: (null as unknown) as number,
    });
    expect(res2.isValid).toBe(false);
  });

  it('rejects items where sum is not ~100% (violates tolerance)', () => {
    const res = validateSentimentItem({
      symbol: 'EURUSD',
      longPct: 50,
      shortPct: 40, // sum = 90
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Percentages do not sum to 100%');
  });

  it('rejects out of bounds percentages (< 0 or > 100)', () => {
    const res = validateSentimentItem({
      symbol: 'EURUSD',
      longPct: 105,
      shortPct: -5,
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Out of bounds percentages');
  });

  it('validates a batch and drops invalid items without crashing', () => {
    const batch = [
      { symbol: 'BTCUSDT', assetClass: 'CRYPTO' as const, longPct: 60, shortPct: 40, source: 'Binance' },
      { symbol: 'INVALID', assetClass: 'FOREX' as const, longPct: 90, shortPct: 90, source: 'Bad' },
      { symbol: 'ETHUSDT', assetClass: 'CRYPTO' as const, longPct: 70, shortPct: 30, source: 'Binance' },
    ];
    const sanitized = validateSentimentBatch(batch);
    expect(sanitized.length).toBe(2);
    expect(sanitized[0].symbol).toBe('BTCUSDT');
    expect(sanitized[1].symbol).toBe('ETHUSDT');
  });
});

describe('Retail Sentiment: Binance Futures Parser', () => {
  it('parses live Binance Futures globalLongShortAccountRatio response', () => {
    const sample = [
      {
        symbol: 'BTCUSDT',
        longAccount: '0.6131',
        longShortRatio: '1.5846',
        shortAccount: '0.3869',
        timestamp: 1792163100000,
      },
    ];

    const result = parseBinanceCryptoItem(sample, 'BTCUSDT');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('BTCUSDT');
    expect(result!.assetClass).toBe('CRYPTO');
    expect(result!.longPct).toBe(61.3);
    expect(result!.shortPct).toBe(38.7);
    expect(result!.source).toBe('Binance Futures');
  });

  it('returns null on malformed or empty Binance responses', () => {
    expect(parseBinanceCryptoItem([], 'BTCUSDT')).toBeNull();
    expect(parseBinanceCryptoItem(null, 'BTCUSDT')).toBeNull();
    expect(parseBinanceCryptoItem([{ symbol: 'BTCUSDT' }], 'BTCUSDT')).toBeNull();
  });
});

describe('Retail Sentiment: Bybit Account Ratio Parser (Fallback)', () => {
  it('parses live Bybit market account-ratio response', () => {
    const sample = {
      retCode: 0,
      retMsg: 'OK',
      result: {
        list: [
          {
            symbol: 'BTCUSDT',
            buyRatio: '0.6266',
            sellRatio: '0.3734',
            timestamp: '1792163100000',
          },
        ],
      },
    };

    const result = parseBybitCryptoItem(sample, 'BTCUSDT');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('BTCUSDT');
    expect(result!.assetClass).toBe('CRYPTO');
    expect(result!.longPct).toBe(62.7);
    expect(result!.shortPct).toBe(37.3);
    expect(result!.source).toBe('Bybit');
  });

  it('returns null on Bybit error or empty list', () => {
    expect(parseBybitCryptoItem({ retCode: 10001, retMsg: 'Error' }, 'BTCUSDT')).toBeNull();
    expect(parseBybitCryptoItem(null, 'BTCUSDT')).toBeNull();
  });
});

describe('Retail Sentiment: Myfxbook Community Outlook Parser', () => {
  it('parses valid community outlook with percentage numbers', () => {
    const sample = {
      error: false,
      symbols: [
        {
          name: 'EURUSD',
          shortPercentage: 54,
          longPercentage: 46,
          shortPositions: 15400,
          longPositions: 13120,
        },
        {
          name: 'XAUUSD',
          shortPercentage: 35,
          longPercentage: 65,
        },
      ],
    };

    const items = parseMyfxbookOutlookResponse(sample);
    expect(items.length).toBe(2);
    expect(items[0].symbol).toBe('EURUSD');
    expect(items[0].assetClass).toBe('FOREX');
    expect(items[0].longPct).toBe(46);
    expect(items[0].shortPct).toBe(54);
    expect(items[0].source).toBe('Myfxbook Community Outlook');

    expect(items[1].symbol).toBe('XAUUSD');
    expect(items[1].assetClass).toBe('COMMODITIES');
    expect(items[1].longPct).toBe(65);
    expect(items[1].shortPct).toBe(35);
  });

  it('computes percentages from long/short position counts when percentages omitted', () => {
    const sample = {
      error: false,
      symbols: [
        {
          name: 'GBPUSD',
          longPositions: 600,
          shortPositions: 400,
        },
      ],
    };

    const items = parseMyfxbookOutlookResponse(sample);
    expect(items.length).toBe(1);
    expect(items[0].symbol).toBe('GBPUSD');
    expect(items[0].longPct).toBe(60);
    expect(items[0].shortPct).toBe(40);
  });

  it('returns empty array when Myfxbook returns error', () => {
    const sample = {
      error: true,
      message: 'Invalid session.',
    };
    const items = parseMyfxbookOutlookResponse(sample);
    expect(items.length).toBe(0);
  });
});

describe('Retail Sentiment: Circuit Breaker', () => {
  it('transitions from CLOSED to OPEN after failure threshold reached', () => {
    const cb = new CircuitBreaker(3, 1000);
    expect(cb.canExecute()).toBe(true);
    expect(cb.getState()).toBe('CLOSED');

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');

    cb.recordFailure(); // 3rd failure
    expect(cb.getState()).toBe('OPEN');
    expect(cb.canExecute()).toBe(false);

    // After reset/success
    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);
  });
});
