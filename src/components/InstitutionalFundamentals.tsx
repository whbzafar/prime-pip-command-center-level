import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, BookOpen, ChevronRight, Clock3,
  ExternalLink, Globe2, Layers3, RefreshCw, ShieldCheck, TrendingDown, TrendingUp
} from 'lucide-react';

type Factor = {
  key:string; label:string; score:number|null; weight:number; status:string;
  asOf:string|null; source:string; url:string; reason:string; raw?:number|null;
};
type Instrument = {
  code:string; name:string; assetClass:'FOREX'|'METAL'; score:number|null;
  bias:'BULLISH'|'BEARISH'|'NEUTRAL'|'INSUFFICIENT_DATA'; confidence:number;
  freshness:string; factors:Factor[]; reasons:string[];
};
type Pair = {
  pair:string; score:number; bias:string; baseScore:number; quoteScore:number;
  horizon:string;
};
type Dashboard = {
  generatedAt:string;
  methodology:any;
  coverage:{liveFactors:number;totalFactors:number;note:string};
  instruments:Instrument[];
  pairs:Pair[];
  topBullish:Pair[];
  topBearish:Pair[];
  sources:{name:string;url:string}[];
};

const INSTITUTIONAL_MODULES = [
  ['Currency Strength Intelligence','8 major currencies: USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD. Individual strength, weakness, bias, freshness and factor coverage.'],
  ['Relative Forex Pair Engine','Major pairs and cross pairs. Base-vs-quote comparison with relative fundamental bias and selectable pair analysis.'],
  ['Monetary Policy','Central-bank policy rates, policy direction, meeting context and rate-path interpretation.'],
  ['Inflation','CPI, core CPI, PPI, inflation trend, target distance and expectations/surprises when verified data is available.'],
  ['Employment & Wages','Employment, unemployment, payrolls, participation and wage-growth conditions.'],
  ['GDP & Economic Growth','GDP, growth trend, revisions and faster growth proxies such as PMI/new orders where available.'],
  ['PMI & Business Activity','Manufacturing, services, composite PMI and new-orders conditions.'],
  ['Consumer & Retail Demand','Retail sales, consumption and consumer-confidence conditions.'],
  ['Trade & Current Account','Trade balance, exports, imports, current account and terms-of-trade context.'],
  ['Bond Yields & Yield Differentials','2Y/5Y/10Y/30Y yields, curves and relative yield differentials where verified.'],
  ['COT Positioning','Official CFTC positioning, long/short/net changes and historical context. Weekly/delayed by design.'],
  ['Risk Regime & Volatility','Risk-on, risk-off or mixed conditions using available verified cross-asset evidence.'],
  ['News & Headline Sentiment','Headline context separated from hard macro facts; source and timestamp must remain visible.'],
  ['USD / DXY Intelligence','USD macro chain including Fed, inflation, labor, yields, DXY and positioning.'],
  ['Gold XAU/USD Intelligence','USD, rates, real yields, inflation expectations, risk conditions, positioning and other verified macro drivers.'],
  ['Silver XAG/USD Intelligence','USD, yields, industrial-cycle context, gold/silver ratio and CFTC positioning where available.'],
  ['Commodity-Currency Relationships','Oil/CAD, iron ore/AUD, dairy/NZD and other verified commodity transmission channels.'],
  ['Economic Calendar','Actual, forecast, previous, release time, importance, surprise and source; unavailable fields remain N/A.'],
  ['Economic Surprise Engine','Actual-versus-forecast calculations only when comparable verified observations exist.'],
  ['Fundamental vs Price Divergence','Separates fundamental pressure from observed price direction; never treats divergence as a guaranteed reversal.'],
  ['Short / Swing / Medium / Long Term','Each view is explicitly labeled by horizon and never presented as a guaranteed prediction.'],
  ['Data Health & Source Audit','Source status, freshness, timestamps, coverage and unavailable/error states.'],
  ['Calculation Transparency','Factor weights, available-data coverage, normalization and score contribution must be inspectable.'],
];

