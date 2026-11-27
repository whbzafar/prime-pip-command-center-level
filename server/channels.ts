import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, RequestHandler } from "express";
import { openAsBlob } from "node:fs";
import { open as openP } from "node:fs/promises";
import { privateListGet, privateListUpdate } from "./durableStore.js";

/* YouTube Shorts and Pinterest: the owner signs in ONCE, the server keeps the long-lived refresh tokens in the private store
   (admin-only, never sent to students) and refreshes access tokens by itself, so every later post is fully automatic. */
const KEY = "social_channels_cfg";
export interface Channels { ytClientId?: string; ytClientSecret?: string; ytRefresh?: string; ytChannel?: string; pinAppId?: string; pinAppSecret?: string; pinAccess?: string; pinRefresh?: string; pinBoard?: string; pinBoardName?: string; pinUser?: string; pinSandbox?: boolean; ttKey?: string; ttSecret?: string; ttAccess?: string; ttRefresh?: string; ttExp?: number; ttOpenId?: string; ttUser?: string }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const readCh = async (): Promise<Channels> => ((await privateListGet(KEY))?.[0] as Channels) || {};
export const patchCh = async (p: Partial<Channels>) => { await privateListUpdate(KEY, (l) => [{ ...(l[0] || {}), ...p }]); };
const baseOf = (req: any) => (process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`).replace(/\/$/, "");
/* Sign-in links carry a signed timestamp, so they stay valid even if the server restarts or another copy of it answers the callback. */
const STATE_KEY = () => process.env.PRIMEPIPFX_SESSION_SECRET || process.env.SESSION_SECRET || process.env.RENDER_SERVICE_ID || "primepipfx-oauth-state";
const sign = (v: string) => createHmac("sha256", STATE_KEY()).update(v).digest("hex").slice(0, 32);
const newState = () => { const v = `${Date.now().toString(36)}${randomBytes(6).toString("hex")}`; return `${v}.${sign(v)}`; };
const okState = (s: string) => {
  const [v, g] = String(s || "").split("."); if (!v || !g) return false; const want = Buffer.from(sign(v)); const got = Buffer.from(g); if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  const t = parseInt(v.slice(0, v.length - 12), 36); return Number.isFinite(t) && Date.now() - t < 20 * 60_000 && Date.now() - t > -60_000;
};
const page = (ok: boolean, msg: string) => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body style="font-family:system-ui;background:#0b1220;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><div style="max-width:420px;text-align:center"><h2>${ok ? "✅ Connected" : "❌ Not connected"}</h2><p>${msg.replace(/</g, "&lt;")}</p><p><a style="color:#fbbf24" href="/">Back to the app</a></p></div>`;

/* ---------- YouTube ---------- */
let ytTok: { t: string; exp: number } | null = null;
async function ytAccess(): Promise<string> {
  if (ytTok && ytTok.exp > Date.now() + 60_000) return ytTok.t; const c = await readCh();
  if (!c.ytRefresh || !c.ytClientId || !c.ytClientSecret) throw new Error("YouTube is not connected yet. Open Social Agent → Channels and press Connect YouTube.");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: c.ytClientId, client_secret: c.ytClientSecret, refresh_token: c.ytRefresh, grant_type: "refresh_token" }), signal: AbortSignal.timeout(30_000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error === "invalid_grant" ? "YouTube sign-in expired (Google Testing mode lasts 7 days). Press Connect YouTube again, and set the consent screen to “In production” to make it permanent." : `YouTube sign-in failed: ${j.error_description || j.error || r.status}`);
  ytTok = { t: j.access_token, exp: Date.now() + Number(j.expires_in || 3600) * 1000 }; return j.access_token;
}
export async function ytUpload(path: string, size: number, o: { title: string; description: string; tags?: string[] }): Promise<{ id: string; url: string; privacy: string }> {
  const tok = await ytAccess(); const title = (/#shorts/i.test(o.title) ? o.title : `${o.title} #Shorts`).slice(0, 100);
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(size) },
    body: JSON.stringify({ snippet: { title, description: o.description.slice(0, 4900), tags: (o.tags || []).slice(0, 15), categoryId: "27" }, status: { privacyStatus: "public", selfDeclaredMadeForKids: false } }), signal: AbortSignal.timeout(60_000) });
  if (!init.ok) { const e: any = await init.json().catch(() => ({})); throw new Error(e?.error?.message || `YouTube refused the upload (HTTP ${init.status})`); }
  const loc = init.headers.get("location"); if (!loc) throw new Error("YouTube gave no upload address."); const fh = await openP(path, "r"); const CH = 8 * 1024 * 1024;
  try {
    for (let pos = 0; pos < size;) {
      const len = Math.min(CH, size - pos); const buf = Buffer.alloc(len); await fh.read(buf, 0, len, pos); let tries = 0;
      for (;;) {
        try {
          const r = await fetch(loc, { method: "PUT", headers: { "Content-Length": String(len), "Content-Range": `bytes ${pos}-${pos + len - 1}/${size}` }, body: buf, signal: AbortSignal.timeout(180_000) });
          if (r.status === 308) { pos += len; break; }
          if (r.ok) { const j: any = await r.json(); const priv = j?.status?.privacyStatus || "public"; return { id: j.id, url: `https://youtube.com/shorts/${j.id}`, privacy: priv }; }
          throw new Error(`HTTP ${r.status}`);
        } catch (e) { if (++tries > 3) throw e; await sleep(3000 * tries); }
      }
    }
  } finally { await fh.close(); }
  throw new Error("YouTube upload ended without a video id.");
}
export async function ytStats(ids: string[]): Promise<Record<string, { views: number; likes: number; comments: number }>> {
  const out: Record<string, { views: number; likes: number; comments: number }> = {}; if (!ids.length) return out; const tok = await ytAccess();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.slice(0, 50).join(",")}`, { headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(30_000) }); const j: any = await r.json().catch(() => ({}));
  for (const v of j.items || []) out[v.id] = { views: Number(v.statistics?.viewCount || 0), likes: Number(v.statistics?.likeCount || 0), comments: Number(v.statistics?.commentCount || 0) };
  return out;
}

/* ---------- Pinterest ---------- */
const pinHost = (c: Channels) => (c.pinSandbox ? "https://api-sandbox.pinterest.com" : "https://api.pinterest.com");
async function pinRefresh(c: Channels): Promise<Channels> {
  if (!c.pinRefresh || !c.pinAppId || !c.pinAppSecret) return c;
  const r = await fetch("https://api.pinterest.com/v5/oauth/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${c.pinAppId}:${c.pinAppSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: c.pinRefresh }), signal: AbortSignal.timeout(30_000) });
  const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error(`Pinterest sign-in failed: ${j.message || r.status}`);
  const n = { ...c, pinAccess: j.access_token, pinRefresh: j.refresh_token || c.pinRefresh }; await patchCh({ pinAccess: n.pinAccess, pinRefresh: n.pinRefresh }); return n;
}
async function pinApi(method: string, path: string, body?: any, retried = false): Promise<any> {
  let c = await readCh(); if (!c.pinAccess) throw new Error("Pinterest is not connected yet. Open Social Agent → Channels and press Connect Pinterest.");
  const call = (host: string, tok: string) => fetch(`${host}/v5${path}`, { method, headers: { Authorization: `Bearer ${tok}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60_000) });
  let r = await call(pinHost(c), c.pinAccess); let j: any = await r.json().catch(() => ({}));
  if (r.status === 401 && !retried) {
    try { c = await pinRefresh(c); } catch { /* refresh not possible: still try the sandbox host below */ }
    r = await call(pinHost(c), c.pinAccess!); j = await r.json().catch(() => ({}));
    // Trial-access apps only work on the sandbox host and standard ones only on the live host, so if one answers 401/403 the other is tried and remembered.
    if (r.status === 401 || r.status === 403) {
      const other = !c.pinSandbox; const r2 = await call(other ? "https://api-sandbox.pinterest.com" : "https://api.pinterest.com", c.pinAccess!); const j2: any = await r2.json().catch(() => ({}));
      if (r2.ok) { await patchCh({ pinSandbox: other }); return j2; }
    }
  } else if (!r.ok && r.status === 403 && /trial|sandbox/i.test(String(j.message || "")) && !c.pinSandbox) { await patchCh({ pinSandbox: true }); return pinApi(method, path, body, true); }
  if (!r.ok) throw new Error(j.message || `Pinterest HTTP ${r.status}`);
  return j;
}
export async function pinStats(id: string): Promise<{ views: number; saves: number; clicks: number }> {
  const d = new Date(); const e = d.toISOString().slice(0, 10); const st = new Date(Date.now() - 80 * 864e5).toISOString().slice(0, 10);
  const j = await pinApi("GET", `/pins/${encodeURIComponent(id)}/analytics?start_date=${st}&end_date=${e}&metric_types=IMPRESSION,SAVE,PIN_CLICK`);
  const a = j?.all?.summary_metrics || j?.summary_metrics || {}; return { views: Number(a.IMPRESSION || 0), saves: Number(a.SAVE || 0), clicks: Number(a.PIN_CLICK || 0) };
}
export async function pinPost(path: string, coverUrl: string, o: { title: string; description: string; link?: string }): Promise<{ id: string; sandbox: boolean }> {
  const c = await readCh(); if (!c.pinBoard) throw new Error("Choose a Pinterest board in Social Agent → Channels first.");
  const m = await pinApi("POST", "/media", { media_type: "video" }); const fd = new FormData(); for (const [k, v] of Object.entries(m.upload_parameters || {})) fd.append(k, String(v));
  fd.append("file", await openAsBlob(path, { type: "video/mp4" }), "video.mp4"); const up = await fetch(m.upload_url, { method: "POST", body: fd, signal: AbortSignal.timeout(300_000) }); if (!up.ok && up.status !== 204) throw new Error(`Pinterest upload failed (HTTP ${up.status})`);
  for (let i = 0; i < 60; i++) { const s = await pinApi("GET", `/media/${m.media_id}`); if (s.status === "succeeded") break; if (s.status === "failed") throw new Error("Pinterest could not process the video."); await sleep(5000); if (i === 59) throw new Error("Pinterest is still processing the video."); }
  const pin = await pinApi("POST", "/pins", { board_id: c.pinBoard, title: o.title.slice(0, 100), description: o.description.slice(0, 800), ...(o.link ? { link: o.link } : {}), media_source: { source_type: "video_id", media_id: m.media_id, cover_image_url: coverUrl } });
  return { id: String(pin.id), sandbox: !!(await readCh()).pinSandbox };
}


