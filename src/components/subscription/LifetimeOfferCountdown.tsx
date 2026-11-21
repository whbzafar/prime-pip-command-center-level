import React, { useEffect, useState } from 'react';
import { MessageCircle, Timer, X } from 'lucide-react';
import { LIFETIME_OFFER_ENDS_AT, LIFETIME_OFFER_END_LABEL, LIFETIME_OFFER_PRICE, PRICE_STANDARD, isLifetimeOfferActive, lifetimeOfferWaLink, msToParts } from '../../config/pricing';

const KEY = 'ppfx_lifetime_offer_closed_v1';
const two = (n: number) => String(n).padStart(2, '0');

/** Live countdown to the end of the $50 lifetime early-bird offer. Vanishes by itself when the offer ends. */
export const LifetimeOfferCountdown: React.FC<{ variant?: 'bar' | 'card'; className?: string }> = ({ variant = 'bar', className = '' }) => {
  const [now, setNow] = useState(() => Date.now());
  const [closed, setClosed] = useState(() => { if (variant !== 'bar') return false; try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } });
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  if (closed || !isLifetimeOfferActive(now)) return null;
  const { d, h, m, s } = msToParts(LIFETIME_OFFER_ENDS_AT - now);
  const unit = (v: number | string, l: string) => (
    <span className="inline-flex min-w-[2.6rem] flex-col items-center rounded-lg border border-amber-300/40 bg-slate-950/80 px-1.5 py-0.5">
      <span className="font-black tabular-nums text-amber-200 text-sm leading-tight">{v}</span>
      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{l}</span>
    </span>
  );
  const clock = <span className="inline-flex items-center gap-1" role="timer" aria-label="Time left on the early-bird offer" data-testid="lifetime-countdown">{unit(d, 'days')}{unit(two(h), 'hrs')}{unit(two(m), 'min')}{unit(two(s), 'sec')}</span>;
  const cta = <a href={lifetimeOfferWaLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-950 hover:brightness-110"><MessageCircle className="h-3.5 w-3.5" /> Claim ${LIFETIME_OFFER_PRICE} lifetime</a>;

  if (variant === 'card') {
    return (
      <div data-testid="lifetime-offer" className={`rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-500/20 via-slate-950 to-emerald-500/15 p-4 text-center ${className}`}>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-950"><Timer className="h-3 w-3" /> Early-bird · ends {LIFETIME_OFFER_END_LABEL}</div>
        <div className="mt-2 flex items-end justify-center gap-2"><span className="pb-1 text-lg text-slate-500 line-through">${PRICE_STANDARD}</span><span className="text-5xl font-black text-white">${LIFETIME_OFFER_PRICE}</span></div>
        <p className="mt-1 text-xs text-amber-100">Lifetime access to the complete terminal — pay once, keep it forever.</p>
        <div className="mt-3 flex justify-center">{clock}</div>
        <div className="mt-3 flex justify-center">{cta}</div>
        <p className="mt-2 text-[10px] text-slate-500">Purchases made before {LIFETIME_OFFER_END_LABEL} get the offer; after that the regular price applies.</p>
      </div>
    );
  }
  return (
    <div data-testid="lifetime-offer-bar" className={`relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-amber-300/30 bg-gradient-to-r from-amber-500/15 via-slate-950/95 to-emerald-500/15 px-3 py-2 pr-9 text-center font-mono-code ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-100"><Timer className="h-3.5 w-3.5 text-amber-300" /> <strong className="text-amber-300">EARLY-BIRD:</strong> lifetime terminal access for <strong className="text-white">${LIFETIME_OFFER_PRICE}</strong> <span className="text-slate-400">(instead of ${PRICE_STANDARD})</span> — ends {LIFETIME_OFFER_END_LABEL}</span>
      {clock}{cta}
      <button type="button" aria-label="Hide offer for this session" onClick={() => { setClosed(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } }} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
};