const LIBRARY = [
  ['Central-bank policy / rate path','Monetary policy','Policy rate, guidance and expected path; compare the relative policy stance rather than the absolute rate.'],
  ['CPI / core inflation','Prices','Inflation pressure and the surprise versus expectations. The policy reaction is normally more important than the number alone.'],
  ['Employment / wages','Labor','Payrolls, unemployment, participation and wages; useful for assessing growth and policy pressure.'],
  ['GDP / PMI / new orders','Growth','GDP is slower but broad; PMI/new orders are faster indicators of turning points.'],
  ['Retail sales / consumption','Demand','Household demand and revisions help identify whether growth is broad or weakening.'],
  ['Trade balance / current account','External sector','Persistent external surpluses/deficits affect funding and currency demand over longer horizons.'],
  ['Terms of trade / commodities','External sector','Especially important for CAD, AUD and NZD; commodity prices can change national income and trade flows.'],
  ['Yield differentials','Rates','Relative sovereign yields and the expected policy path can drive capital flows and FX valuation.'],
  ['COT positioning','Positioning','CFTC futures positioning. Weekly and delayed; useful for crowding/context, not a real-time trigger.'],
  ['Risk appetite / volatility','Cross-asset','Global risk conditions can dominate domestic fundamentals, especially for JPY/CHF and commodity currencies.'],
  ['News / headline sentiment','Sentiment','A transparent headline layer should show source headlines and sentiment separately from hard macro data.'],
  ['Gold / Silver macro chain','Metals','Rates, real yields, USD, inflation expectations, risk conditions and COT are key drivers.'],
];

function fmtDate(v:string|null){
  if(!v) return '—';
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
}
function statusClass(status:string){
  if(status==='LIVE') return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if(status==='DELAYED') return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  if(status==='STALE') return 'text-orange-300 border-orange-500/30 bg-orange-500/10';
  return 'text-slate-500 border-slate-700 bg-slate-900';
}
function biasClass(bias:string){
  if(bias==='BULLISH') return 'text-emerald-300';
  if(bias==='BEARISH') return 'text-rose-300';
  return 'text-slate-300';
}
function scoreColor(score:number|null){
  if(score===null) return 'text-slate-500';
  return score>=65?'text-emerald-300':score<=35?'text-rose-300':'text-amber-300';
}

