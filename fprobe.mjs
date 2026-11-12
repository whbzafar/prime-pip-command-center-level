const H={headers:{Origin:'https://www.tradingview.com',Referer:'https://www.tradingview.com/','User-Agent':'Mozilla/5.0'}};
const cs=['US','EU','DE','GB','JP','CA','AU','NZ','CH','CN'];
let rows=[];
for(let d=420; d>0; d-=20){ const f=new Date(Date.now()-d*864e5).toISOString(), t=new Date(Date.now()-(d-20)*864e5+36e5).toISOString();
 try{ const r=await fetch(`https://economic-calendar.tradingview.com/events?from=${f}&to=${t}&countries=${cs.join(',')}`,H); const j=await r.json(); rows.push(...(j.result||j)); }catch(e){console.log('chunk err',e.message)} }
console.log('TV rows',rows.length,'now',new Date().toISOString());
const by={};
for(const e of rows){ if(e.actual==null) continue; (by[e.country]??={}); const k=e.title; (by[e.country][k]??=[]).push(e); }
const want=/cpi|inflation|unemploy|employ|wage|labour|labor|earnings|pmi|retail|industrial|manufactur|services|ppi|producer|gdp|confidence|sentiment|tankan|ifo|zew|sentix|cbi|trade|tourism|dairy|cash rate|interest|rate decision|business|jobs|payroll|participation/i;
for(const c of cs){ console.log('=== '+c);
 for(const [t,a] of Object.entries(by[c]||{})){ if(!want.test(t)) continue; a.sort((x,y)=>new Date(y.date)-new Date(x.date)); const e=a[0];
  console.log(`${t} | ${e.date.slice(0,10)} | per ${e.period} | a=${e.actual} f=${e.forecast} p=${e.previous} | n=${a.length}`);}}
