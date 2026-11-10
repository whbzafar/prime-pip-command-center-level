/**
 * Quiet app health + usage signals for the owner:
 *  · errors on anyone's screen are reported automatically (message + where), at most a few per visit
 *  · which sections are opened is counted (numbers only — no names, no content) and sent in batches
 */
let started = false;
let sent = 0;
const seen = new Set<string>();
const counts: Record<string, number> = {};

function report(message: string, stack?: string) {
  if (!message || sent >= 5) return;
  if (/ResizeObserver loop|Script error\.?$|Loading chunk|NetworkError|Failed to fetch|AbortError|The operation was aborted/i.test(message)) return;
  const k = message.slice(0, 120);
  if (seen.has(k)) return;
  seen.add(k); sent++;
  const body = JSON.stringify({ message: message.slice(0, 300), stack: (stack || '').slice(0, 800), where: location.pathname + location.hash + ' · ' + (document.title || '') });
  try { navigator.sendBeacon?.('/api/insights/error', new Blob([body], { type: 'application/json' })) || fetch('/api/insights/error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }); } catch { /* ignore */ }
}

function flush() {
  if (!Object.keys(counts).length) return;
  const body = JSON.stringify({ counts: { ...counts } });
  for (const k of Object.keys(counts)) delete counts[k];
  try { navigator.sendBeacon?.('/api/insights/usage', new Blob([body], { type: 'application/json' })) || fetch('/api/insights/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }); } catch { /* ignore */ }
}

export function startInsights() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('error', (e) => report(e.message || String(e.error || ''), e.error?.stack));
  window.addEventListener('unhandledrejection', (e) => { const r: any = e.reason; report(r?.message || String(r || ''), r?.stack); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  setInterval(flush, 5 * 60_000);
}

/** Count one opening of a section (e.g. a main tab). */
export function trackSection(id: string) { if (id) counts[id] = (counts[id] || 0) + 1; }
