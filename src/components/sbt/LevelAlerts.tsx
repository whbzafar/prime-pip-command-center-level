import React from 'react';
import { ArrowDownRight, ArrowUpRight, Crosshair, RefreshCw } from 'lucide-react';
import { fmtPrice, levelTime, pairLevel, useLevelAlerts, type LevelState, type PairScan } from '../../services/sbtSetups';

const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`; };

/** Small "level reached" tag for a pair row; renders nothing when there is no aligned level touch. */
export const LevelBadge: React.FC<{ symbol: string; state?: LevelState; compact?: boolean }> = ({ symbol, state, compact }) => {
  const own = useLevelAlerts();
  const p = pairLevel(state || own, symbol);
  if (!p?.hit) return null;
  const up = p.side > 0;
  return (
    <span title={`${up ? 'Buy' : 'Sell'} Level ${p.hit.level} reached on H1 · close ${fmtPrice(p.hit.price)} · ${levelTime(p.hit.time + 3_600_000)} PKT`}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border animate-pulse ${up ? 'bg-emerald-400/20 border-emerald-300/70 text-emerald-100' : 'bg-rose-400/20 border-rose-300/70 text-rose-100'}`}>
      {up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}{up ? 'BUY' : 'SELL'} L{p.hit.level}{compact ? '' : ' reached'}
    </span>
  );
};

const HitRow: React.FC<{ p: PairScan; onOpen: (s: string) => void }> = ({ p, onOpen }) => {
  const h = p.hit!; const up = p.side > 0;
  const side = up ? 'BUY' : 'SELL';
  return (
    <button type="button" onClick={() => onOpen(p.symbol)} data-testid="level-hit" aria-label={`${side} ${p.display}: ${up ? 'buy' : 'sell'} level ${h.level} reached on the 1-hour chart. Open chart.`}
      className={`w-full text-left rounded-xl border-l-4 border p-3 cursor-pointer transition hover:-translate-y-px ${up ? 'border-emerald-400/50 border-l-emerald-400 bg-gradient-to-r from-emerald-500/[0.14] to-transparent hover:border-emerald-300' : 'border-rose-400/50 border-l-rose-400 bg-gradient-to-r from-rose-500/[0.14] to-transparent hover:border-rose-300'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-black tracking-wide ${up ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'}`}>
          {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}{side}
        </span>
        <span className="text-[15px] font-extrabold text-white tracking-wide">{p.display}</span>
        <span className="text-[11px] font-bold text-amber-200">Level {h.level} reached · H1</span>
        <span className="ml-auto text-[10px] text-slate-400">{ago(h.time + 3_600_000)}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10.5px]">
        <div className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1"><div className="text-slate-500 uppercase tracking-wider text-[9px]">H1 close</div><div className="font-mono-code font-bold text-slate-50">{fmtPrice(h.price)}</div></div>
        <div className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1"><div className="text-slate-500 uppercase tracking-wider text-[9px]">{side.toLowerCase()} zone</div><div className="font-mono-code text-slate-200">{fmtPrice(h.zoneBottom)} – {fmtPrice(h.zoneTop)}</div></div>
        <div className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1"><div className="text-slate-500 uppercase tracking-wider text-[9px]">Model</div><div className="font-semibold text-cyan-200 truncate">{h.models.length ? h.models.join(' + ') : `Level ${h.level}`}</div></div>
      </div>
      <div className="mt-1.5 text-[11px] leading-snug text-slate-300">
        <b className="text-slate-100">Why:</b> {p.display} is a top long-term <b className={up ? 'text-emerald-300' : 'text-rose-300'}>{up ? 'bullish' : 'bearish'}</b> pair (fundamental score {p.score > 0 ? '+' : ''}{p.score.toFixed(0)}), and on the 1-hour chart price has come back to its {up ? 'buy' : 'sell'} Level {h.level} with the model complete. The candle closed {levelTime(h.time + 3_600_000)} PKT.
      </div>
      <div className="mt-1 text-[10px] text-cyan-300 font-semibold">Tap to open the {p.display} chart →</div>
    </button>
  );
};

