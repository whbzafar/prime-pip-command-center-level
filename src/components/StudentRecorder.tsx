import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Download, Square, X } from 'lucide-react';
import { getTopics, templateScript, type Topic } from '../utils/topicContent';
import { recordSeries, tourStore, type TourScript } from '../utils/tour';
import { metaFor, makeThumbnail } from '../utils/publishPack';
import { noFree } from '../utils/noFree';
import { startPublish, waitPublish, stageVideo, defaultCfg } from '../utils/publishClient';
import { getStoredToken } from '../utils/authClient';
import { CategoryPicker } from './CategoryPicker';

/** One-click recorder for paying students. Pick a category and press Record: the app records the tour, writes the title,
 *  caption and hashtags, and the server posts it to the academy channels. No key or token is ever sent to this screen. */
const authH = (): Record<string, string> => { const t = getStoredToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };

export const StudentRecorder: React.FC = () => {
  const topics = useMemo(() => getTopics(), []);
  const [open, setOpen] = useState(false);
  const [tid, setTid] = useState(topics[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const stopRef = useRef({ stop: false }); const mounted = useRef(true); useEffect(() => () => { mounted.current = false; }, []);
  const [big, setBig] = useState<number | null>(null);
  const closeClips = () => { clips.forEach((c) => URL.revokeObjectURL(c.url)); setClips([]); setBig(null); };
  const [clips, setClips] = useState<{ title: string; url: string; bytes: number; ext: string }[]>([]);
  const [lockSt, setLockSt] = useState<{ busy: boolean; mine: boolean; since: number; by: string; skew: number }>({ busy: false, mine: false, since: 0, by: '', skew: 0 });
  const [tick, setTick] = useState(0); const [scanning, setScanning] = useState(false);
  const lockCall = async (path: 'lock' | 'unlock', method: 'GET' | 'POST' = 'POST') => { try { const r = await fetch(`/api/student/social/${path}`, { method, credentials: 'include', headers: authH(), cache: 'no-store' }); const j = await r.json(); setLockSt({ busy: !!j.busy, mine: !!j.mine, since: j.since || 0, by: j.by || '', skew: j.now ? Date.now() - j.now : 0 }); return j; } catch { return { ok: true, busy: false }; } };
  useEffect(() => { void lockCall('lock', 'GET'); const t = window.setInterval(() => { if (!busy) void lockCall('lock', 'GET'); }, 6000); return () => window.clearInterval(t); }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!lockSt.busy && !busy) return; const t = window.setInterval(() => setTick((n) => n + 1), 1000); return () => window.clearInterval(t); }, [lockSt.busy, busy]);
  useEffect(() => { if (!busy) return; const t = window.setInterval(() => { void lockCall('lock'); }, 20_000); const off = () => { try { navigator.sendBeacon('/api/student/social/unlock'); } catch { /* ignore */ } }; window.addEventListener('pagehide', off); return () => { window.clearInterval(t); window.removeEventListener('pagehide', off); }; }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { clips.forEach((c) => URL.revokeObjectURL(c.url)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  void tick; const others = lockSt.busy && !lockSt.mine && !busy;
  const mmss = (ms: number) => { const t = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const elapsed = lockSt.since ? mmss(Date.now() - lockSt.skew - lockSt.since) : '00:00';

  const script = async (t: Topic, seed: number): Promise<TourScript> => {
    try {
      const r = await fetch('/api/admin/social-agent/script', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ topic: { id: t.id, title: t.title, short: t.short, overview: t.overview, features: t.features }, platform: 'tiktok', language: 'roman-urdu', seed }) });
      const j = await r.json();
      if (j.ok && j.script) { const b = j.script; const h = Math.floor(Math.random() * Math.max(1, b.hooks?.length || 1)); return { hook: b.hooks?.[h] || b.hooks?.[0], hookUrdu: b.hooksUrdu?.[h] || b.hooksUrdu?.[0], scenes: b.scenes, cta: b.cta, ctaUrdu: b.ctaUrdu }; }
    } catch { /* the built-in writer is used */ }
    const tpl = templateScript(t, seed); return { hook: tpl.hooks[0], scenes: tpl.scenes, cta: tpl.cta };
  };

  const record = async () => {
    const topic = topics.find((t) => t.id === tid); if (!topic || busy) return;
    const got = await lockCall('lock'); if (got.ok === false) { setResult({ ok: false, text: `⏳ ${got.error || 'Someone else is recording. Please wait.'}` }); setOpen(false); return; }
    clips.forEach((c) => URL.revokeObjectURL(c.url)); setClips([]);
    setBusy(true); setResult(null); setOpen(false); stopRef.current = { stop: false }; const seed = Math.floor(Math.random() * 1e6); const jobs: Promise<string>[] = []; const waits: Promise<{ ok: boolean; text: string }>[] = [];
    try {
      setStep('In the pop-up choose “This tab” and click Share once. Everything else is automatic.');
      const n = await recordSeries({
        tab: topic.tab, title: topic.title, theme: Math.floor(Math.random() * 6), features: topic.features, script: () => script(topic, seed + Math.floor(Math.random() * 1000)), finish: false, voice: true, audio: 'ai', secondsPerPart: 6, voiceLang: 'ur', format: '9:16', stop: stopRef.current, returnTab: 'DASHBOARD', onStatus: (m) => setStep(m),
        onVideo: async (blob, meta) => {
          const title = `${topic.title} — ${meta.label}`; setClips((c) => [...c, { title, url: URL.createObjectURL(blob), bytes: blob.size, ext: blob.type.includes('mp4') ? 'mp4' : 'webm' }]); const m = metaFor(topic.id, title).map((x) => ({ ...x, title: noFree(x.title), description: noFree(x.description) }));
          setStep(`Sending “${meta.label}” to the academy channels…`); tourStore.uploading = true; let id: string; let coverId: string | undefined;
          try { const cover = makeThumbnail(blob, `${topic.title}: ${meta.label}`).then((th) => stageVideo(th, 'jpg')).catch(() => undefined); [id, coverId] = await Promise.all([stageVideo(blob), cover]); } finally { tourStore.uploading = false; }
          const job = startPublish(id, defaultCfg(), m.find((x) => x.platform === 'facebook')!, m.find((x) => x.platform === 'instagram')!, [], coverId, undefined, { category: topic.id, title, student: true, finishFirst: !blob.type.includes('mp4') });
          jobs.push(job);
          waits.push(job.then((j) => waitPublish(j)).then((r) => { const okN = Object.entries(r).filter(([, v]) => v.ok).length; const bad = Object.entries(r).filter(([, v]) => !v.ok).length; return { ok: okN > 0, text: bad && !okN ? 'not posted' : `${okN} platform${okN === 1 ? '' : 's'}` }; }).catch((e: any) => ({ ok: false, text: String(e?.message || e) })));
        },
      });
      setStep('Handing the videos to the server…'); const queued = await Promise.allSettled(jobs); const sent = queued.filter((q) => q.status === 'fulfilled').length; const bad0 = queued.find((q) => q.status === 'rejected') as PromiseRejectedResult | undefined;
      // The server posts in the background (Instagram can take minutes): the student is released now and the final result appears when it is ready.
      setResult(sent ? { ok: true, text: `✅ ${sent} of ${n} video${n === 1 ? '' : 's'} uploaded. Posting to the academy channels continues on our server, so you can leave this page.${bad0 ? ` (${queued.length - sent} could not be sent: ${String(bad0.reason?.message || bad0.reason)})` : ''}` } : { ok: false, text: `❌ Nothing was uploaded${bad0 ? `: ${String(bad0.reason?.message || bad0.reason)}` : ''}. Please try again.` });
      void Promise.all(waits).then((res) => { const good = res.filter((r) => r.ok).length; if (res.length && mounted.current) setResult(good ? { ok: true, text: `✅ Done: ${good} of ${res.length} video${res.length === 1 ? '' : 's'} posted.` } : { ok: false, text: `❌ Posting did not complete${res[0] ? `: ${res[0].text}` : ''}.` }); });
    } catch (e: any) { setResult({ ok: false, text: `❌ ${String(e?.message || e)}` }); } finally { setBusy(false); setStep(''); void lockCall('unlock'); }
  };

  return (
    <>
      {!busy && <button type="button" disabled={others} onClick={() => setOpen(true)} title={others ? `${lockSt.by || 'Someone'} is recording right now` : 'Record a video'} className={`fixed bottom-4 left-4 z-[70] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold shadow-lg ${others ? 'cursor-not-allowed bg-slate-700 text-slate-400 opacity-60' : 'bg-rose-600 text-white shadow-rose-900/40 hover:bg-rose-500'}`} data-testid="student-record-open"><Clapperboard className="h-4 w-4" /> {others ? `${lockSt.by || 'Someone'} is recording · ${elapsed}` : 'Record'}</button>}
      {busy && <div className="fixed left-1/2 top-2 z-[80] flex w-[min(92vw,640px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-rose-400/50 bg-slate-950/95 px-3 py-2 text-xs text-rose-100 shadow-xl" role="status" data-testid="student-record-status"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /><span className="font-mono text-rose-300">{elapsed}</span><span className="flex-1">{step || 'Working…'}</span><button type="button" onClick={() => { stopRef.current.stop = true; }} className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 font-semibold hover:bg-slate-700"><Square className="h-3 w-3" /> Stop</button></div>}
      {result && !busy && <div className={`fixed bottom-20 left-4 z-[70] max-w-sm rounded-xl border px-3 py-2 text-sm font-semibold shadow-lg ${result.ok ? 'border-emerald-400/50 bg-emerald-950/95 text-emerald-100' : 'border-rose-400/50 bg-rose-950/95 text-rose-100'}`} role="status">{result.text}<button type="button" className="ml-2 text-slate-300" aria-label="Close" onClick={() => setResult(null)}>×</button></div>}
      {!busy && clips.length > 0 && !open && <details open className="fixed bottom-32 left-4 z-[70] max-h-[60vh] w-[min(92vw,340px)] overflow-auto rounded-xl border border-slate-600 bg-slate-950/95 p-2 text-xs text-slate-100 shadow-xl" data-testid="student-clips"><summary className="flex cursor-pointer items-center justify-between gap-2 font-semibold"><span>🎞️ Your videos ({clips.length}) — tap a video to open it</span><button type="button" aria-label="Close videos" title="Close" data-testid="student-clips-close" onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeClips(); }} className="rounded-full bg-slate-800 p-1 hover:bg-rose-700"><X className="h-4 w-4" /></button></summary>{clips.map((c, i) => <div key={c.url} className="mt-2 space-y-1 border-t border-slate-800 pt-2"><div className="font-semibold">{c.title}</div><video src={c.url} controls preload="metadata" className="w-full cursor-pointer rounded bg-black" onDoubleClick={() => setBig(i)} /><button type="button" onClick={() => setBig(i)} className="inline-flex items-center gap-1 rounded bg-sky-700 px-2 py-1 font-semibold hover:bg-sky-600" data-testid="student-clip-open">Open full screen</button><a href={c.url} download={`${c.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'video'}-${i + 1}.${c.ext}`} className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 font-semibold hover:bg-slate-700"><Download className="h-3 w-3" /> Download ({(c.bytes / 1048576).toFixed(1)} MB)</a></div>)}</details>}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" data-testid="student-record-dialog">
          <div className="max-h-[94vh] w-full max-w-3xl space-y-3 overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 sm:p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Record a video</h2><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
            <CategoryPicker topics={topics} value={tid} onChange={setTid} back="DASHBOARD" onScanning={setScanning} />
            <p className="text-xs text-slate-400">Press Record, choose “This tab” in the pop-up and click Share once. The app records ONE video that opens every sub-category and shows every option, adds the voice, title, caption and hashtags, and posts the videos to the academy channels. Keep this page open until it says Done.</p>
            <button type="button" disabled={scanning} onClick={() => void record()} className="w-full rounded-xl bg-rose-600 py-3 text-base font-bold text-white hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60" data-testid="student-record-go">{scanning ? 'Reading the category…' : 'Record'}</button>
          </div>
        </div>
      )}
      {big !== null && clips[big] && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-3" role="dialog" aria-modal="true" data-testid="student-clip-lightbox" onClick={() => setBig(null)}>
          <div className="relative max-h-[96vh] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close video" onClick={() => setBig(null)} className="absolute -top-2 right-0 z-10 rounded-full bg-slate-900 p-2 text-white shadow hover:bg-rose-700"><X className="h-5 w-5" /></button>
            <video src={clips[big].url} controls autoPlay playsInline className="max-h-[84vh] w-full rounded-xl bg-black" />
            <a href={clips[big].url} download={`${clips[big].title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'video'}.${clips[big].ext}`} className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600"><Download className="h-4 w-4" /> Download ({(clips[big].bytes / 1048576).toFixed(1)} MB)</a>
          </div>
        </div>
      )}
    </>
  );
};
