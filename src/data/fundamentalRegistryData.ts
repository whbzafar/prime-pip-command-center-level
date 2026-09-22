import { IndicatorDefinition, CurrencyCode, ModelCategoryWeights } from '../types/fundamentalIndicatorTypes';

export const CURRENCIES: { code: CurrencyCode; name: string; symbol: string; flag: string; centralBank: string; centralBankShort: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', centralBank: 'Federal Reserve', centralBankShort: 'FED' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', centralBank: 'European Central Bank', centralBankShort: 'ECB' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', centralBank: 'Bank of England', centralBankShort: 'BOE' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', centralBank: 'Bank of Japan', centralBankShort: 'BOJ' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭', centralBank: 'Swiss National Bank', centralBankShort: 'SNB' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', centralBank: 'Bank of Canada', centralBankShort: 'BOC' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', centralBank: 'Reserve Bank of Australia', centralBankShort: 'RBA' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', centralBank: 'Reserve Bank of New Zealand', centralBankShort: 'RBNZ' },
];

export const CURRENCY_METADATA: Record<CurrencyCode, { code: CurrencyCode; name: string; symbol: string; flag: string; centralBank: string; centralBankShort: string }> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', centralBank: 'Federal Reserve', centralBankShort: 'FED' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', centralBank: 'European Central Bank', centralBankShort: 'ECB' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', centralBank: 'Bank of England', centralBankShort: 'BOE' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', centralBank: 'Bank of Japan', centralBankShort: 'BOJ' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭', centralBank: 'Swiss National Bank', centralBankShort: 'SNB' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', centralBank: 'Bank of Canada', centralBankShort: 'BOC' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', centralBank: 'Reserve Bank of Australia', centralBankShort: 'RBA' },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', centralBank: 'Reserve Bank of New Zealand', centralBankShort: 'RBNZ' },
};

export const DEFAULT_CATEGORY_WEIGHTS: ModelCategoryWeights = {
  MONETARY_POLICY: 20,
  INFLATION: 15,
  GROWTH: 15,
  EMPLOYMENT: 10,
  RATES_YIELDS: 10,
  BUSINESS_ACTIVITY: 10,
  CONSUMER: 5,
  TRADE_EXTERNAL: 5,
  COT_POSITIONING: 5,
  SENTIMENT: 5,
  HOUSING: 0,
  FISCAL: 0,
};

export const OFFICIAL_INDICATOR_REGISTRY: IndicatorDefinition[] = [
  // ==========================================
  // UNITED STATES (USD)
  // ==========================================
  {
    id: 'USD_POLICY_RATE',