/** "Market at key levels" — which top fundamental pairs have reached their buy / sell level. */
export const LevelAlertsPanel: React.FC<{ onOpen: (engineSymbol: string) => void; dense?: boolean }> = ({ onOpen, dense }) => {
  const st = useLevelAlerts();
  if (st.status === 'not_configured') return null;
  const hits = st.pairs.filter((p) => p.hit).sort((a, b) => (b.hit!.time - a.hit!.time));
  const watching = st.pairs.filter((p) => !p.hit && p.state === 'ok' && p.watching);
  const loading = st.status !== 'ready';
  const pending = st.pairs.filter((p) => p.state === 'loading').length;
  return (
    <div data-testid="level-alerts" className={`rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.07] via-slate-950 to-slate-950 ${dense ? 'p-2.5' : 'p-4'} space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Crosshair className="w-4 h-4 text-amber-300" />
        <span className="text-[11px] font-mono-code uppercase tracking-[0.16em] text-amber-200 font-bold">Fundamental setups at key levels</span>
        {hits.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold">{hits.filter((p) => p.side > 0).length} buy · {hits.filter((p) => p.side < 0).length} sell</span>}
        <span className="ml-auto text-[10px] text-slate-500 inline-flex items-center gap-1">{(loading || pending > 0) && <RefreshCw className="w-3 h-3 animate-spin" />}{loading ? 'checking the top pairs…' : pending ? `checking ${pending} more…` : `H1 · checked ${levelTime(st.updatedAt)} PKT`}</span>
      </div>
      {!dense && <div className="text-[11px] text-slate-400">The top long-term bullish pairs are checked for their <b className="text-emerald-300">buy</b> levels and the top bearish pairs for their <b className="text-rose-300">sell</b> levels on the 1-hour chart. A pair appears here only when price has reached Level 1 or Level 2 and the H1 candle has closed.</div>}
      {hits.map((p) => <HitRow key={p.symbol} p={p} onOpen={onOpen} />)}
      {!hits.length && !loading && <div className="text-[11.5px] text-slate-400 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">No top pair is at its level right now. You will be notified the moment one gets there.</div>}
      {(() => {
        const live = new Set(hits.map((p) => `${p.symbol}|${p.hit!.time + 3_600_000}`));
        const past = st.alerts.filter((a) => !live.has(`${a.symbol}|${a.time}`)).slice(0, 6);
        return past.length > 0 && (
          <div className="space-y-1" data-testid="level-history">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Earlier setups</div>
            {past.map((a) => (
              <button key={a.id} type="button" onClick={() => onOpen(a.symbol)} className="w-full flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-600 text-[11px] cursor-pointer text-left">
                <span className={`px-1.5 rounded font-black text-[10px] ${a.side > 0 ? 'bg-emerald-400/90 text-emerald-950' : 'bg-rose-400/90 text-rose-950'}`}>{a.side > 0 ? 'BUY' : 'SELL'}</span>
                <span className="font-bold text-slate-100">{a.display}</span>
                <span className="text-slate-400">Level {a.level} · {fmtPrice(a.price)}</span>
                <span className="ml-auto text-[10px] text-slate-500">{levelTime(a.time)} PKT</span>
              </button>
            ))}
          </div>
        );
      })()}
      {watching.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Waiting for price at</span>
          {watching.map((p) => {
            const z = p.level1 || p.level2;
            return (
              <button key={p.symbol} type="button" onClick={() => onOpen(p.symbol)} title={z ? `${p.side > 0 ? 'Buy' : 'Sell'} level ${fmtPrice(z.bottom)} – ${fmtPrice(z.top)}` : ''}
                className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-semibold cursor-pointer ${p.side > 0 ? 'border-emerald-500/30 text-emerald-200 hover:border-emerald-400/70' : 'border-rose-500/30 text-rose-200 hover:border-rose-400/70'}`}>
                {p.side > 0 ? 'Buy' : 'Sell'} {p.display}{z ? <span className="ml-1 font-mono-code text-[9.5px] text-slate-400">@ {fmtPrice(p.side > 0 ? z.top : z.bottom)}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
