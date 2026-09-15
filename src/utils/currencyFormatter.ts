/**
 * Currency and financial number formatting utilities.
 * Guarantees zero occurrences of [object Object], NaN, undefined, or null in financial outputs.
 */

export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && !Number.isNaN(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '$';
  const c = currency.trim().toUpperCase();
  switch (c) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'PKR':
      return '₨ ';
    case 'JPY':
      return '¥';
    case 'AUD':
      return 'A$';
    case 'CAD':
      return 'C$';
    default:
      return c.length <= 4 ? `${c} ` : '$';
  }
}

export function formatCurrency(
  value: unknown,
  currency: string = 'USD',
  options?: {
    showSign?: boolean;
    decimals?: number;
  }
): string {
  const num = safeNumber(value, 0);
  const symbol = getCurrencySymbol(currency);
  const decimals = options?.decimals ?? 2;
  const showSign = options?.showSign ?? false;

  const isNegative = num < 0;
  const absVal = Math.abs(num);

  const formattedAbs = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (isNegative) {
    return `-${symbol}${formattedAbs}`;
  }

  if (showSign && num > 0) {
    return `+${symbol}${formattedAbs}`;
  }

  return `${symbol}${formattedAbs}`;
}

export function formatPercent(value: unknown, showSign: boolean = false): string {
  const num = safeNumber(value, 0);
  const formatted = Math.abs(num).toFixed(2);

  if (num < 0) {
    return `-${formatted}%`;
  }
  if (showSign && num > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}
