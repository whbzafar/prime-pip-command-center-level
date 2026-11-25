import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, Image as ImageIcon, RefreshCw, Sparkles, Type, Wand2 } from 'lucide-react';
import JSZip from 'jszip';
import { autoCaptureTerminal, shotStore, type Shot } from '../../utils/agentCapture';
import { makeVideo } from '../../utils/agentVideo';
import { ART_PROMPTS, FORMATS, LAYOUTS, Layout, THEMES, VisualFormat, aiArt, download, loadImage, renderVariant, toBlob } from '../../utils/postVisuals';
import { getStoredToken } from '../../utils/authClient';

type Platform = 'facebook' | 'instagram' | 'youtube' | 'tiktok';
interface P { pillar: string; title: string; caption: string; hashtags: string[]; hooks: string[]; slides: string[]; score: { total: number; tips: string[] } }
const PLATFORMS: { id: Platform; label: string; format: VisualFormat }[] = [
  { id: 'instagram', label: 'Instagram', format: 'portrait' }, { id: 'facebook', label: 'Facebook', format: 'portrait' },
  { id: 'tiktok', label: 'TikTok', format: 'story' }, { id: 'youtube', label: 'YouTube', format: 'thumb' },
];
const LAYOUT_NAME: Record<Layout, string> = { hero: 'Hero', chart: 'Chart', features: 'Features', quote: 'Story', shot: 'Terminal' };
const rnd = (n: number) => Math.floor(Math.random() * n);

