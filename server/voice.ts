import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/* Voice-over for the live tour videos.
   Primary: Azure AI Speech neural voices (free tier available). Urdu = ur-PK-UzmaNeural (Pakistani Urdu, female).
   Fallbacks (free, no key): Microsoft Edge online voice via node-edge-tts (same Uzma voice), then a keyless service whose Urdu is not guaranteed. */

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
  return { azure, region: process.env.AZURE_SPEECH_REGION || 'eastus', voice: VOICES.ur.label, primary: azure ? "Azure AI Speech (recommended)" : "Free Edge online voice (Uzma, no key); set AZURE_SPEECH_KEY for the most reliable Pakistani Urdu" };
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

export async function urduSpeech(text: string, lang: 'ur' | 'en' = 'ur'): Promise<Buffer | null> {
  const key = process.env.AZURE_SPEECH_KEY; const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (key) {
    try {
      const r = await timeout(fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'PrimePipFX' },
        body: buildSsml(text, lang),
      }), 20000);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch { /* fall through */ }
  }
  const edge = await edgeSpeech(text, lang);
  if (edge) return edge;
  try {
    const r = await timeout(fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`), 25000);
    if (r.ok && (r.headers.get('content-type') || '').includes('audio')) return Buffer.from(await r.arrayBuffer());
  } catch { /* none */ }
  return null;
}
