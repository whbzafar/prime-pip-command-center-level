import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VoiceClips } from './VoiceClips';
import { PublishPanel, type FinishedVideo } from './PublishPanel';
import { Camera, Copy, Download, Film, Package, RefreshCw, Save, Shuffle, Sparkles, Upload, Wand2 } from 'lucide-react';
import JSZip from 'jszip';
import { FORMATS, Layout, THEMES, VisualFormat, download, fileToImage, renderVariant, toBlob } from '../../utils/postVisuals';
import { captureTopics, shotStore } from '../../utils/agentCapture';
import { CategoryPicker } from "../CategoryPicker";
import { VIDEO_FORMATS, recordTour, recordSeries, recordTours, testServerVoice, streamTours, tourStore, type AudioMode, type StreamItem, type TourScript, type VideoFormatId } from "../../utils/tour";
import { PACKS } from '../../data/urduPack';
import { dailyPlan, dayKey } from '../../utils/dailyPlan';
import { getStoredToken } from '../../utils/authClient';
import { Platform, Topic, generateAccountPost, generateTopicPost, getTopics, scoreHook, templateScript } from '../../utils/topicContent';

interface AiBundle { hooks: string[]; hooksUrdu?: string[]; scenes: TourScript['scenes']; cta: string; ctaUrdu?: string; caption: string; hashtags: string[]; title: string; source: string }

