/**
 * OPEN-ACCESS TRIAL LAYER — mounted beside the whole app (login screen included).
 *  · First visit: a surprise announcement with a live countdown, what's unlocked, and
 *    "Create my free account" + "Install the app".
 *  · Afterwards: a slim strip at the bottom with the countdown (collapsible).
 *  · Disappears by itself when the trial ends.
 */
import React, { useEffect, useState } from 'react';
import { Download, Gift, Lock, Monitor, PartyPopper, Sparkles, UserPlus, X } from 'lucide-react';
import { isTrialActive, TRIAL_END, TRIAL_ID, trialRemaining } from '../../utils/trial';
import { installApp, isAppInstalled, useInstallAvailable } from '../../utils/installApp';

const K_SEEN = `ppfx_trial_seen_${TRIAL_ID}`;
const K_STRIP = `ppfx_trial_strip_${TRIAL_ID}`;
const loggedIn = () => { try { return Boolean(localStorage.getItem('primepipfx_session_token')); } catch { return false; } };
const pad = (n: number) => String(n).padStart(2, '0');
const endText = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(TRIAL_END));

const UNLOCKED = [
  'Trading journal, accounts & analytics', 'Psychological Center (full)', 'Risk Management & Pre-Trade Plan', 'Live News Calendar & Breaking News',
  'Fundamentals engine + PDF exports', 'Premium Signals', 'Premium TradingView: Pro chart, indicators, price alerts', 'Backtesting & bar replay',
  'Unlimited Chart Analysis', 'Compounding simulator & Monte Carlo', 'Pro Learning', 'Every other category',
];

export function useCountdown() {
  const [r, setR] = useState(() => trialRemaining());
  useEffect(() => { const t = window.setInterval(() => setR(trialRemaining()), 1000); return () => window.clearInterval(t); }, []);
  return r;
}

