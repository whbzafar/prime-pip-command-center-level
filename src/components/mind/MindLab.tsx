import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Brain, X, Wind, Timer, BookOpen, Activity, Footprints, Lock, CheckCircle2, Circle } from 'lucide-react';
import type { Trade } from '../../types';
import { detectPatterns, fearLadder, readinessScore, readinessAdvice, readinessVsResults, todayKey, NEED_TRADES, NEED_CLEAN, type Checkin } from '../../utils/mindEngine';

/** MIND LAB — the psychology side of trading: readiness, your own patterns, a graduated Fear Ladder, calm tools, lessons.
 *  Educational self-coaching built from your journal. Not therapy or medical advice. */
export const CK_KEY = 'ppfx_mind_checkins_v1';
export const COOLDOWN_KEY = 'ppfx_cooldown_until_v1';
export const loadCheckins = (): Record<string, Checkin> => { try { return JSON.parse(localStorage.getItem(CK_KEY) || '{}') || {}; } catch { return {}; } };

type Tab = 'ready' | 'patterns' | 'ladder' | 'calm' | 'learn';
const TABS: Array<{ id: Tab; label: string; Icon: any }> = [
  { id: 'ready', label: 'Readiness', Icon: Activity }, { id: 'patterns', label: 'My patterns', Icon: Brain }, { id: 'ladder', label: 'Fear Ladder', Icon: Footprints },
  { id: 'calm', label: 'Calm', Icon: Wind }, { id: 'learn', label: 'Learn', Icon: BookOpen },
];

const LESSONS = [
  { t: 'Fear of losing', body: 'Losses hurt about twice as much as equal gains feel good (loss aversion). That is normal brain wiring, not weakness. The cure is not "no fear" — it is making each loss too small to matter. Risk a size where you could lose ten in a row and still feel fine, then your stop-loss is just a business cost.', drill: 'Today: write your risk % before looking at any chart. Say out loud: "If this stops out, I lose X and that is fine."' },
  { t: 'Fear of pulling the trigger', body: 'Freezing at a valid set-up usually follows recent losses. Your mind is protecting you from the last pain, not judging this trade. Exposure works: act at a tiny size so the brain learns "I took the plan, survived, nothing terrible happened". Repeat until it feels boring.', drill: 'Use the lowest Fear Ladder rung. Taking the planned trade correctly is the win — profit does not matter at this stage.' },
  { t: 'Cutting winners, holding losers', body: 'Closing in profit early feels safe; letting a loss run feels like hope. Both are the same instinct: avoiding the pain of being wrong. A fixed stop and a pre-planned target remove the decision from the moment.', drill: 'Before entry, write the stop, the target and the one reason you would exit early. Do nothing else once in.' },
  { t: 'Revenge trading', body: 'After a loss the brain wants to get back the money, not to take the best trade. Trades taken in that state are about the feeling, not the market. A forced pause breaks the loop because the urge fades within minutes.', drill: 'After any loss: step away 10 minutes (Calm tab). Return and ask "Would I take this trade if I had just won?"' },
  { t: 'FOMO — chasing price', body: 'A fast candle triggers fear of missing out. But there is always another set-up; the market pays patience, not speed. Chasing usually means a poor entry and a wide stop.', drill: 'If price has left without you, write "missed" in your journal and wait for the next planned entry. Missed trades cost nothing.' },
  { t: 'Overconfidence after wins', body: 'A winning streak makes risk feel smaller than it is, so size creeps up. Many big drawdowns begin on the best day of the month. Treat a hot streak the same as a cold one: same size, same rules.', drill: 'Never raise risk % on the same day as a big win. Raise only through the Fear Ladder.' },
  { t: 'Process over outcome', body: 'A good trade is one that followed your plan — even if it lost. A bad trade broke the plan — even if it won. Judge yourself by rule-following; profit follows over a large sample.', drill: 'Grade each trade on the plan only: followed or broke. Review the rule-break count weekly, not the P/L.' },
];

