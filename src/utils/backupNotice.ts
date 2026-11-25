/**
 * If the app opens (from the phone's cached copy) but the server cannot be reached, some mobile networks are cutting the
 * main address (DNS / connection reset). Show a small, dismissible notice with the backup address, which uses a different
 * hostname and usually gets through. Silent whenever the server answers.
 */
const BACKUP_HOST = 'primepipfx-command-center.onrender.com';
let shown = false;

function show() {
  if (shown || typeof document === 'undefined') return;
  shown = true;
  const bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483600;background:#1e293b;border:1px solid #f59e0b;color:#fff;border-radius:12px;padding:10px 12px;font:600 13px system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.5)';
  const msg = document.createElement('span');
  msg.style.flex = '1';
  msg.textContent = 'Cannot reach the server on this network. Open the backup address:';
  const a = document.createElement('a');
  a.href = `https://${BACKUP_HOST}/`; a.textContent = 'Open backup'; a.style.cssText = 'background:#f59e0b;color:#111;border-radius:8px;padding:6px 10px;text-decoration:none;white-space:nowrap';
  const x = document.createElement('button');
  x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Dismiss'); x.style.cssText = 'background:none;border:0;color:#cbd5e1;font-size:16px;cursor:pointer';
  x.onclick = () => bar.remove();
  bar.append(msg, a, x);
  document.body.appendChild(bar);
}

async function probe(): Promise<boolean> {
  try { const r = await fetch('/api/time', { cache: 'no-store' }); return r.ok; } catch { return false; }
}

export function startBackupNotice() {
  if (typeof window === 'undefined' || window.location.hostname === BACKUP_HOST || /^(localhost|127\.)/.test(window.location.hostname)) return;
  let fails = 0;
  const check = async () => {
    if (shown || document.hidden || !navigator.onLine) return;
    if (await probe()) { fails = 0; return; }
    if (++fails >= 2) show();
  };
  window.setTimeout(check, 6000);
  window.setInterval(check, 20000);
}
