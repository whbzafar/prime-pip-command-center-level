/**
 * Optional heart-rate telemetry through Web Bluetooth (any standard BLE chest strap / watch broadcasting the
 * Heart Rate service: Polar, Garmin, Wahoo, Coospo…). Chrome / Edge / Android only. Data never leaves the device.
 * RMSSD (a standard short-term HRV measure) is computed from the strap's RR intervals.
 */
import type { Bio, BioBaseline } from './riskDna';

const BASE_KEY = 'ppfx_bio_baseline_v1';
type L = () => void;
const listeners = new Set<L>();
let device: any = null;
let rr: number[] = [];
let state: { status: 'off' | 'connecting' | 'live' | 'error'; error?: string; name?: string; bio: Bio | null; calibrating: number | null } = { status: 'off', bio: null, calibrating: null };
let calib: { hr: number[]; rmssd: number[]; until: number } | null = null;
const emit = () => listeners.forEach((l) => l());
export const heartSupported = () => typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
export const getHeart = () => state;
export const subscribeHeart = (l: L) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getBaseline = (): BioBaseline | null => { try { const v = JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); return v && typeof v.hr === 'number' ? v : null; } catch { return null; } };
export const clearBaseline = () => { try { localStorage.removeItem(BASE_KEY); } catch { /* ignore */ } emit(); };

export function parseHr(dv: DataView): { hr: number; rr: number[] } {
  const flags = dv.getUint8(0); let i = 1;
  const hr = flags & 1 ? dv.getUint16(i, true) : dv.getUint8(i); i += flags & 1 ? 2 : 1;
  if (flags & 8) i += 2; // energy expended
  const out: number[] = [];
  if (flags & 16) for (; i + 1 < dv.byteLength; i += 2) out.push((dv.getUint16(i, true) / 1024) * 1000);
  return { hr, rr: out };
}
export function rmssd(r: number[]): number | null {
  if (r.length < 8) return null;
  let s = 0, n = 0; for (let i = 1; i < r.length; i++) { const d = r[i] - r[i - 1]; if (Math.abs(d) < 300) { s += d * d; n++; } }
  return n >= 6 ? Math.sqrt(s / n) : null;
}
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

function onValue(ev: any) {
  const { hr, rr: r } = parseHr(ev.target.value as DataView);
  if (hr < 30 || hr > 230) return;
  rr = [...rr, ...r].slice(-60);
  const hrv = rmssd(rr);
  state = { ...state, status: 'live', bio: { hr, rmssd: hrv, at: Date.now() } };
  if (calib) {
    calib.hr.push(hr); if (hrv !== null) calib.rmssd.push(hrv);
    const left = Math.max(0, Math.ceil((calib.until - Date.now()) / 1000)); state = { ...state, calibrating: left };
    if (left === 0 && calib.hr.length >= 20) { try { localStorage.setItem(BASE_KEY, JSON.stringify({ hr: median(calib.hr), rmssd: calib.rmssd.length >= 10 ? median(calib.rmssd) : null })); } catch { /* ignore */ } calib = null; state = { ...state, calibrating: null }; }
  }
  emit();
}
export async function connectHeart(): Promise<void> {
  if (!heartSupported()) { state = { ...state, status: 'error', error: 'Web Bluetooth is not available in this browser (use Chrome or Edge).' }; emit(); return; }
  try {
    state = { ...state, status: 'connecting', error: undefined }; emit();
    device = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
    device.addEventListener('gattserverdisconnected', () => { state = { ...state, status: 'off', bio: null }; emit(); });
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService('heart_rate');
    const ch = await svc.getCharacteristic('heart_rate_measurement');
    await ch.startNotifications(); ch.addEventListener('characteristicvaluechanged', onValue);
    state = { ...state, status: 'live', name: device.name || 'Heart-rate sensor' }; emit();
  } catch (e: any) { state = { ...state, status: e?.name === 'NotFoundError' ? 'off' : 'error', error: e?.name === 'NotFoundError' ? undefined : String(e?.message || e) }; emit(); }
}
export function disconnectHeart() { try { device?.gatt?.disconnect(); } catch { /* ignore */ } state = { ...state, status: 'off', bio: null }; calib = null; emit(); }
export function calibrateCalm(seconds = 60) { if (state.status !== 'live') return; calib = { hr: [], rmssd: [], until: Date.now() + seconds * 1000 }; state = { ...state, calibrating: seconds }; emit(); }