const Breathing: React.FC = () => {
  const phases = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];
  const [on, setOn] = useState(false); const [i, setI] = useState(0); const [cycles, setCycles] = useState(0);
  useEffect(() => { if (!on) return; const id = window.setInterval(() => setI((p) => { if (p === 3) setCycles((c) => c + 1); return (p + 1) % 4; }), 4000); return () => window.clearInterval(id); }, [on]);
  const big = on && (i === 0 || i === 1);
  return (
    <div className="rounded-xl border border-slate-800 p-4 text-center space-y-3">
      <div className="text-sm font-bold text-slate-100">Box breathing · 4-4-4-4</div>
      <div className="text-[12px] text-slate-400">Slows the heart rate and settles the "fight or flight" reaction. Do 4–6 rounds before a trade if you feel tense.</div>
      <div className="flex items-center justify-center h-36"><div className="rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-200 text-sm font-bold" style={{ width: big ? 130 : 70, height: big ? 130 : 70, transition: 'all 4s linear' }}>{on ? phases[i] : 'Ready'}</div></div>
      <div className="text-[12px] text-slate-500">{on ? `${cycles} round${cycles === 1 ? '' : 's'} done` : 'Tap start and follow the circle.'}</div>
      <button onClick={() => { setOn((v) => !v); setI(0); setCycles(0); }} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold">{on ? 'Stop' : 'Start'}</button>
    </div>);
};

