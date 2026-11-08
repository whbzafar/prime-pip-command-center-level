import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import type { AssetResult, IndicatorResult, PillarResult } from './types';
import { InstitutionalPanel, type InstitutionalData } from './InstitutionalPanel';
import { BiasPill, BullBearBar, CenterBar, Gauge, StatusDot, fmtNum, fmtPkt, fmtScore, scoreColor, timeAgo } from './ui';

const IndicatorRow: React.FC<{ ind: IndicatorResult }> = ({ ind }) => {
  const [open, setOpen] = useState(false);
  const o = ind.observation;
  const missing = ind.status === 'missing';
  return (
    <div className={`rounded-xl border ${open ? 'border-slate-700 bg-slate-900/80' : 'border-slate-800/70 bg-slate-900/40'} transition-colors`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left px-3 py-2.5 flex items-center gap-3 cursor-pointer" aria-expanded={open}>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <StatusDot status={ind.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[12.5px] font-semibold truncate ${missing ? 'text-slate-500' : 'text-slate-100'}`}>{ind.name}</span>
            <span className="text-[9px] font-mono-code text-slate-500 uppercase hidden sm:inline">{ind.frequency}</span>
          </div>
          {o && !missing && (
            <div className="text-[10.5px] font-mono-code text-slate-400 mt-0.5 flex flex-wrap gap-x-3">
              <span>A <b className="text-slate-200">{fmtNum(o.actual, o.unit)}</b></span>
              <span>F {fmtNum(o.forecast, o.unit)}</span>
              <span>P {fmtNum(o.previous, o.unit)}</span>
              <span className="text-slate-500">{o.period ? `${o.period} · ` : ''}{timeAgo(o.releasedAt)}</span>
            </div>
          )}
          {missing && <div className="text-[10.5px] font-mono-code text-slate-600 mt-0.5">No live data — excluded from score</div>}
        </div>
        <div className="w-24 hidden sm:block"><CenterBar score={ind.score} /></div>
        <span className={`w-14 text-right font-mono-code text-sm font-bold ${scoreColor(ind.score)}`}>{fmtScore(ind.score)}</span>
      </button>
      {open && (
        <div className="px-4 pb-3.5 pt-0.5 space-y-2.5 text-[12px] text-slate-300 border-t border-slate-800/80">
          <p className="text-slate-400 leading-relaxed pt-2.5">{ind.description}</p>
          <p className="leading-relaxed"><span className="text-cyan-300 font-semibold">Why this score: </span>{ind.reasoning}</p>
          {ind.components.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-2">
              {ind.components.map((c) => (
                <div key={c.key + c.label} className="rounded-lg bg-slate-950/70 border border-slate-800 p-2">
                  <div className="text-[9.5px] font-mono-code uppercase text-slate-500">{c.label} · weight {Math.round(c.weight * 100)}%</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{c.detail}</div>
                  <div className="mt-1.5"><CenterBar score={c.value * 100} /></div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-mono-code text-slate-500">
            <span>{ind.polarityNote}</span>
            {o && <span>Released {fmtPkt(o.releasedAt)}</span>}
            <span>Weight {ind.weight}{ind.effectiveWeight > 0 && ind.effectiveWeight < ind.weight ? ` → ${ind.effectiveWeight.toFixed(2)} (aged)` : ''}</span>
            {o && (
              <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                {o.sourceTitle ? `${o.sourceTitle} — ` : ''}{o.sourceName} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PillarBlock: React.FC<{ p: PillarResult; totalWeight: number; mirror?: AssetResult; defaultOpen?: boolean }> = ({ p, totalWeight, mirror, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const share = Math.round((p.weight / totalWeight) * 100);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left p-3.5 flex items-center gap-3 cursor-pointer hover:bg-slate-900/50" aria-expanded={open}>
        {open ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-military font-bold text-sm text-slate-100 tracking-wide">{p.name}</span>
            <span className="text-[9.5px] font-mono-code px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{share}% of score</span>
            {p.indicators && p.indicators.length > 0 && (
              <span className="text-[9.5px] font-mono-code text-slate-500">
                {p.indicators.filter((i) => i.score !== null).length}/{p.indicators.length} live · coverage {Math.round(p.coverage * 100)}%
              </span>
            )}
          </div>
          <div className="mt-2 max-w-md"><BullBearBar bullishPct={p.bullishPct} height="h-1.5" /></div>
        </div>
        <div className="text-right">
          <div className={`font-mono-code text-lg font-bold ${scoreColor(p.score)}`}>{fmtScore(p.score)}</div>
          <div className="text-[10px] font-mono-code text-slate-500">{p.bullishPct === null ? '—' : `${p.bullishPct.toFixed(0)}% bull`}</div>
        </div>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2">
          {p.description && <p className="text-[11.5px] text-slate-400 px-1">{p.description}</p>}
          {p.reasoning && <p className="text-[11.5px] text-slate-300 px-1"><span className="text-cyan-300 font-semibold">Pillar: </span>{p.reasoning}</p>}
          {p.indicators && p.indicators.length > 0
            ? [...p.indicators].sort((a, b) => (b.score === null ? -1 : 0) - (a.score === null ? -1 : 0) || b.weight - a.weight).map((i) => <IndicatorRow key={i.id} ind={i} />)
            : mirror && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-[11px] font-mono-code text-slate-400 mb-2">{mirror.name} pillars (open the {mirror.symbol} card for full detail)</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {mirror.pillars.map((mp) => (
                    <div key={mp.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="text-slate-300 truncate">{mp.name}</span>
                      <span className={`font-mono-code font-bold ${scoreColor(mp.score)}`}>{fmtScore(mp.score)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export const AssetDetail: React.FC<{ asset: AssetResult; mirrors?: Record<string, AssetResult>; compact?: boolean; title?: string; institutional?: InstitutionalData | null }> = ({ asset, mirrors = {} as Record<string, AssetResult>, compact, title, institutional }) => {
  const total = asset.pillars.reduce((s, p) => s + p.weight, 0) || 1;
  const mirrorFor = (p: PillarResult) => (p.id === 'usd' ? mirrors.USD : p.id === 'yen' ? mirrors.JPY : p.id === 'macro' ? mirrors.US500 : undefined);
  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-5 ${compact ? '' : 'sm:p-6'}`}>
        {title && <div className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400 mb-2">{title}</div>}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex flex-col items-center">
            <Gauge score={asset.score} size={compact ? 120 : 150} />
            <div className={`-mt-1 font-mono-code text-2xl font-bold ${scoreColor(asset.score)}`}>{fmtScore(asset.score)}</div>
          </div>
          <div className="flex-1 min-w-[220px] space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-military text-xl font-bold text-white tracking-wide">{asset.name}</h2>
              <span className="text-[11px] font-mono-code text-slate-500">{asset.symbol}</span>
              <BiasPill bias={asset.bias} score={asset.score} />
            </div>
            <div className="flex items-center gap-3 text-[12px] font-mono-code">
              <span className="text-emerald-400 font-bold">{asset.bullishPct === null ? '—' : `${asset.bullishPct.toFixed(1)}% Bullish`}</span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-bold">{asset.bearishPct === null ? '—' : `${asset.bearishPct.toFixed(1)}% Bearish`}</span>
            </div>
            <BullBearBar bullishPct={asset.bullishPct} height="h-2.5" />
            <p className="text-[12.5px] text-slate-300 leading-relaxed">{asset.summary}</p>
            <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-mono-code text-slate-500">
              <span className="inline-flex items-center gap-1" title="Share of the model's indicator weight backed by live, fresh data">
                <Info className="w-3 h-3" /> Data confidence {asset.confidence}%
              </span>
              <span>Updated {timeAgo(asset.updatedAt)}</span>
            </div>
            {asset.confidence < 50 && asset.score !== null && (
              <div className="flex items-start gap-2 text-[11px] text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Less than half of this model's inputs currently have live data — treat this reading as provisional.
              </div>
            )}
          </div>
        </div>
        {asset.topDrivers.length > 0 && (
          <div className={`mt-4 grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
            {asset.topDrivers.slice(0, 3).map((d) => (
              <div key={d.name + d.pillar} className="rounded-xl bg-slate-900/70 border border-slate-800 px-3 py-2">
                <div className="text-[9.5px] font-mono-code uppercase text-slate-500 truncate">{d.pillar}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-slate-200 truncate">{d.name}</span>
                  <span className={`font-mono-code text-[12px] font-bold ${scoreColor(d.impact * 3)}`}>{d.impact > 0 ? '+' : ''}{d.impact.toFixed(1)} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <InstitutionalPanel data={institutional} assetName={asset.name} />
      <div className="space-y-2.5">
        {asset.pillars.map((p, i) => <PillarBlock key={p.id} p={p} totalWeight={total} mirror={mirrorFor(p)} defaultOpen={!compact && i === 0} />)}
      </div>
    </div>
  );
};
