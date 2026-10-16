import { AssetClass } from './types.js';

// Normalized dictionary of standard symbols
export const FOREX_SYMBOLS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
  'EURAUD', 'EURCAD', 'EURCHF', 'EURNZD', 'GBPAUD', 'GBPCAD', 'GBPCHF',
  'GBPNZD', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF',
]);

export const COMMODITY_SYMBOLS = new Set([
  'XAUUSD', 'GOLD', 'XAGUSD', 'SILVER', 'USOIL', 'WTI', 'BRENT', 'UKOIL', 'NGAS', 'NATGAS', 'GAS',
]);

export const INDEX_SYMBOLS = new Set([
  'US30', 'DJIA', 'SPX500', 'SP500', 'US500', 'NAS100', 'USTEC', 'GER30', 'GER40',
  'DAX40', 'UK100', 'JPN225', 'N225', 'AUS200', 'EUSTX50',
]);

export const CRYPTO_SYMBOLS = new Set([
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'LINKUSDT',
]);

/**
 * Standardize any provider symbol string (stripping slashes, spaces, lowercase)
 */
export function normalizeSymbol(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Alias maps
  const aliasMap: Record<string, string> = {
    'GOLD': 'XAUUSD',
    'XAUUSDT': 'XAUUSD',
    'PAXGUSDT': 'XAUUSD',
    'SILVER': 'XAGUSD',
    'XAGUSDT': 'XAGUSD',
    'OIL': 'USOIL',
    'WTI': 'USOIL',
    'USOILUSDT': 'USOIL',
    'CRUDE': 'USOIL',
    'BRENT': 'BRENT',
    'BRENTUSDT': 'BRENT',
    'NATGASUSDT': 'NATGAS',
    'NGAS': 'NATGAS',
    'WS30': 'US30',
    'DOW': 'US30',
    'DJIA': 'US30',
    'SP500': 'SPX500',
    'US500': 'SPX500',
    'NASDAQ': 'NAS100',
    'USTEC': 'NAS100',
    'DAX': 'GER40',
    'DAX40': 'GER40',
    'GER30': 'GER40',
    'FTSE': 'UK100',
    'FTSE100': 'UK100',
    'NIKKEI': 'JPN225',
  };

  return aliasMap[cleaned] || cleaned;
}

/**
 * Detect asset class based on normalized symbol
 */
export function getAssetClass(symbol: string): AssetClass {
  const norm = normalizeSymbol(symbol);
  if (CRYPTO_SYMBOLS.has(norm) || norm.endsWith('USDT') || norm.endsWith('BTC') || norm.endsWith('ETH')) {
    return 'CRYPTO';
  }
  if (COMMODITY_SYMBOLS.has(norm) || norm.startsWith('XAU') || norm.startsWith('XAG') || norm.includes('OIL')) {
    return 'COMMODITIES';
  }
  if (INDEX_SYMBOLS.has(norm) || norm.startsWith('US30') || norm.startsWith('NAS') || norm.startsWith('SPX') || norm.startsWith('GER')) {
    return 'INDICES';
  }
  return 'FOREX';
}

/**
 * Display label for formatted symbol (e.g. "EUR/USD", "XAU/USD", "BTC/USDT")
 */
export function formatDisplaySymbol(symbol: string): string {
  const norm = normalizeSymbol(symbol);
  if (norm.length === 6 && FOREX_SYMBOLS.has(norm)) {
    return `${norm.slice(0, 3)}/${norm.slice(3)}`;
  }
  if (norm === 'XAUUSD') return 'XAU/USD (Gold)';
  if (norm === 'XAGUSD') return 'XAG/USD (Silver)';
  if (norm === 'USOIL') return 'USOIL (WTI Crude)';
  if (norm === 'BRENT') return 'Brent Crude';
  if (norm === 'NATGAS') return 'NATGAS (Natural Gas)';
  if (norm === 'US30') return 'US30 (Dow Jones)';
  if (norm === 'NAS100') return 'NAS100 (Nasdaq)';
  if (norm === 'SPX500') return 'SPX500 (S&P 500)';
  if (norm === 'GER40') return 'GER40 (DAX)';
  if (norm === 'UK100') return 'UK100 (FTSE)';
  if (norm.endsWith('USDT')) {
    return `${norm.replace('USDT', '')}/USDT`;
  }
  return norm;
}
