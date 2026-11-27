import { getStoredToken } from './authClient';
import type { PlatformMeta } from './publishPack';

export interface PubConfig { at?: number; autoSet?: boolean; ytClientId: string; metaPageId: string; metaPageToken: string; igUserId: string; auto: { youtube: boolean; facebook: boolean; instagram: boolean } }
const KEY = 'pp_publish_cfg_v1';
export const defaultCfg = (): PubConfig => ({ ytClientId: '', metaPageId: '', metaPageToken: '', igUserId: '', auto: { youtube: false, facebook: false, instagram: false } });
/** Facebook/Instagram auto-post is ON by default until the owner deliberately changes it. */
export const autoOn = (c: PubConfig, k: 'youtube' | 'facebook' | 'instagram') => (c.autoSet ? !!c.auto[k] : k !== 'youtube' ? true : !!c.auto.youtube);
export function loadCfg(): PubConfig { try { return { ...defaultCfg(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaultCfg(); } }
let pushT: ReturnType<typeof setTimeout> | null = null; let lastSync = '';
/** Saves in this browser at once, and to the owner's encrypted account storage a moment later (so every device shares it). */
export function saveCfg(c: PubConfig) { const n = { ...c, at: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } if (pushT) clearTimeout(pushT); pushT = setTimeout(() => { void pushCfg(n); }, 600); }
async function pushCfg(c: PubConfig): Promise<boolean> { try { const r = await fetch('/api/admin/social/publish-config', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ cfg: c }) }); const j = await r.json().catch(() => ({})); lastSync = j.ok ? 'ok' : (j.error || `HTTP ${r.status}`); return !!j.ok; } catch (e: any) { lastSync = String(e?.message || e); return false; } }
export const syncStatus = () => lastSync;
/** Loads the account-wide settings. The newest copy wins; an older/missing server copy is refreshed from this browser. */
export async function syncCfg(): Promise<{ cfg: PubConfig; from: 'server' | 'browser' | 'none'; saved: boolean; error?: string }> {
  const local = loadCfg();
  try {
    const r = await fetch('/api/admin/social/publish-config', { credentials: 'include', headers: { ...auth() }, cache: 'no-store' }); const j = await r.json().catch(() => ({}));
    if (!j.ok) return { cfg: local, from: local.metaPageToken ? 'browser' : 'none', saved: false, error: j.error || `HTTP ${r.status}` };
    const sv: PubConfig | null = j.cfg ? { ...defaultCfg(), ...j.cfg } : null;
    if (sv && (sv.at || 0) >= (local.at || 0) && (sv.metaPageToken || sv.ytClientId)) { try { localStorage.setItem(KEY, JSON.stringify(sv)); } catch { /* ignore */ } return { cfg: sv, from: 'server', saved: true }; }
    if (local.metaPageToken || local.ytClientId) { const ok = await pushCfg(local.at ? local : { ...local, at: Date.now() }); return { cfg: local, from: 'browser', saved: ok, error: ok ? undefined : lastSync }; }
    return { cfg: sv || local, from: sv ? 'server' : 'none', saved: true };
  } catch (e: any) { return { cfg: local, from: 'browser', saved: false, error: String(e?.message || e) }; }
}
const auth = () => { const t = getStoredToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };

let gsi: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (!gsi) gsi = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = () => res(); s.onerror = () => { gsi = null; rej(new Error('Could not load Google sign-in')); }; document.head.appendChild(s); });
  return gsi;
}
let ytToken: { token: string; exp: number } | null = null;
/** Opens Google's own consent pop-up. The video goes straight from this browser to YouTube; nothing is stored on our server. */
export async function connectYouTube(clientId: string): Promise<string> {
  if (ytToken && ytToken.exp > Date.now() + 60_000) return ytToken.token;
  await loadGsi();
  return await new Promise<string>((resolve, reject) => {
    const tc = (window as any).google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: 'https://www.googleapis.com/auth/youtube.upload', callback: (r: any) => { if (r.error) return reject(new Error(r.error_description || r.error)); ytToken = { token: r.access_token, exp: Date.now() + Number(r.expires_in || 3600) * 1000 }; resolve(r.access_token); }, error_callback: (e: any) => reject(new Error(e?.message || e?.type || 'Google sign-in was closed')) });
    tc.requestAccessToken({ prompt: ytToken ? '' : 'consent' });
  });
}
export async function uploadYouTube(clientId: string, video: Blob, meta: PlatformMeta, thumb?: Blob): Promise<string> {
  const token = await connectYouTube(clientId);
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(video.size) },
    body: JSON.stringify({ snippet: { title: meta.title, description: meta.description, tags: meta.hashtags.slice(0, 15), categoryId: '27', defaultLanguage: 'ur' }, status: { privacyStatus: 'public', selfDeclaredMadeForKids: false } }) });
  if (!init.ok) throw new Error(`YouTube refused the upload (HTTP ${init.status}). ${(await init.text()).slice(0, 160)}`);
  const loc = init.headers.get('Location'); if (!loc) throw new Error('YouTube gave no upload address');
  const up = await fetch(loc, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: video }); const j: any = await up.json().catch(() => ({}));
  if (!up.ok || !j.id) throw new Error(`YouTube upload failed (HTTP ${up.status})`);
  if (thumb) { try { await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${j.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: thumb }); } catch { /* thumbnails need a verified channel */ } }
  return `https://youtube.com/shorts/${j.id}`;
}

export async function verifyMeta(pageId: string, pageToken: string): Promise<{ ok: boolean; name?: string; igUserId?: string | null; pageToken?: string; upgraded?: boolean; expires?: string; error?: string }> {
  const r = await fetch('/api/admin/social/meta/verify', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ pageId, pageToken }) }); return await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
}
export async function stageVideo(video: Blob, ext: 'mp4' | 'jpg' | 'webm' = 'mp4'): Promise<string> {
  // sent in 8 MB pieces so no single request is too large for the host; each piece is retried once
  const uid = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2)).replace(/-/g, ''); const SIZE = 8 * 1024 * 1024; const n = Math.max(1, Math.ceil(video.size / SIZE));
  for (let i = 0; i < n; i++) {
    const piece = video.slice(i * SIZE, (i + 1) * SIZE); let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`/api/admin/social/stage-chunk?uid=${uid}&i=${i}&n=${n}&ext=${ext}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/octet-stream', ...auth() }, body: piece, signal: AbortSignal.timeout(120_000) });
        const j = await r.json().catch(() => ({})); if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        if (i === n - 1) { if (!j.done || !j.id) throw new Error('The server did not finish the upload'); return j.id; } lastErr = ''; break;
      } catch (e: any) { lastErr = String(e?.message || e); }
    }
    if (lastErr) throw new Error(`Could not upload the video (piece ${i + 1}/${n}): ${lastErr}`);
  }
  throw new Error('Empty video');
}
export async function publishMeta(id: string, cfg: PubConfig, fb: PlatformMeta, ig: PlatformMeta, targets: string[], coverId?: string, onNote?: (n: string) => void, info?: { category: string; title: string }): Promise<Record<string, { ok: boolean; id?: string; error?: string }>> {
  const r = await fetch('/api/admin/social/meta/publish', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ id, coverId, pageId: cfg.metaPageId, pageToken: cfg.metaPageToken, igUserId: cfg.igUserId, title: fb.title, description: fb.description, caption: ig.description, targets, category: info?.category, videoTitle: info?.title }) });
  const j = await r.json().catch(() => ({})); if (!j.job) throw new Error(j?.error || `HTTP ${r.status}`);
  // The server posts in the background (Instagram can take minutes); ask for progress until it is done.
  const end = Date.now() + 15 * 60_000; let lastNote = ''; let fails = 0;
  while (Date.now() < end) {
    await new Promise((res) => setTimeout(res, 4000));
    try { const p = await fetch(`/api/admin/social/meta/publish-status?job=${j.job}`, { credentials: 'include', headers: { ...auth() }, cache: 'no-store' }); const pj = await p.json(); fails = 0;
      if (!pj.ok) throw new Error(pj.error || 'status unavailable'); if (pj.note && pj.note !== lastNote) { lastNote = pj.note; onNote?.(pj.note); }
      if (pj.done) { const { error, ...res } = pj.results || {}; if (error && !Object.keys(res).length) throw new Error(error.error); return res; }
    } catch (e: any) { if (++fails >= 6) throw new Error(`Lost contact with the server while posting: ${String(e?.message || e)}`); }
  }
  throw new Error('Posting took longer than 15 minutes; check Facebook/Instagram directly.');
}
