import React, { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, ShieldCheck, RefreshCw } from 'lucide-react';

/**
 * MetaTrader 5 — the official MetaQuotes MT5 Web Terminal, embedded.
 * Everything inside (live quotes, charts, order ticket, positions, history, indicators,
 * broker search & login) is MetaQuotes' real platform. Users log in with their own broker account;
 * credentials go straight to MetaQuotes / the broker, never through PrimePipFX servers.
 */
const MT5_URL = 'https://web.metatrader.app/terminal';

export const MetaTrader5Terminal: React.FC = () => {
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);
  return (
    <div
      className={full ? 'fixed inset-0 z-[2147483000] flex flex-col bg-[#0b1220]' : 'flex flex-col rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden'}
      style={full ? { height: '100dvh' } : undefined}
    >
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 ${full ? 'pt-[max(0.5rem,env(safe-area-inset-top))]' : ''}`}>
        {/* The app's fixed Announcements / bell / sound buttons sit top-right: keep the title row clear of them, buttons go on their own row */}
        <div className={`w-full flex items-center gap-2 pr-36 sm:pr-64`}>
        <span className="text-sm font-bold text-white">MetaTrader 5</span>
        <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">OFFICIAL · LIVE</span>
        <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Login goes directly to MetaQuotes / your broker</span>
        </div>
        <div className="flex items-center gap-1.5 w-full">
          <button type="button" onClick={() => setNonce((n) => n + 1)} title="Reload terminal" className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          <a href={MT5_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-400/60 bg-sky-500/15 text-sky-100 text-xs font-bold"><ExternalLink className="w-3.5 h-3.5" /> New tab</a>
          <button type="button" onClick={() => setFull((f) => !f)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/15 text-cyan-100 text-xs font-bold cursor-pointer">
            {full ? <><Minimize2 className="w-3.5 h-3.5" /> Exit</> : <><Maximize2 className="w-3.5 h-3.5" /> Full screen</>}
          </button>
        </div>
      </div>
      <iframe
        key={nonce}
        title="MetaTrader 5 Web Terminal"
        src={MT5_URL}
        allow="clipboard-read; clipboard-write; fullscreen; autoplay"
        className={`w-full border-0 bg-white ${full ? 'flex-1 min-h-0' : 'h-[78dvh] min-h-[560px]'}`}
      />
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-400 leading-relaxed">
        Search your broker (server) inside the terminal, enter your MT5 login and password, and trade live: market and pending orders, SL/TP, positions, history, charts, indicators and every MT5 tool. Not every broker enables web access; if yours is missing, use New tab or ask the broker to enable MT5 WebTrader. Works on phone and PC.
        Trading involves risk of loss; PrimePipFX does not hold your funds or credentials.
      </div>
    </div>
  );
};
