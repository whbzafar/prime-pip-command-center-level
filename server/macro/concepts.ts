/**
 * ECONOMIC CONCEPT LIBRARY
 *
 * Each concept describes ONE type of release (e.g. headline CPI YoY), how to find it
 * in the TradingView calendar for each country, the typical size of a surprise
 * (used to normalize), and an optional "level" anchor (inflation target, PMI 50…).
 *
 * Calendar naming follows TradingView / Trading Economics conventions
 * ("Inflation Rate YoY", "Non Farm Payrolls", "ISM Manufacturing PMI"...).
 * Release-stage suffixes (Flash / Prel / Final / Adv / 2nd Est) are stripped before matching,
 * so the most recent print of any stage is used.
 */

export type Freq = 'Weekly' | 'Monthly' | 'Quarterly' | 'Per meeting';

export interface Pattern {
  re: RegExp;
  /** override of the surprise scale when this pattern matched (e.g. MoM vs YoY). */
  scale?: number;
}

export interface ConceptDef {
  name: string;
  desc: string;
  freq: Freq;
  patterns: Pattern[];
  exclude?: RegExp;
  /** Typical surprise size in the indicator's units (≈ 1 standard deviation). */
  scale: number;
  /**
   * 'abs' — scale is in indicator units.
   * 'auto_k' — counts quoted in thousands; if the feed delivers raw counts the scale is ×1000.
   * 'relative' — scale is a fraction of |previous| (for levels like trade balance, JOLTS).
   */
  scaleMode?: 'abs' | 'auto_k' | 'relative';
  level?: { neutral: number; scale: number; label: string };
  mode?: 'standard' | 'rate';
  /** Plausible range; prints outside it are rejected as data errors. */
  range?: [number, number];
}

const RATE_EXCLUDE = /speech|minutes|statement|press|projection|vote|report|summary|testimony|hearing|accounts|outlook|meeting|lending|swap|reserve/i;
const PMI_EXCLUDE = /composite|services|prices|employment|new orders|output|input|non-manufacturing|chicago|richmond|kansas|dallas|philadelphia|empire|ny |ivey/i;
const SVC_EXCLUDE = /composite|manufacturing|prices|employment|new orders|business activity|input/i;

