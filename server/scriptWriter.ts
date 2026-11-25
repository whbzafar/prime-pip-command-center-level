import { compliant } from './socialAgent.js';

export interface ScriptScene { say: string; caption: string; focus: 'left' | 'center' | 'right'; zoom: number; scroll: number }
export interface TopicScript { hooks: string[]; scenes: ScriptScene[]; cta: string; caption: string; hashtags: string[]; title: string; keywords: string[]; source: 'gemini' | 'free-ai' }
export interface ScriptRequest { topic: { id: string; title: string; short: string; overview: string; features: string[] }; platform: string; language: 'en' | 'roman-urdu'; angle?: string; seed?: number }

const PLAYBOOK = `PLATFORM PLAYBOOK (from 2026 short-form research):
- Viewers decide in 1.5-3 seconds. The first on-screen words matter more than the first spoken words because many people watch muted.
- Structure: HOOK 0-3s, CONTEXT 3-8s, VALUE (show the feature working, one idea per scene), CTA at the end.
- Hook formulas that work: counter-intuitive claim ("Most traders ignore this tool"), pain point ("Still switching between 5 tabs?"), curiosity gap ("What this one screen tells you before every trade"), "stop doing X" framing, direct audience call-out ("Gold traders:"). Two formulas together beat one.
- Short sentences. Concrete words. Put the keyword someone would search in the on-screen text (SEO).
- Never promise profit, never show or imply guaranteed results, no "get rich", no income claims, no "signals that win". Present it as a TOOL for planning, risk and learning. Always end with the risk reminder.
- Avoid the same hook twice. Each scene must show something real from this specific feature.`;

function buildPrompt(r: ScriptRequest): string {
  const lang = r.language === 'roman-urdu' ? 'Write all spoken lines and captions in simple Roman Urdu (Urdu written in English letters) mixed naturally with English trading words, the way Pakistani students speak. Hashtags in English.' : 'Write in clear, simple, energetic English for an international audience of forex and gold (XAUUSD) traders.';
  return `You are a senior short-form video strategist and scriptwriter for PrimePipFX, a trading terminal built by Wahab Zafar. ${PLAYBOOK}

TOPIC (this video is ONLY about this feature): ${r.topic.title}
What it is: ${r.topic.short}
Details: ${r.topic.overview}
Key features: ${r.topic.features.join(' | ')}
Platform: ${r.platform}. ${r.angle ? `Angle to use: ${r.angle}.` : ''} Variation seed ${r.seed || 1} (make it clearly different from other seeds).
${lang}

Return ONLY JSON:
{"hooks":[5 different on-screen hooks, max 9 words each],
 "scenes":[4 or 5 objects {"say": spoken line max 14 words explaining one real thing this feature does, "caption": big on-screen text max 5 words, "focus":"left"|"center"|"right","zoom":1.0-1.4,"scroll":0-0.6}],
 "cta": short call to action mentioning primepipfx.site,
 "caption": the post caption body for ${r.platform} (hook line, 2-3 short value lines, CTA, ends with: Educational content, not financial advice. Trading carries risk.),
 "title": SEO title max 70 chars,
 "hashtags":[8 hashtags without #],
 "keywords":[6 search phrases]}`;
}

function parse(txt: string, source: TopicScript['source']): TopicScript | null {
  try {
    const j = JSON.parse(String(txt).replace(/^```json|```$/g, '').trim());
    const scenes: ScriptScene[] = (Array.isArray(j.scenes) ? j.scenes : []).slice(0, 6).map((s: any) => ({ say: String(s.say || '').slice(0, 140), caption: String(s.caption || '').slice(0, 48), focus: ['left', 'center', 'right'].includes(s.focus) ? s.focus : 'center', zoom: Math.min(1.5, Math.max(1, Number(s.zoom) || 1.1)), scroll: Math.min(0.8, Math.max(0, Number(s.scroll) || 0)) })).filter((s: ScriptScene) => s.say && s.caption);
    const hooks: string[] = (Array.isArray(j.hooks) ? j.hooks : []).map((h: any) => String(h).slice(0, 80)).filter(Boolean).slice(0, 6);
    if (scenes.length < 3 || hooks.length < 2 || !j.caption) return null;
    const all = `${hooks.join(' ')} ${scenes.map((s) => `${s.say} ${s.caption}`).join(' ')} ${j.caption} ${j.title || ''} ${j.cta || ''}`;
    if (!compliant(all)) return null;
    let caption = String(j.caption).trim(); if (!/not financial advice/i.test(caption)) caption += '\n\nEducational content, not financial advice. Trading carries risk.';
    return { hooks, scenes, cta: String(j.cta || 'Try it at primepipfx.site').slice(0, 80), caption, title: String(j.title || '').slice(0, 100), hashtags: (Array.isArray(j.hashtags) ? j.hashtags : []).map((h: any) => String(h).replace(/[^\p{L}\p{N}_]/gu, '')).filter((h: string) => h.length > 1).slice(0, 12), keywords: (Array.isArray(j.keywords) ? j.keywords : []).map(String).slice(0, 8), source };
  } catch { return null; }
}

const timeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Gemini first (when a key is set), then the free keyless Pollinations text API. Returns null when both fail so the app falls back to its built-in writer. */
export async function writeScript(ai: any, r: ScriptRequest): Promise<TopicScript | null> {
  const prompt = buildPrompt(r);
  if (ai) for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
    try { const res: any = await timeout(ai.models.generateContent({ model, contents: prompt, config: { temperature: 1, responseMimeType: 'application/json' } }), 20000); const s = parse(res.text, 'gemini'); if (s) return s; } catch { /* next */ }
  }
  for (const model of ['openai', 'mistral']) {
    try {
      const res = await timeout(fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, jsonMode: true, seed: r.seed || 1, messages: [{ role: 'user', content: prompt }] }) }), 25000);
      if (!res.ok) continue; const j: any = await res.json(); const s = parse(j?.choices?.[0]?.message?.content || '', 'free-ai'); if (s) return s;
    } catch { /* next */ }
  }
  return null;
}