export const InstallAppButton: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact }) => {
  const canPrompt = useInstallAvailable();
  const [help, setHelp] = useState(false);
  if (isAppInstalled()) return null;
  return (
    <>
      <button type="button" data-testid="install-app-btn" onClick={async () => { const ok = canPrompt && (await installApp()); if (!ok && !canPrompt) setHelp(true); }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold cursor-pointer transition ${compact ? 'px-2.5 py-1 text-[11px]' : 'px-4 py-2.5 text-[13px]'} border border-cyan-400/60 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/25 ${className}`}>
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />{compact ? 'Install app' : 'Install the app on this PC'}
      </button>
      {help && (
        <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/70 p-4" onClick={() => setHelp(false)}>
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#0b111c] p-5 text-slate-200 text-[13px] space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2"><Monitor className="w-5 h-5 text-cyan-300" /><b className="text-white text-[15px]">Install PrimePipFX</b><button type="button" onClick={() => setHelp(false)} className="ml-auto p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
            <p className="text-slate-400">It installs like a normal app — its own window, desktop / Start-menu icon, always up to date. Your browser didn't offer the one-click install here, so:</p>
            <ul className="space-y-2">
              <li><b className="text-white">Chrome or Edge (Windows / Mac):</b> click the install icon <span className="px-1 rounded bg-slate-800">⊕</span> at the right end of the address bar, or menu <b>⋮</b> → <b>Cast, save and share</b> → <b>Install page as app</b> (Edge: <b>Apps</b> → <b>Install this site as an app</b>).</li>
              <li><b className="text-white">Safari on Mac:</b> <b>File</b> → <b>Add to Dock</b>.</li>
              <li><b className="text-white">iPhone / iPad:</b> Share → <b>Add to Home Screen</b>.</li>
              <li><b className="text-white">Android:</b> menu <b>⋮</b> → <b>Install app</b>.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export const TrialLayer: React.FC = () => {
  const [active, setActive] = useState(isTrialActive());
  // The sign-in screen (with its hero picture) is the first thing a visitor sees; the surprise
  // announcement follows a few seconds later instead of covering it immediately.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let first = false;
    try { first = isTrialActive() && !localStorage.getItem(K_SEEN); } catch { first = isTrialActive(); }
    if (!first) return;
    const t = window.setTimeout(() => setOpen(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  const [strip, setStrip] = useState(() => { try { return localStorage.getItem(K_STRIP) !== 'min'; } catch { return true; } });
  const [authed, setAuthed] = useState(loggedIn());
  const r = useCountdown();
  useEffect(() => { const t = window.setInterval(() => { setActive(isTrialActive()); setAuthed(loggedIn()); }, 2000); return () => window.clearInterval(t); }, []);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener('ppfx:show-trial', show); return () => window.removeEventListener('ppfx:show-trial', show); }, []);
  if (!active) return null;

  const close = () => { setOpen(false); try { localStorage.setItem(K_SEEN, String(Date.now())); } catch { /* ignore */ } };
  const signup = () => { close(); window.dispatchEvent(new CustomEvent('ppfx:open-signup')); };
  const tiles: [number, string][] = [[r.days, 'days'], [r.hours, 'hours'], [r.minutes, 'minutes'], [r.seconds, 'seconds']];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[2147482000] flex items-center justify-center p-3 sm:p-6 bg-[#02040a]/80 backdrop-blur-md" data-testid="trial-modal">
          <div className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border border-amber-300/40 bg-gradient-to-br from-[#140d24] via-[#0a1222] to-[#04131a] shadow-[0_0_120px_-20px_rgba(251,191,36,0.55)]">
            <div className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <button type="button" onClick={close} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
            <div className="relative p-5 sm:p-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300/50 bg-amber-400/10 text-amber-200 text-[11px] font-bold tracking-[0.2em] uppercase"><PartyPopper className="w-4 h-4" />Surprise announcement</div>
              <h2 className="mt-4 text-[28px] sm:text-[40px] leading-[1.05] font-black text-white tracking-tight">
                The full PrimePipFX app is <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">FREE for 3 days</span>
              </h2>
              <p className="mt-3 text-[13.5px] sm:text-[15px] text-slate-300 max-w-xl mx-auto">Every category is unlocked for everyone — just create your free account. Your work stays private to your account.</p>

              <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto" data-testid="trial-countdown">
                {tiles.map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 sm:py-3">
                    <div className="text-[26px] sm:text-[34px] font-black tabular-nums text-white leading-none">{pad(v)}</div>
                    <div className="mt-1 text-[9.5px] sm:text-[10.5px] uppercase tracking-widest text-slate-400">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[11.5px] text-slate-400">Free access ends <b className="text-slate-200">{endText}</b> (Pakistan time)</div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-left max-w-xl mx-auto">
                {UNLOCKED.map((x) => (<div key={x} className="flex items-start gap-2 text-[12.5px] text-slate-200"><Sparkles className="w-3.5 h-3.5 mt-0.5 text-amber-300 shrink-0" />{x}</div>))}
                <div className="flex items-start gap-2 text-[12.5px] text-slate-500"><Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />Admin Panel and Meta 5 stay locked</div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
                {!authed ? (
                  <button type="button" onClick={signup} data-testid="trial-signup-btn" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 text-slate-950 font-black text-[14px] shadow-[0_10px_40px_-10px_rgba(251,191,36,0.8)] hover:brightness-110 cursor-pointer">
                    <UserPlus className="w-5 h-5" />Create my free account
                  </button>
                ) : (
                  <button type="button" onClick={close} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 text-slate-950 font-black text-[14px] cursor-pointer"><Gift className="w-5 h-5" />Start exploring everything</button>
                )}
                <InstallAppButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && (
        strip ? (
          <div className="fixed bottom-[84px] md:bottom-3 left-1/2 -translate-x-1/2 z-[45] max-w-[96vw] flex items-center gap-2 sm:gap-3 rounded-2xl border border-amber-300/40 bg-[#0d0a18]/95 backdrop-blur px-3 py-2 shadow-[0_10px_50px_-10px_rgba(251,191,36,0.5)] text-[12px]" data-testid="trial-strip">
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 font-bold text-amber-200 cursor-pointer whitespace-nowrap"><Gift className="w-4 h-4" />Free full access</button>
            <span className="font-mono tabular-nums text-white whitespace-nowrap">{r.days}d {pad(r.hours)}:{pad(r.minutes)}:{pad(r.seconds)}</span>
            {!authed && <button type="button" onClick={signup} className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-300 text-slate-950 font-bold text-[11px] cursor-pointer"><UserPlus className="w-3.5 h-3.5" />Create account</button>}
            <span className="hidden sm:inline-flex"><InstallAppButton compact /></span>
            <button type="button" onClick={() => { setStrip(false); try { localStorage.setItem(K_STRIP, 'min'); } catch { /* ignore */ } }} className="p-1 rounded text-slate-500 hover:text-white cursor-pointer" aria-label="Minimise"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => { setStrip(true); try { localStorage.removeItem(K_STRIP); } catch { /* ignore */ } }} title="Free full access — time left"
            className="fixed bottom-[84px] md:bottom-3 left-3 z-[45] inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-[#0d0a18]/95 px-2.5 py-1 text-[11px] font-bold text-amber-200 cursor-pointer">
            <Gift className="w-3.5 h-3.5" />{r.days}d {pad(r.hours)}h
          </button>
        )
      )}
    </>
  );
};

export default TrialLayer;
