import pako from 'pako';
import { OFFICIAL_INDICATOR_REGISTRY } from '../data/fundamentalRegistryData';

// ----------------------------------------------------
// NUMBER PARSING UTILITY
// ----------------------------------------------------
export function safeParseNum(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    if (
      cleaned === '—' ||
      cleaned === '-' ||
      cleaned.toLowerCase() === 'pending' ||
      cleaned.toLowerCase() === 'n/a'
    ) {
      return null;
    }
    const match = cleaned.match(/^[+-]?\d+(?:\.\d+)?/);
    if (match) {
      let num = parseFloat(match[0]);
      if (/k$/i.test(cleaned)) num *= 1000;
      if (/m$/i.test(cleaned)) num *= 1000000;
      return isNaN(num) ? null : num;
    }
  }
  return null;
}

// ----------------------------------------------------
// PURE CLIENT & SERVER PDF TEXT EXTRACTOR
// Decodes Deflate / Flate streams in memory using pako
// Works 100% in browser, Node, and Vercel serverless
// ----------------------------------------------------
export function extractTextFromPdf(data: Uint8Array | ArrayBuffer | string): string {
  let u8: Uint8Array;
  if (typeof data === 'string') {
    const clean = data.replace(/^data:[^;]+;base64,/, '').trim();
    if (typeof atob === 'function') {
      const bin = atob(clean);
      u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        u8[i] = bin.charCodeAt(i);
      }
    } else {
      const buf = Buffer.from(clean, 'base64');
      u8 = new Uint8Array(buf);
    }
  } else if (data instanceof Uint8Array) {
    u8 = data;
  } else if (data instanceof ArrayBuffer) {
    u8 = new Uint8Array(data);
  } else {
    return '';
  }

  let str = '';
  const chunkSize = 32768;
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, Math.min(i + chunkSize, u8.length));
    let chunkStr = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkStr += String.fromCharCode(chunk[j]);
    }
    str += chunkStr;
  }

  let fullText = '';
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(str)) !== null) {
    const rawStream = match[1];
    let decompressedStr = '';
    try {
      const streamBytes = new Uint8Array(rawStream.length);
      for (let j = 0; j < rawStream.length; j++) {
        streamBytes[j] = rawStream.charCodeAt(j);
      }
      const uncompressed = pako.inflate(streamBytes);
      let dec = '';
      for (let k = 0; k < uncompressed.length; k += chunkSize) {
        const sub = uncompressed.subarray(k, Math.min(k + chunkSize, uncompressed.length));
        let subStr = '';
        for (let m = 0; m < sub.length; m++) {
          subStr += String.fromCharCode(sub[m]);
        }
        dec += subStr;
      }
      decompressedStr = dec;
    } catch {
      decompressedStr = rawStream;
    }

    const parenRegex = /\((?:\\\(|\\\)|[^()])*\)/g;
    const tokens: string[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = parenRegex.exec(decompressedStr)) !== null) {
      let t = pMatch[0].slice(1, -1);
      t = t
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
      if (t.trim()) {
        tokens.push(t);
      }
    }
    if (tokens.length > 0) {
      fullText += tokens.join(' ') + '\n';
    }
  }

  if (!fullText.trim()) {
    const parenRegex = /\((?:\\\(|\\\)|[^()])*\)/g;
    const tokens: string[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = parenRegex.exec(str)) !== null) {
      let t = pMatch[0].slice(1, -1).replace(/\\([()\\])/g, '$1');
      if (t.trim().length > 1) {
        tokens.push(t);
      }
    }
    if (tokens.length > 0) {
      fullText = tokens.join(' ');
    }
  }

  return fullText;
}

