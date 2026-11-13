import React, { useMemo, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, ShieldCheck, RefreshCw, Link2, Info } from 'lucide-react';

/**
 * MetaTrader 5 — MetaQuotes' official web terminals, embedded. Quotes, charts, orders and positions
 * are the real platform's. Credentials are typed inside the terminal and never pass through
 * PrimePipFX servers.
 *
 * Since 2022 MetaQuotes serves the modern MT5 web terminal per broker: every broker has its own
 * terminal link, and the generic one only accepts MetaQuotes-Demo accounts. So:
 *  - "MT5 demo"      → the modern generic terminal (MetaQuotes-Demo).
 *  - "My broker"     → the user pastes their broker's own MT5 web-terminal link.
 *  - "Broker list"   → MetaQuotes' older shared terminal, which still lists brokers that support it.
 */
const DEMO_URL = 'https://web.metatrader.app/terminal';
const CLASSIC_URL = 'https://metatraderweb.app/trade?demo_all_servers=1&startup_version=5&lang=en&save_password=off';
const LS_KEY = 'ppfx_mt5_broker_link_v2';

type Mode = 'demo' | 'broker' | 'classic';

const cleanLink = (raw: string): string | null => {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (u.protocol !== 'https:') return null;
    return u.toString();
  } catch { return null; }
};

export const MetaTrader5Terminal: React.FC = () => {
  const saved = useMemo(() => { try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; } }, []);
  const [mode, setMode] = useState<Mode>('demo');
  const [link, setLink] = useState(saved);
  const [url, setUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);
  const valid = cleanLink(link);

  const open = (u: string) => { setUrl(u); setNonce((n) => n + 1); setFull(true); };
  const pick = (m: Mode) => { setMode(m); setFull(false); setUrl(null); };
  const connectBroker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try { localStorage.setItem(LS_KEY, valid); } catch { /* ignore */ }
    open(valid);
  };

  const tab = (m: Mode, label: string) => (
    <button type="button" onClick={() => pick(m)} className={`px-3 py-1.5 cursor-pointer whitespace-nowrap ${mode === m ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>{label}</button>
  );

  return (
    <div
      className={full ? 'fixed inset-0 z-[2147483000] flex flex-col bg-[#0b1220]' : 'flex flex-col rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden'}
      style={full ? { height: '100dvh' } : undefined}
    >
      {full ? (
        /* Full screen: one slim bar, the terminal gets everything else */
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800 bg-slate-950 pt-[max(0.375rem,env(safe-area-inset-top))]">
          <span className="text-xs font-bold text-white mr-auto">MetaTrader 5</span>
          <button type="button" onClick={() => setNonce((n) => n + 1)} title="Reload terminal" aria-label="Reload terminal" className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-400/60 bg-sky-500/15 text-sky-100 text-xs font-bold"><ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New tab</span></a>}
          <button type="button" onClick={() => setFull(false)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/15 text-cyan-100 text-xs font-bold cursor-pointer"><Minimize2 className="w-3.5 h-3.5" /> Exit</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950">
          {/* The app's fixed Announcements / bell / sound buttons sit top-right: keep this row clear of them */}
          <div className="w-full flex items-center gap-2 pr-36 sm:pr-64">
            <span className="text-sm font-bold text-white">MetaTrader 5</span>
            <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">OFFICIAL · LIVE</span>
            <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Password is typed only inside MT5, never sent to us</span>
          </div>
          <div className="flex items-center gap-1.5 w-full flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs font-bold">
              {tab('demo', 'MT5 demo')}{tab('broker', 'My broker')}{tab('classic', 'Broker list')}
            </div>
            {url && <>
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-400/60 bg-sky-500/15 text-sky-100 text-xs font-bold"><ExternalLink className="w-3.5 h-3.5" /> New tab</a>
              <button type="button" onClick={() => setFull(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/15 text-cyan-100 text-xs font-bold cursor-pointer"><Maximize2 className="w-3.5 h-3.5" /> Full screen</button>
            </>}
          </div>
        </div>
      )}

      {!full && mode === 'demo' && (
        <div className="px-3 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-slate-300 flex-1 min-w-[220px]">The modern MT5 terminal with symbol search, full chart scaling and one-click trading. It accepts MetaQuotes-Demo accounts (open a free one inside).</span>
          <button type="button" onClick={() => open(DEMO_URL)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-bold text-sm cursor-pointer">Open MT5</button>
        </div>
      )}
      {!full && mode === 'broker' && (
        <form onSubmit={connectBroker} className="px-3 py-3 border-b border-slate-800 bg-slate-900/60 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] items-end">
          <label className="text-[11px] text-slate-400">Your broker's MT5 web-terminal link (from the broker's website or client area)
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 focus-within:border-cyan-400">
              <Link2 className="w-4 h-4 text-slate-500" />
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/terminal" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none" />
            </div>
          </label>
          <button type="submit" disabled={!valid} className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-bold text-sm disabled:opacity-40 cursor-pointer">Open my broker</button>
          <p className="sm:col-span-2 text-[11px] text-slate-400 flex gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
            Each broker runs its own MT5 web terminal for its demo and real accounts. Paste that link once and it is remembered on this device. If the window stays blank, the broker blocks embedding: use New tab.
          </p>
        </form>
      )}
      {!full && mode === 'classic' && (
        <div className="px-3 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-slate-300 flex-1 min-w-[220px]">MetaQuotes' older shared terminal. Its login window has a server list for brokers that still support it. Older look and fewer chart controls than the modern terminal.</span>
          <button type="button" onClick={() => open(CLASSIC_URL)} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm cursor-pointer">Open broker list</button>
        </div>
      )}

      {url ? (
        <iframe
          key={nonce}
          title="MetaTrader 5 Web Terminal"
          src={url}
          allow="clipboard-read; clipboard-write; fullscreen; autoplay"
          allowFullScreen
          className={`w-full border-0 bg-white ${full ? 'flex-1 min-h-0' : 'h-[calc(100dvh-220px)] min-h-[560px]'}`}
        />
      ) : (
        <div className="px-4 py-10 text-center text-sm text-slate-400">Choose an option above to open the terminal.</div>
      )}
      {!full && (
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-400 leading-relaxed">
          Trading involves risk of loss. PrimePipFX does not hold your funds or credentials.
        </div>
      )}
    </div>
  );
};
