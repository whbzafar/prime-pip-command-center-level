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
    patterns: [{ re: /^(fed|ecb|boe|boj|boc|rba|rbnz|snb|pboc)? ?interest rate decision$/ }, { re: /^interest rate$/ }, { re: /^deposit facility rate$/ }, { re: /^official cash rate$/ }, { re: /^cash rate$/ }, { re: /^bank rate$/ }],
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
    patterns: [{ re: /^core inflation rate yoy$/ }, { re: /^core cpi yoy$/ }, { re: /^rba trimmed mean cpi yoy$/ }, { re: /^quarterly rba trimmed mean cpi yoy$/ }, { re: /^cpi trimmed[- ]mean yoy$/ }, { re: /^trimmed mean cpi yoy$/ }, { re: /^rba trimmed mean cpi yoy$/ }, { re: /^inflation rate ex all food and energy yoy$/ }, { re: /^inflation rate ex-food and energy yoy$/ }],
    exclude: /tokyo|boc|median|common|weighted/i,
    scale: 0.15,
    range: [-15, 60],
  },
  cpi_mom: {
    name: 'Headline CPI (MoM)',
    desc: 'Month-on-month price change — the freshest read on inflation momentum.',
    freq: 'Monthly',
    patterns: [{ re: /^inflation rate mom$/ }, { re: /^cpi mom$/ }, { re: /^inflation rate qoq$/, scale: 0.25 }, { re: /^quarterly inflation rate qoq$/, scale: 0.25 }],
    exclude: /core|tokyo|harmonised|hicp/i,
    scale: 0.1,
    range: [-5, 15],
  },
  core_cpi_mom: {
    name: 'Core CPI (MoM)',
    desc: 'Monthly core inflation momentum. Central banks watch 3- and 6-month annualized trends of this print.',
    freq: 'Monthly',
    patterns: [{ re: /^core inflation rate mom$/ }, { re: /^core cpi mom$/ }, { re: /^inflation rate ex all food and energy mom$/ }, { re: /^rba trimmed mean cpi mom$/ }],
    exclude: /tokyo/i,
    scale: 0.1,
    range: [-5, 15],
  },
  ppi: {
    name: 'Producer Prices',
    desc: 'Pipeline inflation at the factory gate — leads consumer inflation by 1–3 months.',
    freq: 'Monthly',
    patterns: [{ re: /^ppi mom$/, scale: 0.2 }, { re: /^ppi yoy$/, scale: 0.4 }, { re: /^ppi output yoy$/, scale: 0.4 }, { re: /^producer prices yoy$/, scale: 0.4 }, { re: /^producer & import prices yoy$/, scale: 0.4 }, { re: /^ppi qoq$/, scale: 0.4 }, { re: /^ppi output qoq$/, scale: 0.4 }],
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
      { re: /^wage growth yoy$/, scale: 0.3 },
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
    patterns: [{ re: /^gdp mom$/ }, { re: /^monthly gdp mom$/ }, { re: /^gdp growth rate mom$/ }],
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
    patterns: [{ re: /^ism services pmi$/ }, { re: /^ism non-manufacturing pmi$/ }, { re: /services pmi$/ }, { re: /^business nz services index$/ }, { re: /^performance of services index$/ }, { re: /^services nz psi$/ }],
    exclude: SVC_EXCLUDE,
    scale: 1.0,
    level: { neutral: 50, scale: 4, label: '50 = expansion/contraction line' },
    range: [10, 90],
  },
  retail_sales: {
    name: 'Retail Sales',
    desc: 'Consumer spending at retailers — the engine of household demand.',
    freq: 'Monthly',
    patterns: [{ re: /^retail sales mom$/, scale: 0.5 }, { re: /^retail sales qoq$/, scale: 0.6 }, { re: /^retail sales yoy$/, scale: 1.2 }, { re: /^household spending mom$/, scale: 0.6 }],
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
      { re: /^westpac consumer confidence$/, scale: 3 },
      { re: /^consumer confidence$/ },
      { re: /^consumer confidence index$/ },
      { re: /^consumer confidence mom$/, scale: 3 },
    ],
    exclude: /expectations|current conditions|inflation|lseg|ipsos/i,
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
      { re: /^ivey pmi( s\.?a)?$/, scale: 3 },
      { re: /^cbi industrial trends orders$/, scale: 6 },
      { re: /^economic sentiment$/ },
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

  tokyo_cpi: {
    name: 'Tokyo CPI (leading)',
    desc: 'Consumer prices in Tokyo, published about three weeks before the national figure — the BoJ’s earliest inflation read.',
    freq: 'Monthly',
    patterns: [{ re: /^tokyo core cpi yoy$/ }, { re: /^tokyo cpi ex fresh food yoy$/ }, { re: /^tokyo cpi yoy$/ }],
    exclude: /energy/i,
    scale: 0.2,
    range: [-5, 15],
  },
  dairy_auction: {
    name: 'Global Dairy Trade Price Index',
    desc: 'Fortnightly auction result for whole-milk powder and other dairy — New Zealand’s biggest export earner.',
    freq: 'Weekly',
    patterns: [{ re: /^global dairy trade price index$/ }, { re: /^gdt price index$/ }, { re: /global dairy trade/ }],
    scale: 2,
    range: [-25, 25],
  },

  activity_survey: {
    name: 'Business Activity Survey',
    desc: 'Domestic business-condition surveys (ESI, Tankan, NAB, CBI, KOF…) — the free, always-published read on activity that stands in for the licensed S&P Global / HCOB PMIs.',
    freq: 'Monthly',
    patterns: [],
    scale: 1.5,
    range: [-200, 400],
  },
  job_ratio: {
    name: 'Jobs-to-Applicants Ratio',
    desc: 'Job openings per applicant (Japan) — labour-market tightness that feeds wage growth and BoJ policy.',
    freq: 'Monthly',
    patterns: [{ re: /^jobs\/applications ratio$/ }],
    scale: 0.03,
    level: { neutral: 1.2, scale: 0.15, label: '1.2 openings per applicant ≈ balanced' },
    range: [0, 3],
  },
  infl_expect: {
    name: 'Consumer Inflation Expectations',
    desc: 'University of Michigan 5-year consumer inflation expectations — the Fed watches this for de-anchoring.',
    freq: 'Monthly',
    patterns: [{ re: /^michigan 5 year inflation expectations$/ }],
    scale: 0.1,
    level: { neutral: 2.5, scale: 0.8, label: '~2.5% = anchored' },
    range: [0, 15],
  },
  durable_goods: {
    name: 'Durable Goods Orders',
    desc: 'New orders for long-lasting manufactured goods ex-transport — a capex and demand lead.',
    freq: 'Monthly',
    patterns: [{ re: /^durable goods orders ex transp mom$/ }, { re: /^durable goods orders mom$/ }],
    scale: 0.6,
    range: [-30, 30],
  },
  regional_mfg: {
    name: 'Regional Fed Manufacturing (Empire / Philly)',
    desc: 'NY Empire State and Philadelphia Fed manufacturing surveys — the earliest read on the ISM each month.',
    freq: 'Monthly',
    patterns: [{ re: /^philadelphia fed manufacturing index$/, scale: 8 }, { re: /^ny empire state manufacturing index$/, scale: 8 }],
    scale: 8,
    range: [-100, 100],
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
    policy_rate: [{ re: /^interest rate$/ }, { re: /^fed interest rate decision$/ }, { re: /^interest rate decision$/ }],
    consumer_conf: [{ re: /^michigan consumer sentiment$/ }, { re: /^cb consumer confidence$/ }],
    business_conf: [{ re: /^nfib business optimism index$/ }],
  },
  EU: {
    activity_survey: [{ re: /^economic sentiment$/, scale: 1.2 }],
    policy_rate: [{ re: /^deposit facility rate$/ }, { re: /^ecb interest rate decision$/ }, { re: /^interest rate decision$/ }],
    mfg_pmi: [{ re: /^hcob manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^hcob services pmi$/ }, { re: /services pmi$/ }],
  },
  DE: {
    business_conf: [{ re: /^ifo business climate$/ }, { re: /^zew economic sentiment index$/, scale: 6 }],
  },
  GB: {
    activity_survey: [{ re: /^cbi distributive trades$/, scale: 8 }, { re: /^cbi business optimism index$/, scale: 6 }],
    mfg_pmi: [{ re: /^s&p global manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^s&p global services pmi$/ }, { re: /services pmi$/ }],
    consumer_conf: [{ re: /^consumer confidence index$/ }, { re: /^gfk consumer confidence$/ }],
    business_conf: [{ re: /^cbi industrial trends orders$/, scale: 6 }],
    employment_change: [{ re: /^employment change$/, scale: 60 }],
  },
  AU: {
    activity_survey: [{ re: /^nab business conditions$/, scale: 3 }],
    consumer_conf: [{ re: /^consumer confidence mom$/, scale: 3 }, { re: /^westpac consumer confidence index$/, scale: 3 }],
  },
  CA: {
    consumer_conf: [],
    business_conf: [{ re: /^ivey pmi( s\.?a)?$/, scale: 3 }],
  },
  JP: {
    activity_survey: [{ re: /^tankan large non-manufacturing index$/, scale: 3 }, { re: /^reuters tankan index$/, scale: 4 }],
    business_conf: [{ re: /^tankan large manufacturers index$/, scale: 3 }],
  },
  NZ: {
    activity_survey: [{ re: /^nzier business confidence$/, scale: 10 }],
    mfg_pmi: [{ re: /^business nz pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^services nz psi$/ }, { re: /^business nz services index$/ }, { re: /^performance of services index$/ }, { re: /services pmi$/ }],
    retail_sales: [{ re: /^electronic retail card spending mom$/, scale: 0.7 }, { re: /^retail sales qoq$/, scale: 0.6 }],
    industrial_production: [{ re: /^manufacturing sales qoq$/, scale: 1.2 }],
  },
  CH: {
    activity_survey: [{ re: /^economic sentiment index$/, scale: 8 }],
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
