import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Languages } from 'lucide-react';

/* A guided tour of the GEX page for students: plain words, English or Urdu, the real numbers on screen used as the examples,
   and the matching part of the page lights up while each step is shown. */

export interface TourFacts {
  symbol: string; unit: string; regime: 'positive' | 'negative' | 'neutral'; flip: string; callWall: string; putWall: string; magnet: string; price: string;
  priceVsFlip: 'above' | 'below' | 'unknown';
}
interface Step { target?: string; en: { t: string; b: (f: TourFacts) => string }; ur: { t: string; b: (f: TourFacts) => string }; art?: 'hedge' | 'checklist' }

const regimeEn = (f: TourFacts) => (f.regime === 'positive' ? 'positive gamma, so the market tends to stay calm and in a range' : f.regime === 'negative' ? 'negative gamma, so the market can move fast and run further than usual' : 'close to neutral, so there is no strong pull either way');
const regimeUr = (f: TourFacts) => (f.regime === 'positive' ? 'مثبت گیما ہے، یعنی مارکیٹ عموماً پرسکون اور رینج میں رہتی ہے' : f.regime === 'negative' ? 'منفی گیما ہے، یعنی مارکیٹ تیزی سے اور معمول سے زیادہ دور تک جا سکتی ہے' : 'تقریباً نیوٹرل ہے، یعنی کسی طرف خاص کھنچاؤ نہیں');