// ----------------------------------------------------
// REGISTRY MATCHER
// ----------------------------------------------------
export function findBestRegistryMatch(rawName: string, currency: string) {
  let norm = String(rawName || '').toLowerCase().trim();
  const cleanNorm = norm.replace(/[….]+/g, '').trim();
  const curr = String(currency || 'USD').toUpperCase().trim();
  let candidates = OFFICIAL_INDICATOR_REGISTRY.filter((reg: any) => reg.currency === curr);
  if (!candidates.length) {
    candidates = OFFICIAL_INDICATOR_REGISTRY;
  }

  for (const reg of candidates) {
    const regName = reg.name.toLowerCase();
    const short = (reg.shortLabel || '').toLowerCase();
    const code = (reg.code || '').toLowerCase();
    const id = reg.id.toLowerCase();
    if (norm === regName || norm === short || norm === code || norm === id) return reg;
    if (cleanNorm && (short.startsWith(cleanNorm) || regName.startsWith(cleanNorm))) return reg;
    if (short && (norm.includes(short) || short.includes(norm) || cleanNorm.includes(short) || short.includes(cleanNorm))) return reg;
    if (norm && (regName.includes(norm) || (cleanNorm && regName.includes(cleanNorm)))) return reg;
  }

  if (curr === 'USD') {
    if (norm.includes('fed funds') || norm.includes('target rate') || norm.includes('funds rate')) {
      return candidates.find((c: any) => c.id === 'USD_POLICY_RATE') || candidates[0];
    }
    if (norm.includes('core') && norm.includes('cpi')) {
      return candidates.find((c: any) => c.id === 'USD_CORE_CPI_YOY') || candidates[0];
    }
    if (norm.includes('core') && norm.includes('pce')) {
      return candidates.find((c: any) => c.id === 'USD_CORE_PCE_YOY') || candidates[0];
    }
    if (norm.includes('cpi') || norm.includes('inflation')) {
      return candidates.find((c: any) => c.id === 'USD_CPI_YOY') || candidates[0];
    }
    if (norm.includes('nfp') || norm.includes('payroll') || norm.includes('non-farm')) {
      return candidates.find((c: any) => c.id === 'USD_NFP') || candidates[0];
    }
    if (norm.includes('unemploy')) {
      return candidates.find((c: any) => c.id === 'USD_UNEMPLOYMENT') || candidates[0];
    }
    if (norm.includes('gdp')) {
      return candidates.find((c: any) => c.id === 'USD_GDP_ANNUALIZED') || candidates[0];
    }
    if (norm.includes('ism') && norm.includes('mfg')) {
      return candidates.find((c: any) => c.id === 'USD_ISM_MANUFACTURING') || candidates[0];
    }
    if (norm.includes('ism') && norm.includes('serv')) {
      return candidates.find((c: any) => c.id === 'USD_ISM_SERVICES') || candidates[0];
    }
    if (norm.includes('retail')) {
      return candidates.find((c: any) => c.id === 'USD_RETAIL_SALES_MOM') || candidates[0];
    }
    if (norm.includes('10y') || norm.includes('yield') || norm.includes('treasury')) {
      return candidates.find((c: any) => c.id === 'USD_10Y_YIELD') || candidates[0];
    }
  }

  if (curr === 'EUR') {
    if (norm.includes('core') && (norm.includes('cpi') || norm.includes('hicp'))) {
      return candidates.find((c: any) => c.id === 'EUR_HICP_CORE_YOY') || candidates[0];
    }
    if (norm.includes('hicp') || norm.includes('cpi')) {
      return candidates.find((c: any) => c.id === 'EUR_HICP_HEADLINE_YOY') || candidates[0];
    }
    if (norm.includes('deposit') || norm.includes('ecb') || norm.includes('rate')) {
      return candidates.find((c: any) => c.id === 'EUR_POLICY_RATE') || candidates[0];
    }
    if (norm.includes('gdp')) {
      return candidates.find((c: any) => c.id === 'EUR_GDP_QOQ') || candidates[0];
    }
    if (norm.includes('unemploy')) {
      return candidates.find((c: any) => c.id === 'EUR_UNEMPLOYMENT') || candidates[0];
    }
    if (norm.includes('pmi')) {
      return candidates.find((c: any) => c.id === 'EUR_COMPOSITE_PMI') || candidates[0];
    }
    if (norm.includes('ifo')) {
      return candidates.find((c: any) => c.id === 'EUR_GERMAN_IFO') || candidates[0];
    }
    if (norm.includes('bund') || norm.includes('10y')) {
      return candidates.find((c: any) => c.id === 'EUR_10Y_BUND') || candidates[0];
    }
  }

  if (curr === 'GBP') {
    if (norm.includes('bank rate') || (norm.includes('boe') && norm.includes('rate'))) {
      return candidates.find((c: any) => c.id.includes('POLICY_RATE') || c.id.includes('BANK_RATE')) || candidates[0];
    }
    if (norm.includes('core') && norm.includes('cpi')) {
      return candidates.find((c: any) => c.id.includes('CORE_CPI')) || candidates[0];
    }
    if (norm.includes('cpi') || norm.includes('inflation')) {
      return candidates.find((c: any) => c.id.includes('CPI')) || candidates[0];
    }
    if (norm.includes('gdp')) {
      return candidates.find((c: any) => c.id.includes('GDP')) || candidates[0];
    }
    if (norm.includes('unemploy') || norm.includes('ilo')) {
      return candidates.find((c: any) => c.id.includes('UNEMPLOY')) || candidates[0];
    }
    if (norm.includes('gilt') || norm.includes('10y')) {
      return candidates.find((c: any) => c.id.includes('GILT') || c.id.includes('10Y')) || candidates[0];
    }
  }

  if (curr === 'JPY') {
    if (norm.includes('rate') || norm.includes('boj')) return candidates.find((c: any) => c.id.includes('POLICY_RATE')) || candidates[0];
    if (norm.includes('tokyo')) return candidates.find((c: any) => c.id.includes('TOKYO')) || candidates[0];
    if (norm.includes('cpi') || norm.includes('inflation')) return candidates.find((c: any) => c.id.includes('CPI')) || candidates[0];
    if (norm.includes('gdp')) return candidates.find((c: any) => c.id.includes('GDP')) || candidates[0];
    if (norm.includes('tankan')) return candidates.find((c: any) => c.id.includes('TANKAN')) || candidates[0];
    if (norm.includes('jgb') || norm.includes('10y')) return candidates.find((c: any) => c.id.includes('JGB') || c.id.includes('10Y')) || candidates[0];
  }

  if (curr === 'CHF') {
    if (norm.includes('rate') || norm.includes('snb')) return candidates.find((c: any) => c.id.includes('POLICY_RATE')) || candidates[0];
    if (norm.includes('cpi')) return candidates.find((c: any) => c.id.includes('CPI')) || candidates[0];
    if (norm.includes('gdp')) return candidates.find((c: any) => c.id.includes('GDP')) || candidates[0];
  }

  if (curr === 'CAD') {
    if (norm.includes('rate') || norm.includes('boc')) return candidates.find((c: any) => c.id.includes('POLICY_RATE')) || candidates[0];
    if (norm.includes('cpi')) return candidates.find((c: any) => c.id.includes('CPI')) || candidates[0];
    if (norm.includes('gdp')) return candidates.find((c: any) => c.id.includes('GDP')) || candidates[0];
    if (norm.includes('employ') || norm.includes('job')) return candidates.find((c: any) => c.id.includes('EMPLOY') || c.id.includes('UNEMPLOY')) || candidates[0];
  }

  if (curr === 'AUD') {
    if (norm.includes('rate') || norm.includes('rba')) return candidates.find((c: any) => c.id.includes('POLICY_RATE')) || candidates[0];
    if (norm.includes('cpi')) return candidates.find((c: any) => c.id.includes('CPI')) || candidates[0];
    if (norm.includes('gdp')) return candidates.find((c: any) => c.id.includes('GDP')) || candidates[0];
    if (norm.includes('employ') || norm.includes('job')) return candidates.find((c: any) => c.id.includes('EMPLOY') || c.id.includes('UNEMPLOY')) || candidates[0];
  }

  if (curr === 'NZD') {
    if (norm.includes('rate') || norm.includes('rbnz')) return candidates.find((c: any) => c.id.includes('POLICY_RATE')) || candidates[0];
    if (norm.includes('cpi')) return candidates.find((c: any) => c.id.includes('CPI')) || candidates[0];
    if (norm.includes('gdp')) return candidates.find((c: any) => c.id.includes('GDP')) || candidates[0];
  }

  return candidates[0] || null;
}

