import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './community-layout-fix.css';
import './styles/liquid-glass-ui-kit.css';
import { applyInterfaceTemplate } from './data/interfaceTemplates';
import './utils/installApp';

if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const msg = String(event?.message || event?.error?.message || '');
      if (
        msg.includes('contentWindow is not available') ||
        msg.includes('Cannot listen to the event from the provided iframe')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    },
    true
  );
}

try {
  const savedTheme = localStorage.getItem('primepipfx_theme') || 'liquid-glass-neon';
  const rawBrightness = localStorage.getItem('primepipfx_brightness');
  // Brightness controls intentionally support the full 60%-160% range.
  // The previous 90%-110% clamp made the +/- buttons appear to respond while
  // silently snapping the application back into the narrow range.
  const num = rawBrightness ? Number(rawBrightness) : NaN;
  const savedBrightness = !isNaN(num) && num >= 60 && num <= 160 ? num : 104;
  applyInterfaceTemplate(savedTheme, savedBrightness);
} catch {}

// After a new deployment, a page that was already open still references the previous build's
// code files, which no longer exist — sections then hang on "loading". Detect that and reload
// once onto the new build (guarded so it can never loop).
if (typeof window !== 'undefined') {
  const reloadOnce = () => {
    try {
      const last = Number(sessionStorage.getItem('ppfx_chunk_reload') || 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem('ppfx_chunk_reload', String(Date.now()));
    } catch { /* storage blocked */ }
    window.location.reload();
  };
  window.addEventListener('vite:preloadError', (e: Event) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String((e as PromiseRejectionEvent).reason?.message || (e as PromiseRejectionEvent).reason || '');
    if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(msg)) reloadOnce();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker (network-first pages) + automatic pickup of new deployments.
declare const __PPFX_BUILD__: string;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {});
  });
  // An updated worker that removed an old cache asks open tabs to reload once.
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'PPFX_SW_UPDATED' && !sessionStorage.getItem('ppfx_sw_reloaded')) {
      sessionStorage.setItem('ppfx_sw_reloaded', '1');
      window.location.reload();
    }
  });
}

// New deployment detection: compare this tab's build with /version.json every 2 minutes and on focus.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const mine = typeof __PPFX_BUILD__ === 'string' ? __PPFX_BUILD__ : '';
  let shown = false;
  const check = async () => {
    if (shown || !navigator.onLine) return;
    try {
      const j = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
      if (j?.build && mine && j.build !== mine) {
        shown = true;
        const bar = document.createElement('div');
        bar.setAttribute('role', 'status');
        bar.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:12px;align-items:center;padding:10px 14px 10px 16px;border-radius:14px;background:linear-gradient(135deg,#0b1220,#0f1b33);border:1px solid rgba(34,211,238,.45);box-shadow:0 12px 40px rgba(0,0,0,.55);font:600 13px system-ui,sans-serif;color:#e2e8f0';
        bar.innerHTML = '<span>✨ A new version of PrimePipsFX is available.</span>';
        const btn = document.createElement('button');
        btn.textContent = 'Update now';
        btn.style.cssText = 'cursor:pointer;border:0;border-radius:10px;padding:7px 12px;background:#22d3ee;color:#04111d;font:700 12.5px system-ui,sans-serif';
        btn.onclick = async () => {
          try { const regs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((regs || []).map((r) => r.update())); } catch { /* ignore */ }
          try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch { /* ignore */ }
          window.location.reload();
        };
        bar.appendChild(btn);
        document.body.appendChild(bar);
      }
    } catch { /* offline */ }
  };
  setTimeout(check, 15_000);
  setInterval(check, 120_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