const STEPS: Step[] = [
  { en: { t: 'What is GEX?', b: () => 'GEX means Gamma Exposure. In one line: it shows where options traders\' hedging can push the price, and whether today is likely to be calm or wild. It does not give buy or sell signals. It gives you the weather report and a map of important prices.' },
    ur: { t: 'GEX کیا ہے؟', b: () => 'GEX کا مطلب گیما ایکسپوژر ہے۔ ایک جملے میں: یہ بتاتا ہے کہ آپشنز کے ہیجنگ سے قیمت کہاں دھکیلی جا سکتی ہے اور آج مارکیٹ پرسکون ہوگی یا تیز۔ یہ خرید یا فروخت کا سگنل نہیں دیتا، یہ موسم کی رپورٹ اور اہم قیمتوں کا نقشہ دیتا ہے۔' } },
  { art: 'hedge', en: { t: 'Why prices get pushed', b: () => 'People buy options. The big firms that sell them (dealers) protect themselves by buying or selling the real asset as price moves. That protection is called hedging, and when there are lots of options near the price, it becomes big enough to move the market.' },
    ur: { t: 'قیمت کو دھکا کیوں لگتا ہے', b: () => 'لوگ آپشنز خریدتے ہیں۔ انہیں بیچنے والی بڑی فرمیں (ڈیلرز) اپنا خطرہ کم کرنے کے لیے قیمت کے ساتھ اصل اثاثہ خریدتی یا بیچتی ہیں۔ اسے ہیجنگ کہتے ہیں، اور جب قیمت کے قریب بہت آپشنز ہوں تو یہ ہیجنگ اتنی بڑی ہو جاتی ہے کہ مارکیٹ کو حرکت دے سکتی ہے۔' } },
  { target: 'regime', en: { t: 'Step 1: read the weather', b: (f) => `This card is the weather report. Positive gamma means dealers sell rallies and buy dips, so moves get dampened. Negative gamma means they sell falls and buy rises, so moves get amplified. Right now ${f.symbol} is in ${regimeEn(f)}.` },
    ur: { t: 'پہلا قدم: موسم دیکھیں', b: (f) => `یہ کارڈ موسم کی رپورٹ ہے۔ مثبت گیما میں ڈیلرز تیزی میں بیچتے اور گراوٹ میں خریدتے ہیں، اس لیے حرکت دب جاتی ہے۔ منفی گیما میں الٹ ہوتا ہے، اس لیے حرکت بڑھ جاتی ہے۔ ابھی ${f.symbol} ${regimeUr(f)}۔` } },
  { target: 'levels', en: { t: 'Step 2: the key prices', b: (f) => `Call Wall (${f.callWall}) is where most call positions sit above price: rallies often slow down there. Put Wall (${f.putWall}) is the same below price: dips often find buyers there. Gamma Flip (${f.flip}) is the line between calm and wild: price is ${f.priceVsFlip} it now. Magnet (${f.magnet}) is the strike price tends to gravitate to. These are places to watch, not guarantees.` },
    ur: { t: 'دوسرا قدم: اہم قیمتیں', b: (f) => `کال وال (${f.callWall}) قیمت کے اوپر وہ جگہ ہے جہاں سب سے زیادہ کال پوزیشنز ہیں، تیزی اکثر وہاں سست پڑتی ہے۔ پٹ وال (${f.putWall}) نیچے وہی جگہ ہے، گراوٹ میں خریدار اکثر وہاں آتے ہیں۔ گیما فلپ (${f.flip}) پرسکون اور تیز مارکیٹ کے درمیان لکیر ہے، قیمت ابھی اس سے ${f.priceVsFlip === 'above' ? 'اوپر' : f.priceVsFlip === 'below' ? 'نیچے' : 'قریب'} ہے۔ میگنیٹ (${f.magnet}) وہ سٹرائیک ہے جس کی طرف قیمت کھنچتی ہے۔ یہ دیکھنے کی جگہیں ہیں، گارنٹی نہیں۔` } },
  { target: 'profile', en: { t: 'Step 3: the gamma profile', b: () => 'This curve shows what dealer hedging would do if price moved to each level. Where the line is above zero (green) moves are dampened. Where it is below zero (red) moves are amplified. The white line is today\'s price and the yellow dashed line is the Gamma Flip, where the curve crosses zero.' },
    ur: { t: 'تیسرا قدم: گیما پروفائل', b: () => 'یہ لکیر دکھاتی ہے کہ قیمت ہر سطح پر پہنچے تو ڈیلرز کا ہیجنگ کیا اثر ڈالے گا۔ جہاں لکیر صفر سے اوپر (سبز) ہو وہاں حرکت دبتی ہے، جہاں نیچے (سرخ) ہو وہاں حرکت بڑھتی ہے۔ سفید لکیر آج کی قیمت اور پیلی لکیر گیما فلپ ہے۔' } },
  { target: 'strikes', en: { t: 'Step 4: gamma by strike', b: () => 'Each row is a strike price. Green bars on the right are call gamma, red bars on the left are put gamma. The longest bars are the walls. The highlighted row is where price is now.' },
    ur: { t: 'چوتھا قدم: سٹرائیک کے حساب سے گیما', b: () => 'ہر قطار ایک سٹرائیک قیمت ہے۔ دائیں سبز بار کال گیما اور بائیں سرخ بار پٹ گیما ہیں۔ سب سے لمبے بار وال ہیں۔ نمایاں قطار وہ ہے جہاں قیمت ابھی ہے۔' } },
  { target: 'ladder', en: { t: 'Step 5: the live ladder', b: (f) => `The ladder puts the levels in order with the live price (${f.price}) between them, so you can see at a glance which level is closest above and below. It updates by itself while the market is open.` },
    ur: { t: 'پانچواں قدم: لائیو سیڑھی', b: (f) => `سیڑھی سطحوں کو ترتیب سے دکھاتی ہے اور بیچ میں لائیو قیمت (${f.price}) ہوتی ہے، تاکہ فوراً نظر آئے کہ اوپر اور نیچے سب سے قریب لیول کون سا ہے۔ مارکیٹ کھلی ہو تو یہ خود اپڈیٹ ہوتی رہتی ہے۔` } },
  { art: 'checklist', en: { t: 'How to use it in a trade', b: () => 'A simple routine that fits any strategy.' },
    ur: { t: 'ٹریڈ میں کیسے استعمال کریں', b: () => 'ایک سادہ طریقہ جو ہر حکمت عملی کے ساتھ چلتا ہے۔' } },
  { en: { t: 'What GEX cannot do', b: () => 'It is an estimate built from open interest, which does not say who holds which side. Data is about 15 minutes delayed. Forex pairs have no options book, so there is no GEX for EURUSD or GBPUSD. Gold uses the gold ETF options, converted to the live gold price. Never trade a level alone: wait for your own confirmation and always use a stop. This is education, not financial advice.' },
    ur: { t: 'GEX کیا نہیں کر سکتا', b: () => 'یہ اوپن انٹرسٹ سے بنا اندازہ ہے، جو یہ نہیں بتاتا کہ کون کس طرف ہے۔ ڈیٹا تقریباً 15 منٹ پرانا ہوتا ہے۔ فاریکس جوڑوں کی آپشنز مارکیٹ نہیں ہوتی، اس لیے EURUSD یا GBPUSD کا GEX نہیں ہوتا۔ گولڈ کے لیے گولڈ ETF آپشنز استعمال ہوتے ہیں اور لائیو گولڈ قیمت پر منتقل کیے جاتے ہیں۔ صرف ایک لیول دیکھ کر کبھی ٹریڈ نہ کریں، اپنی تصدیق کا انتظار کریں اور ہمیشہ سٹاپ لگائیں۔ یہ تعلیم ہے، مالی مشورہ نہیں۔' } },
];