// ----------------------------------------------------
// 1. CURRENCY & COMMODITY DOCUMENT PARSER
// ----------------------------------------------------
export function parseCurrencyDocumentText(rawText: string, selection: string = 'ALL'): any[] {
  if (!rawText || !rawText.trim()) return [];
  const cleanSel=String(selection||'ALL').toUpperCase().trim();
  const isCommodity=cleanSel==='GOLD'||cleanSel==='SILVER'||cleanSel==='CRUDE_OIL'||cleanSel.includes('XAU')||cleanSel.includes('XAG')||cleanSel.includes('OIL')||cleanSel.includes('WTI')||/COMMODITIES FUNDAMENTAL MACRO REPORT/i.test(rawText);
  if(isCommodity)return parseCommodityDocumentText(rawText,cleanSel);
  let detectedCurrency=cleanSel!=='ALL'&&cleanSel!=='ALL_CURRENCIES'&&cleanSel!=='MULTI'?cleanSel:null;
  if(!detectedCurrency){
    for(const curr of ['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD']){
      if(new RegExp(`Currency Code:\\s*${curr}`,'i').test(rawText)||new RegExp(`PRIME\\s+PIP\\s+FX\\s*—\\s*${curr}`,'i').test(rawText)){detectedCurrency=curr;break;}
    }
  }
  const targetCurrencies=detectedCurrency?[detectedCurrency]:(cleanSel==='ALL'||cleanSel==='ALL_CURRENCIES'||cleanSel==='MULTI'?['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD']:[cleanSel]);
  const reportDate=rawText.match(/\\bDATE:\\s*(\\d{4}-\\d{2}-\\d{2})\\b/i)?.[1]||new Date().toISOString().slice(0,10);
  const lines=rawText.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);
  const results:any[]=[];const processed=new Set<string>();
  const category=/^(MONETARY POLICY|INFLATION|EMPLOYMENT|GROWTH|BUSINESS ACTIVITY|CONSUMER|RATES YIELDS|TRADE EXTERNAL|COMMODITY DRIVER|COMMODITY_DRIVER)$/i;
  const cadence=/^(Monthly|Weekly|Quarterly|Annual|Daily|Intra-Day)$/i;
  for(let i=1;i<lines.length-8;i++){
    if(!category.test(lines[i])||!cadence.test(lines[i+4]))continue;
    for(const curr of targetCurrencies){
      const match=findBestRegistryMatch(lines[i-1],curr);if(!match||match.currency!==curr||processed.has(match.id))continue;
      const actual=safeParseNum(lines[i+1]),forecast=safeParseNum(lines[i+2]),previous=safeParseNum(lines[i+3]);
      if(actual===null&&forecast===null&&previous===null)continue;
      results.push({id:`extracted_${match.id}_${Date.now()}_${results.length}`,matchedIndicatorId:match.id,name:match.name,currency:curr,actual,forecast,previous,revisedPrevious:null,unit:lines[i+5]||match.unit||'%',referencePeriod:lines[i+6]||'Uploaded Document',releaseDate:reportDate,releaseTime:'Document Data',source:lines[i+7]||'Uploaded PDF / Document Report',confidence:100,dataStatus:'EXTRACTED_FROM_IMAGE',notes:`Exact deterministic PDF extraction; source status: ${lines[i+8]||'UNSPECIFIED'}.`});
      processed.add(match.id);
    }
  }
  for(const curr of targetCurrencies){
    const defs=OFFICIAL_INDICATOR_REGISTRY.filter((d:any)=>d.currency===curr);
    for(const def of defs){
      if(processed.has(def.id))continue;
      const candidates=[def.shortLabel,def.name,def.code].filter(Boolean) as string[];
      for(const line of lines){
        const lower=line.toLowerCase(),cand=candidates.find(x=>lower.includes(x.toLowerCase()));if(!cand)continue;
        const tail=line.slice(lower.indexOf(cand.toLowerCase())+cand.length).trim(),tokens=tail.split(/\\s+/).filter(Boolean);
        const ci=tokens.findIndex(t=>cadence.test(t));if(ci<3)continue;
        const vals=tokens.slice(ci-3,ci).map(safeParseNum);if(vals.every(v=>v===null))continue;
        results.push({id:`extracted_${def.id}_${Date.now()}_${results.length}`,matchedIndicatorId:def.id,name:def.name,currency:curr,actual:vals[0],forecast:vals[1],previous:vals[2],revisedPrevious:null,unit:tokens[ci+1]||def.unit||'%',referencePeriod:tokens.slice(ci+2,ci+6).join(' ')||'Uploaded Document',releaseDate:reportDate,releaseTime:'Document Data',source:'Uploaded PDF / Document Report',confidence:99,dataStatus:'EXTRACTED_FROM_IMAGE',notes:`Exact table-row extraction for ${def.shortLabel||def.name}.`});
        processed.add(def.id);break;
      }
    }
  }
  return results;
}

