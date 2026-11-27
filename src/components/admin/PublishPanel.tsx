import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Rocket } from 'lucide-react';
import { PlatformMeta, makeThumbnail, metaFor } from '../../utils/publishPack';
import { noFree } from '../../utils/noFree';
import { PerformancePanel } from './PerformancePanel';
import ChannelsPanel from './ChannelsPanel';
import { PubConfig, autoOn, loadCfg, publishMeta, saveCfg, stageVideo, syncCfg, fetchChannels, verifyMeta } from '../../utils/publishClient';
import { download } from '../../utils/postVisuals';
import { tourStore } from '../../utils/tour';
import { SetupGuide } from './SetupGuide';

export interface FinishedVideo { blob: Blob; category: string; title: string; headline: string; at: number }
const NAMES: Record<string, string> = { youtube: 'YouTube Shorts', pinterest: 'Pinterest', tiktok: 'TikTok', instagram: 'Instagram Reels', facebook: 'Facebook' };

/** Titles/descriptions/hashtags/thumbnail for every platform, plus one-click (or automatic) publishing. */
export function PublishPanel({ video }: { video: FinishedVideo | null }) {
  const [cfg, setCfg] = useState<PubConfig>(loadCfg); const [metas, setMetas] = useState<PlatformMeta[]>([]); const [thumb, setThumb] = useState<Blob | null>(null); const [thumbUrl, setThumbUrl] = useState('');
  const [log, setLog] = useState<string[]>([]); const [busy, setBusy] = useState(false); const last = useRef(0);
  const say = (m: string) => setLog((l) => [...l, m].slice(-12));
  const [store, setStore] = useState(''); const [banner, setBanner] = useState<{ ok: boolean; text: string; at: string } | null>(() => { try { return JSON.parse(localStorage.getItem('pp_last_post') || 'null'); } catch { return null; } });
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const lastAnn = useRef({ t: '', at: 0 });
  const announce = (ok: boolean, text: string) => { try { window.dispatchEvent(new Event('ppfx-post-refresh')); } catch { /* ignore */ } if (lastAnn.current.t === text && Date.now() - lastAnn.current.at < 120_000) return; lastAnn.current = { t: text, at: Date.now() }; const b = { ok, text, at: new Date().toLocaleString() }; setBanner(b); try { localStorage.setItem('pp_last_post', JSON.stringify(b)); } catch { /* ignore */ } try { if ('Notification' in window && Notification.permission === 'granted') new Notification(ok ? 'PrimePipFX: published' : 'PrimePipFX: posting problem', { body: text }); } catch { /* ignore */ } };
  useEffect(() => { let off = false; void syncCfg().then((r) => { if (off) return; setCfg(r.cfg); setStore(r.saved ? '✅ Saved to your account — the same on every device and browser.' : `⚠️ Only saved in this browser (${r.error || 'server storage unavailable'}).`); }); return () => { off = true; }; }, []);
  const upd = (p: Partial<PubConfig>) => { const n = { ...cfg, ...p }; setCfg(n); saveCfg(n); };
  const meta = (p: string) => metas.find((m) => m.platform === p)!;
  useEffect(() => { void (async () => {
    if (!video || video.at === last.current) return; last.current = video.at; const fresh = !tourStore.handled.has(video.at); tourStore.handled.add(video.at);
    const nf = noFree; const m = metaFor(video.category, video.title).map((x) => ({ ...x, title: nf(x.title), description: nf(x.description) })); setMetas(m); setLog([]);
    void makeThumbnail(video.blob, video.headline).then((b) => { setThumb(b); setThumbUrl((u) => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(b); }); }).catch(() => { /* optional */ });
    try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission(); } catch { /* ignore */ } const c = loadCfg(); const ch = await fetchChannels(); const t = (['youtube', 'pinterest', 'tiktok', 'facebook', 'instagram'] as const).filter((k) => autoOn(c, k) && (k === 'youtube' ? ch.youtube.connected : k === 'pinterest' ? ch.pinterest.connected && !!ch.pinterest.board : k === 'tiktok' ? ch.tiktok.connected : !!(c.metaPageId && c.metaPageToken))); if (fresh && t.length) { chain.current = chain.current.then(() => publish(t, m, c)).catch(() => undefined); } else if (fresh) setLog(['Auto-post is waiting: add the Facebook Page ID and token above, then press “Post to all”.']);
  })(); }, [video]); // eslint-disable-line react-hooks/exhaustive-deps
  const publish = async (targets: string[], m = metas, c = cfg) => {
    if (!video || !m.length) return; setBusy(true);
    try {
      const meta2 = targets.filter((t) => t === 'facebook' || t === 'instagram' || t === 'youtube' || t === 'pinterest' || t === 'tiktok'); const needFb = meta2.some((t) => t === 'facebook' || t === 'instagram');
      if (meta2.length) { if (needFb && (!c.metaPageId || !c.metaPageToken)) say('Facebook/Instagram: add the Page ID and Page access token first.'); else { try { say('Preparing the video…'); let cc = c; if (needFb) try { const v = await verifyMeta(c.metaPageId, c.metaPageToken); if (v.ok) { cc = { ...c, metaPageToken: v.pageToken || c.metaPageToken, igUserId: v.igUserId || c.igUserId }; if (cc.metaPageToken !== c.metaPageToken || cc.igUserId !== c.igUserId) { saveCfg(cc); setCfg(cc); } } else { say(`Facebook ❌ ${v.error} — make a fresh token (see the setup guide)`); return; } } catch { /* try with what is saved */ } tourStore.uploading = true; let id: string; try { id = await stageVideo(video.blob); } finally { tourStore.uploading = false; } let coverId: string | undefined; if (thumb) { try { coverId = await stageVideo(thumb, 'jpg'); } catch { /* cover is optional */ } } say('Publishing (Instagram can take a few minutes)…'); window.dispatchEvent(new Event('ppfx-post-refresh')); const r = await publishMeta(id, cc, m.find((x) => x.platform === 'facebook')!, m.find((x) => x.platform === 'instagram')!, meta2, coverId, (n) => say(n), { category: video.category, title: video.title }); Object.entries(r).forEach(([k, v]) => say(`${NAMES[k]} ${v.ok ? '✅ posted' + (v.error ? ' — ' + v.error : '') : '❌ ' + v.error}`)); { const okN = Object.entries(r).filter(([, v]) => v.ok).map(([k]) => NAMES[k]); const bad = Object.entries(r).filter(([, v]) => !v.ok).map(([k, v]) => `${NAMES[k]}: ${v.error}`); const notes = Object.entries(r).filter(([, v]) => v.ok && v.error).map(([k, v]) => `${NAMES[k]}: ${v.error}`); announce(!bad.length, `${okN.length ? `✅ “${video.title}” is live on ${okN.join(' and ')}.` : ''}${notes.length ? ` ℹ️ ${notes.join(' · ')}` : ''}${bad.length ? ` ❌ ${bad.join(' · ')}` : ''}`.trim()); } } catch (e: any) { say(`Posting ❌ ${String(e?.message || e)}`); announce(false, `❌ Not posted: ${String(e?.message || e)}`); } } }
    } finally { setBusy(false); }
  };
  const verify = async () => { say('Checking the Facebook connection…'); const r = await verifyMeta(cfg.metaPageId, cfg.metaPageToken); if (r.ok) { upd({ ...(r.igUserId ? { igUserId: r.igUserId } : {}), ...(r.pageToken ? { metaPageToken: r.pageToken } : {}) }); if (r.upgraded) say(`Token converted to a permanent Page token (expires: ${r.expires === 'never' ? 'never' : r.expires ? r.expires.slice(0, 10) : 'unknown'}).`); say(`Facebook ✅ Page “${r.name}”${r.igUserId ? ' · Instagram linked ✅' : ' · no Instagram account linked to this Page'}`); } else say(`Facebook ❌ ${r.error}`); };
  const copy = (t: string) => void navigator.clipboard?.writeText(t);
  const inp = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100';
  return (
    <div className="space-y-3">
    {banner && <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${banner.ok ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100' : 'border-rose-400/50 bg-rose-500/15 text-rose-100'}`} data-testid="publish-banner" role="status">{banner.text} <span className="font-normal text-slate-400">· {banner.at}</span></div>}
    {busy && <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" role="status">⏳ Posting to your channels… keep this page open. {log[log.length - 1] || ''}</div>}
    <ChannelsPanel />
    <SetupGuide cfg={cfg} />
    <details className="rounded-xl border border-emerald-500/30 bg-slate-950/70 p-3" open data-testid="publish-panel">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-200">🚀 Titles, thumbnail and auto-posting {video ? `— ready for “${video.title}”` : '— record a video to fill this in'}</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-lg bg-slate-900/60 p-2">
          <div className="text-xs font-bold text-slate-200">Connect your accounts</div>
          {store && <div className="text-[11px] text-slate-300" data-testid="publish-store">{store}</div>}
          <label className="block text-[11px] text-slate-400">YouTube — Google OAuth client ID (see the setup guide above for the 5 steps)
            <input className={inp} value={cfg.ytClientId} onChange={(e) => upd({ ytClientId: e.target.value.trim() })} placeholder="1234-abc.apps.googleusercontent.com" /></label>
          <label className="block text-[11px] text-slate-400">Facebook Page ID<input className={inp} value={cfg.metaPageId} onChange={(e) => upd({ metaPageId: e.target.value.trim() })} /></label>
          <label className="block text-[11px] text-slate-400">Facebook Page access token (also posts to the linked Instagram)<input className={inp} type="password" value={cfg.metaPageToken} onChange={(e) => upd({ metaPageToken: e.target.value.trim() })} /></label>
          <button type="button" onClick={() => void verify()} className="rounded bg-slate-700 px-2 py-1 text-xs text-white">Check Facebook / Instagram connection</button>
          <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-300">
            {(['youtube', 'pinterest', 'tiktok', 'facebook', 'instagram'] as const).map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={autoOn(cfg, k)} onChange={(e) => upd({ autoSet: true, auto: { youtube: autoOn(cfg, 'youtube'), pinterest: autoOn(cfg, 'pinterest'), tiktok: autoOn(cfg, 'tiktok'), facebook: autoOn(cfg, 'facebook'), instagram: autoOn(cfg, 'instagram'), [k]: e.target.checked } })} />Auto-post to {NAMES[k]} after recording</label>)}
          </div>
          <div className="text-[11px] text-slate-500">TikTok posts privately until TikTok audits the app, and public YouTube needs Google’s approval (see the setup guide). The manual buttons below always work: download, copy the text, upload (10 seconds).</div>
        </div>
        <div className="space-y-2">
          {thumbUrl && <div className="flex items-start gap-2"><img src={thumbUrl} alt="thumbnail" className="h-40 rounded-lg border border-slate-700" /><button type="button" onClick={() => thumb && download(thumb, `${video?.category.toLowerCase()}-cover.jpg`)} className="rounded bg-slate-700 px-2 py-1 text-xs text-white"><Download className="inline h-3 w-3" /> Cover</button></div>}
          <div className="flex flex-wrap gap-1.5">
            {(['youtube', 'pinterest', 'tiktok', 'facebook', 'instagram'] as const).map((k) => <button key={k} type="button" disabled={busy || !video} onClick={() => void publish([k])} className="rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Rocket className="inline h-3 w-3" /> Post to {NAMES[k]}</button>)}
            <button type="button" disabled={!video} onClick={() => video && download(video.blob, `${video.category.toLowerCase()}-reel.${video.blob.type.includes('mp4') ? 'mp4' : 'webm'}`)} className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50" data-testid="download-video"><Download className="inline h-3 w-3" /> Download video</button>
            <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white">Open TikTok upload</a>
            <a href="https://studio.youtube.com/" target="_blank" rel="noreferrer" className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white">Open YouTube Studio</a>
            <button type="button" disabled={busy || !video} onClick={() => void publish(['youtube', 'pinterest', 'facebook', 'instagram'])} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-extrabold text-black disabled:opacity-50">Post to all</button>
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
    <PerformancePanel onDone={announce} />
    </div>
  );
}
