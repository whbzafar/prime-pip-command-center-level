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

// ── Sealed fallback ─────────────────────────────────────────────────────────────────────────────
// Without a Redis database the accounts used to live only on the server's temporary disk, so every
// restart forgot new sign-ups, password resets, suspensions and edits. When a server secret exists,
// the account list is instead kept ENCRYPTED (AES-256-GCM) in the app's shared bucket: the bucket is
// public, but the content is unreadable without the secret, and anything that fails to decrypt is
// ignored. Redis, when connected, is still preferred.
import crypto from 'crypto';
import zlib from 'zlib';
const SEAL_SECRET = process.env.PRIMEPIPFX_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PPFX_STRATEGY_KEY || '';
const SEAL_PREFIX = (process.env.PPFX_SEALED_PREFIX || 'ppfx_sealed_users').replace(/[^a-z0-9_]/gi, '');
export const sealedEnabled = !durableEnabled && SEAL_SECRET.length >= 16;
const sealKey = () => crypto.createHash('sha256').update(`ppfx-users-v1:${SEAL_SECRET}`).digest();
const CHUNK = 9000;
const seal = (value: unknown): string => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', sealKey(), iv);
  const body = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(value), 'utf8'))), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
};
const unseal = (text: string): any => {
  const raw = Buffer.from(text, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', sealKey(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(raw.subarray(28)), d.final()])).toString('utf8'));
};
const kvUrl = () => (process.env.PPFX_SHARED_KV_URL || 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU').replace(/\/$/, '');
/** null = could not read (network / tampered); [] = nothing stored yet. */
async function sealedRead(prefix = SEAL_PREFIX): Promise<any[] | null> {
  try {
    const m = await fetch(`${kvUrl()}/${prefix}_meta`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (m.status === 404) return [];
    if (!m.ok) return null;
    const meta = JSON.parse(await m.text());
    const parts = await Promise.all(Array.from({ length: Number(meta.n) || 0 }, (_, i) =>
      fetch(`${kvUrl()}/${prefix}_${meta.v}_${i}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).then((r) => { if (!r.ok) throw new Error(`part ${i}: ${r.status}`); return r.text(); })));
    const users = unseal(parts.join(''));
    return Array.isArray(users) ? users : null;
  } catch (e: any) { lastError = `sealed read: ${e?.message || e}`; return null; }
}
async function sealedWrite(users: any[], prefix = SEAL_PREFIX) {
  const text = seal(users);
  const v = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const n = Math.ceil(text.length / CHUNK);
  const put = (k: string, body: string) => fetch(`${kvUrl()}/${k}`, { method: 'PUT', body, signal: AbortSignal.timeout(6000) }).then((r) => { if (!r.ok) throw new Error(`write ${k}: ${r.status}`); });
  await Promise.all(Array.from({ length: n }, (_, i) => put(`${prefix}_${v}_${i}`, text.slice(i * CHUNK, (i + 1) * CHUNK))));
  let old: any = null;
  try { const m = await fetch(`${kvUrl()}/${prefix}_meta`, { cache: 'no-store', signal: AbortSignal.timeout(4000) }); if (m.ok) old = JSON.parse(await m.text()); } catch { /* first write */ }
  await put(`${prefix}_meta`, JSON.stringify({ v, n, at: Date.now() }));
  if (old?.v && old.v !== v) for (let i = 0; i < (Number(old.n) || 0); i++) void fetch(`${kvUrl()}/${prefix}_${old.v}_${i}`, { method: 'DELETE' }).catch(() => {});
}
const stamp = (u: any) => Date.parse(u?.updatedAt || u?.createdAt || '') || 0;
/** Per user, the more recently changed copy wins; on a tie the `prefer` side wins. */
function mergeUsers(prefer: any[], other: any[]): any[] {
  const out = new Map<string, any>();
  for (const u of other) if (u?.id) out.set(u.id, u);
  for (const u of prefer) { if (!u?.id) continue; const o = out.get(u.id); if (!o || stamp(u) >= stamp(o)) out.set(u.id, u); }
  return [...out.values()];
}
let sealedSnapshot = '';
let sealedIds = new Set<string>(); // ids known to be in the bucket at the last sync
let sealedQueue: Promise<unknown> = Promise.resolve();

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
export const durableStatus = () => ({ enabled: durableEnabled || sealedEnabled, mode: durableEnabled ? 'redis' : sealedEnabled ? 'sealed' : 'temporary', lastError, lastHydrate });

/** Pull every user from Redis and merge into the local store (Redis wins for users it has). */
export async function hydrateUsers(read: () => any[], write: (u: any[]) => void, maxAgeMs = 4000) {
  if (sealedEnabled) {
    if (Date.now() - lastHydrate < maxAgeMs) return;
    if (hydrating) return hydrating;
    hydrating = (async () => {
      try {
        const remote = await sealedRead();
        if (remote) {
          // An account this server knew was in the bucket and is no longer there was deleted elsewhere.
          const there = new Set(remote.map((u) => String(u.id)));
          const local = read().filter((u) => !sealedIds.has(String(u?.id)) || there.has(String(u?.id)));
          const merged = mergeUsers(local, remote);
          sealedSnapshot = JSON.stringify([...remote].sort((a, b) => String(a.id).localeCompare(String(b.id))));
          sealedIds = new Set(remote.map((u) => String(u.id)));
          lastHydrate = Date.now();
          lastError = '';
          write(merged); // → persistUsers pushes anything the bucket lacks
        }
      } finally { hydrating = null; }
    })();
    return hydrating;
  }
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
  if (sealedEnabled) {
    const sorted = (l: any[]) => JSON.stringify([...l].sort((a, b) => String(a.id).localeCompare(String(b.id))));
    if (!lastHydrate || sorted(users) === sealedSnapshot) return; // never write before a first read; nothing changed
    const mine = users.map((u) => ({ ...u }));
    const p = (sealedQueue = sealedQueue.then(async () => {
      const remote = await sealedRead();
      if (remote === null) throw new Error('bucket unreadable — not overwriting');
      // An account this server knew was in the bucket and no longer has was deleted here: drop it.
      const have = new Set(mine.map((u) => String(u.id)));
      const merged = mergeUsers(mine, remote.filter((u) => have.has(String(u.id)) || !sealedIds.has(String(u.id))));
      if (sorted(merged) !== sorted(remote)) await sealedWrite(merged);
      sealedSnapshot = sorted(merged);
      sealedIds = new Set(merged.map((u) => String(u.id)));
    }).catch((e: any) => { lastError = `sealed write: ${e?.message || e}`; }));
    pending.add(p);
    p.finally(() => pending.delete(p));
    return;
  }
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
const KVDB = (process.env.PPFX_SHARED_KV_URL || 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU').replace(/\/$/, '');
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

/** Private blob (Redis only — never the public fallback bucket). Returns null when Redis is not connected. */
export async function privateGet(key: string): Promise<string | null> { if (!durableEnabled) return null; return (await cmd(['GET', `ppfx:private:${key}`])) ?? ''; }
export async function privateSet(key: string, value: string): Promise<void> { if (!durableEnabled) throw new Error('Redis is not connected'); await cmd(['SET', `ppfx:private:${key}`, value]); }

/**
 * Small private records (bot reservations, feedback, error reports): Redis when connected, otherwise
 * the same AES-256-GCM sealing as the account backup, in the shared bucket under its own key.
 * Readable only by this server. Returns [] when nothing is stored, null when it could not be read.
 */
export async function privateListGet(name: string): Promise<any[] | null> {
  const key = name.replace(/[^a-z0-9_]/gi, '');
  try {
    if (durableEnabled) { const raw = await privateGet(`list_${key}`); return raw ? JSON.parse(zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8')) : []; }
    if (!SEAL_SECRET || SEAL_SECRET.length < 16) return null;
    return await sealedRead(`ppfx_sealed_${key}`);
  } catch { return null; }
}
let listQueue: Promise<unknown> = Promise.resolve();
/** Read-modify-write, one at a time on this server. */
export function privateListUpdate(name: string, fn: (list: any[]) => any[]): Promise<any[]> {
  const key = name.replace(/[^a-z0-9_]/gi, '');
  const p = listQueue.then(async () => {
    const cur = await privateListGet(key);
    if (cur === null) throw new Error('storage unavailable');
    const next = fn(cur);
    if (durableEnabled) await privateSet(`list_${key}`, zlib.gzipSync(Buffer.from(JSON.stringify(next), 'utf8')).toString('base64'));
    else {
      await sealedWrite(next, `ppfx_sealed_${key}`);
    }
    return next;
  });
  listQueue = p.catch(() => undefined);
  return p;
}