// ----------------------------------------------------
// COMMODITIES DOCUMENT PARSER
// ----------------------------------------------------
export function parseCommodityDocumentText(rawText: string, selection: string = 'GOLD'): any[] {
  if(!rawText||!rawText.trim())return [];
  const commKey=selection.includes('XAU')||selection.includes('GOLD')?'GOLD':selection.includes('XAG')||selection.includes('SILVER')?'SILVER':'CRUDE_OIL';
  const reportDate=rawText.match(/\\bDATE:\\s*(\\d{4}-\\d{2}-\\d{2})\\b/i)?.[1]||new Date().toISOString().slice(0,10);
  const rows:any[]=[];const push=(name:string,value:number|null,unit:string,note:string)=>{if(value===null)return;rows.push({id:`extracted_${commKey}_${rows.length}_${Date.now()}`,name,currency:'USD',actual:value,forecast:null,previous:null,revisedPrevious:null,unit,referencePeriod:'Uploaded Document',releaseDate:reportDate,releaseTime:'Document Data',source:'Uploaded PDF / Document Report',confidence:100,dataStatus:'EXTRACTED_FROM_IMAGE',notes:note});};
  const spot=rawText.match(/Spot Price:\s*\$?([0-9,]+(?:\.\d+)?)/i),real=rawText.match(/US 10Y Real Yield:\s*([+-]?[0-9]+(?:\.[0-9]+)?)%?/i),breakeven=rawText.match(/5Y Inflation Breakeven:\s*([+-]?[0-9]+(?:\.[0-9]+)?)%?/i),inventory=rawText.match(/Weekly Inventory Surprise:\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*Mb/i);
  push(`${commKey==='GOLD'?'Gold (XAU/USD)':commKey==='SILVER'?'Silver (XAG/USD)':'Crude Oil (WTI)'} Spot Price`,spot?parseFloat(spot[1].replace(/,/g,'')):null,'$','Exact spot price extracted from uploaded document.');
  push('US 10-Year Real Yield',real?parseFloat(real[1]):null,'%','Exact real-yield value extracted from uploaded document.');
  push('5Y Inflation Breakeven',breakeven?parseFloat(breakeven[1]):null,'%','Exact breakeven value extracted from uploaded document.');
  push('Weekly Inventory Surprise',inventory?parseFloat(inventory[1]):null,'Mb','Exact inventory-surprise value extracted from uploaded document.');
  return rows;
}

