import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, Building2, CheckCircle2, ChevronDown, ExternalLink, GraduationCap, Crosshair, Landmark, Languages, Layers, Library, Lightbulb, Target, Waypoints, Loader2, MessageCircle, Search, ShieldAlert } from 'lucide-react';
import { BOT_LAUNCH, BOT_TIERS, COURSE, INDICATOR_FEE, INSTITUTIONAL, type Module } from '../../data/learningHub';
import { LESSON_UR, LEVEL_UR, MODULE_UR } from '../../data/learningHubUr';
import { TOPIC_COUNT } from '../../data/advanced';
import { AdvancedLibrary, URDU_FONT, type Lang } from './AdvancedLibrary';

type Tab = 'LEARN' | 'INSTITUTIONAL' | 'LIBRARY' | 'BOT' | 'INDICATOR' | 'VOICE';
const TABS: { id: Tab; en: string; ur: string; icon: React.ElementType; tone: string }[] = [
  { id: 'LEARN', en: 'Pro Trading Learning', ur: 'پرو ٹریڈنگ لرننگ', icon: GraduationCap, tone: 'from-cyan-400 to-sky-500' },
  { id: 'INSTITUTIONAL', en: 'Institutional Trading', ur: 'ادارہ جاتی ٹریڈنگ', icon: Landmark, tone: 'from-amber-300 to-orange-500' },
  { id: 'LIBRARY', en: 'Research Library', ur: 'ریسرچ لائبریری', icon: Library, tone: 'from-violet-400 to-fuchsia-500' },
  { id: 'BOT', en: 'SBT Bot', ur: 'SBT بوٹ', icon: Bot, tone: 'from-emerald-300 to-teal-500' },
  { id: 'INDICATOR', en: 'SBT Indicator', ur: 'SBT انڈیکیٹر', icon: Crosshair, tone: 'from-sky-400 to-indigo-500' },
  { id: 'VOICE', en: 'Feelings → Solutions', ur: 'احساسات ← حل', icon: Lightbulb, tone: 'from-fuchsia-400 to-violet-500' },
];
const LANG_KEY = 'ppfx_learning_lang';
const uf = (ur: boolean) => (ur ? URDU_FONT : undefined);
const OWNER_WA = '923406671495';
const me = () => { try { return JSON.parse(localStorage.getItem('primepipfx_user_profile') || 'null')?.username || ''; } catch { return ''; } };

