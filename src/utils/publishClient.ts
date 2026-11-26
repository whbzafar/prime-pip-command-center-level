import { getStoredToken } from './authClient';
import type { PlatformMeta } from './publishPack';

export interface PubConfig { ytClientId: string; metaPageId: string; metaPageToken: string; igUserId: string; auto: { youtube: boolean; facebook: boolean; instagram: boolean } }
const KEY = 'pp_publish_cfg_v1';
export const defaultCfg = (): PubConfig => ({ ytClientId: '', metaPageId: '', metaPageToken: '', igUserId: '', auto: { youtube: false, facebook: false, instagram: false } });
export function loadCfg(): PubConfig { try { return { ...defaultCfg(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaultCfg(); } }
export function saveCfg(c: PubConfig) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ } }
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

export async function verifyMeta(pageId: string, pageToken: string): Promise<{ ok: boolean; name?: string; igUserId?: string | null; error?: string }> {
  const r = await fetch('/api/admin/social/meta/verify', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ pageId, pageToken }) }); return await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
}
export async function stageVideo(video: Blob): Promise<string> {
  const r = await fetch('/api/admin/social/stage', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'video/mp4', ...auth() }, body: video }); const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error(j?.error || `Could not prepare the video (HTTP ${r.status})`); return j.id;
}
export async function publishMeta(id: string, cfg: PubConfig, fb: PlatformMeta, ig: PlatformMeta, targets: string[]): Promise<Record<string, { ok: boolean; id?: string; error?: string }>> {
  const r = await fetch('/api/admin/social/meta/publish', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ id, pageId: cfg.metaPageId, pageToken: cfg.metaPageToken, igUserId: cfg.igUserId, title: fb.title, description: fb.description, caption: ig.description, targets }) });
  const j = await r.json().catch(() => ({})); if (!j.results) throw new Error(j?.error || `HTTP ${r.status}`); return j.results;
}
