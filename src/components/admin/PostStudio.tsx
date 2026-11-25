import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Copy, Download, ImagePlus, ThumbsDown, ThumbsUp, Upload } from 'lucide-react';
import JSZip from 'jszip';
import { FORMATS, VisualFormat, captureScreen, download, fileToImage, loadImage, renderCard, toBlob } from '../../utils/postVisuals';

export interface StudioPost {
  id: string; platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok'; title: string; caption: string; hashtags: string[]; cta: string;
  hooks: string[]; slides: string[]; beats: { t: string; onScreen: string; voice: string }[];
  score: { total: number; hook: number; clarity: number; seo: number; cta: number; tags: number; tips: string[] }; rating?: 'good' | 'bad';
}
const DEFAULT_FORMAT: Record<StudioPost['platform'], VisualFormat> = { facebook: 'portrait', instagram: 'portrait', youtube: 'thumb', tiktok: 'story' };
const bar = (n: number) => (n >= 75 ? 'bg-emerald-400' : n >= 55 ? 'bg-amber-400' : 'bg-red-400');

export const PostStudio: React.FC<{ post: StudioPost; onRate: (r: 'good' | 'bad') => void; onSaveHeadlines: (hooks: string[], slides: string[]) => Promise<void> }> = ({ post, onRate, onSaveHeadlines }) => {
  const [format, setFormat] = useState<VisualFormat>(DEFAULT_FORMAT[post.platform]);
  const [hooks, setHooks] = useState<string[]>(post.hooks.length ? post.hooks : [post.title]);
  const [slides, setSlides] = useState<string[]>(post.slides);
  const [hi, setHi] = useState(0);
  const [slide, setSlide] = useState(-1); // -1 = cover with headline
  const [bg, setBg] = useState<HTMLImageElement | null>(null);
  const [shot, setShot] = useState<HTMLImageElement | null>(null);
  const [msg, setMsg] = useState('');
  const view = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { loadImage('/assets/you-can-do-it-1280.jpg').then(setBg).catch(() => setBg(null)); }, []);
  const opts = useCallback((i: number) => i < 0
    ? { format, headline: hooks[hi] || post.title, sub: post.title !== hooks[hi] ? post.title : undefined, bg, shot, total: slides.length + 1, index: 0, cta: 'primepipfx.site' }
    : { format, headline: slides[i], bg, shot: i === 0 ? shot : null, total: slides.length + 1, index: i + 1, cta: i === slides.length - 1 ? 'primepipfx.site' : 'Swipe →' }, [format, hooks, hi, slides, bg, shot, post.title]);
  useEffect(() => {
    const c = renderCard(opts(slide)); const v = view.current; if (!v) return;
    v.width = c.width; v.height = c.height; v.getContext('2d')!.drawImage(c, 0, 0);
  }, [opts, slide]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2600); };
  const dl = async () => { download(await toBlob(renderCard(opts(slide))), `primepipfx-${post.platform}-${format}-${slide + 2}.png`); };
  const dlAll = async () => {
    const zip = new JSZip(); const n = slides.length;
    zip.file(`01-cover.png`, await toBlob(renderCard(opts(-1))));
    for (let i = 0; i < n; i++) zip.file(`${String(i + 2).padStart(2, '0')}-slide.png`, await toBlob(renderCard(opts(i))));
    zip.file('caption.txt', `${post.title}\n\n${post.caption}\n\n${post.hashtags.join(' ')}\n`);
    if (post.beats.length) zip.file('script.txt', post.beats.map((b) => `${b.t}\nON SCREEN: ${b.onScreen}\nVOICE: ${b.voice}\n`).join('\n'));
    download(await zip.generateAsync({ type: 'blob' }), `primepipfx-${post.platform}-pack.zip`); flash('Pack downloaded');
  };
  const copyImg = async () => {
    try { const b = await toBlob(renderCard(opts(slide))); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); flash('Image copied'); } catch { flash('Copy not supported here. Use Download.'); }
  };
  const cap = async () => { await navigator.clipboard?.writeText(`${post.title}\n\n${post.caption}\n\n${post.hashtags.join(' ')}`); flash('Caption copied'); };
  const script = async () => { await navigator.clipboard?.writeText(post.beats.map((b) => `${b.t}  |  ON SCREEN: ${b.onScreen}  |  VOICE: ${b.voice}`).join('\n')); flash('Script copied'); };
  const capture = async () => { try { setShot(await captureScreen()); flash('Captured. Pick the terminal tab or window in the picker.'); } catch (e: any) { flash(e?.name === 'NotAllowedError' ? 'Capture cancelled' : String(e?.message || e)); } };
  const up = async (f?: File | null) => { if (f) setShot(await fileToImage(f)); };
  const f = FORMATS[format];
  const input = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100';

  return (
    <div className="mt-3 grid gap-4 rounded-2xl border border-amber-400/30 bg-slate-950/70 p-3 lg:grid-cols-[minmax(0,320px)_1fr]" data-testid="post-studio">
      <div>
        <canvas ref={view} className="w-full rounded-xl border border-slate-700 bg-black" style={{ aspectRatio: `${f.w}/${f.h}` }} aria-label="Post preview" />
        <p className="mt-1 text-center text-[11px] text-slate-400">{f.w}×{f.h} PNG · {f.for}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={dl} className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900"><Download className="h-3.5 w-3.5" />Download PNG</button>
          <button type="button" onClick={dlAll} className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-100"><Download className="h-3.5 w-3.5" />Full pack (ZIP)</button>
          <button type="button" onClick={copyImg} className="inline-flex items-center gap-1 rounded-lg bg-slate-700/70 px-3 py-1.5 text-xs font-semibold text-slate-100"><Copy className="h-3.5 w-3.5" />Copy image</button>
          <button type="button" onClick={cap} className="inline-flex items-center gap-1 rounded-lg bg-slate-700/70 px-3 py-1.5 text-xs font-semibold text-slate-100"><Copy className="h-3.5 w-3.5" />Copy caption</button>
        </div>
        {msg && <p className="mt-2 text-xs text-emerald-300" role="status">{msg}</p>}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FORMATS) as VisualFormat[]).map((k) => <button key={k} type="button" onClick={() => setFormat(k)} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${format === k ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{FORMATS[k].label}</button>)}
        </div>

        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Screen image (the real terminal)</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={capture} className="inline-flex items-center gap-1 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-200"><Camera className="h-3.5 w-3.5" />Capture screen</button>
            <button type="button" onClick={() => file.current?.click()} className="inline-flex items-center gap-1 rounded-lg bg-slate-700/70 px-3 py-1.5 text-xs font-semibold text-slate-100"><Upload className="h-3.5 w-3.5" />Upload screenshot</button>
            {shot && <button type="button" onClick={() => setShot(null)} className="rounded-lg px-3 py-1.5 text-xs text-slate-400">Remove</button>}
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void up(e.target.files?.[0])} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Open the terminal in another tab, press Capture, pick that tab. The picture is placed inside a framed phone-style card. Nothing is uploaded.</p>
        </div>

        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Headline (tap a version, or edit)</div>
          <div className="space-y-1.5">
            {hooks.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <button type="button" onClick={() => { setHi(i); setSlide(-1); }} aria-label={`Use headline ${i + 1}`} className={`h-4 w-4 shrink-0 rounded-full border ${hi === i ? 'border-amber-300 bg-amber-300' : 'border-slate-600'}`} />
                <input value={h} onChange={(e) => setHooks(hooks.map((x, j) => (j === i ? e.target.value : x)))} onFocus={() => { setHi(i); setSlide(-1); }} className={input} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Carousel slides ({slides.length + 1} images)</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setSlide(-1)} className={`rounded-lg border px-2.5 py-1 text-xs ${slide === -1 ? 'border-amber-300 text-amber-100' : 'border-slate-700 text-slate-400'}`}>Cover</button>
            {slides.map((s, i) => <button key={i} type="button" onClick={() => setSlide(i)} className={`rounded-lg border px-2.5 py-1 text-xs ${slide === i ? 'border-amber-300 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{i + 2}</button>)}
          </div>
          {slide >= 0 && <input value={slides[slide]} onChange={(e) => setSlides(slides.map((x, j) => (j === slide ? e.target.value : x)))} className={`${input} mt-1.5`} aria-label="Slide text" />}
          <button type="button" onClick={() => void onSaveHeadlines(hooks, slides).then(() => flash('Saved')).catch((e) => flash(String(e?.message || e)))} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-700/70 px-3 py-1.5 text-xs font-semibold text-slate-100"><ImagePlus className="h-3.5 w-3.5" />Save text edits</button>
        </div>

        {post.beats.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">Video script (TikTok · Reels · Shorts)
              <button type="button" onClick={script} className="rounded-md bg-slate-700/70 px-2 py-0.5 text-[10px] normal-case text-slate-100">Copy script</button></div>
            <div className="space-y-1 rounded-lg border border-slate-700 p-2 text-xs">
              {post.beats.map((b, i) => <div key={i} className="grid grid-cols-[52px_1fr] gap-2"><span className="font-mono text-amber-300">{b.t}</span><span className="text-slate-200"><b>{b.onScreen}</b><span className="text-slate-400"> — {b.voice}</span></span></div>)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Film your screen while you say each line; use the slide images as cutaways. Keep it under 25 seconds.</p>
          </div>
        )}

        <div className="rounded-lg border border-slate-700 p-2">
          <div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold uppercase tracking-wider text-slate-400">Content analysis</span><span className={`rounded-full px-2 py-0.5 font-bold text-slate-900 ${bar(post.score.total)}`}>{post.score.total}/100</span></div>
          {([['Hook', post.score.hook], ['Clarity', post.score.clarity], ['SEO', post.score.seo], ['Call to action', post.score.cta], ['Hashtags', post.score.tags]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="mb-1 grid grid-cols-[96px_1fr_28px] items-center gap-2 text-[11px] text-slate-300"><span>{k}</span><div className="h-1.5 rounded bg-slate-800"><div className={`h-1.5 rounded ${bar(v)}`} style={{ width: `${v}%` }} /></div><span>{v}</span></div>
          ))}
          {post.score.tips.length > 0 && <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-200">{post.score.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
          <p className="mt-2 text-[11px] text-slate-500">This score checks writing quality. It cannot see real views. After you post, tell the agent how it went so it picks that topic again or avoids it.</p>
          <div className="mt-1.5 flex gap-1.5">
            <button type="button" onClick={() => onRate('good')} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${post.rating === 'good' ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-300'}`}><ThumbsUp className="h-3.5 w-3.5" />It performed well</button>
            <button type="button" onClick={() => onRate('bad')} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${post.rating === 'bad' ? 'border-red-400 text-red-300' : 'border-slate-700 text-slate-300'}`}><ThumbsDown className="h-3.5 w-3.5" />Weak</button>
          </div>
        </div>
      </div>
    </div>
  );
};
