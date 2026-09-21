/* PrimePipFX institutional fundamentals — truth-first, Vercel-safe data layer. */
type Code='USD'|'EUR'|'GBP'|'JPY'|'CHF'|'CAD'|'AUD'|'NZD'|'XAU'|'XAG';
type Status='LIVE'|'DELAYED'|'STALE'|'UNAVAILABLE'|'ERROR';
interface Observation{value:number;asOf:string;source:string;url:string;status:Status;note?:string}
interface Factor{key:string;label:string;score:number|null;weight:number;status:Status;asOf:string|null;source:string;url:string;reason:string;raw?:number|null}
interface Instrument{code:Code;name:string;assetClass:'FOREX'|'METAL';score:number|null;bias:'BULLISH'|'BEARISH'|'NEUTRAL'|'INSUFFICIENT_DATA';confidence:number;freshness:'LIVE'|'PARTIAL'|'DELAYED'|'UNAVAILABLE';factors:Factor[];reasons:string[]}

const SOURCE_FRED='FRED / Federal Reserve Bank of St. Louis';
const FRED_BASE='https://fred.stlouisfed.org/graph/fredgraph.csv?id=';
const CFTC_URL='https://www.cftc.gov/dea/futures/financial_lf.htm';
const CODES:Code[]=['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','XAU','XAG'];
const NAMES:Record<Code,string>={USD:'US Dollar',EUR:'Euro',GBP:'British Pound',JPY:'Japanese Yen',CHF:'Swiss Franc',CAD:'Canadian Dollar',AUD:'Australian Dollar',NZD:'New Zealand Dollar',XAU:'Gold',XAG:'Silver'};
const POLICY:Partial<Record<Code,string>>={USD:'FEDFUNDS',EUR:'ECBDFR',GBP:'IUDSOIA',JPY:'IRSTCI01JPM156N',CHF:'IRSTCI01CHM156N',CAD:'IRSTCI01CAM156N',AUD:'IRSTCI01AUM156N',NZD:'IRSTCI01NZM156N'};
const FX:Partial<Record<Code,{series:string;invert?:boolean}>>={USD:{series:'DTWEXBGS'},EUR:{series:'DEXUSEU'},GBP:{series:'DEXUSUK'},JPY:{series:'DEXJPUS',invert:true},CHF:{series:'DEXSZUS',invert:true},CAD:{series:'DEXCAUS',invert:true},AUD:{series:'DEXUSAL'},NZD:{series:'DEXUSNZ'}};
const COT_NAMES:Partial<Record<Code,string>>={EUR:'EURO FX',GBP:'BRITISH POUND',JPY:'JAPANESE YEN',CHF:'SWISS FRANC',CAD:'CANADIAN DOLLAR',AUD:'AUSTRALIAN DOLLAR',NZD:'NEW ZEALAND DOLLAR',USD:'USD INDEX',XAU:'GOLD',XAG:'SILVER'};
const cache=new Map<string,{rows:Observation[];at:number}>();
let cotCache:{html:string;at:number}|null=null;
const sentimentCache=new Map<string,{score:number;asOf:string;headlines:string[];at:number}>();

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
async function fetchText(url:string,ms=9000){
  const r=await fetch(url,{headers:{Accept:'text/plain,text/csv,text/html,application/xhtml+xml','User-Agent':'PrimePipFX-Fundamental-Terminal/2.1'},signal:AbortSignal.timeout(ms)});
  if(!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).hostname}`);
  return r.text();
}
function parseCsv(text:string):Observation[]{
  const out:Observation[]=[];
  for(const line of text.trim().split(/\r?\n/).slice(1)){
    const [date,raw]=line.split(',');
    const value=Number(raw?.trim());
    if(date&&Number.isFinite(value)) out.push({value,asOf:new Date(date.trim()+'T00:00:00Z').toISOString(),source:SOURCE_FRED,url:'',status:'DELAYED'});
  }
  return out.reverse();
}
async function fredSeries(series:string):Promise<Observation[]>{
  const hit=cache.get(series);
  if(hit&&Date.now()-hit.at<10*60*1000) return hit.rows;
  const url=FRED_BASE+encodeURIComponent(series);
  const rows=parseCsv(await fetchText(url)).map(x=>({...x,url:'https://fred.stlouisfed.org/series/'+encodeURIComponent(series)}));
  if(rows.length) cache.set(series,{rows,at:Date.now()});
  return rows;
}
function latest(rows:Observation[]){return rows[0]||null}
function momentum(rows:Observation[],invert=false){
  if(rows.length<2)return null;
  const now=rows[0],prior=rows[Math.min(20,rows.length-1)];
  let pct=(now.value/prior.value-1)*100;if(invert)pct=-pct;
  return {score:clamp(50+pct*18),raw:pct,asOf:now.asOf};
}
function normalize(v:Record<string,number>){
  const a=Object.values(v);if(!a.length)return {};
  const lo=Math.min(...a),hi=Math.max(...a);
  return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,hi===lo?50:clamp(20+(x-lo)/(hi-lo)*60)]));
}
function parseCot(html:string,contract:string):Observation|null{
  const i=html.toUpperCase().indexOf(contract.toUpperCase());if(i<0)return null;
  const chunk=html.slice(i,i+10000);
  const m=chunk.match(/Positions\s+([\d,]+(?:\s+[\d,]+){13})/i);if(!m)return null;
  const n=m[1].trim().split(/\s+/).map(x=>Number(x.replace(/,/g,'')));if(n.length<14||n.some(x=>!Number.isFinite(x)))return null;
  const net=n[6]-n[7];
  const d=chunk.match(/Positions as of ([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  return {value:net,asOf:d?new Date(d[1]+' UTC').toISOString():new Date().toISOString(),source:'CFTC Traders in Financial Futures — Futures Only',url:CFTC_URL,status:'DELAYED',note:'Weekly COT; positions are delayed.'};
}
async function getCotMap(){
  if(cotCache&&Date.now()-cotCache.at<30*60*1000)return cotCache.html;
  const html=await fetchText(CFTC_URL,12000);cotCache={html,at:Date.now()};return html;
}
function tone(t:string){const x=t.toLowerCase();const p=['beat','strong','growth','hawkish','surge','rises','bullish','support','improves','expands','upgrade'];const n=['miss','weak','recession','dovish','falls','bearish','cuts','downgrade','risk','slows','contraction','crisis'];return p.filter(w=>x.includes(w)).length-n.filter(w=>x.includes(w)).length}
function strip(s:string){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()}
async function headlineSentiment(code:Code){
  const h=sentimentCache.get(code);if(h&&Date.now()-h.at<10*60*1000)return h;
  const url='https://news.google.com/rss/search?q='+encodeURIComponent(`${code} currency forex economy central bank`)+'&hl=en-US&gl=US&ceid=US:en';
  try{
    const xml=await fetchText(url,8000);
    const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,12);
    const headlines=items.map(m=>strip(m[1].match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'')).filter(Boolean);
    if(!headlines.length)return null;
    const result={score:clamp(50+headlines.reduce((s,x)=>s+tone(x),0)*7),asOf:new Date().toISOString(),headlines,at:Date.now()};
    sentimentCache.set(code,result);return result;
  }catch{return null}
}
function freshness(d:string|null):Instrument['freshness']{
  if(!d)return 'UNAVAILABLE';const age=Date.now()-Date.parse(d);
  return age<15*60*1000?'LIVE':age<7*24*60*60*1000?'DELAYED':'STALE';
}

export async function getFundamentalStrengthDashboard(){
  // All external feeds are fetched concurrently. This prevents the previous sequential
  // 20+ network calls from exceeding Vercel's serverless execution window.
  const policyEntries=await Promise.all(Object.entries(POLICY).map(async([code,series])=>{
    try{const rows=await fredSeries(series!);const x=latest(rows);return [code,x?.value??null,x?.asOf??null,rows[0]?.url??''] as const}catch{return [code,null,null,''] as const}
  }));
  const policyRaw=Object.fromEntries(policyEntries.filter(x=>x[1]!==null).map(x=>[x[0],x[1] as number]));
  const policyRel=normalize(policyRaw);

  let cotHtml='';
  try{cotHtml=await getCotMap()}catch{}
  const cotEntries=await Promise.all(CODES.map(async code=>{
    const name=COT_NAMES[code];const obs=name&&cotHtml?parseCot(cotHtml,name):null;return [code,obs] as const;
  }));
  const cotObs=Object.fromEntries(cotEntries.filter(x=>x[1]).map(x=>[x[0],x[1]!])) as Record<string,Observation>;
  const cotScale=normalize(Object.fromEntries(Object.entries(cotObs).map(([k,v])=>[k,v.value])));

  const fxEntries=await Promise.all(Object.entries(FX).map(async([code,meta])=>{
    try{return [code,momentum(await fredSeries(meta!.series),meta!.invert)] as const}catch{return [code,null] as const}
  }));
  const fxMap=Object.fromEntries(fxEntries);

  const sentimentEntries=await Promise.all(CODES.map(async code=>[code,await headlineSentiment(code)] as const));
  const sentMap=Object.fromEntries(sentimentEntries);

  const instruments:Instrument[]=CODES.map(code=>{
    const factors:Factor[]=[];
    const pr=policyEntries.find(x=>x[0]===code);
    if(pr?.[1]!==null) factors.push({key:'monetary-policy',label:'Central-bank policy rate',score:policyRel[code]??null,weight:25,status:'DELAYED',asOf:pr[2],source:SOURCE_FRED,url:pr[3],raw:pr[1],reason:`Latest verified policy-rate observation: ${Number(pr[1]).toFixed(2)}. Relative score uses the observed major-currency cross-section.`});
    const fm=fxMap[code] as ReturnType<typeof momentum>;
    if(fm) factors.push({key:'market-momentum',label:'20-session currency momentum',score:fm.score,weight:25,status:'DELAYED',asOf:fm.asOf,source:SOURCE_FRED,url:FX[code]?.series?'https://fred.stlouisfed.org/series/'+FX[code]!.series:'',raw:fm.raw,reason:`Verified daily FX series changed ${fm.raw.toFixed(2)}% over roughly 20 observations.`});
    const co=cotObs[code];
    if(co) factors.push({key:'cot-positioning',label:'CFTC leveraged-money positioning',score:cotScale[code]??null,weight:20,status:'DELAYED',asOf:co.asOf,source:co.source,url:co.url,raw:co.value,reason:`CFTC leveraged-money net position: ${co.value.toLocaleString()} contracts. Weekly/delayed.`});
    const se=sentMap[code];
    if(se) factors.push({key:'news-sentiment',label:'Google News headline sentiment',score:se.score,weight:10,status:'LIVE',asOf:se.asOf,source:'Google News RSS',url:'https://news.google.com/',raw:se.score,reason:`Transparent headline-tone proxy from ${se.headlines.length} public headlines; contextual only.`});
    else factors.push({key:'news-sentiment',label:'Google News headline sentiment',score:null,weight:10,status:'UNAVAILABLE',asOf:null,source:'Google News RSS unavailable',url:'https://news.google.com/',reason:'Not scored when the feed cannot be verified.'});
    factors.push({key:'growth-inflation',label:'Growth / inflation surprise',score:null,weight:20,status:'UNAVAILABLE',asOf:null,source:'Adapter unavailable',url:'',reason:'Not scored rather than inferred from missing data.'});
    const usable=factors.filter(f=>f.score!==null);const ws=usable.reduce((s,f)=>s+f.weight,0);
    const score=ws>=50?Math.round(usable.reduce((s,f)=>s+(f.score as number)*f.weight,0)/ws):null;
    const confidence=Math.round(ws);const bias=score===null?'INSUFFICIENT_DATA':score>=65?'BULLISH':score<=35?'BEARISH':'NEUTRAL';
    const dates=usable.map(f=>f.asOf).filter(Boolean) as string[];const newest=dates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||null;
    return {code,name:NAMES[code],assetClass:code.startsWith('X')?'METAL':'FOREX',score,bias,confidence,freshness:freshness(newest),factors,reasons:usable.map(f=>f.reason)};
  });

  const currencyOnly=instruments.filter(i=>i.assetClass==='FOREX'&&i.score!==null);
  const pairData:any[]=[];
  for(const b of currencyOnly)for(const q of currencyOnly)if(b.code!==q.code){
    const diff=(b.score as number)-(q.score as number);
    pairData.push({pair:b.code+'/'+q.code,score:Math.round(clamp(50+diff/2)),bias:diff>=15?'BULLISH':diff<=-15?'BEARISH':'NEUTRAL',baseScore:b.score,quoteScore:q.score,horizon:Math.abs(diff)>=20?'SHORT_TERM':'SWING_POSITIONAL'});
  }
  pairData.sort((a,b)=>b.score-a.score);
  const coverage={liveFactors:instruments.flatMap(i=>i.factors).filter(f=>f.score!==null).length,totalFactors:instruments.flatMap(i=>i.factors).length,note:'COT is weekly/delayed. FRED H.10 FX observations are daily/delayed relative to spot. Missing feeds remain unavailable.'};
  return {generatedAt:new Date().toISOString(),methodology:{weights:{monetaryPolicy:25,marketMomentum:25,cotPositioning:20,growthInflation:20,newsSentiment:10},thresholds:{bullish:65,bearish:35},rule:'Only verified observations are scored; missing factors reduce coverage/confidence. No synthetic defaults.'},coverage,instruments,pairs:pairData,topBullish:pairData.filter(p=>p.bias==='BULLISH').slice(0,8),topBearish:pairData.filter(p=>p.bias==='BEARISH').slice(-8).reverse(),sources:[{name:'FRED / Federal Reserve Bank of St. Louis',url:'https://fred.stlouisfed.org/'},{name:'CFTC Commitments of Traders',url:'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm'},{name:'Federal Reserve H.10 Foreign Exchange Rates',url:'https://www.federalreserve.gov/releases/h10/'}]};
}
