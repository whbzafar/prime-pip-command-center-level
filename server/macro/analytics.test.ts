import { recordPing, summary, geoFromHeaders } from '../analytics.js';
import { it, expect } from 'vitest';
it('aggregates', async () => {
  const g = geoFromHeaders({ 'x-vercel-ip-country': 'PK', 'x-vercel-ip-country-region': 'PB', 'x-vercel-ip-city': 'Lahore' });
  expect(g).toEqual({ country: 'PK', region: 'Punjab', city: 'Lahore' });
  await recordPing({ vid: 'v1', sid: 's1', tab: 'DASHBOARD', kind: 'start', cls: 'guest', device: 'mobile' }, g);
  await recordPing({ vid: 'v1', sid: 's1', tab: 'FUNDAMENTAL_CALENDAR', kind: 'view', cls: 'demo', device: 'mobile' }, g);
  const s = await summary(1);
  expect(s.live.count).toBe(1); expect(s.live.visitors[0].tab).toBe('FUNDAMENTAL_CALENDAR');
  expect(s.sessions).toBe(1); expect(s.uniqueVisitors).toBe(1);
  expect(s.regions[0]).toMatchObject({ region: 'Punjab', n: 1 }); expect(s.topTabs.length).toBe(2);
});
