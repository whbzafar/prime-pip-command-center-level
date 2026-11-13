import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Crown, Loader2, MessageCircle, Tag, X } from 'lucide-react';
import { apiCheckReferral, getStoredReferral, setStoredReferral } from '../utils/authClient';
import { UserAccount } from '../types';
import {
  BUNDLE_OFFER_END_LABEL, SBT_INDICATOR_PRICE, bundleOfferDaysLeft, bundleOfferWaLink, isBundleOfferActive, DISCOUNT_PERCENT, OWNER_WHATSAPP_DISPLAY, PRICE_STANDARD, PRICE_WITH_CODE, SUBSCRIPTION_INCLUDES, waLink,
} from '../config/pricing';

interface SubscriptionPageProps {
  onOpenLogin?: () => void;
  onContinueDemo?: () => void;
  appliedReferralCode?: string;
  currentUser?: UserAccount | null;
  onClose?: () => void;
  onContactDeveloper?: () => void;
}

/** One plan, one price: $200 — or $100 with a valid code. No free tier, no free-access rewards. */
export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onOpenLogin, onContinueDemo, appliedReferralCode, currentUser, onClose }) => {
  const [code, setCode] = useState<string>(appliedReferralCode || getStoredReferral() || '');
  const [applied, setApplied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = async (value: string) => {
    const c = value.trim();
    if (!c) { setApplied(false); setMessage(null); return; }
    setChecking(true);
    const res = await apiCheckReferral(c).catch(() => ({ valid: false } as any));
    setChecking(false);
    if (res.valid) {
      setApplied(true);
      setStoredReferral(c);
      setMessage({ ok: true, text: `🎉 Congratulations! ${DISCOUNT_PERCENT}% off — your price is now $${PRICE_WITH_CODE}.` });
    } else {
      setApplied(false);
      setMessage({ ok: false, text: 'That code is not valid. The price stays at $' + PRICE_STANDARD + '.' });
    }
  };

  useEffect(() => { if (code) void apply(code); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const price = applied ? PRICE_WITH_CODE : PRICE_STANDARD;
  const who = currentUser?.username ? ` My username is ${currentUser.username}.` : '';
  const wa = waLink(
    `Hello PrimePipFX, I want to subscribe to the PRIMEPIPFX Trading Command Center ($${price}${applied ? `, coupon code ${code.trim()}` : ''}).${who}`,
  );

  return (
    <div className="relative mx-auto w-full max-w-2xl font-mono-code" data-testid="subscription-page">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-0 top-0 z-10 rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="mb-5 pr-10 text-center sm:pr-0">
        <div className="mx-auto mb-2 inline-flex rounded-2xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-amber-300"><Crown className="h-6 w-6" /></div>
        <h2 className="font-military text-lg font-bold uppercase tracking-wider text-white sm:text-xl">PrimePipFX Subscription</h2>
        <p className="mt-1 text-xs text-slate-400">One plan. Full access to the Command Center.</p>
      </div>

      {isBundleOfferActive() && (
        <div data-testid="bundle-offer" className="ppfx-sbt-glow mb-4 overflow-hidden rounded-3xl border border-emerald-300/60 bg-gradient-to-br from-emerald-500/20 via-slate-950 to-amber-400/15 p-4 text-center sm:p-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-950">🎁 Launch offer · ends {BUNDLE_OFFER_END_LABEL}</div>
          <h3 className="mt-2 font-military text-base font-bold leading-snug text-white sm:text-lg">Buy the Prime Pip SBT Indicator<br className="sm:hidden" /> — get the full terminal <span className="text-emerald-300">FREE</span></h3>
          <div className="mt-2 flex items-end justify-center gap-2">
            <span className="text-4xl font-black text-white">${SBT_INDICATOR_PRICE}</span>
            <span className="pb-1 text-xs text-slate-400">one-time · Command Center included</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-100/80">You save the ${PRICE_STANDARD} subscription{bundleOfferDaysLeft() <= 30 ? ` · only ${bundleOfferDaysLeft()} day${bundleOfferDaysLeft() === 1 ? '' : 's'} left` : ''}.</p>
          <a href={bundleOfferWaLink()} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-950 hover:brightness-110 sm:w-auto sm:px-8">
            <MessageCircle className="h-4 w-4" /> Claim the offer on WhatsApp
          </a>
          <p className="mt-2 text-[10px] text-slate-500">Prefer just the terminal? The standard plan is below.</p>
        </div>
      )}

      <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-2xl sm:p-6">
        <div className="flex items-end justify-center gap-3">
          {applied && <span className="pb-2 text-lg text-slate-500 line-through" data-testid="price-original">${PRICE_STANDARD}</span>}
          <span className="text-5xl font-black text-white" data-testid="price-current">${price}</span>
          <span className="pb-2 text-xs text-slate-400">USD</span>
        </div>
        {applied && (
          <div className="mt-2 text-center">
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300">{DISCOUNT_PERCENT}% OFF APPLIED</span>
          </div>
        )}

        <div className="mt-5">
          <label htmlFor="coupon" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Tag className="h-3.5 w-3.5" /> Coupon code
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={code}
              onChange={(e) => { setCode(e.target.value); setApplied(false); setMessage(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void apply(code); }}
              placeholder="Enter your code"
              autoCapitalize="characters"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => void apply(code)}
              disabled={checking || !code.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-white disabled:opacity-40"
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Apply
            </button>
          </div>
          {message && (
            <div role="status" data-testid="coupon-message" className={`mt-2 rounded-xl border px-3 py-2 text-xs ${message.ok ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/40 bg-rose-400/10 text-rose-200'}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Everything included</div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUBSCRIPTION_INCLUDES.map((f) => {
              const [title, ...rest] = f.split(' — ');
              return (
                <li key={f} className="flex items-start gap-2.5 rounded-xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.07] to-cyan-400/[0.03] px-3 py-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-3 w-3" /></span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold leading-snug text-white">{title}</span>
                    {rest.length > 0 && <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-400">{rest.join(' — ')}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-950 hover:from-emerald-400 hover:to-teal-300"
        >
          <MessageCircle className="h-4 w-4" /> Subscribe — ${price}
        </a>
        <p className="mt-2 text-center text-[11px] text-slate-500">Pay via WhatsApp ({OWNER_WHATSAPP_DISPLAY}); your account is activated after the payment is verified.</p>
      </div>

      {(onContinueDemo || (onOpenLogin && !currentUser)) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {onContinueDemo && (
            <button type="button" onClick={() => { onContinueDemo(); onClose?.(); }} className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-slate-800">
              Continue with Demo
            </button>
          )}
          {onOpenLogin && !currentUser && (
            <button type="button" onClick={() => { onClose?.(); onOpenLogin(); }} className="flex-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-xs font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20">
              Sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
};
