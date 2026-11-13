import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Crown, Loader2, MessageCircle, Tag, X } from 'lucide-react';
import { apiCheckReferral, getStoredReferral, setStoredReferral } from '../utils/authClient';
import { UserAccount } from '../types';
import {
  DISCOUNT_PERCENT, OWNER_WHATSAPP_DISPLAY, PRICE_STANDARD, PRICE_WITH_CODE, SUBSCRIPTION_INCLUDES, waLink,
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
    <div className="relative mx-auto w-full max-w-xl font-mono-code" data-testid="subscription-page">
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

        <ul className="mt-5 space-y-2 border-t border-slate-800 pt-4">
          {SUBSCRIPTION_INCLUDES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-slate-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> <span>{f}</span>
            </li>
          ))}
        </ul>

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
