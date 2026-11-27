/**
 * LOGIN SECURITY — where each account signs in from, and signs of a shared password.
 * Every login is recorded with its place (city / region / country, approximate) and assessed against that account's recent history:
 *   • impossible travel — two sign-ins too far apart for the time between them
 *   • two countries within 24 h, a brand-new country, many different networks or devices
 *   • sign-in from a data-centre / VPN network
 * Records are private: Redis when connected, otherwise an AES-sealed blob (readable only by this server) — never the public bucket.
 */
import { privateListGet, privateListUpdate } from './durableStore.js';
import { lookupIp, maskIp, type Geo } from './geoip.js';

export interface LoginEvent {
  id: string; at: string; userId: string; username: string; name: string; kind: 'login' | 'signup';
  ip: string; device: string; country: string; countryCode: string; region: string; city: string; lat: number | null; lon: number | null; isp: string; hosting: boolean;
  flags: string[]; risk: number;
}
export interface SecurityWarning { id: string; userId: string; username: string; at: string; reason: string; message: string; location: string; ack: boolean; ackAt?: string; forcedPasswordChange?: boolean }

export const FLAG_TEXT: Record<string, string> = {
  impossible_travel: 'Impossible travel — two sign-ins too far apart for the time between them',
  two_countries_24h: 'Signed in from two different countries within 24 hours',
  new_country: 'Signed in from a country not seen before for this account',
  many_networks: 'Four or more different networks (IPs) within 24 hours',
  many_devices: 'Three or more different devices within 24 hours',
  datacenter_vpn: 'Sign-in from a data-centre / VPN network',
};
const WEIGHT: Record<string, number> = { impossible_travel: 50, two_countries_24h: 35, new_country: 15, many_networks: 20, many_devices: 20, datacenter_vpn: 10 };

export const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const shortDevice = (d: string) => `${/Windows|Mac|Linux|Android|iPhone|iPad/.exec(d)?.[0] || 'Other'}|${/Edg|Chrome|Firefox|Safari/.exec(d)?.[0] || ''}`;

/** Pure: flags for a new sign-in given the same account's earlier ones (any order). */
export function assess(prev: LoginEvent[], ev: Pick<LoginEvent, 'at' | 'ip' | 'device' | 'countryCode' | 'lat' | 'lon' | 'hosting'>): { flags: string[]; risk: number } {
  const now = Date.parse(ev.at);
  const mine = prev.filter((p) => p.at !== ev.at).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const flags: string[] = [];
  const known = (c: string) => c && c !== 'ZZ';
  const last = mine[0];
  if (last && ev.lat !== null && ev.lon !== null && last.lat !== null && last.lon !== null) {
    const hours = Math.max(0.05, (now - Date.parse(last.at)) / 3_600_000), dist = km({ lat: last.lat, lon: last.lon }, { lat: ev.lat, lon: ev.lon });
    if (hours <= 12 && dist >= 400 && dist / hours > 900) flags.push('impossible_travel');
  }
  const day = mine.filter((p) => now - Date.parse(p.at) <= 86_400_000);
  if (known(ev.countryCode) && day.some((p) => known(p.countryCode) && p.countryCode !== ev.countryCode)) flags.push('two_countries_24h');
  if (mine.length && known(ev.countryCode) && !mine.some((p) => p.countryCode === ev.countryCode) && !flags.includes('two_countries_24h')) flags.push('new_country');
  if (new Set([...day.map((p) => p.ip), ev.ip].filter(Boolean)).size >= 4) flags.push('many_networks');
  if (new Set([...day.map((p) => shortDevice(p.device)), shortDevice(ev.device)]).size >= 3) flags.push('many_devices');
  if (ev.hosting) flags.push('datacenter_vpn');
  return { flags, risk: Math.min(100, flags.reduce((a, f) => a + (WEIGHT[f] || 0), 0)) };
}

export const placeOf = (g: { city?: string; region?: string; country?: string }) => [g.city, g.region && g.region !== g.city ? g.region : '', g.country].filter(Boolean).join(', ') || 'Unknown location';

export async function trackLogin(u: { id: string; username: string; name: string }, ip: string, device: string, kind: 'login' | 'signup' = 'login') {
  const geo: Geo = await lookupIp(ip);
  const at = new Date().toISOString();
  const base = { id: `lg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at, userId: u.id, username: u.username, name: u.name, kind, ip, device: device.slice(0, 300), ...geo };
  await privateListUpdate('login_geo', (list) => {
    const mine = (list as LoginEvent[]).filter((e) => e.userId === u.id);
    const a = assess(mine, base);
    return [{ ...base, ...a } as LoginEvent, ...list].slice(0, 3000);
  });
}
export const listEvents = async (): Promise<LoginEvent[]> => ((await privateListGet('login_geo')) as LoginEvent[] | null) || [];

export function summariseUsers(events: LoginEvent[], warnings: SecurityWarning[]) {
  const by = new Map<string, LoginEvent[]>();
  const keyOf = (e: LoginEvent) => (e.username || e.userId).toLowerCase();
  for (const e of [...events].sort((a, b) => b.at.localeCompare(a.at))) by.set(keyOf(e), [...(by.get(keyOf(e)) || []), e]);
  const week = Date.now() - 7 * 86_400_000;
  return [...by.entries()].map(([userId, evs]) => {
    const recent = evs.filter((e) => Date.parse(e.at) >= week);
    const flags = [...new Set(recent.flatMap((e) => e.flags))];
    const places = new Map<string, { place: string; lat: number | null; lon: number | null; n: number; last: string }>();
    for (const e of recent) { const k = placeOf(e); const p = places.get(k); places.set(k, { place: k, lat: e.lat, lon: e.lon, n: (p?.n || 0) + 1, last: p && p.last > e.at ? p.last : e.at }); }
    const countries = new Set(recent.map((e) => e.countryCode).filter((c) => c && c !== 'ZZ'));
    const ids = new Set(evs.map((e) => e.userId)); const w = warnings.filter((x) => ids.has(x.userId));
    return { userId: evs[0].userId, username: evs[0].username, name: evs[0].name, lastAt: evs[0].at, lastPlace: placeOf(evs[0]), lastIp: evs[0].ip, lastLat: evs[0].lat, lastLon: evs[0].lon, lastIsp: evs[0].isp, lastCountry: evs[0].countryCode, lastHosting: evs[0].hosting, logins7d: recent.length, countries7d: countries.size, networks7d: new Set(recent.map((e) => e.ip)).size,
      places: [...places.values()].sort((a, b) => b.n - a.n).slice(0, 8), flags, risk: Math.max(0, ...recent.map((e) => e.risk)), warnings: w.length, lastWarnedAt: w[0]?.at || null };
  }).sort((a, b) => b.lastAt.localeCompare(a.lastAt)); // newest sign-in first
}

export const listWarnings = async (): Promise<SecurityWarning[]> => ((await privateListGet('security_warnings')) as SecurityWarning[] | null) || [];
export const publicIp = maskIp;
