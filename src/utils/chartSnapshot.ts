/** Helpers that turn "what the chart looks like right now" into a compact JPEG for share links. */

/** Re-encode any image source as a JPEG data URL no wider than maxW (keeps share links small). */
export async function toJpeg(src: CanvasImageSource, w: number, h: number, maxW = 1600, q = 0.85): Promise<string> {
  const k = Math.min(1, maxW / w); const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const x = c.getContext('2d')!; x.fillStyle = '#0b1220'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}

/** The Pro chart's own renderer picture (indicators and drawings included). */
export async function proChartImage(chart: any): Promise<string | null> {
  try {
    const cv: HTMLCanvasElement | null = chart?.renderer?.screenshotCanvas?.() ?? null;
    if (cv) return await toJpeg(cv, cv.width, cv.height);
    const url: string | null = chart?.renderer?.screenshot?.() ?? null;
    if (!url) return null;
    const img = new Image(); img.src = url; await img.decode();
    return await toJpeg(img, img.naturalWidth, img.naturalHeight);
  } catch { return null; }
}

/**
 * The embedded TradingView feed cannot be read from outside its frame, so the picture is taken from the screen:
 * the browser asks the person to allow capturing THIS tab, one frame is taken and the chart area is cropped out.
 * Returns null when capture is unsupported or the person declines.
 */
export async function screenCropImage(el: HTMLElement | null): Promise<string | null> {
  const md: any = navigator.mediaDevices; if (!el || !md?.getDisplayMedia) return null;
  let stream: MediaStream | null = null;
  try {
    stream = await md.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' });
    const v = document.createElement('video'); v.muted = true; v.srcObject = stream; await v.play();
    await new Promise((r) => setTimeout(r, 450)); // first real frame
    const r = el.getBoundingClientRect(); const sx = v.videoWidth / window.innerWidth; const sy = v.videoHeight / window.innerHeight;
    const x = Math.max(0, r.left * sx), y = Math.max(0, r.top * sy), w = Math.min(v.videoWidth - x, r.width * sx), h = Math.min(v.videoHeight - y, r.height * sy);
    if (w < 50 || h < 50) return null;
    const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); c.getContext('2d')!.drawImage(v, x, y, w, h, 0, 0, c.width, c.height);
    return await toJpeg(c, c.width, c.height);
  } catch { return null; } finally { stream?.getTracks().forEach((t) => t.stop()); }
}
