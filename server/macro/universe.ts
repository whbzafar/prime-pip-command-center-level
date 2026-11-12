/**
 * STOCK UNIVERSE for the Fundamentals engine (Pakistan, Asia, global) + basket indices.
 *
 * `y` is the Yahoo Finance symbol. Nothing here is ever scored from memory: the collector
 * (scripts/collect-fundamentals.ts) asks Yahoo for every symbol and keeps only what comes back. A
 * name that returns no data is listed as "unavailable" in the app and is NOT given a made-up score.
 */
export type Region = 'PK' | 'ASIA' | 'US' | 'EU' | 'GLOBAL';

export interface UniverseStock {
  /** Display symbol (unique). Pakistani stocks use the bare PSX ticker. */
  s: string;
  /** Yahoo Finance symbol. */
  y: string;
  name: string;
  region: Region;
  /** ISO-like country code used to attach a macro backdrop where one exists. */
  c: string;
  sector: string;
}

const pk = (s: string, name: string, sector: string): UniverseStock => ({ s, y: `${s}.KA`, name, region: 'PK', c: 'PK', sector });
const as = (y: string, name: string, c: string, sector: string): UniverseStock => ({ s: y, y, name, region: 'ASIA', c, sector });
const us = (y: string, name: string, sector: string): UniverseStock => ({ s: y, y, name, region: 'US', c: 'US', sector });
const eu = (y: string, name: string, c: string, sector: string): UniverseStock => ({ s: y, y, name, region: 'EU', c, sector });
const gl = (y: string, name: string, c: string, sector: string): UniverseStock => ({ s: y, y, name, region: 'GLOBAL', c, sector });

