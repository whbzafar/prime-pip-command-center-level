import React, { useMemo, useRef, useState } from 'react';
import { Clapperboard, Square, X } from 'lucide-react';
import { getTopics, templateScript, type Topic } from '../utils/topicContent';
import { recordSeries, tourStore, type TourScript } from '../utils/tour';
import { metaFor, makeThumbnail } from '../utils/publishPack';
import { noFree } from '../utils/noFree';
import { publishMeta, stageVideo, defaultCfg } from '../utils/publishClient';
import { getStoredToken } from '../utils/authClient';

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
  const stopRef = useRef({ stop: false });

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
    setBusy(true); setResult(null); setOpen(false); stopRef.current = { stop: false }; const seed = Math.floor(Math.random() * 1e6); const jobs: Promise<{ ok: boolean; text: string }>[] = [];
    try {
      setStep('In the pop-up choose “This tab” and click Share once. Everything else is automatic.');
      const n = await recordSeries({
        tab: topic.tab, title: topic.title, theme: Math.floor(Math.random() * 6), features: topic.features, script: () => script(topic, seed + Math.floor(Math.random() * 1000)), voice: true, audio: 'ai', secondsPerPart: 6, voiceLang: 'ur', format: '9:16', stop: stopRef.current, returnTab: 'DASHBOARD', onStatus: (m) => setStep(m),
        onVideo: async (blob, meta) => {
          const title = `${topic.title} — ${meta.label}`; const m = metaFor(topic.id, title).map((x) => ({ ...x, title: noFree(x.title), description: noFree(x.description) }));
          setStep(`Sending “${meta.label}” to the academy channels…`); tourStore.uploading = true; let id: string; let coverId: string | undefined;
          try { id = await stageVideo(blob); try { const th = await makeThumbnail(blob, `${topic.title}: ${meta.label}`); coverId = await stageVideo(th, 'jpg'); } catch { /* cover is optional */ } } finally { tourStore.uploading = false; }
          jobs.push(publishMeta(id, defaultCfg(), m.find((x) => x.platform === 'facebook')!, m.find((x) => x.platform === 'instagram')!, [], coverId, undefined, { category: topic.id, title, student: true })
            .then((r) => { const okN = Object.entries(r).filter(([, v]) => v.ok).length; const bad = Object.entries(r).filter(([, v]) => !v.ok).length; return { ok: okN > 0, text: bad && !okN ? 'not posted' : `${okN} platform${okN === 1 ? '' : 's'}` }; })
            .catch((e: any) => ({ ok: false, text: String(e?.message || e) })));
        },
      });
      setStep('Finishing the uploads…'); const res = await Promise.all(jobs); const good = res.filter((r) => r.ok).length; const first = res.find((r) => !r.ok);
      setResult(good ? { ok: true, text: `✅ Done: ${good} of ${n} video${n === 1 ? '' : 's'} posted.${first ? ` (${res.length - good} could not be posted: ${first.text})` : ''}` } : { ok: false, text: `❌ Nothing was posted${first ? `: ${first.text}` : ''}. Please try again.` });
    } catch (e: any) { setResult({ ok: false, text: `❌ ${String(e?.message || e)}` }); } finally { setBusy(false); setStep(''); }
  };

  return (
    <>
      {!busy && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 left-4 z-[70] flex items-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500" data-testid="student-record-open"><Clapperboard className="h-4 w-4" /> Record</button>}
      {busy && <div className="fixed left-1/2 top-2 z-[80] flex w-[min(92vw,640px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-rose-400/50 bg-slate-950/95 px-3 py-2 text-xs text-rose-100 shadow-xl" role="status" data-testid="student-record-status"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /><span className="flex-1">{step || 'Working…'}</span><button type="button" onClick={() => { stopRef.current.stop = true; }} className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 font-semibold hover:bg-slate-700"><Square className="h-3 w-3" /> Stop</button></div>}
      {result && !busy && <div className={`fixed bottom-20 left-4 z-[70] max-w-sm rounded-xl border px-3 py-2 text-sm font-semibold shadow-lg ${result.ok ? 'border-emerald-400/50 bg-emerald-950/95 text-emerald-100' : 'border-rose-400/50 bg-rose-950/95 text-rose-100'}`} role="status">{result.text}<button type="button" className="ml-2 text-slate-300" aria-label="Close" onClick={() => setResult(null)}>×</button></div>}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" data-testid="student-record-dialog">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-100">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Record a video</h2><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
            <label className="block text-xs text-slate-400">Category
              <select className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" value={tid} onChange={(e) => setTid(e.target.value)}>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <p className="text-xs text-slate-400">Press Record, choose “This tab” in the pop-up and click Share once. The app records every sub-category, adds the voice, title, caption and hashtags, and posts the videos to the academy channels. Keep this page open until it says Done.</p>
            <button type="button" onClick={() => void record()} className="w-full rounded-xl bg-rose-600 py-3 text-base font-bold text-white hover:bg-rose-500" data-testid="student-record-go">Record</button>
          </div>
        </div>
      )}
    </>
  );
};
