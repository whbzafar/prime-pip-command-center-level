/**
 * PRIME PIP FX COMMAND CENTER — CORE MARKET UNIVERSE REGISTRY
 * Section 3 Specification:
 * - Currencies: USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD
 * - Commodities: Gold / XAU, Silver / XAG, WTI Crude Oil
 * - Indices: US30, NAS100, S&P 500
 * - Crypto: BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT
 * - Major Stocks: NVIDIA, Apple, Microsoft, Amazon, Alphabet
 *
 * Designed with a scalable, production-grade schema allowing easy future asset expansion.
 */

export type AssetClassType =
  | 'CURRENCY'
  | 'COMMODITY'
  | 'INDEX'
  | 'CRYPTO'
  | 'STOCK';

export interface MarketAssetDefinition {
  id: string;
  symbol: string;
  displayName: string;
  shortName: string;
  assetClass: AssetClassType;
  baseCurrency?: string;
  quoteCurrency?: string;
  primaryDrivers: string[];
  authoritativeSources: string[];
  benchmarkUnit: string;
  tradingHours: string;
  description: string;
  isActive: boolean;
  isTradeable: boolean;
  createdAt: string;
}

export const CORE_MARKET_UNIVERSE: MarketAssetDefinition[] = [
  // --------------------------------------------------------------------------
  // 1. MAJOR CURRENCIES (8)
  // --------------------------------------------------------------------------
  {
    id: 'curr-usd',
    symbol: 'USD',
    displayName: 'United States Dollar',
    shortName: 'US Dollar',
    assetClass: 'CURRENCY',
    primaryDrivers: ['Federal Reserve Fed Funds', 'Core PCE Inflation', 'Non-Farm Payrolls', '10Y Treasury Yield', 'GDP Growth'],
    authoritativeSources: ['Federal Reserve', 'Bureau of Labor Statistics (BLS)', 'Bureau of Economic Analysis (BEA)', 'U.S. Treasury'],
    benchmarkUnit: 'Index (DXY)',
    tradingHours: '24/5 Global FX',
    description: 'Global primary reserve currency and benchmark liquidity asset.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-eur',
    symbol: 'EUR',
    displayName: 'Eurozone Euro',
    shortName: 'Euro',
    assetClass: 'CURRENCY',
    primaryDrivers: ['ECB Deposit Rate', 'Harmonised CPI (HICP)', 'German Bund Yields', 'Eurozone PMI', 'Current Account'],
    authoritativeSources: ['European Central Bank (ECB)', 'Eurostat', 'Deutsche Bundesbank'],
    benchmarkUnit: 'EUR',
    tradingHours: '24/5 Global FX',
    description: 'Common currency of the 20 European Union member nations.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-gbp',
    symbol: 'GBP',
    displayName: 'British Pound Sterling',
    shortName: 'Pound Sterling',
    assetClass: 'CURRENCY',
    primaryDrivers: ['Bank of England Bank Rate', 'UK CPI Inflation', 'Gilt Yields', 'UK Employment & Average Earnings'],
    authoritativeSources: ['Bank of England (BoE)', 'Office for National Statistics (ONS)', 'UK Debt Management Office'],
    benchmarkUnit: 'GBP',
    tradingHours: '24/5 Global FX',
    description: 'National currency of the United Kingdom.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-jpy',
    symbol: 'JPY',
    displayName: 'Japanese Yen',
    shortName: 'Japanese Yen',
    assetClass: 'CURRENCY',
    primaryDrivers: ['Bank of Japan Policy Rate', 'JGB 10Y Yields', 'Yield Curve Control (YCC)', 'Tokyo CPI', 'Global Risk Sentiment / Carry'],
    authoritativeSources: ['Bank of Japan (BoJ)', 'Ministry of Finance Japan', 'Statistics Bureau of Japan'],
    benchmarkUnit: 'JPY',
    tradingHours: '24/5 Global FX',
    description: 'Major Asian safe-haven and global funding/carry currency.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-chf',
    symbol: 'CHF',
    displayName: 'Swiss Franc',
    shortName: 'Swiss Franc',
    assetClass: 'CURRENCY',
    primaryDrivers: ['SNB Policy Rate', 'Swiss CPI', 'Confederation Bond Yields', 'Geopolitical Risk Premium', 'SNB FX Interventions'],
    authoritativeSources: ['Swiss National Bank (SNB)', 'Federal Statistical Office (FSO)'],
    benchmarkUnit: 'CHF',
    tradingHours: '24/5 Global FX',
    description: 'Premier global hard safe-haven and sovereign capital haven.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-cad',
    symbol: 'CAD',
    displayName: 'Canadian Dollar',
    shortName: 'Canadian Dollar',
    assetClass: 'CURRENCY',
    primaryDrivers: ['Bank of Canada Overnight Rate', 'Canadian CPI', 'WTI Crude Oil Prices', 'US-Canada Trade Balance', 'Employment'],
    authoritativeSources: ['Bank of Canada (BoC)', 'Statistics Canada'],
    benchmarkUnit: 'CAD',
    tradingHours: '24/5 Global FX',
    description: 'Resource-linked G10 currency heavily correlated with North American trade and oil.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-aud',
    symbol: 'AUD',
    displayName: 'Australian Dollar',
    shortName: 'Aussie Dollar',
    assetClass: 'CURRENCY',
    primaryDrivers: ['RBA Cash Rate Target', 'Australian Trimmed Mean CPI', 'China Industrial Demand', 'Iron Ore & Coal Prices', 'Labor Force'],
    authoritativeSources: ['Reserve Bank of Australia (RBA)', 'Australian Bureau of Statistics (ABS)'],
    benchmarkUnit: 'AUD',
    tradingHours: '24/5 Global FX',
    description: 'High-beta pro-cyclical currency heavily driven by commodity exports and Chinese growth.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'curr-nzd',
    symbol: 'NZD',
    displayName: 'New Zealand Dollar',
    shortName: 'Kiwi Dollar',
    assetClass: 'CURRENCY',
    primaryDrivers: ['RBNZ Official Cash Rate', 'New Zealand CPI', 'Global Dairy Trade Prices', 'China Trade Linkages', 'Migration & Housing'],
    authoritativeSources: ['Reserve Bank of New Zealand (RBNZ)', 'Stats NZ'],
    benchmarkUnit: 'NZD',
    tradingHours: '24/5 Global FX',
    description: 'Agricultural export-dependent G10 currency sensitive to global risk appetite.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 2. COMMODITIES (3)
  // --------------------------------------------------------------------------
  {
    id: 'comm-xau',
    symbol: 'XAUUSD',
    displayName: 'Gold / US Dollar',
    shortName: 'Gold (XAU)',
    assetClass: 'COMMODITY',
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    primaryDrivers: ['U.S. 10Y Real Yields (TIPS)', 'U.S. Dollar Index (DXY)', 'Central Bank Official Reserves Demand', 'Geopolitical Risk', 'Global M2 Liquidity'],
    authoritativeSources: ['World Gold Council (WGC)', 'U.S. Treasury', 'COMEX / CME Group', 'LBMA'],
    benchmarkUnit: 'USD / Troy Oz',
    tradingHours: '23h CME Globex',
    description: 'Primary monetary metal, non-yielding inflation hedge, and reserve store of value.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'comm-xag',
    symbol: 'XAGUSD',
    displayName: 'Silver / US Dollar',
    shortName: 'Silver (XAG)',
    assetClass: 'COMMODITY',
    baseCurrency: 'XAG',
    quoteCurrency: 'USD',
    primaryDrivers: ['Gold/Silver Ratio (GSR)', 'Industrial Solar & EV Demand', 'U.S. Real Yields', 'Global Manufacturing PMI', 'COMEX Warehouse Inventories'],
    authoritativeSources: ['The Silver Institute', 'COMEX / CME Group', 'LBMA'],
    benchmarkUnit: 'USD / Troy Oz',
    tradingHours: '23h CME Globex',
    description: 'Dual-character precious metal with extensive industrial and green-tech demand.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'comm-wti',
    symbol: 'CL_WTI',
    displayName: 'WTI Crude Oil',
    shortName: 'WTI Crude Oil',
    assetClass: 'COMMODITY',
    baseCurrency: 'OIL',
    quoteCurrency: 'USD',
    primaryDrivers: ['EIA Weekly Petroleum Status', 'OPEC+ Production Quotas', 'Global Refining Demand', 'Strategic Petroleum Reserve (SPR)', 'Geopolitical Transit Chokepoints'],
    authoritativeSources: ['U.S. Energy Information Administration (EIA)', 'OPEC Secretariat', 'International Energy Agency (IEA)', 'NYMEX / CME Group'],
    benchmarkUnit: 'USD / Barrel (bbl)',
    tradingHours: '23h NYMEX Globex',
    description: 'Benchmark North American light sweet crude oil contract.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 3. INDICES (3)
  // --------------------------------------------------------------------------
  {
    id: 'idx-us30',
    symbol: 'US30',
    displayName: 'Dow Jones Industrial Average (DJIA)',
    shortName: 'US30 / Dow',
    assetClass: 'INDEX',
    quoteCurrency: 'USD',
    primaryDrivers: ['U.S. Economic Growth & Capex', 'Industrial & Financial Sector Earnings', 'Fed Interest Rate Path', 'Consumer Confidence'],
    authoritativeSources: ['S&P Dow Jones Indices', 'Federal Reserve', 'CBOT / CME Group'],
    benchmarkUnit: 'Index Points',
    tradingHours: 'CME Equity Futures',
    description: 'Price-weighted benchmark of 30 premier blue-chip American industrial corporations.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'idx-nas100',
    symbol: 'NAS100',
    displayName: 'Nasdaq 100 Index',
    shortName: 'Nasdaq 100',
    assetClass: 'INDEX',
    quoteCurrency: 'USD',
    primaryDrivers: ['U.S. 10Y Real Yields (Long-Duration Discount Rate)', 'Mega-Cap Tech Free Cash Flow', 'Semiconductor & AI Capex', 'VIX / Equity Volatility'],
    authoritativeSources: ['Nasdaq Global Index', 'U.S. Securities and Exchange Commission (SEC)', 'CME Group'],
    benchmarkUnit: 'Index Points',
    tradingHours: 'CME Equity Futures',
    description: 'Modified market-cap-weighted index of the 100 largest non-financial Nasdaq innovators.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'idx-sp500',
    symbol: 'SPX500',
    displayName: 'S&P 500 Index',
    shortName: 'S&P 500',
    assetClass: 'INDEX',
    quoteCurrency: 'USD',
    primaryDrivers: ['Aggregate S&P 500 Forward P/E', 'Corporate Operating Margins', 'Fed Liquidity & Reverse Repo', 'High-Yield Credit Spreads (OAS)'],
    authoritativeSources: ['S&P Dow Jones Indices', 'Bureau of Economic Analysis (BEA)', 'CME Group'],
    benchmarkUnit: 'Index Points',
    tradingHours: 'CME Equity Futures',
    description: 'Leading institutional benchmark of large-cap U.S. equities covering ~80% of available market capitalization.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 4. CRYPTO ASSETS (5)
  // --------------------------------------------------------------------------
  {
    id: 'crypto-btc',
    symbol: 'BTCUSDT',
    displayName: 'Bitcoin / USDT',
    shortName: 'Bitcoin (BTC)',
    assetClass: 'CRYPTO',
    baseCurrency: 'BTC',
    quoteCurrency: 'USDT',
    primaryDrivers: ['Global M2 Liquidity Expansion', 'Spot ETF Net Inflow/Outflow', 'Hash Rate & Halving Economics', 'Stablecoin Liquidity', 'Risk Sentiment'],
    authoritativeSources: ['On-Chain Blockchain Node', 'CFTC Regulatory Filings', 'Spot ETF Custodian Disclosures'],
    benchmarkUnit: 'USDT',
    tradingHours: '24/7 Continuous',
    description: 'Decentralized digital hard-capped store of value and macro liquidity bellwether.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'crypto-eth',
    symbol: 'ETHUSDT',
    displayName: 'Ethereum / USDT',
    shortName: 'Ethereum (ETH)',
    assetClass: 'CRYPTO',
    baseCurrency: 'ETH',
    quoteCurrency: 'USDT',
    primaryDrivers: ['Staking Yield Differential', 'Network Gas Burn (EIP-1559)', 'DeFi & Layer 2 TVL', 'Spot ETF Flows', 'BTC/ETH Dominance Ratio'],
    authoritativeSources: ['Ethereum Consensus Layer', 'On-Chain Smart Contract State'],
    benchmarkUnit: 'USDT',
    tradingHours: '24/7 Continuous',
    description: 'Decentralized smart-contract settlement layer and decentralized finance reserve asset.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'crypto-bnb',
    symbol: 'BNBUSDT',
    displayName: 'BNB / USDT',
    shortName: 'BNB',
    assetClass: 'CRYPTO',
    baseCurrency: 'BNB',
    quoteCurrency: 'USDT',
    primaryDrivers: ['BNB Chain On-Chain Volume', 'Exchange Ecosystem Velocity', 'Quarterly Auto-Burn Rate'],
    authoritativeSources: ['BNB Chain Node Network'],
    benchmarkUnit: 'USDT',
    tradingHours: '24/7 Continuous',
    description: 'Native gas and governance asset of the BNB Chain ecosystem.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'crypto-sol',
    symbol: 'SOLUSDT',
    displayName: 'Solana / USDT',
    shortName: 'Solana (SOL)',
    assetClass: 'CRYPTO',
    baseCurrency: 'SOL',
    quoteCurrency: 'USDT',
    primaryDrivers: ['DEX Trading Volumes', 'Active Daily Wallets', 'Validator Performance', 'DeFi / NFT Capital Velocity'],
    authoritativeSources: ['Solana Cluster RPC State'],
    benchmarkUnit: 'USDT',
    tradingHours: '24/7 Continuous',
    description: 'High-throughput, low-latency monolithic blockchain asset.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'crypto-xrp',
    symbol: 'XRPUSDT',
    displayName: 'XRP / USDT',
    shortName: 'XRP',
    assetClass: 'CRYPTO',
    baseCurrency: 'XRP',
    quoteCurrency: 'USDT',
    primaryDrivers: ['Cross-Border Payment Volumes', 'Regulatory Legal Clarity', 'Institutional Remittance Adoption', 'Escrow Releases'],
    authoritativeSources: ['XRP Ledger Consensus Protocol'],
    benchmarkUnit: 'USDT',
    tradingHours: '24/7 Continuous',
    description: 'Enterprise payment protocol digital asset for cross-border financial settlements.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 5. MAJOR STOCKS (5)
  // --------------------------------------------------------------------------
  {
    id: 'stock-nvda',
    symbol: 'NVDA',
    displayName: 'NVIDIA Corporation',
    shortName: 'NVIDIA',
    assetClass: 'STOCK',
    quoteCurrency: 'USD',
    primaryDrivers: ['Data Center GPU Demand', 'Hyperscaler AI Capex', 'Gross Margin Trajectory', 'Supply Chain / CoWoS Capacity'],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'NVIDIA Investor Relations'],
    benchmarkUnit: 'USD / Share',
    tradingHours: '09:30 - 16:00 EST Nasdaq',
    description: 'Dominant global designer of graphics processing units and accelerated AI computing hardware.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'stock-aapl',
    symbol: 'AAPL',
    displayName: 'Apple Inc.',
    shortName: 'Apple',
    assetClass: 'STOCK',
    quoteCurrency: 'USD',
    primaryDrivers: ['iPhone Cycle Sales & ASP', 'Services Revenue Growth', 'Greater China Consumer Demand', 'Share Buybacks & Dividend Yield'],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Apple Investor Relations'],
    benchmarkUnit: 'USD / Share',
    tradingHours: '09:30 - 16:00 EST Nasdaq',
    description: 'Global consumer electronics, software, and services technology corporation.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'stock-msft',
    symbol: 'MSFT',
    displayName: 'Microsoft Corporation',
    shortName: 'Microsoft',
    assetClass: 'STOCK',
    quoteCurrency: 'USD',
    primaryDrivers: ['Azure Cloud Revenue Growth', 'Enterprise AI Copilot Monetization', 'Commercial Office 365 Bookings', 'Operating Margins'],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Microsoft Investor Relations'],
    benchmarkUnit: 'USD / Share',
    tradingHours: '09:30 - 16:00 EST Nasdaq',
    description: 'Pioneering global software, cloud computing, enterprise services, and AI platform provider.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'stock-amzn',
    symbol: 'AMZN',
    displayName: 'Amazon.com, Inc.',
    shortName: 'Amazon',
    assetClass: 'STOCK',
    quoteCurrency: 'USD',
    primaryDrivers: ['AWS Cloud Margin & Growth', 'E-Commerce North America Operating Income', 'Digital Advertising Revenue', 'Free Cash Flow Conversion'],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Amazon Investor Relations'],
    benchmarkUnit: 'USD / Share',
    tradingHours: '09:30 - 16:00 EST Nasdaq',
    description: 'World-leading e-commerce, cloud computing infrastructure (AWS), and digital advertising conglomerate.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
  {
    id: 'stock-googl',
    symbol: 'GOOGL',
    displayName: 'Alphabet Inc. (Google Class A)',
    shortName: 'Alphabet',
    assetClass: 'STOCK',
    quoteCurrency: 'USD',
    primaryDrivers: ['Google Search Ad Revenue', 'Google Cloud Operating Profit', 'YouTube Ad Spend', 'AI Search Transformation & Capex'],
    authoritativeSources: ['U.S. SEC Form 10-K/10-Q', 'Nasdaq Exchange', 'Alphabet Investor Relations'],
    benchmarkUnit: 'USD / Share',
    tradingHours: '09:30 - 16:00 EST Nasdaq',
    description: 'Global technology holding company dominating internet search, cloud infrastructure, and autonomous systems.',
    isActive: true,
    isTradeable: true,
    createdAt: '2026-10-06T00:00:00Z',
  },
];

export function getAssetsByClass(assetClass: AssetClassType): MarketAssetDefinition[] {
  return CORE_MARKET_UNIVERSE.filter((a) => a.assetClass === assetClass);
}

export function getAssetBySymbol(symbol: string): MarketAssetDefinition | undefined {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9_]/g, '');
  return CORE_MARKET_UNIVERSE.find(
    (a) => a.symbol.toUpperCase() === clean || a.id.toUpperCase() === clean
  );
}

export const ASSET_CLASS_LABELS: Record<AssetClassType, { label: string; count: number; badgeColor: string }> = {
  CURRENCY: { label: 'G8 Major Currencies', count: 8, badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  COMMODITY: { label: 'Strategic Commodities', count: 3, badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  INDEX: { label: 'Benchmark Indices', count: 3, badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  CRYPTO: { label: 'Major Crypto Assets', count: 5, badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  STOCK: { label: 'Mega-Cap Equities', count: 5, badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};
