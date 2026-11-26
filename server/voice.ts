import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/* Voice-over for the live tour videos.
   Primary: Azure AI Speech neural voices (free tier available). Urdu = ur-PK-UzmaNeural (Pakistani Urdu, female).
   Fallbacks (free, no key): Microsoft Edge online voice via node-edge-tts (same Uzma voice), then Google Translate speech (free, keyless, Urdu female), then a keyless service whose Urdu is not guaranteed. */

const timeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
export const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export const VOICES = {
  ur: { name: 'ur-PK-UzmaNeural', lang: 'ur-PK', label: 'Uzma · Pakistani Urdu, female' },
  en: { name: 'en-US-JennyNeural', lang: 'en-US', label: 'Jenny · English, female' },
} as const;

export function buildSsml(text: string, lang: 'ur' | 'en' = 'ur'): string {
  const v = VOICES[lang];
  return `<speak version='1.0' xml:lang='${v.lang}'><voice xml:lang='${v.lang}' name='${v.name}'><prosody rate='-4%' pitch='+2%'>${escapeXml(text)}</prosody></voice></speak>`;
}

export function voiceStatus() {
  const azure = !!process.env.AZURE_SPEECH_KEY;
  return { azure, region: process.env.AZURE_SPEECH_REGION || 'eastus', voice: VOICES.ur.label, primary: azure ? "Azure AI Speech (recommended)" : "Free voices (Edge Uzma, then Google Urdu) need no key; set AZURE_SPEECH_KEY for the most natural Pakistani Urdu" };
}

/** Free Microsoft Edge online voices (same Uzma voice, no key) through the MIT-licensed node-edge-tts package. */
export async function edgeSpeech(text: string, lang: "ur" | "en" = "ur"): Promise<Buffer | null> {
  const path = join(tmpdir(), `pp-tts-${randomUUID()}.mp3`);
  try {
    const { EdgeTTS } = await import("node-edge-tts");
    const v = VOICES[lang];
    const tts = new EdgeTTS({ voice: v.name, lang: v.lang, outputFormat: "audio-24khz-96kbitrate-mono-mp3" });
    await timeout(tts.ttsPromise(text, path), 25000);
    const buf = await readFile(path);
    return buf.length ? buf : null;
  } catch { return null; }
  finally { unlink(path).catch(() => {}); }
}

/** Splits text into pieces of at most `max` characters, at sentence marks first, then at spaces. Pure, so it is unit tested. */
export function splitForTts(text: string, max = 180): string[] {
  const out: string[] = [];
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?۔؟])\s+/);
  let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (const s of sentences) {
    if (s.length > max) {
      push();
      for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > max) push(); cur = (cur + ' ' + w).trim(); }
      push();
    } else if ((cur + ' ' + s).trim().length > max) { push(); cur = s; } else cur = (cur + ' ' + s).trim();
  }
  push();
  return out;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
/** Free keyless Urdu or English voice from Google Translate speech (female). Text is cut into short pieces and joined. */
export async function googleSpeech(text: string, lang: 'ur' | 'en' = 'ur'): Promise<Buffer | null> {
  try {
    const parts = splitForTts(text, 180); if (!parts.length) return null;
    const bufs: Buffer[] = [];
    for (const q of parts) {
      const r = await timeout(fetch(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA, Referer: 'https://translate.google.com/' } }), 15000);
      if (!r.ok || !(r.headers.get('content-type') || '').includes('audio')) return null;
      bufs.push(Buffer.from(await r.arrayBuffer()));
    }
    const all = Buffer.concat(bufs); return all.length > 500 ? all : null;
  } catch { return null; }
}

const trCache = new Map<string, string>();
/** English to Urdu (script) through the free Google Translate web endpoint. Returns the input unchanged when it cannot translate. */
export async function translateUrdu(text: string): Promise<string> {
  const t = text.replace(/\s+/g, ' ').trim(); if (!t) return t;
  const hit = trCache.get(t); if (hit) return hit;
  try {
    const r = await timeout(fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${encodeURIComponent(t.slice(0, 900))}`, { headers: { 'User-Agent': UA } }), 12000);
    if (!r.ok) return t;
    const j: any = await r.json(); const ur = (j?.[0] || []).map((x: any) => x?.[0] || '').join('').trim();
    if (!/[\u0600-\u06FF]/.test(ur)) return t;
    if (trCache.size > 800) trCache.delete(trCache.keys().next().value as string);
    trCache.set(t, ur); return ur;
  } catch { return t; }
}

export async function urduSpeech(text: string, lang: 'ur' | 'en' = 'ur', trace?: string[]): Promise<Buffer | null> {
  const note = (m: string) => { trace?.push(m); };
  const key = process.env.AZURE_SPEECH_KEY; const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (key) {
    try {
      const r = await timeout(fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'PrimePipFX' },
        body: buildSsml(text, lang),
      }), 20000);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      note(`azure: HTTP ${r.status}`);
    } catch (e: any) { note(`azure: ${String(e?.message || e).slice(0, 80)}`); }
  }
  const edge = await edgeSpeech(text, lang);
  if (edge) { note('edge: ok'); return edge; }
  note('edge: failed (no audio)');
  const goog = await googleSpeech(text, lang);
  if (goog) { note('google: ok'); return goog; }
  note('google: failed (no audio)');
  try {
    const r = await timeout(fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`), 25000);
    if (r.ok && (r.headers.get('content-type') || '').includes('audio')) { note('pollinations: ok'); return Buffer.from(await r.arrayBuffer()); }
    note(`pollinations: HTTP ${r.status}`);
  } catch (e: any) { note(`pollinations: ${String(e?.message || e).slice(0, 80)}`); }
  return null;
}
