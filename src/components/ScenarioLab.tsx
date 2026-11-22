import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play, Plus, X, ArrowRight, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface Preset { id: string; title: string; plain: string; shocks: Array<{ asset: string; pillar: string; delta: number }> }
interface Target { symbol: string; name: string; assetClass: string; score: number; pillars: Array<{ id: string; name: string; score: number }> }
interface Change { symbol: string; display?: string; name?: string; assetClass: string; before: number; after: number; delta: number; flipped: boolean; why: string; sideBefore?: string; sideAfter?: string }
interface Result {
  title: string; generatedAt: string; method: string;
  applied: Array<{ asset: string; assetName: string; pillarName: string; delta: number; before: number; after: number }>;
  skipped: Array<{ asset: string; pillar: string; reason: string }>;
  assets: Change[]; pairs: Change[]; flips: { toBullish: Change[]; toBearish: Change[] };
}
const sgn = (v: number) => `${v > 0 ? '+' : ''}${v}`;
const word = (s?: string) => (s === 'bullish' ? 'Bullish' : s === 'bearish' ? 'Bearish' : 'Neutral');

const Row: React.FC<{ c: Change }> = ({ c }) => {
  const up = c.delta > 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="font-bold text-[13px] text-white">{c.display || c.name || c.symbol}</span>{c.flipped && <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${c.sideAfter === 'bullish' ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'}`}>flips {word(c.sideBefore)} → {word(c.sideAfter)}</span>}</div>
        <div className="text-[11px] text-slate-400 truncate">{c.why}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono-code text-[11.5px] text-slate-300">{sgn(c.before)} <ArrowRight className="inline w-3 h-3 text-slate-500" /> {sgn(c.after)}</div>
        <div className={`font-mono-code text-[12px] font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{up ? <TrendingUp className="inline w-3 h-3 mr-0.5" /> : <TrendingDown className="inline w-3 h-3 mr-0.5" />}{sgn(c.delta)}</div>
      </div>
    </div>
  );
};

export const ScenarioLab: React.FC = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [custom, setCustom] = useState<Array<{ asset: string; pillar: string; delta: number }>>([]);
  const [asset, setAsset] = useState('USD'); const [pillar, setPillar] = useState('monetary'); const [delta, setDelta] = useState(-30);
  const [active, setActive] = useState('');

  useEffect(() => {
    fetch('/api/macro/scenario/presets').then((r) => r.json()).then((j) => { if (j?.ok) { setPresets(j.data.presets); setTargets(j.data.targets); } else setErr('The scenario engine is not available right now.'); }).catch(() => setErr('Could not reach the server.'));
  }, []);
  const tgt = useMemo(() => targets.find((t) => t.symbol === asset), [targets, asset]);
  useEffect(() => { if (tgt && !tgt.pillars.some((p) => p.id === pillar)) setPillar(tgt.pillars[0]?.id || ''); }, [tgt, pillar]);

  const run = async (body: object, tag: string) => {
    setBusy(true); setErr(''); setActive(tag);
    try {
      const j = await fetch('/api/macro/scenario/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
      if (j?.ok) setRes(j.data); else setErr(j?.error || 'The scenario could not be run.');
    } catch { setErr('Could not reach the server.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4" data-testid="scenario-lab">
      <div className="aurora-tilt relative rounded-3xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 via-slate-950 to-slate-950 p-5">
        <div className="flex items-center gap-3"><span className="grid place-items-center w-11 h-11 rounded-2xl bg-fuchsia-500 text-slate-950"><FlaskConical className="w-5 h-5" /></span>
          <div><div className="font-military font-bold text-lg text-white tracking-wide">Scenario Lab</div><div className="text-[12px] text-slate-400">Pick a “what if” and see which markets would flip — using today’s real data.</div></div></div>
        <div className="mt-3 flex items-start gap-2 text-[11.5px] text-slate-300 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5"><Info className="w-3.5 h-3.5 mt-0.5 text-fuchsia-300 shrink-0" /><span>This is not a forecast and has no made-up probabilities. It takes the live fundamental scores, applies the shock <b>you</b> choose (the size is an assumption), and re-scores everything with the same engine and weights.</span></div>
      </div>

      {err && <div className="text-[12px] text-rose-300 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {presets.map((p) => (
          <button key={p.id} type="button" disabled={busy} onClick={() => void run({ presetId: p.id }, p.id)} data-testid={`scenario-${p.id}`}
            className={`text-left rounded-2xl border p-3 cursor-pointer transition-colors ${active === p.id ? 'border-fuchsia-400/70 bg-fuchsia-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}`}>
            <div className="font-bold text-[13px] text-white">{p.title}</div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">{p.plain}</div>
          </button>
        ))}
        {!presets.length && !err && <div className="text-[12px] text-slate-500">Loading scenarios…</div>}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2.5">
        <div className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Build your own</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-slate-400">Market<select value={asset} onChange={(e) => setAsset(e.target.value)} className="block mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[12.5px] text-white">{targets.map((t) => <option key={t.symbol} value={t.symbol}>{t.name} ({t.symbol})</option>)}</select></label>
          <label className="text-[11px] text-slate-400">Driver<select value={pillar} onChange={(e) => setPillar(e.target.value)} className="block mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[12.5px] text-white">{(tgt?.pillars || []).map((p) => <option key={p.id} value={p.id}>{p.name} (now {sgn(p.score)})</option>)}</select></label>
          <label className="text-[11px] text-slate-400 flex-1 min-w-[160px]">Shock: <b className={delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{sgn(delta)} points</b><input type="range" min={-60} max={60} step={5} value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="block w-full mt-1.5" /></label>
          <button type="button" disabled={!pillar} onClick={() => setCustom((c) => [...c, { asset, pillar, delta }].slice(0, 10))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-600 text-[12px] font-semibold text-slate-200 hover:text-white cursor-pointer"><Plus className="w-3.5 h-3.5" />Add</button>
        </div>
        {custom.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{custom.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11.5px] text-slate-200">{c.asset} · {targets.find((t) => t.symbol === c.asset)?.pillars.find((p) => p.id === c.pillar)?.name || c.pillar} <b className={c.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{sgn(c.delta)}</b>
              <button type="button" onClick={() => setCustom((x) => x.filter((_, j) => j !== i))} aria-label="Remove" className="text-slate-500 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button></span>))}
            <button type="button" disabled={busy} onClick={() => void run({ shocks: custom }, 'custom')} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-fuchsia-500 text-slate-950 text-[12px] font-black cursor-pointer"><Play className="w-3.5 h-3.5" />Run scenario</button></div>
        )}
      </div>

      {busy && <div className="text-[12px] text-slate-400">Re-scoring every market…</div>}
      {res && !busy && (
        <div className="space-y-3" data-testid="scenario-result">
          <div className="rounded-2xl border border-fuchsia-400/30 bg-slate-950 p-3.5">
            <div className="font-military font-bold text-white">{res.title}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">{res.applied.map((a, i) => <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200">{a.assetName} · {a.pillarName}: {sgn(a.before)} → {sgn(a.after)}</span>)}</div>
            {res.skipped.length > 0 && <div className="mt-1.5 text-[11px] text-amber-300">Not applied (no live data for it): {res.skipped.map((s) => `${s.asset}/${s.pillar}`).join(', ')}</div>}
            <div className="mt-2 text-[12.5px] text-slate-200"><b className="text-emerald-300">{res.flips.toBullish.length}</b> pair{res.flips.toBullish.length === 1 ? '' : 's'} would flip bullish · <b className="text-rose-300">{res.flips.toBearish.length}</b> would flip bearish · {res.pairs.length} pairs move in total.</div>
          </div>
          {(res.flips.toBullish.length > 0 || res.flips.toBearish.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-widest font-bold text-emerald-300">Flip to bullish</div>{res.flips.toBullish.map((c) => <Row key={c.symbol} c={c} />)}{!res.flips.toBullish.length && <div className="text-[11.5px] text-slate-500">None</div>}</div>
              <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-widest font-bold text-rose-300">Flip to bearish</div>{res.flips.toBearish.map((c) => <Row key={c.symbol} c={c} />)}{!res.flips.toBearish.length && <div className="text-[11.5px] text-slate-500">None</div>}</div>
            </div>
          )}
          <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Biggest pair moves</div>{res.pairs.slice(0, 12).map((c) => <Row key={c.symbol} c={c} />)}{!res.pairs.length && <div className="text-[12px] text-slate-500">This shock does not move any pair.</div>}</div>
          {res.assets.length > 0 && <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Single assets that move</div>{res.assets.slice(0, 10).map((c) => <Row key={c.symbol} c={c} />)}</div>}
          <div className="text-[10.5px] text-slate-500">{res.method} Scores run from −100 (most bearish) to +100 (most bullish). Data as of {new Date(res.generatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} PKT.</div>
        </div>
      )}
    </div>
  );
};
