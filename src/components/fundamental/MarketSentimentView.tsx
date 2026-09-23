import React, { useMemo, useState } from 'react';
import { RetailPositioningRecord, RetailSentimentAsset } from '../../types/fundamentalIndicatorTypes';
import { CURRENCIES } from '../../data/fundamentalRegistryData';
import { calculateRetailContrarianScore } from '../../utils/fundamentalCalculationEngine';
import { Users, Save, RotateCcw } from 'lucide-react';

interface MarketSentimentViewProps {
  retailPositioning?: RetailPositioningRecord[];
  onUpdateRetailPositioning?: (records: RetailPositioningRecord[]) => void;
}

const ASSETS: Array<{ asset: RetailSentimentAsset; label: string; flag?: string }> = [
  ...CURRENCIES.map((c) => ({ asset: c.code as RetailSentimentAsset, label: c.name, flag: c.flag })),
  { asset: 'GOLD', label: 'Gold (XAU)', flag: '🥇' },
  { asset: 'SILVER', label: 'Silver (XAG)', flag: '🥈' },
  { asset: 'CRUDE_OIL', label: 'Crude Oil (WTI)', flag: '🛢️' },
];

const blankRecord = (asset: RetailSentimentAsset): RetailPositioningRecord => ({
  asset,
  longPercent: 0,
  shortPercent: 0,
  updatedAt: '',
  isEntered: false,
});