/* ---------- TikTok (Content Posting API v2) ---------- */
const TT = "https://open.tiktokapis.com";
async function ttToken(force = false): Promise<string> {
  const c = await readCh(); if (!c.ttAccess) throw new Error("TikTok is not connected yet. Open Social Agent → Channels and press Connect TikTok.");
  if (!force && c.ttExp && c.ttExp > Date.now() + 90_000) return c.ttAccess;
  if (!c.ttRefresh || !c.ttKey || !c.ttSecret) return c.ttAccess;
  const r = await fetch(`${TT}/v2/oauth/token/`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: c.ttKey, client_secret: c.ttSecret, grant_type: "refresh_token", refresh_token: c.ttRefresh }), signal: AbortSignal.timeout(30_000) });
  const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error(`TikTok sign-in expired (${j.error_description || j.error || r.status}). Press Connect TikTok again.`);
  await patchCh({ ttAccess: j.access_token, ttRefresh: j.refresh_token || c.ttRefresh, ttExp: Date.now() + Number(j.expires_in || 86400) * 1000 }); return j.access_token;
}
async function ttApi(path: string, body?: any, method = "POST"): Promise<any> {
  const tok = await ttToken(); const r = await fetch(`${TT}${path}`, { method, headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json; charset=UTF-8" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60_000) });
  const j: any = await r.json().catch(() => ({})); const code = j?.error?.code; if (!r.ok || (code && code !== "ok")) { const e: any = new Error(j?.error?.message || `TikTok HTTP ${r.status}`); e.ttCode = code || ""; throw e; } return j.data || {};
}
/** Posts the finished MP4 straight to the connected TikTok account. Apps TikTok has not audited yet can only post privately; the result says so. */
export async function ttPost(path: string, size: number, o: { title: string }): Promise<{ id: string; privacy: string; draft?: boolean }> {
  const info = await ttApi("/v2/post/publish/creator_info/query/"); const opts: string[] = info.privacy_level_options || ["SELF_ONLY"];
  const privacy = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"].find((x) => opts.includes(x)) || opts[0];
  const MB = 1024 * 1024; const chunk = size <= 64 * MB ? size : 32 * MB; const total = Math.max(1, Math.floor(size / chunk));
  const srcInfo = { source: "FILE_UPLOAD", video_size: size, chunk_size: chunk, total_chunk_count: total };
  let init: any; let draft = false;
  try { init = await ttApi("/v2/post/publish/video/init/", { post_info: { title: o.title.slice(0, 2200), privacy_level: privacy, disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000 }, source_info: srcInfo }); }
  catch (e: any) {
    const m = String(e?.message || ""); const blocked = /unaudited|integration guidelines|private account|url_ownership|spam_risk|not_authorized|scope/i.test(`${e?.ttCode || ""} ${m}`);
    if (!blocked) throw e;
    // TikTok has not audited this app, so direct posting is refused. Send it to the account's TikTok drafts instead; one tap there publishes it.
    try { init = await ttApi("/v2/post/publish/inbox/video/init/", { source_info: srcInfo }); draft = true; }
    catch (e2: any) { throw new Error(/scope|authori/i.test(String(e2?.message || "")) ? "TikTok needs one more approval. Open Social Agent → Channels and press Connect TikTok once." : "TikTok blocks direct posting until the app passes its audit. Make the TikTok account private once, or press Connect TikTok again to enable drafts."); }
  }
  if (!init.upload_url || !init.publish_id) throw new Error("TikTok gave no upload address.");
  const fh = await openP(path, "r");
  try {
    for (let i = 0; i < total; i++) {
      const start = i * chunk; const end = i === total - 1 ? size - 1 : start + chunk - 1; const len = end - start + 1; const buf = Buffer.alloc(len); await fh.read(buf, 0, len, start); let tries = 0;
      for (;;) {
        try {
          const r = await fetch(init.upload_url, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(len), "Content-Range": `bytes ${start}-${end}/${size}` }, body: buf, signal: AbortSignal.timeout(240_000) });
          if (r.ok || r.status === 206) break; throw new Error(`HTTP ${r.status}`);
        } catch (e) { if (++tries > 3) throw new Error(`TikTok upload failed (${String((e as any)?.message || e)})`); await sleep(3000 * tries); }
      }
    }
  } finally { await fh.close(); }
  for (let i = 0; i < 60; i++) {
    await sleep(4000); const st = await ttApi("/v2/post/publish/status/fetch/", { publish_id: init.publish_id });
    if (draft && (st.status === "SEND_TO_USER_INBOX" || st.status === "PUBLISH_COMPLETE")) return { id: String(init.publish_id), privacy: "DRAFT", draft: true };
    if (st.status === "PUBLISH_COMPLETE") return { id: String((st.publicaly_available_post_id || st.publicly_available_post_id || [init.publish_id])[0] || init.publish_id), privacy };
    if (st.status === "FAILED") throw new Error(`TikTok rejected the video: ${st.fail_reason || "unknown reason"}`);
  }
  throw new Error("TikTok is still processing the video; check the TikTok app in a few minutes.");
}

