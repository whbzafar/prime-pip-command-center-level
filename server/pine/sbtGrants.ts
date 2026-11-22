/**
 * Per-student access to the (unpublished) SBT indicator.
 * The administrator switches it on for a student in the Members panel; the student then sees the indicator in
 * their Premium TradingView chip bar and can apply / remove it. The source code is never sent to them.
 * Kept in the shared durable store (Redis or the sealed fallback), so it survives restarts and is the same on every server.
 */
import { getShared, updateShared } from '../durableStore.js';
import type { PineScriptRecord } from './pineStore.js';

const KEY = 'sbt_indicator_grants';
interface Grants { ids: string[] }

export interface GrantStore { has(userId: string): Promise<boolean>; list(): Promise<string[]>; set(userId: string, granted: boolean): Promise<string[]> }

export const sbtGrants: GrantStore = {
  async has(userId) { return (await getShared<Grants>(KEY, { ids: [] }, 3000)).ids.includes(userId); },
  async list() { return (await getShared<Grants>(KEY, { ids: [] }, 3000)).ids; },
  async set(userId, granted) {
    const next = await updateShared<Grants>(KEY, { ids: [] }, (g) => {
      const ids = new Set(g.ids || []);
      if (granted) ids.add(userId); else ids.delete(userId);
      return { ids: [...ids] };
    });
    return next.ids;
  },
};

/** The indicators an admin can hand to individual students: unpublished ones named "SBT". */
export const isGrantable = (s: Pick<PineScriptRecord, 'name' | 'published'>) => !s.published && /\bSBT\b/i.test(s.name || '');
