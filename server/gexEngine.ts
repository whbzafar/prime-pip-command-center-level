/* GEX engine: dealer gamma exposure from a real options chain.
   Everything here is pure maths (unit-tested). Inputs are the contracts the exchange reports (strike, expiry, open interest, bid/ask);
   implied volatility is solved from the quoted price and gamma is computed with Black-Scholes, so no vendor "greeks" are trusted blindly.

   Convention (the one used by SqueezeMetrics / SpotGamma style models): customers are net long calls and net long puts that dealers
   sold, so dealers hold +gamma from calls and -gamma from puts. Open interest does not say who is on which side, so these levels are
   ESTIMATES of hedging pressure, not observed dealer inventory. The page says so too. */

export interface Contract { exp: number; strike: number; type: "C" | "P"; oi: number; bid?: number; ask?: number; last?: number; volume?: number }
export const RATE = 0.04; // risk-free rate assumption used by the model (shown on the page)
const YEAR_MS = 365 * 24 * 3600_000;

const SQRT2PI = Math.sqrt(2 * Math.PI);
const pdf = (x: number) => Math.exp(-0.5 * x * x) / SQRT2PI;
function cdf(x: number): number { // Abramowitz-Stegun 7.1.26 via erf, accurate to ~1e-7
  const s = x < 0 ? -1 : 1; const z = Math.abs(x) / Math.SQRT2; const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + s * y);
}
export function bsPrice(S: number, K: number, T: number, v: number, type: "C" | "P", r = RATE): number {
  const sd = v * Math.sqrt(T); const d1 = (Math.log(S / K) + (r + 0.5 * v * v) * T) / sd; const d2 = d1 - sd; const df = Math.exp(-r * T);
  return type === "C" ? S * cdf(d1) - K * df * cdf(d2) : K * df * cdf(-d2) - S * cdf(-d1);
}
export function bsGamma(S: number, K: number, T: number, v: number, r = RATE): number {
  if (!(S > 0 && K > 0 && T > 0 && v > 0)) return 0;
  const sd = v * Math.sqrt(T); const d1 = (Math.log(S / K) + (r + 0.5 * v * v) * T) / sd; return pdf(d1) / (S * sd);
}
/** Implied volatility by bisection; null when the price is outside what the model can produce. */
export function impliedVol(price: number, S: number, K: number, T: number, type: "C" | "P", r = RATE): number | null {
  const intrinsic = Math.max(0, type === "C" ? S - K * Math.exp(-r * T) : K * Math.exp(-r * T) - S);
  if (!(price > intrinsic + 1e-6) || price < 0.005) return null;
  let lo = 0.01, hi = 4;
  if (bsPrice(S, K, T, hi, type, r) < price) return null;
  for (let i = 0; i < 48; i++) { const mid = (lo + hi) / 2; if (bsPrice(S, K, T, mid, type, r) > price) hi = mid; else lo = mid; }
  const v = (lo + hi) / 2; return v > 0.015 && v < 3.9 ? v : null;
}

/** Quote that can be trusted: mid of a sane two-sided market, otherwise the last trade. */
export function quotePrice(c: Pick<Contract, "bid" | "ask" | "last">): number | null {
  const { bid, ask, last } = c;
  if (bid && ask && bid > 0 && ask >= bid && ask - bid <= Math.max(0.35 * ask, 0.05)) return (bid + ask) / 2;
  return last && last > 0 ? last : null;
}

export const timeTo = (exp: number, now: number) => Math.max((exp - now) / YEAR_MS, 1 / (365 * 24)); // floor at one hour so 0DTE gamma stays finite

export interface Row { strike: number; call: number; put: number; net: number; abs: number; callOi: number; putOi: number }
export interface GexResult {
  spot: number; asOf: number; contracts: number; used: number; expiries: { exp: number; dte: number; net: number; abs: number; oi: number }[];
  totalNet: number; totalAbs: number; callGex: number; putGex: number;
  rows: Row[]; profile: { spot: number; net: number }[];
  callWall: number | null; putWall: number | null; flip: number | null; magnet: number | null; maxPain: number | null;
  pcrOi: number; callOi: number; putOi: number; expectedMove: { pct: number; abs: number; dte: number } | null;
  nearTermShare: number; regime: "positive" | "negative" | "neutral"; ivAtm: number | null;
}

/** $ gamma exposure for a 1% move in the underlying: gamma x open interest x 100 shares x spot^2 x 1%. */
const dollar = (gamma: number, oi: number, S: number) => gamma * oi * 100 * S * S * 0.01;

