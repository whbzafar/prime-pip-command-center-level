import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  MessageCircle,
  X,
  CheckCircle2,
  Zap,
  Bot,
  Code2,
} from 'lucide-react';

interface ExploreLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedDemo?: () => void;
  onOpenSubscription?: () => void;
}

export const ExploreLockedModal: React.FC<ExploreLockedModalProps> = ({
  isOpen,
  onClose,
  onProceedDemo,
  onOpenSubscription,
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const whatsappLink = `https://wa.me/923406671495?text=${encodeURIComponent(
    'Hello PrimePipFX Developer / Mentor, I clicked Explore but do not have an active subscription yet. I would like to activate my subscription to unlock full Command Center, SBT Bots, and Pine Script access.'
  )}`;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl overflow-y-auto selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-amber-500/20 via-rose-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-lg rounded-3xl bg-slate-950 border-2 border-amber-500/50 shadow-2xl shadow-amber-950/60 p-6 sm:p-7 overflow-hidden text-slate-100 font-mono-code"
      >
        {/* Iridescent Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon with Lock Glow */}
        <div className="text-center mb-5">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-rose-500/10 border-2 border-amber-400/60 flex items-center justify-center shadow-lg shadow-amber-500/30 text-amber-300">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500/90 border border-slate-950 flex items-center justify-center text-white text-[10px] font-bold">
              ✕
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>ACCOUNT EXPLORATION RESTRICTED</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-military font-bold text-white tracking-wide uppercase">
            Active Subscription Required
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans">
            Users without an active institutional subscription encounter restricted access when clicking Explore.
          </p>
        </div>

        {/* Locked Feature Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 mb-5 text-xs">
          <div className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5 pb-1 border-b border-slate-800">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Features Locked for Non-Subscribed Accounts:</span>
          </div>

          <div className="flex items-start gap-2 text-slate-300">
            <Bot className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span><strong>SBT Automated Trading Bot:</strong> Institutional 85% accuracy bot suite.</span>
          </div>
          <div className="flex items-start gap-2 text-slate-300">
            <Code2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span><strong>Pine Script Indicators:</strong> Quantitative custom indicator compiler &amp; execution.</span>
          </div>
          <div className="flex items-start gap-2 text-slate-300">
            <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span><strong>Live Command Center &amp; Signals:</strong> Proprietary market structure models.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {onOpenSubscription && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscription();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Unlock Access with Subscription</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-military font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Activate via Developer WhatsApp</span>
          </a>

          {onProceedDemo && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedDemo();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Continue in Demo Mode (Limited Preview)</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
