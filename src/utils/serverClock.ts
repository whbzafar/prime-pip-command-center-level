/**
 * Correct time for candle countdowns. A phone or PC clock that is a few seconds (or minutes) off
 * makes every countdown wrong, so the offset to the server's clock (which is kept exact) is measured
 * once and applied. Accurate to well under a second.
 */
let offsetMs = 0;
let measured = false;

async function measure() {
  try {
    const t0 = Date.now();
    const r = await fetch('/api/time', { cache: 'no-store' });
    const t1 = Date.now();
    const j = await r.json();
    const server = Number(j?.now);
    if (!Number.isFinite(server)) return;
    const off = server - (t0 + (t1 - t0) / 2);
    offsetMs = Math.abs(off) > 400 ? off : 0;
    measured = true;
  } catch { /* keep the device clock */ }
}

if (typeof window !== 'undefined') {
  setTimeout(measure, 1500);
  setInterval(measure, 10 * 60_000);
}

export const serverNow = () => Date.now() + offsetMs;
export const clockOffset = () => ({ offsetMs, measured });