const DONE_KEY = 'ppfx_learning_done_v1';
const readDone = (): string[] => { try { const v = JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
/** Lessons the reader has ticked off (kept on this device). */
function useDone() {
  const [done, setDone] = useState<string[]>(readDone);
  useEffect(() => { const f = () => setDone(readDone()); window.addEventListener('ppfx:learning-done', f); return () => window.removeEventListener('ppfx:learning-done', f); }, []);
  const toggle = (id: string) => { const cur = readDone(); const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; try { localStorage.setItem(DONE_KEY, JSON.stringify(next)); } catch { /* storage blocked */ } setDone(next); window.dispatchEvent(new Event('ppfx:learning-done')); };
  return { done, toggle };
}
const PALETTE = [
  { grad: 'from-cyan-400 to-sky-500', text: 'text-cyan-300', ring: 'border-cyan-400/60', soft: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-100', bar: 'bg-cyan-400', glow: 'rgba(34,211,238,0.16)' },
  { grad: 'from-violet-400 to-fuchsia-500', text: 'text-violet-300', ring: 'border-violet-400/60', soft: 'bg-violet-500/10 border-violet-400/30 text-violet-100', bar: 'bg-violet-400', glow: 'rgba(167,139,250,0.16)' },
  { grad: 'from-emerald-300 to-teal-500', text: 'text-emerald-300', ring: 'border-emerald-400/60', soft: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100', bar: 'bg-emerald-400', glow: 'rgba(52,211,153,0.16)' },
  { grad: 'from-amber-300 to-orange-500', text: 'text-amber-300', ring: 'border-amber-400/60', soft: 'bg-amber-500/10 border-amber-400/30 text-amber-100', bar: 'bg-amber-400', glow: 'rgba(251,191,36,0.16)' },
  { grad: 'from-rose-400 to-pink-500', text: 'text-rose-300', ring: 'border-rose-400/60', soft: 'bg-rose-500/10 border-rose-400/30 text-rose-100', bar: 'bg-rose-400', glow: 'rgba(251,113,133,0.16)' },
  { grad: 'from-sky-400 to-indigo-500', text: 'text-sky-300', ring: 'border-sky-400/60', soft: 'bg-sky-500/10 border-sky-400/30 text-sky-100', bar: 'bg-sky-400', glow: 'rgba(56,189,248,0.16)' },
];
const HUB_CSS = `
@keyframes ppfxUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.ppfx-up{animation:ppfxUp .55s cubic-bezier(.2,.7,.2,1) both}
@keyframes ppfxAurora{0%,100%{transform:translate3d(-8%,-6%,0) scale(1)}50%{transform:translate3d(8%,6%,0) scale(1.15)}}
.ppfx-aurora{animation:ppfxAurora 16s ease-in-out infinite}
@keyframes ppfxShine{to{background-position:200% 0}}
.ppfx-shine{background-image:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.14) 50%,transparent 70%);background-size:200% 100%;animation:ppfxShine 3.2s linear infinite}
@keyframes ppfxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ppfx-float{animation:ppfxFloat 5s ease-in-out infinite}
.ppfx-card{transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
.ppfx-card:hover{transform:translateY(-2px)}
@media (prefers-reduced-motion:reduce){.ppfx-up,.ppfx-aurora,.ppfx-shine,.ppfx-float{animation:none}.ppfx-card:hover{transform:none}}
`;

/** Course / institutional reader: chapters on the left, numbered lessons on the right, progress kept on this device. */
const Curriculum: React.FC<{ modules: Module[]; accent: 'cyan' | 'amber'; lang: Lang }> = ({ modules, accent, lang }) => {
  const ur = lang === 'ur';
  const off = accent === 'amber' ? 3 : 0;
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<string>(modules[0]?.id || '');
  const [open, setOpen] = useState<string | null>(modules[0]?.lessons[0]?.id || null);
  const { done, toggle } = useDone();
  const ql = q.trim().toLowerCase();
  const hit = (l: Module['lessons'][number]) => !ql || `${l.title} ${l.summary} ${l.points.join(' ')} ${(LESSON_UR[l.id] || []).join(' ')}`.toLowerCase().includes(ql);
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  const doneCount = modules.reduce((n, m) => n + m.lessons.filter((l) => done.includes(l.id)).length, 0);
  const shown = useMemo(() => (ql ? modules.map((m) => ({ ...m, lessons: m.lessons.filter(hit) })).filter((m) => m.lessons.length) : modules.filter((m) => m.id === mod)), [modules, ql, mod]);
  const mTitle = (m: Module) => (ur ? MODULE_UR[m.id] || m.title : m.title);
  return (
    <div className="space-y-4" dir={ur ? 'rtl' : 'ltr'} data-testid="curriculum">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="relative block flex-1 max-w-md">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-500 ${ur ? 'right-3' : 'left-3'}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ur ? `${total} اسباق میں تلاش کریں…` : `Search ${total} lessons…`} aria-label="Search lessons" style={uf(ur)} className={`w-full ${ur ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 outline-none text-sm text-slate-100 placeholder:text-slate-500`} />
        </label>
        <div className="flex items-center gap-3 sm:ms-auto" data-testid="course-progress">
          <div className="w-40 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
          <span className="text-[12px] text-slate-300 font-semibold whitespace-nowrap" style={uf(ur)}>{ur ? `${doneCount} / ${total} مکمل` : `${doneCount} of ${total} done`}</span>
        </div>
      </div>
      <div className="grid lg:grid-cols-[290px_1fr] gap-4 items-start">
        {/* Chapters */}
        <nav aria-label={ur ? 'ابواب' : 'Chapters'} className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:sticky lg:top-4">
          {modules.map((m, i) => {
            const c = PALETTE[(i + off) % PALETTE.length]; const n = m.lessons.filter((l) => done.includes(l.id)).length; const on = !ql && mod === m.id;
            return (
              <button key={m.id} type="button" onClick={() => { setQ(''); setMod(m.id); setOpen(m.lessons[0]?.id || null); }} aria-current={on} data-testid={`chapter-${m.id}`}
                style={{ animationDelay: `${i * 60}ms`, boxShadow: on ? `0 10px 30px -12px ${c.glow}` : undefined }}
                className={`ppfx-up ppfx-card shrink-0 w-[230px] lg:w-full ${ur ? 'text-right' : 'text-left'} rounded-2xl border p-3 cursor-pointer ${on ? `${c.ring} bg-white/[0.06]` : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-slate-950 font-black text-[13px] shrink-0`}>{n === m.lessons.length ? <CheckCircle2 className="w-4 h-4" /> : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-slate-100 leading-snug" style={uf(ur)}>{mTitle(m).replace(/^(Module|ماڈیول) \d+ · /, '')}</span>
                    <span className={`block text-[10.5px] ${c.text}`} style={uf(ur)}>{ur ? LEVEL_UR[m.level] : m.level} · {n}/{m.lessons.length}</span>
                  </span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full ${c.bar} transition-all duration-500`} style={{ width: `${(n / m.lessons.length) * 100}%` }} /></div>
              </button>
            );
          })}
        </nav>
        {/* Lessons */}
        <div className="space-y-5 min-w-0">
          {shown.map((m) => {
            const mi = modules.findIndex((x) => x.id === m.id); const c = PALETTE[(mi + off) % PALETTE.length];
            return (
              <section key={m.id} className="space-y-2.5">
                <div className="ppfx-up rounded-2xl border border-slate-800 p-4 relative overflow-hidden" style={{ background: `radial-gradient(ellipse at ${ur ? 'top left' : 'top right'}, ${c.glow}, transparent 60%), #070b16` }}>
                  <div className={`text-[10.5px] font-mono-code uppercase tracking-[0.22em] ${c.text}`} dir="ltr">Chapter {mi + 1} of {modules.length}</div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5" style={uf(ur)}>{mTitle(m)}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-400"><span className={`px-2 py-0.5 rounded-full border font-bold ${c.soft}`} style={uf(ur)}>{ur ? LEVEL_UR[m.level] : m.level}</span><span style={uf(ur)}>{ur ? `${m.lessons.length} اسباق` : `${m.lessons.length} lessons`}</span></div>
                </div>
                {m.lessons.map((l, li) => {
                  const on = open === l.id || !!ql; const isDone = done.includes(l.id);
                  return (
                    <article key={l.id} style={{ animationDelay: `${80 + li * 70}ms` }} className={`ppfx-up ppfx-card rounded-2xl border bg-slate-950/70 ${on ? c.ring : 'border-slate-800 hover:border-slate-600'}`}>
                      <button type="button" onClick={() => setOpen(on && !ql ? null : l.id)} aria-expanded={on} className={`w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer ${ur ? 'text-right' : 'text-left'}`}>
                        <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-[12px] font-black shrink-0 ${isDone ? 'bg-emerald-400 border-emerald-300 text-emerald-950' : `${c.soft}`}`}>{isDone ? <CheckCircle2 className="w-4 h-4" /> : li + 1}</span>
                        <span className="flex-1 font-semibold text-slate-100 text-[14.5px]" style={uf(ur)}>{ur && LESSON_UR[l.id] ? LESSON_UR[l.id][0] : l.title}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${on ? 'rotate-180' : ''}`} />
                      </button>
                      {on && (
                        <div className="px-4 pb-4 space-y-3 ppfx-up" style={{ animationDuration: '.35s' }}>
                          <p className={`text-[14px] text-slate-200 ${ur ? 'leading-[2.3]' : 'leading-relaxed'}`} style={uf(ur)}>{ur && LESSON_UR[l.id] ? LESSON_UR[l.id][1] : l.summary}</p>
                          {ur && <p className="text-[12px] text-slate-500 leading-relaxed text-left" dir="ltr">{l.summary}</p>}
                          <div dir="ltr">
                            <div className={`text-[10.5px] font-bold uppercase tracking-[0.16em] mb-1.5 ${c.text}`}>Key points</div>
                            <ul className="grid sm:grid-cols-3 gap-2">
                              {l.points.map((p) => <li key={p} className={`flex gap-2 text-[12.5px] rounded-xl border px-3 py-2 ${c.soft}`}><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="text-slate-100">{p}</span></li>)}
                            </ul>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1" dir="ltr">
                            {l.links.map((k) => (
                              <a key={k.url} href={k.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[12px] font-semibold text-slate-100 hover:border-slate-500">
                                Read: {k.label} <span className="text-slate-500 font-normal">· {k.site}</span><ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                            <button type="button" onClick={() => toggle(l.id)} data-testid={`done-${l.id}`} className={`ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold cursor-pointer ${isDone ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-slate-600 text-slate-200 hover:border-emerald-400/60'}`}>
                              <CheckCircle2 className="w-3.5 h-3.5" /><span style={uf(ur)}>{isDone ? (ur ? 'مکمل ✓' : 'Completed') : (ur ? 'مکمل نشان لگائیں' : 'Mark as done')}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            );
          })}
          {!shown.length && <p className="text-sm text-slate-500" style={uf(ur)}>{ur ? `“${q}” کا کوئی سبق نہیں ملا۔` : `No lesson matches “${q}”.`}</p>}
        </div>
      </div>
    </div>
  );
};

const Countdown: React.FC<{ to: number; ur?: boolean }> = ({ to, ur }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, to - now);
  const parts = (ur ? [['دن', Math.floor(left / 86_400_000)], ['گھنٹے', Math.floor(left / 3_600_000) % 24], ['منٹ', Math.floor(left / 60_000) % 60], ['سیکنڈ', Math.floor(left / 1000) % 60]] : [['Days', Math.floor(left / 86_400_000)], ['Hours', Math.floor(left / 3_600_000) % 24], ['Minutes', Math.floor(left / 60_000) % 60], ['Seconds', Math.floor(left / 1000) % 60]]) as [string, number][];
  if (!left) return <div className="text-2xl font-black text-emerald-300">The SBT bot is live.</div>;
  return (
    <div className="grid grid-cols-4 gap-2 max-w-md" data-testid="bot-countdown" dir="ltr">
      {parts.map(([l, v]) => (
        <div key={l} className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 py-2.5 text-center">
          <div className="text-2xl sm:text-4xl font-black tabular-nums text-white">{String(v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-200/80" style={uf(!!ur)}>{l}</div>
        </div>
      ))}
    </div>
  );
};

const TIER_UR: Record<string, { blurb: string; features: string[] }> = {
  starter: { blurb: 'ایک اکاؤنٹ، اہم جوڑیوں پر SBT ماڈل۔', features: ['1 ٹریڈنگ اکاؤنٹ', 'اہم فاریکس جوڑیاں + سونا', 'مکمل خودکار داخلہ اور اخراج', 'فی ٹریڈ 1% رسک', 'سیٹ اپ میں مدد'] },
  pro: { blurb: 'زیادہ جوڑیاں اور ترجیحی سیٹ اپ۔', features: ['3 تک ٹریڈنگ اکاؤنٹس', 'تمام فاریکس جوڑیاں، سونا اور انڈیکس', 'مکمل خودکار داخلہ اور اخراج', 'فی ٹریڈ 1% رسک', 'ترجیحی سیٹ اپ اور مدد'] },
  institutional: { blurb: 'فنڈز، پراپ ڈیسکس اور بڑے سرمائے کے لیے۔', features: ['لامحدود اکاؤنٹس', 'ہر معاون مارکیٹ', 'اپنی مرضی کی رسک سیٹنگز', 'بانی سے براہِ راست رابطہ', 'خصوصی آن بورڈنگ'] },
};

const BotSection: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ur = lang === 'ur';
  const T = (en: string, u: string) => (ur ? u : en);
  const [tier, setTier] = useState<string>('pro');
  const [form, setForm] = useState({ name: '', contact: '', country: '', capital: '', note: '' });
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: { id: string; tier: string } }>({});
  const chosen = BOT_TIERS.find((t) => t.id === tier)!;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const r = await fetch('/api/bot/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, tier, username: me() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) setState({ error: j.error || 'Could not reserve right now. Please try again.' });
      else setState({ done: j.reservation });
    } catch { setState({ error: 'No connection. Please try again.' }); }
  };
  const payMsg = state.done ? `Assalam o Alaikum, I reserved the SBT Trading Bot — ${chosen.name} plan ($${chosen.fee.toLocaleString()}). Reservation ID: ${state.done.id}. Name: ${form.name}. Please send the payment details.` : '';
  const input = 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 outline-none text-sm text-slate-100 placeholder:text-slate-500';
  return (
    <div className="space-y-6">
      <section dir={ur ? 'rtl' : 'ltr'} className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.18),transparent_60%),#050b0a] p-5 sm:p-7 space-y-4">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-emerald-300">Prime Pip SBT · Trading Bot Automation</div>
        <h2 className="text-2xl sm:text-4xl font-black text-white" style={uf(ur)}>{T('Launching 1 January 2027', 'آغاز: یکم جنوری 2027')}</h2>
        <Countdown to={BOT_LAUNCH} ur={ur} />
        <div className="grid sm:grid-cols-3 gap-3 pt-2">
          {(ur ? [
            ['مکمل خودکار', 'خود SBT سیٹ اپ ڈھونڈتا، ٹریڈ کھولتا، سنبھالتا اور بند کرتا ہے — اسکرین دیکھنے کی ضرورت نہیں۔'],
            ['فی ٹریڈ 1% رسک', 'ہر پوزیشن کا حجم ایسا کہ اسٹاپ لاس پر اکاؤنٹ کا تقریباً 1% جائے۔ پہلے سرمائے کی حفاظت۔'],
            ['میٹا ٹریڈر 5 پر چلتا ہے', 'آپ کے اپنے بروکر اکاؤنٹ سے جڑتا ہے؛ آپ کا پیسہ آپ کے نام پر آپ کے بروکر کے پاس رہتا ہے۔'],
          ] : [
            ['Fully automatic', 'Finds SBT setups, enters, manages and exits trades on its own — no screen-watching.'],
            ['1% risk per trade', 'Every position is sized so a stop-loss costs about 1% of the account. Capital protection first.'],
            ['Runs on MetaTrader 5', 'Connects to your own broker account; your money stays with your broker, in your name.'],
          ]).map(([t, d]) => <div key={t} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5"><div className="font-bold text-emerald-200" style={uf(ur)}>{t}</div><div className={`text-[12.5px] text-slate-300 mt-1 ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf(ur)}>{d}</div></div>)}
        </div>
        <div className={`rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-[12.5px] text-slate-300 ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf(ur)}>
          {ur ? <><b className="text-white">کارکردگی:</b> بوٹ بانی کا SBT ماڈل ٹریڈ کرتا ہے (10 ماڈلز، لیول 1 / لیول 2 انٹریز)۔ آغاز سے پہلے یہاں تصدیق شدہ لائیو ریکارڈ شائع کیا جائے گا تاکہ آپ خود نتائج پرکھ سکیں۔</> : <><b className="text-white">Performance:</b> the bot trades the founder’s SBT model (10 models, Level 1 / Level 2 entries). A verified live track record will be published here before launch so you can judge the results yourself.</>}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-300" style={uf(ur)}>{T('Choose your plan', 'اپنا پلان چنیں')}</h3>
        <div className="grid md:grid-cols-3 gap-3" role="radiogroup" aria-label="Plan">
          {BOT_TIERS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tier === t.id} onClick={() => setTier(t.id)}
              className={`text-left rounded-3xl border-2 p-4 cursor-pointer transition ${tier === t.id ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'}`}>
              <div className="flex items-baseline justify-between"><span className="text-lg font-black text-white">{t.name}</span>{t.id === 'pro' && <span className="text-[10px] font-bold uppercase text-emerald-300" style={uf(ur)}>{T('Most chosen', 'سب سے زیادہ منتخب')}</span>}</div>
              <div className="mt-1 text-3xl font-black text-emerald-200">${t.fee.toLocaleString()}</div>
              <div className="text-[12px] text-slate-400 mt-1" style={uf(ur)}>{ur ? TIER_UR[t.id]?.blurb : t.blurb}</div>
              <ul className="mt-3 space-y-1" style={uf(ur)}>{(ur ? TIER_UR[t.id]?.features || t.features : t.features).map((f) => <li key={f} className="flex gap-1.5 text-[12px] text-slate-200"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-300 shrink-0" />{f}</li>)}</ul>
            </button>
          ))}
        </div>
      </section>

      <section dir={ur ? 'rtl' : 'ltr'} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6" data-testid="bot-reserve">
        {state.done ? (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto" />
            <div className="text-xl font-black text-white" style={uf(ur)}>{T('Your place is reserved', 'آپ کی جگہ محفوظ ہو گئی')}</div>
            <div className="text-sm text-slate-300">Reservation ID <b className="font-mono-code text-emerald-200">{state.done.id}</b> · {chosen.name} plan · ${chosen.fee.toLocaleString()}</div>
            <p className="text-[12.5px] text-slate-400 max-w-md mx-auto" style={uf(ur)}>{T('To confirm it, complete the payment. Send your reservation ID on WhatsApp and you will receive the payment details and a receipt.', 'تصدیق کے لیے ادائیگی مکمل کریں۔ اپنی ریزرویشن ID واٹس ایپ پر بھیجیں، آپ کو ادائیگی کی تفصیل اور رسید ملے گی۔')}</p>
            <a href={`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(payMsg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-400 text-emerald-950 font-black hover:bg-emerald-300">
              <MessageCircle className="w-4 h-4" /><span style={uf(ur)}>{T('Complete payment on WhatsApp', 'واٹس ایپ پر ادائیگی مکمل کریں')}</span>
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-2"><h3 className="text-lg font-black text-white" style={uf(ur)}>{T('Reserve your place', 'اپنی جگہ محفوظ کریں')}</h3><span className="text-[12px] text-slate-400">· {chosen.name} · ${chosen.fee.toLocaleString()}</span></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={T('Full name', 'پورا نام')} aria-label="Full name" className={input} />
              <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder={T('WhatsApp number or email', 'واٹس ایپ نمبر یا ای میل')} aria-label="WhatsApp number or email" className={input} />
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={T('Country', 'ملک')} aria-label="Country" className={input} />
              <input value={form.capital} onChange={(e) => setForm({ ...form, capital: e.target.value })} placeholder={T('Planned trading capital (optional)', 'متوقع ٹریڈنگ سرمایہ (اختیاری)')} aria-label="Planned trading capital" className={input} />
            </div>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={T('Anything we should know? (broker, questions…)', 'کچھ بتانا چاہیں؟ (بروکر، سوالات…)')} aria-label="Note" rows={2} className={input} />
            {state.error && <div className="text-[12.5px] text-rose-300">{state.error}</div>}
            <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 text-emerald-950 font-black disabled:opacity-60 cursor-pointer">
              {state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}<span style={uf(ur)}>{T('Reserve my place', 'میری جگہ محفوظ کریں')}</span>
            </button>
            <p className="text-[11px] text-slate-500" style={uf(ur)}>{T('Reserving is free and does not charge you. Your details are seen only by the Prime Pip FX team.', 'جگہ محفوظ کرنا مفت ہے، کوئی رقم نہیں کٹتی۔ آپ کی تفصیل صرف Prime Pip FX ٹیم دیکھتی ہے۔')}</p>
          </form>
        )}
      </section>

      <div className="flex gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3.5 text-[12px] text-rose-100/90 leading-relaxed">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-300" />
        <span style={uf(ur)} className={ur ? 'leading-[2.2]' : ''}>{ur ? <><b>رسک وارننگ:</b> لیوریج کے ساتھ فاریکس اور CFD ٹریڈنگ میں پیسہ کھونے کا بڑا خطرہ ہے۔ خودکار ٹریڈنگ یہ خطرہ ختم نہیں کرتی، ماضی یا ٹیسٹ کے نتائج مستقبل کی ضمانت نہیں، اور صرف وہی پیسہ لگائیں جس کا نقصان برداشت کر سکیں۔</> : <><b>Risk warning:</b> trading forex and CFDs with leverage carries a high risk of losing money. Automated trading does not remove that risk, past or tested results do not guarantee future results, and you should only trade money you can afford to lose.</>}</span>
      </div>
    </div>
  );
};

/** Prime Pip SBT Indicator — what it draws for you, the one-time fee, and the order form. */
const IndicatorSection: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ur = lang === 'ur';
  const T = (en: string, u: string) => (ur ? u : en);
  const [form, setForm] = useState({ name: '', contact: '', country: '', note: '' });
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: { id: string } }>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const r = await fetch('/api/bot/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, tier: 'indicator', username: me() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) setState({ error: j.error || 'Could not send the order right now. Please try again.' });
      else setState({ done: j.reservation });
    } catch { setState({ error: 'No connection. Please try again.' }); }
  };
  const payMsg = state.done ? `Assalam o Alaikum, I want the Prime Pip SBT Indicator ($${INDICATOR_FEE}). Order ID: ${state.done.id}. Name: ${form.name}. Please send the payment details.` : '';
  const input = 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 outline-none text-sm text-slate-100 placeholder:text-slate-500';
  const does: [React.ElementType, string, string, string, string][] = [
    [Waypoints, 'Complete market structure', 'مکمل مارکیٹ اسٹرکچر', 'Swings, breaks and the trend on the higher timeframes are marked for you — no manual drawing.', 'سوئنگز، بریکس اور بڑے ٹائم فریم کا ٹرینڈ خود نشان زد ہوتا ہے — ہاتھ سے کچھ بنانے کی ضرورت نہیں۔'],
    [Layers, 'The SBT trading models', 'SBT ٹریڈنگ ماڈلز', 'Each SBT model is identified and labelled on the chart the moment it forms.', 'ہر SBT ماڈل بنتے ہی چارٹ پر پہچان کر لیبل کر دیا جاتا ہے۔'],
    [Target, 'Level 1 & Level 2 zones', 'لیول 1 اور لیول 2 زونز', 'The buy and sell zones are highlighted, with the stop and the target for every setup.', 'خرید و فروخت کے زون نمایاں ہوتے ہیں، ہر سیٹ اپ کے اسٹاپ اور ہدف کے ساتھ۔'],
    [Crosshair, 'You only execute', 'آپ صرف ٹریڈ لگائیں', 'The analysis is done on the chart. You decide, place the buy or sell, and manage your risk.', 'تجزیہ چارٹ پر ہو چکا ہوتا ہے۔ آپ فیصلہ کریں، خرید یا فروخت لگائیں اور اپنا رسک سنبھالیں۔'],
  ];
  return (
    <div className="space-y-6" data-testid="indicator-section">
      <section dir={ur ? 'rtl' : 'ltr'} className="ppfx-up relative overflow-hidden rounded-3xl border border-sky-400/30 bg-[#050912] p-5 sm:p-7 space-y-4">
        <div aria-hidden className="ppfx-aurora absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.22), transparent 65%)' }} />
        <div className="relative space-y-3">
          <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-sky-300" dir="ltr">Prime Pip SBT · Indicator</div>
          <h2 className="text-2xl sm:text-4xl font-black text-white" style={uf(ur)}>{T('Prime Pip SBT Indicator', 'پرائم پِپ SBT انڈیکیٹر')}</h2>
          <p className={`text-[13.5px] text-slate-300 max-w-2xl ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf(ur)}>{T('The founder’s SBT method, drawn on your chart: structure, models and zones are marked automatically, so all that is left for you is the decision to buy or sell.', 'بانی کا SBT طریقہ، آپ کے چارٹ پر: اسٹرکچر، ماڈلز اور زونز خود بخود نشان زد ہوتے ہیں، تاکہ آپ کے لیے صرف خرید یا فروخت کا فیصلہ باقی رہے۔')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-5 py-3" data-testid="indicator-fee">
              <div className="text-[10.5px] uppercase tracking-widest text-sky-200/80" style={uf(ur)}>{T('One-time access fee', 'ایک بار کی فیس')}</div>
              <div className="text-4xl font-black font-mono-code text-white" dir="ltr">${INDICATOR_FEE}</div>
            </div>
            <a href="#indicator-order" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black relative overflow-hidden"><span className="ppfx-shine absolute inset-0" aria-hidden /><span className="relative" style={uf(ur)}>{T('Get access', 'رسائی حاصل کریں')}</span><ArrowRight className={`w-4 h-4 relative ${ur ? 'rotate-180' : ''}`} /></a>
          </div>
        </div>
      </section>

      <section dir={ur ? 'rtl' : 'ltr'} className="grid sm:grid-cols-2 gap-3">
        {does.map(([Icon, en, u, enD, urD], i) => (
          <div key={en} style={{ animationDelay: `${i * 80}ms` }} className="ppfx-up ppfx-card rounded-2xl border border-slate-800 hover:border-sky-400/50 bg-slate-950/70 p-4 flex gap-3">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-slate-950 shrink-0"><Icon className="w-5 h-5" /></span>
            <div><div className="font-black text-white text-[15px]" style={uf(ur)}>{ur ? u : en}</div><div className={`text-[12.5px] text-slate-300 mt-0.5 ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf(ur)}>{ur ? urD : enD}</div></div>
          </div>
        ))}
      </section>

      <section dir={ur ? 'rtl' : 'ltr'} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-sky-300 mb-2" style={uf(ur)}>{T('How access works', 'رسائی کیسے ملتی ہے')}</h3>
        <ol className="grid sm:grid-cols-3 gap-2 text-[12.5px] text-slate-300">
          {(ur ? ['نیچے آرڈر بھیجیں — آپ کو آرڈر ID ملے گی۔', `واٹس ایپ پر $${INDICATOR_FEE} کی ادائیگی مکمل کریں۔`, 'ٹیم آپ کے اکاؤنٹ پر انڈیکیٹر کی رسائی فعال کر دیتی ہے۔'] : ['Send the order below — you get an order ID.', `Complete the $${INDICATOR_FEE} payment on WhatsApp.`, 'The team switches the indicator on for your account.']).map((t, i) => (
            <li key={t} className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"><span className="w-6 h-6 rounded-full bg-sky-400 text-slate-950 text-[12px] font-black flex items-center justify-center shrink-0">{i + 1}</span><span style={uf(ur)} className={ur ? 'leading-[2.1]' : ''}>{t}</span></li>
          ))}
        </ol>
      </section>

      <section id="indicator-order" dir={ur ? 'rtl' : 'ltr'} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6" data-testid="indicator-order">
        {state.done ? (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-sky-300 mx-auto" />
            <div className="text-xl font-black text-white" style={uf(ur)}>{T('Order received', 'آرڈر موصول ہو گیا')}</div>
            <div className="text-sm text-slate-300" dir="ltr">Order ID <b className="font-mono-code text-sky-200">{state.done.id}</b> · Prime Pip SBT Indicator · ${INDICATOR_FEE}</div>
            <a href={`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(payMsg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-400 text-slate-950 font-black hover:bg-sky-300">
              <MessageCircle className="w-4 h-4" /><span style={uf(ur)}>{T('Complete payment on WhatsApp', 'واٹس ایپ پر ادائیگی مکمل کریں')}</span>
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="text-lg font-black text-white" style={uf(ur)}>{T(`Order the indicator — $${INDICATOR_FEE}`, `انڈیکیٹر آرڈر کریں — $${INDICATOR_FEE}`)}</h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={T('Full name', 'پورا نام')} className={input} style={uf(ur)} />
              <input required minLength={5} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder={T('WhatsApp number or email', 'واٹس ایپ نمبر یا ای میل')} className={input} style={uf(ur)} />
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={T('Country', 'ملک')} className={input} style={uf(ur)} />
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={T('Your app username (if you have one)', 'ایپ کا یوزر نیم (اگر ہو)')} className={input} style={uf(ur)} />
            </div>
            {state.error && <div className="text-[12.5px] text-rose-300">{state.error}</div>}
            <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-400 text-slate-950 font-black hover:bg-sky-300 disabled:opacity-60 cursor-pointer">
              {state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}<span style={uf(ur)}>{T('Send my order', 'میرا آرڈر بھیجیں')}</span>
            </button>
            <p className="text-[11px] text-slate-500" style={uf(ur)}>{T('Sending the order does not charge you. Your details are seen only by the Prime Pip FX team.', 'آرڈر بھیجنے پر کوئی رقم نہیں کٹتی۔ آپ کی تفصیل صرف Prime Pip FX ٹیم دیکھتی ہے۔')}</p>
          </form>
        )}
      </section>
      <div dir={ur ? 'rtl' : 'ltr'} className="flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-100/90">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span style={uf(ur)} className={ur ? 'leading-[2.2]' : ''}>{T('Risk warning: an indicator marks setups; it cannot guarantee that a trade wins. Trading with leverage carries a high risk of loss — always use a stop-loss and risk only a small part of your account.', 'رسک وارننگ: انڈیکیٹر سیٹ اپ نشان زد کرتا ہے؛ یہ ضمانت نہیں دے سکتا کہ ٹریڈ جیتے گی۔ لیوریج کے ساتھ ٹریڈنگ میں نقصان کا بڑا خطرہ ہے — ہمیشہ اسٹاپ لاس لگائیں اور اکاؤنٹ کا چھوٹا حصہ ہی خطرے میں ڈالیں۔')}</span>
      </div>
    </div>
  );
};

const VoiceSection: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ur = lang === 'ur';
  const T = (en: string, u: string) => (ur ? u : en);
  const [kind, setKind] = useState('missing');
  const [text, setText] = useState('');
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({});
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setState({ busy: true });
    try {
      const r = await fetch('/api/insights/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, text, username: me(), section: 'learning-hub' }) });
      const j = await r.json().catch(() => ({}));
      setState(r.ok && j.ok ? { ok: true } : { error: j.error || 'Could not send. Please try again.' });
      if (r.ok && j.ok) setText('');
    } catch { setState({ error: 'No connection. Please try again.' }); }
  };
  return (
    <div className="space-y-5" dir={ur ? 'rtl' : 'ltr'}>
      <section className="rounded-3xl border border-fuchsia-400/30 bg-[radial-gradient(ellipse_at_top_left,rgba(217,70,239,0.16),transparent_60%),#0a0612] p-5 sm:p-7 space-y-3">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-fuchsia-300">Turning feelings into practical solutions</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white" style={uf(ur)}>{T('Tell us what you feel is missing. We turn it into the next update.', 'بتائیں آپ کو کیا کمی محسوس ہوتی ہے۔ ہم اسے اگلی اپ ڈیٹ بنا دیتے ہیں۔')}</h2>
        {ur ? <p className="text-[13px] text-slate-300 leading-[2.2] max-w-3xl" style={URDU_FONT}>ہر پریشانی جو ٹریڈر محسوس کرتا ہے ایک خلا ہے جسے بھرا جا سکتا ہے۔ اپنے الفاظ میں لکھیں۔ ایپ خود بھی خاموشی سے غلطیوں پر نظر رکھتی اور رپورٹ کرتی ہے، اور گنتی ہے کون سے حصے زیادہ استعمال ہوتے ہیں (صرف نمبر، کچھ ذاتی نہیں)، تاکہ ہر اپ ڈیٹ وہی ٹھیک کرے جو سب سے اہم ہے۔</p> : <p className="text-[13px] text-slate-300 leading-relaxed max-w-3xl">Every frustration a trader feels is a gap waiting to be filled. Write it in your own words. The app also watches quietly for errors on its own and reports them, and counts which sections are used most (numbers only, nothing personal), so every update fixes what matters most to the people who use it.</p>}
        <div className="grid sm:grid-cols-3 gap-2 pt-1">
          {(ur ? [['آپ کے الفاظ', 'کیا کمی ہے، کیا الجھا یا پریشان کرتا ہے — کسی بھی زبان میں۔'], ['خودکار غلطی رپورٹس', 'اگر اسکرین پر کچھ خراب ہو تو تفصیل خود بخود ٹیم تک پہنچتی ہے۔'], ['لوگ کیا استعمال کرتے ہیں', 'کون سے حصے زیادہ کھلتے ہیں، تاکہ محنت وہاں ہو جہاں ٹریڈر ہیں۔']] : [['Your words', 'What is missing, confusing or frustrating — in any language.'], ['Automatic error reports', 'If something breaks on your screen, the details reach the team automatically.'], ['What people use', 'Which sections are opened most, so effort goes where traders are.']]).map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3" style={uf(ur)}><div className="font-bold text-fuchsia-200 text-[13px]">{t}</div><div className="text-[12px] text-slate-400 mt-0.5">{d}</div></div>
          ))}
        </div>
      </section>
      <form onSubmit={send} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6 space-y-3" data-testid="voice-form">
        <div className="flex flex-wrap gap-1.5">
          {(ur ? [['missing', 'کچھ کمی ہے'], ['feeling', 'مجھے کیسا لگتا ہے'], ['bug', 'کچھ خراب ہے'], ['idea', 'ایک خیال']] : [['missing', 'Something is missing'], ['feeling', 'How it makes me feel'], ['bug', 'Something is broken'], ['idea', 'An idea']]).map(([k, l]) => (
            <button key={k} type="button" style={uf(ur)} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-full border text-[12px] font-bold cursor-pointer ${kind === k ? 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
        <textarea required minLength={3} value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={T('Write freely…', 'آزادی سے لکھیں…')} style={uf(ur)} aria-label="Your message" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-fuchsia-400 outline-none text-sm text-slate-100 placeholder:text-slate-500" />
        {state.error && <div className="text-[12.5px] text-rose-300">{state.error}</div>}
        {state.ok && <div className="text-[12.5px] text-emerald-300" style={uf(ur)}>{T('Thank you — it has reached the team.', 'شکریہ — یہ ٹیم تک پہنچ گیا۔')}</div>}
        <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white font-black disabled:opacity-60 cursor-pointer">{state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}<span style={uf(ur)}>{T('Send', 'بھیجیں')}</span></button>
      </form>
    </div>
  );
};

export const LearningHub: React.FC<{ onNavigateTab?: (tab: string) => void }> = () => {
  const [tab, setTab] = useState<Tab>(() => { try { const t = localStorage.getItem('ppfx_learning_tab') as Tab; return TABS.some((x) => x.id === t) ? t : 'LEARN'; } catch { return 'LEARN'; } });
  const [lang, setLang] = useState<Lang>(() => { try { return localStorage.getItem(LANG_KEY) === 'ur' ? 'ur' : 'en'; } catch { return 'en'; } });
  useEffect(() => { try { localStorage.setItem('ppfx_learning_tab', tab); } catch { /* storage blocked */ } }, [tab]);
  useEffect(() => { try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage blocked */ } }, [lang]);
  const ur = lang === 'ur';
  const T = (en: string, u: string) => (ur ? u : en);
  const { done } = useDone();
  const lessonTotal = [...COURSE, ...INSTITUTIONAL].reduce((n, m) => n + m.lessons.length, 0);
  const lessonDone = [...COURSE, ...INSTITUTIONAL].reduce((n, m) => n + m.lessons.filter((l) => done.includes(l.id)).length, 0);
  const stats: [string, string, string][] = [[String(lessonTotal), 'Lessons', 'اسباق'], [String(TOPIC_COUNT), 'Library topics', 'لائبریری موضوعات'], ['22', 'Divisions', 'شعبے'], ['2', 'Languages', 'زبانیں']];
  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-16 px-2 sm:px-4 text-slate-100" data-testid="learning-hub" lang={lang}>
      <style>{HUB_CSS}</style>
      <header className="ppfx-up relative overflow-hidden rounded-[28px] border border-white/10 bg-[#050814] p-5 sm:p-8">
        <div aria-hidden className="ppfx-aurora absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.20), transparent 62%)' }} />
        <div aria-hidden className="ppfx-aurora absolute -bottom-40 -right-24 w-[560px] h-[560px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.20), transparent 62%)', animationDelay: '-8s' }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '36px 36px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div dir={ur ? 'rtl' : 'ltr'} className="min-w-0 flex-1 basis-[280px]">
              <div className="flex items-center gap-2 text-[11px] font-mono-code uppercase tracking-[0.25em] text-cyan-300" dir="ltr"><Building2 className="w-4 h-4" />Learn · Understand · Automate</div>
              <h1 className="mt-2 text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent" style={uf(ur)}>{T('Pro Trading Learning', 'پرو ٹریڈنگ لرننگ')}</h1>
              <p className={`mt-2 text-[13.5px] text-slate-300 max-w-2xl ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf(ur)}>{T('Start from zero and go all the way to how banks and hedge funds really work — every lesson in simple words, with trusted sources to read more.', 'صفر سے شروع کر کے یہ سیکھیں کہ بینک اور ہیج فنڈز اصل میں کیسے کام کرتے ہیں — ہر سبق آسان الفاظ میں، مزید پڑھنے کے معتبر ذرائع کے ساتھ۔')}</p>
            </div>
            <div role="group" aria-label="Language / زبان" data-testid="lang-toggle" className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/70 backdrop-blur p-1">
              <Languages className="w-4 h-4 text-cyan-300 mx-1.5" />
              <button type="button" onClick={() => setLang('en')} aria-pressed={!ur} className={`px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition ${!ur ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>English</button>
              <button type="button" onClick={() => setLang('ur')} aria-pressed={ur} style={URDU_FONT} className={`px-3 py-1 rounded-full text-[13px] font-bold cursor-pointer transition ${ur ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>اردو</button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2" dir={ur ? 'rtl' : 'ltr'}>
            {stats.map(([n, en, u], i) => (
              <div key={en} style={{ animationDelay: `${120 + i * 70}ms` }} className="ppfx-up rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur px-4 py-3">
                <div className="text-2xl sm:text-3xl font-black font-mono-code text-white" dir="ltr">{n}</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400" style={uf(ur)}>{ur ? u : en}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3" dir={ur ? 'rtl' : 'ltr'} data-testid="hub-progress">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 transition-all duration-700" style={{ width: `${lessonTotal ? (lessonDone / lessonTotal) * 100 : 0}%` }} /></div>
            <span className="text-[12px] font-semibold text-slate-300 whitespace-nowrap" style={uf(ur)}>{T(`Your progress: ${lessonDone} of ${lessonTotal} lessons`, `آپ کی پیش رفت: ${lessonDone} / ${lessonTotal} اسباق`)}</span>
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <button type="button" onClick={() => setTab('BOT')} data-testid="bot-banner" dir={ur ? 'rtl' : 'ltr'} style={{ animationDelay: '260ms' }}
              className="ppfx-up ppfx-card relative overflow-hidden flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent px-4 py-3.5 text-start cursor-pointer hover:border-emerald-300">
              <span className="ppfx-float w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-300 to-teal-500 flex items-center justify-center text-emerald-950 shrink-0"><Bot className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-black text-white text-[15px]" style={uf(ur)}>{T('SBT Trading Bot — launching 1 January 2027', 'SBT ٹریڈنگ بوٹ — آغاز یکم جنوری 2027')}</span>
                <span className="block text-[12px] text-emerald-100/80" style={uf(ur)}>{T(`Fully automatic · from $${BOT_TIERS[0].fee.toLocaleString()} · reserve your place`, `مکمل خودکار · $${BOT_TIERS[0].fee.toLocaleString()} سے · اپنی جگہ محفوظ کریں`)}</span>
              </span>
              <ArrowRight className={`w-5 h-5 text-emerald-300 shrink-0 ${ur ? 'rotate-180' : ''}`} />
            </button>
            <button type="button" onClick={() => setTab('INDICATOR')} data-testid="indicator-banner" dir={ur ? 'rtl' : 'ltr'} style={{ animationDelay: '330ms' }}
              className="ppfx-up ppfx-card relative overflow-hidden flex items-center gap-3 rounded-2xl border border-sky-400/40 bg-gradient-to-r from-sky-500/20 via-indigo-500/10 to-transparent px-4 py-3.5 text-start cursor-pointer hover:border-sky-300">
              <span className="ppfx-float w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-slate-950 shrink-0" style={{ animationDelay: '-2.5s' }}><Crosshair className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-black text-white text-[15px]" style={uf(ur)}>{T('Prime Pip SBT Indicator', 'پرائم پِپ SBT انڈیکیٹر')}</span>
                <span className="block text-[12px] text-sky-100/80" style={uf(ur)}>{T(`Structure, models and zones marked for you · $${INDICATOR_FEE}`, `اسٹرکچر، ماڈلز اور زونز خود نشان زد · $${INDICATOR_FEE}`)}</span>
              </span>
              <ArrowRight className={`w-5 h-5 text-sky-300 shrink-0 ${ur ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </header>
      <nav className="sticky top-2 z-20 flex gap-2 overflow-x-auto p-1.5 rounded-2xl border border-white/10 bg-[#070b16]/85 backdrop-blur-xl" role="tablist" aria-label="Learning sections" dir={ur ? 'rtl' : 'ltr'}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`learn-tab-${t.id}`}
            className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold cursor-pointer transition ${tab === t.id ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${t.tone} flex items-center justify-center text-slate-950`}><t.icon className="w-3.5 h-3.5" /></span><span style={uf(ur)}>{ur ? t.ur : t.en}</span>
          </button>
        ))}
      </nav>
      {tab === 'LEARN' && <Curriculum modules={COURSE} accent="cyan" lang={lang} />}
      {tab === 'INSTITUTIONAL' && (
        <div className="space-y-4">
          <p className={`text-[13px] text-slate-400 max-w-3xl ${ur ? 'leading-[2.2] text-right' : ''}`} dir={ur ? 'rtl' : 'ltr'} style={uf(ur)}>{T('What most retail traders never see: how funds and brokers are built, where prices come from, and what institutions watch before they trade.', 'جو زیادہ تر ریٹیل ٹریڈر کبھی نہیں دیکھتے: فنڈز اور بروکر کیسے بنتے ہیں، قیمتیں کہاں سے آتی ہیں، اور ادارے ٹریڈ سے پہلے کیا دیکھتے ہیں۔')}</p>
          <Curriculum modules={INSTITUTIONAL} accent="amber" lang={lang} />
        </div>
      )}
      {tab === 'LIBRARY' && <AdvancedLibrary lang={lang} />}
      {tab === 'BOT' && <BotSection lang={lang} />}
      {tab === 'INDICATOR' && <IndicatorSection lang={lang} />}
      {tab === 'VOICE' && <VoiceSection lang={lang} />}
    </div>
  );
};

export default LearningHub;
