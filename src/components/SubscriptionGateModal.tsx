import React from 'react';
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

interface SubscriptionGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
  onOpenSubscription?: () => void;
  user?: UserAccount | null;
  onUpgradeSuccess?: (upgradedUser: UserAccount) => void;
  onContinueDemo?: () => void;
}

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
  onOpenSubscription,
  user,
  onContinueDemo,
}) => {
  if (!isOpen) return null;

  const isExpired = user?.subscriptionStatus === 'EXPIRED';
  const isSuspended = user?.subscriptionStatus === 'SUSPENDED';
  const isPaymentRequired = user?.subscriptionStatus === 'PAYMENT_REQUIRED';

  let title = 'FULL TRADING ACCESS REQUIRED';
  let subtitle = 'This action requires an active PrimePipFX subscription or verified account.';
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

  const whatsappMessage = isExpired
    ? `Hello PrimePipFX, my subscription for username (${user?.username || 'trader'}) has expired. I want to renew access to the PRIMEPIPFX Trading Command Center.`
    : isSuspended
    ? `Hello PrimePipFX, my account (${user?.username || 'trader'}) is suspended. Please assist with my access to the PRIMEPIPFX Trading Command Center.`
    : `Hello PrimePipFX, I want access to the PRIMEPIPFX Trading Command Center.`;

  const whatsappUrl = `https://wa.me/923406671495?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg prime-gradient-box p-6 sm:p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button (allowed if not strict lock) */}
        <button
          onClick={() => {
            if (isExpired || isSuspended) {
              if (onContinueDemo) onContinueDemo();
            }
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 transition rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex p-3 rounded-2xl border mb-3 shadow-lg ${badgeColor}`}>
            {icon}
          </div>
          <h2 className="text-lg font-military font-bold tracking-wider text-slate-100 uppercase">
            {title}
          </h2>
          <p className="text-xs text-slate-300 font-mono-code mt-1.5 max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Account Status Badge */}
        {user && (
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 mb-5 flex items-center justify-between font-mono-code text-xs">
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

        {/* Features Reminder */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-5 space-y-2 font-mono-code text-xs">
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
    </div>
  );
};
