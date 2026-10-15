/**
 * CFTC COMMITMENTS OF TRADERS (COT) CONFIGURATION
 * 
 * Central mapping for the CFTC Public Reporting Environment (Socrata SODA API).
 * Dataset: "Legacy – Futures Only" (Dataset ID: 6dca-aqww)
 * Endpoint: https://publicreporting.cftc.gov/resource/6dca-aqww.json
 */

export const CFTC_API_CONFIG = {
  baseUrl: 'https://publicreporting.cftc.gov/resource',
  datasetId: '6dca-aqww',
  // Socrata app token can be passed via environment variable (optional, increases rate limit)
  appToken: (typeof process !== 'undefined' && (process.env?.CFTC_APP_TOKEN || process.env?.SOCRATA_APP_TOKEN)) || '',
  timeoutMs: 10000,
  pageSize: 5000,
};

/**
 * Column Name Mappings
 * Single point of change if the CFTC dataset columns are ever renamed or updated.
 */
export const COT_COLUMN_MAPPINGS = {
  marketAndExchangeNames: 'market_and_exchange_names',
  contractMarketCode: 'cftc_contract_market_code',
  contractMarketName: 'contract_market_name',
  commodityName: 'commodity_name',
  reportDate: 'report_date_as_yyyy_mm_dd',
  openInterest: 'open_interest_all',
  nonCommLong: 'noncomm_positions_long_all',
  nonCommShort: 'noncomm_positions_short_all',
  nonCommSpread: 'noncomm_postions_spread_all',
  commLong: 'comm_positions_long_all',
  commShort: 'comm_positions_short_all',
  changeNonCommLong: 'change_in_noncomm_long_all',
  changeNonCommShort: 'change_in_noncomm_short_all',
  changeCommLong: 'change_in_comm_long_all',
  changeCommShort: 'change_in_comm_short_all',
  changeOpenInterest: 'change_in_open_interest_all',
} as const;

export type MarketCategory = 'Currencies' | 'Commodities' | 'Stock Indices' | 'Bonds/Rates' | 'Crypto';

export interface MarketDefinition {
  code: string;
  name: string;
  category: MarketCategory;
  exchange: string;
  symbolHint: string;
  isCmeCrypto?: boolean;
  notes?: string;
}

/**
 * Institutional Market Universe
 * All markets identified strictly by CFTC contract market code.
 * Verified against live CFTC SODA API.
 */
