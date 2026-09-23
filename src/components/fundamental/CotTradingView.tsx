import React, { useState } from 'react';
import {
  CurrencyCode,
  CotPositioningRecord,
} from '../../types/fundamentalIndicatorTypes';
import { DEFAULT_COT_RECORDS } from '../../data/defaultFundamentalObservations';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { calculateCotMetrics } from '../../utils/fundamentalCalculationEngine';
import { generateCot } from '../../services/fundamentalLiveResearchService';
import {
  Activity,
  ExternalLink,
  Edit3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
} from 'lucide-react';

interface CotTradingViewProps {
  activeCurrency?: CurrencyCode;
  cotData?: CotPositioningRecord[];
  cotRecords?: CotPositioningRecord[];
  onUpdateCotRecord?: (record: CotPositioningRecord) => void;
  onUpdateCotRecords?: (records: CotPositioningRecord[]) => void;
  onSelectCurrency: (curr: CurrencyCode) => void;
}

export const CotTradingView: React.FC<CotTradingViewProps> = ({
  activeCurrency,
  cotData,
  cotRecords = DEFAULT_COT_RECORDS,
  onUpdateCotRecord,
  onUpdateCotRecords,
  onSelectCurrency,
}) => {
  const initialRecords = cotData || cotRecords;
  const [records, setRecords] = useState<CotPositioningRecord[]>(initialRecords);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [editingRecord, setEditingRecord] = useState<CotPositioningRecord | null>(null);
  const [isLiveGenerating, setIsLiveGenerating] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    nonCommercialLong: 0,
    nonCommercialShort: 0,
    commercialLong: 0,
    commercialShort: 0,
    openInterest: 0,
    reportDate: '',
    notes: '',
  });

  // Sync with prop updates
  React.useEffect(() => {
    if (cotData) {
      setRecords(cotData);
    } else if (cotRecords) {
      setRecords(cotRecords);
    }
  }, [cotData, cotRecords]);

  React.useEffect(() => {
    if (activeCurrency) setSelectedCurrency(activeCurrency);
  }, [activeCurrency]);

  const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

  const currentRecord = records.find((r) => r.currency === selectedCurrency) || records[0];
  const meta = CURRENCY_METADATA[selectedCurrency];

  // Calculate metrics
  const cotMetrics = calculateCotMetrics({
    nonCommercialLong: currentRecord.nonCommercialLong,
    nonCommercialShort: currentRecord.nonCommercialShort,
    commercialLong: currentRecord.commercialLong,
    commercialShort: currentRecord.commercialShort,
    dealerLong: currentRecord.dealerLong,
    dealerShort: currentRecord.dealerShort,
    assetManagerLong: currentRecord.assetManagerLong,
    assetManagerShort: currentRecord.assetManagerShort,
    leveragedFundsLong: currentRecord.leveragedFundsLong,
    leveragedFundsShort: currentRecord.leveragedFundsShort,
    otherReportablesLong: currentRecord.otherReportablesLong,
    otherReportablesShort: currentRecord.otherReportablesShort,
    nonReportableLong: currentRecord.nonReportableLong,
    nonReportableShort: currentRecord.nonReportableShort,
    openInterest: currentRecord.openInterest,
  });

  const handleGenerateLiveCot = async (mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (!currentRecord || isLiveGenerating) return;
    setIsLiveGenerating(true);
    setLiveMessage(null);
    try {
      const result = await generateCot(selectedCurrency, currentRecord, mode);
      const hasData = result.openInterest && (result.nonCommercialLong !== 0 || result.commercialLong !== 0);
      if (!hasData && result.status !== 'VERIFIED') {
        setLiveMessage(result.notes || 'COT evidence could not be verified; existing record was preserved.');
        return;
      }
      const updated: CotPositioningRecord = {
        ...currentRecord,
        contractName: result.contractName || currentRecord.contractName,
        reportDate: result.reportDate || currentRecord.reportDate,
        releaseDate: result.releaseDate || currentRecord.releaseDate,
        openInterest: result.openInterest,
        nonCommercialLong: result.nonCommercialLong,
        nonCommercialShort: result.nonCommercialShort,
        commercialLong: result.commercialLong,
        commercialShort: result.commercialShort,
        previousNetPosition: result.previousNetPosition ?? currentRecord.previousNetPosition,
        previousOpenInterest: result.previousOpenInterest ?? currentRecord.previousOpenInterest,
        sourceUrl: result.sourceUrl || currentRecord.sourceUrl,
        notes: result.notes || currentRecord.notes,
        updatedAt: result.retrievedAt || new Date().toISOString(),
        verificationStatus: 'VERIFIED',
        confidence: result.confidence,
        researchRetrievedAt: result.retrievedAt,
      };
      const nextRecords = records.map((record) => record.currency === selectedCurrency ? updated : record);
      setRecords(nextRecords);
      onUpdateCotRecord?.(updated);
      onUpdateCotRecords?.(nextRecords);
      setLiveMessage(`${selectedCurrency} COT verified and refreshed from grounded web research.`);
    } catch (error) {
      setLiveMessage(error instanceof Error ? error.message : 'Live COT research failed; existing data was preserved.');
    } finally {
      setIsLiveGenerating(false);
    }
  };

  const handleStartEdit = (rec: CotPositioningRecord) => {
    setEditingRecord(rec);
    setEditForm({
      nonCommercialLong: rec.nonCommercialLong || 0,
      nonCommercialShort: rec.nonCommercialShort || 0,
      commercialLong: rec.commercialLong || 0,
      commercialShort: rec.commercialShort || 0,
      openInterest: rec.openInterest || 0,
      reportDate: rec.reportDate,
      notes: rec.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const ncLong = Number(editForm.nonCommercialLong);
    const ncShort = Number(editForm.nonCommercialShort);
    const cLong = Number(editForm.commercialLong);
    const cShort = Number(editForm.commercialShort);
    if (!Number.isFinite(ncLong) || !Number.isFinite(ncShort) || !Number.isFinite(cLong) || !Number.isFinite(cShort) || !Number.isFinite(Number(editForm.openInterest)) || Number(editForm.openInterest) <= 0) return;

    const updatedRecord: CotPositioningRecord = {
      ...editingRecord,
      nonCommercialLong: ncLong,
      nonCommercialShort: ncShort,
      commercialLong: cLong,
      commercialShort: cShort,
      // Preserve any existing disaggregated fields; they are not used by the Legacy score.

      openInterest: Number(editForm.openInterest),
      reportDate: editForm.reportDate,
      notes: editForm.notes,
      updatedAt: new Date().toISOString(),
    };

    const nextRecords = records.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
    setRecords(nextRecords);
    if (onUpdateCotRecord) {
      onUpdateCotRecord(updatedRecord);
    }
    if (onUpdateCotRecords) {
      onUpdateCotRecords(nextRecords);
    }
    setEditingRecord(null);
  };

  // User-provided COT source link. Keep this exact URL; do not replace it with another provider.
  const cotSourceUrl = 'https://www.tradingster.com/cot';

  return (
    <div className="space-y-6">
      {/* COT source and currency selector */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                  COT Report
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 text-[10px] font-mono-code font-bold">
                  LEGACY / NON-COMMERCIAL
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Non-Commercial Speculators • Commercial Hedgers • Open Interest • Weekly Positioning
              </p>
            </div>
          </div>

          {/* Prominent COT source button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleGenerateLiveCot('GENERATE')}
              disabled={isLiveGenerating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-military font-bold transition cursor-pointer"
            >
              {isLiveGenerating ? 'RESEARCHING…' : 'GENERATE LIVE COT'}
            </button>
            <button
              type="button"
              onClick={() => handleGenerateLiveCot('REGENERATE')}
              disabled={isLiveGenerating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 text-xs font-military font-bold transition cursor-pointer"
            >
              REGENERATE
            </button>
            <a
              href={cotSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-military font-bold transition shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <span>Open COT Report ↗</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {liveMessage && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/70 border border-cyan-500/20 text-[11px] font-mono-code text-slate-300">
            <strong className="text-cyan-300">COT LIVE RESEARCH:</strong> {liveMessage}
          </div>
        )}

        {/* Currency Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {currencies.map((code) => {
            const cMeta = CURRENCY_METADATA[code];
            const isSelected = selectedCurrency === code;
            const rec = records.find((r) => r.currency === code);
            const m = rec ? calculateCotMetrics(rec) : null;

            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCurrency(code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono-code transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500/20 border-blue-500 text-cyan-300 font-bold shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cMeta?.flag}</span>
                <span>{code}</span>
                {m && (
                  <span
                    className={`text-[10px] font-bold ${
                      m.positioningScore > 15
                        ? 'text-emerald-400'
                        : m.positioningScore < -15
                        ? 'text-rose-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {m.positioningScore > 0 ? `+${m.positioningScore}` : m.positioningScore}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Selected Currency COT Breakdown */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta?.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-military font-bold text-slate-100">
                  {selectedCurrency} Speculative Positioning ({currentRecord.contractName})
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Report Date: {currentRecord.reportDate}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300">
                  {currentRecord.verificationStatus || 'MANUAL'}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                {currentRecord.notes || 'Legacy COT positioning entered manually from the selected report.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartEdit(currentRecord)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-military font-bold transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Update Raw COT Inputs</span>
            </button>
          </div>
        </div>

        {/* Core COT outputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">COT Direction</span>
            <span className={`text-sm font-military font-bold block ${cotMetrics.cotDirection === 'BULLISH' ? 'text-emerald-400' : cotMetrics.cotDirection === 'BEARISH' ? 'text-rose-400' : 'text-slate-300'}`}>
              {cotMetrics.cotDirection}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Net Position</span>
            <span className={`text-sm font-military font-bold block ${cotMetrics.netPosition > 0 ? 'text-emerald-400' : cotMetrics.netPosition < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {cotMetrics.netPosition > 0 ? '+' : ''}{cotMetrics.netPosition.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Net / Open Interest</span>
            <span className="text-sm font-military font-bold text-cyan-300 block">
              {cotMetrics.netOpenInterestPercent > 0 ? '+' : ''}{cotMetrics.netOpenInterestPercent.toFixed(2)}%
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">COT Score</span>
            <span className={`text-sm font-military font-bold block ${cotMetrics.positioningScore > 0 ? 'text-emerald-400' : cotMetrics.positioningScore < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {cotMetrics.positioningScore > 0 ? '+' : ''}{cotMetrics.positioningScore} / 100
            </span>
          </div>
        </div>

        {/* Detailed Interpretation Banner */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
              COT Interpretation:
            </span>
            <p className="text-xs font-mono-code text-slate-300 mt-0.5">
              {cotMetrics.interpretation}
            </p>
          </div>
        </div>

        {/* Essential raw fields and deterministic calculation */}
        <div className="space-y-3">
          <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
            Legacy COT Raw Inputs
          </h4>
          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono-code">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0c1222] border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Long Contracts</th>
                  <th className="p-3 text-right">Short Contracts</th>
                  <th className="p-3 text-right">Net Position</th>
                  <th className="p-3 text-center">% of Open Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                <tr className="bg-cyan-500/5">
                  <td className="p-3 font-semibold text-cyan-300">Non-Commercial</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{(currentRecord.nonCommercialLong ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{(currentRecord.nonCommercialShort ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-military font-bold">{cotMetrics.netPosition.toLocaleString()}</td>
                  <td className="p-3 text-center text-slate-400">{cotMetrics.longPercent.toFixed(1)}% L / {cotMetrics.shortPercent.toFixed(1)}% S</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-300">Commercial</td>
                  <td className="p-3 text-right text-slate-300">{(currentRecord.commercialLong ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{(currentRecord.commercialShort ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-military text-slate-400">{cotMetrics.commercialNet.toLocaleString()}</td>
                  <td className="p-3 text-center text-slate-500">Hedging</td>
                </tr>
                <tr className="bg-slate-900/60 font-bold border-t border-slate-700">
                  <td className="p-3 text-cyan-300">Open Interest</td>
                  <td colSpan={3} className="p-3 text-right text-slate-100 font-military text-sm">{currentRecord.openInterest.toLocaleString()} Contracts</td>
                  <td className="p-3 text-center text-slate-400">{cotMetrics.openInterestChange === null ? '—' : `OI ${cotMetrics.openInterestChange >= 0 ? '+' : ''}${cotMetrics.openInterestChange.toLocaleString()}`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit COT Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0a0f1d] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-base text-slate-100">
                  Update COT Input Fields: {editingRecord.currency}
                </h3>
                <span className="text-xs font-mono-code text-cyan-400 block mt-0.5">
                  Enter verified figures from the selected Legacy COT report
                </span>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono-code">
              {/* Non-Commercial Inputs */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-2">
                <span className="font-military font-bold text-cyan-300 uppercase">Non-Commercial (Speculative)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Long Contracts</label>
                    <input type="number" min="0" value={editForm.nonCommercialLong} onChange={(e) => setEditForm({ ...editForm, nonCommercialLong: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Short Contracts</label>
                    <input type="number" min="0" value={editForm.nonCommercialShort} onChange={(e) => setEditForm({ ...editForm, nonCommercialShort: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100" />
                  </div>
                </div>
              </div>

              {/* Open Interest & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Total Open Interest</label>
                  <input type="number" min="1" value={editForm.openInterest} onChange={(e) => setEditForm({ ...editForm, openInterest: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Report Date</label>
                  <input type="date" value={editForm.reportDate} onChange={(e) => setEditForm({ ...editForm, reportDate: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100" />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-military font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Save & Recalculate COT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