// ----------------------------------------------------
// RATES & YIELDS DOCUMENT PARSER
// ----------------------------------------------------
export function parseRatesDocumentText(rawText: string): any[] {
  if(!rawText||!rawText.trim())return [];
  const lines=rawText.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean),currencies=['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD'],out:any[]=[],processed=new Set<string>();
  const reportDate=rawText.match(/\\bDATE:\\s*(\\d{4}-\\d{2}-\\d{2})\\b/i)?.[1]||new Date().toISOString().slice(0,10);
  for(let i=0;i<lines.length-9;i++){
    const curr=lines[i].toUpperCase();if(!currencies.includes(curr)||processed.has(curr))continue;
    const f=lines.slice(i+1,i+10),nums=f.slice(1,7).map(safeParseNum);if(nums.every(v=>v===null))continue;
    out.push({currency:curr,currentPolicyRate:nums[0],rate:nums[0],previousPolicyRate:nums[1],previousRate:nums[1],expectedNextRate:nums[2],expectedRate:nums[2],yield2Y:nums[4],yield5Y:null,yield10Y:nums[5],realYield10Y:safeParseNum(f[7]),centralBankBias:/HAWKISH/i.test(f[4]||'')?'HAWKISH':/DOVISH/i.test(f[4]||'')?'DOVISH':'NEUTRAL',nextMeetingDate:f[8]||'Unknown',recentGuidance:'Extracted directly from uploaded PDF.',reportDate});processed.add(curr);
  }
  for(const line of lines){const curr=line.split(/\\s+/)[0]?.toUpperCase();if(!currencies.includes(curr)||processed.has(curr))continue;const nums=Array.from(line.replace(/,/g,'').matchAll(/([+-]?\\d+(?:\\.\\d+)?)(%|[kKmMbB]|\\$)?/g)).map(m=>parseFloat(m[1]));if(!nums.length)continue;out.push({currency:curr,currentPolicyRate:nums[0],rate:nums[0],previousPolicyRate:nums[1]??null,previousRate:nums[1]??null,expectedNextRate:nums[2]??null,expectedRate:nums[2]??null,yield2Y:nums[3]??null,yield5Y:nums[4]??null,yield10Y:nums[5]??null,realYield10Y:nums[6]??null,centralBankBias:/HAWKISH/i.test(line)?'HAWKISH':/DOVISH/i.test(line)?'DOVISH':'NEUTRAL',nextMeetingDate:line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s*\\d{4}/i)?.[0]||'Unknown',recentGuidance:'Extracted directly from uploaded document.',reportDate});processed.add(curr);}
  return out;
}

