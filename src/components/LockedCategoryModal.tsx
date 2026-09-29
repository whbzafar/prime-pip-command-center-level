import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { CategorySummary } from '../data/categorySummaries';

interface LockedCategoryModalProps {
  summary: CategorySummary | null;
  onClose: () => void;
  onOpenSubscription: () => void;
  onExploreDemo?: () => void;
}

export const LockedCategoryModal: React.FC<LockedCategoryModalProps> = ({
  summary,
  onClose,
  onOpenSubscription,
  onExploreDemo,
}) => {
  if (!summary) return null;

  const whatsappLink = `https://wa.me/923406671495?text=${encodeURIComponent(
    `Hello PrimePipFX Developer / Mentor, I am exploring the Demo Terminal and would like to unlock full access to: ${summary.name}`
  )}`;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/40 p-5 sm:p-6 overflow-hidden my-auto"
        >
          {/* Subtle Cyber Grid & Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition border border-slate-700/50 cursor-pointer z-10"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-mono-code font-bold uppercase tracking-wider shadow-sm">
              <Lock className="w-3.5 h-3.5" />
              <span>Category Locked in Demo Mode</span>
            </span>
            <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest">
              SUBSCRIPTION REQUIRED
            </span>
          </div>

          {/* Category Title */}
          <h2 className="text-xl sm:text-2xl font-military font-black text-white uppercase tracking-wide flex items-center gap-2.5">
            <span>{summary.name}</span>
          </h2>

          {/* Short Description */}
          <p className="text-xs sm:text-sm font-military text-cyan-400 mt-1.5 font-bold leading-snug">
            {summary.shortDesc}
          </p>

          {/* Summary / Overview Box */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono-code uppercase text-slate-300 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Tool Capabilities & Overview</span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {summary.overview}
            </p>
          </div>

          {/* Key Institutional Features */}
          {summary.keyFeatures && summary.keyFeatures.length > 0 && (
            <div className="mt-3.5 space-y-2">
              <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider font-semibold block">
                Included with Full Membership:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {summary.keyFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/70 text-slate-200 text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Actions */}
          <div className="mt-5 space-y-2.5 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscription();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>PURCHASE SUBSCRIPTION TO UNLOCK FULL SUITE</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code font-bold text-center flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Contact via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono-code transition border border-slate-700/60"
              >
                Continue Demo Exploration
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
