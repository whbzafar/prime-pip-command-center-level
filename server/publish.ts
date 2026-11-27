import type { Express, RequestHandler } from "express";
import express from "express";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/* Publishing helpers. Credentials are NOT stored on the server: the admin's browser keeps them and sends them with each request.
   - /stage keeps the finished MP4 for 30 minutes at an unguessable public link (Instagram needs a URL it can download from).
   - /meta/verify and /meta/publish talk to the Facebook Graph API (Page video + Instagram Reel). */
const DIR = join(tmpdir(), "pp-staged"); const TTL = 30 * 60 * 1000; const GRAPH = "https://graph.facebook.com/v21.0";
const staged = new Map<string, { path: string; at: number; ext: string }>();
async function sweep() { const now = Date.now(); for (const [id, v] of staged) if (now - v.at > TTL) { staged.delete(id); try { await unlink(v.path); } catch { /* gone */ } } }

async function graph(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<any> {
  const url = `${GRAPH}${path}`; const body = new URLSearchParams(params);
  const r = await fetch(method === "GET" ? `${url}?${body}` : url, method === "GET" ? { signal: AbortSignal.timeout(60_000) } : { method, body, signal: AbortSignal.timeout(180_000) });
  const j: any = await r.json().catch(() => ({})); if (!r.ok || j?.error) throw new Error(j?.error?.message || `Facebook returned HTTP ${r.status}`); return j;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function registerPublishRoutes(app: Express, requireDeveloper: RequestHandler) {
  app.post("/api/admin/social/stage", requireDeveloper, express.raw({ type: () => true, limit: "150mb" }), async (req, res) => {
    const body = req.body as Buffer; if (!Buffer.isBuffer(body) || body.length < 1000) return res.status(400).json({ ok: false, error: "No video received" });
    await sweep(); await mkdir(DIR, { recursive: true }); const ext = String(req.query.ext || "mp4") === "jpg" ? "jpg" : "mp4"; const id = randomUUID().replace(/-/g, ""); const path = join(DIR, `${id}.${ext}`); await writeFile(path, body); staged.set(id, { path, at: Date.now(), ext });
    const base = (process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    res.json({ ok: true, id, url: `${base}/api/public/staged/${id}.${ext}` });
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
  app.post("/api/admin/social/meta/publish", requireDeveloper, async (req, res) => {
    const { id, coverId, pageId, pageToken, igUserId, title, description, caption, targets } = req.body || {}; const v = staged.get(String(id || "")); const cv = coverId ? staged.get(String(coverId)) : undefined;
    if (!v) return res.status(400).json({ ok: false, error: "The video expired. Record or stage it again." });
    const base = (process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`).replace(/\/$/, ""); const url = `${base}/api/public/staged/${id}.mp4`; const coverUrl = cv ? `${base}/api/public/staged/${coverId}.jpg` : "";
    const out: Record<string, { ok: boolean; id?: string; error?: string }> = {}; const want: string[] = Array.isArray(targets) ? targets : [];
    if (want.includes("facebook")) {
      try {
        // Facebook Reel first (vertical 9:16 gets Reels reach); fall back to a normal Page video if Facebook declines it.
        try {
          const st = await graph(`/${String(pageId)}/video_reels`, { upload_phase: "start", access_token: String(pageToken) });
          const up = await fetch(st.upload_url, { method: "POST", headers: { Authorization: `OAuth ${String(pageToken)}`, file_url: url }, signal: AbortSignal.timeout(180_000) }); const uj: any = await up.json().catch(() => ({})); if (!up.ok || uj?.success === false) throw new Error(uj?.debug_info?.message || `upload HTTP ${up.status}`);
          await graph(`/${String(pageId)}/video_reels`, { upload_phase: "finish", video_id: String(st.video_id), video_state: "PUBLISHED", description: String(description || "").slice(0, 5000), title: String(title || "").slice(0, 100), access_token: String(pageToken) });
          out.facebook = { ok: true, id: String(st.video_id) };
        } catch (re: any) {
          const j = await graph(`/${String(pageId)}/videos`, { file_url: url, title: String(title || "").slice(0, 100), description: String(description || "").slice(0, 5000), published: "true", access_token: String(pageToken) }); out.facebook = { ok: true, id: j.id };
        }
      }
      catch (e: any) { out.facebook = { ok: false, error: String(e?.message || e) }; }
    }
    if (want.includes("instagram")) {
      try {
        if (!igUserId) throw new Error("No Instagram professional account is linked to this Facebook Page.");
        const c = await graph(`/${String(igUserId)}/media`, { media_type: "REELS", video_url: url, ...(coverUrl ? { cover_url: coverUrl } : {}), caption: String(caption || description || "").slice(0, 2200), share_to_feed: "true", access_token: String(pageToken) });
        let status = ""; for (let i = 0; i < 40; i++) { await sleep(5000); const s = await graph(`/${c.id}`, { fields: "status_code,status", access_token: String(pageToken) }, "GET"); status = s.status_code; if (status === "FINISHED") break; if (status === "ERROR") throw new Error(`Instagram could not process the video: ${s.status || "error"}`); }
        if (status !== "FINISHED") throw new Error("Instagram is still processing; check the app in a few minutes.");
        const p = await graph(`/${String(igUserId)}/media_publish`, { creation_id: c.id, access_token: String(pageToken) }); out.instagram = { ok: true, id: p.id };
      } catch (e: any) { out.instagram = { ok: false, error: String(e?.message || e) }; }
    }
    res.json({ ok: Object.values(out).every((x) => x.ok), results: out });
  });
}
