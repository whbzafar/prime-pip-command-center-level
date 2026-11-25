import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Check, Copy, Palette, RefreshCw, Send, Sparkles, Trash2, X } from 'lucide-react';
import { PostStudio } from './PostStudio';
import { getStoredToken } from '../../utils/authClient';

type Platform = 'facebook' | 'instagram' | 'youtube' | 'tiktok';
interface Post { id: string; platform: Platform; pillar: string; title: string; caption: string; hashtags: string[]; keywords: string[]; cta: string; imageUrl?: string; scheduledAt: string; status: string; publishedAt?: string; error?: string; source: 'ai' | 'template'; hooks: string[]; slides: string[]; beats: { t: string; onScreen: string; voice: string }[]; score: { total: number; hook: number; clarity: number; seo: number; cta: number; tags: number; tips: string[] }; rating?: 'good' | 'bad' }
interface Cfg { enabled: boolean; mode: 'review' | 'auto'; platforms: Record<Platform, boolean>; perDay: Record<Platform, number> }
interface Data { config: Cfg; creds: { facebook: boolean; instagram: boolean; youtubeNote: string }; bestTimes: Record<Platform, string[]>; ai: boolean; posts: Post[] }

const PLAT: Record<Platform, { label: string; cls: string }> = {
  facebook: { label: 'Facebook', cls: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
  instagram: { label: 'Instagram', cls: 'border-pink-500/40 text-pink-300 bg-pink-500/10' },
  youtube: { label: 'YouTube', cls: 'border-red-500/40 text-red-300 bg-red-500/10' },
  tiktok: { label: 'TikTok', cls: 'border-cyan-400/40 text-cyan-200 bg-cyan-400/10' },
};
const STATUS: Record<string, string> = { draft: 'Needs approval', approved: 'Approved · scheduled', published: 'Published', failed: 'Failed', rejected: 'Rejected', manual: 'Upload manually' };
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' PKT';

export const SocialAgentPanel: React.FC = () => {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState<'all' | Platform>('all');
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [studio, setStudio] = useState<string | null>(null);
  const hdr = () => { const t = getStoredToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }; };
  const call = useCallback(async (url: string, method = 'GET', body?: unknown) => {
    const r = await fetch(url, { method, headers: hdr(), credentials: 'include', body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); return { ok: r.ok && j.ok !== false, j };
  }, []);
  const load = useCallback(async () => { const { ok, j } = await call('/api/admin/social-agent'); if (ok) { setD(j); setErr(''); } else setErr(j.error || 'Could not load'); }, [call]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [load]);

  const act = async (key: string, fn: () => Promise<void>) => { setBusy(key); setErr(''); try { await fn(); await load(); } catch (e: any) { setErr(String(e?.message || e)); } finally { setBusy(''); } };
  const setCfg = (patch: Record<string, unknown>) => act('cfg', async () => { await call('/api/admin/social-agent/config', 'POST', patch); });
  const gen = (platform?: Platform, count = 3) => act('gen', async () => { const { ok, j } = await call('/api/admin/social-agent/generate', 'POST', { platform, count }); if (!ok) throw new Error(j.error || 'Generation failed'); });
  const setStatus = (id: string, status: string) => act(id, async () => { await call(`/api/admin/social-agent/post/${id}`, 'POST', { status }); });
  const publish = (id: string) => act(id, async () => { const { ok, j } = await call(`/api/admin/social-agent/post/${id}/publish`, 'POST'); if (!ok) throw new Error(j.error || 'Publish failed'); });
  const del = (id: string) => act(id, async () => { await call(`/api/admin/social-agent/post/${id}`, 'DELETE'); });
  const saveEdit = (p: Post) => act(p.id, async () => { const { ok, j } = await call(`/api/admin/social-agent/post/${p.id}`, 'POST', { caption: edit[p.id] }); if (!ok) throw new Error(j.error || 'Save failed'); setEdit((e) => { const n = { ...e }; delete n[p.id]; return n; }); });
  const rate = (id: string, rating: 'good' | 'bad') => act(id, async () => { await call(`/api/admin/social-agent/post/${id}`, 'POST', { rating }); });
  const saveHeads = async (id: string, hooks: string[], slides: string[]) => { const { ok, j } = await call(`/api/admin/social-agent/post/${id}`, 'POST', { hooks, slides }); if (!ok) throw new Error(j.error || 'Save failed'); await load(); };
  const copy = (p: Post) => void navigator.clipboard?.writeText(`${p.title}\n\n${p.caption}\n\n${p.hashtags.join(' ')}`);

  if (!d) return <div className="p-6 text-sm text-slate-400">{err || 'Loading the agent…'}</div>;
  const c = d.config;
  const posts = d.posts.filter((p) => filter === 'all' || p.platform === filter);
  const card = 'rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4';

  return (
    <div className="space-y-4 p-1" data-testid="social-agent-panel">
      <div className={`${card} flex flex-wrap items-center gap-3`}>
        <Bot className="h-6 w-6 text-amber-300" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">Social Growth Agent</h3>
          <p className="text-xs text-slate-400">Writes SEO-optimised posts and HD images for Facebook, Instagram, YouTube and TikTok about the terminal, scores them, schedules them at the best times in Pakistan time, and publishes them. Content: {d.ai ? 'Gemini AI' : 'built-in templates (add GEMINI_API_KEY for AI writing)'}.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <input type="checkbox" checked={c.enabled} onChange={(e) => setCfg({ enabled: e.target.checked })} className="h-4 w-4" /> Agent {c.enabled ? 'ON' : 'OFF'}
        </label>
      </div>

      {err && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200" role="alert">{err}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h4 className="mb-2 text-sm font-bold text-slate-100">Mode</h4>
          <div className="flex gap-2">
            {(['review', 'auto'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setCfg({ mode: m })} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${c.mode === m ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-slate-700 text-slate-400'}`}>
                {m === 'review' ? 'Review first (recommended)' : 'Fully automatic'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">{c.mode === 'review' ? 'New posts wait for your approval, then publish at their time.' : 'The agent writes, approves and publishes by itself, and keeps the queue topped up.'}</p>
        </div>
        <div className={card}>
          <h4 className="mb-2 text-sm font-bold text-slate-100">Platforms · posts per day · best times (PKT)</h4>
          {(Object.keys(PLAT) as Platform[]).map((p) => (
            <div key={p} className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
              <label className="flex w-28 items-center gap-2 text-slate-200"><input type="checkbox" checked={c.platforms[p]} onChange={(e) => setCfg({ platforms: { [p]: e.target.checked } })} />{PLAT[p].label}</label>
              <input type="number" min={0} max={4} value={c.perDay[p]} onChange={(e) => setCfg({ perDay: { [p]: Number(e.target.value) } })} className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100" aria-label={`${PLAT[p].label} posts per day`} />
              <span className="text-xs text-slate-400">{d.bestTimes[p].join(' · ')}</span>
              <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold ${p === 'youtube' || p === 'tiktok' ? 'border-slate-600 text-slate-300' : d.creds[p as 'facebook' | 'instagram'] ? 'border-emerald-500/40 text-emerald-300' : 'border-amber-500/40 text-amber-300'}`}>{p === 'youtube' || p === 'tiktok' ? 'package' : d.creds[p as 'facebook' | 'instagram'] ? 'connected' : 'not connected'}</span>
            </div>
          ))}
          <p className="mt-2 text-xs text-slate-400">Times are common high-engagement windows, not guarantees. Posts per day are capped at 4 to avoid being flagged as spam.</p>
        </div>
      </div>

      {(!d.creds.facebook || !d.creds.instagram) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
          <b>To publish automatically</b> add these on Render (Environment): <code>META_PAGE_TOKEN</code> (long-lived Page access token with pages_manage_posts and instagram_content_publish), <code>FB_PAGE_ID</code>, and <code>IG_USER_ID</code> (Instagram Business account linked to the Page). Until then posts are prepared here and can be copied with one tap. {d.creds.youtubeNote}
        </div>
      )}

      <div className={`${card} flex flex-wrap items-center gap-2`}>
        <button type="button" disabled={busy === 'gen'} onClick={() => gen(undefined, 3)} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-60">
          {busy === 'gen' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate posts for all platforms
        </button>
        {(Object.keys(PLAT) as Platform[]).map((p) => <button key={p} type="button" disabled={busy === 'gen'} onClick={() => gen(p, 3)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${PLAT[p].cls}`}>+3 {PLAT[p].label}</button>)}
        <div className="ml-auto flex gap-1">
          {(['all', 'facebook', 'instagram', 'youtube', 'tiktok'] as const).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${filter === f ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{f === 'all' ? 'All' : PLAT[f].label}</button>)}
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 && <div className="rounded-xl border border-slate-700/60 p-6 text-center text-sm text-slate-400">No posts yet. Press “Generate posts”.</div>}
        {posts.map((p) => (
          <div key={p.id} className={card}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${PLAT[p.platform].cls}`}>{PLAT[p.platform].label}</span>
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">{STATUS[p.status] || p.status}</span>
              <span className="text-xs text-slate-400">{p.status === 'published' && p.publishedAt ? `Published ${when(p.publishedAt)}` : `Scheduled ${when(p.scheduledAt)}`}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-900 ${p.score.total >= 75 ? 'bg-emerald-400' : p.score.total >= 55 ? 'bg-amber-400' : 'bg-red-400'}`} title="Writing-quality score">{p.score.total}</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500">{p.source === 'ai' ? 'AI' : 'template'} · {p.pillar}</span>
            </div>
            <div className="text-sm font-bold text-white">{p.title}</div>
            {edit[p.id] != null ? (
              <textarea value={edit[p.id]} onChange={(e) => setEdit({ ...edit, [p.id]: e.target.value })} rows={7} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100" />
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{p.caption}</p>
            )}
            <p className="mt-1 text-xs text-sky-300">{p.hashtags.join(' ')}</p>
            {p.keywords.length > 0 && <p className="mt-0.5 text-[11px] text-slate-500">SEO: {p.keywords.join(', ')}</p>}
            {p.error && <p className="mt-1 text-xs text-red-300">{p.error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {p.status !== 'published' && p.status !== 'manual' && (p.status === 'draft' || p.status === 'rejected' || p.status === 'failed') && <button type="button" onClick={() => setStatus(p.id, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"><Check className="h-3.5 w-3.5" />Approve</button>}
              {p.status === 'approved' && <button type="button" onClick={() => setStatus(p.id, 'draft')} className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-200">Unapprove</button>}
              <button type="button" onClick={() => setStudio(studio === p.id ? null : p.id)} className="inline-flex items-center gap-1 rounded-lg bg-violet-500/25 px-3 py-1.5 text-xs font-bold text-violet-100"><Palette className="h-3.5 w-3.5" />{studio === p.id ? 'Close studio' : 'HD images'}</button>
              {p.status !== 'published' && p.platform !== 'youtube' && p.platform !== 'tiktok' && <button type="button" disabled={busy === p.id} onClick={() => publish(p.id)} className="inline-flex items-center gap-1 rounded-lg bg-amber-400/90 px-3 py-1.5 text-xs font-bold text-slate-900"><Send className="h-3.5 w-3.5" />Publish now</button>}
              <button type="button" onClick={() => copy(p)} className="inline-flex items-center gap-1 rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-200"><Copy className="h-3.5 w-3.5" />Copy</button>
              {edit[p.id] != null ? (
                <>
                  <button type="button" onClick={() => saveEdit(p)} className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-200">Save</button>
                  <button type="button" onClick={() => setEdit((e) => { const n = { ...e }; delete n[p.id]; return n; })} className="rounded-lg px-3 py-1.5 text-xs text-slate-400"><X className="inline h-3.5 w-3.5" /></button>
                </>
              ) : p.status !== 'published' && <button type="button" onClick={() => setEdit({ ...edit, [p.id]: p.caption })} className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-200">Edit</button>}
              <button type="button" onClick={() => del(p.id)} aria-label="Delete post" className="ml-auto rounded-lg px-2 py-1.5 text-slate-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
            {studio === p.id && <PostStudio post={p} onRate={(r) => void rate(p.id, r)} onSaveHeadlines={(h, sl) => saveHeads(p.id, h, sl)} />}
          </div>
        ))}
      </div>
      <p className="px-1 text-[11px] text-slate-500">Posts never promise profits or results and always carry a risk line. Reach depends on the platforms and your audience; no tool can guarantee millions of views.</p>
    </div>
  );
};
