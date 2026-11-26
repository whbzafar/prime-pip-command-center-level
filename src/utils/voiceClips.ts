/* A real person's voice for every narration line. Clips are recorded in the studio, kept in this browser (Cache API),
   and used instead of the synthetic voice whenever a clip exists for the exact line. */
const CACHE = 'pp-voice-clips-v1';
const key = (line: string) => `https://voice.local/clip/${encodeURIComponent(line.trim())}`;

export async function saveClip(line: string, blob: Blob): Promise<void> { const c = await caches.open(CACHE); await c.put(key(line), new Response(blob, { headers: { 'content-type': blob.type || 'audio/webm' } })); }
export async function loadClipBlob(line: string): Promise<Blob | null> { try { const c = await caches.open(CACHE); const r = await c.match(key(line)); return r ? await r.blob() : null; } catch { return null; } }
export async function deleteClip(line: string): Promise<void> { try { const c = await caches.open(CACHE); await c.delete(key(line)); } catch { /* ignore */ } }
export async function hasClips(lines: string[]): Promise<boolean[]> { return Promise.all(lines.map(async (l) => !!(await loadClipBlob(l)))); }

/** Cuts silence from the start and end so recorded lines start and stop crisply. */
export function trimSilence(ac: AudioContext, b: AudioBuffer, threshold = 0.02): AudioBuffer {
  const d = b.getChannelData(0); let s = 0; let e = d.length - 1;
  while (s < e && Math.abs(d[s]) < threshold) s++;
  while (e > s && Math.abs(d[e]) < threshold) e--;
  s = Math.max(0, s - Math.round(b.sampleRate * 0.04)); e = Math.min(d.length - 1, e + Math.round(b.sampleRate * 0.08));
  const out = ac.createBuffer(1, Math.max(1, e - s + 1), b.sampleRate); out.getChannelData(0).set(d.subarray(s, e + 1)); return out;
}
export async function loadClipBuffer(ac: AudioContext, line: string): Promise<AudioBuffer | null> {
  const blob = await loadClipBlob(line); if (!blob) return null;
  try { return trimSilence(ac, await ac.decodeAudioData(await blob.arrayBuffer())); } catch { return null; }
}
