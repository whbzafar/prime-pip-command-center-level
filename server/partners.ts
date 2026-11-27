import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import { privateListGet, privateListUpdate } from "./durableStore.js";

/**
 * Partner program + Help inbox.
 *  - Anyone can become a partner and gets a personal promo link and a private dashboard key.
 *  - A buyer who applies through a link is recorded as a "pending" sale. Nothing is owed yet.
 *  - Only when the admin confirms the full application fee reached the admin does the partner's share become DUE.
 *  - Only the admin can mark the share as PAID. The state machine cannot skip a step or go backwards.
 * The amounts come from this file only; the browser can never set or change a price or a payout.
 */
export const PROGRAM = { fee: 100, monthly: 10, partnerShare: 50, adminShare: 50, startsOn: "2026-12-01", currency: "USD" } as const;

type Partner = { id: string; code: string; keyHash: string; name: string; contact: string; payoutDetails: string; status: "active" | "blocked"; at: number; ip?: string };
type Sale = { id: string; code: string; buyer: string; buyerKey: string; contact: string; at: number; status: "pending" | "received" | "rejected"; receivedAt?: number; payout: "none" | "due" | "paid"; paidAt?: number; paidRef?: string; note?: string; log: { at: number; what: string }[] };
type Help = { id: string; name: string; contact: string; message: string; at: number; status: "open" | "done"; ip?: string };

const PARTNERS = "partner_program_partners";
const SALES = "partner_program_sales";
const HELP = "help_inbox";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const clean = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const ip = (req: Request) => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
const CODE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => "P" + Array.from(randomBytes(7), (b) => CODE_ALPHA[b % CODE_ALPHA.length]).join("");
const validContact = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) || /^\+?[\d\s\-()]{7,20}$/.test(c);
const normContact = (c: string) => (c.includes("@") ? c.toLowerCase() : c.replace(/[^\d+]/g, ""));

/** Simple per-IP limiter (in memory; resets on restart, which is fine for abuse control). */
const hits = new Map<string, number[]>();
const limited = (key: string, max: number, windowMs: number) => {
  const now = Date.now(); const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr); if (hits.size > 5000) hits.clear();
  return arr.length > max;
};

