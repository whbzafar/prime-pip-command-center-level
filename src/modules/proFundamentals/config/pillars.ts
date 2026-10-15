import { PillarWeight } from '../types';

export interface PillarMetadata {
  id: string;
  name: string;
  description: string;
  weight: PillarWeight;
  keyFactors: string[];
}

export const FUNDAMENTAL_PILLARS: PillarMetadata[] = [
  {
    id: 'monetary',
    name: 'Monetary policy and rate expectations',
    description:
      'Central bank policy trajectory, terminal rate pricing, forward guidance, dot plots, and 2-year sovereign yield spreads.',
    weight: { short: 0.30, long: 0.30 },
    keyFactors: ['Central Bank Rate Policy', '2Y Sovereign Yield Spreads', 'Terminal Rate Expectation', 'OIS Market Pricing'],
  },
  {
    id: 'inflation',
    name: 'Inflation',
    description:
      'Headline and core CPI, PCE deflators, producer prices, and consumer/market-based inflation expectations.',
    weight: { short: 0.10, long: 0.20 },
    keyFactors: ['Core CPI & Headline YoY', 'PCE Price Deflator', 'Wage Growth Trends', '5Y5Y Forward Inflation Swaps'],
  },
  {
    id: 'growth_labor',
    name: 'Growth and labor',
    description:
      'GDP momentum, manufacturing/services PMIs, retail demand, non-farm payrolls, and unemployment rate dynamics.',
    weight: { short: 0.15, long: 0.20 },
    keyFactors: ['Composite PMI Pulse', 'Quarterly Real GDP', 'Unemployment & Participation', 'Retail Sales Volume'],
  },
  {
    id: 'risk_sentiment',
    name: 'Risk sentiment',
    description:
      'Global risk-on / risk-off regime, equity market liquidity, credit spreads, and cross-asset safe-haven demand.',
    weight: { short: 0.15, long: 0.05 },
    keyFactors: ['VIX / Financial Stress', 'High-Yield Credit Spreads', 'Safe Haven Flows (CHF/JPY)', 'Global Equity Breadth'],
  },
  {
    id: 'positioning',
    name: 'Positioning',
    description:
      'CFTC Commitments of Traders (COT) net speculative positioning, retail sentiment ratios, and crowded trade metrics.',
    weight: { short: 0.15, long: 0.05 },
    keyFactors: ['CFTC Non-Commercial Net', 'Speculative Crowding Index', 'Dealer Positioning', 'Sentiment Extreme Stretches'],
  },
  {
    id: 'structural_flows',
    name: 'Structural and flows',
    description:
      'Current account balances, terms of trade, foreign direct investment (FDI), and international capital flows.',
    weight: { short: 0.05, long: 0.15 },
    keyFactors: ['Current Account % of GDP', 'Terms of Trade Index', 'Foreign Portfolio Inflows', 'Fiscal Balance Trajectory'],
  },
  {
    id: 'price_confirmation',
    name: 'Price confirmation',
    description:
      'Cross-asset technical market confirmation, trend alignment with macro regime, and key technical breakout levels.',
    weight: { short: 0.10, long: 0.05 },
    keyFactors: ['200-day & 50-day Moving Averages', 'Macro Regime Price Alignment', 'Multi-Month Breakout Velocity', 'Currency Index Strength'],
  },
];

export const MAJOR_CURRENCY_CODES = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'] as const;

export const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  JPY: '🇯🇵',
  GBP: '🇬🇧',
  CHF: '🇨🇭',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  NZD: '🇳🇿',
};

export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  JPY: 'Japanese Yen',
  GBP: 'British Pound',
  CHF: 'Swiss Franc',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  NZD: 'New Zealand Dollar',
};

export const CENTRAL_BANKS: Record<string, string> = {
  USD: 'Federal Reserve (Fed)',
  EUR: 'European Central Bank (ECB)',
  JPY: 'Bank of Japan (BOJ)',
  GBP: 'Bank of England (BOE)',
  CHF: 'Swiss National Bank (SNB)',
  AUD: 'Reserve Bank of Australia (RBA)',
  CAD: 'Bank of Canada (BOC)',
  NZD: 'Reserve Bank of New Zealand (RBNZ)',
};
