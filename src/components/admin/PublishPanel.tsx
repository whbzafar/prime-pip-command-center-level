import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Rocket } from 'lucide-react';
import { PlatformMeta, makeThumbnail, metaFor } from '../../utils/publishPack';
import { PubConfig, loadCfg, publishMeta, saveCfg, stageVideo, uploadYouTube, verifyMeta } from '../../utils/publishClient';
import { download } from '../../utils/postVisuals';
import { tourStore } from '../../utils/tour';
import { SetupGuide } from './SetupGuide';

export interface FinishedVideo { blob: Blob; category: string; title: string; headline: string; at: number }
const NAMES: Record<string, string> = { youtube: 'YouTube Shorts', tiktok: 'TikTok', instagram: 'Instagram Reels', facebook: 'Facebook' };

/** Titles/descriptions/hashtags/thumbnail for every platform, plus one-click (or automatic) publishing. */
export function PublishPanel({ video }: { video: FinishedVideo | null }) {
  const [cfg, setCfg] = useState<PubConfig>(loadCfg); const [metas, setMetas] = useState<PlatformMeta[]>([]); const [thumb, setThumb] = useState<Blob | null>(null); const [thumbUrl, setThumbUrl] = useState('');
  const [log, setLog] = useState<string[]>([]); const [busy, setBusy] = useState(false); const last = useRef(0);
  const say = (m: string) => setLog((l) => [...l, m].slice(-12));
  const upd = (p: Partial<PubConfig>) => { const n = { ...cfg, ...p }; setCfg(n); saveCfg(n); };
  const meta = (p: string) => metas.find((m) => m.platform === p)!;
  useEffect(() => {
    if (!video || video.at === last.current) return; last.current = video.at; const fresh = !tourStore.handled.has(video.at); tourStore.handled.add(video.at);
    const m = metaFor(video.category, video.title); setMetas(m); setLog([]);
    void makeThumbnail(video.blob, video.headline).then((b) => { setThumb(b); setThumbUrl((u) => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(b); }); }).catch(() => { /* optional */ });
    const c = loadCfg(); if (fresh && (c.auto.youtube || c.auto.facebook || c.auto.instagram)) void publish(['youtube', 'facebook', 'instagram'].filter((k) => (c.auto as any)[k]), m, c);
  }, [video]); // eslint-disable-line react-hooks/exhaustive-deps
  const publish = async (targets: string[], m = metas, c = cfg) => {
    if (!video || !m.length) return; setBusy(true);
    try {
      if (targets.includes('youtube')) { if (!c.ytClientId) say('YouTube: add your Google client ID first.'); else { say('YouTube: uploading…'); try { say(`YouTube ✅ ${await uploadYouTube(c.ytClientId, video.blob, m.find((x) => x.platform === 'youtube')!, thumb || undefined)} (Google keeps it private until your project passes its audit; see the setup guide)`); } catch (e: any) { say(`YouTube ❌ ${String(e?.message || e)}`); } } }
      const meta2 = targets.filter((t) => t === 'facebook' || t === 'instagram');
      if (meta2.length) { if (!c.metaPageId || !c.metaPageToken) say('Facebook/Instagram: add the Page ID and Page access token first.'); else { try { say('Facebook/Instagram: preparing the video…'); const id = await stageVideo(video.blob); say('Facebook/Instagram: publishing (Instagram can take a few minutes)…'); const r = await publishMeta(id, c, m.find((x) => x.platform === 'facebook')!, m.find((x) => x.platform === 'instagram')!, meta2); Object.entries(r).forEach(([k, v]) => say(`${NAMES[k]} ${v.ok ? '✅ posted' : '❌ ' + v.error}`)); } catch (e: any) { say(`Facebook/Instagram ❌ ${String(e?.message || e)}`); } } }
    } finally { setBusy(false); }
  };
  const verify = async () => { say('Checking the Facebook connection…'); const r = await verifyMeta(cfg.metaPageId, cfg.metaPageToken); if (r.ok) { if (r.igUserId) upd({ igUserId: r.igUserId }); say(`Facebook ✅ Page “${r.name}”${r.igUserId ? ' · Instagram linked ✅' : ' · no Instagram account linked to this Page'}`); } else say(`Facebook ❌ ${r.error}`); };
  const copy = (t: string) => void navigator.clipboard?.writeText(t);
  const inp = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100';
  return (
    <div className="space-y-3">
    <SetupGuide cfg={cfg} />
    <details className="rounded-xl border border-emerald-500/30 bg-slate-950/70 p-3" open data-testid="publish-panel">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-200">🚀 Titles, thumbnail and auto-posting {video ? `— ready for “${video.title}”` : '— record a video to fill this in'}</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-lg bg-slate-900/60 p-2">
          <div className="text-xs font-bold text-slate-200">Connect your accounts (kept only in this browser)</div>
          <label className="block text-[11px] text-slate-400">YouTube — Google OAuth client ID (see the setup guide above for the 5 steps)
            <input className={inp} value={cfg.ytClientId} onChange={(e) => upd({ ytClientId: e.target.value.trim() })} placeholder="1234-abc.apps.googleusercontent.com" /></label>
          <label className="block text-[11px] text-slate-400">Facebook Page ID<input className={inp} value={cfg.metaPageId} onChange={(e) => upd({ metaPageId: e.target.value.trim() })} /></label>
          <label className="block text-[11px] text-slate-400">Facebook Page access token (also posts to the linked Instagram)<input className={inp} type="password" value={cfg.metaPageToken} onChange={(e) => upd({ metaPageToken: e.target.value.trim() })} /></label>
          <button type="button" onClick={() => void verify()} className="rounded bg-slate-700 px-2 py-1 text-xs text-white">Check Facebook / Instagram connection</button>
          <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-300">
            {(['youtube', 'facebook', 'instagram'] as const).map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={cfg.auto[k]} onChange={(e) => upd({ auto: { ...cfg.auto, [k]: e.target.checked } })} />Auto-post to {NAMES[k]} after recording</label>)}
          </div>
          <div className="text-[11px] text-slate-500">TikTok and public YouTube uploads need each platform’s one-time approval (explained in the setup guide). Until then use the manual buttons: download, copy the text below, upload (10 seconds).</div>
        </div>
        <div className="space-y-2">
          {thumbUrl && <div className="flex items-start gap-2"><img src={thumbUrl} alt="thumbnail" className="h-40 rounded-lg border border-slate-700" /><button type="button" onClick={() => thumb && download(thumb, `${video?.category.toLowerCase()}-cover.jpg`)} className="rounded bg-slate-700 px-2 py-1 text-xs text-white"><Download className="inline h-3 w-3" /> Cover</button></div>}
          <div className="flex flex-wrap gap-1.5">
            {(['youtube', 'facebook', 'instagram'] as const).map((k) => <button key={k} type="button" disabled={busy || !video} onClick={() => void publish([k])} className="rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Rocket className="inline h-3 w-3" /> Post to {NAMES[k]}</button>)}
            <button type="button" disabled={!video} onClick={() => video && download(video.blob, `${video.category.toLowerCase()}-reel.${video.blob.type.includes('mp4') ? 'mp4' : 'webm'}`)} className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50" data-testid="download-video"><Download className="inline h-3 w-3" /> Download video</button>
            <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white">Open TikTok upload</a>
            <a href="https://studio.youtube.com/" target="_blank" rel="noreferrer" className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white">Open YouTube Studio</a>
            <button type="button" disabled={busy || !video} onClick={() => void publish(['youtube', 'facebook', 'instagram'])} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-extrabold text-black disabled:opacity-50">Post to all</button>
          </div>
          {log.length > 0 && <div className="rounded-lg bg-black/40 p-2 text-[11px] text-emerald-100" data-testid="publish-log">{log.map((l, i) => <div key={i}>{l}</div>)}</div>}
        </div>
      </div>
      {metas.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">
        {metas.map((m) => (
          <div key={m.platform} className="rounded-lg bg-slate-900/60 p-2 text-xs text-slate-200">
            <div className="mb-1 flex items-center justify-between"><b>{NAMES[m.platform]}</b><button type="button" onClick={() => copy(`${m.title}\n\n${m.description}`)} className="rounded bg-slate-700 px-1.5 py-0.5 text-[11px]"><Copy className="inline h-3 w-3" /> Copy</button></div>
            <div className="font-semibold text-amber-200">{m.title}</div><div className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-slate-300">{m.description}</div>
          </div>))}
      </div>}
    </details>
    </div>
  );
}
