/**
 * Collects the economic-release history (actual / forecast / previous) that drives the fundamentals
 * scores and writes one JSON file.   npx tsx scripts/collect-calendar.ts out/calendar.json
 * A scheduled GitHub Action runs this and publishes the file to the `calendar-data` branch; the app
 * downloads it once at start-up (see loadCalendarSnapshot in server/macro/sources/tvCalendar.ts).
 */
import fs from 'fs';
import { fetchRange } from '../server/macro/sources/tvCalendar.js';

const out = process.argv[2] || 'calendar.json';
const DAYS = 420, CHUNK = 24;

const now = Date.now();
const ranges: Array<[Date, Date]> = [];
for (let back = DAYS; back > -14; back -= CHUNK) ranges.push([new Date(now - back * 86_400_000), new Date(now - (back - CHUNK) * 86_400_000)]);

const byId = new Map<string, any>();
let ok = 0;
for (let i = 0; i < ranges.length; i += 4) {
  const res = await Promise.allSettled(ranges.slice(i, i + 4).map(([f, t]) => fetchRange(f, t)));
  for (const r of res) {
    if (r.status === 'fulfilled') { ok++; for (const e of r.value) byId.set(e.id, e); }
    else console.warn('window failed:', (r.reason as Error)?.message);
  }
}
const events = Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
console.log(`windows ok ${ok}/${ranges.length}, events ${events.length}`);
if (events.length < 1000) { console.error('Too few events — not publishing.'); process.exit(1); }
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), count: events.length, events }));