export const UNIVERSE: UniverseStock[] = [
  // ── Pakistan (PSX) ─────────────────────────────────────────────
  pk('OGDC', 'Oil & Gas Development Co', 'Oil & Gas E&P'), pk('PPL', 'Pakistan Petroleum', 'Oil & Gas E&P'),
  pk('MARI', 'Mari Energies', 'Oil & Gas E&P'), pk('POL', 'Pakistan Oilfields', 'Oil & Gas E&P'),
  pk('PSO', 'Pakistan State Oil', 'Oil Marketing'), pk('APL', 'Attock Petroleum', 'Oil Marketing'),
  pk('SNGP', 'Sui Northern Gas Pipelines', 'Gas Utilities'), pk('SSGC', 'Sui Southern Gas', 'Gas Utilities'),
  pk('ATRL', 'Attock Refinery', 'Refinery'), pk('NRL', 'National Refinery', 'Refinery'), pk('PRL', 'Pakistan Refinery', 'Refinery'),
  pk('HBL', 'Habib Bank', 'Banks'), pk('UBL', 'United Bank', 'Banks'), pk('MCB', 'MCB Bank', 'Banks'),
  pk('MEBL', 'Meezan Bank', 'Banks'), pk('BAFL', 'Bank Alfalah', 'Banks'), pk('BAHL', 'Bank AL Habib', 'Banks'),
  pk('ABL', 'Allied Bank', 'Banks'), pk('NBP', 'National Bank of Pakistan', 'Banks'), pk('FABL', 'Faysal Bank', 'Banks'),
  pk('AKBL', 'Askari Bank', 'Banks'),
  pk('ENGRO', 'Engro Corporation', 'Conglomerate / Fertilizer'), pk('EFERT', 'Engro Fertilizers', 'Fertilizer'),
  pk('FFC', 'Fauji Fertilizer', 'Fertilizer'), pk('FATIMA', 'Fatima Fertilizer', 'Fertilizer'), pk('FFBL', 'Fauji Fertilizer Bin Qasim', 'Fertilizer'),
  pk('LUCK', 'Lucky Cement', 'Cement'), pk('DGKC', 'D.G. Khan Cement', 'Cement'), pk('MLCF', 'Maple Leaf Cement', 'Cement'),
  pk('FCCL', 'Fauji Cement', 'Cement'), pk('CHCC', 'Cherat Cement', 'Cement'), pk('KOHC', 'Kohat Cement', 'Cement'), pk('PIOC', 'Pioneer Cement', 'Cement'),
  pk('HUBC', 'Hub Power', 'Power'), pk('KAPCO', 'Kot Addu Power', 'Power'), pk('NCPL', 'Nishat Chunian Power', 'Power'), pk('KEL', 'K-Electric', 'Power'),
  pk('SYS', 'Systems Limited', 'Technology'), pk('TRG', 'TRG Pakistan', 'Technology'), pk('AVN', 'Avanceon', 'Technology'),
  pk('NESTLE', 'Nestle Pakistan', 'Consumer'), pk('UNITY', 'Unity Foods', 'Consumer'), pk('COLG', 'Colgate-Palmolive Pakistan', 'Consumer'),
  pk('MTL', 'Millat Tractors', 'Autos'), pk('INDU', 'Indus Motor', 'Autos'), pk('HCAR', 'Honda Atlas Cars', 'Autos'), pk('PSMC', 'Pak Suzuki Motor', 'Autos'),
  pk('EPCL', 'Engro Polymer & Chemicals', 'Chemicals'), pk('LOTCHEM', 'Lotte Chemical Pakistan', 'Chemicals'), pk('ICI', 'ICI Pakistan', 'Chemicals'),
  pk('ISL', 'International Steels', 'Steel'), pk('ASTL', 'Amreli Steels', 'Steel'),
  pk('NML', 'Nishat Mills', 'Textile'), pk('ILP', 'Interloop', 'Textile'), pk('GATM', 'Gul Ahmed Textile', 'Textile'),
  pk('SEARL', 'The Searle Company', 'Pharma'), pk('GLAXO', 'GlaxoSmithKline Pakistan', 'Pharma'), pk('ABOT', 'Abbott Laboratories Pakistan', 'Pharma'),
  pk('PAEL', 'Pak Elektron', 'Industrial'), pk('PTC', 'Pakistan Telecommunication Co', 'Telecom'),

  // ── Asia-Pacific & Middle East ─────────────────────────────────
  as('7203.T', 'Toyota Motor', 'JP', 'Autos'), as('6758.T', 'Sony Group', 'JP', 'Technology'), as('9984.T', 'SoftBank Group', 'JP', 'Investment / Tech'),
  as('8306.T', 'Mitsubishi UFJ Financial', 'JP', 'Banks'), as('6861.T', 'Keyence', 'JP', 'Industrial Tech'), as('9432.T', 'NTT', 'JP', 'Telecom'),
  as('7974.T', 'Nintendo', 'JP', 'Gaming'), as('8035.T', 'Tokyo Electron', 'JP', 'Semiconductors'), as('9983.T', 'Fast Retailing', 'JP', 'Retail'),
  as('0700.HK', 'Tencent', 'HK', 'Internet'), as('9988.HK', 'Alibaba', 'HK', 'E-commerce'), as('0005.HK', 'HSBC Holdings', 'HK', 'Banks'),
  as('1299.HK', 'AIA Group', 'HK', 'Insurance'), as('3690.HK', 'Meituan', 'HK', 'Internet'), as('0939.HK', 'China Construction Bank', 'HK', 'Banks'),
  as('1810.HK', 'Xiaomi', 'HK', 'Technology'), as('1398.HK', 'ICBC', 'HK', 'Banks'), as('2318.HK', 'Ping An Insurance', 'HK', 'Insurance'),
  as('0941.HK', 'China Mobile', 'HK', 'Telecom'),
  as('RELIANCE.NS', 'Reliance Industries', 'IN', 'Conglomerate'), as('TCS.NS', 'Tata Consultancy Services', 'IN', 'IT Services'),
  as('HDFCBANK.NS', 'HDFC Bank', 'IN', 'Banks'), as('INFY.NS', 'Infosys', 'IN', 'IT Services'), as('ICICIBANK.NS', 'ICICI Bank', 'IN', 'Banks'),
  as('BHARTIARTL.NS', 'Bharti Airtel', 'IN', 'Telecom'), as('SBIN.NS', 'State Bank of India', 'IN', 'Banks'), as('ITC.NS', 'ITC', 'IN', 'Consumer'),
  as('LT.NS', 'Larsen & Toubro', 'IN', 'Industrial'), as('HINDUNILVR.NS', 'Hindustan Unilever', 'IN', 'Consumer'),
  as('005930.KS', 'Samsung Electronics', 'KR', 'Semiconductors'), as('000660.KS', 'SK Hynix', 'KR', 'Semiconductors'),
  as('373220.KS', 'LG Energy Solution', 'KR', 'Batteries'), as('005380.KS', 'Hyundai Motor', 'KR', 'Autos'),
  as('2330.TW', 'TSMC', 'TW', 'Semiconductors'), as('2317.TW', 'Hon Hai (Foxconn)', 'TW', 'Electronics'), as('2454.TW', 'MediaTek', 'TW', 'Semiconductors'),
  as('PDD', 'PDD Holdings', 'CN', 'E-commerce'), as('BIDU', 'Baidu', 'CN', 'Internet'),
  as('D05.SI', 'DBS Group', 'SG', 'Banks'), as('1155.KL', 'Maybank', 'MY', 'Banks'), as('BBCA.JK', 'Bank Central Asia', 'ID', 'Banks'),
  as('CBA.AX', 'Commonwealth Bank', 'AU', 'Banks'), as('BHP.AX', 'BHP Group', 'AU', 'Mining'), as('CSL.AX', 'CSL', 'AU', 'Healthcare'),
  as('2222.SR', 'Saudi Aramco', 'SA', 'Oil & Gas'), as('1120.SR', 'Al Rajhi Bank', 'SA', 'Banks'),

  // ── United States (beyond the 14 SEC-filing names) ─────────────
  us('BRK-B', 'Berkshire Hathaway', 'Financials'), us('AVGO', 'Broadcom', 'Semiconductors'), us('ORCL', 'Oracle', 'Software'),
  us('CRM', 'Salesforce', 'Software'), us('ADBE', 'Adobe', 'Software'), us('COST', 'Costco', 'Consumer Staples'),
  us('PG', 'Procter & Gamble', 'Consumer Staples'), us('JNJ', 'Johnson & Johnson', 'Healthcare'), us('UNH', 'UnitedHealth', 'Healthcare'),
  us('HD', 'Home Depot', 'Retail'), us('BAC', 'Bank of America', 'Financials'), us('MA', 'Mastercard', 'Financials'),
  us('KO', 'Coca-Cola', 'Consumer Staples'), us('PEP', 'PepsiCo', 'Consumer Staples'), us('MRK', 'Merck', 'Healthcare'),
  us('ABBV', 'AbbVie', 'Healthcare'), us('CVX', 'Chevron', 'Energy'), us('DIS', 'Walt Disney', 'Communication'),
  us('INTC', 'Intel', 'Semiconductors'), us('QCOM', 'Qualcomm', 'Semiconductors'), us('PLTR', 'Palantir', 'Software'),
  us('UBER', 'Uber', 'Technology'), us('NKE', 'Nike', 'Consumer'), us('MCD', "McDonald's", 'Consumer'),
  us('WFC', 'Wells Fargo', 'Financials'), us('GS', 'Goldman Sachs', 'Financials'), us('CAT', 'Caterpillar', 'Industrials'),
  us('BA', 'Boeing', 'Industrials'), us('PFE', 'Pfizer', 'Healthcare'), us('CSCO', 'Cisco', 'Technology'),
  us('IBM', 'IBM', 'Technology'), us('NOW', 'ServiceNow', 'Software'), us('COIN', 'Coinbase', 'Financials'),

  // ── Europe ─────────────────────────────────────────────────────
  eu('ASML', 'ASML', 'NL', 'Semiconductor equipment'), eu('SAP', 'SAP', 'DE', 'Software'), eu('NVO', 'Novo Nordisk', 'DK', 'Healthcare'),
  eu('SHEL', 'Shell', 'GB', 'Energy'), eu('AZN', 'AstraZeneca', 'GB', 'Healthcare'), eu('TTE', 'TotalEnergies', 'FR', 'Energy'),
  eu('SNY', 'Sanofi', 'FR', 'Healthcare'), eu('MC.PA', 'LVMH', 'FR', 'Luxury'), eu('SIE.DE', 'Siemens', 'DE', 'Industrials'),
  eu('NESN.SW', 'Nestle', 'CH', 'Consumer Staples'), eu('ROG.SW', 'Roche', 'CH', 'Healthcare'), eu('OR.PA', "L'Oreal", 'FR', 'Consumer'),
  eu('AIR.PA', 'Airbus', 'FR', 'Aerospace'),

  // ── Other global ───────────────────────────────────────────────
  gl('SHOP', 'Shopify', 'CA', 'Software'), gl('RY', 'Royal Bank of Canada', 'CA', 'Banks'), gl('ENB', 'Enbridge', 'CA', 'Energy'),
  gl('MELI', 'MercadoLibre', 'AR', 'E-commerce'),
];

