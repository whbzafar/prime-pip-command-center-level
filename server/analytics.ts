/**
 * VISITOR ANALYTICS — who is on the site / terminal right now, what they look at, and where they are.
 * No IP addresses are stored: geography comes from the host's edge headers (Vercel / Cloudflare) and a visitor is a random id.
 * Counters live in Redis when connected (shared by every server instance, survives restarts); otherwise in this server's memory.
 */
import { durableEnabled, redisCmd } from './durableStore.js';

const PK_REGIONS: Record<string, string> = { PB: 'Punjab', SD: 'Sindh', KP: 'Khyber Pakhtunkhwa', BA: 'Balochistan', IS: 'Islamabad', GB: 'Gilgit-Baltistan', JK: 'Azad Kashmir', TA: 'FATA' };
const LIVE_MS = 75_000;
const LIVE_KEEP_MS = 10 * 60_000;
const TTL_S = 40 * 86400;

export interface Ping {
  vid: string; sid: string; tab: string; kind: 'start' | 'view' | 'beat';
  cls: 'guest' | 'demo' | 'subscriber' | 'admin'; user?: string; device: 'mobile' | 'tablet' | 'desktop';
}
interface Geo { country: string; region: string; city: string }
interface Live extends Geo { vid: string; sid: string; tab: string; cls: string; user: string; device: string; since: number; last: number }

const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
const clean = (s: unknown, n = 40) => String(s ?? '').replace(/[^\w .@:\-/]/g, '').slice(0, n);

export function geoFromHeaders(h: Record<string, any>): Geo {
  const g = (k: string) => { const v = h[k]; return Array.isArray(v) ? v[0] : v; };
  const country = clean(g('x-vercel-ip-country') || g('cf-ipcountry') || 'ZZ', 3).toUpperCase() || 'ZZ';
  let city = ''; try { city = decodeURIComponent(String(g('x-vercel-ip-city') || g('cf-ipcity') || '')); } catch { /* keep blank */ }
  const rc = clean(g('x-vercel-ip-country-region') || g('cf-region-code') || '', 12);
  const region = country === 'PK' ? (PK_REGIONS[rc.toUpperCase()] || rc || 'Unknown') : (rc || 'Unknown');
  return { country, region, city: clean(city, 40) || 'Unknown' };
}

// ── store (Redis or memory) ─────────────────────────────────────────────────────────────────────
const mem = { h: new Map<string, Map<string, number>>(), live: new Map<string, Live>(), uv: new Map<string, Set<string>>() };
async function hincr(key: string, field: string, by = 1) {
  if (durableEnabled) { await redisCmd(['HINCRBY', key, field, by]); await redisCmd(['EXPIRE', key, TTL_S]); return; }
  const m = mem.h.get(key) || new Map(); m.set(field, (m.get(field) || 0) + by); mem.h.set(key, m);
}
async function hall(key: string): Promise<Record<string, number>> {
  if (durableEnabled) {
    const a: string[] = (await redisCmd(['HGETALL', key])) || []; const o: Record<string, number> = {};
    for (let i = 0; i < a.length; i += 2) o[a[i]] = Number(a[i + 1]); return o;
  }
  return Object.fromEntries(mem.h.get(key) || []);
}
async function uvAdd(key: string, vid: string) {
  if (durableEnabled) { await redisCmd(['PFADD', key, vid]); await redisCmd(['EXPIRE', key, TTL_S]); return; }
  const s = mem.uv.get(key) || new Set(); s.add(vid); mem.uv.set(key, s);
}
async function uvCount(keys: string[]): Promise<number> {
  if (durableEnabled) return Number(await redisCmd(['PFCOUNT', ...keys])) || 0;
  const u = new Set<string>(); keys.forEach((k) => mem.uv.get(k)?.forEach((v) => u.add(v))); return u.size;
}

