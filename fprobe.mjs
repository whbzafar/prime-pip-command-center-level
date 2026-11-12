const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
async function get(u,h={}){try{const r=await fetch(u,{headers:{'User-Agent':UA,...h},signal:AbortSignal.timeout(20000)});return {s:r.status,t:await r.text()}}catch(e){return {s:0,t:String(e)}}}
const p=await get('https://dps.psx.com.pk/company/OGDC');
const t=p.t.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'');
const i=t.indexOf('id="financials"');console.log('IDX financials',i);
const txt=t.replace(/<[^>]+>/g,'|').replace(/\s+/g,' ').replace(/(\| ?)+/g,'|');
const k=txt.indexOf('Financials');console.log('TXT',txt.slice(k,k+3500));
const r=txt.indexOf('Ratios');console.log('RATIOS',txt.slice(r,r+1500));
console.log('TABLEIDS',[...t.matchAll(/id="([a-zA-Z_-]+)"/g)].map(m=>m[1]).join(','));
const q=t.indexOf('Equity Profile');console.log('EQP',txt.slice(txt.indexOf('Equity Profile'),txt.indexOf('Equity Profile')+800));
const full=await get('https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/OGDC.KA?type=quarterlyTotalRevenue,quarterlyNetIncome,quarterlyDilutedEPS,trailingTotalRevenue,trailingNetIncome,annualTotalRevenue,annualNetIncome,annualOperatingIncome,quarterlyOperatingIncome,annualOperatingCashFlow,annualTotalDebt,annualStockholdersEquity,annualCapitalExpenditure&period1=1514764800&period2=1893456000');
try{const j=JSON.parse(full.t);for(const r of j.timeseries.result){const k=r.meta.type[0];console.log('TS',k,JSON.stringify((r[k]||[]).map(x=>[x.asOfDate,x.reportedValue?.raw])))}}catch(e){console.log('TSERR',full.t.slice(0,200))}
for(const s of ['HBL.KA','MCB.KA','ENGRO.KA','LUCK.KA','FFC.KA','PSO.KA','MARI.KA','PPL.KA','HUBC.KA','SYS.KA','EFERT.KA','UBL.KA','^KSE','KSE100.KA','^KSE100']){const c=await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`);console.log('CH',s,c.s)}
