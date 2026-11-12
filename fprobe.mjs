const now=Date.now();
const url=`https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(new Date(now-100*864e5).toISOString())}&to=${encodeURIComponent(new Date(now).toISOString())}&countries=US,EU,GB,JP,CH,CA,AU,NZ,CN,DE,FR`;
const r=await fetch(url,{headers:{Origin:'https://www.tradingview.com',Referer:'https://www.tradingview.com/','User-Agent':'Mozilla/5.0'}});
const j=await r.json();const rows=j.result||j;console.log('STATUS',r.status,'rows',rows.length);
const m={};for(const e of rows){if(/pmi|industrial prod|manufacturing prod|production/i.test(e.title)){const k=e.country+' | '+e.title+' | ind='+e.indicator;m[k]=(m[k]||0)+(e.actual!=null?1:0)}}
for(const k of Object.keys(m).sort())console.log('EV',k,m[k]);
