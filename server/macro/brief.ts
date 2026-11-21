/**
 * MARKET BRIEF — a short, plain-language explanation of WHY an asset or pair is bullish / bearish right now,
 * plus a forward-looking part (what is scheduled, how far the score is from changing, what could change the call).
 *
 * Accuracy by construction: nothing is written by a language model. Every sentence is filled in from the engine's own
 * numbers (scores, published readings, forecasts, scheduled releases) using two fixed phrase books — English and
 * Urdu — so both languages always say exactly the same thing. Names and numbers are kept as published. If a fact is
 * missing, the sentence is left out instead of guessed.
 */
import type { AssetResult, IndicatorResult, MacroSnapshot, PairResult, Bias } from './types.js';

export interface L { en: string; ur: string }
export interface BriefLine extends L { tone?: 'bull' | 'bear' | 'neutral' | 'info'; at?: number }
export interface Brief {
  symbol: string; display: string; kind: 'asset' | 'pair'; assetClass: string;
  bias: Bias; biasLabel: L; side: 'bull' | 'bear' | 'neutral'; score: number | null; bullishPct: number | null; bearishPct: number | null;
  confidence: number; updatedAt: string; asOf: string;
  headline: L; summary: L; trust: L;
  why: BriefLine[]; watch: BriefLine[]; heading: BriefLine[]; counter: BriefLine[]; disclaimer: L;
}

const BIAS_EN: Record<Bias, string> = { STRONG_BULLISH: 'Strongly Bullish', BULLISH: 'Bullish', MILD_BULLISH: 'Slightly Bullish', NEUTRAL: 'Neutral', MILD_BEARISH: 'Slightly Bearish', BEARISH: 'Bearish', STRONG_BEARISH: 'Strongly Bearish' };
const BIAS_UR: Record<Bias, string> = { STRONG_BULLISH: 'مضبوط تیزی', BULLISH: 'تیزی', MILD_BULLISH: 'ہلکی تیزی', NEUTRAL: 'غیر جانبدار', MILD_BEARISH: 'ہلکی مندی', BEARISH: 'مندی', STRONG_BEARISH: 'مضبوط مندی' };
const MEAN_EN: Record<Bias, string> = { STRONG_BULLISH: 'the data points firmly up', BULLISH: 'buyers have the edge', MILD_BULLISH: 'a small lean up', NEUTRAL: 'no clear direction', MILD_BEARISH: 'a small lean down', BEARISH: 'sellers have the edge', STRONG_BEARISH: 'the data points firmly down' };
const MEAN_UR: Record<Bias, string> = { STRONG_BULLISH: 'ڈیٹا واضح طور پر اوپر کی طرف ہے', BULLISH: 'خریداروں کا پلڑا بھاری ہے', MILD_BULLISH: 'معمولی جھکاؤ اوپر کی طرف', NEUTRAL: 'کوئی واضح سمت نہیں', MILD_BEARISH: 'معمولی جھکاؤ نیچے کی طرف', BEARISH: 'فروخت کنندگان کا پلڑا بھاری ہے', STRONG_BEARISH: 'ڈیٹا واضح طور پر نیچے کی طرف ہے' };
export const biasLabelL = (b: Bias): L => ({ en: BIAS_EN[b], ur: BIAS_UR[b] });
const sideOfBias = (b: Bias): 'bull' | 'bear' | 'neutral' => (b.endsWith('BULLISH') ? 'bull' : b.endsWith('BEARISH') ? 'bear' : 'neutral');

