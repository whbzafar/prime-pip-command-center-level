/**
 * Private Pine Script store.
 *
 * Scripts are kept in a PRIVATE Supabase Storage bucket (no public URL; readable only with the
 * server's secret key), so the source code never leaves the server except to an administrator.
 * Without Supabase (local development) they are kept in the data directory.
 */
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../dataPath.js';

export interface PineScriptRecord {
  id: string;
  name: string;
  source: string;
  published: boolean;
  overlay: boolean;
  updatedAt: number;
  updatedBy?: string;
}

/** What a student is allowed to see about a script — never the source. */
export interface PublicPineScript {
  id: string;
  name: string;
  overlay: boolean;
  updatedAt: number;
}

const BUCKET = 'primepipfx-pine';
const OBJECT = 'scripts.json';
const CACHE_MS = 20_000;

let cache: { at: number; rows: PineScriptRecord[] } | null = null;

function cfg() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key, enabled: Boolean(url && key) };
}

const localFile = () => path.join(getDataDir(), 'pine_private_scripts.json');

export const pineStoreBackend = () => (cfg().enabled ? 'supabase-private-storage' : 'local-file');

export const titleOf = (src: string) =>
  (src.match(/(?:indicator|strategy|library)\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["']/)?.[1] || 'Untitled script').slice(0, 80);
export const overlayOf = (src: string) => /(?:indicator|strategy)\s*\([^)]*overlay\s*=\s*true/.test(src);

async function ensureBucket() {
  const { url, key } = cfg();
  const r = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  // 409 / "already exists" is fine. Make sure an existing bucket is private.
  if (!r.ok && r.status !== 409 && r.status !== 400) throw new Error(`Pine storage bucket: HTTP ${r.status} ${await r.text()}`);
  await fetch(`${url}/storage/v1/bucket/${BUCKET}`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ public: false }),
  }).catch(() => {});
}

export async function readScripts(force = false): Promise<PineScriptRecord[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const { url, key, enabled } = cfg();
  let rows: PineScriptRecord[] = [];
  if (enabled) {
    const r = await fetch(`${url}/storage/v1/object/authenticated/${BUCKET}/${OBJECT}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (r.ok) rows = (await r.json().catch(() => [])) as PineScriptRecord[];
    else if (r.status !== 400 && r.status !== 404) throw new Error(`Pine storage read: HTTP ${r.status}`);
  } else {
    try { rows = JSON.parse(fs.readFileSync(localFile(), 'utf8')); } catch { rows = []; }
  }
  rows = Array.isArray(rows) ? rows.filter((s) => s && typeof s.id === 'string' && typeof s.source === 'string') : [];
  cache = { at: Date.now(), rows };
  return rows;
}

async function writeScripts(rows: PineScriptRecord[]) {
  const { url, key, enabled } = cfg();
  if (enabled) {
    const put = () => fetch(`${url}/storage/v1/object/${BUCKET}/${OBJECT}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'x-upsert': 'true', 'cache-control': 'no-store' },
      body: JSON.stringify(rows),
    });
    let r = await put();
    if (!r.ok) { await ensureBucket(); r = await put(); }
    if (!r.ok) throw new Error(`Pine storage write: HTTP ${r.status} ${await r.text()}`);
  } else {
    fs.writeFileSync(localFile(), JSON.stringify(rows, null, 2));
  }
  cache = { at: Date.now(), rows };
}

export const toPublic = (s: PineScriptRecord): PublicPineScript => ({ id: s.id, name: s.name, overlay: s.overlay, updatedAt: s.updatedAt });

export async function getScript(id: string): Promise<PineScriptRecord | null> {
  const rows = await readScripts();
  return rows.find((s) => s.id === id) || (await readScripts(true)).find((s) => s.id === id) || null;
}

export async function upsertScript(input: { id?: string; source: string; name?: string; published?: boolean }, by: string): Promise<PineScriptRecord> {
  const source = String(input.source || '');
  if (!source.trim()) throw new Error('Script source is empty.');
  if (source.length > 1_500_000) throw new Error('Script is too large.');
  const rows = await readScripts(true);
  const now = Date.now();
  const id = input.id && /^[\w-]{1,64}$/.test(input.id) ? input.id : `pine_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const prev = rows.find((s) => s.id === id);
  const rec: PineScriptRecord = {
    id,
    name: (input.name || titleOf(source)).slice(0, 80),
    source,
    published: input.published ?? prev?.published ?? false,
    overlay: overlayOf(source),
    updatedAt: now,
    updatedBy: by,
  };
  await writeScripts(prev ? rows.map((s) => (s.id === id ? rec : s)) : [rec, ...rows]);
  return rec;
}

export async function deleteScript(id: string) {
  const rows = await readScripts(true);
  await writeScripts(rows.filter((s) => s.id !== id));
}
