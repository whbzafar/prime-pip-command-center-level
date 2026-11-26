/* Urdu female voice that runs entirely inside the visitor's browser (no server, no key, no network to a speech company).
   Engine: Piper VITS model (urdu_female.onnx) on onnxruntime-web, with the espeak-ng phonemizer (piper-wasm).
   The runtime files are self-hosted under /piper; the 60 MB model is downloaded once from Hugging Face and cached. */
import * as ort from 'onnxruntime-web/wasm';

const MODEL = 'https://huggingface.co/ArmanMunir/fetchly-urdu-tts-piper/resolve/main/urdu_female.onnx';
const CONFIG = 'https://huggingface.co/ArmanMunir/fetchly-urdu-tts-piper/resolve/main/urdu_female.onnx.json';
const CACHE = 'pp-urdu-voice-v1';

interface PiperConfig { audio: { sample_rate: number }; espeak: { voice: string }; inference: { noise_scale: number; length_scale: number; noise_w: number }; num_speakers: number; phoneme_id_map: Record<string, number[]> }
let session: ort.InferenceSession | null = null; let config: PiperConfig | null = null; let loading: Promise<void> | null = null;
let phonemizeFactory: ((m: Record<string, unknown>) => Promise<any>) | null = null;

async function cached(url: string, onProgress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  try { const c = await caches.open(CACHE); const hit = await c.match(url); if (hit) return await hit.arrayBuffer(); } catch { /* cache unavailable */ }
  const res = await fetch(url); if (!res.ok) throw new Error(`Voice model download failed (HTTP ${res.status})`);
  const total = Number(res.headers.get('content-length') || 0); const reader = res.body?.getReader(); const parts: Uint8Array[] = []; let got = 0;
  if (reader) { for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress?.(got, total); } }
  const buf = reader ? await new Blob(parts as BlobPart[]).arrayBuffer() : await res.arrayBuffer();
  try { const c = await caches.open(CACHE); await c.put(url, new Response(buf.slice(0))); } catch { /* cache unavailable */ }
  return buf;
}
function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => { if ((window as any).createPiperPhonemize) return res(); const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('Could not load the phonemizer')); document.head.appendChild(s); });
}

export function urduVoiceReady(): boolean { return !!session; }
/** Loads the model once (about 60 MB the first time, cached afterwards). */
export function loadUrduVoice(onProgress?: (label: string) => void): Promise<void> {
  if (session && config) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    onProgress?.('Loading the Urdu voice engine');
    await loadScript('/piper/piper_phonemize.js'); phonemizeFactory = (window as any).createPiperPhonemize;
    ort.env.wasm.numThreads = 1; ort.env.wasm.wasmPaths = '/piper/ort/';
    config = JSON.parse(new TextDecoder().decode(await cached(CONFIG)));
    const model = await cached(MODEL, (l, t) => onProgress?.(`Downloading the Urdu voice (${Math.round((l / (t || 63_516_051)) * 100)}%) — one time only`));
    onProgress?.('Starting the Urdu voice');
    session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
  })().catch((e) => { loading = null; session = null; throw e; });
  return loading;
}

async function phonemeIds(text: string): Promise<number[]> {
  return await new Promise<number[]>((resolve, reject) => {
    (async () => {
      const mod = await phonemizeFactory!({
        print: (d: string) => { try { resolve(JSON.parse(d).phoneme_ids); } catch (e) { reject(e); } },
        printErr: () => { /* espeak warnings */ },
        locateFile: (u: string) => `/piper/${u}`,
      });
      mod.callMain(['-l', config!.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
    })().catch(reject);
  });
}

/** Splits at sentence marks so each piece is short enough for one pass. */
function pieces(text: string): string[] {
  const out: string[] = []; let cur = '';
  for (const s of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?۔؟])\s+/)) { if ((cur + ' ' + s).length > 220 && cur) { out.push(cur.trim()); cur = s; } else cur = (cur + ' ' + s).trim(); }
  if (cur.trim()) out.push(cur.trim()); return out;
}

/** Speaks `text` (Urdu script) and returns mono PCM at the model's sample rate. */
export async function speakUrdu(text: string, onProgress?: (label: string) => void): Promise<{ pcm: Float32Array; sampleRate: number }> {
  await loadUrduVoice(onProgress);
  const sr = config!.audio.sample_rate; const chunks: Float32Array[] = [];
  for (const piece of pieces(text)) {
    const ids = await phonemeIds(piece); if (!ids?.length) continue;
    const feeds: Record<string, ort.Tensor> = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([config!.inference.noise_scale, config!.inference.length_scale, config!.inference.noise_w]), [3]),
    };
    if (config!.num_speakers > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await session!.run(feeds); chunks.push(new Float32Array((out.output.data as Float32Array)));
    chunks.push(new Float32Array(Math.round(sr * 0.18))); // short breath between sentences
  }
  const total = chunks.reduce((a, c) => a + c.length, 0); if (!total) throw new Error('The Urdu voice produced no sound');
  const pcm = new Float32Array(total); let o = 0; for (const c of chunks) { pcm.set(c, o); o += c.length; }
  return { pcm, sampleRate: sr };
}

export function toAudioBuffer(ac: AudioContext, r: { pcm: Float32Array; sampleRate: number }): AudioBuffer {
  const b = ac.createBuffer(1, r.pcm.length, r.sampleRate); b.getChannelData(0).set(r.pcm); return b;
}
