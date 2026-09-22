import React, { useState } from 'react';
import {
  PairSentimentRecord,
} from '../../types/fundamentalIndicatorTypes';
import { calculateSentimentMetrics } from '../../utils/fundamentalCalculationEngine';
import {
  Users,
  ExternalLink,
  Edit3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  X,
  Scale,
  Layers,
} from 'lucide-react';

interface MarketSentimentViewProps {
  sentimentRecords?: PairSentimentRecord[];
  onUpdateSentimentRecords?: (records: PairSentimentRecord[]) => void;
}

export const MarketSentimentView: React.FC<MarketSentimentViewProps> = ({
  sentimentRecords = [],
  onUpdateSentimentRecords,
}) => {
  const [records, setRecords] = useState<PairSentimentRecord[]>(sentimentRecords);
  const [selectedPair, setSelectedPair] = useState<string>('EURUSD');
  const [editingItem, setEditingItem] = useState<PairSentimentRecord | null>(null);
  const [editForm, setEditForm] = useState({
    longPercent: 50,
    longVolume: 0,
    shortVolume: 0,
    longPositions: 0,
    shortPositions: 0,
    reportTimestamp: '',
    source: 'Myfxbook Community Outlook',
  });

  const currentItem = records.find((r) => r.pair === selectedPair) || records[0] || null;

  const handleStartEdit = (item: PairSentimentRecord) => {
    setEditingItem(item);
    setEditForm({
      longPercent: item.longPercent,
      longVolume: item.longVolume,
      shortVolume: item.shortVolume,
      longPositions: item.longPositions,
      shortPositions: item.shortPositions,
      reportTimestamp: item.reportTimestamp,
      source: item.source,
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const longPct = Number(editForm.longPercent);
    const metrics = calculateSentimentMetrics({
      longPercent: longPct,
      longVolume: Number(editForm.longVolume),
      shortVolume: Number(editForm.shortVolume),
      longPositions: Number(editForm.longPositions),
      shortPositions: Number(editForm.shortPositions),
    });

    const updated: PairSentimentRecord = {
      ...editingItem,
      longPercent: metrics.longPercent,
      shortPercent: metrics.shortPercent,
      longVolume: Number(editForm.longVolume),
      shortVolume: Number(editForm.shortVolume),
      longPositions: Number(editForm.longPositions),
      shortPositions: Number(editForm.shortPositions),
      reportTimestamp: editForm.reportTimestamp || new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      source: editForm.source,
      longShortRatio: metrics.longShortRatio,
      netSentiment: metrics.netSentiment,
      sentimentScore: metrics.sentimentScore,
      sentimentRegime: metrics.sentimentRegime,
      updatedAt: new Date().toISOString(),
    };

    const nextRecords = records.map((r) => (r.id === updated.id ? updated : r));
    setRecords(nextRecords);
    if (onUpdateSentimentRecords) {
      onUpdateSentimentRecords(nextRecords);
    }
    setEditingItem(null);
  };

  const getMyfxbookUrl = () => {
    // Open the neutral Myfxbook Community Outlook landing page so the user chooses the pair there.
    return 'https://www.myfxbook.com/community/outlook';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Prominent Myfxbook Button */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                  Retail Market Sentiment (Community Outlook)
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono-code font-bold">
                  CONTRARIAN POSITIONING
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Real-Time Retail Broker Data • Long/Short Ratios • Crowd Crowding Traps (Displayed Separately From Fundamentals)
              </p>
            </div>
          </div>

          {/* Prominent Myfxbook External Link Button (Mandatory Section 27) */}
          <a
            href={getMyfxbookUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-military font-bold transition shadow-lg shadow-amber-600/25 cursor-pointer"
          >
            <span>Open Sentiment on Myfxbook ↗</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Strict Principle Callout (Section 30) */}
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 text-xs font-mono-code text-cyan-300">
          <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <span>
            <strong>Architectural Rule:</strong> Market Sentiment is purely contextual. It is displayed strictly separately from economic fundamentals and <strong>NEVER</strong> overrides the deterministic fundamental strength score.
          </span>
        </div>

        {/* Pair Quick Select */}
        <div className="flex flex-wrap items-center gap-2">
          {records.map((r) => {
            const isSelected = selectedPair === r.pair;
            return (
              <button
                key={r.pair}
                type="button"
                onClick={() => setSelectedPair(r.pair)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono-code transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{r.pair}</span>
                <span className="text-[10px] text-slate-500">{r.longPercent}% L</span>
              </button>
            );
          })}
        </div>
      </div>

      {!currentItem ? (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-3">
          <Users className="w-8 h-8 text-amber-400 mx-auto" />
          <div>
            <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              No Pair Sentiment Data Entered
            </h4>
            <p className="text-xs font-mono-code text-slate-400 mt-1">
              Open the neutral Myfxbook Community Outlook page and select any currency pair there. No synthetic sentiment data is shown in this dashboard.
            </p>
          </div>
          <a
            href={getMyfxbookUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-military font-bold transition cursor-pointer"
          >
            Open Myfxbook Sentiment ↗
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : (
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-military font-bold text-slate-100">{currentItem.pair}</span>
              <span className="text-xs font-mono-code text-slate-400">
                Source: {currentItem.source} • Timestamp: {currentItem.reportTimestamp}
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Retail account open positioning. Ratios & net sentiment calculated deterministically.
            </p>
          </div>

          <button
            onClick={() => handleStartEdit(currentItem)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs font-military font-bold transition cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Update Sentiment Inputs</span>
          </button>
        </div>

        {/* Visual Ratio Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono-code">
            <span className="text-emerald-400 font-bold">{currentItem.longPercent}% Long</span>
            <span className="text-rose-400 font-bold">{currentItem.shortPercent}% Short</span>
          </div>
          <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${currentItem.longPercent}%` }}
              className="bg-emerald-500 transition-all duration-300"
            />
            <div
              style={{ width: `${currentItem.shortPercent}%` }}
              className="bg-rose-500 transition-all duration-300"
            />
          </div>
        </div>

        {/* Auto-Calculated Metrics (Mandatory Section 28) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Long / Short Ratio</span>
            <span className="text-base font-military font-bold text-slate-100 block">
              {currentItem.longShortRatio} : 1
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Net Sentiment (%L - %S)</span>
            <span
              className={`text-base font-military font-bold block ${
                currentItem.netSentiment > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currentItem.netSentiment > 0 ? `+${currentItem.netSentiment}%` : `${currentItem.netSentiment}%`}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Contrarian Score</span>
            <span
              className={`text-base font-military font-bold block ${
                currentItem.sentimentScore > 15
                  ? 'text-emerald-400'
                  : currentItem.sentimentScore < -15
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {currentItem.sentimentScore > 0 ? `+${currentItem.sentimentScore}` : currentItem.sentimentScore} / 100
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Regime / Edge</span>
            <span
              className={`text-xs font-military font-bold block ${
                currentItem.sentimentRegime === 'CROWD_LONG_BEARISH_EDGE'
                  ? 'text-rose-400'
                  : currentItem.sentimentRegime === 'CROWD_SHORT_BULLISH_EDGE'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {currentItem.sentimentRegime === 'CROWD_LONG_BEARISH_EDGE'
                ? 'RETAIL LONG (BEARISH EDGE)'
                : currentItem.sentimentRegime === 'CROWD_SHORT_BULLISH_EDGE'
                ? 'RETAIL SHORT (BULLISH EDGE)'
                : 'BALANCED SENTIMENT'}
            </span>
          </div>
        </div>
      </div>

      )}

      {/* Edit Sentiment Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0a0f1d] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-base text-slate-100">
                  Update Sentiment: {editingItem.pair}
                </h3>
                <span className="text-xs font-mono-code text-amber-400 block mt-0.5">
                  Enter latest verified Myfxbook retail percentages
                </span>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono-code">
              <div>
                <label className="text-slate-400 block mb-1">
                  Retail Long % <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={editForm.longPercent}
                  onChange={(e) => setEditForm({ ...editForm, longPercent: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Short % automatically calculated as (100 - Long %) = {(100 - editForm.longPercent).toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Long Volume (Lots)</label>
                  <input
                    type="number"
                    value={editForm.longVolume}
                    onChange={(e) => setEditForm({ ...editForm, longVolume: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Short Volume (Lots)</label>
                  <input
                    type="number"
                    value={editForm.shortVolume}
                    onChange={(e) => setEditForm({ ...editForm, shortVolume: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Report Timestamp</label>
                <input
                  type="text"
                  value={editForm.reportTimestamp}
                  onChange={(e) => setEditForm({ ...editForm, reportTimestamp: e.target.value })}
                  placeholder="e.g. 2026-09-21 14:00 UTC"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                Official Source: <a href={getMyfxbookUrl()} target="_blank" rel="noreferrer" className="underline font-bold">Myfxbook Community Outlook ↗</a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-military font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
