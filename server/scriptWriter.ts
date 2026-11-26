import { compliant } from './socialAgent.js';

export interface ScriptScene { say: string; caption: string; focus: 'left' | 'center' | 'right'; zoom: number; scroll: number; urdu?: string }
export interface TopicScript { hooks: string[]; hooksUrdu?: string[]; scenes: ScriptScene[]; cta: string; ctaUrdu?: string; caption: string; hashtags: string[]; title: string; keywords: string[]; source: 'gemini' | 'free-ai' }
export interface ScriptRequest { topic: { id: string; title: string; short: string; overview: string; features: string[] }; platform: string; language: 'en' | 'roman-urdu'; angle?: string; seed?: number }

const PLAYBOOK = `PLATFORM PLAYBOOK (from 2026 short-form research):
- Viewers decide in 1.5-3 seconds. The first on-screen words matter more than the first spoken words because many people watch muted.
- Structure: HOOK 0-3s, CONTEXT 3-8s, VALUE (show the feature working, one idea per scene), CTA at the end.
- Hook formulas that work: counter-intuitive claim, pain point, curiosity gap, "stop doing X", direct audience call-out. Two formulas together beat one.
- Short sentences. Concrete words. Put the keyword someone would search in the on-screen text (SEO).
- Never promise profit, never imply guaranteed results, no "get rich", no income claims. Present it as a TOOL for planning, risk and learning.
- Avoid the same hook twice. Each scene must show something real from this specific feature.`;

export function buildPrompt(r: ScriptRequest): string {
  const ur = r.language === 'roman-urdu';
  const lang = ur
    ? 'LANGUAGE: "hooks", "caption" and each scene "caption" and "say" are in ROMAN URDU (Urdu written in English letters, the everyday Pakistani style students use, mixing English trading words like gold, chart, lot size). Hashtags stay in English. ALSO give the spoken narration in URDU SCRIPT (standard, warm, conversational Pakistani Urdu, written for a female narrator): "hooksUrdu" (the 5 hooks, same order), each scene "urdu" (max 14 words), and "ctaUrdu".'
    : 'LANGUAGE: clear, simple, energetic English for an international audience of forex and gold (XAUUSD) traders.';
  const sceneUrdu = ur ? ',"urdu":"spoken narration in Urdu script, max 14 words"' : '';
  const extra = ur ? ',"hooksUrdu":[5 Urdu-script hooks],"ctaUrdu":"Urdu-script call to action"' : '';
  return `You are a senior short-form video strategist and scriptwriter for PrimePipFX, a trading terminal built by Wahab Zafar. ${PLAYBOOK}

TOPIC (this video is ONLY about this feature): ${r.topic.title}
What it is: ${r.topic.short}
Details: ${r.topic.overview}
Key features: ${r.topic.features.join(' | ')}
Platform: ${r.platform}. ${r.angle ? `Angle: ${r.angle}.` : ''} Variation seed ${r.seed || 1} (make it clearly different from other seeds).
${lang}

Return ONLY JSON:
{"hooks":[5 different on-screen hooks, max 9 words each],
 "scenes":[4 or 5 objects {"say": spoken line max 14 words explaining one real thing this feature does, "caption": big on-screen text max 5 words, "focus":"left"|"center"|"right","zoom":1.0-1.4,"scroll":0-0.6${sceneUrdu}}],
 "cta": short call to action mentioning primepipfx.site,
 "caption": the post caption for ${r.platform} (hook line, 2-3 short value lines, CTA, ends with: Educational content, not financial advice. Trading carries risk.),
 "title": SEO title max 70 chars,
 "hashtags":[8 hashtags without #],
 "keywords":[6 search phrases]${extra}}`;
}

export function parseScript(txt: string, source: TopicScript['source']): TopicScript | null {
  try {
    const j = JSON.parse(String(txt).replace(/^```json|```$/g, '').trim());
    const scenes: ScriptScene[] = (Array.isArray(j.scenes) ? j.scenes : []).slice(0, 6).map((s: any) => ({
      say: String(s.say || '').slice(0, 140), caption: String(s.caption || '').slice(0, 48),
      focus: (['left', 'center', 'right'].includes(s.focus) ? s.focus : 'center') as ScriptScene['focus'],
      zoom: Math.min(1.5, Math.max(1, Number(s.zoom) || 1.1)), scroll: Math.min(0.8, Math.max(0, Number(s.scroll) || 0)),
      urdu: s.urdu ? String(s.urdu).slice(0, 240) : undefined,
    })).filter((s: ScriptScene) => s.say && s.caption);
    const hooks: string[] = (Array.isArray(j.hooks) ? j.hooks : []).map((h: any) => String(h).slice(0, 80)).filter(Boolean).slice(0, 6);
    if (scenes.length < 3 || hooks.length < 2 || !j.caption) return null;
    const hooksUrdu = Array.isArray(j.hooksUrdu) ? j.hooksUrdu.map((h: any) => String(h).slice(0, 120)).filter(Boolean).slice(0, 6) : undefined;
    const all = `${hooks.join(' ')} ${scenes.map((s) => `${s.say} ${s.caption}`).join(' ')} ${j.caption} ${j.title || ''} ${j.cta || ''}`;
    if (!compliant(all)) return null;
    let caption = String(j.caption).trim(); if (!/not financial advice/i.test(caption)) caption += '\n\nEducational content, not financial advice. Trading carries risk.';
    return {
      hooks, hooksUrdu, scenes, cta: String(j.cta || 'Try it at primepipfx.site').slice(0, 80), ctaUrdu: j.ctaUrdu ? String(j.ctaUrdu).slice(0, 160) : undefined,
      caption, title: String(j.title || '').slice(0, 100),
      hashtags: (Array.isArray(j.hashtags) ? j.hashtags : []).map((h: any) => String(h).replace(/[^\p{L}\p{N}_]/gu, '')).filter((h: string) => h.length > 1).slice(0, 12),
      keywords: (Array.isArray(j.keywords) ? j.keywords : []).map(String).slice(0, 8), source,
    };
  } catch { return null; }
}

const timeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Gemini first (when a key is set), then the free keyless text API. Null when both fail, so the app uses its built-in writer. */
export async function writeScript(ai: any, r: ScriptRequest): Promise<TopicScript | null> {
  const prompt = buildPrompt(r);
  if (ai) for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
    try { const res: any = await timeout(ai.models.generateContent({ model, contents: prompt, config: { temperature: 1, responseMimeType: 'application/json' } }), 25000); const s = parseScript(res.text, 'gemini'); if (s) return s; } catch { /* next */ }
  }
  for (const model of ['openai', 'mistral']) {
    try {
      const res = await timeout(fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, jsonMode: true, seed: r.seed || 1, messages: [{ role: 'user', content: prompt }] }) }), 30000);
      if (!res.ok) continue; const j: any = await res.json(); const s = parseScript(j?.choices?.[0]?.message?.content || '', 'free-ai'); if (s) return s;
    } catch { /* next */ }
  }
  return null;
}
