import { describe, it, expect } from 'vitest';
import { updateUserLocation } from '../../server/authService';

describe('updateUserLocation validation', () => {
  it('requires a province', () => { const r = updateUserLocation('x', { province: '', city: 'Lahore' }); expect(r.ok).toBe(false); expect(r.error).toMatch(/province/i); });
  it('requires a city', () => { const r = updateUserLocation('x', { province: 'Punjab', city: ' ' }); expect(r.ok).toBe(false); expect(r.error).toMatch(/city/i); });
  it('rejects an implausible WhatsApp number but treats it as optional when empty', () => {
    expect(updateUserLocation('x', { province: 'Punjab', city: 'Lahore', whatsapp: '12' }).error).toMatch(/whatsapp/i);
    expect(updateUserLocation('missing-user', { province: 'Punjab', city: 'Lahore', whatsapp: '' }).error).toMatch(/not found/i);
  });
});
