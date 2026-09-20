import React, { useMemo, useState } from 'react';
import {
  Brain, ShieldCheck, HeartPulse, Target, Zap, Activity, BookOpen,
  Play, ChevronRight, Languages, Sparkles, RotateCcw, Search, LockKeyhole
} from 'lucide-react';
import { Trade } from '../../types';
import {
  CATEGORY_LIST, PsychologicalCategory, InteractiveSession,
  SessionResultLog, HabitProgressState
} from './psychologyData';

interface Props {
  onSelectCategory: (category: PsychologicalCategory) => void;
  onLaunchSessionDirect: (category: PsychologicalCategory, session: InteractiveSession) => void;
  resultLogs: SessionResultLog[];
  habitProgress: HabitProgressState;
  trades: Trade[];
}

type Lang = 'en' | 'ur' | 'hi' | 'ar' | 'es' | 'fr';

const copy: Record<Lang, Record<string, string>> = {
  en: {
    title:'Trading Psychology Center', subtitle:'A simple, practical system for making better decisions under market pressure.',
    status:'TODAY', ready:'Ready to trade', caution:'Slow down', recovery:'Recovery first',
    check:'Quick mental check', checkDesc:'Before you trade, tell the truth about your current state.',
    calm:'Calm', tense:'Tense', tired:'Tired', excited:'Excited', angry:'Angry', distracted:'Distracted',
    pillars:'Your six psychology areas', pillarsDesc:'You do not need 17 confusing labels. Start with the problem you feel right now.',
    learn:'Learn', practice:'Practice', history:'Progress', language:'Language', translate:'Translate',
    plain:'Simple language mode', advanced:'Advanced library', recommendation:'Recommended for you',
    start:'Start practice', open:'Open', recent:'Recent practice', noRecent:'No practice recorded yet.',
    plan:'Follow the plan. Protect risk. Let outcomes vary.', why:'Why this matters',
    journal:'Journal signals', discipline:'Plan-following', sessions:'Practice sessions',
    fear:'Fear & Loss', fearDesc:'Handle fear, stop-loss discomfort and the urge to exit too early.',
    impulse:'Impulse & FOMO', impulseDesc:'Stop chasing candles, boredom trades and revenge trades.',
    confidence:'Confidence & Ego', confidenceDesc:'Keep winning streaks and strong conviction from becoming oversized risk.',
    patience:'Patience & Focus', patienceDesc:'Wait for your setup instead of forcing action when the market is slow.',
    discipline:'Discipline & Rules', disciplineDesc:'Turn your trading plan into repeatable actions before, during and after a trade.',
    recovery:'Recovery & Energy', recoveryDesc:'Reset after losses, stress, fatigue or a long trading session.',
    selectLanguage:'Choose a language. The center will translate its visible content with AI when available.',
    translating:'Translating…', translated:'Translated', translationError:'Translation service unavailable. English remains available.',
    simpleRule:'One idea at a time. Short sentences. Clear actions.',
    advancedDesc:'The original 17-topic library remains available for deeper study. It is now an advanced layer, not the first screen.',
  },
  ur: {
    title:'ٹریڈنگ سائیکالوجی سینٹر', subtitle:'مارکیٹ کے دباؤ میں بہتر فیصلے کرنے کے لیے آسان اور عملی نظام۔',
    status:'آج', ready:'ٹریڈ کے لیے تیار', caution:'ذرا رکیں', recovery:'پہلے ریکوری',
    check:'فوری ذہنی چیک', checkDesc:'ٹریڈ سے پہلے اپنی موجودہ کیفیت کے بارے میں سچ بتائیں۔',
    calm:'پرسکون', tense:'تناؤ', tired:'تھکن', excited:'جوش', angry:'غصہ', distracted:'توجہ بٹی ہوئی',
    pillars:'آپ کے سائیکالوجی کے چھ اہم حصے', pillarsDesc:'17 مشکل نام یاد رکھنے کی ضرورت نہیں۔ جو مسئلہ ابھی محسوس ہو رہا ہے، وہ منتخب کریں۔',
    learn:'سیکھیں', practice:'مشق', history:'پروگریس', language:'زبان', translate:'ترجمہ',
    plain:'آسان زبان', advanced:'ایڈوانس لائبریری', recommendation:'آپ کے لیے تجویز',
    start:'مشق شروع کریں', open:'کھولیں', recent:'حالیہ مشق', noRecent:'ابھی کوئی مشق ریکارڈ نہیں ہوئی۔',
    plan:'پلان پر عمل کریں۔ رسک محفوظ رکھیں۔ نتائج کو بدلنے دیں۔', why:'یہ کیوں اہم ہے',
    journal:'جرنل سگنلز', discipline:'پلان فالو کرنے کی شرح', sessions:'مشق سیشنز',
    fear:'خوف اور نقصان', fearDesc:'خوف، اسٹاپ لاس کی بے چینی اور جلدی نکلنے کی خواہش کو سنبھالیں۔',
    impulse:'امپلس اور FOMO', impulseDesc:'کینڈل کا پیچھا، بوریت کی ٹریڈ اور بدلہ لینے والی ٹریڈ روکیں۔',
    confidence:'اعتماد اور انا', confidenceDesc:'جیت کے سلسلے اور زیادہ اعتماد کو اضافی رسک بننے سے روکیں۔',
    patience:'صبر اور توجہ', patienceDesc:'مارکیٹ سست ہو تو زبردستی ٹریڈ لینے کے بجائے اپنے سیٹ اپ کا انتظار کریں۔',
    discipline:'ڈسپلن اور رولز', disciplineDesc:'ٹریڈنگ پلان کو ہر ٹریڈ سے پہلے، دوران اور بعد میں دہرائے جانے والے عمل میں بدلیں۔',
    recovery:'ریکوری اور توانائی', recoveryDesc:'نقصان، تناؤ، تھکن یا لمبے سیشن کے بعد خود کو ری سیٹ کریں۔',
    selectLanguage:'زبان منتخب کریں۔ دستیاب ہونے پر یہ سینٹر AI کے ذریعے نظر آنے والا مواد ترجمہ کرے گا۔',
    translating:'ترجمہ ہو رہا ہے…', translated:'ترجمہ مکمل', translationError:'ترجمہ سروس دستیاب نہیں۔ English دستیاب رہے گی۔',
    simpleRule:'ایک وقت میں ایک بات۔ چھوٹے جملے۔ واضح عمل۔',
    advancedRule:'ایڈوانس لائبریری', advancedDesc:'اصل 17 موضوعات محفوظ ہیں۔ اب یہ پہلے صفحے کے بجائے گہری سیکھنے کی تہہ ہیں۔',
  },
  hi: {}, ar: {}, es: {}, fr: {}
};

