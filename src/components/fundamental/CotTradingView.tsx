import React, { useState } from 'react';
import {
  CurrencyCode,
  CotPositioningRecord,
} from '../../types/fundamentalIndicatorTypes';
import { DEFAULT_COT_RECORDS } from '../../data/defaultFundamentalObservations';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { calculateCotMetrics } from '../../utils/fundamentalCalculationEngine';
import {
  Activity,
  ExternalLink,
  Edit3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  ShieldCheck,
  CheckCircle2,
  X,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface CotTradingViewProps {
  cotData?: CotPositioningRecord[];
  cotRecords?: CotPositioningRecord[];
  onUpdateCotRecord?: (record: CotPositioningRecord) => void;
  onUpdateCotRecords?: (records: CotPositioningRecord[]) => void;
  onSelectCurrency: (curr: CurrencyCode) => void;
}

export const CotTradingView: React.FC<CotTradingViewProps> = ({
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
  const [showDisaggregated, setShowDisaggregated] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    nonCommercialLong: 0,
    nonCommercialShort: 0,
    commercialLong: 0,
    commercialShort: 0,
    dealerLong: 0,
    dealerShort: 0,
    assetManagerLong: 0,
    assetManagerShort: 0,
    leveragedFundsLong: 0,
    leveragedFundsShort: 0,
    otherReportablesLong: 0,
    otherReportablesShort: 0,
    nonReportableLong: 0,
    nonReportableShort: 0,
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

  const handleStartEdit = (rec: CotPositioningRecord) => {
    setEditingRecord(rec);
    const ncLong = rec.nonCommercialLong !== undefined && rec.nonCommercialLong > 0
      ? rec.nonCommercialLong
      : (rec.assetManagerLong || 0) + (rec.leveragedFundsLong || 0);
    const ncShort = rec.nonCommercialShort !== undefined && rec.nonCommercialShort > 0
      ? rec.nonCommercialShort
      : (rec.assetManagerShort || 0) + (rec.leveragedFundsShort || 0);
    const cLong = rec.commercialLong !== undefined && rec.commercialLong > 0
      ? rec.commercialLong
      : (rec.dealerLong || 0);
    const cShort = rec.commercialShort !== undefined && rec.commercialShort > 0
      ? rec.commercialShort
      : (rec.dealerShort || 0);

    setEditForm({
      nonCommercialLong: ncLong,
      nonCommercialShort: ncShort,
      commercialLong: cLong,
      commercialShort: cShort,
      dealerLong: rec.dealerLong || 0,
      dealerShort: rec.dealerShort || 0,
      assetManagerLong: rec.assetManagerLong || 0,
      assetManagerShort: rec.assetManagerShort || 0,
      leveragedFundsLong: rec.leveragedFundsLong || 0,
      leveragedFundsShort: rec.leveragedFundsShort || 0,
      otherReportablesLong: rec.otherReportablesLong || 0,
      otherReportablesShort: rec.otherReportablesShort || 0,
      nonReportableLong: rec.nonReportableLong || 0,
      nonReportableShort: rec.nonReportableShort || 0,
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

    const updatedRecord: CotPositioningRecord = {
      ...editingRecord,
      nonCommercialLong: ncLong,
      nonCommercialShort: ncShort,
      commercialLong: cLong,
      commercialShort: cShort,
      dealerLong: Number(editForm.dealerLong) || cLong,
      dealerShort: Number(editForm.dealerShort) || cShort,
      assetManagerLong: Number(editForm.assetManagerLong),
      assetManagerShort: Number(editForm.assetManagerShort),
      leveragedFundsLong: Number(editForm.leveragedFundsLong),
      leveragedFundsShort: Number(editForm.leveragedFundsShort),
      otherReportablesLong: Number(editForm.otherReportablesLong),
      otherReportablesShort: Number(editForm.otherReportablesShort),
      nonReportableLong: Number(editForm.nonReportableLong),
      nonReportableShort: Number(editForm.nonReportableShort),
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
      {/* Top Banner with Prominent TradingView Button */}
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
                  FINANCIAL & DISAGGREGATED FUTURES
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Institutional Asset Managers • Leveraged Hedge Funds • Commercial Dealers • Contrarian Crowding Detection
              </p>
            </div>
          </div>

          {/* Prominent COT source button */
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
                  {selectedCurrency} Institutional Positioning ({currentRecord.contractName})
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Report Date: {currentRecord.reportDate}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                {currentRecord.notes || 'Institutional positioning data entered manually from TradingView CFTC series.'}
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

        {/* Section 26 Interpretation Cards: Direction, Weekly Change, Extreme, Percentile, Momentum */}
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
              COT Multi-Factor Interpretation:
            </span>
            <p className="text-xs font-mono-code text-slate-300 mt-0.5">
              {cotMetrics.interpretation}
            </p>
          </div>
        </div>

        {/* Raw Fields & Auto-Calculated Comparison Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
            Trader Category Breakdown (Disaggregated / Financial COT)
          </h4>

          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono-code">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0c1222] border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Trader Category</th>
                  <th className="p-3 text-right">Long Contracts</th>
                  <th className="p-3 text-right">Short Contracts</th>
                  <th className="p-3 text-right">Net Position</th>
                  <th className="p-3 text-center">Long / Short %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                <tr className="bg-cyan-500/5 border-b border-cyan-500/20">
                  <td className="p-3 font-semibold text-cyan-300">Non-Commercial</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{(currentRecord.nonCommercialLong ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{(currentRecord.nonCommercialShort ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-military font-bold">
                    {((currentRecord.nonCommercialLong ?? 0) - (currentRecord.nonCommercialShort ?? 0)).toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {cotMetrics.longPercent.toFixed(1)}% L / {cotMetrics.shortPercent.toFixed(1)}% S
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-200">Asset Manager / Institutional</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{currentRecord.assetManagerLong.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{currentRecord.assetManagerShort.toLocaleString()}</td>
                  <td className="p-3 text-right font-military font-bold">
                    {(currentRecord.assetManagerLong - currentRecord.assetManagerShort).toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {Math.round((currentRecord.assetManagerLong / (currentRecord.assetManagerLong + currentRecord.assetManagerShort || 1)) * 100)}% L / {Math.round((currentRecord.assetManagerShort / (currentRecord.assetManagerLong + currentRecord.assetManagerShort || 1)) * 100)}% S
                  </td>
                </tr>

                <tr>
                  <td className="p-3 font-semibold text-slate-200">Leveraged Funds (Hedge Funds)</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{currentRecord.leveragedFundsLong.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{currentRecord.leveragedFundsShort.toLocaleString()}</td>
                  <td className="p-3 text-right font-military font-bold">
                    {(currentRecord.leveragedFundsLong - currentRecord.leveragedFundsShort).toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {Math.round((currentRecord.leveragedFundsLong / (currentRecord.leveragedFundsLong + currentRecord.leveragedFundsShort || 1)) * 100)}% L / {Math.round((currentRecord.leveragedFundsShort / (currentRecord.leveragedFundsLong + currentRecord.leveragedFundsShort || 1)) * 100)}% S
                  </td>
                </tr>

                <tr>
                  <td className="p-3 font-semibold text-slate-300">Dealer / Intermediary</td>
                  <td className="p-3 text-right text-slate-300">{currentRecord.dealerLong.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{currentRecord.dealerShort.toLocaleString()}</td>
                  <td className="p-3 text-right font-military text-slate-400">
                    {(currentRecord.dealerLong - currentRecord.dealerShort).toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-500">Commercial Hedging</td>
                </tr>

                <tr>
                  <td className="p-3 font-semibold text-slate-300">Other Reportables</td>
                  <td className="p-3 text-right text-slate-300">{currentRecord.otherReportablesLong.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{currentRecord.otherReportablesShort.toLocaleString()}</td>
                  <td className="p-3 text-right font-military text-slate-400">
                    {(currentRecord.otherReportablesLong - currentRecord.otherReportablesShort).toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-500">—</td>
                </tr>

                <tr>
                  <td className="p-3 font-semibold text-slate-300">Non-Reportable (Small Retail)</td>
                  <td className="p-3 text-right text-slate-300">{currentRecord.nonReportableLong.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{currentRecord.nonReportableShort.toLocaleString()}</td>
                  <td className="p-3 text-right font-military text-slate-400">
                    {(currentRecord.nonReportableLong - currentRecord.nonReportableShort).toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-500">—</td>
                </tr>

                <tr className="bg-slate-900/60 font-bold border-t border-slate-700">
                  <td className="p-3 text-cyan-300">Total Open Interest</td>
                  <td colSpan={3} className="p-3 text-right text-slate-100 font-military text-sm">
                    {currentRecord.openInterest.toLocaleString()} Contracts
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    OI Change: {cotMetrics.openInterestChange >= 0 ? `+${cotMetrics.openInterestChange.toLocaleString()}` : cotMetrics.openInterestChange.toLocaleString()}
                  </td>
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
                  Enter verified figures from TradingView COT report
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

              {/* Asset Manager Inputs */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="font-military font-bold text-slate-200 uppercase">
                  Asset Manager / Institutional
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Long Contracts</label>
                    <input
                      type="number"
                      value={editForm.assetManagerLong}
                      onChange={(e) => setEditForm({ ...editForm, assetManagerLong: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Short Contracts</label>
                    <input
                      type="number"
                      value={editForm.assetManagerShort}
                      onChange={(e) => setEditForm({ ...editForm, assetManagerShort: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Leveraged Funds Inputs */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="font-military font-bold text-slate-200 uppercase">
                  Leveraged Funds (Hedge Funds)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Long Contracts</label>
                    <input
                      type="number"
                      value={editForm.leveragedFundsLong}
                      onChange={(e) => setEditForm({ ...editForm, leveragedFundsLong: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Short Contracts</label>
                    <input
                      type="number"
                      value={editForm.leveragedFundsShort}
                      onChange={(e) => setEditForm({ ...editForm, leveragedFundsShort: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Open Interest & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Total Open Interest</label>
                  <input
                    type="number"
                    value={editForm.openInterest}
                    onChange={(e) => setEditForm({ ...editForm, openInterest: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Report Date</label>
                  <input
                    type="date"
                    value={editForm.reportDate}
                    onChange={(e) => setEditForm({ ...editForm, reportDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
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
