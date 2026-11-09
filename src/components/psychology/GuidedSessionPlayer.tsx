/**
 * Guided session player: timed steps with a breathing orb, soft chime between steps,
 * before/after intensity rating, and a local history so progress is visible.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pause, Play, SkipForward, X } from 'lucide-react';
import type { GuidedStep } from './mindGuide';

export interface MindSessionLog { at: number; category: string; title: string; before: number; after: number }
export const MIND_LOG_KEY = 'ppfx_mind_sessions_v1';
export const readMindLog = (): MindSessionLog[] => { try { const v = JSON.parse(localStorage.getItem(MIND_LOG_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

export function chime(freqs = [523.25, 659.25, 783.99]) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.14;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 1.2);
    });
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 2000);
  } catch { /* audio blocked */ }
}

/** Breath phases (seconds) for each pattern. */
const PATTERNS: Record<string, { label: string; dur: number }[]> = {
  sigh: [{ label: 'Breathe in', dur: 2.5 }, { label: 'Top-up breath', dur: 1 }, { label: 'Long exhale', dur: 6 }],
  box: [{ label: 'Breathe in', dur: 4 }, { label: 'Hold', dur: 4 }, { label: 'Breathe out', dur: 4 }, { label: 'Hold', dur: 4 }],
  '478': [{ label: 'Breathe in', dur: 4 }, { label: 'Hold', dur: 7 }, { label: 'Breathe out', dur: 8 }],
  slow: [{ label: 'Breathe in', dur: 5 }, { label: 'Breathe out', dur: 5 }],
};

export const BreathOrb: React.FC<{ pattern: keyof typeof PATTERNS; running: boolean }> = ({ pattern, running }) => {
  const phases = PATTERNS[pattern] || PATTERNS.slow;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % phases.length), phases[i].dur * 1000);
    return () => window.clearTimeout(t);
  }, [i, running, phases]);
  const label = phases[i].label;
  const big = /in|Top-up|Hold/.test(label) && !/out|exhale/i.test(label);
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="rounded-full bg-gradient-to-br from-cyan-400/60 via-indigo-500/50 to-violet-500/60 shadow-[0_0_60px_rgba(34,211,238,0.35)] ease-in-out"
          style={{ width: big ? 150 : 70, height: big ? 150 : 70, transitionProperty: 'width,height', transitionDuration: `${phases[i].dur}s` }} />
        <span className="absolute text-[13px] font-bold text-white drop-shadow">{running ? label : 'Paused'}</span>
      </div>
    </div>
  );
};

export const GuidedSessionPlayer: React.FC<{ category: string; title: string; steps: GuidedStep[]; onClose: () => void }> = ({ category, title, steps, onClose }) => {
  const [stage, setStage] = useState<'before' | 'run' | 'after' | 'done'>('before');
  const [before, setBefore] = useState(6);
  const [after, setAfter] = useState(4);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(steps[0]?.seconds || 30);
  const [running, setRunning] = useState(true);
  const total = useMemo(() => steps.reduce((a, s) => a + s.seconds, 0), [steps]);
  const step = steps[idx];
  const tick = useRef<number | null>(null);

  useEffect(() => {
    if (stage !== 'run' || !running) return;
    tick.current = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => { if (tick.current) window.clearInterval(tick.current); };
  }, [stage, running, idx]);

  useEffect(() => {
    if (stage !== 'run' || left > 0) return;
    if (idx < steps.length - 1) { chime([659.25, 783.99]); setIdx(idx + 1); setLeft(steps[idx + 1].seconds); }
    else { chime(); setStage('after'); }
  }, [left, idx, stage, steps]);

  const done = steps.slice(0, idx).reduce((a, s) => a + s.seconds, 0) + (step ? step.seconds - left : 0);
  const pct = Math.min(100, (done / Math.max(1, total)) * 100);
  const save = () => {
    try { localStorage.setItem(MIND_LOG_KEY, JSON.stringify([{ at: Date.now(), category, title, before, after }, ...readMindLog()].slice(0, 200))); } catch { /* ignore */ }
    setStage('done');
  };
  const Scale: React.FC<{ v: number; set: (n: number) => void }> = ({ v, set }) => (
    <div className="flex gap-1 justify-center flex-wrap">
      {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
        <button key={n} type="button" onClick={() => set(n)} className={`w-9 h-9 rounded-lg border text-[13px] font-bold cursor-pointer ${v === n ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'border-slate-700 text-slate-300 hover:border-cyan-500/60'}`}>{n}</button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-[#03060d]/90 backdrop-blur-md flex items-center justify-center p-3">
      <div className="w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-[#0b1222] to-[#060a14] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Guided session</div>
            <h3 className="text-[17px] font-bold text-slate-50">{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {stage === 'before' && (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-[14px] text-slate-300">How strong is the feeling right now?</p>
            <Scale v={before} set={setBefore} />
            <p className="text-[11px] text-slate-500">1 = barely there · 10 = overwhelming</p>
            <button type="button" onClick={() => { setStage('run'); setIdx(0); setLeft(steps[0].seconds); setRunning(true); chime([523.25]); }} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 font-bold text-[14px] cursor-pointer">Begin · {Math.round(total / 60)} min</button>
          </div>
        )}

        {stage === 'run' && step && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
            <div className="mt-1 flex justify-between text-[10.5px] text-slate-500"><span>Step {idx + 1} of {steps.length}</span><span>{Math.floor(left / 60)}:{String(Math.max(0, left) % 60).padStart(2, '0')}</span></div>
            <div className="mt-3 text-center">
              <div className="text-[18px] font-bold text-slate-50">{step.title}</div>
              {step.kind === 'breathe' && <BreathOrb pattern={(step.breath || 'slow') as any} running={running} />}
              <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{step.text}</p>
            </div>
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={() => setRunning((r) => !r)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-[13px] cursor-pointer inline-flex items-center gap-1.5">{running ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Resume</>}</button>
              <button type="button" onClick={() => setLeft(0)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-[13px] cursor-pointer inline-flex items-center gap-1.5"><SkipForward className="w-4 h-4" />Next step</button>
            </div>
          </div>
        )}

        {stage === 'after' && (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-[14px] text-slate-300">How strong is it now?</p>
            <Scale v={after} set={setAfter} />
            <button type="button" onClick={save} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-bold text-[14px] cursor-pointer">Save session</button>
          </div>
        )}

        {stage === 'done' && (
          <div className="mt-6 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center"><Check className="w-7 h-7 text-emerald-300" /></div>
            <div className="text-[16px] font-bold text-slate-50">{before > after ? `Down from ${before} to ${after} — well done.` : 'Session complete.'}</div>
            <p className="text-[13px] text-slate-400">{before > after ? 'You changed your state on purpose. That is the core skill of every professional trader.' : 'Some feelings need more than one round. Try the 60-second calm, take a break, or come back later — that is a smart decision, not a failure.'}</p>
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-[13px] cursor-pointer">Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidedSessionPlayer;
