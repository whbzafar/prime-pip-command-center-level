import { loadImage } from './postVisuals';

export interface Shot { img: HTMLImageElement; label: string; tab: string; at: number }
export interface CaptureFail { tab: string; reason: string }
/** Lives outside React so captures survive the admin panel unmounting while the agent opens other screens. */
export const shotStore: { shots: Record<string, Shot>; fails: CaptureFail[]; running: boolean } = { shots: {}, fails: [], running: false };

export const go = (tab: string) => window.dispatchEvent(new CustomEvent('primepipfx_navigate_tab', { detail: { tab } }));
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const SLOW: Record<string, number> = { PRO_TRADING: 11000, META5_PREMIUM: 9000, CHART_ANALYSIS: 9000, FUNDAMENTAL_INDICATORS: 9000, BACKTESTING: 8000, BACKTEST_REPLAY: 8000 };

/** 48x27 grayscale fingerprint of the current video frame, used to know when a screen has finished loading and whether it really changed. */
export function fingerprint(v: HTMLVideoElement): Uint8Array {
  const c = document.createElement('canvas'); c.width = 48; c.height = 27; const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(v, 0, 0, 48, 27);
  const d = x.getImageData(0, 0, 48, 27).data; const out = new Uint8Array(48 * 27); for (let i = 0; i < out.length; i++) out[i] = (d[i * 4] * 3 + d[i * 4 + 1] * 6 + d[i * 4 + 2]) / 10; return out;
}
export function frameDiff(a: Uint8Array, b: Uint8Array): number { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 14) n++; return n / a.length; }
export const lockedNotice = () => { const d = document.querySelector('[role="dialog"]'); return !!d && /subscription required|owner access only|coming soon|upgrade to unlock/i.test(d.textContent || ''); };

export async function grab(v: HTMLVideoElement): Promise<HTMLImageElement> {
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')!.drawImage(v, 0, 0);
  return loadImage(c.toDataURL('image/jpeg', 0.93));
}

/** One permission click ("share this tab"). Then, for every topic, the agent opens that exact screen, waits until it has finished loading and stopped moving,
 *  checks it really is a different screen from the previous one (not a spinner, not a locked-feature notice), and only then photographs it. */
export async function captureTopics(topics: { id: string; tab: string; title: string }[], returnTab = 'ADMIN', onStep?: (label: string, i: number, n: number) => void): Promise<{ done: number; fails: CaptureFail[] }> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c?: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) throw new Error('Automatic capture needs desktop Chrome or Edge. On a phone, upload a screenshot for each topic instead.');
  if (shotStore.running) throw new Error('A capture is already running.');
  const stream = await md.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 10 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' } as unknown);
  shotStore.running = true; const fails: CaptureFail[] = []; let done = 0;
  try {
    const v = document.createElement('video'); v.srcObject = stream; v.muted = true; await v.play(); await sleep(600);
    let prev: Uint8Array | null = null;
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i]; onStep?.(t.title, i + 1, topics.length);
      go(t.tab); await sleep(1400); window.scrollTo(0, 0);
      const limit = SLOW[t.tab] || 6500; const started = Date.now(); let last = fingerprint(v); let calm = 0; let ok = false; let reason = 'screen never finished loading';
      while (Date.now() - started < limit) {
        await sleep(450); const cur = fingerprint(v); calm = frameDiff(last, cur) < 0.012 ? calm + 1 : 0; last = cur;
        if (calm >= 3) { ok = true; break; }
      }
      if (lockedNotice()) { ok = false; reason = 'this feature is locked for the logged-in account'; }
      else if (ok && prev && frameDiff(prev, last) < 0.02) { await sleep(2500); const again = fingerprint(v); if (frameDiff(prev, again) < 0.02) { ok = false; reason = 'the screen did not change (the topic did not open)'; } else last = again; }
      if (ok) { shotStore.shots[t.id] = { img: await grab(v), label: t.title, tab: t.tab, at: Date.now() }; prev = last; done++; }
      else fails.push({ tab: t.tab, reason });
    }
  } finally { stream.getTracks().forEach((s) => s.stop()); go(returnTab); shotStore.running = false; shotStore.fails = fails; }
  return { done, fails };
}

/** Opens the screen stream once so many captures / recordings can share a single "Share this tab" click. */
export async function openScreen(): Promise<{ stream: MediaStream; video: HTMLVideoElement }> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c?: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) throw new Error('Recording the live terminal needs desktop Chrome or Edge.');
  const stream = await md.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 30 }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' } as unknown);
  const video = document.createElement('video'); video.srcObject = stream; video.muted = true; await video.play(); await sleep(600); return { stream, video };
}
/** Waits until the screen stopped changing (finished loading). Returns false if it never settled. */
export async function waitCalm(v: HTMLVideoElement, limitMs = 6500): Promise<boolean> {
  const started = Date.now(); let last = fingerprint(v); let calm = 0;
  while (Date.now() - started < limitMs) { await sleep(400); const cur = fingerprint(v); calm = frameDiff(last, cur) < 0.012 ? calm + 1 : 0; last = cur; if (calm >= 3) return true; }
  return false;
}