const CHECK_EN = ['Check the weather: calm (positive) or wild (negative)?', 'Press "Copy levels" and mark them on your chart.', 'Wait for your own signal near a level: a rejection, a break and retest, a liquidity sweep.', 'Place the stop just beyond the level, never in the middle of nowhere.', 'Come back later: levels refresh through the day and reset after expiry.'];
const CHECK_UR = ['موسم دیکھیں: پرسکون (مثبت) یا تیز (منفی)؟', '"Copy levels" دبائیں اور لیولز اپنے چارٹ پر لگائیں۔', 'کسی لیول کے قریب اپنے سگنل کا انتظار کریں: ریجیکشن، بریک اور ری ٹیسٹ، یا لیکوئیڈیٹی سویپ۔', 'سٹاپ لیول کے بالکل پار رکھیں، بیچ میدان میں نہیں۔', 'بعد میں دوبارہ دیکھیں: لیولز دن بھر اپڈیٹ ہوتے ہیں اور ایکسپائری کے بعد بدل جاتے ہیں۔'];

const Hedge: React.FC<{ ur: boolean }> = ({ ur }) => (
  <div className="grid grid-cols-2 gap-2 my-2 text-[11px]" aria-hidden>
    {[{ c: 'emerald', up: false, t: ur ? 'مثبت گیما: قیمت اوپر → ڈیلر بیچے' : 'Positive gamma: price up → dealer sells' }, { c: 'rose', up: true, t: ur ? 'منفی گیما: قیمت اوپر → ڈیلر خریدے' : 'Negative gamma: price up → dealer buys' }].map((x) => (
      <div key={x.c} className={`rounded-xl border p-2 text-center ${x.c === 'emerald' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
        <div className="flex items-center justify-center gap-3 h-9 text-lg font-bold"><span className="text-white/80 gex-bob">▲</span><span className={x.up ? 'gex-bob2' : 'gex-bob3'}>{x.up ? '▲' : '▼'}</span></div>
        <div className="mt-1 leading-snug">{x.t}</div>
      </div>
    ))}
    <style>{`@keyframes gexb{0%,100%{transform:translateY(2px)}50%{transform:translateY(-4px)}}@keyframes gexd{0%,100%{transform:translateY(-3px)}50%{transform:translateY(3px)}}.gex-bob{animation:gexb 1.4s ease-in-out infinite}.gex-bob2{animation:gexb 1.4s ease-in-out infinite}.gex-bob3{animation:gexd 1.4s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.gex-bob,.gex-bob2,.gex-bob3{animation:none}}`}</style>
  </div>
);

interface Props { facts: TourFacts; onClose: () => void; initialLang?: 'en' | 'ur' }
const GexTour: React.FC<Props> = ({ facts, onClose, initialLang }) => {
  const [i, setI] = useState(0);
  const [lang, setLang] = useState<'en' | 'ur'>(() => initialLang || ((() => { try { return localStorage.getItem('ppfx_gex_tour_lang') === 'ur' ? 'ur' : 'en'; } catch { return 'en'; } })()));
  const step = STEPS[i]; const ur = lang === 'ur'; const txt = ur ? step.ur : step.en;
  const last = i === STEPS.length - 1;
  const items = useMemo(() => (ur ? CHECK_UR : CHECK_EN), [ur]);

  useEffect(() => { try { localStorage.setItem('ppfx_gex_tour_lang', lang); } catch { /* ignore */ } }, [lang]);
  useEffect(() => {
    const el = step.target ? (document.querySelector(`[data-gex="${step.target}"]`) as HTMLElement | null) : null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const prev = { outline: el.style.outline, offset: el.style.outlineOffset, shadow: el.style.boxShadow, radius: el.style.borderRadius, z: el.style.position };
    el.style.outline = '2px solid #22d3ee'; el.style.outlineOffset = '6px'; el.style.boxShadow = '0 0 0 9999px rgba(2,6,23,.55), 0 0 30px rgba(34,211,238,.45)'; el.style.position = el.style.position || 'relative';
    el.style.transition = 'box-shadow .25s, outline-color .25s';
    return () => { el.style.outline = prev.outline; el.style.outlineOffset = prev.offset; el.style.boxShadow = prev.shadow; el.style.position = prev.z; };
  }, [step.target, i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowRight' || e.key === 'Enter') setI((v) => Math.min(STEPS.length - 1, v + 1)); else if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1)); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="false" aria-label="GEX tour" className="fixed inset-x-3 bottom-3 sm:bottom-5 z-[90] mx-auto max-w-xl" data-testid="gex-tour">
      <div className="rounded-3xl border border-cyan-400/50 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 p-4 sm:p-5" dir={ur ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between gap-2 mb-2" dir="ltr">
          <span className="text-[10px] font-mono-code font-bold tracking-widest text-cyan-300">GEX TOUR · {i + 1}/{STEPS.length}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setLang(ur ? 'en' : 'ur')} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-400"><Languages className="w-3.5 h-3.5" />{ur ? 'English' : 'اردو'}</button>
            <button type="button" onClick={onClose} aria-label="Close tour" className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <h3 className={`font-bold text-white ${ur ? 'text-xl leading-relaxed' : 'text-base sm:text-lg'}`}>{txt.t}</h3>
        <p className={`text-slate-300 mt-1.5 ${ur ? 'text-[15px] leading-8' : 'text-sm leading-relaxed'}`}>{txt.b(facts)}</p>
        {step.art === 'hedge' && <Hedge ur={ur} />}
        {step.art === 'checklist' && <ol className={`mt-2 space-y-1.5 ${ur ? 'text-[15px] leading-8' : 'text-sm'} text-slate-200`}>{items.map((x, k) => <li key={k} className="flex gap-2"><span className="shrink-0 grid place-items-center w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[11px] font-bold mt-1">{k + 1}</span><span>{x}</span></li>)}</ol>}
        <div className="mt-3 flex items-center justify-between gap-2" dir="ltr">
          <div className="flex gap-1" aria-hidden>{STEPS.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-cyan-400' : 'w-1.5 bg-slate-700'}`} />)}</div>
          <div className="flex gap-2">
            <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" />Back</button>
            <button type="button" onClick={() => (last ? onClose() : setI(i + 1))} className="inline-flex items-center gap-1 text-xs px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400">{last ? 'Done' : 'Next'}{!last && <ChevronRight className="w-3.5 h-3.5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GexTour;