const Cooldown: React.FC = () => {
  const [until, setUntil] = useState<number>(() => Number(localStorage.getItem(COOLDOWN_KEY) || 0));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const left = Math.max(0, until - now);
  const start = (min: number) => { const u = Date.now() + min * 60_000; localStorage.setItem(COOLDOWN_KEY, String(u)); setUntil(u); };
  const stop = () => { localStorage.removeItem(COOLDOWN_KEY); setUntil(0); };
  const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
    <div className="rounded-xl border border-slate-800 p-4 text-center space-y-3">
      <div className="text-sm font-bold text-slate-100">Tilt breaker</div>
      <div className="text-[12px] text-slate-400">After a loss or when you feel the urge to "win it back", start a cooldown. The Pre-Trade Checklist shows a red stop until it ends.</div>
      <div className={`text-4xl font-mono font-black ${left ? 'text-amber-300' : 'text-slate-600'}`}>{mm}:{ss}</div>
      <div className="flex justify-center gap-2">
        {left ? <button onClick={stop} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm font-bold">I'm calm — end it</button>
          : [10, 30, 60].map((m) => <button key={m} onClick={() => start(m)} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold">{m} min</button>)}
      </div>
    </div>);
};

export const MindLab: React.FC<{ open: boolean; onClose: () => void; trades: Trade[]; balance: number }> = ({ open, onClose, trades, balance }) => {
  const [tab, setTab] = useState<Tab>('ready');
  const [cks, setCks] = useState<Record<string, Checkin>>(loadCheckins);
  const day = todayKey();
  const [draft, setDraft] = useState<Checkin>(() => cks[day] || { sleep: 3, stress: 3, mood: 3, focus: 3 });
  const [lesson, setLesson] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  const patterns = useMemo(() => detectPatterns(trades), [trades]);
  const ladder = useMemo(() => fearLadder(trades, balance), [trades, balance]);
  const compare = useMemo(() => readinessVsResults(cks, trades), [cks, trades]);
  if (!open) return null;
  const saved = cks[day]; const score = readinessScore(saved || draft); const adv = readinessAdvice(score);
  const save = () => { const next = { ...cks, [day]: draft }; setCks(next); try { localStorage.setItem(CK_KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const slider = (k: keyof Checkin, label: string, lo: string, hi: string) => (
    <div key={k}><div className="flex justify-between text-[12px] text-slate-300"><span>{label}</span><span className="text-slate-500">{lo} ← {draft[k]} → {hi}</span></div>
      <input type="range" min={1} max={5} value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))} className="w-full accent-cyan-400" /></div>);

  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="mind-lab">
      <div ref={ref} className="w-full max-w-3xl max-h-[94vh] flex flex-col rounded-2xl border border-violet-500/30 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#020617' }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Brain className="w-4 h-4 text-white" /></div>
            <div><div className="text-sm font-black text-white tracking-wide">MIND LAB</div><div className="text-[10.5px] text-slate-500">Trading psychology — master fear, tilt and discipline</div></div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 px-3 pt-2 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${tab === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
        </div>
        <div className="p-4 overflow-y-auto space-y-3">
          {tab === 'ready' && (<>
            <div className="text-[12px] text-slate-400">Check in before you trade (30 seconds). Your state decides your trading as much as your strategy does.</div>
            {slider('sleep', 'Sleep last night', 'poor', 'great')}{slider('stress', 'Stress right now', 'calm', 'very stressed')}{slider('mood', 'Mood', 'low', 'good')}{slider('focus', 'Focus', 'scattered', 'sharp')}
            <button onClick={save} className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold">{saved ? 'Update today\'s check-in' : 'Save today\'s check-in'}</button>
            <div className={`rounded-lg border p-3 ${adv.level === 'go' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : adv.level === 'careful' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
              <div className="text-2xl font-black">{score}<span className="text-sm font-bold opacity-70"> / 100 readiness</span></div><div className="text-sm">{adv.text}</div></div>
            {compare ? <div className="text-[12px] text-slate-300 rounded-lg border border-slate-800 p-3">From your own history: on good-readiness days ({compare.highDays}) you average <b>{compare.highAvgR}R</b> per trade; on lower days ({compare.lowDays}) <b>{compare.lowAvgR}R</b>.</div>
              : <div className="text-[11px] text-slate-500">Check in daily — after about 4 good and 4 low days that you also traded, this page will compare your results on both.</div>}
          </>)}

          {tab === 'patterns' && (<>
            <div className="text-[12px] text-slate-400">Found in your own journal. These describe behaviour, not who you are — each one can be trained.</div>
            {patterns.length === 0 && <div className="text-sm text-slate-300 rounded-lg border border-slate-800 p-4">{trades.filter((t) => t.status !== 'OPEN').length < 6 ? 'Log at least 6 closed trades (with your mood and rule adherence) and your patterns will appear here.' : 'No harmful pattern stands out in your journal right now. Keep logging honestly.'}</div>}
            {patterns.map((p) => (
              <div key={p.id} className={`rounded-lg border p-3 space-y-1 ${p.severity === 'high' ? 'border-rose-500/40 bg-rose-500/5' : p.severity === 'medium' ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700'}`}>
                <div className="text-sm font-bold text-slate-100">{p.label}</div><div className="text-[12px] text-slate-300">{p.evidence}</div><div className="text-[12px] text-cyan-300">What to do: {p.action}</div></div>))}
          </>)}

          {tab === 'ladder' && (<>
            <div className="text-[12px] text-slate-400">Fear is treated by gradual exposure: you trade the plan at a very small size until it feels routine, then earn a bigger rung. A rung is passed when {NEED_CLEAN} of your last {NEED_TRADES} trades at that size followed your rules. Size comes from your journal's risk amount.</div>
            {!ladder.available ? <div className="text-sm text-slate-300 rounded-lg border border-slate-800 p-4">Set your account balance in your account settings so risk % can be measured.</div> : (<>
              <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-violet-100 text-sm">Your current rung: <b>risk up to {ladder.rungs[ladder.current].cap}% per trade</b>.{ladder.oversized > 0 && <span className="text-amber-300"> {ladder.oversized} of your last 20 trades were bigger than this.</span>}</div>
              {ladder.rungs.map((r, i) => (
                <div key={r.cap} className={`flex items-center gap-3 rounded-lg border p-3 ${i === ladder.current ? 'border-violet-400/60' : 'border-slate-800'} ${!r.unlocked ? 'opacity-50' : ''}`}>
                  {r.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : r.unlocked ? <Circle className="w-5 h-5 text-violet-300 shrink-0" /> : <Lock className="w-5 h-5 text-slate-500 shrink-0" />}
                  <div className="flex-1"><div className="text-sm font-bold text-slate-100">Rung {i + 1} · up to {r.cap}% risk</div>
                    <div className="text-[12px] text-slate-400">{r.unlocked ? `${r.trades} trade${r.trades === 1 ? '' : 's'} at this size · ${r.clean} of the last ${Math.min(NEED_TRADES, r.trades)} followed the rules` : 'Locked — pass the rung before.'}</div></div>
                </div>))}
              <div className="text-[11px] text-slate-500">Rung 4 (1%) is the professional ceiling here. Going beyond it is your choice — but earn the habit first.</div>
            </>)}
          </>)}

          {tab === 'calm' && (<><Breathing /><Cooldown /></>)}

          {tab === 'learn' && (<>
            <div className="flex gap-1.5 overflow-x-auto pb-1">{LESSONS.map((l, i) => <button key={l.t} onClick={() => setLesson(i)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${lesson === i ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{l.t}</button>)}</div>
            <div className="rounded-xl border border-slate-800 p-4 space-y-2"><div className="text-base font-black text-white">{LESSONS[lesson].t}</div><div className="text-sm text-slate-300 leading-relaxed">{LESSONS[lesson].body}</div>
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2.5 text-[12.5px] text-cyan-100"><b>Practice:</b> {LESSONS[lesson].drill}</div></div>
          </>)}
          <div className="text-[10.5px] text-slate-600 pt-1">Educational self-coaching, not therapy or medical advice. If stress or anxiety feels overwhelming or affects your daily life, please talk to a qualified professional.</div>
        </div>
      </div>
    </div>, document.body);
};