export const MarketSentimentView: React.FC<MarketSentimentViewProps> = ({
  retailPositioning = [],
  onUpdateRetailPositioning,
}) => {
  const [drafts, setDrafts] = useState<Record<string, { long: string; short: string }>>({});
  const [error, setError] = useState<string>('');

  const rows = useMemo(
    () => ASSETS.map((meta) => ({ ...meta, record: retailPositioning.find((r) => r.asset === meta.asset) ?? blankRecord(meta.asset) })),
    [retailPositioning]
  );

  const getDraft = (asset: RetailSentimentAsset, record: RetailPositioningRecord) =>
    drafts[asset] ?? { long: record.isEntered === false ? '' : String(record.longPercent), short: record.isEntered === false ? '' : String(record.shortPercent) };

  const saveAll = () => {
    setError('');
    const next: RetailPositioningRecord[] = [];

    for (const row of rows) {
      const d = getDraft(row.asset, row.record);
      const long = Number(d.long);
      const short = Number(d.short);
      if (!Number.isFinite(long) || !Number.isFinite(short) || long < 0 || long > 100 || short < 0 || short > 100) {
        setError(`${row.asset}: Long and Short must each be between 0 and 100%.`);
        return;
      }
      if (long + short <= 0) {
        setError(`${row.asset}: enter at least one Long or Short percentage above 0%.`);
        return;
      }
      next.push({ asset: row.asset, longPercent: Number(long.toFixed(1)), shortPercent: Number(short.toFixed(1)), updatedAt: new Date().toISOString(), isEntered: true });
    }

    onUpdateRetailPositioning?.(next);
  };

  const clearAll = () => {
    setDrafts({});
    onUpdateRetailPositioning?.(ASSETS.map((row) => blankRecord(row.asset)));
    setError('');
  };

  const retailLabel = (record: RetailPositioningRecord) => {
    if (record.isEntered === false) return 'INPUT REQUIRED';
    if (record.longPercent === record.shortPercent) return 'NEUTRAL';
    return record.longPercent > record.shortPercent ? 'BEARISH (CONTRARIAN)' : 'BULLISH (CONTRARIAN)';
  };

  const retailSide = (record: RetailPositioningRecord) => {
    if (record.isEntered === false) return '—';
    return record.longPercent > record.shortPercent ? 'RETAIL LONG' : record.shortPercent > record.longPercent ? 'RETAIL SHORT' : 'BALANCED';
  };

  return (
    <div className="space-y-5">
      <section className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">Retail Sentiment — 11 Assets</h2>
              <p className="text-[10px] font-mono-code text-slate-500 mt-1">Enter only the Long % and Short %. The higher percentage shows what retail is thinking. The model then reads that retail positioning contrarianly: retail Long-heavy produces bearish model sentiment, while retail Short-heavy produces bullish model sentiment. The percentage gap is fed into the weighted sentiment indicator and downstream scoring.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={clearAll} className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-military font-bold hover:border-amber-400"><RotateCcw className="inline w-3 h-3 mr-1" />CLEAR</button>
            <button type="button" onClick={saveAll} className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 text-[10px] font-military font-bold hover:bg-cyan-300"><Save className="inline w-3 h-3 mr-1" />SAVE ALL 11</button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[10px] font-mono-code text-rose-300">{error}</div>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="p-3">Asset</th>
                <th className="p-3 text-center">Long %</th>
                <th className="p-3 text-center">Short %</th>
                <th className="p-3 text-center">Retail Side</th>
                <th className="p-3 text-center">Retail Sentiment</th>
                <th className="p-3 text-center">Contrarian Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((row) => {
                const d = getDraft(row.asset, row.record);
                const draftLong = Number(d.long);
                const draftShort = Number(d.short);
                const hasDraft = Number.isFinite(draftLong) && Number.isFinite(draftShort) && draftLong >= 0 && draftShort >= 0 && (draftLong + draftShort) > 0;
                const displayRecord = hasDraft
                  ? { ...row.record, longPercent: draftLong, shortPercent: draftShort, isEntered: true }
                  : row.record;
                const entered = hasDraft || row.record.isEntered !== false;
                const score = entered ? calculateRetailContrarianScore(displayRecord) : null;
                return (
                  <tr key={row.asset} className="bg-slate-950/40 hover:bg-slate-900/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{row.flag}</span>
                        <div><div className="font-military font-bold text-slate-100">{row.asset}</div><div className="text-[9px] text-slate-500">{row.label}</div></div>
                      </div>
                    </td>
                    <td className="p-2">
                      <input aria-label={row.asset + ' long percentage'} inputMode="decimal" type="number" min="0" max="100" step="0.1" value={d.long} onChange={(e) => setDrafts((p) => ({ ...p, [row.asset]: { ...getDraft(row.asset, row.record), long: e.target.value } }))} placeholder="e.g. 70" className="w-28 mx-auto block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-slate-100 focus:border-cyan-400 focus:outline-none" />
                    </td>
                    <td className="p-2">
                      <input aria-label={row.asset + ' short percentage'} inputMode="decimal" type="number" min="0" max="100" step="0.1" value={d.short} onChange={(e) => setDrafts((p) => ({ ...p, [row.asset]: { ...getDraft(row.asset, row.record), short: e.target.value } }))} placeholder="e.g. 30" className="w-28 mx-auto block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-slate-100 focus:border-cyan-400 focus:outline-none" />
                    </td>
                    <td className="p-3 text-center font-bold text-slate-300">{retailSide(displayRecord)}</td>
                    <td className="p-3 text-center">
                      <span className={score === null ? 'text-amber-300' : score > 0 ? 'text-emerald-300' : score < 0 ? 'text-rose-300' : 'text-slate-300'}>{retailLabel(displayRecord)}</span>
                    </td>
                    <td className="p-3 text-center font-military font-bold">{score === null ? '—' : score > 0 ? '+' + score : score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
        <div className="text-[10px] font-mono-code text-slate-400">
          <span className="text-slate-200 font-bold">Calculation:</span> The higher Long/Short percentage is the observed retail side. The model does not copy that view: it uses the opposite direction as the contrarian model signal, with the raw percentage gap as the score. That score is used by the weighted Retail Sentiment category and pair/asset calculations. This is a configurable model rule, not a guarantee of future price direction.
        </div>
      </section>
    </div>
  );
};
