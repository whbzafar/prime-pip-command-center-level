/**
 * Market reference directory — Pakistan (PSX) and world indices & major stocks.
 * This is a SEARCHABLE CATALOG (names, sectors, what each is), with a link to the authoritative
 * live source for each. It is NOT a live per-stock fundamentals feed: PSX has no free programmatic
 * fundamentals API, so each PSX entry links to its official PSX page for live numbers.
 * PSX constituents change every re-composition; the authoritative current list is always on psx.com.pk.
 */
export type Kind = 'index' | 'stock';
export interface MktEntry { sym: string; name: string; kind: Kind; market: string; sector: string; note?: string; url: string }

const psx = (sym: string) => `https://dps.psx.com.pk/company/${sym}`;

export const PK_INDICES: MktEntry[] = [
  { sym: 'KSE100', name: 'KSE-100 Index', kind: 'index', market: 'PSX', sector: 'Benchmark', note: '100 largest companies by free-float across sectors — the main benchmark.', url: 'https://dps.psx.com.pk/indices' },
  { sym: 'KSE30', name: 'KSE-30 Index', kind: 'index', market: 'PSX', sector: 'Large cap', note: '30 most liquid large-cap companies (free-float weighted).', url: 'https://dps.psx.com.pk/indices' },
  { sym: 'KMI30', name: 'KMI-30 Index', kind: 'index', market: 'PSX', sector: 'Shariah', note: '30 largest Shariah-compliant (Islamic) companies.', url: 'https://dps.psx.com.pk/indices' },
  { sym: 'KMIALLSHR', name: 'KMI All-Share Index', kind: 'index', market: 'PSX', sector: 'Shariah', note: 'All Shariah-compliant listed companies.', url: 'https://dps.psx.com.pk/indices' },
  { sym: 'ALLSHR', name: 'PSX All-Share Index', kind: 'index', market: 'PSX', sector: 'Broad', note: 'The entire listed market.', url: 'https://dps.psx.com.pk/indices' },
  { sym: 'PSXDIV20', name: 'PSX Dividend 20 Index', kind: 'index', market: 'PSX', sector: 'Dividend', note: '20 highest dividend-yielding companies.', url: 'https://dps.psx.com.pk/indices' },
  { sym: 'BKTi', name: 'PSX Banking (BKTi)', kind: 'index', market: 'PSX', sector: 'Banks', note: 'Sector index for banks.', url: 'https://dps.psx.com.pk/indices' },
];

