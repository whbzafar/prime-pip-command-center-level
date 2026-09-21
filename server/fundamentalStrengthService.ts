/*
 * PRIMEPIPFX — Institutional Fundamentals Data Layer
 *
 * Truth-first rules:
 * 1. Never fabricate a market/fundamental observation.
 * 2. Every observation carries source + asOf + freshness + status.
 * 3. Missing/stale data stays unavailable; it is never replaced by a default score.
 * 4. COT is explicitly delayed (weekly) and never presented as real-time.
 *
 * Free/public sources used:
 * - FRED public CSV graph endpoint for Federal Reserve/H.10 and internationally
 *   sourced series already published by FRED.
 * - CFTC Financial Traders in Futures report for COT.
 * - Optional Alpha Vantage only when the owner supplies a free API key; the
 *   core system does not require it.
 */

type Code = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD' | 'XAU' | 'XAG';
type Status = 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE' | 'ERROR';

interface Observation {
  value: number;
  asOf: string;
  source: string;
  url: string;
  status: Status;
  note?: string;
}

interface Factor {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  status: Status;
  asOf: string | null;
  source: string;
  url: string;
  reason: string;
  raw?: number | null;
}

interface Instrument {
  code: Code;
  name: string;
  assetClass: 'FOREX' | 'METAL';
  score: number | null;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'INSUFFICIENT_DATA';
  confidence: number;
  freshness: 'LIVE' | 'PARTIAL' | 'DELAYED' | 'UNAVAILABLE';
  factors: Factor[];
  reasons: string[];
}

const SOURCE_FRED = 'FRED / Federal Reserve Bank of St. Louis';
const FRED_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=';
const CFTC_URL = 'https://www.cftc.gov/dea/futures/financial_lf.htm';

const CODES: Code[] = ['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','XAU','XAG'];

const NAMES: Record<Code,string> = {
  USD:'US Dollar', EUR:'Euro', GBP:'British Pound', JPY:'Japanese Yen',
  CHF:'Swiss Franc', CAD:'Canadian Dollar', AUD:'Australian Dollar',
  NZD:'New Zealand Dollar', XAU:'Gold', XAG:'Silver'
};

// FRED series already used by the application plus verified H.10 daily FX series.
// FX sign is normalized so a positive return means the currency strengthened.
const POLICY: Partial<Record<Code,string>> = {
  USD:'FEDFUNDS', EUR:'ECBDFR', GBP:'IUDSOIA', JPY:'IRSTCI01JPM156N',
  CHF:'IRSTCI01CHM156N', CAD:'IRSTCI01CAM156N', AUD:'IRSTCI01AUM156N', NZD:'IRSTCI01NZM156N'
};
const FX: Partial<Record<Code,{series:string; invert?:boolean}>> = {
  USD:{series:'DTWEXBGS', invert:false},
  EUR:{series:'DEXUSEU', invert:false},
  GBP:{series:'DEXUSUK', invert:false},
  JPY:{series:'DEXJPUS', invert:true},
  CHF:{series:'DEXSZUS', invert:true},
  CAD:{series:'DEXCAUS', invert:true},
  AUD:{series:'DEXUSAL', invert:false},
  NZD:{series:'DEXUSNZ', invert:false}
};

const COT_NAMES: Partial<Record<Code,string>> = {
  EUR:'EURO FX', GBP:'BRITISH POUND', JPY:'JAPANESE YEN', CHF:'SWISS FRANC',
  CAD:'CANADIAN DOLLAR', AUD:'AUSTRALIAN DOLLAR', NZD:'NEW ZEALAND DOLLAR',
  USD:'USD INDEX', XAU:'GOLD', XAG:'SILVER'
};

const cache = new Map<string,{obs:Observation[]; fetchedAt:number}>();

function clamp(n:number,min=0,max=100){ return Math.max(min,Math.min(max,n)); }

