const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const out=[];const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s)};
async function get(u,h={}){try{const r=await fetch(u,{headers:{'User-Agent':UA,...h},signal:AbortSignal.timeout(20000)});return {s:r.status,t:await r.text(),h:r.headers}}catch(e){return {s:0,t:String(e)}}}
// Yahoo crumb
let r=await get('https://fc.yahoo.com');log('fc.yahoo',r.s);
const cookie=(r.h?.getSetCookie?.()||[]).map(c=>c.split(';')[0]).join('; ');
let c=await get('https://query1.finance.yahoo.com/v1/test/getcrumb',{Cookie:cookie});log('crumb',c.s,c.t.slice(0,40));
const crumb=c.t;
for(const sym of ['OGDC.KA','HBL.KA','ENGRO.KA','7203.T','0700.HK','RELIANCE.NS','TSM','^KSE','^N225','^HSI','AAPL']){
  const q=await get(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=financialData,defaultKeyStatistics,summaryDetail&crumb=${encodeURIComponent(crumb)}`,{Cookie:cookie});
  let j;try{j=JSON.parse(q.t)}catch{}
  const fd=j?.quoteSummary?.result?.[0]?.financialData;
  log(sym,q.s,fd?`rg=${fd.revenueGrowth?.raw} eg=${fd.earningsGrowth?.raw} pm=${fd.profitMargins?.raw} roe=${fd.returnOnEquity?.raw} de=${fd.debtToEquity?.raw} rec=${fd.recommendationMean?.raw}`:q.t.slice(0,120));
}
// chart for index/price
for(const sym of ['^KSE','OGDC.KA','^N225']){const q=await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`);let j;try{j=JSON.parse(q.t)}catch{};log('chart',sym,q.s,j?.chart?.result?.[0]?.meta?.regularMarketPrice,j?.chart?.result?.[0]?.timestamp?.length)}
// Yahoo fundamentals-timeseries (no crumb)
const ts=await get('https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/OGDC.KA?type=annualTotalRevenue,annualNetIncome,trailingTotalRevenue,trailingNetIncome,trailingDilutedEPS&period1=1577836800&period2=1893456000');log('timeseries OGDC',ts.s,ts.t.slice(0,300));
const ts2=await get('https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/7203.T?type=annualTotalRevenue,annualNetIncome&period1=1577836800&period2=1893456000');log('timeseries 7203',ts2.s,ts2.t.slice(0,200));
// SEC tickers
const sec=await get('https://www.sec.gov/files/company_tickers.json',{'User-Agent':'PrimePipFX research@primepipfx.com'});log('sec tickers',sec.s,sec.t.length);
// PSX
const ps=await get('https://dps.psx.com.pk/company/OGDC');log('psx company',ps.s,ps.t.length, /EPS|Earnings/i.test(ps.t));
const pi=await get('https://dps.psx.com.pk/timeseries/int/KSE100');log('psx kse100 int',pi.s,pi.t.slice(0,150));
const pe=await get('https://dps.psx.com.pk/market-watch');log('psx market-watch',pe.s,pe.t.length);
import fs from 'fs';fs.mkdirSync('shots',{recursive:true});fs.writeFileSync('shots/fprobe.txt',out.join('\n'));