export const CONCEPTS: Record<string, ConceptDef> = {
  // ─────────────────────────── MONETARY POLICY
  policy_rate: {
    name: 'Policy Rate Decision',
    desc: 'The central bank’s benchmark rate. A hike (or a more hawkish decision than expected) raises the currency’s yield appeal.',
    freq: 'Per meeting',
    patterns: [{ re: /^(fed|ecb|boe|boj|boc|rba|rbnz|snb|pboc)? ?interest rate decision$/ }, { re: /^deposit facility rate$/ }, { re: /^official cash rate$/ }, { re: /^cash rate$/ }, { re: /^bank rate$/ }],
    exclude: RATE_EXCLUDE,
    scale: 0.25,
    mode: 'rate',
    range: [-2, 40],
  },

  // ─────────────────────────── INFLATION
  cpi_yoy: {
    name: 'Headline CPI (YoY)',
    desc: 'Consumer prices vs. one year ago — the central bank’s primary target variable.',
    freq: 'Monthly',
    patterns: [{ re: /^inflation rate yoy$/ }, { re: /^cpi yoy$/ }, { re: /^monthly cpi indicator$/ }, { re: /^consumer price index yoy$/ }],
    exclude: /core|trimmed|weighted|median|services|goods|tokyo|harmonised|harmonized|hicp|food|energy/i,
    scale: 0.15,
    range: [-15, 60],
  },
  core_cpi_yoy: {
    name: 'Core CPI (YoY)',
    desc: 'Inflation excluding volatile food & energy — the best gauge of underlying price pressure that drives policy.',
    freq: 'Monthly',
    patterns: [{ re: /^core inflation rate yoy$/ }, { re: /^core cpi yoy$/ }, { re: /^cpi trimmed[- ]mean yoy$/ }, { re: /^trimmed mean cpi yoy$/ }],
    exclude: /tokyo|boc|median|common|weighted/i,
    scale: 0.15,
    range: [-15, 60],
  },
  cpi_mom: {
    name: 'Headline CPI (MoM)',
    desc: 'Month-on-month price change — the freshest read on inflation momentum.',
    freq: 'Monthly',
    patterns: [{ re: /^inflation rate mom$/ }, { re: /^cpi mom$/ }],
    exclude: /core|tokyo|harmonised|hicp/i,
    scale: 0.1,
    range: [-5, 15],
  },
  core_cpi_mom: {
    name: 'Core CPI (MoM)',
    desc: 'Monthly core inflation momentum. Central banks watch 3- and 6-month annualized trends of this print.',
    freq: 'Monthly',
    patterns: [{ re: /^core inflation rate mom$/ }, { re: /^core cpi mom$/ }],
    exclude: /tokyo/i,
    scale: 0.1,
    range: [-5, 15],
  },
  ppi: {
    name: 'Producer Prices',
    desc: 'Pipeline inflation at the factory gate — leads consumer inflation by 1–3 months.',
    freq: 'Monthly',
    patterns: [{ re: /^ppi mom$/, scale: 0.2 }, { re: /^ppi yoy$/, scale: 0.4 }, { re: /^ppi output yoy$/, scale: 0.4 }, { re: /^producer prices yoy$/, scale: 0.4 }],
    exclude: /core|input|ex /i,
    scale: 0.3,
    range: [-40, 80],
  },
  pce_core_yoy: {
    name: 'Core PCE Price Index (YoY)',
    desc: 'The Federal Reserve’s preferred inflation measure (target 2%).',
    freq: 'Monthly',
    patterns: [{ re: /^core pce price index yoy$/ }],
    scale: 0.1,
    range: [-5, 20],
  },
  pce_core_mom: {
    name: 'Core PCE Price Index (MoM)',
    desc: 'Monthly momentum of the Fed’s preferred inflation gauge.',
    freq: 'Monthly',
    patterns: [{ re: /^core pce price index mom$/ }],
    scale: 0.1,
    range: [-3, 5],
  },
  wages: {
    name: 'Wage Growth',
    desc: 'Pay growth feeds services inflation; hot wages keep central banks hawkish.',
    freq: 'Monthly',
    patterns: [
      { re: /^average hourly earnings mom$/, scale: 0.1 },
      { re: /^average earnings incl\.? bonus.*$/, scale: 0.3 },
      { re: /^average hourly wages yoy$/, scale: 0.4 },
      { re: /^average cash earnings yoy$/, scale: 0.5 },
      { re: /^wage price index qoq$/, scale: 0.1 },
      { re: /^wage price index yoy$/, scale: 0.2 },
      { re: /^labour cost index qoq$/, scale: 0.1 },
      { re: /^labour cost index yoy$/, scale: 0.3 },
      { re: /^average hourly earnings yoy$/, scale: 0.2 },
    ],
    exclude: /real|excl/i,
    scale: 0.2,
    range: [-10, 30],
  },

  // ─────────────────────────── LABOUR
  unemployment: {
    name: 'Unemployment Rate',
    desc: 'Share of the labour force without work. Rising unemployment pushes central banks toward cuts.',
    freq: 'Monthly',
    patterns: [{ re: /^unemployment rate$/ }],
    exclude: /harmonised|youth|claimant|u-?6/i,
    scale: 0.1,
    range: [0, 40],
  },
  nfp: {
    name: 'Non-Farm Payrolls',
    desc: 'Monthly change in US jobs outside agriculture — the most market-moving release in the world.',
    freq: 'Monthly',
    patterns: [{ re: /^non farm payrolls$/ }, { re: /^nonfarm payrolls$/ }],
    exclude: /private|manufacturing|government|adp/i,
    scale: 60,
    scaleMode: 'auto_k',
    range: [-25000, 25000],
  },
  adp: {
    name: 'ADP Employment Change',
    desc: 'Private payroll estimate from ADP — an early read ahead of NFP.',
    freq: 'Monthly',
    patterns: [{ re: /^adp employment change$/ }],
    exclude: /weekly/i,
    scale: 40,
    scaleMode: 'auto_k',
    range: [-25000, 25000],
  },
  claims: {
    name: 'Initial Jobless Claims',
    desc: 'Weekly new unemployment filings — the highest-frequency labour market signal.',
    freq: 'Weekly',
    patterns: [{ re: /^initial jobless claims$/ }],
    exclude: /4-week|average/i,
    scale: 15,
    scaleMode: 'auto_k',
    range: [50, 7000000],
  },
  jolts: {
    name: 'JOLTS Job Openings',
    desc: 'Unfilled job vacancies — labour demand and wage-pressure indicator.',
    freq: 'Monthly',
    patterns: [{ re: /^jolts job openings$/ }],
    scale: 0.04,
    scaleMode: 'relative',
  },
  employment_change: {
    name: 'Employment Change',
    desc: 'Net change in the number of employed people.',
    freq: 'Monthly',
    patterns: [{ re: /^employment change$/ }, { re: /^employment change qoq$/, scale: 0.3 }],
    exclude: /adp|claimant/i,
    scale: 20,
    scaleMode: 'auto_k',
  },
  claimant_count: {
    name: 'Claimant Count Change',
    desc: 'Monthly change in people claiming unemployment benefits (UK).',
    freq: 'Monthly',
    patterns: [{ re: /^claimant count change$/ }],
    scale: 15,
    scaleMode: 'auto_k',
  },

  // ─────────────────────────── GROWTH
  gdp: {
    name: 'GDP Growth (QoQ)',
    desc: 'Quarterly change in total economic output — the broadest measure of growth.',
    freq: 'Quarterly',
    patterns: [{ re: /^gdp growth rate qoq$/ }, { re: /^gdp growth annualized$/ }],
    exclude: /price|deflator|index|capital|private|consumption|yoy/i,
    scale: 0.2,
    range: [-40, 40],
  },
  gdp_mom: {
    name: 'Monthly GDP (MoM)',
    desc: 'Monthly output estimate — a timelier growth signal between quarterly releases.',
    freq: 'Monthly',
    patterns: [{ re: /^gdp mom$/ }, { re: /^gdp growth rate mom$/ }],
    scale: 0.2,
    range: [-20, 20],
  },
  mfg_pmi: {
    name: 'Manufacturing PMI',
    desc: 'Survey of purchasing managers; above 50 = expansion. Leads industrial output by months.',
    freq: 'Monthly',
    patterns: [{ re: /manufacturing pmi$/ }, { re: /^business nz pmi$/ }],
    exclude: PMI_EXCLUDE,
    scale: 1.0,
    level: { neutral: 50, scale: 4, label: '50 = expansion/contraction line' },
    range: [10, 90],
  },
  services_pmi: {
    name: 'Services PMI',
    desc: 'Services-sector activity survey — services are 70–80% of developed economies.',
    freq: 'Monthly',
    patterns: [{ re: /^ism services pmi$/ }, { re: /^ism non-manufacturing pmi$/ }, { re: /services pmi$/ }, { re: /^business nz services index$/ }, { re: /^performance of services index$/ }],
    exclude: SVC_EXCLUDE,
    scale: 1.0,
    level: { neutral: 50, scale: 4, label: '50 = expansion/contraction line' },
    range: [10, 90],
  },
  retail_sales: {
    name: 'Retail Sales',
    desc: 'Consumer spending at retailers — the engine of household demand.',
    freq: 'Monthly',
    patterns: [{ re: /^retail sales mom$/, scale: 0.5 }, { re: /^retail sales qoq$/, scale: 0.6 }, { re: /^retail sales yoy$/, scale: 1.2 }],
    exclude: /ex |excl|control|core|autos|fuel|volume|bbc|brc|redbook|value/i,
    scale: 0.5,
    range: [-40, 60],
  },
  industrial_production: {
    name: 'Industrial Production',
    desc: 'Output of factories, mines and utilities.',
    freq: 'Monthly',
    patterns: [{ re: /^industrial production mom$/, scale: 0.6 }, { re: /^industrial production yoy$/, scale: 1.2 }],
    exclude: /manufacturing|capacity/i,
    scale: 0.6,
    range: [-50, 80],
  },
  housing: {
    name: 'Housing Activity',
    desc: 'Building permits / housing starts — the most rate-sensitive part of the economy.',
    freq: 'Monthly',
    patterns: [{ re: /^building permits$/ }, { re: /^housing starts$/ }],
    exclude: /mom|yoy/i,
    scale: 0.04,
    scaleMode: 'relative',
  },

  // ─────────────────────────── CONFIDENCE & EXTERNAL
  consumer_conf: {
    name: 'Consumer Confidence',
    desc: 'Household sentiment — leads spending decisions.',
    freq: 'Monthly',
    patterns: [
      { re: /^michigan consumer sentiment$/ },
      { re: /^cb consumer confidence$/ },
      { re: /^gfk consumer confidence$/ },
      { re: /^westpac consumer confidence index$/ },
      { re: /^anz.?roy morgan consumer confidence$/ },
      { re: /^consumer confidence$/ },
    ],
    exclude: /expectations|current conditions|inflation|change/i,
    scale: 2,
  },
  business_conf: {
    name: 'Business Confidence',
    desc: 'Corporate sentiment surveys (Ifo, ZEW, Tankan, NAB, NFIB…) — signal hiring and investment intentions.',
    freq: 'Monthly',
    patterns: [
      { re: /^ifo business climate$/ },
      { re: /^zew economic sentiment index$/, scale: 6 },
      { re: /^tankan large manufacturers index$/, scale: 3 },
      { re: /^nab business confidence$/, scale: 3 },
      { re: /^anz business confidence$/, scale: 5 },
      { re: /^nfib business optimism index$/ },
      { re: /^kof leading indicators$/ },
      { re: /^ivey pmi s\.?a$/, scale: 3 },
      { re: /^business confidence$/ },
    ],
    exclude: /expectations|current assessment|outlook/i,
    scale: 1.5,
  },
  trade_balance: {
    name: 'Trade Balance',
    desc: 'Exports minus imports. Improving balances add structural demand for the currency.',
    freq: 'Monthly',
    patterns: [{ re: /^balance of trade$/ }],
    scale: 0.15,
    scaleMode: 'relative',
  },

  // ─────────────────────────── COMMODITY-SPECIFIC (US EIA / Baker Hughes)
  eia_crude: {
    name: 'EIA Crude Oil Inventories',
    desc: 'Weekly change in US commercial crude stocks. A draw (negative) signals tight supply.',
    freq: 'Weekly',
    patterns: [{ re: /^eia crude oil stocks change$/ }, { re: /^crude oil inventories$/ }],
    exclude: /cushing|imports|refinery|distillate|gasoline|heating/i,
    scale: 2.5,
    scaleMode: 'auto_k',
  },
  api_crude: {
    name: 'API Crude Oil Stocks',
    desc: 'American Petroleum Institute’s weekly inventory estimate (released the evening before EIA).',
    freq: 'Weekly',
    patterns: [{ re: /^api crude oil stock change$/ }],
    scale: 3,
    scaleMode: 'auto_k',
  },
  eia_gasoline: {
    name: 'EIA Gasoline Inventories',
    desc: 'Weekly change in US gasoline stocks — demand proxy for refined products.',
    freq: 'Weekly',
    patterns: [{ re: /^eia gasoline stocks change$/ }],
    scale: 2,
    scaleMode: 'auto_k',
  },
  rig_count: {
    name: 'Baker Hughes Oil Rig Count',
    desc: 'Active US oil rigs — a rising count means more future supply.',
    freq: 'Weekly',
    patterns: [{ re: /^baker hughes oil rig count$/ }],
    scale: 0.02,
    scaleMode: 'relative',
  },
  eia_natgas: {
    name: 'EIA Natural Gas Storage',
    desc: 'Weekly change in US working gas in storage (Bcf). Smaller injections / bigger draws are bullish.',
    freq: 'Weekly',
    patterns: [{ re: /^eia natural gas stocks change$/ }, { re: /^natural gas storage$/ }],
    scale: 12,
  },
};

