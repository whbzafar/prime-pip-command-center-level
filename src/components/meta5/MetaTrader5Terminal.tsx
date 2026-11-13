import React, { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, RefreshCw, Link2, Building2, X } from 'lucide-react';

/**
 * MetaTrader 5 — MetaQuotes' modern MT5 web terminal, embedded and opened straight away.
 * Quotes, charts, orders and positions are the real platform's; credentials are typed inside the
 * terminal and never pass through PrimePipFX servers.
 *
 * Since 2022 the modern MT5 web terminal is served per broker: the generic one accepts
 * MetaQuotes-Demo accounts, and each broker hands out its own terminal link. The "Broker" button
 * lets a user switch this screen to their broker's link (remembered on the device).
 */
// The modern terminal (web.metatrader.app) hangs on login when embedded in another site, so the
// embedded default is MetaQuotes' classic shared terminal, which works in a frame. The modern one
// is offered as a new-tab link.
const DEFAULT_URL = 'https://metatraderweb.app/trade?demo_all_servers=1&startup_version=5&lang=en&save_password=on';
const MODERN_URL = 'https://web.metatrader.app/terminal';
const LS_KEY = 'ppfx_mt5_broker_link_v2';

const cleanLink = (raw: string): string | null => {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch { return null; }
};
const readSaved = () => { try { return cleanLink(localStorage.getItem(LS_KEY) || ''); } catch { return null; } };

export const MetaTrader5Terminal: React.FC = () => {
  const [brokerUrl, setBrokerUrl] = useState<string | null>(readSaved);
  const [link, setLink] = useState(brokerUrl || '');
  const [showBroker, setShowBroker] = useState(false);
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);
  const url = brokerUrl || DEFAULT_URL;
  const valid = cleanLink(link);

  const saveBroker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try { localStorage.setItem(LS_KEY, valid); } catch { /* ignore */ }
    setBrokerUrl(valid); setShowBroker(false); setNonce((n) => n + 1);
  };
  const useDefault = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setBrokerUrl(null); setLink(''); setShowBroker(false); setNonce((n) => n + 1);
  };
  let host = '';
  try { host = brokerUrl ? new URL(brokerUrl).hostname : ''; } catch { /* ignore */ }

  const btn = 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer';

  return (
    <div
      className={full ? 'fixed inset-0 z-[2147483000] flex flex-col bg-[#0b1220]' : 'flex flex-col rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden'}
      style={full ? { height: '100dvh' } : undefined}
    >
      {/* One slim bar. Outside full screen the app's fixed Announcements / bell / sound buttons sit top-right, so keep clear of them. */}
      <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800 bg-slate-950 ${full ? 'pt-[max(0.375rem,env(safe-area-inset-top))]' : 'pr-36 sm:pr-64'}`}>
        <span className="text-xs sm:text-sm font-bold text-white">MetaTrader 5</span>
        <span className="hidden sm:inline text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 truncate max-w-[180px]">{host || 'LIVE'}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setShowBroker((v) => !v)} title="Use your broker's MT5 web terminal" className={`${btn} ${showBroker ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-amber-400/60 bg-amber-500/15 text-amber-100'}`}><Building2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Broker</span></button>
          <button type="button" onClick={() => setNonce((n) => n + 1)} title="Reload terminal" aria-label="Reload terminal" className={`${btn} border-slate-700 text-slate-300 hover:text-white`}><RefreshCw className="w-3.5 h-3.5" /></button>
          <a href={MODERN_URL} target="_blank" rel="noopener noreferrer" title="Open the newest MT5 web terminal in a new tab" className={`${btn} border-emerald-400/60 bg-emerald-500/15 text-emerald-100`}><ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New MT5</span></a>
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open in a new tab" className={`${btn} border-sky-400/60 bg-sky-500/15 text-sky-100`}><ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New tab</span></a>
          <button type="button" onClick={() => setFull((f) => !f)} className={`${btn} border-cyan-400/60 bg-cyan-500/15 text-cyan-100`}>
            {full ? <><Minimize2 className="w-3.5 h-3.5" /> Exit</> : <><Maximize2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Full screen</span></>}
          </button>
        </div>
      </div>

      {showBroker && (
        <form onSubmit={saveBroker} className="px-3 py-2.5 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 focus-within:border-cyan-400">
            <Link2 className="w-4 h-4 text-slate-500" />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste your broker's MT5 web-terminal link" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none" />
          </div>
          <button type="submit" disabled={!valid} className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-40 cursor-pointer">Use this broker</button>
          {brokerUrl && <button type="button" onClick={useDefault} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer">Back to default terminal</button>}
          <button type="button" onClick={() => setShowBroker(false)} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          <p className="w-full text-[11px] text-slate-400 leading-relaxed">Every broker has its own MT5 web-terminal link for its demo and real accounts (find it on the broker's website or client area). It is remembered on this device. If the window stays blank the broker blocks embedding: use New tab.</p>
        </form>
      )}

      <iframe
        key={`${nonce}:${url}`}
        title="MetaTrader 5 Web Terminal"
        src={url}
        allow="clipboard-read; clipboard-write; fullscreen; autoplay"
        allowFullScreen
        className={`w-full border-0 bg-white ${full ? 'flex-1 min-h-0' : 'h-[calc(100dvh-150px)] min-h-[560px]'}`}
      />
    </div>
  );
};
