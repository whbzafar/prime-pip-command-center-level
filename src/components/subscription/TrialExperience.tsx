import React, { useEffect, useRef, useState } from 'react';
import { Clock, Crown, Star, X, Minus, Send } from 'lucide-react';
import type { UserAccount } from '../../types';
import { trialMsLeft } from '../../utils/authClient';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 30-minute free trial for new self sign-ups: a live countdown strip while it runs.
 * The end time comes from the server (set once at registration), so it cannot be restarted.
 */
export const TrialBanner: React.FC<{ user: UserAccount | null; onExpire: () => void; onSubscribe: () => void }> = ({ user, onExpire, onSubscribe }) => {
  const [left, setLeft] = useState(() => trialMsLeft(user));
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    setLeft(trialMsLeft(user));
    const t = window.setInterval(() => {
      const ms = trialMsLeft(user);
      setLeft(ms);
      if (ms <= 0 && !fired.current) { fired.current = true; window.clearInterval(t); onExpire(); }
    }, 1000);
    return () => window.clearInterval(t);
  }, [user?.id, user?.trialEndsAt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (left <= 0) return null;
  const urgent = left < 5 * 60_000;
  return (
    <div data-testid="trial-banner" className={`relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b px-3 py-2 text-center text-[12px] ${urgent ? 'border-rose-400/40 bg-rose-950/70' : 'border-emerald-400/30 bg-emerald-950/60'}`}>
      <span className={`inline-flex items-center gap-1.5 font-bold ${urgent ? 'text-rose-200' : 'text-emerald-200'}`}>
        <Clock className="h-4 w-4" /> FREE TRIAL — full access for 30 minutes
      </span>
      <span className={`font-mono-code text-sm font-bold tabular-nums ${urgent ? 'text-rose-100' : 'text-white'}`}>{fmt(left)} left</span>
      <span className="hidden text-slate-300 sm:inline">Explore every category (Trader Community stays locked). One trial per account.</span>
      <button type="button" onClick={onSubscribe} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 text-[11px] font-bold text-slate-950 cursor-pointer">
        <Crown className="h-3.5 w-3.5" /> Keep full access
      </button>
    </div>
  );
};

/** Shown once when the trial ends: rate the app (saved for the owner), or close it and continue in demo. */
export const TrialReviewModal: React.FC<{ user: UserAccount | null; onClose: () => void; onSubscribe: () => void }> = ({ user, onClose, onSubscribe }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [minimized, setMinimized] = useState(false);
  const send = async () => {
    if (!rating) return;
    setState('sending');
    try {
      const r = await fetch('/api/insights/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ kind: 'review', rating, text, section: 'Trial ended', username: user?.username || '' }),
      });
      const j = await r.json().catch(() => null);
      setState(r.ok && j?.ok ? 'sent' : 'error');
    } catch { setState('error'); }
  };

  if (minimized) {
    return (
      <button type="button" onClick={() => setMinimized(false)} className="fixed bottom-4 left-4 z-[9990] inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-slate-950/95 px-3 py-2 text-xs font-bold text-amber-200 shadow-xl cursor-pointer">
        <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> Rate PrimePipFX
      </button>
    );
  }
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-amber-300/40 bg-[#0b1220] p-5 shadow-2xl">
        <div className="absolute right-3 top-3 flex gap-1">
          <button type="button" aria-label="Minimize" onClick={() => setMinimized(true)} className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer"><Minus className="h-4 w-4" /></button>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        {state === 'sent' ? (
          <div className="py-4 text-center">
            <div className="text-lg font-bold text-white">Thank you for your review!</div>
            <p className="mt-1 text-sm text-slate-300">You can keep exploring the demo, or subscribe to unlock everything again.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={onSubscribe} className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-bold text-slate-950 cursor-pointer">Subscribe</button>
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 cursor-pointer">Continue demo</button>
            </div>
          </div>
        ) : (
          <>
            <div className="pr-14 text-lg font-bold text-white">Your 30-minute trial has ended</div>
            <p className="mt-1 text-sm text-slate-300">How was PrimePipFX? Your review goes straight to the owner.</p>
            <div className="mt-4 flex justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="cursor-pointer p-0.5">
                  <Star className={`h-8 w-8 ${(hover || rating) >= n ? 'fill-amber-300 text-amber-300' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1500))} rows={3} placeholder="What did you like? What should we improve? (optional)"
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-amber-300" />
            {state === 'error' && <div className="mt-2 text-xs text-rose-300">Could not send right now — please try again.</div>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 cursor-pointer">Skip & continue demo</button>
              <button type="button" disabled={!rating || state === 'sending'} onClick={() => void send()} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40 cursor-pointer">
                <Send className="h-4 w-4" /> {state === 'sending' ? 'Sending…' : 'Send review'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