export function computeGex(all: Contract[], spot: number, now: number, opts: { maxDays?: number; band?: number } = {}): GexResult {
  const maxDays = opts.maxDays ?? 45; const band = opts.band ?? 0.18;
  const cs = all.filter((c) => c.oi > 0 && c.strike > 0 && c.exp > now - 3600_000 && c.exp - now <= maxDays * 86400_000 && Math.abs(c.strike / spot - 1) <= band);
  // one volatility per expiry+strike, taken from the out-of-the-money side (the liquid one) and applied to both sides
  const key = (c: Contract) => `${c.exp}:${c.strike}`; const ivBy = new Map<string, number>(); const groups = new Map<string, Contract[]>();
  for (const c of cs) { const k = key(c); (groups.get(k) || groups.set(k, []).get(k)!).push(c); }
  for (const [k, g] of groups) {
    const first = g[0]; const T = timeTo(first.exp, now);
    const ordered = [...g].sort((a, b) => (a.type === (first.strike >= spot ? "C" : "P") ? -1 : 1) - (b.type === (first.strike >= spot ? "C" : "P") ? -1 : 1));
    for (const c of ordered) { const p = quotePrice(c); if (p === null) continue; const v = impliedVol(p, spot, c.strike, T, c.type); if (v !== null) { ivBy.set(k, v); break; } }
  }
  const used = cs.filter((c) => ivBy.has(key(c)));
  const byStrike = new Map<number, Row>(); const byExp = new Map<number, { net: number; abs: number; oi: number }>();
  let callOi = 0, putOi = 0, callGex = 0, putGex = 0;
  for (const c of used) {
    const v = ivBy.get(key(c))!; const T = timeTo(c.exp, now); const g = dollar(bsGamma(spot, c.strike, T, v), c.oi, spot);
    const r = byStrike.get(c.strike) || { strike: c.strike, call: 0, put: 0, net: 0, abs: 0, callOi: 0, putOi: 0 };
    if (c.type === "C") { r.call += g; r.callOi += c.oi; callOi += c.oi; callGex += g; } else { r.put -= g; r.putOi += c.oi; putOi += c.oi; putGex -= g; }
    r.net = r.call + r.put; r.abs = r.call - r.put; byStrike.set(c.strike, r);
    const e = byExp.get(c.exp) || { net: 0, abs: 0, oi: 0 }; e.net += c.type === "C" ? g : -g; e.abs += g; e.oi += c.oi; byExp.set(c.exp, e);
  }
  const rows = [...byStrike.values()].sort((a, b) => a.strike - b.strike);
  const totalNet = callGex + putGex; const totalAbs = callGex - putGex;
  // gamma profile: total net GEX if the underlying were at other prices (volatility held); the flip is where it crosses zero
  const profile: { spot: number; net: number }[] = [];
  for (let i = -40; i <= 40; i++) {
    const S = spot * (1 + i * 0.0025); let net = 0;
    for (const c of used) { const g = dollar(bsGamma(S, c.strike, timeTo(c.exp, now), ivBy.get(key(c))!), c.oi, S); net += c.type === "C" ? g : -g; }
    profile.push({ spot: S, net });
  }
  let flip: number | null = null; let best = Infinity;
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i];
    if ((a.net <= 0 && b.net > 0) || (a.net >= 0 && b.net < 0)) { const x = a.spot + (b.spot - a.spot) * (0 - a.net) / (b.net - a.net); const d = Math.abs(x - spot); if (d < best) { best = d; flip = x; } }
  }
  const near = rows.filter((r) => Math.abs(r.strike / spot - 1) <= 0.1);
  // walls: the heaviest call strike at/above price (where rallies meet supply) and the heaviest put strike at/below price (where dips meet demand)
  const up = near.filter((r) => r.strike >= spot * 0.9995), dn = near.filter((r) => r.strike <= spot * 1.0005);
  const callWall = up.length ? up.reduce((m, r) => (r.call > m.call ? r : m)).strike : null;
  const putWall = dn.length ? dn.reduce((m, r) => (r.put < m.put ? r : m)).strike : null;
  const magnet = near.length ? near.reduce((m, r) => (r.abs > m.abs ? r : m)).strike : null;
  // max pain: strike where holders of options lose the least at expiry (open-interest weighted, all expiries in range)
  let maxPain: number | null = null; let pain = Infinity;
  for (const r of rows) { let t = 0; for (const c of used) t += c.oi * (c.type === "C" ? Math.max(0, r.strike - c.strike) : Math.max(0, c.strike - r.strike)); if (t < pain) { pain = t; maxPain = r.strike; } }
  const expiries = [...byExp.entries()].sort((a, b) => a[0] - b[0]).map(([exp, e]) => ({ exp, dte: Math.max(0, Math.round(((exp - now) / 86400_000) * 10) / 10), net: e.net, abs: e.abs, oi: e.oi }));
  // expected move from the at-the-money straddle of the first expiry at least ~12 hours away
  let expectedMove: GexResult["expectedMove"] = null; let ivAtm: number | null = null;
  const firstExp = expiries.find((e) => e.dte >= 0.5) || expiries[0];
  if (firstExp) {
    const atm = used.filter((c) => c.exp === firstExp.exp).sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))[0];
    if (atm) {
      const k = atm.strike; const c = used.find((x) => x.exp === firstExp.exp && x.strike === k && x.type === "C"); const p = used.find((x) => x.exp === firstExp.exp && x.strike === k && x.type === "P");
      const pc = c && quotePrice(c); const pp = p && quotePrice(p); ivAtm = ivBy.get(key(atm)) ?? null;
      if (pc && pp) { const abs = pc + pp; expectedMove = { pct: abs / spot, abs, dte: firstExp.dte }; }
    }
  }
  const nearAbs = expiries.filter((e) => e.dte <= 2).reduce((a, e) => a + e.abs, 0);
  const atSpot = profile[40]?.net ?? totalNet;
  const regime: GexResult["regime"] = Math.abs(atSpot) < 0.04 * totalAbs ? "neutral" : atSpot > 0 ? "positive" : "negative";
  return { spot, asOf: now, contracts: cs.length, used: used.length, expiries, totalNet, totalAbs, callGex, putGex, rows, profile, callWall, putWall, flip, magnet, maxPain, pcrOi: callOi ? putOi / callOi : 0, callOi, putOi, expectedMove, nearTermShare: totalAbs ? nearAbs / totalAbs : 0, regime, ivAtm };
}

