import { loadImage } from './postVisuals';

export interface Shot { img: HTMLImageElement; label: string; tab: string }
/** Screens the agent visits and photographs. Kept outside React so captures survive the admin panel unmounting while the agent navigates. */
export const shotStore: { shots: Shot[]; running: boolean } = { shots: [], running: false };
export const CAPTURE_TABS = [
  { tab: 'DASHBOARD', label: 'Dashboard', wait: 3200 },
  { tab: 'FUNDAMENTAL_INDICATORS', label: 'Fundamental data', wait: 3800 },
  { tab: 'BACKTESTING', label: 'Backtesting', wait: 3800 },
  { tab: 'FREEHAND_WORKSPACE', label: 'Freehand canvas', wait: 3200 },
  { tab: 'SBT_MODELS', label: 'SBT models', wait: 3200 },
  { tab: 'PRO_TRADING', label: 'Premium TradingView', wait: 6500 },
];
const go = (tab: string) => window.dispatchEvent(new CustomEvent('primepipfx_navigate_tab', { detail: { tab } }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One permission click ("share this tab"), then the agent opens each terminal screen itself and takes an HD frame of it. */
export async function autoCaptureTerminal(returnTab = 'ADMIN', onStep?: (label: string, i: number, n: number) => void): Promise<Shot[]> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c?: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) throw new Error('Automatic capture needs desktop Chrome or Edge. On this device use Upload screenshot.');
  if (shotStore.running) throw new Error('Capture already running');
  const stream = await md.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 8 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' } as unknown);
  shotStore.running = true; const out: Shot[] = [];
  try {
    const v = document.createElement('video'); v.srcObject = stream; v.muted = true; await v.play(); await sleep(500);
    for (let i = 0; i < CAPTURE_TABS.length; i++) {
      const t = CAPTURE_TABS[i]; onStep?.(t.label, i + 1, CAPTURE_TABS.length);
      go(t.tab); await sleep(t.wait);
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')!.drawImage(v, 0, 0);
      out.push({ img: await loadImage(c.toDataURL('image/jpeg', 0.92)), label: t.label, tab: t.tab });
    }
  } finally { stream.getTracks().forEach((t) => t.stop()); go(returnTab); shotStore.running = false; }
  shotStore.shots = out; return out;
}
