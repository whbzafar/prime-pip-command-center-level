import { describe, it, expect } from 'vitest';
import { shouldShowNewEra } from './newEra';
const u = (o: any = {}) => ({ id: 'u1', role: 'USER', subscriptionStatus: 'ACTIVE', expiryDate: new Date(Date.now() + 864e5).toISOString(), startDate: new Date().toISOString(), ...o }) as any;
describe('shouldShowNewEra', () => {
  const no = () => false;
  it('shows for a fresh paid subscriber', () => expect(shouldShowNewEra(u(), Date.now(), no)).toBe(true));
  it('not twice', () => expect(shouldShowNewEra(u(), Date.now(), () => true)).toBe(false));
  it('not for free users or guests', () => { expect(shouldShowNewEra(u({ subscriptionStatus: 'NONE' }), Date.now(), no)).toBe(false); expect(shouldShowNewEra(null, Date.now(), no)).toBe(false); });
  it('not for admins', () => expect(shouldShowNewEra(u({ role: 'ADMIN' }), Date.now(), no)).toBe(false));
  it('not for long-time subscribers', () => expect(shouldShowNewEra(u({ startDate: new Date(Date.now() - 40 * 864e5).toISOString() }), Date.now(), no)).toBe(false));
});
