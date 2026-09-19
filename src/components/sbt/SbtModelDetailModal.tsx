import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SbtModel } from '../../data/sbtModelsData';
import { SbtModelChart } from './SbtModelChart';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldAlert,
  HelpCircle,
  Layers,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SbtModelDetailModalProps {
  model: SbtModel;
  onClose: () => void;
  onStartModelQuiz?: (modelId: string) => void;
}

export const SbtModelDetailModal: React.FC<SbtModelDetailModalProps> = ({
  model,
  onClose,
  onStartModelQuiz,
}) => {
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);
  const activeVariation = model.variations[activeVariationIndex] || model.variations[0];

  // Body scroll lock while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-400 border border-blue-500/30 text-xs font-mono-code font-bold">
                MODEL {model.number}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono-code uppercase font-bold border border-slate-700">
                {model.category.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide">
              {model.name} — {model.title}
            </h2>
            <p className="text-xs font-mono-code text-slate-400 max-w-2xl">
              {model.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Variation Switcher Tabs (if more than 1 variation) */}
          {model.variations.length > 1 && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto">
              {model.variations.map((v, idx) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVariationIndex(idx)}
                  className={`px-4 py-2 rounded-lg text-xs font-military font-bold tracking-wider transition whitespace-nowrap cursor-pointer ${
                    activeVariationIndex === idx
                      ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {/* Graphical Candlestick Chart */}
          <SbtModelChart variation={activeVariation} />

          {/* Two-Column Grid: Authoritative PDF Rules & Execution Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Verbatim PDF Rules */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-military font-bold text-slate-200 tracking-wider">
                    AUTHORITATIVE PDF RULES
                  </h3>
                </div>
                <span className="text-[10px] font-mono-code text-cyan-400/80 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  SOURCE FIDELITY
                </span>
              </div>

              <div className="space-y-2 font-mono-code text-xs text-slate-300">
                {model.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition leading-relaxed"
                  >
                    {rule}
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Entry, Target & Invalidation Criteria */}
            <div className="space-y-4">
              {/* Entry Protocol */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-military font-bold tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ENTRY PROTOCOL</span>
                </div>
                <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                  {model.entryCondition}
                </p>
              </div>

              {/* Target Area */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-military font-bold tracking-wider">
                  <Target className="w-4 h-4" />
                  <span>TARGET OBJECTIVE</span>
                </div>
                <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                  {model.targetCondition}
                </p>
              </div>

              {/* Invalidation Rules */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-military font-bold tracking-wider">
                  <ShieldAlert className="w-4 h-4" />
                  <span>INVALIDATION CRITERIA</span>
                </div>
                <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                  {model.invalidationCondition}
                </p>
              </div>
            </div>
          </div>

          {/* Numbered Annotations Guide */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>DIAGRAM STRUCTURAL MARKERS</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {model.numberedMarkers.map((m) => (
                <div
                  key={m.marker}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center text-xs font-mono-code font-bold">
                      {m.marker}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{m.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-snug">
                    {m.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-mono-code text-slate-400">
            Structure-Based Trading Model #{model.number}
          </span>

          <div className="flex items-center gap-3">
            {onStartModelQuiz && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartModelQuiz(model.id);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                <HelpCircle className="w-4 h-4" />
                <span>TEST KNOWLEDGE ON MODEL {model.number}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition cursor-pointer border border-slate-700"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
