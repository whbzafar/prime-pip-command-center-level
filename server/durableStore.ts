/**
 * DURABLE ACCOUNT STORE (Upstash Redis over HTTPS — no extra packages).
 *
 * Vercel's file system is temporary and per-instance, so accounts written to users.json alone are
 * lost on the next cold start or deploy. When a Redis database is connected (Vercel → Storage →
 * Upstash for Redis, which adds KV_REST_API_URL / KV_REST_API_TOKEN automatically), every user
 * record is mirrored into a Redis hash and every login is appended to a log.
 *
 * Users are stored one field per user (HSET ppfx:users <id> <json>), and only changed users are
 * written, so two servers registering different people at the same time never overwrite each other.
 */
const URL_ = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const durableEnabled = Boolean(URL_ && TOKEN);

const USERS_KEY = 'ppfx:users';
const LOGINS_KEY = 'ppfx:logins';

async function cmd(args: (string | number)[]): Promise<any> {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String)),
    signal: AbortSignal.timeout(6000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`redis ${args[0]}: ${j.error || r.status}`);
  return j.result;
}

let snapshot = new Map<string, string>(); // id -> json last known to be in Redis
let lastHydrate = 0;
let hydrating: Promise<void> | null = null;
const pending = new Set<Promise<unknown>>();
let lastError = '';
export const durableStatus = () => ({ enabled: durableEnabled, lastError, lastHydrate });

/** Pull every user from Redis and merge into the local store (Redis wins for users it has). */
export async function hydrateUsers(read: () => any[], write: (u: any[]) => void, maxAgeMs = 4000) {
  if (!durableEnabled) return;
  if (Date.now() - lastHydrate < maxAgeMs) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const flat: string[] = (await cmd(['HGETALL', USERS_KEY])) || [];
      const remote = new Map<string, string>();
      for (let i = 0; i + 1 < flat.length; i += 2) remote.set(flat[i], flat[i + 1]);
      const local = read();
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const [id, json] of remote) { try { merged.push(JSON.parse(json)); seen.add(id); } catch { /* skip bad */ } }
      const missing: any[] = [];
      for (const u of local) if (u?.id && !seen.has(u.id)) { merged.push(u); missing.push(u); }
      snapshot = remote;
      write(merged); // write() mirrors `missing` (e.g. the seeded admin) up to Redis via persistUsers
      lastHydrate = Date.now();
      lastError = '';
    } catch (e: any) {
      lastError = String(e?.message || e);
    } finally {
      hydrating = null;
    }
  })();
  return hydrating;
}

/** Mirror only the users that changed (and removals) since the last sync. */
export function persistUsers(users: any[]) {
  if (!durableEnabled) return;
  const next = new Map<string, string>();
  for (const u of users) if (u?.id) next.set(u.id, JSON.stringify(u));
  const set: string[] = [];
  for (const [id, json] of next) if (snapshot.get(id) !== json) set.push(id, json);
  const del = lastHydrate ? [...snapshot.keys()].filter((id) => !next.has(id)) : []; // never delete before a first read
  snapshot = next;
  const ops: Promise<unknown>[] = [];
  if (set.length) ops.push(cmd(['HSET', USERS_KEY, ...set]));
  if (del.length) ops.push(cmd(['HDEL', USERS_KEY, ...del]));
  if (!ops.length) return;
  const p = Promise.all(ops).catch((e) => { lastError = String(e?.message || e); lastHydrate = 0; });
  pending.add(p);
  p.finally(() => pending.delete(p));
}

export function logLogin(entry: Record<string, unknown>) {
  if (!durableEnabled) return;
  const p = cmd(['LPUSH', LOGINS_KEY, JSON.stringify(entry)]).then(() => cmd(['LTRIM', LOGINS_KEY, 0, 1999])).catch((e) => { lastError = String(e?.message || e); });
  pending.add(p);
  p.finally(() => pending.delete(p));
}

export async function recentLogins(limit = 300): Promise<any[]> {
  if (!durableEnabled) return [];
  try {
    const rows: string[] = (await cmd(['LRANGE', LOGINS_KEY, 0, limit - 1])) || [];
    return rows.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export const hasPendingWrites = () => pending.size > 0;
export async function flushDurable() { await Promise.allSettled([...pending]); }

// ─────────────────────────────── small shared records (removed members, last logins, login log)
// Stored in Redis when connected; otherwise in the app's existing kvdb.io bucket so they still
// survive restarts and are shared by every server instance.
const KVDB = 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU';
const cache = new Map<string, { at: number; v: any }>();

export async function getShared<T>(key: string, fallback: T, maxAgeMs = 8000): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.v as T;
  try {
    let raw: string | null = null;
    if (durableEnabled) raw = await cmd(['GET', `ppfx:${key}`]);
    else {
      const r = await fetch(`${KVDB}/ppfx_${key}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      raw = r.ok ? await r.text() : null;
    }
    const v = raw ? JSON.parse(raw) : fallback;
    cache.set(key, { at: Date.now(), v });
    return v as T;
  } catch {
    return (hit?.v as T) ?? fallback;
  }
}

export function setShared(key: string, value: unknown) {
  cache.set(key, { at: Date.now(), v: value });
  const body = JSON.stringify(value);
  const p = (durableEnabled
    ? cmd(['SET', `ppfx:${key}`, body])
    : fetch(`${KVDB}/ppfx_${key}`, { method: 'PUT', body, signal: AbortSignal.timeout(5000) })
  ).catch((e: any) => { lastError = String(e?.message || e); });
  pending.add(p);
  p.finally(() => pending.delete(p));
  return p;
}

/** Read-modify-write helper (fresh read, then write). */
export async function updateShared<T>(key: string, fallback: T, fn: (v: T) => T) {
  const cur = await getShared<T>(key, fallback, 0);
  const next = fn(cur);
  await setShared(key, next);
  return next;
}