const fallbackLabels: Record<Lang, Record<string,string>> = {
  hi:{}, ar:{}, es:{}, fr:{}, en:{}, ur:{}
};

const pillarDefs = [
  { id:'FEAR', key:'fear', icon:HeartPulse, tone:'rose', ids:['FEAR','LOSS_AVERSION','HESITATION','POST_LOSS_SHAME','PRE_MARKET_ANXIETY'] },
  { id:'IMPULSE', key:'impulse', icon:Zap, tone:'orange', ids:['FOMO','REVENGE_TRADING','BOREDOM_TRADING','IMPATIENCE'] },
  { id:'CONFIDENCE', key:'confidence', icon:Target, tone:'emerald', ids:['GREED','OVERCONFIDENCE','POST_WIN_OVERCONFIDENCE'] },
  { id:'PATIENCE', key:'patience', icon:Brain, tone:'cyan', ids:['ANALYSIS_PARALYSIS','PERFECTIONISM','COMPARISON_ANXIETY'] },
  { id:'DISCIPLINE', key:'discipline', icon:ShieldCheck, tone:'indigo', ids:['DISCIPLINE_FATIGUE'] },
  { id:'RECOVERY', key:'recovery', icon:Activity, tone:'violet', ids:['BURNOUT'] },
] as const;

function findCategory(ids: readonly string[]) {
  return CATEGORY_LIST.find(c => ids.includes(c.id));
}

