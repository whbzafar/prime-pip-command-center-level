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

// Advanced institutional markdown parser supporting headers, tables, callouts, and lists
const FormattedMarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return;
    const headerRow = tableBuffer[0];
    const dataRows = tableBuffer.slice(2); // Skip separator row

    const headers = headerRow
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    elements.push(
      <div key={key} className="overflow-x-auto my-4 rounded-xl border border-slate-800 bg-slate-950/80 shadow-md">
        <table className="w-full text-left text-xs font-mono-code divide-y divide-slate-800">
          <thead className="bg-slate-900/90 text-cyan-300">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3.5 py-2.5 font-bold uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {dataRows.map((row, rIdx) => {
              const cells = row
                .split('|')
                .map((c) => c.trim())
                .filter((c) => c.length > 0);
              return (
                <tr key={rIdx} className="hover:bg-slate-900/50 transition">
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 whitespace-nowrap">
                      {renderFormattedText(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Check for table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable(`table-${idx}`);
    }

    if (!trimmed) {
      elements.push(<div key={`spacer-${idx}`} className="h-2" />);
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${idx}`} className="border-t border-slate-800 my-4" />);
      continue;
    }

    // H1
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${idx}`}
          className="text-lg sm:text-xl font-military font-bold text-amber-400 pt-4 pb-1.5 border-b border-amber-500/30 uppercase tracking-wider"
        >
          {trimmed.replace('# ', '')}
        </h1>
      );
      continue;
    }

    // H2
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${idx}`}
          className="text-base sm:text-lg font-military font-bold text-cyan-300 pt-3 pb-1 border-b border-slate-800 uppercase tracking-wide"
        >
          {trimmed.replace('## ', '')}
        </h2>
      );
      continue;
    }

    // H3
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="text-sm sm:text-base font-military font-bold text-slate-100 pt-2 pb-0.5 text-cyan-400"
        >
          {trimmed.replace('### ', '')}
        </h3>
      );
      continue;
    }

    // H4
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${idx}`} className="text-xs sm:text-sm font-military font-bold text-amber-300 pt-2">
          {trimmed.replace('#### ', '')}
        </h4>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div
          key={`bq-${idx}`}
          className="pl-3.5 py-1.5 border-l-2 border-cyan-400 bg-slate-900/60 rounded-r-lg text-xs sm:text-sm italic text-slate-300 my-1.5"
        >
          {renderFormattedText(trimmed.replace('> ', ''))}
        </div>
      );
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const rawText = trimmed.substring(2);
      elements.push(
        <div key={`li-${idx}`} className="flex items-start gap-2 text-xs sm:text-sm pl-2 py-0.5">
          <span className="text-cyan-400 font-bold shrink-0">•</span>
          <div className="text-slate-300">{renderFormattedText(rawText)}</div>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`ol-${idx}`} className="flex items-start gap-2 text-xs sm:text-sm pl-2 py-0.5">
          <span className="text-amber-400 font-mono-code font-bold shrink-0">{numMatch[1]}.</span>
          <div className="text-slate-300">{renderFormattedText(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-sm text-slate-300 leading-relaxed">
        {renderFormattedText(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable('table-end');
  }

  return <div className="space-y-2 font-sans leading-relaxed text-slate-200">{elements}</div>;
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
  const [viewMode, setViewMode] = useState<'RENDERED' | 'RAW'>('RENDERED');

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PRIME_PIP_FX_FUNDAMENTAL_${currencyOrPair.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#0c1222]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-blue-500/20 to-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40 uppercase">
                  MASTER MACRO RESEARCH TERMINAL
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Target: <strong className="text-slate-200">{currencyOrPair}</strong>
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-military font-bold text-slate-100 tracking-wide mt-0.5">
                Institutional Macroeconomic & Cross-Asset Fundamental Intelligence
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono-code">
                <button
                  type="button"
                  onClick={() => setViewMode('RENDERED')}
                  className={`px-2.5 py-1 rounded transition font-bold cursor-pointer ${
                    viewMode === 'RENDERED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  INTERPRETED
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('RAW')}
                  className={`px-2.5 py-1 rounded transition font-bold cursor-pointer ${
                    viewMode === 'RAW' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  RAW MARKDOWN
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm scroll-smooth">
          {/* Transparency Disclaimer Banner */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-start gap-2.5 text-xs font-mono-code text-slate-300">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300">INSTITUTIONAL EVIDENCE PROTOCOL: </strong>
              Analyzes verified macroeconomic data, expectations, and market pricing under the Master AI Fundamental Intelligence Constitution (No data fabrication · State vs. Impulse · Invalidation Criteria · Cross-Asset Divergence Engine).
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
              <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                  Generating Institutional Macro Analysis...
                </div>
                <p className="text-xs font-mono-code text-slate-400 max-w-md">
                  Processing policy rates, yield spreads, inflation persistence, labor momentum, commodity dynamics, and cross-asset confirmation
                </p>
              </div>
            </div>
          ) : report ? (
            viewMode === 'RAW' ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono-code text-xs whitespace-pre-wrap leading-relaxed select-all">
                {report}
              </div>
            ) : (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-200 space-y-4 font-sans leading-relaxed text-xs sm:text-sm shadow-xl">
                <FormattedMarkdownContent content={report} />
              </div>
            )
          ) : (
            <div className="py-16 text-center text-slate-400 font-mono-code text-xs">
              No report available. Click Regenerate to produce macroeconomic brief.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-800/80 bg-[#0c1222] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400">
            <span>CALIBER: INSTITUTIONAL RESEARCH</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400">ENGINE: {source || 'GEMINI-3.8-FLASH'}</span>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-mono-code font-bold border border-slate-700 transition cursor-pointer"
                  title="Download Markdown Report"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>EXPORT .MD</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-mono-code font-bold border border-slate-700 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY BRIEF'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              disabled={isLoading}
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-slate-950 text-xs font-military font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20"
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
