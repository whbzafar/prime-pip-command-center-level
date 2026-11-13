import React, { useMemo, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, ShieldCheck, RefreshCw, Search, Info } from 'lucide-react';

/**
 * MetaTrader 5 — MetaQuotes' official web terminal, embedded. All quotes, charts, orders and
 * positions are the real platform's. Users log in with their own broker account; credentials go
 * straight to MetaQuotes / the broker and never through PrimePipFX servers (we never see passwords).
 *
 * Two entry points:
 *  - "My broker": user types their broker's MT5 server name (+ optional login number); the terminal
 *    opens with that server preselected, the user types the password inside the terminal.
 *  - "MetaQuotes demo": the generic terminal (MetaQuotes-Demo accounts only).
 */
const GENERIC_URL = 'https://web.metatrader.app/terminal?version=5&lang=en';
const LS_KEY = 'ppfx_mt5_last_broker_v1';

const brokerUrl = (server: string, login: string) => {
  const q = new URLSearchParams({
    servers: server,
    trade_server: server,
    startup_version: '5',
    lang: 'en',
    save_password: 'off',
  });
  if (login.trim()) q.set('login', login.trim());
  return `https://trade.mql5.com/trade?${q.toString()}`;
};

const loadLast = (): { server: string; login: string } => {
  try { return { server: '', login: '', ...(JSON.parse(localStorage.getItem(LS_KEY) || '{}')) }; } catch { return { server: '', login: '' }; }
};

export const MetaTrader5Terminal: React.FC = () => {
  const last = useMemo(loadLast, []);
  const [mode, setMode] = useState<'broker' | 'demo'>(last.server ? 'broker' : 'broker');
  const [server, setServer] = useState(last.server);
  const [login, setLogin] = useState(last.login);
  const [url, setUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);

  const connect = (e?: React.FormEvent) => {
    e?.preventDefault();
    const s = server.trim();
    if (!s) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ server: s, login: login.trim() })); } catch { /* ignore */ }
    setUrl(brokerUrl(s, login));
    setNonce((n) => n + 1);
  };
  const openDemo = () => { setUrl(GENERIC_URL); setNonce((n) => n + 1); };
  const activeUrl = url || '';

  return (
    <div
      className={full ? 'fixed inset-0 z-[2147483000] flex flex-col bg-[#0b1220]' : 'flex flex-col rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden'}
      style={full ? { height: '100dvh' } : undefined}
    >
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 ${full ? 'pt-[max(0.5rem,env(safe-area-inset-top))]' : ''}`}>
        {/* The app's fixed Announcements / bell / sound buttons sit top-right: keep the title row clear of them */}
        <div className="w-full flex items-center gap-2 pr-36 sm:pr-64">
          <span className="text-sm font-bold text-white">MetaTrader 5</span>
          <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">OFFICIAL · LIVE</span>
          <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Password is typed only inside MT5, never sent to us</span>
        </div>
        <div className="flex items-center gap-1.5 w-full flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs font-bold">
            <button type="button" onClick={() => setMode('broker')} className={`px-3 py-1.5 cursor-pointer ${mode === 'broker' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>My broker</button>
            <button type="button" onClick={() => setMode('demo')} className={`px-3 py-1.5 cursor-pointer ${mode === 'demo' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>MetaQuotes demo</button>
          </div>
          {url && <>
            <button type="button" onClick={() => setNonce((n) => n + 1)} title="Reload terminal" className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            <a href={activeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-400/60 bg-sky-500/15 text-sky-100 text-xs font-bold"><ExternalLink className="w-3.5 h-3.5" /> Open in new tab</a>
            <button type="button" onClick={() => setFull((f) => !f)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/15 text-cyan-100 text-xs font-bold cursor-pointer">
              {full ? <><Minimize2 className="w-3.5 h-3.5" /> Exit</> : <><Maximize2 className="w-3.5 h-3.5" /> Full screen</>}
            </button>
          </>}
        </div>
      </div>

      {mode === 'broker' && (
        <form onSubmit={connect} className="px-3 py-3 border-b border-slate-800 bg-slate-900/60 grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] items-end">
          <label className="text-[11px] text-slate-400">Broker MT5 server name (exact, from your broker's email or website)
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 focus-within:border-cyan-400">
              <Search className="w-4 h-4 text-slate-500" />
              <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. YourBroker-Live" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none" />
            </div>
          </label>
          <label className="text-[11px] text-slate-400">MT5 login number (optional)
            <input value={login} onChange={(e) => setLogin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="12345678"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-400" />
          </label>
          <button type="submit" disabled={!server.trim()} className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-bold text-sm disabled:opacity-40 cursor-pointer">Connect</button>
          <p className="sm:col-span-3 text-[11px] text-slate-400 flex gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
            Server names are case-sensitive. The password is typed inside the MT5 window. The broker must have MT5 web trading switched on; if you see "not supported by this broker", ask them to enable it or use their own web-terminal link.
          </p>
        </form>
      )}
      {mode === 'demo' && !url && (
        <div className="px-3 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-slate-300">Practice with a free MetaQuotes demo account (the generic terminal only supports MetaQuotes-Demo).</span>
          <button type="button" onClick={openDemo} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm cursor-pointer">Open demo terminal</button>
        </div>
      )}

      {url ? (
        <iframe
          key={nonce}
          title="MetaTrader 5 Web Terminal"
          src={url}
          allow="clipboard-read; clipboard-write; fullscreen; autoplay"
          allowFullScreen
          className={`w-full border-0 bg-white ${full ? 'flex-1 min-h-0' : 'h-[78dvh] min-h-[560px]'}`}
        />
      ) : (
        <div className="flex-1 px-4 py-10 text-center text-sm text-slate-400">Enter your broker's MT5 server above and press <b className="text-slate-200">Connect</b>.</div>
      )}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-400 leading-relaxed">
        If the embedded terminal keeps loading (some browsers block third-party sessions), press <b className="text-slate-200">Open in new tab</b>: the same MT5 terminal runs there on phone and PC. Trading involves risk of loss; PrimePipFX does not hold your funds or credentials.
      </div>
    </div>
  );
};
