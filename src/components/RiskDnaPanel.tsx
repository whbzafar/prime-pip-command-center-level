import React, { useEffect, useRef, useState } from 'react';
import type { RiskDna } from '../services/riskDna';
import { calibrateCalm, clearBaseline, connectHeart, disconnectHeart, getBaseline, heartSupported } from '../services/heartRate';
import { useHeart } from '../services/useRiskDna';

const BREACH_KEY = 'ppfx_fw_breaches_v1';
export const breachesToday = (day: string): number => { try { const v = JSON.parse(localStorage.getItem(BREACH_KEY) || '{}'); return Number(v[day]) || 0; } catch { return 0; } };
export const recordBreach = (day: string) => { try { const v = JSON.parse(localStorage.getItem(BREACH_KEY) || '{}'); v[day] = (Number(v[day]) || 0) + 1; localStorage.setItem(BREACH_KEY, JSON.stringify(v)); } catch { /* ignore */ } };
const fmtLeft = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const stateTone: Record<string, string> = { active: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200', probation: 'border-amber-400/50 bg-amber-400/10 text-amber-200', quarantined: 'border-rose-400/50 bg-rose-400/10 text-rose-200', frozen: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' };

/** Dashboard card: capital capsules (Risk-DNA) + firewall status + optional heart-rate link. */
export const RiskDnaPanel: React.FC<{ dna: RiskDna }> = ({ dna }) => {
  const heart = useHeart(); const base = getBaseline();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  return (
    <section data-testid="risk-dna-panel" className="rounded-2xl border border-[#d4af37]/25 bg-[#050a14]/90 p-4 shadow-[0_0_40px_-18px_rgba(212,175,55,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#d4af37]">Risk-DNA · Self-healing capital capsules</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-extralight tabular-nums text-slate-100">{dna.allowedRiskPct.toFixed(2)}%</span>
            <span className="text-[11px] uppercase tracking-widest text-slate-400">allowed risk · next trade{dna.mitosisLevel > 0 ? ` · mitosis L${dna.mitosisLevel}` : ''}</span>
          </div>
        </div>
        <div data-testid="firewall-status" className={`rounded-xl border px-3 py-2 text-right ${dna.locked ? (dna.hardLocked ? 'border-rose-400/60 bg-rose-500/10' : 'border-amber-400/60 bg-amber-400/10') : 'border-emerald-400/50 bg-emerald-400/10'}`}>
          <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">Execution firewall</div>
          <div className={`text-sm font-bold uppercase tracking-widest ${dna.locked ? (dna.hardLocked ? 'text-rose-300' : 'text-amber-200') : 'text-emerald-300'}`}>{dna.locked ? (dna.hardLocked ? 'Locked · today' : `Cooling${dna.lockedUntil ? ' ' + fmtLeft(dna.lockedUntil - now) : ''}`) : 'Armed · clear'}</div>
          {breachesToday(dna.today) > 0 && <div className="text-[10px] text-rose-300">{breachesToday(dna.today)} breach{breachesToday(dna.today) > 1 ? 'es' : ''} today</div>}
        </div>
      </div>
      {dna.locks.length > 0 && <ul className="mt-3 space-y-1">{dna.locks.map((l) => <li key={l.code} className="text-[12px] text-amber-100/90">⛔ {l.message}</li>)}</ul>}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[['Trades today', String(dna.tradesToday)], ['Loss streak', String(dna.lossStreak)], ['Day R', (dna.dayR > 0 ? '+' : '') + dna.dayR.toFixed(2)], ['Day loss', dna.dayLossPct.toFixed(2) + '%']].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-white/5 bg-white/[0.03] py-1.5"><div className="text-base font-light tabular-nums text-slate-100">{v}</div><div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">{l}</div></div>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1 text-[9px] uppercase tracking-[0.3em] text-slate-500">Capsules — risk follows live statistical edge (last 30 closed trades per strategy)</div>
        {dna.capsules.length === 0 ? <p className="text-[12px] text-slate-400">No closed trades logged yet. Capsules appear automatically as your journal fills.</p> : (
          <div className="space-y-1.5">
            {dna.capsules.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className={`w-24 shrink-0 truncate rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stateTone[c.state]}`} title={c.label}>{c.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-white/5"><div className="h-full bg-gradient-to-r from-[#d4af37] to-cyan-300 transition-all duration-700" style={{ width: `${c.sharePct}%` }} /></div>
                <span className="w-44 shrink-0 text-right text-[10px] tabular-nums text-slate-400">{c.state === 'quarantined' ? 'quarantined' : c.state === 'frozen' ? 'frozen' : `${c.riskPct.toFixed(2)}% risk`} · {c.expectancyR === null ? '—' : `${c.expectancyR > 0 ? '+' : ''}${c.expectancyR}R`} · {c.trades}t{c.winRate !== null ? ` · ${c.winRate}%` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3 text-[11px]">
        <span className="uppercase tracking-[0.25em] text-slate-500">Nervous system</span>
        {heart.status === 'live' ? (
          <>
            <span className="text-emerald-300">● {heart.name}: {heart.bio ? `${Math.round(heart.bio.hr || 0)} bpm${heart.bio.rmssd ? ` · HRV ${Math.round(heart.bio.rmssd)} ms` : ''}` : 'waiting…'}</span>
            <button onClick={() => calibrateCalm(60)} className="rounded border border-cyan-400/40 px-2 py-0.5 text-cyan-200 hover:bg-cyan-400/10">{heart.calibrating !== null ? `Calibrating ${heart.calibrating}s…` : base ? 'Recalibrate calm' : 'Calibrate calm (60 s)'}</button>
            <button onClick={disconnectHeart} className="rounded border border-white/10 px-2 py-0.5 text-slate-400 hover:text-white">Disconnect</button>
          </>
        ) : heartSupported() ? (
          <button onClick={() => void connectHeart()} disabled={heart.status === 'connecting'} className="rounded border border-[#d4af37]/50 bg-[#d4af37]/10 px-2 py-0.5 font-semibold text-[#f3d98a] hover:bg-[#d4af37]/20">{heart.status === 'connecting' ? 'Connecting…' : 'Connect heart-rate strap (Bluetooth)'}</button>
        ) : <span className="text-slate-500">Heart-rate link needs Chrome or Edge with Bluetooth. Behavioural firewall is active regardless.</span>}
        {base && <button onClick={clearBaseline} className="text-slate-500 underline hover:text-slate-300">reset baseline ({Math.round(base.hr)} bpm)</button>}
        {heart.error && <span className="text-rose-300">{heart.error}</span>}
      </div>
    </section>
  );
};

/** Breathing pacer (4 s in · 6 s out ≈ 6 breaths/min, the resonance rate that raises HRV) with optional soft tone + haptics. */
const Breathe: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [left, setLeft] = useState(60); const [phase, setPhase] = useState<'in' | 'out'>('in'); const [tone, setTone] = useState(false);
  const ac = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  useEffect(() => { const t = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => { if (left === 0) onDone(); }, [left, onDone]);
  useEffect(() => { let on = true; let p: 'in' | 'out' = 'in'; const run = () => { if (!on) return; setPhase(p); try { navigator.vibrate?.(p === 'in' ? [30] : [12, 40, 12]); } catch { /* ignore */ } const a = ac.current; if (a) { a.osc.frequency.setTargetAtTime(p === 'in' ? 196 : 147, a.ctx.currentTime, 0.4); a.gain.gain.setTargetAtTime(p === 'in' ? 0.05 : 0.02, a.ctx.currentTime, 0.8); } const wait = p === 'in' ? 4000 : 6000; p = p === 'in' ? 'out' : 'in'; window.setTimeout(run, wait); }; run(); return () => { on = false; }; }, []);
  useEffect(() => () => { try { ac.current?.osc.stop(); ac.current?.ctx.close(); } catch { /* ignore */ } }, []);
  const toggleTone = () => { if (tone) { try { ac.current?.osc.stop(); ac.current?.ctx.close(); } catch { /* ignore */ } ac.current = null; setTone(false); return; } try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = 196; gain.gain.value = 0.03; osc.connect(gain); gain.connect(ctx.destination); osc.start(); ac.current = { ctx, osc, gain }; setTone(true); } catch { /* ignore */ } };
  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan-300/40 bg-cyan-300/10" style={{ transform: `scale(${phase === 'in' ? 1 : 0.55})`, transition: `transform ${phase === 'in' ? 4 : 6}s ease-in-out` }} />
        <div className="relative text-sm font-light uppercase tracking-[0.3em] text-cyan-100">{phase === 'in' ? 'Inhale' : 'Exhale'}</div>
      </div>
      <div className="mt-2 text-[11px] tabular-nums text-slate-400">{left}s left</div>
      <button onClick={toggleTone} className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 underline hover:text-slate-300">{tone ? 'Soft tone: on' : 'Add soft tone (quiet)'}</button>
    </div>
  );
};

/** Replaces the trade-entry form while the firewall is locked. */
export const FirewallGate: React.FC<{ dna: RiskDna; onClose: () => void; onRelease: () => void; onBreach: () => void }> = ({ dna, onClose, onRelease, onBreach }) => {
  const [now, setNow] = useState(Date.now()); const [breathing, setBreathing] = useState(false); const [breathed, setBreathed] = useState(false);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const bioOnly = dna.locks.length > 0 && dna.locks.every((l) => l.code === 'BIOMETRIC');
  useEffect(() => { if (!dna.locked) onRelease(); }, [dna.locked, onRelease]);
  return (
    <div data-testid="firewall-gate" className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-rose-400/40 bg-[#060b16] p-5 shadow-[0_0_60px_-10px_rgba(244,63,94,0.45)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.4em] text-rose-300">Execution firewall · engaged</div>
        <div className="mt-1 text-xl font-light uppercase tracking-[0.2em] text-slate-100">Trade entry locked</div>
        <ul className="mt-3 space-y-1.5">{dna.locks.map((l) => <li key={l.code} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[12px] text-slate-200">{l.message}{l.until ? <span className="ml-2 font-mono text-amber-200">{fmtLeft(l.until - now)}</span> : null}</li>)}</ul>
        <p className="mt-3 text-[11px] leading-snug text-slate-400">Allowed risk right now: <b className="text-slate-100">{dna.allowedRiskPct.toFixed(2)}%</b>. The lock lifts by itself when the cooldown ends{bioOnly ? ' — or when you settle your breathing below.' : '.'}</p>
        {bioOnly && !breathing && !breathed && <button onClick={() => setBreathing(true)} className="mt-3 w-full rounded-lg border border-cyan-400/50 bg-cyan-400/10 py-2 text-[11px] font-bold uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20">Down-regulate · 60 s guided breathing</button>}
        {bioOnly && breathing && !breathed && <Breathe onDone={() => { setBreathing(false); setBreathed(true); }} />}
        {bioOnly && breathed && <button onClick={onRelease} className="mt-3 w-full rounded-lg border border-emerald-400/60 bg-emerald-400/15 py-2 text-[11px] font-bold uppercase tracking-widest text-emerald-200">Breathing complete · release firewall</button>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/15 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-200 hover:bg-white/5">Stand down</button>
          <button onClick={onBreach} title="Only for a trade you already placed elsewhere — it is recorded as a firewall breach" className="flex-1 rounded-lg border border-rose-400/40 py-2 text-[10px] font-semibold uppercase tracking-widest text-rose-300 hover:bg-rose-400/10">Log trade already placed (breach)</button>
        </div>
      </div>
    </div>
  );
};