/** Plain-language reading of the numbers (rule based, no invented data). */
export function readout(g: GexResult): { headline: string; bias: string; lines: string[] } {
  const f = (n: number | null) => (n === null ? "n/a" : n >= 1000 ? n.toFixed(0) : n.toFixed(2));
  const lines: string[] = [];
  let headline = "Mixed gamma: no strong dealer-hedging edge right now.";
  let bias = "Neutral";
  if (g.regime === "positive") { headline = "Positive gamma: dealer hedging tends to dampen moves, so price often stays in a range and spikes get faded."; bias = "Range / mean-reversion"; }
  if (g.regime === "negative") { headline = "Negative gamma: dealer hedging tends to amplify moves, so breakouts and sell-offs can travel further."; bias = "Momentum / wider swings"; }
  if (g.flip !== null) { const above = g.spot >= g.flip; lines.push(`Gamma flip ${f(g.flip)}: price is ${above ? "above" : "below"} it by ${Math.abs((g.spot / g.flip - 1) * 100).toFixed(2)}%. ${above ? "Losing this level would move the market toward the negative-gamma side." : "Reclaiming this level would move the market toward the positive-gamma side."}`); }
  if (g.callWall !== null) lines.push(`Call wall ${f(g.callWall)}: the strike with the most call gamma. Price often slows or reverses here in positive gamma; a clean break can speed up.`);
  if (g.putWall !== null) lines.push(`Put wall ${f(g.putWall)}: the strike with the most put gamma. Watch for a bounce or, if it breaks, a faster drop.`);
  if (g.magnet !== null) lines.push(`Biggest gamma strike ${f(g.magnet)}: price tends to gravitate to it into expiry.`);
  if (g.expectedMove) lines.push(`Options imply about ±${(g.expectedMove.pct * 100).toFixed(2)}% (±${f(g.expectedMove.abs)}) by the next expiry (${g.expectedMove.dte} days).`);
  if (g.nearTermShare > 0.4) lines.push(`${Math.round(g.nearTermShare * 100)}% of the gamma expires within 2 days, so these levels can change fast and reset after expiry.`);
  lines.push("A level is a place to watch, not an entry. Wait for your own confirmation (structure break, rejection, retest) before acting.");
  return { headline, bias, lines };
}

