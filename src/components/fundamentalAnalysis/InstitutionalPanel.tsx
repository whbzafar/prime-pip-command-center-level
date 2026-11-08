import React from 'react';
import { Building2, ExternalLink, AlertTriangle } from 'lucide-react';
import { fmtPkt, timeAgo } from './ui';

interface Group {
  long: number; short: number; net: number; netChange: number; longChange: number; shortChange: number; longPct: number; netPctOi: number;
  cotIndex26w: number | null; cotIndex52w: number | null; cotIndex3y: number | null; netChange4w: number | null; zScore52w: number | null;
}
export interface InstitutionalData {
  available: boolean;
  reason?: string;
  market?: string; code?: string; reportDate?: string; releasedAt?: string; nextReleaseAt?: string;
  openInterest?: number; openInterestChange?: number; openInterestChangePct?: number;
  speculators?: Group; commercials?: Group; smallTraders?: { long: number; short: number; net: number; longPct: number } | null;
  extremes?: string[]; interpretation?: string; history?: Array<{ date: string; specNet: number; commNet: number; oi: number }>; weeks?: number; sourceUrl?: string;
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('en-US'));
const s = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('en-US')}`);
const tone = (v: number | null | undefined) => (v === null || v === undefined ? 'text-slate-400' : v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-slate-300');

const IndexBar: React.FC<{ v: number | null; label: string }> = ({ v, label }) => (
  <div>
    <div className="flex justify-between text-[9.5px] font-mono-code text-slate-500"><span>{label}</span><span className="text-slate-200 font-bold">{v === null ? '—' : v}</span></div>
    <div className="relative h-1.5 rounded-full bg-gradient-to-r from-rose-500/50 via-slate-600/50 to-emerald-500/50 mt-1">
      {v !== null && <div className="absolute -top-0.5 w-1 h-2.5 rounded bg-white shadow" style={{ left: `calc(${v}% - 2px)` }} />}
    </div>
  </div>
);

const Spark: React.FC<{ data: NonNullable<InstitutionalData['history']> }> = ({ data }) => {
  if (data.length < 3) return null;
  const W = 520, H = 120, P = 6;
  const vals = data.flatMap((d) => [d.specNet, d.commNet, 0]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
  const y = (v: number) => (max === min ? H / 2 : P + (1 - (v - min) / (max - min)) * (H - 2 * P));
  const path = (k: 'specNet' | 'commNet') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" role="img" aria-label="52-week net positioning history">
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="#475569" strokeDasharray="3 3" strokeWidth="1" />
      <path d={path('commNet')} fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.85" />
      <path d={path('specNet')} fill="none" stroke="#22d3ee" strokeWidth="2" />
      <text x={P} y={H - 2} fontSize="9" fill="#64748b">{data[0].date}</text>
      <text x={W - P} y={H - 2} fontSize="9" fill="#64748b" textAnchor="end">{data[data.length - 1].date}</text>
    </svg>
  );
};

export const InstitutionalPanel: React.FC<{ data: InstitutionalData | null | undefined; assetName: string }> = ({ data, assetName }) => {
  if (!data) return null;
  if (!data.available) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex items-start gap-3">
        <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
        <div>
          <div className="text-[11px] font-mono-code uppercase tracking-widest text-slate-400">Institutional Positions — {assetName}</div>
          <p className="text-[12px] text-slate-400 mt-1">{data.reason}</p>
        </div>
      </div>
    );
  }
  const sp = data.speculators!, cm = data.commercials!;
  const rows: Array<{ label: string; sub: string; g: Group | null; small?: InstitutionalData['smallTraders'] }> = [
    { label: 'Large Speculators', sub: 'Hedge funds, CTAs, asset managers (non-commercial)', g: sp },
    { label: 'Commercial Hedgers', sub: 'Banks, producers, corporates (commercial)', g: cm },
    { label: 'Small Traders', sub: 'Below CFTC reporting thresholds', g: null, small: data.smallTraders },
  ];
  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/5 via-slate-950 to-slate-950 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 className="w-4 h-4 text-cyan-300" />
        <span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">Institutional Positions · CFTC COT</span>
        <span className="text-[11px] text-slate-300">{data.market}</span>
        <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-mono-code text-cyan-400 hover:text-cyan-300">
          CFTC data <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="text-[10.5px] font-mono-code text-slate-500">
        Positions as of Tue {data.reportDate} · released {data.releasedAt ? fmtPkt(data.releasedAt) : '—'} ({timeAgo(data.releasedAt)}) · next release {data.nextReleaseAt ? fmtPkt(data.nextReleaseAt) : '—'} · {data.weeks} weeks of history
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <div className="text-[9.5px] font-mono-code uppercase text-slate-500">Speculators net</div>
          <div className={`font-mono-code text-lg font-bold ${tone(sp.net)}`}>{s(sp.net)}</div>
          <div className={`text-[10.5px] font-mono-code ${tone(sp.netChange)}`}>{s(sp.netChange)} this week</div>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <div className="text-[9.5px] font-mono-code uppercase text-slate-500">Speculators long / short</div>
          <div className="font-mono-code text-lg font-bold text-slate-100">{sp.longPct}% <span className="text-slate-500 text-sm">/ {(100 - sp.longPct).toFixed(1)}%</span></div>
          <div className="h-1.5 rounded-full bg-rose-500/60 mt-1.5 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${sp.longPct}%` }} /></div>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 space-y-1.5">
          <div className="text-[9.5px] font-mono-code uppercase text-slate-500">COT Index (speculators)</div>
          <IndexBar v={sp.cotIndex26w} label="26 weeks" />
          <IndexBar v={sp.cotIndex52w} label="52 weeks" />
          <IndexBar v={sp.cotIndex3y} label="3 years" />
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <div className="text-[9.5px] font-mono-code uppercase text-slate-500">Open interest</div>
          <div className="font-mono-code text-lg font-bold text-slate-100">{n(data.openInterest)}</div>
          <div className={`text-[10.5px] font-mono-code ${tone(data.openInterestChange)}`}>{s(data.openInterestChange)} ({data.openInterestChangePct}%)</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-[11.5px] font-mono-code">
          <thead className="bg-slate-900/80 text-[9.5px] uppercase text-slate-500">
            <tr>{['Group', 'Long', 'Short', 'Net', 'Week Δ net', 'Δ long / Δ short', '% Long', 'Net % OI', '4-week Δ', 'COT Idx 52w', 'z (52w)'].map((h) => <th key={h} className="px-2.5 py-2 text-left font-normal whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-slate-800/80">
                <td className="px-2.5 py-2"><div className="text-slate-100 font-semibold">{r.label}</div><div className="text-[9.5px] text-slate-500 font-sans">{r.sub}</div></td>
                {r.g ? (
                  <>
                    <td className="px-2.5 py-2 text-slate-300">{n(r.g.long)}</td>
                    <td className="px-2.5 py-2 text-slate-300">{n(r.g.short)}</td>
                    <td className={`px-2.5 py-2 font-bold ${tone(r.g.net)}`}>{s(r.g.net)}</td>
                    <td className={`px-2.5 py-2 ${tone(r.g.netChange)}`}>{s(r.g.netChange)}</td>
                    <td className="px-2.5 py-2 text-slate-400 whitespace-nowrap">{s(r.g.longChange)} / {s(r.g.shortChange)}</td>
                    <td className="px-2.5 py-2 text-slate-300">{r.g.longPct}%</td>
                    <td className={`px-2.5 py-2 ${tone(r.g.netPctOi)}`}>{r.g.netPctOi}%</td>
                    <td className={`px-2.5 py-2 ${tone(r.g.netChange4w)}`}>{s(r.g.netChange4w)}</td>
                    <td className="px-2.5 py-2 text-slate-200">{r.g.cotIndex52w ?? '—'}</td>
                    <td className="px-2.5 py-2 text-slate-300">{r.g.zScore52w ?? '—'}</td>
                  </>
                ) : r.small ? (
                  <>
                    <td className="px-2.5 py-2 text-slate-300">{n(r.small.long)}</td>
                    <td className="px-2.5 py-2 text-slate-300">{n(r.small.short)}</td>
                    <td className={`px-2.5 py-2 font-bold ${tone(r.small.net)}`}>{s(r.small.net)}</td>
                    <td className="px-2.5 py-2 text-slate-600" colSpan={2}>—</td>
                    <td className="px-2.5 py-2 text-slate-300">{r.small.longPct}%</td>
                    <td className="px-2.5 py-2 text-slate-600" colSpan={4}>—</td>
                  </>
                ) : <td className="px-2.5 py-2 text-slate-600" colSpan={10}>Not reported</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.history && data.history.length > 2 && (
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3">
          <div className="flex items-center gap-4 text-[10px] font-mono-code text-slate-400 mb-1">
            <span>52-week net positioning</span>
            <span className="text-cyan-300">━ Speculators</span>
            <span className="text-amber-400">━ Commercial hedgers</span>
          </div>
          <Spark data={data.history} />
        </div>
      )}

      {data.extremes && data.extremes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.extremes.map((e) => (
            <span key={e} className="inline-flex items-center gap-1.5 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1">
              <AlertTriangle className="w-3 h-3" /> {e}
            </span>
          ))}
        </div>
      )}
      <p className="text-[12px] text-slate-300 leading-relaxed">{data.interpretation}</p>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        COT Index = where the current net position sits between its lowest (0) and highest (100) level over the window. Speculators tend to follow trends; readings near 0 or 100 mean
        crowded positioning that often precedes reversals. Hedgers usually trade against the trend, so their extremes are read the opposite way.
      </p>
    </div>
  );
};
