import { randomBytes } from "node:crypto";
import type { Express, RequestHandler } from "express";
import express from "express";
import { mkdir, writeFile, appendFile, unlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { privateListGet, privateListUpdate, durableStatus } from "./durableStore.js";
import { ytUpload, pinPost, pinStats, ytStats, readCh, registerChannelRoutes } from "./channels.js";
import { analyse, type Metrics, type PostEntry } from "./socialInsights.js";

/* Publishing helpers. Credentials are NOT stored on the server: the admin's browser keeps them and sends them with each request.
   - /stage keeps the finished MP4 for 30 minutes at an unguessable public link (Instagram needs a URL it can download from).
   - /meta/verify and /meta/publish talk to the Facebook Graph API (Page video + Instagram Reel). */
const DIR = join(tmpdir(), "pp-staged"); const TTL = 30 * 60 * 1000; const GRAPH = "https://graph.facebook.com/v21.0";
const jobs = new Map<string, { done: boolean; out: Record<string, { ok: boolean; id?: string; error?: string }>; note: string; at: number }>();
const staged = new Map<string, { path: string; at: number; ext: string }>();
async function sweep() { const now = Date.now(); for (const [k, v] of jobs) if (now - v.at > 2 * 60 * 60 * 1000) jobs.delete(k); for (const [id, v] of staged) if (now - v.at > TTL) { staged.delete(id); try { await unlink(v.path); } catch { /* gone */ } } }

async function graph(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<any> {
  const url = `${GRAPH}${path}`; const body = new URLSearchParams(params);
  const r = await fetch(method === "GET" ? `${url}?${body}` : url, method === "GET" ? { signal: AbortSignal.timeout(60_000) } : { method, body, signal: AbortSignal.timeout(180_000) });
  const j: any = await r.json().catch(() => ({})); if (!r.ok || j?.error) throw new Error(j?.error?.message || `Facebook returned HTTP ${r.status}`); return j;
}
/* At most 2 videos are converted and uploaded at once (the host has 512 MB); the rest wait in line, so many students can click Record together. */
const MAXRUN = 2; let active = 0; const waiting: (() => void)[] = [];
async function gate<T>(job: { note: string }, f: () => Promise<T>): Promise<T> {
  if (active >= MAXRUN) { job.note = "Waiting in line…"; await new Promise<void>((r) => waiting.push(r)); }
  active++; try { return await f(); } finally { active--; waiting.shift()?.(); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HIST = "social_post_history";
const histAdd = (e: PostEntry) => privateListUpdate(HIST, (l) => [e, ...l].slice(0, 300)).catch(() => []);
const histPatch = (id: string, patch: Partial<PostEntry>) => privateListUpdate(HIST, (l) => l.map((e: PostEntry) => (e.id === id ? { ...e, ...patch } : e))).catch(() => []);
const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : undefined);

/** Reads likes, comments and (when the app has the insights permission) views/reach/shares/saves for one live post. */
async function readMetrics(platform: "facebook" | "instagram", id: string, token: string): Promise<Metrics> {
  const m: Metrics = { at: Date.now() }; const notes: string[] = [];
  if (platform === "instagram") {
    try { const b = await graph(`/${id}`, { fields: "like_count,comments_count", access_token: token }, "GET"); m.likes = num(b.like_count); m.comments = num(b.comments_count); } catch (e: any) { notes.push(String(e?.message || e).slice(0, 140)); }
    try { const ins = await graph(`/${id}/insights`, { metric: "views,reach,saved,shares", access_token: token }, "GET"); for (const d of ins.data || []) { const v = num(d.values?.[0]?.value ?? d.total_value?.value); if (d.name === "views") m.views = v; else if (d.name === "reach") m.reach = v; else if (d.name === "saved") m.saves = v; else if (d.name === "shares") m.shares = v; } } catch (e: any) { notes.push("Instagram views need the instagram_manage_insights permission"); }
  } else {
    try { const b = await graph(`/${id}`, { fields: "likes.summary(true).limit(0),comments.summary(true).limit(0)", access_token: token }, "GET"); m.likes = num(b.likes?.summary?.total_count); m.comments = num(b.comments?.summary?.total_count); } catch (e: any) { notes.push(String(e?.message || e).slice(0, 140)); }
    try { const b = await graph(`/${id}`, { fields: "views", access_token: token }, "GET"); m.views = num(b.views); } catch { try { const ins = await graph(`/${id}/video_insights`, { metric: "total_video_views", access_token: token }, "GET"); m.views = num(ins.data?.[0]?.values?.[0]?.value); } catch { notes.push("Facebook views need the read_insights permission"); } }
  }
  if (notes.length) m.note = notes.join("; "); return m;
}
let refreshing = false;
async function refreshAll(force = false): Promise<void> {
  if (refreshing) return; refreshing = true;
  try {
    const cfg = (await privateListGet("social_publish_cfg"))?.[0]; const token = String(cfg?.metaPageToken || "");
    const list: PostEntry[] = (await privateListGet(HIST)) || []; const now = Date.now(); const upd = new Map<string, Record<string, Metrics>>();
    for (const e of list.filter((x) => x.status === "done" && now - x.at < 45 * 86400_000).slice(0, 40)) {
      const last = Math.max(0, ...Object.values(e.metrics || {}).map((m) => m.at)); const age = now - e.at; const every = age < 2 * 86400_000 ? 20 * 60_000 : 6 * 3600_000;
      if (!force && now - last < every) continue; const mm: Record<string, Metrics> = { ...(e.metrics || {}) };
      const yr = e.results.youtube; if (yr?.ok && yr.id) { try { const st = (await ytStats([yr.id]))[yr.id]; if (st) mm.youtube = { at: Date.now(), views: st.views, likes: st.likes, comments: st.comments }; } catch { /* keep the old numbers */ } }
      const pr = e.results.pinterest; if (pr?.ok && pr.id) { try { const st = await pinStats(pr.id); mm.pinterest = { at: Date.now(), views: st.views, saves: st.saves, likes: st.clicks }; } catch { /* keep the old numbers */ } }
      for (const k of (token ? ["facebook", "instagram"] : []) as ("facebook" | "instagram")[]) { const r = e.results[k]; if (r?.ok && r.id) { try { mm[k] = await readMetrics(k, r.id, token); } catch { /* keep the old numbers */ } } }
      upd.set(e.id, mm);
    }
    if (upd.size) await privateListUpdate(HIST, (l) => l.map((e: PostEntry) => (upd.has(e.id) ? { ...e, metrics: upd.get(e.id) } : e)));
  } finally { refreshing = false; }
}

export function registerPublishRoutes(app: Express, requireDeveloper: RequestHandler, requireMember: RequestHandler = requireDeveloper) {
  registerChannelRoutes(app, requireDeveloper);
  /* Publishing settings (Page ID, permanent Page token, auto-post choices) live in the encrypted private store, so every
     device and browser signed in as the owner sees the same connection. Never logged, never sent to other users. */
  app.get("/api/admin/social/publish-config", requireDeveloper, async (_req, res) => {
    res.set("Cache-Control", "no-store"); const l = await privateListGet("social_publish_cfg");
    if (l === null) return res.json({ ok: false, error: "Private storage is not available on the server yet", mode: durableStatus().mode });
    res.json({ ok: true, cfg: l[0] || null, mode: durableStatus().mode });
  });
  app.put("/api/admin/social/publish-config", requireDeveloper, async (req, res) => {
    const c = req.body?.cfg; if (!c || typeof c !== "object") return res.status(400).json({ ok: false, error: "No settings" });
    const clean = { ytClientId: String(c.ytClientId || "").slice(0, 300), metaPageId: String(c.metaPageId || "").slice(0, 60), metaPageToken: String(c.metaPageToken || "").slice(0, 1000), igUserId: String(c.igUserId || "").slice(0, 60), autoSet: !!c.autoSet, auto: { youtube: !!c.auto?.youtube, facebook: !!c.auto?.facebook, instagram: !!c.auto?.instagram }, at: Number(c.at) || Date.now() };
    try { await privateListUpdate("social_publish_cfg", () => [clean]); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false, error: "Private storage is not available on the server yet" }); }
  });
  app.post("/api/admin/social/stage", requireDeveloper, express.raw({ type: () => true, limit: "25mb" }), async (req, res) => {
    const body = req.body as Buffer; if (!Buffer.isBuffer(body) || body.length < 1000) return res.status(400).json({ ok: false, error: "No video received" });
    await sweep(); await mkdir(DIR, { recursive: true }); const ext = String(req.query.ext || "mp4") === "jpg" ? "jpg" : "mp4"; const id = randomUUID().replace(/-/g, ""); const path = join(DIR, `${id}.${ext}`); await writeFile(path, body); staged.set(id, { path, at: Date.now(), ext });
    const base = (process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    res.json({ ok: true, id, url: `${base}/api/public/staged/${id}.${ext}` });
  });
  /* Large videos arrive in small pieces (the host rejects single uploads over ~100 MB). Pieces are appended in order, the last one finishes the file. */
  const parts = new Map<string, { path: string; next: number; at: number; ext: string }>();
  app.post("/api/admin/social/stage-chunk", requireMember, express.raw({ type: () => true, limit: "20mb" }), async (req, res) => {
    const uid = String(req.query.uid || "").replace(/[^a-z0-9]/gi, "").slice(0, 40); const i = Number(req.query.i), n = Number(req.query.n); const ext = ({ jpg: "jpg", webm: "webm" } as Record<string, string>)[String(req.query.ext || "mp4")] || "mp4"; const body = req.body as Buffer;
    if (!uid || !Number.isInteger(i) || !Number.isInteger(n) || n < 1 || n > 80 || !Buffer.isBuffer(body) || !body.length) return res.status(400).json({ ok: false, error: "Bad upload piece" });
    try {
      await mkdir(DIR, { recursive: true }); let p = parts.get(uid);
      if (i === 0) { p = { path: join(DIR, `${uid}.${ext}`), next: 0, at: Date.now(), ext }; await writeFile(p.path, body); parts.set(uid, p); p.next = 1; }
      else { if (!p || p.next !== i) return res.status(409).json({ ok: false, error: "Upload piece out of order" }); await appendFile(p.path, body); p.next = i + 1; p.at = Date.now(); }
      if (i === n - 1) { parts.delete(uid); await sweep(); staged.set(uid, { path: p!.path, at: Date.now(), ext }); const base = (process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`).replace(/\/$/, ""); return res.json({ ok: true, done: true, id: uid, url: `${base}/api/public/staged/${uid}.${ext}` }); }
      res.json({ ok: true, done: false });
    } catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }); }
  });
  /* Converts a staged recording to the MP4 (H.264 + AAC) that Instagram and Facebook accept. Runs in the background; poll publish-status. */
  app.post("/api/admin/social/finish-staged", requireMember, async (req, res) => {
    const id = String(req.query.id || ""); const v = staged.get(id); if (!v) return res.status(400).json({ ok: false, error: "The recording expired. Record again." });
    const jobId = randomBytes(8).toString("hex"); const out: Record<string, { ok: boolean; id?: string; error?: string }> = {}; jobs.set(jobId, { done: false, out, note: "Converting to MP4…", at: Date.now() }); const job = jobs.get(jobId)!; res.json({ ok: true, job: jobId });
    void (async () => { try { const nid = randomBytes(8).toString("hex"); const np = join(DIR, `${nid}.mp4`); const { finishFile } = await import("./finish.js"); await finishFile(v.path, np); staged.set(nid, { path: np, at: Date.now(), ext: "mp4" }); out.video = { ok: true, id: nid }; } catch (e: any) { out.video = { ok: false, error: String(e?.message || e).slice(0, 300) }; } finally { job.done = true; job.note = ""; } })();
  });
  app.get("/api/public/staged/:file", async (req, res) => {
    const id = String(req.params.file).replace(/\.(mp4|jpg)$/, ""); const v = staged.get(id); if (!v || Date.now() - v.at > TTL) return res.status(404).end();
    try { await stat(v.path); res.set("Content-Type", v.ext === "jpg" ? "image/jpeg" : "video/mp4"); return res.sendFile(v.path); } catch { return res.status(404).end(); }
  });
  app.post("/api/admin/social/meta/verify", requireDeveloper, async (req, res) => {
    const { pageId, pageToken } = req.body || {}; if (!pageId || !pageToken) return res.status(400).json({ ok: false, error: "Enter the Page ID and the access token." });
    try {
      let token = String(pageToken); let upgraded = false;
      // A long-lived USER token is swapped for the Page's own token, which never expires.
      try { const a = await graph("/me/accounts", { fields: "id,name,access_token", limit: "100", access_token: token }, "GET"); const pg = (a.data || []).find((x: any) => String(x.id) === String(pageId)); if (pg?.access_token) { token = pg.access_token; upgraded = true; } } catch { /* already a Page token */ }
      const j = await graph(`/${String(pageId)}`, { fields: "name,instagram_business_account", access_token: token }, "GET");
      let expires = "";
      try { const d = await graph("/debug_token", { input_token: token, access_token: token }, "GET"); const e = Number(d?.data?.expires_at || 0); expires = e ? new Date(e * 1000).toISOString() : "never"; } catch { /* optional */ }
      res.json({ ok: true, name: j.name, igUserId: j.instagram_business_account?.id || null, pageToken: token, upgraded, expires });
    } catch (e: any) { res.status(400).json({ ok: false, error: String(e?.message || e) }); }
  });
  const publishH: RequestHandler = async (req, res) => {
    const { id, coverId, pageId, pageToken, igUserId, title, description, caption, targets, category, videoTitle } = req.body || {}; const v = staged.get(String(id || "")); const cv = coverId ? staged.get(String(coverId)) : undefined;
    if (!v) return res.status(400).json({ ok: false, error: "The video expired. Record or stage it again." });
    const base = (process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`).replace(/\/$/, ""); const url = `${base}/api/public/staged/${id}.mp4`; const coverUrl = cv ? `${base}/api/public/staged/${coverId}.jpg` : "";
    const out: Record<string, { ok: boolean; id?: string; error?: string }> = {}; const jobId = randomBytes(8).toString("hex"); jobs.set(jobId, { done: false, out, note: "Starting…", at: Date.now() }); const job = jobs.get(jobId)!; res.json({ ok: true, job: jobId }); void histAdd({ by: String((req as any).currentUser?.username || "").slice(0, 60), id: jobId, at: Date.now(), title: String(videoTitle || title || "Video").slice(0, 120), category: String(category || "General").slice(0, 60), targets: Array.isArray(targets) ? targets.map(String) : [], status: "pending", stage: "Uploading", results: {} }); void (async () => { try { await gate(job, () => run()); } catch (e: any) { out.error = { ok: false, error: String(e?.message || e) }; } finally { job.done = true; job.note = ""; const res: Record<string, { ok: boolean; id?: string; error?: string }> = {}; for (const k of ["facebook", "instagram", "youtube", "pinterest"]) if (out[k]) res[k] = out[k]; if (out.error) res.error = out.error; const any = Object.entries(res).some(([k, v]) => k !== "error" && v.ok); await histPatch(jobId, { status: any ? "done" : "failed", stage: any ? "Published" : "Failed", results: res }); if (any) setTimeout(() => { void refreshAll(true); }, 90_000); } })(); return;
    async function run() {
    const j0 = (n: string) => { job.note = n; void histPatch(jobId, { stage: /Instagram: sending/.test(n) ? "Processing on Instagram" : n.replace(/…$/, "") }); };
    const want: string[] = Array.isArray(targets) ? targets : [];
    if (want.includes("facebook")) {
      try {
        // Facebook Reel first (vertical 9:16 gets Reels reach); fall back to a normal Page video if Facebook declines it.
        try {
          j0("Facebook: starting the Reel…"); const st = await graph(`/${String(pageId)}/video_reels`, { upload_phase: "start", access_token: String(pageToken) });
          const up = await fetch(st.upload_url, { method: "POST", headers: { Authorization: `OAuth ${String(pageToken)}`, file_url: url }, signal: AbortSignal.timeout(180_000) }); const uj: any = await up.json().catch(() => ({})); if (!up.ok || uj?.success === false) throw new Error(uj?.debug_info?.message || `upload HTTP ${up.status}`);
          await graph(`/${String(pageId)}/video_reels`, { upload_phase: "finish", video_id: String(st.video_id), video_state: "PUBLISHED", description: String(description || "").slice(0, 5000), title: String(title || "").slice(0, 100), access_token: String(pageToken) });
          out.facebook = { ok: true, id: String(st.video_id) };
        } catch (re: any) {
          j0("Facebook: posting as a video…"); const j = await graph(`/${String(pageId)}/videos`, { file_url: url, title: String(title || "").slice(0, 100), description: String(description || "").slice(0, 5000), published: "true", access_token: String(pageToken) }); out.facebook = { ok: true, id: j.id };
        }
      }
      catch (e: any) { out.facebook = { ok: false, error: String(e?.message || e) }; }
    }
    if (want.includes("youtube")) {
      try {
        j0("YouTube: uploading the Short…"); const sz = (await stat(v.path)).size; const r = await ytUpload(v.path, sz, { title: String(title || videoTitle || "Prime Pip"), description: String(description || caption || ""), tags: ["forex", "trading", "gold", "XAUUSD", "PrimePipFX", "Shorts"] });
        out.youtube = { ok: true, id: r.id }; if (r.privacy !== "public") out.youtube.error = `Uploaded as ${r.privacy}: Google keeps videos of unverified projects private until the app is audited or published.`;
      } catch (e: any) { out.youtube = { ok: false, error: String(e?.message || e) }; }
    }
    if (want.includes("pinterest")) {
      try {
        j0("Pinterest: pinning the video…"); if (!cv) throw new Error("Pinterest needs a cover image; none was staged."); const r = await pinPost(v.path, coverUrl, { title: String(title || videoTitle || "Prime Pip"), description: String(description || caption || ""), link: "https://primepipfx.site" });
        out.pinterest = { ok: true, id: r.id }; if (r.sandbox) out.pinterest.error = "Pinterest has this app in trial access: pins are saved in its sandbox and are not public yet. Apply for Standard access to go public.";
      } catch (e: any) { out.pinterest = { ok: false, error: String(e?.message || e) }; }
    }
    if (want.includes("instagram")) {
      try {
        if (!igUserId) throw new Error("No Instagram professional account is linked to this Facebook Page.");
        j0("Instagram: sending the Reel…"); const c = await graph(`/${String(igUserId)}/media`, { media_type: "REELS", video_url: url, ...(coverUrl ? { cover_url: coverUrl } : {}), caption: String(caption || description || "").slice(0, 2200), share_to_feed: "true", access_token: String(pageToken) });
        let status = ""; for (let i = 0; i < 40; i++) { await sleep(5000); const s = await graph(`/${c.id}`, { fields: "status_code,status", access_token: String(pageToken) }, "GET"); status = s.status_code; if (status === "FINISHED") break; if (status === "ERROR") throw new Error(`Instagram could not process the video: ${s.status || "error"}`); }
        if (status !== "FINISHED") throw new Error("Instagram is still processing; check the app in a few minutes.");
        const p = await graph(`/${String(igUserId)}/media_publish`, { creation_id: c.id, access_token: String(pageToken) }); out.instagram = { ok: true, id: p.id };
      } catch (e: any) { out.instagram = { ok: false, error: String(e?.message || e) }; }
    }
    }
  };
  app.post("/api/admin/social/meta/publish", requireDeveloper, publishH);
  /* Students: the browser sends only the finished video and its text. Every key, token, page and board comes from the private
     store on the server, and the platforms to post to are chosen here, so no credential ever reaches a student. */
  const perUser = new Map<string, number[]>(); const DAILY = Number(process.env.STUDENT_DAILY_POSTS || 30);
  const studentCreds: RequestHandler = async (req, res, next) => {
    try {
      const u: any = (req as any).currentUser; const staff = u?.isDeveloper || u?.role === "ADMIN" || u?.role === "DEVELOPER";
      const key = String(u?.id || u?.username || "x"); const now = Date.now(); const recent = (perUser.get(key) || []).filter((t) => now - t < 864e5);
      if (!staff && recent.length >= DAILY) return res.status(429).json({ ok: false, error: `Daily posting limit reached (${DAILY} videos). Try again tomorrow.` });
      recent.push(now); perUser.set(key, recent);
      const l = await privateListGet("social_publish_cfg"); const c: any = (l && l[0]) || {}; const ch = await readCh(); const b: any = req.body || {};
      const targets: string[] = []; const fbOk = !!(c.metaPageId && c.metaPageToken);
      if (fbOk) targets.push("facebook"); if (fbOk && c.igUserId) targets.push("instagram"); if (ch.ytRefresh) targets.push("youtube"); if (ch.pinAccess && ch.pinBoard) targets.push("pinterest");
      if (!targets.length) return res.status(503).json({ ok: false, error: "Posting is not set up yet. Please tell the admin." });
      const clean = (v: any, n: number) => String(v || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, n);
      req.body = { id: clean(b.id, 60), coverId: clean(b.coverId, 60), pageId: c.metaPageId, pageToken: c.metaPageToken, igUserId: c.igUserId, title: clean(b.title, 100), description: clean(b.description, 5000), caption: clean(b.caption, 2200), targets, category: clean(b.category, 60), videoTitle: clean(b.videoTitle, 120) };
      next();
    } catch { res.status(500).json({ ok: false, error: "Could not start posting. Try again." }); }
  };
  app.post("/api/student/social/publish", requireMember, studentCreds, publishH);
  app.get("/api/student/social/ready", requireMember, async (_req, res) => { const l = await privateListGet("social_publish_cfg"); const c: any = (l && l[0]) || {}; const ch = await readCh(); res.json({ ok: true, ready: !!((c.metaPageId && c.metaPageToken) || ch.ytRefresh || (ch.pinAccess && ch.pinBoard)) }); });
  app.get("/api/admin/social/insights", requireDeveloper, async (req, res) => {
    res.set("Cache-Control", "no-store"); if (req.query.refresh === "1") await refreshAll(true).catch(() => {}); else void refreshAll(false).catch(() => {});
    const list: PostEntry[] | null = await privateListGet(HIST); if (list === null) return res.json({ ok: false, error: "Private storage is not available on the server yet" });
    res.json({ ok: true, posts: list.slice(0, 60), advice: analyse(list) });
  });
  setInterval(() => { void refreshAll(false).catch(() => {}); }, 3 * 3600_000).unref?.();
  app.get("/api/admin/social/meta/publish-status", requireMember, (req, res) => { const j = jobs.get(String(req.query.job || "")); if (!j) return res.json({ ok: false, error: "Unknown or expired job." }); res.json({ ok: true, done: j.done, note: j.note, results: j.out }); });
}