// Representative PSX blue chips by sector. Not exhaustive — the live, complete list is on psx.com.pk.
export const PK_STOCKS: MktEntry[] = [
  // Oil & Gas – Exploration
  { sym: 'OGDC', name: 'Oil & Gas Development Co.', kind: 'stock', market: 'PSX', sector: 'E&P (Oil & Gas)', url: psx('OGDC') },
  { sym: 'PPL', name: 'Pakistan Petroleum Ltd', kind: 'stock', market: 'PSX', sector: 'E&P (Oil & Gas)', url: psx('PPL') },
  { sym: 'POL', name: 'Pakistan Oilfields Ltd', kind: 'stock', market: 'PSX', sector: 'E&P (Oil & Gas)', url: psx('POL') },
  { sym: 'MARI', name: 'Mari Petroleum Co.', kind: 'stock', market: 'PSX', sector: 'E&P (Oil & Gas)', url: psx('MARI') },
  // Oil marketing / refining
  { sym: 'PSO', name: 'Pakistan State Oil', kind: 'stock', market: 'PSX', sector: 'Oil Marketing', url: psx('PSO') },
  { sym: 'APL', name: 'Attock Petroleum Ltd', kind: 'stock', market: 'PSX', sector: 'Oil Marketing', url: psx('APL') },
  { sym: 'SHEL', name: 'Shell Pakistan Ltd', kind: 'stock', market: 'PSX', sector: 'Oil Marketing', url: psx('SHEL') },
  { sym: 'ATRL', name: 'Attock Refinery Ltd', kind: 'stock', market: 'PSX', sector: 'Refinery', url: psx('ATRL') },
  // Banks
  { sym: 'HBL', name: 'Habib Bank Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('HBL') },
  { sym: 'UBL', name: 'United Bank Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('UBL') },
  { sym: 'MCB', name: 'MCB Bank Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('MCB') },
  { sym: 'NBP', name: 'National Bank of Pakistan', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('NBP') },
  { sym: 'MEBL', name: 'Meezan Bank Ltd', kind: 'stock', market: 'PSX', sector: 'Banks (Islamic)', url: psx('MEBL') },
  { sym: 'BAFL', name: 'Bank Alfalah Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('BAFL') },
  { sym: 'BAHL', name: 'Bank AL Habib Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('BAHL') },
  { sym: 'AKBL', name: 'Askari Bank Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('AKBL') },
  { sym: 'FABL', name: 'Faysal Bank Ltd', kind: 'stock', market: 'PSX', sector: 'Banks', url: psx('FABL') },
  // Fertilizer / Chemicals
  { sym: 'ENGRO', name: 'Engro Corporation Ltd', kind: 'stock', market: 'PSX', sector: 'Conglomerate / Fertilizer', url: psx('ENGRO') },
  { sym: 'FFC', name: 'Fauji Fertilizer Co.', kind: 'stock', market: 'PSX', sector: 'Fertilizer', url: psx('FFC') },
  { sym: 'EFERT', name: 'Engro Fertilizers Ltd', kind: 'stock', market: 'PSX', sector: 'Fertilizer', url: psx('EFERT') },
  { sym: 'FATIMA', name: 'Fatima Fertilizer Co.', kind: 'stock', market: 'PSX', sector: 'Fertilizer', url: psx('FATIMA') },
  { sym: 'EPCL', name: 'Engro Polymer & Chemicals', kind: 'stock', market: 'PSX', sector: 'Chemicals', url: psx('EPCL') },
  { sym: 'LOTCHEM', name: 'Lotte Chemical Pakistan', kind: 'stock', market: 'PSX', sector: 'Chemicals', url: psx('LOTCHEM') },
  // Cement
  { sym: 'LUCK', name: 'Lucky Cement Ltd', kind: 'stock', market: 'PSX', sector: 'Cement', url: psx('LUCK') },
  { sym: 'DGKC', name: 'D.G. Khan Cement Co.', kind: 'stock', market: 'PSX', sector: 'Cement', url: psx('DGKC') },
  { sym: 'MLCF', name: 'Maple Leaf Cement Factory', kind: 'stock', market: 'PSX', sector: 'Cement', url: psx('MLCF') },
  { sym: 'FCCL', name: 'Fauji Cement Co.', kind: 'stock', market: 'PSX', sector: 'Cement', url: psx('FCCL') },
  { sym: 'KOHC', name: 'Kohat Cement Co.', kind: 'stock', market: 'PSX', sector: 'Cement', url: psx('KOHC') },
  { sym: 'CHCC', name: 'Cherat Cement Co.', kind: 'stock', market: 'PSX', sector: 'Cement', url: psx('CHCC') },
  // Power
  { sym: 'HUBC', name: 'Hub Power Co. (HUBCO)', kind: 'stock', market: 'PSX', sector: 'Power', url: psx('HUBC') },
  { sym: 'KAPCO', name: 'Kot Addu Power Co.', kind: 'stock', market: 'PSX', sector: 'Power', url: psx('KAPCO') },
  { sym: 'NPL', name: 'Nishat Power Ltd', kind: 'stock', market: 'PSX', sector: 'Power', url: psx('NPL') },
  // Technology / Telecom
  { sym: 'SYS', name: 'Systems Ltd', kind: 'stock', market: 'PSX', sector: 'Technology', url: psx('SYS') },
  { sym: 'AVN', name: 'Avanceon Ltd', kind: 'stock', market: 'PSX', sector: 'Technology', url: psx('AVN') },
  { sym: 'TRG', name: 'TRG Pakistan Ltd', kind: 'stock', market: 'PSX', sector: 'Technology', url: psx('TRG') },
  { sym: 'PTC', name: 'Pakistan Telecommunication (PTCL)', kind: 'stock', market: 'PSX', sector: 'Telecom', url: psx('PTC') },
  { sym: 'AIRLINK', name: 'Air Link Communication', kind: 'stock', market: 'PSX', sector: 'Technology', url: psx('AIRLINK') },
  // Consumer / Food
  { sym: 'NESTLE', name: 'Nestlé Pakistan Ltd', kind: 'stock', market: 'PSX', sector: 'Food & Consumer', url: psx('NESTLE') },
  { sym: 'COLG', name: 'Colgate-Palmolive Pakistan', kind: 'stock', market: 'PSX', sector: 'Consumer', url: psx('COLG') },
  { sym: 'NATF', name: 'National Foods Ltd', kind: 'stock', market: 'PSX', sector: 'Food & Consumer', url: psx('NATF') },
  { sym: 'PKGS', name: 'Packages Ltd', kind: 'stock', market: 'PSX', sector: 'Packaging', url: psx('PKGS') },
  // Autos
  { sym: 'INDU', name: 'Indus Motor Co. (Toyota)', kind: 'stock', market: 'PSX', sector: 'Autos', url: psx('INDU') },
  { sym: 'HCAR', name: 'Honda Atlas Cars Pakistan', kind: 'stock', market: 'PSX', sector: 'Autos', url: psx('HCAR') },
  { sym: 'MTL', name: 'Millat Tractors Ltd', kind: 'stock', market: 'PSX', sector: 'Autos', url: psx('MTL') },
  // Textile
  { sym: 'ILP', name: 'Interloop Ltd', kind: 'stock', market: 'PSX', sector: 'Textile', url: psx('ILP') },
  { sym: 'NML', name: 'Nishat Mills Ltd', kind: 'stock', market: 'PSX', sector: 'Textile', url: psx('NML') },
  { sym: 'GATM', name: 'Gul Ahmed Textile Mills', kind: 'stock', market: 'PSX', sector: 'Textile', url: psx('GATM') },
  // Pharma
  { sym: 'SEARL', name: 'The Searle Company Ltd', kind: 'stock', market: 'PSX', sector: 'Pharma', url: psx('SEARL') },
  { sym: 'ABOT', name: 'Abbott Laboratories Pakistan', kind: 'stock', market: 'PSX', sector: 'Pharma', url: psx('ABOT') },
  { sym: 'AGP', name: 'AGP Ltd', kind: 'stock', market: 'PSX', sector: 'Pharma', url: psx('AGP') },
  { sym: 'HINOON', name: 'Highnoon Laboratories Ltd', kind: 'stock', market: 'PSX', sector: 'Pharma', url: psx('HINOON') },
  // Steel
  { sym: 'MUGHAL', name: 'Mughal Iron & Steel Industries', kind: 'stock', market: 'PSX', sector: 'Steel', url: psx('MUGHAL') },
  { sym: 'ASTL', name: 'Amreli Steels Ltd', kind: 'stock', market: 'PSX', sector: 'Steel', url: psx('ASTL') },
  { sym: 'ISL', name: 'International Steels Ltd', kind: 'stock', market: 'PSX', sector: 'Steel', url: psx('ISL') },
];

const yf = (s: string) => `https://finance.yahoo.com/quote/${encodeURIComponent(s)}`;

export const WORLD_INDICES: MktEntry[] = [
  { sym: 'SPX', name: 'S&P 500', kind: 'index', market: 'US', sector: 'US large cap', url: yf('%5EGSPC') },
  { sym: 'NDX', name: 'Nasdaq-100', kind: 'index', market: 'US', sector: 'US tech', url: yf('%5ENDX') },
  { sym: 'DJI', name: 'Dow Jones Industrial Average', kind: 'index', market: 'US', sector: 'US blue chip', url: yf('%5EDJI') },
  { sym: 'RUT', name: 'Russell 2000', kind: 'index', market: 'US', sector: 'US small cap', url: yf('%5ERUT') },
  { sym: 'UKX', name: 'FTSE 100', kind: 'index', market: 'UK', sector: 'UK large cap', url: yf('%5EFTSE') },
  { sym: 'DAX', name: 'DAX 40', kind: 'index', market: 'Germany', sector: 'German large cap', url: yf('%5EGDAXI') },
  { sym: 'CAC', name: 'CAC 40', kind: 'index', market: 'France', sector: 'French large cap', url: yf('%5EFCHI') },
  { sym: 'SX5E', name: 'Euro Stoxx 50', kind: 'index', market: 'Europe', sector: 'Eurozone large cap', url: yf('%5ESTOXX50E') },
  { sym: 'N225', name: 'Nikkei 225', kind: 'index', market: 'Japan', sector: 'Japan large cap', url: yf('%5EN225') },
  { sym: 'HSI', name: 'Hang Seng', kind: 'index', market: 'Hong Kong', sector: 'HK large cap', url: yf('%5EHSI') },
  { sym: 'SSEC', name: 'Shanghai Composite', kind: 'index', market: 'China', sector: 'China broad', url: yf('%5ESSEC') },
  { sym: 'NIFTY', name: 'Nifty 50', kind: 'index', market: 'India', sector: 'India large cap', url: yf('%5ENSEI') },
  { sym: 'SENSEX', name: 'BSE Sensex', kind: 'index', market: 'India', sector: 'India large cap', url: yf('%5EBSESN') },
  { sym: 'KOSPI', name: 'KOSPI', kind: 'index', market: 'South Korea', sector: 'Korea large cap', url: yf('%5EKS11') },
  { sym: 'AXJO', name: 'S&P/ASX 200', kind: 'index', market: 'Australia', sector: 'Australia large cap', url: yf('%5EAXJO') },
  { sym: 'GSPTSE', name: 'S&P/TSX Composite', kind: 'index', market: 'Canada', sector: 'Canada broad', url: yf('%5EGSPTSE') },
];

export const WORLD_STOCKS: MktEntry[] = [
  { sym: 'AAPL', name: 'Apple Inc.', kind: 'stock', market: 'US', sector: 'Technology', url: yf('AAPL') },
  { sym: 'MSFT', name: 'Microsoft Corp.', kind: 'stock', market: 'US', sector: 'Technology', url: yf('MSFT') },
  { sym: 'NVDA', name: 'NVIDIA Corp.', kind: 'stock', market: 'US', sector: 'Semiconductors', url: yf('NVDA') },
  { sym: 'GOOGL', name: 'Alphabet (Google)', kind: 'stock', market: 'US', sector: 'Technology', url: yf('GOOGL') },
  { sym: 'AMZN', name: 'Amazon.com Inc.', kind: 'stock', market: 'US', sector: 'Consumer / Cloud', url: yf('AMZN') },
  { sym: 'META', name: 'Meta Platforms', kind: 'stock', market: 'US', sector: 'Technology', url: yf('META') },
  { sym: 'TSLA', name: 'Tesla Inc.', kind: 'stock', market: 'US', sector: 'Autos / Energy', url: yf('TSLA') },
  { sym: 'BRK-B', name: 'Berkshire Hathaway', kind: 'stock', market: 'US', sector: 'Conglomerate', url: yf('BRK-B') },
  { sym: 'AVGO', name: 'Broadcom Inc.', kind: 'stock', market: 'US', sector: 'Semiconductors', url: yf('AVGO') },
  { sym: 'JPM', name: 'JPMorgan Chase', kind: 'stock', market: 'US', sector: 'Banks', url: yf('JPM') },
  { sym: 'V', name: 'Visa Inc.', kind: 'stock', market: 'US', sector: 'Payments', url: yf('V') },
  { sym: 'LLY', name: 'Eli Lilly & Co.', kind: 'stock', market: 'US', sector: 'Pharma', url: yf('LLY') },
  { sym: 'TSM', name: 'TSMC (ADR)', kind: 'stock', market: 'US / Taiwan', sector: 'Semiconductors', url: yf('TSM') },
  { sym: '2222.SR', name: 'Saudi Aramco', kind: 'stock', market: 'Saudi (Tadawul)', sector: 'Energy', url: yf('2222.SR') },
  { sym: 'NESN.SW', name: 'Nestlé S.A.', kind: 'stock', market: 'Switzerland', sector: 'Food & Consumer', url: yf('NESN.SW') },
  { sym: 'RELIANCE.NS', name: 'Reliance Industries', kind: 'stock', market: 'India', sector: 'Conglomerate', url: yf('RELIANCE.NS') },
];

export const ALL_MARKETS: MktEntry[] = [...PK_INDICES, ...PK_STOCKS, ...WORLD_INDICES, ...WORLD_STOCKS];