export async function recordPing(p: Ping, geo: Geo) {
  const now = Date.now(), d = day();
  const sid = clean(p.sid, 40), vid = clean(p.vid, 40);
  if (!sid || !vid) return;
  const live: Live = { ...geo, vid, sid, tab: clean(p.tab, 40) || 'UNKNOWN', cls: p.cls, user: clean(p.user, 40), device: p.device, since: now, last: now };
  if (durableEnabled) {
    const prev = await redisCmd(['HGET', 'ppfx:an:live', sid]).catch(() => null);
    if (prev) { try { live.since = JSON.parse(prev).since || now; } catch { /* new */ } }
    await redisCmd(['HSET', 'ppfx:an:live', sid, JSON.stringify(live)]);
  } else {
    const prev = mem.live.get(sid); if (prev) live.since = prev.since; mem.live.set(sid, live);
    for (const [k, v] of mem.live) if (now - v.last > LIVE_KEEP_MS) mem.live.delete(k);
  }
  const k = (s: string) => `ppfx:an:d:${d}:${s}`;
  if (p.kind === 'start') {
    await Promise.all([hincr(k('c'), 'sessions'), hincr(k('cls'), p.cls), hincr(k('country'), geo.country), hincr(k('region'), `${geo.country}|${geo.region}`), hincr(k('city'), `${geo.country}|${geo.region}|${geo.city}`), hincr(k('dev'), p.device), uvAdd(k('uv'), vid)]);
  }
  if (p.kind === 'start' || p.kind === 'view') await hincr(k('tabs'), live.tab);
}

export async function liveNow(): Promise<Live[]> {
  const now = Date.now(); let all: Live[] = [];
  if (durableEnabled) {
    const a: string[] = (await redisCmd(['HGETALL', 'ppfx:an:live'])) || [];
    const stale: string[] = [];
    for (let i = 0; i < a.length; i += 2) { try { const v = JSON.parse(a[i + 1]) as Live; if (now - v.last > LIVE_KEEP_MS) stale.push(a[i]); else all.push(v); } catch { stale.push(a[i]); } }
    if (stale.length) void redisCmd(['HDEL', 'ppfx:an:live', ...stale]).catch(() => {});
  } else all = [...mem.live.values()];
  return all.filter((v) => now - v.last <= LIVE_MS).sort((a, b) => b.last - a.last);
}

const sum = (rows: Record<string, number>[]) => { const o: Record<string, number> = {}; rows.forEach((r) => Object.entries(r).forEach(([k, v]) => { o[k] = (o[k] || 0) + v; })); return o; };
const top = (o: Record<string, number>, n = 15) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

export async function summary(days: number) {
  const ds = Array.from({ length: days }, (_, i) => day(Date.now() - i * 86400000));
  const get = (s: string) => Promise.all(ds.map((d) => hall(`ppfx:an:d:${d}:${s}`))).then(sum);
  const [counts, cls, country, region, city, tabs, dev, live, uv, perDay] = await Promise.all([
    get('c'), get('cls'), get('country'), get('region'), get('city'), get('tabs'), get('dev'), liveNow(),
    uvCount(ds.map((d) => `ppfx:an:d:${d}:uv`)),
    Promise.all(ds.map(async (d) => ({ day: d, sessions: (await hall(`ppfx:an:d:${d}:c`)).sessions || 0 }))),
  ]);
  const byTab: Record<string, number> = {}; live.forEach((v) => { byTab[v.tab] = (byTab[v.tab] || 0) + 1; });
  const liveCountry: Record<string, number> = {}; live.forEach((v) => { liveCountry[v.country] = (liveCountry[v.country] || 0) + 1; });
  return {
    storage: durableEnabled ? 'redis' : 'memory', days, generatedAt: Date.now(),
    live: { count: live.length, byTab: top(byTab, 30), byCountry: top(liveCountry, 30), visitors: live.slice(0, 200).map((v) => ({ tab: v.tab, cls: v.cls, user: v.user, device: v.device, country: v.country, region: v.region, city: v.city, since: v.since, last: v.last })) },
    sessions: counts.sessions || 0, uniqueVisitors: uv, classes: top(cls), devices: top(dev),
    topTabs: top(tabs, 40), countries: top(country, 40),
    regions: top(region, 60).map(([k, n]) => { const [c, ...r] = k.split('|'); return { country: c, region: r.join('|'), n }; }),
    cities: top(city, 60).map(([k, n]) => { const [c, r, ...ci] = k.split('|'); return { country: c, region: r, city: ci.join('|'), n }; }),
    perDay: perDay.reverse(),
  };
}