export const PsychologyProfessionalDashboard: React.FC<Props> = ({
  onSelectCategory, onLaunchSessionDirect, resultLogs = [], trades = []
}) => {
  const [lang, setLang] = useState<Lang>('en');
  const [translation, setTranslation] = useState<Record<string,string> | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const [state, setState] = useState<'CALM'|'CAUTION'|'RECOVERY'>('CALM');
  const [query, setQuery] = useState('');

  const t = (key:string) => translation?.[key] || copy[lang]?.[key] || copy.en[key] || key;
  const closed = useMemo(() => [...trades].filter(x=>x.status !== 'OPEN').sort((a,b)=>b.timestamp-a.timestamp), [trades]);
  const losses = closed.slice(0,2).filter(x=>(x.profitLoss || 0) < 0).length;
  const currentState = losses >= 2 ? 'RECOVERY' : state;
  const planCount = trades.filter(x=>x.postPsychology?.followedPlan !== false).length;
  const planRate = trades.length ? Math.round(planCount / trades.length * 100) : 100;

  const visiblePillars = pillarDefs.filter(p => {
    const text = (t(p.key) + ' ' + t(p.key+'Desc')).toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const translateCenter = async (target: Lang) => {
    setLang(target); setTranslation(null); setTranslationError(false);
    if (target === 'en' || target === 'ur') return;
    setTranslating(true);
    try {
      const res = await fetch('/api/gemini/translate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          targetLanguage: target,
          texts: Object.values(copy.en),
          keys: Object.keys(copy.en)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.translations) throw new Error('translation failed');
      setTranslation(data.translations);
    } catch {
      setTranslationError(true);
    } finally { setTranslating(false); }
  };

  const stateLabel = currentState === 'RECOVERY' ? t('recovery') : currentState === 'CAUTION' ? t('caution') : t('ready');

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir={lang === 'ur' || lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-[#070a12] via-[#0c1220] to-[#070a12] p-5 sm:p-7 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">PRIMEPIPFX • PSYCHOLOGY</span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">{t('simpleRule')}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{t('title')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t('subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              <Languages className="h-4 w-4 text-cyan-300" />
              <span className="sr-only">{t('language')}</span>
              <select aria-label={t('language')} value={lang} onChange={e=>translateCenter(e.target.value as Lang)} className="bg-transparent outline-none">
                <option value="en">English</option><option value="ur">اردو</option><option value="hi">हिन्दी</option><option value="ar">العربية</option><option value="es">Español</option><option value="fr">Français</option>
              </select>
            </label>
            <button type="button" onClick={()=>translateCenter(lang)} disabled={translating || lang==='en'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50">
              {translating ? <RotateCcw className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
              {translating ? t('translating') : t('translate')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#0a0f1b] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>{t('status')}</span><Activity className="h-4 w-4 text-cyan-300"/></div>
          <div className="mt-2 text-lg font-bold text-white">{stateLabel}</div>
          <p className="mt-1 text-xs text-slate-500">{losses >= 2 ? 'Two recent losses detected.' : t('plan')}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0a0f1b] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>{t('discipline')}</span><ShieldCheck className="h-4 w-4 text-emerald-300"/></div>
          <div className="mt-2 text-lg font-bold text-emerald-300">{planRate}%</div>
          <p className="mt-1 text-xs text-slate-500">{t('journal')}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0a0f1b] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>{t('sessions')}</span><BookOpen className="h-4 w-4 text-amber-300"/></div>
          <div className="mt-2 text-lg font-bold text-white">{resultLogs.length}</div>
          <p className="mt-1 text-xs text-slate-500">{t('practice')}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-cyan-500/20 bg-[#080d17] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-lg font-bold text-white">{t('check')}</h3><p className="text-xs text-slate-400">{t('checkDesc')}</p></div>
          <div className="flex flex-wrap gap-2">
            {(['CALM','CAUTION','RECOVERY'] as const).map(s => (
              <button key={s} type="button" onClick={()=>setState(s)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${currentState===s?'border-cyan-400/60 bg-cyan-400/10 text-cyan-200':'border-slate-700 bg-slate-950 text-slate-400'}`}>
                {s==='CALM'?t('calm'):s==='CAUTION'?t('tense'):t('recovery')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          {[['CALM','calm'],['CAUTION','tense'],['TIRED','tired'],['EXCITED','excited'],['ANGRY','angry'],['DISTRACTED','distracted']].map(([id,key])=>(
            <button key={id} type="button" onClick={()=>setState(id==='ANGRY'||id==='TIRED'?'CAUTION':id==='EXCITED'||id==='DISTRACTED'?'CAUTION':'CALM')} className="rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-3 text-xs text-slate-300 hover:border-cyan-500/40">
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 className="text-xl font-bold text-white">{t('pillars')}</h3><p className="text-sm text-slate-400">{t('pillarsDesc')}</p></div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400"><Search className="h-4 w-4"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search" className="w-28 bg-transparent outline-none sm:w-40"/></label>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePillars.map(p => {
            const cat = findCategory(p.ids);
            if (!cat) return null;
            const session = cat.sessions[0];
            const Icon = p.icon;
            return <div key={p.id} className="group rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0b111d] to-[#080c15] p-4 transition hover:border-cyan-500/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><div className="rounded-xl border border-slate-700 bg-slate-950 p-2.5"><Icon className="h-5 w-5 text-cyan-300"/></div><div><h4 className="font-bold text-white">{t(p.key)}</h4><p className="mt-1 text-xs leading-5 text-slate-400">{t(p.key+'Desc')}</p></div></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={()=>onSelectCategory(cat)} className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-500/40">{t('open')} <ChevronRight className="inline h-3.5 w-3.5"/></button>
                <button type="button" onClick={()=>onLaunchSessionDirect(cat,session)} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300"><Play className="inline h-3.5 w-3.5 fill-current"/> {t('start')}</button>
              </div>
            </div>;
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4">
        <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-indigo-300"/><div><h3 className="font-bold text-indigo-200">{t('advanced')}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{t('advancedDesc')}</p><button type="button" onClick={()=>{const cat=CATEGORY_LIST[0]; if(cat) onSelectCategory(cat)}} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 px-3 py-2 text-xs font-bold text-indigo-200">{t('open')} <ChevronRight className="h-3.5 w-3.5"/></button></div></div>
      </div>

      {translationError && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">{t('translationError')}</div>}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">{t('plan')}</div>
    </div>
  );
};
