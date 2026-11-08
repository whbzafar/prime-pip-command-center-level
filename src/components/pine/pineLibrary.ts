/**
 * Shared Pine indicator state for the Premium terminal.
 *
 *  - library: the scripts on the server (admins get source; everyone else gets id + name only)
 *  - shown:   which indicators this user has switched ON for the main chart (kept per browser,
 *             so they stay applied across pairs, timeframes and reloads)
 *  - draft:   an administrator's unsaved editor code currently tried on the chart
 */
import { getStoredToken } from '../../utils/authClient';

export interface LibraryScript { id: string; name: string; overlay: boolean; updatedAt: number; published?: boolean; source?: string }
export const DRAFT_ID = '__draft__';

const SHOWN_KEY = 'ppfx_pine_shown_v2';
type Listener = () => void;

const state: {
  scripts: LibraryScript[];
  isAdmin: boolean;
  loaded: boolean;
  error: string | null;
  backend: string;
  shown: string[];
  draft: { source: string; name: string } | null;
} = {
  scripts: [],
  isAdmin: false,
  loaded: false,
  error: null,
  backend: '',
  shown: (() => { try { const v = JSON.parse(localStorage.getItem(SHOWN_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x !== DRAFT_ID) : []; } catch { return []; } })(),
  draft: null,
};
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const pineLib = {
  get: () => state,
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function authInit(init: RequestInit = {}): RequestInit {
  const token = getStoredToken();
  return { credentials: 'include', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } };
}

let inflight: Promise<void> | null = null;
export function loadLibrary(force = false): Promise<void> {
  if (inflight && !force) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch('/api/pine/scripts', authInit());
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      state.scripts = j.scripts || [];
      state.isAdmin = Boolean(j.isAdmin);
      state.backend = String(j.backend || '');
      state.error = null;
      // Drop indicators that were unpublished or deleted.
      const ids = new Set(state.scripts.map((s) => s.id));
      const kept = state.shown.filter((id) => ids.has(id));
      if (kept.length !== state.shown.length) setShownList(kept, false);
    } catch (err: any) {
      state.error = String(err?.message || err);
    } finally {
      state.loaded = true;
      inflight = null;
      emit();
    }
  })();
  return inflight;
}

function setShownList(next: string[], notify = true) {
  state.shown = [...new Set(next)];
  try { localStorage.setItem(SHOWN_KEY, JSON.stringify(state.shown.filter((id) => id !== DRAFT_ID))); } catch { /* storage blocked */ }
  if (notify) emit();
}

export const isShown = (id: string) => state.shown.includes(id);
export const showIndicator = (id: string) => setShownList([...state.shown, id]);
export const hideIndicator = (id: string) => setShownList(state.shown.filter((x) => x !== id));
export const hideAll = () => { state.draft = null; setShownList([]); };

/** Admin only: try unsaved editor code on the main chart. */
export function setDraft(source: string, name: string) {
  state.draft = { source, name };
  setShownList([...state.shown.filter((x) => x !== DRAFT_ID), DRAFT_ID]);
}
export function clearDraft() { state.draft = null; setShownList(state.shown.filter((x) => x !== DRAFT_ID)); }

export async function saveScript(input: { id?: string; source: string; published?: boolean }) {
  const r = await fetch('/api/pine/scripts', authInit({ method: 'PUT', body: JSON.stringify(input) }));
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
  await loadLibrary(true);
  return j.script as LibraryScript;
}

export async function deleteScript(id: string) {
  const r = await fetch(`/api/pine/scripts/${encodeURIComponent(id)}`, authInit({ method: 'DELETE' }));
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
  hideIndicator(id);
  await loadLibrary(true);
}

/** Status line per indicator, set by the main chart as runs land. */
const status = new Map<string, { kind: 'busy' | 'ok' | 'error'; text: string; line?: number | null }>();
export const indicatorStatus = (id: string) => status.get(id) || null;
export function setIndicatorStatus(id: string, s: { kind: 'busy' | 'ok' | 'error'; text: string; line?: number | null } | null) {
  if (s) status.set(id, s); else status.delete(id);
  emit();
}
