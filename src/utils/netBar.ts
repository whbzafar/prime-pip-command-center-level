/** A thin aurora progress line at the very top that moves while the app is waiting on its own server — instant feedback instead of a frozen-looking screen. */
export function startNetBar() {
  if (typeof window === 'undefined' || (window as any).__ppfxNetBar) return;
  (window as any).__ppfxNetBar = true;
  const bar = document.createElement('div'); bar.id = 'ppfx-netbar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  let n = 0; let on = 0; let off = 0;
  const show = () => { window.clearTimeout(off); if (!on) on = window.setTimeout(() => { bar.classList.add('on'); }, 140); };
  const hide = () => { window.clearTimeout(on); on = 0; off = window.setTimeout(() => bar.classList.remove('on'), 260); };
  const orig = window.fetch.bind(window);
  const counts = (input: RequestInfo | URL) => { try { const u = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url; return u.includes('/api/') && !/analytics|telemetry|ping|presence|heartbeat/.test(u); } catch { return false; } };
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!counts(input)) return orig(input, init);
    n++; show();
    return orig(input, init).finally(() => { n = Math.max(0, n - 1); if (!n) hide(); });
  }) as typeof window.fetch;
}
