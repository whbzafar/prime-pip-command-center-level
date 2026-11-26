/* Live captions of the owner's own voice, using the browser's built-in speech recognition (free in Chrome and Edge).
   Urdu is recognised as ur-PK and shown in Urdu script. Every finished line is kept with its time so an .srt file
   can be saved next to the video. */

export interface CaptionLine { start: number; end: number; text: string }
export interface LiveCaptions { supported: boolean; current(): string; lines(): CaptionLine[]; stop(): void }

export function captionsSupported(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return typeof window !== 'undefined' && !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startLiveCaptions(lang = 'ur-PK'): LiveCaptions {
  const w = window as unknown as Record<string, any>;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return { supported: false, current: () => '', lines: () => [], stop: () => {} };
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  const done: CaptionLine[] = [];
  let interim = ''; let interimStart = 0; let stopped = false; let lastFinalAt = -10;
  const rec = new SR();
  rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.onresult = (e: any) => {
    let live = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]; const text = String(r[0]?.transcript || '').trim();
      if (!text) continue;
      if (r.isFinal) { done.push({ start: interim ? interimStart : Math.max(0, now() - 2), end: now(), text }); lastFinalAt = now(); interim = ''; }
      else live += (live ? ' ' : '') + text;
    }
    if (live && !interim) interimStart = now();
    interim = live;
  };
  // Chrome ends recognition after a pause; keep it going until we stop
  rec.onend = () => { if (!stopped) { try { rec.start(); } catch { /* already running */ } } };
  rec.onerror = () => { /* "no-speech" and network blips: onend restarts */ };
  try { rec.start(); } catch { /* ignore */ }
  return {
    supported: true,
    current: () => {
      if (interim) return interim;
      const last = done[done.length - 1];
      return last && now() - lastFinalAt < 2.2 ? last.text : '';
    },
    lines: () => [...done],
    stop: () => { stopped = true; try { rec.stop(); } catch { /* ignore */ } },
  };
}

const stamp = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const sec = Math.floor((ms % 60000) / 1000); const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};

/** SubRip subtitles from caption lines (shifted by `offset` seconds). */
export function toSrt(lines: CaptionLine[], offset = 0): string {
  return lines
    .filter((l) => l.text.trim())
    .map((l, i) => `${i + 1}\n${stamp(l.start - offset)} --> ${stamp(Math.max(l.end, l.start + 0.8) - offset)}\n${l.text.trim()}\n`)
    .join('\n');
}
