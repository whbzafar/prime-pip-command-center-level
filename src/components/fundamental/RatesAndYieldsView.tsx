import React, { useState } from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  InterestRateRecord,
} from '../../types/fundamentalIndicatorTypes';
import { DEFAULT_INTEREST_RATES } from '../../data/defaultFundamentalObservations';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import {
  Compass,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  X,
} from 'lucide-react';

interface RatesAndYieldsViewProps {
  currencyScores?: Record<CurrencyCode, CurrencyScoreResult>;
  onSelectCurrency?: (curr: CurrencyCode) => void;
  interestRates?: InterestRateRecord[];
  onUpdateInterestRate?: (updated: InterestRateRecord) => void;
}

export const RatesAndYieldsView: React.FC<RatesAndYieldsViewProps> = ({
  currencyScores,
  onSelectCurrency,
  interestRates,
  onUpdateInterestRate,
}) => {
  const rateRecords = interestRates || DEFAULT_INTEREST_RATES;
  const [editingRecord, setEditingRecord] = useState<InterestRateRecord | null>(null);
  const [rateForm, setRateForm] = useState({
    currentPolicyRate: '',
    previousPolicyRate: '',
    expectedNextRate: '',
    expectedRateChangeBps: '',
    nextMeetingDate: '',
    centralBankBias: 'NEUTRAL' as 'HAWKISH' | 'NEUTRAL' | 'DOVISH',
    balanceSheetDirection: 'NEUTRAL' as 'EXPANDING' | 'NEUTRAL' | 'CONTRACTING_QT',
    yield2Y: '',
    yield5Y: '',
    yield10Y: '',
    realYield10Y: '',
    recentGuidance: '',
  });

  const handleStartEdit = (rec: InterestRateRecord) => {
    setEditingRecord(rec);
    setRateForm({
      currentPolicyRate: String(rec.currentPolicyRate),
      previousPolicyRate: String(rec.previousPolicyRate),
      expectedNextRate: String(rec.expectedNextRate),
      expectedRateChangeBps: String(rec.expectedRateChangeBps),
      nextMeetingDate: rec.nextMeetingDate,
      centralBankBias: rec.centralBankBias,
      balanceSheetDirection: rec.balanceSheetDirection,
      yield2Y: String(rec.yield2Y),
      yield5Y: String(rec.yield5Y),
      yield10Y: String(rec.yield10Y),
      realYield10Y: rec.realYield10Y !== undefined ? String(rec.realYield10Y) : '',
      recentGuidance: rec.recentGuidance || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const currentRate = parseFloat(rateForm.currentPolicyRate);
    if (isNaN(currentRate)) {
      alert('Please enter a valid numeric Current Policy Rate');
      return;
    }

    const prevRate = parseFloat(rateForm.previousPolicyRate);
    const expRate = parseFloat(rateForm.expectedNextRate);
    const y2 = parseFloat(rateForm.yield2Y);
    const y5 = parseFloat(rateForm.yield5Y);
    const y10 = parseFloat(rateForm.yield10Y);
    const realY = rateForm.realYield10Y ? parseFloat(rateForm.realYield10Y) : undefined;
    const bps = rateForm.expectedRateChangeBps
      ? parseFloat(rateForm.expectedRateChangeBps)
      : !isNaN(expRate)
      ? Math.round((expRate - currentRate) * 100)
      : 0;

    const updated: InterestRateRecord = {
      ...editingRecord,
      currentPolicyRate: currentRate,
      previousPolicyRate: isNaN(prevRate) ? editingRecord.previousPolicyRate : prevRate,
      expectedNextRate: isNaN(expRate) ? currentRate : expRate,
      expectedRateChangeBps: bps,
      nextMeetingDate: rateForm.nextMeetingDate || editingRecord.nextMeetingDate,
      centralBankBias: rateForm.centralBankBias,
      balanceSheetDirection: rateForm.balanceSheetDirection,
      yield2Y: isNaN(y2) ? editingRecord.yield2Y : y2,
      yield5Y: isNaN(y5) ? editingRecord.yield5Y : y5,
      yield10Y: isNaN(y10) ? editingRecord.yield10Y : y10,
      realYield10Y: realY !== undefined && !isNaN(realY) ? realY : editingRecord.realYield10Y,
      recentGuidance: rateForm.recentGuidance,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateInterestRate) {
      onUpdateInterestRate(updated);
    }
    setEditingRecord(null);
  };

  // Rate Matrix pairs (Base Rate - Quote Rate)
  const matrixPairs: { base: CurrencyCode; quote: CurrencyCode; pair: string }[] = [
    { base: 'EUR', quote: 'USD', pair: 'EURUSD' },
    { base: 'GBP', quote: 'USD', pair: 'GBPUSD' },
    { base: 'USD', quote: 'JPY', pair: 'USDJPY' },
    { base: 'USD', quote: 'CHF', pair: 'USDCHF' },
    { base: 'USD', quote: 'CAD', pair: 'USDCAD' },
    { base: 'AUD', quote: 'USD', pair: 'AUDUSD' },
    { base: 'NZD', quote: 'USD', pair: 'NZDUSD' },
    { base: 'EUR', quote: 'GBP', pair: 'EURGBP' },
    { base: 'EUR', quote: 'JPY', pair: 'EURJPY' },
    { base: 'GBP', quote: 'JPY', pair: 'GBPJPY' },
    { base: 'AUD', quote: 'JPY', pair: 'AUDJPY' },
    { base: 'CAD', quote: 'JPY', pair: 'CADJPY' },
    { base: 'CHF', quote: 'JPY', quoteRate: 0.25, pair: 'CHFJPY' } as any,
    { base: 'NZD', quote: 'JPY', pair: 'NZDJPY' },
    { base: 'EUR', quote: 'AUD', pair: 'EURAUD' },
    { base: 'EUR', quote: 'CAD', pair: 'EURCAD' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <Compass className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Central Bank Policy Rates & Sovereign Yield Curves
            </h3>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Benchmark Target Rates • 2Y/5Y/10Y Sovereign Yields • Curve Slopes (10Y-2Y Inversion) • Real Yields
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono-code text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>
            Yield differentials represent the primary structural carry anchor for multi-week and multi-month FX trends.
          </span>
        </div>
      </div>

      {/* Central Bank Policy Rates Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-[#0c1222]">
          <h4 className="font-military font-bold text-xs text-slate-100 uppercase tracking-wider">
            G8 Central Bank Benchmark Rates & Forward Guidance
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="p-3">Currency / Central Bank</th>
                <th className="p-3 text-right">Current Rate</th>
                <th className="p-3 text-right">Previous Rate</th>
                <th className="p-3 text-right">Expected Next</th>
                <th className="p-3 text-center">Next Meeting</th>
                <th className="p-3 text-center">Policy Bias</th>
                <th className="p-3 text-center">Balance Sheet</th>
                <th className="p-3 text-center">Official Source</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {rateRecords.map((r) => {
                const meta = CURRENCY_METADATA[r.currency];
                return (
                  <tr key={r.currency} className="hover:bg-slate-900/40 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta?.flag}</span>
                        <div>
                          <span className="font-military font-bold text-xs text-slate-100">
                            {r.currency} — {r.centralBankName}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
                            {r.recentGuidance}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <span className="text-sm font-military font-bold text-cyan-300">
                        {r.currentPolicyRate.toFixed(2)}%
                      </span>
                    </td>

                    <td className="p-3 text-right text-slate-400">
                      {r.previousPolicyRate.toFixed(2)}%
                    </td>

                    <td className="p-3 text-right">
                      <span className="text-slate-200 font-bold">
                        {r.expectedNextRate.toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {r.expectedRateChangeBps > 0 ? `+${r.expectedRateChangeBps} bps` : r.expectedRateChangeBps < 0 ? `${r.expectedRateChangeBps} bps` : 'Hold'}
                      </span>
                    </td>

                    <td className="p-3 text-center text-cyan-300 font-bold">
                      {r.nextMeetingDate}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.centralBankBias === 'HAWKISH'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : r.centralBankBias === 'DOVISH'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {r.centralBankBias}
                      </span>
                    </td>

                    <td className="p-3 text-center text-[10px] text-slate-400">
                      {r.balanceSheetDirection.replace('_', ' ')}
                    </td>

                    <td className="p-3 text-center">
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold transition"
                      >
                        <span>Agency Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(r)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer"
                        title="Edit policy rate and next meeting date"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sovereign Bond Yield Curves */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between">
          <h4 className="font-military font-bold text-xs text-slate-100 uppercase tracking-wider">
            Sovereign Yield Curves & Curve Slope (10Y - 2Y Spread)
          </h4>
          <span className="text-[10px] font-mono-code text-slate-400">
            Negative 10Y-2Y spread indicates inverted yield curve (recession warning)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="p-3">Sovereign Debt Issuer</th>
                <th className="p-3 text-right">2Y Yield</th>
                <th className="p-3 text-right">5Y Yield</th>
                <th className="p-3 text-right">10Y Benchmark</th>
                <th className="p-3 text-right">Real Yield (10Y)</th>
                <th className="p-3 text-right">10Y - 2Y Spread</th>
                <th className="p-3 text-center">Curve Shape</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {rateRecords.map((r) => {
                const meta = CURRENCY_METADATA[r.currency];
                const slope = Number((r.yield10Y - r.yield2Y).toFixed(2));
                const isInverted = slope < 0;

                return (
                  <tr key={r.currency} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-semibold text-slate-200 flex items-center gap-2">
                      <span>{meta?.flag}</span>
                      <span>{r.currency} Sovereign Bonds</span>
                    </td>

                    <td className="p-3 text-right text-slate-300">{r.yield2Y.toFixed(2)}%</td>
                    <td className="p-3 text-right text-slate-300">{r.yield5Y.toFixed(2)}%</td>
                    <td className="p-3 text-right font-military font-bold text-cyan-300">{r.yield10Y.toFixed(2)}%</td>
                    <td className="p-3 text-right text-slate-300">
                      {r.realYield10Y !== undefined ? `${r.realYield10Y.toFixed(2)}%` : '—'}
                    </td>

                    <td className="p-3 text-right">
                      <span
                        className={`font-bold ${
                          isInverted ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {slope > 0 ? `+${slope}%` : `${slope}%`}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isInverted
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isInverted ? 'INVERTED' : 'NORMAL / STEEP'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(r)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer"
                        title="Edit sovereign bond yields"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Currency Policy Rate Differential Matrix */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
        <h4 className="font-military font-bold text-xs text-slate-100 uppercase tracking-wider">
          Cross-Currency Policy Rate Differential Matrix (Base Rate - Quote Rate)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
          {matrixPairs.map((p) => {
            const baseRec = rateRecords.find((r) => r.currency === p.base);
            const quoteRec = rateRecords.find((r) => r.currency === p.quote);
            const diff = Number(((baseRec?.currentPolicyRate || 0) - (quoteRec?.currentPolicyRate || 0)).toFixed(2));

            return (
              <div
                key={p.pair}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-military font-bold text-slate-200">{p.pair}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {p.base} ({baseRec?.currentPolicyRate}%) vs {p.quote} ({quoteRec?.currentPolicyRate}%)
                  </span>
                </div>
                <span
                  className={`font-military font-bold ${
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {diff > 0 ? `+${diff}%` : `${diff}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Central Bank & Yields Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CURRENCY_METADATA[editingRecord.currency]?.flag}</span>
                <div>
                  <h3 className="text-sm font-military font-bold text-slate-100 uppercase">
                    Update Central Bank Policy & Yields: {editingRecord.currency}
                  </h3>
                  <span className="text-xs font-mono-code text-slate-400">
                    {editingRecord.centralBankName} ({editingRecord.centralBankShort})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
              <div>
                <label className="text-slate-400 block mb-1">
                  Current Policy Rate (%) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.currentPolicyRate}
                  onChange={(e) => setRateForm({ ...rateForm, currentPolicyRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Expected Next Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.expectedNextRate}
                  onChange={(e) => setRateForm({ ...rateForm, expectedNextRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Previous Policy Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.previousPolicyRate}
                  onChange={(e) => setRateForm({ ...rateForm, previousPolicyRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Next Meeting Date <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="date"
                  value={rateForm.nextMeetingDate}
                  onChange={(e) => setRateForm({ ...rateForm, nextMeetingDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Expected Change (bps)</label>
                <input
                  type="number"
                  value={rateForm.expectedRateChangeBps}
                  onChange={(e) => setRateForm({ ...rateForm, expectedRateChangeBps: e.target.value })}
                  placeholder="e.g. -25 or 0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Policy Bias</label>
                <select
                  value={rateForm.centralBankBias}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, centralBankBias: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="HAWKISH">HAWKISH</option>
                  <option value="NEUTRAL">NEUTRAL</option>
                  <option value="DOVISH">DOVISH</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">2Y Sovereign Yield (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.yield2Y}
                  onChange={(e) => setRateForm({ ...rateForm, yield2Y: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">5Y Sovereign Yield (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.yield5Y}
                  onChange={(e) => setRateForm({ ...rateForm, yield5Y: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">10Y Benchmark Yield (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.yield10Y}
                  onChange={(e) => setRateForm({ ...rateForm, yield10Y: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Real Yield 10Y (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateForm.realYield10Y}
                  onChange={(e) => setRateForm({ ...rateForm, realYield10Y: e.target.value })}
                  placeholder="e.g. 1.85"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Balance Sheet Action</label>
                <select
                  value={rateForm.balanceSheetDirection}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, balanceSheetDirection: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="EXPANDING">EXPANDING (QE)</option>
                  <option value="NEUTRAL">NEUTRAL</option>
                  <option value="CONTRACTING_QT">CONTRACTING (QT)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-xs font-mono-code">Recent Guidance Notes</label>
              <textarea
                rows={2}
                value={rateForm.recentGuidance}
                onChange={(e) => setRateForm({ ...rateForm, recentGuidance: e.target.value })}
                placeholder="Official forward policy remarks..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono-code text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-military font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs cursor-pointer transition shadow-md"
              >
                Save & Recalculate Spreads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