// ----------------------------------------------------
// COT DOCUMENT PARSER
// ----------------------------------------------------
export function parseCotDocumentText(rawText: string): any[] {
  if(!rawText||!rawText.trim())return [];
  const lines=rawText.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean),assets=['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','XAU','XAG','OIL'],out:any[]=[],processed=new Set<string>(),reportDate=rawText.match(/\\bDATE:\\s*(\\d{4}-\\d{2}-\\d{2})\\b/i)?.[1]||new Date().toISOString().slice(0,10);
  for(let i=0;i<lines.length-8;i++){const asset=lines[i].toUpperCase();if(!assets.includes(asset)||processed.has(asset))continue;const f=lines.slice(i+1,i+9),nums=f.slice(0,6).map(safeParseNum);if(nums.every(v=>v===null))continue;const rep=/^\\d{4}-\\d{2}-\\d{2}$/.test(f[7]||'')?f[7]:reportDate;out.push({currency:asset,contractName:asset==='XAU'?'Gold Futures (COMEX)':asset==='XAG'?'Silver Futures (COMEX)':asset==='OIL'?'Crude Oil Light Sweet (NYMEX)':`${asset} Futures (CME)`,nonCommercialLong:nums[0],nonCommercialShort:nums[1],commercialLong:nums[3]??null,commercialShort:nums[4]??null,openInterest:nums[5]??null,reportDate:rep,releaseDate:rep,source:'Uploaded PDF / COT Report',confidence:100,notes:'Exact deterministic extraction from uploaded COT PDF.'});processed.add(asset);}
  for(const line of lines){const asset=line.split(/\\s+/)[0]?.toUpperCase();if(!assets.includes(asset)||processed.has(asset))continue;const nums=Array.from(line.replace(/,/g,'').matchAll(/([+-]?\\d+(?:\\.\\d+)?)/g)).map(m=>parseFloat(m[1]));if(nums.length<2)continue;out.push({currency:asset,contractName:asset==='XAU'?'Gold Futures (COMEX)':asset==='XAG'?'Silver Futures (COMEX)':asset==='OIL'?'Crude Oil Light Sweet (NYMEX)':`${asset} Futures (CME)`,nonCommercialLong:nums[0],nonCommercialShort:nums[1],commercialLong:nums[3]??null,commercialShort:nums[4]??null,openInterest:nums[5]??null,reportDate,releaseDate:reportDate,source:'Uploaded PDF / COT Report',confidence:100,notes:'Exact deterministic extraction from uploaded COT document.'});processed.add(asset);}
  return out;
}

// ----------------------------------------------------
// SENTIMENT DOCUMENT PARSER (31 INSTRUMENTS)
// ----------------------------------------------------
export function parseSentimentDocumentText(rawText: string): any[] {
  if(!rawText||!rawText.trim())return [];
  const lines=rawText.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean),pairs=['EUR/USD','GBP/USD','USD/JPY','USD/CHF','USD/CAD','AUD/USD','NZD/USD','EUR/GBP','EUR/JPY','EUR/CHF','EUR/CAD','EUR/AUD','EUR/NZD','GBP/JPY','GBP/CHF','GBP/CAD','GBP/AUD','GBP/NZD','AUD/JPY','CAD/JPY','CHF/JPY','NZD/JPY','AUD/CAD','AUD/CHF','AUD/NZD','CAD/CHF','NZD/CAD','NZD/CHF','XAU/USD','XAG/USD','US Oil','BRENT'],out:any[]=[],processed=new Set<string>();
  for(let i=0;i<lines.length-7;i++){const pair=pairs.find(p=>lines[i].toUpperCase()===p.toUpperCase());if(!pair||processed.has(pair))continue;const longPercent=safeParseNum(lines[i+3]),shortPercent=safeParseNum(lines[i+4]);if(longPercent===null&&shortPercent===null)continue;out.push({pair,longPercent,shortPercent,notes:lines[i+6]?`Exact deterministic extraction from uploaded sentiment PDF. Source: ${lines[i+6]}`:'Exact deterministic extraction from uploaded sentiment PDF.'});processed.add(pair);}
  for(const line of lines){for(const pair of pairs){if(processed.has(pair)||!line.includes(pair))continue;const tail=line.slice(line.indexOf(pair)+pair.length),nums=Array.from(tail.replace(/,/g,'').matchAll(/([+-]?\\d+(?:\\.\\d+)?)/g)).map(m=>parseFloat(m[1]));if(nums.length<2)continue;out.push({pair,longPercent:nums[0],shortPercent:nums[1],notes:'Exact deterministic extraction from uploaded sentiment document.'});processed.add(pair);break;}}
  return out;
}
