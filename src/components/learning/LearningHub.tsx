import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Bot, Building2, CheckCircle2, ChevronDown, ExternalLink, GraduationCap, Landmark, Lightbulb, Loader2, MessageCircle, Search, ShieldAlert } from 'lucide-react';
import { BOT_LAUNCH, BOT_TIERS, COURSE, INSTITUTIONAL, type Module } from '../../data/learningHub';
import { ProLearningTrading } from '../ProLearningTrading';

type Tab = 'LEARN' | 'INSTITUTIONAL' | 'BOT' | 'VOICE' | 'ACADEMY';
const TABS: { id: Tab; label: string; icon: React.ElementType; tone: string }[] = [
  { id: 'LEARN', label: 'Pro Trading Learning', icon: GraduationCap, tone: 'from-cyan-400 to-sky-500' },
  { id: 'INSTITUTIONAL', label: 'Institutional Trading', icon: Landmark, tone: 'from-amber-300 to-orange-500' },
  { id: 'BOT', label: 'Trading Bot Automation', icon: Bot, tone: 'from-emerald-300 to-teal-500' },
  { id: 'VOICE', label: 'Feelings → Solutions', icon: Lightbulb, tone: 'from-fuchsia-400 to-violet-500' },
  { id: 'ACADEMY', label: 'Classic Academy', icon: BookOpen, tone: 'from-slate-300 to-slate-500' },
];
const OWNER_WA = '923406671495';
const me = () => { try { return JSON.parse(localStorage.getItem('primepipfx_user_profile') || 'null')?.username || ''; } catch { return ''; } };