export const FundamentalIndicators:React.FC=()=>{
  const [data,setData]=useState<Dashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [selectedCode,setSelectedCode]=useState('USD');
  const [selectedPair,setSelectedPair]=useState('EUR/USD');
  const [tab,setTab]=useState<'OVERVIEW'|'CURRENCIES'|'PAIRS'|'LIBRARY'>('OVERVIEW');
  const [pairSearch,setPairSearch]=useState('');

  const load=async()=>{
    setLoading(true); setError(null);
    try{
      const r=await fetch('/api/fundamental-indicators/dashboard',{cache:'no-store',headers:{Accept:'application/json'}});
      const body=await r.json();
      if(!r.ok) throw new Error(body.error||'Fundamental feed unavailable.');
      setData(body);
    }catch(e){
      setError(e instanceof Error?e.message:'Fundamental feed unavailable.');
    }finally{setLoading(false);}
  };
  useEffect(()=>{void load();const t=window.setInterval(()=>void load(),10*60*1000);return()=>window.clearInterval(t);},[]);

  const selected=data?.instruments.find(i=>i.code===selectedCode)||null;
  const pairData=data?.pairs.find(p=>p.pair===selectedPair)||null;
  const [base,quote]=selectedPair.split('/');
  const baseData=data?.instruments.find(i=>i.code===base);
  const quoteData=data?.instruments.find(i=>i.code===quote);
  const filteredPairs=useMemo(()=>data?.pairs.filter(p=>p.pair.includes(pairSearch.toUpperCase()))||[],[data,pairSearch]);

  return <div className="w-full max-w-7xl mx-auto space-y-5 overflow-x-hidden">
    <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 p-5 sm:p-6 shadow-xl">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-11 w-11 rounded-xl border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center text-cyan-300"><Globe2/></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-military font-bold tracking-wider text-slate-100">INSTITUTIONAL FUNDAMENTALS TERMINAL</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">Eight major currencies + Gold + Silver. Relative macro strength, CFTC positioning, verified FX momentum and transparent source attribution.</p>
          </div>
        </div>
        <button onClick={()=>void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-950 px-3 py-2 text-[11px] font-mono-code text-cyan-300 hover:bg-slate-900 disabled:opacity-50">
          <RefreshCw className={loading?'animate-spin':''} size={14}/> {loading?'SYNCING':'REFRESH LIVE DATA'}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-2 text-[10px] font-mono-code">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2"><span className="text-slate-500">FEED STATUS</span><div className="text-emerald-300 mt-1">SOURCE-VERIFIED</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2"><span className="text-slate-500">LAST BUILD</span><div className="text-slate-200 mt-1">{fmtDate(data?.generatedAt||null)}</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2"><span className="text-slate-500">COVERAGE</span><div className="text-cyan-300 mt-1">{data?.coverage.liveFactors||0}/{data?.coverage.totalFactors||0} factors</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2"><span className="text-slate-500">COT</span><div className="text-amber-300 mt-1">WEEKLY / DELAYED</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 col-span-2 lg:col-span-1"><span className="text-slate-500">TRUTH RULE</span><div className="text-slate-200 mt-1">NO SYNTHETIC DATA</div></div>
      </div>
    </section>

    {error&&<div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 flex gap-2"><AlertTriangle size={16}/><div><b>Live feed error:</b> {error}<div className="text-rose-300/70 mt-1">The terminal does not replace failed live data with invented numbers.</div></div></div>}

    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {(['OVERVIEW','CURRENCIES','PAIRS','LIBRARY'] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`shrink-0 px-3 py-2 rounded-lg border text-[10px] font-military tracking-wider ${tab===x?'bg-cyan-500 text-slate-950 border-cyan-300':'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40'}`}>{x}</button>)}
    </div>

    {tab==='OVERVIEW'&&<div className="space-y-5">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-3"><h2 className="font-military font-bold text-slate-100 tracking-wider">CURRENCY / METAL STRENGTH MATRIX</h2><Activity size={16} className="text-cyan-400"/></div>
          <div className="space-y-2">
            {(data?.instruments||[]).map(i=><button key={i.code} onClick={()=>{setSelectedCode(i.code);setTab('CURRENCIES')}} className="w-full flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-left">
              <span className="w-10 font-mono-code font-bold text-cyan-300">{i.code}</span>
              <div className="flex-1"><div className="text-xs text-slate-200">{i.name}</div><div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className={`h-full ${i.bias==='BULLISH'?'bg-emerald-400':i.bias==='BEARISH'?'bg-rose-400':'bg-amber-400'}`} style={{width:`${i.score??0}%`}}/></div></div>
              <span className={`w-14 text-right text-sm font-military font-bold ${scoreColor(i.score)}`}>{i.score??'—'}</span>
              <span className={`w-24 text-right text-[10px] font-mono-code ${biasClass(i.bias)}`}>{i.bias.replace('_',' ')}</span>
            </button>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <h2 className="font-military font-bold text-slate-100 tracking-wider mb-3">TOP RELATIVE PAIRS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><div className="text-[10px] text-emerald-300 font-mono-code mb-2">RELATIVE BULLISH</div>{(data?.topBullish||[]).map(p=><button key={p.pair} onClick={()=>{setSelectedPair(p.pair);setTab('PAIRS')}} className="w-full text-left p-2 rounded-lg border border-slate-800 hover:border-emerald-500/30 mb-1"><div className="flex justify-between text-xs"><span className="text-slate-200">{p.pair}</span><span className="text-emerald-300">{p.score}</span></div><div className="text-[9px] text-slate-500">{p.horizon.replace('_',' ')}</div></button>)}</div>
            <div><div className="text-[10px] text-rose-300 font-mono-code mb-2">RELATIVE BEARISH</div>{(data?.topBearish||[]).map(p=><button key={p.pair} onClick={()=>{setSelectedPair(p.pair);setTab('PAIRS')}} className="w-full text-left p-2 rounded-lg border border-slate-800 hover:border-rose-500/30 mb-1"><div className="flex justify-between text-xs"><span className="text-slate-200">{p.pair}</span><span className="text-rose-300">{p.score}</span></div><div className="text-[9px] text-slate-500">{p.horizon.replace('_',' ')}</div></button>)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex gap-2 text-amber-300"><ShieldCheck size={16}/><span className="text-xs font-bold">DATA INTEGRITY / INTERPRETATION</span></div>
        <p className="text-[11px] leading-relaxed text-slate-400 mt-2">A bullish/bearish label is a model classification of the verified observations available at the last sync; it is not a guarantee of future price direction. COT is weekly and FRED H.10 FX data is daily. If an adapter fails or becomes stale, the factor is visibly unavailable rather than silently replaced.</p>
      </section>
    </div>}

    {tab==='CURRENCIES'&&<section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div><div className="text-xs text-cyan-300 font-mono-code">SELECTED ASSET</div><h2 className="text-2xl font-military font-bold text-slate-100">{selected?.code||selectedCode} · {selected?.name||''}</h2></div>
        <button onClick={()=>setTab('OVERVIEW')} className="text-[10px] text-slate-400 hover:text-cyan-300">← BACK TO MATRIX</button>
      </div>
      {selected&&<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 p-4 bg-slate-900/50">
          <div className={`text-4xl font-military font-black ${scoreColor(selected.score)}`}>{selected.score??'—'}</div>
          <div className={`mt-1 text-sm font-bold ${biasClass(selected.bias)}`}>{selected.bias.replace('_',' ')}</div>
          <div className="text-[10px] text-slate-500 mt-2">Confidence / available weight: {selected.confidence}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Freshness: {selected.freshness}</div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-slate-800 p-4 bg-slate-900/50">
          <h3 className="text-xs font-military font-bold text-slate-200 mb-3">WHY THIS ASSET IS CLASSIFIED THIS WAY</h3>
          <div className="space-y-2">{selected.reasons.length?selected.reasons.map((r,i)=><div key={i} className="text-[11px] text-slate-400 flex gap-2"><ChevronRight size={13} className="text-cyan-400 shrink-0"/><span>{r}</span></div>):<div className="text-xs text-slate-500">No verified reasons available yet.</div>}</div>
        </div>
      </div>}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(selected?.factors||[]).map(f=><div key={f.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold text-slate-200">{f.label}</div><div className="text-[9px] text-slate-500 mt-1">Weight {f.weight}%</div></div><span className={`px-2 py-1 rounded border text-[8px] ${statusClass(f.status)}`}>{f.status}</span></div>
          <div className={`text-2xl font-military font-bold mt-3 ${scoreColor(f.score)}`}>{f.score??'—'}</div>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-2">{f.reason}</p>
          <div className="text-[9px] text-slate-600 mt-2">As of {fmtDate(f.asOf)}</div>
          {f.url&&<a href={f.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] text-cyan-400 hover:underline">VERIFY SOURCE <ExternalLink size={10}/></a>}
        </div>)}
      </div>
    </section>}

    {tab==='PAIRS'&&<section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><div className="text-xs text-cyan-300 font-mono-code">RELATIVE CURRENCY ENGINE</div><h2 className="text-xl font-military font-bold text-slate-100">{selectedPair}</h2></div>
        <input value={pairSearch} onChange={e=>setPairSearch(e.target.value)} placeholder="Search pair e.g. EUR/USD" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"/>
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 p-4 bg-slate-900/50">
          <div className="grid grid-cols-2 gap-3">
            {[baseData,quoteData].map((i,idx)=><button key={idx} onClick={()=>{if(i){setSelectedCode(i.code);setTab('CURRENCIES')}}} className="text-left rounded-xl border border-slate-800 bg-slate-950/70 p-3"><div className="text-[9px] text-slate-500">{idx===0?'BASE':'QUOTE'}</div><div className="text-lg font-military font-bold text-cyan-300">{i?.code||'—'}</div><div className={`text-sm ${biasClass(i?.bias||'')}`}>{i?.score??'—'} · {i?.bias?.replace('_',' ')||'—'}</div></button>)}
          </div>
          <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200"><Layers3 size={15} className="text-cyan-400"/> PAIR FUNDAMENTAL INTERACTION</div>
            <p className="text-[11px] text-slate-400 mt-2">The pair score is the relative difference between the base and quote fundamental scores. A stronger base versus a weaker quote increases the relative bullish classification; the inverse produces a bearish classification.</p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-900"><div className="text-[9px] text-slate-500">BASE</div><div className="text-cyan-300 font-bold">{pairData?.baseScore??'—'}</div></div>
              <div className="p-2 rounded-lg bg-slate-900"><div className="text-[9px] text-slate-500">QUOTE</div><div className="text-cyan-300 font-bold">{pairData?.quoteScore??'—'}</div></div>
              <div className="p-2 rounded-lg bg-slate-900"><div className="text-[9px] text-slate-500">RELATIVE</div><div className={`font-bold ${biasClass(pairData?.bias||'')}`}>{pairData?.score??'—'}</div></div>
              <div className="p-2 rounded-lg bg-slate-900"><div className="text-[9px] text-slate-500">HORIZON</div><div className="text-amber-300 font-bold text-[10px]">{pairData?.horizon?.replace('_',' ')||'—'}</div></div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 p-3 max-h-[520px] overflow-y-auto">
          {(filteredPairs.length?filteredPairs:data?.pairs||[]).map(p=><button key={p.pair} onClick={()=>setSelectedPair(p.pair)} className={`w-full flex items-center justify-between p-2 rounded-lg mb-1 text-left border ${p.pair===selectedPair?'border-cyan-500/50 bg-cyan-500/10':'border-transparent hover:border-slate-800'}`}><span className="text-xs text-slate-200">{p.pair}</span><span className={`text-[10px] font-bold ${biasClass(p.bias)}`}>{p.score}</span></button>)}
        </div>
      </div>
    </section>}

    {tab==='OVERVIEW'&&<section className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div><div className="text-xs text-cyan-300 font-mono-code">INSTITUTIONAL MODULE MAP</div><h2 className="text-lg font-military font-bold text-slate-100 tracking-wider">FUNDAMENTAL INDICATOR INTELLIGENCE STACK</h2></div>
        <span className="text-[9px] font-mono-code text-amber-300 border border-amber-500/20 rounded px-2 py-1">VERIFIED DATA ONLY</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {INSTITUTIONAL_MODULES.map(([name,desc],i)=><article key={name} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex gap-2"><span className="text-[9px] text-cyan-400 font-mono-code mt-0.5">{String(i+1).padStart(2,'0')}</span><div><h3 className="text-[11px] font-bold text-slate-100">{name}</h3><p className="text-[9px] leading-relaxed text-slate-500 mt-1">{desc}</p></div></div>
        </article>)}
      </div>
    </section>}

    {tab==='LIBRARY'&&<section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {LIBRARY.map(([name,category,desc])=><article key={name} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-start gap-3"><BookOpen size={17} className="text-cyan-400 mt-0.5"/><div><div className="text-xs text-cyan-300 font-mono-code">{category}</div><h3 className="text-sm font-bold text-slate-100 mt-1">{name}</h3><p className="text-[11px] text-slate-400 leading-relaxed mt-2">{desc}</p></div></div>
      </article>)}
    </section>}

    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><div className="text-xs font-bold text-slate-200">SOURCE REGISTER</div><div className="text-[10px] text-slate-500 mt-1">Every displayed observation must be traceable to a source and timestamp.</div></div>
        <div className="flex flex-wrap gap-2">{(data?.sources||[]).map(s=><a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[9px] text-cyan-300 hover:border-cyan-500/50">{s.name}<ExternalLink size={9}/></a>)}</div>
      </div>
    </section>
  </div>;
};
