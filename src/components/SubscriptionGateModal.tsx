import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock,
  AlertTriangle,
  MessageCircle,
  X,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { UserAccount } from '../types';
import { CategorySummary } from '../data/categorySummaries';

interface SubscriptionGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
  onOpenSubscription?: () => void;
  user?: UserAccount | null;
  onUpgradeSuccess?: (upgradedUser: UserAccount) => void;
  onContinueDemo?: () => void;
  lockedCategory?: CategorySummary | null;
}

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  onOpenSubscription,
  user,
  onContinueDemo,
  lockedCategory,
}) => {
  if (!isOpen) return null;

  const isExpired = user?.subscriptionStatus === 'EXPIRED';
  const isSuspended = user?.subscriptionStatus === 'SUSPENDED';
  const isPaymentRequired = user?.subscriptionStatus === 'PAYMENT_REQUIRED';

  let title = lockedCategory ? `${lockedCategory.name} IS LOCKED` : 'FULL TRADING ACCESS REQUIRED';
  let subtitle = lockedCategory
    ? `This module is locked in Demo Mode. Subscribe to unlock full institutional execution capabilities.`
    : 'This action requires an active PrimePipFX subscription or verified account.';
  let icon = <Lock className="w-8 h-8 text-cyan-400" />;
  let badgeColor = 'bg-blue-500/10 border-blue-500/30 text-cyan-400';

  if (isExpired) {
    title = 'SUBSCRIPTION ACCESS EXPIRED';
    subtitle = `Your subscription period has concluded. To continue recording live executions, please renew your access with Developer WhatsApp (03406671495).`;
    icon = <Clock className="w-8 h-8 text-rose-400" />;
    badgeColor = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
  } else if (isSuspended) {
    title = 'ACCOUNT ACCESS SUSPENDED';
    subtitle = `Your trader account is temporarily suspended. Please contact the administrator directly on WhatsApp (03406671495) for immediate verification.`;
    icon = <ShieldAlert className="w-8 h-8 text-rose-400" />;
    badgeColor = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
  } else if (isPaymentRequired) {
    title = 'PAYMENT VERIFICATION REQUIRED';
    subtitle = `Your membership is pending subscription payment confirmation. Contact developer on WhatsApp to complete activation.`;
    icon = <AlertTriangle className="w-8 h-8 text-cyan-400" />;
    badgeColor = 'bg-blue-500/10 border-blue-500/30 text-cyan-400';
  }

  const whatsappMessage = lockedCategory
    ? `Hello PrimePipFX, I want full access to ${lockedCategory.name} ($55 Lifetime Access Offer) on the PRIMEPIPFX Command Center.`
    : isExpired
    ? `Hello PrimePipFX, my subscription for username (${user?.username || 'trader'}) has expired. I want to renew access to the PRIMEPIPFX Trading Command Center.`
    : isSuspended
    ? `Hello PrimePipFX, my account (${user?.username || 'trader'}) is suspended. Please assist with my access to the PRIMEPIPFX Trading Command Center.`
    : `Hello PrimePipFX, I want to activate Lifetime Access ($55 Offer) to the PRIMEPIPFX Trading Command Center.`;

  const whatsappUrl = `https://wa.me/923406671495?text=${encodeURIComponent(whatsappMessage)}`;

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg prime-gradient-box p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button (allowed if not strict lock) */}
        <button
          onClick={() => {
            if (isExpired || isSuspended) {
              if (onContinueDemo) onContinueDemo();
            }
            onClose();
          }}
          className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-100 transition rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className={`inline-flex p-2.5 rounded-2xl border mb-2.5 shadow-lg ${badgeColor}`}>
            {icon}
          </div>
          <h2 className="text-base sm:text-lg font-military font-bold tracking-wider text-slate-100 uppercase">
            {title}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 font-mono-code mt-1 max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Account Status Badge */}
        {user && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/90 border border-slate-800 mb-3.5 flex items-center justify-between font-mono-code text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Authenticated Trader</span>
              <span className="font-bold text-slate-200">{user.name} (@{user.username})</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] uppercase block">Status</span>
              <span className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                isExpired ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                isSuspended ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-blue-500/20 text-amber-300 border border-blue-500/30'
              }`}>
                {user.subscriptionStatus}
              </span>
            </div>
          </div>
        )}

        {/* Category Specific Summary Box or General Features Reminder */}
        {lockedCategory ? (
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 mb-3.5 space-y-3 font-mono-code text-xs">
            <div>
              <div className="text-cyan-400 font-bold uppercase text-[11px] mb-1 flex items-center gap-1.5">
                <span>📋 MODULE CAPABILITIES & SUMMARY</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {lockedCategory.overview}
              </p>
            </div>

            {lockedCategory.keyFeatures?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                  INCLUDED FEATURES WITH FULL SUBSCRIPTION:
                </span>
                {lockedCategory.keyFeatures.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-200 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Special Offer Banner: $55 until Oct 10 2026 or 5 students free */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/15 via-blue-500/15 to-emerald-500/15 border border-amber-500/40 space-y-1 text-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 text-xs font-military">SPECIAL LIFETIME ACCESS OFFER</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  VALID UNTIL OCT 10, 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Lock in lifetime access for <strong>$55</strong> (fee increases after Oct 10, 2026) — OR bring <strong>5 students</strong> to take the 3-month course and receive the <strong>entire platform 100% FREE for life!</strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-4 space-y-2 font-mono-code text-xs">
            <div className="text-cyan-400 font-bold uppercase text-[11px] mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              WHAT YOU GET WITH FULL ACCESS:
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Isolated Cloud & Offline Trading Journal</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Institutional 1% Master Risk Guidance Engine</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Dedicated Lot Size Calculator & Over-Risk Detector</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>AI Trading Coach & SMC Chart Auditor</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>CONTACT DEVELOPER ON WHATSAPP (03406671495)</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                if (onOpenLogin) onOpenLogin();
              }}
              className="prime-btn-primary text-xs py-2 uppercase"
            >
              SWITCH ACCOUNT
            </button>
            <button
              onClick={() => {
                onClose();
                if (onOpenSubscription) onOpenSubscription();
              }}
              className="prime-btn-secondary text-xs py-2 uppercase"
            >
              PRICING & PLANS
            </button>
          </div>

          <button
            onClick={() => {
              if (onContinueDemo) onContinueDemo();
              onClose();
            }}
            className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-mono-code transition text-center cursor-pointer active:scale-95"
          >
            CONTINUE IN DEMO MODE (READ-ONLY)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
