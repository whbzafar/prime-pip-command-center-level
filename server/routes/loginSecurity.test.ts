import { describe, it, expect } from 'vitest';
import { assess, km, summariseUsers, placeOf, type LoginEvent } from '../loginSecurity';
import { isPrivateIp, maskIp, clientIp } from '../geoip';

const ev = (o: Partial<LoginEvent>): LoginEvent => ({ id: 'x', at: '2026-11-22T10:00:00Z', userId: 'u1', username: 'ali', name: 'Ali', kind: 'login', ip: '1.1.1.1', device: 'Windows Chrome', country: 'Pakistan', countryCode: 'PK', region: 'Punjab', city: 'Lahore', lat: 31.52, lon: 74.36, isp: 'PTCL', hosting: false, flags: [], risk: 0, ...o });
const LAHORE = { lat: 31.52, lon: 74.36 }, LONDON = { lat: 51.5, lon: -0.12 }, KARACHI = { lat: 24.86, lon: 67.0 };

describe('login security', () => {
  it('distance maths is right (Lahore–London ≈ 6,300 km)', () => { expect(Math.round(km(LAHORE, LONDON) / 100)).toBe(63); });
  it('flags impossible travel and two countries within a day', () => {
    const prev = [ev({ at: '2026-11-22T08:00:00Z' })];
    const a = assess(prev, { at: '2026-11-22T10:00:00Z', ip: '2.2.2.2', device: 'Windows Chrome', countryCode: 'GB', ...LONDON, hosting: false });
    expect(a.flags).toContain('impossible_travel'); expect(a.flags).toContain('two_countries_24h'); expect(a.risk).toBeGreaterThanOrEqual(80);
  });
  it('a normal trip across the same country is not flagged', () => {
    const a = assess([ev({ at: '2026-11-22T04:00:00Z' })], { at: '2026-11-22T10:00:00Z', ip: '1.1.1.1', device: 'Windows Chrome', countryCode: 'PK', ...KARACHI, hosting: false });
    expect(a.flags).toEqual([]); expect(a.risk).toBe(0);
  });
  it('a new country days later is only a mild flag, not impossible travel', () => {
    const a = assess([ev({ at: '2026-11-15T04:00:00Z' })], { at: '2026-11-22T10:00:00Z', ip: '2.2.2.2', device: 'Windows Chrome', countryCode: 'AE', lat: 25.2, lon: 55.27, hosting: false });
    expect(a.flags).toEqual(['new_country']);
  });
  it('flags many networks, many devices and VPN/data-centre', () => {
    const prev = [ev({ at: '2026-11-22T06:00:00Z', ip: '3.3.3.3', device: 'iPhone Safari' }), ev({ at: '2026-11-22T07:00:00Z', ip: '4.4.4.4', device: 'Android Chrome' }), ev({ at: '2026-11-22T08:00:00Z', ip: '5.5.5.5', device: 'Windows Chrome' })];
    const a = assess(prev, { at: '2026-11-22T09:00:00Z', ip: '6.6.6.6', device: 'Windows Firefox', countryCode: 'PK', ...LAHORE, hosting: true });
    expect(a.flags).toEqual(expect.arrayContaining(['many_networks', 'many_devices', 'datacenter_vpn']));
  });
  it('first ever login has no flags except VPN', () => { expect(assess([], { at: '2026-11-22T10:00:00Z', ip: '1.1.1.1', device: 'x', countryCode: 'PK', ...LAHORE, hosting: false }).flags).toEqual([]); });
  it('summary ranks the riskiest account first and lists places', () => {
    const s = summariseUsers([ev({ userId: 'a', username: 'a', at: new Date().toISOString(), risk: 80, flags: ['impossible_travel'] }), ev({ userId: 'b', username: 'b', at: new Date().toISOString(), risk: 0 })], []);
    expect(s[0].userId).toBe('a'); expect(s[0].places[0].place).toBe('Lahore, Punjab, Pakistan'); expect(placeOf({})).toBe('Unknown location');
  });
  it('ip helpers', () => {
    expect(isPrivateIp('192.168.1.5')).toBe(true); expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(maskIp('103.25.4.9')).toBe('103.25.x.x');
    expect(clientIp({ headers: { 'cf-connecting-ip': '5.6.7.8', 'x-forwarded-for': '9.9.9.9' } })).toBe('5.6.7.8');
    expect(clientIp({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } })).toBe('9.9.9.9');
  });
});
