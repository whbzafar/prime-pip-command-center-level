/**
 * IP → place. Free providers (no key, HTTPS), tried in order, cached for a week so each address is looked up once.
 * City-level accuracy is approximate (it locates the visitor's network/ISP, often the nearest city) — never exact addresses.
 */
export interface Geo { country: string; countryCode: string; region: string; city: string; lat: number | null; lon: number | null; isp: string; hosting: boolean }
const EMPTY: Geo = { country: 'Unknown', countryCode: 'ZZ', region: '', city: '', lat: null, lon: null, isp: '', hosting: false };
const HOSTING = /(amazon|aws\b|google (cloud|llc)|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|vultr|choopa|m247|datacamp|leaseweb|contabo|oracle|alibaba|tencent|mullvad|nord ?(vpn|layer)|proton|express ?vpn|surfshark|cyberghost|private internet|hide\.?me|ipvanish|windscribe|tor\b|vpn|proxy|hosting|data ?cent|server|cloud)/i;

const cache = new Map<string, { at: number; g: Geo }>();
const inflight = new Map<string, Promise<Geo>>();
const TTL = 7 * 86400_000;

export function isPrivateIp(ip: string): boolean {
  return !ip || /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip) || ip === 'localhost';
}
export const clientIp = (req: { headers: Record<string, any>; socket?: { remoteAddress?: string } }): string => {
  const h = (k: string) => { const v = req.headers[k]; return String(Array.isArray(v) ? v[0] : v || '').split(',')[0].trim(); };
  return (h('cf-connecting-ip') || h('true-client-ip') || h('x-forwarded-for') || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
};
export const maskIp = (ip: string) => { const p = ip.split('.'); return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : ip.includes(':') ? ip.split(':').slice(0, 2).join(':') + ':…' : ip; };

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(3500), headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
const providers: Array<(ip: string) => Promise<Geo>> = [
  async (ip) => {
    const j = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!j || j.success === false) throw new Error('no result');
    const isp = String(j.connection?.isp || j.connection?.org || '');
    return { country: j.country || 'Unknown', countryCode: String(j.country_code || 'ZZ').toUpperCase(), region: j.region || '', city: j.city || '', lat: Number.isFinite(j.latitude) ? j.latitude : null, lon: Number.isFinite(j.longitude) ? j.longitude : null, isp, hosting: HOSTING.test(isp) || HOSTING.test(String(j.connection?.domain || '')) };
  },
  async (ip) => {
    const j = await getJson(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`);
    const isp = String(j.organization_name || '');
    return { country: j.country || 'Unknown', countryCode: String(j.country_code || 'ZZ').toUpperCase(), region: j.region || '', city: j.city || '', lat: j.latitude ? Number(j.latitude) : null, lon: j.longitude ? Number(j.longitude) : null, isp, hosting: HOSTING.test(isp) };
  },
];

export async function lookupIp(ip: string): Promise<Geo> {
  if (isPrivateIp(ip)) return { ...EMPTY, country: 'Local network', countryCode: 'ZZ' };
  const hit = cache.get(ip); if (hit && Date.now() - hit.at < TTL) return hit.g;
  let p = inflight.get(ip);
  if (!p) {
    p = (async () => {
      for (const prov of providers) { try { const g = await prov(ip); cache.set(ip, { at: Date.now(), g }); if (cache.size > 5000) cache.delete(cache.keys().next().value as string); return g; } catch { /* next provider */ } }
      return EMPTY;
    })().finally(() => inflight.delete(ip));
    inflight.set(ip, p);
  }
  return p;
}