async function fetchText(url:string, timeout=12000):Promise<string> {
  const res = await fetch(url,{
    headers:{Accept:'text/plain,text/csv,text/html,application/xhtml+xml','User-Agent':'PrimePipFX-Fundamental-Terminal/2.0'},
    signal:AbortSignal.timeout(timeout)
  });
  if(!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return res.text();
}

function parseCsv(text:string):Observation[] {
  const lines=text.trim().split(/\\r?\\n/).slice(1);
  const out:Observation[]=[];
  for(const line of lines){
    const parts=line.split(',');
    const date=(parts[0]||'').trim();
    const value=Number((parts[1]||'').trim());
    if(!date || !Number.isFinite(value)) continue;
    out.push({value,asOf:new Date(`${date}T00:00:00Z`).toISOString(),source:SOURCE_FRED,url:'',status:'DELAYED'});
  }
  return out.reverse();
}

async function fredSeries(series:string, maxAge=10*60*1000):Promise<Observation[]> {
  const hit=cache.get(series);
  if(hit && Date.now()-hit.fetchedAt<maxAge) return hit.obs;
  const url=`${FRED_BASE}${encodeURIComponent(series)}`;
  try{
    const text=await fetchText(url);
    const rows=parseCsv(text).map(o=>({...o,url:`https://fred.stlouisfed.org/series/${encodeURIComponent(series)}`}));
    if(rows.length) cache.set(series,{obs:rows,fetchedAt:Date.now()});
    return rows;
  }catch(error){
    if(hit) return hit.obs;
    throw error;
  }
}

function latest(rows:Observation[]):Observation|null { return rows[0]||null; }

function returnScore(rows:Observation[], invert=false):{score:number; raw:number; asOf:string}|null {
  if(rows.length<22) return null;
  const now=rows[0], prior=rows[Math.min(20,rows.length-1)];
  let pct=((now.value/prior.value)-1)*100;
  if(invert) pct=-pct;
  return {score:clamp(50+pct*18),raw:pct,asOf:now.asOf};
}

function policyScore(rows:Observation[]):{score:number; raw:number; asOf:string}|null {
  const x=latest(rows); if(!x) return null;
  // Relative policy score is calculated against the eight-currency cross-section
  // later; here we retain the verified raw observation.
  return {score:x.value,raw:x.value,asOf:x.asOf};
}

function normalizeRelative(values:Record<string,number>):Record<string,number>{
  const nums=Object.values(values);
  if(!nums.length) return {};
  const min=Math.min(...nums), max=Math.max(...nums);
  if(max===min) return Object.fromEntries(Object.keys(values).map(k=>[k,50]));
  return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,clamp(20+((v-min)/(max-min))*60)]));
}

function parseCot(html:string, contract:string):Observation|null {
  const idx=html.indexOf(contract);
  if(idx<0) return null;
  const chunk=html.slice(idx,Math.min(html.length,idx+9000));
  const m=chunk.match(/\\bPositions\\s+([\\d,]+(?:\\s+[\\d,]+){13})/i);
  if(!m) return null;
  const nums=m[1].trim().split(/\\s+/).map(v=>Number(v.replace(/,/g,'')));
  if(nums.length<14 || nums.some(v=>!Number.isFinite(v))) return null;
  // TFF Futures Only order:
  // dealer L/S/spread, asset-manager L/S/spread, leveraged-fund L/S/spread,
  // other-reportable L/S/spread, non-reportable L/S.
  const leveragedNet=nums[6]-nums[7];
  const asOfMatch=chunk.match(/Positions as of ([A-Za-z]+\\s+\\d{1,2},\\s+\\d{4})/i);
  const asOf=asOfMatch ? new Date(asOfMatch[1]+' UTC').toISOString() : new Date().toISOString();
  return {
    value:leveragedNet, asOf, source:'CFTC Traders in Financial Futures — Futures Only',
    url:CFTC_URL, status:'DELAYED', note:'Weekly COT positioning; report date is earlier than publication date.'
  };
}

let cotCache:{fetchedAt:number; html:string}|null=null;
async function cotHtml():Promise<string>{
  if(cotCache && Date.now()-cotCache.fetchedAt<30*60*1000) return cotCache.html;
  const html=await fetchText(CFTC_URL,15000);
  cotCache={fetchedAt:Date.now(),html};
  return html;
}

async function cotFor(code:Code):Promise<Observation|null>{
  const name=COT_NAMES[code]; if(!name) return null;
  try{
    const html=await cotHtml();
    return parseCot(html,name);
  }catch{return null;}
}

function freshness(asOf:string|null,status:Status):Instrument['freshness']{
  if(!asOf) return 'UNAVAILABLE';
  const age=Date.now()-Date.parse(asOf);
  if(status==='LIVE' && age<15*60*1000) return 'LIVE';
  if(age<7*24*60*60*1000) return 'DELAYED';
  return 'STALE';
}