export function registerPartnerRoutes(app: Express, requireAdmin: RequestHandler) {
  const guard = (name: string, max: number, windowMs: number): RequestHandler => (req, res, next) => {
    if (limited(`${name}:${ip(req)}`, max, windowMs)) return res.status(429).json({ error: "Too many attempts. Please try again later." });
    next();
  };
  const find = async (code: string) => ((await privateListGet(PARTNERS)) || []).find((p: Partner) => p.code === code) as Partner | undefined;

  // ── public: program terms
  app.get("/api/public/partner/program", (_req, res) => { res.setHeader("Cache-Control", "public, max-age=300"); res.json(PROGRAM); });

  // ── public: join as a partner → promo code + private key (shown once, only its hash is stored)
  app.post("/api/public/partner/join", guard("join", 6, 3600_000), async (req, res) => {
    try {
      const name = clean(req.body?.name, 60), contact = clean(req.body?.contact, 80), payoutDetails = clean(req.body?.payoutDetails, 160);
      if (name.length < 2) return res.status(400).json({ error: "Please enter your name." });
      if (!validContact(contact)) return res.status(400).json({ error: "Enter a valid email or phone/WhatsApp number." });
      if (payoutDetails.length < 3) return res.status(400).json({ error: "Tell us where to send your share (e.g. Easypaisa/JazzCash/bank/PayPal details)." });
      const key = randomBytes(18).toString("base64url"); const code = newCode(); const nc = normContact(contact);
      let dup = false;
      await privateListUpdate(PARTNERS, (l) => { if (l.some((p: Partner) => normContact(p.contact) === nc)) { dup = true; return l; } return [...l, { id: randomUUID(), code, keyHash: sha(key), name, contact, payoutDetails, status: "active", at: Date.now(), ip: ip(req) } as Partner]; });
      if (dup) return res.status(409).json({ error: "This contact is already registered as a partner. Use your private key to open your dashboard." });
      res.json({ code, key });
    } catch { res.status(500).json({ error: "Could not register right now." }); }
  });

  // ── public: a buyer applied through a partner link (called by the app after the account is created)
  app.post("/api/public/partner/lead", guard("lead", 20, 3600_000), async (req, res) => {
    try {
      const code = clean(req.body?.code, 12).toUpperCase(), buyer = clean(req.body?.buyer, 60), contact = clean(req.body?.contact, 80);
      if (!/^P[A-Z0-9]{7}$/.test(code) || !buyer) return res.json({ ok: false });
      const p = await find(code); if (!p || p.status !== "active") return res.json({ ok: false });
      const bk = normContact(contact || buyer).toLowerCase() || buyer.toLowerCase();
      if (contact && normContact(p.contact) === normContact(contact)) return res.json({ ok: false }); // no self-referral
      let added = false;
      await privateListUpdate(SALES, (l) => {
        if (l.some((s: Sale) => s.buyerKey === bk || s.buyerKey === buyer.toLowerCase())) return l; // a buyer counts once, for the first partner
        added = true; return [...l, { id: randomUUID(), code, buyer, buyerKey: bk, contact, at: Date.now(), status: "pending", payout: "none", log: [{ at: Date.now(), what: "Applied through partner link" }] } as Sale];
      });
      res.json({ ok: true, added });
    } catch { res.json({ ok: false }); }
  });

  // ── partner dashboard (private key in a header, never in the URL)
  app.get("/api/public/partner/me", guard("me", 40, 600_000), async (req, res) => {
    const code = clean(req.query.code, 12).toUpperCase(); const key = String(req.headers["x-partner-key"] || "");
    const p = await find(code);
    if (!p || !key || !same(sha(key), p.keyHash)) return res.status(401).json({ error: "Wrong code or key." });
    const sales = ((await privateListGet(SALES)) || []).filter((s: Sale) => s.code === code) as Sale[];
    const rows = sales.map((s) => ({ buyer: s.buyer.slice(0, 2) + "•••", at: s.at, status: s.status, payout: s.payout, paidAt: s.paidAt }));
    const due = sales.filter((s) => s.payout === "due").length * PROGRAM.partnerShare;
    const paid = sales.filter((s) => s.payout === "paid").length * PROGRAM.partnerShare;
    res.json({ name: p.name, code, status: p.status, pending: sales.filter((s) => s.status === "pending").length, due, paid, rows: rows.sort((a, b) => b.at - a.at).slice(0, 100), program: PROGRAM });
  });

  // ── help inbox (public submit)
  app.post("/api/public/help", guard("help", 5, 3600_000), async (req, res) => {
    try {
      const name = clean(req.body?.name, 60), contact = clean(req.body?.contact, 80), message = clean(req.body?.message, 1500);
      if (!validContact(contact)) return res.status(400).json({ error: "Enter a valid phone, WhatsApp number or email so we can reach you." });
      if (message.length < 5) return res.status(400).json({ error: "Please describe the problem." });
      await privateListUpdate(HELP, (l) => [{ id: randomUUID(), name, contact, message, at: Date.now(), status: "open", ip: ip(req) } as Help, ...l].slice(0, 500));
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "Could not send right now. Please try again." }); }
  });

  // ── admin
  app.get("/api/admin/partners", requireAdmin, async (_req, res) => {
    const partners = ((await privateListGet(PARTNERS)) || []) as Partner[]; const sales = ((await privateListGet(SALES)) || []) as Sale[];
    res.json({ program: PROGRAM, partners: partners.map(({ keyHash, ip: _i, ...p }) => ({ ...p, sales: sales.filter((s) => s.code === p.code).length, due: sales.filter((s) => s.code === p.code && s.payout === "due").length * PROGRAM.partnerShare, paid: sales.filter((s) => s.code === p.code && s.payout === "paid").length * PROGRAM.partnerShare })), sales: sales.sort((a, b) => b.at - a.at) });
  });
  const saleAction = (what: "received" | "rejected" | "paid"): RequestHandler => async (req, res) => {
    const id = clean(req.params.id, 60); const ref = clean(req.body?.ref, 80); let result = "notfound";
    await privateListUpdate(SALES, (l) => l.map((s: Sale) => {
      if (s.id !== id) return s;
      if (what === "received" && s.status === "pending") { result = "ok"; return { ...s, status: "received", receivedAt: Date.now(), payout: "due", log: [...s.log, { at: Date.now(), what: `Admin confirmed the $${PROGRAM.fee} fee was received; $${PROGRAM.partnerShare} is now due` }] }; }
      if (what === "rejected" && s.status === "pending") { result = "ok"; return { ...s, status: "rejected", log: [...s.log, { at: Date.now(), what: "Rejected by admin" }] }; }
      if (what === "paid" && s.status === "received" && s.payout === "due") { result = "ok"; return { ...s, payout: "paid", paidAt: Date.now(), paidRef: ref, log: [...s.log, { at: Date.now(), what: `Partner paid $${PROGRAM.partnerShare}${ref ? ` (ref ${ref})` : ""}` }] }; }
      result = "state"; return s;
    }));
    if (result === "notfound") return res.status(404).json({ error: "Sale not found" });
    if (result === "state") return res.status(409).json({ error: "This step is not allowed for the sale's current status." });
    res.json({ ok: true });
  };
  app.post("/api/admin/partners/sale/:id/received", requireAdmin, saleAction("received"));
  app.post("/api/admin/partners/sale/:id/rejected", requireAdmin, saleAction("rejected"));
  app.post("/api/admin/partners/sale/:id/paid", requireAdmin, saleAction("paid"));
  app.post("/api/admin/partners/:code/status", requireAdmin, async (req, res) => {
    const code = clean(req.params.code, 12).toUpperCase(); const st = req.body?.status === "blocked" ? "blocked" : "active";
    await privateListUpdate(PARTNERS, (l) => l.map((p: Partner) => (p.code === code ? { ...p, status: st } : p))); res.json({ ok: true });
  });
  app.get("/api/admin/help", requireAdmin, async (_req, res) => res.json({ items: (await privateListGet(HELP)) || [] }));
  app.post("/api/admin/help/:id/done", requireAdmin, async (req, res) => {
    const id = clean(req.params.id, 60); const st = req.body?.status === "open" ? "open" : "done";
    await privateListUpdate(HELP, (l) => l.map((h: Help) => (h.id === id ? { ...h, status: st } : h))); res.json({ ok: true });
  });
}