/** Macro backdrop: which already-scored index mirrors a country's stocks. */
export const COUNTRY_MACRO: Record<string, { asset: string; label: string }> = {
  US: { asset: 'US500', label: 'US Macro Backdrop (S&P 500 fundamentals)' },
  JP: { asset: 'JP225', label: 'Japan Macro Backdrop (Nikkei fundamentals)' },
  GB: { asset: 'UK100', label: 'UK Macro Backdrop (FTSE fundamentals)' },
  DE: { asset: 'GER40', label: 'Germany/Euro Macro Backdrop (DAX fundamentals)' },
  AU: { asset: 'AUS200', label: 'Australia Macro Backdrop (ASX fundamentals)' },
};

export interface BasketDef {
  symbol: string;
  name: string;
  region: Region | 'WORLD';
  desc: string;
  /** Members are picked from the universe (and the 14 SEC names) by this predicate. */
  pick: (s: UniverseStock) => boolean;
  /** Also include the 14 SEC-filing US names (US baskets). */
  withSecUs?: boolean;
}

const pkSector = (re: RegExp) => (s: UniverseStock) => s.region === 'PK' && re.test(s.sector);

export const BASKETS: BasketDef[] = [
  { symbol: 'KSE100', name: 'KSE-100 · Pakistan blue-chip basket', region: 'PK', desc: 'Average fundamental score of every tracked PSX blue chip that has live data (the heavyweights that drive the KSE-100). Not the official index weights.', pick: (s) => s.region === 'PK' },
  { symbol: 'PK-BANKS', name: 'PSX Banks', region: 'PK', desc: 'Pakistani listed banks.', pick: pkSector(/^Banks$/) },
  { symbol: 'PK-ENERGY', name: 'PSX Oil, Gas & Refining', region: 'PK', desc: 'E&P, OMCs, gas utilities and refineries.', pick: pkSector(/Oil|Gas|Refinery/) },
  { symbol: 'PK-FERT', name: 'PSX Fertilizer', region: 'PK', desc: 'Fertilizer producers.', pick: pkSector(/Fertilizer/) },
  { symbol: 'PK-CEMENT', name: 'PSX Cement', region: 'PK', desc: 'Cement producers.', pick: pkSector(/^Cement$/) },
  { symbol: 'PK-POWER', name: 'PSX Power', region: 'PK', desc: 'Independent power producers and utilities.', pick: pkSector(/^Power$/) },
  { symbol: 'PK-TECH', name: 'PSX Technology', region: 'PK', desc: 'Software and technology exporters.', pick: pkSector(/^Technology$/) },
  { symbol: 'PK-AUTO', name: 'PSX Autos', region: 'PK', desc: 'Car and tractor makers.', pick: pkSector(/^Autos$/) },
  { symbol: 'HK-TOP', name: 'Hong Kong / China leaders', region: 'ASIA', desc: 'Largest Hong Kong-listed names (Hang Seng heavyweights).', pick: (s) => s.c === 'HK' || s.c === 'CN' },
  { symbol: 'IN-TOP', name: 'India leaders (Nifty heavyweights)', region: 'ASIA', desc: 'Largest Indian companies.', pick: (s) => s.c === 'IN' },
  { symbol: 'JP-TOP', name: 'Japan leaders', region: 'ASIA', desc: 'Largest Japanese companies.', pick: (s) => s.c === 'JP' },
  { symbol: 'ASIA-TOP', name: 'Asia-Pacific leaders', region: 'ASIA', desc: 'All tracked Asia-Pacific and Middle-East blue chips.', pick: (s) => s.region === 'ASIA' },
  { symbol: 'EU-TOP', name: 'Europe leaders', region: 'EU', desc: 'Largest European companies.', pick: (s) => s.region === 'EU' },
  { symbol: 'US-MEGA', name: 'US mega-cap basket', region: 'US', desc: 'Largest US companies tracked (SEC filings + Yahoo).', pick: (s) => s.region === 'US', withSecUs: true },
  { symbol: 'WORLD-TOP', name: 'World leaders (all tracked)', region: 'WORLD', desc: 'Every tracked non-Pakistani company.', pick: (s) => s.region !== 'PK', withSecUs: true },
];