/** Country-specific pattern priority overrides (first match wins). */
export const COUNTRY_PATTERNS: Record<string, Partial<Record<string, Pattern[]>>> = {
  US: {
    mfg_pmi: [{ re: /^ism manufacturing pmi$/ }, { re: /^s&p global manufacturing pmi$/ }],
    services_pmi: [{ re: /^ism services pmi$/ }, { re: /^ism non-manufacturing pmi$/ }, { re: /^s&p global services pmi$/ }],
    policy_rate: [{ re: /^fed interest rate decision$/ }, { re: /^interest rate decision$/ }],
    consumer_conf: [{ re: /^michigan consumer sentiment$/ }, { re: /^cb consumer confidence$/ }],
    business_conf: [{ re: /^nfib business optimism index$/ }],
  },
  EU: {
    policy_rate: [{ re: /^deposit facility rate$/ }, { re: /^ecb interest rate decision$/ }, { re: /^interest rate decision$/ }],
    mfg_pmi: [{ re: /^hcob manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^hcob services pmi$/ }, { re: /services pmi$/ }],
  },
  DE: {
    business_conf: [{ re: /^ifo business climate$/ }, { re: /^zew economic sentiment index$/, scale: 6 }],
  },
  GB: {
    mfg_pmi: [{ re: /^s&p global manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^s&p global services pmi$/ }, { re: /services pmi$/ }],
    consumer_conf: [{ re: /^gfk consumer confidence$/ }],
    employment_change: [{ re: /^employment change$/, scale: 60 }],
  },
  JP: {
    business_conf: [{ re: /^tankan large manufacturers index$/, scale: 3 }],
  },
  NZ: {
    mfg_pmi: [{ re: /^business nz pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^business nz services index$/ }, { re: /^performance of services index$/ }, { re: /services pmi$/ }],
  },
  CN: {
    mfg_pmi: [{ re: /^nbs manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
  },
};

/** Country-specific level anchors (inflation targets, potential growth). */
export const INFLATION_TARGET: Record<string, number> = {
  US: 2.0, EU: 2.0, GB: 2.0, JP: 2.0, CA: 2.0, AU: 2.5, NZ: 2.0, CH: 1.0, CN: 2.0, DE: 2.0,
};

/** Trend (potential) quarterly growth used as the GDP "level" anchor. US prints annualized. */
export const GDP_ANCHOR: Record<string, { neutral: number; scale: number; surprise: number }> = {
  US: { neutral: 2.0, scale: 1.5, surprise: 0.5 },
  JP: { neutral: 0.1, scale: 0.4, surprise: 0.3 },
  EU: { neutral: 0.3, scale: 0.3, surprise: 0.15 },
  GB: { neutral: 0.3, scale: 0.3, surprise: 0.15 },
  CA: { neutral: 0.4, scale: 0.4, surprise: 0.2 },
  AU: { neutral: 0.5, scale: 0.4, surprise: 0.2 },
  NZ: { neutral: 0.5, scale: 0.5, surprise: 0.25 },
  CH: { neutral: 0.3, scale: 0.4, surprise: 0.2 },
  CN: { neutral: 1.2, scale: 0.4, surprise: 0.2 },
};

export const EMPLOYMENT_SCALE: Record<string, number> = { CA: 20, AU: 20, GB: 60, NZ: 0.3, EU: 0.15 };

export const CENTRAL_BANK: Record<string, string> = {
  USD: 'Federal Reserve', EUR: 'ECB', GBP: 'Bank of England', JPY: 'Bank of Japan',
  CHF: 'Swiss National Bank', CAD: 'Bank of Canada', AUD: 'Reserve Bank of Australia', NZD: 'Reserve Bank of New Zealand',
};

export const CURRENCY_COUNTRY: Record<string, string> = {
  USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', CHF: 'CH', CAD: 'CA', AUD: 'AU', NZD: 'NZ',
};

export const FREQ_DAYS: Record<Freq, number> = { Weekly: 7, Monthly: 31, Quarterly: 92, 'Per meeting': 60 };