const PLATFORMS: { id: Platform; label: string; format: VisualFormat }[] = [
  { id: 'instagram', label: 'Instagram', format: 'portrait' }, { id: 'facebook', label: 'Facebook', format: 'landscape' },
  { id: 'tiktok', label: 'TikTok', format: 'story' }, { id: 'youtube', label: 'YouTube', format: 'thumb' },
];
const SHOT_LAYOUTS: Layout[] = ['shot', 'shotfeat', 'shotbig'];
const CARD_LAYOUTS: Layout[] = ['features', 'chart', 'quote'];
const LNAME: Record<string, string> = { shot: 'Framed screen', shotfeat: 'Screen + points', shotbig: 'Big screen', features: 'Feature card', chart: 'Chart card', quote: 'Story card', hero: 'Hero' };
const rnd = (n: number) => Math.floor(Math.random() * n);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const AutoStudio: React.FC = () => {
  const topics = useMemo(() => getTopics(), []);
  const [finished, setFinished] = useState<FinishedVideo | null>(() => tourStore.finished);
  const [tid, setTid] = useState(topics[0]?.id || 'DASHBOARD');
  const [videoFmt, setVideoFmt] = useState<VideoFormatId>("9:16");
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [format, setFormat] = useState<VisualFormat>('portrait');
  const [seed, setSeed] = useState(1);
  const [theme, setTheme] = useState(0);
  const [layout, setLayout] = useState<Layout>('shot');
  const [hi, setHi] = useState(0);
  const [text, setText] = useState('');
  const [, bump] = useState(0);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState('');
  const [withVideo, setWithVideo] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [live, setLive] = useState<{ line: string; short: string; head: string; at: number } | null>(null);
  const [useLive, setUseLive] = useState(true);
  const liveRef = useRef<string | undefined>(undefined);
  liveRef.current = useLive ? live?.short : undefined;
  const [history, setHistory] = useState<{ at: number; tid: string; platform: Platform; scope: 'section' | 'account'; seed: number; headline: string }[]>(() => { try { return JSON.parse(localStorage.getItem('pp_studio_history') || '[]'); } catch { return []; } });
  const refreshLive = useCallback(async () => {
    const one = async (sym: string) => { try { const r = await fetch(`/api/charts/price?symbol=${sym}`); const j = await r.json(); return j?.ok && j.price > 0 ? { sym, price: Number(j.price), ch: Number(j.change24h) || 0 } : null; } catch { return null; } };
    const rows = (await Promise.all(['XAUUSD', 'EURUSD', 'BTCUSDT'].map(one))).filter(Boolean) as { sym: string; price: number; ch: number }[];
    let head = ''; try { const r = await fetch('/api/market-headlines'); const j = await r.json(); head = String(j?.items?.[0]?.title || '').slice(0, 140); } catch { /* optional */ }
    if (!rows.length && !head) { setLive(null); return false; }
    const name: Record<string, string> = { XAUUSD: 'Gold', EURUSD: 'EUR/USD', BTCUSDT: 'Bitcoin' }; const fmtp = (r: { sym: string; price: number }) => (r.sym === 'EURUSD' ? r.price.toFixed(4) : r.price.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    const arrow = (c: number) => `${c >= 0 ? '▲' : '▼'}${Math.abs(c).toFixed(2)}%`;
    const line = rows.map((r) => `${name[r.sym]} ${fmtp(r)} (${arrow(r.ch)})`).join(' · ');
    const g = rows[0]; setLive({ line, short: g ? `${g.sym === 'XAUUSD' ? 'XAU/USD' : name[g.sym]} ${fmtp(g)} ${arrow(g.ch)}` : '', head, at: Date.now() }); return true;
  }, []);
  useEffect(() => { void refreshLive(); }, [refreshLive]);
  const [voice, setVoice] = useState(true);
  const [audio, setAudio] = useState<AudioMode>('mic');
  const [voiceTest, setVoiceTest] = useState('');
  const runVoiceTest = async () => {
    setVoiceTest('Testing the Urdu voice…');
    const sv = await testServerVoice(); const serverLine = `${sv.ok ? '✅ Server voice works' : '❌ Server voice unreachable'}${sv.trace?.length ? ' (' + sv.trace.join(', ') + ')' : ''}`;
    try {
      const { speakUrdu } = await import('../../utils/urduVoice');
      const t0 = Date.now(); const r = await speakUrdu('پرائم پپ کمانڈ سینٹر میں خوش آمدید۔', (m) => setVoiceTest(`${serverLine}. ${m}`));
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext; const ac: AudioContext = new AC();
      const buf = ac.createBuffer(1, r.pcm.length, r.sampleRate); buf.getChannelData(0).set(r.pcm);
      const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.start();
      setVoiceTest(`${serverLine}. ✅ Urdu female voice works inside this browser (${((Date.now() - t0) / 1000).toFixed(1)}s) — playing now.`);
    } catch (e) { setVoiceTest(`${serverLine}. ❌ Browser Urdu voice failed: ${String((e as Error)?.message || e)}`); }
  };
  const [perPart, setPerPart] = useState(6);
  const [lang, setLang] = useState<'en' | 'roman-urdu'>('roman-urdu');
  const [ai, setAi] = useState<AiBundle | null>(null);
  const [variants, setVariants] = useState(2);
  const [streaming, setStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [videos, setVideos] = useState<{ title: string; url: string; bytes: number; at: number; ext: string }[]>([]);
  const streamStop = useRef<{ stop: boolean }>({ stop: false });
  const startStream = async () => {
    streamStop.current = { stop: false }; setStreaming(true); setVideos([]);
    const ur = lang === 'roman-urdu';
    const today = dayKey();
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem('pp_recorded_topics') || '[]'); } catch { recent = []; }
    const plan = dailyPlan<Topic>(topics, today, recent);
    const items: StreamItem[] = plan.map((p) => ({ tab: p.topic.tab, title: p.topic.title, features: p.topic.features, theme: p.theme, script: async () => { const t = p.topic; const b = await askAI(t, 'tiktok', p.seed); if (!b && ur) setStreamStatus(`${t.title}: the AI writer is unavailable, so this video has captions only`); return scriptFor(t, b, p.seed); } }));
    try { localStorage.setItem('pp_recorded_topics', JSON.stringify([...plan.map((p) => p.topic.id), ...recent].slice(0, 200))); } catch { /* storage unavailable */ }
    try { await streamTours(items, { voice, audio, secondsPerPart: perPart, voiceLang: ur ? "ur" : "en", format: videoFmt, stop: streamStop.current, onVideo: (v) => setVideos((x) => [v, ...x]), onStatus: (m) => setStreamStatus(m) }); setStreamStatus(streamStop.current.stop ? 'Stopped. Every finished video is listed below.' : 'Every feature is done. Download any video below.'); }
    catch (e: any) { setStreamStatus(String(e?.message || e)); }
    finally { setStreaming(false); }
  };
  const view = useRef<HTMLCanvasElement>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4500); };
  const topic: Topic = topics.find((t) => t.id === tid) || topics[0];
  const shot = shotStore.shots[topic.id];
  const [scope, setScope] = useState<'section' | 'account'>('section');
  const post = useMemo(() => (scope === 'account' ? generateAccountPost(topics, platform, seed) : generateTopicPost(topic, platform, seed)), [scope, topics, topic, platform, seed]);
  const viewPost = useMemo(() => (ai?.hooks?.length ? { ...post, hooks: ai.hooks } : post), [ai, post]);
  const layouts = shot ? SHOT_LAYOUTS : CARD_LAYOUTS;
  const have = topics.filter((t) => shotStore.shots[t.id]).length;

  const opts = useCallback((t: Topic, p: ReturnType<typeof generateTopicPost>, fmt: VisualFormat, lay: Layout, th: number, sd: number, h = 0) => {
    const s = shotStore.shots[t.id];
    const useLay: Layout = s ? (SHOT_LAYOUTS.includes(lay) ? lay : 'shot') : (CARD_LAYOUTS.includes(lay) ? lay : 'features');
    return { live: liveRef.current, format: fmt, layout: useLay, theme: th, seed: sd, headline: useLay === 'shotbig' || useLay === 'shot' ? p.headline : (p.hooks[h] || p.headline), sub: t.short, slides: t.features.slice(0, 3), bullets: t.features.slice(0, 3).map((f) => f.length > 52 ? f.slice(0, 50).replace(/\s+\S*$/, '') + '…' : f), features: t.features.slice(0, 6).map((f) => ({ icon: '✓', label: f.length > 40 ? f.slice(0, 38).replace(/\s+\S*$/, '') + '…' : f })), shot: s?.img || null, shotLabel: t.title, cta: 'primepipfx.site' };
  }, []);

  const regenerate = useCallback((keepTopic = true) => {
    setSeed((x) => x + 1 + rnd(9999)); setTheme(rnd(THEMES.length)); setHi(0);
    setLayout((l) => { const L = shotStore.shots[topic.id] ? SHOT_LAYOUTS : CARD_LAYOUTS; return L[(L.indexOf(l) + 1 + rnd(L.length)) % L.length] || L[0]; });
    if (!keepTopic) setTid(topics[rnd(topics.length)].id);
  }, [topic.id, topics]);
  const composed = useMemo(() => {
    const tags = ai ? ai.hashtags.map((h) => `#${h}`).join(' ') : '';
    const base = !ai ? post.text : platform === 'youtube' ? `TITLE: ${ai.title}\n\nDESCRIPTION:\n${ai.caption}\n\nTAGS: ${ai.hashtags.join(', ')}` : `${ai.caption}\n\n${tags}`;
    if (!useLive || !live?.line) return base;
    const ins = `📈 Market now: ${live.line}`;
    return base.includes('Educational content') ? base.replace('Educational content', `${ins}\n\nEducational content`) : `${base}\n\n${ins}`;
  }, [ai, post, platform, live, useLive]);
  useEffect(() => { setText(composed); }, [composed]);
  useEffect(() => { setAi(null); }, [tid, platform]);
  const hookList = useMemo(() => (ai?.hooks?.length ? ai.hooks : post.hooks).map((h) => ({ h, sc: scoreHook(h, topic.title) })), [ai, post, topic.title]);
  const bestHook = hookList.length ? hookList.reduce((b, x, i) => (x.sc.score > hookList[b].sc.score ? i : b), 0) : 0;
  const activeHook = hookList[hi]?.h || post.headline;
  const scriptFor = (t: Topic, bundle: AiBundle | null, sd: number, hookIdx = 0): TourScript => {
    if (bundle) return { hook: bundle.hooks[hookIdx] || bundle.hooks[0], hookUrdu: bundle.hooksUrdu?.[hookIdx] || bundle.hooksUrdu?.[0], scenes: bundle.scenes, cta: bundle.cta, ctaUrdu: bundle.ctaUrdu };
    const tpl = templateScript(t, sd); return { hook: tpl.hooks[hookIdx] || tpl.hooks[0], scenes: tpl.scenes, cta: tpl.cta };
  };
  const askAI = useCallback(async (t: Topic, pf: Platform, sd: number): Promise<AiBundle | null> => {
    try {
      const tk = getStoredToken(); const r = await fetch('/api/admin/social-agent/script', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) }, body: JSON.stringify({ topic: { id: t.id, title: t.title, short: t.short, overview: t.overview, features: t.features }, platform: pf, language: lang, seed: sd }) });
      const j = await r.json(); return j.ok ? ({ ...j.script } as AiBundle) : null;
    } catch { return null; }
  }, [lang]);
  const writeAI = useCallback(async () => {
    setBusy(true); setStep('The AI writer is scripting this topic…'); const b = await askAI(topic, platform, seed);
    setBusy(false); setStep(''); if (b) { setAi(b); setHi(0); flash(`Written by ${b.source === 'gemini' ? 'Gemini' : 'the free AI writer'}`); } else flash('The AI writer is not reachable right now, so the built-in writer is used. Try again in a minute.');
  }, [askAI, topic, platform, seed]);
  useEffect(() => { setLayout((l) => (layouts.includes(l) ? l : layouts[0])); }, [layouts]);
  useEffect(() => { const v = view.current; if (!v) return; const c = renderVariant(opts(topic, viewPost, format, layout, theme, seed, hi)); v.width = c.width; v.height = c.height; v.getContext('2d')!.drawImage(c, 0, 0); }, [topic, viewPost, format, layout, theme, seed, hi, opts, shot, live, useLive]);

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return; restored.current = true;
    try { const j = JSON.parse(localStorage.getItem('pp_studio_state') || 'null'); if (!j) return;
      if (topics.some((t) => t.id === j.tid)) setTid(j.tid); if (j.platform) setPlatform(j.platform); if (j.scope) setScope(j.scope); if (j.format) setFormat(j.format); if (j.layout) setLayout(j.layout); if (typeof j.theme === 'number') setTheme(j.theme); if (typeof j.seed === 'number') setSeed(j.seed); if (j.videoFmt) setVideoFmt(j.videoFmt);
    } catch { /* ignore */ }
  }, [topics]);
  useEffect(() => {
    if (!restored.current) return;
    try { localStorage.setItem('pp_studio_state', JSON.stringify({ tid, platform, scope, format, layout, theme, seed, videoFmt })); } catch { /* ignore */ }
    const t = setTimeout(() => {
      setHistory((h) => { const e = { at: Date.now(), tid, platform, scope, seed, headline: post.headline }; const next = [e, ...h.filter((x) => !(x.tid === tid && x.platform === platform && x.scope === scope && x.seed === seed))].slice(0, 12); try { localStorage.setItem('pp_studio_history', JSON.stringify(next)); } catch { /* ignore */ } return next; });
    }, 2500);
    return () => clearTimeout(t);
  }, [tid, platform, scope, format, layout, theme, seed, videoFmt, post.headline]);
  const pickPlatform = (p: (typeof PLATFORMS)[number]) => { setPlatform(p.id); setFormat(p.format); };
  const capture = async () => {
    setBusy(true); setStep('In the pop-up choose “This tab” and click Share. The agent does the rest.');
    try {
      const r = await captureTopics(topics, 'ADMIN', (l, i, n) => setStep(`Photographing “${l}” (${i}/${n}) — waiting until it has fully loaded…`));
      bump((n) => n + 1);
      flash(`Captured ${r.done} of ${topics.length} screens.${r.fails.length ? ` Skipped ${r.fails.length}: ${r.fails.slice(0, 4).map((f) => f.tab).join(', ')}${r.fails.length > 4 ? '…' : ''}` : ''}`);
    } catch (e: any) { flash(String(e?.message || 'Capture cancelled')); } finally { setBusy(false); setStep(''); bump((n) => n + 1); }
  };
  const upload = async (f?: File | null) => { if (!f) return; const img = await fileToImage(f); shotStore.shots[topic.id] = { img, label: topic.title, tab: topic.tab, at: Date.now() }; bump((n) => n + 1); flash(`Screenshot saved for “${topic.title}”`); };
  const png = () => toBlob(renderVariant(opts(topic, viewPost, format, layout, theme, seed, hi)));
  const base = `primepipfx-${slug(topic.title)}-${platform}-${seed}`;
  const copyTxt = async () => { await navigator.clipboard?.writeText(text); flash('Text copied'); };
  const copyImg = async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': await png() })]); flash('Image copied'); } catch { flash('Copy is not supported here. Use Download.'); } };

  const makeVideo = async () => {
    setBusy(true);
    try {
      const sc = scriptFor(topic, ai, seed, hi);
      setStep(audio === 'mic' ? 'Allow the microphone, then choose “This tab” and click Share. Speak in Urdu while the agent walks through every part of the section; your words become captions.' : 'In the pop-up choose “This tab” and click Share. The agent will open this section and walk through every part of it.');
      const blob = await recordTour({ tab: topic.tab, title: topic.title, script: sc, theme, voice, audio, secondsPerPart: perPart, features: topic.features, voiceLang: lang === "roman-urdu" ? "ur" : "en", format: videoFmt, onProgress: (_p, label) => label && setStep(label) });
      const dim = VIDEO_FORMATS[videoFmt]; const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      { const fv = { blob, category: topic.id, title: topic.title, headline: PACKS[topic.id]?.hook[0] || sc.hook, at: Date.now() }; tourStore.finished = fv; setFinished(fv); }
      download(blob, `${base}-${videoFmt.replace(':', 'x')}.${ext}`); if (tourStore.lastSrt) download(new Blob([tourStore.lastSrt], { type: 'text/plain' }), `${base}-${videoFmt.replace(':', 'x')}.srt`);
      flash(`Live tour video downloaded (${dim.w}×${dim.h}, ${ext.toUpperCase()})${tourStore.lastSrt ? ' with Urdu subtitles (.srt)' : ''}.`);
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(false); setStep(''); bump((n) => n + 1); }
  };

  const makeSeries = async () => {
    setBusy(true); streamStop.current.stop = false;
    try {
      setStep('In the pop-up choose “This tab” and click Share once. The agent then records every sub-category of this section as its own video, and each is posted as soon as it is ready.');
      const n = await recordSeries({ tab: topic.tab, title: topic.title, theme, features: topic.features, script: async () => scriptFor(topic, ai, seed, hi), voice, audio, secondsPerPart: perPart, voiceLang: lang === 'roman-urdu' ? 'ur' : 'en', format: videoFmt, stop: streamStop.current, onStatus: (m) => setStep(m),
        onVideo: (blob, meta) => { const fv = { blob, category: topic.id, title: `${topic.title} — ${meta.label}`, headline: `${topic.title}: ${meta.label}`, at: Date.now() }; tourStore.finished = fv; setFinished(fv); } });
      flash(`Series finished: ${n} video${n === 1 ? '' : 's'} recorded.`);
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(false); setStep(''); bump((x) => x + 1); }
  };

  /** Everything for every topic, in one zip: per topic and platform, N image variations + ready text (+ a video per topic if ticked). */
  const buildPack = async () => {
    setBusy(true);
    if (withVideo) {
      const list = topics.filter((t) => !tourStore.videos[t.tab]); const items: Parameters<typeof recordTours>[0] = [];
      for (let i = 0; i < list.length; i++) { const t = list[i]; setStep(`Scripting ${t.title} (${i + 1}/${list.length})`); const b = useAI ? await askAI(t, 'tiktok', 300 + i) : null; items.push({ tab: t.tab, title: t.title, script: scriptFor(t, b, 300 + i), theme: (i + 2) % THEMES.length, voice, voiceLang: lang === 'roman-urdu' ? 'ur' : 'en' }); }
      try { await recordTours(items, (i, n, ok, m) => setStep(`${ok ? 'Recorded' : 'Skipped'} ${i + 1}/${n}${m ? ' — ' + m : ''}`)); } catch (e: any) { flash(String(e?.message || e)); }
    } const z = new JSZip(); let done = 0; const total = topics.length;
    try {
      for (const t of topics) {
        done++; setStep(`Building pack: ${t.title} (${done}/${total})`);
        const dir = z.folder(`${String(done).padStart(2, '0')}-${slug(t.title)}`)!; const hasShot = !!shotStore.shots[t.id];
        for (const pf of PLATFORMS) for (let v = 1; v <= variants; v++) {
          const sd = 100 * v + done * 7 + pf.id.length; const p = generateTopicPost(t, pf.id, sd); const lays = hasShot ? SHOT_LAYOUTS : CARD_LAYOUTS;
          const c = renderVariant(opts(t, p, pf.format, lays[(v - 1 + done) % lays.length], (v + done) % THEMES.length, sd, 0));
          dir.file(`${pf.id}-${v}.png`, await toBlob(c)); dir.file(`${pf.id}-${v}.txt`, p.text);
        }
        const tv = tourStore.videos[t.tab]; if (withVideo && tv) dir.file(`live-tour.${tv.blob.type.includes('mp4') ? 'mp4' : 'webm'}`, tv.blob);
      }
      z.file('README.txt', `PrimePipFX content pack\n${topics.length} topics x 4 platforms x ${variants} variations${withVideo ? ' + 1 video per topic' : ''}.\nEach image is made from the screenshot of the same topic its text describes.\nTopics without a captured screenshot use a designed card with the topic's own feature list.\n${new Date().toISOString()}\n`);
      download(await z.generateAsync({ type: 'blob' }), `primepipfx-content-pack-${Date.now().toString(36)}.zip`); flash('Pack downloaded');
    } catch (e: any) { flash(String(e?.message || e)); } finally { setBusy(false); setStep(''); }
  };

  const f = FORMATS[format]; const btn = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60';
  return (
    <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 via-slate-900/70 to-violet-500/10 p-4" data-testid="auto-studio">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Wand2 className="h-5 w-5 text-amber-300" />
        <h3 className="text-base font-bold text-white">Content Studio — every feature gets its own screenshot, post, image and video</h3>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 p-2.5">
        <button type="button" onClick={() => void capture()} disabled={busy} className={`${btn} bg-sky-500 text-slate-950`} data-testid="auto-capture"><Camera className="h-4 w-4" />Capture all {topics.length} screens</button>
        <span className="text-[12px] text-sky-100">{have}/{topics.length} topics have a real screenshot. Desktop Chrome/Edge, one click on “Share this tab”.</span>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-[12px] text-slate-200">
          <label className="inline-flex items-center gap-1"><input type="checkbox" className="accent-rose-400" checked={withVideo} onChange={(e) => setWithVideo(e.target.checked)} />record a live tour video for every topic (≈30–60 s each)</label>
          <label className="inline-flex items-center gap-1">variations <select value={variants} onChange={(e) => setVariants(+e.target.value)} className="rounded bg-slate-900 px-1 py-0.5">{[1, 2, 3, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
          <button type="button" onClick={() => void buildPack()} disabled={busy} className={`${btn} bg-emerald-500 text-slate-950`} data-testid="build-pack"><Package className="h-4 w-4" />Build full pack (ZIP)</button>
        </span>
      </div>
      {step && <p className="mb-2 text-xs text-sky-300" role="status">{step}</p>}
      {shotStore.fails.length > 0 && <p className="mb-2 text-[11.5px] text-amber-300">Not captured: {shotStore.fails.map((x) => `${x.tab} (${x.reason})`).join('; ')}. Those topics use a designed card, or upload a screenshot for them below.</p>}

      <div className="mb-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3" data-testid="video-stream">
        <div className="flex flex-wrap items-center gap-2">
          <Film className="h-4 w-4 text-rose-200" />
          <b className="text-sm text-white">Non-stop video stream</b>
          <span className="text-[12px] text-rose-100">Records a live tour of every feature in turn, each with its own script. Keep this tab open while it runs.</span>
          {!streaming
            ? <button type="button" onClick={() => void startStream()} disabled={busy} className={`${btn} ml-auto bg-rose-500 text-white`} data-testid="stream-start">Start stream</button>
            : <button type="button" onClick={() => { streamStop.current.stop = true; setStreamStatus('Stopping after the current video…'); }} className={`${btn} ml-auto bg-slate-200 text-slate-900`} data-testid="stream-stop">Stop</button>}
        </div>
        {streamStatus && <p className="mt-1 text-[12px] text-rose-200" role="status">{streamStatus}</p>}
        {videos.length > 0 && <div className="mt-2 max-h-72 space-y-1 overflow-auto text-[12px]">{videos.map((v) => <div key={v.at} className="flex items-center gap-2 rounded-lg border border-slate-700 p-2"><span className="flex-1 text-slate-200">{v.title}</span><span className="text-[11px] text-slate-400">{(v.bytes / 1048576).toFixed(1)} MB</span><a href={v.url} download={`primepipfx-${slug(v.title)}.${v.ext}`} className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-bold text-slate-950">Download</a></div>)}</div>}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Topics">
        {topics.map((t) => <button key={t.id} type="button" onClick={() => { setTid(t.id); setHi(0); }} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${tid === t.id ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{shotStore.shots[t.id] ? '📸 ' : ''}{t.title}</button>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <canvas ref={view} className="w-full rounded-xl border border-slate-700 bg-black" style={{ aspectRatio: `${f.w}/${f.h}` }} aria-label="Generated post image" />
          <p className="mt-1 text-center text-[11px] text-slate-400">{f.w}×{f.h} PNG · {LNAME[layout] || layout} · {THEMES[theme].name} · {shot ? 'real screenshot of this topic' : 'no screenshot yet for this topic'}</p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { regenerate(true); if (useAI) setTimeout(() => void writeAI(), 50); }} disabled={busy} className={`${btn} bg-amber-400 text-slate-900`} data-testid="regenerate"><RefreshCw className="h-4 w-4" />Regenerate</button>
            <button type="button" onClick={() => regenerate(false)} className={`${btn} bg-slate-700/70 text-slate-100`}><Shuffle className="h-4 w-4" />Surprise me (random topic)</button>
            <label className={`${btn} cursor-pointer bg-slate-700/70 text-slate-100`}><Upload className="h-4 w-4" />Upload screenshot for this topic<input type="file" accept="image/*" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
            <button type="button" onClick={() => void makeVideo()} disabled={busy} className={`${btn} bg-rose-500/30 text-rose-100`} data-testid="make-video"><Film className="h-4 w-4" />Record live tour video</button>
            <button type="button" onClick={() => void makeSeries()} disabled={busy} className={`${btn} bg-amber-500/30 text-amber-100`} data-testid="make-series" title="One video for every sub-category of this section, each posted automatically"><Film className="h-4 w-4" />Record the full series (every sub-category)</button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-2 text-[12px] text-slate-200">
            <button type="button" onClick={() => void writeAI()} disabled={busy} className={`${btn} bg-violet-500 text-white`} data-testid="write-ai"><Sparkles className="h-4 w-4" />Write script + post with AI</button>
            <label className="inline-flex items-center gap-1"><input type="checkbox" className="accent-violet-400" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />use AI on Regenerate</label>
            <label className="inline-flex items-center gap-1">sound <select value={audio} onChange={(e) => { const m = e.target.value as AudioMode; setAudio(m); setVoice(m === 'mic'); }} className="rounded bg-slate-900 px-1 py-0.5" data-testid="video-audio"><option value="mic">My voice (microphone) + live Urdu captions</option><option value="none">Music only</option></select></label>
            <button type="button" onClick={runVoiceTest} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-amber-300" data-testid="voice-test">Test Urdu voice</button>
            {voiceTest && <span className="basis-full text-xs text-slate-200" data-testid="voice-test-result">{voiceTest}</span>}
            {audio === 'mic' && <label className="inline-flex items-center gap-1">seconds per part <input type="number" min={3} max={15} value={perPart} onChange={(e) => setPerPart(Math.max(3, Math.min(15, Number(e.target.value) || 6)))} className="w-14 rounded bg-slate-900 px-1 py-0.5" data-testid="video-per-part" /></label>}
            <label className="inline-flex items-center gap-1">category <select value={tid} onChange={(e) => setTid(e.target.value)} className="max-w-[14rem] rounded bg-slate-900 px-1 py-0.5" data-testid="video-category">{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <details className="w-full rounded-lg border border-slate-700 bg-slate-950/50 p-2"><summary className="cursor-pointer text-xs font-semibold text-slate-200">What this category will show: every sub-category, option and function</summary><div className="mt-2"><CategoryPicker topics={topics} value={tid} onChange={setTid} back="ADMIN" auto={false} /></div></details>
            <label className="inline-flex items-center gap-1">aspect ratio <select value={videoFmt} onChange={(e) => setVideoFmt(e.target.value as VideoFormatId)} className="rounded bg-slate-900 px-1 py-0.5" data-testid="video-format">{(Object.keys(VIDEO_FORMATS) as VideoFormatId[]).map((k) => <option key={k} value={k}>{VIDEO_FORMATS[k].label}</option>)}</select></label>
            <label className="inline-flex items-center gap-1">language <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'roman-urdu')} className="rounded bg-slate-900 px-1 py-0.5"><option value="roman-urdu">Urdu voice + Roman Urdu captions</option><option value="en">English</option></select></label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['section', 'account'] as const).map((s) => <button key={s} type="button" onClick={() => setScope(s)} className={`rounded-lg border px-2 py-1 text-xs font-semibold ${scope === s ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-slate-700 text-slate-400'}`} data-testid={`post-scope-${s}`}>{s === 'section' ? 'This section' : 'Whole account'}</button>)}
            {PLATFORMS.map((p) => <button key={p.id} type="button" onClick={() => pickPlatform(p)} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${platform === p.id ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{p.label}</button>)}
            <span className="mx-1 text-slate-600">|</span>
            {(['portrait', 'story', 'square', 'landscape', 'thumb'] as VisualFormat[]).map((k) => <button key={k} type="button" onClick={() => setFormat(k)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${format === k ? 'border-amber-300 text-amber-100' : 'border-slate-700 text-slate-400'}`}>{FORMATS[k].label}</button>)}
            <span className="mx-1 text-slate-600">|</span>
            {layouts.map((l) => <button key={l} type="button" onClick={() => setLayout(l)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${layout === l ? 'border-sky-300 text-sky-100' : 'border-slate-700 text-slate-400'}`}>{LNAME[l]}</button>)}
            <span className="mx-1 text-slate-600">|</span>
            {THEMES.map((t, i) => <button key={t.name} type="button" aria-label={`${t.name} colors`} onClick={() => setTheme(i)} className={`h-5 w-5 rounded-full border-2 ${theme === i ? 'border-white' : 'border-transparent'}`} style={{ background: `linear-gradient(135deg, ${t.a}, ${t.b})` }} />)}
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11.5px] text-slate-200" data-testid="live-strip">
            <span className="font-bold text-emerald-300">● LIVE</span>
            <span>{live ? live.line || 'headlines only' : 'Live prices are not reachable right now'}</span>
            {live?.head && <span className="text-slate-400">· {live.head}</span>}
            <button type="button" onClick={async () => { const ok = await refreshLive(); flash(ok ? 'Live data refreshed' : 'Live data is not reachable right now'); }} className="rounded border border-slate-600 px-2 py-0.5 hover:bg-slate-700/50" data-testid="live-refresh">Refresh</button>
            <label className="inline-flex items-center gap-1"><input type="checkbox" className="accent-emerald-400" checked={useLive} onChange={(e) => setUseLive(e.target.checked)} />put it in the post and the image</label>
          </div>
          <PublishPanel video={finished} />
          <VoiceClips category={tid} title={topics.find((t) => t.id === tid)?.title || tid} />
          {history.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400" data-testid="studio-history">
              <span>Recent:</span>
              {history.slice(0, 8).map((h) => (
                <button key={`${h.at}-${h.seed}`} type="button" onClick={() => { setTid(h.tid); setPlatform(h.platform); setScope(h.scope); setSeed(h.seed); setHi(0); }} className="max-w-[16rem] truncate rounded border border-slate-700 px-2 py-0.5 hover:bg-slate-700/50" title={h.headline}>{(topics.find((t) => t.id === h.tid)?.title || h.tid)} · {h.platform}{h.scope === 'account' ? ' · account' : ''}</button>
              ))}
            </div>
          )}
          <div className="space-y-1" aria-label="Hook options">
            <div className="text-[11px] text-slate-400">Hook options, scored against the 2026 first-3-seconds checklist (a writing checklist, not a view prediction)</div>
            {hookList.map((x, i) => <button key={i} type="button" onClick={() => setHi(i)} title={x.sc.notes.join('; ') || 'Passes the checklist'} className={`mr-1.5 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${hi === i ? 'border-amber-300 text-amber-100' : 'border-slate-700 text-slate-400'}`}><b className={x.sc.score >= 75 ? 'text-emerald-300' : x.sc.score >= 50 ? 'text-amber-300' : 'text-rose-300'}>{x.sc.score}</b>{x.h}{i === bestHook ? ' ★' : ''}</button>)}
            {ai && <div className="mt-1 rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-[11px] text-slate-300"><b className="text-slate-100">Video script</b> ({ai.scenes.length} scenes, written by {ai.source === 'gemini' ? 'Gemini' : 'free AI'}): {ai.scenes.map((sc, i) => <div key={i}>{i + 1}. <span className="text-amber-200">{sc.caption}</span> — {sc.say}</div>)}</div>}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={11} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" aria-label="Post text" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={async () => { const z = new JSZip(); z.file(`${base}.png`, await png()); z.file(`${base}.txt`, text); download(await z.generateAsync({ type: 'blob' }), `${base}.zip`); flash('Downloaded image and text'); }} className={`${btn} bg-emerald-500/25 text-emerald-100`}><Download className="h-4 w-4" />Image + text</button>
            <button type="button" onClick={async () => download(await png(), `${base}.png`)} className={`${btn} bg-slate-700/70 text-slate-100`}><Download className="h-4 w-4" />Image (PNG)</button>
            <button type="button" onClick={() => download(new Blob([text], { type: 'text/plain' }), `${base}.txt`)} className={`${btn} bg-slate-700/70 text-slate-100`}><Download className="h-4 w-4" />Text</button>
            <button type="button" className={`${btn} bg-violet-500/30 text-violet-100`} data-testid="save-library" onClick={async () => {
              try { const tk = getStoredToken(); const r = await fetch('/api/admin/social-brain/library', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) }, body: JSON.stringify({ title: topic.title, platform, topic: topic.title, text, hooks: [activeHook], cta: 'primepipfx.site', hashtags: post.hashtags }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not save'); flash(j.asset.status === 'draft' ? 'Saved to library as draft. Approve it in Social Brain.' : `Blocked by the quality gate: ${j.asset.qc.blockers[0] || 'see Social Brain'}`); }
              catch (e: any) { flash(String(e?.message || e)); } }}><Save className="h-4 w-4" />Save to library</button>
            <button type="button" onClick={copyTxt} className={`${btn} bg-slate-700/70 text-slate-100`}><Copy className="h-4 w-4" />Copy text</button>
            <button type="button" onClick={copyImg} className={`${btn} bg-slate-700/70 text-slate-100`}><Copy className="h-4 w-4" />Copy image</button>
          </div>
          {msg && <p className="text-xs text-emerald-300" role="status">{msg}</p>}
        </div>
      </div>
    </div>
  );
};
