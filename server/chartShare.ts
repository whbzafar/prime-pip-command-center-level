import { randomBytes } from "node:crypto";
import type { Express, RequestHandler } from "express";
import { privateGet, privateSet, durableEnabled } from "./durableStore.js";

/**
 * Chart share links (like TradingView "share layout"): a member publishes a snapshot of their chart
 * (symbol, timeframe, drawings/indicators document) and gets a short link anyone can open read-only.
 * Stored one key per chart in the durable private store (in-memory fallback when Redis is not connected).
 */
const MAX_BYTES = 900_000;
const mem = new Map<string, string>();
const ID = /^[A-Za-z0-9_-]{6,24}$/;

export function registerChartShareRoutes(app: Express, requireMember: RequestHandler) {
  app.post("/api/charts/share", requireMember, async (req, res) => {
    try {
      const b = req.body || {};
      const symbol = String(b.symbol || "").slice(0, 40);
      const interval = String(b.interval || "").slice(0, 12);
      const engine = b.engine === "tv" ? "tv" : "pro";
      if (!symbol) return res.status(400).json({ error: "Missing symbol" });
      const doc = { v: 1, engine, symbol, interval, drawings: engine === "pro" ? (b.drawings ?? null) : null, title: String(b.title || "").slice(0, 80), at: Date.now() };
      const json = JSON.stringify(doc);
      if (json.length > MAX_BYTES) return res.status(413).json({ error: "This chart is too large to share" });
      const id = randomBytes(6).toString("base64url");
      if (durableEnabled) await privateSet(`chart_${id}`, json); else mem.set(id, json);
      res.json({ id });
    } catch (e: any) { res.status(500).json({ error: "Could not create the link" }); }
  });

  app.get("/api/public/charts/:id", async (req, res) => {
    const id = String(req.params.id || "");
    if (!ID.test(id)) return res.status(404).json({ error: "Not found" });
    try {
      const raw = durableEnabled ? await privateGet(`chart_${id}`) : mem.get(id) ?? null;
      if (!raw) return res.status(404).json({ error: "This chart link is no longer available" });
      res.setHeader("Cache-Control", "public, max-age=60");
      res.type("application/json").send(raw);
    } catch { res.status(500).json({ error: "Could not load the chart" }); }
  });
}