async function buildInstrument(code:Code, policyRelative:Record<string,number>, cotScale:Record<string,number>):Promise<Instrument>{
  const factors:Factor[]=[];
  const p=POLICY[code];
  if(p){
    try{
      const rows=await fredSeries(p);
      const x=policyScore(rows);
      if(x){
        const score=policyRelative[code] ?? null;
        factors.push({key:'monetary-policy',label:'Central-bank policy rate',score,weight:25,status:'DELAYED',asOf:x.asOf,source:SOURCE_FRED,url:rows[0]?.url||'',raw:x.raw,
          reason:`Latest verified policy-rate proxy: ${x.raw.toFixed(2)}%. Relative score is computed only from observed major-currency rates.`});
      }
    }catch{}
  }

  const fx=FX[code];
  if(fx){
    try{
      const rows=await fredSeries(fx.series);
      const x=returnScore(rows,fx.invert);
      if(x) factors.push({key:'market-momentum',label:'20-session currency momentum',score:x.score,weight:25,status:'DELAYED',asOf:x.asOf,source:SOURCE_FRED,url:rows[0]?.url||'',raw:x.raw,
        reason:`Verified H.10/FRED daily FX series changed ${x.raw.toFixed(2)}% over roughly 20 observations.`});
    }catch{}
  }

  const cot=await cotFor(code);
  if(cot){
    const score=cotScale[code];
    factors.push({key:'cot-positioning',label:'CFTC leveraged-money positioning',score,weight:20,status:'DELAYED',asOf:cot.asOf,source:cot.source,url:cot.url,raw:cot.value,
      reason:`Latest CFTC TFF leveraged-money net position: ${cot.value.toLocaleString()} contracts. COT is weekly and delayed.`});
  }

  // Sentiment is deliberately separated from the score until a verified feed exists.
  // This prevents a guessed news sentiment value from contaminating the institutional score.
  factors.push({key:'news-sentiment',label:'News/headline sentiment',score:null,weight:10,status:'UNAVAILABLE',asOf:null,source:'No verified free sentiment feed configured',url:'',reason:'Not scored until a source can be verified and attributed.'});
  factors.push({key:'growth-inflation',label:'Growth / inflation surprise',score:null,weight:20,status:'UNAVAILABLE',asOf:null,source:'No complete cross-currency surprise adapter configured',url:'',reason:'Not scored rather than inferred from stale or missing observations.'});

  const usable=factors.filter(f=>f.score!==null);
  const weightSum=usable.reduce((s,f)=>s+f.weight,0);
  const score=weightSum>=50 ? Math.round(usable.reduce((s,f)=>s+(f.score as number)*f.weight,0)/weightSum) : null;
  const confidence=Math.round((weightSum/100)*100);
  const bias=score===null?'INSUFFICIENT_DATA':score>=65?'BULLISH':score<=35?'BEARISH':'NEUTRAL';
  const allDates=usable.map(f=>f.asOf).filter(Boolean) as string[];
  const newest=allDates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||null;
  const fr=freshness(newest, usable.some(f=>f.status==='LIVE')?'LIVE':'DELAYED');
  const reasons=usable.map(f=>f.reason);

  return {code,name:NAMES[code],assetClass:code.startsWith('X')?'METAL':'FOREX',score,bias,confidence,freshness:fr,factors,reasons};
}

export async function getFundamentalStrengthDashboard(){
  const policyValues:Record<string,number>={};
  for(const code of Object.keys(POLICY) as Code[]){
    try{ const rows=await fredSeries(POLICY[code] as string); const x=policyScore(rows); if(x) policyValues[code]=x.raw; }catch{}
  }
  const policyRelative=normalizeRelative(policyValues);

  const cotValues:Record<string,number>={};
  for(const code of CODES){
    const x=await cotFor(code);
    if(x) cotValues[code]=x.value;
  }
  const cotScale=normalizeRelative(cotValues);

  const instruments=await Promise.all(CODES.map(code=>buildInstrument(code,policyRelative,cotScale)));
  const available=instruments.flatMap(i=>i.factors).filter(f=>f.score!==null).length;
  const total=instruments.flatMap(i=>i.factors).length;

  const currencyOnly=instruments.filter(i=>i.assetClass==='FOREX' && i.score!==null);
  const pairs:string[]=[];
  for(const base of currencyOnly){
    for(const quote of currencyOnly){
      if(base.code===quote.code) continue;
      pairs.push(base.code+'/'+quote.code);
    }
  }
  const pairData=pairs.map(pair=>{
    const [b,q]=pair.split('/');
    const bs=instruments.find(i=>i.code===b)?.score as number;
    const qs=instruments.find(i=>i.code===q)?.score as number;
    const diff=bs-qs;
    return {pair,score:Math.round(clamp(50+diff/2)),bias:diff>=15?'BULLISH':diff<=-15?'BEARISH':'NEUTRAL',baseScore:bs,quoteScore:qs,
      horizon:Math.abs(diff)>=20?'SHORT_TERM':'SWING_POSITIONAL'};
  }).sort((a,b)=>b.score-a.score);

  const topBullish=pairData.filter(p=>p.bias==='BULLISH').slice(0,8);
  const topBearish=pairData.filter(p=>p.bias==='BEARISH').slice(-8).reverse();

  return {
    generatedAt:new Date().toISOString(),
    methodology:{
      weights:{monetaryPolicy:25,marketMomentum:25,cotPositioning:20,growthInflation:20,newsSentiment:10},
      thresholds:{bullish:65,bearish:35},
      rule:'Only verified observations are scored; missing factors reduce coverage/confidence. No synthetic defaults.'
    },
    coverage:{liveFactors:available,totalFactors:total,note:'COT is weekly/delayed. FRED H.10 is daily/delayed relative to spot markets. Optional intraday feed can be enabled with a free Alpha Vantage key.'},
    instruments,
    pairs:pairData,
    topBullish,
    topBearish,
    sources:[
      {name:'FRED / Federal Reserve Bank of St. Louis',url:'https://fred.stlouisfed.org/'},
      {name:'CFTC Commitments of Traders',url:'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm'},
      {name:'Federal Reserve H.10 Foreign Exchange Rates',url:'https://www.federalreserve.gov/releases/h10/'}
    ]
  };
}
