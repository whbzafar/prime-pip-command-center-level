import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Copy, Check, ShieldAlert, BookOpen, AlertTriangle } from 'lucide-react';

interface AiMacroExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyOrPair: string;
  report: string | null;
  isLoading: boolean;
  onRegenerate: () => void;
  source?: string;
}

// Lightweight, resilient markdown parser to avoid external dependency issues
const FormattedMarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-3 font-sans leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // H3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-military font-bold text-cyan-300 pt-2 border-b border-slate-800/80 pb-1">
              {trimmed.replace('### ', '')}
            </h3>
          );
        }

        // H4
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-sm font-military font-bold text-amber-300 pt-2">
              {trimmed.replace('#### ', '')}
            </h4>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const rawText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm pl-2">
              <span className="text-cyan-400 mt-1 font-bold">•</span>
              <div>{renderFormattedText(rawText)}</div>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm pl-2">
              <span className="text-amber-400 font-mono-code font-bold">{numMatch[1]}.</span>
              <div>{renderFormattedText(numMatch[2])}</div>
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-xs sm:text-sm text-slate-300">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Helper to format **bold** and `code` in text strings
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono-code text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const AiMacroExplanationModal: React.FC<AiMacroExplanationModalProps> = ({
  isOpen,
  onClose,
  currencyOrPair,
  report,
  isLoading,
  onRegenerate,
  source,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0c1222]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40 uppercase">
                  INSTITUTIONAL MACRO INTELLIGENCE
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Target: {currencyOrPair}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
                AI Fundamental Explanation & Tactical Thesis
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* Transparency Disclaimer Banner */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-3 text-xs font-mono-code text-cyan-200">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300">EXPLANATION-ONLY PROTOCOL: </span>
              This synthesis interprets verified quantitative scores without fabricating economic figures or altering calculated weights.
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-military font-bold text-slate-200 uppercase tracking-wider">
                  Analyzing Macro Data & Yield Spreads...
                </div>
                <p className="text-xs font-mono-code text-slate-400">
                  Synthesizing deterministic indicators into executive institutional brief
                </p>
              </div>
            </div>
          ) : report ? (
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 space-y-4 font-sans leading-relaxed text-xs sm:text-sm">
              <FormattedMarkdownContent content={report} />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 font-mono-code text-xs">
              No report available. Click Regenerate to generate explanation.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#0c1222] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-500">
            <span>ENGINE: {source || 'GEMINI-2.5-FLASH'}</span>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code font-bold transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY BRIEF'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isLoading}
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>REGENERATE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