const doc = (title: string, body: string) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Prime Pip FX</title><body style="font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;line-height:1.6;color:#111"><h1>${title}</h1><p><em>Prime Pip FX Command Center — primepipfx.site. Last updated 27 November 2026.</em></p>${body}<p>Contact: whbzafar@gmail.com</p></body></html>`;
const PRIVACY = doc("Privacy Policy", `<p>Prime Pip FX Command Center is an education and trading-tools website run by Wahab Zafar.</p><h3>What we collect</h3><p>Account details you give us (name, email), your activity inside the app, and settings you save. We do not sell personal data.</p><h3>YouTube, Pinterest, Facebook and Instagram connections</h3><p>The site owner can connect the brand's own YouTube channel, Pinterest business account, Facebook Page and Instagram account so that educational videos are published automatically. The app uses these permissions only to upload and publish the owner's own videos and to read the resulting view and engagement counts. Access keys are stored encrypted on our server, are visible only to the owner, and are never shared. The owner can disconnect at any time inside the app or from the platform's own permission settings (for Google: myaccount.google.com/permissions). Our use of information received from Google APIs follows the Google API Services User Data Policy, including the Limited Use requirements.</p><h3>Your rights</h3><p>Ask us to access or delete your data by emailing the address below.</p>`);
const TERMS = doc("Terms of Service", `<p>The content on primepipfx.site is for education only and is not financial advice. Trading carries risk of loss. By using the site you agree to use it lawfully and not to misuse it or its content.</p>`);
export function registerChannelRoutes(app: Express, requireDeveloper: RequestHandler) {
  app.get(["/privacy", "/privacy-policy"], (_req, res) => res.type("html").send(PRIVACY));
  app.get(["/terms", "/terms-of-service"], (_req, res) => res.type("html").send(TERMS));
  app.get("/api/admin/social/channels", requireDeveloper, async (_req, res) => {
    res.set("Cache-Control", "no-store"); const c = await readCh();
    res.json({ ok: true, youtube: { clientSet: !!(c.ytClientId && c.ytClientSecret), connected: !!c.ytRefresh, channel: c.ytChannel || "" }, pinterest: { appSet: !!(c.pinAppId && c.pinAppSecret), connected: !!c.pinAccess, user: c.pinUser || "", board: c.pinBoard || "", boardName: c.pinBoardName || "", sandbox: !!c.pinSandbox }, tiktok: { appSet: !!(c.ttKey && c.ttSecret), connected: !!c.ttAccess, user: c.ttUser || "" } });
  });
  app.put("/api/admin/social/channels", requireDeveloper, async (req, res) => {
    const b = req.body || {}; const s = (v: any, n: number) => String(v ?? "").trim().slice(0, n); const p: Partial<Channels> = {};
    if (b.ytClientId !== undefined) { p.ytClientId = s(b.ytClientId, 300); ytTok = null; } if (b.ytClientSecret) p.ytClientSecret = s(b.ytClientSecret, 200);
    if (b.pinAppId !== undefined) p.pinAppId = s(b.pinAppId, 60); if (b.pinAppSecret) p.pinAppSecret = s(b.pinAppSecret, 200);
    if (b.ttKey !== undefined) p.ttKey = s(b.ttKey, 80); if (b.ttSecret) p.ttSecret = s(b.ttSecret, 120);
    if (b.pinBoard !== undefined) { p.pinBoard = s(b.pinBoard, 60); p.pinBoardName = s(b.pinBoardName, 100); }
    try { await patchCh(p); res.json({ ok: true }); } catch { res.status(503).json({ ok: false, error: "Private storage is not available on the server yet" }); }
  });
  app.get("/api/admin/social/yt/auth-url", requireDeveloper, async (req, res) => {
    const c = await readCh(); if (!c.ytClientId || !c.ytClientSecret) return res.status(400).json({ ok: false, error: "Save the Google client ID and secret first." });
    const q = new URLSearchParams({ client_id: c.ytClientId, redirect_uri: `${baseOf(req)}/api/public/oauth/youtube`, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true", scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly", state: newState() });
    res.json({ ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${q}`, redirect: `${baseOf(req)}/api/public/oauth/youtube` });
  });
  app.get("/api/public/oauth/youtube", async (req, res) => {
    try {
      if (req.query.error) throw new Error(String(req.query.error)); if (!okState(String(req.query.state || ""))) throw new Error("This sign-in link expired. Start again from the app."); const c = await readCh();
      const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ code: String(req.query.code || ""), client_id: c.ytClientId || "", client_secret: c.ytClientSecret || "", redirect_uri: `${baseOf(req)}/api/public/oauth/youtube`, grant_type: "authorization_code" }), signal: AbortSignal.timeout(30_000) });
      const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.refresh_token) throw new Error(j.error_description || j.error || "Google returned no long-lived key. Remove the app at myaccount.google.com/permissions and try again.");
      let name = ""; try { const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${j.access_token}` } }); const cj: any = await ch.json(); name = cj.items?.[0]?.snippet?.title || ""; } catch { /* optional */ }
      await patchCh({ ytRefresh: j.refresh_token, ytChannel: name }); ytTok = null; res.send(page(true, name ? `YouTube channel “${name}” is connected. Recordings will now post automatically.` : "YouTube is connected. Recordings will now post automatically."));
    } catch (e: any) { res.status(400).send(page(false, String(e?.message || e))); }
  });
  /* TikTok proves site ownership by fetching a signature file from the site root. */
  app.get("/tiktokTccV2w1R52QMx2DFQ2exRgJgZz5vDTOv.txt", (_req, res) => { res.type("text/plain").send("tiktok-developers-site-verification=TccV2w1R52QMx2DFQ2exRgJgZz5vDTOv"); });
  app.get("/api/admin/social/tt/auth-url", requireDeveloper, async (req, res) => {
    const c = await readCh(); if (!c.ttKey || !c.ttSecret) return res.status(400).json({ ok: false, error: "Save the TikTok client key and secret first." });
    const q = new URLSearchParams({ client_key: c.ttKey, scope: "user.info.basic,video.publish,video.upload", response_type: "code", redirect_uri: `${baseOf(req)}/api/public/oauth/tiktok`, state: newState() });
    res.json({ ok: true, url: `https://www.tiktok.com/v2/auth/authorize/?${q}`, redirect: `${baseOf(req)}/api/public/oauth/tiktok` });
  });
  app.get("/api/public/oauth/tiktok", async (req, res) => {
    try {
      if (req.query.error) throw new Error(String(req.query.error_description || req.query.error)); if (!okState(String(req.query.state || ""))) throw new Error("This sign-in link expired. Start again from the app."); const c = await readCh();
      const r = await fetch(`${TT}/v2/oauth/token/`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: c.ttKey || "", client_secret: c.ttSecret || "", code: String(req.query.code || ""), grant_type: "authorization_code", redirect_uri: `${baseOf(req)}/api/public/oauth/tiktok` }), signal: AbortSignal.timeout(30_000) });
      const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || "TikTok did not accept the sign-in.");
      await patchCh({ ttAccess: j.access_token, ttRefresh: j.refresh_token || "", ttExp: Date.now() + Number(j.expires_in || 86400) * 1000, ttOpenId: j.open_id || "" });
      let user = ""; try { const u = await ttApi("/v2/user/info/?fields=display_name,username", undefined, "GET"); user = u.user?.display_name || u.user?.username || ""; await patchCh({ ttUser: user }); } catch { /* optional */ }
      res.send(page(true, user ? `TikTok account “${user}” is connected. Recordings will now post to TikTok automatically.` : "TikTok is connected. Recordings will now post to TikTok automatically."));
    } catch (e: any) { res.status(400).send(page(false, String(e?.message || e))); }
  });
  app.get("/api/admin/social/pin/auth-url", requireDeveloper, async (req, res) => {
    const c = await readCh(); if (!c.pinAppId || !c.pinAppSecret) return res.status(400).json({ ok: false, error: "Save the Pinterest app ID and secret first." });
    const q = new URLSearchParams({ client_id: c.pinAppId, redirect_uri: `${baseOf(req)}/api/public/oauth/pinterest`, response_type: "code", scope: "boards:read,boards:write,pins:read,pins:write,user_accounts:read", state: newState() });
    res.json({ ok: true, url: `https://www.pinterest.com/oauth/?${q}`, redirect: `${baseOf(req)}/api/public/oauth/pinterest` });
  });
  app.get("/api/public/oauth/pinterest", async (req, res) => {
    try {
      if (req.query.error) throw new Error(String(req.query.error_description || req.query.error)); if (!okState(String(req.query.state || ""))) throw new Error("This sign-in link expired. Start again from the app."); const c = await readCh();
      const r = await fetch("https://api.pinterest.com/v5/oauth/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${c.pinAppId}:${c.pinAppSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code: String(req.query.code || ""), redirect_uri: `${baseOf(req)}/api/public/oauth/pinterest` }), signal: AbortSignal.timeout(30_000) });
      const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Error(j.message || "Pinterest did not accept the sign-in.");
      await patchCh({ pinAccess: j.access_token, pinRefresh: j.refresh_token || "" }); let user = ""; try { const u = await pinApi("GET", "/user_account"); user = u.username || ""; await patchCh({ pinUser: user }); } catch { /* optional */ }
      res.send(page(true, user ? `Pinterest account “${user}” is connected. Now choose a board in the app.` : "Pinterest is connected. Now choose a board in the app."));
    } catch (e: any) { res.status(400).send(page(false, String(e?.message || e))); }
  });
  app.get("/api/admin/social/pin/boards", requireDeveloper, async (_req, res) => {
    try { const j = await pinApi("GET", "/boards?page_size=100"); res.json({ ok: true, boards: (j.items || []).map((b: any) => ({ id: b.id, name: b.name })) }); } catch (e: any) { res.status(400).json({ ok: false, error: String(e?.message || e) }); }
  });
  app.post("/api/admin/social/pin/board", requireDeveloper, async (req, res) => {
    try { const name = String(req.body?.name || "").trim().slice(0, 100); if (!name) throw new Error("Give the board a name."); const b = await pinApi("POST", "/boards", { name, privacy: "PUBLIC" }); await patchCh({ pinBoard: b.id, pinBoardName: b.name }); res.json({ ok: true, id: b.id, name: b.name }); } catch (e: any) { res.status(400).json({ ok: false, error: String(e?.message || e) }); }
  });
  app.post("/api/admin/social/channels/disconnect", requireDeveloper, async (req, res) => {
    const w = String(req.body?.which || ""); try { if (w === "youtube") { ytTok = null; await patchCh({ ytRefresh: "", ytChannel: "" }); } else if (w === "tiktok") await patchCh({ ttAccess: "", ttRefresh: "", ttExp: 0, ttOpenId: "", ttUser: "" }); else if (w === "pinterest") await patchCh({ pinAccess: "", pinRefresh: "", pinUser: "", pinBoard: "", pinBoardName: "" }); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
  });
}
