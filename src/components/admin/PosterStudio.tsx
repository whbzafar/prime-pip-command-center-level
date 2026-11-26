import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Download, Images, Palette } from 'lucide-react';
import { FORMATS, type VisualFormat, download, toBlob } from '../../utils/postVisuals';
import { getStoredToken } from '../../utils/authClient';
import { getTopics } from '../../utils/topicContent';
import { DEFAULT_LOOK, carouselSlides, loadLogo, palette, renderGraphic, textFor, type BrandLook, type PosterData, type PosterKind } from '../../utils/posterStudio';

const api = async (path: string, method = 'GET', body?: unknown): Promise<any> => {
  const t = getStoredToken(); const r = await fetch(`/api/admin/social-brain${path}`, { method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || `Request failed (${r.status})`); return j;
};
const box = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const btn = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60';
const KINDS: { id: PosterKind; label: string }[] = [{ id: 'poster', label: 'Promotional poster' }, { id: 'quote', label: 'Quote card' }, { id: 'infographic', label: 'Infographic' }, { id: 'event', label: 'Event announcement' }, { id: 'story', label: 'Story graphic' }];

export const PosterStudio: React.FC = () => {
  const topics = useMemo(() => getTopics(), []);
  const [look, setLook] = useState<BrandLook>(DEFAULT_LOOK); const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [kind, setKind] = useState<PosterKind>('poster'); const [format, setFormat] = useState<VisualFormat>('square');
  const [tid, setTid] = useState(topics[0]?.id || ''); const topic = topics.find((t) => t.id === tid);
  const [f, setF] = useState({ eyebrow: '', headline: '', sub: '', items: '', cta: 'Open primepipfx.site', quote: '', author: '', date: '', time: '', venue: '', showSlogan: false });
  const [gate, setGate] = useState<{ pass: boolean; blockers: string[]; warnings: string[] } | null>(null);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const view = useRef<HTMLCanvasElement>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  useEffect(() => { void (async () => { try { const j = await api(''); const b = j.brand; const l: BrandLook = { name: b.name, site: b.site, colors: b.colors || [], logoUrl: b.logoUrl || '', slogans: b.slogans || [], founder: b.founder }; setLook(l); setLogo(await loadLogo(l.logoUrl)); } catch { /* defaults */ } })(); }, []);

  const data = useMemo<PosterData>(() => {
    const items = f.items.split('\n').map((s) => s.trim()).filter(Boolean);
    return { kind, eyebrow: f.eyebrow || undefined, headline: kind === 'quote' ? (f.quote || f.headline) : f.headline, sub: f.sub || undefined, items: items.length ? items : undefined, cta: f.cta || undefined, quote: f.quote || undefined, author: f.author || undefined, date: f.date || undefined, time: f.time || undefined, venue: f.venue || undefined, showSlogan: f.showSlogan };
  }, [kind, f]);

  useEffect(() => { const v = view.current; if (!v || !data.headline) return; void renderGraphic(data, look, format, logo).then((c) => { v.width = c.width; v.height = c.height; v.getContext('2d')!.drawImage(c, 0, 0); }); }, [data, look, format, logo]);

  const fillFromTopic = () => { if (!topic) return; setF({ ...f, eyebrow: look.name, headline: topic.title, sub: topic.short, items: topic.features.slice(0, 5).join('\n') }); setKind(kind === 'quote' ? 'poster' : kind); };
  const eventMissing = kind === 'event' && (!f.date.trim() || !f.venue.trim());

  const checkAll = async (list: PosterData[]) => {
    const rs = await Promise.all(list.map((d) => api('/quality', 'POST', { platform: format === 'story' ? 'instagram' : 'instagram', caption: textFor(d, look), title: d.headline, hooks: [d.headline], cta: look.site, hashtags: [] })));
    const blockers = rs.flatMap((r) => r.qc.blockers); const warnings = rs.flatMap((r) => r.qc.warnings);
    return { pass: blockers.length === 0, blockers: Array.from(new Set(blockers)), warnings: Array.from(new Set(warnings)) };
  };
  const runGate = async () => { setBusy(true); try { const g = await checkAll([data]); setGate(g); flash(g.pass ? 'Passes the quality gate' : 'Blocked. See the reasons below.'); } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(false); } };
  const exportPng = async () => {
    if (eventMissing) return flash('Event graphics need a date and a venue. Nothing is guessed.');
    setBusy(true);
    try { const g = await checkAll([data]); setGate(g); if (!g.pass) return flash('Download blocked by the quality gate.');
      const c = await renderGraphic(data, look, format, logo); download(await toBlob(c), `primepipfx-${kind}-${format}.png`); flash('PNG downloaded');
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(false); }
  };
  const exportCarousel = async () => {
    if (!topic) return; setBusy(true);
    try {
      const slides = carouselSlides({ title: topic.title, short: topic.short, features: topic.features }, look);
      const g = await checkAll(slides); setGate(g); if (!g.pass) return flash('Carousel blocked by the quality gate.');
      const z = new JSZip(); for (let i = 0; i < slides.length; i++) z.file(`slide-${String(i + 1).padStart(2, '0')}.png`, await toBlob(await renderGraphic(slides[i], look, 'square', logo)));
      download(await z.generateAsync({ type: 'blob' }), `primepipfx-carousel-${topic.id.toLowerCase()}.zip`); flash(`Carousel of ${slides.length} slides downloaded`);
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-4" data-testid="poster-studio">
      <div className="flex flex-wrap items-center gap-2"><Palette className="h-5 w-5 text-fuchsia-300" /><h3 className="text-base font-bold text-white">Poster and graphic studio — locked to Brand memory</h3></div>
      <p className="text-[11px] text-slate-400">Colours, logo, slogan and site come from Brand memory. Anything you leave empty is left off the graphic. Every download passes the quality gate first.</p>
      {msg && <p className="text-xs text-fuchsia-200" role="status">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <canvas ref={view} className="w-full rounded-xl border border-slate-700 bg-black" style={{ aspectRatio: `${FORMATS[format].w}/${FORMATS[format].h}` }} aria-label="Graphic preview" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">{KINDS.map((k) => <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${kind === k.id ? 'border-fuchsia-300 text-fuchsia-100' : 'border-slate-700 text-slate-400'}`}>{k.label}</button>)}</div>
          <div className="flex flex-wrap gap-1.5">{(['square', 'portrait', 'story', 'landscape'] as VisualFormat[]).map((k) => <button key={k} type="button" onClick={() => setFormat(k)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${format === k ? 'border-sky-300 text-sky-100' : 'border-slate-700 text-slate-400'}`}>{FORMATS[k].label}</button>)}</div>
          <div className="flex flex-wrap gap-2">
            <select className={box} value={tid} onChange={(e) => setTid(e.target.value)} aria-label="Topic">{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
            <button type="button" className={`${btn} bg-slate-700 text-slate-100`} onClick={fillFromTopic}>Fill from topic</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['eyebrow', 'headline', 'sub', 'cta', 'quote', 'author', 'date', 'time', 'venue'] as const).map((k) => <input key={k} className={box} placeholder={k === 'date' ? 'Date (event)' : k === 'venue' ? 'Venue (event)' : k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
          </div>
          <textarea rows={4} className={box} placeholder="Points (one per line, for infographics and posters)" value={f.items} onChange={(e) => setF({ ...f, items: e.target.value })} />
          <label className="flex items-center gap-2 text-[12px] text-slate-300"><input type="checkbox" className="accent-fuchsia-400" checked={f.showSlogan} onChange={(e) => setF({ ...f, showSlogan: e.target.checked })} disabled={!look.slogans[0]} />{look.slogans[0] ? `Show your slogan: “${look.slogans[0]}”` : 'No slogan in Brand memory yet, so none is shown'}</label>
          {!palette(look).custom && <p className="text-[11px] text-amber-300">Using default colours. Set yours in Brand memory to brand every graphic.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={`${btn} bg-fuchsia-500 text-white`} onClick={() => void exportPng()}><Download className="h-4 w-4" />Download PNG</button>
            <button type="button" disabled={busy || !topic} className={`${btn} bg-fuchsia-500/30 text-fuchsia-100`} onClick={() => void exportCarousel()}><Images className="h-4 w-4" />Carousel ZIP (topic)</button>
            <button type="button" disabled={busy} className={`${btn} bg-slate-700 text-slate-100`} onClick={() => void runGate()}>Check quality</button>
          </div>
          {gate && <div className="rounded-lg border border-slate-700 p-2 text-[12px]">
            <div className={gate.pass ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{gate.pass ? 'Passes the quality gate' : 'Blocked'}</div>
            {gate.blockers.map((b, i) => <div key={`b${i}`} className="text-rose-200">✗ {b}</div>)}
            {gate.warnings.map((w, i) => <div key={`w${i}`} className="text-amber-200">! {w}</div>)}
          </div>}
          {eventMissing && <p className="text-[11px] text-amber-300">Event graphics need a date and a venue.</p>}
        </div>
      </div>
    </div>
  );
};