export const QuickPost: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [format, setFormat] = useState<VisualFormat>('portrait');
  const [post, setPost] = useState<P | null>(null);
  const [text, setText] = useState('');
  const [layout, setLayout] = useState<Layout>('features');
  const [theme, setTheme] = useState(0);
  const [seed, setSeed] = useState(1);
  const [hi, setHi] = useState(0);
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  const [hero, setHero] = useState<HTMLImageElement | null>(null);
  const [shots, setShots] = useState<Shot[]>(shotStore.shots);
  const [si, setSi] = useState(0);
  const [step, setStep] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const seen = useRef<string[]>([]);
  const view = useRef<HTMLCanvasElement>(null);
  const hdr = () => { const t = getStoredToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }; };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2800); };

  useEffect(() => { loadImage('/assets/you-can-do-it-1280.jpg').then(setHero).catch(() => setHero(null)); }, []);

  const newLook = useCallback(() => { if (shotStore.shots.length) { setLayout('shot'); setSi(rnd(shotStore.shots.length)); } else setLayout(LAYOUTS[rnd(LAYOUTS.length)]); setTheme(rnd(THEMES.length)); setSeed(1 + rnd(99999)); setArt(null); }, []);
  const newText = useCallback(async (pf: Platform = platform) => {
    setBusy('text');
    try {
      const r = await fetch('/api/admin/social-agent/preview', { method: 'POST', headers: hdr(), credentials: 'include', body: JSON.stringify({ platform: pf, variant: seen.current.length, exclude: seen.current.slice(-4) }) });
      const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Could not write the post');
      const p: P = j.post; seen.current = [...seen.current, p.pillar].slice(-8);
      setPost(p); setText(`${p.caption}\n\n${p.hashtags.join(' ')}`); setHi(0);
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(''); }
  }, [platform]);
  const regenerate = useCallback(async () => { newLook(); await newText(); }, [newLook, newText]);
  useEffect(() => { void regenerate(); /* first post on open */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opts = useCallback(() => {
    const headline = post?.hooks[hi] || post?.title || 'Everything in one app';
    return { format, layout, theme, seed, headline, sub: post?.title && post.title !== headline ? post.title : undefined, slides: post?.slides || [], art, hero, cta: 'primepipfx.site', shot: shots[si]?.img || null, shotLabel: shots[si]?.label };
  }, [post, hi, format, layout, theme, seed, art, hero, shots, si]);
  useEffect(() => {
    const v = view.current; if (!v) return; const c = renderVariant(opts()); v.width = c.width; v.height = c.height; v.getContext('2d')!.drawImage(c, 0, 0);
  }, [opts]);

  const pickPlatform = (p: (typeof PLATFORMS)[number]) => { setPlatform(p.id); setFormat(p.format); void newText(p.id); };
  const makeArt = async () => {
    if (!post) return; setBusy('art'); flash('Creating AI artwork… up to 40 seconds');
    const { w, h } = FORMATS[format]; const img = await aiArt(`${ART_PROMPTS[post.pillar] || ART_PROMPTS['all-in-one']}, ${THEMES[theme].name} accent colors`, w, h, seed);
    setBusy(''); if (img) { setArt(img); flash('AI artwork added'); } else flash('The free artwork service is busy. Try again, or keep the designed look.');
  };
  const capture = async () => {
    setBusy('cap'); setStep('Choose “This tab” and click Share. The agent does the rest.');
    try { const r = await autoCaptureTerminal('ADMIN', (l, i, n) => setStep(`Photographing ${l} (${i}/${n})…`)); setShots(r); setSi(0); setLayout('shot'); flash(`Captured ${r.length} real terminal screens`); }
    catch (e: any) { flash(String(e?.message || 'Capture cancelled')); } finally { setBusy(''); setStep(''); }
  };
  const video = async () => {
    setBusy('vid');
    try {
      const heads = [post?.hooks[hi] || post?.title || 'Everything in one app', ...(post?.slides || [])].filter(Boolean);
      const blob = await makeVideo(shots, { theme, seed, headline: '', slides: post?.slides || [], cta: 'primepipfx.site' }, heads, 2.6, (p) => setStep(`Making video ${Math.round(p * 100)}%`));
      download(blob, `${name}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`); flash('Video downloaded (1080×1920, ready for TikTok / Reels / Shorts)');
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(''); setStep(''); }
  };
  const png = async () => toBlob(renderVariant(opts()));
  const name = `primepipfx-${platform}-${Date.now().toString(36)}`;
  const dlImg = async () => download(await png(), `${name}.png`);
  const dlTxt = () => download(new Blob([text], { type: 'text/plain' }), `${name}.txt`);
  const dlBoth = async () => { const z = new JSZip(); z.file('post.png', await png()); z.file('post.txt', text); download(await z.generateAsync({ type: 'blob' }), `${name}.zip`); flash('Downloaded image and text'); };
  const copyTxt = async () => { await navigator.clipboard?.writeText(text); flash('Text copied'); };
  const copyImg = async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': await png() })]); flash('Image copied'); } catch { flash('Copy not supported here. Use Download.'); } };
  const f = FORMATS[format]; const btn = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold';

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 via-slate-900/70 to-violet-500/10 p-4" data-testid="quick-post">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Wand2 className="h-5 w-5 text-amber-300" />
        <h3 className="text-base font-bold text-white">Quick Post — image + text, ready to use</h3>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => <button key={p.id} type="button" onClick={() => pickPlatform(p)} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${platform === p.id ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{p.label}</button>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div>
          <div className="relative">
            <canvas ref={view} className="w-full rounded-xl border border-slate-700 bg-black" style={{ aspectRatio: `${f.w}/${f.h}` }} aria-label="Generated post image" />
            {busy && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50"><RefreshCw className="h-6 w-6 animate-spin text-amber-300" /></div>}
          </div>
          <p className="mt-1 text-center text-[11px] text-slate-400">{f.w}×{f.h} PNG · {LAYOUT_NAME[layout]} · {THEMES[theme].name}</p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void regenerate()} disabled={!!busy} className={`${btn} bg-amber-400 text-slate-900 disabled:opacity-60`}><RefreshCw className={`h-4 w-4 ${busy === 'text' ? 'animate-spin' : ''}`} />Regenerate</button>
            <button type="button" onClick={newLook} className={`${btn} bg-slate-700/70 text-slate-100`}><ImageIcon className="h-4 w-4" />New image look</button>
            <button type="button" onClick={() => void newText()} disabled={!!busy} className={`${btn} bg-slate-700/70 text-slate-100`}><Type className="h-4 w-4" />New text</button>
            <button type="button" onClick={() => void capture()} disabled={!!busy} className={`${btn} bg-sky-500/25 text-sky-100`} data-testid="auto-capture"><ImageIcon className="h-4 w-4" />Auto-capture terminal</button>
            {shots.length > 0 && <button type="button" onClick={() => void video()} disabled={!!busy} className={`${btn} bg-rose-500/25 text-rose-100`} data-testid="make-video"><Wand2 className="h-4 w-4" />Make video (TikTok/Reels/Shorts)</button>}
            <button type="button" onClick={() => void makeArt()} disabled={!!busy || !post} className={`${btn} bg-violet-500/25 text-violet-100`}><Sparkles className="h-4 w-4" />AI artwork (free)</button>
          </div>
          {step && <p className="text-xs text-sky-300" role="status">{step}</p>}
          {shots.length > 0 && <div className="flex flex-wrap gap-1.5">{shots.map((sh, i) => <button key={sh.tab} type="button" onClick={() => { setSi(i); setLayout('shot'); }} className={`rounded-lg border px-2 py-1 text-[11px] ${layout === 'shot' && si === i ? 'border-sky-300 text-sky-100' : 'border-slate-700 text-slate-400'}`}>{sh.label}</button>)}</div>}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['portrait', 'story', 'square', 'landscape', 'thumb'] as VisualFormat[]).map((k) => <button key={k} type="button" onClick={() => setFormat(k)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${format === k ? 'border-amber-300 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{FORMATS[k].label}</button>)}
            <span className="mx-1 text-slate-600">|</span>
            {[...LAYOUTS, ...(shots.length ? (['shot'] as Layout[]) : [])].map((l) => <button key={l} type="button" onClick={() => { setLayout(l); setArt(null); }} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${layout === l ? 'border-sky-300 text-sky-100' : 'border-slate-700 text-slate-400'}`}>{LAYOUT_NAME[l]}</button>)}
            <span className="mx-1 text-slate-600">|</span>
            {THEMES.map((t, i) => <button key={t.name} type="button" aria-label={`${t.name} colors`} onClick={() => setTheme(i)} className={`h-5 w-5 rounded-full border-2 ${theme === i ? 'border-white' : 'border-transparent'}`} style={{ background: `linear-gradient(135deg, ${t.a}, ${t.b})` }} />)}
          </div>
          {post && post.hooks.length > 1 && (
            <div className="flex flex-wrap gap-1.5">{post.hooks.map((h, i) => <button key={i} type="button" onClick={() => setHi(i)} className={`rounded-lg border px-2 py-1 text-[11px] ${hi === i ? 'border-amber-300 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{h}</button>)}</div>
          )}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" aria-label="Post text" placeholder="Writing your post…" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={dlBoth} className={`${btn} bg-emerald-500/25 text-emerald-100`}><Download className="h-4 w-4" />Download image + text</button>
            <button type="button" onClick={dlImg} className={`${btn} bg-slate-700/70 text-slate-100`}><Download className="h-4 w-4" />Image (PNG)</button>
            <button type="button" onClick={dlTxt} className={`${btn} bg-slate-700/70 text-slate-100`}><Download className="h-4 w-4" />Text (.txt)</button>
            <button type="button" onClick={copyTxt} className={`${btn} bg-slate-700/70 text-slate-100`}><Copy className="h-4 w-4" />Copy text</button>
            <button type="button" onClick={copyImg} className={`${btn} bg-slate-700/70 text-slate-100`}><Copy className="h-4 w-4" />Copy image</button>
          </div>
          {post && <p className="text-[11px] text-slate-400">Writing score {post.score.total}/100{post.score.tips[0] ? ` · tip: ${post.score.tips[0]}` : ''}</p>}
          {msg && <p className="text-xs text-emerald-300" role="status">{msg}</p>}
        </div>
      </div>
    </div>
  );
};