const sgn = (n: number) => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`);
const num = (v: number) => (Math.abs(v) >= 100 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100));
const withUnit = (v: number, unit?: string) => { const u = (unit || '').trim(); return /^[%]|^(K|M|B|T)$/i.test(u) ? `${num(v)}${u}` : u ? `${num(v)} ${u}` : num(v); };
const stripStage = (s: string) => s.toLowerCase().replace(/\s*\((prel|final|flash|adv|advance|revised)[^)]*\)\s*$/i, '').replace(/\s+/g, ' ').trim();

/** Everyday meaning of well-known indicators (added in brackets; the official name is always kept). */
const GLOSS: Array<[RegExp, L]> = [
  [/non.?farm|nfp/i, { en: 'US jobs report', ur: 'امریکی روزگار رپورٹ' }],
  [/core.*(cpi|inflation)|core pce/i, { en: 'inflation without food & fuel', ur: 'خوراک اور ایندھن کے بغیر مہنگائی' }],
  [/\bcpi\b|inflation rate|consumer price/i, { en: 'inflation', ur: 'مہنگائی' }],
  [/\bppi\b|producer price/i, { en: 'wholesale prices', ur: 'تھوک قیمتیں' }],
  [/retail sales/i, { en: 'shopping spending', ur: 'خریداری کا خرچ' }],
  [/pmi/i, { en: 'business activity survey', ur: 'کاروباری سرگرمی کا سروے' }],
  [/\bgdp\b/i, { en: 'economic growth', ur: 'معاشی نمو' }],
  [/unemployment rate/i, { en: 'share of people without jobs', ur: 'بے روزگاری کی شرح' }],
  [/employment change|jobs change/i, { en: 'job growth', ur: 'روزگار میں اضافہ' }],
  [/interest rate|policy rate|rate decision/i, { en: 'central bank interest rate', ur: 'مرکزی بینک کی شرحِ سود' }],
  [/real yield|tips/i, { en: 'bond return after inflation', ur: 'مہنگائی کے بعد بانڈ کا منافع' }],
  [/consumer (confidence|sentiment)/i, { en: 'how upbeat shoppers feel', ur: 'خریداروں کا اعتماد' }],
  [/trade balance/i, { en: 'exports minus imports', ur: 'برآمدات منفی درآمدات' }],
  [/industrial production/i, { en: 'factory output', ur: 'فیکٹری کی پیداوار' }],
  [/dollar index/i, { en: 'strength of the US dollar', ur: 'امریکی ڈالر کی مضبوطی' }],
];
const glossOf = (name: string): L | null => { for (const [re, g] of GLOSS) if (re.test(name)) return g; return null; };
const nameL = (name: string, period?: string): L => {
  const g = glossOf(name); const per = period ? ` [${period}]` : '';
  return g ? { en: `${name}${per} (${g.en})`, ur: `${name}${per} (${g.ur})` } : { en: `${name}${per}`, ur: `${name}${per}` };
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Pakistan time (UTC+5, no daylight saving). */
const pkt = (at: number) => { const d = new Date(at + 5 * 3600_000); const h = d.getUTCHours(), m = d.getUTCMinutes(); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const inL = (at: number, now: number): L => {
  const m = Math.max(1, Math.round((at - now) / 60000));
  if (m < 60) return { en: `in ${m} min`, ur: `${m} منٹ میں` };
  if (m < 48 * 60) { const h = Math.round(m / 60); return { en: `in ${h} hour${h === 1 ? '' : 's'}`, ur: `${h} گھنٹے میں` }; }
  const d = Math.round(m / 1440); return { en: `in ${d} days`, ur: `${d} دن میں` };
};

const THRESHOLDS = [60, 30, 10, -10, -30, -60];
const nameAt = (t: number): Bias => (t >= 60 ? 'STRONG_BULLISH' : t >= 30 ? 'BULLISH' : t >= 10 ? 'MILD_BULLISH' : t > -10 ? 'NEUTRAL' : t > -30 ? 'MILD_BEARISH' : t > -60 ? 'BEARISH' : 'STRONG_BEARISH');

/** How far the score is from the next level up / down. */
function distance(score: number, label: string): BriefLine[] {
  const up = THRESHOLDS.filter((t) => t > score).pop();
  const down = THRESHOLDS.filter((t) => t <= score).shift();
  const parts: L[] = [];
  const head: L = { en: `Score now: ${sgn(score)} (scale: -100 very bearish … +100 very bullish).`, ur: `اس وقت اسکور: ${sgn(score)} (پیمانہ: -100 بہت مندی … +100 بہت تیزی)۔` };
  if (up !== undefined) { const to = nameAt(up + 0.01), n = Math.round(up - score); parts.push({ en: `About ${n} points higher (${sgn(up)}) it becomes ${BIAS_EN[to]}.`, ur: `تقریباً ${n} پوائنٹ بڑھنے پر (${sgn(up)}) یہ "${BIAS_UR[to]}" بن جائے گا۔` }); }
  if (down !== undefined) { const to = nameAt(down - 0.1), n = Math.round(score - down); parts.push({ en: `About ${n} points lower (below ${sgn(down)}) it becomes ${BIAS_EN[to]}.`, ur: `تقریباً ${n} پوائنٹ گرنے پر (${sgn(down)} سے نیچے) یہ "${BIAS_UR[to]}" بن جائے گا۔` }); }
  return [{ tone: 'info', en: `${label}: ${head.en} ${parts.map((p) => p.en).join(' ')}`, ur: `${label}: ${head.ur} ${parts.map((p) => p.ur).join(' ')}` }];
}

interface Ind extends IndicatorResult { pillar: string }
const allInds = (a: AssetResult): Ind[] => a.pillars.flatMap((p) => p.indicators.map((i) => ({ ...i, pillar: p.name })));
const polarityOf = (i: Ind | undefined): 1 | -1 | 0 => { const m = i?.polarityNote?.match(/higher\s*=\s*(bullish|bearish)/i); return m ? (m[1].toLowerCase() === 'bullish' ? 1 : -1) : 0; };

function cmpL(actual: number, ref: number): { en: string; ur: string } {
  const diff = actual - ref; const rel = Math.abs(diff) / Math.max(Math.abs(ref), Math.abs(actual), 1e-9);
  if (Math.abs(diff) < 1e-9) return { en: 'exactly as expected', ur: 'توقع کے عین مطابق' };
  const big = rel >= 0.5;
  return diff > 0 ? { en: big ? 'well above' : 'above', ur: big ? 'توقع سے کافی زیادہ' : 'توقع سے زیادہ' } : { en: big ? 'well below' : 'below', ur: big ? 'توقع سے کافی کم' : 'توقع سے کم' };
}

interface Ctx { label: string; pair?: string; fxAsset: boolean }
const moveL = (up: boolean, c: Ctx): L => c.pair
  ? { en: `pushes ${c.pair} ${up ? 'up' : 'down'}`, ur: `${c.pair} کو ${up ? 'اوپر' : 'نیچے'} دھکیلتا ہے` }
  : c.fxAsset ? { en: `makes ${c.label} ${up ? 'stronger' : 'weaker'}`, ur: `${c.label} ${up ? 'مضبوط' : 'کمزور'} ہوتا ہے` }
  : { en: `pushes ${c.label} ${up ? 'higher' : 'lower'}`, ur: `${c.label} کو ${up ? 'اوپر' : 'نیچے'} دھکیلتا ہے` };

/** One reading → one plain sentence: what was published, whether it beat expectations, who it helps, and the effect. */
function driverLine(i: Ind, c: Ctx, sign: 1 | -1 = 1): BriefLine | null {
  const o = i.observation; if (!o || i.score === null) return null;
  const nm = nameL(i.name, o.period); const act = withUnit(o.actual, o.unit);
  let en: string, ur: string;
  if (o.forecast !== null) {
    const cm = cmpL(o.actual, o.forecast); const f = withUnit(o.forecast, o.unit);
    en = `${nm.en}: came in at ${act}, ${cm.en}${/exactly/.test(cm.en) ? '' : ` the ${f} expected`}.`;
    ur = `${nm.ur}: ${act} رہی جبکہ توقع ${f} کی تھی (${cm.ur})۔`;
  } else if (o.previous !== null) {
    const p = withUnit(o.previous, o.unit); const upv = o.actual > o.previous;
    en = o.actual === o.previous ? `${nm.en}: ${act}, unchanged from the previous reading.` : `${nm.en}: ${act}, ${upv ? 'up' : 'down'} from ${p} last time.`;
    ur = o.actual === o.previous ? `${nm.ur}: ${act}، پچھلی ریڈنگ جتنی ہی۔` : `${nm.ur}: ${act}، پچھلی بار ${p} تھی (${upv ? 'بڑھی' : 'کم ہوئی'})۔`;
  } else { en = `${nm.en}: ${act}.`; ur = `${nm.ur}: ${act}۔`; }
  const good = i.score > 0; const up = sign * i.score > 0; const mv = moveL(up, c);
  const mag = Math.abs(i.score); const size: L = mag >= 70 ? { en: 'big', ur: 'بڑا' } : mag >= 40 ? { en: 'clear', ur: 'واضح' } : { en: 'small', ur: 'معمولی' };
  const old = i.status === 'stale';
  en += ` That is ${good ? 'good' : 'bad'} for ${c.label}, so it ${mv.en} (${size.en} impact)${old ? ' — an older reading' : ''}.`;
  ur += ` یہ ${c.label} کے لیے ${good ? 'اچھا' : 'برا'} ہے، اس لیے ${mv.ur} (اثر: ${size.ur})${old ? ' — پرانی ریڈنگ' : ''}۔`;
  return { tone: up ? 'bull' : 'bear', en, ur };
}

function topDrivers(a: AssetResult, n: number): Ind[] {
  return allInds(a).filter((i) => i.score !== null && i.status !== 'missing' && i.observation).sort((x, y) => Math.abs((y.score as number) * y.effectiveWeight) - Math.abs((x.score as number) * x.effectiveWeight)).slice(0, n);
}

function tally(a: AssetResult): { up: number; down: number } {
  const s = allInds(a).filter((i) => i.score !== null && i.status !== 'missing' && i.score !== 0);
  return { up: s.filter((i) => (i.score as number) > 0).length, down: s.filter((i) => (i.score as number) < 0).length };
}

function counterLines(a: AssetResult, label: string): BriefLine[] {
  if (a.score === null || Math.abs(a.score) < 10) return [];
  const bull = a.score > 0;
  const against = a.pillars.filter((p) => p.score !== null && p.coverage >= 0.3 && Math.sign(p.score as number) === -Math.sign(a.score as number) && Math.abs(p.score as number) >= 8).sort((x, y) => Math.abs(y.score as number) - Math.abs(x.score as number)).slice(0, 2);
  return against.map((p) => ({ tone: 'neutral' as const,
    en: `Not everything agrees: the "${p.name}" group leans ${bull ? 'down' : 'up'} for ${label} (${sgn(p.score as number)}). If it strengthens, the ${bull ? 'bullish' : 'bearish'} view weakens.`,
    ur: `ہر چیز ایک سمت میں نہیں: "${p.name}" کا گروپ ${label} کے لیے ${bull ? 'نیچے' : 'اوپر'} کی طرف ہے (${sgn(p.score as number)})۔ اگر یہ مضبوط ہوا تو ${bull ? 'تیزی' : 'مندی'} کا رجحان کمزور پڑے گا۔` }));
}

type Up = MacroSnapshot['upcoming'][number];
function eventLine(u: Up, a: AssetResult | undefined, pairSign: 1 | -1, now: number, target: string): BriefLine {
  const at = Date.parse(u.scheduledAt); const when = inL(at, now);
  const ind = a ? allInds(a).find((i) => i.observation?.sourceTitle && stripStage(i.observation.sourceTitle) === stripStage(u.title)) : undefined;
  const pol = polarityOf(ind) * pairSign; const unit = ind?.observation?.unit; const nm = nameL(u.title);
  const exp = u.forecast !== null ? { en: `Expected: ${withUnit(u.forecast, unit)}${u.previous !== null ? ` (last time ${withUnit(u.previous, unit)})` : ''}.`, ur: `متوقع: ${withUnit(u.forecast, unit)}${u.previous !== null ? ` (پچھلی بار ${withUnit(u.previous, unit)})` : ''}۔` }
    : u.previous !== null ? { en: `Last time: ${withUnit(u.previous, unit)}.`, ur: `پچھلی بار: ${withUnit(u.previous, unit)}۔` } : { en: '', ur: '' };
  const dir: L = pol !== 0
    ? { en: `If the result is higher than expected, ${target} usually ${pol > 0 ? 'rises' : 'falls'}; if it is lower, it usually ${pol > 0 ? 'falls' : 'rises'}.`, ur: `اگر نتیجہ توقع سے زیادہ آیا تو ${target} عموماً ${pol > 0 ? 'اوپر' : 'نیچے'} جاتا ہے؛ اگر کم آیا تو عموماً ${pol > 0 ? 'نیچے' : 'اوپر'}۔` }
    : { en: 'A result far from the forecast can move it either way.', ur: 'توقع سے بہت مختلف نتیجہ کسی بھی سمت میں حرکت دے سکتا ہے۔' };
  return { tone: 'info', at,
    en: `${u.asset} · ${nm.en} — ${pkt(at)} Pakistan time (${when.en}). ${exp.en} ${dir.en}`.replace(/\s+/g, ' ').trim(),
    ur: `${u.asset} · ${nm.ur} — ${pkt(at)} پاکستانی وقت (${when.ur})۔ ${exp.ur} ${dir.ur}`.replace(/\s+/g, ' ').trim() };
}

const DISCLAIMER: L = {
  en: 'Made automatically from live economic data and scheduled releases. It explains the fundamental lean — it is not a price target or a trade signal.',
  ur: 'یہ خلاصہ براہِ راست معاشی ڈیٹا اور طے شدہ ریلیزز سے خودکار طور پر بنتا ہے۔ یہ بنیادی رجحان سمجھاتا ہے — قیمت کا ہدف یا ٹریڈ سگنل نہیں۔',
};

function trustL(conf: number): L {
  return conf >= 80 ? { en: `High data confidence (${Math.round(conf)}%) — most inputs are live and recent.`, ur: `ڈیٹا پر اعتماد زیادہ (${Math.round(conf)}%) — زیادہ تر ان پٹس لائیو اور تازہ ہیں۔` }
    : conf >= 60 ? { en: `Medium data confidence (${Math.round(conf)}%) — some inputs are missing or older.`, ur: `ڈیٹا پر اعتماد درمیانہ (${Math.round(conf)}%) — کچھ ان پٹس غائب یا پرانے ہیں۔` }
    : { en: `Low data confidence (${Math.round(conf)}%) — treat this view with care until more data arrives.`, ur: `ڈیٹا پر اعتماد کم (${Math.round(conf)}%) — مزید ڈیٹا آنے تک اس رجحان پر احتیاط کریں۔` };
}

const headlineOf = (display: string, b: Bias): L => ({ en: `${display} is ${BIAS_EN[b]} — ${MEAN_EN[b]}.`, ur: `${display} ${BIAS_UR[b]} میں ہے — ${MEAN_UR[b]}۔` });
const NO_DATA = (d: string): { head: L; sum: L } => ({ head: { en: `${d}: not enough data to call a direction yet.`, ur: `${d}: سمت طے کرنے کے لیے ابھی کافی ڈیٹا نہیں۔` }, sum: { en: 'We never guess — the view appears as soon as enough live data arrives.', ur: 'ہم اندازہ نہیں لگاتے — کافی لائیو ڈیٹا آتے ہی رجحان ظاہر ہو جائے گا۔' } });

export function assetBrief(a: AssetResult, s: MacroSnapshot, now = Date.now()): Brief {
  const label = a.symbol; const sc = a.score; const c: Ctx = { label, fxAsset: a.assetClass === 'FOREX' };
  const why: BriefLine[] = [];
  if (sc !== null) for (const d of topDrivers(a, 4)) { const l = driverLine(d, c); if (l) why.push(l); }
  const watch: BriefLine[] = [];
  const ups = s.upcoming.filter((u) => u.asset === a.symbol && Date.parse(u.scheduledAt) > now).sort((x, y) => Date.parse(x.scheduledAt) - Date.parse(y.scheduledAt));
  const hi = ups.filter((u) => /high|3/i.test(u.importance)); const pick = (hi.length ? hi : ups).slice(0, 3);
  for (const u of pick) watch.push(eventLine(u, a, 1, now, label));
  if (!pick.length) watch.push({ tone: 'info', en: `No release for ${label} is scheduled in the data window. It will mostly move with new readings and market-based inputs.`, ur: `${label} کی کوئی ریلیز ڈیٹا کی مدت میں طے نہیں۔ یہ زیادہ تر نئی ریڈنگز اور مارکیٹ پر مبنی ان پٹس کے ساتھ بدلے گا۔` });
  const heading: BriefLine[] = [];
  if (sc !== null) {
    const bull = sc >= 10, bear = sc <= -10;
    heading.push({ tone: bull ? 'bull' : bear ? 'bear' : 'neutral',
      en: bull ? `If the next releases keep beating expectations for ${label}, the bullish view can grow stronger. Weak surprises would pull it back toward neutral.`
        : bear ? `If the next readings keep disappointing for ${label}, the bearish view can grow stronger. Good surprises would pull it back toward neutral.`
        : `${label} has no clear lean now. The next strong or weak readings will decide which way it tilts.`,
      ur: bull ? `اگر آنے والی ریلیزز ${label} کے لیے توقع سے بہتر رہیں تو تیزی کا رجحان مزید مضبوط ہو سکتا ہے۔ کمزور نتائج اسے غیر جانبدار کی طرف واپس لائیں گے۔`
        : bear ? `اگر آنے والی ریڈنگز ${label} کے لیے مایوس کن رہیں تو مندی کا رجحان مزید مضبوط ہو سکتا ہے۔ اچھے نتائج اسے غیر جانبدار کی طرف واپس لائیں گے۔`
        : `${label} کا ابھی کوئی واضح جھکاؤ نہیں۔ آنے والی مضبوط یا کمزور ریڈنگز طے کریں گی کہ یہ کس طرف جھکتا ہے۔` });
    heading.push(...distance(sc, label));
  }
  const t = sc === null ? null : tally(a);
  const summary: L = sc === null ? NO_DATA(label).sum : t && t.up + t.down > 0
    ? { en: `Of the ${t.up + t.down} readings we track for ${label}, ${t.up} push it up and ${t.down} push it down.`, ur: `${label} کے لیے ہم جن ${t.up + t.down} ریڈنگز کو دیکھتے ہیں ان میں سے ${t.up} اسے اوپر اور ${t.down} نیچے دھکیل رہی ہیں۔` }
    : { en: `${label} is scored from its live readings.`, ur: `${label} کا اسکور اس کی لائیو ریڈنگز سے بنتا ہے۔` };
  const head = sc === null ? NO_DATA(`${label} (${a.name})`).head : headlineOf(`${label} (${a.name})`, a.bias);
  return { symbol: a.symbol, display: a.symbol, kind: 'asset', assetClass: a.assetClass, bias: a.bias, biasLabel: biasLabelL(a.bias), side: sideOfBias(a.bias), score: sc, bullishPct: a.bullishPct, bearishPct: a.bearishPct,
    confidence: a.confidence, updatedAt: a.updatedAt, asOf: s.generatedAt, headline: head, summary, trust: trustL(a.confidence), why, watch, heading, counter: sc === null ? [] : counterLines(a, label), disclaimer: DISCLAIMER };
}

export function pairBrief(p: PairResult, base: AssetResult | undefined, quote: AssetResult | undefined, s: MacroSnapshot, now = Date.now()): Brief {
  const sc = p.score; const why: BriefLine[] = [];
  let summary: L = NO_DATA(p.display).sum;
  if (sc !== null && p.baseScore !== null && p.quoteScore !== null) {
    const baseStrong = p.baseScore >= p.quoteScore; const strong = baseStrong ? p.base : p.quote, weak = baseStrong ? p.quote : p.base;
    const lean = sc >= 10 ? { en: 'up', ur: 'اوپر' } : sc <= -10 ? { en: 'down', ur: 'نیچے' } : null;
    summary = lean
      ? { en: `${strong} looks stronger than ${weak}, so ${p.display} leans ${lean.en}.`, ur: `${strong} ${weak} کے مقابلے میں مضبوط نظر آتا ہے، اس لیے ${p.display} ${lean.ur} کی طرف جھکا ہوا ہے۔` }
      : { en: `${p.base} and ${p.quote} look about equally strong, so ${p.display} has no clear direction.`, ur: `${p.base} اور ${p.quote} تقریباً برابر مضبوط ہیں، اس لیے ${p.display} کی کوئی واضح سمت نہیں۔` };
    why.push({ tone: sc >= 0 ? 'bull' : 'bear', en: `Strength scores: ${p.base} ${sgn(p.baseScore)} vs ${p.quote} ${sgn(p.quoteScore)}. A pair rises when its first currency is stronger than its second, and falls when it is weaker.`, ur: `طاقت کے اسکور: ${p.base} ${sgn(p.baseScore)} بمقابلہ ${p.quote} ${sgn(p.quoteScore)}۔ جوڑی تب اوپر جاتی ہے جب پہلی کرنسی دوسری سے مضبوط ہو، اور تب نیچے جب کمزور ہو۔` });
  }
  const ctx = (lab: string): Ctx => ({ label: lab, pair: p.display, fxAsset: false });
  const side = (a: AssetResult | undefined, sign: 1 | -1, lab: string, n: number) => a ? topDrivers(a, n).map((d) => driverLine(d, ctx(lab), sign)).filter(Boolean) as BriefLine[] : [];
  why.push(...side(base, 1, p.base, 2), ...side(quote, -1, p.quote, 2));
  if (p.retailSentiment && p.retailSentiment.contrarianScore !== 0) {
    const r = p.retailSentiment; const crowd = r.longPct >= 50 ? 'buying' : 'selling'; const up = r.contrarianScore > 0;
    why.push({ tone: 'info', en: `Crowd check: ${Math.round(r.longPct)}% of retail traders are long and ${Math.round(r.shortPct)}% short (${r.source}). Most are ${crowd}, and crowds are often wrong at extremes — a small push ${up ? 'up' : 'down'} for ${p.display}.`,
      ur: `بھیڑ کا جائزہ: ${Math.round(r.longPct)}% ریٹیل ٹریڈرز لانگ اور ${Math.round(r.shortPct)}% شارٹ ہیں (${r.source})۔ زیادہ تر ${crowd === 'buying' ? 'خرید' : 'فروخت'} کر رہے ہیں، اور بھیڑ اکثر انتہا پر غلط ہوتی ہے — ${p.display} کے لیے ${up ? 'اوپر' : 'نیچے'} کی ہلکی سی حمایت۔` });
  }
  const mk = (asset: AssetResult | undefined, sym: string, sign: 1 | -1) => s.upcoming.filter((u) => u.asset === sym && Date.parse(u.scheduledAt) > now).map((u) => eventLine(u, asset, sign, now, p.display));
  const watch = [...mk(base, p.base, 1), ...mk(quote, p.quote, -1)].sort((x, y) => (x.at as number) - (y.at as number)).slice(0, 4);
  if (!watch.length) watch.push({ tone: 'info', en: `No release for ${p.base} or ${p.quote} is scheduled in the data window.`, ur: `${p.base} یا ${p.quote} کی کوئی ریلیز ڈیٹا کی مدت میں طے نہیں۔` });
  const heading: BriefLine[] = [];
  const counter: BriefLine[] = [];
  if (sc !== null) {
    const bull = sc >= 10, bear = sc <= -10;
    heading.push({ tone: bull ? 'bull' : bear ? 'bear' : 'neutral',
      en: bull ? `If ${p.base} data keeps beating expectations or ${p.quote} data disappoints, ${p.display} can climb further. The reverse would pull it back toward neutral.`
        : bear ? `If ${p.quote} data keeps beating expectations or ${p.base} data disappoints, ${p.display} can fall further. The reverse would pull it back toward neutral.`
        : `${p.display} has no clear lean now. Whichever currency delivers the stronger data next will tilt it that way.`,
      ur: bull ? `اگر ${p.base} کا ڈیٹا توقع سے بہتر آتا رہا یا ${p.quote} کا ڈیٹا مایوس کن رہا تو ${p.display} مزید اوپر جا سکتا ہے۔ اس کے برعکس ہوا تو یہ غیر جانبدار کی طرف لوٹے گا۔`
        : bear ? `اگر ${p.quote} کا ڈیٹا توقع سے بہتر آتا رہا یا ${p.base} کا ڈیٹا مایوس کن رہا تو ${p.display} مزید نیچے جا سکتا ہے۔ اس کے برعکس ہوا تو یہ غیر جانبدار کی طرف لوٹے گا۔`
        : `${p.display} کا ابھی کوئی واضح جھکاؤ نہیں۔ جس کرنسی کا ڈیٹا آگے زیادہ مضبوط آئے گا، جوڑی اسی طرف جھکے گی۔` });
    heading.push(...distance(sc, p.display));
    if (bull || bear) counter.push({ tone: 'neutral',
      en: `This view changes if ${bull ? p.quote : p.base} gets stronger or ${bull ? p.base : p.quote} gets weaker. Watch the releases listed above for both currencies.`,
      ur: `اگر ${bull ? p.quote : p.base} مضبوط ہو یا ${bull ? p.base : p.quote} کمزور پڑے تو یہ رجحان بدل سکتا ہے۔ اوپر دی گئی دونوں کرنسیوں کی ریلیزز پر نظر رکھیں۔` });
  }
  const head = sc === null ? NO_DATA(p.display).head : headlineOf(p.display, p.bias);
  return { symbol: p.symbol, display: p.display, kind: 'pair', assetClass: p.assetClass, bias: p.bias, biasLabel: biasLabelL(p.bias), side: sideOfBias(p.bias), score: sc, bullishPct: p.bullishPct, bearishPct: p.bullishPct === null ? null : Math.round((100 - p.bullishPct) * 10) / 10,
    confidence: p.confidence, updatedAt: s.generatedAt, asOf: s.generatedAt, headline: head, summary, trust: trustL(p.confidence), why, watch, heading, counter, disclaimer: DISCLAIMER };
}
