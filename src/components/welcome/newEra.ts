import type { UserAccount } from '../../types';
import { hasPaidAccess, isUserAdmin } from '../../utils/authClient';

const key = (id: string) => `ppfx_newera_seen_${id}`;
const WINDOW_MS = 14 * 86_400_000;

/** First-time subscribers only: paid, not admin, never shown before, and (when known) subscribed within the last 14 days. */
export function shouldShowNewEra(user: UserAccount | null, now = Date.now(), seen: (k: string) => boolean = (k) => { try { return !!localStorage.getItem(k); } catch { return true; } }): boolean {
  if (!user || isUserAdmin(user) || !hasPaidAccess(user)) return false;
  if (seen(key(user.id))) return false;
  const t = Date.parse(user.startDate || '');
  if (Number.isFinite(t) && now - t > WINDOW_MS) return false;
  return true;
}
export const markNewEraSeen = (id: string) => { try { localStorage.setItem(key(id), String(Date.now())); } catch { /* ignore */ } };

/** The student's own name: their profile name, or (when that is empty/generic) the username they subscribed with. */
export function welcomeName(user: { name?: string; username?: string } | null | undefined): string {
  const generic = /^(student|trader|user|member|guest|demo)$/i;
  const n = (user?.name || '').trim();
  const raw = n && !generic.test(n) ? n : (user?.username || '').trim() || n;
  const first = raw.split(/\s+/)[0].replace(/[_.\-]+/g, ' ').trim();
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
}