/** Combine several chains that track the same market (for example GLD + IAU for gold) into one picture in the base instrument's price terms.
 *  Each part's strikes are rescaled by base spot / its own spot. Dollar gamma per 1% move is scale-free, so the parts simply add. */
export function mergeGex(parts: GexResult[], base: number): GexResult {
  const grid = new Map<number, Row>(); const f = (r: GexResult) => base / r.spot;
  for (const r of parts) for (const row of r.rows) {
    const k = Math.round(row.strike * f(r) * 2) / 2; const a = grid.get(k) || { strike: k, call: 0, put: 0, net: 0, abs: 0, callOi: 0, putOi: 0 };
    a.call += row.call; a.put += row.put; a.callOi += row.callOi; a.putOi += row.putOi; a.net = a.call + a.put; a.abs = a.call - a.put; grid.set(k, a);
  }
  const rows = [...grid.values()].sort((a, b) => a.strike - b.strike);
  const n = Math.min(...parts.map((p) => p.profile.length));
  const profile = Array.from({ length: n }, (_, i) => ({ spot: base * (1 + (i - 40) * 0.0025), net: parts.reduce((a, p) => a + p.profile[i].net, 0) }));
  let flip: number | null = null; let best = Infinity;
  for (let i = 1; i < profile.length; i++) { const a = profile[i - 1], b = profile[i]; if ((a.net <= 0 && b.net > 0) || (a.net >= 0 && b.net < 0)) { const x = a.spot + (b.spot - a.spot) * (0 - a.net) / (b.net - a.net); if (Math.abs(x - base) < best) { best = Math.abs(x - base); flip = x; } } }
  const near = rows.filter((r) => Math.abs(r.strike / base - 1) <= 0.1);
  const up = near.filter((r) => r.strike >= base * 0.9995), dn = near.filter((r) => r.strike <= base * 1.0005);
  const callWall = up.length ? up.reduce((m, r) => (r.call > m.call ? r : m)).strike : null; const putWall = dn.length ? dn.reduce((m, r) => (r.put < m.put ? r : m)).strike : null;
  const magnet = near.length ? near.reduce((m, r) => (r.abs > m.abs ? r : m)).strike : null;
  let maxPain: number | null = null; let pain = Infinity;
  for (const r of rows) { let t = 0; for (const o of rows) t += o.callOi * Math.max(0, r.strike - o.strike) + o.putOi * Math.max(0, o.strike - r.strike); if (t < pain) { pain = t; maxPain = r.strike; } }
  const exp = new Map<number, { exp: number; dte: number; net: number; abs: number; oi: number }>();
  for (const r of parts) for (const e of r.expiries) { const a = exp.get(e.exp) || { exp: e.exp, dte: e.dte, net: 0, abs: 0, oi: 0 }; a.net += e.net; a.abs += e.abs; a.oi += e.oi; exp.set(e.exp, a); }
  const expiries = [...exp.values()].sort((a, b) => a.exp - b.exp);
  const totalNet = parts.reduce((a, p) => a + p.totalNet, 0), totalAbs = parts.reduce((a, p) => a + p.totalAbs, 0);
  const lead = [...parts].sort((a, b) => b.callOi + b.putOi - (a.callOi + a.putOi))[0];
  const em = lead.expectedMove ? { pct: lead.expectedMove.pct, abs: lead.expectedMove.pct * base, dte: lead.expectedMove.dte } : null;
  const callOi = parts.reduce((a, p) => a + p.callOi, 0), putOi = parts.reduce((a, p) => a + p.putOi, 0);
  const nearAbs = expiries.filter((e) => e.dte <= 2).reduce((a, e) => a + e.abs, 0); const atSpot = profile[40]?.net ?? totalNet;
  return { spot: base, asOf: Math.max(...parts.map((p) => p.asOf)), contracts: parts.reduce((a, p) => a + p.contracts, 0), used: parts.reduce((a, p) => a + p.used, 0), expiries, totalNet, totalAbs, callGex: parts.reduce((a, p) => a + p.callGex, 0), putGex: parts.reduce((a, p) => a + p.putGex, 0), rows, profile, callWall, putWall, flip, magnet, maxPain, pcrOi: callOi ? putOi / callOi : 0, callOi, putOi, expectedMove: em, nearTermShare: totalAbs ? nearAbs / totalAbs : 0, regime: Math.abs(atSpot) < 0.04 * totalAbs ? "neutral" : atSpot > 0 ? "positive" : "negative", ivAtm: lead.ivAtm };
}