/** Course / institutional reader: modules → lessons with a summary in plain words and links to read more. */
const Curriculum: React.FC<{ modules: Module[]; accent: 'cyan' | 'amber' }> = ({ modules, accent }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(modules[0]?.lessons[0]?.id || null);
  const ql = q.trim().toLowerCase();
  const list = useMemo(() => modules.map((m) => ({ ...m, lessons: m.lessons.filter((l) => !ql || `${l.title} ${l.summary} ${l.points.join(' ')}`.toLowerCase().includes(ql)) })).filter((m) => m.lessons.length), [modules, ql]);
  const a = accent === 'cyan' ? { ring: 'border-cyan-400/50', text: 'text-cyan-300', chip: 'bg-cyan-500/10 border-cyan-400/40 text-cyan-100', link: 'text-cyan-200 hover:text-white' } : { ring: 'border-amber-400/50', text: 'text-amber-300', chip: 'bg-amber-500/10 border-amber-400/40 text-amber-100', link: 'text-amber-200 hover:text-white' };
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  return (
    <div className="space-y-4">
      <label className="relative block max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${total} lessons…`} aria-label="Search lessons" className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-sm text-slate-100 placeholder:text-slate-500" />
      </label>
      {list.map((m) => (
        <section key={m.id} className="space-y-2">
          <div className="flex items-center gap-2"><h3 className={`text-[13px] font-bold uppercase tracking-[0.14em] ${a.text}`}>{m.title}</h3><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${a.chip}`}>{m.level}</span></div>
          <div className="grid gap-2">
            {m.lessons.map((l) => {
              const on = open === l.id || !!ql;
              return (
                <article key={l.id} className={`rounded-2xl border bg-slate-950/70 transition ${on ? a.ring : 'border-slate-800 hover:border-slate-600'}`}>
                  <button type="button" onClick={() => setOpen(on && !ql ? null : l.id)} aria-expanded={on} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
                    <span className="flex-1 font-semibold text-slate-100">{l.title}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${on ? 'rotate-180' : ''}`} />
                  </button>
                  {on && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-[13.5px] leading-relaxed text-slate-300">{l.summary}</p>
                      <ul className="grid sm:grid-cols-3 gap-1.5">
                        {l.points.map((p) => <li key={p} className="flex gap-1.5 text-[12px] text-slate-300"><CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.text}`} />{p}</li>)}
                      </ul>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {l.links.map((k) => (
                          <a key={k.url} href={k.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[12px] font-semibold ${a.link}`}>
                            Read: {k.label} <span className="text-slate-500 font-normal">· {k.site}</span><ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {!list.length && <p className="text-sm text-slate-500">No lesson matches “{q}”.</p>}
    </div>
  );
};

const Countdown: React.FC<{ to: number }> = ({ to }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, to - now);
  const parts = [['Days', Math.floor(left / 86_400_000)], ['Hours', Math.floor(left / 3_600_000) % 24], ['Minutes', Math.floor(left / 60_000) % 60], ['Seconds', Math.floor(left / 1000) % 60]] as const;
  if (!left) return <div className="text-2xl font-black text-emerald-300">The SBT bot is live.</div>;
  return (
    <div className="grid grid-cols-4 gap-2 max-w-md" data-testid="bot-countdown">
      {parts.map(([l, v]) => (
        <div key={l} className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 py-2.5 text-center">
          <div className="text-2xl sm:text-4xl font-black tabular-nums text-white">{String(v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-200/80">{l}</div>
        </div>
      ))}
    </div>
  );
};

const BotSection: React.FC = () => {
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
      <section className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.18),transparent_60%),#050b0a] p-5 sm:p-7 space-y-4">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-emerald-300">Prime Pip SBT · Trading Bot Automation</div>
        <h2 className="text-2xl sm:text-4xl font-black text-white">Launching 1 January 2027</h2>
        <Countdown to={BOT_LAUNCH} />
        <div className="grid sm:grid-cols-3 gap-3 pt-2">
          {[
            ['Fully automatic', 'Finds SBT setups, enters, manages and exits trades on its own — no screen-watching.'],
            ['1% risk per trade', 'Every position is sized so a stop-loss costs about 1% of the account. Capital protection first.'],
            ['Runs on MetaTrader 5', 'Connects to your own broker account; your money stays with your broker, in your name.'],
          ].map(([t, d]) => <div key={t} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5"><div className="font-bold text-emerald-200">{t}</div><div className="text-[12.5px] text-slate-300 mt-1 leading-relaxed">{d}</div></div>)}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-[12.5px] text-slate-300 leading-relaxed">
          <b className="text-white">Performance:</b> the bot trades the founder’s SBT model (10 models, Level 1 / Level 2 entries). A verified live track record will be published here before launch so you can judge the results yourself.
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-300">Choose your plan</h3>
        <div className="grid md:grid-cols-3 gap-3" role="radiogroup" aria-label="Plan">
          {BOT_TIERS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tier === t.id} onClick={() => setTier(t.id)}
              className={`text-left rounded-3xl border-2 p-4 cursor-pointer transition ${tier === t.id ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'}`}>
              <div className="flex items-baseline justify-between"><span className="text-lg font-black text-white">{t.name}</span>{t.id === 'pro' && <span className="text-[10px] font-bold uppercase text-emerald-300">Most chosen</span>}</div>
              <div className="mt-1 text-3xl font-black text-emerald-200">${t.fee.toLocaleString()}</div>
              <div className="text-[12px] text-slate-400 mt-1">{t.blurb}</div>
              <ul className="mt-3 space-y-1">{t.features.map((f) => <li key={f} className="flex gap-1.5 text-[12px] text-slate-200"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-300 shrink-0" />{f}</li>)}</ul>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6" data-testid="bot-reserve">
        {state.done ? (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto" />
            <div className="text-xl font-black text-white">Your place is reserved</div>
            <div className="text-sm text-slate-300">Reservation ID <b className="font-mono-code text-emerald-200">{state.done.id}</b> · {chosen.name} plan · ${chosen.fee.toLocaleString()}</div>
            <p className="text-[12.5px] text-slate-400 max-w-md mx-auto">To confirm it, complete the payment. Send your reservation ID on WhatsApp and you will receive the payment details and a receipt.</p>
            <a href={`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(payMsg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-400 text-emerald-950 font-black hover:bg-emerald-300">
              <MessageCircle className="w-4 h-4" />Complete payment on WhatsApp
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-2"><h3 className="text-lg font-black text-white">Reserve your place</h3><span className="text-[12px] text-slate-400">· {chosen.name} · ${chosen.fee.toLocaleString()}</span></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" aria-label="Full name" className={input} />
              <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="WhatsApp number or email" aria-label="WhatsApp number or email" className={input} />
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" aria-label="Country" className={input} />
              <input value={form.capital} onChange={(e) => setForm({ ...form, capital: e.target.value })} placeholder="Planned trading capital (optional)" aria-label="Planned trading capital" className={input} />
            </div>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Anything we should know? (broker, questions…)" aria-label="Note" rows={2} className={input} />
            {state.error && <div className="text-[12.5px] text-rose-300">{state.error}</div>}
            <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 text-emerald-950 font-black disabled:opacity-60 cursor-pointer">
              {state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}Reserve my place
            </button>
            <p className="text-[11px] text-slate-500">Reserving is free and does not charge you. Your details are seen only by the Prime Pip FX team.</p>
          </form>
        )}
      </section>

      <div className="flex gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3.5 text-[12px] text-rose-100/90 leading-relaxed">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-300" />
        <span><b>Risk warning:</b> trading forex and CFDs with leverage carries a high risk of losing money. Automated trading does not remove that risk, past or tested results do not guarantee future results, and you should only trade money you can afford to lose.</span>
      </div>
    </div>
  );
};

const VoiceSection: React.FC = () => {
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
    <div className="space-y-5">
      <section className="rounded-3xl border border-fuchsia-400/30 bg-[radial-gradient(ellipse_at_top_left,rgba(217,70,239,0.16),transparent_60%),#0a0612] p-5 sm:p-7 space-y-3">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-fuchsia-300">Turning feelings into practical solutions</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">Tell us what you feel is missing. We turn it into the next update.</h2>
        <p className="text-[13px] text-slate-300 leading-relaxed max-w-3xl">Every frustration a trader feels is a gap waiting to be filled. Write it in your own words. The app also watches quietly for errors on its own and reports them, and counts which sections are used most (numbers only, nothing personal), so every update fixes what matters most to the people who use it.</p>
        <div className="grid sm:grid-cols-3 gap-2 pt-1">
          {[['Your words', 'What is missing, confusing or frustrating — in any language.'], ['Automatic error reports', 'If something breaks on your screen, the details reach the team automatically.'], ['What people use', 'Which sections are opened most, so effort goes where traders are.']].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><div className="font-bold text-fuchsia-200 text-[13px]">{t}</div><div className="text-[12px] text-slate-400 mt-0.5">{d}</div></div>
          ))}
        </div>
      </section>
      <form onSubmit={send} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6 space-y-3" data-testid="voice-form">
        <div className="flex flex-wrap gap-1.5">
          {[['missing', 'Something is missing'], ['feeling', 'How it makes me feel'], ['bug', 'Something is broken'], ['idea', 'An idea']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-full border text-[12px] font-bold cursor-pointer ${kind === k ? 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
        <textarea required minLength={3} value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Write freely…" aria-label="Your message" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-fuchsia-400 outline-none text-sm text-slate-100 placeholder:text-slate-500" />
        {state.error && <div className="text-[12.5px] text-rose-300">{state.error}</div>}
        {state.ok && <div className="text-[12.5px] text-emerald-300">Thank you — it has reached the team.</div>}
        <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white font-black disabled:opacity-60 cursor-pointer">{state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}Send</button>
      </form>
    </div>
  );
};

export const LearningHub: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const [tab, setTab] = useState<Tab>(() => { try { return (localStorage.getItem('ppfx_learning_tab') as Tab) || 'LEARN'; } catch { return 'LEARN'; } });
  useEffect(() => { try { localStorage.setItem('ppfx_learning_tab', tab); } catch { /* storage blocked */ } }, [tab]);
  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-16 px-2 sm:px-4 text-slate-100" data-testid="learning-hub">
      <header className="rounded-3xl border border-cyan-500/25 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.14),transparent_55%),#060a14] p-5 sm:p-7">
        <div className="flex items-center gap-2 text-[11px] font-mono-code uppercase tracking-[0.25em] text-cyan-300"><Building2 className="w-4 h-4" />Learn · Understand · Automate</div>
        <h1 className="mt-1 text-2xl sm:text-4xl font-black text-white">Pro Trading Learning</h1>
        <p className="mt-1 text-[13px] text-slate-400 max-w-2xl">Start from zero and go all the way to how banks and hedge funds really work — every lesson in simple words, with trusted sources to read more.</p>
      </header>
      <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Learning sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[13px] font-bold cursor-pointer transition ${tab === t.id ? 'border-white/30 bg-white/10 text-white shadow-lg' : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white'}`}>
            <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${t.tone} flex items-center justify-center text-slate-950`}><t.icon className="w-3.5 h-3.5" /></span>{t.label}
          </button>
        ))}
      </nav>
      {tab === 'LEARN' && <Curriculum modules={COURSE} accent="cyan" />}
      {tab === 'INSTITUTIONAL' && (
        <div className="space-y-4">
          <p className="text-[13px] text-slate-400 max-w-3xl">What most retail traders never see: how funds and brokers are built, where prices come from, and what institutions watch before they trade.</p>
          <Curriculum modules={INSTITUTIONAL} accent="amber" />
        </div>
      )}
      {tab === 'BOT' && <BotSection />}
      {tab === 'VOICE' && <VoiceSection />}
      {tab === 'ACADEMY' && <ProLearningTrading onNavigateTab={onNavigateTab} />}
    </div>
  );
};

export default LearningHub;