export const COT_MARKETS: MarketDefinition[] = [
  // --- CURRENCIES ---
  { code: '099741', name: 'Euro FX', category: 'Currencies', exchange: 'CME', symbolHint: '6E / EURUSD' },
  { code: '096742', name: 'British Pound', category: 'Currencies', exchange: 'CME', symbolHint: '6B / GBPUSD' },
  { code: '097741', name: 'Japanese Yen', category: 'Currencies', exchange: 'CME', symbolHint: '6J / USDJPY' },
  { code: '092741', name: 'Swiss Franc', category: 'Currencies', exchange: 'CME', symbolHint: '6S / USDCHF' },
  { code: '090741', name: 'Canadian Dollar', category: 'Currencies', exchange: 'CME', symbolHint: '6C / USDCAD' },
  { code: '232741', name: 'Australian Dollar', category: 'Currencies', exchange: 'CME', symbolHint: '6A / AUDUSD' },
  { code: '112741', name: 'New Zealand Dollar', category: 'Currencies', exchange: 'CME', symbolHint: '6N / NZDUSD' },
  { code: '098662', name: 'U.S. Dollar Index', category: 'Currencies', exchange: 'ICE', symbolHint: 'DXY / DX' },
  { code: '095741', name: 'Mexican Peso', category: 'Currencies', exchange: 'CME', symbolHint: '6M / USDMXN' },
  { code: '102741', name: 'Brazilian Real', category: 'Currencies', exchange: 'CME', symbolHint: '6L / USDBRL' },
  { code: '122741', name: 'South African Rand', category: 'Currencies', exchange: 'CME', symbolHint: '6Z / USDZAR' },

  // --- COMMODITIES ---
  { code: '088691', name: 'Gold', category: 'Commodities', exchange: 'COMEX', symbolHint: 'GC / XAUUSD' },
  { code: '084691', name: 'Silver', category: 'Commodities', exchange: 'COMEX', symbolHint: 'SI / XAGUSD' },
  { code: '085692', name: 'Copper', category: 'Commodities', exchange: 'COMEX', symbolHint: 'HG / COPPER' },
  { code: '076651', name: 'Platinum', category: 'Commodities', exchange: 'NYMEX', symbolHint: 'PL / PLATINUM' },
  { code: '075651', name: 'Palladium', category: 'Commodities', exchange: 'NYMEX', symbolHint: 'PA / PALLADIUM' },
  { code: '067651', name: 'Crude Oil (WTI)', category: 'Commodities', exchange: 'NYMEX', symbolHint: 'CL / USOIL' },
  { code: '023651', name: 'Natural Gas', category: 'Commodities', exchange: 'NYMEX', symbolHint: 'NG / NATGAS' },
  { code: '022651', name: 'Heating Oil', category: 'Commodities', exchange: 'NYMEX', symbolHint: 'HO / HEATOIL' },
  { code: '111659', name: 'RBOB Gasoline', category: 'Commodities', exchange: 'NYMEX', symbolHint: 'RB / GASOLINE' },
  { code: '002602', name: 'Corn', category: 'Commodities', exchange: 'CBOT', symbolHint: 'ZC / CORN' },
  { code: '005602', name: 'Soybeans', category: 'Commodities', exchange: 'CBOT', symbolHint: 'ZS / SOYBEAN' },
  { code: '001602', name: 'Wheat SRW', category: 'Commodities', exchange: 'CBOT', symbolHint: 'ZW / WHEAT' },
  { code: '083731', name: 'Coffee C', category: 'Commodities', exchange: 'ICE-US', symbolHint: 'KC / COFFEE' },
  { code: '080732', name: 'Sugar No. 11', category: 'Commodities', exchange: 'ICE-US', symbolHint: 'SB / SUGAR' },
  { code: '073732', name: 'Cocoa', category: 'Commodities', exchange: 'ICE-US', symbolHint: 'CC / COCOA' },
  { code: '033661', name: 'Cotton No. 2', category: 'Commodities', exchange: 'ICE-US', symbolHint: 'CT / COTTON' },
  { code: '057642', name: 'Live Cattle', category: 'Commodities', exchange: 'CME', symbolHint: 'LE / CATTLE' },

  // --- STOCK INDICES ---
  { code: '13874+', name: 'S&P 500 Consolidated', category: 'Stock Indices', exchange: 'CME', symbolHint: 'SPX / SP500' },
  { code: '13874A', name: 'E-mini S&P 500', category: 'Stock Indices', exchange: 'CME', symbolHint: 'ES / US500' },
  { code: '209742', name: 'Nasdaq-100 Mini', category: 'Stock Indices', exchange: 'CME', symbolHint: 'NQ / US100' },
  { code: '124603', name: 'Dow Jones Industrial ($5 Mini)', category: 'Stock Indices', exchange: 'CBOT', symbolHint: 'YM / US30' },
  { code: '239742', name: 'Russell 2000 Mini', category: 'Stock Indices', exchange: 'CME', symbolHint: 'RTY / US2000' },
  { code: '1170E1', name: 'VIX Volatility Index', category: 'Stock Indices', exchange: 'CFE', symbolHint: 'VIX / VOLATILITY' },

  // --- BONDS / RATES ---
  { code: '042601', name: '2-Year U.S. T-Note', category: 'Bonds/Rates', exchange: 'CBOT', symbolHint: 'ZT / 2Y' },
  { code: '044601', name: '5-Year U.S. T-Note', category: 'Bonds/Rates', exchange: 'CBOT', symbolHint: 'ZF / 5Y' },
  { code: '043602', name: '10-Year U.S. T-Note', category: 'Bonds/Rates', exchange: 'CBOT', symbolHint: 'ZN / 10Y' },
  { code: '020601', name: '30-Year U.S. Treasury Bond', category: 'Bonds/Rates', exchange: 'CBOT', symbolHint: 'ZB / 30Y' },
  { code: '045601', name: '30-Day Fed Funds', category: 'Bonds/Rates', exchange: 'CBOT', symbolHint: 'ZQ / RATES' },

  // --- CRYPTO (CME Futures Only) ---
  {
    code: '133741',
    name: 'Bitcoin (CME)',
    category: 'Crypto',
    exchange: 'CME',
    symbolHint: 'BTC / BITCOIN',
    isCmeCrypto: true,
    notes: 'Institutional CME futures contracts (5 BTC per contract). Not retail spot.',
  },
  {
    code: '133742',
    name: 'Micro Bitcoin (CME)',
    category: 'Crypto',
    exchange: 'CME',
    symbolHint: 'MBT / MICRO BTC',
    isCmeCrypto: true,
    notes: 'CME Micro futures (0.1 BTC per contract). Shorter historical depth.',
  },
  {
    code: '146021',
    name: 'Ether (CME)',
    category: 'Crypto',
    exchange: 'CME',
    symbolHint: 'ETH / ETHER',
    isCmeCrypto: true,
    notes: 'Institutional CME cash-settled futures (50 ETH per contract).',
  },
  {
    code: '146022',
    name: 'Micro Ether (CME)',
    category: 'Crypto',
    exchange: 'CME',
    symbolHint: 'MET / MICRO ETH',
    isCmeCrypto: true,
    notes: 'CME Micro Ether futures (0.1 ETH per contract).',
  },
];

export const CATEGORIES: MarketCategory[] = [
  'Currencies',
  'Commodities',
  'Stock Indices',
  'Bonds/Rates',
  'Crypto',
];
